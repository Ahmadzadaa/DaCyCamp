import { spawn, type ChildProcess } from 'node:child_process';

const active = new Set<ChildProcess>();
const waiting: Array<() => void> = [];
const MAX_ACTIVE = 2;
const MAX_WAITING = 12;
let permits = 0;
export const executionStatus = () => ({ active: active.size, waiting: waiting.length });
export function terminateExecution(child: ChildProcess) {
  if (child.exitCode !== null || !child.pid) return;
  try {
    process.kill(-child.pid, 'SIGKILL');
  } catch {
    child.kill('SIGKILL');
  }
}
export function terminateExecutions() {
  for (const child of active) terminateExecution(child);
}

/** Bounded subprocesses: the API event loop never executes learner code or synchronous SQL. */
export async function executeJson<T>(opts: {
  command: string;
  args: string[];
  input: unknown;
  timeoutMs: number;
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}): Promise<T> {
  if (permits >= MAX_ACTIVE) {
    if (waiting.length >= MAX_WAITING)
      throw new Error('İcra növbəsi doludur. Bir az sonra yenidən cəhd edin.');
    await new Promise<void>((resolve, reject) => {
      const resume = () => {
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(() => {
        const i = waiting.indexOf(resume);
        if (i >= 0) waiting.splice(i, 1);
        reject(new Error('İcra növbəsinin vaxtı bitdi. Yenidən cəhd edin.'));
      }, 30_000);
      waiting.push(resume);
    });
  } else permits++;
  return new Promise<T>((resolve, reject) => {
    const child = spawn(opts.command, opts.args, {
      detached: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: opts.cwd,
      env: { LANG: 'C.UTF-8', ...opts.env },
    });
    active.add(child);
    let output = '',
      error = '',
      settled = false;
    const timer = setTimeout(() => {
      terminateExecution(child);
      finish(new Error('İcra vaxt limitini keçdi və dayandırıldı.'));
    }, opts.timeoutMs);
    function finish(reason?: Error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      active.delete(child);
      const next = waiting.shift();
      if (next) next();
      else permits--;
      if (reason) {
        reject(reason);
        return;
      }
      try {
        const result = JSON.parse(output) as T & { failure?: string };
        if (result.failure) reject(new Error(result.failure));
        else resolve(result);
      } catch {
        reject(new Error('İcra nəticəsi alınmadı. Kod dayandırılmış ola bilər.'));
      }
    }
    child.stdout.on('data', (chunk: Buffer) => {
      if (output.length + chunk.length > 4 * 1024 * 1024) {
        terminateExecution(child);
        finish(new Error('İcra nəticəsi ölçü limitini keçdi.'));
      } else output += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      if (error.length < 2000) error += chunk.toString('utf8');
    });
    child.once('error', () => finish(new Error('İcra xidməti başladıla bilmədi.')));
    child.once('close', (code) =>
      finish(
        code === 0
          ? undefined
          : new Error(
              'İcra dayandırıldı: ' + (error.trim().slice(0, 300) || 'vaxt və ya yaddaş limiti'),
            ),
      ),
    );
    child.stdin.on('error', () => {
      /* an early process exit is handled by close */
    });
    child.stdin.end(JSON.stringify(opts.input));
  });
}
