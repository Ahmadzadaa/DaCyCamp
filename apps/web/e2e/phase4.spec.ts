/**
 * Mərhələ 4 — Learning Path: onboarding, yollar siyahısı, yol xəritəsi, imtahan, layihə + müəllim rəyi, final + sertifikat, admin redaktor.
 * İşə salma: API + web işləyərkən `pnpm --filter @dacy/web e2e -- e2e/phase4.spec.ts`
 */
import { expect, test, type Page } from '@playwright/test';
import { ADMIN, login } from './helpers';

test.describe.configure({ mode: 'serial' });

const fresh = {
  name: 'Yol Tələbəsi',
  email: `e2e-yol-${Date.now()}@dacy.local`,
  password: 'YolTelebe123!',
};
const pathSlug = `e2e-yol-${Date.now()}`;
let pathId = '';

/** Əvvəlki uğursuz icralardan qalan e2e yollarını silir (admin sessiyası tələb olunur) */
async function cleanupPaths(page: Page) {
  const all = (await (await page.request.get('/api/admin/paths')).json()) as Array<{
    id: string;
    slug: string;
  }>;
  for (const p of all) {
    if (p.slug.startsWith('e2e-yol-') && p.slug !== pathSlug) {
      expect((await page.request.delete(`/api/admin/paths/${p.id}?force=1`)).ok()).toBeTruthy();
    }
  }
}

/** Admin API ilə yalnız imtahan + layihə + final addımlı yol (kurs tamamlamadan tam axın) */
async function createPath(page: Page) {
  await login(page, ADMIN);
  await cleanupPaths(page);
  const r = await page.request.post('/api/admin/paths', {
    data: {
      track: 'data-analytics',
      title: 'E2E yolu',
      slug: pathSlug,
      level: 'BEGINNER',
      description: 'E2E üçün yol',
      skills: ['SQL', 'Python'],
      target_audience: 'Testçilər',
      sequential: true,
    },
  });
  expect(r.ok()).toBeTruthy();
  pathId = (await r.json()).id;
  const add = (body: unknown) =>
    page.request.post(`/api/admin/paths/${pathId}/items`, { data: body });
  expect(
    (
      await add({
        type: 'assessment',
        title: 'E2E imtahanı',
        xp: 50,
        config: {
          pass_score: 50,
          questions: [
            {
              text: 'İki dəfə iki?',
              type: 'single',
              options: ['3', '4'],
              correct: [1],
              explanation: '2×2=4',
            },
          ],
        },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await add({
        type: 'project',
        title: 'E2E layihəsi',
        xp: 100,
        config: {
          instructions: 'Bir fayl təhvil verin.',
          deliverables: ['Fayl'],
          review_mode: 'manual',
          allow_link: true,
          max_files: 2,
        },
      })
    ).ok(),
  ).toBeTruthy();
  expect((await add({ type: 'course', course_slug: 'numune', optional: true })).ok()).toBeTruthy();
  expect(
    (
      await add({
        type: 'milestone',
        title: 'E2E finalı',
        config: { certificate_title: 'E2E Analyst', description: 'Son addım' },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await page.request.post(`/api/admin/paths/${pathId}/publish`, { data: { published: true } })
    ).ok(),
  ).toBeTruthy();
}

test('admin: yol API ilə yaradılır, redaktor açılır, addım əlavə dialoqu işləyir', async ({
  page,
}) => {
  await createPath(page);
  await page.goto('/admin/yollar');
  await expect(page.getByRole('link', { name: 'E2E yolu' }).first()).toBeVisible();
  await page.goto(`/admin/yollar/${pathSlug}`);
  await expect(page.getByTestId('path-item-row')).toHaveCount(4);
  await page.getByTestId('path-add-item').click();
  await page.getByTestId('new-item-type').selectOption('milestone');
  await page.getByTestId('new-item-title').fill('Əlavə final');
  await page.getByTestId('new-item-add').click();
  await expect(page.getByTestId('path-item-row')).toHaveCount(5, { timeout: 15_000 });
  await expect(page.getByTestId('path-item-form')).toBeVisible();
  // əlavə addımı sil
  page.once('dialog', (d) => d.accept());
  await page.getByTestId('path-item-form').getByRole('button', { name: 'Sil' }).click();
  await expect(page.getByTestId('path-item-row')).toHaveCount(4, { timeout: 15_000 });
});

test('qeydiyyat → onboarding → istiqamət → «Bu yola başla» → yol səhifəsi', async ({ page }) => {
  await page.goto('/qeydiyyat');
  await page.getByLabel('Ad və soyad').fill(fresh.name);
  await page.getByLabel('E-poçt', { exact: true }).fill(fresh.email);
  await page.getByLabel('Şifrə', { exact: true }).fill(fresh.password);
  await page.getByRole('button', { name: 'Qeydiyyat' }).click();
  await expect(page).toHaveURL(/\/baslangic$/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Hansı peşəyə hazırlaşırsınız?' })).toBeVisible();
  await page.getByTestId('onboarding-track').first().click();
  const card = page.locator(`[data-testid="onboarding-path"][data-slug="${pathSlug}"]`);
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Bu yola başla' }).click();
  await expect(page).toHaveURL(new RegExp(`/yol/${pathSlug}$`), { timeout: 30_000 });
  await expect(page.getByTestId('path-percent')).toHaveText('0%');
  const nodes = page.getByTestId('path-node');
  await expect(nodes).toHaveCount(3);
  await expect(nodes.nth(0)).toHaveAttribute('data-state', 'current');
  await expect(page.getByText('Siz buradasınız')).toBeVisible();
  await expect(nodes.nth(1)).toHaveAttribute('data-state', 'locked');
  await expect(page.locator('.opt a')).toHaveCount(1);
  // yollar siyahısı və panel
  await page.goto('/yollar');
  await expect(page.locator(`[data-testid="path-card"][href="/yol/${pathSlug}"]`)).toContainText(
    'Aktiv yol',
  );
  await page.goto('/panel');
  await expect(page.getByTestId('dash-active-path')).toContainText('E2E yolu');
});

test('imtahan: səhv → keçmədi, düzgün → keçdi; xəritə irəliləyir', async ({ page }) => {
  await login(page, fresh);
  await page.goto(`/yol/${pathSlug}/e2e-imtahani`);
  await expect(page.getByTestId('assessment-question')).toHaveCount(1);
  await page.getByTestId('assessment-question').getByText('3').click();
  await page.getByTestId('assessment-submit').click();
  await expect(page.getByTestId('assessment-result')).toContainText('keçmədi');
  await expect(page.getByText('2×2=4')).toBeVisible();
  await page.getByRole('button', { name: 'Yenidən cəhd et' }).click();
  await page.getByTestId('assessment-question').getByText('4').click();
  await page.getByTestId('assessment-submit').click();
  await expect(page.getByTestId('assessment-result')).toContainText('keçdi');
  await page.goto(`/yol/${pathSlug}`);
  await expect(page.getByTestId('path-percent')).toHaveText('33%');
  await expect(page.getByTestId('path-node').nth(1)).toHaveAttribute('data-state', 'current');
});

test('layihə: fayl + qeyd təhvil → yoxlamada; müəllim qəbul edir → tamamlandı', async ({
  page,
  browser,
}) => {
  await login(page, fresh);
  await page.goto(`/yol/${pathSlug}/e2e-layihesi`);
  await page.setInputFiles('[data-testid="project-files"]', {
    name: 'netice.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('a,b\n1,2\n'),
  });
  await page.getByTestId('project-link').fill('https://github.com/dacy/e2e');
  await page.getByTestId('project-submit').click();
  await expect(page.getByTestId('project-status')).toContainText('Müəllim yoxlayır', {
    timeout: 15_000,
  });
  await page.goto(`/yol/${pathSlug}`);
  await expect(page.getByTestId('path-node').nth(1)).toHaveAttribute('data-state', 'submitted');

  const ctx = await browser.newContext();
  const ap = await ctx.newPage();
  await login(ap, ADMIN);
  await ap.goto('/admin/layiheler');
  const row = ap.locator('[data-testid="review-row"]', { hasText: fresh.email });
  await expect(row).toBeVisible();
  await expect(row).toContainText('netice.csv');
  await row.getByPlaceholder('Rəy (tələbə görür)').fill('Əla iş');
  await row.getByTestId('review-approve').click();
  // qəbul edilən sətir «Gözləyən» süzgəcindən çıxır; «Hamısı»da PASSED görünür
  await expect(row).toHaveCount(0, { timeout: 15_000 });
  await ap.getByRole('button', { name: 'Hamısı' }).click();
  await expect(row).toHaveAttribute('data-status', 'PASSED');
  await ctx.close();

  await page.goto(`/yol/${pathSlug}/e2e-layihesi`);
  await expect(page.getByTestId('project-status')).toContainText('qəbul edildi');
  await expect(page.getByTestId('project-status')).toContainText('Əla iş');
});

test('final: sertifikatı al → yol sertifikatı səhifəsi (DACY-P), panel 100%', async ({ page }) => {
  await login(page, fresh);
  await page.goto(`/yol/${pathSlug}/e2e-finali`);
  await page.getByTestId('milestone-claim').click();
  const link = page.getByTestId('milestone-cert');
  await expect(link).toBeVisible({ timeout: 15_000 });
  expect((await link.getAttribute('href'))!.split('/').pop()!.length).toBeGreaterThan(10);
  await link.click();
  await expect(page).toHaveURL(/\/sertifikat\//, { timeout: 30_000 });
  await expect(page.getByTestId('cert-name')).toHaveText(fresh.name, { timeout: 30_000 });
  await expect(page.getByTestId('cert-serial')).toContainText(/DACY-P-\d{4}-\d{6}/);
  await expect(page.getByText('E2E Analyst')).toBeVisible();
  await page.goto(`/yol/${pathSlug}`);
  await expect(page.getByTestId('path-percent')).toHaveText('100%');
  await expect(page.getByTestId('path-cert')).toBeVisible();
  await page.goto('/panel');
  await expect(page.getByTestId('dash-active-path')).toContainText('100%');
  await page.goto('/sertifikatlar');
  await expect(page.getByText('E2E Analyst')).toBeVisible();
});

test('nümunə yol: kurs səhifəsində yol bloku, yol xəritəsində kurs addımı', async ({ page }) => {
  await login(page, fresh);
  await page.goto('/kurs/numune');
  await expect(page.getByTestId('course-paths')).toContainText('NÜMUNƏ YOL');
  await page.goto('/yol/numune-yol');
  await expect(page.getByTestId('path-node').first()).toContainText('NÜMUNƏ — silinə bilər');
  await page.getByTestId('path-enroll').click();
  await expect(page.getByTestId('path-continue')).toBeVisible({ timeout: 15_000 });
});

test('təmizlik: test yolu silinir (force)', async ({ page }) => {
  await login(page, ADMIN);
  expect((await page.request.delete(`/api/admin/paths/${pathId}?force=1`)).ok()).toBeTruthy();
  await cleanupPaths(page);
});
