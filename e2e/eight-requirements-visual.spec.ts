import fs from 'node:fs';
import { expect, test } from '@playwright/test';

const AUDIT_DIR = '/tmp/visual-audit';

test('ممیزی بصری زندهٔ هر ۸ خواستهٔ کاربر + ثبت تصاویر باکیفیت برای بازبینی چشمی مستقیم', async ({ page }) => {
  test.setTimeout(90_000);
  fs.mkdirSync(AUDIT_DIR, { recursive: true });

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  // ۱. شروع بازی و ثبت تصویر زندهٔ مکالمهٔ کنار خانهٔ مزرعه (بدون تداخل پنجره، صفر آیکون روی صورت، پلاک نام+شغل بالای سر!)
  await page.locator('button').first().click();
  await expect(page.locator('[data-scene-id="p1"]')).toBeVisible();
  await expect(page.locator('button:has-text("تند")')).toHaveCount(0);
  await page.waitForTimeout(650);
  await page.screenshot({ path: `${AUDIT_DIR}/01-farm-dialogue-grandma.png` });

  // رد کردن صحنه و ثبت مزرعهٔ اصلی با تمام ۴۰ کرت باز، جاده‌های جدید، ۶ دکمهٔ سفر و صفر دکمهٔ تندکردن سرعت
  await page.locator('button:has-text("رد کردن صحنه")').click();
  await expect(page.locator('[data-scene-id]')).toHaveCount(0);
  await page.waitForTimeout(260);
  await expect(page.locator('button:has-text("۲×")')).toHaveCount(0);
  await expect(page.locator('button:has-text("2×")')).toHaveCount(0);
  await page.screenshot({ path: `${AUDIT_DIR}/02-main-farm-40-plots-roads-1x.png` });

  // ۲. ورود به شهر و ثبت پلاک‌های «نام + شغل» و علامت تعجب زرد دقیقاً بالای نام شخصیت‌های دارای کوئست قابل‌فعالسازی
  await page.getByRole('button', { name: 'سفر به شهر' }).click();
  await page.waitForTimeout(1300);
  if (await page.locator('button:has-text("رد کردن صحنه")').count()) {
    await page.locator('button:has-text("رد کردن صحنه")').click();
  }
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${AUDIT_DIR}/03-town-npcs-yellow-quest-marks.png` });

  // ۳. آزادسازی مزارع بزرگ «دشت شمالی» (۵۴ کرت) و «باغ‌درهٔ آفتاب» (۶۰ کرت) + کارگران و ثبت تصویر هر دو مزرعه
  await page.evaluate(() => {
    (window as unknown as { __gameApi: { setEnv: (p: { land: number; scene: string }) => void } }).__gameApi.setEnv({
      land: 4,
      scene: 'north',
    });
  });
  await page.waitForTimeout(420);
  await page.screenshot({ path: `${AUDIT_DIR}/04-northern-meadow-54-plots.png` });

  await page.evaluate(() => {
    (window as unknown as { __gameApi: { setEnv: (p: { land: number; scene: string }) => void } }).__gameApi.setEnv({
      land: 4,
      scene: 'valley',
    });
  });
  await page.waitForTimeout(420);
  await page.screenshot({ path: `${AUDIT_DIR}/05-sunlit-valley-60-plots.png` });

  // ۴. نمای عمودی موبایل واقعی (390×844) برای بازبینی چشمی خوانایی و عدم هم‌پوشانی همهٔ دکمه‌ها
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    (window as unknown as { __gameApi: { setEnv: (p: { scene: string }) => void } }).__gameApi.setEnv({
      scene: 'farm',
    });
  });
  await page.waitForTimeout(320);
  await page.screenshot({ path: `${AUDIT_DIR}/06-mobile-portrait-390x844.png` });
});
