import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { installDom } from './helpers/dom';
import { S, UI, resetGame, tickLiveClock } from '../src/game/state';
import { LIVE_DAY_SECONDS } from '../src/game/data';
import { runLiveSim } from '../scripts/live-bot';

describe('live-clock balance evidence', () => {
  beforeAll(() => installDom());
  beforeEach(() => { resetGame(); UI.scene = 'farm'; });

  it('uses the actual 480-second day, never the retired 192-second conversion', () => {
    expect(LIVE_DAY_SECONDS).toBe(480);
    tickLiveClock(192);
    expect(S.day).toBe(1);
    expect(S.hour).toBeCloseTo(16.6, 5);
    resetGame();
    tickLiveClock(480);
    expect(S.day).toBe(2);
    expect(S.hour).toBeCloseTo(7, 5);
  });

  it('live campaign time includes world actions, paused menus and real sleeps', () => {
    const result = runLiveSim('normal', 2, 1000);
    expect(result.sleeps).toBe(2);
    expect(result.plotActions).toBeGreaterThan(0);
    expect(result.worldSeconds).toBeGreaterThan(400);
    expect(result.pausedSeconds).toBeGreaterThan(0);
    expect(result.wallSeconds).toBeCloseTo(result.worldSeconds + result.pausedSeconds, 5);
    expect(result.wallHours).toBeGreaterThan(0);
    expect(result.completed).toBe(false);
  });

  it('sleep-spam advances days quickly but cannot satisfy the harvest-gated story', () => {
    const result = runLiveSim('sleep-spam', 4, 1000);
    expect(result.sleeps).toBe(4);
    expect(result.plotActions).toBe(0);
    expect(result.worldSeconds).toBe(0);
    expect(result.wallSeconds).toBeCloseTo(4.8, 5);
    expect(result.postgameDay).toBeNull();
    expect(result.completed).toBe(false);
  });
});
