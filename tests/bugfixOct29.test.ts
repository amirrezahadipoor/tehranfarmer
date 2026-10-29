import { beforeEach, describe, expect, it } from 'vitest';
import { S, UI, buyFeed, invCap, invCount, resetGame } from './helpers/game';
import { buyFingerling } from '../src/game/state';
import { debt, maybeReactionScene, minPay, payDebt, processRaid, startDebt } from '../src/game/core/debt';
import { advanceNode, pendingNode } from '../src/story/engine';
import { visitNodeId } from '../src/story/story';
import { RAID_TO_DEBT_HALF, STAND_BAD } from '../src/story/debtData';

beforeEach(() => { localStorage.clear(); resetGame(); S.coins = 5000; startDebt(0); });

describe('رفع باگ ۱: باجِ رفته‌ به بدهی در مجموع پرداختی حساب می‌شود', () => {
  it('processRaid نصفِ باج را هم به paidTotal اضافه می‌کند تا دستاورد ۶ میلیونی قفل نماند', () => {
    const d = debt()!;
    S.coins = 100000;
    d.remaining = 40000;
    const paidBefore = d.paidTotal;
    const coinsBefore = S.coins;
    processRaid();
    const taken = coinsBefore - S.coins;
    expect(taken).toBeGreaterThan(0);
    const toDebt = Math.round(taken * RAID_TO_DEBT_HALF);
    expect(d.paidTotal).toBe(paidBefore + toDebt);
    expect(d.remaining).toBe(40000 - toDebt);
    expect(d.extorted).toBe(taken - toDebt);
  });

  it('پرداخت معمولی و باج هر کدام دقیقاً یک‌بار شمرده می‌شوند', () => {
    const d = debt()!;
    d.remaining = 100000;
    S.coins = 200000;
    processRaid();
    const afterRaid = d.paidTotal;
    expect(afterRaid).toBeGreaterThan(0); // سهم بدهی از باج
    payDebt(5000);
    expect(d.paidTotal).toBe(afterRaid + 5000); // بدون شمارش دوبارهٔ باج
    expect(d.remaining).toBe(100000 - Math.round(afterRaid) - 5000);
  });
});

describe('رفع باگ ۲: صحنه‌های واکنش جهانگیر زنده شدند', () => {
  it('جیب خالی: reaction-poor فقط یک‌بار و بازگشت دفتر بعد از صحنه', () => {
    S.story.prologueSeen = true;
    UI.started = true;
    S.coins = 10; // زیر minPay
    expect(maybeReactionScene()).toBe(true);
    expect(pendingNode()?.id).toBe('reaction-poor');
    advanceNode(pendingNode()!);
    expect(S.story.pending).toBeNull();
    expect(S.story.seen['reaction-poor']).toBe(true);
    expect(UI.modal).toBe('ledger'); // دفتر بعد از صحنه دوباره بازمی‌گردد
    expect(maybeReactionScene()).toBe(false); // تکرار نمی‌شود
    expect(pendingNode()).toBeNull();
  });

  it('وضعیت میانی (نه خالی نه پر) هیچ صحنه‌ای ندارد', () => {
    S.story.prologueSeen = true;
    UI.started = true;
    S.coins = minPay() * 2;
    expect(maybeReactionScene()).toBe(false);
    expect(pendingNode()).toBeNull();
  });

  it('جیب پر: reaction-rich و اعتبار بد حتی با پول خالی: reaction-bad مقدم است', () => {
    S.story.prologueSeen = true;
    UI.started = true;
    S.coins = minPay() * 10;
    expect(maybeReactionScene()).toBe(true);
    expect(pendingNode()?.id).toBe('reaction-rich');
    advanceNode(pendingNode()!);
    S.debt!.standing = STAND_BAD - 1;
    S.coins = 0;
    expect(maybeReactionScene()).toBe(true);
    expect(pendingNode()?.id).toBe('reaction-bad');
    advanceNode(pendingNode()!);
    expect(S.story.seen['reaction-bad']).toBe(true);
    expect(S.story.seen['reaction-rich']).toBe(true);
  });

  it('در محیط خودکار (webdriver) صحنه‌ای اجرا نمی‌شود', () => {
    S.story.prologueSeen = true;
    UI.started = true;
    S.coins = 0;
    const g = globalThis as { navigator?: { webdriver?: boolean } };
    if (!g.navigator) Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
    const nav = g.navigator!;
    Object.defineProperty(nav, 'webdriver', { value: true, configurable: true });
    expect(maybeReactionScene()).toBe(false);
    expect(pendingNode()).toBeNull();
    Object.defineProperty(nav, 'webdriver', { value: false, configurable: true });
  });
});

describe('رفع باگ ۳: سقف انبار با خریدهای صحیح', () => {
  it('علوفه از موجودیِ کسریِ نزدیک سقف رد نمی‌شود', () => {
    S.coins = 20000;
    const cap = invCap();
    S.inv.wheat = cap - 0.5;
    buyFeed(5);
    expect(invCount()).toBeLessThanOrEqual(cap);
    expect(S.inv.feed ?? 0).toBe(0);
    S.inv.wheat = cap - 2.5;
    buyFeed(5);
    expect(S.inv.feed).toBe(2);
    expect(invCount()).toBeLessThanOrEqual(cap);
  });

  it('بچه‌ماهی هم سقف را با فاصلهٔ واقعی رعایت می‌کند', () => {
    S.coins = 20000;
    const cap = invCap();
    S.inv.wheat = cap - 0.5;
    buyFingerling(3);
    expect(invCount()).toBeLessThanOrEqual(cap);
    expect(S.inv.fingerling ?? 0).toBe(0);
    S.inv.wheat = cap - 1.5;
    buyFingerling(3);
    expect(S.inv.fingerling).toBe(1);
    expect(invCount()).toBeLessThanOrEqual(cap);
  });
});

describe('رفع باگ ۴: انتخاب صحنهٔ ملاقات', () => {
  it('کتک اول گرهٔ مادر و بعد واریانت‌ها را می‌آورد', () => {
    expect(visitNodeId('due', true, 1)).toBe('visit-due-missed');
    expect(visitNodeId('due', true, 2)).toBe('visit-due-missed-0');
    expect(visitNodeId('due', true, 3)).toBe('visit-due-missed-1');
    expect(visitNodeId('due', true, 4)).toBe('visit-due-missed-2');
    expect(visitNodeId('due', true, 5)).toBe('visit-due-missed-0');
    expect(visitNodeId('due', false, 9)).toBe('visit-due-paid');
    expect(visitNodeId('raid', false, 0)).toBe('visit-raid');
    expect(visitNodeId('rest', false, 0)).toBe('visit-rest');
  });
});
