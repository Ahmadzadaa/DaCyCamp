/**
 * Test hesabları (.env → SEED_ADMIN_* / SEED_STUDENT_*): giriş forması ilə daxil olma,
 * admin /admin-ə girir, tələbə girə bilmir (UI yönləndirmə + API 403).
 * İşə salma: `pnpm db:seed` sonra `pnpm --filter @dacy/web e2e -- e2e/accounts.spec.ts`
 */
import { expect, test, type Page } from '@playwright/test';
import { ADMIN, STUDENT } from './helpers';

async function loginViaForm(page: Page, who: { email: string; password: string }) {
  await page.goto('/giris');
  await page.getByLabel('E-poçt', { exact: true }).fill(who.email);
  await page.getByLabel('Şifrə', { exact: true }).fill(who.password);
  await page.getByRole('button', { name: 'Daxil ol' }).click();
  await expect(page).not.toHaveURL(/\/giris/, { timeout: 30_000 });
}

test('admin hesabı: giriş → /admin açılır', async ({ page }) => {
  await loginViaForm(page, ADMIN);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Ümumi baxış' })).toBeVisible({ timeout: 30_000 });
  await page.goto('/admin/kurslar');
  await expect(page.getByRole('heading', { name: 'Kurslar' })).toBeVisible();
  const r = await page.request.get('/api/admin/courses');
  expect(r.status()).toBe(200);
  const me = await (await page.request.get('/api/auth/me')).json();
  expect(me.role).toBe('ADMIN');
});

test('tələbə hesabı: giriş → /admin-ə girə bilmir, nümunə kursa yazılıb', async ({ page }) => {
  await loginViaForm(page, STUDENT);
  const me = await (await page.request.get('/api/auth/me')).json();
  expect(me.role).toBe('STUDENT');
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/kurslar$/, { timeout: 30_000 });
  await expect(page).not.toHaveURL(/\/admin/);
  expect((await page.request.get('/api/admin/courses')).status()).toBe(403);
  // seed tələbəni NÜMUNƏ kursa yazır
  const enr = await (await page.request.get('/api/me/enrollments')).json();
  expect(enr.some((e: { courseSlug: string }) => e.courseSlug === 'numune')).toBeTruthy();
});
