import { expect, test, type Page } from '@playwright/test';

async function dismissCutscenes(page: Page) {
  for (let i = 0; i < 16; i++) {
    const root = page.locator('[data-tap="cutscene"]');
    if (!await root.isVisible().catch(() => false)) return;
    const skip = page.locator('[data-cutscene-skip="1"]');
    if (await skip.isVisible().catch(() => false)) {
      await skip.tap();
      await page.waitForTimeout(180);
      continue;
    }
    const next = page.locator('[data-cutscene-next="1"]');
    if (await next.isVisible().catch(() => false) && await next.isEnabled()) {
      await next.tap();
      await page.waitForTimeout(120);
    } else await page.waitForTimeout(120);
  }
  throw new Error('A production cutscene did not finish');
}

async function waitForFirstInstall(page: Page) {
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.active) throw new Error('Service worker did not activate');
    const names = await caches.keys();
    if (!names.includes('mazrae-rangi-offline-v19')) throw new Error('Current offline cache is missing');
  });
}

test('production first online load can reload offline without a warm second load', async ({ page, context }) => {
  const failures: string[] = [];
  page.on('requestfailed', request => failures.push(request.url()));
  await page.goto('/', { waitUntil: 'networkidle' });
  await waitForFirstInstall(page);

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'شروع', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
  expect(failures.filter(url => /\/assets\/.*\.(?:js|css)$/.test(url))).toEqual([]);
});

test('production first-load save continues after an offline reload', async ({ page, context }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await waitForFirstInstall(page);
  await page.getByRole('button', { name: 'شروع', exact: true }).tap();
  await dismissCutscenes(page);
  await expect(page.locator('canvas')).toBeVisible();
  const portraitGate = page.locator('[data-portrait-continue="1"]');
  if (await portraitGate.isVisible().catch(() => false)) await portraitGate.tap();
  const tutorialSkip = page.getByRole('button', { name: 'رد کردن آموزش', exact: true });
  if (await tutorialSkip.isVisible().catch(() => false)) await tutorialSkip.tap();
  await expect(page.locator('canvas')).toBeVisible();

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'ادامه', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'ادامه', exact: true }).tap();
  await expect(page.locator('canvas')).toBeVisible();
});
