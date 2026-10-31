import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fresh, S, startDebt } from '../state';
import { maybeOpenNextNote, noteWaitDays } from './debt';
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

  it('shortens only the calendar wait at the real chapter-opening boundary', () => {
    const wait = NOTES[1].minDays;
    S.custom = { farmerName: '', farmName: '', outfit: 0, morningCard: true, compactStory: false };
    const normalWait = noteWaitDays(wait);
    S.debt!.chapterStartDay = S.day - (normalWait - 1);
    expect(maybeOpenNextNote()).toBe(false);
    expect(S.debt!.noteIdx).toBe(0);

    S.custom.compactStory = true;
    const compactWait = noteWaitDays(wait);
    S.debt!.chapterStartDay = S.day - (compactWait - 1);
    expect(maybeOpenNextNote()).toBe(false);
    S.debt!.chapterStartDay = S.day - compactWait;
    expect(maybeOpenNextNote()).toBe(true);
    expect(S.debt!.noteIdx).toBe(1);
    expect(S.debt!.remaining).toBe(NOTES[1].amount);
  });

  it('caps late-story calendar waits at seven days, or three in compact mode', () => {
    S.custom = { farmerName: '', farmName: '', outfit: 0, morningCard: true, compactStory: false };
    expect(noteWaitDays(50)).toBe(7);
    expect(noteWaitDays(4)).toBe(4);
    S.custom.compactStory = true;
    expect(noteWaitDays(50)).toBe(3);
    expect(noteWaitDays(4)).toBe(2);
  });
});
