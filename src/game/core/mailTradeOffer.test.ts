import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CROP } from '../data';
import { fresh, S, UI } from '../state';
import { resetLvCache } from './progress';
import { rollMailTradeOffer } from './mailbox';

class MemoryStorage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

describe('mail-order pacing by chapter', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
    Object.assign(S, fresh());
    resetLvCache();
    S.mail = { inbox: [], sentKeys: {}, lastDealDay: 0 };
    S.story.prologueSeen = true;
    UI.toasts = [];
  });

  afterEach(() => vi.unstubAllGlobals());

  it('keeps the original small early-game offer tuning', () => {
    S.day = 1;
    S.story.chapter = 1;
    const entry = rollMailTradeOffer(true)!;
    expect(entry.trade!.qty).toBeGreaterThanOrEqual(4);
    expect(entry.trade!.qty).toBeLessThanOrEqual(9);
    expect(entry.trade!.dueDay).toBe(6);
    expect(entry.trade!.standing).toBe(2);
    expect(entry.params).toMatchObject({ bonusPct: 32, estateOrder: 0 });
  });

  it('turns a late automated seed plan into a larger seven-day courier goal', () => {
    S.day = 8;
    S.story.chapter = 5;
    S.lv.land = 3;
    S.xp = 1_801_556;
    resetLvCache();
    S.farmSeeds = { valley: 'grape' };
    const entry = rollMailTradeOffer(true)!;
    expect(entry.trade).toMatchObject({ good: 'grape', dueDay: 15, standing: 3 });
    expect(entry.trade!.qty).toBeGreaterThanOrEqual(12);
    expect(entry.trade!.qty).toBeLessThanOrEqual(20);
    expect(entry.trade!.reward).toBe(Math.round(CROP.grape.price * entry.trade!.qty * 1.45));
    expect(entry.params).toMatchObject({ bonusPct: 45, estateOrder: 1 });
  });
});
