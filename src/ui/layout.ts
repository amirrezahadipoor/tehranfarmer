// ===== پروفایل‌های صفحه (فاز ۲) =====
// هر پروفایل توکن‌های چیدمان و اندازهٔ پایهٔ فونت را تعیین می‌کند.
export type Profile = 'small' | 'tall' | 'tablet' | 'desktop' | 'portrait';

export interface ProfileInfo {
  id: Profile;
  ratio: number;      // عرض/ارتفاع
  portrait: boolean;
  fontBase: number;   // px — پایهٔ rem
  hudScale: number;   // ضریب اندازهٔ HUD
  gap: number;        // فاصلهٔ امن بین چیپ‌ها (rem)
}

/** تشخیص پروفایل از ابعاد پنجره — بدون وابستگی به DOM برای تست‌پذیری */
export function detectProfile(w: number, h: number): ProfileInfo {
  const safeW = Math.max(1, w), safeH = Math.max(1, h);
  const ratio = safeW / safeH;
  const portrait = ratio < 0.76;
  let id: Profile;
  if (portrait) id = 'portrait';
  else if (ratio < 1.62) id = 'tablet';        // ۴:۳ و نزدیکش
  else if (ratio < 1.95) id = 'small';         // ۱۶:۹
  else if (ratio < 2.25) id = 'tall';          // ۲۰:۹
  else id = 'desktop';                          // خیلی پهن
  const fontBase = portrait
    ? Math.round(Math.max(12, Math.min(18, safeW * 0.034)))
    : Math.round(Math.max(11, Math.min(24, Math.min(safeH / 31, safeW * 0.0208))));
  return {
    id, ratio, portrait, fontBase,
    hudScale: portrait ? 0.96 : id === 'desktop' ? 1.06 : 1,
    gap: portrait ? 0.35 : 0.5,
  };
}

/** مشخصات لمسی: هدف ≥ ۴۸dp در همهٔ پروفایل‌ها */
export const TOUCH_MIN_DP = 48;
export const touchTargetPx = (fontBase: number) => Math.round(3 * fontBase);
