// نامتغیرهای سلامت بازی — هر تستی که وضعیت را تغییر می‌دهد باید این‌ها را بسنجد
import { expect } from 'vitest';
import { S } from '../../src/game/state';
import { COLS, ROWS, GOODS, PEN_CAP_LV, TROUGH_CAP, SILO_MULT } from '../../src/game/data';

const finite = (n: unknown, label: string) => {
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error(`عدد نامعتبر: ${label} = ${String(n)}`);
};

export function checkInvariants(tag = '') {
  const p = tag ? ` [${tag}]` : '';
  finite(S.coins, 'coins' + p);
  finite(S.day, 'day');
  finite(S.hour, 'hour');
  finite(S.xp, 'xp');
  finite(S.earned, 'earned');
  expect(S.coins, 'سکه هرگز منفی نشود' + p).toBeGreaterThanOrEqual(0);
  expect(S.day).toBeGreaterThanOrEqual(1);
  expect(S.hour).toBeGreaterThanOrEqual(0);
  expect(S.hour).toBeLessThan(24);
  expect(S.stamina).toBeGreaterThanOrEqual(0);
  expect(S.xp).toBeGreaterThanOrEqual(0);
  expect(S.plots.length).toBe(COLS * ROWS);
  for (const [k, v] of Object.entries(S.inv)) {
    finite(v, 'inv.' + k);
    expect(v, 'موجودی منفی: ' + k).toBeGreaterThanOrEqual(0);
    expect(GOODS.some((g) => g.id === k), 'کالای ناشناس: ' + k).toBe(true);
  }
  for (const [k, v] of Object.entries(S.seeds)) {
    expect(Number.isFinite(v) && v >= 0, 'بذر منفی: ' + k).toBe(true);
  }
  expect(S.fert).toBeGreaterThanOrEqual(0);
  expect(S.can).toBeGreaterThanOrEqual(0);
  expect(S.trough).toBeGreaterThanOrEqual(0);
  expect(S.trough).toBeLessThanOrEqual(TROUGH_CAP * SILO_MULT[2] + 1e-6);
  expect(S.honeyAcc).toBeGreaterThanOrEqual(0);
  for (const a of S.animals) {
    expect(a.ready).toBeGreaterThanOrEqual(0);
    expect(['m', 'f']).toContain(a.sex);
  }
  // ظرفیت حصارها: هیچ گونه‌ای بیش از ظرفیتش دام نداشته باشد
  for (const kind of Object.keys(S.pens) as (keyof typeof S.pens)[]) {
    const lv = S.pens[kind] ?? 0;
    const n = S.animals.filter((a) => a.kind === kind).length;
    expect(n, `دام بیش از ظرفیت حصار ${kind}`).toBeLessThanOrEqual(PEN_CAP_LV[lv] + S.nests.filter((x) => x.kind === kind).length);
  }
  for (const pl of S.plots) {
    finite(pl.prog, 'plot.prog');
    finite(pl.water, 'plot.water');
    finite(pl.fert, 'plot.fert');
    expect(pl.fert).toBeGreaterThanOrEqual(0);
    expect(pl.fert).toBeLessThanOrEqual(1.0001);
    expect(pl.water).toBeGreaterThanOrEqual(0);
    expect(pl.water).toBeLessThanOrEqual(1.0001);
  }
  for (const pond of S.ponds) {
    finite(pond.grow, 'pond.grow');
    finite(pond.feed, 'pond.feed');
    expect(pond.feed).toBeGreaterThanOrEqual(0);
  }
  for (const b of S.builds) {
    expect(Number.isFinite(b.prog)).toBe(true);
    expect(b.dur).toBeGreaterThan(0);
  }
}
