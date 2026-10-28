// ===== ممیزی خوانایی واقعی (رفع V-1) =====
// ROADMAP تسک W16-02 ادعا می‌کرد «ممیزی بصری با شرط فونت >= 11px سبز است» ولی هیچ آزمونی
// اندازهٔ font-size را نمی‌سنجید. این اسپک واقعاً در مرورگر اندازه می‌گیرد و اگر متنی
// کوچک‌تر از کف مجاز باشد، شکست می‌خورد (و در CI به‌جای ادعای مستند، سنجهٔ واقعی داریم).
import { expect, test } from '@playwright/test';

type Small = { text: string; px: number; sel: string };

const MIN_LEGIBLE_PX = 10.5;

async function measure(page: import('@playwright/test').Page): Promise<Small[]> {
  return page.evaluate(() => {
    const out: Array<{ text: string; px: number; sel: string }> = [];
    const root = document.querySelector('#root');
    if (!root) return out;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const raw = (node.textContent ?? '').trim();
      if (!raw) continue;
      const el = node.parentElement;
      if (!el) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const fs = parseFloat(cs.fontSize);
      if (!Number.isFinite(fs)) continue;
      out.push({ text: raw.slice(0, 40), px: Math.round(fs * 100) / 100, sel: el.tagName.toLowerCase() });
    }
    return out;
  });
}

const PROFILES = [
  { label: 'desktop-1280x720', w: 1280, h: 720 },
  { label: 'landscape-640x360', w: 640, h: 360 },
  { label: 'phone-915x412', w: 915, h: 412 },
];

for (const prof of PROFILES) {
  test(`خوانایی متن‌های HUD و صحنهٔ بازی روی ${prof.label}: هیچ متنی زیر ${MIN_LEGIBLE_PX}px نیست`, async ({ page }) => {
    await page.setViewportSize({ width: prof.w, height: prof.h });
    await page.goto('/');
    await page.waitForFunction(() => Boolean((window as unknown as { __gameApi?: unknown }).__gameApi), null, { timeout: 20_000 });
    await page.waitForTimeout(600);
    const items = await measure(page);
    expect(items.length).toBeGreaterThan(5);
    const tooSmall = items.filter((i) => i.px < MIN_LEGIBLE_PX).sort((a, b) => a.px - b.px);
    const report = tooSmall.slice(0, 12).map((i) => `${i.px}px «${i.text}» <${i.sel}>`).join(' | ');
    expect(tooSmall.length, `متن‌های زیر کف خوانایی در ${prof.label}: ${report}`).toBe(0);
  });
}

test('خوانایی در پنجره‌های اصلی بازی (کیف پول، بازار، دفتر کل، نامه‌ها)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as unknown as { __gameApi?: unknown }).__gameApi), null, { timeout: 20_000 });
  for (const modal of ['market', 'ledger', 'mail', 'quests', 'menu'] as const) {
    await page.evaluate((m) => (window as unknown as { __gameApi: { openModal: (x: string) => void } }).__gameApi.openModal(m), modal);
    await page.waitForTimeout(250);
    const items = await measure(page);
    const tooSmall = items.filter((i) => i.px < MIN_LEGIBLE_PX);
    const report = tooSmall.slice(0, 10).map((i) => `${i.px}px «${i.text}»`).join(' | ');
    expect(tooSmall.length, `متن ریز در مودال ${modal}: ${report}`).toBe(0);
    await page.evaluate(() => (window as unknown as { __gameApi: { openModal: (x: string) => void } }).__gameApi.openModal(''));
  }
});
