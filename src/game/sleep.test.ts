import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fresh, S, UI } from './state';
import { performSleep, requestSleep, sleepConfirmMessage } from './sleep';

const SAVE_KEY = 'mazrae-rangi-save-v1';

function readPersisted() {
  const raw = localStorage.getItem(SAVE_KEY);
  expect(raw).toBeTruthy();
  return JSON.parse(raw!) as { day: number; hour: number };
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
});
