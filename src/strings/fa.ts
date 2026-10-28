// ===== ارقام و قالب‌بندی دوزبانه (فارسی پیش‌فرض + انگلیسی کامل هنگام تغییر زبان) =====
import { CFG } from '../game/settings';

const D = '۰۱۲۳۴۵۶۷۸۹';
export const isEn = () => CFG.locale === 'en';
export const faDigits = (s: string) => s.replace(/\d/g, (d) => D[+d]);

/** عدد با جداکنندهٔ سه‌رقمی فارسی (یا انگلیسی در حالت EN): ۱۲۳۴۵۶۷ به ۱٬۲۳۴٬۵۶۷ */
export function fa(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const s = Math.round(n).toString();
  const neg = s.startsWith('-');
  if (isEn()) {
    const bodyEn = (neg ? s.slice(1) : s).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + bodyEn;
  }
  const body = (neg ? s.slice(1) : s).replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  return (neg ? '-' : '') + faDigits(body);
}

/** عدد اعشاری تا یک رقم: ۰٫۴ */
export function faDec(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '—';
  if (isEn()) return n.toFixed(digits);
  return faDigits(n.toFixed(digits)).replace('.', '٫');
}

/** درصد: ۴۲٪ (یا 42% در حالت EN) */
export const faPct = (n: number) => (isEn() ? `${Math.round(n)}%` : fa(n) + '٪');

/** ساعت بازی: ۰۷:۳۰ */
export function faClock(h: number): string {
  const hh = Math.floor(h) % 24;
  const mm = Math.floor((h - Math.floor(h)) * 6) * 10;
  const raw = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  return isEn() ? raw : faDigits(raw);
}

/** مدت نسبت ساده: ۹ روز / 9 days */
export function faDays(n: number): string {
  const d = Math.round(n);
  if (isEn()) return d <= 0 ? 'Today' : d === 1 ? '1 day' : `${d} days`;
  return d <= 0 ? 'امروز' : d === 1 ? '۱ روز' : fa(d) + ' روز';
}
