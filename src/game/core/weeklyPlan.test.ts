import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fresh, S, UI } from '../state';
import { chooseWeeklyPlan, weeklyPlanStatus } from './weeklyPlan';

function stubStorage() {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, String(value)); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
  });
}

describe('optional mid-chapter weekly plans', () => {
  beforeEach(() => {
    stubStorage();
    Object.assign(S, fresh());
    delete S.weeklyPlan;
    S.day = 3;
    S.story.chapter = 2;
    S.stamina = 100;
    UI.toasts = [];
  });

  afterEach(() => vi.unstubAllGlobals());

  it('applies one real field effect and prevents a second choice that week', () => {
    Object.assign(S.plots[0], { st: 2, crop: 'wheat', water: 0.2, dead: false });
    expect(weeklyPlanStatus()).toMatchObject({ offered: true, selected: null, fieldTargets: 1 });
    expect(chooseWeeklyPlan('field')).toBe(true);
    expect(S.plots[0].water).toBeCloseTo(0.55);
    expect(S.stamina).toBe(90);
    expect(S.weeklyPlan).toMatchObject({ week: 0, day: 3, kind: 'field' });
    const demand = S.dem.wheat;
    expect(chooseWeeklyPlan('market')).toBe(false);
    expect(S.dem.wheat).toBe(demand);
    expect(S.stamina).toBe(90);
  });

  it('offers a new decision next week and applies the market effect deterministically', () => {
    S.day = 10;
    expect(weeklyPlanStatus().offered).toBe(true);
    expect(chooseWeeklyPlan('market')).toBe(true);
    expect(S.dem.wheat).toBeCloseTo(1.1);
    expect(S.dem.milk).toBeCloseTo(1.1);
    expect(S.stamina).toBe(88);
    expect(S.weeklyPlan).toMatchObject({ week: 1, kind: 'market' });
  });

  it('stays out of the tutorial and never charges an unusable field plan', () => {
    S.story.chapter = 1;
    expect(weeklyPlanStatus().offered).toBe(false);
    expect(chooseWeeklyPlan('market')).toBe(false);
    S.story.chapter = 2;
    expect(weeklyPlanStatus().fieldTargets).toBe(0);
    expect(chooseWeeklyPlan('field')).toBe(false);
    expect(S.stamina).toBe(100);
  });
});
