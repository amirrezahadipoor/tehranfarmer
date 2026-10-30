import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * ربات جامع مرورگر واقعی — سطح استودیویی AAA (حلقهٔ ۴ و ۵):
 * ۱) شروع بازی نو، رد پرولوگ، ورود واقعی به شهر (بذرفروشی و بازار با کلیک واقعی) و پایان‌بازی.
 * ۲) ممیزی پیکسلی تمام صحنه‌ها در سه پروفایل دشوار — هر پروفایل یک تست مستقل تا روی
 *    رانرهای کندتر CI موازی اجرا شود و هیچ اجرایی با سقف زمان شکست نخورد.
 * ۳) تست نگهبان که نتیجهٔ سه پروفایل را از فایل گزارش بررسی می‌کند.
 */

/** رد کردن هر صحنهٔ فعال با هر برچسبی که در آن زبان موجود است (فارسی یا انگلیسی) */
async function skipScene(page: import('@playwright/test').Page) {
  const skip = page.locator('button:has-text("رد کردن صحنه"), button:has-text("Skip scene"), button:has-text("Skip")');
  if (await skip.count()) {
    await skip.first().click({ force: true });
    await page.waitForTimeout(60);
  }
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPORT = path.resolve(HERE, '.scene-layout-report.json');

function writeReportProfile(profile: string, bugs: string[]) {
  let all: Record<string, string[]> = {};
  try { all = JSON.parse(fs.readFileSync(REPORT, 'utf8')); } catch { all = {}; }
  all[profile] = bugs;
  fs.writeFileSync(REPORT, JSON.stringify(all, null, 2), 'utf8');
}

const PROFILES = [
  { label: 'desktop-fa', w: 1280, h: 720, lang: 'fa', font: '16px' },
  { label: 'mobile-en-120pct', w: 640, h: 360, lang: 'en', font: '19.2px' },
  { label: 'portrait-fa-120pct', w: 360, h: 740, lang: 'fa', font: '19.2px' },
] as const;

// ---------------------------------------------------------------- ۱) جریان واقعی بازی
test('جریان واقعی بازی: شروع نو، رد پرولوگ، بذرفروشی، بازار و پایان‌بازی', async ({ page }) => {
  // رانرهای CI حدود ۳ برابر کندترند و این جریان با کلیک واقعی و فریم واقعی جلو می‌رود؛
  // سقف ۳۰۰ ثانیه مزمن بود (سه شکست پیاپی در CI) — زیر CI سقف را دو برابر می‌کنیم.
  test.setTimeout(process.env.CI ? 600_000 : 300_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  // شروع «بازی نو»: پاک‌کردن سِیوِ احتمالی مرورگر تا جریان واقعی از روز ۱ آزموده شود
  await page.evaluate(() => { try { localStorage.clear(); } catch { /* */ } });
  await page.reload();
  await page.waitForFunction(
    () => Boolean((window as unknown as { __cinemaDebug?: unknown }).__cinemaDebug || (window as unknown as { __gameApi?: unknown }).__gameApi),
    null,
    { timeout: 25_000 },
  );

// ۱. شروع بازی نو از صفحهٔ عنوان و رد پرولوگ
await page.locator('button').first().click();
await expect(page.locator('[data-scene-id="p1"]')).toBeVisible();
await skipScene(page);
await expect(page.locator('[data-scene-id]')).toHaveCount(0);

await page.evaluate(() => (document.fullscreenElement ? document.exitFullscreen() : Promise.resolve()));
await page.setViewportSize({ width: 1280, height: 720 });

// ۲. تست ورود به شهر و باز شدن خودکار مغازه در هر دو مسیر (Skip و پایان طبیعی بدون Skip!)
await page.evaluate(() => {
  (window as unknown as { __gameApi: { setEnv: (p: { scene: 'town' }) => void } }).__gameApi.setEnv({ scene: 'town' });
});
await page.waitForTimeout(220);

// مسیر الف: رد کردن صحنه در بذرفروشی -> باز شدن خودکار «بذر و کود»
await page.mouse.click(150, 380);
await expect(page.locator('[data-scene-id="shop-intro-seed"]')).toBeVisible({ timeout: 30_000 });
await skipScene(page);
await expect(page.getByRole('dialog', { name: 'بذر و کود' })).toBeVisible({ timeout: 20_000 });
await page.getByRole('button', { name: 'بستن پنجره' }).click();

// مسیر ب: پیش‌روی طبیعی ضرب‌به‌ضرب تا پایان در بازار -> باز شدن خودکار «بازار» بدون کلیک مجدد!
await page.mouse.click(350, 380);
await expect(page.locator('[data-scene-id="shop-intro-market"]')).toBeVisible({ timeout: 30_000 });
// ضرب ۱: تکمیل تایپ + ادامه
await page.locator('[data-scene-id="shop-intro-market"] button:has-text("ادامه")').click();
await page.locator('[data-scene-id="shop-intro-market"] button:has-text("ادامه")').click();
// ضرب ۲ (آخر): تکمیل تایپ + پایان
await page.locator('[data-scene-id="shop-intro-market"] button:has-text("پایان")').click();
await page.locator('[data-scene-id="shop-intro-market"] button:has-text("پایان")').click();
await expect(page.getByRole('dialog', { name: 'بازار' })).toBeVisible({ timeout: 20_000 });
await page.getByRole('button', { name: 'بستن پنجره' }).click();


// ۴. ممیزی ظاهر، مقیاس فونت، عدم سرریز افقی و سفر سریع موبایل در حالت عمودی (360×740) و افقی موبایل (800×360)
await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
for (const mob of [{ w: 360, h: 740 }, { w: 800, h: 360 }]) {
  await page.setViewportSize({ width: mob.w, height: mob.h });
  await page.evaluate(() => {
    (window as unknown as { __gameApi: { setEnv: (p: { scene: 'farm'; postgame: boolean }) => void } }).__gameApi.setEnv({ scene: 'farm', postgame: false });
  });
  await page.waitForTimeout(120);
  const mobileMetrics = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(b).visibility !== 'hidden';
    });
    const overlaps: string[] = [];
    for (let i = 0; i < btns.length; i++) {
      for (let j = i + 1; j < btns.length; j++) {
        const a = btns[i].getBoundingClientRect();
        const b = btns[j].getBoundingClientRect();
        const ix = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const iy = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        if (ix > 4 && iy > 4) {
          overlaps.push(`(${btns[i].getAttribute('aria-label') || btns[i].textContent?.trim()}) <-> (${btns[j].getAttribute('aria-label') || btns[j].textContent?.trim()})`);
        }
      }
    }
    return {
      rootPx: parseFloat(getComputedStyle(document.documentElement).fontSize),
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
      overlaps,
    };
  });
  expect(mobileMetrics.rootPx).toBeGreaterThanOrEqual(11);
  expect(mobileMetrics.overflowX).toBeLessThanOrEqual(1);
  expect(mobileMetrics.overlaps, `هم‌پوشانی دکمه‌ها در ${mob.w}×${mob.h}: ${mobileMetrics.overlaps.join(', ')}`).toEqual([]);
}

// تست دکمه‌های ناوبری سریع موبایل به رودخانه و زنبورستان و فعال شدن تریگر معرفی هر ناحیه!
await page.setViewportSize({ width: 360, height: 740 });
// رفع U-2: در نمای عمودی وب، ابتدا صفحهٔ «گوشی را افقی بگیر» نمایش داده می‌شود؛
// بازیکن می‌تواند با دکمهٔ «ادامه با همین حالت» وارد شود. آزمون هم همان مسیر واقعی را می‌رود.
// (قبلاً یک isVisibleِ بدون صبر بود: اگر دیالوگ هنوز mount نشده بود، جا می‌ماند و
//  زیر CI برای همیشه روی کلیک ناوبری قفل می‌کرد — علت مزمنِ شکست CIها.)
const portraitAck = page.getByRole('button', { name: 'ادامه با همین حالت' });
try {
  await portraitAck.waitFor({ state: 'visible', timeout: 5_000 });
  await portraitAck.click();
} catch {
  // درگاهی ظاهر نشد — حالت عمودی از قبل پذیرفته شده؛ ادامه می‌دهیم
}
// در نمای باریک همهٔ مقصدها از Atlas واقعی باز می‌شوند، نه نوار هشت‌دکمه‌ای desktop.
const mobileTravel = async (destination: 'river' | 'apiary') => {
  await page.locator('[data-mobile-atlas="1"]').click();
  await page.locator(`[data-atlas-go="${destination}"]`).click();
};
await mobileTravel('river');
await expect(page.locator('[data-scene-id="area-intro-river"]')).toBeVisible({ timeout: 20_000 });
await skipScene(page);

await mobileTravel('apiary');
await expect(page.locator('[data-scene-id="area-intro-apiary"]')).toBeVisible({ timeout: 20_000 });
await skipScene(page);

// ۵. تست زندهٔ حرکت فیزیکی کاراکترها روی صحنه + چک‌لیست ارتقا + کشف راز مخفی درخت کهنسال با کلیک واقعی روی بوم!
await page.setViewportSize({ width: 1280, height: 720 });
await page.evaluate(() => {
  (window as unknown as { __cinemaDebug: { play: (id: string) => void } }).__cinemaDebug.play('ch4-outro');
});
await page.waitForTimeout(380);
const movedPx = await page.evaluate(() => (window as unknown as { __gameApi: { summary: () => { stageMoved: number } } }).__gameApi.summary().stageMoved);
expect(movedPx).toBeGreaterThan(25);
await skipScene(page);

// بدون ارتقای زمین و خاک طلایی، کلیک روی درخت کهنسال هیچ راز مخفی را لو نمی‌دهد
await page.evaluate(() => {
  (window as unknown as { __gameApi: { setEnv: (p: { scene: 'farm'; postgame: boolean }) => void } }).__gameApi.setEnv({ scene: 'farm', postgame: false });
});
await page.waitForTimeout(100);
await page.mouse.click(468, 110);
await expect(page.locator('[data-scene-id="secret-grandpa-tree"]')).toHaveCount(0);

// با آزادسازی کامل زمین (land=4) و خاک طلایی (soil=1)، کلیک واقعی روی درخت کهنسال صحنهٔ مخفی و ۷۵٬۰۰۰ سکه را باز می‌کند!
await page.evaluate(() => {
  (window as unknown as { __gameApi: { setEnv: (p: { land: number; soil: number }) => void } }).__gameApi.setEnv({ land: 4, soil: 1 });
});
await page.mouse.click(468, 110);
await expect(page.locator('[data-scene-id="secret-grandpa-tree"]')).toBeVisible({ timeout: 20_000 });
await skipScene(page);

await page.evaluate(() => {
  (window as unknown as { __gameApi: { openModal: (m: 'quests') => void } }).__gameApi.openModal('quests');
});
await expect(page.locator('[data-chapter-quest]')).toBeVisible();
await expect(page.locator('[data-secrets-panel="1"]')).toContainText('۱ / ۸');
await page.getByRole('button', { name: 'بستن پنجره' }).click();

// ۶. بازگشت به مزرعه و تست کامل وضعیت پایان‌بازی + تراشهٔ «مزرعه آزاد است» + افتتاح موزه در مرورگر زنده
await page.evaluate(() => {
  const api = (window as unknown as {
    __gameApi: { setEnv: (p: { scene?: 'farm'; postgame?: boolean }) => void };
  }).__gameApi;
  api.setEnv({ scene: 'farm', postgame: true });
});
await page.waitForTimeout(150);

await expect(page.getByText('مزرعه آزاد است')).toBeVisible();
await page.getByText('مزرعه آزاد است').click();
await expect(page.getByRole('dialog', { name: 'موزهٔ میراث مزرعه و تندیس جهانگیر' })).toBeVisible();
await page.getByRole('button', { name: /دریافت یادبود افتتاح موزه/ }).click();
await expect(page.getByRole('button', { name: /یادبود دریافت شد/ })).toBeDisabled();
});

// ---------------------------------------------------------------- ۲) ممیزی پیکسلی هر پروفایل
for (const prof of PROFILES) {
  test(`ممیزی پیکسلی تمام صحنه‌ها — ${prof.label} (${prof.w}x${prof.h}، فونت ${prof.font}، زبان ${prof.lang})`, async ({ page }) => {
    test.setTimeout(process.env.CI ? 600_000 : 420_000);
    await page.setViewportSize({ width: prof.w, height: prof.h });
    await page.goto('/');
    await page.waitForFunction(() => Boolean((window as unknown as { __cinemaDebug?: unknown }).__cinemaDebug), null, { timeout: 25_000 });
    await page.locator('button').first().click();
    await expect(page.locator('[data-scene-id="p1"]')).toBeVisible();
    await skipScene(page);
    const layoutBugs: string[] = [];
    const sceneIds: string[] = await page.evaluate(() => {
      const dbg = (window as unknown as { __cinemaDebug: { list: () => Array<{ id: string }> } }).__cinemaDebug;
      return dbg.list().map((s) => s.id);
    });
    expect(sceneIds.length).toBeGreaterThanOrEqual(87);

    // اعمال زبان و مقیاس فونت پروفایل
    await page.evaluate(({ lang, font }) => {
  document.documentElement.style.fontSize = font;
  localStorage.setItem('mazrae-rangi-settings-v1', JSON.stringify({
    sound: true, music: true, haptics: true, reduceMotion: false, colorblind: false, shortBeat: false,
    fontScale: font === '19.2px' ? 1.2 : 1, locale: lang,
  }));
}, { lang: prof.lang, font: prof.font });

// همچنین در پروفایل موبایل انگلیسی با فونت ۱۲۰٪ با دکمهٔ زنده زبان را تغییر بده
await page.evaluate((id) => {
  (window as unknown as { __cinemaDebug: { play: (s: string) => unknown } }).__cinemaDebug.play(id);
}, 'p1');
await page.waitForTimeout(30);
const curLangBtn = await page.locator('[data-scene-id="p1"] button').first().textContent();
if ((prof.lang === 'en' && curLangBtn?.includes('فارسی')) || (prof.lang === 'fa' && curLangBtn?.includes('English'))) {
  await page.locator('[data-scene-id="p1"] button').first().click({ force: true });
}

for (const id of sceneIds) {
  await page.evaluate((sceneId) => {
    (window as unknown as { __cinemaDebug: { play: (s: string) => unknown } }).__cinemaDebug.play(sceneId);
  }, id);
  await page.waitForTimeout(28);

  const issues = await page.evaluate(({ sceneId, tag, w, h }) => {
    const errs: string[] = [];
    const root = document.querySelector(`[data-scene-id="${sceneId}"]`);
    if (!root) {
      errs.push(`${sceneId}@${tag}: ریشهٔ صحنه رندر نشد`);
      return errs;
    }
    const txt = root.textContent ?? '';
    if (/undefined|NaN|\[object/.test(txt)) {
      errs.push(`${sceneId}@${tag}: متن خراب (${txt.slice(0, 60)})`);
    }
    const boxes = [...root.querySelectorAll('div.pointer-events-none')];
    for (const box of boxes) {
      const r = box.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.left < 4) errs.push(`${sceneId}@${tag}: بریدگی چپ (left=${Math.round(r.left)}px)`);
      if (r.right > w - 4) errs.push(`${sceneId}@${tag}: بریدگی راست (right=${Math.round(r.right)}px > ${w}px)`);
      if (r.top < 42) errs.push(`${sceneId}@${tag}: برخورد با نوار بالا (top=${Math.round(r.top)}px)`);
      if (r.bottom > h - 38) errs.push(`${sceneId}@${tag}: برخورد با نوار هدف پایین (bottom=${Math.round(r.bottom)}px > ${h - 38}px)`);
    }
    return errs;
  }, { sceneId: id, tag: prof.label, w: prof.w, h: prof.h });

      layoutBugs.push(...issues);
    }

    writeReportProfile(prof.label, layoutBugs);
    expect(layoutBugs, `ایرادهای جایگاه نوشته‌ها در ${prof.label}:\n${layoutBugs.join('\n')}`).toEqual([]);
  });
}

// ---------------------------------------------------------------- ۳) نگهبان نهایی گزارش
test('نگهبان: نتیجهٔ هر سه پروفایل ممیزی صحنه ثبت و بدون ایراد است', async () => {
  let report: Record<string, string[]> = {};
  try { report = JSON.parse(fs.readFileSync(REPORT, 'utf8')); } catch { report = {}; }
  const missing = PROFILES.map((p) => p.label).filter((l) => !Array.isArray(report[l]));
  expect(missing, `پروفایل‌های ثبت‌نشده: ${missing.join(', ')}`).toEqual([]);
  const bugs = Object.entries(report).flatMap(([k, v]) => v.map((b) => `${k}: ${b}`));
  expect(bugs, `ایرادهای ثبت‌شده:\n${bugs.join('\n')}`).toEqual([]);
});
