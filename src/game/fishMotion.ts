// رفتارهای مستقل ماهی‌ها؛ زمانِ بصری جدا از RNG اقتصاد/گیم‌پلی است.
export type FishBehavior = 'sine' | 'dart' | 'pause' | 'surge' | 'dive';

export interface FishMotionState {
  fishY: number;
  fishTarget: number;
  retarget: number;
  behaviorMode: 0 | 1;
}

export function createFishMotionState(): FishMotionState {
  return { fishY: 48, fishTarget: 32, retarget: 0.5, behaviorMode: 0 };
}

const hash = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};
const clampY = (v: number) => Math.max(8, Math.min(90, v));

/** یک گام حرکت؛ خروجی روی state داده‌شده انجام می‌شود تا rAF نیازی به تخصیص object نداشته باشد. */
export function advanceFishMotion(s: FishMotionState, behavior: FishBehavior, speed: number, now: number, dt: number) {
  s.retarget -= dt;
  let ease = 2.8 * speed;
  if (s.retarget <= 0) {
    const noise = hash(now * 0.001 + speed * 19);
    if (behavior === 'sine') {
      s.retarget = 0.45 + ((now % 7) * 0.09);
      s.fishTarget = clampY(48 + Math.sin(now * 0.0023 * speed) * 34);
    } else if (behavior === 'dart') {
      // جهش‌های کوتاه و غیرخطی؛ ماهی پیش از رسیدن به هدف قبلی هم ممکن است جهت عوض کند.
      s.retarget = 0.3 + noise * 0.34;
      s.fishTarget = clampY(9 + hash(now * 0.0017 + 31) * 80);
      ease = 6.2 * speed;
    } else if (behavior === 'pause') {
      // یک مکث کامل و سپس یک حرکت سریع؛ الگو با سینوسی پیوسته فرق دارد.
      if (s.behaviorMode === 0) {
        s.fishTarget = s.fishY;
        s.retarget = 0.62;
        s.behaviorMode = 1;
      } else {
        s.fishTarget = clampY(10 + noise * 78);
        s.retarget = 0.72;
        s.behaviorMode = 0;
        ease = 6.8 * speed;
      }
    } else if (behavior === 'surge') {
      // جاروهای رفت‌وبرگشتی از دو سمت ستون آب.
      s.fishTarget = s.behaviorMode === 0 ? 86 : 12;
      s.behaviorMode = s.behaviorMode === 0 ? 1 : 0;
      s.retarget = 1.05;
      ease = 4.6 * speed;
    } else {
      // شیرجهٔ آرام به عمق و بازگشت به سطح؛ توقف روی هدف تا شیرجهٔ بعدی.
      s.fishTarget = s.behaviorMode === 0 ? 88 : 14;
      s.behaviorMode = s.behaviorMode === 0 ? 1 : 0;
      s.retarget = 1.65;
      ease = 1.45 * speed;
    }
  }
  if (behavior === 'pause' && s.behaviorMode === 1 && s.fishTarget === s.fishY) ease = 0;
  s.fishY += (s.fishTarget - s.fishY) * Math.min(1, dt * ease);
}
