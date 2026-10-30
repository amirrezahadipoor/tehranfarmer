# منابع صوتی شخص ثالث

## موسیقی پس‌زمینه (پخشِ هر فصل، آهنگِ جدا)

- **فصل ۱ — عنوان:** Peaceful Forest · **پدیدآور:** Samza · **منبع:** https://opengameart.org/content/peaceful-forest · **مجوز:** CC0 · **تغییرات:** نرمال‌سازی ملایم، افکت ورود کوتاه، MP3 استریو 96kbps در `public/music/peaceful-forest.mp3` (بدون تغییر در این نسخه).
- **فصل ۲ — عنوان:** Countryside · **پدیدآور:** TAD · **منبع:** https://opengameart.org/content/lofi-compilation · **مجوز:** CC0 · **فایل مبدأ:** `Countryside_0.mp3` · **تغییرات:** برش تا ۹۲ ثانیه، مونو، 32kbps، فِید نرم، `public/music/ch2.mp3`.
- **فصل ۳ — عنوان:** Feel good slow ambient track with a beat · **پدیدآور:** annandistance · **منبع:** https://opengameart.org/content/feel-good-slow-ambient-track-with-a-beat · **مجوز:** CC0 · **فایل مبدأ:** `ambienttrack_1.ogg` · **تغییرات:** برش تا ۱۱۴ ثانیه، تبدیل به MP3 مونو 32kbps، فِید نرم، `public/music/ch3.mp3`.
- **فصل ۴ — عنوان:** Florist · **پدیدآور:** TAD · **منبع:** https://opengameart.org/content/lofi-compilation · **مجوز:** CC0 · **فایل مبدأ:** `Florist_0.mp3` · **تغییرات:** برش تا ۱۱۳ ثانیه، مونو، 32kbps، فِید نرم، `public/music/ch4.mp3`.
- **فصل ۵ — عنوان:** A cup of tea · **پدیدآور:** TAD · **منبع:** https://opengameart.org/content/lofi-compilation · **مجوز:** CC0 · **فایل مبدأ:** `A cup of tea_0.mp3` · **تغییرات:** برش تا ۱۴۰ ثانیه، مونو، 32kbps، فِید نرم، `public/music/ch5.mp3`.
- **فصل ۶ — عنوان:** Town Theme (RPG) · **پدیدآور:** cynicmusic · **منبع:** https://opengameart.org/content/town-theme-rpg · **مجوز:** CC0 (درخواست پدیدآور برای ذکر: cynicmusic.com / pixelsphere.org) · **تغییرات:** برش تا ۹۷ ثانیه، مونو، 32kbps، فِید نرم، `public/music/ch6.mp3`.
- **فصل ۷ (پس‌بازی) — عنوان:** Forest Ambience · **پدیدآور:** TinyWorlds · **منبع:** https://opengameart.org/content/forest-ambience · **مجوز:** CC0 · **تغییرات:** سه‌بار تکرارِ حلقهٔ بی‌درز (≈۱۳۴ ثانیه)، مونو، 24kbps، `public/music/ch7.mp3`.

فصل ۱ استریو ۹۶kbps است؛ فصل‌های ۲ تا ۷ برای کاهش حجم بستهٔ بازی و APK به مونوی ۲۴–۳۲kbps تبدیل شده‌اند. رکورد ساختاریافتهٔ این اطلاعات در `docs/media-provenance.json` نگه داشته می‌شود.

## صدای آبیاری

- **عنوان:** Watering with a Watering Can.mp3
- **پدیدآور:** Bricklover
- **شناسهٔ Freesound:** 532890
- **منبع:** https://freesound.org/s/532890/
- **پیش‌نمایش مورد استفاده:** https://cdn.freesound.org/previews/532/532890_8919922-hq.mp3
- **مجوز:** Creative Commons Zero 1.0 (CC0) — https://creativecommons.org/publicdomain/zero/1.0/
- **تغییرات:** انتخاب قطعهٔ ۲٫۵ ثانیه‌ای از بخش آب‌پاشی، تبدیل به مونو، نرمال‌سازی ملایم، فید ورود/خروج کوتاه و فشرده‌سازی برای `src/assets/sfx/water.mp3`.

ذکر منبع برای آثار CC0 بالا الزامی نیست، اما برای قدردانی از پدیدآوران و شفافیت انتشار در این پرونده نگه داشته شده است.

## وضعیت پانزده افکت صوتی دیگر

برای ۱۵ فایل دیگر در `src/assets/sfx/` هنوز مدرک معتبری از پدیدآور، مبدأ، مجوز یا فرایند ساخت ثبت نشده است. بنابراین منشأ این فایل‌ها **از نظر مستندات انتشار ناشناخته است**؛ نباید آن‌ها را CC0، ساخت‌داخلی یا آزاد حدس زد. رکورد همهٔ فایل‌ها در `docs/media-provenance.json` موجود است و موارد ناقص صریحاً `unverified` هستند.

- `npm run audit:media:report` فهرست کامل را بدون تغییر وضعیت چاپ می‌کند.
- `npm run audit:media` تا تکمیل مدرک هر ۱۵ فایل با کد خطا متوقف می‌شود؛ این یک release blocker است و فقط با اطلاعات واقعی باید برطرف شود.
