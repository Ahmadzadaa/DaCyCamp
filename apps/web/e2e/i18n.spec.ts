import { expect, test } from '@playwright/test';
import { STUDENT, login } from './helpers';

/** Dil: defolt azərbaycan dili; «EN» düyməsi bütün interfeysi ingilis dilinə keçirir */
test('qonaq: defolt az, düymə ilə en və geri', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'az');
  await expect(page.getByTestId('landing-login')).toHaveText('Daxil ol');

  await page.getByTestId('lang-switch').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Learn data and cybersecurity with real-world exercises',
    }),
  ).toBeVisible();
  await expect(page.getByTestId('landing-login')).toHaveText('Log in');
  await expect(page).toHaveTitle('DaCy Academy — learn data and cybersecurity by doing');

  // seçim cookie-də qalır — digər səhifələr də ingiliscə (server + client komponentlər)
  await page.goto('/giris');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to site' })).toBeVisible();

  await page.getByTestId('lang-switch').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'az');
  await expect(page.getByRole('heading', { name: 'Xoş gəlmisiniz' })).toBeVisible();
});

test('tələbə: profildə dil seçimi hesabda saxlanılır, yeni girişdə tətbiq olunur', async ({
  page,
  context,
}) => {
  await login(page, STUDENT);
  // dev serverdə hidrasiya gecikə bilər — select-in onChange-i bağlanana qədər gözlə
  await page.goto('/profil', { waitUntil: 'networkidle' });
  await page.waitForFunction(() =>
    Object.keys(document.querySelector('[data-testid=profile-language]') ?? {}).some((k) =>
      k.startsWith('__reactProps'),
    ),
  );
  await page.getByTestId('profile-language').selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en', { timeout: 20_000 });
  await expect(page.getByText('Appearance and language')).toBeVisible();
  expect((await (await page.request.get('/api/auth/me')).json()).locale).toBe('en');

  // başqa cihaz kimi: cookie-lər yoxdur → formadan giriş → profildəki dil tətbiq olunur
  await context.clearCookies();
  await page.goto('/giris');
  await expect(page.locator('html')).toHaveAttribute('lang', 'az');
  await page.locator('input[type=email]').fill(STUDENT.email);
  await page.locator('input[type=password]').fill(STUDENT.password);
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL(/\/panel/, { timeout: 30_000 });
  await expect(page.locator('html')).toHaveAttribute('lang', 'en', { timeout: 20_000 });
  await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible();

  // digər testlərə təsir etməsin — azərbaycan dilinə qaytar
  await page.waitForLoadState('networkidle');
  await page.getByTestId('lang-switch').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'az', { timeout: 20_000 });
  expect((await (await page.request.get('/api/auth/me')).json()).locale).toBe('az');
});
