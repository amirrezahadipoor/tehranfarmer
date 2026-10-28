// ===== نسخه‌بندی و مهاجرت سِیو =====
// قاعدهٔ AGENTS: هر تغییر ساختار سِیو = بالا رفتن نسخه + تابع مهاجرت + تست مهاجرت.
// سِیو قدیمی کاربر هرگز نباید خراب شود.
import { ANIMALS, COLS, CROP, GOOD, LAND_PRICES, LEVEL_CAP, ROWS, WORKER_MAX, xpNeed } from '../data';
import { NORTH_PLOTS_COUNT, VALLEY_PLOTS_COUNT } from '../estates';
import { NOTES } from '../../story/debtData';

export const SAVE_VERSION = 7;
/** نسخه‌ای که از آن به بعد طول آرایه‌های کرت‌ها دقیقاً باید مطابق سازه باشد (ناهمخوانی = خرابی، نه مهاجرت) */
const STRICT_LAYOUT_FROM = 7;

export type Raw = Record<string, unknown>;
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** نسخهٔ ۱ به ۲: پلهٔ ۲۴زمینی جدید — سطح زمین قدیمی یک پله جابه‌جا می‌شود تا همان مستطیل حفظ شود */
function v1_to_v2(d: Raw) {
  const lv = { ...((d.lv ?? {}) as Raw) }; // کپی: سِیوِ ورودی جهش نمی‌یابد
  const land = num(lv.land);
  const worker = d.worker;
  if (land >= 2) lv.land = Math.min(LAND_PRICES.length, land + 1);
  d.lv = lv;
  // کارگر بولین قدیمی به شمارنده
  if (typeof worker === 'boolean') d.workers = worker ? 1 : 0;
  d.v = 2;
}

/** نسخهٔ ۲ به ۳: ورود داستان و بدهی — جانمایهٔ سیستم شرخر */
function levelFromXp(xp: number): number {
  let lv = 1, need = 0;
  while (lv < LEVEL_CAP && xp >= need + xpNeed(lv)) { need += xpNeed(lv); lv++; }
  return lv;
}
const chapterForLevel = (lv: number) => (lv < 6 ? 1 : lv < 12 ? 2 : lv < 18 ? 3 : lv < 23 ? 4 : lv < 27 ? 5 : 6);

function v2_to_v3(d: Raw) {
  d.v = 3;
  // سِیو قدیمی = بازیکن وسط بازی: فصل از روی سطح، پرولوگ دیده‌شده
  const lv = levelFromXp(num(d.xp, 0));
  const chapter = chapterForLevel(lv);
  const day = Math.max(1, Math.floor(num(d.day, 1)));
  if (!d.story || typeof d.story !== 'object') {
    d.story = { chapter, seen: {}, prologueSeen: true, postgame: false, pending: null, questDone: {} };
  }
  // بدهی: سند متناسب با سطح فعلی (نه از صفر) تا بازیکن قدیمی جریمه نشود
  if (d.debt === undefined) {
    const note = NOTES[Math.min(NOTES.length - 1, chapter - 1)];
    d.debt = {
      noteIdx: note.idx, remaining: note.amount, paidTotal: 0, extorted: 0,
      dueDay: day + 28, paidThisCycle: 0, nextRaidDay: day + 45, immuneUntilDay: day + 6,
      standing: 60, stash: 0, scarecrow: 0, beatings: 0, pendingVisit: null, chapter,
      flags: {}, history: [], lastVisit: null, chapterStartDay: day,
    };
  }
}

/** نسخهٔ ۳ به ۴: کوئست‌های روزانه/هفتگی */
function v3_to_v4(d: Raw) {
  d.v = 4;
  if (!d.quests || typeof d.quests !== 'object') d.quests = { day: 0, week: 0, daily: [], weekly: null, claimed: {}, base: {} };
}

/** نسخهٔ ۴ به ۵: رویدادهای فصلی، چاه قطره‌ای، قرارداد بازار و موزهٔ پایان‌بازی */
function v4_to_v5(d: Raw) {
  d.v = 5;
  if (d.event === undefined) d.event = null;
  if (typeof d.wellLv !== 'number') d.wellLv = 0;
  if (d.contract === undefined) d.contract = null;
  if (typeof d.museumVisited !== 'boolean') d.museumVisited = false;
}

/** نسخهٔ ۵ به ۶: ثبت ماندگار رازهای پنهان کشف‌شده (S.secrets) */
function v5_to_v6(d: Raw) {
  d.v = 6;
  if (!d.secrets || typeof d.secrets !== 'object' || Array.isArray(d.secrets)) d.secrets = {};
}

const mkEmptyPlots = (n: number) => Array.from({ length: n }, () => ({
  st: 0, crop: null, prog: 0, water: 0, fert: 0.5, last: null, dead: false, dry: 0, ripe: false, n: 0,
}));

/** نسخهٔ ۶ به ۷: افزودن آرایه‌های کرت‌های دو مزرعهٔ بزرگ جدید (northPlots=54 و valleyPlots=60) */
function v6_to_v7(d: Raw) {
  d.v = 7;
  if (!Array.isArray(d.northPlots) || d.northPlots.length !== NORTH_PLOTS_COUNT) d.northPlots = mkEmptyPlots(NORTH_PLOTS_COUNT);
  if (!Array.isArray(d.valleyPlots) || d.valleyPlots.length !== VALLEY_PLOTS_COUNT) d.valleyPlots = mkEmptyPlots(VALLEY_PLOTS_COUNT);
}

const STEPS: ((d: Raw) => void)[] = [v1_to_v2, v2_to_v3, v3_to_v4, v4_to_v5, v5_to_v6, v6_to_v7];

/**
 * سِیو خام را به آخرین نسخه مهاجرت می‌دهد.
 * @returns دادهٔ مهاجرت‌شده یا null اگر سِیو غیرقابل‌استفاده باشد.
 */
export function migrateSave(raw: unknown): Raw | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = { ...(raw as Raw) };
  let v = num(d.v, 0);
  const originalV = v;
  if (v < 1 || v > SAVE_VERSION) return null; // نسخهٔ ناشناس/آینده
  while (v < SAVE_VERSION) {
    const step = STEPS[v - 1];
    if (!step) return null;
    step(d);
    const next = num(d.v, 0);
    if (next <= v) return null;
    v = next;
  }
  if (!('coins' in d) && !('day' in d)) return null;
  // پاک‌سازی اعداد: سِیو دست‌کاری‌شده یا ناقص نباید NaN/رشته به منطق تزریق کند
  d.coins = Math.max(0, num(d.coins, 700));
  d.day = Math.max(1, Math.floor(num(d.day, 1)));
  d.hour = Math.min(23.99, Math.max(0, num(d.hour, 7)));
  d.stamina = Math.max(0, num(d.stamina, 100));
  d.xp = Math.max(0, num(d.xp, 0));
  d.earned = Math.max(0, num(d.earned, 0));
  d.fert = Math.max(0, num(d.fert, 0));
  d.can = Math.max(0, num(d.can, 8));
  d.trough = Math.max(0, num(d.trough, 0));
  d.hives = Math.max(0, num(d.hives, 0));
  d.honeyAcc = Math.max(0, num(d.honeyAcc, 0));
  d.workers = Math.min(WORKER_MAX, Math.max(0, num(d.workers, 0)));
  // بیشینهٔ ساختمان‌های کارگری خریداری‌شده هرگز کمتر از کارگران فعال نمی‌شود (باز استخدام رایگان پس از کسری حقوق)
  d.workersHired = Math.min(WORKER_MAX, Math.max(num(d.workersHired, 0), num(d.workers, 0)));
  // ناهمخوانی طول کرت‌ها در سِیوِ نسخهٔ فعلی یعنی خرابی؛ رد می‌شود تا مزرعهٔ بازیکن بی‌صدا خالی نشود
  const layoutOk = (arr: unknown, n: number) => Array.isArray(arr) && arr.length === n;
  // فقط سِیوهای ذخیره‌شده با نسخهٔ فعلی سخت‌گیرانه بررسی می‌شوند؛ سِیوهای قدیمی‌تر طبق مهاجرت قبلی ترمیم می‌شوند
  if (originalV >= STRICT_LAYOUT_FROM) {
    if (d.plots !== undefined && !layoutOk(d.plots, COLS * ROWS)) return null;
    if (d.northPlots !== undefined && !layoutOk(d.northPlots, NORTH_PLOTS_COUNT)) return null;
    if (d.valleyPlots !== undefined && !layoutOk(d.valleyPlots, VALLEY_PLOTS_COUNT)) return null;
  }
  if (!Array.isArray(d.plots)) delete d.plots;
  // محتوای کرت‌ها: گونه/محصول ناشناخته پاک‌سازی می‌شود تا رندر و منطق کرش نکنند
  const sanitizePlots = (arr: unknown) => (Array.isArray(arr) ? arr.map((p) => {
    if (!p || typeof p !== 'object') return p;
    const pl = p as Raw;
    if (pl.crop !== null && pl.crop !== undefined && !(typeof pl.crop === 'string' && CROP[pl.crop])) {
      return { ...pl, crop: null, st: 1, ripe: false, prog: 0 };
    }
    return pl;
  }) : arr);
  if (d.plots) d.plots = sanitizePlots(d.plots);
  if (d.northPlots) d.northPlots = sanitizePlots(d.northPlots);
  if (d.valleyPlots) d.valleyPlots = sanitizePlots(d.valleyPlots);
  if (!Array.isArray(d.animals)) d.animals = [];
  // حیوان با گونهٔ ناشناخته یا شناسهٔ نامعتبر حذف می‌شود
  d.animals = (d.animals as unknown[]).filter((a) => {
    const an = a as Raw | null;
    return !!an && typeof an === 'object' && typeof an.kind === 'string' && !!ANIMALS[an.kind as keyof typeof ANIMALS] && Number.isFinite(num(an.id, NaN));
  });
  if (!Array.isArray(d.builds)) d.builds = [];
  if (!Array.isArray(d.ponds)) d.ponds = [];
  if (!Array.isArray(d.nests)) d.nests = [];
  // فقط کلیدهای شناخته‌شده (کالا/محصول) نگه داشته می‌شوند؛ کلید ناشناخته باعث کرش فروش می‌شد
  const cleanRec = (o: unknown, known: (k: string) => boolean) => {
    if (!o || typeof o !== 'object') return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      const n = num(v, 0);
      if (known(k) && Number.isFinite(n) && n >= 0) out[k] = n;
    }
    return out;
  };
  d.inv = cleanRec(d.inv, (k) => !!GOOD[k]);
  d.seeds = cleanRec(d.seeds, (k) => !!CROP[k]);
  return d;
}
