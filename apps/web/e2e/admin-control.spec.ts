/**
 * Qeyd 4 — admin kurs nəzarəti, UI ilə (.env-dəki SEED_ADMIN_* hesabı):
 * kopyala → dərc et → arxivlə / geri qaytar → tələbələr (kilid aç, sıfırla, çıxar / geri qaytar) →
 * fayl dəyişdir → müəllim sahələri → təhlükəsiz silmə / bərpa / həmişəlik silmə → fəaliyyət tarixçəsi.
 * Tələbə hesabı (SEED_STUDENT_*) bu əməliyyatların heç birini edə bilmir (UI + API 403).
 * Nümunə kursa toxunulmur — hər şey onun surətində ("numune-kopya") edilir.
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  expect,
  request as pwRequest,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { ADMIN, SHOTS, STUDENT, login } from './helpers';

test.describe.configure({ mode: 'serial' });

const OUT = resolve(SHOTS, 'qeyd4');
mkdirSync(OUT, { recursive: true });
const shot = (page: Page, name: string) =>
  page.screenshot({ path: resolve(OUT, `${name}.png`), fullPage: true });

const SRC = 'numune';
const COPY = 'numune-kopya';
let copyTitle = '';
let copyId = '';
let student: APIRequestContext;

const toast = (page: Page, text: string) =>
  page.locator('[data-sonner-toast]').filter({ hasText: text }).first();

async function studentApi(baseURL: string) {
  const ctx = await pwRequest.newContext({ baseURL });
  const r = await ctx.post('/api/auth/login', {
    data: { email: STUDENT.email, password: STUDENT.password },
  });
  expect(r.ok()).toBeTruthy();
  return ctx;
}

test.beforeAll(async ({ baseURL }) => {
  // əvvəlki işdən qalan surətləri təmizlə (silinənlərə at → həmişəlik sil)
  const ad = await pwRequest.newContext({ baseURL });
  await ad.post('/api/auth/login', { data: { email: ADMIN.email, password: ADMIN.password } });
  for (const status of ['', '?status=deleted']) {
    const list = await (await ad.get(`/api/admin/courses${status}`)).json();
    for (const c of list.courses as Array<{
      id: string;
      slug: string;
      title: string;
      status: string;
    }>) {
      if (!c.slug.startsWith(COPY)) continue;
      const q = `confirm=${encodeURIComponent(c.title)}`;
      if (c.status !== 'deleted') await ad.delete(`/api/admin/courses/${c.id}?${q}`);
      await ad.delete(`/api/admin/courses/${c.id}/permanent?${q}`);
    }
  }
  await ad.dispose();
  student = await studentApi(baseURL!);
});
test.afterAll(async () => {
  await student?.dispose();
});

test('kurslar siyahısı: status tabları, sətir əməliyyatları; "Kopyala" və "Dərc et"', async ({
  page,
}) => {
  await login(page, ADMIN);
  await page.goto('/admin/kurslar');
  await expect(page.getByRole('heading', { name: 'Kurslar' })).toBeVisible({ timeout: 60_000 });
  for (const tab of ['all', 'published', 'draft', 'archived', 'deleted'])
    await expect(page.getByTestId(`tab-${tab}`)).toBeVisible();
  const row = page.getByTestId(`course-row-${SRC}`);
  await expect(row.getByRole('link', { name: 'Redaktə et' })).toBeVisible();
  await expect(row.getByRole('link', { name: 'Önizlə' })).toBeVisible();
  await expect(row.getByRole('button', { name: 'Sil' })).toBeVisible();

  await page.getByTestId(`more-${SRC}`).click();
  for (const item of [
    'Redaktə et',
    'Dərcdən çıxar',
    'Arxivlə',
    'Kopyala',
    'Önizlə',
    'Tələbələr',
    'Sil',
  ])
    await expect(page.getByRole('menuitem', { name: item })).toBeVisible();
  await shot(page, '01-kurslar-menyu');
  await page.getByRole('menuitem', { name: 'Kopyala' }).click();
  await expect(toast(page, 'Kurs kopyalandı')).toBeVisible();

  const copyRow = page.getByTestId(`course-row-${COPY}`);
  await expect(copyRow).toBeVisible();
  await expect(copyRow.getByText('Qaralama')).toBeVisible();
  copyTitle = (await copyRow.locator('td').first().locator('a').innerText()).trim();
  expect(copyTitle).toContain('(surət)');

  await page.getByTestId(`more-${COPY}`).click();
  await page.getByRole('menuitem', { name: 'Dərc et' }).click();
  await expect(toast(page, 'Kurs dərc olundu')).toBeVisible();
  await expect(copyRow.getByText('Dərc olunub')).toBeVisible();
  await shot(page, '02-kurslar');

  const tree = await (await page.request.get(`/api/admin/courses/${COPY}`)).json();
  copyId = tree.id;
  expect(tree.modules.length).toBeGreaterThan(0);
  // tələbə surətə yazılır (sonrakı addımlar üçün)
  expect((await student.post(`/api/courses/${COPY}/enroll`)).status()).toBe(201);
});

test('arxivlə: kataloqdan gizlənir, yazılmış tələbə davam edir; "Geri qaytar"', async ({
  page,
}) => {
  await login(page, ADMIN);
  await page.goto('/admin/kurslar');
  await page.getByTestId(`more-${COPY}`).click();
  await page.getByRole('menuitem', { name: 'Arxivlə' }).click();
  const tst = toast(page, 'Kurs arxivləndi');
  await expect(tst).toBeVisible();
  await expect(page.getByTestId(`course-row-${COPY}`).getByText('Arxivdə')).toBeVisible();

  const catalog = await (await student.get('/api/courses')).json();
  expect(catalog.map((c: { slug: string }) => c.slug)).not.toContain(COPY);
  expect((await student.get(`/api/courses/${COPY}`)).status()).toBe(200);

  await tst.getByRole('button', { name: 'Geri qaytar' }).click();
  await expect(toast(page, 'Kurs arxivdən çıxarıldı')).toBeVisible();
  await expect(page.getByTestId(`course-row-${COPY}`).getByText('Dərc olunub')).toBeVisible();
  const again = await (await student.get('/api/courses')).json();
  expect(again.map((c: { slug: string }) => c.slug)).toContain(COPY);
});

test('tələbələr: kilidli addımı aç, sıfırla, kursdan çıxar → geri qaytar', async ({ page }) => {
  await login(page, ADMIN);
  await page.goto(`/admin/kurslar/${COPY}?tab=telebeler`);
  const row = page.getByTestId(`student-row-${STUDENT.email}`);
  await expect(row).toBeVisible({ timeout: 60_000 });
  await expect(row.getByTestId('student-percent')).toHaveText('0%');

  const before = await (await page.request.get(`/api/admin/courses/${copyId}/students`)).json();
  const lockedId: string = before[0].lockedStepIds[0];
  expect(lockedId).toBeTruthy();

  await row.getByRole('button', { name: 'Kilidi aç' }).click();
  const dlg = page.getByRole('dialog');
  await expect(dlg).toBeVisible();
  await dlg.getByRole('button', { name: 'Kilidi aç' }).click();
  await expect(toast(page, 'Addım açıldı')).toBeVisible();
  await expect(row.getByTitle('Əl ilə açılıb')).toBeVisible();
  await shot(page, '03-telebeler');

  // tələbə açılmış addıma daxil ola bilir
  const after = await (await page.request.get(`/api/admin/courses/${copyId}/students`)).json();
  expect(after[0].unlockedStepIds).toContain(lockedId);
  expect(after[0].lockedStepIds).not.toContain(lockedId);

  await row.getByRole('button', { name: /Daha çox əməliyyat/ }).click();
  await page.getByRole('menuitem', { name: 'İrəliləyişi sıfırla' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'İrəliləyişi sıfırla' }).click();
  await expect(toast(page, 'İrəliləyiş sıfırlandı')).toBeVisible();
  await expect(row.getByTitle('Əl ilə açılıb')).toHaveCount(0);

  await row.getByRole('button', { name: /Daha çox əməliyyat/ }).click();
  await page.getByRole('menuitem', { name: 'Kursdan çıxar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Kursdan çıxar' }).click();
  const removed = toast(page, 'Tələbə kursdan çıxarıldı');
  await expect(removed).toBeVisible();
  await expect(row).toHaveCount(0);
  expect((await student.get(`/api/learn/courses/${COPY}`)).ok()).toBeTruthy();
  const enr1 = await (await student.get('/api/me/enrollments')).json();
  expect(enr1.map((e: { courseSlug: string }) => e.courseSlug)).not.toContain(COPY);

  await removed.getByRole('button', { name: 'Geri qaytar' }).click();
  await expect(toast(page, 'Tələbə kursa geri yazıldı')).toBeVisible();
  await expect(page.getByTestId(`student-row-${STUDENT.email}`)).toBeVisible();
});

test('fayllar: faylı eyni yolda dəyişdir; müəllim sahələri', async ({ page }) => {
  await login(page, ADMIN);
  await page.goto(`/admin/kurslar/${COPY}?tab=fayllar`);
  const btn = page.getByTestId('replace-datasets/numune.csv');
  await expect(btn).toBeVisible({ timeout: 60_000 });
  const chooser = page.waitForEvent('filechooser');
  await btn.click();
  await (
    await chooser
  ).setFiles({
    name: 'numune.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('id,ad,deyer\n1,yeni A,11\n'),
  });
  await expect(toast(page, 'Fayl dəyişdirildi: datasets/numune.csv')).toBeVisible();
  await shot(page, '04-fayllar');

  await page.goto(`/admin/kurslar/${COPY}?node=course`);
  await page.getByLabel('Müəllimin adı').fill('Aysel Məmmədova');
  await page.getByLabel('Müəllimin vəzifəsi').fill('Baş data analitik');
  await page.getByRole('button', { name: 'Yadda saxla' }).click();
  await expect(toast(page, 'Kurs yadda saxlanıldı')).toBeVisible();
  const c = await (await page.request.get(`/api/admin/courses/${COPY}`)).json();
  expect(c).toMatchObject({
    instructorName: 'Aysel Məmmədova',
    instructorTitle: 'Baş data analitik',
  });
  await shot(page, '05-redaktor');
});

test('silmə: sadə «razısınız?» təsdiqi, Silinənlər, bərpa, həmişəlik silmə', async ({ page }) => {
  await login(page, ADMIN);
  await page.goto(`/admin/kurslar/${COPY}`);
  await page.getByRole('button', { name: 'Sil', exact: true }).click();
  const dlg = page.getByRole('dialog');
  await expect(dlg.getByRole('heading', { name: 'Kursu silməyə razısınız?' })).toBeVisible();
  await expect(dlg).toContainText(copyTitle);
  // ad yazmaq tələb olunmur; «Xeyr» heç nə etmir
  await expect(dlg.getByRole('textbox')).toHaveCount(0);
  await dlg.getByRole('button', { name: 'Xeyr' }).click();
  await expect(dlg).toHaveCount(0);
  expect((await student.get(`/api/courses/${COPY}`)).status()).toBe(200);
  await page.getByRole('button', { name: 'Sil', exact: true }).click();
  await shot(page, '06-silme-dialoq');
  await page.getByRole('dialog').getByRole('button', { name: 'Bəli, sil' }).click();
  await expect(page).toHaveURL(/\/admin\/kurslar$/);
  const tst = toast(page, 'Kurs silindi');
  await expect(tst).toBeVisible();
  expect((await student.get(`/api/courses/${COPY}`)).status()).toBe(404);
  expect((await student.get(`/api/learn/courses/${COPY}`)).status()).toBe(404);

  // toast-dan "Geri qaytar"
  await tst.getByRole('button', { name: 'Geri qaytar' }).click();
  await expect(toast(page, 'Kurs bərpa olundu')).toBeVisible();
  expect((await student.get(`/api/courses/${COPY}`)).status()).toBe(200);

  // siyahıdan yenidən sil → Silinənlər → həmişəlik sil
  await page.goto('/admin/kurslar');
  await page.getByTestId(`course-row-${COPY}`).getByRole('button', { name: 'Sil' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Bəli, sil' }).click();
  await expect(toast(page, 'Kurs silindi')).toBeVisible();
  await page.getByTestId('tab-deleted').click();
  const trashRow = page.getByTestId(`course-row-${COPY}`);
  await expect(trashRow).toBeVisible();
  await expect(trashRow.getByText(/gün sonra həmişəlik silinəcək/)).toBeVisible();
  await expect(trashRow.getByText('Silinib')).toBeVisible();
  await shot(page, '07-silinenler');

  await trashRow.getByRole('button', { name: 'Həmişəlik sil' }).click();
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'Kursu həmişəlik silməyə razısınız?' }),
  ).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Bəli, həmişəlik sil' }).click();
  await expect(toast(page, 'Kurs həmişəlik silindi')).toBeVisible();
  await expect(page.getByTestId(`course-row-${COPY}`)).toHaveCount(0);
  expect((await page.request.get(`/api/admin/courses/${COPY}`)).status()).toBe(404);
  const enr = await (await student.get('/api/me/enrollments')).json();
  expect(enr.map((e: { courseSlug: string }) => e.courseSlug)).not.toContain(COPY);
  // nümunə kurs toxunulmaz qalıb
  expect((await student.get(`/api/courses/${SRC}`)).status()).toBe(200);
});

test('fəaliyyət tarixçəsi: kim, nə, nə vaxt', async ({ page }) => {
  await login(page, ADMIN);
  await page.goto('/admin/tarixce');
  const log = page.getByTestId('audit-log');
  await expect(log.getByRole('heading', { name: 'Fəaliyyət tarixçəsi' })).toBeVisible({
    timeout: 60_000,
  });
  for (const action of [
    'kursu kopyaladı',
    'kursun arxiv vəziyyətini dəyişdi',
    'tələbəyə kilidli addımı açdı',
    'tələbənin irəliləyişini sıfırladı',
    'tələbəni kursdan çıxardı',
    'fayl yüklədi',
    'kursu sildi (Silinənlər)',
    'kursu bərpa etdi',
    'kursu həmişəlik sildi',
  ])
    await expect(log.getByText(action).first()).toBeVisible();
  await expect(log.getByText(ADMIN.email).first()).toBeVisible();
  await shot(page, '08-tarixce');
  await log.getByRole('combobox').selectOption('enrollment');
  await expect(log.locator('tbody tr[data-action^="course."]')).toHaveCount(0);
  await expect(log.locator('tbody tr[data-action^="enrollment."]').first()).toBeVisible();
});

test('tələbə hesabı bu əməliyyatların heç birini edə bilmir (UI + API 403)', async ({ page }) => {
  const course = await (await student.get(`/api/courses/${SRC}`)).json();
  const id = course.id as string;
  const userId = (await (await student.get('/api/auth/me')).json()).id as string;
  const calls: Array<Promise<{ status(): number }>> = [
    student.patch(`/api/admin/courses/${id}/archive`, { data: { archived: true } }),
    student.post(`/api/admin/courses/${id}/copy`),
    student.delete(`/api/admin/courses/${id}?confirm=x`),
    student.post(`/api/admin/courses/${id}/restore`),
    student.delete(`/api/admin/courses/${id}/permanent?confirm=x`),
    student.patch(`/api/admin/courses/${id}/publish`, { data: { isPublished: false } }),
    student.get(`/api/admin/courses/${id}/students`),
    student.post(`/api/admin/courses/${id}/students/${userId}/reset`),
    student.delete(`/api/admin/courses/${id}/students/${userId}`),
    student.get('/api/admin/audit'),
  ];
  for (const r of await Promise.all(calls)) expect(r.status()).toBe(403);

  await login(page, STUDENT);
  for (const url of ['/admin/kurslar', '/admin/tarixce', '/admin/kurslar?status=deleted']) {
    await page.goto(url);
    await expect(page).toHaveURL(/\/kurslar$/);
  }
  // nümunə kurs dəyişməyib
  expect((await student.get(`/api/courses/${SRC}`)).status()).toBe(200);
});
