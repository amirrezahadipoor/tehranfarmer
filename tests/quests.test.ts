import { beforeEach, describe, expect, it } from 'vitest';
import { S, advance, resetGame } from './helpers/game';
import { claim, ensureQuests, isClaimed, questDone, questProgress, metric } from '../src/story/dailyQuests';
import { migrateSave, SAVE_VERSION } from '../src/game/core/saveMigrations';
import { checkInvariants } from './helpers/invariants';

beforeEach(() => { localStorage.clear(); resetGame(); ensureQuests(true); });

describe('کوئست روزانه و هفتگی', () => {
  it('سه کوئست روزانه و یک کوئست هفتگی ساخته می‌شود', () => {
    expect(S.quests.daily).toHaveLength(3);
    expect(S.quests.weekly).not.toBeNull();
    for (const g of S.quests.daily) {
      expect(g.target).toBeGreaterThan(0);
      expect(g.reward).toBeGreaterThan(0);
    }
  });

  it('پیشرفت از لحظهٔ ساخت کوئست شمرده می‌شود', () => {
    const g = S.quests.daily[0];
    const before = questProgress(g);
    S.stats[g.kind === 'sell' ? 'harv' : g.kind] = (S.stats[g.kind] ?? 0);
    // شبیه‌سازی پیشرفت سنجهٔ کوئست
    if (g.kind === 'harvest') S.stats.harv = (S.stats.harv ?? 0) + g.target;
    else if (g.kind === 'plant') S.stats.plants = (S.stats.plants ?? 0) + g.target;
    else if (g.kind === 'collect') S.stats.collect = (S.stats.collect ?? 0) + g.target;
    else if (g.kind === 'honey') S.stats.honey = (S.stats.honey ?? 0) + g.target;
    else if (g.kind === 'pond') S.stats.pondH = (S.stats.pondH ?? 0) + g.target;
    else if (g.kind === 'sell') S.earned = (S.earned ?? 0) + g.target;
    else if (g.kind === 'build') S.stats.builds = (S.stats.builds ?? 0) + g.target;
    else if (g.kind === 'fish') S.stats.fish = (S.stats.fish ?? 0) + g.target;
    else if (g.kind === 'babies') S.stats.babies = (S.stats.babies ?? 0) + g.target;
    expect(questProgress(g)).toBeGreaterThanOrEqual(before + g.target);
    expect(questDone(g)).toBe(true);
  });

  it('پاداش فقط یک بار گرفته می‌شود', () => {
    const g = S.quests.daily[0];
    S.stats.harv = (S.stats.harv ?? 0) + 1000;
    S.stats.collect = (S.stats.collect ?? 0) + 1000;
    S.stats.plants = (S.stats.plants ?? 0) + 1000;
    S.stats.honey = (S.stats.honey ?? 0) + 1000;
    S.stats.pondH = (S.stats.pondH ?? 0) + 1000;
    S.stats.builds = (S.stats.builds ?? 0) + 1000;
    S.stats.fish = (S.stats.fish ?? 0) + 1000;
    S.stats.babies = (S.stats.babies ?? 0) + 1000;
    S.earned += 100000;
    const c0 = S.coins;
    expect(claim(g)).toBe(true);
    expect(S.coins).toBeGreaterThan(c0);
    expect(isClaimed(g)).toBe(true);
    expect(claim(g)).toBe(false);
  });

  it('پاداش قبل از تکمیل گرفته نمی‌شود', () => {
    const g = S.quests.daily[0];
    expect(claim(g)).toBe(false);
  });

  it('روز بعد، کوئست‌های تازه ساخته می‌شوند و ادعاها پاک می‌شوند', () => {
    const g = S.quests.daily[0];
    S.stats.harv = (S.stats.harv ?? 0) + 500;
    S.stats.collect = (S.stats.collect ?? 0) + 500;
    S.stats.plants = (S.stats.plants ?? 0) + 500;
    S.stats.honey = (S.stats.honey ?? 0) + 500;
    S.stats.pondH = (S.stats.pondH ?? 0) + 500;
    S.stats.builds = (S.stats.builds ?? 0) + 500;
    S.stats.fish = (S.stats.fish ?? 0) + 500;
    S.stats.babies = (S.stats.babies ?? 0) + 500;
    S.earned += 100000;
    claim(g);
    const week0 = S.quests.week;
    advance(24);
    expect(S.quests.day).toBe(S.day);
    expect(Object.keys(S.quests.claimed).every((k) => k.startsWith('w:'))).toBe(true);
    expect(S.quests.week).toBeGreaterThanOrEqual(week0);
    checkInvariants('quests');
  });

  it('در ۵۰ روز متوالی هیچ مجموعهٔ کوئست روزانهٔ تکراری تولید نمی‌شود', () => {
    const seen = new Set<string>();
    for (let d = 0; d < 50; d++) {
      ensureQuests();
      const sig = S.quests.daily.map((q) => `${q.kind}:${q.target}`).sort().join('|');
      expect(seen.has(sig), `تکرار در روز ${S.day}: ${sig}`).toBe(false);
      seen.add(sig);
      advance(24);
    }
    expect(seen.size).toBe(50);
  });

  it('سنجه‌ها با آمار واقعی هم‌خوان‌اند', () => {
    S.stats.harv = 42;
    S.earned = 900;
    expect(metric('harvest')).toBe(42);
    expect(metric('sell')).toBe(900);
  });
});

describe('سِیو نسخهٔ ۴', () => {
  it('نسخهٔ ۳ به ۴ مهاجرت می‌کند و کوئست اضافه می‌شود', () => {
    const d = migrateSave({ v: 3, coins: 10, day: 3, xp: 0, quests: undefined })!;
    expect(d.v).toBe(SAVE_VERSION);
    expect(d.quests).toBeTruthy();
  });

  it('نسخهٔ ۱ تا ۴ زنجیرهٔ کامل مهاجرت را طی می‌کند', () => {
    const d = migrateSave({ v: 1, coins: 5, day: 30, xp: 100, lv: { land: 2 } })!;
    expect(d.v).toBe(SAVE_VERSION);
    expect(d.story).toBeTruthy();
    expect(d.debt).toBeTruthy();
    expect(d.quests).toBeTruthy();
  });
});
