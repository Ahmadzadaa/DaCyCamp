import { expect, test, type Page } from '@playwright/test';
import { ADMIN, login } from './helpers';

async function code(page: Page, source: string) {
  const editor = page.getByTestId('code-editor').locator('.monaco-editor');
  await expect(editor).toBeVisible({ timeout: 90_000 });
  await editor.locator('.view-lines').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.insertText(source);
}
const run = (page: Page) => page.getByRole('button', { name: 'İşə sal', exact: true }).click();

test('Python worker: run, stdin, stop, reload, and hard timeout keep the UI responsive', async ({
  page,
}) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page, ADMIN);
  await page.goto('/kurs/numune/numune-fesil/python?onizle=1');
  await expect(page.getByRole('button', { name: 'İşə sal', exact: true })).toBeEnabled({
    timeout: 120_000,
  });
  await code(page, 'print("worker works")');
  await run(page);
  await expect(page.getByTestId('py-console')).toContainText('worker works', { timeout: 60_000 });
  await page.getByRole('tab', { name: /Giriş/ }).click();
  await page.getByTestId('py-stdin').fill('12\n3');
  await code(page, 'a = int(input())\nb = int(input())\nprint("sum", a+b)');
  await run(page);
  await expect(page.getByTestId('py-console')).toContainText('sum 15');
  await code(page, 'import time\ntime.sleep(30)');
  await run(page);
  const stop = page.getByRole('button', { name: 'Dayandır', exact: true });
  await expect(stop).toBeEnabled();
  await stop.click();
  await expect(page.getByTestId('py-console')).toContainText('dayandırıldı', { timeout: 15_000 });
  await code(page, 'print("after stop")');
  await run(page);
  await expect(page.getByTestId('py-console')).toContainText('after stop', { timeout: 90_000 });
  // A native call is not interrupted by Python's line-tracing watchdog; the worker deadline still stops it.
  await code(page, 'import time\ntime.sleep(60)');
  await run(page);
  await page.getByRole('tab', { name: /Giriş/ }).click();
  await expect(page.getByTestId('py-stdin')).toBeVisible({ timeout: 2000 });
  await expect(page.getByTestId('py-console')).toContainText('saniyədən çox', { timeout: 25_000 });
  await expect(page.getByRole('button', { name: 'İşə sal', exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
});

test('SQL: actual code is submitted, errors are recoverable, and lesson sessions do not collide', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page, ADMIN);
  await page.goto('/kurs/numune/numune-fesil/sql?onizle=1');
  await expect(page.getByRole('button', { name: 'İşə sal', exact: true })).toBeEnabled({
    timeout: 90_000,
  });
  await code(page, 'SELECT * FROM numune');
  await run(page);
  await expect(page.getByTestId('sql-console').locator('table')).toBeVisible();
  await code(page, 'SELECT wrong_column FROM numune');
  await page.getByTestId('submit-sql').click();
  await expect(page.getByTestId('sql-console')).toContainText('wrong_column');
  await code(page, 'SELECT * FROM numune');
  await page.getByTestId('submit-sql').click();
  await expect(page).toHaveURL(/\/kurs\/numune$/, { timeout: 20_000 });
  await page.goto('/kurs/numune/numune-fesil/sql?onizle=1');
  await expect(page.getByRole('button', { name: 'İşə sal', exact: true })).toBeEnabled({
    timeout: 60_000,
  });
  await run(page);
  await expect(page.getByTestId('sql-console').locator('table')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Python worker loads pandas and renders a Matplotlib chart', async ({ page }) => {
  test.setTimeout(180_000);
  await login(page, ADMIN);
  await page.goto('/kurs/numune/numune-fesil/python?onizle=1');
  await expect(page.getByRole('button', { name: 'İşə sal', exact: true })).toBeEnabled({
    timeout: 120_000,
  });
  await code(
    page,
    'import pandas as pd\nimport matplotlib.pyplot as plt\ndf = pd.DataFrame({"value": [2, 4, 6]})\nprint("total", df["value"].sum())\ndf.plot(kind="bar")\nplt.show()',
  );
  await run(page);
  const chart = page.getByRole('img', { name: 'Qrafik 1', exact: true });
  await expect(chart).toBeVisible({ timeout: 120_000 });
  expect(await chart.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(100);
  await page.getByRole('tab', { name: /Konsol/ }).click();
  await expect(page.getByTestId('py-console')).toContainText('total 12');
});
