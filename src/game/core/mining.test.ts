import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { xpNeed } from '../data';
import { fresh, S, UI } from '../state';
import { resetLvCache } from './progress';
import { freshFrontier } from './frontier';
import { activeMineNodes, completeMineNode, minePrecisionStatus, stepMineFloor } from './mining';

function stubStorage() {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, String(value)); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
  });
}

describe('early mining balance and destinations', () => {
  beforeEach(() => {
    stubStorage();
    Object.assign(S, fresh());
    S.frontier = freshFrontier();
    S.frontier.nodesDay = S.day;
    S.stamina = 100;
    UI.modal = null;
    UI.toasts = [];
    resetLvCache();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('keeps amber and high-tier gems out of the starter floors', () => {
    const first = activeMineNodes(1).map((node) => node.good);
    const second = activeMineNodes(2).map((node) => node.good);
    expect(first).not.toContain('amber');
    expect(new Set(first)).toEqual(new Set(['quartz', 'turquoise']));
    expect(second).not.toContain('garnet');
    expect(second).not.toContain('opal');
    expect(second).not.toContain('sapphire');
    expect(second).not.toContain('ruby');
  });

  it('caps a perfect starter-floor vein at one item', () => {
    const result = completeMineNode(1, 0, [1, 1, 1]);
    expect(result).toMatchObject({ good: 'quartz', qty: 1, perfect: true });
  });

  it('uses the same bonus predicate for progress, readiness and the core grant', () => {
    expect(minePrecisionStatus(1, 'quartz', [1, 1, 1], 3)).toMatchObject({ perfect: true, bonusReady: false });
    expect(minePrecisionStatus(2, 'quartz', [1, 1], 3)).toMatchObject({ complete: false, bonusOnTrack: true, bonusReady: false });
    expect(minePrecisionStatus(2, 'quartz', [1, 1, 1], 3)).toMatchObject({ complete: true, bonusOnTrack: true, bonusReady: true });
    const boundary = minePrecisionStatus(2, 'quartz', [1, 0.91, 0.91], 3);
    expect(boundary.accuracy).toBeCloseTo(0.94);
    expect(boundary.bonusReady).toBe(true);
    expect(minePrecisionStatus(2, 'quartz', [1, 0.9, 0.8], 3)).toMatchObject({ bonusOnTrack: false, bonusReady: false });
    expect(minePrecisionStatus(2, 'ruby', [1, 1, 1, 1], 4)).toMatchObject({ rewardGood: 'diamond', bonusReady: false });
  });

  it('awards a second item only for flawless deeper extraction, not a 72% run', () => {
    expect(completeMineNode(2, 0, [0.8, 0.8, 0.8])).toMatchObject({ qty: 1, perfect: false });
    Object.assign(S, fresh());
    S.frontier = freshFrontier();
    S.frontier.nodesDay = S.day;
    expect(completeMineNode(2, 0, [1, 1, 1])).toMatchObject({ good: 'turquoise', qty: 2, perfect: true });
  });

  it('requires farm level four before entering the second floor', () => {
    S.frontier!.maxCaveFloor = 2;
    S.frontier!.nodesDone['cave:1:0'] = true;
    S.frontier!.nodesDone['cave:1:1'] = true;
    expect(stepMineFloor(1)).toBe(false);
    S.xp = [1, 2, 3].reduce((sum, level) => sum + xpNeed(level), 0);
    resetLvCache();
    expect(stepMineFloor(1)).toBe(true);
    expect(S.frontier!.caveFloor).toBe(2);
  });

  it('requires farm level six before floor three even when two veins are cleared', () => {
    S.frontier!.caveFloor = 2;
    S.frontier!.maxCaveFloor = 2;
    S.frontier!.nodesDone['cave:2:0'] = true;
    S.frontier!.nodesDone['cave:2:1'] = true;
    expect(stepMineFloor(1)).toBe(false);
    expect(S.frontier!.caveFloor).toBe(2);

    S.xp = [1, 2, 3, 4, 5].reduce((sum, level) => sum + xpNeed(level), 0);
    resetLvCache();
    expect(stepMineFloor(1)).toBe(true);
    expect(S.frontier!.caveFloor).toBe(3);
  });

  it('reports mailbox overflow instead of claiming the gems went to the backpack', () => {
    S.inv = { feed: 40 };
    expect(completeMineNode(1, 0, [0.8, 0.8, 0.8])?.qty).toBe(1);
    expect(UI.toasts.some((entry) => entry.text.includes('صندوق پست') || entry.text.includes('mailbox'))).toBe(true);
    expect(S.mail?.inbox.some((entry) => entry.template === 'overflow-parcel')).toBe(true);
  });
});
