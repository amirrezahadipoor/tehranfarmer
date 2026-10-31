import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetGame, S, UI } from '../state';
import { resetLvCache } from './progress';
import { processDebtDay, startDebt } from './debt';
import { pendingNode, skipActiveCutscene } from '../../story/engine';

class MemoryStorage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, String(value)); }
  removeItem(key: string) { this.data.delete(key); }
  clear() { this.data.clear(); }
}

function keepDebtTimersAway() {
  if (!S.debt) throw new Error('debt was not initialized');
  S.debt.dueDay = S.day + 28;
  S.debt.nextRaidDay = S.day + 28;
  S.debt.immuneUntilDay = S.day + 28;
}

describe('final-debt story ordering', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
    resetGame();
    UI.started = false;
    UI.modal = null;
    S.story.prologueSeen = true;
  });

  afterEach(() => vi.unstubAllGlobals());

  it('silently completes an already-satisfied q6 before the finale instead of queueing it after freedom', () => {
    S.day = 1792;
    S.story.chapter = 6;
    startDebt(5);
    keepDebtTimersAway();
    S.debt!.remaining = 0;
    S.lv.land = 4;
    S.lv.soil = 1;
    S.lv.bag = 3;
    S.machines = { feeder: 1, sprinkler: 1, tractor: 1, seeder: 1, harvester: 1, collector: 1 };
    S.xp = 1_801_556;
    resetLvCache();

    processDebtDay();

    expect(S.story.questDone[6]).toBe(true);
    expect(S.story.seen['quest-done-q6']).toBe(true);
    expect(S.story.postgame).toBe(true);
    expect(S.story.pending).toBe('ch6-outro');
    expect(S.story.queue ?? []).not.toContain('quest-done-q6');

    skipActiveCutscene();
    expect(pendingNode()).toBeNull();
    expect(S.story.seen['finale']).toBe(true);
    expect(S.story.pending).not.toBe('quest-done-q6');
  });

  it('still plays ordinary chapter quest scenes when the debt is not ready to advance', () => {
    S.story.chapter = 1;
    startDebt(0);
    keepDebtTimersAway();
    S.stats['cropHarv:farm'] = 20;

    processDebtDay();

    expect(S.story.questDone[1]).toBe(true);
    expect(S.story.pending).toBe('quest-done-q1');
    expect(S.story.postgame).toBe(false);
  });
});
