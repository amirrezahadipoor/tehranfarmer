import { test, expect } from '@playwright/test';

const AUDIT_PROFILES = [
  { id: 'small-16x9', width: 640, height: 360 },
  { id: 'tall-20x9', width: 800, height: 360 },
  { id: 'mobile-wide', width: 850, height: 393 },
  { id: 'desktop', width: 1280, height: 720 },
  { id: 'full-hd', width: 1920, height: 1080 },
] as const;

const MODAL_IDS = [
  'seed', 'market', 'work', 'carp', 'estate', 'animal', 'inv', 'menu',
  'auto', 'pond', 'hive', 'achieve', 'ledger', 'quests', 'museum', 'home', 'almanac',
] as const;

declare global {
  interface Window {
    __gameApi?: {
      openModal: (m: string | null) => void;
      setEnv: (patch: { scene?: string; day?: number; hour?: number; weather?: number; postgame?: boolean }) => void;
    };
  }
}

test.describe('ممیزی بصری و هندسی همهٔ ۱۷ مودال در ۵ پروفایل (P8-08)', () => {
  for (const prof of AUDIT_PROFILES) {
    test(`همهٔ ۱۷ مودال در ${prof.id} (${prof.width}x${prof.height}) بدون سرریز، با ارقام فارسی و دکمهٔ بستن معتبر رندر می‌شوند`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text());
      });

      await page.setViewportSize({ width: prof.width, height: prof.height });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);

      const startBtn = page.locator('button').first();
      await expect(startBtn).toBeVisible();
      await startBtn.click();

      // بستن دیالوگ آغازین اگر باز شد تا صحنه آمادهٔ ممیزی مودال‌ها شود
      await page.evaluate(() => {
        window.__gameApi?.setEnv({ postgame: true });
      });

      for (const modalId of MODAL_IDS) {
        await page.evaluate((m) => window.__gameApi?.openModal(m), modalId);
        const minAnimatedButtonHeight = await page.evaluate(() => new Promise<number>((resolve) => {
          let frame = 0;
          let minHeight = Infinity;
          const sample = () => {
            for (const button of document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')) {
              const rect = button.getBoundingClientRect();
              const style = getComputedStyle(button);
              if (rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none') {
                minHeight = Math.min(minHeight, rect.height);
              }
            }
            frame++;
            if (frame < 12) requestAnimationFrame(sample);
            else resolve(minHeight);
          };
          requestAnimationFrame(sample);
        }));
        expect(minAnimatedButtonHeight, `هدف لمسی مودال ${modalId} حین انیمیشن popin`).toBeGreaterThanOrEqual(48);
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog, `مودال ${modalId} باز نشد`).toBeVisible();

        const box = await dialog.boundingBox();
        expect(box, `کادر مودال ${modalId} نامعتبر است`).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(-1);
        expect(box!.y).toBeGreaterThanOrEqual(-1);
        expect(box!.x + box!.width).toBeLessThanOrEqual(prof.width + 2);
        expect(box!.y + box!.height).toBeLessThanOrEqual(prof.height + 2);

        const horizOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(horizOverflow, `سرریز افقی در مودال ${modalId}`).toBeLessThanOrEqual(1);

        // بررسی عدم وجود ارقام انگلیسی خام یا رشتهٔ خراب در متن قابل‌مشاهدهٔ مودال
        const text = await dialog.innerText();
        expect(text, `مودال ${modalId} دارای رشتهٔ معیوب است: ${text}`).not.toContain('[object Object]');
        expect(text, `مودال ${modalId} دارای NaN/undefined است: ${text}`).not.toMatch(/\b(NaN|undefined)\b/);
        expect(text, `مودال ${modalId} دارای رقم لاتین خام است: ${text}`).not.toMatch(/[0-9]/);

        // دکمهٔ بستن مودال قابل کلیک و درون کادر باشد
        const closeBtn = dialog.locator('button').first();
        await expect(closeBtn).toBeVisible();
        const cb = await closeBtn.boundingBox();
        expect(cb).not.toBeNull();
        expect(cb!.x + cb!.width).toBeLessThanOrEqual(prof.width + 2);
      }

      await page.evaluate(() => window.__gameApi?.openModal(null));
      expect(errors).toEqual([]);
    });
  }
});
