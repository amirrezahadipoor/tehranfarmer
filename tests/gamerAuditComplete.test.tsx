import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { installDom } from './helpers/dom';
import {
  S, UI, addXp, animalSellPrice, buyAnimal, canAct, doAct, penCap,
  penOccupied, performPlayerPlotSweep, playerToolPlots, resetGame, sellAnimal, transferPackToBarn,
} from '../src/game/state';
import { CFG } from '../src/game/settings';
import { UT } from '../src/strings/uiText';
import { GT } from '../src/strings/gameText';
import { makeAnimal } from '../src/game/rig';
import { handleFarmAnimalTap, liveAnimalScale } from '../src/game/farmVisuals';
import { Hud } from '../src/ui/Hud';
import { Modals } from '../src/ui/Modals';

beforeAll(() => { installDom(); });

describe('Gamer-Eye Full Audit Regression Suite (Strings, Livestock Sex & Caps, Farming AoE & Visuals)', () => {
  beforeEach(() => {
    localStorage.clear();
    resetGame();
    CFG.locale = 'fa';
    UI.started = true;
    UI.scene = 'farm';
    UI.modal = null;
    UI.info = null;
  });

  it('Plot Inspector (Hud Info) displays accurate localized states with zero Ledger string collisions', () => {
    S.plots[0] = { st: 1, crop: null, prog: 0, water: 0.5, fert: 0.5, last: 'wheat', dead: false, dry: 0, ripe: false, n: 0 };
    UI.info = { plot: 0, x: 240, y: 240 };
    const txt1 = renderToString(<Hud />);
    expect(txt1).not.toContain('هنوز سندی');
    expect(txt1).not.toContain('حداقل قسط');
    expect(txt1).toContain('شخم‌خورده');
    expect(txt1).toContain('تناوب');

    S.plots[0] = { st: 2, crop: 'tomato', prog: 1, water: 0.8, fert: 0.7, last: null, dead: false, dry: 0, ripe: true, n: 1 };
    const txt2 = renderToString(<Hud />);
    expect(txt2).toContain('رسیده');
    expect(txt2).toContain('چین برداشت');
    expect(txt2).not.toContain('سند فعال');

    CFG.locale = 'en';
    S.plots[0] = { st: 2, crop: 'wheat', prog: 0.4, water: 0, fert: 0.5, last: null, dead: true, dry: 3, ripe: false, n: 0 };
    const txt3 = renderToString(<Hud />);
    expect(txt3).toContain('Withered');
    expect(txt3).not.toContain('Active Deed');
  });

  it('Market per-stack button shows All / همه instead of Pay Full Deed / تسویهٔ سند', () => {
    S.inv.wheat = 12;
    UI.modal = 'market';
    const faHtml = renderToString(<Modals />);
    expect(faHtml).not.toContain('تسویهٔ سند');
    expect(faHtml).toContain('همه');

    CFG.locale = 'en';
    const enHtml = renderToString(<Modals />);
    expect(enHtml).not.toContain('Pay Full Deed');
    expect(enHtml).toContain('All');
  });

  it('Level-up toast celebrates reaching level rather than printing Requires Level', () => {
    CFG.locale = 'en';
    UI.toasts = [];
    addXp(500);
    const msgs = UI.toasts.map((t) => t.text).join(' | ');
    expect(msgs).toContain('Reached Level');
    expect(msgs).not.toContain('Requires Level 2!');
  });

  it('Livestock explicit Male/Female buying, nest/pregnancy slot occupancy, and ranch selling work cleanly', () => {
    S.coins = 50_000;
    S.pens.chicken = 1; // cap = 3
    S.animals = [];
    S.nests = [];

    for (let i = 0; i < 2; i++) buyAnimal('chicken', 'f');
    expect(S.animals.map((a) => a.sex)).toEqual(['f', 'f']);

    S.nests = [{ id: 1, kind: 'chicken', hatch: 2 }];
    expect(penOccupied('chicken')).toBe(penCap('chicken'));

    UI.modal = 'animal';
    const shopText = renderToString(<Modals />).replace(/<[^>]*>/g, '');
    expect(shopText).toContain('۳/۳');
    expect(shopText).toContain('رزرو زادوولد: ۱');
    expect(shopText).toContain('ارتقای حصار به ۵');

    for (const a of S.animals) a.ready = 3;
    const coinsBefore = S.coins;
    expect(sellAnimal('chicken', 'f')).toBe(true);

    expect(S.inv.egg).toBe(3);
    expect(S.coins).toBe(coinsBefore + animalSellPrice('chicken'));
    expect(penOccupied('chicken')).toBe(2);

    buyAnimal('chicken', 'm');
    expect(S.animals.map((a) => a.sex).sort()).toEqual(['f', 'm']);
  });

  it('All 6 species generate distinct male/female rigs, scale babies down, and allow one-tap farm healing', () => {
    for (const kind of ['chicken', 'duck', 'cow', 'sheep', 'goat', 'rabbit'] as const) {
      const fem = makeAnimal(kind, 0, 'f');
      const mal = makeAnimal(kind, 0, 'm');
      expect(fem.head.p).not.toBe(mal.head.p);
      expect(fem.body.p).not.toBe(mal.body.p);
    }

    const baby = { id: 9, kind: 'cow' as const, ready: 0, hue: 0, sex: 'f' as const, grown: 3 };
    const adult = { id: 10, kind: 'cow' as const, ready: 0, hue: 0, sex: 'm' as const, grown: 0, sick: true };
    expect(liveAnimalScale(0.5, baby)).toBeLessThan(liveAnimalScale(0.5, adult));

    S.animals = [adult];
    S.coins = 500;
    expect(handleFarmAnimalTap(adult)).toBe('handled');
    expect(adult.sick).toBeFalsy();
  });

  it('Upgraded field tools apply 3x3 sweep across till, plant, water, fert & harvest and auto-switch empty seed stacks', () => {
    S.lv.land = 4;
    S.lv.hoe = 4;
    S.lv.can = 4;
    S.lv.bag = 6; // کولهٔ بزرگ تا ظرفیت، آزمون جاروی AoE را محدود نکند
    S.stamina = 100;
    S.can = 20;
    S.fert = 15;
    S.seeds = { wheat: 5, carrot: 6 };
    UI.seed = 'wheat';

    expect(playerToolPlots(9, 'plant').length).toBe(9);
    expect(playerToolPlots(9, 'harvest').length).toBe(9);
    expect(playerToolPlots(9, 'fert').length).toBe(9);

    expect(performPlayerPlotSweep(9, 'till', canAct, doAct, () => 0.99).length).toBe(9);

    const plantHits = performPlayerPlotSweep(9, 'plant', canAct, doAct, () => 0.99);
    expect(plantHits.length).toBe(9);
    expect(UI.seed).toBe('carrot');
    expect(S.seeds.wheat ?? 0).toBe(0);
    expect(S.seeds.carrot ?? 0).toBe(2);

    expect(performPlayerPlotSweep(9, 'fert', canAct, doAct, () => 0.99).length).toBe(9);
    expect(S.fert).toBe(6);
    expect(performPlayerPlotSweep(9, 'water', canAct, doAct, () => 0.99).length).toBe(9);

    for (const h of plantHits) S.plots[h.plot].ripe = true;
    const harvHits = performPlayerPlotSweep(9, 'harvest', canAct, doAct, () => 0.99);
    expect(harvHits.length).toBe(9);
    transferPackToBarn(); // کولهٔ بازیکن پس از برداشت به انبار تخلیه می‌شود
    expect((S.inv.wheat ?? 0) + (S.inv.carrot ?? 0)).toBeGreaterThanOrEqual(20);
  });

  it('Every UT.* and GT.* key across all src/ modules resolves cleanly in both FA & EN, and all modals render zero undefined/NaN', () => {
    const walk = (d: string): string[] =>
      fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(path.join(d, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [path.join(d, e.name)] : [],
      );
    const bad: string[] = [];
    for (const f of walk('src')) {
      const src = fs.readFileSync(f, 'utf8');
      for (const m of src.matchAll(/\b(UT|GT)\.([A-Za-z0-9_]+)/g)) {
        const [, ns, key] = m;
        for (const loc of ['fa', 'en'] as const) {
          CFG.locale = loc;
          const obj = ns === 'UT' ? (UT as Record<string, unknown>) : (GT as Record<string, unknown>);
          const val = obj[key];
          if (typeof val !== 'string' || val.includes('undefined')) {
            bad.push(`${f}: ${ns}.${key} [${loc}] => ${String(val)}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);

    S.pens = { chicken: 1, rabbit: 2, duck: 2, sheep: 2, goat: 2, cow: 2 };
    S.animals = [
      { id: 1, kind: 'chicken', ready: 1, hue: 0, sex: 'f', grown: 0 },
      { id: 2, kind: 'chicken', ready: 0, hue: 1, sex: 'm', grown: 0 },
      { id: 3, kind: 'cow', ready: 1, hue: 0, sex: 'f', grown: 0, sick: true },
    ];
    const modals: NonNullable<typeof UI.modal>[] = ['seed', 'market', 'work', 'carp', 'estate', 'animal', 'inv', 'menu', 'auto', 'pond', 'hive', 'achieve', 'ledger', 'quests', 'museum'];
    for (const loc of ['fa', 'en'] as const) {
      CFG.locale = loc;
      for (const m of modals) {
        UI.modal = m;
        const html = renderToString(<Modals />);
        expect(html).not.toContain('undefined');
        expect(html).not.toContain('NaN');
      }
    }
  });
});
