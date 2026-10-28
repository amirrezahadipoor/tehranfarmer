import { beforeAll, describe, expect, it } from 'vitest';
import { runSim, type SimMetrics } from '../scripts/bot';
import { BEATINGS_MAX, BEATINGS_MIN, NOTES, TOTAL_DEBT } from '../src/story/debtData';

let noDebtRun: SimMetrics;
let goodRun: SimMetrics;
let normalRun: SimMetrics;

beforeAll(async () => {
  // شبیه‌سازی‌های طولانی نباید رویدادهای RPC ورکر را تا پایان هر سه اجرا مسدود کنند.
  const yieldToWorker = () => new Promise<void>((resolve) => setImmediate(resolve));
  noDebtRun = runSim('optimal', 3000, 1001, false);
  await yieldToWorker();
  goodRun = runSim('good', 3000, 1001, true);
  await yieldToWorker();
  normalRun = runSim('normal', 3000, 1001, true);
  await yieldToWorker();
}, 300_000);

describe('کالیبراسیون بالانس اسناد، طول داستان و اثر بدهی (P5-03..P5-06)', () => {
  it('مجموع ۶ سند دقیقاً ۶٬۰۰۰٬۰۰۰ سکه است و هر سند ≈ ۴۰٪±۵٪ درآمد فصل را می‌پوشاند', () => {
    expect(TOTAL_DEBT).toBe(6_000_000);
    expect(goodRun.postgameDay).not.toBeNull();
    expect(goodRun.noteShare).toHaveLength(NOTES.length);
    for (let i = 0; i < NOTES.length; i++) {
      expect(goodRun.noteShare[i], `نسبت سند فصل ${i + 1}`).toBeGreaterThanOrEqual(0.35);
      expect(goodRun.noteShare[i], `نسبت سند فصل ${i + 1}`).toBeLessThanOrEqual(0.45);
    }
  });

  it('تعداد کتک بازیکن معمولی بین ۲۰ تا ۲۸ و طول داستان بین ۶۰ تا ۸۵ ساعت است', () => {
    const hours = (normalRun.days * 192) / 3600;
    expect(normalRun.postgameDay).not.toBeNull();
    expect(normalRun.beatings).toBeGreaterThanOrEqual(BEATINGS_MIN);
    expect(normalRun.beatings).toBeLessThanOrEqual(BEATINGS_MAX);
    expect(hours).toBeGreaterThanOrEqual(60);
    expect(hours).toBeLessThanOrEqual(85);
  });

  it('بدهی زمان رسیدن به سطح ۳۰ را بین +۱۵٪ تا +۳۵٪ افزایش می‌دهد', () => {
    expect(noDebtRun.level30Day).not.toBeNull();
    expect(goodRun.level30Day).not.toBeNull();
    const ratio = goodRun.level30Day! / noDebtRun.level30Day!;
    expect(ratio).toBeGreaterThanOrEqual(1.15);
    expect(ratio).toBeLessThanOrEqual(1.35);
  });

  it('سیاست خوش‌حساب حداقل ۱۵٪ سریع‌تر از سیاست معمولی داستان را تمام می‌کند', () => {
    const gain = (normalRun.days - goodRun.days) / normalRun.days;
    expect(gain).toBeGreaterThanOrEqual(0.15);
  });
});
