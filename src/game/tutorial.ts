// ===== آموزش تعاملی روز اول: کرت، فروش، دفترکل و استراحت =====
// همان مسیر در مرورگر کاربر و Playwright اجرا می‌شود؛ هیچ شاخهٔ navigator.webdriver وجود ندارد.
import { S, UI, notify, saveGame, type Plot, type Tool } from './state';
import { sfx } from './sound';

export const TUT_PLOT = 0;
export const TUT_STEP_COUNT = 7;
const STEP_TOOLS = ['till', 'plant', 'water', 'hand'] as const;
const storyQuiet = () => !S.story.pending;
const running = () => Boolean(S.tut && S.tut.active && !S.tut.done && storyQuiet() && UI.started && S.day === 1 && !S.story.postgame);

/** Overlay remains available for the sale/ledger/rest legs; farm gating is only steps 0–3. */
export function tutActive(): boolean {
  const t = S.tut;
  if (!t || !running() || S.day !== 1 || S.story.postgame || UI.modal) return false;
  return t.step >= 4 || UI.scene === 'farm';
}
export const tutStep = (): number => S.tut?.step ?? TUT_STEP_COUNT;
export function tutExpectedTool(): Tool { return STEP_TOOLS[Math.min(3, tutStep())]; }

export function tutTapOk(i: number): boolean {
  if (!tutActive() || tutStep() >= 4) return true;
  return i === TUT_PLOT && UI.tool === tutExpectedTool();
}
export const tutToolBlocked = (k: string): boolean => tutActive() && tutStep() < 4 && k !== tutExpectedTool();
export const tutToolHi = (k: string): boolean => tutActive() && tutStep() < 4 && k === tutExpectedTool();

function stepDone(step: number, p: Plot): boolean {
  if (step === 0) return p.st !== 0;
  if (step === 1) return p.st === 2;
  if (step === 2) return p.st === 2 && p.water > 0;
  return false;
}

export function tutMaybeStart(): void {
  const t = S.tut;
  if (!t || t.done || t.active) return;
  if (S.day !== 1 || S.story.postgame || !UI.started || UI.modal || UI.scene !== 'farm' || !storyQuiet()) return;
  t.active = true;
  t.step = 0;
  syncTut();
  saveGame();
  notify();
}

export function syncTut(): void {
  if (!tutActive()) return;
  const t = S.tut!;
  const p = S.plots[TUT_PLOT];
  while (t.step < 3 && stepDone(t.step, p)) t.step++;
  if (t.step >= 4) {
    if (UI.seedTray) UI.seedTray = false;
    return;
  }
  if (t.step === 1) UI.seed = 'wheat';
  if (t.step === 3 && p.st === 2 && p.crop && !p.ripe && !p.dead) { p.prog = 1; p.ripe = true; p.dry = 0; p.water = 1; }
  const tray = t.step === 1;
  const tool = tutExpectedTool();
  if (UI.seedTray !== tray) UI.seedTray = tray;
  if (UI.tool !== tool) { UI.tool = tool; UI.info = null; notify(); }
}

function persistStep(step: number): void {
  const t = S.tut;
  if (!t) return;
  t.step = step;
  saveGame();
  notify();
}

export function tutOnPlotAction(i: number): void {
  if (!tutActive() || tutStep() >= 4 || i !== TUT_PLOT || UI.tool !== tutExpectedTool()) return;
  const t = S.tut!;
  if (t.step >= 3) {
    persistStep(4);
    sfx.coin();
    return;
  }
  t.step++;
  syncTut();
  saveGame();
  notify();
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

/** Sleeping finishes the seventh step, or cleanly ends an unfinished first-day tutorial. */
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
