import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fresh, S, UI } from '../state';
import { freshFrontier } from './frontier';
import { activeMineNodes, completeMineNode } from './mining';

describe('early mining balance', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, String(value)); },
      removeItem: (key: string) => { values.delete(key); },
      clear: () => values.clear(),
    });
    Object.assign(S, fresh());
    S.frontier = freshFrontier();
    S.frontier.nodesDay = S.day;
    S.stamina = 100;
    UI.modal = null;
  });

  afterEach(() => vi.unstubAllGlobals());

  it('keeps amber out of the starter floor', () => {
    const goods = activeMineNodes(1).map((node) => node.good);
    expect(goods).not.toContain('amber');
    expect(new Set(goods)).toEqual(new Set(['quartz', 'turquoise']));
  });

  it('caps a perfect starter-floor vein at two items', () => {
    const result = completeMineNode(1, 0, [1, 1, 1]);
    expect(result).toMatchObject({ good: 'quartz', qty: 2, perfect: true });
  });

  it('keeps the third perfect bonus available from floor two', () => {
    const result = completeMineNode(2, 0, [1, 1, 1]);
    expect(result).toMatchObject({ good: 'turquoise', qty: 3, perfect: true });
  });
});
