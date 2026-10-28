import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { installDom } from './helpers/dom';
import { S, UI, resetGame } from './helpers/game';
import { Modals } from '../src/ui/Modals';
import { Hud } from '../src/ui/Hud';
import { BeatStage, Cutscene, canSkipBeating } from '../src/ui/Cutscene';
import { startDebt } from '../src/game/core/debt';
import { CFG, loadSettings, setShortBeat } from '../src/game/settings';

beforeAll(() => { installDom(); });

beforeEach(() => { localStorage.clear(); resetGame(); UI.started = true; UI.scene = 'farm'; UI.modal = null; });

const MODALS = ['seed', 'market', 'work', 'animal', 'inv', 'menu', 'auto', 'pond', 'hive', 'achieve', 'carp', 'estate', 'ledger', 'quests', 'museum', 'home', 'almanac'] as const;

const profiles: Array<[string, () => void]> = [
  ['تازه‌کار', () => { /* پیش‌فرض */ }],
  ['بدون سکه', () => { S.coins = 0; S.fert = 0; S.inv = {}; }],
  ['آخر بازی', () => {
    S.coins = 10 ** 7; S.day = 500; S.xp = 5e6; S.lv = { hoe: 5, can: 5, bag: 6, stam: 5, land: 4, soil: 3, barn: 5 };
    S.ponds = [1, 2, 3, 4, 5].map((i) => ({ id: i, stocked: true, grow: 3, feed: 5 }));
    S.hives = 12; S.honeyAcc = 300; S.gh = 2; S.silo = 2;
    S.animals = ['chicken', 'duck', 'sheep', 'goat', 'cow', 'rabbit'].flatMap((k, ki) =>
      [0, 1, 2].map((j) => ({ id: 100 + ki * 10 + j, kind: k as 'chicken', ready: 2, hue: j, sex: j % 2 ? 'm' as const : 'f' as const, grown: 0 })));
    S.pens = { chicken: 3, duck: 3, sheep: 3, goat: 3, cow: 3, rabbit: 3 };
    S.workers = 3;
  }],
  ['صف ساخت', () => {
    S.coins = 10 ** 6;
    S.builds = [
      { id: 1, kind: 'machine', key: 'sprinkler', label: 'آب‌پاش', icon: 'sprinkler', prog: 3, dur: 20 },
      { id: 2, kind: 'pen', key: 'cow', label: 'حصار گاو', icon: 'cow', prog: 5, dur: 40 },
    ];
  }],
  ['انبار خالی', () => { S.inv = {}; S.seeds = {}; S.fert = 0; }],
];

describe('رندر SSG مودال‌ها روی پروفایل‌های مختلف', () => {
  for (const [name, setup] of profiles) {
    it(`پروفایل ${name}: همهٔ ${MODALS.length} مودال بدون throw`, () => {
      setup();
      for (const m of MODALS) {
        UI.modal = m;
        expect(() => renderToString(<Modals />), `مودال ${m}`).not.toThrow();
      }
      UI.modal = null;
    });
  }

  it('کات‌سین داستان و خلاصهٔ ملاقات بدون throw', () => {
    S.story.pending = 'p1';
    expect(() => renderToString(<Cutscene />)).not.toThrow();
    S.story.pending = 'visit-due-missed';
    expect(() => renderToString(<Cutscene />)).not.toThrow();
    S.story.pending = null;
  });

  it('۳ انیمیشن متمایز کتک، رد کردن از بار سوم و تنظیم همیشه کوتاه کار می‌کنند', () => {
    startDebt(0);
    expect(canSkipBeating(1)).toBe(false);
    expect(canSkipBeating(2)).toBe(false);
    expect(canSkipBeating(3)).toBe(true);

    const htmls = ([0, 1, 2] as const).map((v) => renderToString(<BeatStage variant={v} />));
    expect(new Set(htmls).size).toBe(3);

    // پیش از بار سوم دکمهٔ رد کردن نمایش داده نمی‌شود
    S.debt!.beatings = 2;
    S.story.pending = 'visit-due-missed-1';
    expect(renderToString(<Cutscene />)).not.toContain('data-skip-beat="1"');

    // از بار سوم دکمهٔ رد کردن فعال است
    S.debt!.beatings = 3;
    expect(renderToString(<Cutscene />)).toContain('data-skip-beat="1"');
    S.story.pending = null;

    // تنظیم «همیشه کوتاه» جدا از سِیو بازی باقی می‌ماند
    setShortBeat(true);
    resetGame();
    loadSettings();
    expect(CFG.shortBeat).toBe(true);
    setShortBeat(false);
  });

  it('دفتر کل با سند فعال و راهنمای نرم اقتصادی رندر می‌شود', () => {
    startDebt(0);
    UI.modal = 'ledger';
    const html = renderToString(<Modals />);
    expect(html).toContain('data-advisor="1"');
    S.day = S.debt!.dueDay - 1;
    S.inv.wheat = 10;
    const hudHtml = renderToString(<Hud />);
    expect(hudHtml).toContain('بازار');
    UI.modal = null;
  });

  it('HUD در هر ۴ صحنه بدون throw رندر می‌شود', () => {
    for (const s of ['farm', 'town', 'river', 'apiary'] as const) {
      UI.scene = s;
      const html = renderToString(<Hud />);
      expect(html.length).toBeGreaterThan(100);
    }
  });

  it('HUD با چیپ بدهی رندر می‌شود', () => {
    startDebt(0);
    const html = renderToString(<Hud />);
    expect(html).toContain('بدهی');
  });

  it('HUD در حالت شب و پرتره بدون خطا', () => {
    S.hour = 22;
    UI.portrait = true;
    expect(() => renderToString(<Hud />)).not.toThrow();
    UI.portrait = false;
  });
});
