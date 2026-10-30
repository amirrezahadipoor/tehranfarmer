import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fresh, S, stamCap, UI } from './state';
import { performSleep, requestSleep, sleepConfirmMessage, sleepStaminaAfter } from './sleep';

const SAVE_KEY = 'mazrae-rangi-save-v1';

function readPersisted() {
  const raw = localStorage.getItem(SAVE_KEY);
  expect(raw).toBeTruthy();
  return JSON.parse(raw!) as { day: number; hour: number; stamina: number };
}

describe('sleep entry policy', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, String(value)); },
      removeItem: (key: string) => { values.delete(key); },
      clear: () => values.clear(),
    });
    Object.assign(S, fresh());
    UI.confirm = null;
    UI.modal = null;
  });

  afterEach(() => vi.unstubAllGlobals());

  it('requires confirmation before 18:00 and persists the real 06:00 morning state', () => {
    S.hour = 17.99;
    requestSleep();
    expect(UI.confirm).toBe('sleep');
    expect(S.day).toBe(1);
    expect(S.hour).toBe(17.99);
    expect(sleepConfirmMessage().length).toBeGreaterThan(20);
    performSleep();
    expect(UI.confirm).toBe(null);
    expect(S.day).toBe(2);
    expect(S.hour).toBe(6);
    expect(readPersisted()).toMatchObject({ day: 2, hour: 6 });
  });

  it('keeps night sleep one-touch and does not leave a midnight save behind', () => {
    S.hour = 18;
    requestSleep();
    expect(UI.confirm).toBe(null);
    expect(S.day).toBe(2);
    expect(S.hour).toBe(6);
    expect(readPersisted()).toMatchObject({ day: 2, hour: 6 });
  });

  it('gives home sleep full stamina while quick rest recovers only 75% of missing stamina', () => {
    expect(sleepStaminaAfter(20, 100, 100, 'quick')).toBe(80);
    expect(sleepStaminaAfter(20, 100, 100, 'home')).toBe(100);

    S.hour = 18;
    S.stamina = 20;
    requestSleep('quick');
    const quickExpected = sleepStaminaAfter(20, stamCap(), stamCap(), 'quick');
    expect(S.stamina).toBe(quickExpected);
    expect(readPersisted()).toMatchObject({ day: 2, hour: 6, stamina: quickExpected });
  });

  it('preserves the home origin through confirmation and persists the full recovery', () => {
    S.hour = 12;
    S.stamina = 20;
    requestSleep('home');
    expect(UI.confirm).toBe('sleep');
    expect(sleepConfirmMessage()).toContain('نیروی کامل');
    performSleep();
    expect(S.stamina).toBe(stamCap());
    expect(readPersisted()).toMatchObject({ day: 2, hour: 6, stamina: stamCap() });
  });
});
