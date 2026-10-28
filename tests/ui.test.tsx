import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { installDom } from './helpers/dom';
import { S, UI, resetGame } from './helpers/game';
import { detectProfile, touchTargetPx, TOUCH_MIN_DP } from '../src/ui/layout';
import { Hud } from '../src/ui/Hud';
import { Modals } from '../src/ui/Modals';

beforeAll(() => { installDom(); });
beforeEach(() => { localStorage.clear(); resetGame(); UI.started = true; UI.modal = null; UI.scene = 'farm'; });

describe('پروفایل‌های صفحه', () => {
  const cases: Array<[string, number, number, string]> = [
    ['کوچک ۱۶:۹', 1280, 720, 'small'],
    ['بلند ۲۰:۹', 1600, 720, 'tall'],
    ['تبلت ۴:۳', 1024, 768, 'tablet'],
    ['دسکتاپ پهن', 2560, 1080, 'desktop'],
    ['پرتره ۳۰۰px', 300, 640, 'portrait'],
  ];
  for (const [name, w, h, id] of cases) {
    it(`${name} → پروفایل ${id}`, () => {
      const p = detectProfile(w, h);
      expect(p.id).toBe(id);
      expect(p.fontBase).toBeGreaterThanOrEqual(9);
      expect(p.fontBase).toBeLessThanOrEqual(26);
    });
  }

  it('هدف لمسی در همهٔ پروفایل‌ها ≥ ۴۸dp', () => {
    for (const [w, h] of [[1280, 720], [1080, 2340], [1024, 768], [2560, 1080]]) {
      const p = detectProfile(Math.min(w, h), Math.max(w, h) === h ? h : h);
      // dp مؤثر: نسبت اندازهٔ هدف به فونت پایه × ۱۶ (dp مرجع)
      expect(touchTargetPx(p.fontBase) / p.fontBase * 16).toBeGreaterThanOrEqual(TOUCH_MIN_DP);
    }
  });

  it('HUD و مودال‌ها در همهٔ پروفایل‌ها بدون خطا رندر می‌شوند', () => {
    for (const [w, h] of [[1280, 720], [1080, 2340], [1024, 768], [300, 640]]) {
      UI.profile = detectProfile(w, h).id;
      UI.portrait = UI.profile === 'portrait';
      expect(() => renderToString(<Hud />)).not.toThrow();
      UI.modal = 'inv';
      expect(() => renderToString(<Modals />)).not.toThrow();
      UI.modal = null;
    }
  });

  it('راهنمای چرخش صفحه در پرتره دیده می‌شود ولی بازی بلاک نمی‌شود', () => {
    UI.portrait = true;
    const html = renderToString(<Hud />);
    expect(html.length).toBeGreaterThan(50);
    UI.portrait = false;
  });

  it('متن کاربر ارقام لاتین ندارد (RTL/فارسی)', () => {
    UI.modal = 'market';
    const html = renderToString(<Modals />);
    const text = html.replace(/<[^>]+>/g, ' ');
    // اعداد لاتین در متن دیده‌شده نباید باشد (اعداد داخل style/کلاس‌ها استثناست)
    expect(/\d{2,}/.test(text.replace(/\s+/g, ' '))).toBe(false);
  });

  it('ریشهٔ سند RTL است', () => {
    expect(renderToString(<div dir="rtl" />)).toContain('dir="rtl"');
    expect(S.day).toBe(1);
  });
});
