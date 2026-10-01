import { expect, test } from '@playwright/test';
import { STUDENT } from './helpers';

test.describe.configure({ mode: 'serial' });
const email = `e2e+${Date.now()}@dacy.local`;

test('qeydiyyat → kataloq → kurs → yazılma → nəzəri → quiz → irəliləyiş', async ({ page }) => {
  await page.goto('/qeydiyyat');
  await page.getByLabel('Ad və soyad').fill('E2E Tələbə');
  await page.getByLabel('E-poçt').fill(email);
  await page.getByLabel('Şifrə').fill('Sifre1234');
  await page.getByRole('button', { name: 'Qeydiyyatdan keç' }).click();
  await expect(page).toHaveURL(/\/kurslar/);
  await expect(page.getByRole('heading', { name: 'Nə öyrənmək istəyirsiniz?' })).toBeVisible();

  await page.getByRole('link', { name: 'NÜMUNƏ — silinə bilər' }).first().click();
  await expect(page).toHaveURL(/\/kurs\/numune$/);
  await page.getByRole('button', { name: 'Kursa başla' }).click();
  await expect(page).toHaveURL(/\/kurs\/numune\/numune-fesil\/nezeri/);

  // nəzəri → "Oxudum, davam et" → quiz
  await page.getByRole('button', { name: /Oxudum, davam et/ }).click();
  await expect(page).toHaveURL(/\/numune-fesil\/test/);

  // quiz: səhv cavab → keçmədi
  await page.locator('fieldset').nth(0).getByRole('radio').nth(1).check();
  await page.locator('fieldset').nth(1).getByRole('checkbox').nth(1).check();
  await page.getByRole('button', { name: 'Cavabları göndər' }).click();
  await expect(page.locator('.ws-center').getByText(/Nəticə: 0%/)).toBeVisible();
  await page.getByRole('button', { name: 'Yenidən cəhd et' }).click();
  // düzgün cavab
  await page.locator('fieldset').nth(0).getByRole('radio').nth(0).check();
  await page.locator('fieldset').nth(1).getByRole('checkbox').nth(0).check();
  await page.locator('fieldset').nth(1).getByRole('checkbox').nth(2).check();
  await page.getByRole('button', { name: 'Cavabları göndər' }).click();
  await expect(page.locator('.ws-center').getByText(/Nəticə: 100%/)).toBeVisible();
  await page.getByRole('button', { name: /Davam et/ }).click();
  await expect(page).toHaveURL(/\/numune-fesil\/sql/);

  // kurs səhifəsi: 2 addım ✓, sql "Davam et →", python kilidli
  await page.goto('/kurs/numune');
  await expect(page.getByText('33%')).toBeVisible();
  const rows = page.locator('.steps li');
  await expect(rows.nth(0)).toHaveClass(/ok/);
  await expect(rows.nth(1)).toHaveClass(/ok/);
  await expect(rows.nth(2)).toContainText('Davam et');
  await expect(rows.nth(3)).toHaveClass(/lock/);

  // kilidli addıma birbaşa getmək → kurs səhifəsinə qaytarır
  await page.goto('/kurs/numune/numune-fesil/python');
  await expect(page).toHaveURL(/\/kurs\/numune/);

  // rəqəmli URL → açar URL
  await page.goto('/kurs/numune/1/1');
  await expect(page).toHaveURL(/\/numune-fesil\/nezeri/);

  // panel
  await page.goto('/panel');
  await expect(page.getByText('Qaldığınız yer')).toBeVisible();
  await expect(page.getByText('40', { exact: true })).toBeVisible(); // 10 + 30 XP
});

test('çıxış edilmiş halda /panel → /giris, yanlış şifrə mesajı', async ({ page }) => {
  await page.goto('/panel');
  await expect(page).toHaveURL(/\/giris\?next=%2Fpanel/);
  await page.getByLabel('E-poçt').fill(STUDENT.email);
  await page.getByLabel('Şifrə').fill('yanlis-sifre');
  await page.getByRole('button', { name: 'Daxil ol' }).click();
  await expect(page.getByText('E-poçt və ya şifrə yanlışdır')).toBeVisible();
});

test('sürüklənən ayırıcı panelin enini dəyişir (müəllim önizləməsi)', async ({ page }) => {
  await page.request.post('/api/auth/login', {
    data: { email: 'admin@dacy.local', password: 'Admin123!' },
  });
  await page.goto('/kurs/numune/numune-fesil/sql?onizle=1');
  const left = page.locator('.ws-left');
  const before = (await left.boundingBox())!.width;
  const gutter = page.locator('.gutter');
  const g = (await gutter.boundingBox())!;
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  await page.mouse.move(g.x + 180, g.y + g.height / 2, { steps: 8 });
  await page.mouse.up();
  const after = (await left.boundingBox())!.width;
  expect(after).toBeGreaterThan(before + 100);
});
