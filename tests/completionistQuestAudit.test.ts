import { beforeEach, describe, expect, it, vi } from 'vitest';
import { S, resetGame } from './helpers/game';
import {
  buyMachine, buyUpgrade, completeBuild, harvestHoney, harvestPond,
  loadGame, orderScarecrow, saveGame, setSimBatchMode, startDebt,
} from '../src/game/state';
import { newDay } from '../src/game/core/dayLoop';
import { ACHS, DAY_RATE, POND_GROW_DAYS, PEN_KINDS, xpNeed } from '../src/game/data';
import { claim, ensureQuests, questDone, type QKind } from '../src/story/dailyQuests';
import { advanceNode, talkToTownNpc } from '../src/story/engine';
import { availableBuildActions, dailyKindCap } from '../src/story/questCapacity';
import { NPC_QUEST_SPECS, pickNpcQuestScene } from '../src/story/npcQuests';
import { nodeById } from '../src/story/story';

function maxedState() {
  S.xp = 1_000_000_000;
  S.lv = { hoe: 5, can: 5, bag: 6, stam: 5, land: 4, soil: 5, barn: 6 };
  S.machines = { feeder: 3, sprinkler: 3, tractor: 3, seeder: 3, harvester: 3, collector: 3, drone: 3 };
  S.pens = Object.fromEntries(PEN_KINDS.map((k) => [k, 3]));
  S.ponds = Array.from({ length: 5 }, (_, id) => ({ id, stocked: true, grow: POND_GROW_DAYS, feed: 0 }));
  S.hives = 12;
  S.honeyAcc = 48;
  S.workers = 5;
  S.workersHired = 5;
  S.wellLv = 3;
  S.gh = 2;
  S.silo = 2;
  S.rod = 1;
  S.stats = { builds: 103, pondH: 4478, honey: 51478, babies: 518 };
  S.story.prologueSeen = true;
}

function setLevel(level: number) {
  S.xp = 0;
  for (let n = 1; n < level; n++) S.xp += xpNeed(n);
}

function prepareRollover(kind: QKind, setup: () => void) {
  setup();
  let target = -1;
  for (let d = 1; d < 400; d++) {
    S.day = d;
    S.hour = 0;
    ensureQuests(true, false, true);
    if (S.quests.daily.some((g) => g.kind === kind)) { target = d; break; }
  }
  expect(target, `daily ${kind} should be offered`).toBeGreaterThan(0);
  S.day = target - 1;
  S.hour = 0;
  S.stats = {};
  S.quests = { day: target - 1, week: 0, daily: [], weekly: null, claimed: {}, base: {} };
  setup();
  newDay();
  return S.quests.daily.find((g) => g.kind === kind);
}

beforeEach(() => {
  localStorage.clear();
  resetGame();
  setSimBatchMode(true);
});

describe('50x completionist quest regressions', () => {
  it('counts dawn births toward the new daily instead of making them the baseline', () => {
    const goal = prepareRollover('babies', () => {
      S.pens.chicken = 1;
      S.animals = [
        { id: 1, kind: 'chicken', ready: 0, hue: 0, sex: 'f', grown: 0 },
        { id: 2, kind: 'chicken', ready: 0, hue: 1, sex: 'm', grown: 0 },
      ];
      S.nextId = 3;
      S.nests = [{ id: 99, kind: 'chicken', hatch: DAY_RATE }];
    });
    expect(goal).toBeTruthy();
    expect(S.stats.babies).toBeGreaterThan(0);
    expect(questDone(goal!)).toBe(true);
  });

  it('counts Collector MK3 honey harvested at dawn toward the new daily', () => {
    const goal = prepareRollover('honey', () => {
      S.hives = 2;
      S.honeyAcc = 12;
      S.machines = { collector: 3 };
    });
    expect(goal).toBeTruthy();
    expect(S.stats.honey).toBeGreaterThan(0);
    expect(questDone(goal!)).toBe(true);
  });

  it('counts Collector MK3 pond harvests at dawn toward the new daily', () => {
    const goal = prepareRollover('pond', () => {
      S.ponds = [{ id: 1, stocked: true, grow: POND_GROW_DAYS, feed: 0 }];
      S.machines = { collector: 3 };
    });
    expect(goal).toBeTruthy();
    expect(S.stats.pondH).toBeGreaterThan(0);
    expect(questDone(goal!)).toBe(true);
  });

  it('grants the NPC quest affinity reward exactly once on the real turn-in path', () => {
    S.story.prologueSeen = true;
    S.story.seen['npc-q-grandma-1-active'] = true;
    S.story.questBase = { 'npc-q-grandma-1': 0 };
    S.stats['cropHarv:farm'] = 12;
    S.affinity = { grandma: 0 };
    const scene = talkToTownNpc(0);
    expect(scene?.id).toBe('npc-q-grandma-1-done');
    expect(S.affinity.grandma).toBe(1); // the conversation itself
    advanceNode(scene!);
    expect(S.affinity.grandma).toBe(11); // conversation + quest reward
    const coins = S.coins;
    advanceNode(scene!);
    expect(S.affinity.grandma).toBe(11);
    expect(S.coins).toBe(coins);
  });

  it('never offers daily or weekly build when no real construction remains', () => {
    maxedState();
    for (let d = 2255; d < 2320; d++) {
      S.day = d;
      S.hour = 0;
      ensureQuests(true);
      expect(S.quests.daily.some((g) => g.kind === 'build'), `daily build on ${d}`).toBe(false);
      expect(S.quests.weekly?.kind, `weekly build on ${d}`).not.toBe('build');
    }
  });

  it('caps daily pond goals to the number of ponds harvestable that day', () => {
    maxedState();
    let seen = 0;
    for (let d = 2255; d < 2350; d++) {
      S.day = d;
      S.hour = 0;
      ensureQuests(true);
      for (const g of S.quests.daily.filter((q) => q.kind === 'pond')) {
        seen++;
        expect(g.target, `pond target on ${d}`).toBeLessThanOrEqual(5);
        expect(g.target).toBeGreaterThan(0);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('does not offer a baby daily on a day with no birth able to happen', () => {
    S.day = 2;
    S.hour = 0;
    S.pens.chicken = 1;
    S.nests = [];
    ensureQuests(true);
    expect(S.quests.daily.some((g) => g.kind === 'babies')).toBe(false);
  });

  it('also completes honey and pond dailies through manual harvest and claims only once', () => {
    const honey = prepareRollover('honey', () => { S.hives = 2; S.honeyAcc = 12; S.machines = {}; });
    expect(honey).toBeTruthy();
    expect(harvestHoney()).toBeGreaterThan(0);
    expect(questDone(honey!)).toBe(true);
    expect(claim(honey!)).toBe(true);
    const coins = S.coins;
    expect(claim(honey!)).toBe(false);
    expect(S.coins).toBe(coins);

    const pond = prepareRollover('pond', () => {
      S.ponds = [{ id: 1, stocked: true, grow: POND_GROW_DAYS, feed: 0 }];
      S.machines = {};
    });
    expect(pond).toBeTruthy();
    expect(harvestPond(0)).toBeGreaterThan(0);
    expect(questDone(pond!)).toBe(true);
  });

  it('pays every one of the 15 NPC quests exactly once including ten affinity', () => {
    S.xp = 1_000_000_000;
    S.ach = Object.fromEntries(ACHS.map((a) => [a.id, a.tiers.length]));
    S.affinity = {};
    for (const q of NPC_QUEST_SPECS) {
      const spy = vi.spyOn(q, 'progress').mockReturnValue([1, 1]);
      S.story.seen[`${q.id}-active`] = true;
      const id = pickNpcQuestScene(q.who);
      expect(id).toBe(`${q.id}-done`);
      const before = { coins: S.coins, xp: S.xp, quests: S.stats.quests ?? 0, affinity: S.affinity[q.who] ?? 0 };
      const node = nodeById(id!)!;
      advanceNode(node);
      expect(S.coins - before.coins, q.id).toBe(q.rewardCoins);
      expect(S.xp - before.xp, q.id).toBe(q.rewardXp);
      expect((S.stats.quests ?? 0) - before.quests, q.id).toBe(1);
      expect((S.affinity[q.who] ?? 0) - before.affinity, q.id).toBe(10);
      const settled = { coins: S.coins, xp: S.xp, quests: S.stats.quests, affinity: S.affinity[q.who] };
      advanceNode(node);
      expect({ coins: S.coins, xp: S.xp, quests: S.stats.quests, affinity: S.affinity[q.who] }).toEqual(settled);
      spy.mockRestore();
    }
    expect(NPC_QUEST_SPECS.filter((q) => S.story.seen[`${q.id}-done`])).toHaveLength(15);
  });

  it('migrates a legacy premarked turn-in without duplicating coins or omitting affinity', () => {
    const q = NPC_QUEST_SPECS[0];
    S.xp = 1_000_000_000;
    S.affinity = { grandma: 1 };
    S.story.seen[`${q.id}-active`] = true;
    S.story.seen[`${q.id}-done`] = true; // نسخهٔ قدیمی پیش از گره، سکه و XP را داده است
    const coins = S.coins, xp = S.xp;
    advanceNode(nodeById(`${q.id}-done`)!);
    expect(S.coins).toBe(coins);
    expect(S.xp).toBe(xp);
    expect(S.affinity.grandma).toBe(11);
  });

  it('counts queued construction once, excludes workers, and reaches zero after completion', () => {
    maxedState();
    S.workers = 0;
    S.workersHired = 0;
    expect(availableBuildActions()).toBe(0); // استخدام/اخراج کارگر ساخت معتبر نیست
    S.coins = 1_000_000_000;
    S.machines.sprinkler = 2;
    expect(availableBuildActions()).toBe(1);
    buyMachine('sprinkler');
    expect(S.builds).toHaveLength(1);
    expect(availableBuildActions()).toBe(1);
    completeBuild(S.builds[0].id);
    expect(S.machines.sprinkler).toBe(3);
    expect(availableBuildActions()).toBe(0);
  });

  it('uses real purchase and completion APIs at level 8 and for scarecrow construction', () => {
    setLevel(8);
    S.coins = 1_000_000_000;
    const available = availableBuildActions();
    expect(available).toBeGreaterThan(0);
    expect(dailyKindCap('build')).toBeLessThanOrEqual(Math.min(3, available));
    buyUpgrade('hoe');
    expect(S.builds).toHaveLength(1);
    completeBuild(S.builds[0].id);
    expect(S.lv.hoe).toBe(1);
    expect(S.stats.builds).toBe(1);

    maxedState();
    S.coins = 1_000_000_000;
    expect(availableBuildActions()).toBe(0);
    startDebt(0);
    for (let expected = 1; expected <= 3; expected++) {
      expect(availableBuildActions()).toBe(1);
      orderScarecrow();
      expect(S.builds).toHaveLength(1);
      completeBuild(S.builds[0].id);
      expect(S.debt?.scarecrow).toBe(expected);
    }
    expect(availableBuildActions()).toBe(0);
  });

  it('replaces impossible legacy goals without deleting legal claims from the same period', () => {
    maxedState();
    S.day = 2255;
    S.quests = {
      day: 2255, week: 323, feasibilityV: 1,
      daily: [
        { kind: 'pond', target: 81, reward: 1, xp: 1, label: 'old' },
        { kind: 'build', target: 3, reward: 1, xp: 1, label: 'old' },
        { kind: 'harvest', target: 8, reward: 1, xp: 1, label: 'old' },
      ],
      weekly: { kind: 'build', target: 7, reward: 1, xp: 1, label: 'old' },
      claimed: { 'd:harvest:8': true, 'w:harvest:135': true }, base: {}, weeklyBase: 0,
    };
    ensureQuests();
    expect(S.quests.feasibilityV).toBe(2);
    expect(S.quests.daily).toHaveLength(3);
    expect(S.quests.daily.some((g) => g.kind === 'build')).toBe(false);
    expect(S.quests.weekly?.kind).not.toBe('build');
    expect(S.quests.claimed['d:harvest:8']).toBe(true);
    expect(S.quests.claimed['w:harvest:135']).toBe(true);
  });

  it('keeps rollover progress and NPC turn-in idempotent across real save/load', () => {
    const honey = prepareRollover('honey', () => {
      S.hives = 2; S.honeyAcc = 12; S.machines = { collector: 3 };
    });
    expect(questDone(honey!)).toBe(true);
    setSimBatchMode(false);
    expect(saveGame()).toBe(true);
    S.coins = 0;
    expect(loadGame()).toBe(true);
    const loaded = S.quests.daily.find((g) => g.kind === 'honey')!;
    expect(questDone(loaded)).toBe(true);

    S.story.seen['npc-q-grandma-1-active'] = true;
    S.story.questBase = { 'npc-q-grandma-1': 0 };
    S.stats['cropHarv:farm'] = (S.stats['cropHarv:farm'] ?? 0) + 12;
    const scene = talkToTownNpc(0)!;
    expect(saveGame()).toBe(true);
    const before = S.coins;
    S.coins = 0;
    expect(loadGame()).toBe(true);
    advanceNode(nodeById(S.story.pending!)!);
    expect(S.coins).toBe(before + 450);
    const settled = S.coins;
    advanceNode(scene);
    expect(S.coins).toBe(settled);
  });

  it('keeps every generated goal finite and bounded through day 10000 in a maxed save', () => {
    maxedState();
    for (let d = 2255; d <= 10000; d++) {
      S.day = d;
      ensureQuests(false, false, true);
      expect(S.quests.daily).toHaveLength(3);
      for (const g of S.quests.daily) {
        expect(Number.isFinite(g.target) && g.target > 0).toBe(true);
        expect(Number.isFinite(g.reward) && Number.isFinite(g.xp)).toBe(true);
        expect(g.target).toBeLessThanOrEqual(dailyKindCap(g.kind, true));
        if (g.kind === 'pond') expect(g.target).toBeLessThanOrEqual(5);
        expect(g.kind).not.toBe('build');
      }
      expect(S.quests.weekly).toBeTruthy();
      expect(S.quests.weekly!.kind).not.toBe('build');
      expect(S.quests.weekly!.target).toBeGreaterThan(0);
    }
    expect(JSON.stringify(S).length).toBeLessThan(100_000);
  });


  it('shares limited feed across ponds and respects animal production caps', () => {
    S.auto.feed = true;
    S.inv.feed = DAY_RATE;
    S.ponds = [0, 1].map((id) => ({ id, stocked: true, grow: POND_GROW_DAYS - 1, feed: 0 }));
    expect(dailyKindCap('pond', true)).toBe(1);
    S.ponds = [];
    S.animals = [{ id: 1, kind: 'chicken', ready: 7, hue: 0, sex: 'f', grown: 0 }];
    expect(dailyKindCap('collect', true)).toBe(8);
  });

});
