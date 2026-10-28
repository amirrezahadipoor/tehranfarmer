import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { installDom } from './helpers/dom';
import { S, UI, advance, doAct, resetGame, tickBuilds } from './helpers/game';
import { canCap } from '../src/game/state';
import { animalQualityMult, buyWell, cureAnimal, deliverContract, infectAnimal, offerContract, signContract } from '../src/game/core/farmDeep';
import { Modals } from '../src/ui/Modals';

beforeAll(() => { installDom(); });
beforeEach(() => { localStorage.clear(); resetGame(); UI.started = true; });

describe('دام: بیماری، درمان و کیفیت محصول (P6-03)', () => {
  it('دام بیمار تولید را متوقف می‌کند، درمان با دارو آن را برمی‌گرداند و حصار ارتقایافته کیفیت را بالا می‌برد', () => {
    S.trough = 20;
    const hen = S.animals.find((a) => a.sex === 'f')!;
    expect(infectAnimal(hen.id)).toBe(true);
    expect(hen.sick).toBe(true);

    UI.modal = 'animal';
    expect(renderToString(<Modals />)).toContain('data-vet-clinic="1"');
    UI.modal = null;

    advance(24);
    expect(hen.ready).toBe(0);

    const c0 = S.coins;
    expect(cureAnimal(hen.id)).toBe(true);
    expect(S.coins).toBeLessThan(c0);
    expect(hen.sick).toBeFalsy();

    S.pens.chicken = 3;
    expect(animalQualityMult('chicken')).toBeGreaterThan(1.2);
    advance(24);
    expect(hen.ready).toBeGreaterThanOrEqual(5);
  });

  it('چاه قطره‌ای تبخیر آب را کم و ظرفیت آب‌پاش را زیاد می‌کند و تناوب کشت خاک را غنی می‌سازد (P6-04)', () => {
    S.coins = 50000;
    S.xp = 50000;
    const cap0 = canCap();
    buyWell();
    tickBuilds(100);
    expect(S.wellLv).toBe(1);
    expect(canCap()).toBeGreaterThan(cap0);

    // مقایسهٔ تبخیر آب با و بدون چاه
    S.weather = 0;
    S.plots[0].st = 2; S.plots[0].crop = 'wheat'; S.plots[0].water = 1;
    S.wellLv = 0;
    advance(6);
    const waterNoWell = S.plots[0].water;

    S.weather = 0;
    S.plots[1].st = 2; S.plots[1].crop = 'wheat'; S.plots[1].water = 1;
    S.wellLv = 3;
    advance(6);
    expect(S.plots[1].water).toBeGreaterThan(waterNoWell);

    // تناوب کشت (گندم به هویج) حاصلخیزی خاک را بالا می‌برد
    S.plots[2].st = 1;
    S.plots[2].last = 'wheat';
    S.plots[2].fert = 0.5;
    S.seeds.carrot = 3;
    doAct('plant', 2, true, 'carrot', true);
    expect(S.plots[2].fert).toBeGreaterThan(0.5);
  });

  it('قرارداد فروش بازار در صورت تحویل سود ویژه می‌دهد و با گذشت مهلت بیعانه می‌سوزد (P6-05)', () => {
    S.coins = 5000;
    const offer1 = offerContract();
    const cStart = S.coins;
    expect(signContract()).toBe(true);
    expect(S.coins).toBe(cStart - offer1.deposit);
    S.inv[offer1.good] = offer1.qty;
    expect(deliverContract()).toBe(true);
    expect(S.coins).toBeGreaterThanOrEqual(cStart - offer1.deposit + offer1.reward);
    expect(S.coins).toBeGreaterThan(cStart + offer1.qty * 10);
    expect(S.contract).toBeNull();

    // مسیر ضرر: عدم تحویل تا پایان مهلت قرارداد
    const cBeforeLoss = S.coins;
    const offer2 = offerContract();
    expect(signContract()).toBe(true);
    for (let d = 0; d < 7; d++) advance(24);
    expect(S.contract).toBeNull();
    expect(S.coins).toBe(cBeforeLoss - offer2.deposit);
  });

  it('۶ دستاورد تازه همسو با داستان، بدهی، مترسک، قلک، کوئست و قرارداد فعال و قابل دریافت‌اند (P6-06)', async () => {
    const { ACHS } = await import('../src/game/data');
    const { checkAch } = await import('../src/game/state');
    const { startDebt, payDebt, stashDeposit } = await import('../src/game/core/debt');
    expect(ACHS.length).toBeGreaterThanOrEqual(18);
    startDebt(0);
    S.coins = 50000;
    payDebt(15000);
    stashDeposit(3000);
    S.debt!.scarecrow = 2;
    S.story.chapter = 4;
    S.stats.quests = 5;
    S.stats.contracts = 2;
    checkAch();
    for (const id of ['debtPaid', 'chapter', 'scarecrow', 'stash', 'quests', 'contracts']) {
      expect(S.ach[id], `دستاورد ${id}`).toBeGreaterThanOrEqual(1);
    }
  });

  it('موزهٔ پایان‌بازی و تندیس جهانگیر پس از اتمام داستان باز و قابل بازدید می‌شوند (P6-07)', async () => {
    const { visitMuseum } = await import('../src/game/core/farmDeep');
    UI.modal = 'museum';
    expect(renderToString(<Modals />)).not.toContain('data-museum-hall="1"');
    expect(visitMuseum()).toBe(false);

    S.story.postgame = true;
    const html = renderToString(<Modals />);
    expect(html).toContain('data-museum-hall="1"');
    const c0 = S.coins;
    expect(visitMuseum()).toBe(true);
    expect(S.coins).toBeGreaterThan(c0);
    expect(visitMuseum()).toBe(false);
    UI.modal = null;
  });
});
