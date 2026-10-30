import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fresh, S, UI } from '../state';
import { resetLvCache } from './progress';
import {
  FESTIVAL_CONTEST_STAMINA,
  FESTIVAL_GOLD_COINS,
  completeFestivalContest,
  ensureFrontier,
  festivalBoothPlayed,
  freshFrontier,
  isTownFestivalActive,
  judgeFestivalSubmission,
  redeemFestivalTokens,
  ringTownFestivalBell,
} from './frontier';

function stubStorage() {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, String(value)); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
  });
}

describe('weekly festival cadence and bounded rewards', () => {
  beforeEach(() => {
    stubStorage();
    Object.assign(S, fresh());
    S.frontier = freshFrontier();
    S.frontier.nodesDay = S.day;
    S.day = 2;
    S.coins = 0;
    S.earned = 0;
    S.stamina = 100;
    S.inv = { wheat: 20 };
    S.pack = {};
    UI.modal = null;
    UI.toasts = [];
    resetLvCache();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('cannot grant booth rewards while the fair is closed', () => {
    expect(isTownFestivalActive()).toBe(false);
    expect(judgeFestivalSubmission(['wheat'])).toBeNull();
    expect(completeFestivalContest('cauldron', 1)).toBeNull();
    expect(S.coins).toBe(0);
    expect(S.inv.wheat).toBe(20);
  });

  it('opens once per week and grants each booth only one full reward in that week', () => {
    expect(ringTownFestivalBell()).toBe(true);
    expect(ringTownFestivalBell()).toBe(false);
    expect(isTownFestivalActive()).toBe(true);

    const judged = judgeFestivalSubmission(['wheat']);
    expect(judged).toMatchObject({ rank: 3, coins: 100, tokens: 1 });
    const afterJudge = S.coins;
    expect(judgeFestivalSubmission(['wheat'])).toBeNull();
    expect(S.coins).toBe(afterJudge);
    expect(festivalBoothPlayed('judge')).toBe(true);

    const stamina = S.stamina;
    expect(completeFestivalContest('cauldron', 1)).toMatchObject({ coins: 230, tokens: 2 });
    expect(S.stamina).toBe(stamina - FESTIVAL_CONTEST_STAMINA);
    const afterContest = S.coins;
    expect(completeFestivalContest('cauldron', 1)).toBeNull();
    expect(S.coins).toBe(afterContest);

    S.day = 7;
    ensureFrontier().nodesDay = 7;
    expect(isTownFestivalActive()).toBe(true);
    expect(judgeFestivalSubmission(['wheat'])).toBeNull();
  });

  it('starts a fresh reward week instead of carrying daily rewards forward', () => {
    ringTownFestivalBell();
    expect(judgeFestivalSubmission(['wheat'])?.coins).toBe(100);
    S.day = 8;
    ensureFrontier().nodesDay = 8;
    expect(isTownFestivalActive()).toBe(false);
    expect(festivalBoothPlayed('judge')).toBe(false);
    expect(ringTownFestivalBell()).toBe(true);
    expect(judgeFestivalSubmission(['wheat'])?.coins).toBe(100);
  });

  it('requires contest stamina and keeps token-to-gold conversion bounded', () => {
    ringTownFestivalBell();
    S.stamina = FESTIVAL_CONTEST_STAMINA - 1;
    expect(completeFestivalContest('archery', 1)).toBeNull();
    expect(S.coins).toBe(0);

    ensureFrontier().festivalTokens = 5;
    expect(redeemFestivalTokens('gold')).toBe(true);
    expect(S.coins).toBe(FESTIVAL_GOLD_COINS);
    expect(ensureFrontier().festivalTokens).toBe(0);
  });
});
