/**
 * Akademiya admin ekranları (brauzerdə): proqramın yerində redaktəsi, qrupun başlanğıc / bitmə tarixləri,
 * yazılışın tarixçəsi (yalnız oxumaq üçün).
 * İşə salma: API + web işləyərkən `pnpm --filter @dacy/web e2e -- e2e/academy-admin.spec.ts`
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { ADMIN, SHOTS, login } from './helpers';

const ts = Date.now();
const short = String(ts).slice(-5);
const day = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

test('admin: proqramı redaktə edir, qrupun tarixlərini dəyişir, yazılış tarixçəsinə baxır', async ({
  page,
  browser,
}) => {
  await login(page, ADMIN);
  const api = page.request;
  const prog = await (
    await api.post('/api/academy/programs', {
      data: { title: `Proqram ${short}`, slug: `prog-${short}`, status: 'ACTIVE' },
    })
  ).json();
  const group = await (
    await api.post('/api/academy/groups', {
      data: {
        programId: prog.id,
        code: `AD-${short}`,
        name: `Admin qrupu ${short}`,
        status: 'ACTIVE',
        startAt: `${day(-5)}T00:00:00.000Z`,
        endAt: `${day(30)}T00:00:00.000Z`,
      },
    })
  ).json();
  // tələbə: ayrıca hesab, admin onu qrupa yazır
  const ctx = await browser.newContext();
  const email = `e2e-admin-st-${ts}@dacy.local`;
  await ctx.request.post('/api/auth/register', {
    data: { name: `Tələbə ${short}`, email, password: 'E2eStudent123!' },
  });
  await ctx.close();
  const users = await (
    await api.get(`/api/admin/users?pageSize=5&q=${encodeURIComponent(email)}`)
  ).json();
  expect(
    (
      await api.post(`/api/academy/groups/${group.id}/enrollments`, {
        data: { userId: users.items[0].id },
      })
    ).ok(),
  ).toBeTruthy();

  // 1) proqram: qələm → ad və təsvir → saxla
  await page.goto('/admin/akademiya');
  await page.getByTestId(`program-edit-prog-${short}`).click();
  const form = page.getByTestId('program-edit-form');
  await form.getByLabel('Başlıq').fill(`Proqram ${short} (yenilənib)`);
  await form.getByRole('button', { name: 'Yadda saxla' }).click();
  await expect(page.getByText('Saxlanıldı').first()).toBeVisible();
  await expect(page.getByTestId('program-list')).toContainText(`Proqram ${short} (yenilənib)`);

  // 2) qrup: bitmə tarixini uzat
  await page.goto(`/admin/akademiya/qruplar/${group.id}`);
  const editor = page.getByTestId('group-editor');
  await expect(editor.getByTestId('group-start')).toHaveValue(day(-5));
  await editor.getByTestId('group-end').fill(day(60));
  await editor.getByRole('button', { name: 'Yadda saxla' }).click();
  await expect(page.getByText('Saxlanıldı').first()).toBeVisible();
  const saved = await (await api.get(`/api/academy/groups/${group.id}`)).json();
  expect(saved.endAt.slice(0, 10)).toBe(day(60));

  // 3) yazılış tarixçəsi
  const enr = page.getByTestId('enrollments-manager');
  await enr.getByTestId('enrollment-history-toggle').first().click();
  await expect(enr.getByTestId('enrollment-history')).toContainText('Aktiv');
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({
    path: resolve(SHOTS, 'academy-admin-group-edit.png'),
    fullPage: true,
    animations: 'disabled',
  });
});
