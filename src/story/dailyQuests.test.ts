import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { doAct, fresh, loadGame, S, saveGame, UI } from '../game/state';
import { questProgress, type QuestGoal } from './dailyQuests';

const goal = (kind: QuestGoal['kind'], target: number): QuestGoal => ({ kind, target, reward: 100, xp: 10, label: kind });

describe('harvest quest progress persistence', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, String(value)); },
      removeItem: (key: string) => { values.delete(key); },
      clear: () => values.clear(),
    });
    Object.assign(S, fresh());
    UI.scene = 'farm';
    UI.modal = null;
    UI.toasts = [];
  });

  afterEach(() => vi.unstubAllGlobals());

  it('updates daily and weekly progress immediately after a real harvest and after reload', () => {
    S.quests.daily = [goal('harvest', 8), goal('plant', 10), goal('sell', 800)];
    S.quests.weekly = goal('harvest', 135);
    S.quests.base = { harvest: 0, plant: 0, sell: 0 };
    S.quests.weeklyBase = 0;
    Object.assign(S.plots[0], { st: 2, crop: 'wheat', prog: 1, water: 1, fert: 1, ripe: true, dead: false, dry: 0, n: 0 });

    const result = doAct('harvest', 0);
    expect(result.qty).toBeGreaterThan(0);
    expect(questProgress(S.quests.daily[0])).toBe(result.qty);
    expect(questProgress(S.quests.weekly!, true)).toBe(result.qty);

    expect(saveGame()).toBe(true);
    Object.assign(S, fresh());
    expect(S.stats.cropHarv ?? 0).toBe(0);
    expect(loadGame()).toBe(true);
    expect(S.stats.cropHarv).toBe(result.qty);
    expect(questProgress(S.quests.daily[0])).toBe(result.qty);
    expect(questProgress(S.quests.weekly!, true)).toBe(result.qty);
  });
});
