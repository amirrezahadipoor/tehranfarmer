# چک‌لیست انتشار رسمی (`docs/RELEASE-CHECKLIST.md`)

پیش از تگ زدن هر نسخهٔ رسمی (`vX.Y.Z`) و بارگذاری در مارکت‌های اندرویدی یا انتشار نسخهٔ وب، تمام بندهای زیر باید به ترتیب اجرا و تأیید شوند.

---

## ۱. همگام‌سازی نسخه و مستندات
- [ ] نسخهٔ `version` در فایل `package.json` به‌روز شده است (مثلاً `"10.0.0"`).
- [ ] مقدار `versionName` در `android/app/build.gradle` دقیقاً برابر با `package.json` است و `versionCode` یک عدد صحیح اکیداً افزایشی است (`1000` -> `1001` -> ...).
- [ ] آرایهٔ `CHANGELOG` در `src/strings/version.ts` و فایل ریشهٔ `CHANGELOG.md` با خلاصهٔ دقیق تغییرات نسخهٔ جدید به‌روز شده‌اند.
- [ ] شمارهٔ کش در `public/sw.js` (`CACHE_NAME`) برای نسخهٔ جدید یک واحد بالا برده شده است تا کاربران قدیمی بستهٔ تازه را بگیرند.
- [ ] سند `PRIVACY.md` بازبینی شده و همچنان با ممیزی حریم خصوصی مطابقت کامل دارد.

## ۲. گیت‌های خودکار کیفیت، منطق، بالانس و تصویر
دستورات زیر باید همگی با کد خروجی `0` پایان یابند:
```bash
npm run roadmap:progress
npm run check
STRICT=1 RUNS=3 npm run sim:balance
STRICT=1 npm run sim:story
npm run test:visual
```
- [ ] صفر خطای TypeScript (`tsc --noEmit`).
- [ ] صفر رشتهٔ فارسی بیرون از `src/story/**` و `src/strings/**` (`npm run lint:fa`).
- [ ] صفر عدد جادویی اقتصادی بیرون از فایل‌های داده (`npm run lint:magic`).
- [ ] صفر تخطی حریم خصوصی، صفر ایموجی و صفر آیکون گم‌شده (`privacy:audit` + `icons:audit`).
- [ ] حجم فایل تک‌صفحه‌ای `dist/index.html` زیر سقف بودجهٔ واقعی اسکریپت (`< 6144KB` — حجم فعلی ≈ 5210KB با هر هفت آهنگ درون‌خطی) و کاملاً بدون لینک شبکه است (`verify:offline` + اجرای تنها در `offline-single-file.spec.ts`).

## ۳. ساخت، امضا و بازرسی باینری اندروید
```bash
KEYSTORE_PATH="$HOME/.android-keys/mazrae-rangi-release.jks" \
KEYSTORE_PASSWORD="..." \
KEY_ALIAS="mazrae-release" \
KEY_PASSWORD="..." \
npm run android:release

npm run android:verify
$ANDROID_HOME/build-tools/35.0.0/apksigner verify --verbose artifacts/mazrae-rangi-release.apk
```
- [ ] هیچ فایل کلید (`*.jks`, `*.keystore`, `*.p12`, `*.pfx`) در مخزن گیت وجود ندارد (`git status --ignored`).
- [ ] خروجی `npm run android:verify` تأیید می‌کند که `android.permission.INTERNET` در مانیفست نهایی وجود ندارد.
- [ ] تمام بندهای عملیاتی `docs/DEVICE-CHECKLIST.md` روی دستگاه/امولاتور بررسی شده‌اند.

## ۴. ثبت تگ و انتشار از طریق CI
```bash
git tag -a v10.0.0 -m "انتشار نسخهٔ ۱۰.۰.۰ مزرعه رنگی"
git push origin main --tags
```
- [ ] گردش‌کار `.github/workflows/android.yml` سبز شده و هر سه بسته (`mazrae-rangi-release-apk`، `mazrae-rangi-debug-apk` و `mazrae-rangi-web-singlefile`) قابل دانلودند.
