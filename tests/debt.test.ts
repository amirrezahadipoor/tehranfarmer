import { beforeEach, describe, expect, it } from 'vitest';
import { S, advance, resetGame, stamCap } from './helpers/game';
import {
  activeNote, buyScarecrow, canVisitNow, clearVisit, daysToDue, debt, floorCoins, interestOf,
  maybeOpenNextNote, minPay, payDebt, processDueDay, processRaid, raidAmount, scarecrowPrice,
  scheduleRaid, solvable, stashCap, stashDeposit, stashWithdraw, startDebt, totalRemaining, standingBand,
} from '../src/game/core/debt';
import { isQuestDone } from '../src/story/quests';
import { DUE_DAYS, MINPAY_INTEREST_FACTOR, NOTES, NOTE_COUNT, REFUND_BONUS, TOTAL_DEBT } from '../src/story/debtData';
import { farmLevel, orderScarecrow, tickBuilds } from '../src/game/state';
import { checkInvariants } from './helpers/invariants';

beforeEach(() => { localStorage.clear(); resetGame(); S.coins = 5000; startDebt(0); });

describe('سندها و قسط', () => {
  it('جمع ۶ سند برابر ۶ میلیون است', () => {
    expect(TOTAL_DEBT).toBe(6_000_000);
    expect(NOTES).toHaveLength(NOTE_COUNT);
  });

  it('minPay از سهم اصلی سند محاسبه می‌شود', () => {
    expect(minPay()).toBe(Math.ceil(NOTES[0].amount / NOTES[0].monthsTarget));
    S.debt!.noteIdx = 2; S.debt!.remaining = NOTES[2].amount;
    expect(minPay()).toBe(Math.ceil(NOTES[2].amount / NOTES[2].monthsTarget));
  });

  it('نامتغیر حل‌پذیری: minPay ≥ ۱٫۶ × بیشترین سود برای همهٔ سندها', () => {
    for (let i = 0; i < NOTE_COUNT; i++) expect(solvable(i), NOTES[i].name).toBe(true);
    for (const n of NOTES) {
      const mp = Math.ceil(n.amount / n.monthsTarget);
      expect(mp).toBeGreaterThanOrEqual(MINPAY_INTEREST_FACTOR * n.amount * n.rate);
    }
  });

  it('سود روی باقی‌مانده حساب می‌شود', () => {
    S.debt!.remaining = 100000;
    expect(interestOf()).toBe(Math.round(100000 * NOTES[0].rate));
    S.debt!.noteIdx = 2;
    expect(interestOf()).toBe(Math.round(100000 * NOTES[2].rate));
  });

  it('پرداخت سکه و باقی‌مانده را همگام کم می‌کند', () => {
    const c0 = S.coins, r0 = S.debt!.remaining;
    const res = payDebt(1000);
    expect(res.paid).toBe(1000);
    expect(S.coins).toBe(c0 - 1000);
    expect(S.debt!.remaining).toBe(r0 - 1000);
    expect(S.debt!.paidThisCycle).toBe(1000);
    expect(debt()!.history.length).toBeGreaterThan(0);
  });

  it('پرداخت بیش از موجودی، بیشتر از سکه برنمی‌دارد', () => {
    S.coins = 300;
    const res = payDebt(10000);
    expect(res.paid).toBe(300);
    expect(S.coins).toBe(0);
    checkInvariants('pay');
  });

  it('پرداخت کامل سند، اعتبار می‌دهد', () => {
    S.coins = 10 ** 6;
    const st = S.debt!.standing;
    payDebt(S.debt!.remaining);
    expect(S.debt!.remaining).toBe(0);
    expect(S.debt!.standing).toBeGreaterThan(st);
  });
});

describe('روز قسط', () => {
  it('پرداخت‌نشده: برداشت با کف امن + جریمه + کتک', () => {
    S.coins = 2000;
    const floor = floorCoins();
    const r = processDueDay();
    expect(r.kind).toBe('due-missed');
    expect(S.coins).toBeGreaterThanOrEqual(floor);
    expect(r.lateFee).toBeGreaterThan(0);
    expect(S.debt!.beatings).toBe(1);
    expect(S.debt!.standing).toBeLessThan(60);
    expect(S.stamina).toBeGreaterThanOrEqual(stamCap() * 0.5);
    expect(S.debt!.dueDay).toBe(S.day + DUE_DAYS);
  });

  it('پرداخت‌شده: بدون کتک، اعتبار بیشتر و قسط بعدی', () => {
    S.coins = 10 ** 6;
    S.debt!.paidThisCycle = minPay();
    const st = S.debt!.standing;
    const r = processDueDay();
    expect(r.kind).toBe('due-paid');
    expect(S.debt!.beatings).toBe(0);
    expect(S.debt!.standing).toBeGreaterThan(st);
    expect(S.debt!.paidThisCycle).toBe(0);
  });

  it('کف امن: اگر جیب خالی باشد چیزی برداشته نمی‌شود', () => {
    S.coins = 0;
    const r = processDueDay();
    expect(r.taken).toBe(0);
    expect(S.coins).toBe(0);
  });
});

describe('باج‌گیری سرزده', () => {
  it('نیمی به بدهی و نیمی به باج‌های بازپرداختی می‌رود', () => {
    S.coins = 100000;
    const r0 = S.debt!.remaining;
    processRaid();
    expect(S.debt!.extorted).toBeGreaterThan(0);
    expect(S.debt!.remaining).toBeLessThan(r0);
    expect(S.coins).toBeGreaterThanOrEqual(floorCoins());
  });

  it('قلک از باج در امان است', () => {
    S.coins = 50000;
    stashDeposit(10000);
    const stash = S.debt!.stash;
    processRaid();
    expect(S.debt!.stash).toBe(stash);
    expect(stashWithdraw(stash)).toBe(stash);
    expect(S.debt!.stash).toBe(0);
  });

  it('ظرفیت قلک محدود است', () => {
    S.coins = 10 ** 7;
    expect(stashCap()).toBeGreaterThanOrEqual(500);
    stashDeposit(10 ** 7);
    expect(S.debt!.stash).toBe(stashCap());
  });

  it('قیمت مترسک به minPay گره خورده است', () => {
    expect(scarecrowPrice()).toBeGreaterThan(0);
    S.debt!.noteIdx = 3; S.debt!.remaining = NOTES[3].amount;
    expect(scarecrowPrice()).toBeGreaterThan(Math.round(Math.ceil(NOTES[0].amount / NOTES[0].monthsTarget) * 4));
  });

  it('مترسک مبلغ باج را کم می‌کند', () => {
    S.debt!.noteIdx = 3; S.debt!.remaining = NOTES[3].amount;
    S.coins = 200000;
    const before = raidAmount();
    S.coins = 10 ** 6;
    buyScarecrow(); buyScarecrow(); buyScarecrow();
    S.coins = 200000;
    expect(raidAmount()).toBeLessThan(before);
  });

  it('فاصلهٔ باج‌گیری پس از مترسک بیشتر می‌شود', () => {
    S.debt!.nextRaidDay = 0;
    scheduleRaid(100);
    const g0 = S.debt!.nextRaidDay - 100;
    S.debt!.scarecrow = 3;
    scheduleRaid(100);
    expect(S.debt!.nextRaidDay - 100).toBeGreaterThanOrEqual(g0);
  });

  it('سفارش مترسک از نجاری صف ساخت کارگر فیزیکی می‌سازد و سطح به سطح ارتقا می‌دهد', () => {
    S.coins = 500000;
    expect(S.debt!.scarecrow).toBe(0);
    orderScarecrow();
    expect(S.builds).toHaveLength(1);
    expect(S.builds[0].kind).toBe('scarecrow');
    tickBuilds(100);
    expect(S.builds).toHaveLength(0);
    expect(S.debt!.scarecrow).toBe(1);
    orderScarecrow();
    tickBuilds(100);
    expect(S.debt!.scarecrow).toBe(2);
    orderScarecrow();
    tickBuilds(100);
    expect(S.debt!.scarecrow).toBe(3);
  });

  it('باج هرگز از کف امن پایین نمی‌آورد', () => {
    S.coins = floorCoins() + 5;
    processRaid();
    expect(S.coins).toBeGreaterThanOrEqual(floorCoins());
  });
});

describe('اعتبار و محافظت تجربه', () => {
  it('اعتبار بالا/پایین نوار درست می‌دهد', () => {
    S.debt!.standing = 90; expect(standingBand()).toBe('good');
    S.debt!.standing = 50; expect(standingBand()).toBe('normal');
    S.debt!.standing = 10; expect(standingBand()).toBe('bad');
  });

  it('ملاقات فقط ۹ تا ۱۷، بدون مودال و بعد از ۲۰ ثانیه', () => {
    expect(canVisitNow(10, false, false, 30000)).toBe(true);
    expect(canVisitNow(8, false, false, 30000)).toBe(false);
    expect(canVisitNow(18, false, false, 30000)).toBe(false);
    expect(canVisitNow(10, true, false, 30000)).toBe(false);
    expect(canVisitNow(10, false, true, 30000)).toBe(false);
    expect(canVisitNow(10, false, false, 5000)).toBe(false);
  });

  it('روزها تا قسط درست شمرده می‌شود', () => {
    S.day = S.debt!.dueDay - 3;
    expect(daysToDue()).toBe(3);
    S.day = S.debt!.dueDay + 5;
    expect(daysToDue()).toBe(0);
  });
});

describe('باز شدن سند بعدی و پایان بازی', () => {
  it('بدون کوئست فصل، سند بعدی باز نمی‌شود', () => {
    S.coins = 10 ** 6;
    payDebt(S.debt!.remaining);
    expect(S.debt!.noteIdx).toBe(0);
    expect(maybeOpenNextNote()).toBe(false);
  });

  it('با کوئست انجام‌شده و روز کافی، سند بعدی باز می‌شود', () => {
    S.coins = 10 ** 6;
    S.debt!.chapterStartDay = -100;
    S.story.questDone[1] = true;
    payDebt(S.debt!.remaining);
    maybeOpenNextNote();
    expect(S.debt!.noteIdx).toBe(1);
    expect(S.story.chapter).toBe(2);
    expect(S.debt!.remaining).toBe(NOTES[1].amount);
  });

  it('پایان بازی: باج‌ها با ۲۰٪ سود پس داده می‌شود', () => {
    S.debt!.noteIdx = NOTE_COUNT - 1;
    S.debt!.remaining = 10;
    S.debt!.extorted = 10000;
    S.story.questDone[6] = true;
    S.coins = 1000;
    payDebt(10);
    maybeOpenNextNote();
    expect(S.story.postgame).toBe(true);
    expect(S.coins).toBeGreaterThanOrEqual(1000 + 10000 * REFUND_BONUS - 10);
    expect(S.debt!.extorted).toBe(0);
  });

  it('کوئست فصل ۱ با ۲۰ برداشت تمام می‌شود', () => {
    S.stats.harv = 19;
    expect(isQuestDone(1)).toBe(false);
    S.stats.harv = 20;
    expect(isQuestDone(1)).toBe(true);
  });
});

describe('چرخهٔ روز', () => {
  it('پیشبرد روزها، قسط را سر وقت اجرا می‌کند', () => {
    S.coins = 100;
    const due = S.debt!.dueDay;
    for (let d = 0; d < due + 1; d++) advance(24);
    expect(S.debt!.beatings).toBeGreaterThanOrEqual(1);
    expect(S.debt!.dueDay).toBeGreaterThan(due);
    expect(S.debt!.pendingVisit).toBe('due');
    clearVisit();
    expect(S.debt!.pendingVisit).toBeNull();
    checkInvariants('debt-cycle');
  });

  it('کل بدهی باقی‌مانده شامل سندهای آینده است', () => {
    expect(totalRemaining()).toBe(TOTAL_DEBT);
    S.debt!.remaining = 0;
    expect(totalRemaining()).toBe(TOTAL_DEBT - NOTES[0].amount);
  });

  it('سطح مزرعه در دسترس است و سند فعال نام دارد', () => {
    expect(farmLevel()).toBeGreaterThanOrEqual(1);
    expect(activeNote()?.name).toBe(NOTES[0].name);
  });
});
