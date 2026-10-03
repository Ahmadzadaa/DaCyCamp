import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { ADMIN, SHOTS, STUDENT, login } from './helpers';

test.describe.configure({ mode: 'serial' });
const slug = `e2e-kurs-${Date.now()}`;

test('tələbə /admin-ə girə bilmir', async ({ page }) => {
  await login(page, STUDENT);
  await page.goto('/admin/kurslar');
  await expect(page).toHaveURL(/\/kurslar$/);
});

test('admin: kurs → fəsil → nəzəri addım → dərc → tələbə görür → sil', async ({ page }) => {
  await login(page, ADMIN);
  // dev rejimində redaktor marşrutunun ilk kompilyasiyası uzun çəkir — əvvəlcədən isidirik
  await page.goto('/admin/kurslar/numune');
  await expect(page.locator('h1', { hasText: 'NÜMUNƏ — silinə bilər' })).toBeVisible({
    timeout: 60_000,
  });
  await page.goto('/admin/kurslar');
  await expect(page.getByRole('heading', { name: 'Kurslar' })).toBeVisible();
  await page.screenshot({ path: resolve(SHOTS, 'admin-courses.app.png'), fullPage: true });

  // yeni kurs
  await page.getByRole('link', { name: /Yeni kurs/ }).click();
  await page.getByLabel('Başlıq').fill('E2E test kursu');
  await page.getByLabel('Slug (URL)').fill(slug);
  await page.getByRole('button', { name: 'Yarat' }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/kurslar/${slug}`), { timeout: 30_000 });

  // fəsil
  await page.getByRole('button', { name: '+ Fəsil əlavə et' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Başlıq').fill('Giriş fəsli');
  await dlg.getByRole('button', { name: 'Yarat' }).click();
  await expect(page.getByRole('heading', { name: 'Giriş fəsli' })).toBeVisible();
  // fəsli dərc et
  await page.getByRole('switch').click();
  await page.getByRole('button', { name: 'Yadda saxla' }).click();
  await expect(page.getByText('Fəsil yadda saxlanıldı')).toBeVisible();

  // addım
  await page.getByRole('button', { name: '+ Addım əlavə et' }).click();
  await dlg.getByLabel('Başlıq').fill('Salam dünya');
  // boş addım yoxlanılır — «nümunə məzmunla doldur» söndürülür
  await dlg.getByTestId('step-template').click();
  await dlg.getByRole('button', { name: 'Yarat' }).click();
  await expect(page.getByRole('heading', { name: 'Salam dünya' })).toBeVisible();
  await expect(page.getByText('Qaralama').first()).toBeVisible();

  // boş məzmunla dərc → səhv siyahısı (addımın düyməsi; başlıqdakı «Kursu dərc et»dən fərqli)
  await page.getByRole('button', { name: 'Dərc et', exact: true }).click();
  await expect(page.getByText('Dərc etmək üçün düzəldin:')).toBeVisible();

  // məzmun + canlı önizləmə
  await page.locator('textarea.code').fill('# Salam\n\nBu **e2e** mətnidir.');
  await expect(page.locator('.box h1', { hasText: 'Salam' })).toBeVisible();
  await page.getByRole('button', { name: 'Yadda saxla' }).click();
  await expect(page.getByText('Addım yadda saxlanıldı')).toBeVisible();
  await page.screenshot({ path: resolve(SHOTS, 'admin-theory.app.png'), fullPage: true });
  await page.getByRole('button', { name: 'Dərc et', exact: true }).click();
  await expect(page.getByText('Dərc olundu')).toBeVisible();

  // kursu dərc et (addımın toast-u hələ görünə bilər → first)
  await page.locator('.tree h4 button').click();
  await page.getByRole('button', { name: 'Kursu dərc et' }).click();
  await expect(page.getByText('Kurs dərc olundu').first()).toBeVisible();

  // tələbə kimi
  const s = await page.context().browser()!.newContext();
  const sp = await s.newPage();
  await login(sp, STUDENT);
  await sp.goto(`/kurs/${slug}`);
  await expect(sp.getByRole('heading', { name: 'E2E test kursu' })).toBeVisible();
  await expect(sp.getByText('Salam dünya')).toBeVisible();
  await s.close();

  // sil (ADMIN): yazılma yoxdur → ad təsdiqi tələb olunmur; kurs «Silinənlər»ə keçir
  const { id } = await (await page.request.get(`/api/admin/courses/${slug}`)).json();
  await page.getByRole('button', { name: 'Sil', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Sil' }).click();
  await expect(page).toHaveURL(/\/admin\/kurslar$/);
  await expect(page.getByText('Kurs silindi').first()).toBeVisible();
  // test kursu silinənlərdə qalmasın
  expect((await page.request.delete(`/api/admin/courses/${id}/permanent`)).status()).toBe(200);
});

test('istiqamətlər və tələbələr səhifələri', async ({ page }) => {
  await login(page, ADMIN);
  await page.goto('/admin/istiqametler');
  await expect(page.getByText('Data Analytics').first()).toBeVisible();
  await page.screenshot({ path: resolve(SHOTS, 'admin-tracks.app.png'), fullPage: true });
  await page.goto('/admin/telebeler');
  await page.getByRole('textbox', { name: 'Axtar', exact: true }).fill(ADMIN.email); // siyahı səhifələnir — axtarışla tap
  await expect(page.getByRole('cell', { name: ADMIN.email })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('combobox').first()).toBeVisible(); // ADMIN rol dəyişə bilir
});
