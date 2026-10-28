import { test, expect } from '@playwright/test';

test('نصب Service Worker و بارگذاری کامل PWA در حالت قطع کامل شبکه (P9-04)', async ({ context, page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.setViewportSize({ width: 640, height: 360 });
  await page.goto('/');

  // بررسی مانیفست PWA و ثبت Service Worker
  const swReady = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return !!reg.active;
  });
  expect(swReady).toBe(true);

  const manifestRes = await page.request.get('/manifest.webmanifest');
  expect(manifestRes.ok()).toBe(true);
  const manifest = await manifestRes.json();
  expect(manifest.display).toBe('fullscreen');
  expect(manifest.orientation).toBe('landscape');
  expect(manifest.dir).toBe('rtl');

  // قطع کامل شبکه در سطح مرورگر و بارگذاری مجدد کامل صفحه از کش Service Worker
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);

  const startBtn = page.locator('button').first();
  await expect(startBtn).toBeVisible();
  await startBtn.click();

  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible();

  await context.setOffline(false);
  expect(errors).toEqual([]);
});
