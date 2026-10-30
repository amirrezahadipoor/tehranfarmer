import { beforeEach, describe, expect, it } from 'vitest';
import { fresh, S, UI } from './state';
import { performSleep, requestSleep, sleepConfirmMessage } from './sleep';

describe('sleep entry policy', () => {
  beforeEach(() => { Object.assign(S, fresh()); UI.confirm = null; UI.modal = null; });

  it('requires confirmation before 18:00 and does not advance on request', () => {
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
  });

  it('keeps night sleep one-touch', () => {
    S.hour = 18;
    requestSleep();
    expect(UI.confirm).toBe(null);
    expect(S.day).toBe(2);
    expect(S.hour).toBe(6);
  });
});
