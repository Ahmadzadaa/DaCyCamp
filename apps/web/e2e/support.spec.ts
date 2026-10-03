/**
 * Dəstək: tələbə kömək düyməsindən yazır → admin siyahıda görür, cavablayır və bağlayır →
 * tələbə cavabı görür (oxunmamış nişanı).
 * İşə salma: API + web işləyərkən `pnpm --filter @dacy/web e2e -- e2e/support.spec.ts`
 */
import { expect, test } from '@playwright/test';
import { ADMIN, login } from './helpers';

test.describe.configure({ mode: 'serial' });

const fresh = {
  name: 'Dəstək Tələbəsi',
  email: `e2e-sup-${Date.now()}@dacy.local`,
  password: 'E2eDestek123!',
};
const subject = `Python xətası ${Date.now()}`;

test('tələbə kömək düyməsindən müraciət yazır', async ({ page }) => {
  expect((await page.request.post('/api/auth/register', { data: fresh })).ok()).toBeTruthy();
  await page.goto('/kurslar');
  await page.getByRole('button', { name: 'Kömək' }).click();
  await page.getByTestId('help-support').click();
  await expect(page).toHaveURL(/\/destek\?sehife=%2Fkurslar/, { timeout: 30_000 });
  const form = page.getByTestId('support-new');
  await form.getByLabel('Mövzu').fill(subject);
  await form.getByLabel('Mesaj').fill('print(cem) xəta verir — nə etməliyəm?');
  await form.getByRole('button', { name: 'Göndər' }).click();
  await expect(page).toHaveURL(/\/destek\/[a-z0-9]+$/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { level: 1, name: subject })).toBeVisible();
  await expect(page.getByText('Cavab gözləyir')).toBeVisible();
});

test('admin siyahıda görür, cavab yazır və bağlayır', async ({ page }) => {
  await login(page, ADMIN);
  await page.goto('/admin/destek');
  await page.getByRole('link', { name: new RegExp(subject) }).click();
  await expect(page.getByTestId('support-thread')).toContainText('print(cem) xəta verir', {
    timeout: 30_000,
  });
  await expect(page.getByText('/kurslar')).toBeVisible(); // müraciət yazılan səhifə
  await page
    .getByTestId('support-reply')
    .fill('«cem = ...» sətrini silmisiniz — əvvəlcə dəyər verin.');
  await page.getByRole('button', { name: 'Cavab yaz' }).click();
  await expect(page.getByTestId('support-thread')).toContainText('əvvəlcə dəyər verin');
  await expect(page.getByText('Cavablandı').first()).toBeVisible();
  await page.getByTestId('support-close').click();
  await expect(page.getByText('Müraciət bağlandı')).toBeVisible();
});

test('tələbə cavabı görür: siyahıda yeni cavab nişanı, mesajlarda heyətin cavabı', async ({
  page,
}) => {
  await login(page, fresh);
  await page.goto('/destek');
  const row = page.getByTestId('support-list').getByRole('link', { name: new RegExp(subject) });
  await expect(row.locator('.sup-dot')).toBeVisible({ timeout: 30_000 });
  await row.click();
  await expect(page.getByTestId('support-thread')).toContainText('DaCy dəstək');
  await expect(page.getByTestId('support-thread')).toContainText('əvvəlcə dəyər verin');
  await expect(page.getByText(/Müraciət bağlanıb/)).toBeVisible();
});
