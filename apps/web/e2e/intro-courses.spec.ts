/**
 * content/courses/what-is-* — üç giriş kursu (kodsuz): idxal, kataloq, nəzəri dərs və «qruplara ayır» (classify)
 * sualı: sürüşdürmə (drag & drop), toxunaraq yerləşdirmə, səhv → izah → yenidən cəhd → keçdi.
 * İşə salma: API + web işləyərkən `pnpm --filter @dacy/web e2e -- e2e/intro-courses.spec.ts`
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { ADMIN, ROOT, SHOTS, login } from './helpers';

test.describe.configure({ mode: 'serial' });

const COURSES = [
  { slug: 'what-is-data-engineering', title: 'What is Data Engineering?', modules: 4 },
  { slug: 'what-is-data-analytics', title: 'What is Data Analytics?', modules: 5 },
  { slug: 'what-is-cyber-security', title: 'What is Cyber Security?', modules: 4 },
];
const DE = COURSES[0]!.slug;
const OUT = resolve(SHOTS, 'intro-kurslar');
mkdirSync(OUT, { recursive: true });
const shot = (page: Page, name: string) =>
  page.screenshot({ path: resolve(OUT, `${name}.png`), fullPage: true });

const fresh = {
  name: 'E2E Giriş',
  email: `e2e-intro-${Date.now()}@dacy.local`,
  password: 'E2eIntro123!',
};

test('admin: üç paket idxal olunub (yoxdursa idxal edir), yalnız nəzəri və test addımları', async ({
  page,
}) => {
  await login(page, ADMIN);
  const AdmZip = createRequire(resolve(ROOT, 'apps/api/package.json'))('adm-zip');
  for (const c of COURSES) {
    const zip = new AdmZip();
    zip.addLocalFolder(resolve(ROOT, 'content/courses', c.slug), c.slug);
    const file = { name: `${c.slug}.zip`, mimeType: 'application/zip', buffer: zip.toBuffer() };
    const report = await (
      await page.request.post('/api/admin/import/validate', { multipart: { file } })
    ).json();
    expect(report.errors).toEqual([]);
    expect(Object.keys(report.summary.byType).sort()).toEqual(['QUIZ', 'THEORY']);
    if (!report.course.exists) {
      const applied = await page.request.post('/api/admin/import/apply', { multipart: { file } });
      expect((await applied.json()).ok).toBe(true);
    }
  }
});

test('kataloq və kurs səhifələri', async ({ page }) => {
  await page.goto('/kurslar');
  for (const c of COURSES)
    await expect(page.getByText(c.title).first()).toBeVisible({ timeout: 30_000 });
  await shot(page, '01-kataloq');
  for (const c of COURSES) {
    const r = await (await page.request.get(`/api/courses/${c.slug}`)).json();
    expect(r.modules).toHaveLength(c.modules);
  }
  await page.goto(`/kurs/${DE}`);
  await expect(page.getByText('Data engineering-ə giriş').first()).toBeVisible({ timeout: 30_000 });
  await shot(page, '02-kurs-sehifesi');
});

test('tələbə: dərs → «Bu kimin işidir?» — sürüşdür, səhv et, izahı gör, toxunaraq düzəlt, keç', async ({
  page,
}) => {
  expect((await page.request.post('/api/auth/register', { data: fresh })).ok()).toBeTruthy();
  expect((await page.request.post(`/api/courses/${DE}/enroll`)).ok()).toBeTruthy();

  // ardıcıl kurs: 1-ci dərsi tamamla → 2-ci dərs açılır; onu da tamamla → test addımı açılır
  const map = await (await page.request.get(`/api/learn/courses/${DE}`)).json();
  const [first, second] = map.map.modules[0].steps as Array<{ id: string }>;
  const complete = async (id: string) => {
    await page.request.post(`/api/learn/steps/${id}/start`);
    expect((await page.request.post(`/api/learn/steps/${id}/complete`)).ok()).toBeTruthy();
  };
  await complete(first!.id);
  await page.goto(`/kurs/${DE}/giris/data-is-axini`);
  await expect(page.getByRole('heading', { name: 'Data iş axını (data workflow)' })).toBeVisible({
    timeout: 30_000,
  });
  await shot(page, '03-ders');
  await complete(second!.id);

  await page.goto(`/kurs/${DE}/giris/kimin-isidir`);
  const submit = page.getByRole('button', { name: 'Cavabları göndər' });
  await expect(page.getByTestId('cls-pool-0')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Elementlər · 8')).toBeVisible();
  await expect(submit).toBeDisabled();
  await shot(page, '04-classify-bos');

  // YAML-da qruplar növbə ilə birləşir: cüt indekslər → 1-ci qrup, tək indekslər → 2-ci qrup.
  // Əvvəlcə hamısını sürüşdürərək 1-ci qrupa at (yarısı səhv olacaq)
  for (let i = 0; i < 8; i++)
    await page.getByTestId(`cls-item-0-${i}`).dragTo(page.getByTestId('cls-bucket-0-0'));
  await expect(page.getByText('Elementlər · 0')).toBeVisible();
  await page.getByLabel('Kəşf və vizuallaşdırma').check();
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByText(/düzgün qrup: Data engineer-in işi deyil/).first()).toBeVisible();
  await expect(page.locator('.cls-chip.bad')).toHaveCount(4);
  await expect(page.locator('.cls-chip.good')).toHaveCount(4);
  await shot(page, '05-classify-sehv');

  // yenidən cəhd: toxunaraq yerləşdir (element → qrup)
  await page.getByRole('button', { name: 'Yenidən cəhd et' }).click();
  for (let i = 0; i < 8; i++) {
    await page.getByTestId(`cls-item-0-${i}`).click();
    await page.getByTestId(`cls-bucket-0-${i % 2}`).click();
  }
  await page.getByLabel('Toplama və saxlama').check();
  await submit.click();
  await expect(page.locator('.cls-chip.good')).toHaveCount(8);
  await expect(page.getByText('Testi keçdiniz!').first()).toBeVisible();
  await shot(page, '06-classify-kecdi');
});

test('mobil: classify sualı bir sütunda, üfüqi sürüşmə yoxdur', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.request.post('/api/auth/login', { data: fresh });
  await page.goto(`/kurs/${DE}/giris/kimin-isidir`);
  await expect(page.getByTestId('cls-bucket-0-1')).toBeVisible({ timeout: 30_000 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: resolve(OUT, '07-classify-mobil.png') });
  await ctx.close();
});

test('admin: test redaktorunda «Qruplara ayır» sualı — qruplar və elementlərin qrupu', async ({
  page,
}) => {
  await login(page, ADMIN);
  await page.goto(`/admin/kurslar/${DE}`);
  await page.getByRole('button', { name: 'Məşq: Bu kimin işidir?', exact: true }).click();
  await expect(page.getByText('Qruplar', { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('textbox', { name: 'Qrup 1', exact: true })).toHaveValue(
    'Data engineer-in işi',
  );
  await expect(page.getByTestId('q0-item1-bucket')).toHaveValue('1');
  await shot(page, '08-admin-classify');
});
