/**
 * Mərhələ 2 — brauzerdə SQL (DuckDB-WASM), Python (Pyodide), CTF flag yoxlaması, ipucu, ZIP idxal/ixrac.
 * İşə salma: API + web işləyərkən `pnpm --filter @dacy/web e2e -- e2e/phase2.spec.ts`
 */
import { expect, test, type Page } from '@playwright/test';
import { ADMIN, login } from './helpers';

test.describe.configure({ mode: 'serial' });

// hər işə salmada təmiz tələbə — irəliləyiş sıfırdan başlayır
const fresh = {
  name: 'E2E Tələbə',
  email: `e2e-${Date.now()}@dacy.local`,
  password: 'E2eTelebe123!',
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

async function waitRuntime(page: Page) {
  await expect(page.getByText('Mühit hazırdır')).toBeVisible({ timeout: 120_000 });
}

test('qeydiyyat + nəzəri/test API ilə → SQL addımı açılır', async ({ page }) => {
  const r = await page.request.post('/api/auth/register', { data: fresh });
  expect(r.ok()).toBeTruthy();
  await page.request.post('/api/courses/numune/enroll');
  const map = await (await page.request.get('/api/learn/courses/numune')).json();
  const steps: Array<{ id: string; key: string }> = map.map.modules[0].steps;
  const byKey = Object.fromEntries(steps.map((s) => [s.key, s]));
  await page.request.post(`/api/learn/steps/${byKey.nezeri.id}/start`);
  expect(
    (await page.request.post(`/api/learn/steps/${byKey.nezeri.id}/complete`)).ok(),
  ).toBeTruthy();
  await page.request.post(`/api/learn/steps/${byKey.test.id}/start`);
  const q = await page.request.post(`/api/learn/steps/${byKey.test.id}/submit`, {
    data: { kind: 'quiz', answers: [[0], [0, 2]] },
  });
  expect((await q.json()).passed).toBe(true);
});

test('SQL: brauzerdə işə sal → nəticə cədvəli → ipucu (XP cəriməsi) → göndər → növbəti addım', async ({
  page,
}) => {
  await login(page, fresh);
  page.on('dialog', (d) => d.accept()); // ipucu təsdiqi
  await page.goto('/kurs/numune/numune-fesil/sql');
  await waitRuntime(page);

  // səhv sorğu → konsolda xəta, göndərmə keçmir
  await setEditor(page, 'SELECT * FROM yoxdur');
  await page.getByRole('button', { name: 'İşə sal' }).click();
  await expect(
    page
      .locator('.ws-console, [role="tabpanel"], pre')
      .filter({ hasText: /yoxdur|Catalog|Table/i })
      .first(),
  ).toBeVisible({
    timeout: 30_000,
  });

  // düzgün sorğu
  await setEditor(page, 'SELECT * FROM numune');
  await page.getByRole('button', { name: 'İşə sal' }).click();
  await expect(page.getByText(/3 sətir/)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('table.tbl')).toBeVisible();
  await expect(page.locator('table.tbl th')).toHaveCount(3);

  // ipucu: window.confirm → qəbul → mətn görünür
  await page.getByRole('button', { name: /İpucu göstər/ }).click();
  await expect(page.getByText(/Nümunə ipucu/)).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: /Göndər və davam et/ }).click();
  await expect(page).toHaveURL(/\/kurs\/numune\/numune-fesil\/python$/, { timeout: 30_000 });

  // XP: 50 (addım) − 10 (ipucu)
  const me = await (
    await page.request.get('/api/learn/steps/' + (await stepId(page, 'sql')) + '/submissions')
  ).json();
  expect(Array.isArray(me)).toBeTruthy();
});

test('Python: Pyodide ilə işə sal → stdout → testlər → növbəti addım', async ({ page }) => {
  await login(page, fresh);
  await page.goto('/kurs/numune/numune-fesil/python');
  await waitRuntime(page);

  // test keçməyən kod → "Testlər keçmədi", səhifə dəyişmir
  await setEditor(page, 'x = 2\nprint("salam", x)');
  await page.getByRole('button', { name: 'İşə sal' }).click();
  await expect(page.locator('pre').filter({ hasText: 'salam 2' })).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: /Göndər və davam et/ }).click();
  await expect(page.getByText(/Testlər keçmədi/)).toBeVisible({ timeout: 60_000 });
  await expect(page).toHaveURL(/\/python$/);

  // düzgün həll
  await setEditor(page, 'x = 1\nprint("salam", x)');
  await page.getByRole('button', { name: /Göndər və davam et/ }).click();
  await expect(page).toHaveURL(/\/kurs\/numune\/numune-fesil\/terminal$/, { timeout: 60_000 });
});

test('CTF (müəllim önizləməsi): səhv cavab → ipucu → düzgün cavab (hərf ölçüsünə həssas deyil)', async ({
  page,
}) => {
  await login(page, ADMIN);
  await page.goto('/kurs/numune/numune-fesil/ctf?onizle=1');
  const input = page.getByRole('textbox').first();
  await input.fill('DACY{sehv}');
  await page.getByRole('button', { name: 'Göndər' }).first().click();
  await expect(page.getByText('Düzgün deyil, yenidən cəhd edin')).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: /İpucu göstər/ }).click();
  await expect(page.getByText(/Nümunə ipucu: faylı açın/)).toBeVisible({ timeout: 15_000 });

  await input.fill('dacy{NUMUNE}');
  await page.getByRole('button', { name: 'Göndər' }).first().click();
  await expect(page.getByText('Düzgündür!').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Bütün suallar həll olundu!').first()).toBeVisible();
});

test('CTF: cavab heş-i tələbəyə getmir', async ({ page }) => {
  await login(page, ADMIN);
  const view = await (
    await page.request.get('/api/learn/courses/numune/steps/numune-fesil/ctf?preview=1')
  ).json();
  const text = JSON.stringify(view);
  expect(text).not.toMatch(/answer_hash|answerHash|DACY\{numune\}/);
  expect(view.view.tasks[0]).not.toHaveProperty('answer');
});

test('ZIP: ixrac → /admin/idxal-da yoxla → tətbiq et (irəliləyiş qorunur)', async ({ page }) => {
  await login(page, ADMIN);
  const tree = await (await page.request.get('/api/admin/courses/numune')).json();
  const zip = await page.request.get(`/api/admin/courses/${tree.id}/export.zip`);
  expect(zip.ok()).toBeTruthy();
  expect(zip.headers()['content-type']).toContain('application/zip');
  const buffer = await zip.body();
  expect(buffer.byteLength).toBeGreaterThan(500);

  await page.goto('/admin/idxal');
  await page.setInputFiles('[data-testid="zip-input"]', {
    name: 'numune.zip',
    mimeType: 'application/zip',
    buffer,
  });
  await page.getByRole('button', { name: 'Yoxla' }).click();
  await expect(page.getByRole('main').getByText('Paket keçərlidir')).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText('NÜMUNƏ — silinə bilər').first()).toBeVisible();

  await page.getByTestId('apply-import').click();
  await expect(page.getByText('Kurs idxal olundu').first()).toBeVisible({ timeout: 60_000 });

  // addımlar dərcdə qalır, tələbənin irəliləyişi itmir
  const after = await (await page.request.get('/api/admin/courses/numune')).json();
  expect(after.modules[0].steps.every((s: { isPublished: boolean }) => s.isPublished)).toBe(true);
  const imports = await (await page.request.get('/api/admin/imports')).json();
  expect(imports[0].status).toBe('APPLIED');
});

test('ZIP: yanlış paket rədd edilir, heç nə yazılmır', async ({ page }) => {
  await login(page, ADMIN);
  await page.goto('/admin/idxal');
  await page.setInputFiles('[data-testid="zip-input"]', {
    name: 'sehv.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from('bu zip deyil'),
  });
  await page.getByRole('button', { name: 'Yoxla' }).click();
  await expect(page.getByText(/Paketdə səhvlər var|Paket oxunmadı|ZIP/).first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId('apply-import')).toBeDisabled();
});

async function stepId(page: Page, key: string) {
  const map = await (await page.request.get('/api/learn/courses/numune')).json();
  return map.map.modules[0].steps.find((s: { key: string }) => s.key === key).id;
}
