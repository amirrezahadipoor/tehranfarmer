import { test, expect } from '@playwright/test';

const SCENES = ['farm', 'north', 'valley', 'town', 'river', 'apiary'] as const;
const SEASONS = [
  { id: 'spring', day: 2 },
  { id: 'summer', day: 9 },
  { id: 'autumn', day: 16 },
  { id: 'winter', day: 23 },
] as const;
const HOURS = [
  { id: 'day11', hour: 11 },
  { id: 'night22', hour: 22 },
] as const;

const MATRIX_SAVE = {
  v: 7,
  coins: 2400,
  day: 2,
  hour: 11,
  stamina: 100,
  weather: 0,
  earned: 1500,
  xp: 240,
  lv: { hoe: 2, can: 2, bag: 2, stam: 2, land: 4, soil: 0 },
  hives: 2,
  ponds: [{ id: 1, stocked: true, grow: 2, feed: 4 }],
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
    scarecrow: 1,
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
    __resetSeed?: () => void;
    __gameApi?: {
      openModal: (m: string | null) => void;
      setEnv: (patch: { scene?: string; day?: number; hour?: number; weather?: number; postgame?: boolean }) => void;
    };
  }
}

test('ماتریس ۳۲ اسکرین‌شات: هر ۴ صحنه در ۴ فصل و ۲ ساعت روز/شب (P8-10)', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text());
  });

  await page.addInitScript((save) => {
    let seed = 133742;
    window.__resetSeed = () => { seed = 133742; };
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
  }, MATRIX_SAVE);

  await page.setViewportSize({ width: 640, height: 360 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  const cont = page.getByRole('button', { name: /ادامه/ });
  await expect(cont).toBeVisible();
  await cont.click();
  await page.evaluate(() => window.__stepFrames?.(4));

  for (const scene of SCENES) {
    for (const sn of SEASONS) {
      let dayLum = 0;
      let nightLum = 0;
      for (const hr of HOURS) {
        const lum = await page.evaluate(({ s, d, h }) => {
          window.__resetSeed?.();
          window.__gameApi?.setEnv({ scene: s, day: d, hour: h, weather: 0 });
          window.__stepFrames?.(3);
          const cv = document.querySelector('canvas')!;
          let probe = (window as unknown as { __probe?: HTMLCanvasElement }).__probe;
          if (!probe) {
            probe = document.createElement('canvas');
            probe.width = 16;
            probe.height = 9;
            (window as unknown as { __probe?: HTMLCanvasElement }).__probe = probe;
          }
          const ctx = probe.getContext('2d', { willReadFrequently: true })!;
          ctx.drawImage(cv, 0, 0, 16, 9);
          const img = ctx.getImageData(0, 0, 16, 9).data;
          let sum = 0;
          let n = 0;
          for (let i = 0; i < img.length; i += 4) {
            sum += img[i] * 0.299 + img[i + 1] * 0.587 + img[i + 2] * 0.114;
            n++;
          }
          return sum / Math.max(1, n);
        }, { s: scene, d: sn.day, h: hr.hour });

        if (hr.id === 'day11') dayLum = lum;
        else nightLum = lum;

        const shot = await page.screenshot({ type: 'png' });
        expect(shot.byteLength).toBeGreaterThan(18_000);
        if (process.env.SNAP_PNG === '1') {
          await expect(page).toHaveScreenshot(`${scene}-${sn.id}-${hr.id}.png`);
        }
      }
      expect(dayLum, `صحنهٔ ${scene} در فصل ${sn.id} در ساعت ۱۱ باید روشن‌تر از ساعت ۲۲ باشد`).toBeGreaterThan(nightLum);
    }
  }

  expect(errors).toEqual([]);
});
