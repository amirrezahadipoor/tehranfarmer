// ===== تایپ‌های داستان (بدون منطق — فقط ساختار) =====
export type CharId = 'narrator' | 'player' | 'jahangir' | 'engineer' | 'grandma' | 'sara' | 'rancher' | 'carpenter' | 'estateAgent';

export interface Line { who: CharId; text: string }

export type Effect =
  | { k: 'chapter'; v: number }
  | { k: 'flag'; v: string; on?: boolean }
  | { k: 'coins'; v: number }
  | { k: 'item'; good: string; v: number }
  | { k: 'xp'; v: number }
  | { k: 'note'; v: number }        // باز کردن سند شمارهٔ v
  | { k: 'end' }                    // پایان بازی / ورود به حالت آزاد
  | { k: 'heal' };                  // بازگرداندن استامینا

export interface StoryNode {
  id: string;
  chapter?: number;
  lines: Line[];
  effects?: Effect[];
  next?: string | null;             // گره بعدی؛ null یعنی پایان کات‌سین
  cond?: (ctx: StoryCtx) => boolean; // شرط نمایش/انتخاب
}

export interface StoryCtx {
  chapter: number;
  level: number;
  coins: number;
  noteIdx: number;
  flags: Record<string, boolean>;
}

export interface QuestDef {
  id: string;
  chapter: number;
  title: string;
  desc: string;
  target: number;
  metric: () => number;
  reward: number;
}

export interface StoryState {
  chapter: number;              // ۰ پرولوگ، ۱..۶ فصل‌ها، ۷ پست‌گیم
  seen: Record<string, boolean>;
  prologueSeen: boolean;
  postgame: boolean;
  pending: string | null;       // گرهٔ کات‌سینی که باید اجرا شود
  queue?: string[];             // صف ماندگار صحنه‌های سینمایی در سِیو
  lastAutoDay?: number;         // جلوگیری از اجرای پیاپی خودکار صحنه‌ها در یک روز بدون فعالیت
  questDone: Record<number, boolean>;
  /** مبنای شاخص‌های تجمیعی کوئست اهالی هنگام پذیرش؛ کوئست‌های قدیمیِ بدون مبنا رفتار قبلی را حفظ می‌کنند. */
  questBase?: Record<string, number>;
}
