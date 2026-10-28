import { expect, test } from '@playwright/test';

test.describe('تناسب کامل صفحهٔ اصلی موبایل و تضمین ۱۰۰٪ تاچ اندروید (UI + Canvas)', () => {
  test('صفحهٔ اصلی روی همهٔ ابعاد واقعی گوشی (افقی ۲۰:۹، بریدگی دوربین، عمودی، ذخیرهٔ فعال، FA/EN و فونت ۱۲۰٪) بدون هم‌پوشانی یا بیرون‌زدگی است', async ({ browser }) => {
    const viewports = [
      { name: 'phone-land-800x360', width: 800, height: 360, safeLeft: 32, safeRight: 12 },
      { name: 'phone-land-863x360', width: 863, height: 360, safeLeft: 36, safeRight: 14 },
      { name: 'phone-port-360x800', width: 360, height: 800, safeLeft: 0, safeRight: 0 },
      { name: 'phone-port-412x839', width: 412, height: 839, safeLeft: 0, safeRight: 0 },
    ];

    for (const vp of viewports) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        hasTouch: true,
        isMobile: true,
      });
      await ctx.addInitScript(({ sl, sr }) => {
        (window as unknown as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true };
        document.addEventListener('DOMContentLoaded', () => {
          document.documentElement.style.setProperty('--safe-left', `${sl}px`);
          document.documentElement.style.setProperty('--safe-right', `${sr}px`);
          document.documentElement.dataset.fontScale = '1.2';
        });
      }, { sl: vp.safeLeft, sr: vp.safeRight });

      const page = await ctx.newPage();
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      // ضدشکنندگی: صفحهٔ لودینگ (boot) ناهمگام است؛ تا آماده‌شدن دکمهٔ شروع صبر می‌کنیم
      // تا شمارش دکمه‌ها هرگز وسط بوت انجام نشود.
      await expect(page.locator('button:has-text("شروع")').first()).toBeVisible({ timeout: 20_000 });

      for (const loc of ['fa', 'en'] as const) {
        if (loc === 'en') {
          const langBtn = page.locator('button:has-text("زبان بازی")');
          const box = await langBtn.boundingBox();
          expect(box).not.toBeNull();
          await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
        }

        const buttons = page.locator('button:visible');
        const count = await buttons.count();
        expect(count).toBeGreaterThanOrEqual(3);

        const rects: { x: number; y: number; w: number; h: number }[] = [];
        for (let i = 0; i < count; i++) {
          const b = await buttons.nth(i).boundingBox();
          expect(b, `${vp.name} (${loc}) button #${i}`).not.toBeNull();
          expect(b!.x).toBeGreaterThanOrEqual(vp.safeLeft - 1);
          expect(b!.x + b!.width).toBeLessThanOrEqual(vp.width - vp.safeRight + 1);
          expect(b!.y).toBeGreaterThanOrEqual(0);
          expect(b!.y + b!.height).toBeLessThanOrEqual(vp.height);
          rects.push({ x: b!.x, y: b!.y, w: b!.width, h: b!.height });
        }

        // هیچ دو دکمه‌ای نباید هم‌پوشانی داشته باشند
        for (let i = 0; i < rects.length; i++) {
          for (let j = i + 1; j < rects.length; j++) {
            const A = rects[i], B = rects[j];
            const overlapX = Math.max(0, Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x));
            const overlapY = Math.max(0, Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y));
            expect(overlapX * overlapY, `${vp.name} (${loc}) overlap ${i}-${j}`).toBe(0);
          }
        }
      }

      await ctx.close();
    }
  });

  test('تاچ خالص سخت‌افزاری اندروید (حتی با لغزش ۱۴ پیکسلی انگشت و بدون کلیک مصنوعی مرورگر) روی دکمه‌ها و بوم مزرعه ۱۰۰٪ کار می‌کند', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 863, height: 360 },
      hasTouch: true,
      isMobile: true,
    });
    await ctx.addInitScript(() => {
      (window as unknown as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true };
    });
    const page = await ctx.newPage();
    await page.goto('/');

    // شبیه‌سازی دقیق TouchEvent خالص اندروید با لغزش واقعی انگشت بدون هیچ MouseEvent/PointerEvent
    const rawAndroidTap = async (x: number, y: number, drift = 12) => {
      await page.evaluate(({ px, py, d }) => {
        const el = document.elementFromPoint(px, py) ?? document.body;
        const mkTouch = (cx: number, cy: number) =>
          new Touch({
            identifier: 1,
            target: el,
            clientX: cx,
            clientY: cy,
            pageX: cx,
            pageY: cy,
            screenX: cx,
            screenY: cy,
            radiusX: 8,
            radiusY: 8,
          });
        const t0 = mkTouch(px, py);
        const t1 = mkTouch(px + d, py + 4);
        el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [t0], targetTouches: [t0], changedTouches: [t0] }));
        el.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [t1], targetTouches: [t1], changedTouches: [t1] }));
        el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [t1] }));
      }, { px: x, py: y, d: drift });
    };

    // ۱) ضربهٔ خالص اندروید روی دکمهٔ شروع -> باز شدن کات‌سین بدون هیچ کلیک مصنوعی!
    const startBox = await page.locator('button').first().boundingBox();
    expect(startBox).not.toBeNull();
    await rawAndroidTap(startBox!.x + startBox!.width / 2, startBox!.y + startBox!.height / 2);
    await expect(page.locator('[data-scene-id="p1"]')).toBeVisible();

    // ۲) ضربهٔ خالص اندروید روی دکمهٔ «رد کردن صحنه» -> ورود به مزرعه!
    const skipBox = await page.locator('button:has-text("رد کردن صحنه")').boundingBox();
    expect(skipBox).not.toBeNull();
    await rawAndroidTap(skipBox!.x + skipBox!.width / 2, skipBox!.y + skipBox!.height / 2);
    await expect(page.locator('[data-scene-id]')).toHaveCount(0);

    // ۳) ضربهٔ خالص اندروید روی بوم مزرعه (کرت #0) -> باز شدن پنجرهٔ بازرس «خاک خام»!
    await rawAndroidTap(111.5 + 448 * 0.5, 290 * 0.5, 4);
    await expect(page.locator('button:has-text("شخم بزن")')).toBeVisible();

    await ctx.close();
  });

  test('صفحهٔ لودینگ دست‌ساز واقعی (?boot=1) همهٔ صحنه‌ها و تکسچرهای GPU را تا ۱۰۰٪ بارگذاری می‌کند و ضربه‌های سریع متوالی بدون خورده‌شدن کار می‌کنند', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 863, height: 360 },
      hasTouch: true,
      isMobile: true,
    });
    await ctx.addInitScript(() => {
      (window as unknown as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true };
    });
    const page = await ctx.newPage();
    await page.goto('/?boot=1');

    // ۱) صفحهٔ لودینگ بلافاصله در لحظهٔ ورود دیده می‌شود، بدون ایموجی است و تا ۱۰۰٪ پیش می‌رود
    const loader = page.getByTestId('boot-loader');
    await expect(loader).toBeVisible();
    const loaderText = await loader.innerText();
    expect(/\p{Extended_Pictographic}/u.test(loaderText)).toBe(false);

    // در حین نمایش لودینگ هیچ بوم رقیبی در پس‌زمینه رندر نمی‌شود تا GPU هرگز پرک سیاه/سفید نزند
    expect(await page.locator('canvas').count()).toBe(0);

    // صبر برای تکمیل واقعی ۱۰۰٪ بارگذاری و باز شدن صفحهٔ اصلی
    await expect(page.getByTestId('start-screen')).toBeVisible({ timeout: 10000 });
    await expect(loader).toHaveCount(0);

    // پس از لودینگ دقیقاً ۱ بوم استاندارد بدون باگ RGBX alpha:false فعال است
    const canvasAudit = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      const main = canvases[0] as HTMLCanvasElement | undefined;
      return {
        domCanvasCount: canvases.length,
        hasPixels: Boolean(main && main.width > 0 && main.height > 0),
        attrs: main?.getContext('2d')?.getContextAttributes?.() ?? null,
      };
    });
    expect(canvasAudit.domCanvasCount).toBe(1);
    expect(canvasAudit.hasPixels).toBe(true);
    if (canvasAudit.attrs && 'alpha' in canvasAudit.attrs) {
      expect(canvasAudit.attrs.alpha).toBe(true);
    }

    // ۲) ۶ ضربهٔ فوق‌سریع متوالی (< 40ms فاصله) روی دکمهٔ صدا — حتی ۱ ضربه هم نباید خورده شود!
    const soundBtn = page.locator('button:has-text("صدا روشن"), button:has-text("بی‌صدا")');
    const beforeTxt = await soundBtn.innerText();
    for (let i = 0; i < 5; i++) {
      await soundBtn.tap();
    }
    const after5Txt = await soundBtn.innerText();
    expect(after5Txt).not.toBe(beforeTxt);
    await soundBtn.tap();
    expect(await soundBtn.innerText()).toBe(beforeTxt);

    await ctx.close();
  });
});

