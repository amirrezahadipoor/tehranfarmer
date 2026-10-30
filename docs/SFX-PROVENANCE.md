# Provenance جلوه‌های صوتی procedural

پانزده فایل `boop, buy, cluck, coin, dig, err, fanfare, guitar, nibble, pad, paper, pop, splash, step, tap` به‌دلیل نداشتن مدرک مجاز برای نسخهٔ قبلی، **کاملاً جایگزین** شده‌اند؛ مجوز فایل‌های قدیمی حدس زده نشده است.

- منبع: سنتز ریاضی PCM داخل `scripts/generate-sfx.mjs`؛ هیچ ضبط، sample یا فایل صوتی شخص ثالثی در این ۱۵ خروجی استفاده نشده است.
- مؤلف: Tehran Farmer contributors.
- مجوز خروجی: همان MIT License ریشهٔ مخزن (`LICENSE`).
- خروجی: مونو، ۴۴۱۰۰ هرتز، MP3 با نرخ ۲۴kbps و envelope ضدکلیک در ابتدا/انتها.
- مدرک ماشین‌خوان: `docs/sfx-provenance.json` شامل مدت، حجم و SHA-256 تک‌تک فایل‌ها.
- رکورد قابل بررسی عمومی: `docs/media-provenance.json`.

بازتولید و بازرسی:

```bash
npm run generate:sfx
npm run audit:media
npm run audit:audio
npm test -- --run tests/a11y-sound.test.tsx
```

اجرای generator باید همان SHA-256ها را بازتولید کند. تغییر الگوریتم یا نرخ نمونه‌برداری عمداً هش‌ها را عوض می‌کند و باید در commit و مستندات همراه بررسی شود. بازرسی خودکار اعتبار قاب MPEG، تطابق فایل با bank درون‌خطی، بودجهٔ حجم و decode مرورگر انجام می‌شود؛ این جایگزین ارزیابی شنیداری انسانی قبل از انتشار فروشگاه نیست.
