// ===== ثابت‌های بدهی، شرخر و اقتصاد (تنها منبع اعداد — بدون جادو در منطق) =====
import { CFG } from '../game/settings';

export interface NoteDef {
  idx: number;
  name: string;
  amount: number;
  rate: number;          // سود ماهانه روی باقی‌مانده
  monthsTarget: number;  // تعداد قسط هدف (برای minPay)
  minDays: number;       // حداقل روزهای گذشته از فصل قبل (ضد رش)
  chapter: number;
  why: string;           // دلیل داستانی
}

const NOTES_FA: Array<{ name: string; why: string }> = [
  { name: 'سندِ اول: ثبت و شروع مزرعه', why: 'پیش‌پرداخت ساده و بدون سود برای شروع کار در مزرعه' },
  { name: 'سندِ دوم: نگهداری مرز باغ', why: 'خرج هرس و نگهداری درخت‌های مرز مزرعه در سال‌های خالی بودن' },
  { name: 'سندِ سوم: وام قدیم بابابزرگ', why: 'وام سال خشکسالی بابابزرگ برای حفظ باغ‌های روستا' },
  { name: 'سندِ چهارم: بازسازی قنات', why: 'هزینهٔ لایروبی و راه انداختن دوبارهٔ قنات اصلی روستا' },
  { name: 'سندِ پنجم: وام قانونی مهندس', why: 'وامی که مهندس کاوه ثبت کرد تا دست دلال‌ها از مزرعه کوتاه بماند' },
  { name: 'سندِ ششم: آزادی کامل مزرعه', why: 'تسویهٔ نهایی رهن ملک و انتقال همیشگی سند شش‌دانگ مزرعه' },
];

const NOTES_EN: Array<{ name: string; why: string }> = [
  { name: 'Deed 1: Homestead Registration', why: 'Interest-free starter registration deed to reopen Grandpa’s farm' },
  { name: 'Deed 2: Boundary Orchard Care', why: 'Pruning and upkeep of boundary trees while the farm stood empty' },
  { name: 'Deed 3: Grandpa’s Drought Loan', why: 'Grandpa’s historic drought loan that saved the village orchards' },
  { name: 'Deed 4: Village Qanat Renewal', why: 'Dredging and restoring clear mountain water to the main qanat' },
  { name: 'Deed 5: Engineer’s Protective Loan', why: 'Registered legally by Engineer Kaveh to block city speculators' },
  { name: 'Deed 6: Full Homestead Freedom', why: 'Final release of collateral and permanent full ownership of the farm' },
];

const mkNote = (idx: number, amount: number, rate: number, monthsTarget: number, minDays: number, chapter: number): NoteDef => ({
  idx,
  get name() { return CFG.locale === 'en' ? NOTES_EN[idx].name : NOTES_FA[idx].name; },
  amount,
  rate,
  monthsTarget,
  minDays,
  chapter,
  get why() { return CFG.locale === 'en' ? NOTES_EN[idx].why : NOTES_FA[idx].why; },
});

/** ۶ سند — جمعاً ۶٬۰۰۰٬۰۰۰ سکه (طبق DEBT_DESIGN) */
export const NOTES: NoteDef[] = [
  mkNote(0, 15000, 0, 4, 0, 1),
  mkNote(1, 70000, 0.01, 7, 26, 2),
  mkNote(2, 250000, 0.014, 9, 34, 3),
  mkNote(3, 700000, 0.016, 11, 40, 4),
  mkNote(4, 1600000, 0.015, 10, 45, 5),
  mkNote(5, 3365000, 0.01, 10, 50, 6),
];

export const TOTAL_DEBT = NOTES.reduce((a, n) => a + n.amount, 0); // ۶٬۰۰۰٬۰۰۰
export const NOTE_COUNT = NOTES.length;

// ===== قسط و سود =====
export const DUE_DAYS = 28;                  // دورهٔ قسط = یک «سال» بازی
export const MINPAY_INTEREST_FACTOR = 1.6;   // نامتغیر: minPay ≥ ۱٫۶ × بیشترین سود
export const LATE_FEE_RATE = 0.14;           // جریمهٔ دیرکرد روی کسری قسط
export const FLOOR_MIN = 60;                 // کف امن مطلق (سکه)
export const FLOOR_PLOT_CAP = 40;
export const FLOOR_PLOT_RATIO = 0.25;
export const HISTORY_CAP = 60;
export const POSTGAME_CHAPTER = 7;
export const DUE_GIFT_CHANCE = 0.35;
export const ADVISOR_STASH_FLOOR = 2500;
export const ADVISOR_STASH_MULT = 2.5;
export const ADVISOR_HOT_DEMAND = 1.25;

// ===== اعتبار (Standing) =====
export const STANDING_MAX = 100;
export const STANDING_START = 60;
export const STAND_ON_TIME = 8;
export const STAND_PREPAY = 12;
export const STAND_PREPAY_MULT = 1.5;
export const STAND_BEAT = -25;
export const STAND_GOOD = 70;               // ≥ ۷۰ خوش‌حساب
export const STAND_BAD = 30;                // < ۳۰ بدحساب
export const STAND_GOOD_RAID_GAP = 1.6;
export const STAND_GOOD_RAID_MULT = 0.75;
export const STAND_GOOD_INTEREST_MULT = 0.6;
export const STAND_BAD_RAID_GAP = 0.5;
export const STAND_BAD_RAID_MULT = 1.2;
export const STAND_BAD_INTEREST_MULT = 1.18;

// ===== باج‌گیری سرزده =====
export const RAID_GAP_MIN = 40;
export const RAID_GAP_MAX = 60;
export const RAID_IMMUNITY = 6;
export const RAID_POCKET_RATIO = 0.1;
export const RAID_MIN = 40;
export const RAID_MAX_NOTE_RATIO = 0.15;
export const RAID_TO_DEBT_HALF = 0.5;        // نیمی از باج به بدهی می‌رود

// ===== محافظت تجربهٔ بازیکن =====
export const VISIT_HOUR_MIN = 9;
export const VISIT_HOUR_MAX = 17;
export const VISIT_GRACE_MS = 20000;         // ۲۰ ثانیه اول بعد از لود بازی

// ===== قلک و مترسک =====
export const STASH_CAP_MULT = 12;
export const STASH_CAP_MIN = 500;
export const SCARECROW_RAID_MULT = [1, 0.8, 0.6, 0.4];   // ضریب مبلغ باج بر اساس سطح مترسک
export const SCARECROW_GAP_MULT = [1, 1.15, 1.3, 1.45];  // ضریب فاصلهٔ باج‌گیری
export const SCARECROW_PRICE_MULT = [4, 12, 30];         // قیمت = ضریب × minPay
export const SCARECROW_PRICE_MIN = 300;
export const SCARECROW_PRICE_MAX = 900000;

// ===== پایان بازی =====
export const REFUND_BONUS = 1.2;             // باج‌ها با ۲۰٪ سود پس داده می‌شوند
export const BEATINGS_MIN = 20;
export const BEATINGS_MAX = 28;
