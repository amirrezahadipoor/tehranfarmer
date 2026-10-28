// نسخهٔ برنامه از package.json در زمان بیلد تزریق می‌شود
import { CFG } from '../game/settings';
const locText = (fa: string, en: string) => (CFG.locale === 'en' ? en : fa);

declare const __APP_VERSION__: string;
const RAW_APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '10.0.0';
export function formatVersion(v: string = RAW_APP_VERSION): string {
  return CFG.locale === 'en'
    ? v
    : v.replace(/\./g, '٫').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}
export const APP_VERSION = RAW_APP_VERSION;
export const CHANGELOG: { v: string; note: string }[] = [
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
