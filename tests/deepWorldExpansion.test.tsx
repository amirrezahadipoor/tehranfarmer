import '../src/strings/en';
import { renderToString } from 'react-dom/server';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { installDom } from './helpers/dom';
import { CFG } from '../src/game/settings';
import {
  S, UI, catchRegionalFish, craftArtisan, effectiveMachinePrice, exportSaveJson, goodPrice, importSaveJson, resetGame, sellGood,
} from '../src/game/state';
import { interestOf, payDebt, raidAmount, startDebt, stashCap } from '../src/game/core/debt';
import {
  ROYAL_DECREES, activeCharter, activeFrontierNodes, checkSeamlessEdgePortal, chooseVillageCharter,
  completeFestivalContest, currentRegionalShock, ensureFrontier, fulfillRoyalDecree, harvestFrontierNode,
  hasMonocultureSaturation, isTownFestivalActive, judgeFestivalSubmission, redeemFestivalTokens,
  ringTownFestivalBell, rollCaveGem, stepFrontierLayer, useFrontierLandmark,
} from '../src/game/core/frontier';
import { caveBG, drawTownWorldExpansions, forestBG, renderFrontierScene } from '../src/game/frontierScenes';
import { makeFarmer, PAL_PLAYER } from '../src/game/rig';
import { SCENE_CHOICES, applyDialogueChoice } from '../src/story/socialVillagers';
import { skipActiveCutscene, triggerCutscene } from '../src/story/engine';
import { FishingModal } from '../src/ui/FishingModal';
import { FestivalModal } from '../src/ui/FestivalModal';
import { WorldAtlasModal } from '../src/ui/WorldAtlasModal';

describe('Deep 4-Pillar World, Skill Minigames, Branching Charters & Late-Game Economy Suite', () => {
  beforeAll(() => {
    installDom();
  });

  beforeEach(() => {
    CFG.locale = 'fa';
    resetGame();
    S.story.prologueSeen = true;
    S.story.chapter = 6;
    startDebt(4);
    S.stamina = 100;
    S.coins = 25000;
  });

  it('1. Skill-Based Minigames: Physical River Tension-Reel Angling & 4-Tab Town Square Seasonal Festival', () => {
    S.rod = 2;
    UI.scene = 'river';
    UI.modal = 'fishing';
    const fishHtml = renderToString(<FishingModal />);
    expect(fishHtml).toContain('کشش قلاب');

    // Skill precision catch (Perfect 1.85x multiplier) awards real fish & updates inventory cleanly
    const catchRes = catchRegionalFish(1.85);
    expect(catchRes.qty).toBeGreaterThanOrEqual(1);
    // دوسیستمی: صید دستی اول به کولهٔ پشتی می‌رود (سپس با تخلیه به انبار)
    expect((S.inv.fish ?? 0) + (S.inv.roe ?? 0) + (S.pack.fish ?? 0) + (S.pack.roe ?? 0)).toBeGreaterThanOrEqual(1);

    // Town Square Seasonal Fair: Ring Bell -> Multi-Category Harvest Judging -> Cauldron & Archery -> Redeem Prize Stall
    expect(ringTownFestivalBell()).toBe(true);
    expect(isTownFestivalActive()).toBe(true);

    S.inv.saffron = 3;
    S.inv.cheese = 3;
    S.inv.turquoise = 2;
    const judged = judgeFestivalSubmission(['saffron', 'cheese', 'turquoise']);
    expect(judged).not.toBeNull();
    expect(judged!.rank).toBe(1);
    expect(ensureFrontier().festivalTokens).toBeGreaterThanOrEqual(5);

    const stirRes = completeFestivalContest('cauldron', 0.9);
    const archRes = completeFestivalContest('archery', 0.85);
    expect(stirRes!.coins).toBeGreaterThan(500);
    expect(archRes!.tokens).toBeGreaterThanOrEqual(4);

    const seedsBefore = S.seeds.saffron ?? 0;
    expect(redeemFestivalTokens('saffron')).toBe(true);
    expect(S.seeds.saffron).toBe(seedsBefore + 3);

    // Full clean English (EN) render across all 3 new Modals with zero Persian leakage
    CFG.locale = 'en';
    expect(/[\u0600-\u06FF]/.test(renderToString(<FishingModal />))).toBe(false);
    expect(/[\u0600-\u06FF]/.test(renderToString(<FestivalModal />))).toBe(false);
    expect(/[\u0600-\u06FF]/.test(renderToString(<WorldAtlasModal />))).toBe(false);
    CFG.locale = 'fa';
  });

  it('2. Multi-Choice Branching Story Arcs (note-open-1..4): Permanent Village Charters reshape Economy, Debt, Builds & Skip', () => {
    expect(SCENE_CHOICES['note-open-1']).toBeDefined();
    expect(SCENE_CHOICES['note-open-2']).toBeDefined();
    expect(SCENE_CHOICES['note-open-3']).toBeDefined();
    expect(SCENE_CHOICES['note-open-4']).toBeDefined();

    S.coins = 50000;
    const baseMilk = goodPrice('milk');
    const baseSaffron = goodPrice('saffron');
    const baseTractor = effectiveMachinePrice('tractor', 1);
    const baseInterest = interestOf();
    const baseStash = stashCap();
    const baseRaid = raidAmount();

    applyDialogueChoice('note-open-1', 0); // bazaar = 'coop'
    expect(activeCharter('bazaar')).toBe('coop');
    expect(goodPrice('milk')).toBeGreaterThan(baseMilk);

    applyDialogueChoice('note-open-1', 1); // bazaar = 'caravan'
    expect(activeCharter('bazaar')).toBe('caravan');
    expect(goodPrice('saffron')).toBeGreaterThan(baseSaffron);

    applyDialogueChoice('note-open-3', 1); // qanat = 'turbine'
    expect(activeCharter('qanat')).toBe('turbine');
    expect(effectiveMachinePrice('tractor', 1)).toBeLessThan(baseTractor);

    applyDialogueChoice('note-open-4', 0); // bank = 'credit'
    expect(activeCharter('bank')).toBe('credit');
    expect(interestOf()).toBeLessThan(baseInterest);
    expect(stashCap()).toBeGreaterThan(baseStash);

    chooseVillageCharter('bank', 'council');
    expect(raidAmount()).toBeLessThan(baseRaid);

    // Skip guarantee: skipping an unchosen charter cutscene preserves permanent charter ratification!
    ensureFrontier().charters = {};
    delete S.story.seen['note-open-2'];
    delete S.story.seen['choice:note-open-2'];
    triggerCutscene('note-open-2', { forceReplay: true });
    skipActiveCutscene();
    expect(activeCharter('frontier')).toBe('sanctuary');
    expect(payDebt).toBeTypeOf('function');
  });

  it('3. Late-Game (Lv 22+) Monoculture Saturation, Rotating Shocks, Royal Decrees & Frontier Artisan Crafting', () => {
    S.xp = 950000;
    S.day = 1;
    expect(currentRegionalShock().id).toBe('royal-banquet');

    S.inv.olive = 90;
    S.inv.pistachio = 20;
    const pistBefore = goodPrice('pistachio');
    const oliveBefore = goodPrice('olive');

    sellGood('olive', 75);
    expect(hasMonocultureSaturation()).toBe(true);
    S.dem.olive = 1;
    S.dem.pistachio = 1;
    expect(goodPrice('olive')).toBeLessThan(oliveBefore);
    expect(goodPrice('pistachio')).toBeGreaterThan(pistBefore);

    S.inv.pomegranate = 6;
    S.inv.cheese = 5;
    S.inv.amber = 2;
    S.inv.truffle = 2;
    const coinsBefore = S.coins;
    expect(fulfillRoyalDecree(ROYAL_DECREES[2].id)).toBe(true);
    expect(S.coins).toBeGreaterThan(coinsBefore + 9000);

    S.stamina = 40;
    S.inv.herb = 4;
    S.inv.honey = 2;
    S.inv.turquoise = 2;
    S.inv.quartz = 2;
    S.inv.saffron = 2;
    expect(craftArtisan('herbal-elixir', 1)).toBe(1);
    expect(S.stamina).toBeGreaterThan(75);
    expect(craftArtisan('turquoise-amulet', 1)).toBe(1);
  });

  it('4a. Cave rolls allow empty strikes and make the rarest gem genuinely rare but possible', () => {
    expect(rollCaveGem(1, () => 0)).toBeNull();
    const rolls = [0.99, 0.999999999];
    expect(rollCaveGem(1, () => rolls.shift() ?? 0.99)).toEqual({ good: 'diamond', qty: 1 });
  });

  it('4. Seamless 8-Region Portals + 3-Floor Crystal Cavern + 3-Glade Misty Forest + Canvas Render + Save/Load', () => {
    expect(checkSeamlessEdgePortal('farm', 1236, 336)).toBe('town');
    expect(checkSeamlessEdgePortal('town', 48, 590)).toBe('farm');
    expect(checkSeamlessEdgePortal('farm', 48, 605)).toBe('river');
    expect(checkSeamlessEdgePortal('river', 52, 560)).toBe('cave');
    expect(checkSeamlessEdgePortal('cave', 54, 590)).toBe('river');
    expect(checkSeamlessEdgePortal('farm', 308, 678)).toBe('apiary');
    expect(checkSeamlessEdgePortal('apiary', 52, 590)).toBe('forest');
    expect(checkSeamlessEdgePortal('forest', 54, 590)).toBe('apiary');

    S.stamina = 1000;
    expect(stepFrontierLayer('cave', 1)).toBe(false);
    // ضربهٔ قطعی: غنیمت خالی + کشف پله؛ ظاهر سنگ همچنان خنثی می‌ماند.
    expect(harvestFrontierNode('cave', 0, () => 0)?.qty).toBe(0);
    expect(ensureFrontier().stairsFound['cave:1']).toBe(true);
    expect(stepFrontierLayer('cave', 1)).toBe(true);
    expect(ensureFrontier().caveFloor).toBe(2);
    expect(activeFrontierNodes('cave').every((n) => n.good === 'quartz')).toBe(true);
    expect(harvestFrontierNode('cave', 0, () => 0)?.qty).toBe(0);
    expect(ensureFrontier().stairsFound['cave:2']).toBe(true);
    expect(stepFrontierLayer('cave', 1)).toBe(true);
    expect(ensureFrontier().caveFloor).toBe(3);
    expect(useFrontierLandmark('cave')).toBe(false);

    S.stamina = 150;
    expect(harvestFrontierNode('forest', 0)?.good).toBe('herb');
    expect(harvestFrontierNode('forest', 1)).not.toBeNull();
    expect(stepFrontierLayer('forest', 1)).toBe(true);
    expect(harvestFrontierNode('forest', 0)?.good).toBe('mushroom');
    expect(harvestFrontierNode('forest', 1)).not.toBeNull();
    expect(stepFrontierLayer('forest', 1)).toBe(true);
    expect(activeFrontierNodes('forest').some((n) => n.good === 'truffle')).toBe(true);
    expect(useFrontierLandmark('forest')).toBe(true);

    const cBg = caveBG(0, 3);
    const fBg = forestBG(2, 3);
    const ctx = cBg.getContext('2d')!;
    const dummyFarmer = {
      x: 520, y: 560, face: 1, rig: makeFarmer(PAL_PLAYER), ph: 0,
      mode: 'idle' as const, kind: '', p: 0, tasks: [], cur: null, hitDone: false, speed: 220, player: true, wait: 0,
    };
    renderFrontierScene(ctx, 'cave', cBg, 1.5, dummyFarmer, []);
    renderFrontierScene(ctx, 'forest', fBg, 2.5, dummyFarmer, []);
    drawTownWorldExpansions(ctx, 3.0);

    const snap = exportSaveJson();
    resetGame();
    expect(importSaveJson(snap)).toBe(true);
    expect(ensureFrontier().caveFloor).toBe(3);
    expect(ensureFrontier().forestLayer).toBe(3);
  });
});
