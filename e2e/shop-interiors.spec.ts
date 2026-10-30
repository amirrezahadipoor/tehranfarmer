import { expect, test, type Locator, type Page } from '@playwright/test';

const SHOPS = ['seed', 'market', 'work', 'animal', 'carp', 'estate'] as const;
type Shop = (typeof SHOPS)[number];
const SKIP = 'button:has-text("رد کردن صحنه"), button:has-text("Skip scene")';

async function skipScene(scope: Page | Locator) {
  const skip = scope.locator(SKIP).first();
  if (await skip.isVisible().catch(() => false)) await skip.click();
}

async function startInTown(page: Page, english = false) {
  await page.goto('/');
  await page.locator('button').first().click();
  await skipScene(page);
  await page.evaluate(() => {
    (window as unknown as { __gameApi?: { setEnv: (p: { scene: string }) => void } }).__gameApi?.setEnv({ scene: 'town' });
  });
  await expect(page.locator('[data-a11y-target="shop:seed"]')).toHaveCount(1);
  if (english) {
    await page.locator('[data-open-settings="1"]').click();
    await page.locator('[data-lang-toggle="1"]').click();
    await expect(page.locator('[data-lang-toggle="1"]')).toHaveText('Language: English');
    await page.locator('[aria-label="Close Modal"]').click();
  }
}

async function enterShop(page: Page, shop: Shop) {
  await page.locator(`[data-a11y-target="shop:${shop}"]`).evaluate((el) => (el as HTMLButtonElement).click());
  const interior = page.locator(`[data-shop-interior="${shop}"]`);
  await expect(interior).toBeVisible({ timeout: 12_000 });
  const intro = page.locator(`[data-scene-id="shop-intro-${shop}"]`);
  if (await intro.isVisible()) {
    await expect(interior).toBeVisible(); // معرفی اول هم داخل همان فروشگاه است، نه در خیابان
    await skipScene(intro);
  }
  await expect(interior).toBeVisible();
  await expect(page.locator(`[data-shop-talk="${shop}"]`)).toBeVisible();
  await expect(page.locator(`[data-shop-buy="${shop}"]`)).toBeVisible();
}

async function exerciseShop(page: Page, shop: Shop) {
  await enterShop(page, shop);
  await page.locator(`[data-shop-talk="${shop}"]`).click();
  const dialogue = page.locator('[data-shop-dialogue="1"]');
  await expect(dialogue).toBeVisible();
  await expectDialogueContained(page);
  await expect(page.locator(`[data-shop-interior="${shop}"]`)).toBeVisible();
  await expect(page.locator('[role="dialog"]')).toHaveCount(1); // فقط حباب گفت‌وگو؛ داخل‌نما inert و aria-hidden است
  await skipScene(dialogue);
  await expect(dialogue).toHaveCount(0);
  await expect(page.locator(`[data-shop-interior="${shop}"]`)).toBeVisible();

  await page.locator(`[data-shop-buy="${shop}"]`).click();
  await expect(page.locator(`[data-shop-purchase="${shop}"]`)).toBeVisible();
  await expect(page.locator('[data-modal-scroll="1"]')).toBeVisible();
  await page.locator('[data-shop-back-lobby="1"]').click();
  await expect(page.locator(`[data-shop-interior="${shop}"]`)).toBeVisible();
  await page.locator('[data-shop-exit="1"]').click();
  await expect(page.locator(`[data-shop-interior="${shop}"]`)).toHaveCount(0);
}

/** متن مهم نه از قاب خودش بیرون می‌زند، نه با truncate/clip پنهان می‌شود؛ اسکرول محتوای اصلی مجاز است. */
async function expectTextContained(scope: Locator) {
  const issues = await scope.evaluate((root) => {
    const found: string[] = [];
    const candidates = [root, ...root.querySelectorAll('h2, p, button, [data-shop-purchase] > div')];
    for (const el of candidates) {
      if (!(el instanceof HTMLElement)) continue;
      if (el !== root && !(el.textContent ?? '').trim()) continue; // قاب پرتره عمداً SVG را clip می‌کند، متن نیست
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const label = `${el.tagName}:${(el.textContent ?? '').trim().slice(0, 55)}`;
      if (el.scrollWidth > el.clientWidth + 2) found.push(`horizontal ${label} (${el.scrollWidth}/${el.clientWidth})`);
      if (el !== root && el.scrollHeight > el.clientHeight + 2) found.push(`vertical ${label} (${el.scrollHeight}/${el.clientHeight})`);
      if (rect.left < -1 || rect.right > window.innerWidth + 1) found.push(`viewport ${label} (${rect.left}/${rect.right})`);
    }
    return found;
  });
  expect(issues).toEqual([]);
}

async function expectDialogueContained(page: Page) {
  const bubble = page.locator('[data-shop-speech="1"]');
  await expect(bubble).toBeVisible();
  await page.waitForTimeout(100); // اندازه‌گیری layout پس از فونت/پرتره کامل شود
  const geometry = await bubble.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const topBar = document.querySelector('[data-cutscene-topbar="1"]')!.getBoundingClientRect();
    const bottomBar = document.querySelector('[data-cutscene-bottombar="1"]')!.getBoundingClientRect();
    const overflowing = [...el.querySelectorAll('div, span')].filter((child) => {
      const c = child as HTMLElement;
      return !c.classList.contains('sr-only') && c.clientWidth > 0 && c.scrollWidth > c.clientWidth + 2;
    }).map((child) => {
      const c = child as HTMLElement;
      return `${c.tagName}.${String(c.className)}:${(c.textContent ?? '').trim().slice(0, 60)} (${c.scrollWidth}/${c.clientWidth})`;
    });
    return {
      left: r.left, top: r.top, right: r.right, bottom: r.bottom, vw: innerWidth, vh: innerHeight,
      topBarBottom: topBar.bottom, bottomBarTop: bottomBar.top, overflowing,
    };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.top).toBeGreaterThanOrEqual(geometry.topBarBottom - 1);
  expect(geometry.top).toBeLessThan(geometry.vh * 0.35); // گفت‌وگوی داخل فروشگاه بالای صفحه است، نه روی دکمه‌های پایین
  expect(geometry.right).toBeLessThanOrEqual(geometry.vw);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.bottomBarTop + 1);
  expect(geometry.overflowing).toEqual([]);
  await expectTextContained(bubble);
}

test.describe('Detailed shop interiors and indoor NPC merchants', () => {
  test.use({ hasTouch: true });

  test('all six shops keep their merchant indoors and complete talk -> buy -> lobby -> exit on desktop', async ({ page }) => {
    test.setTimeout(150_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1280, height: 720 });
    await startInTown(page);
    for (const shop of SHOPS) await exerciseShop(page, shop);
    expect(errors).toEqual([]);
  });

  test('all six interiors keep both actions reachable at 640x360 without horizontal overflow', async ({ page }) => {
    test.setTimeout(150_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 640, height: 360 });
    await startInTown(page);
    for (const shop of SHOPS) {
      await exerciseShop(page, shop);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    expect(errors).toEqual([]);
  });

  for (const english of [false, true]) {
    test(`all six titles, actions, dialogues and purchase banners contain ${english ? 'English' : 'Persian'} text at 120% on mobile`, async ({ page }) => {
      test.setTimeout(150_000);
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.setViewportSize({ width: 640, height: 360 });
      await startInTown(page, english);
      await page.evaluate(() => { document.documentElement.style.fontSize = '19.2px'; });
      for (const shop of SHOPS) {
        await enterShop(page, shop);
        await expectTextContained(page.locator(`[data-shop-interior="${shop}"]`));
        await page.locator(`[data-shop-talk="${shop}"]`).click();
        await expectDialogueContained(page);
        await skipScene(page.locator('[data-shop-dialogue="1"]'));
        await page.locator(`[data-shop-buy="${shop}"]`).click();
        await expectTextContained(page.locator(`[data-shop-purchase="${shop}"]`));
        await page.locator('[data-shop-back-lobby="1"]').click();
        await page.locator('[data-shop-exit="1"]').click();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      expect(errors).toEqual([]);
    });
  }
});
