import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { xpNeed } from '../data';
import { fresh, loadGame, resetGame, S, UI } from '../state';
import { SAVE_VERSION } from './saveMigrations';
import { resetLvCache } from './progress';
import {
  MASTERY_DEFS, claimMastery, ensureMastery, masteryClaimedCount, masteryGoalProgress,
  masteryStatus, masteryXpReward,
} from './mastery';

const KEY = 'mazrae-rangi-save-v1';
class MemoryStorage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, String(value)); }
  removeItem(key: string) { this.data.delete(key); }
  clear() { this.data.clear(); }
}
function setLevel(level: number) {
  let xp = 0;
  for (let n = 1; n < level; n++) xp += xpNeed(n);
  S.xp = xp;
  resetLvCache();
}

describe('postgame Farm Mastery path', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
    resetGame();
    UI.started = false;
    S.story.prologueSeen = true;
    S.story.postgame = true;
    S.story.chapter = 7;
    S.ach.chapter = 4;
    S.ach.level = 3;
    S.ach.quests = 4;
  });
  afterEach(() => vi.unstubAllGlobals());

  it('uses a fresh baseline and grants a varied XP reward exactly once', () => {
    setLevel(18);
    S.stats.cropHarv = 500;
    S.stats.quests = 10;
    const state = ensureMastery()!;
    const def = MASTERY_DEFS[0];
    expect(masteryGoalProgress(def.goals[0])).toBe(0);
    S.stats.cropHarv += 80;
    S.stats.quests += 2;
    expect(masteryStatus(def).ready).toBe(true);
    const coins = S.coins;
    const xp = S.xp;
    expect(masteryXpReward(def)).toBe(48000);
    expect(claimMastery(def.id)).toBe(true);
    expect(S.coins).toBe(coins + def.coins);
    expect(S.xp).toBe(xp + 48000);
    expect(state.claimed[def.id]).toBe(true);
    expect(loadGame()).toBe(true);
    expect(S.mastery?.claimed[def.id]).toBe(true);
    expect(claimMastery(def.id)).toBe(false);
    expect(S.coins).toBe(coins + def.coins);
    expect(S.xp).toBe(xp + 48000);
  });

  it('records goal progress before the level gate but never allows an early claim', () => {
    setLevel(17);
    S.stats.fish = 100;
    S.stats.pondH = 10;
    ensureMastery();
    S.stats.fish += 12;
    S.stats.pondH += 2;
    const def = MASTERY_DEFS[1];
    expect(masteryStatus(def).goalsOk).toBe(true);
    expect(masteryStatus(def).levelOk).toBe(false);
    expect(claimMastery(def.id)).toBe(false);
    setLevel(19);
    expect(masteryStatus(def).ready).toBe(true);
  });

  it('requires the six earlier milestones and five secrets for the final legacy', () => {
    setLevel(28);
    const state = ensureMastery()!;
    S.secrets = Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`secret-${i}`, true]));
    const legacy = MASTERY_DEFS[6];
    expect(masteryStatus(legacy).goalsOk).toBe(false);
    for (const def of MASTERY_DEFS.slice(0, 6)) state.claimed[def.id] = true;
    expect(masteryClaimedCount()).toBe(6);
    expect(masteryStatus(legacy).ready).toBe(true);
  });

  it('migrates a v12 postgame save without turning lifetime stats into free mastery rewards', () => {
    const old = {
      ...fresh(), v: 12,
      story: { ...fresh().story, prologueSeen: true, postgame: true, chapter: 7 },
      stats: { cropHarv: 9999 },
    } as Record<string, unknown>;
    localStorage.setItem(KEY, JSON.stringify(old));
    expect(loadGame()).toBe(true);
    expect(S.v).toBe(SAVE_VERSION);
    expect(S.mastery).toBeUndefined();
    ensureMastery();
    const def = MASTERY_DEFS[0];
    expect(masteryGoalProgress(def.goals[0])).toBe(0);
    S.stats.cropHarv += 80;
    expect(masteryGoalProgress(def.goals[0])).toBe(80);
  });
});
