# راهنمای مدیریت کلید امضای اندروید (`KEYSTORE.md`)

این سند نحوهٔ ساخت، نگهداری امن و استفاده از کلید امضای نسخهٔ انتشار (`Release APK`) بازی **مزرعه رنگی** را شرح می‌دهد.

## ۱. قانون طلایی امنیت
- **هرگز** فایل کلید (`*.jks`, `*.keystore`, `*.p12`, `*.pfx`) یا گذرواژه‌ها را در گیت کامیت نکنید.
- فایل `.gitignore` و آزمون‌های خودکار مخزن به گونه‌ای تنظیم شده‌اند که وجود هر فایل کلید در مخزن را مسدود می‌کنند.
- اگر کلید انتشار گم شود، امکان به‌روزرسانی بازی در مارکت‌های اندرویدی (کافه‌بازار، مایکت، گوگل‌پلی) برای کاربران قبلی وجود نخواهد داشت؛ بنابراین حداقل **دو نسخهٔ پشتیبان آفلاین رمزنگاری‌شده** نگهداری کنید.

## ۲. ساخت کلید انتشار با `keytool`
یک‌بار روی سیستم امن محلی (خارج از پوشهٔ مخزن گیت) دستور زیر را اجرا کنید:

```bash
mkdir -p ~/.android-keys && chmod 700 ~/.android-keys

keytool -genkeypair \
  -v \
  -storetype PKCS12 \
  -keystore ~/.android-keys/mazrae-rangi-release.jks \
  -alias mazrae-release \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000 \
  -dname "CN=Mazrae Rangi, OU=Game Studio, O=MazraeRangi, L=Tehran, C=IR"
```

## ۳. متغیرهای محیطی مورد استفاده در `android/app/build.gradle`
اسکریپت ساخت Gradle تنها در صورتی نسخهٔ Release را امضا می‌کند که متغیرهای زیر در محیط اجرا تنظیم شده باشند؛ در غیر این صورت، بدون خطا خروجی `app-release-unsigned.apk` تولید می‌شود:

| متغیر محیطی | توضیح |
|---|---|
| `KEYSTORE_PATH` | مسیر مطلق فایل کلید روی دیسک (مثلاً `/home/dev/.android-keys/mazrae-rangi-release.jks`) |
| `KEYSTORE_PASSWORD` | گذرواژهٔ مخزن کلید (`storePassword`) |
| `KEY_ALIAS` | نام مستعار کلید (مثلاً `mazrae-release`) |
| `KEY_PASSWORD` | گذرواژهٔ کلید خصوصی (اگر خالی باشد، برابر `KEYSTORE_PASSWORD` در نظر گرفته می‌شود) |

## ۴. ساخت نسخهٔ امضاشده روی سیستم محلی

```bash
KEYSTORE_PATH="$HOME/.android-keys/mazrae-rangi-release.jks" \
KEYSTORE_PASSWORD="YOUR_STRONG_PASSWORD" \
KEY_ALIAS="mazrae-release" \
KEY_PASSWORD="YOUR_STRONG_PASSWORD" \
npm run android:release
```

فایل نهایی در مسیر `artifacts/mazrae-rangi-release.apk` ذخیره می‌شود و با هر سه طرح امضای اندروید (`v1 + v2 + v3`) امضا شده است. بدون کلید، خروجی عمداً `artifacts/mazrae-rangi-release-unsigned.apk` نام دارد تا با فایل آمادهٔ انتشار اشتباه نشود. با `REQUIRE_SIGNED_RELEASE=1 npm run android:release` ساخت بدون امضا با خطا متوقف می‌شود؛ این guard برای تگ‌های رسمی CI نیز فعال است.

## ۵. بررسی صحت امضای دیجیتال با `apksigner`

```bash
$ANDROID_HOME/build-tools/35.0.0/apksigner verify --verbose --print-certs artifacts/mazrae-rangi-release.apk
```

## ۶. امضای خودکار در GitHub Actions (`CI`)
برای امضا در CI:
1. فایل کلید را به Base64 تبدیل کنید:
   ```bash
   base64 -w 0 ~/.android-keys/mazrae-rangi-release.jks
   ```
2. مقادیر زیر را در `Settings -> Secrets and variables -> Actions` تعریف کنید:
   - `ANDROID_KEYSTORE_BASE64`
   - `KEYSTORE_PASSWORD`
   - `KEY_ALIAS`
   - `KEY_PASSWORD`
3. گردش‌کار `.github/workflows/android.yml` هنگام وجود این Secretها فایل کلید موقت را در `$RUNNER_TEMP` بازگشایی کرده، `artifacts/mazrae-rangi-release.apk` را امضا می‌کند و بلافاصله پس از ساخت، فایل موقت را پاک می‌کند. `npm run android:verify` امضای رمزنگاری `v2/v3` را با `apksigner` می‌سنجد و تگ رسمی بدون Secret معتبر سبز نمی‌شود.
