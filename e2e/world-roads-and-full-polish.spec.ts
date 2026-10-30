import { expect, test, type Page } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };
const SNAP_DIR = process.env.CAPTURE_AFTER === '1' ? '/tmp/after_verify' : '';

async function snap(page: Page, name: string) {
  if (!SNAP_DIR) return;
  await page.screenshot({ path: `${SNAP_DIR}/${name}.png` });
}

/** Tap logical world coordinates (lx, ly) on the responsive 1280x720 canvas regardless of viewport aspect ratio */
async function skipIfCutscene(page: Page) {
  const skip = page.locator('button:has-text("رد کردن صحنه")');
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
    await page.waitForTimeout(80);
  }
}

async function tapWorld(page: Page, lx: number, ly: number) {
  const pt = await page.evaluate(([wx, wy]) => {
    const cv = document.querySelector('canvas')!;
    const r = cv.getBoundingClientRect();
    const cw = r.width, ch = r.height;
    const W = 1280, H = 720;
    let sc: number, tx: number, ty: number;
    if (cw / ch < 0.76) {
      sc = Math.min(ch / H, Math.max(cw / W, cw / 650));
      ty = Math.round((ch - H * sc) * 0.44);
      tx = Math.round(cw * 0.5 - 640 * sc);
    } else {
      sc = Math.min(cw / W, ch / H);
      tx = Math.round((cw - W * sc) * 0.5);
      ty = Math.round((ch - H * sc) * 0.48);
    }
    return { x: r.left + tx + wx * sc, y: r.top + ty + wy * sc };
  }, [lx, ly]);
  await page.mouse.click(pt.x, pt.y);
}

test('بازطراحی کامل جاده‌های خروجی، حذف کامل تداخل‌های بصری اواخر بازی، برداشت کششی دست‌خالی و کوئست تک‌کلیکی', async ({ browser }) => {
  test.setTimeout(60_000);
  const runtimeErrors: string[] = [];
  const ctxLate = await browser.newContext({ viewport: { width: 800, height: 360 } });
  const page = await ctxLate.newPage();
  page.on('pageerror', (err) => runtimeErrors.push(err.stack || err.message));

  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded_late')) return;
    sessionStorage.setItem('seeded_late', '1');
    const mkPlot = (i: number, crop: string, ripe: boolean) => ({
      st: 2, crop, prog: ripe ? 1 : 0.65, water: 0.9, fert: 1.2, last: null, dead: false, dry: 0, ripe, n: i % 2,
    });
    const save = {
      v: 7,
      coins: 185000,
      day: 44,
      hour: 10.5,
      stamina: 120,
      plots: Array.from({ length: 40 }, (_, i) => mkPlot(i, ['wheat', 'tomato', 'saffron', 'strawberry'][i % 4], i < 24)),
      northPlots: Array.from({ length: 54 }, (_, i) => mkPlot(i, ['rice', 'sunflower', 'wheat'][i % 3], i % 2 === 0)),
      valleyPlots: Array.from({ length: 60 }, (_, i) => mkPlot(i, ['pomegranate', 'pistachio', 'rose'][i % 3], i % 3 === 0)),
      inv: { wheat: 30, milk: 12, egg: 18, honey: 14, trout: 8, cheese: 6, feed: 45 },
      seeds: { wheat: 25, tomato: 20, saffron: 12, rice: 20 },
      fert: 18,
      can: 20,
      rod: 2,
      lv: { hoe: 3, can: 3, bag: 3, stam: 3, land: 5, soil: 2 },
      animals: [
        { id: 1, kind: 'chicken', ready: 3, hue: 0, sex: 'f', grown: 5 },
        { id: 2, kind: 'chicken', ready: 0, hue: 1, sex: 'm', grown: 5 },
        { id: 3, kind: 'duck', ready: 2, hue: 0, sex: 'f', grown: 5 },
        { id: 4, kind: 'rabbit', ready: 2, hue: 0, sex: 'f', grown: 5 },
        { id: 5, kind: 'sheep', ready: 2, hue: 0, sex: 'f', grown: 5 },
        { id: 6, kind: 'goat', ready: 2, hue: 0, sex: 'f', grown: 5 },
        { id: 7, kind: 'cow', ready: 2, hue: 0, sex: 'f', grown: 5, preg: 2 },
      ],
      trough: 28,
      workers: 4,
      dem: { cheese: 1.38, saffron: 1.31, honey: 1.24, milk: 1.05, wheat: 1.0 },
      sdem: { wheat: 1, tomato: 1, saffron: 1 },
      weather: 0,
      nextId: 20,
      earned: 420000,
      cityVisits: 12,
      machines: { sprinkler: 2, tractor: 2, seeder: 2, harvester: 2, feeder: 2, collector: 2, drone: 1 },
      auto: { water: true, till: true, plant: true, harvest: false, feed: true, collect: false },
      ponds: [
        { id: 1, stocked: true, grow: 4, feed: 3 },
        { id: 2, stocked: true, grow: 4, feed: 3 },
        { id: 3, stocked: true, grow: 2, feed: 2 },
        { id: 4, stocked: true, grow: 1, feed: 2 },
        { id: 5, stocked: false, grow: 0, feed: 0 },
      ],
      hives: 12,
      honeyAcc: 9,
      builds: [],
      pens: { chicken: 3, duck: 3, rabbit: 3, sheep: 3, goat: 3, cow: 3 },
      gh: 2,
      silo: 3,
      nests: [{ kind: 'chicken', days: 1 }, { kind: 'duck', days: 1 }],
      xp: 9800,
      stats: { harvest: 320, sell: 180, fish: 24, collect: 95 },
      ach: {},
      story: {
        chapter: 3,
        seen: {
          prologue: true, 'intro-town': true, 'intro-river': true, 'intro-apiary': true,
          'intro-north': true, 'intro-valley': true, 'estate-north-harvest': true, 'estate-valley-harvest': true,
        },
        prologueSeen: true,
        postgame: false,
        pending: null,
        questDone: {},
      },
      debt: { noteIdx: 2, remaining: 42000, dueDay: 47, raids: 0, paidTotal: 55000, scarecrow: 3 },
      quests: { day: 0, week: 0, daily: [], weekly: null, claimed: {}, base: {} },
      event: null,
      wellLv: 3,
      contract: null,
      museumVisited: false,
      secrets: {},
      decor: { tilepool: true, pergola: true, lanterns: true, barncat: true, sheepdog: true },
      morning: { day: 44, earned: 8450, gathered: 36, ripe: 24, shown: true },
    };
    localStorage.setItem('mazrae-rangi-save-v1', JSON.stringify(save));
  });

  await page.goto('/?fastboot=1');
  await page.locator('[data-testid="start-screen"] button.btn.g').click();
  await page.waitForTimeout(250);
  await skipIfCutscene(page);
  await snap(page, '01_late_farm_clean');

  // بررسی ۱: برداشت کششی پیوسته با ابزار پیش‌فرض «نگاه / دست خالی» روی کرت‌های رسیده!
  const bagBtn = page.getByRole('button', { name: 'انبار' });
  const bagBefore = await bagBtn.textContent();
  const p0 = await page.evaluate(() => {
    const cv = document.querySelector('canvas')!;
    const r = cv.getBoundingClientRect();
    const sc = Math.min(r.width / 1280, r.height / 720);
    const tx = Math.round((r.width - 1280 * sc) * 0.5);
    const ty = Math.round((r.height - 720 * sc) * 0.48);
    return {
      x0: r.left + tx + 468 * sc,
      x1: r.left + tx + 836 * sc,
      y: r.top + ty + 280 * sc,
    };
  });
  await page.mouse.move(p0.x0, p0.y);
  await page.mouse.down();
  for (let s = 1; s <= 6; s++) {
    await page.mouse.move(p0.x0 + ((p0.x1 - p0.x0) * s) / 6, p0.y);
  }
  await page.mouse.up();
  await page.waitForTimeout(1400);
  const bagAfter = await bagBtn.textContent();
  expect(bagAfter).not.toBe(bagBefore);

  // بررسی ۲: سفر فیزیکی با کلیک واقعی روی هر ۵ تابلوی جادهٔ خروجی مزرعه + جادهٔ بازگشت هر ۵ ناحیه!
  const exits: Array<{ name: string; tap: [number, number]; to: string; back: [number, number] }> = [
    { name: 'town', tap: [1216, 214], to: 'town', back: [68, 496] },
    { name: 'north', tap: [712, 128], to: 'north', back: [92, 508] },
    { name: 'valley', tap: [1212, 382], to: 'valley', back: [96, 528] },
    { name: 'river', tap: [76, 570], to: 'river', back: [1204, 468] },
    { name: 'apiary', tap: [304, 588], to: 'apiary', back: [1218, 516] },
  ];

  for (const ex of exits) {
    await tapWorld(page, ex.tap[0], ex.tap[1]);
    await expect.poll(async () => {
      await skipIfCutscene(page);
      return page.evaluate(() => {
        const active = document.querySelector('button[data-nav][disabled]');
        return active?.getAttribute('data-nav') ?? '';
      });
      // رانرهای CI کندترند و کلیک روی تابلو یک صحنهٔ کات‌سین هم باز می‌کند؛ سقف بالاتر
    }, { timeout: 20_000 }).toBe(ex.to);

    await page.waitForTimeout(360);
    await skipIfCutscene(page);
    await page.waitForTimeout(100);
    await snap(page, `02_late_${ex.name}`);

      // کارگران در پست مزارعشان می‌مانند و با سفر بازیکن به رودخانه/زنبورستان دنبال او نمی‌آیند.
    if (ex.to === 'river' || ex.to === 'apiary') {
      const ws = await page.evaluate(() => {
        const fn = (window as unknown as { __inspectEngine?: () => { workers: Array<{ post?: string; visible: boolean }> } }).__inspectEngine;
        return fn ? fn().workers : [];
      });
      expect(ws.length).toBe(4);
      for (const w of ws) {
        expect(w.visible).toBe(false);
        expect(['farm', 'north', 'valley']).toContain(w.post);
      }
    }

    // تست کلیک روی کلبهٔ سرخ عسل در زنبورستان -> باز شدن انبار و دیگ پخت!
    if (ex.to === 'apiary') {
      await tapWorld(page, 155, 300);
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 3200 });
      await page.getByRole('button', { name: 'بستن پنجره' }).click();
    }

    // بازگشت فیزیکی با کلیک روی تابلوی جادهٔ خروجی همان ناحیه
    await tapWorld(page, ex.back[0], ex.back[1]);
    await expect.poll(async () => {
      await skipIfCutscene(page);
      return page.evaluate(() => {
        const active = document.querySelector('button[data-nav][disabled]');
        return active?.getAttribute('data-nav') ?? '';
      });
    }, { timeout: 3600 }).toBe('farm');
  }

  // بررسی ۳: کلیک روی نوار هشدار سررسید بدهی در گوشهٔ بالا -> باز شدن مستقیم دفتر بدهی در ۱ کلیک!
  await page.locator('button.paper-dark').click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  await page.getByRole('button', { name: 'بستن پنجره' }).click();

  // بررسی ۴: شهر در شب برفی زمستان (تمام ۶ پنجرهٔ طبقهٔ بالا و پایین املاک روشن و تراز) + بازار داغ امروز + کوئست تک‌کلیکی
  await page.evaluate(() => {
    (window as unknown as { __gameApi: { setEnv: (p: { scene: 'town'; day: number; hour: number; weather: number }) => void } })
      .__gameApi.setEnv({ scene: 'town', day: 24, hour: 21.5, weather: 3 });
  });
  await page.waitForTimeout(200);
  await snap(page, '03_town_winter_night_fixed');

  await page.evaluate(() => {
    (window as unknown as { __gameApi: { openModal: (m: 'market') => void } }).__gameApi.openModal('market');
  });
  await expect(page.locator('[data-market-hot="1"]')).toBeVisible();
  await snap(page, '04_market_hot_banner');
  await page.getByRole('button', { name: 'بستن پنجره' }).click();

  await page.evaluate(() => {
    const api = (window as unknown as {
      __gameApi: {
        setEnv: (p: { scene: 'farm'; day: number; hour: number; weather: number }) => void;
        openModal: (m: 'quests') => void;
      };
    }).__gameApi;
    api.setEnv({ scene: 'farm', day: 12, hour: 10, weather: 0 });
    api.openModal('quests');
  });
  await snap(page, '05_quests_quick_talk');
  const quickTalkBtn = page.locator('[data-quest-talk]').first();
  await expect(quickTalkBtn).toBeVisible();
  await quickTalkBtn.click();
  await expect(page.getByRole('button', { name: 'ادامه' })).toBeVisible({ timeout: 2600 });
  await snap(page, '06_auto_npc_conversation');
  await skipIfCutscene(page);

  // بنچمارک واقعی نرخ فریم بوم دوبعدی Skia مرورگر در مزرعهٔ شلوغ اواخر بازی (۶۰ فریم واقعی — نه بوم ماک!)
  const realPerf = await page.evaluate(async () => {
    const deltas: number[] = [];
    let prev = performance.now();
    await new Promise<void>((resolve) => {
      let n = 0;
      const step = () => {
        const now = performance.now();
        if (n > 2) deltas.push(now - prev);
        prev = now;
        if (++n >= 65) resolve();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    deltas.sort((a, b) => a - b);
    return {
      medianMs: deltas[Math.floor(deltas.length * 0.5)] ?? 0,
      p95Ms: deltas[Math.floor(deltas.length * 0.95)] ?? 0,
    };
  });
  expect(realPerf.medianMs).toBeLessThan(35);
  expect(runtimeErrors).toEqual([]);
  await ctxLate.close();

  // ۵. بررسی واقعی شخم‌زدن و آبیاری روز اول در ۱۲۸۰×۷۲۰ برای بازبینی چشمی دقیق بافت شیار شخم، کادر چوبی و جایگاه زمین!
  const ctxDay1 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const dPage = await ctxDay1.newPage();
  dPage.on('pageerror', (err) => runtimeErrors.push(err.stack || err.message));
  await dPage.goto('/?fastboot=1');
  await dPage.locator('[data-testid="start-screen"] button.btn.y').click();
  await expect(dPage.locator('button:has-text("رد کردن صحنه")')).toBeVisible({ timeout: 3000 });
  await dPage.locator('button:has-text("رد کردن صحنه")').click();
  await dPage.waitForTimeout(200);
  // شخم کششی واقعی روی ۴ کرت ردیف اول و ردیف دوم + آبیاری ۲ کرت اول برای نمایش واضح هر ۳ حالت (خام / شخم خشک / شخم خیس)!
  await dPage.getByRole('button', { name: 'شخم' }).click();
  for (const [gx, gy] of [[477, 280], [563, 280], [649, 280], [735, 280], [477, 344], [563, 344], [649, 344], [735, 344]]) {
    await tapWorld(dPage, gx, gy);
  }
  await dPage.waitForTimeout(3800);
  await dPage.getByRole('button', { name: 'آب' }).click();
  for (const [gx, gy] of [[477, 280], [563, 280], [477, 344], [563, 344]]) {
    await tapWorld(dPage, gx, gy);
  }
  await dPage.waitForTimeout(2600);
  await dPage.getByRole('button', { name: 'نگاه' }).click();
  await dPage.waitForTimeout(150);
  await snap(dPage, '00_day1_plowed_field_hero');
  expect(runtimeErrors).toEqual([]);
  await ctxDay1.close();

  // ۶. بررسی نمای عمودی موبایل ۳۹۰×۸۴۴ (تمام جاده‌ها، تابلوهای فارسی، ۶ بخش دام و کادر زمین شخم کاملاً تمیز و خوانا)
  const ctxPortrait = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pPage = await ctxPortrait.newPage();
  pPage.on('pageerror', (err) => runtimeErrors.push(err.stack || err.message));
  await pPage.goto('/?fastboot=1');
  await pPage.locator('[data-testid="start-screen"] button.btn.y').click();
  await expect(pPage.locator('button:has-text("رد کردن صحنه")')).toBeVisible({ timeout: 3000 });
  await pPage.locator('button:has-text("رد کردن صحنه")').click();
  await pPage.waitForTimeout(200);
  await snap(pPage, '07_portrait_390x844_farm');
  expect(runtimeErrors).toEqual([]);
  await ctxPortrait.close();
});
