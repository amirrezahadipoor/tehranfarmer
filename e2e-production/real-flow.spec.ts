import { expect, test, type Page } from '@playwright/test';

const SAVE_KEY = 'mazrae-rangi-save-v1';

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
    } else {
      await page.waitForTimeout(120);
    }
  }
  throw new Error('A production cutscene did not finish');
}

async function beginFromStart(page: Page) {
  await page.getByRole('button', { name: 'شروع', exact: true }).tap();
  await dismissCutscenes(page);
  await expect(page.locator('canvas')).toBeVisible();
  const portraitGate = page.locator('[data-portrait-continue="1"]');
  if (await portraitGate.isVisible().catch(() => false)) await portraitGate.tap();
  const tutorialSkip = page.getByRole('button', { name: 'رد کردن آموزش', exact: true });
  if (await tutorialSkip.isVisible().catch(() => false)) await tutorialSkip.tap();
  await expect(page.locator('canvas')).toBeVisible();
}

async function startFresh(page: Page) {
  await page.goto('/', { waitUntil: 'networkidle' });
  await beginFromStart(page);
}

async function travel(page: Page, destination: string) {
  await page.locator('[data-mobile-atlas="1"]').tap();
  await page.locator(`[data-atlas-go="${destination}"]`).tap();
  await page.waitForTimeout(1050);
  await dismissCutscenes(page);
  await expect(page.locator('canvas')).toBeVisible();
}

async function activateSceneTarget(page: Page, id: string) {
  await page.locator('[data-scene-a11y-toggle="1"]').focus();
  const target = page.locator(`[data-a11y-target="${id}"]`);
  await expect(target).toHaveCount(1);
  await target.press('Enter');
}

async function readSave(page: Page): Promise<{ day: number; scene: string; coins: number; stamina: number; v: number; stats?: Record<string, number> }> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error('Expected a production save');
    return JSON.parse(raw) as { day: number; scene: string; coins: number; stamina: number; v: number; stats?: Record<string, number> };
  }, SAVE_KEY);
}

async function closeFishingResult(page: Page) {
  await expect(page.locator('[data-fish-result-close="1"]')).toBeVisible();
  await page.locator('[data-fish-result-close="1"]').tap();
  await expect(page.locator('[data-fishing-minigame="1"]')).toHaveCount(0);
}

test('production real journey: start, tutorial skip, fishing, market sale and sleep', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await startFresh(page);
  // No-rod Quick Cast is intentionally probabilistic. Repeat the real action
  // and inspect the real market instead of assuming that the first cast lands.
  let sold = false;
  for (let attempt = 0; attempt < 8 && !sold; attempt++) {
    await travel(page, 'river');
    await expect(page.locator('canvas')).toHaveAttribute('aria-label', /رودخانه/);
    await page.locator('[data-open-fishing]').tap();
    await expect(page.locator('[data-fishing-minigame="1"]')).toBeVisible();
    await page.locator('[data-fish-quick="1"]').tap();
    await closeFishingResult(page);

    await travel(page, 'town');
    await activateSceneTarget(page, 'shop:market');
    const dialogue = page.locator('[data-shop-dialogue="1"]');
    const buy = page.locator('[data-shop-buy="market"]');
    await expect(buy).toBeVisible();
    if (await dialogue.isVisible().catch(() => false)) await dismissCutscenes(page);
    await expect(buy).toBeVisible();
    await buy.tap();
    const sellAll = page.locator('[data-market-sell-all="1"]');
    await expect(sellAll).toBeVisible();
    if (await sellAll.isEnabled()) {
      await sellAll.tap();
      await expect(sellAll).toBeDisabled();
      sold = true;
    }
    await page.getByRole('button', { name: 'بستن پنجره', exact: true }).tap();
    await page.locator('[data-shop-exit="1"]').tap();
  }
  expect(sold).toBe(true);

  await travel(page, 'farm');
  await activateSceneTarget(page, 'home');
  await page.locator('[data-home-sleep="1"]').tap();
  const confirm = page.getByRole('button', { name: 'تأیید', exact: true });
  if (await confirm.isVisible().catch(() => false)) await confirm.tap();
  await expect(page.locator('body')).toContainText('روز ۲');
  const saved = await readSave(page);
  expect(saved.day).toBe(2);
  expect(saved.scene).toBe('farm');
  expect(saved.coins).toBeGreaterThan(700);
  expect(saved.v).toBe(11);
  expect(errors).toEqual([]);
});

test('production skilled fishing uses one species for the result and persistent fish log', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await startFresh(page);
  await travel(page, 'river');
  await page.locator('[data-open-fishing]').tap();
  await expect(page.locator('[data-fishing-minigame="1"]')).toBeVisible();
  await expect(page.locator('[data-fishing-minigame="1"]')).toHaveAttribute('data-fish-behavior', 'sine');
  await expect(page.locator('[data-fishing-minigame="1"]')).toHaveAttribute('data-fish-practice', '1');

  const hold = await page.locator('[data-fish-hold="1"]').boundingBox();
  expect(hold).not.toBeNull();
  const x = hold!.x + hold!.width / 2;
  const y = hold!.y + hold!.height / 2;
  const cdp = await page.context().newCDPSession(page);
  let holding = false;
  const start = async () => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    holding = true;
  };
  const stop = async () => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 8, y: 8 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    holding = false;
  };
  await start();
  for (let i = 0; i < 280; i++) {
    const state = await page.evaluate(() => {
      const root = document.querySelector('[data-fishing-minigame="1"]');
      if (!root) return { gone: true, phase: 'gone', fish: 0, bar: 0, height: 0 };
      const water = document.querySelector('[data-fish-water="1"]');
      const fish = water?.querySelector('.rounded-full') as HTMLElement | null;
      const bar = [...(water?.children ?? [])].find((element) => (element as HTMLElement).style.height) as HTMLElement | undefined;
      return {
        gone: false,
        phase: root.getAttribute('data-fish-phase') ?? '',
        fish: Number.parseFloat(fish?.style.top ?? '0'),
        bar: Number.parseFloat(bar?.style.top ?? '0'),
        height: Number.parseFloat(bar?.style.height ?? '0'),
      };
    });
    if (state.gone || state.phase === 'result') break;
    const shouldHold = state.bar + state.height / 2 > state.fish + 0.8;
    if (shouldHold && !holding) await start();
    else if (!shouldHold && holding) await stop();
    await page.waitForTimeout(45);
  }
  if (holding) await stop();

  const result = page.locator('[data-fish-result-species]');
  await expect(result).toBeVisible({ timeout: 8_000 });
  const speciesId = await result.getAttribute('data-fish-result-species');
  const names: Record<string, string> = {
    'silver-dart': 'کولی نقره‌ای بهاره',
    'mirror-carp': 'کپور آینه‌ای رودخانه',
    'mountain-trout': 'قزل‌آلای خال‌قرمز کوهستان',
    'white-kutum': 'ماهی سفید صدفی',
    'golden-zander': 'سوف طلایی شب‌گرد',
    'emerald-pike': 'اردک‌ماهی نیزار',
    'beluga-sturgeon': 'تاس‌ماهی خاویاری',
    'storm-kingfish': 'شاه‌ماهی طوفان بارانی',
  };
  expect(speciesId).not.toBeNull();
  expect(names[speciesId!]).toBeDefined();
  await expect(result).toContainText(names[speciesId!]);
  await expect(result).toContainText('+');

  // A real reload fires pagehide, which persists the just-caught species.
  await page.reload({ waitUntil: 'networkidle' });
  const loggedKg = await page.evaluate(({ key, id }) => {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const save = JSON.parse(raw) as { fishLog?: Record<string, number> };
    return save.fishLog?.[id] ?? 0;
  }, { key: SAVE_KEY, id: speciesId! });
  expect(loggedKg).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('production first fishing is guided and keeps its result until a tap', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await startFresh(page);
  await travel(page, 'river');
  const before = await readSave(page);

  await page.locator('[data-open-fishing="1"]').tap();
  const game = page.locator('[data-fishing-minigame="1"]');
  await expect(game).toBeVisible();
  await expect(game).toHaveAttribute('data-fish-practice', '1');
  await expect(page.locator('[data-fish-hint="1"]')).toContainText('ماهی را داخل کادر سبز نگه دار');
  await page.locator('[data-fish-hold="1"]').tap();
  const result = page.locator('[data-fish-result="1"]');
  await expect(result).toBeVisible({ timeout: 15_000 });
  const resultText = await result.textContent() ?? '';
  const firstFailure = resultText.includes('اولین تلاش ناموفق نیرو مصرف نکرد');
  if (!firstFailure) expect(resultText).toContain('+');
  const hudBottom = await page.locator('[data-hud-topbar="1"]').evaluate((el) => el.getBoundingClientRect().bottom);
  const toastTop = await page.locator('.toast').first().evaluate((el) => el.getBoundingClientRect().top);
  expect(toastTop).toBeGreaterThanOrEqual(hudBottom);
  await page.waitForTimeout(2_700);
  await expect(result).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const after = await readSave(page);
  if (firstFailure) expect(after.stamina).toBeGreaterThanOrEqual(before.stamina);
  else expect(after.stamina).toBeLessThan(before.stamina);
  expect(after.stamina).toBeLessThan(before.stamina + 2);
  expect(after.stats?.fishCasts).toBe(1);

  await closeFishingResult(page);
  expect(errors).toEqual([]);
});

test('production semantic controls activate all four walking town NPCs', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await startFresh(page);
  await travel(page, 'town');

  for (const who of ['grandma', 'sara', 'engineer', 'rancher']) {
    await activateSceneTarget(page, `npc:${who}`);
    const scene = page.locator('[data-tap="cutscene"]');
    await expect(scene).toBeVisible();
    await expect(scene).toHaveAttribute('data-beat-node', new RegExp(`^(town-${who}-|npc-q-${who}-)`));
    await dismissCutscenes(page);
    await expect(page.locator('canvas')).toHaveAttribute('aria-label', /شهر/);
  }
  expect(errors).toEqual([]);
});

test('production locale metadata and Continue restore the saved scene without a transient modal', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/', { waitUntil: 'networkidle' });
  const html = page.locator('html');
  await expect(html).toHaveAttribute('lang', 'fa');
  await expect(html).toHaveAttribute('dir', 'rtl');
  await expect(page).toHaveTitle(/مزرعه رنگی/);

  await page.locator('[data-lang-toggle="1"]').tap();
  await expect(html).toHaveAttribute('lang', 'en');
  await expect(html).toHaveAttribute('dir', 'ltr');
  await expect(page).toHaveTitle(/Colorful Farm/);
  await page.locator('[data-lang-toggle="1"]').tap();
  await expect(html).toHaveAttribute('lang', 'fa');
  await expect(html).toHaveAttribute('dir', 'rtl');

  await beginFromStart(page);
  await travel(page, 'cave');
  await expect(page.locator('canvas')).toHaveAttribute('aria-label', /غار بلورین/);
  expect((await readSave(page)).scene).toBe('cave');
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'ادامه', exact: true }).tap();
  await expect(page.locator('canvas')).toHaveAttribute('aria-label', /غار بلورین/);
  await expect(page.locator('[data-fishing-minigame="1"]')).toHaveCount(0);
  await expect(page.locator('[data-tap="cutscene"]')).toHaveCount(0);
  expect((await readSave(page)).scene).toBe('cave');
  expect(errors).toEqual([]);
});

test('production audio toggle pauses and resumes the actual media element immediately', async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as unknown as { __productionMedia: HTMLMediaElement[] };
    target.__productionMedia = [];
    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (!target.__productionMedia.includes(this)) target.__productionMedia.push(this);
      return originalPlay.call(this);
    };
  });
  const mediaState = async () => page.evaluate(() => {
    const target = window as unknown as { __productionMedia?: HTMLMediaElement[] };
    return (target.__productionMedia ?? []).map((media) => media.paused);
  });

  await startFresh(page);
  await expect.poll(async () => (await mediaState()).some((paused) => !paused), { timeout: 10_000 }).toBe(true);
  await page.locator('[data-open-settings="1"]').tap();
  const musicToggle = page.getByRole('button', { name: /موسیقی محیطی/ });
  await musicToggle.tap();
  await expect.poll(async () => (await mediaState()).length > 0 && (await mediaState()).every(Boolean)).toBe(true);
  await musicToggle.tap();
  await expect.poll(async () => (await mediaState()).some((paused) => !paused)).toBe(true);
});

test('production service worker serves a cold offline reload and startup does not prefetch music', async ({ page, context }) => {
  const musicRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/music/') && request.url().endsWith('.mp3')) musicRequests.push(request.url());
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });
  // The first load installs the worker; this reload makes the page controlled.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: 'شروع', exact: true })).toBeVisible();
  expect(musicRequests).toEqual([]);

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'شروع', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
  expect(musicRequests).toEqual([]);
});
