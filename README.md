# مزرعه رنگی — بازی کشاورزی دست‌نقاشی (اندروید و وب آفلاین)

بازی کشاورزی و داستانی فارسی و انگلیسی با گرافیک دست‌نقاشی روی بوم، داستان شش‌فصلی میراث پدربزرگ، **۸ ناحیهٔ متصل جهان دره (`مزرعهٔ اصلی ۴۰ کرت` + `دشت شمالی ۵۴ کرت` + `باغ‌درهٔ آفتاب ۶۰ کرت` با مجموع ۱۵۴ کرت، `شهر`، `رودخانه`، `زنبورستان`، `غار بلورین` و `جنگل کهن`)**، **۱۶ فرآوردهٔ دست‌ساز پاتیل و آسیاب**، **صندوق پستی تعاملی مزرعه**، **۵ کارگر هماهنگ**، پلاک نام و شغل بالای سر اهالی شهر (`مادربزرگ نصرت، سارا، مهندس کاوه، عمو مراد و آقا جهانگیر`)، علامت کوئست پویا و **۱۶ افکت صوتی استودیویی درون‌خطی `.mp3` روی `WebAudio`** — کاملاً آفلاین، بدون ایموجی و بدون مجوز شبکه در بستهٔ اندروید (`ir.mazraerangi.game`).

## اجرای سریع و گیت‌های کنترل کیفیت
```bash
npm install
npm run dev                        # اجرای محیط توسعه
npm run check                      # گیت کامل: tsc + lint:fa + lint:magic + privacy + agents + vitest + build + offline + icons
STRICT=1 RUNS=3 npm run sim:balance # شبیه‌ساز بالانس اقتصادی در ۹ سناریو (۳ دشواری × ۳ استراتژی)
STRICT=1 npm run sim:story         # ربات تکمیل خودکار داستان از پرولوگ تا جشن پایانی
npm run test:visual                # آزمون‌های تصویری Playwright روی پروفایل‌های نمایشگر و مودال‌ها
npm run roadmap:progress           # به‌روزرسانی جدول پیشرفت ROADMAP.md (۱۶۴/۱۶۴ — ۱۰۰٪)
```

## ساخت بستهٔ نصبی اندروید (`APK`)
```bash
npm run android:assets             # تولید خودکار آیکون‌های تطبیقی و اسپلش در تمام چگالی‌ها
npm run android:debug              # ساخت artifacts/mazrae-rangi-debug.apk
npm run android:release            # release.apk امضاشده، یا release-unsigned.apk صریحاً بدون امضا
npm run android:verify             # ساختار + امضای v2/v3 با apksigner + نسخه و مجوزها با aapt2
```
برای امضای نسخهٔ Release بیرون از گیت، راهنمای [`docs/KEYSTORE.md`](docs/KEYSTORE.md) را ببینید.

## اسناد مرجع پروژه
| سند | شرح |
|---|---|
| [`ROADMAP.md`](ROADMAP.md) | نقشهٔ راه ۲۰ فاز و ۱۶۴ تسک پیاده‌سازی‌شده (با ممیزی مستمر QA) |
| [`STORY.md`](STORY.md) | فیلم‌نامه، شخصیت‌ها، فصل‌ها و پایان‌بندی‌ها |
| [`DECISIONS.md`](DECISIONS.md) | تصمیم‌های معماری و دلایل فنی |
| [`PRIVACY.md`](PRIVACY.md) | سیاست حریم خصوصی (گردآوری صفر داده و صفر مجوز شبکه) |
| [`CREDITS.md`](CREDITS.md) | منبع و مجوز CC0 موسیقی و صدای واقعی آبیاری |
| [`CHANGELOG.md`](CHANGELOG.md) | تاریخچهٔ کامل نسخه‌ها تا `10.0.0` |
| [`docs/BALANCE-REPORT.md`](docs/BALANCE-REPORT.md) | گزارش عددی شبیه‌ساز بالانس و نرخ تسویهٔ بدهی |
| [`docs/KEYSTORE.md`](docs/KEYSTORE.md) | مدیریت امن کلید امضای اندروید بیرون از گیت |
| [`docs/DEVICE-CHECKLIST.md`](docs/DEVICE-CHECKLIST.md) | چک‌لیست تست روی گوشی واقعی و امولاتور اندروید |
| [`docs/RELEASE-CHECKLIST.md`](docs/RELEASE-CHECKLIST.md) | چک‌لیست نهایی انتشار رسمی و CI |
