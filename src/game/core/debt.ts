// ===== بدهی، شرخر، اعتبار، قلک و مترسک =====
// همهٔ اعداد از src/story/debtData.ts می‌آید؛ اینجا فقط منطق است.
import { CROP, HEART_BOND_2, HEART_BOND_5, JAHANGIR2_INT_MULT, JAHANGIR5_RAID_MULT, SHEEPDOG_RAID_MULT } from '../data';
import { S, UI, addGood, farmLevel, forceBackupRotation, notify, saveGame, stamCap, toast, troughCap } from '../state';
import { sfx } from '../sound';
import { rnd, randRange, chance } from '../rng';
import { triggerCutscene } from '../../story/engine';
import {
  DUE_DAYS, DUE_GIFT_CHANCE, FLOOR_MIN, FLOOR_PLOT_CAP, FLOOR_PLOT_RATIO, HISTORY_CAP, LATE_FEE_RATE,
  MINPAY_INTEREST_FACTOR, NOTES, NOTE_COUNT, POSTGAME_CHAPTER, RAID_GAP_MAX, RAID_GAP_MIN,
  RAID_IMMUNITY, RAID_MAX_NOTE_RATIO, RAID_MIN, RAID_POCKET_RATIO, RAID_TO_DEBT_HALF, REACTION_RICH_MULT, REFUND_BONUS,
  SCARECROW_GAP_MULT, SCARECROW_PRICE_MAX, SCARECROW_PRICE_MIN, SCARECROW_PRICE_MULT, SCARECROW_RAID_MULT,
  STANDING_MAX, STAND_BAD, STAND_BAD_INTEREST_MULT, STAND_BAD_RAID_GAP, STAND_BAD_RAID_MULT, STAND_BEAT, STAND_GOOD,
  STAND_GOOD_INTEREST_MULT, STAND_GOOD_RAID_GAP, STAND_GOOD_RAID_MULT, STANDING_START, STAND_ON_TIME, STAND_PREPAY, STAND_PREPAY_MULT, STASH_CAP_MIN, STASH_CAP_MULT,
  VISIT_GRACE_MS, VISIT_HOUR_MAX, VISIT_HOUR_MIN,
} from '../../story/debtData';
import { checkStoryQuests, isQuestDone, questOf } from '../../story/quests';
import type { NoteDef } from '../../story/debtData';
import { charterInterestMult, charterRaidMult, charterStashMult } from './frontier';
import { fa } from '../../strings/fa';
import { GT } from '../../strings/gameText';

export interface HistoryEntry { day: number; kind: string; amount: number; text: string; noteIdx?: number }

export interface DebtState {
  noteIdx: number;
  remaining: number;
  paidTotal: number;
  extorted: number;
  dueDay: number;
  paidThisCycle: number;
  nextRaidDay: number;
  immuneUntilDay: number;
  standing: number;
  stash: number;
  scarecrow: 0 | 1 | 2 | 3;
  beatings: number;
  pendingVisit: null | 'due' | 'raid';
  chapter: number;
  flags: Record<string, boolean>;
  history: HistoryEntry[];
  lastVisit: VisitResult | null;
  chapterStartDay: number;
}

export type VisitKind = 'due-paid' | 'due-missed' | 'raid' | 'rest';
export interface VisitResult {
  kind: VisitKind;
  day: number;
  taken: number;
  toDebt: number;
  lateFee: number;
  remaining: number;
  noteName: string;
  text: string;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const today = () => S.day;

// ===== دسترسی‌ها =====
export const debt = (): DebtState | null => {
  const d = S.debt;
  if (!d) return null;
  if (!Array.isArray(d.history)) d.history = [];
  if (!d.flags || typeof d.flags !== 'object') d.flags = {};
  if (typeof d.stash !== 'number') d.stash = 0;
  if (typeof d.standing !== 'number') d.standing = STANDING_START;
  if (typeof d.extorted !== 'number') d.extorted = 0;
  if (typeof d.paidTotal !== 'number') d.paidTotal = 0;
  if (typeof d.paidThisCycle !== 'number') d.paidThisCycle = 0;
  if (typeof d.beatings !== 'number') d.beatings = 0;
  if (typeof d.scarecrow !== 'number') d.scarecrow = 0;
  return d;
};
export const activeNote = (): NoteDef | null => (S.debt ? NOTES[S.debt.noteIdx] ?? null : null);
/** حداقل قسط ماه = سهم اصلی سند تقسیم بر تعداد قسط هدف */
export const minPay = (): number => {
  const n = activeNote();
  return n ? Math.ceil(n.amount / n.monthsTarget) : 0;
};
/** سود دورهٔ بعد (روی باقی‌ماندهٔ سند فعال — خوش‌حسابی سود را ۲۸٪ کم می‌کند) */
export const interestOf = (): number => {
  const n = activeNote();
  const d = debt();
  if (!n || !d) return 0;
  const band = standingBand();
  const mult = band === 'good' ? STAND_GOOD_INTEREST_MULT : band === 'bad' ? STAND_BAD_INTEREST_MULT : 1;
  const jahangir = (S.affinity?.jahangir ?? 0) >= HEART_BOND_2 ? JAHANGIR2_INT_MULT : 1;
  return Math.round(d.remaining * n.rate * mult * jahangir * charterInterestMult());
};
/** کف امن: بازیکن هرگز زیر این مبلغ نمی‌رود (بذر یک روز کاشت کامل) */
export function floorCoins(): number {
  const perPlot = Math.max(1, CROP.wheat.seed);
  const plots = Math.max(1, Object.keys(S.plots).length ? S.plots.filter((p) => p.st >= 0).length : 1);
  return Math.max(FLOOR_MIN, Math.ceil(perPlot * Math.min(plots, FLOOR_PLOT_CAP) * FLOOR_PLOT_RATIO));
}
export const daysToDue = (): number => (S.debt ? Math.max(0, S.debt.dueDay - today()) : 0);
export const stashCap = (): number => Math.max(STASH_CAP_MIN, Math.round(STASH_CAP_MULT * minPay() * charterStashMult()));
export const standingBand = (): 'good' | 'normal' | 'bad' => {
  const st = S.debt?.standing ?? STANDING_START;
  return st >= STAND_GOOD ? 'good' : st < STAND_BAD ? 'bad' : 'normal';
};
export const scarecrowPrice = (): number => {
  const d = debt();
  if (!d || d.scarecrow >= 3) return 0;
  const raw = Math.round(minPay() * SCARECROW_PRICE_MULT[d.scarecrow]);
  return clamp(raw, SCARECROW_PRICE_MIN, SCARECROW_PRICE_MAX);
};

// ===== آغاز بدهی (پایان پرولوگ) =====
export function startDebt(noteIdx = 0) {
  const n = NOTES[clamp(noteIdx, 0, NOTE_COUNT - 1)];
  // رفع C-5: با هر سند جدید، چرخش اسلات پشتیبان اجباری می‌شود تا سِیو «قبل از سند» همیشه
  // در دسترس باشد (مستقل از فاصلهٔ زمانی دیوار و محیط اجرا -> نتیجهٔ قطعی در CI).
  forceBackupRotation();
  S.debt = {
    noteIdx: n.idx,
    remaining: n.amount,
    paidTotal: 0,
    extorted: 0,
    dueDay: today() + DUE_DAYS,
    paidThisCycle: 0,
    nextRaidDay: today() + randRange(RAID_GAP_MIN, RAID_GAP_MAX),
    immuneUntilDay: today() + RAID_IMMUNITY,
    standing: STANDING_START,
    stash: 0,
    scarecrow: 0,
    beatings: 0,
    pendingVisit: null,
    chapter: n.chapter,
    flags: {},
    history: [],
    lastVisit: null,
    chapterStartDay: today(),
  };
  S.story.chapter = n.chapter;
  notify();
}

export function addStanding(n: number) {
  const d = debt();
  if (!d) return;
  d.standing = clamp(d.standing + n, 0, STANDING_MAX);
}

// ===== پرداخت =====
export interface PayResult { paid: number; complete: boolean }
export function payDebt(amount: number): PayResult {
  const d = debt();
  const n = activeNote();
  if (!d || !n) return { paid: 0, complete: false };
  const pay = Math.max(0, Math.min(Math.floor(amount), Math.floor(d.remaining), Math.floor(S.coins)));
  if (pay <= 0) { sfx.err(); toast('coin', GT.g25); return { paid: 0, complete: false }; }
  S.coins -= pay;
  d.remaining = Math.max(0, d.remaining - pay);
  d.paidTotal += pay;
  d.paidThisCycle += pay;
  if (pay > minPay() * STAND_PREPAY_MULT) addStanding(STAND_PREPAY);
  d.history.push({ day: today(), kind: 'pay', amount: pay, text: GT.g26 + n.name, noteIdx: d.noteIdx });
  if (d.history.length > HISTORY_CAP) d.history.shift();
  sfx.coin();
  toast('ledger', GT.g27 + n.name);
  const complete = d.remaining <= 0;
  if (complete) onNotePaid();
  saveGame(); notify();
  return { paid: pay, complete };
}

function onNotePaid() {
  const d = debt();
  if (!d) return;
  const n = NOTES[d.noteIdx];
  addStanding(STAND_ON_TIME);
  d.history.push({ day: today(), kind: 'note', amount: 0, text: GT.g28 + n.name, noteIdx: d.noteIdx });
  maybeOpenNextNote();
}

/** اگر سند فعلی تمام شده و کوئست فصل تمام است، سند بعدی باز می‌شود */
/** فاصلهٔ ضدِّرشِ سند بعدی — در حالت داستانِ فشرده نصف می‌شود */
function noteWaitDays(minDays: number): number {
  return S.custom?.compactStory ? Math.ceil(minDays / 2) : minDays;
}

export function maybeOpenNextNote(): boolean {
  const d = debt();
  if (!d) return false;
  const n = NOTES[d.noteIdx];
  const willAdvance = !!n && d.remaining <= 0 && isQuestDone(n.chapter)
    && (d.noteIdx >= NOTE_COUNT - 1 || today() - d.chapterStartDay >= noteWaitDays(NOTES[d.noteIdx + 1].minDays));
  checkStoryQuests(willAdvance);
  if (!n || d.remaining > 0) return false;
  if (!isQuestDone(n.chapter)) return false;
  if (d.noteIdx >= NOTE_COUNT - 1) { finishGame(); return false; }
  const next = NOTES[d.noteIdx + 1];
  const waited = today() - d.chapterStartDay;
  if (waited < noteWaitDays(next.minDays)) return false;
  d.noteIdx = next.idx;
  d.remaining = next.amount;
  d.paidThisCycle = 0;
  d.dueDay = today() + DUE_DAYS;
  d.chapter = next.chapter;
  d.chapterStartDay = today();
  S.story.chapter = next.chapter;
  triggerCutscene('ch' + n.chapter + '-outro', { forceReplay: true, explicitAction: true });
  d.history.push({ day: today(), kind: 'note-open', amount: next.amount, text: GT.g29 + next.name, noteIdx: next.idx });
  toast('ledger', GT.g30 + next.name);
  saveGame();
  notify();
  return true;
}

function finishGame() {
  const d = debt();
  if (!d) return;
  if (S.story.postgame) return;
  S.story.postgame = true;
  S.story.chapter = POSTGAME_CHAPTER;
  d.chapter = POSTGAME_CHAPTER;
  const refund = Math.round(d.extorted * REFUND_BONUS);
  if (refund > 0) {
    S.coins += refund;
    d.history.push({ day: today(), kind: 'refund', amount: refund, text: GT.g31 });
  }
  d.extorted = 0;
  d.pendingVisit = null;
  triggerCutscene('ch6-outro', { forceReplay: true });
  toast('ledger', GT.g32);
  saveGame();
  notify();
}

// ===== قلک =====
export function stashDeposit(amount: number): number {
  const d = debt();
  if (!d) return 0;
  const room = stashCap() - d.stash;
  const n = Math.max(0, Math.min(Math.floor(amount), Math.floor(S.coins), Math.floor(room)));
  if (n <= 0) { sfx.err(); toast('stash', GT.g33); return 0; }
  S.coins -= n; d.stash += n;
  sfx.pop(); saveGame(); notify();
  return n;
}
export function stashWithdraw(amount: number): number {
  const d = debt();
  if (!d) return 0;
  const n = Math.max(0, Math.min(Math.floor(amount), Math.floor(d.stash)));
  if (n <= 0) { sfx.err(); toast('stash', GT.g34); return 0; }
  d.stash -= n; S.coins += n;
  sfx.pop(); saveGame(); notify();
  return n;
}

// ===== مترسک ضدشرخر =====
export function buyScarecrow(): boolean {
  const d = debt();
  if (!d || d.scarecrow >= 3) return false;
  const price = scarecrowPrice();
  if (S.coins < price) { sfx.err(); toast('coin', GT.g25); return false; }
  S.coins -= price;
  d.scarecrow = (d.scarecrow + 1) as 0 | 1 | 2 | 3;
  toast('scarecrow', GT.g35 + fa(d.scarecrow) + GT.g24);
  sfx.coin(); saveGame(); notify();
  return true;
}

// ===== ملاقات‌ها =====
function raidGapMult(): number {
  const st = standingBand();
  const d = debt();
  const stand = st === 'good' ? STAND_GOOD_RAID_GAP : st === 'bad' ? STAND_BAD_RAID_GAP : 1;
  return stand * SCARECROW_GAP_MULT[d?.scarecrow ?? 0];
}
function raidAmountMult(): number {
  const st = standingBand();
  const d = debt();
  const stand = st === 'good' ? STAND_GOOD_RAID_MULT : st === 'bad' ? STAND_BAD_RAID_MULT : 1;
  const dogMult = S.decor?.sheepdog ? SHEEPDOG_RAID_MULT : 1;
  const jahangirMult = (S.affinity?.jahangir ?? 0) >= HEART_BOND_5 ? JAHANGIR5_RAID_MULT : 1;
  return stand * SCARECROW_RAID_MULT[d?.scarecrow ?? 0] * dogMult * jahangirMult;
}
export function scheduleRaid(fromDay = today()) {
  const d = debt();
  if (!d) return;
  const gap = (RAID_GAP_MIN + rnd() * (RAID_GAP_MAX - RAID_GAP_MIN)) * raidGapMult();
  d.nextRaidDay = Math.round(fromDay + Math.max(RAID_IMMUNITY, gap));
}

/** مبلغ باج با همهٔ کف/سقف‌ها */
export function raidAmount(): number {
  const d = debt();
  if (!d) return 0;
  const pocket = Math.max(0, S.coins - floorCoins());
  const raw = pocket * RAID_POCKET_RATIO * raidAmountMult() * charterRaidMult();
  const cap = Math.max(0, d.remaining * RAID_MAX_NOTE_RATIO);
  return Math.max(0, Math.min(Math.round(raw), Math.round(cap), Math.max(0, pocket)));
}

/** اجرای روز قسط — پرداخت‌شده یا کتک */
export function processDueDay(): VisitResult {
  const d = debt();
  const n = activeNote();
  if (!d || !n) return { kind: 'rest', day: today(), taken: 0, toDebt: 0, lateFee: 0, remaining: 0, noteName: '', text: '' };
  const mp = minPay();
  const interest = interestOf();
  let res: VisitResult;
  if (d.remaining <= 0) {
    d.dueDay = today() + DUE_DAYS;
    res = { kind: 'rest', day: today(), taken: 0, toDebt: 0, lateFee: 0, remaining: 0, noteName: n.name, text: GT.g36 };
  } else if (d.paidThisCycle >= mp) {
    d.remaining += interest;
    addStanding(STAND_ON_TIME);
    const gift = chance(DUE_GIFT_CHANCE);
    if (gift) {
      const gotFeed = addGood('feed', 2);
      if (gotFeed < 2) S.trough = Math.min(troughCap(), S.trough + (2 - gotFeed));
    }
    d.paidThisCycle = 0;
    d.dueDay = today() + DUE_DAYS;
    res = { kind: 'due-paid', day: today(), taken: 0, toDebt: 0, lateFee: 0, remaining: d.remaining, noteName: n.name, text: gift ? GT.g37 : GT.g38 };
  } else {
    const shortfall = Math.max(0, mp - d.paidThisCycle);
    const pocket = Math.max(0, S.coins - floorCoins());
    const take = Math.min(shortfall, pocket);
    S.coins -= take;
    d.paidTotal += take;
    d.remaining = Math.max(0, d.remaining - take) + interest;
    const lateFee = Math.ceil(LATE_FEE_RATE * shortfall);
    d.remaining += lateFee;
    S.stamina = stamCap() * 0.5;
    addStanding(STAND_BEAT);
    d.beatings++;
    d.immuneUntilDay = today() + RAID_IMMUNITY;
    d.paidThisCycle = 0;
    d.dueDay = today() + DUE_DAYS;
    res = { kind: 'due-missed', day: today(), taken: take, toDebt: take, lateFee, remaining: d.remaining, noteName: n.name, text: GT.g39 };
  }
  d.lastVisit = res;
  d.pendingVisit = 'due';
  d.history.push({ day: today(), kind: res.kind, amount: res.taken, text: res.text });
  saveGame();
  return res;
}

/** اجرای باج‌گیری سرزده */
export function processRaid(): VisitResult {
  const d = debt();
  const n = activeNote();
  if (!d || !n) return { kind: 'rest', day: today(), taken: 0, toDebt: 0, lateFee: 0, remaining: 0, noteName: '', text: '' };
  const amount = raidAmount();
  const take = Math.min(amount, Math.max(0, S.coins - floorCoins()));
  const toDebt = Math.round(take * RAID_TO_DEBT_HALF);
  S.coins -= take;
  d.remaining = Math.max(0, d.remaining - toDebt);
  if (toDebt > 0) d.paidTotal += toDebt; // باجی که راهی بدهی شد هم «پرداختی» است (قفل‌نشدن دستاورد ۶ میلیونی)
  d.extorted += take - toDebt;
  d.immuneUntilDay = today() + RAID_IMMUNITY;
  scheduleRaid(today());
  const res: VisitResult = {
    kind: 'raid', day: today(), taken: take, toDebt, lateFee: 0, remaining: d.remaining, noteName: n.name,
    text: take > 0 ? GT.g40 : GT.g41,
  };
  d.lastVisit = res;
  d.pendingVisit = 'raid';
  d.history.push({ day: today(), kind: 'raid', amount: take, text: res.text });
  saveGame();
  return res;
}

/** هر روز صبح: قسط، باج، باز شدن سند بعدی، پایان بازی */
export function processDebtDay() {
  const d = debt();
  if (!d) return;
  // رفع C-5: پایان هر روز بازی = یک نقطهٔ چرخش پشتیبان قطعی (نه وابسته به ساعت دیوار)
  forceBackupRotation();
  checkStoryQuests();
  if (S.story.postgame) {
    d.pendingVisit = null;
    notify();
    return;
  }
  if (today() >= d.dueDay) processDueDay();
  else if (today() >= d.nextRaidDay && today() >= d.immuneUntilDay && S.coins > floorCoins() + RAID_MIN) processRaid();
  else if (today() >= d.nextRaidDay && today() >= d.immuneUntilDay) scheduleRaid(today());
  maybeOpenNextNote();
  notify();
}

/** بستن ملاقات (پس از نمایش کات‌سین) */
export function clearVisit() {
  const d = debt();
  if (!d) return;
  d.pendingVisit = null;
  notify();
}

/**
 * صحنهٔ واکنش جهانگیر هنگام باز شدن دفتر بدهی: بدحسابی، جیب خالی یا جیب پر.
 * هر سه صحنه فقط یک‌بار در هر سیو اجرا می‌شوند (بدون مزاحمت برای باز باز کردن دفتر).
 */
export function maybeReactionScene(): boolean {
  const d = debt();
  if (!d || !UI.started || !S.story?.prologueSeen || S.story.postgame || S.story.pending || S.tut?.active) return false;
  if (typeof navigator !== 'undefined' && navigator.webdriver) return false; // محیط خودکار مانند آموزش روز اول
  const mp = minPay();
  const id = standingBand() === 'bad'
    ? 'reaction-bad'
    : S.coins < mp
      ? 'reaction-poor'
      : S.coins >= mp * REACTION_RICH_MULT
        ? 'reaction-rich'
        : null;
  if (!id) return false;
  const started = triggerCutscene(id, { explicitAction: true }) !== null;
  if (started) UI.afterModal = 'ledger'; // بعد از صحنه، دفتر دوباره باز شود
  return started;
}

/** آیا الان اجازهٔ ملاقات داریم؟ (ساعت کاری، بدون مودال، بعد از مهلت ورود) */
export function canVisitNow(hour: number, modalOpen: boolean, inTransition: boolean, sinceEnterMs: number): boolean {
  if (modalOpen || inTransition) return false;
  if (hour < VISIT_HOUR_MIN || hour >= VISIT_HOUR_MAX) return false;
  if (sinceEnterMs < VISIT_GRACE_MS) return false;
  return true;
}

/** نامتغیر طراحی: حداقل قسط همیشه از سود بیشتر است */
export function solvable(i: number): boolean {
  const n = NOTES[i];
  const mp = Math.ceil(n.amount / n.monthsTarget);
  return mp >= MINPAY_INTEREST_FACTOR * (n.amount * n.rate);
}

/** جمع بدهی باقی‌ماندهٔ کل (برای چیپ HUD) */
export function totalRemaining(): number {
  const d = debt();
  if (!d) return 0;
  let t = d.remaining;
  for (let i = d.noteIdx + 1; i < NOTE_COUNT; i++) t += NOTES[i].amount;
  return Math.round(t);
}

export function formatDebtHistoryText(h: HistoryEntry): string {
  const nm = h.noteIdx !== undefined ? (NOTES[h.noteIdx]?.name ?? '') : '';
  if (h.kind === 'pay' && nm) return GT.g26 + nm;
  if (h.kind === 'note' && nm) return GT.g28 + nm;
  if (h.kind === 'note-open' && nm) return GT.g29 + nm;
  if (h.kind === 'refund') return GT.g31;
  if (h.kind === 'due-missed') return GT.g39;
  if (h.kind === 'raid') return h.amount > 0 ? GT.g40 : GT.g41;
  if (h.kind === 'rest') return GT.g36;
  return h.text;
}

export const questTitle = (chapter: number) => questOf(chapter)?.title ?? '';
export const farmLevelOf = () => farmLevel();
