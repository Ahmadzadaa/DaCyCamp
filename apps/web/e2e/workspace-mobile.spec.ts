/**
 * UX-01: dar ekranda (≤900px) dərs ekranı «Tapşırıq / Kod» tablarına bölünür. Hər iki panel montajda qalır —
 * tab dəyişəndə yazılmış kod itmir; klaviatura ilə (← / →) keçid; üfüqi sürüşmə yoxdur.
 * İşə salma: API + web işləyərkən `pnpm --filter @dacy/web e2e -- e2e/workspace-mobile.spec.ts`
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { ADMIN, SHOTS, login } from './helpers';

const noOverflow = async (page: Page) =>
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);

for (const width of [320, 390, 768]) {
  test(`${width}px: tablar, redaktorun vəziyyəti qalır, klaviatura, üfüqi sürüşmə yoxdur`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await login(page, ADMIN);
    await page.goto('/kurs/numune/numune-fesil/sql?onizle=1');
    const task = page.getByTestId('ws-tab-task');
    const code = page.getByTestId('ws-tab-code');
    await expect(task).toHaveAttribute('aria-selected', 'true');
    await expect(code).toHaveText('Kod');
    await expect(page.locator('#ws-pane-task')).toBeVisible();
    await expect(page.locator('#ws-pane-code')).toBeHidden();
    await noOverflow(page);

    await code.click();
    await expect(page.locator('#ws-pane-task')).toBeHidden();
    const editor = page.locator('#ws-pane-code .monaco-editor').first();
    await expect(editor).toBeVisible({ timeout: 90_000 });
    // redaktor panelin bütün enini tutur (gizli montajdan sonra ölçüsü düzgündür)
    expect((await editor.boundingBox())!.width).toBeGreaterThan(width - 40);
    await editor.locator('.view-lines').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type(`SELECT ${width} AS en;`);
    await noOverflow(page);

    await task.click();
    await code.click();
    await expect(editor.locator('.view-lines')).toContainText(`SELECT ${width} AS en;`);

    // WAI-ARIA tabs: ← / → keçid və fokus
    await code.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(task).toBeFocused();
    await expect(task).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(code).toBeFocused();
    await expect(page.locator('#ws-pane-code')).toBeVisible();
    if (width === 390) {
      mkdirSync(SHOTS, { recursive: true });
      await page.screenshot({ path: resolve(SHOTS, 'workspace-sql-code.mobile.png') });
    }
  });
}

test('tab adı addımın növünə uyğundur (CTF → Flag); geniş ekranda tablar yoxdur', async ({
  page,
}) => {
  await login(page, ADMIN);
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/kurs/numune/numune-fesil/ctf?onizle=1');
  await expect(page.getByTestId('ws-tab-code')).toHaveText('Flag');
  await page.setViewportSize({ width: 1240, height: 800 });
  await expect(page.getByTestId('ws-tab-code')).toHaveCount(0);
  await expect(page.locator('.ws-left').first()).toBeVisible();
  await expect(page.locator('.ws-right').first()).toBeVisible();
});
