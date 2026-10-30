import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { installDom } from './helpers/dom';
import { S, UI, doAct, resetGame, sellGood } from '../src/game/state';
import { completeMineNode } from '../src/game/core/mining';
import { completeFestivalContest } from '../src/game/core/frontier';
import {
  CHARTER_SWITCH_COOLDOWN_DAYS, CHARTER_SWITCH_COST, activeCharter,
  charterSwitchInfo, chooseVillageCharter, ensureFrontier,
} from '../src/game/core/frontier';
import { metric } from '../src/story/dailyQuests';
import { NPC_QUEST_SPECS, npcQuestProgress, pickNpcQuestScene } from '../src/story/npcQuests';
import { isQuestDone } from '../src/story/quests';
import { SAVE_VERSION, migrateSave } from '../src/game/core/saveMigrations';
import type { Plot } from '../src/game/state';

const ripeWheat = (): Plot => ({ st: 2, crop: 'wheat', prog: 1, water: 1, fert: 0.7, last: null, dead: false, dry: 0, ripe: true, n: 0 });

describe('strict-audit quest metric and charter regressions', () => {
  beforeAll(() => installDom());
  beforeEach(() => {
    resetGame();
    UI.scene = 'farm';
    UI.modal = null;
    S.story.prologueSeen = true;
    S.story.chapter = 7;
    S.story.postgame = true;
    S.coins = 10_000;
  });

  it('mine gems never advance crop quests; real harvest retains its farm scope', () => {
    const grandma = NPC_QUEST_SPECS.find((q) => q.id === 'npc-q-grandma-1')!;
    expect(pickNpcQuestScene('grandma')).toBe('npc-q-grandma-1-start');
    const mined = completeMineNode(1, 0, [0.5, 0.5, 0.5]);
    expect(mined?.good).toBe('quartz');
    expect(S.stats.harv).toBeGreaterThan(0);
    expect(S.stats.cropHarv ?? 0).toBe(0);
    expect(S.stats['cropHarv:farm'] ?? 0).toBe(0);
    expect(npcQuestProgress(grandma)).toEqual([0, 12]);

    S.plots[0] = ripeWheat();
    const main = doAct('harvest', 0, false, undefined, true, 'farm', true);
    expect(main.qty).toBeGreaterThan(0);
    expect(S.stats['cropHarv:farm']).toBe(main.qty);
    expect(S.stats['cropHarv:north'] ?? 0).toBe(0);
    expect(npcQuestProgress(grandma)).toEqual([main.qty!, 12]);

    S.lv.land = 1;
    S.northPlots[0] = ripeWheat();
    doAct('harvest', 0, false, undefined, true, 'north', true);
    expect(S.stats['cropHarv:north']).toBeGreaterThan(0);
    expect(S.stats['cropHarv:farm']).toBe(main.qty);
  });

  it('chapter-one progress accepts Main Farm crops, not another estate or a mine', () => {
    expect(isQuestDone(1)).toBe(false);
    completeMineNode(1, 0, [0.5, 0.5, 0.5]);
    expect(isQuestDone(1)).toBe(false);
    S.lv.land = 1;
    S.stats['cropHarv:north'] = 20;
    expect(isQuestDone(1)).toBe(false);
    S.stats['cropHarv:farm'] = 20;
    expect(isQuestDone(1)).toBe(true);
  });

  it('festival rewards do not count as Market sales, while sellGood does', () => {
    const sara = NPC_QUEST_SPECS.find((q) => q.id === 'npc-q-sara-1')!;
    S.story.seen[sara.id + '-active'] = true;
    (S.story.questBase ??= {})[sara.id] = 0;
    const festival = completeFestivalContest('cauldron', 1)!;
    expect(festival.coins).toBe(700);
    expect(S.earned).toBe(700);
    expect(metric('sell')).toBe(0);
    expect(npcQuestProgress(sara)).toEqual([0, 2500]);

    S.inv.wheat = 4;
    const earned = sellGood('wheat', 4);
    expect(earned).toBeGreaterThan(0);
    expect(metric('sell')).toBe(earned);
    expect(npcQuestProgress(sara)).toEqual([earned, 2500]);
  });

  it('charter switches have a saved cooldown and a real coin cost', () => {
    const before = S.coins;
    expect(chooseVillageCharter('qanat', 'turbine')).toBe(true);
    expect(S.coins).toBeGreaterThanOrEqual(before + 280); // first ratification reward remains intact
    expect(ensureFrontier().charterChangedDay.qanat).toBe(S.day);
    expect(chooseVillageCharter('qanat', 'commons')).toBe(false);
    expect(activeCharter('qanat')).toBe('turbine');
    expect(charterSwitchInfo('qanat')).toEqual({ daysLeft: CHARTER_SWITCH_COOLDOWN_DAYS, cost: CHARTER_SWITCH_COST });

    S.day += CHARTER_SWITCH_COOLDOWN_DAYS;
    S.coins = CHARTER_SWITCH_COST - 1;
    expect(chooseVillageCharter('qanat', 'commons')).toBe(false);
    S.coins = CHARTER_SWITCH_COST;
    expect(chooseVillageCharter('qanat', 'commons')).toBe(true);
    expect(S.coins).toBe(0);
    expect(activeCharter('qanat')).toBe('commons');
    expect(chooseVillageCharter('qanat', 'turbine')).toBe(false);
  });

  it('migrates v9 counters and charter timestamps without discarding legacy progress', () => {
    const raw = migrateSave({
      v: 9, day: 8, coins: 100, earned: 4321,
      stats: { harv: 37, fish: 2 },
      frontier: { charters: { qanat: 'turbine' }, charterChangedDay: { qanat: 6.8, bank: -2 } },
    })!;
    expect(raw.v).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBe(10);
    expect(raw.stats).toMatchObject({
      harv: 37, cropHarv: 37, 'cropHarv:farm': 37,
      'cropHarv:north': 0, 'cropHarv:valley': 0, marketEarned: 4321,
    });
    expect(raw.frontier).toMatchObject({ charterChangedDay: { qanat: 6 } });
  });
});
