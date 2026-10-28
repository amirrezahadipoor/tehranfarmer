import { test, expect } from '@playwright/test';

const PROFILES = [
  { id: 'small-16x9', width: 640, height: 360 },
  { id: 'tall-20x9', width: 800, height: 360 },
  { id: 'tablet-4x3', width: 1024, height: 768 },
  { id: 'desktop', width: 1280, height: 720 },
  { id: 'portrait', width: 360, height: 740 },
] as const;

const FIXED_SAVE = {
  v: 4,
  coins: 1250,
  day: 3,
  hour: 10,
  stamina: 100,
  weather: 0,
  earned: 800,
  xp: 120,
  story: {
    chapter: 1,
    seen: { p1: true, p7: true },
    prologueSeen: true,
    postgame: false,
    pending: null,
    questDone: {},
  },
  debt: {
    noteIdx: 0,
    remaining: 12000,
    paidTotal: 3000,
    extorted: 0,
    dueDay: 29,
    paidThisCycle: 1000,
    nextRaidDay: 48,
    immuneUntilDay: 7,
    standing: 68,
    stash: 500,
    scarecrow: 0,
    beatings: 0,
    pendingVisit: null,
    chapter: 1,
    flags: {},
    history: [],
    lastVisit: null,
    chapterStartDay: 1,
  },
};

declare global {
  interface Window {
    __stepFrames?: (n: number) => void;
  }
}

test.describe('پروفایل‌های نمایشگر و رگرسیون بصری', () => {
  for (const prof of PROFILES) {
    test(`پروفایل ${prof.id} (${prof.width}x${prof.height}) بدون خطا و آفلاین رندر می‌شود`, async ({ page }) => {
      const errors: string[] = [];
      const externalUrls: string[] = [];

      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });

      await page.route('**/*', async (route) => {
        const url = route.request().url();
        if (url.startsWith('http://127.0.0.1:4173') || url.startsWith('data:') || url.startsWith('blob:')) {
          await route.continue();
        } else {
          externalUrls.push(url);
          await route.abort();
        }
      });

      await page.addInitScript((save) => {
        let seed = 133742;
        Math.random = () => {
          seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
          let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        let lastCb: FrameRequestCallback | null = null;
        let now = 1000;
        window.requestAnimationFrame = (cb: FrameRequestCallback) => {
          lastCb = cb;
          return 1;
        };
        window.__stepFrames = (n: number) => {
          for (let i = 0; i < n; i++) {
            const cb = lastCb;
            lastCb = null;
            now += 16;
            cb?.(now);
          }
        };
        localStorage.setItem('mazrae-rangi-save-v1', JSON.stringify(save));
      }, FIXED_SAVE);

      await page.setViewportSize({ width: prof.width, height: prof.height });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);

      const cont = page.getByRole('button', { name: /ادامه/ });
      await expect(cont).toBeVisible();
      await cont.click();
      await page.evaluate(() => window.__stepFrames?.(4));

      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(prof.width - 1);
      expect(box!.height).toBeGreaterThanOrEqual(prof.height - 1);

      // همهٔ دکمه‌های قابل‌مشاهده درون کادر نمایش باشند
      const buttons = page.locator('button:visible');
      const count = await buttons.count();
      expect(count).toBeGreaterThanOrEqual(8);
      for (let i = 0; i < count; i++) {
        const b = await buttons.nth(i).boundingBox();
        expect(b).not.toBeNull();
        expect(b!.x).toBeGreaterThanOrEqual(-1);
        expect(b!.y).toBeGreaterThanOrEqual(-1);
        expect(b!.x + b!.width).toBeLessThanOrEqual(prof.width + 2);
        expect(b!.y + b!.height).toBeLessThanOrEqual(prof.height + 2);
      }

      expect(externalUrls).toEqual([]);
      expect(errors).toEqual([]);

      const shot = await page.screenshot({ type: 'png' });
      expect(shot.byteLength).toBeGreaterThan(20_000);
      if (process.env.SNAP_PNG === '1') {
        await expect(page).toHaveScreenshot(`${prof.id}.png`);
      }
    });
  }
});
