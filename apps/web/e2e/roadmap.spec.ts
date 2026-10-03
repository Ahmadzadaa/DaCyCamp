import { expect, test } from '@playwright/test';
import { ADMIN, STUDENT, login } from './helpers';

/** Roadmap (karyera xəritəsi), kataloqda səviyyə filtri, admin redaktəsi (xəritə + səviyyə adları) */
test.describe.configure({ mode: 'serial' });

test('qonaq: karyera xəritəsi, səviyyə nərdivanı, işarələmək üçün giriş çağırışı', async ({
  page,
}) => {
  await page.goto('/yollar?karyera=data-engineer');
  await expect(page.getByRole('heading', { level: 1, name: 'Roadmap' })).toBeVisible();
  await expect(page.getByTestId('career-data-engineer')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { level: 2, name: 'Intern Data Engineer' })).toBeVisible();
  await page.getByTestId('level-junior').click();
  await expect(page).toHaveURL(/seviyye=junior/);
  await expect(page.getByRole('heading', { level: 2, name: 'Junior Data Engineer' })).toBeVisible();
  // qonaq işarələyə bilmir
  await expect(page.getByTestId('skill-de-j-airflow').getByRole('checkbox')).toBeDisabled();
  await expect(page.getByText(/Daxil ol — bildiklərini işarələ/)).toBeVisible();
});

test('tələbə bacarığı işarələyir, hazırlıq faizi artır və yadda qalır', async ({ page }) => {
  await login(page, STUDENT);
  await page.goto('/yollar?karyera=data-analyst&seviyye=intern');
  const box = page.getByTestId('skill-da-i-excel-formulas').getByRole('checkbox');
  // əvvəlki icralardan qalıbsa sıfırla
  if ((await box.getAttribute('aria-checked')) === 'true') {
    await box.click();
    await expect(box).toHaveAttribute('aria-checked', 'false');
  }
  const before = await page.getByTestId('level-ready').innerText();
  await box.click();
  await expect(box).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('level-ready')).not.toHaveText(before);
  await page.reload();
  await expect(page.getByTestId('skill-da-i-excel-formulas').getByRole('checkbox')).toHaveAttribute(
    'aria-checked',
    'true',
  );
  // təmizlik
  await page.getByTestId('skill-da-i-excel-formulas').getByRole('checkbox').click();
  await expect(page.getByTestId('skill-da-i-excel-formulas').getByRole('checkbox')).toHaveAttribute(
    'aria-checked',
    'false',
  );
});

test('kataloq: səviyyə çiplər yox, «Səviyyə» filtri', async ({ page }) => {
  await page.goto('/kurslar');
  await expect(page.getByTestId('level-chip-BEGINNER')).toHaveCount(0);
  await page.getByTestId('catalog-level').click();
  await page.getByRole('menuitemradio', { name: /Başlanğıc/ }).click();
  await expect(page).toHaveURL(/seviyye=BEGINNER/);
  await expect(page.getByTestId('catalog-level')).toContainText('Başlanğıc');
});

test('admin: xəritədə bacarığı redaktə edir, saytda görünür; səviyyə adını dəyişir', async ({
  page,
}) => {
  await login(page, ADMIN);
  await page.goto('/admin/karyera');
  await page
    .getByTestId('roadmap-row-cyber-security')
    .getByRole('link', { name: 'Kiber təhlükəsizlik' })
    .click();
  await expect(page.getByTestId('roadmap-editor')).toBeVisible({ timeout: 30_000 });
  const skill = page.getByTestId('edit-group-0').getByLabel('Bacarıq').first();
  const original = await skill.inputValue();
  await skill.fill(`${original} (E2E)`);
  await page.getByTestId('roadmap-save').click();
  await expect(page.getByText('Xəritə yadda saxlanıldı')).toBeVisible();
  await page.goto('/yollar?karyera=cyber-security&seviyye=intern');
  await expect(page.getByText(`${original} (E2E)`)).toBeVisible();
  // geri qaytar
  await page.goto('/admin/karyera');
  await page
    .getByTestId('roadmap-row-cyber-security')
    .getByRole('link', { name: 'Kiber təhlükəsizlik' })
    .click();
  await page.getByTestId('edit-group-0').getByLabel('Bacarıq').first().fill(original);
  await page.getByTestId('roadmap-save').click();
  await expect(page.getByText('Xəritə yadda saxlanıldı')).toBeVisible();

  // səviyyə adı: kataloqda dərhal görünür, sonra geri qaytarılır
  await page.goto('/admin/movzular');
  const lbl = page.getByTestId('level-label-ADVANCED');
  await lbl.fill('Peşəkar');
  await page.getByTestId('level-labels').getByRole('button', { name: 'Yadda saxla' }).click();
  await expect(page.getByText('Səviyyə adları yadda saxlanıldı')).toBeVisible();
  // yadda saxlamadan sonrakı router.refresh() bitməmiş naviqasiya etməyək
  await page.waitForLoadState('networkidle');
  await page.goto('/kurslar');
  await page.getByTestId('catalog-level').click();
  await expect(page.getByRole('menuitemradio', { name: /Peşəkar/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/admin/movzular');
  await page.getByTestId('level-label-ADVANCED').fill('Çətin');
  await page.getByTestId('level-labels').getByRole('button', { name: 'Yadda saxla' }).click();
  await expect(page.getByText('Səviyyə adları yadda saxlanıldı')).toBeVisible();
});

test('yalnız admin: tələbə xəritə və səviyyə API-lərinə yaza bilmir', async ({ page }) => {
  await login(page, STUDENT);
  expect((await page.request.get('/api/admin/roadmaps')).status()).toBe(403);
  expect(
    (await page.request.put('/api/admin/settings/levels', { data: { BEGINNER: 'x' } })).status(),
  ).toBe(403);
});
