import { test, expect, type APIRequestContext } from '@playwright/test';
import { ADMIN, login } from './helpers';

const suffix = Date.now().toString(36);
const teacher = {
  name: 'Classroom müəllimi',
  email: `classroom-teacher-${suffix}@dacy.local`,
  password: 'ClassroomTest123!',
};
const student = {
  name: 'Classroom tələbəsi',
  email: `classroom-student-${suffix}@dacy.local`,
  password: 'ClassroomTest123!',
};
let groupId = '',
  lessonId = '',
  questionId = '';
let admin: APIRequestContext;

test.describe.serial('Classroom — teacher/student workflow', () => {
  test.beforeAll(async ({ playwright, baseURL }) => {
    admin = await playwright.request.newContext({ baseURL });
    expect(
      (
        await admin.post('/api/auth/login', {
          data: { email: ADMIN.email, password: ADMIN.password },
        })
      ).ok(),
    ).toBeTruthy();
    const t = await admin.post('/api/admin/users', { data: { ...teacher, role: 'TEACHER' } });
    const s = await admin.post('/api/admin/users', { data: { ...student, role: 'STUDENT' } });
    expect(t.ok()).toBeTruthy();
    expect(s.ok()).toBeTruthy();
    const program = await admin.post('/api/academy/programs', {
      data: { title: `Classroom QA ${suffix}`, slug: `classroom-${suffix}`, status: 'ACTIVE' },
    });
    const group = await admin.post('/api/academy/groups', {
      data: {
        programId: (await program.json()).id,
        code: `CR-${suffix}`,
        name: `Sınaq sinfi ${suffix}`,
        status: 'ACTIVE',
        leadInstructorId: (await t.json()).id,
      },
    });
    expect(group.ok()).toBeTruthy();
    groupId = (await group.json()).id;
    expect(
      (
        await admin.post(`/api/academy/groups/${groupId}/enrollments`, {
          data: { userId: (await s.json()).id },
        })
      ).ok(),
    ).toBeTruthy();
  });
  test.afterAll(async () => {
    await admin?.dispose();
  });

  test('teacher creates a topic and a published lesson, attaches a file, and preserves existing navigation', async ({
    page,
  }) => {
    await login(page, teacher);
    await page.goto(`/akademiya/sinif/${groupId}?tab=materials`);
    await page.getByRole('button', { name: 'Mövzu yarat', exact: true }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByLabel('Başlıq', { exact: true }).fill('Həftə 1 — sınaq');
    await dialog.getByLabel('Təsvir').fill('Yalnız avtomatik yoxlama üçün mövzu.');
    await dialog.getByRole('button', { name: 'Yadda saxla' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Həftə 1 — sınaq' })).toBeVisible();
    await page.getByRole('button', { name: 'Dərs əlavə et' }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByLabel('Başlıq', { exact: true }).fill('Sınaq dərs materialı');
    await dialog
      .getByLabel('Məzmun', { exact: true })
      .fill('## Sınaq\n\nBu mətn yalnız avtomatik yoxlamadır.');
    await dialog.getByLabel('Mövcud dərs və ya məşq axtar…').fill('Nümunə SQL');
    await dialog.getByRole('button', { name: 'Axtar', exact: true }).click();
    await dialog.getByRole('button', { name: /Nümunə SQL tapşırığı/ }).click();
    await dialog.getByLabel('Tələbələrə göstər', { exact: true }).check();
    await dialog.getByRole('button', { name: 'Yadda saxla' }).click();
    await expect(page).toHaveURL(/\/ders\/[^/]+$/, { timeout: 20_000 });
    lessonId = page.url().split('/').pop()!;
    await expect(
      page.getByRole('heading', { level: 1, name: 'Sınaq dərs materialı' }),
    ).toBeVisible();
    await page.locator('input[type=file]').setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('id,value\n1,10'),
    });
    await expect(page.locator('.cr-files')).toContainText('test.csv');
    await page.getByRole('button', { name: /Məşqi aç/ }).click();
    await expect(page).toHaveURL(/\/kurs\/numune\/numune-fesil\/sql$/, { timeout: 20_000 });
    await expect(page.getByTestId('code-editor')).toBeVisible();
    expect(await page.locator('h1').count()).toBe(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
  });

  test('teacher posts a pinned announcement and student can read and comment', async ({
    page,
    browser,
    baseURL,
  }) => {
    await login(page, teacher);
    await page.goto(`/akademiya/sinif/${groupId}`);
    await page.getByRole('button', { name: 'Elan paylaş' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Başlıq', { exact: true }).fill('QA üçün elan');
    await dialog.getByLabel('Məzmun', { exact: true }).fill('**Salam**, sınaq qrupumuz.');
    await dialog.getByLabel('Elanı yuxarıda sabitlə').check();
    await dialog.getByRole('button', { name: 'Yadda saxla' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId('classroom-announcement')).toContainText('QA üçün elan');
    await page
      .getByTestId('classroom-announcement')
      .locator('input[type=file]')
      .setInputFiles({
        name: 'announcement.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('id,value\n1,10'),
      });
    await expect(page.getByTestId('classroom-announcement').locator('.cr-files')).toContainText(
      'announcement.csv',
    );

    const context = await browser.newContext({ baseURL });
    const studentPage = await context.newPage();
    await login(studentPage, student);
    await studentPage.goto(`/akademiya/sinif/${groupId}`);
    const post = studentPage.getByTestId('classroom-announcement');
    await expect(post.getByText('Yeni', { exact: true })).toBeVisible();
    await post.getByRole('button', { name: 'Oxudum' }).click();
    await expect(post.getByRole('button', { name: 'Oxudum' })).toHaveCount(0);
    await studentPage.reload();
    await expect(post.getByRole('button', { name: 'Oxudum' })).toHaveCount(0);
    await post.getByRole('button', { name: /Şərhlər/ }).click();
    await post.getByPlaceholder('Cavabınızı yazın…').fill('Sınaq şərhi');
    await post.getByRole('button', { name: 'Cavab göndər' }).click();
    await expect(post.locator('.cr-replies')).toContainText('Sınaq şərhi');
    await expect(post.getByRole('button', { name: 'Redaktə et' })).toHaveCount(0);
    await context.close();
  });

  test('student opens lesson, downloads a protected file, and asks a private question', async ({
    page,
  }) => {
    await login(page, student);
    await page.goto(`/akademiya/sinif/${groupId}/ders/${lessonId}`);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Sınaq dərs materialı' }),
    ).toBeVisible();
    const download = page.waitForEvent('download');
    await page
      .locator('.cr-files')
      .getByRole('link', { name: 'Yüklə: test.csv', exact: true })
      .click();
    expect((await download).suggestedFilename()).toBe('test.csv');
    await page.goto(`/akademiya/sinif/${groupId}?tab=questions`);
    await page.getByRole('button', { name: 'Sual ver', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Sualınızın başlığı').fill('Şəxsi QA sualı');
    await dialog
      .getByLabel('Nəyi başa düşməkdə çətinlik çəkirsiniz?')
      .fill('Bu kodla bağlı kömək istəyirəm.');
    await dialog.getByLabel('Yalnız müəllimə', { exact: true }).check();
    await dialog.getByRole('button', { name: 'Sual ver', exact: true }).click();
    await expect(page).toHaveURL(/\/sual\/[^/]+$/);
    questionId = page.url().split('/').pop()!;
    await expect(page.getByRole('heading', { level: 1, name: 'Şəxsi QA sualı' })).toBeVisible();
    await expect(page.locator('.cr-question-heading')).toContainText('Yalnız müəllimə');
  });

  test('teacher desk links to private question; teacher replies and student resolves it', async ({
    page,
    browser,
    baseURL,
  }) => {
    await login(page, teacher);
    await page.goto('/muellim');
    const desk = page.getByTestId('teacher-desk');
    await expect(desk).toContainText('Şəxsi QA sualı');
    await desk.getByRole('link', { name: /Şəxsi QA sualı/ }).click();
    await page.getByPlaceholder('Cavabınızı yazın…').fill('Müəllimin sınaq cavabı');
    await page.getByRole('button', { name: 'Cavab göndər' }).click();
    await expect(page.locator('.cr-replies')).toContainText('Müəllimin sınaq cavabı');
    const context = await browser.newContext({ baseURL });
    const studentPage = await context.newPage();
    await login(studentPage, student);
    await studentPage.goto(`/akademiya/sinif/${groupId}/sual/${questionId}`);
    await expect(studentPage.locator('.cr-replies')).toContainText('Müəllimin sınaq cavabı');
    await studentPage.getByRole('button', { name: 'Cavablandırıldı kimi işarələ' }).click();
    await expect(studentPage.locator('.cr-question-heading')).toContainText('Cavablandırılıb');
    await expect(studentPage.getByPlaceholder('Cavabınızı yazın…')).toHaveCount(0);
    await context.close();
  });

  test('desktop themes and final mobile smoke have no page overflow or runtime errors', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await login(page, student);
    for (const width of [1440, 1280, 390]) {
      await page.setViewportSize({ width, height: 960 });
      for (const tab of [
        '',
        'materials',
        'assignments',
        'calendar',
        'questions',
        'grades',
        'about',
      ]) {
        await page.goto(`/akademiya/sinif/${groupId}${tab ? `?tab=${tab}` : ''}`);
        await expect(page.getByTestId('classroom')).toBeVisible();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
        ).toBeLessThanOrEqual(1);
      }
    }
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await expect(page.getByTestId('classroom')).toBeVisible();
    expect(errors).toEqual([]);
  });
});
