import { describe, expect, it } from 'vitest';
import { runSim, type Policy } from '../scripts/bot';
import { S } from './helpers/game';
import { checkInvariants } from './helpers/invariants';

const POLICIES: Policy[] = ['optimal', 'good', 'normal', 'bad'];

describe('پایداری اقتصادی در ۱۰۰ اجرای مستقل (P5-09)', () => {
  it('۱۰۰ اجرای مستقل با بذرهای تصادفی مختلف بدون NaN، منفی یا بی‌نهایت اجرا می‌شوند', () => {
    for (let i = 0; i < 100; i++) {
      const policy = POLICIES[i % POLICIES.length];
      const m = runSim(policy, 120, 50_000 + i * 37, true);
      expect(Number.isFinite(m.coins)).toBe(true);
      expect(m.coins).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(m.earned)).toBe(true);
      expect(m.earned).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(m.paidTotal)).toBe(true);
      expect(m.paidTotal).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(m.extorted)).toBe(true);
      expect(m.extorted).toBeGreaterThanOrEqual(0);
      expect(m.softLockDays).toBe(0);
      checkInvariants(`run-${i}-${policy}`);
      for (const v of Object.values(S.dem)) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThan(0);
      }
    }
  });
});
