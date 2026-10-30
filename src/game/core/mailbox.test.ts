import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fresh, S, stamCap, UI } from '../state';
import type { MailEntry } from '../../strings/mailText';
import { claimMailParcel } from './mailbox';

function parcelEntry(): MailEntry {
  return {
    id: 'test-parcel', day: 1, season: 0, category: 'story', sender: 'grandma', template: 'test',
    read: false, claimed: false,
    parcel: [{ kind: 'seed', id: 'wheat', qty: 2 }, { kind: 'stamina', qty: 20 }],
  };
}

describe('mail parcel stamina safety', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, String(value)); },
      removeItem: (key: string) => { values.delete(key); },
      clear: () => values.clear(),
    });
    Object.assign(S, fresh());
    S.mail = { inbox: [parcelEntry()], sentKeys: {}, lastDealDay: 0 };
    UI.toasts = [];
  });

  afterEach(() => vi.unstubAllGlobals());

  it('does not consume any part of the parcel when its stamina would overflow', () => {
    S.stamina = stamCap();
    const seeds = S.seeds.wheat;
    expect(claimMailParcel('test-parcel')).toBe(false);
    expect(S.seeds.wheat).toBe(seeds);
    expect(S.stamina).toBe(stamCap());
    expect(S.mail!.inbox[0].claimed).toBe(false);
    expect(UI.toasts.some((entry) => entry.text.includes('نیرو') || entry.text.includes('Stamina'))).toBe(true);
  });

  it('claims the complete parcel atomically once enough stamina room exists', () => {
    S.stamina = stamCap() - 20;
    const seeds = S.seeds.wheat;
    expect(claimMailParcel('test-parcel')).toBe(true);
    expect(S.seeds.wheat).toBe(seeds + 2);
    expect(S.stamina).toBe(stamCap());
    expect(S.mail!.inbox[0].claimed).toBe(true);
  });
});
