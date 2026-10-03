/**
 * Fəslin sonuna video dərs: admin «+ Video dərs» → fayl (irəliləyiş) → addım fəslin sonunda yaranır və dərc olunur;
 * dərs ekranında video pleyer.
 * İşə salma: API + web işləyərkən `pnpm --filter @dacy/web e2e -- e2e/video.spec.ts`
 */
import { expect, test } from '@playwright/test';
import { ADMIN, login } from './helpers';

test('admin fəslin sonuna video dərs əlavə edir, tələbə ekranında video görünür', async ({
  page,
}) => {
  await login(page, ADMIN);
  await page.goto('/admin/kurslar/python4business');
  const add = page.locator('[data-testid^="add-video-"]').first();
  await expect(add).toBeVisible({ timeout: 30_000 });
  await add.click();
  await expect(page.getByRole('dialog')).toContainText('Fəslin sonuna video dərs');
  await page.getByTestId('video-file').setInputFiles({
    name: 'e2e-video.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.alloc(512 * 1024, 1),
  });
  await expect(page.getByRole('dialog')).toContainText('e2e-video.mp4');
  await page.getByRole('dialog').getByRole('textbox').first().fill('E2E video dərs');
  await page.getByTestId('video-submit').click();
  await expect(page.getByText('Video dərs fəslin sonuna əlavə olundu')).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // addım fəslin sonunda, dərc olunub, video yolu ilə
  const course = await (await page.request.get('/api/admin/courses?q=python4business')).json();
  const id = course.courses.find((c: { slug: string }) => c.slug === 'python4business').id;
  const tree = await (await page.request.get(`/api/admin/courses/${id}`)).json();
  const mod = tree.modules[0];
  const last = mod.steps[mod.steps.length - 1];
  expect(last.title).toBe('E2E video dərs');
  expect(last.isPublished).toBe(true);

  await page.goto(`/kurs/python4business/${mod.key}/${last.key}?onizle=1`);
  await expect(page.locator('video')).toHaveAttribute('src', /\/api\/assets\/.+e2e-video\.mp4/, {
    timeout: 30_000,
  });

  // təmizlik
  expect((await page.request.delete(`/api/admin/steps/${last.id}`)).ok()).toBeTruthy();
});
