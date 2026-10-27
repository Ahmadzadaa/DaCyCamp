/**
 * SEC-04 brauzerdə: Python nəticəsini brauzer bildirir, server yoxlaya bilmir → belə kursun sertifikatı
 * «Təsdiq gözləyir» (PDF yoxdur) → admin tələbənin kodunu açıb görür, yalnız bundan sonra təsdiqləyə bilir →
 * sertifikat etibarlı olur, PDF görünür.
 * İşə salma: API + web işləyərkən `pnpm --filter @dacy/web e2e -- e2e/cert-review.spec.ts`
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { ADMIN, SHOTS, login } from './helpers';

test.describe.configure({ mode: 'serial' });

const ts = Date.now();
const slug = `e2e-py-cert-${ts}`;
const student = {
  name: `Sertifikat Tələbəsi ${String(ts).slice(-5)}`,
  email: `e2e-cert-${ts}@dacy.local`,
  password: 'E2eCert123!',
};
let courseId = '';
let stepId = '';
let certId = '';

const ok = async (r: Awaited<ReturnType<APIRequestContext['post']>>) => {
  expect(r.ok(), `${r.url()} → ${r.status()} ${await r.text()}`).toBeTruthy();
  return r.json();
};

test('admin bir Python addımlı kurs dərc edir; server saxta nəticəni rədd edir, düzgün həll → sertifikat təsdiq gözləyir', async ({
  page,
  browser,
}) => {
  await login(page, ADMIN);
  const api = page.request;
  const tracks = (await (await api.get('/api/tracks')).json()) as Array<{ id: string }>;
  const course = await ok(
    await api.post('/api/admin/courses', {
      data: {
        trackId: tracks[0]!.id,
        slug,
        title: `E2E Python ${ts}`,
        level: 'BEGINNER',
        description: 'x',
      },
    }),
  );
  courseId = course.id;
  const mod = await ok(
    await api.post(`/api/admin/courses/${courseId}/modules`, { data: { title: 'Modul' } }),
  );
  const step = await ok(
    await api.post(`/api/admin/modules/${mod.id}/steps`, {
      data: { type: 'PYTHON', title: 'Python sınaq' },
    }),
  );
  stepId = step.id;
  await ok(
    await api.put(`/api/admin/steps/${stepId}`, {
      data: {
        type: 'python',
        title: 'Python sınaq',
        xp: 10,
        instructions: '`x = 1` yazın',
        starter_code: '',
        tests: 'assert x == 1',
        hints: [],
        tasks: [],
        hint_penalty_xp: 0,
      },
    }),
  );
  await ok(await api.patch(`/api/admin/steps/${stepId}/publish`, { data: { isPublished: true } }));
  await ok(await api.patch(`/api/admin/modules/${mod.id}`, { data: { isPublished: true } }));
  await ok(
    await api.patch(`/api/admin/courses/${courseId}/publish`, { data: { isPublished: true } }),
  );

  // tələbə: ayrıca hesab, brauzerdə heç nə işlətmədən «keçdi» bildirir
  const ctx = await browser.newContext();
  const sp = await ctx.newPage();
  await ok(await sp.request.post('/api/auth/register', { data: student }));
  await ok(await sp.request.post(`/api/courses/${slug}/enroll`));
  const forged = await ok(
    await sp.request.post(`/api/learn/steps/${stepId}/submit`, {
      data: { kind: 'python', code: 'x = 9', passed: true },
    }),
  );
  expect(forged).toMatchObject({ passed: false, xpAwarded: 0 });
  const res = await ok(
    await sp.request.post(`/api/learn/steps/${stepId}/submit`, {
      data: { kind: 'python', code: 'x = 1', passed: true },
    }),
  );
  expect(res).toMatchObject({ passed: true, courseCompleted: true, certificatePending: true });
  certId = res.certificateId;

  await sp.goto(`/sertifikat/${certId}`);
  await expect(sp.getByTestId('cert-pending')).toBeVisible();
  await expect(sp.getByTestId('cert-status')).toHaveText(/Təsdiq gözləyir/);
  await expect(sp.getByTestId('cert-pdf')).toHaveCount(0);
  // gözləyən sertifikat ləğv edilmiş kimi göstərilməməlidir
  await expect(sp.getByText('Ləğv edilib')).toHaveCount(0);
  mkdirSync(SHOTS, { recursive: true });
  await sp.screenshot({
    path: resolve(SHOTS, 'cert-pending.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await sp.goto('/sertifikatlar');
  await expect(sp.locator('.cert-mini').first()).toContainText('Təsdiq gözləyir');
  await ctx.close();
});

test('admin: kodu açmadan təsdiq düyməsi bağlıdır; kodu görüb təsdiqləyir → sertifikat etibarlı', async ({
  page,
  browser,
}) => {
  await login(page, ADMIN);
  await page.goto('/admin/sertifikatlar');
  const row = page.getByTestId('cert-review-row').filter({ hasText: student.email });
  await expect(row).toBeVisible();
  await expect(row.getByTestId('cert-approve')).toBeDisabled();
  await row.getByTestId('cert-review-toggle').click();
  await expect(row.getByTestId('cert-evidence')).toContainText('x = 1');
  await expect(row.getByTestId('cert-evidence')).toContainText('Python sınaq');
  await page.screenshot({
    path: resolve(SHOTS, 'admin-cert-review.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await row.getByTestId('cert-approve').click();
  await expect(page.getByText('Sertifikat təsdiqləndi')).toBeVisible();
  await expect(row).toHaveCount(0);

  const ctx = await browser.newContext();
  const pub = await ctx.newPage();
  await pub.goto(`/sertifikat/${certId}`);
  await expect(pub.getByTestId('cert-status')).toHaveText(/Etibarlıdır/);
  await expect(pub.getByTestId('cert-pdf')).toBeVisible();
  await ctx.close();

  // kataloqu e2e kursu ilə doldurmayaq — dərcdən çıxar (sertifikat qalır)
  await ok(
    await page.request.patch(`/api/admin/courses/${courseId}/publish`, {
      data: { isPublished: false },
    }),
  );
});
