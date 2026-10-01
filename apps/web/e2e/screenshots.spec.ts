/**
 * Dizayn referansı vs tətbiq skrinşotları → docs/screenshots/<ekran>.ref.png / .app.png (1240px) və .mobile.png (390px)
 * İşə salma: pnpm --filter @dacy/web screenshots  (API + web işləməlidir)
 */
import { test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ADMIN, REF, SHOTS, STUDENT, localFontCss, login } from './helpers';

mkdirSync(SHOTS, { recursive: true });
const out = (n: string) => resolve(SHOTS, n);

test.describe.configure({ mode: 'serial' });

test('referans bölmələri', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto(`file://${REF}`);
  await page.addStyleTag({ content: localFontCss() });
  await page.waitForTimeout(300);
  const frames: Array<[string, string]> = [
    ['catalog', '#catalog .frame'],
    ['path', '#path .frame'],
    ['course', '#course .frame'],
    ['dashboard', '#dashboard .frame'],
    ['admin', '#admin .frame'],
  ];
  for (const [name, sel] of frames)
    await page.locator(sel).screenshot({ path: out(`${name}.ref.png`) });
  for (const [name, tab] of [
    ['workspace-sql', '#t-sql'],
    ['workspace-python', '#t-py'],
    ['workspace-terminal', '#t-term'],
    ['workspace-ctf', '#t-ctf'],
  ] as const) {
    await page.locator(tab).click();
    await page.locator('#workspace .frame').screenshot({ path: out(`${name}.ref.png`) });
  }
});

async function shot(page: Page, url: string, name: string, opts: { full?: boolean } = {}) {
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(250);
  await page.screenshot({ path: out(name), fullPage: opts.full ?? true });
}

test('tələbə ekranları', async ({ page }) => {
  await page.setViewportSize({ width: 1240, height: 900 });
  await login(page, STUDENT);
  // yazıl + nəzəri addımı tamamla ki, paneldə "Qaldığınız yer" olsun
  await page.request.post('/api/courses/numune/enroll');
  const map = await (await page.request.get('/api/learn/courses/numune')).json();
  const first = map.map.modules[0].steps[0];
  await page.request.post(`/api/learn/steps/${first.id}/start`);
  await shot(page, '/kurslar', 'catalog.app.png');
  await shot(page, '/kurs/numune', 'course.app.png');
  await shot(page, '/panel', 'dashboard.app.png');
  await shot(page, '/kurs/numune/numune-fesil/nezeri', 'workspace-theory.app.png');
  await page.setViewportSize({ width: 390, height: 844 });
  await shot(page, '/kurslar', 'catalog.mobile.png');
  await shot(page, '/kurs/numune', 'course.mobile.png');
  await shot(page, '/panel', 'dashboard.mobile.png');
});

test('dərs ekranı (müəllim önizləməsi) və admin', async ({ page }) => {
  await page.setViewportSize({ width: 1240, height: 760 });
  await login(page, ADMIN);
  for (const [key, name] of [
    ['sql', 'workspace-sql'],
    ['python', 'workspace-python'],
    ['terminal', 'workspace-terminal'],
    ['ctf', 'workspace-ctf'],
    ['test', 'workspace-quiz'],
  ] as const) {
    await shot(page, `/kurs/numune/numune-fesil/${key}?onizle=1`, `${name}.app.png`, {
      full: false,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await shot(page, '/kurs/numune/numune-fesil/sql?onizle=1', 'workspace-sql.mobile.png', {
    full: false,
  });
  await page.setViewportSize({ width: 1240, height: 900 });
  const tree = await (await page.request.get('/api/admin/courses/numune')).json();
  const sql = tree.modules[0].steps.find((s: { key: string }) => s.key === 'sql');
  await shot(page, `/admin/kurslar/numune?node=step:${sql.id}`, 'admin.app.png');
});
