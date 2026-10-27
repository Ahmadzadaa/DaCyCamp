import { test, expect, type APIRequestContext, type BrowserContext } from '@playwright/test';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ADMIN, ROOT } from './helpers';

const suffix = Date.now().toString(36);
const teacher = {
  name: 'Etibarlılıq müəllimi',
  email: `reliable-teacher-${suffix}@dacy.local`,
  password: 'ReliableTeacher123!',
};
const student = {
  name: 'Etibarlılıq tələbəsi',
  email: `reliable-student-${suffix}@dacy.local`,
  password: 'ReliableStudent123!',
};
let admin: APIRequestContext, teacherContext: BrowserContext, studentContext: BrowserContext;
let groupId = '',
  topicId = '',
  lessonId = '',
  studentId = '';

test.describe.serial('Remediation — real browser regressions', () => {
  test.beforeAll(async ({ playwright, browser, baseURL }) => {
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
    studentId = (await s.json()).id;
    const p = await admin.post('/api/academy/programs', {
      data: { title: `Reliability ${suffix}`, slug: `reliability-${suffix}`, status: 'ACTIVE' },
    });
    const g = await admin.post('/api/academy/groups', {
      data: {
        programId: (await p.json()).id,
        code: `REL-${suffix}`,
        name: 'Etibarlılıq sınağı',
        status: 'ACTIVE',
        leadInstructorId: (await t.json()).id,
      },
    });
    expect(g.ok()).toBeTruthy();
    groupId = (await g.json()).id;
    expect(
      (
        await admin.post(`/api/academy/groups/${groupId}/enrollments`, {
          data: { userId: studentId },
        })
      ).ok(),
    ).toBeTruthy();
    const topic = await admin.post(`/api/academy/groups/${groupId}/classroom/topics`, {
      data: { title: 'Sınaq mövzusu' },
    });
    topicId = (await topic.json()).id;
    const lesson = await admin.post(`/api/academy/groups/${groupId}/classroom/lessons`, {
      data: { topicId, title: 'İlkin başlıq', content: 'İlkin mətn', isPublished: true },
    });
    expect(lesson.ok()).toBeTruthy();
    lessonId = (await lesson.json()).id;
    teacherContext = await browser.newContext({ baseURL });
    studentContext = await browser.newContext({ baseURL });
    expect(
      (
        await teacherContext.request.post('/api/auth/login', {
          data: { email: teacher.email, password: teacher.password },
        })
      ).ok(),
    ).toBeTruthy();
    expect(
      (
        await studentContext.request.post('/api/auth/login', {
          data: { email: student.email, password: student.password },
        })
      ).ok(),
    ).toBeTruthy();
  });
  test.afterAll(async () => {
    await admin?.dispose();
    await teacherContext?.close();
    await studentContext?.close();
  });

  test('invalid access cookie is cleared without a sign-in redirect loop', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ baseURL });
    try {
      await context.addCookies([
        { name: 'dacy_at', value: 'invalid-access-token', url: baseURL!, httpOnly: true },
      ]);
      const page = await context.newPage();
      await page.goto('/panel');
      await expect(page).toHaveURL(/\/giris\?next=/);
      await expect(page.getByRole('button', { name: 'Daxil ol', exact: true })).toBeVisible();
      expect((await context.cookies()).some((c) => c.name === 'dacy_at')).toBe(false);
    } finally {
      await context.close();
    }
  });

  test('two tabs recover one expired session and retain the selected language', async ({
    baseURL,
  }) => {
    await studentContext.clearCookies({ name: 'dacy_at' });
    await studentContext.addCookies([{ name: 'dacy_locale', value: 'en', url: baseURL! }]);
    const first = await studentContext.newPage(),
      second = await studentContext.newPage();
    try {
      await Promise.all([
        first.goto(`/akademiya/sinif/${groupId}`),
        second.goto(`/akademiya/sinif/${groupId}`),
      ]);
      await expect(first.getByTestId('classroom')).toBeVisible();
      await expect(second.getByTestId('classroom')).toBeVisible();
      await expect(first.locator('html')).toHaveAttribute('lang', 'en');
      await expect(second.locator('html')).toHaveAttribute('lang', 'en');
      expect((await studentContext.request.get('/api/auth/me')).status()).toBe(200);
    } finally {
      await first.close();
      await second.close();
      await studentContext.addCookies([{ name: 'dacy_locale', value: 'az', url: baseURL! }]);
    }
  });

  test('material editor opens current data, persists drafts and requires a decision on stale drafts', async () => {
    const page = await teacherContext.newPage();
    const path = `/api/academy/classroom/lessons/${lessonId}`;
    try {
      await page.goto(`/akademiya/sinif/${groupId}/ders/${lessonId}`);
      const update = await admin.patch(path, {
        data: {
          topicId,
          title: 'Başqa müəllimin yeniləməsi',
          content: 'Serverdə yeni mətn',
          isPublished: true,
          expectedVersion: 1,
        },
      });
      expect(update.ok()).toBeTruthy();
      await page
        .locator('input[type=file]')
        .setInputFiles({ name: 'refresh.csv', mimeType: 'text/csv', buffer: Buffer.from('x\n1') });
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        'Başqa müəllimin yeniləməsi',
      );
      await page.getByRole('button', { name: 'Dərsi redaktə et', exact: true }).click();
      let dialog = page.getByRole('dialog');
      await expect(dialog.getByLabel('Başlıq', { exact: true })).toHaveValue(
        'Başqa müəllimin yeniləməsi',
      );
      await dialog
        .getByLabel('Məzmun', { exact: true })
        .fill('Brauzerdə saxlanmış müəllim qaralaması');
      await page.keyboard.press('Escape');
      await page.reload();
      await page.getByRole('button', { name: 'Dərsi redaktə et', exact: true }).click();
      dialog = page.getByRole('dialog');
      await expect(dialog.getByLabel('Məzmun', { exact: true })).toHaveValue(
        'Brauzerdə saxlanmış müəllim qaralaması',
      );
      await page.keyboard.press('Escape');
      expect(
        (
          await admin.patch(path, {
            data: {
              topicId,
              title: 'Ən son server başlığı',
              content: 'Ən son server mətni',
              isPublished: true,
              expectedVersion: 2,
            },
          })
        ).ok(),
      ).toBeTruthy();
      await page.reload();
      await page.getByRole('button', { name: 'Dərsi redaktə et', exact: true }).click();
      dialog = page.getByRole('dialog');
      await expect(dialog.getByLabel('Başlıq', { exact: true })).toHaveValue(
        'Ən son server başlığı',
      );
      await expect(dialog.getByRole('button', { name: 'Yadda saxla' })).toBeDisabled();
      await dialog.getByRole('button', { name: 'Qaralamanı bərpa et', exact: true }).click();
      await expect(dialog.getByLabel('Məzmun', { exact: true })).toHaveValue(
        'Brauzerdə saxlanmış müəllim qaralaması',
      );
      await dialog.getByRole('button', { name: 'Yadda saxla' }).click();
      await expect(dialog).toBeHidden();
      const saved = await (await admin.get(path)).json();
      expect(saved.version).toBe(4);
      expect(saved.content).toBe('Brauzerdə saxlanmış müəllim qaralaması');
    } finally {
      await page.close();
    }
  });

  test('history restores an older text into a new version and keeps the replaced version', async () => {
    const page = await teacherContext.newPage();
    try {
      await page.goto(`/akademiya/sinif/${groupId}/ders/${lessonId}`);
      await page.getByRole('button', { name: 'Versiya tarixçəsi', exact: true }).click();
      const history = page.getByRole('dialog', { name: 'Versiya tarixçəsi', exact: true });
      await history.getByRole('button', { name: 'Versiya 3', exact: true }).click();
      await expect(history.getByRole('heading', { level: 3 })).toHaveText('Ən son server başlığı');
      await history.getByRole('button', { name: 'Bu versiyanı bərpa et' }).click();
      await page
        .getByRole('dialog', { name: 'Əvvəlki versiyanı bərpa edək?' })
        .getByRole('button', { name: 'Bu versiyanı bərpa et' })
        .click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ən son server başlığı');
      const historyResponse = await (
        await admin.get(`/api/academy/classroom/lessons/${lessonId}/history`)
      ).json();
      expect(historyResponse.total).toBe(5);
      expect(
        historyResponse.items.find((r: { version: number }) => r.version === 4).snapshot.content,
      ).toBe('Brauzerdə saxlanmış müəllim qaralaması');
    } finally {
      await page.close();
    }
  });

  test('leaving a SQL lesson during runtime loading terminates its worker', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ baseURL, storageState: await admin.storageState() });
    const held: Array<import('@playwright/test').Route> = [];
    let created = 0,
      closed = 0;
    try {
      await context.route('**/duckdb/*.wasm', (route) => {
        held.push(route);
      });
      const page = await context.newPage();
      page.on('worker', (worker) => {
        if (worker.url().includes('duckdb-browser')) {
          created++;
          worker.on('close', () => closed++);
        }
      });
      await page.goto('/kurs/numune/numune-fesil/sql?onizle=1', { waitUntil: 'domcontentloaded' });
      await expect.poll(() => held.length, { timeout: 15000 }).toBeGreaterThan(0);
      await page.evaluate(() => {
        (window as Window & { auditSameDocument?: boolean }).auditSameDocument = true;
      });
      await page.locator('a[href="/kurs/numune"]').first().click();
      await expect(page).toHaveURL(/\/kurs\/numune$/);
      expect(
        await page.evaluate(
          () => (window as Window & { auditSameDocument?: boolean }).auditSameDocument,
        ),
      ).toBe(true);
      await expect.poll(() => closed, { timeout: 3000 }).toBe(created);
    } finally {
      for (const route of held)
        await route
          .fulfill({ status: 503, body: 'Controlled network delay ended' })
          .catch(() => {});
      await context.close();
    }
  });

  test('password reset form consumes a private local email link and revokes old sessions', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ baseURL });
    try {
      const page = await context.newPage();
      await page.goto('/sifre-berpa');
      await page.getByLabel('E-poçt', { exact: true }).fill(student.email);
      await page.getByRole('button', { name: 'Bərpa linki göndər', exact: true }).click();
      await expect(page.getByRole('status')).toContainText('bərpa linki göndərildi');
      let token = '';
      await expect
        .poll(async () => {
          const dir = resolve(ROOT, '.local/mail');
          for (const name of await readdir(dir).catch(() => [])) {
            const mail = await readFile(resolve(dir, name), 'utf8');
            if (mail.includes(student.email))
              token = /#token=([a-f0-9]{64})/.exec(mail)?.[1] ?? token;
          }
          return token.length;
        })
        .toBe(64);
      await page.goto(`/sifre-yenile#token=${token}`);
      await page.getByLabel('Yeni şifrə', { exact: true }).fill('RecoveredBrowser123!');
      await page.getByLabel('Şifrəni təkrar yazın', { exact: true }).fill('RecoveredBrowser123!');
      await page.getByRole('button', { name: 'Şifrəni yenilə', exact: true }).click();
      await expect(page.getByRole('status')).toContainText('Şifrəniz yeniləndi');
      expect((await studentContext.request.get('/api/auth/me')).status()).toBe(401);
      expect(
        (
          await context.request.post('/api/auth/login', {
            data: { email: student.email, password: 'RecoveredBrowser123!' },
          })
        ).ok(),
      ).toBeTruthy();
    } finally {
      await context.close();
    }
  });

  test('admin can block and unblock without removing the student or their group records', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ baseURL, storageState: await admin.storageState() });
    try {
      const page = await context.newPage();
      await page.goto(`/admin/telebeler/${studentId}`);
      const controls = page.getByTestId('account-controls');
      await controls.getByRole('button', { name: 'Hesabı blokla', exact: true }).click();
      await page
        .getByRole('dialog', { name: 'Hesabı blokla', exact: true })
        .getByRole('button', { name: 'Hesabı blokla', exact: true })
        .click();
      await expect(controls).toContainText('Bloklanıb');
      await controls.getByRole('button', { name: 'Bloku aç', exact: true }).click();
      await page
        .getByRole('dialog', { name: 'Bloku aç', exact: true })
        .getByRole('button', { name: 'Bloku aç', exact: true })
        .click();
      await expect(
        controls.getByRole('button', { name: 'Hesabı blokla', exact: true }),
      ).toBeVisible();
      const details = await admin.get(`/api/admin/users/${studentId}`);
      expect(details.ok()).toBeTruthy();
      const students = await (await admin.get(`/api/academy/groups/${groupId}/students`)).json();
      expect(JSON.stringify(students)).toContain(studentId);
    } finally {
      await context.close();
    }
  });
});
