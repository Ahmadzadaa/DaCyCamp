/** Read-only compatibility check of packaged Python solutions against the real sandbox. */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { load } from 'js-yaml';
import { PrismaService } from '../src/prisma/prisma.service';
import { PythonCheckService } from '../src/python-check/python-check.service';

interface Definition {
  type?: string;
  solution?: string;
  tests?: string;
  dataset?: string | string[];
}
const root = resolve(__dirname, '../../..');
const courses = join(root, 'content/courses');
const db = new PrismaService();
const checker = new PythonCheckService(db);
async function main() {
  let checked = 0,
    failed = 0;
  for (const course of readdirSync(courses)) {
    const directory = join(courses, course, 'modules');
    if (!existsSync(directory)) continue;
    const row = await db.course.findUnique({ where: { slug: course }, select: { id: true } });
    for (const module of readdirSync(directory)) {
      for (const file of readdirSync(join(directory, module))) {
        if (!/\.ya?ml$/.test(file) || /^module\./.test(file)) continue;
        const filename = join(directory, module, file);
        const definition = load(readFileSync(filename, 'utf8')) as Definition | null;
        if (definition?.type !== 'python') continue;
        checked++;
        const result =
          !row || !definition.solution || !definition.tests
            ? { passed: false, error: 'İdxal edilmiş kurs, həll və server testləri tələb olunur.' }
            : await checker.run(
                row.id,
                { tests: definition.tests, dataset: [definition.dataset ?? []].flat() } as never,
                definition.solution,
              );
        if (!result.passed) failed++;
        console.log(
          `${result.passed ? 'PASS' : 'FAIL'} ${relative(courses, filename)}${result.passed ? '' : ': ' + result.error}`,
        );
      }
    }
  }
  console.log(JSON.stringify({ checked, failed }));
  if (!checked || failed) process.exitCode = 1;
}
main()
  .catch(() => {
    console.error(
      'Python uyğunluq yoxlaması tamamlanmadı. Baza və sandbox konfiqurasiyasını yoxlayın.',
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
