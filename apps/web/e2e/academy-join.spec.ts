/**
 * Akademiya — qoşulma kodu və ayrıca müəllim hesabı (brauzerdə):
 * admin qrup yaradır və qrupun kodunu görür → tələbə qeydiyyatda «DaCy Academy» seçib kodu yazır və birbaşa
 * qrupa düşür (Camp da açıq qalır) → yalnız Camp seçən tələbədə akademiya yoxdur → admin müəllim hesabı
 * yaradır → müəllim daxil olub «Müəllim paneli»nə düşür, qrupa təyin olunanda qrupu görür.
 * Hesabat üçün ekran şəkilləri: docs/screenshots/academy-join-*.png
 * İşə salma: API + web işləyərkən `pnpm --filter @dacy/web e2e -- e2e/academy-join.spec.ts`
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { ADMIN, SHOTS, login } from './helpers';

test.describe.configure({ mode: 'serial' });

const ts = Date.now();
const short = String(ts).slice(-6);
const groupCode = `DE-J${short.slice(-4)}`;
const student = {
  name: `Akademiya Tələbəsi ${short}`,
  email: `e2e-join-${ts}@dacy.local`,
  password: 'E2eStudent123!',
};
const camper = {
  name: `Camp Tələbəsi ${short}`,
  email: `e2e-camp-${ts}@dacy.local`,
  password: 'E2eCamp123!',
};
const teacher = {
  name: `Nigar Müəllim ${short}`,
  email: `e2e-nigar-${ts}@dacy.local`,
  password: 'E2eTeacher123!',
};
let groupId = '';
let joinCode = '';

const shot = (page: Page, name: string, fullPage = false) => {
  mkdirSync(SHOTS, { recursive: true });
  return page.screenshot({
    path: resolve(SHOTS, `academy-join-${name}.png`),
    fullPage,
    animations: 'disabled',
  });
};

test('admin qrup yaradır və qrupun qoşulma kodunu görür', async ({ page }) => {
  await login(page, ADMIN);
  // admin saytda: yuxarıda «Admin panel» düyməsi, solda «Müəllim paneli»
  await page.goto('/panel');
  await expect(page.getByRole('link', { name: 'Admin panel' }).first()).toBeVisible();
  await shot(page, 'admin-entry');
  const prog = await page.request.post('/api/academy/programs', {
    data: { title: `Data Engineering ${short}`, slug: `de-join-${short}`, status: 'ACTIVE' },
  });
  expect(prog.ok()).toBeTruthy();
  const g = await page.request.post('/api/academy/groups', {
    data: {
      programId: (await prog.json()).id,
      code: groupCode,
      name: `Data Engineering — ${groupCode}`,
      status: 'ACTIVE',
    },
  });
  expect(g.ok()).toBeTruthy();
  groupId = (await g.json()).id;

  await page.goto('/admin/akademiya');
  await expect(page.getByTestId('admin-groups')).toContainText(groupCode);
  await page.goto(`/admin/akademiya/qruplar/${groupId}`);
  const box = page.getByTestId('join-code-box');
  await expect(box).toBeVisible();
  const pretty = (await box.getByTestId('join-code-value').innerText()).trim();
  expect(pretty).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  joinCode = pretty;
  await shot(page, 'admin-code');
});

test('qeydiyyat yol soruşur; «DaCy Academy» + kod → birbaşa qrupa, Camp da açıq', async ({
  page,
}) => {
  await page.goto('/qeydiyyat');
  await expect(page.getByTestId('register-choice')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Qeydiyyat' })).toBeVisible();
  // üstünə gəlinən kart öz rəngini alıb qalxır; basanda forma açılır
  await page.getByTestId('choose-academy').hover();
  await expect(page.getByTestId('choose-academy')).toHaveCSS(
    'border-top-color',
    'rgb(10, 132, 255)',
  );
  await shot(page, 'register-choice');
  await page.getByTestId('choose-academy').click();
  const form = page.getByTestId('academy-register');
  await form.getByTestId('join-code').fill(joinCode.toLowerCase());
  await form.getByRole('button', { name: 'Yoxla' }).click();
  await expect(form.getByTestId('join-preview')).toContainText(groupCode);
  await form.getByLabel('Ad və soyad').fill(student.name);
  await form.getByLabel('E-poçt').fill(student.email);
  await form.getByLabel('Şifrə', { exact: true }).fill(student.password);
  await shot(page, 'register-academy', true);
  await form.getByRole('button', { name: 'Qeydiyyatdan keç' }).click();

  await expect(page).toHaveURL(/\/akademiya$/, { timeout: 30_000 });
  const nav = page.locator('aside, nav').first();
  await expect(page.getByRole('link', { name: 'Mənim akademiyam' }).first()).toBeVisible();
  await expect(nav).toBeVisible();
  await shot(page, 'student-academy');
  // Camp hissəsi də açıqdır
  await page.goto('/kurslar');
  await expect(page.getByRole('heading', { level: 1, name: 'Kurslar' })).toBeVisible();
});

test('yanlış kod: forma xəta göstərir, hesab yaranmır', async ({ page }) => {
  await page.goto('/qeydiyyat?kod=ZZZZZZZZ');
  const form = page.getByTestId('academy-register');
  await expect(form.getByTestId('join-code')).toHaveValue('ZZZZZZZZ');
  await form.getByLabel('Ad və soyad').fill('Səhv Kod');
  await form.getByLabel('E-poçt').fill(`e2e-wrong-${ts}@dacy.local`);
  await form.getByLabel('Şifrə', { exact: true }).fill('E2eWrong123!');
  await form.getByRole('button', { name: 'Qeydiyyatdan keç' }).click();
  await expect(form.getByRole('alert')).toContainText('Kod yanlışdır');
  const login = await page.request.post('/api/auth/login', {
    data: { email: `e2e-wrong-${ts}@dacy.local`, password: 'E2eWrong123!' },
  });
  expect(login.status()).toBe(401);
});

test('yalnız «DaCy Camp» seçən tələbədə akademiya menyusu yoxdur', async ({ page }) => {
  await page.goto('/qeydiyyat');
  await page.getByTestId('choose-camp').click();
  await page.getByLabel('Ad və soyad').fill(camper.name);
  await page.getByLabel('E-poçt').fill(camper.email);
  await page.getByLabel('Şifrə', { exact: true }).fill(camper.password);
  await page.getByRole('button', { name: 'Qeydiyyatdan keç' }).click();
  await expect(page).toHaveURL(/\/baslangic$/, { timeout: 30_000 });
  await page.goto('/panel');
  await expect(page.getByRole('link', { name: 'Mənim akademiyam' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Müəllim paneli' })).toHaveCount(0);
});

test('admin müəllim hesabı yaradır; müəllim öz panelinə düşür və təyin olunan qrupu görür', async ({
  page,
  browser,
}) => {
  await login(page, ADMIN);
  await page.goto('/admin/akademiya');
  const box = page.getByTestId('teacher-accounts');
  await box.getByRole('button', { name: 'Yeni müəllim hesabı' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Ad və soyad').fill(teacher.name);
  await dlg.getByLabel('E-poçt').fill(teacher.email);
  await dlg.getByLabel('Şifrə').fill(teacher.password);
  await expect(dlg.getByLabel('Rol')).toHaveCount(0);
  await dlg.getByRole('button', { name: 'Yeni müəllim hesabı' }).click();
  await expect(box).toContainText(teacher.email, { timeout: 15_000 });
  await box.scrollIntoViewIfNeeded();
  await shot(page, 'admin-teachers');

  // müəllim: ayrıca hesabla daxil olur → «Müəllim paneli» (hələ qrup yoxdur)
  const ctx = await browser.newContext();
  const tp = await ctx.newPage();
  await tp.goto('/giris');
  await tp.getByLabel('E-poçt').fill(teacher.email);
  await tp.getByLabel('Şifrə', { exact: true }).fill(teacher.password);
  await tp.getByRole('button', { name: 'Daxil ol' }).click();
  await expect(tp).toHaveURL(/\/muellim$/, { timeout: 30_000 });
  await expect(tp.getByText('Sizə təyin olunmuş qrup yoxdur')).toBeVisible();
  // Camp admin paneli müəllimə açıq deyil
  await expect(tp.getByRole('link', { name: 'Admin panel' })).toHaveCount(0);

  // admin onu qrupa aparıcı müəllim təyin edir
  const users = await page.request.get(
    `/api/admin/users?pageSize=5&q=${encodeURIComponent(teacher.email)}`,
  );
  const teacherId = (await users.json()).items[0].id as string;
  const assign = await page.request.post(`/api/academy/groups/${groupId}/instructors`, {
    data: { userId: teacherId, role: 'LEAD' },
  });
  expect(assign.ok()).toBeTruthy();

  await tp.reload();
  await expect(tp.getByTestId('teacher-groups')).toContainText(groupCode);
  await expect(tp.getByRole('link', { name: 'Müəllim paneli' }).first()).toBeVisible();
  await shot(tp, 'teacher-panel');
  await ctx.close();
});

test('mobil (390px): qeydiyyat seçimi və akademiya forması sığır', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await p.goto('/qeydiyyat');
  await expect(p.getByTestId('register-choice')).toBeVisible();
  const overflow = () =>
    p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await overflow()).toBeLessThanOrEqual(0);
  await shot(p, 'mobile-choice', true);
  await p.getByTestId('choose-academy').click();
  await expect(p.getByTestId('academy-register')).toBeVisible();
  expect(await overflow()).toBeLessThanOrEqual(0);
  await ctx.close();
});
