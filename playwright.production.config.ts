import { defineConfig } from '@playwright/test';

/** Real production bundle: no Vite dev API, no scene injection, no mocked gameplay. */
export default defineConfig({
  testDir: './e2e-production',
  fullyParallel: false,
  workers: 1,
  timeout: 75_000,
  expect: { timeout: 12_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4177',
    browserName: 'chromium',
    headless: true,
    locale: 'fa-IR',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    launchOptions: { args: ['--no-sandbox'] },
  },
  webServer: {
    command: 'npm run preview -- --host 0.0.0.0 --port 4177 --strictPort',
    url: 'http://127.0.0.1:4177',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
