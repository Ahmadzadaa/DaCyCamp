/**
 * Akademiya — qəbul ssenarisi (brauzerdə, bir tətbiq, bir hesab):
 * admin proqram və qrup yaradır, müəllim təyin edir, tələbəni yazır → müəllim tapşırıq yaradıb dərc edir →
 * tələbə «Mənim akademiyam»da görür, cavab yazıb göndərir → müəllim qiymətləndirib açıqlayır →
 * tələbə qiyməti görür; ingilis dilində də işləyir.
 * İşə salma: API + web işləyərkən `pnpm --filter @dacy/web e2e -- e2e/academy.spec.ts`
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { ADMIN, SHOTS, login } from './helpers';

test.describe.configure({ mode: 'serial' });

const ts = Date.now();
const short = String(ts).slice(-6);
const teacher = {
  name: `Müəllim E2E ${short}`,
  email: `e2e-teacher-${ts}@dacy.local`,
  password: 'E2eTeacher123!',
};
const student = {
  name: `Tələbə E2E ${short}`,
  email: `e2e-student-${ts}@dacy.local`,
  password: 'E2eStudent123!',
};
const program = `E2E Data Engineering ${short}`;
const groupCode = `E2E-${short}`;
const assignment = `ETL hesabatı ${short}`;
const shot = (page: Page, name: string) => {
  mkdirSync(SHOTS, { recursive: true });
  return page.screenshot({
    path: resolve(SHOTS, `academy-${name}.png`),
    fullPage: true,
    animations: 'disabled',
  });
};
const localInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

test('admin proqram və qrup yaradır, aparıcı müəllim təyin edir və tələbəni yazır', async ({
  page,
}) => {
  for (const u of [teacher, student])
    expect((await page.request.post('/api/auth/register', { data: u })).ok()).toBeTruthy();
  await login(page, ADMIN);
  await page.goto('/admin/akademiya');
  await expect(page.getByRole('heading', { level: 1, name: 'Akademiya' })).toBeVisible();

  const pf = page.getByTestId('program-form');
  await pf.getByLabel('Başlıq').fill(program);
  await pf.getByRole('button', { name: 'Yeni proqram' }).click();
  const gf = page.getByTestId('group-form');
  await expect(gf.getByLabel('Proqram')).toContainText(program, { timeout: 15_000 });
  await gf.getByLabel('Proqram').selectOption({ label: program });
  await gf.getByLabel('Kod').fill(groupCode);
  await gf.getByLabel('Ad', { exact: true }).fill(`Data Engineering ${short}`);
  await gf.getByLabel('Vəziyyət').selectOption('ACTIVE');
  await gf.getByLabel('Aparıcı müəllim').fill(teacher.email);
  await gf.getByRole('button', { name: new RegExp(teacher.name) }).click();
  await gf.getByRole('button', { name: 'Yeni qrup' }).click();
  await expect(page).toHaveURL(/\/admin\/akademiya\/qruplar\/[a-z0-9]+$/, { timeout: 20_000 });
  await expect(page.getByTestId('instructors-manager')).toContainText(teacher.name);

  const em = page.getByTestId('enrollments-manager');
  await em.getByTestId('user-search').fill(student.email);
  await em.getByRole('button', { name: new RegExp(student.name) }).click();
  await expect(em.getByRole('table')).toContainText(student.name, { timeout: 15_000 });
  await shot(page, 'admin-group');
});

test('müəllim «Müəllim paneli»ndən tapşırıq yaradır və dərc edir', async ({ page }) => {
  await login(page, teacher);
  await page.goto('/panel');
  await page.getByRole('link', { name: 'Müəllim paneli' }).first().click();
  await expect(page).toHaveURL(/\/muellim$/);
  await page
    .getByTestId('teacher-groups')
    .getByRole('link', { name: new RegExp(groupCode) })
    .click();
  await page.getByTestId('new-assignment').click();

  const f = page.getByTestId('assignment-form');
  await f.getByLabel('Başlıq', { exact: true }).fill(assignment);
  await f.getByLabel('Təsvir', { exact: true }).fill('Kiçik ETL axınının **hesabatını** yazın.');
  await f
    .getByLabel('Son tarix', { exact: true })
    .fill(localInput(new Date(Date.now() + 3 * 86_400_000)));
  await f.getByTestId('add-item-TEXT').click();
  const item = f.getByTestId('assignment-item').first();
  await item.getByLabel('Elementin adı').fill('Hesabat');
  await item.getByLabel('Maksimum bal').fill('10');
  await f.getByRole('button', { name: 'Qaralama kimi saxla' }).click();
  await expect(page).toHaveURL(/\/muellim\/tapsiriqlar\/[a-z0-9]+$/, { timeout: 20_000 });
  await page.getByTestId('publish-now').click();
  await expect(page.locator('[data-status="PUBLISHED"]').first()).toBeVisible({ timeout: 15_000 });
  await shot(page, 'teacher-assignment');
});

test('tələbə «Mənim akademiyam»da tapşırığı görür, cavab yazır və göndərir', async ({ page }) => {
  await login(page, student);
  await page.goto('/panel');
  await page.getByRole('link', { name: 'Mənim akademiyam' }).first().click();
  await expect(page).toHaveURL(/\/akademiya$/);
  await expect(page.getByTestId('academy-groups')).toContainText(groupCode);
  await shot(page, 'student-overview');
  await page.getByRole('link', { name: 'Tapşırıqlar', exact: true }).click();
  await page.getByTestId('academy-assignment-row').filter({ hasText: assignment }).click();
  await expect(page.getByRole('heading', { name: assignment })).toBeVisible();
  await expect(page.getByTestId('academy-status').first()).toHaveAttribute(
    'data-status',
    'NOT_STARTED',
  );

  await page.getByLabel('Hesabat').fill('Axın: CSV → təmizləmə → Postgres. Dublikatlar silindi.');
  await page.getByTestId('academy-submit').click();
  await page.getByTestId('academy-submit-confirm').click();
  await expect(page.getByText('Göndəriş qəbul edildi (cəhd #1)')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('academy-status').first()).toHaveAttribute(
    'data-status',
    'SUBMITTED',
    { timeout: 15_000 },
  );
  await expect(page.getByTestId('academy-attempts')).toContainText('Cəhd #1');
  await shot(page, 'student-submitted');
});

test('müəllim göndərişi qiymətləndirir və tələbəyə açıqlayır', async ({ page }) => {
  await login(page, teacher);
  await page.goto('/muellim');
  await page
    .getByTestId('teacher-groups')
    .getByRole('link', { name: new RegExp(groupCode) })
    .click();
  await page.getByTestId('teacher-assignments').getByRole('link', { name: assignment }).click();
  await expect(page.getByTestId('submissions-table')).toContainText(student.name);
  await page.getByTestId('submissions-table').getByRole('link', { name: 'Qiymətləndir' }).click();
  await expect(page.getByRole('heading', { level: 1, name: student.name })).toBeVisible();
  await page.getByTestId('item-score').fill('8.5');
  await page.getByTestId('grade-feedback').fill('Yaxşı iş! Səhv halları da təsvir edin.');
  await page.getByTestId('grade-save').click();
  await expect(page.getByText('Qiymət saxlanıldı')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('grade-release').click();
  await expect(page.getByText('Qiymət tələbəyə açıqlandı')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('grade-history')).toContainText('Açıqlanıb');
  await shot(page, 'teacher-grading');
});

test('mobil görünüş (390px): akademiya səhifələrində üfüqi sürüşmə yoxdur', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const noOverflow = async (name: string) => {
    await expect(page.locator('main')).toBeVisible();
    const [scroll, inner] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      window.innerWidth,
    ]);
    expect(scroll, `${name}: üfüqi sürüşmə`).toBeLessThanOrEqual(inner + 1);
  };
  await login(page, student);
  for (const [path, name] of [
    ['/akademiya', 'student-overview'],
    ['/akademiya/tapsiriqlar', 'student-assignments'],
    ['/akademiya/qiymetler', 'student-grades'],
    ['/akademiya/cedvel', 'student-schedule'],
  ] as const) {
    await page.goto(path);
    await noOverflow(path);
    await shot(page, `mobile-${name}`);
  }
  await page.goto('/akademiya/tapsiriqlar');
  await page.getByTestId('academy-assignment-row').filter({ hasText: assignment }).click();
  await expect(page.getByTestId('academy-assignment')).toBeVisible();
  await noOverflow('assignment detail');
  await shot(page, 'mobile-student-assignment');

  await login(page, teacher);
  await page.goto('/muellim');
  await noOverflow('/muellim');
  await page
    .getByTestId('teacher-groups')
    .getByRole('link', { name: new RegExp(groupCode) })
    .click();
  await expect(page.getByTestId('teacher-assignments')).toBeVisible();
  await noOverflow('teacher group');
  await shot(page, 'mobile-teacher-group');
  await page.getByTestId('teacher-assignments').getByRole('link', { name: assignment }).click();
  await expect(page.getByTestId('submissions-table')).toBeVisible();
  await noOverflow('teacher assignment');
  await shot(page, 'mobile-teacher-assignment');
});

test('tələbə açıqlanmış qiyməti və rəyi görür; ingilis dilində də', async ({ page }) => {
  await login(page, student);
  await page.goto('/akademiya/qiymetler');
  const row = page.getByTestId('academy-grades').getByRole('row').filter({ hasText: assignment });
  await expect(row).toContainText('8.5 / 10');
  await row.getByRole('link', { name: assignment }).click();
  await expect(page.getByTestId('academy-grade')).toContainText('Səhv halları da təsvir edin');
  await expect(page.getByTestId('academy-status').first()).toHaveAttribute('data-status', 'GRADED');

  // dil dəyişdirici (seçim profilə də yazılır), sonra akademiya ingiliscə
  await page.getByTestId('lang-switch').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en', { timeout: 15_000 });
  await page.goto('/akademiya');
  await expect(page.getByRole('heading', { level: 1, name: 'My Academy' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Grades', exact: true })).toBeVisible();
});
