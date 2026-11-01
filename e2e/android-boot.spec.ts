import { expect, test, type Page } from '@playwright/test';

/**
 * Regression net for the Android field report:
 *
 *  1. "touch does nothing while it is loading" — the farm backdrop used to be painted as one synchronous
 *     block, which on the CI emulator measured 5.0s (and 9.9s once) of blocked main thread; a renderer that
 *     is busy never gets the trusted tap at all.
 *  2. "the animation after loading runs too fast" — the overlay's 180ms fade was ended by a setTimeout that
 *     fired in the same frame the fade started. Measured here: 1 sampled fade frame before the fix, 8 after.
 *  3. the touch bridge's recovery click, which landed at (0,0) and swallowed other clicks for 150ms.
 *
 * All tests run with `?boot=1`, which turns off the webdriver fast path, and 6x CPU throttling, which is
 * how a mid-range phone behaves.
 */

type BootWindow = {
  longTasks: number[];
  fadeFrames: number;
  minPct: number;
  maxPct: number;
  pctDrops: number;
};

/** Samples the boot on every frame the renderer gives us; runs before any app code so nothing is missed. */
async function watchBoot(page: Page) {
  await page.addInitScript(() => {
    const win: BootWindow = { longTasks: [], fadeFrames: 0, minPct: 100, maxPct: 0, pctDrops: 0 };
    Object.defineProperty(window, '__bootWindow', { configurable: true, value: win });
    let startSeenAt = 0;
    let idleFrames = 0;
    const observer = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        // Only the boot window counts; the game's own gameplay spikes are a different story.
        if (!startSeenAt || e.startTime < startSeenAt) win.longTasks.push(Math.round(e.duration));
      }
    });
    observer.observe({ entryTypes: ['longtask'] });
    let lastPct = -1;
    const tick = () => {
      const loader = document.querySelector<HTMLElement>('[data-testid="boot-loader"]');
      const start = document.querySelector('[data-testid="start-screen"]');
      if (start && !startSeenAt) startSeenAt = performance.now();
      if (loader) {
        idleFrames = 0;
        const opacity = Number(getComputedStyle(loader).opacity);
        if (start && opacity > 0.02 && opacity < 0.98) win.fadeFrames += 1;
        const raw = loader.querySelector('[data-testid="boot-progress-pct"]')?.textContent ?? '';
        const pct = Number(raw.replace(/[^0-9۰-۹]/g, '').replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))));
        if (Number.isFinite(pct) && raw) {
          if (pct < win.minPct) win.minPct = pct;
          if (pct > win.maxPct) win.maxPct = pct;
          if (lastPct >= 0 && pct < lastPct) win.pctDrops += 1;
          lastPct = pct;
        }
      } else if (startSeenAt && ++idleFrames > 30) {
        observer.disconnect();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

async function boot(page: Page, rate = 6) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await page.goto('/?boot=1');
  await expect(page.locator('[data-testid="start-screen"]')).toBeVisible({ timeout: 25_000 });
  // The fade-out happens after Start mounts, so the metrics are only complete once the overlay is gone.
  await expect(page.locator('[data-testid="boot-loader"]')).toHaveCount(0, { timeout: 25_000 });
  return cdp;
}

test('the loading screen never parks the main thread long enough to drop a tap', async ({ page }) => {
  await watchBoot(page);
  await boot(page);
  const win = await page.evaluate(() => (window as unknown as { __bootWindow: BootWindow }).__bootWindow);
  // The scene prewarm is chunked with a 12ms budget, so nothing it does may come close to this. On the
  // emulator the un-chunked version measured 5025ms; a single block past three quarters of a second at 6x
  // throttle is a device that stops answering input, which is the bug being guarded.
  expect(Math.max(0, ...win.longTasks)).toBeLessThanOrEqual(750);
  expect(win.pctDrops).toBe(0);
});

test('the loading overlay fades out over several frames instead of snapping', async ({ page }) => {
  await watchBoot(page);
  await boot(page);
  const win = await page.evaluate(() => (window as unknown as { __bootWindow: BootWindow }).__bootWindow);
  // One sample means the whole transition was delivered in a single frame - what the user saw as the
  // loading screen "playing too fast". The unmount now waits for transitionend, so the fade is spread out.
  expect(win.fadeFrames).toBeGreaterThanOrEqual(2);
});

test('the recovered click for a dropped tap uses the finger position and fires exactly once', async ({ page }) => {
  await boot(page, 1);
  await page.evaluate(() => {
    const seen: { trusted: boolean; x: number; y: number }[] = [];
    Object.defineProperty(window, '__clicks', { configurable: true, value: seen });
    // Swallow the browser's own click on the way in, so the bridge has to use its recovery path — that is
    // what a slow WebView forces on its own (12-163ms between pointerup and the native click, measured).
    window.addEventListener('click', (e) => { if (e.isTrusted) e.stopPropagation(); }, true);
    document.getElementById('root')!.addEventListener('click', (e) => {
      seen.push({ trusted: e.isTrusted, x: e.clientX, y: e.clientY });
    }, true);
  });
  await page.getByRole('button', { name: 'شروع', exact: true }).tap();
  await expect(page.locator('[data-testid="start-screen"]')).toHaveCount(0);
  const clicks = await page.evaluate(() => (window as unknown as { __clicks: { x: number; y: number }[] }).__clicks);
  expect(clicks).toHaveLength(1);
  expect(clicks[0].trusted).toBe(false);
  // rec.el.click() used to deliver (0,0); anything downstream that maps a click back to a world position
  // then worked on the top-left corner of the viewport instead of the finger.
  expect(clicks[0].x).toBeGreaterThan(0);
  expect(clicks[0].y).toBeGreaterThan(0);
});

test('two quick taps in a row both activate their control', async ({ page }) => {
  await boot(page, 1);
  // The language toggle survives the tap and flips a visible string, so one flip per tap can be counted:
  // no swallowed second tap (the old guard ate any click within 32px for 150ms) and no doubled first one.
  await page.evaluate(() => {
    window.addEventListener('click', (e) => { if (e.isTrusted) e.stopPropagation(); }, true);
  });
  const lang = page.locator('[data-lang-toggle="1"]');
  const first = (await lang.textContent())?.trim();
  await lang.tap();
  const second = (await lang.textContent())?.trim();
  await lang.tap();
  const third = (await lang.textContent())?.trim();
  expect(first).toBeTruthy();
  expect(second).toBeTruthy();
  expect(second).not.toBe(first);
  expect(third).toBe(first);
});
