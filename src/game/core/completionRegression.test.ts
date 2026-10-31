import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACHS } from '../data';
import { TOTAL_DEBT } from '../../story/debtData';
import { fresh, loadGame, resetGame, S, saveGame, UI } from '../state';
import { skipActiveCutscene } from '../../story/engine';
import { checkAch } from './progress';
import { payDebt, startDebt } from './debt';

class MemoryStorage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, String(value)); }
  removeItem(key: string) { this.data.delete(key); }
  clear() { this.data.clear(); }
}

describe('ordinary 100% completion regressions', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
    resetGame();
    UI.started = false;
    S.story.prologueSeen = true;
  });
  afterEach(() => vi.unstubAllGlobals());

  it('keeps every achievement threshold list monotonic, including full debt repayment', () => {
    for (const ach of ACHS) {
      const values = ach.tiers.map((tier) => tier.n);
      expect(values, ach.id).toEqual([...values].sort((a, b) => a - b));
      expect(new Set(values).size, ach.id).toBe(values.length);
    }
    expect(ACHS.find((ach) => ach.id === 'debtPaid')?.tiers.map((tier) => tier.n))
      .toEqual([15000, 250000, 1000000, TOTAL_DEBT]);
  });

  it('reconciles a legacy debt-free save on load without duplicate rewards on the next load', () => {
    startDebt(5);
    S.story.postgame = true;
    S.story.chapter = 7;
    S.debt!.chapter = 7;
    S.debt!.remaining = 0;
    S.debt!.paidTotal = TOTAL_DEBT;
    S.ach.debtPaid = 2;
    S.ach.chapter = 4;
    S.coins = 1000;
    expect(saveGame()).toBe(true);

    expect(loadGame()).toBe(true);
    expect(S.ach.debtPaid).toBe(4);
    expect(S.coins).toBe(31000);
    expect(saveGame()).toBe(true);
    expect(loadGame()).toBe(true);
    expect(S.ach.debtPaid).toBe(4);
    expect(S.coins).toBe(31000);
  });

  it('pays all six real notes and unlocks all four debt tiers without penalties', () => {
    startDebt(0);
    S.coins = 10_000_000;
    for (let note = 0; note < 6; note++) {
      expect(S.debt?.noteIdx).toBe(note);
      S.story.questDone[note + 1] = true;
      S.debt!.chapterStartDay = S.day - 999;
      const result = payDebt(S.debt!.remaining);
      expect(result.complete).toBe(true);
      skipActiveCutscene();
    }
    checkAch();
    expect(S.debt?.paidTotal).toBe(TOTAL_DEBT);
    expect(S.debt?.remaining).toBe(0);
    expect(S.debt?.beatings).toBe(0);
    expect(S.story.postgame).toBe(true);
    expect(S.story.chapter).toBe(7);
    expect(S.ach.debtPaid).toBe(4);
    expect(S.mastery?.startedDay).toBe(S.day);
    expect(S.mastery?.base.cropHarv).toBe(S.stats.cropHarv ?? 0);
  });

  it('does not resurrect the old 1.5M wall on a normal debt-free total', () => {
    Object.assign(S, fresh());
    startDebt(5);
    S.debt!.remaining = 0;
    S.debt!.paidTotal = TOTAL_DEBT;
    S.ach.debtPaid = 0;
    checkAch();
    expect(S.ach.debtPaid).toBe(4);
  });
});
