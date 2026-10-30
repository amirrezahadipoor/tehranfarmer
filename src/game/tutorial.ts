// ===== راهنمای غیرمسدودکنندهٔ روز اول: چهار عمل واقعی، فروش، دفتر و استراحت =====
// مسیر مرورگر و Playwright یکسان است؛ راهنما فقط پیشنهاد می‌دهد و آزادی بازی را نمی‌گیرد.
import { S, UI, notify, saveGame, type Plot, type Tool } from './state';
import { sfx } from './sound';

export const TUT_PLOT = 0;
export const TUT_STEP_COUNT = 7;
const STEP_TOOLS = ['till', 'plant', 'water', 'harvest'] as const;
const storyQuiet = () => !S.story.pending;
const running = () => Boolean(S.tut && S.tut.active && !S.tut.done && storyQuiet() && UI.started && S.day === 1 && !S.story.postgame);

/** Overlay and target markers stay out of dialogs and unrelated farm scenes. */
export function tutActive(): boolean {
  const t = S.tut;
  if (!t || !running() || UI.modal) return false;
  return t.step >= 4 || UI.scene === 'farm';
}
export const tutStep = (): number => S.tut?.step ?? TUT_STEP_COUNT;
export function tutExpectedTool(): Tool { return STEP_TOOLS[Math.min(3, tutStep())]; }

/** Free exploration is deliberate: the coach never rejects another plot or tool. */
export function tutTapOk(_i: number): boolean { return true; }
export const tutToolBlocked = (_k: string): boolean => false;
export const tutToolHi = (k: string): boolean => tutActive() && tutStep() < 4 && k === tutExpectedTool();

function stepDone(step: number, p: Plot): boolean {
  if (step === 0) return p.st !== 0;
  if (step === 1) return p.st === 2;
  if (step === 2) return p.st === 2 && p.water > 0;
  return false;
}

function ripenPracticeCrop(): void {
  const p = S.plots[TUT_PLOT];
  if (p?.st === 2 && p.crop && !p.ripe && !p.dead) {
    p.prog = 1;
    p.ripe = true;
    p.dry = 0;
    p.water = 1;
  }
}

/** Equip only on entry to a step; afterwards the player may freely inspect other tools. */
function prepareStep(step: number): void {
  UI.info = null;
  UI.seedTray = false;
  if (step >= 4) return;
  if (step === 1) UI.seed = 'wheat';
  UI.tool = STEP_TOOLS[Math.min(3, step)];
  if (step === 3) ripenPracticeCrop();
}

export function tutMaybeStart(): void {
  const t = S.tut;
  if (!t || t.done || t.active) return;
  if (S.day !== 1 || S.story.postgame || !UI.started || UI.modal || UI.scene !== 'farm' || !storyQuiet()) return;
  t.active = true;
  t.step = 0;
  prepareStep(0);
  saveGame();
  notify();
}

export function syncTut(): void {
  if (!tutActive()) return;
  const t = S.tut!;
  const p = S.plots[TUT_PLOT];
  const before = t.step;
  while (t.step < 3 && stepDone(t.step, p)) t.step++;
  if (t.step !== before) {
    prepareStep(t.step);
    saveGame();
    notify();
  }
  if (t.step >= 4) { UI.seedTray = false; return; }
  if (t.step === 3) ripenPracticeCrop();
}

function persistStep(step: number): void {
  const t = S.tut;
  if (!t) return;
  t.step = step;
  prepareStep(step);
  saveGame();
  notify();
}

/** فقط اتمام واقعی ضربه، آموزش را جلو می‌برد؛ انتخاب ابزار یا قرارگرفتن در صف کافی نیست. */
export function tutOnPlotCompleted(kind: string, i: number): void {
  if (!tutActive() || i !== TUT_PLOT || kind !== tutExpectedTool()) return;
  const t = S.tut!;
  if (t.step < 3) { syncTut(); return; }
  if (t.step === 3 && kind === 'harvest') {
    persistStep(4);
    sfx.coin();
  }
}

export function tutOnSale(): void {
  if (!running() || tutStep() !== 4) return;
  persistStep(5);
  sfx.tap();
}

export function tutOnLedger(): void {
  if (!running() || tutStep() !== 5) return;
  persistStep(6);
  sfx.tap();
}

/** Sleeping finishes the seventh step, or cleanly ends an unfinished first-day guide. */
export function tutOnSleep(): void {
  if (!running()) return;
  const t = S.tut!;
  if (t.step === 6) sfx.coin();
  t.step = TUT_STEP_COUNT;
  t.done = true;
  t.active = false;
  saveGame();
  notify();
}

export function tutSkip(): void {
  const t = S.tut;
  if (!t || t.done) return;
  t.done = true;
  t.active = false;
  UI.tool = 'hand';
  UI.seedTray = false;
  UI.info = null;
  sfx.tap();
  saveGame();
  notify();
}
