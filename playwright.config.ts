import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // اجرای محلی تک‌worker: رندر نرم‌افزاری Chromium زیر صحنه‌های سنگین canvas/axe قابل‌اتکا می‌ماند؛ CI دو worker دارد.
  workers: process.env.CI ? 2 : 1,
  // زیر CI یک تلاش مجدد برای پوشش لرزش‌های رانر کند (کد واقعی بازی همین است؛ فقط اجرای تصادفی مرورگر تکرار می‌شود)
  retries: process.env.CI ? 1 : 0,
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  timeout: 60_000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.03,
      animations: 'disabled',
    },
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    locale: 'fa-IR',
    // هیچ کلیک/تعاملی نباید برای همیشه منتظر بماند: سقف۳۰ ثانیه، تا اگر عنصری ظاهر نشد
    // خطا دقیقاً همان عنصر را نشان دهد (تست جریان کامل بازی در CI بی‌صدا گیر می‌کرد).
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  webServer: {
    // بیلد مخصوص E2E: ابزارهای توسعه روشن‌اند تا اسپک‌های کارگردان صحنه کار کنند
    command: 'npm run --silent build:e2e && npx vite preview --port 4173 --host 127.0.0.1 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
