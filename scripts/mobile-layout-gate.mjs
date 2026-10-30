/* گیت کوچک و قطعی برای دو رگرسیون موبایل؛ روی build:e2e و preview 4173 اجرا می‌شود. */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(import.meta.dirname, '..');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';
const OUT = process.env.AUDIT_DIR || path.resolve(ROOT, '..', 'tehranfarmer-review', 'mobile-layout-gate');
const fixture = readFileSync(path.join(ROOT, 'e2e/fixtures/mobile-layout-save.json'), 'utf8');
const report = { generatedAt: new Date().toISOString(), base: BASE, cases: [], failures: [] };
mkdirSync(OUT, { recursive: true });

async function boot(page, portrait = false) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('start-screen').waitFor({ timeout: 25_000 });
  const cont = page.getByRole('button', { name: /ادامه|Continue/i }).first();
  await cont.waitFor({ timeout: 15_000 });
  await cont.click();
  await page.waitForFunction(() => Boolean(window.__gameApi), null, { timeout: 25_000 });
  if (portrait) {
    const ack = page.locator('[data-portrait-continue="1"]');
    await ack.waitFor({ state: 'visible', timeout: 10_000 });
    await ack.click();
  }
  await page.waitForTimeout(250);
}

async function checkBuilds(page, width, locale) {
  const found = await page.evaluate(() => {
    const labels = [...document.querySelectorAll('[data-build-label], .min-w-0.flex-1 > div:first-child')]
      .filter((el) => el.getBoundingClientRect().width > 0)
      .map((el) => {
        const r = el.getBoundingClientRect();
        const card = el.closest('[data-build-card]') || el.closest('.paper');
        const cr = card?.getBoundingClientRect();
        return {
          text: (el.textContent || '').trim(), client: el.clientWidth, scroll: el.scrollWidth,
          height: r.height, card: cr ? { left: cr.left, right: cr.right, top: cr.top, bottom: cr.bottom } : null,
          fullAccessible: !!el.getAttribute('title') || !!el.closest('[aria-label]'),
        };
      });
    return { labels, pageWidth: document.documentElement.scrollWidth, viewport: innerWidth };
  });
  const errors = [];
  if (found.labels.length !== 2) errors.push(`expected two build labels, got ${found.labels.length}`);
  for (const x of found.labels) {
    if (x.scroll > x.client + 3) errors.push(`clipped build name: ${x.text} (${x.client}/${x.scroll})`);
    if (!x.fullAccessible) errors.push(`full build name is not exposed: ${x.text}`);
    if (x.card && (x.card.left < -2 || x.card.right > width + 2)) errors.push(`build card outside viewport: ${x.text}`);
  }
  if (found.pageWidth > found.viewport + 1) errors.push(`page horizontal overflow: ${found.pageWidth}/${found.viewport}`);
  return { found, errors };
}

const browser = await chromium.launch({ headless: true });
try {
  for (const width of [640, 800]) {
    for (const locale of ['fa', 'en']) {
      const context = await browser.newContext({ viewport: { width, height: 360 }, hasTouch: true, isMobile: true, locale: locale === 'fa' ? 'fa-IR' : 'en-US' });
      await context.addInitScript(({ fixture, locale }) => {
        localStorage.setItem('mazrae-rangi-save-v1', fixture);
        localStorage.setItem('mazrae-rangi-settings-v1', JSON.stringify({ locale, fontScale: 1.2, sound: false, music: false, reduceMotion: true }));
        document.documentElement.style.setProperty('--safe-left', '20px');
        document.documentElement.style.setProperty('--safe-right', '20px');
      }, { fixture, locale });
      const page = await context.newPage();
      await boot(page);
      const result = await checkBuilds(page, width, locale);
      const rec = { kind: 'builds', width, locale, ...result };
      report.cases.push(rec);
      if (result.errors.length) report.failures.push(rec);
      await page.screenshot({ path: path.join(OUT, `builds-${width}-${locale}.png`), animations: 'disabled' });
      await context.close();
    }
  }
  for (const height of [740, 800]) {
    const context = await browser.newContext({ viewport: { width: 360, height }, hasTouch: true, isMobile: true, locale: 'fa-IR' });
    await context.addInitScript((fixture) => {
      localStorage.setItem('mazrae-rangi-save-v1', fixture);
      localStorage.setItem('mazrae-rangi-settings-v1', JSON.stringify({ locale: 'fa', fontScale: 1.2, sound: false, music: false, reduceMotion: true }));
    }, fixture);
    const page = await context.newPage();
    await boot(page, true);
    const hint = page.locator('[data-portrait-hint="1"], button.paper-dark.fixed').first();
    await hint.waitFor({ state: 'visible', timeout: 8_000 });
    const box = await hint.boundingBox();
    const errors = [];
    if (!box || box.height < 48) errors.push(`portrait hint height ${box?.height ?? 0} < 48`);
    if (box && (box.left < -2 || box.left + box.width > 362)) errors.push('portrait hint outside viewport');
    const rec = { kind: 'portrait', width: 360, height, box, errors };
    report.cases.push(rec);
    if (errors.length) report.failures.push(rec);
    await page.screenshot({ path: path.join(OUT, `portrait-360-${height}.png`), animations: 'disabled' });
    if (box) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    if (await hint.isVisible().catch(() => false)) report.failures.push({ kind: 'portrait-tap', height, errors: ['hint did not close after real tap'] });
    await context.close();
  }
} finally {
  await browser.close();
  writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ cases: report.cases.length, failures: report.failures.length, out: OUT }, null, 2));
if (report.failures.length) {
  for (const f of report.failures) console.error(f.kind, f.errors);
  process.exitCode = 1;
}
