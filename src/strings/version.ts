// نسخهٔ برنامه از package.json در زمان بیلد تزریق می‌شود
import { CFG } from '../game/settings';
const locText = (fa: string, en: string) => (CFG.locale === 'en' ? en : fa);

declare const __APP_VERSION__: string;
declare const __DEV_TOOLS__: boolean;
/**
 * رفع N-6: ابزارهای توسعه (گالری کارگردان صحنه با F9، هندل‌های __cinemaDebug) فقط در بیلد
 * داخلی/تستی وجود دارند. در بیلد production این مقدار false است و Vite کل ماژول را حذف می‌کند.
 */
// شرط خام (بدون نگهبان typeof) تا define آن را به ثابت true/false بدل کند و باندلر بتواند شاخه‌های مرده را در بیلد نهایی کاملاً حذف کند.
export const DEV_TOOLS = __DEV_TOOLS__;
const RAW_APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '10.0.0';
export function formatVersion(v: string = RAW_APP_VERSION): string {
  return CFG.locale === 'en'
    ? v
    : v.replace(/\./g, '٫').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}
export const APP_VERSION = RAW_APP_VERSION;
export const CHANGELOG: { v: string; note: string }[] = [
  {
    get v() { return locText('۱۰٫۱٫۲', '10.1.2'); },
    get note() {
      return locText(
        'رفع save ساعت ۶ صبح، چیدمان لمسی و تعادل معدن؛ کاهش بار اولیه، کش آفلاین موسیقی و تست‌های موبایل در CI',
        'Fix 06:00 sleep saves, touch layouts and mine balance; lighter startup, offline music caching and mobile CI tests',
      );
    },
  },
  {
    get v() { return locText('۱۰٫۱٫۱', '10.1.1'); },
    get note() {
      return locText(
        'اصلاح وضعیت پاکت نامه‌ها؛ نامهٔ جدید تا انتخاب بازیکن بسته می‌ماند و نمای موبایل فهرست/نامه بهبود یافت',
        'Mail-state fix: new letters stay sealed until selected, with clearer mobile list and reading navigation',
      );
    },
  },

{
    get v() { return locText('۱۰٫۱٫۰', '10.1.0'); },
    get note() {
      return locText(
        'بازسازی کامل معدن با استخراج مهارتی، نقشهٔ طبقات و تنظیم سرعت انیمیشن کار',
        'Complete mine rebuild with skill extraction, floor map and work-animation speed',
      );
    },
  },

{
    get v() { return locText('۱۰٫۰٫۱', '10.0.1'); },
    get note() {
      return locText(
        'رفع ایرادهای ممیزی، افزایش خوانایی، صف اعلان و ابزار ساخت APK در CI',
        'Audit fixes, larger legible text, queued toasts and in-CI APK build',
      );
    },
  },

{
    get v() { return locText('۱۰٫۰٫۰', '10.0.0'); },
    get note() {
      return locText(
        'سه مزرعهٔ متصل با ۱۵۴ کرت، ۵ کارگر هماهنگ، برچسب نام و شغل بالای سر اهالی، علامت کوئست پویا و اجرای ۱۰۰٪ آفلاین روی سرعت طبیعی ۱×',
        'Three connected estates (154 plots), 5 coordinated farmhands, overhead NPC Name + Job plates, live quest markers, and 100% offline 1x play',
      );
    },
  },
  {
    get v() { return locText('۹٫۰٫۰', '9.0.0'); },
    get note() {
      return locText(
        'بازطراحی تابلوهای راهنما، فونت تعبیه‌شده و صیقل بصری',
        'Redesigned world signposts, embedded typography, and visual polish',
      );
    },
  },
  {
    get v() { return locText('۸٫۰٫۰', '8.0.0'); },
    get note() {
      return locText(
        'جاده‌ها، حذف کامل ایموجی، گلخانه، سیلو و کارگاه نجاری',
        'Dirt roads, 100% hand-drawn SVG/Canvas icons, greenhouse, silo, and carpentry workshop',
      );
    },
  },
];
