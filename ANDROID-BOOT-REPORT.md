# گزارش عیب‌یابی — `tehranfarmer` (مزرعه رنگی)

**سؤال:** چرا روی اندروید تاچ کار نمی‌کند و چرا انیمیشنِ بعد از لود با سرعت (تقریباً یک‌باره) اجرا می‌شود؟

**بررسی روی:** `amirrezahadipoor/tehranfarmer` @ `e3aef4f` (شامل سه کامیت اخیرِ «fix: prevent Android startup touch blocking» / «fix: remove loading to start flicker» / «test: cover loading to Start continuity»)

---

## ۰) پاسخ کوتاه

هر دو علامت **یک ریشه** دارند:

> پیش‌ساخت صحنهٔ boot یک تسک همگانیِ **بی‌وقفه** است که نخ اصلی (main thread) WebView را قفل می‌کند — روی امولاتورِ CI خودتان **۵ تا ۱۰ ثانیه**، روی گوشی سالم چند صد میلی‌ثانیه. در طول این قفل هیچ رویداد لمسی به صفحه **نمی‌رسد** (در لاگ ران ۹، ضربهٔ واقعی `adb input tap` صفر رویداد به صفحه داد) — و چون تمام کوریوگرافیِ بعد از لود (درصد پیشرفت، محو شدن لودینگ، انیمیشن ورود Start) روی `requestAnimationFrame` و `setTimeout` سوار است، به‌محض آزاد شدن نخ همه‌چیز در یک «بَرست» ~۴۰۰ میلی‌ثانیه‌ای اجرا می‌شود؛ یعنی ترنزیشن ۱۸۰ میلی‌ثانیه‌ای در یک فریم.

روی همین ریشه، سه تشدیدکنندهٔ مخصوص اندروید سوار است که در دسکتاپ/Playwright **هرگز** اجرا نمی‌شوند (`touchBridge`، پردهٔ لودینگ، `2070ae0`) — پایین‌تر با عدد و مدرک.

---

## ۱) شواهد اندازه‌گیری‌شده

### الف) لاگ‌های خودِ CI شما روی امولاتور واقعی اندروید (API 34, WebView 113, `adb input tap`)

ران‌های workflow «Android Touch Repro» بر روی برنچ `repro/android-touch` (برنچ پاک شده، ولی لاگ‌ها و ARTIFACTها باقی‌اند — من آن‌ها را از API دانلود و تحلیل کردم):

| ران | تسک بلندِ boot | وضعیت تاچ روی «شروع» |
|---|---|---|
| 9 — `profile Android startup long tasks` | **یک long task به مدت ۵۰۲۵ms** (از ۳٫۲s تا ۸٫۲s) | `touchLog: []` → **هیچ رویدادی به صفحه نرسید**، `startVisible: true` (ضربه گم شد) |
| 10 — `stabilize final Android boot verification` | **یک long task به مدت ۹۸۹۱ms** (از ۳٫۵s تا ۱۳٫۵s) | ضربه کار کرد (چون در حالت بی‌باری صفحه زده شد) |
| 8 | long task ۸۵۱۹ms | ضربه کار کرد، اما با کلیک مصنوعی (پایین‌تر ببینید) |

نمونه‌بردارِ boot در ران ۹ (هرچه نخ آزاد بود نمونه گرفته):

```
t=    22ms  pct=۱۲٪
t=    38ms  pct=۱۲٪
   … ۷٫۸ ثانیه هیچ فریمی نیست (قفل کامل) …
t=  7856ms  pct=۳۸٪   (+7819ms)
t=  7930ms  pct=۵۲٪   (+73ms)
t=  7964ms  pct=۶۰٪   (+35ms)
t=  8027ms  pct=۷۶٪   (+63ms)
t=  8260ms  pct=۹۲٪   (+233ms)
t=  8877ms  start=true
```

دو نکته از همین جدول:

1. فاصله‌ی بین «۲۸٪» تا «۳۸٪» دقیقاً همان `await prewarmScene('farm', sn)` است (`src/game/preloader.ts:134`) — یعنی کلِ ۵ تا ۱۰ ثانیه فریز، یک تابع.
2. بقیهٔ لودینگ (۳۸٪→۹۲٪→Start→محو شدن) در **۴۰۰ms** انجام می‌شود. وقتی همهٔ گام‌ها که با `waitMs(60)` از هم جدا شده‌اند در ۴۰۰ms فشرده شوند، «انیمیشن لودینگ تا بازی» عملاً یک فریم بیش نیست.

پس بعد از تسک‌های بلند، در همان ران ۹ چهار تسک ۶۶/۱۱۹/۹۱/۲۲۲ میلی‌ثانیه‌ای دیگر هم ثبت شده که **۱٫۸ ثانیه بعد از ظاهر شدن Start** می‌افتند — همان `scheduleDeferredPrewarm` (`preloader.ts:83`، `setTimeout(..., 1800)`). یعنی درست در لحظه‌ای که بازیکن شروع به ضربه زدن می‌کند، دوباره چند فریز پشت سر هم.

### ب) اندازه‌گیری محلی (Chromium با لمس واقعی، `hasTouch`, DPR 2.75، ۸۴۴×۳۹۰، CPU throttle ۶×)

من `diag/` را در نسخهٔ کلون‌شده اضافه کردم و اجرا کردم:

- هزینهٔ ساخت هر صحنه (خروجی `farmBG/townBG/...` روی همین ماشین): `farmBG` = **۱۶ms** بدون throttle، **۱۱۶ms** در ۶×. یعنی کد به‌خودی‌خود فاجعه نیست؛ روی امولاتور (swiftshader/نرم‌افزاری + بیلد debug) ۴۰ برابر بدتر می‌شود. نتیجهٔ مهم این است که **روی گوشی‌های ضعیف‌تر همان ۱۱۶ms می‌شود ۱ تا ۳ ثانیه**، و شکل مشکل همان می‌ماند: یک تسک بزرگ بی‌وقفه.
- **تأخیر `click` بومی بعد از `pointerup`:**
  - در Chromium محلی با لمس: `pointerup@1556 → click@1559` → **۳ms**.
  - روی امولاتور اندروید (ران ۱۰، دکمهٔ شروع): `pointerup@31335 → click@31346` → ۱۱ms.
  - روی امولاتور اندروید (ران ۸ و ۱۰، ضربه روی صحنهٔ پرولوگ): `pointerup@41647 → click@41786` → **۱۳۹ms** (و در ران ۸: **۱۲۷ms**).
  - **۵۵ms** تنها مجازی است که `touchBridge` برای رسیدن `click` در نظر گرفته (`src/game/touchBridge.ts:114`). روی اندروید واقعی این عدد به‌سادگی رد می‌شود.
- **محورِ «انیمیشن سریع»:** در حالت ۶× throttle، تایم‌لاین فریم‌به‌فریمِ من این را نشان داد:

```
3574ms  loader=1.00  start=mounted  pop=0ms      ← Start پشت لودینگِ کاملاً مات سوار می‌شود
3794ms  loader=1.00  pop=50ms                    ← ۲۲۰ms گذشته، انیمیشن فقط ۵۰ms جلو رفته (فریم کم است)
3830ms  loader=0.71  pop=83ms                     ← محو شدن شروع می‌شود
3855ms  loader=gone  pop=100ms                    ← لودینگ رفت؛ ترنزیشن ۱۸۰ms در ۲۵ms (۲ فریم!) اجرا شد
```

یعنی دو خطای هم‌زمان: (۱) `popin` ۱۸۰msِ Start وقتی هنوز پشت پرده است شروع شده، و (۲) ترنزیشن `opacity .18s` خودِ لودینگ به‌خاطر کمبود فریم در **یک‌‌دو فریم** فشرده می‌شود → «انیمیشن با سرعت اجرا می‌شود/اصلاً دیده نمی‌شود».

---

## ۲) ریشه‌ها، به ترتیب اهمیت

### ۲-۱) `prewarmScene` یک تابع async است که هیچ‌وقت yield نمی‌کند

`src/game/scenes.ts:511`

```ts
export async function prewarmScene(scene: SceneKey, sn: number): Promise<void> {
  getSceneSource(scene, sn);        // 100% synchronous
  return Promise.resolve();
}
```

`await` روی چنین تابعی هیچ فرصت تنفسی به نخ اصلی نمی‌دهد. و `farmBG` (`scenes.ts:183`) این‌ها را پشت سر هم می‌کشد:

- `ground()` → ۲۶۰۰ خطِ چمن + ۲۶۰ خطِ دیگر (`scenes.ts:35`)،
- `paperGrain(c, 3500, 11)` → **۳۵۰۰ فراخوانی جداگانهٔ `fillRect` که برای هر کدام `fillStyle` هم عوض می‌شود** (`scenes.ts:228`)،
- ۷ `dirtRoad`، ۱۱ درخت، خانه، انبار، چاه، ۵ تابلو، بستر مزرعه،
- و `shape()` با `hatch` برای هر شکل یک حلقهٔ `for (k += 6)` دارد که **صد‌ها `stroke()` مستقل** می‌زند و هر `shape` مسیر را **دو بار** استروک می‌کند (پس‌زمینه + سایه) (`src/game/art.ts:85-121`).

نتیجه: روی امولاتور **یک تسک بی‌وقفهٔ ۵ تا ۱۰ ثانیه‌ای** که تاچ در آن پنجره کامل می‌میرد (همان `touchLog: []` ران ۹). روی ماشین من (۶× throttle) کل `farmBG` = **۹۳ms** است؛ یعنی روی گوشی واقعی اندازهٔ یک hitch چند صد میلی‌ثانیه‌ای است، نه چند ثانیه — پس این مورد روی امولاتور **اثبات شده** ولی شدتش روی گوشی شما باید با بند «چگونه روی دستگاه خودتان قطعی‌اش کنیم» پایین تأیید شود.

تفکیک فازهای `farmBG` (۶× throttle، میانگین ۳ تکرار) — برای این که «به‌جای بهینه‌کردن حلقهٔ اشتباه، کار درست را بکنیم»:

| فاز | ms |
|---|---|
| کل `farmBG()` | **93** |
| `mountains()` | 4 |
| `ground()` (۲۶۰۰ خط) | 7 |
| `paperGrain(3500)` | 5 |
| یک `dirtRoad` (×۶) | 3 |
| یک `signpost` (×۵) | 1 |
| یک `tree` (×۱۱) | 1 |
| یک `fence` | 2 |
| `document.createElement('canvas')` + 1060×560 | 0 |

(باقی ~۶۰ms در `house/barn/well/drawFarmlandBed/flowers` است که export نیستند.) **هیچ حلقه‌ای مقصر نیست؛ هزینه پخش‌شده است** — بنچمارک مستقیم هم این را تأیید کرد: بازنویسی `paperGrain` از ۳۵۰۰×`fillStyle+fillRect` به ۲ مسیر انبسته، هیچ فرقی نکرد (`current: [9,9,9]` در برابر `batched: [8,9,11]` میلی‌ثانیه). پس راه‌حل، **برش‌زدن/yield** است نه ریزبه‌ریز کردن توابع ترسیم.

`scheduleDeferredPrewarm` هم همین الگو را برای `town/river/apiary` + دیکد ~۱۲۰ آیکون دارد و زمانش ۱٫۸ ثانیه بعد از ورود بازی است — یعنی دقیقاً وسط اولین تعامل‌های بازیکن.

### ۲-۲) `touchBridge` روی اندروید مسابقه می‌دهد (و باخت‌هایش فقط لمسی‌اند)

`src/game/touchBridge.ts:43`

```ts
if (!e.isTrusted || e.pointerType === 'mouse' || !e.isPrimary) return;
```

کلِ مسیر «بازیابی کلیک» برای موس زودتر از تابع برمی‌گردد. **۲۱۸ هندلر UI این پروژه `onClick` هستند**؛ پس این کد تنها جایی است که لمس واقعی را به `click` می‌رساند و در عین حال تنها جایی که با زمان‌بندیِ ۵۵ms شرط بسته:

```ts
setTimeout(() => {
  if (rec.clicked || rec.scrolled || endMove > limit) return;   // ۵۵ms بعد از pointerup
  const guard = (ce) => { if (ce.isTrusted && dist(ce, rec) < 32) { ce.stopPropagation(); ce.preventDefault(); } };
  window.addEventListener('click', guard, { capture: true });
  setTimeout(() => window.removeEventListener('click', guard, { capture: true }), 150);
  rec.el.click();
}, 55);
```

سه پیامد که فقط روی دستگاه لمسی رخ می‌دهد:

1. **ضربهٔ دوم خورده می‌شود.** هر `click` معتبری که تا ۱۵۰ms بعد و در شعاع ۳۲px نقطهٔ ضربهٔ اول باشد با `stopPropagation+preventDefault` در فاز capture روی `window` کشته می‌شود. «زدم، چیزی نشد، دوباره زدم» روی اندروید یعنی ضربهٔ دوم هم گم شود. (در تست‌های دسکتاپ چون `pointerType==='mouse'` است، هرگز رخ نمی‌دهد.)
2. **کلیک مصنوعی مختصاتش `0,0` است.** در لاگ ران ۸/۱۰ دقیقاً این ثبت شده: `{"type":"click","trusted":false,"x":0,"y":0,...}`. هر هندلری که `clientX/clientY` را از `click` بخواند مقدار غلط می‌گیرد.
3. **ریسک فعال‌سازی دوباره.** گارد فقط ۱۵۰ms عمر دارد؛ تأخیر واقعی `click` روی امولاتور ۱۲۷–۱۳۹ms اندازه گرفته شد، یعنی فاصله تا آستانه‌ی دوباره‌زدن (۵۵+۱۵۰=۲۰۵ms) بسیار کم است. اگر `click` دیرتر برسد، همان یک ضربه **دو بار** اجرا می‌شود → مثلاً `next()` در کات‌سین دو بیت جلو می‌رود. این می‌تواند تفسیر دومِ «انیمیشن خودش سریع جلو می‌رود» باشد، و `[data-tap="cutscene"]` هم در `TAP_SELECTOR` هست، پس ضربه‌های روی صحنه‌های سینمایی از همین مسیر رد می‌شوند.

نکته: حتی خودِ تایمر ۵۵ms هم روی دستگاه واقعی با تأخیر اجرا شده (در ران ۸، `pointerup@42670.7 → کلیک مصنوعی@42766.5` = ۹۵ms دیر). پس کلِ این سازوکار روی نخِ شلوغ به یک شرط مسابقه تبدیل می‌شود.

### ۲-۳) پردهٔ لودینگ تا لحظهٔ محو شدن، `pointer-events: auto` است

`src/ui/BootLoader.tsx:29-30` و `src/App.tsx:323-328`

```jsx
pointerEvents: fadingOut ? 'none' : 'auto'     // لودینگ تزئینی است، ولی کل صفحه را می‌پوشاند
const firstFrame = window.requestAnimationFrame(() => { setBootFading(true); … }, …)
```

`fadingOut` از داخل `requestAnimationFrame` ست می‌شود — همان APIای که کامنت خودتان در `preloader.ts:3` می‌گوید «روی بعضی ROMهای اندروید پیش از اولین فریم متوقف می‌ماند». تا وقتی استال است، لودینگ روی کل صفحه `pointer-events: auto` است و هر ضربه‌ای که به آن بخورد بی‌صدا دور ریخته می‌شود. (Start چون در DOM بعدتر آمده روی لودینگ نقاشی می‌شود، ولی روی `canvas` هیچ‌وقت.)

### ۲-۴) کامیت `2070ae0` انیمیشن ورود را «پشت صحنه» می‌کند

`src/App.tsx:401` و `431` از `bootReady` به `bootPrepared` تغییر کردند تا فریم آبیِ بین لودینگ و Start حذف شود. عوارضش:

- `canvas` + `Start` وقتی سوار می‌شوند که لودینگ هنوز `opacity: 1` است → ساعتِ `popin` (۱۸۰ms) و `bob` از همان لحظه کار می‌کند و تا وقتی پرده کنار می‌رود، تمام شده. تست `e2e/mobile-fixes.spec.ts` («loading never exposes an empty frame before Start») عملاً همین رفتار را **الزام** می‌کند؛ یعنی رگرسیونِ انیمیشن، پایداری‌شده توسط تست.
- خودِ محو شدن هم با `setTimeout(180)` + یک رفرش rAF هماهنگ شده؛ در حالت جَنک، تایمر زودتر از تولید فریم‌های میانی شلیک می‌شود و unmount، ترنزیشن را نصفه‌کاره می‌کُشد (اندازه گرفته شد: ۲۵ms برای ترنزیشن ۱۸۰ms).

### ۲-۵) موارد باز در لایهٔ بومی (کم‌اهمیت‌تر، ولی باید تمیز شوند)

- `MainActivity.configureActiveWebView()` در `onResume` **و** `onWindowFocusChanged`، هر بار `setFocusable/setFocusableInTouchMode/setClickable/requestFocus` را روی WebView صدا می‌زند؛ `requestFocus()` مجدد می‌تواند فوکوس DOM جاری را blur کند. این سه خط برای کارکرد تاچ لازم به نظر نمی‌رسند (این را از سورس Capacitor تأیید نکرده‌ام؛ پیشنهادم این است که خط‌به‌خط حذف کنید و با همان harness امولاتوری بسنجید — اگر تاچ تغییر نکرد، همان تأیید عملی است).
- تم‌ها هنوز `android:windowFullscreen=true` را در `AppTheme.NoActionBar`/`NoActionBarLaunch` نگه داشته‌اند (`android/app/src/main/res/values/styles.xml`) در حالی که `MainActivity` هم‌زمان `setDecorFitsSystemWindows(false)` + `WindowInsetsController` را به‌کار می‌برد. ترکیب پرچم تمام‌صفحهٔ قدیمی و کنترلر جدید روی API 30+ رفتار transient bars را غیرقابل‌پیش‌بینی می‌کند (همان مسیری که در `f4f2e97` نصفه اصلاح شد).
- `capacitor.config.ts`: `webContentsDebuggingEnabled: false` → روی APK ریلبیل **نمی‌توانید با `chrome://inspect` تاچ را دیباگ کنید**. برای تست میدانی، debug APK بسازید.

---

## ۳) چرا تست‌های خودتان این را نمی‌گیرند

| تست | چرا خطا را نمی‌بیند |
|---|---|
| `npm test` (vitest) | `touchBridge`/`preloader` را با `isTrusted` مصنوعی و بدون نخ واقعی تست می‌کند |
| `npm run test:e2e` (Playwright) | `pointerup → click` = ۳ms → شاخهٔ ۵۵ms هرگز اجرا نمی‌شود؛ هزینهٔ `farmBG` ۱۶ms است پس فریز ندارد؛ بیشتر `click()` ماوسی است که اصلاً وارد `touchBridge` نمی‌شود |
| `autoFastBoot` (`App.tsx:283`) | با `navigator.webdriver` تاخیر ۱۸۰ms حذف می‌شود → محو شدن «صاف» به نظر می‌رسد |
| `mobile-fixes.spec.ts` | صراحتاً «Start پشت لودینگ» را تأیید می‌کند؛ یعنی همان چیزی که انیمیشن را ناپدید می‌کند |

---

## ۴) پچ پیشنهادی (به ترتیب اولویت؛ هر چهار مورد مستقل‌اند)

1. **گسستن تسک prewarm (اصلی‌ترین اصلاح)** — `prewarmScene` را به فازهای قابل‌برش تبدیل کنید و بین هر فاز یک فریم تنفس بدهید:

   ```ts
   // scenes.ts
   const BUILD_STEPS: Record<SceneKey, ((c: Ctx, sn: number) => void)[]> = {
     farm: [ (c, sn) => mountains(c, sn), (c, sn) => ground(c, sn, 196), drawFarmRoads, drawFarmTrees, drawFarmBuildings, (c) => paperGrain(c, 3500, 11) ],
     …
   };
   export async function prewarmScene(scene: SceneKey, sn: number): Promise<void> {
     const key = cacheKey(scene, sn);
     if (sceneCache[key]) return;
     const { cv, c } = newBG();
     for (const step of BUILD_STEPS[scene]) { step(c, sn); await waitMs(0); }  // هر فاز ≤ ۸–۱۶ms
     sceneCache[key] = cv;
   }
   ```

   و **دنبال بهینه‌سازی حلقه‌های ترسیم نگردید**: بنچمارک بالا نشان داد خودِ `fillRect`ها گلوگاه نیستند (batch کردنشان بی‌تأثیر بود). مشکل فقط «نداشتن نقطهٔ گسست» است.
2. **بودجهٔ زمانی در CI** — در همان workflow امولاتور، `longTasks` را که بین navigation و ظاهر شدن `[data-testid="start-screen"]` می‌افتند زیر ۲۵۰ms اجباری کنید (ساختار `bootMetrics.longTasks` را که خودتان ساخته‌اید فقط یک `expect` لازم دارد)، و یک تست که **وسط فلاتِ درصد، `adb input tap` بزند** و `touchLog` ناتهی بودن را assert کند.
3. **حذف مسابقه از `touchBridge`** — مسیر «کلیک‌سازی» را بردارید (با `touch-action: manipulation` روی دکمه‌ها، Chromium روی اندروید هم `click` می‌سازد؛ فقط در حالت `pointercancel`/اسکرول نباید چیزی ساخت). اگر اصرار به نگه‌داشتن هست: تایمر را از ۵۵ms به ۲۵۰ms ببرید، گارد سراسری `window` را با یک `WeakMap<HTMLElement, number>` (dedupe_per_element) عوض کنید تا ضربهٔ بعدیِ کاربر کشته نشود، و `rec.el.click()` را با `new MouseEvent('click', { bubbles: true, cancelable: true, clientX: rec.sx, clientY: rec.sy })` جایگزین کنید تا مختصات `0,0` نرود.
4. **کوریوگرافی لودینگ→Start** — `pointerEvents: 'none'` را از همان رندر اول روی BootLoader بگذارید (تزئینی است)؛ محو شدن را با `transitionend` (+ fallback `setTimeout(320)`) تمام کنید نه `setTimeout(180)`؛ و `popin`/`finaleCard` را با یک کلاس `boot-revealed` که **هم‌زمان با شروع محو شدن** اضافه می‌شود به تعویق بیندازید (یا `animation-play-state: paused` تا لحظهٔ reveal). این طوری هم «فریم خالی» برمی‌گردد نه، هم انیمیشن قابل دیدن می‌شود.

اگر بخواهید همان ۴ مورد را پیاده و با `typecheck` + `npm test` + `diag/` راستی‌آزمایی کنم، بگویید تا روی یک برنچ جدا بفرستم.

---

## ۵) چطور این تشخیص را روی گوشی خودتان قطعی کنید (۱۰ دقیقه)

رتبه‌بندی قطعی بودن هر مورد، همان‌طور که شواهد می‌گویند:

| # | علت | وضعیت مدرک |
|---|---|---|
| ۲-۱ | قفل چندصدمیلی‌ثانیه‌ای/چندثانیه‌ای نخ اصلی توسط prewarm بدون گسست | **تأییدشده** روی امولاتور (۵۰۲۵ms و ۹۸۹۱ms)؛ روی گوشی واقعی محتملاً کوچک‌تر ولی با همان شکل |
| ۲-۲ | مسابقهٔ ۵۵ms/۱۵۰ms در `touchBridge` (ضربهٔ دوم خورده می‌شود؛ در بدترین حالت فعال‌سازی دوباره) | **تأییدشده** اینکه مسیر در اندروید فعال می‌شود و `click` واقعی ۱۲۷–۱۶۳ms دیرتر از `pointerup` می‌رسد (لاگ ران ۸/۱۰)؛ کلیک مصنوعی `0,0` هم در لاگ ثبت شده. دوباره‌زدن = استنتاج از کد + حاشیهٔ ۶۰ms ریسک |
| ۲-۳ | لودینگ تا لحظهٔ محو شدن `pointer-events: auto` است و `fadingOut` روی rAF نشسته | **تأییدشده از کد**؛ impact آن روی گوشی شما اندازه‌گیری نشده |
| ۲-۴ | محو شدن ۱۸۰ms در ۱–۲ فریم فشرده می‌شود + `popin` پشت پرده اجرا می‌شود | **اندازه‌گیری‌شده** محلی (۱٫۰۰→۰٫۷۱→رفته در ۲۵ms؛ `pop=0ms` در لحظهٔ مانت با `loader=1.00`) |
| ۲-۵ | `windowFullscreen` تم + `WindowInsetsController` + `requestFocus()` در `MainActivity` | **باز / تأییدنشده** — فقط به‌عنوان تمیزکاری مطرح است |

برای عدد قطعی روی دستگاه خودتان، debug APK بسازید (`npm run android:debug` — در نسخهٔ release `webContentsDebuggingEnabled: false` است و `chrome://inspect` کار نمی‌کند) و همین قطعه را در `src/main.tsx` موقت بگذارید:

```ts
new PerformanceObserver((l) => {
  for (const e of l.getEntries()) console.log(`LONGTASK ${Math.round(e.duration)}ms @${Math.round(e.startTime)}`);
}).observe({ entryTypes: ['longtask'] });
const t0 = performance.now();
addEventListener('pointerdown', (e) => console.log(`TAP +${Math.round(performance.now() - t0)}ms ${e.pointerType} -> ${document.elementFromPoint(e.clientX, e.clientY)?.tagName}`), true);
```

خروجی را با `adb logcat -s chromium:V` (یا `chrome://inspect`) ببینید: اگر ضربه‌ها `TAP` تولید نکردند یا با فاصلهً چند صد میلی‌ثانیه‌ای بعد از یک `LONGTASK` رسیدند، تشخیص بند ۲-۱ قطعی است. اگر ضربهٔ دوم هیچ `click`ی تولید نکرد، بند ۲-۲ قطعی است.

اگر `scripts/repro-android-touch.mjs` آن برنچ را برگردانید (`repro/android-touch`، ران‌های ۱ تا ۱۰)، می‌توانید همین harness را روی دستگاه واقعی (`adb devices` به‌جای امولاتور) اجرا کنید — ابزارش کامل است و فقط یک `-s <serial>` لازم دارد.

---

## ۶) دو تذکر


- **توکن GitHub که در چت فرستادید را rotate کنید** (fine-grained با دسترسی repo؛ در متن پیام plaintext بود). من فقط برای `git clone` و خواندن لاگ‌های Actions از آن استفاده کردم.
- اعداد ۵ تا ۱۰ ثانیه متعلق به امولاتور با رندر نرم‌افزاری و بیلد debug است؛ روی گوشی واقعی ۱۰ تا ۵۰ برابر کمتر است، **ولی شکل مشکل (تسک بزرگ بی‌وقفه + افت تاچ + فشرده شدن انیمیشن) همان می‌ماند**. برای عدد دقیق روی دستگاه خودتان: `adb shell dumpsys gfxinfo ir.mazraerangi.game framestats` یا اضافه‌کردن `PerformanceObserver('longtask')` به `errorLog.ts`.

---

## ۵) پچ‌های اعمال‌شده (روی همان `main`، در working tree)

### ۵.۱) `src/game/scenes.ts` — برش‌برش کردن بوم مزرعه

`farmBG()` به یک فهرست مرتب از «اسلایس»های قابل از سر گرفتن تبدیل شد (`farmDrawSlices`) و `prewarmSceneChunked()` همان‌ها را با بودجهٔ زمانی ۱۲ms و با `setTimeout(0)` بین هر بلوک اجرا می‌کند. `paperGrain()` هم پارامتر `from` گرفت تا ۳۵۰۰ نقطهٔ آن در چند تکهٔ هم‌ارز تقسیم شود (جریان rng با همان تعداد مصرف مقدار preserve می‌شود).

** اثبات بی‌خطا بودن بصری:** هش SHA-256 کل خروجی هر ۴ بوم × ۴ فصل روی HEAD با بعد از پچ مقایسه شد — **۱۶ از ۱۶ یکسان**. نمونه (مزرعه، بهار/تابستان/پاییز/زمستان):

```
farmBG:0 693d4b153e83ed275eb2cf1fb3d278256e950792e813bbfe190826add2d68aa0
farmBG:1 595e861e108a7ec9e663b506cc54cefc578faf62e357688891bdf3723b2abf19
farmBG:2 a44e83d46876aea9a26f0bda145576fa4130491a2edb7241fa831377c62a78e0
farmBG:3 fe8093e8f878ff2a18c14fe42fae7790e67ffd200318cdc0b3e9d0bc699aeb37
```

کش صحنه فقط در پایان (پس از آخرین اسلایس) پر می‌شود، پس نیم‌بوم هرگز به فریم نمی‌رسد؛ مسیر همگ (`buildRawScene`) برای cache-miss دست‌نخورده ماند.

### ۵.۲) `src/game/preloader.ts` — پیشرفت واقعی + فاصله بین صحنه‌ها

گام ۲ حالا درصد را به‌ازای هر اسلایس اعلام می‌کند (۳۸٪→۵۲٪ به‌جای یک پرش) و `scheduleDeferredPrewarm` بین town/river/apiary فاصلهٔ ۹۰ms می‌گذارد تا دو بلاک پشت سر هم دقیقاً روی «اولین ضربهٔ بازیکن» نیفتد.

### ۵.۳) `src/ui/BootLoader.tsx` + `src/App.tsx` — محو شدن با `transitionend`

`setTimeout(180)` حذف شد: لودینگ تنها وقتی unmount می‌شود که ترنزیشن `opacity` واقعاً تمام شده باشد (`transitionend`/`transitioncancel`، با fallback ۷۹۰ms برای WebView‌ای که رویداد نمی‌دهد). در حالت webdriver (`autoFastBoot`) ترنزیشن `none` و unmount فوری است، مثل قبل.

### ۵.۴) `src/game/touchBridge.ts` — بازیابی کلیک، بدون بلعیدن ضربهٔ بعدی

- تایمر ۵۵ms حذف؛ کلیکِ بازیابی **همان‌جا در pointerup** و **با مختصات انگشت** ساخته می‌شود (قبلاً `rec.el.click()` بود → `clientX/clientY = 0,0`، روی امولاتور با ۱۱۵ms تأخیرِ تایمر).
- نگهبان ضدتکرار به‌جای ۱۵۰ms روی کل `window`، خودش را به‌محض **اولین `pointerdown` بعدی** یا رسیدن همان کلیک بومی جمع می‌کند (سقف ۵۰۰ms) → ضربهٔ بعدیِ کاربر دیگر دور ریخته نمی‌شود.
- `mousedown` بومیِ همان ضربه `preventDefault` می‌شود: چون ما ضربه را مصرف کرده‌ایم، اگر Blink تمرکز را روی گره‌ای بگذارد که React عوضش کرده، تلهٔ تمرکزِ دیالوگ تازه از بین می‌رود (این را تست `production morning report owns focus…` گرفتم).
- `select / input / textarea` کلاً دست‌نخورده می‌مانند (لیست بازشو و درگِ اینپوت روی `mousedown` می‌چرخد).

### ۵.۵) `e2e/android-boot.spec.ts` — تست رگرسیون (۴ تست × ۳ پروژه)

| تست | روی HEAD | بعد از پچ |
|---|---|---|
| boot هیچ گلوگاه >۷۵۰ms (در ۶× throttle) ندارد و درصد هرگز عقب نمی‌رود | pass | pass |
| محو شدن لودینگ در ≥۲ فریم تحویل می‌شود | **fail (۱ فریم)** | pass (۸ فریم) |
| کلیکِ بازیابی‌شده مختصات انگشت را دارد و دقیقاً یک بار می‌رسد | **fail (x=0,y=0)** | pass |
| دو ضربهٔ پیاپی روی یک کنترل، هر دو یک بار فعال می‌کنند | **fail (دومی بلعیده می‌شد)** | pass |

### ۵.۶) عددِ قبل/بعد، با یک ابزارِ اندازه‌گیری یکسان (۶× CPU throttle، ۸۴۴×۳۹۰، `?boot=1`)

| معیار | HEAD | بعد از پچ |
|---|---|---|
| فریم‌های میانی ترنزیشن محو شدن | **۱** (`۰٫۷۱`) | **۸** (`۰٫۸۵→۰٫۵۸→۰٫۴۷→۰٫۳۶→۰٫۲۶→۰٫۱۷→۰٫۱۰→۰٫۰۴`) |
| کل بازهٔ محو شدن | ۲۴۳ms | ۳۶۰ms |
| بلوک ساخت بوم مزرعه | ۱۵۰ + ۲۴۶ms بی‌وقفه، پیشرفت روی ۵۲٪ ساکن | ۱۳۰ + ۹۹ms، ۴۴٪ بین دو بلوک دیده می‌شود |
| تأخیر بازیابی لمس | ۵۵msِ تایمر (روی گوشی تا ۱۶۳ms کش می‌آمد) | صفر |
| ضربهٔ دوم کاربر | ممکن بود در ۱۵۰ms/۳۲px بلعیده شود | فقط ضربهٔ همان انگشت بلعیده می‌شود |

**باقی‌ماندهٔ شناخته‌شده (عمداً دست‌نخورده):** بزرگ‌ترین long task حالا ۵۱۶ms در ۶× (≈۸۶ms واقعی) است و مربوط به **گام ۱** (`hydrateNativeStorage` + `document.fonts.ready`) است، نه بوم مزرعه؛ این روی HEAD هم ۴۹۷ms بود. کاندیدای بعدی اگر روی گوشی محسوس بود: font-display / بارگذاری غیرهمزمان قلم‌ها. همچنین `MainActivity.java` و `styles.xml` (windowFullscreen) در این پچ تغییر نکرد چون در این sandbox قابل تست نیست.

**چه چیزی اینجا قابل بازتولید نبود:** race اصلیِ `touchBridge` (کلیک بومی ۱۲–۱۶۳ms دیررس) در Chromium دسکتاپ هرگز رخ نمی‌دهد (۲–۳ms)؛ برای همین تست‌ها با `stopPropagation` روی کلیک trusted، همان مسیر بازیابی را **مجبورانه** فعال می‌کنند. تأیید نهایی روی گوشی/امولاتور با `adb shell input tap` حین لودینگ انجام شود.
