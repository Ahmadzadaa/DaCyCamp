// müvəqqəti: content/courses/<slug> paketini shared sxemləri ilə yoxlayır
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const S = require('@dacy/shared');
const root = path.resolve(__dirname, '../../content/courses', process.argv[2]);
let bad = 0, steps = 0, words = 0, qs = 0;
const assets = new Set();
for (const d of ['datasets', 'images', 'files', 'checks', 'videos'])
  if (fs.existsSync(path.join(root, d))) for (const f of fs.readdirSync(path.join(root, d))) assets.add(`${d}/${f}`);
const c = S.courseYamlSchema.safeParse(yaml.load(fs.readFileSync(path.join(root, 'course.yaml'), 'utf8')));
if (!c.success) { console.log('course.yaml', c.error.issues); bad++; }
for (const mod of fs.readdirSync(path.join(root, 'modules')).sort()) {
  const md = path.join(root, 'modules', mod);
  const m = S.moduleYamlSchema.safeParse(yaml.load(fs.readFileSync(path.join(md, 'module.yaml'), 'utf8')));
  if (!m.success) { console.log(mod, m.error.issues); bad++; }
  for (const f of fs.readdirSync(md).sort()) {
    if (f === 'module.yaml') continue;
    const raw = fs.readFileSync(path.join(md, f), 'utf8');
    let obj;
    if (f.endsWith('.md')) {
      const { front, body } = S.splitFrontMatter(raw);
      obj = { type: 'theory', ...(yaml.load(front) || {}), content: body };
      words += body.split(/\s+/).length;
    } else obj = yaml.load(raw);
    const y = S.stepYamlSchema.safeParse(obj);
    if (!y.success) { console.log(mod, f, JSON.stringify(y.error.issues, null, 1)); bad++; continue; }
    const def = S.yamlStepToDefinition(y.data);
    const st = S.stepDefinitionStrict.safeParse(def);
    if (!st.success) { console.log(mod, f, JSON.stringify(st.error.issues, null, 1)); bad++; continue; }
    const issues = S.validateForPublish(def, assets);
    if (issues.length) { console.log(mod, f, issues); bad++; }
    if (def.type === 'quiz') qs += def.questions.length;
    steps++;
  }
}
console.log(`${process.argv[2]}: ${steps} addım, ${qs} sual, ~${words} söz nəzəriyyə, ${bad} problem`);
process.exit(bad ? 1 : 0);
