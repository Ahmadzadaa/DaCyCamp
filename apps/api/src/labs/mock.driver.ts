/**
 * Mock sürücü — Docker olmayan mühitlər (test, CI, bu konteyner) üçün virtual qabıq.
 * Heç bir real proses işlətmir: yaddaşda fayl sistemi və bir neçə əmr (ls, cat, touch, echo, mkdir…).
 * Yoxlama skripti də real icra olunmur — yalnız `test -f/-d`, `grep -q`, `exit N` sətirləri şərh edilir.
 */
import { randomUUID } from 'node:crypto';
import type { CreateLabOpts, LabCheckRun, LabDriver, LabTerminal } from './driver';

const HOME = '/home/student';
const PROMPT = '\x1b[32mstudent@dacy-lab\x1b[0m:\x1b[34m~\x1b[0m$ ';

interface MockContainer {
  id: string;
  sessionId: string;
  files: Map<string, string>; // mütləq yol → məzmun
  dirs: Set<string>;
  checkScript: string | null;
}

function normalize(cwd: string, p: string): string {
  let path = p
    .replace(/^~(?=\/|$)/, HOME)
    .replace(/\$HOME/g, HOME)
    .replace(/^["']|["']$/g, '');
  if (!path.startsWith('/')) path = `${cwd}/${path}`;
  const out: string[] = [];
  for (const seg of path.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') out.pop();
    else out.push(seg);
  }
  return `/${out.join('/')}`;
}

export class MockDriver implements LabDriver {
  readonly kind = 'mock' as const;
  private containers = new Map<string, MockContainer>();

  async available() {
    return true;
  }

  async create(opts: CreateLabOpts): Promise<string> {
    const id = `mock-${randomUUID()}`;
    const c: MockContainer = {
      id,
      sessionId: opts.sessionId,
      files: new Map([
        [
          `${HOME}/README.txt`,
          'Bu nümunə lab mühitidir (mock). Docker olanda real konteyner açılır.\n',
        ],
      ]),
      dirs: new Set(['/', '/home', HOME, '/tmp', '/dacy']),
      checkScript: null,
    };
    this.containers.set(id, c);
    return id;
  }

  async prepare(containerId: string, opts: { checkScript: string | null }) {
    const c = this.get(containerId);
    c.checkScript = opts.checkScript;
    if (opts.checkScript) c.files.set('/dacy/check.sh', opts.checkScript);
  }

  async attach(containerId: string, _size: { cols: number; rows: number }): Promise<LabTerminal> {
    const c = this.get(containerId);
    let line = '';
    let cwd = HOME;
    let bannerSent = false;
    const dataCbs: Array<(s: string) => void> = [];
    const closeCbs: Array<() => void> = [];
    const emit = (s: string) => dataCbs.forEach((cb) => cb(s));
    const prompt = () => emit(PROMPT.replace('~', cwd === HOME ? '~' : cwd));

    const run = (input: string): string => {
      const [cmd, ...args] = input.trim().split(/\s+/);
      if (!cmd) return '';
      const resolve = (p: string) => normalize(cwd, p);
      switch (cmd) {
        case 'help':
          return 'Əmrlər: ls, cd, pwd, cat, touch, echo, mkdir, rm, whoami, hostname, date, clear, check, help\r\n';
        case 'pwd':
          return `${cwd}\r\n`;
        case 'whoami':
          return 'student\r\n';
        case 'hostname':
          return 'dacy-lab\r\n';
        case 'date':
          return `${new Date().toUTCString()}\r\n`;
        case 'cd': {
          const target = resolve(args[0] ?? HOME);
          if (!c.dirs.has(target)) return `cd: ${args[0]}: Belə qovluq yoxdur\r\n`;
          cwd = target;
          return '';
        }
        case 'ls': {
          const dir = resolve(args.find((a) => !a.startsWith('-')) ?? '.');
          if (!c.dirs.has(dir)) return `ls: ${args[0]}: Belə qovluq yoxdur\r\n`;
          const names = new Set<string>();
          for (const f of c.files.keys())
            if (f.startsWith(`${dir}/`) && !f.slice(dir.length + 1).includes('/'))
              names.add(f.slice(dir.length + 1));
          for (const d of c.dirs)
            if (d !== dir && d.startsWith(`${dir}/`) && !d.slice(dir.length + 1).includes('/'))
              names.add(`${d.slice(dir.length + 1)}/`);
          return names.size ? `${[...names].sort().join('  ')}\r\n` : '';
        }
        case 'mkdir': {
          for (const a of args) c.dirs.add(resolve(a));
          return '';
        }
        case 'touch': {
          for (const a of args) if (!c.files.has(resolve(a))) c.files.set(resolve(a), '');
          return '';
        }
        case 'rm': {
          for (const a of args.filter((x) => !x.startsWith('-'))) {
            c.files.delete(resolve(a));
            c.dirs.delete(resolve(a));
          }
          return '';
        }
        case 'cat': {
          return args
            .map((a) => c.files.get(resolve(a)) ?? `cat: ${a}: Belə fayl yoxdur\n`)
            .join('')
            .replace(/\n/g, '\r\n');
        }
        case 'echo': {
          const text = input.trim().slice(4).trim();
          const m = /^(.*?)\s*(>>|>)\s*(\S+)$/.exec(text);
          if (m) {
            const body = m[1].replace(/^["']|["']$/g, '');
            const file = resolve(m[3]);
            c.files.set(
              file,
              m[2] === '>>' ? (c.files.get(file) ?? '') + body + '\n' : body + '\n',
            );
            return '';
          }
          return `${text.replace(/^["']|["']$/g, '')}\r\n`;
        }
        case 'clear':
          return '\x1b[2J\x1b[H';
        case 'check': {
          const r = evaluateCheck(c);
          return `${r.output.replace(/\n/g, '\r\n')}${r.exitCode === 0 ? '\x1b[32m✓ Yoxlama keçdi\x1b[0m' : '\x1b[31m✗ Yoxlama keçmədi\x1b[0m'}\r\n`;
        }
        default:
          return `${cmd}: əmr tapılmadı (mock lab — "help" yazın)\r\n`;
      }
    };

    const term: LabTerminal = {
      write(data: string) {
        if (data.startsWith('\x1b')) return; // ox düymələri və s.
        for (const ch of data) {
          if (ch === '\r' || ch === '\n') {
            emit('\r\n');
            const out = run(line);
            if (out) emit(out);
            line = '';
            prompt();
          } else if (ch === '\x7f' || ch === '\b') {
            if (line.length) {
              line = line.slice(0, -1);
              emit('\b \b');
            }
          } else if (ch === '\x03') {
            line = '';
            emit('^C\r\n');
            prompt();
          } else if (ch === '\x0c') {
            emit('\x1b[2J\x1b[H');
            prompt();
            emit(line);
          } else if (ch >= ' ') {
            line += ch;
            emit(ch);
          }
        }
      },
      resize() {},
      onData(cb) {
        dataCbs.push(cb);
        // banner + prompt ilk dinləyici qoşulanda göndərilir (əvvəl göndərilsə itərdi)
        if (!bannerSent) {
          bannerSent = true;
          cb(
            '\x1b[36mDaCy lab (mock mühit) — real konteyner üçün Docker lazımdır. "help" yazın.\x1b[0m\r\n',
          );
          cb(PROMPT);
        }
      },
      onClose(cb) {
        closeCbs.push(cb);
      },
      close() {
        closeCbs.forEach((cb) => cb());
      },
    };
    return term;
  }

  async runCheck(containerId: string, _timeoutMs?: number): Promise<LabCheckRun> {
    const c = this.get(containerId);
    return { ...evaluateCheck(c), timedOut: false };
  }

  async destroy(containerId: string) {
    this.containers.delete(containerId);
  }

  async listManaged() {
    return [...this.containers.values()].map((c) => ({ id: c.id, sessionId: c.sessionId }));
  }

  /** test köməkçisi */
  snapshot(containerId: string) {
    const c = this.get(containerId);
    return { files: Object.fromEntries(c.files), dirs: [...c.dirs] };
  }

  private get(id: string) {
    const c = this.containers.get(id);
    if (!c) throw new Error('Mock konteyner tapılmadı');
    return c;
  }
}

/** Skript sətirlərinin məhdud şərhi — real shell deyil */
export function evaluateCheck(c: {
  files: Map<string, string>;
  dirs: Set<string>;
  checkScript: string | null;
}): {
  exitCode: number;
  output: string;
} {
  const script = c.checkScript ?? '';
  const lines: string[] = [];
  let failed = false;
  for (const raw of script.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    let m: RegExpExecArray | null;
    if ((m = /(?:test|\[)\s+-f\s+("[^"]+"|'[^']+'|\S+)/.exec(line))) {
      const p = normalize(HOME, m[1]);
      const ok = c.files.has(p);
      lines.push(`${ok ? '✓' : '✗'} fayl: ${p}`);
      if (!ok) failed = true;
    } else if ((m = /(?:test|\[)\s+-d\s+("[^"]+"|'[^']+'|\S+)/.exec(line))) {
      const p = normalize(HOME, m[1]);
      const ok = c.dirs.has(p);
      lines.push(`${ok ? '✓' : '✗'} qovluq: ${p}`);
      if (!ok) failed = true;
    } else if (
      (m = /grep\s+(?:-\S+\s+)*("[^"]*"|'[^']*'|\S+)\s+("[^"]+"|'[^']+'|\S+)/.exec(line))
    ) {
      const needle = m[1].replace(/^["']|["']$/g, '');
      const p = normalize(HOME, m[2]);
      const ok = (c.files.get(p) ?? '').includes(needle);
      lines.push(`${ok ? '✓' : '✗'} "${needle}" → ${p}`);
      if (!ok) failed = true;
    } else if ((m = /^exit\s+(\d+)/.exec(line))) {
      if (Number(m[1]) !== 0) failed = true;
      break;
    }
  }
  return { exitCode: failed ? 1 : 0, output: lines.length ? `${lines.join('\n')}\n` : '' };
}
