// ===== آموزش تعاملی روز اول (U-4) — بدون هیچ متنی: بازیکن با «انجامِ اجباری» یاد می‌گیرد =====
// قواعد طراحی: فقط بعد از پایان صحنهٔ داستان (interference صفر)، هیچ نوشته‌ای نشان نمی‌دهد،
// فقط کرت هدف با ابزار درست کار می‌کند (بقیه ضربه‌ها صدای خطا می‌دهند) و دکمهٔ بستن همیشه ردِ آموزش است.
import { S, UI, notify, saveGame, type Plot, type Tool } from './state';
import { sfx } from './sound';

/** کرت آموزشی: اولین کرتِ همیشه-بازِ مزرعهٔ اصلی */
export const TUT_PLOT = 0;
const STEP_TOOLS = ['till', 'plant', 'water', 'hand'] as const;

/** در محیط خودکار (پلی‌رایت/CI/تست بصری) آموزش هرگز شروع نمی‌شود تا جریان‌های خودکار بی‌تغییر بمانند */
const autoEnv = () => typeof navigator !== 'undefined' && Boolean(navigator.webdriver);
const storyQuiet = () => !S.story.pending;

export function tutActive(): boolean {
  const t = S.tut;
  return Boolean(t && t.active && !t.done && !autoEnv() && storyQuiet() && !UI.modal && UI.scene === 'farm' && UI.started);
}
export const tutStep = (): number => S.tut?.step ?? 4;
export function tutExpectedTool(): Tool { return STEP_TOOLS[Math.min(3, tutStep())]; }

/** ضربه روی زمین فقط برای کرت هدف با ابزارِ همان گام مجاز است */
export function tutTapOk(i: number): boolean {
  if (!tutActive()) return true;
  return i === TUT_PLOT && UI.tool === tutExpectedTool();
}

/** در حین آموزش انتخاب ابزارِ دیگر ممکن نیست (فیدبک صوتی، بدون متن) */
export const tutToolBlocked = (k: string): boolean => tutActive() && k !== tutExpectedTool();
export const tutToolHi = (k: string): boolean => tutActive() && k === tutExpectedTool();

function stepDone(step: number, p: Plot): boolean {
  if (step === 0) return p.st !== 0;
  if (step === 1) return p.st === 2;
  if (step === 2) return p.st === 2 && p.water > 0;
  return false;
}

/** شروع خودکار فقط برای تازه‌وارد روز اول؛ سیوهای کهنه (tut ندارند) هرگز آموزش نمی‌بینند */
export function tutMaybeStart(): void {
  const t = S.tut;
  if (!t || t.done || t.active || autoEnv()) return;
  if (S.day !== 1 || !UI.started || UI.modal || UI.scene !== 'farm' || !storyQuiet()) return;
  t.active = true;
  t.step = 0;
  syncTut();
  saveGame();
  notify();
}

/** همگام‌سازی گام: ابزار درست + سینی بذر + آماده‌سازی برداشتِ فوریِ کرت آموزشی */
export function syncTut(): void {
  if (!tutActive()) return;
  const t = S.tut!;
  const p = S.plots[TUT_PLOT];
  while (t.step < 3 && stepDone(t.step, p)) t.step++; // اگر بازیکن بخشی را از قبل کرده باشد، گام‌ها جلو می‌روند
  if (t.step === 1) UI.seed = 'wheat';
  // یادگیری کامل حلقه در یک دقیقه: کرت آموزشیِ آبیاری‌شده بلافاصله می‌رسد تا «برداشت» همان روز تمرین شود
  if (t.step === 3 && p.st === 2 && p.crop && !p.ripe && !p.dead) { p.prog = 1; p.ripe = true; p.dry = 0; p.water = 1; }
  const tray = t.step === 1;
  const tool = tutExpectedTool();
  if (UI.seedTray !== tray) UI.seedTray = tray;
  if (UI.tool !== tool) { UI.tool = tool; UI.info = null; notify(); }
}

/** فراخوانی پس از ثبتِ موفقِ یک عمل آموزشی؛ گام بعد یا پایان آموزش */
export function tutOnPlotAction(i: number): void {
  if (!tutActive() || i !== TUT_PLOT || UI.tool !== tutExpectedTool()) return;
  const t = S.tut!;
  if (t.step >= 3) {
    t.done = true;
    t.active = false;
    sfx.coin();
    saveGame();
    notify();
    return;
  }
  t.step++;
  syncTut();
  saveGame();
  notify();
}

/** رد کردن آموزش با دکمهٔ بستن — هر زمان که بازیکن بخواهد */
export function tutSkip(): void {
  const t = S.tut;
  if (!t || t.done) return;
  t.done = true;
  t.active = false;
  sfx.tap();
  saveGame();
  notify();
}
