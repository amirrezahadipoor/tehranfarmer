import { beforeEach, describe, expect, it } from 'vitest';
import { fresh, loadGame, S, UI } from './state';
import { processMorningCompanionAndReport } from './core/rpgSystems';

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

describe('save snapshots and backup recovery', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: new MemoryStorage() });
    Object.assign(S, fresh());
    UI.toasts = [];
  });

  it('reports +7/+8 once, then +0/+0', () => {
    processMorningCompanionAndReport();
    S.earned += 7;
    S.stats.harv = (S.stats.harv ?? 0) + 8;
    processMorningCompanionAndReport();
    expect(S.morning?.earned).toBe(7);
    expect(S.morning?.gathered).toBe(8);
    processMorningCompanionAndReport();
    expect(S.morning?.earned).toBe(0);
    expect(S.morning?.gathered).toBe(0);
  });

  it('migrates an old save baseline from its loaded totals', () => {
    const old = { ...fresh(), earned: 100, stats: { harv: 10 } } as Record<string, unknown>;
    delete old.snapEarned;
    delete old.snapGathered;
    localStorage.setItem(KEY, JSON.stringify(old));
    expect(loadGame()).toBe(true);
    expect(S.snapEarned).toBe(100);
    expect(S.snapGathered).toBe(10);
    processMorningCompanionAndReport();
    expect(S.morning?.earned).toBe(0);
    expect(S.morning?.gathered).toBe(0);
  });

  it('announces backup recovery and immediately rewrites main without rotating backup', () => {
    const valid = { ...fresh(), coins: 123, stats: { harv: 9 } };
    const backup = JSON.stringify(valid);
    localStorage.setItem(KEY, '{broken-json');
    localStorage.setItem(KEY + '-bak1', backup);
    expect(loadGame()).toBe(true);
    expect(S.coins).toBe(123);
    expect(JSON.parse(localStorage.getItem(KEY)!).coins).toBe(123);
    expect(localStorage.getItem(KEY + '-bak1')).toBe(backup);
    expect(UI.toasts.length).toBeGreaterThan(0);
  });
});
