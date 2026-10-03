/**
 * content/courses/python4business — repo-dakı kurs paketi: idxal, tələbə axını, Python runtime yenilikləri
 * (dacy.lines ilə çap yoxlaması, sonu yeni sətirsiz print, sonsuz dövr gözətçisi), Markdown test sualları.
 * İşə salma: API + web işləyərkən `pnpm --filter @dacy/web e2e -- e2e/python-course.spec.ts`
 */
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { ADMIN, ROOT, login } from './helpers';

test.describe.configure({ mode: 'serial' });

const SLUG = 'python4business';
const fresh = {
  name: 'E2E Python',
  email: `e2e-py-${Date.now()}@dacy.local`,
  password: 'E2ePython123!',
};

type MonacoWindow = Window & {
  monaco?: { editor: { getModels(): Array<{ setValue(v: string): void }> } };
};

async function setEditor(page: Page, code: string) {
  await page.waitForFunction(
    () => {
      const w = window as MonacoWindow;
      return !!w.monaco && w.monaco.editor.getModels().length > 0;
    },
    null,
    { timeout: 90_000 },
  );
  await page.evaluate((c) => {
    (window as MonacoWindow).monaco!.editor.getModels()[0].setValue(c);
  }, code);
}

const waitRuntime = (page: Page) =>
  expect(page.getByText('Mühit hazırdır')).toBeVisible({ timeout: 120_000 });

test('admin: kurs paketi idxal olunub (yoxdursa idxal edir)', async ({ page }) => {
  await login(page, ADMIN);
  const AdmZip = createRequire(resolve(ROOT, 'apps/api/package.json'))('adm-zip');
  const zip = new AdmZip();
  zip.addLocalFolder(resolve(ROOT, 'content/courses', SLUG), SLUG);
  const file = { name: `${SLUG}.zip`, mimeType: 'application/zip', buffer: zip.toBuffer() };
  const report = await (
    await page.request.post('/api/admin/import/validate', { multipart: { file } })
  ).json();
  expect(report.errors).toEqual([]);
  expect(report.summary.byType).toEqual({ THEORY: 18, PYTHON: 18, QUIZ: 7 });
  if (!report.course.exists) {
    const applied = await page.request.post('/api/admin/import/apply', { multipart: { file } });
    expect((await applied.json()).ok).toBe(true);
  }
});

test('kataloq → kurs səhifəsi: 7 fəsil, Gün 1 və Gün 2', async ({ page }) => {
  await page.goto('/kurslar');
  await expect(page.getByText('Python4Business').first()).toBeVisible({ timeout: 30_000 });
  await page.goto(`/kurs/${SLUG}`);
  await expect(page.getByText('Gün 1 · Python-a giriş və iş mühiti')).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText('Gün 2 · Xətaların idarəsi (exceptions)')).toBeVisible();
});

test('tələbə: nəzəri addımlar → isinmə tapşırığı (çap yoxlanılır) → Markdown-lı test', async ({
  page,
}) => {
  expect((await page.request.post('/api/auth/register', { data: fresh })).ok()).toBeTruthy();
  await page.request.post(`/api/courses/${SLUG}/enroll`);
  const map = await (await page.request.get(`/api/learn/courses/${SLUG}`)).json();
  const steps: Array<{ id: string; key: string; type: string }> = map.map.modules[0].steps;
  for (const s of steps.filter((x) => x.type === 'THEORY')) {
    await page.request.post(`/api/learn/steps/${s.id}/start`);
    expect((await page.request.post(`/api/learn/steps/${s.id}/complete`)).ok()).toBeTruthy();
  }

  // şəkilli nəzəri addım: kurs faylından şəkil yüklənir
  await page.goto(`/kurs/${SLUG}/g1-giris/jupyter-ide`);
  const img = page.getByRole('img', { name: 'Jupyter Notebook interfeysi' });
  await expect(img).toBeVisible({ timeout: 30_000 });
  expect(await img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(100);

  await page.goto(`/kurs/${SLUG}/g1-giris/isinma`);
  await waitRuntime(page);
  // print yoxdur → test aydın mesajla düşür
  await setEditor(
    page,
    'cem = sum([2, len([2, 3])])\na = "Code Academy"\nyeni = a.replace("Academy", "Python")',
  );
  await page.getByRole('button', { name: /Göndər və davam et/ }).click();
  await expect(page.getByText(/Testlər keçmədi/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/sətri görünmür/)).toBeVisible();

  await setEditor(
    page,
    'print("Salam, Python!")\ncem = sum([2, len([2, 3])])\nprint(cem)\na = "Code Academy"\nyeni = a.replace("Academy", "Python")\nprint(yeni)',
  );
  await page.getByRole('button', { name: /Göndər və davam et/ }).click();
  await expect(page).toHaveURL(/\/g1-giris\/giris-testi$/, { timeout: 60_000 });

  // test sualında Markdown: inline kod
  const q = page.locator('.quiz-q-text').filter({ hasText: 'arasında fərq' });
  await expect(q.locator('code').first()).toHaveText('=');
});

test('Python runtime: sonu yeni sətirsiz print görünür, sonsuz dövr dayandırılır', async ({
  page,
}) => {
  await login(page, ADMIN);
  await page.goto(`/kurs/${SLUG}/g2-dovrler/for-cem-cut?onizle=1`);
  await waitRuntime(page);

  await setEditor(page, 'for i in range(2, 7, 2):\n    print(i, end=" ")');
  await page.getByRole('button', { name: 'İşə sal' }).click();
  await expect(page.locator('pre').filter({ hasText: '2 4 6' })).toBeVisible({ timeout: 60_000 });

  await setEditor(page, 'i = 1\nwhile i <= 5:\n    x = i');
  await page.getByRole('button', { name: 'İşə sal' }).click();
  await expect(page.getByText(/saniyədən çox işlədi/)).toBeVisible({ timeout: 60_000 });
  // səhifə donmayıb — növbəti icra işləyir
  await setEditor(page, 'print("hələ işləyir")');
  await page.getByRole('button', { name: 'İşə sal' }).click();
  await expect(page.locator('pre').filter({ hasText: 'hələ işləyir' })).toBeVisible({
    timeout: 30_000,
  });
});

test('input(): brauzer pəncərəsi açılmır — dəyərlər «Giriş» sekməsindən, boşdursa aydın ipucu', async ({
  page,
}) => {
  const dialogs: string[] = [];
  page.on('dialog', (d) => {
    dialogs.push(d.message());
    void d.dismiss();
  });
  await login(page, ADMIN);
  await page.goto(`/kurs/${SLUG}/g1-giris/isinma?onizle=1`);
  await waitRuntime(page);
  await setEditor(page, 'a = int(input("a: "))\nb = int(input("b: "))\nprint(a + b)');

  // Giriş boş → EOFError + ipucu, prompt() yoxdur
  await page.getByRole('button', { name: 'İşə sal' }).click();
  await expect(page.getByText(/input\(\) üçün dəyər qalmadı/)).toBeVisible({ timeout: 60_000 });

  await page.getByRole('tab', { name: /Giriş/ }).click();
  await page.getByTestId('py-stdin').fill('5\n7');
  await page.getByRole('button', { name: 'İşə sal' }).click();
  await page.getByRole('tab', { name: 'Konsol' }).click();
  await expect(page.locator('[data-testid="py-console"] pre')).toHaveText('a: 5\nb: 7\n12', {
    timeout: 60_000,
  });
  expect(dialogs).toEqual([]);
});
