import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fresh, S, startDebt } from '../state';
import { interestOf, minPay, standingBand } from './debt';
import {
  NOTES, STAND_BAD, STAND_BAD_INTEREST_MULT, STAND_GOOD, STAND_GOOD_INTEREST_MULT,
} from '../../story/debtData';

class MemoryStorage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

describe('late-deed standing paths', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
    Object.assign(S, fresh());
    S.story.prologueSeen = true;
    startDebt(5);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('keeps the good-standing interest discount on the retuned principal', () => {
    S.debt!.standing = STAND_GOOD;
    const note = NOTES[5];
    expect(standingBand()).toBe('good');
    expect(interestOf()).toBe(Math.round(S.debt!.remaining * note.rate * STAND_GOOD_INTEREST_MULT));
    expect(minPay()).toBe(Math.ceil(note.amount / note.monthsTarget));
  });

  it('keeps the bad-standing interest penalty on the same principal', () => {
    S.debt!.standing = STAND_BAD - 1;
    const note = NOTES[5];
    expect(standingBand()).toBe('bad');
    expect(interestOf()).toBe(Math.round(S.debt!.remaining * note.rate * STAND_BAD_INTEREST_MULT));
    expect(minPay()).toBe(Math.ceil(note.amount / note.monthsTarget));
  });
});
