import '../src/strings/en';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { installDom } from './helpers/dom';
import { S, UI, advance, resetGame } from '../src/game/state';
import { drainWorkerVisualEvents, workerPostFarm } from '../src/game/core/workers';
import { migrateSave, SAVE_VERSION } from '../src/game/core/saveMigrations';
import {
  NPC_QUEST_SPECS, isNpcQuestReadyToTurnIn, npcQuestProgress, pickNpcQuestScene,
} from '../src/story/npcQuests';
import { notePlayerAction, triggerSeasonDawn } from '../src/story/engine';
import type { Plot } from '../src/game/state';

function ripePlot(): Plot {
  return { st: 2, crop: 'wheat', prog: 1, water: 1, fert: 0.7, last: null, dead: false, dry: 0, ripe: true, n: 0 };
}

describe('worker continuity and activation-based NPC quest pacing', () => {
  beforeAll(() => installDom());
  beforeEach(() => {
    resetGame();
    UI.scene = 'farm';
    UI.modal = null;
    S.story.prologueSeen = true;
    S.story.postgame = true;
    S.story.chapter = 7;
    S.crewRole = 'crops';
    S.coins = 100000;
    S.workers = 5;
    S.workersHired = 5;
  });

  it('counts the real pre-midnight shift instead of dropping it when advance ends at night', () => {
    S.day = 2;
    S.hour = 20;
    S.plots[0] = ripePlot();
    advance(4);
    expect(S.hour).toBe(0);
    expect(S.stats.harv ?? 0).toBeGreaterThan(0);
  });

  it('does not turn a whole night of sleep into full-shift production', () => {
    S.day = 2;
    S.hour = 22;
    for (let i = 0; i < 10; i++) S.plots[i] = ripePlot();
    advance(8);
    expect(S.hour).toBe(6);
    expect(S.stats.harv ?? 0).toBe(0);
  });

  it('keeps producing while the player is in town, with one visual event and no second economic application', () => {
    S.hour = 10;
    UI.scene = 'town';
    S.plots[0] = ripePlot();
    advance(1.5);
    const produced = S.stats.harv ?? 0;
    expect(produced).toBeGreaterThan(0);
    const events = drainWorkerVisualEvents('farm');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ farm: 'farm', kind: 'harvest', plot: 0 });
    expect(S.stats.harv).toBe(produced);
    expect(drainWorkerVisualEvents('farm')).toHaveLength(0);
    expect(S.stats.harv).toBe(produced);
  });

  it('assigns persistent posts across owned farms rather than the player scene', () => {
    S.lv.land = 4;
    UI.scene = 'town';
    expect(Array.from({ length: 5 }, (_, i) => workerPostFarm(i))).toEqual(['farm', 'north', 'valley', 'farm', 'north']);
    UI.scene = 'river';
    expect(workerPostFarm(0)).toBe('farm');
    expect(workerPostFarm(2)).toBe('valley');
  });

  it('starts cumulative NPC progress at acceptance, even with a large lifetime history', () => {
    const q = NPC_QUEST_SPECS.find((x) => x.id === 'npc-q-grandma-1')!;
    S.stats.harv = 500;
    const coins = S.coins;
    expect(pickNpcQuestScene('grandma')).toBe('npc-q-grandma-1-start');
    expect(S.story.questBase?.[q.id]).toBe(500);
    expect(npcQuestProgress(q)).toEqual([0, 12]);
    expect(isNpcQuestReadyToTurnIn(q)).toBe(false);
    S.stats.harv += 11;
    expect(npcQuestProgress(q)).toEqual([11, 12]);
    S.stats.harv += 1;
    expect(isNpcQuestReadyToTurnIn(q)).toBe(true);
    expect(pickNpcQuestScene('grandma')).toBe('npc-q-grandma-1-done');
    expect(S.coins - coins).toBeGreaterThanOrEqual(q.rewardCoins);
    const settled = S.coins;
    expect(pickNpcQuestScene('grandma')).toBeNull();
    expect(S.coins).toBe(settled);
  });

  it('preserves legacy active quests and never makes maxed state upgrades impossible', () => {
    const legacy = NPC_QUEST_SPECS.find((x) => x.id === 'npc-q-grandma-1')!;
    S.story.seen[legacy.id + '-active'] = true;
    S.stats.harv = 500;
    expect(npcQuestProgress(legacy)).toEqual([12, 12]);
    expect(isNpcQuestReadyToTurnIn(legacy)).toBe(true);

    const stateQuest = NPC_QUEST_SPECS.find((x) => x.id === 'npc-q-engineer-3')!;
    S.story.seen[stateQuest.id + '-active'] = true;
    S.machines = { feeder: 3, sprinkler: 3, tractor: 3, seeder: 3, harvester: 3, collector: 3, drone: 3 };
    expect(npcQuestProgress(stateQuest)).toEqual([3, 3]);
    expect(isNpcQuestReadyToTurnIn(stateQuest)).toBe(true);
  });

  it('migrates v8 quest baselines without inventing progress or keeping corrupt values', () => {
    const raw = migrateSave({
      v: 8, day: 4, coins: 50,
      story: { chapter: 1, seen: {}, prologueSeen: true, postgame: false, pending: null, questDone: {}, questBase: { good: 12, bad: -4 } },
    });
    expect(raw?.v).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBe(9);
    expect(raw?.story).toMatchObject({ questBase: { good: 12 } });
  });

  it('keeps automatic season scenes behind the existing activity and once-per-day pacing gate', () => {
    S.story.postgame = false;
    S.story.pending = null;
    S.story.lastAutoDay = undefined;
    (S.story as typeof S.story & { actionsSinceAuto?: number }).actionsSinceAuto = 0;
    triggerSeasonDawn(1);
    expect(S.story.pending).toBeNull();
    notePlayerAction(3);
    triggerSeasonDawn(1);
    expect(S.story.pending).toBe('season-dawn-summer');
  });
});
