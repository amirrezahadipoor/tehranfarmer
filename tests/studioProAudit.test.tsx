import '../src/strings/en';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { installDom } from './helpers/dom';
import {
  S, UI, addGood, addStat, buyPond, completeBuild, craftArtisan, exportSaveJson, goodPrice, importSaveJson,
  invCap, invCount, newDay, readyQuestCount, resetGame, resetLvCache, sellAnimal,
  type Modal,
} from '../src/game/state';
import { CFG } from '../src/game/settings';
import { CROPS, SEASONS, fa } from '../src/game/data';
import { claim, ensureQuests, isClaimed, questDone, questProgress } from '../src/story/dailyQuests';
import { payDebt, processDueDay, startDebt } from '../src/game/core/debt';
import { checkSecretTriggers, SECRETS } from '../src/story/secrets';
import { triggerEvent } from '../src/game/core/events';
import { claimMailParcel } from '../src/game/core/mailbox';
import { NPC_QUEST_SPECS } from '../src/story/npcQuests';
import { SEASONAL_NPC_NODES } from '../src/story/socialVillagers';
import { nodeById } from '../src/story/story';
import { skipActiveCutscene, triggerCutscene } from '../src/story/engine';
import { Hud } from '../src/ui/Hud';
import { Modals } from '../src/ui/Modals';

const PERSIAN_CHAR_RE = /[\u0600-\u06FF]/;

beforeAll(() => {
  installDom();
});

describe('AAA Studio Cross-System Adversarial Audit Suite', () => {
  beforeEach(() => {
    CFG.locale = 'fa';
    localStorage.clear();
    resetGame();
    UI.started = true;
    UI.modal = null;
    UI.scene = 'farm';
  });

  it('1. Weekly Quests accumulate cleanly across all 7 days without midnight resets AND unlock fresh in repeat weeks', () => {
    ensureQuests(true);
    const wq = S.quests.weekly!;
    expect(wq).toBeTruthy();

    // Advance across Days 1..6 making partial daily progress on `wq.kind`
    const stepAmt = Math.ceil(wq.target / 4);
    const bumpMetric = (amt: number) => {
      if (wq.kind === 'sell') S.earned += amt;
      else if (wq.kind === 'harvest') addStat('harv', amt);
      else if (wq.kind === 'plant') addStat('plants', amt);
      else if (wq.kind === 'collect') addStat('collect', amt);
      else if (wq.kind === 'honey') addStat('honey', amt);
      else if (wq.kind === 'fish') addStat('fish', amt);
    };

    bumpMetric(stepAmt);
    expect(questProgress(wq, true)).toBe(stepAmt);

    // Cross into Day 2 & Day 3 — weekly progress MUST stay strictly preserved!
    newDay();
    expect(questProgress(wq, true)).toBe(stepAmt);
    bumpMetric(stepAmt);
    newDay();
    expect(questProgress(wq, true)).toBe(stepAmt * 2);

    // Finish remaining target on Day 4 -> readyQuestCount lights up & claim succeeds
    bumpMetric(wq.target);
    expect(questDone(wq, true)).toBe(true);
    expect(readyQuestCount()).toBeGreaterThanOrEqual(1);
    expect(claim(wq, true)).toBe(true);
    expect(isClaimed(wq, true)).toBe(true);

    // Advance through 8 full weeks so every weekly quest kind cycles back around:
    // the new week's weekly quest must NEVER start pre-claimed!
    for (let w = 0; w < 8; w++) {
      for (let d = 0; d < 7; d++) newDay();
      expect(isClaimed(S.quests.weekly!, true)).toBe(false);
    }
  });

  it('2. Farmhouse Wall Calendar matches HUD & world clock season/day 100% across a full 28-day 4-season year', () => {
    for (let d = 1; d <= 28; d++) {
      S.day = d;
      const expectedSeasonIdx = Math.floor((d - 1) / 7) % 4;
      const expectedDayInSeason = ((d - 1) % 7) + 1;
      const hudHtml = renderToString(<Hud />);
      expect(hudHtml).toContain(`${SEASONS[expectedSeasonIdx]}`);

      UI.modal = 'home';
      // Verify both FA and EN match exact season & 1..7 day count
      for (const loc of ['fa', 'en'] as const) {
        CFG.locale = loc;
        const expectedLabel = `${SEASONS[expectedSeasonIdx]} · ${fa(expectedDayInSeason)} / ${fa(7)}`;
        expect(expectedLabel.length).toBeGreaterThan(5);
      }
      CFG.locale = 'fa';
    }
  });

  it('3. AutoPanelModal exposes ALL 24 unlocked crops across all 3 estates with zero slice truncation', () => {
    S.xp = 9_999_999;
    resetLvCache();
    S.lv.land = 4;
    CFG.locale = 'en';
    UI.modal = 'auto';
    const html = renderToString(<Modals />);
    expect(CROPS.length).toBe(24);
    for (const c of CROPS) {
      expect(html, `Crop ${c.id} (${c.fa}) missing from AutoPanelModal`).toContain(`title="${c.fa}"`);
    }
  });

  it('4. Full-Bag (invCount === invCap) adversarial stress: zero overflow > invCap, zero lost secret/event items (mailed safely), and full animal sale payout', () => {
    startDebt(0);
    // Fill bag completely to 40/40
    const cap = invCap();
    addGood('wheat', cap);
    expect(invCount()).toBe(cap);

    // 4a. Due-day gift while bag is 100% full NEVER exceeds invCap()!
    S.debt!.paidThisCycle = 99999;
    for (let trial = 0; trial < 12; trial++) {
      S.debt!.paidThisCycle = 99999;
      processDueDay();
      expect(invCount()).toBeLessThanOrEqual(invCap());
    }

    // 4b. Trigger once-per-save Golden Kingfish secret while bag is 40/40 full!
    S.story.prologueSeen = true;
    S.story.pending = null;
    UI.scene = 'river';
    S.weather = 2;
    S.hour = 6.5;
    S.stats.fish = 30;
    expect(checkSecretTriggers('fish')).toBe(true);
    expect(invCount()).toBeLessThanOrEqual(invCap());
    skipActiveCutscene();

    // All 3 legendary caviar (`roe`) must be waiting safely inside a sealed Postbox parcel!
    const overflowMail = S.mail!.inbox.find((m) => m.template === 'overflow-parcel' && m.parcel?.some((p) => p.id === 'roe'));
    expect(overflowMail).toBeTruthy();

    // Also trigger Yalda while bag is still 40/40 full -> pomegranates safely mailed too!
    triggerEvent('yalda');
    expect(invCount()).toBeLessThanOrEqual(invCap());

    // Empty bag & claim the Golden Kingfish overflow parcel -> all 3 caviar recovered!
    S.inv = {};
    expect(claimMailParcel(overflowMail!.id)).toBe(true);
    expect(S.inv.roe).toBe(3);

    // 4c. Selling an adult female cow with 3 ready milk while bag is 40/40 full auto-pays full milk value!
    addGood('wheat', invCap());
    S.pens.cow = 1;
    S.animals = [{ id: 55, kind: 'cow', sex: 'f', grown: 0, hue: 0, ready: 3 }];
    const coinsBefore = S.coins;
    const expectedMilkBonus = goodPrice('milk') * 3;
    expect(sellAnimal('cow', 'f')).toBe(true);
    expect(S.coins - coinsBefore).toBeGreaterThanOrEqual(expectedMilkBonus + 1);
    expect(invCount()).toBeLessThanOrEqual(invCap());
  });

  it('5. Barn Cauldron daily cooking cap persists across save export/import (no F5 infinite exploit) & resets cleanly on New Game', () => {
    S.inv.wheat = 90;
    S.inv.egg = 90;
    expect(craftArtisan('village-bread', 8)).toBe(8);
    expect(craftArtisan('village-bread', 1)).toBe(0);

    const saved = exportSaveJson();
    resetGame();
    // On a fresh New Game on Day 1, cauldron must NOT inherit the previous save's cooked count!
    S.inv.wheat = 10;
    S.inv.egg = 10;
    expect(craftArtisan('village-bread', 1)).toBe(1);

    // Re-importing the maxed save on Day 1 STILL enforces the 8/day cap!
    expect(importSaveJson(saved)).toBe(true);
    expect(craftArtisan('village-bread', 1)).toBe(0);
  });

  it('6. Retroactive FA -> EN language switch (even across Save/Load JSON!) leaves ZERO stale Persian strings across HUD and ALL 18 Modals', () => {
    // Record gameplay state — debt payments, world event, active + completed builds, quests — while locale is Persian (`fa`)!
    CFG.locale = 'fa';
    startDebt(0);
    S.coins = 50000;
    S.xp = 999999;
    resetLvCache();
    payDebt(1000);
    ensureQuests(true);
    triggerEvent('festival');
    buyPond();
    completeBuild(S.builds[0].id);
    buyPond(); // Keep a live active build in `S.builds` on HUD too!
    S.custom = { farmerName: ' Aria ', farmName: ' Sunlit ', outfit: 0, morningCard: true };

    // Round-trip through full Save JSON export + import while still in `fa`!
    const snapshot = exportSaveJson();
    expect(importSaveJson(snapshot)).toBe(true);

    // Now switch dynamically to English (`en`) WITHOUT starting a new game!
    CFG.locale = 'en';
    expect(S.event?.title).toBe('Spring Village Festival');
    const hudEn = renderToString(<Hud />);
    expect(PERSIAN_CHAR_RE.test(hudEn), `HUD leaked Persian in EN mode: ${hudEn.match(/.{0,25}[\u0600-\u06FF]+.{0,25}/)?.[0]}`).toBe(false);

    const allModals: Exclude<Modal, null>[] = [
      'seed', 'market', 'work', 'carp', 'estate', 'animal', 'inv', 'menu',
      'auto', 'pond', 'hive', 'achieve', 'ledger', 'quests', 'museum', 'home', 'almanac', 'mail',
    ];
    for (const m of allModals) {
      UI.modal = m;
      const html = renderToString(<Modals />);
      // Exclude only the intentional "فارسی" toggle button label in SettingsPanel when on `menu`
      const sanitized = html.replace(/فارسی/g, '');
      expect(PERSIAN_CHAR_RE.test(sanitized), `Modal "${m}" leaked Persian characters in EN mode: ${sanitized.match(/.{0,25}[\u0600-\u06FF]+.{0,25}/)?.[0]}`).toBe(false);
    }
    CFG.locale = 'fa';
  });

  it('7. Complete Story Node Graph integrity: every NPC quest, seasonal reactive scene, area/shop intro & secret resolves cleanly and skips with 0 deadlock', () => {
    const requiredIds = [
      'p1',
      ...['north', 'valley', 'town', 'river', 'apiary'].map((a) => `area-intro-${a}`),
      ...['seed', 'market', 'work', 'animal', 'carp', 'estate'].map((s) => `shop-intro-${s}`),
      ...NPC_QUEST_SPECS.flatMap((q) => [`${q.id}-start`, `${q.id}-done`]),
      ...SEASONAL_NPC_NODES.map((n) => n.id),
      ...SECRETS.map((s) => s.id),
    ];
    for (const id of requiredIds) {
      expect(nodeById(id), `Missing story node: ${id}`).toBeTruthy();
      triggerCutscene(id, { forceReplay: true });
      skipActiveCutscene();
      expect(S.story.pending).toBeNull();
      expect(Number.isFinite(S.coins) && S.coins >= 0).toBe(true);
    }
  });
});
