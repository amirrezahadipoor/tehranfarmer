/**
 * ممیزِ اندرویدِ موبایل — اسکرین‌شاتِ تک‌تکِ صفحه‌ها در ریگِ واقعیِ گوشی:
 * لَنداسکیپ 800×360 با لمسی + DPR2 (مثل کروم اندروید)، سپس عمودی 360×740.
 * خروجی: پوشهٔ shots/ + metrics.json (دکمه‌های کوچک، سرریز، هم‌پوشانی، فونتِ ریز)
 *
 * اجرا: npm run build:e2e && node scripts/mobile-audit.mjs [--keep]
 * (build:e2e لازم است تا __gameApi/devTools روشن باشد؛ اسکریپت خودش پیش‌نمایش را بالا می‌آورد)
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = process.env.AUDIT_DIR || path.resolve(ROOT, '..', 'mobile-audit');
const PORT = 4177;
const BASE = `http://127.0.0.1:${PORT}`;
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

const MODAL_IDS = [
  'seed', 'market', 'work', 'carp', 'estate', 'animal', 'inv', 'menu',
  'auto', 'pond', 'hive', 'achieve', 'ledger', 'quests', 'museum', 'home', 'almanac',
];
const SCENES = ['farm', 'town', 'north', 'valley', 'river', 'forest', 'apiary', 'cave'];

const metrics = {}; // shot name -> geometry findings
const shots = [];

function log(...a) { console.log('•', ...a); }

async function prepPreview() {
  const b = spawnSync('node', [path.join(ROOT, 'scripts', 'e2e-build.mjs')], { cwd: ROOT, stdio: 'inherit' });
  if (b.status !== 0) throw new Error('e2e build failed');
  // Spawn Vite itself (not the npx shim) so cleanup cannot orphan the preview child.
  const viteBin = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  const prev = spawn(process.execPath, [viteBin, 'preview', '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'], {
    cwd: ROOT, stdio: 'ignore', detached: false,
  });
  for (let i = 0; i < 60; i++) {
    try { await fetch(BASE); return prev; } catch { await new Promise((r) => setTimeout(r, 500)); }
  }
  prev.kill('SIGTERM');
  throw new Error('preview did not come up');
}

/** سنجشِ هندسیِ همان لحظه: سرریز افقی، دکمه‌های ریز، فونتِ ریز، هم‌پوشانی */
async function measure(page) {
  return page.evaluate(() => {
    const out = { overflowX: document.documentElement.scrollWidth - window.innerWidth, smallButtons: [], tinyText: [], overlaps: [] };
    const visibleRect = (el) => {
      const r = el.getBoundingClientRect();
      let left = r.left, right = r.right, top = r.top, bottom = r.bottom;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
        const pr = p.getBoundingClientRect();
        left = Math.max(left, pr.left); right = Math.min(right, pr.right);
        top = Math.max(top, pr.top); bottom = Math.min(bottom, pr.bottom);
      }
      return { left, right, top, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
    };
    const btns = [...document.querySelectorAll('button')].filter((b) => {
      const r = b.getBoundingClientRect();
      const style = getComputedStyle(b);
      // Standard screen-reader-only controls are intentionally 1px and clipped;
      // they are keyboard-revealed, not defective visible touch targets.
      const visuallyHidden = r.width <= 1 && r.height <= 1 && style.clipPath === 'inset(50%)';
      return !visuallyHidden && r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    });
    for (const b of btns) {
      const r = b.getBoundingClientRect();
      const label = (b.getAttribute('aria-label') || b.textContent || '?').trim().slice(0, 26);
      if (r.height < 30 || r.width < 30) out.smallButtons.push(`${label} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    // دکمه‌های پشتِ backdrop در hit-test دیده نمی‌شوند؛ آن‌ها هم‌پوشانیِ واقعی نیستند.
    const hitButtons = btns.filter((b) => {
      const r = b.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return hit === b || (hit && b.contains(hit));
    });
    for (let i = 0; i < hitButtons.length; i++) {
      for (let j = i + 1; j < hitButtons.length; j++) {
        const a = visibleRect(hitButtons[i]), c = visibleRect(hitButtons[j]);
        const left = Math.max(a.left, c.left), right = Math.min(a.right, c.right);
        const top = Math.max(a.top, c.top), bottom = Math.min(a.bottom, c.bottom);
        if (right - left > 4 && bottom - top > 4) {
          // A scrolled control's layout rectangle can extend beneath the modal
          // header while its visible pixels are clipped. Confirm the intersection
          // itself is hit-testable before calling it a real touch overlap.
          const hit = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
          const owner = hit?.closest('button');
          if (owner !== hitButtons[i] && owner !== hitButtons[j]) continue;
          const label = (b) => (b.getAttribute('aria-label') || b.textContent || b.outerHTML).trim().slice(0, 70);
          out.overlaps.push(`${label(hitButtons[i])} <-> ${label(hitButtons[j])}`);
        }
      }
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (!n.textContent || !n.textContent.trim()) continue;
      const el = n.parentElement;
      if (!el || seen.has(el) || ['SCRIPT', 'STYLE'].includes(el.tagName)) continue;
      seen.add(el);
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === 'hidden') continue;
      if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs && fs < 10.5) out.tinyText.push(`${(el.textContent || '').trim().slice(0, 24)} @${fs}px`);
    }
    return out;
  });
}

async function shoot(page, name) {
  const dir = path.join(OUT, 'shots');
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(dir, `${name}.png`) });
  metrics[name] = await measure(page);
  shots.push(name);
  log('shot', name);
}

/** تهِ هر مودالِ اسکرول‌دار را واقعاً می‌رود، رسیدن به انتها را ثبت و عکس می‌گیرد. */
async function shootScrollBottom(page, name, key) {
  const before = await page.evaluate(() => {
    const el = document.querySelector('[role="dialog"] .scroll');
    if (!el) return null;
    const sc = el;
    const info = { clientHeight: sc.clientHeight, scrollHeight: sc.scrollHeight };
    sc.scrollTop = sc.scrollHeight;
    sc.dispatchEvent(new Event('scroll', { bubbles: true }));
    return info;
  });
  metrics.__scrolls ??= {};
  if (!before || before.scrollHeight <= before.clientHeight + 2) {
    metrics.__scrolls[key] = { ...before, scrollable: false, reachedBottom: true };
    return;
  }
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => {
    const sc = document.querySelector('[role="dialog"] .scroll');
    return { scrollTop: sc.scrollTop, clientHeight: sc.clientHeight, scrollHeight: sc.scrollHeight };
  });
  metrics.__scrolls[key] = {
    ...before, ...after, scrollable: true,
    reachedBottom: Math.abs(after.scrollHeight - after.clientHeight - after.scrollTop) < 3,
  };
  await shoot(page, name);
}

async function main() {
  rmSync(path.join(OUT, 'shots'), { recursive: true, force: true });
  mkdirSync(path.join(OUT, 'shots'), { recursive: true });
  const prev = await prepPreview();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({
      viewport: { width: 800, height: 360 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      locale: 'fa-IR',
      userAgent: UA,
    });
    const page = await ctx.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    await page.goto(BASE);
    await page.waitForFunction(() => Boolean(window.__gameApi), null, { timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.locator('button').first().waitFor({ timeout: 15_000 });
    await page.waitForTimeout(600);
    await shoot(page, '00-title');

    // شروع + پرولوگ: پیشرویِ ضربه‌ای؛ کلاس‌بندی با متن چون data-scene-id کلِ پرولوگ p1 است
    await page.locator('button').first().click();
    await page.locator('[data-scene-id]').first().waitFor({ timeout: 15_000 });
    await page.waitForTimeout(1300); // پایان typewriter برای ارزیابی کل حباب، نه متنِ نیمه‌کاره
    await shoot(page, '01-prologue-p1');
    const beatLog = [];
    let p4Done = false, p6Done = false;
    for (let i = 0; i < 60; i++) {
      const scene = page.locator('[data-scene-id]').first();
      if (!(await scene.count())) break;
      const txt = ((await scene.textContent().catch(() => '')) || '').replace(/\s+/g, ' ');
      beatLog.push(txt.slice(0, 90));
      if (!p4Done && txt.includes('شش میلیون سکه بدهی')) { await page.waitForTimeout(1300); await shoot(page, '02-prologue-p4'); p4Done = true; continue; }
      if (!p6Done && txt.includes('کل بدهی به شش سندِ جدا تقسیم شده')) { await page.waitForTimeout(1300); await shoot(page, '03-prologue-p6-jahangir'); p6Done = true; continue; }
      if (p4Done && p6Done) {
        const skip = page.locator('button:has-text("رد کردن صحنه"), button:has-text("رد کردن کات‌سین"), button:has-text("Skip")');
        if (await skip.count()) { await skip.first().click({ force: true }); await page.waitForTimeout(300); continue; }
      }
      const btn = page.locator('[data-scene-id] button:has-text("پایان"), [data-scene-id] button:has-text("ادامه")').last();
      if (await btn.count()) { await btn.click({ force: true, timeout: 5_000 }).catch(() => {}); }
      else {
        const any = page.locator('[data-scene-id] button').last();
        if (await any.count()) await any.click({ force: true, timeout: 4_000 }).catch(() => {});
      }
      await page.waitForTimeout(520);
    }
    metrics.__beatLog = beatLog;
    metrics.__mid = { p4Done, p6Done };
    await page.waitForTimeout(500);
    await shoot(page, '04-farm-hud-day1');

    // ۱۷ مودال در حالتِ گیم‌پلی
    for (const id of MODAL_IDS) {
      await page.evaluate((m) => window.__gameApi.openModal(m), id);
      await page.waitForTimeout(450);
      await shoot(page, `10-modal-${id}`);
      await shootScrollBottom(page, `11-modal-${id}-bottom`, id);
    }
    await page.evaluate(() => window.__gameApi.openModal(null));

    // صحنه‌های دنیا (کلِ نقشه + تابلوها/نشانه‌ها)
    for (const sc of SCENES) {
      await page.evaluate((s) => window.__gameApi.setEnv({ scene: s }), sc);
      await page.waitForTimeout(400);
      await shoot(page, `30-scene-${sc}`);
    }

    // HUD شب/باران
    await page.evaluate(() => window.__gameApi.setEnv({ scene: 'farm', hour: 21, weather: 1 }));
    await page.waitForTimeout(400);
    await shoot(page, '40-farm-night-rain');

    // عمودیِ واقعی (قبل از چرخشِ گوشی): کانتکستِ جدا چون ریزِ same-context در امولیشن موبایل خطا می‌دهد
    const pctx = await browser.newContext({
      viewport: { width: 360, height: 740 },
      deviceScaleFactor: 2,
      locale: 'fa-IR',
      userAgent: UA,
    });
    const pp = await pctx.newPage();
    await pp.goto(BASE);
    await pp.waitForFunction(() => Boolean(window.__gameApi), null, { timeout: 30_000 });
    await pp.evaluate(() => document.fonts.ready);
    await pp.locator('button').first().click();
    await pp.locator('[data-scene-id]').first().waitFor({ timeout: 15_000 });
    for (let i = 0; i < 60 && (await pp.locator('[data-scene-id]').count()); i++) {
      const skip = pp.locator('button:has-text("رد کردن صحنه"), button:has-text("رد کردن کات‌سین"), button:has-text("Skip")');
      if (await skip.count()) { await skip.first().click({ force: true }); await pp.waitForTimeout(250); continue; }
      const adv = pp.locator('[data-scene-id] button:has-text("پایان"), [data-scene-id] button:has-text("ادامه")').last();
      if (await adv.count()) await adv.click({ force: true }).catch(() => {});
      await pp.waitForTimeout(420);
    }
    const ack = pp.getByRole('button', { name: 'ادامه با همین حالت' });
    try {
      await ack.waitFor({ state: 'visible', timeout: 8_000 });
      await shoot(pp, '50-portrait-hint');
      await ack.click();
      await pp.waitForTimeout(500);
      await shoot(pp, '51-portrait-hud');
      await pp.evaluate(() => window.__gameApi.openModal('inv'));
      await pp.waitForTimeout(450);
      await shoot(pp, '52-portrait-inv');
      await shootScrollBottom(pp, '52-portrait-inv-bottom', 'portrait-inv');
      await pp.evaluate(() => window.__gameApi.openModal('quests'));
      await pp.waitForTimeout(450);
      await shoot(pp, '53-portrait-quests');
      await shootScrollBottom(pp, '53-portrait-quests-bottom', 'portrait-quests');
      await pp.evaluate(() => window.__gameApi.openModal(null));
      await pp.waitForTimeout(300);
      await shoot(pp, '54-portrait-world');
    } catch (e) {
      log('portrait hint did not appear:', e.message);
      await shoot(pp, '51-portrait-hud');
    }
    await pctx.close();

    writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify({ shots, metrics, pageErrors }, null, 2));
    log('DONE ->', OUT, '· shots:', shots.length, '· pageErrors:', pageErrors.length);
    const findings = Object.entries(metrics).flatMap(([name, m]) => {
      if (!m || !Array.isArray(m.tinyText)) return [];
      const bad = [
        m.overflowX ? `overflowX=${m.overflowX}` : '',
        m.tinyText.length ? `tinyText=${m.tinyText.length}` : '',
        m.smallButtons.length ? `smallButtons=${m.smallButtons.length}` : '',
        m.overlaps.length ? `overlaps=${m.overlaps.length}` : '',
      ].filter(Boolean);
      return bad.length ? [`${name}: ${bad.join(', ')}`] : [];
    });
    for (const [id, sc] of Object.entries(metrics.__scrolls || {})) {
      if (!sc.reachedBottom) findings.push(`scroll ${id}: did not reach bottom`);
    }
    if (pageErrors.length) findings.push(`pageErrors=${pageErrors.length}`);
    if (!metrics.__mid?.p4Done || !metrics.__mid?.p6Done) findings.push('prologue: p4/p6 capture incomplete');
    if (findings.length) {
      console.error('MOBILE_AUDIT_FAILED\n' + findings.join('\n'));
      process.exitCode = 1;
    } else log('METRICS CLEAN · fonts, overflow, hit-tested overlaps and modal scrolling');

  } finally {
    await browser.close();
    prev.kill('SIGTERM');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
