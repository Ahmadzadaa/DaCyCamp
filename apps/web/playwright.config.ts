import { defineConfig, devices } from '@playwright/test';

const base = process.env.E2E_BASE_URL ?? `http://localhost:${process.env.WEB_PORT ?? 3000}`;
// Hazır Chromium varsa (məs. CI/konteyner): PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium; yoxdursa `pnpm exec playwright install chromium`
const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {};

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: base, locale: 'az-AZ', ...devices['Desktop Chrome'], viewport: { width: 1240, height: 900 }, launchOptions },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1240, height: 900 } } }],
});
