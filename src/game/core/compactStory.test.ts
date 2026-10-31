import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fresh, S, startDebt } from '../state';
import { maybeOpenNextNote } from './debt';
import { NOTES } from '../../story/debtData';

class MemoryStorage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

describe('compact story pacing', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
    Object.assign(S, fresh());
    S.day = 100;
    S.story.prologueSeen = true;
    S.story.questDone[1] = true;
    startDebt(0);
    S.debt!.remaining = 0;
  });

  afterEach(() => vi.unstubAllGlobals());

  it('halves only the anti-rush wait at the real chapter-opening boundary', () => {
    const wait = NOTES[1].minDays;
    const compactWait = Math.ceil(wait / 2);
    S.custom = { farmerName: '', farmName: '', outfit: 0, morningCard: true, compactStory: false };
    S.debt!.chapterStartDay = S.day - compactWait;
    expect(maybeOpenNextNote()).toBe(false);
    expect(S.debt!.noteIdx).toBe(0);

    S.custom.compactStory = true;
    S.debt!.chapterStartDay = S.day - (compactWait - 1);
    expect(maybeOpenNextNote()).toBe(false);
    S.debt!.chapterStartDay = S.day - compactWait;
    expect(maybeOpenNextNote()).toBe(true);
    expect(S.debt!.noteIdx).toBe(1);
    expect(S.debt!.remaining).toBe(NOTES[1].amount);
  });
});
