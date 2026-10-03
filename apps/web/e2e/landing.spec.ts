import { expect, test } from '@playwright/test';
import { ADMIN, STUDENT, login } from './helpers';

/** Qonaq əvvəlcə tanışlıq səhifəsini görür; yuxarı sağda «Daxil ol» və «Qeydiyyat» */
test('qonaq: «/» tanışlıq səhifəsi → Qeydiyyat / Daxil ol', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);
  await expect(
    page.getByRole('heading', { level: 1, name: /real tapşırıqlarla öyrənin/ }),
  ).toBeVisible();
  for (const h of ['Hansı sahədə irəliləmək istəyirsiniz?', 'Üç addımda başlayın'])
    await expect(page.getByRole('heading', { name: h })).toBeVisible();
  // sual-cavab açılır
  await page.getByText('Platforma pulsuzdurmu?').click();
  await expect(page.getByText(/Qeydiyyat və kurslara yazılma pulsuzdur/)).toBeVisible();

  // dev serverdə auth səhifələri soyuq halda 5–9 s kompilyasiya olunur
  await page.getByTestId('landing-signup').click();
  await expect(page).toHaveURL(/\/qeydiyyat$/, { timeout: 30_000 });
  await page.goto('/');
  await page.getByTestId('landing-login').click();
  await expect(page).toHaveURL(/\/giris$/, { timeout: 30_000 });
});

test('mobil: header-də Daxil ol / Qeydiyyat görünür, üfüqi sürüşmə yoxdur', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByTestId('landing-login')).toBeVisible();
  await expect(page.getByTestId('landing-signup')).toBeVisible();
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(sw).toBeLessThanOrEqual(390);
});

test('daxil olmuş istifadəçi «/»-dan öz panelinə yönlənir', async ({ page }) => {
  await login(page, STUDENT);
  await page.goto('/');
  await expect(page).toHaveURL(/\/panel$/);
  await page.context().clearCookies();
  await login(page, ADMIN);
  await page.goto('/');
  await expect(page).toHaveURL(/\/admin$/);
});
