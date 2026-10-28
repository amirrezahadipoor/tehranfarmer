import { expect, test } from '@playwright/test';

test.describe('Mobile Touch Recovery, Live Carpenter 2-Leg Stride & Zero-Drain Background Battery Audit', () => {
  test('recovers micro-jitter mobile touch taps reliably, animates carpenter two-leg stride while UI.info is open, and renders 0 background frames', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 360 });
    await page.goto('/?fresh=1');

    const startBtn = page.locator('button').first();
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    await page.waitForFunction(() => Boolean((window as unknown as { __inspectEngine?: () => unknown }).__inspectEngine));
    await page.evaluate(() => {
      (window as unknown as {
        __gameApi?: { setEnv: (p: Record<string, unknown>) => void; openModal: (m: string | null) => void };
      }).__gameApi?.setEnv({ postgame: true, coins: 15000, scene: 'farm' });
    });

    // 1. Trigger a real upgrade inside the Workshop modal so the Carpenter spawns on the farm!
    await page.evaluate(() => {
      (window as unknown as { __gameApi?: { openModal: (m: string | null) => void } }).__gameApi?.openModal('work');
    });
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();
    await dialog.locator('button:not([disabled])').nth(1).click();
    await page.evaluate(() => {
      const api = (window as unknown as {
        __gameApi?: { openModal: (m: string | null) => void; setEnv: (p: Record<string, unknown>) => void };
      }).__gameApi;
      api?.openModal(null);
      // Open Plot Info Card simultaneously to prove world & carpenter NEVER freeze when UI.info !== null!
      api?.setEnv({ infoIdx: 0 });
    });

    // Sample live 60fps frames for Carpenter two-leg articulation + real movement across farm
    const carpenterStride = await page.evaluate(async () => {
      type Snap = {
        builder: { phase: string; x: number; legF: number; legB: number };
        pausedInBackground: boolean;
        framesRendered: number;
      };
      const inspect = (window as unknown as { __inspectEngine: () => Snap }).__inspectEngine;
      let minLeg = Infinity;
      let maxLeg = -Infinity;
      let firstX: number | null = null;
      let lastX = 0;
      let sawOppositeLegs = false;
      for (let i = 0; i < 28; i++) {
        await new Promise((r) => setTimeout(r, 25));
        const s = inspect();
        if (s.builder.phase === 'walk' || s.builder.phase === 'work') {
          if (firstX === null) firstX = s.builder.x;
          lastX = s.builder.x;
          minLeg = Math.min(minLeg, s.builder.legF);
          maxLeg = Math.max(maxLeg, s.builder.legF);
          if (Math.abs(s.builder.legF) > 0.08 && Math.sign(s.builder.legF) === -Math.sign(s.builder.legB)) {
            sawOppositeLegs = true;
          }
        }
      }
      return {
        movedPx: firstX === null ? 0 : Math.abs(lastX - firstX),
        strideRange: Number.isFinite(maxLeg - minLeg) ? maxLeg - minLeg : 0,
        sawOppositeLegs,
      };
    });

    expect(carpenterStride.movedPx).toBeGreaterThan(25);
    expect(carpenterStride.strideRange).toBeGreaterThan(0.35);
    expect(carpenterStride.sawOppositeLegs).toBe(true);

    // 2. Test synthetic raw mobile touch taps with 2.4px micro-jitter (dropped native click) on a .press button
    const touchResult = await page.evaluate(() => {
      const btn = document.createElement('button');
      btn.className = 'btn press';
      btn.style.position = 'fixed';
      btn.style.left = '20px';
      btn.style.top = '120px';
      btn.style.width = '88px';
      btn.style.height = '44px';
      btn.style.zIndex = '99999';
      let clicks = 0;
      btn.addEventListener('click', () => { clicks++; });
      document.body.appendChild(btn);

      for (let i = 0; i < 6; i++) {
        const mkTouch = (x: number, y: number) => new Touch({
          identifier: i + 1,
          target: btn,
          clientX: x,
          clientY: y,
          pageX: x,
          pageY: y,
        });
        const t0 = mkTouch(50, 140);
        btn.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [t0], changedTouches: [t0] }));
        const t1 = mkTouch(52.4, 141.2);
        btn.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [t1], changedTouches: [t1] }));
        btn.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], changedTouches: [t1] }));
      }
      btn.remove();
      return clicks;
    });
    expect(touchResult).toBe(6);

    // 3. Smartphone Battery Zero-Wakeup Background Test
    const batteryCheck = await page.evaluate(async () => {
      type Snap = { pausedInBackground: boolean; framesRendered: number };
      const inspect = (window as unknown as { __inspectEngine: () => Snap }).__inspectEngine;
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
      const pausedStart = inspect();
      const bgFlag = document.documentElement.dataset.bg;
      await new Promise((r) => setTimeout(r, 220));
      const pausedEnd = inspect();

      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise((r) => setTimeout(r, 160));
      const resumed = inspect();

      return {
        wasPaused: pausedStart.pausedInBackground,
        bgFlag,
        bgFramesDelta: pausedEnd.framesRendered - pausedStart.framesRendered,
        resumedFramesDelta: resumed.framesRendered - pausedEnd.framesRendered,
        resumedBgFlag: document.documentElement.dataset.bg ?? '',
      };
    });

    expect(batteryCheck.wasPaused).toBe(true);
    expect(batteryCheck.bgFlag).toBe('1');
    expect(batteryCheck.bgFramesDelta).toBe(0);
    expect(batteryCheck.resumedFramesDelta).toBeGreaterThan(2);
    expect(batteryCheck.resumedBgFlag).toBe('0');
  });

  test('tapping overhead golden quest badge in Town opens villager quest cleanly without exiting Town, and River offers one-tap Carpenter CTA', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 360 });
    await page.goto('/?fresh=1');
    await page.locator('button').first().click();
    await page.waitForTimeout(350);

    // Advance the shortened prologue until the player's brief arrival line and verify its snug comic bubble
    for (let i = 0; i < 8; i++) {
      const hasPlayerBubble = await page.evaluate(() => {
        const el = document.querySelector('[data-tap="cutscene"] .w-fit');
        return Boolean(el && (el.textContent ?? '').includes('رسیدیم'));
      });
      if (hasPlayerBubble) break;
      const nxt = page.locator('[data-tap="cutscene"] button').last();
      if (await nxt.isVisible().catch(() => false)) {
        await nxt.click();
        await page.waitForTimeout(100);
      }
    }
    const shortBubbleW = await page.evaluate(() => {
      const el = document.querySelector('[data-tap="cutscene"] .w-fit') as HTMLElement | null;
      return el ? el.getBoundingClientRect().width : 999;
    });
    expect(shortBubbleW).toBeLessThan(260);

    // Skip prologue, jump to Town, and tap directly on Grandma Nosrat's overhead golden ! badge (screen x=142, y=212)
    const skip = page.locator('[data-tap="cutscene"] button').nth(1);
    if (await skip.isVisible().catch(() => false)) await skip.click();
    await page.evaluate(() => {
      (window as unknown as { __gameApi: { setEnv: (p: Record<string, unknown>) => void } }).__gameApi.setEnv({
        scene: 'town', day: 2, hour: 10, coins: 2000,
      });
    });
    const screenPt = async (lx: number, ly: number) => page.evaluate(({ x, y }) => {
      const view = (window as unknown as { __inspectEngine: () => { viewport: { scale: number; tx: number; ty: number } } }).__inspectEngine().viewport;
      return { x: Math.round(view.tx + x * view.scale), y: Math.round(view.ty + y * view.scale) };
    }, { x: lx, y: ly });

    await page.waitForTimeout(300);
    const bangPt = await screenPt(228, 448);
    await page.mouse.click(bangPt.x, bangPt.y);
    await page.waitForTimeout(250);
    await expect(page.locator('[data-tap="cutscene"]')).toBeVisible();
    const openedQuestId = await page.locator('[data-tap="cutscene"]').getAttribute('data-scene-id');
    expect(openedQuestId).toBe('npc-q-grandma-1-start');

    // Jump to River with no fishing rod, tap water, verify one-tap Carpenter CTA button appears without HUD crash
    await page.evaluate(() => {
      (window as unknown as { __gameApi: { setEnv: (p: Record<string, unknown>) => void } }).__gameApi.setEnv({
        scene: 'river', hour: 14,
      });
    });
    await page.waitForTimeout(250);
    const riverPt = await screenPt(420, 390);
    await page.mouse.click(riverPt.x, riverPt.y);
    await expect(page.locator('[data-buy-rod-cta="1"]')).toBeVisible();
  });
});
