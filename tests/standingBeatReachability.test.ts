import { beforeEach, describe, expect, it } from 'vitest';
import { S, resetGame } from './helpers/game';
import { addStanding, startDebt, standingBand } from '../src/game/core/debt';
import { STAND_BAD, STAND_BEAT, STAND_ON_TIME, STANDING_START, STAND_GOOD } from '../src/story/debtData';
import { checkInvariants } from './helpers/invariants';

beforeEach(() => { localStorage.clear(); resetGame(); S.coins = 5000; startDebt(0); });

describe('DEF اکت۲۹: کتک باید باندِ بدحساب را عملاً قابل دسترس کند', () => {
  it('یک کتک حتی از سقفِ اعتبار (۱۰۰) هم زیرِ مرزِ بدحساب می‌برد', () => {
    S.debt!.standing = 100;
    addStanding(STAND_BEAT);
    expect(S.debt!.standing).toBeLessThan(STAND_BAD);
    expect(standingBand()).toBe('bad');
    checkInvariants();
  });

  it('کتک از استارت‌پوینت (۶۰) هم زیرِ مرز می‌برد — نه اینکه با سینک‌های منفعل خنثی شود', () => {
    S.debt!.standing = STANDING_START;
    addStanding(STAND_BEAT);
    expect(S.debt!.standing).toBeLessThan(STAND_BAD);
    expect(standingBand()).toBe('bad');
  });

  it('بازیابی صادقانه: سرسیدهای سرِوقت باند را به خوش‌حساب برمی‌گردانند', () => {
    S.debt!.standing = 5;
    expect(standingBand()).toBe('bad');
    let guard = 0;
    while (standingBand() !== 'good' && guard++ < 40) addStanding(STAND_ON_TIME);
    expect(S.debt!.standing).toBeGreaterThanOrEqual(STAND_GOOD);
    expect(standingBand()).toBe('good');
    checkInvariants();
  });

  it('دامنهٔ اعتبار همچنان بین ۰ تا ۱۰۰ clamp می‌شود', () => {
    for (let i = 0; i < 30; i++) addStanding(STAND_BEAT);
    expect(S.debt!.standing).toBe(0);
    for (let i = 0; i < 60; i++) addStanding(STAND_ON_TIME);
    expect(S.debt!.standing).toBe(100);
    checkInvariants();
  });
});
