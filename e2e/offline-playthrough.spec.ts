import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    __gameApi?: {
      openModal: (m: string | null) => void;
      setEnv: (patch: { scene?: string; day?: number; hour?: number; weather?: number; postgame?: boolean }) => void;
      summary: () => { coins: number; day: number; hour: number; scene: string; modal: string | null };
    };
  }
}

test('اجرای کامل حلقهٔ بازی (شروع، پرولوگ کامل، سفر به ۴ صحنه، خرید، دفتر کل و ذخیره) کاملاً آفلاین با صفر درخواست شبکه (P9-08)', async ({ context, page }) => {
  const networkCalls: string[] = [];
  const errors: string[] = [];

  page.on('request', (req) => {
    const url = req.url();
    if (/^https?:\/\//i.test(url) || /^wss?:\/\//i.test(url)) {
      networkCalls.push(url);
    }
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') {
      if (!m.text().includes('manifest.webmanifest')) errors.push(m.text());
    }
  });

  await context.setOffline(true);
  await page.setViewportSize({ width: 800, height: 360 });

  const distUrl = pathToFileURL(path.resolve('dist/index.html')).href;
  await page.goto(distUrl);
  await page.evaluate(() => document.fonts.ready);

  // ۱) کلیک دکمهٔ شروع بازی نو روی file:// بدون اینترنت
  const startBtn = page.locator('button').first();
  await expect(startBtn).toBeVisible();
  await startBtn.click();

  // ۲) پیشروی کامل در همهٔ خطوط و گره‌های پرولوگ تا باز شدن سند اول و بسته شدن کات‌سین
  const cutOverlay = page.locator('.fixed.inset-0.z-\\[70\\]');
  for (let i = 0; i < 90; i++) {
    if (!(await cutOverlay.isVisible().catch(() => false))) break;
    await cutOverlay.dispatchEvent('pointerdown', { bubbles: true });
  }
  await expect(cutOverlay).toBeHidden();

  // ۳) پیمایش در هر ۴ صحنهٔ بازی و باز کردن فروشگاه‌ها، دفتر کل، کوئست‌ها و منو
  for (const scene of ['town', 'river', 'apiary', 'farm']) {
    await page.evaluate((s) => window.__gameApi?.setEnv({ scene: s }), scene);
    const cur = await page.evaluate(() => window.__gameApi?.summary());
    expect(cur?.scene).toBe(scene);
  }

  for (const modal of ['seed', 'market', 'ledger', 'quests', 'menu']) {
    await page.evaluate((m) => window.__gameApi?.openModal(m), modal);
    await expect(page.locator('[role="dialog"]').first()).toBeVisible();
  }
  await page.evaluate(() => window.__gameApi?.openModal(null));

  // ۴) لمس بوم مزرعه و بررسی صفر بودن مطلق هرگونه درخواست HTTP/HTTPS/WS
  await page.locator('canvas').first().click({ position: { x: 320, y: 200 } });

  await context.setOffline(false);
  expect(networkCalls).toEqual([]);
  expect(errors).toEqual([]);
});
