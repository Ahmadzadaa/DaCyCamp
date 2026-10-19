/**
 * Rol × səhifə / API matrisi (brauzerdə): qonaq, tələbə, akademiya müəllimi və admin hər biri yalnız öz
 * hissəsinə girə bilir. Qadağan olunan səhifə yönləndirilir (və ya 404), API 401 / 403 qaytarır; çıxışdan sonra
 * sessiya bitir.
 * İşə salma: API + web işləyərkən `pnpm --filter @dacy/web e2e -- e2e/role-access.spec.ts`
 */
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { ADMIN, login } from './helpers';

test.describe.configure({ mode: 'serial' });

const ts = Date.now();
const student = {
  name: `Rol Tələbəsi ${String(ts).slice(-5)}`,
  email: `e2e-role-st-${ts}@dacy.local`,
  password: 'E2eRole123!',
};
const teacher = {
  name: `Rol Müəllimi ${String(ts).slice(-5)}`,
  email: `e2e-role-t-${ts}@dacy.local`,
  password: 'E2eRole123!',
};

const ADMIN_PAGES = ['/admin', '/admin/kurslar', '/admin/sertifikatlar', '/admin/akademiya'];
const STAFF_APIS = [
  '/api/admin/courses',
  '/api/admin/users',
  '/api/admin/certificates/pending',
  '/api/academy/programs',
];

const path = (page: Page) => new URL(page.url()).pathname;
const statusOf = async (api: APIRequestContext, url: string) => (await api.get(url)).status();

test('qonaq: qorunan səhifələr girişə yönləndirir (geri qayıtma ünvanı ilə), API 401', async ({
  page,
}) => {
  for (const p of ['/panel', '/sertifikatlar', ...ADMIN_PAGES, '/muellim', '/akademiya']) {
    await page.goto(p);
    await expect(page, p).toHaveURL(/\/giris\?next=/);
    expect(decodeURIComponent(new URL(page.url()).searchParams.get('next') ?? '')).toBe(p);
  }
  for (const u of ['/api/me/dashboard', ...STAFF_APIS])
    expect(await statusOf(page.request, u), u).toBe(401);
  // açıq səhifələr işləyir
  for (const p of ['/', '/kurslar', '/yollar']) {
    await page.goto(p);
    await expect(page, p).toHaveURL(new RegExp(`${p === '/' ? '/$' : p}`));
  }
});

test('tələbə: admin və müəllim hissəsi bağlıdır (UI yönləndirmə / 404, API 403)', async ({
  page,
}) => {
  expect((await page.request.post('/api/auth/register', { data: student })).ok()).toBeTruthy();
  for (const p of ADMIN_PAGES) {
    await page.goto(p);
    expect(path(page), p).not.toMatch(/^\/admin/);
  }
  // müəllim paneli tələbə üçün mövcud deyil (varlığı da açıqlanmır)
  const r = await page.goto('/muellim');
  expect(r?.status()).toBe(404);
  for (const u of STAFF_APIS) expect(await statusOf(page.request, u), u).toBe(403);
  // admin əməliyyatları: sertifikat təsdiqi, kurs yaratmaq
  expect(
    (await page.request.post('/api/admin/certificates/x/approve', { data: {} })).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post('/api/admin/courses', { data: { title: 'x', slug: `x-${ts}` } })
    ).status(),
  ).toBe(403);
  // öz səhifələri açıqdır
  await page.goto('/panel');
  await expect(page).toHaveURL(/\/(panel|baslangic)$/);
});

test('akademiya müəllimi: müəllim panelinə girir, Camp admin paneli və admin API bağlıdır', async ({
  page,
  browser,
}) => {
  await login(page, ADMIN);
  const created = await page.request.post('/api/admin/users', {
    data: { ...teacher, role: 'TEACHER' },
  });
  expect(created.ok(), await created.text()).toBeTruthy();

  const ctx = await browser.newContext();
  const tp = await ctx.newPage();
  await login(tp, teacher);
  await tp.goto('/muellim');
  await expect(tp.getByRole('heading', { level: 1, name: 'Müəllim paneli' })).toBeVisible();
  for (const p of ADMIN_PAGES) {
    await tp.goto(p);
    expect(path(tp), p).not.toMatch(/^\/admin/);
  }
  for (const u of ['/api/admin/courses', '/api/admin/users', '/api/admin/certificates/pending'])
    expect(await statusOf(tp.request, u), u).toBe(403);
  // proqram yaratmaq yalnız adminindir
  expect(
    (
      await tp.request.post('/api/academy/programs', {
        data: { title: 'x', slug: `t-${ts}`, status: 'ACTIVE' },
      })
    ).status(),
  ).toBe(403);
  await ctx.close();
});

test('admin: admin səhifələri və müəllim paneli açılır', async ({ page }) => {
  await login(page, ADMIN);
  for (const p of [...ADMIN_PAGES, '/muellim']) {
    const r = await page.goto(p);
    expect(r?.status(), p).toBe(200);
    expect(path(page), p).toBe(p);
    await expect(page.locator('h1').first(), p).toBeVisible();
  }
  for (const u of STAFF_APIS) expect(await statusOf(page.request, u), u).toBe(200);
});

test('çıxış: sessiya bitir — API 401, qorunan səhifə yenidən girişə yönləndirir', async ({
  page,
}) => {
  await login(page, student);
  expect(await statusOf(page.request, '/api/me/dashboard')).toBe(200);
  expect((await page.request.post('/api/auth/logout')).ok()).toBeTruthy();
  expect(await statusOf(page.request, '/api/me/dashboard')).toBe(401);
  await page.goto('/panel');
  await expect(page).toHaveURL(/\/giris\?next=/);
});
