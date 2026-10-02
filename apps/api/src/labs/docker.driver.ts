/**
 * Docker sürücüsü (dockerode). DOCKER_HOST və ya /var/run/docker.sock.
 * Hər sessiya üçün məhdudlaşdırılmış konteyner: yaddaş/CPU/pid limiti, defolt olaraq şəbəkəsiz, lazımsız capability-lər atılır.
 */
import { StringDecoder } from 'node:string_decoder';
import { PassThrough } from 'node:stream';
import Docker from 'dockerode';
import type { CreateLabOpts, LabCheckRun, LabDriver, LabTerminal } from './driver';
import { LabDriverError } from './driver';

const LABEL = 'dacy.lab';
const CHECK_PATH = '/dacy/check.sh';
/** Docker-in defolt dəstindən saxlanılan minimum (Postgres kimi entrypoint-lər istifadəçi dəyişir) */
const CAP_ADD = [
  'CHOWN',
  'DAC_OVERRIDE',
  'FOWNER',
  'SETGID',
  'SETUID',
  'KILL',
  'SETPCAP',
  'NET_BIND_SERVICE',
];

export class DockerDriver implements LabDriver {
  readonly kind = 'docker' as const;
  private readonly docker: Docker;

  constructor(private readonly opts: { pull: boolean; socketPath?: string }) {
    this.docker = opts.socketPath ? new Docker({ socketPath: opts.socketPath }) : new Docker();
  }

  async available() {
    try {
      await this.docker.ping();
      return true;
    } catch {
      return false;
    }
  }

  async create(o: CreateLabOpts): Promise<string> {
    await this.ensureImage(o.image);
    const c = await this.docker.createContainer({
      Image: o.image,
      Tty: true,
      OpenStdin: true,
      Hostname: 'dacy-lab',
      Env: ['DACY_LAB=1', `DACY_SESSION=${o.sessionId}`, 'TERM=xterm-256color'],
      Labels: { [LABEL]: '1', 'dacy.session': o.sessionId, 'dacy.user': o.userId },
      HostConfig: {
        Memory: o.memoryMb * 1024 * 1024,
        MemorySwap: o.memoryMb * 1024 * 1024, // swap yoxdur
        NanoCpus: Math.round(o.cpus * 1e9),
        PidsLimit: o.pidsLimit,
        NetworkMode: o.network ? 'bridge' : 'none',
        CapDrop: ['ALL'],
        CapAdd: CAP_ADD,
        SecurityOpt: ['no-new-privileges'],
        RestartPolicy: { Name: 'no' },
        AutoRemove: false,
      },
    });
    await c.start();
    return c.id;
  }

  async prepare(containerId: string, opts: { checkScript: string | null }) {
    if (!opts.checkScript) return;
    const c = this.docker.getContainer(containerId);
    const exec = await c.exec({
      Cmd: [
        '/bin/sh',
        '-c',
        `mkdir -p /dacy && cat > ${CHECK_PATH} && chmod 755 /dacy ${CHECK_PATH}`,
      ],
      User: 'root',
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
    });
    const stream = await exec.start({ hijack: true, stdin: true });
    await new Promise<void>((resolve, reject) => {
      stream.on('error', reject);
      stream.on('end', () => resolve());
      stream.on('close', () => resolve());
      stream.write(opts.checkScript);
      stream.end();
    });
  }

  async attach(containerId: string, size: { cols: number; rows: number }): Promise<LabTerminal> {
    const c = this.docker.getContainer(containerId);
    const exec = await c.exec({
      Cmd: ['/bin/sh', '-c', 'command -v bash >/dev/null 2>&1 && exec bash -l || exec sh -l'],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      Env: ['TERM=xterm-256color', 'LANG=C.UTF-8'],
    });
    const stream = await exec.start({ hijack: true, stdin: true, Tty: true });
    await exec.resize({ h: size.rows, w: size.cols }).catch(() => undefined);
    const decoder = new StringDecoder('utf8');
    const dataCbs: Array<(s: string) => void> = [];
    const closeCbs: Array<() => void> = [];
    stream.on('data', (b: Buffer) => {
      const s = decoder.write(b);
      if (s) dataCbs.forEach((cb) => cb(s));
    });
    const onEnd = () => closeCbs.forEach((cb) => cb());
    stream.on('end', onEnd);
    stream.on('close', onEnd);
    stream.on('error', onEnd);
    return {
      write: (d) => {
        if (stream.writable) stream.write(d);
      },
      resize: (cols, rows) => {
        void exec.resize({ h: rows, w: cols }).catch(() => undefined);
      },
      onData: (cb) => {
        dataCbs.push(cb);
      },
      onClose: (cb) => {
        closeCbs.push(cb);
      },
      close: () => {
        try {
          stream.end();
          stream.destroy();
        } catch {
          /* ignore */
        }
      },
    };
  }

  async runCheck(containerId: string, timeoutMs: number): Promise<LabCheckRun> {
    const c = this.docker.getContainer(containerId);
    const exec = await c.exec({
      Cmd: ['/bin/sh', CHECK_PATH],
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
    });
    const stream = await exec.start({ hijack: true, stdin: false });
    const out = new PassThrough();
    const chunks: Buffer[] = [];
    out.on('data', (b: Buffer) => chunks.push(b));
    c.modem.demuxStream(stream, out, out);
    let timedOut = false;
    await Promise.race([
      new Promise<void>((resolve) => {
        stream.on('end', () => resolve());
        stream.on('close', () => resolve());
        stream.on('error', () => resolve());
      }),
      new Promise<void>((resolve) =>
        setTimeout(() => {
          timedOut = true;
          stream.destroy();
          resolve();
        }, timeoutMs),
      ),
    ]);
    const info = timedOut ? null : await exec.inspect().catch(() => null);
    const output = Buffer.concat(chunks).toString('utf8').slice(0, 8000);
    return {
      exitCode: timedOut ? 124 : (info?.ExitCode ?? 1),
      output: timedOut
        ? `${output}\n[yoxlama vaxtı bitdi — ${Math.round(timeoutMs / 1000)} s]`
        : output,
      timedOut,
    };
  }

  async destroy(containerId: string) {
    const c = this.docker.getContainer(containerId);
    try {
      await c.remove({ force: true, v: true });
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status !== 404) throw e;
    }
  }

  async listManaged() {
    const list = await this.docker.listContainers({
      all: true,
      filters: { label: [`${LABEL}=1`] },
    });
    return list.map((c) => ({ id: c.Id, sessionId: c.Labels?.['dacy.session'] ?? null }));
  }

  private async ensureImage(image: string) {
    try {
      await this.docker.getImage(image).inspect();
      return;
    } catch {
      /* yoxdur */
    }
    if (!this.opts.pull)
      throw new LabDriverError('LAB_IMAGE_MISSING', `Docker imici tapılmadı: ${image}`);
    try {
      const stream = await this.docker.pull(image);
      await new Promise<void>((resolve, reject) =>
        this.docker.modem.followProgress(stream, (err) => (err ? reject(err) : resolve())),
      );
    } catch (e) {
      throw new LabDriverError(
        'LAB_IMAGE_MISSING',
        `Docker imici yüklənmədi: ${image} (${(e as Error).message})`,
      );
    }
  }
}
