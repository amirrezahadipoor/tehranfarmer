# سیاست حریم خصوصی — مزرعه رنگی (`PRIVACY.md`)

**آخرین به‌روزرسانی:** ۲۹ مهر ۱۴۰۵ (`2026-10-21`)  
**نام برنامه:** مزرعه رنگی (`Mazrae Rangi`)  
**شناسهٔ بستهٔ اندروید:** `ir.mazraerangi.game`

---

## ۱. اصل بنیادین: گردآوری صفر داده (`Zero Data Collection`)
بازی **مزرعه رنگی** به صورت **۱۰۰٪ آفلاین و محلی** روی دستگاه شما اجرا می‌شود:
- **هیچ اطلاعات شخصی، هویتی، مکانی، تبلیغاتی یا تحلیلی (Analytics / Telemetry) گردآوری، ذخیره یا به هیچ سروری ارسال نمی‌شود.**
- هیچ کتابخانهٔ ردیاب، تبلیغاتی، کرش‌ریپورتر ابری یا SDK شخص ثالث شبکه‌ای در کد منبع یا بستهٔ نصبی وجود ندارد.
- بستهٔ نصبی اندروید (`APK`) حتی مجوز دسترسی به اینترنت (`android.permission.INTERNET`) را در فایل `AndroidManifest.xml` درخواست **نمی‌کند** و پشتیبان‌گیری ابری خودکار گوگل نیز به طور صریح غیرفعال شده است (`android:allowBackup="false"` و `android:fullBackupContent="false"`)؛ بنابراین سیستم‌عامل اندروید در سطح هسته هرگونه ارتباط شبکه‌ای یا ارسال ابری ناخواسته را مسدود نگه می‌دارد.

## ۲. داده‌های ذخیره‌شده روی دستگاه کاربر
تنها داده‌هایی که روی حافظهٔ داخلی خود دستگاه شما نگهداری می‌شوند عبارت‌اند از:
1. **وضعیت پیشرفت بازی و تنظیمات (`Save State`):** شامل روز بازی، محصولات، ساختمان‌ها، پیشرفت داستان و تنظیمات صدا/دسترسی‌پذیری که صرفاً در حافظهٔ خصوصی برنامه (`Capacitor Preferences` / `localStorage`) ذخیره می‌شود.
2. **گزارش خطای محلی (`Local Error Ring Buffer`):** در صورت بروز خطای غیرمنتظره، حداکثر ۲۰ رکورد فنی بدون دادهٔ هویتی فقط روی دستگاه نگه داشته می‌شود و هرگز خودکار ارسال نمی‌گردد.
3. **پشتیبان JSON انتخابی کاربر:** کاربر می‌تواند به ارادهٔ خود از منوی تنظیمات فایل پشتیبان سِیو را روی دستگاه ذخیره یا بازیابی کند.

## ۳. حذف کامل داده‌ها
با پاک کردن داده‌های برنامه از بخش تنظیمات اندروید یا استفاده از دکمهٔ «بازنشانی بازی» در منوی تنظیمات داخل بازی، تمامی داده‌های ذخیره‌شده بلافاصله و برای همیشه از روی دستگاه پاک می‌شوند.

## ۴. حریم خصوصی کودکان و خانواده
از آنجا که بازی هیچ حساب کاربری، پرداخت درون‌برنامه‌ای، چت، تبلیغات یا اتصال به اینترنت ندارد، برای تمامی گروه‌های سنی کاملاً ایمن است.

---

## English Summary (Store Review Reference)
**Mazrae Rangi (`ir.mazraerangi.game`)** is a strictly **100% offline** single-player game.
- **Data Collected:** None (`0` bytes collected, transmitted, or shared).
- **Network Permissions:** None — `android.permission.INTERNET` is completely absent from the compiled `AndroidManifest.xml` (verified automatically via `npm run privacy:audit` and `npm run android:verify`).
- **Storage:** Game progress and accessibility preferences are stored solely on-device via local app storage and deleted immediately upon app uninstall or in-game reset.
