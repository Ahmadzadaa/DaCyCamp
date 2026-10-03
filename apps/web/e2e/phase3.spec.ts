/**
 * Mərhələ 3 — terminal lab (xterm.js + WebSocket, LAB_DRIVER=mock və ya docker), kursun tam bitirilməsi, sertifikat.
 * İşə salma: API + web işləyərkən `pnpm --filter @dacy/web e2e -- e2e/phase3.spec.ts`
 */
import { expect, test, type Page } from '@playwright/test';
import { ADMIN, login } from './helpers';

test.describe.configure({ mode: 'serial' });

const fresh = {
  name: 'E2E Lab Tələbəsi',
  email: `e2e-lab-${Date.now()}@dacy.local`,
  password: 'E2eLab123!',
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

async function stepIds(page: Page) {
  const map = await (await page.request.get('/api/learn/courses/numune')).json();
  const steps: Array<{ id: string; key: string; state: string }> = map.map.modules[0].steps;
  return Object.fromEntries(steps.map((s) => [s.key, s]));
}

let certId = '';

test('qeydiyyat → nəzəri, test (API) → SQL (UI) → Python (API)', async ({ page }) => {
  test.setTimeout(180_000);
  expect((await page.request.post('/api/auth/register', { data: fresh })).ok()).toBeTruthy();
  await page.request.post('/api/courses/numune/enroll');
  const s = await stepIds(page);
  await page.request.post(`/api/learn/steps/${s.nezeri.id}/start`);
  await page.request.post(`/api/learn/steps/${s.nezeri.id}/complete`);
  await page.request.post(`/api/learn/steps/${s.test.id}/start`);
  await page.request.post(`/api/learn/steps/${s.test.id}/submit`, {
    data: { kind: 'quiz', answers: [[0], [0, 2]] },
  });

  await login(page, fresh);
  await page.goto('/kurs/numune/numune-fesil/sql');
  await expect(page.getByText('Mühit hazırdır')).toBeVisible({ timeout: 120_000 });
  await setEditor(page, 'SELECT * FROM numune');
  await page.getByRole('button', { name: /Göndər və davam et/ }).click();
  await expect(page).toHaveURL(/\/python$/, { timeout: 30_000 });

  const s2 = await stepIds(page);
  await page.request.post(`/api/learn/steps/${s2.python.id}/start`);
  const py = await page.request.post(`/api/learn/steps/${s2.python.id}/submit`, {
    data: { kind: 'python', passed: true, code: 'x = 1' },
  });
  expect(py.ok()).toBeTruthy();
});

test('terminal lab: başlat → xterm → touch ~/done.txt → Yoxla → keçdi → Davam et', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await login(page, fresh);
  page.on('dialog', (d) => d.accept());
  await page.goto('/kurs/numune/numune-fesil/terminal');
  await expect(page.getByRole('tab', { name: 'Terminal' })).toBeVisible();
  await page.getByTestId('lab-start').click();
  const term = page.locator('[data-testid="lab-terminal"][data-state="open"]');
  await expect(term).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('lab-timer')).toContainText('qalıb');
  // mock qabıq promptu
  await expect(page.locator('.xterm-rows')).toContainText('student@dacy-lab', { timeout: 15_000 });

  // əvvəl yoxla → keçmir
  await page.getByTestId('lab-check').click();
  await expect(page.getByTestId('lab-check-output')).toContainText('✗', { timeout: 30_000 });
  await expect(page.locator('.actions .res')).toContainText('keçmədi');

  // terminalda faylı yarat
  await page.locator('[data-testid="lab-terminal"]').click();
  await page.keyboard.type('touch ~/done.txt');
  await page.keyboard.press('Enter');
  await page.keyboard.type('ls');
  await page.keyboard.press('Enter');
  await expect(page.locator('.xterm-rows')).toContainText('done.txt', { timeout: 10_000 });

  await page.getByTestId('lab-check').click();
  await expect(page.getByTestId('lab-check-output')).toContainText('✓', { timeout: 30_000 });
  await expect(page.locator('.actions .res')).toContainText('Lab keçildi');
  await expect(page.getByTestId('lab-continue')).toBeEnabled();

  // lab-ı sıfırla → yeni sessiya, terminal yenidən açılır
  await page.getByTestId('lab-reset').click();
  await expect(page.locator('[data-testid="lab-terminal"][data-state="open"]')).toBeVisible({
    timeout: 60_000,
  });

  await page.getByTestId('lab-continue').click();
  await expect(page).toHaveURL(/\/kurs\/numune\/numune-fesil\/ctf$/, { timeout: 30_000 });
});

test('CTF həll → kurs bitir → sertifikat verilir, kurs səhifəsində link', async ({ page }) => {
  test.setTimeout(120_000);
  await login(page, fresh);
  await page.goto('/kurs/numune/numune-fesil/ctf');
  await page.getByRole('textbox').first().fill('dacy{NUMUNE}');
  await page.getByRole('button', { name: 'Göndər' }).first().click();
  await expect(page.getByText('Düzgündür!').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Sertifikat qazandınız!').first()).toBeVisible({ timeout: 15_000 });

  await page.goto('/kurs/numune');
  const link = page.getByTestId('course-cert');
  await expect(link).toBeVisible();
  const href = await link.getAttribute('href');
  certId = href!.split('/').pop()!;
  expect(certId.length).toBeGreaterThan(10);

  await link.click();
  // dev serverdə /sertifikat/[id] soyuq kompilyasiya olunur (~10 s)
  await expect(page).toHaveURL(new RegExp(`/sertifikat/${certId}$`), { timeout: 30_000 });
  await expect(page.getByTestId('cert-name')).toHaveText(fresh.name);
  await expect(page.getByTestId('cert-serial')).toContainText(/DACY-C-\d{4}-\d{6}/);
  await expect(page.getByTestId('cert-status')).toContainText('Etibarlıdır');
  await expect(page.getByTestId('certificate').locator('img[alt="QR"]')).toBeVisible();

  // PDF
  const pdf = await page.request.get(`/api/certificates/${certId}.pdf`);
  expect(pdf.ok()).toBeTruthy();
  expect(pdf.headers()['content-type']).toContain('application/pdf');
  expect((await pdf.body()).subarray(0, 4).toString()).toBe('%PDF');

  // paneldə və siyahıda
  await page.goto('/panel');
  await expect(page.getByTestId('dash-cert')).toBeVisible();
  await page.goto('/sertifikatlar');
  await expect(page.getByText('NÜMUNƏ — silinə bilər').first()).toBeVisible();
});

test('ictimai yoxlama səhifəsi girişsiz açılır; olmayan id → 404', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`/sertifikat/${certId}`);
  await expect(page.getByTestId('cert-name')).toHaveText(fresh.name);
  await expect(page.getByTestId('cert-status')).toContainText('Etibarlıdır');
  const r = await page.goto('/sertifikat/00000000-0000-0000-0000-000000000000');
  expect(r?.status()).toBe(404);
  await ctx.close();
});

test('admin: lab sessiyaları siyahısı və dayandırma (önizləmə lab-ı)', async ({ page }) => {
  await login(page, ADMIN);
  await page.goto('/kurs/numune/numune-fesil/terminal?onizle=1');
  // əvvəlki test/skrinşotdan admin-in aktiv sessiyası ola bilər — onda düymə yoxdur, terminal birbaşa açılır
  const start = page.getByTestId('lab-start');
  if (
    await start
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false)
  )
    await start.click();
  await expect(page.locator('[data-testid="lab-terminal"][data-state="open"]')).toBeVisible({
    timeout: 60_000,
  });
  await page.goto('/admin/lablar');
  await expect(page.getByRole('heading', { name: 'Lab sessiyaları' })).toBeVisible();
  const rows = page.locator('tr', { hasText: ADMIN.email });
  await expect(rows.first()).toBeVisible();
  const before = await rows.count(); // əvvəlki skrinşot/testlərdən bir neçə sessiya ola bilər
  await rows.first().getByRole('button', { name: 'Dayandır' }).click();
  await expect(page.getByText('Lab dayandırıldı').first()).toBeVisible();
  await expect(rows).toHaveCount(before - 1, { timeout: 15_000 });
});
