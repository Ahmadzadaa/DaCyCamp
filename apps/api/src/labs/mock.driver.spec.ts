import { MockDriver, evaluateCheck } from './mock.driver';

const opts = {
  image: 'x',
  sessionId: 's1',
  userId: 'u1',
  network: false,
  memoryMb: 64,
  cpus: 0.1,
  pidsLimit: 16,
};

async function type(term: Awaited<ReturnType<MockDriver['attach']>>, line: string) {
  const out: string[] = [];
  term.onData((d) => out.push(d));
  term.write(`${line}\r`);
  await new Promise((r) => setTimeout(r, 0));
  return out.join('');
}

describe('MockDriver (virtual qabıq)', () => {
  it('touch → test -f keçir; əvvəl keçmir', async () => {
    const d = new MockDriver();
    const id = await d.create(opts);
    await d.prepare(id, { checkScript: '#!/bin/sh\ntest -f "$HOME/done.txt"\n' });
    expect((await d.runCheck(id, 1000)).exitCode).toBe(1);
    const term = await d.attach(id, { cols: 80, rows: 24 });
    await type(term, 'touch ~/done.txt');
    const r = await d.runCheck(id, 1000);
    expect(r.exitCode).toBe(0);
    expect(r.output).toContain('✓ fayl: /home/student/done.txt');
  });

  it('echo > fayl, cat, ls, cd', async () => {
    const d = new MockDriver();
    const id = await d.create(opts);
    const term = await d.attach(id, { cols: 80, rows: 24 });
    await type(term, 'mkdir out');
    await type(term, 'echo "salam dünya" > out/a.txt');
    expect(await type(term, 'cat out/a.txt')).toContain('salam dünya');
    expect(await type(term, 'ls')).toContain('out/');
    expect(await type(term, 'cd out')).not.toContain('yoxdur');
    expect(await type(term, 'pwd')).toContain('/home/student/out');
    expect(d.snapshot(id).files['/home/student/out/a.txt']).toBe('salam dünya\n');
  });

  it('naməlum əmr və Ctrl+C', async () => {
    const d = new MockDriver();
    const id = await d.create(opts);
    const term = await d.attach(id, { cols: 80, rows: 24 });
    expect(await type(term, 'rm -rf /')).not.toContain('tapılmadı'); // virtual: heç nə olmur
    expect(await type(term, 'sudo su')).toContain('əmr tapılmadı');
    const out: string[] = [];
    term.onData((x) => out.push(x));
    term.write('abc\x03');
    expect(out.join('')).toContain('^C');
  });

  it('evaluateCheck: grep -q, test -d, exit 1', () => {
    const files = new Map([['/home/student/a.txt', 'flag: DACY{x}\n']]);
    const dirs = new Set(['/home/student', '/home/student/out']);
    expect(
      evaluateCheck({ files, dirs, checkScript: 'grep -q "DACY{x}" ~/a.txt\ntest -d ~/out' })
        .exitCode,
    ).toBe(0);
    expect(evaluateCheck({ files, dirs, checkScript: 'grep -q "yox" ~/a.txt' }).exitCode).toBe(1);
    expect(evaluateCheck({ files, dirs, checkScript: '# şərh\nexit 1' }).exitCode).toBe(1);
    expect(evaluateCheck({ files, dirs, checkScript: '' }).exitCode).toBe(0);
  });

  it('destroy + listManaged', async () => {
    const d = new MockDriver();
    const id = await d.create(opts);
    expect(await d.listManaged()).toEqual([{ id, sessionId: 's1' }]);
    await d.destroy(id);
    expect(await d.listManaged()).toEqual([]);
  });
});
