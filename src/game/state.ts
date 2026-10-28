import { useSyncExternalStore } from 'react';
import { CFG } from './settings';
import { nativeRemoveItem, nativeSetItem } from './nativeStorage';
import { setLastError } from './errorLog';
import {
  COLS, CROP, CROPS, GOODS, HOE_COST, MACHINES, MK_FERTADD,
  MK_FERTSOIL, MK_HARVEST, MK_SEEDSAVE, ROWS, SOIL_BONUS, ghCovers, WORKER_MAX,
  XP, isUnlocked,
  type AnimalKind, type BuildJob, type CropId, type MachineId, type PondS,
} from './data';
import { sfx } from './sound';
import { rnd } from './rng';
import { addGood, goodPrice, invCap, invCount } from './core/economy';
import { addStat, addXp, farmLevel } from './core/progress';
import { bindSeason } from './core/economy';
import { resetLvCache } from './core/progress';
import { SAVE_VERSION, migrateSave } from './core/saveMigrations';
import type { DebtState } from './core/debt';
import type { StoryState } from '../story/types';
import type { QuestsState } from '../story/dailyQuests';
import { hydrateEvent, type ActiveEvent } from './core/events';
import type { MailState } from '../strings/mailText';
import { setMailSilentMode } from './core/mailbox';
import { applyCropRotation } from './core/farmDeep';
import {
  ESTATES, NORTH_PLOTS_COUNT, VALLEY_PLOTS_COUNT, estateSpecialtyMult, isEstateOwned, isFarmScene,
  type FarmSceneId,
} from './estates';
import type { SceneKey } from './scenes';
import { ensureFrontier, type FrontierState } from './core/frontier';

import { GT } from '../strings/gameText';

export interface MarketContract { good: string; qty: number; reward: number; deposit: number; dueDay: number }
export interface Plot { st: 0 | 1 | 2; crop: CropId | null; prog: number; water: number; fert: number; last: CropId | null; dead: boolean; dry: number; ripe: boolean; n: number; hand?: boolean }
export interface AnimalS { id: number; kind: AnimalKind; ready: number; hue: number; sex: 'm' | 'f'; grown: number; preg?: number; sick?: boolean }
export interface Nest { id: number; kind: AnimalKind; hatch: number } // لانهٔ تخم بارور (پرنده‌ها)
export interface Save {
  v: number; coins: number; day: number; hour: number; stamina: number;
  plots: Plot[];
  northPlots: Plot[];
  valleyPlots: Plot[];
  inv: Record<string, number>; seeds: Record<string, number>; fert: number; can: number; rod: number;
  lv: { hoe: number; can: number; bag: number; stam: number; land: number; soil: number };
  animals: AnimalS[]; trough: number; workers: number; dem: Record<string, number>; sdem: Record<string, number>;
  weather: number; nextId: number; earned: number;
  cityVisits: number;
  machines: Partial<Record<MachineId, number>>;
  auto: Partial<Record<string, boolean>>;
  ponds: PondS[];
  hives: number;
  honeyAcc: number;
  builds: BuildJob[];
  pens: Partial<Record<AnimalKind, number>>; // سطح حصار هر گونه (۰ یعنی نساخته)
  gh: number;      // سطح گلخانه ۰..۲
  silo: number;    // سطح سیلو ۰..۲
  nests: Nest[];   // لانه‌های تخم بارور
  xp: number;
  stats: Record<string, number>;
  ach: Record<string, number>;
  /** داستان: فصل، گره‌های دیده‌شده، پرولوگ */
  story: StoryState;
  /** بدهی و شرخر — تا پایان پرولوگ null است */
  debt: DebtState | null;
  /** کوئست‌های روزانه/هفتگی */
  quests: QuestsState;
  /** رویداد فصلی امروز */
  event: ActiveEvent | null;
  /** سطح چاه و آبیاری قطره‌ای ۰..۳ */
  wellLv: number;
  /** قرارداد فعال فروش در بازار */
  contract: MarketContract | null;
  /** آیا تندیس/موزهٔ پایان‌بازی دیده شده */
  museumVisited: boolean;
  /** رازهای پنهان کشف‌شده */
  secrets?: Record<string, boolean>;
  /** تخصیص بذر هدف مستقل هر مزرعه، نقش کارگران، مهارت‌ها، شخصی‌سازی و دوستی اهالی */
  farmSeeds?: Partial<Record<FarmSceneId, CropId | 'auto'>>;
  crewRole?: 'balanced' | 'crops' | 'ranch';
  skills?: Record<string, boolean>;
  custom?: { farmerName: string; farmName: string; outfit: number; morningCard: boolean };
  decor?: Record<string, boolean>;
  fishLog?: Record<string, number>;
  springDay?: number;
  affinity?: Record<string, number>;
  giftedDay?: Record<string, number>;
  friendTreatDay?: Record<string, number>;
  morning?: { day: number; earned: number; gathered: number; ripe: number; shown: boolean } | null;
  snapEarned?: number;
  snapGathered?: number;
  mail?: MailState;
  cauldron?: { day: number; counts: Record<string, number> };
  frontier?: FrontierState;
  /** زمان آخرین ذخیرهٔ موفق (ms) — برای انتخاب سیوِ جدیدتر هنگام همگام‌سازی بومی */
  savedAt?: number;
}
export type Tool = 'hand' | 'till' | 'plant' | 'water' | 'harvest' | 'fert';
export type Modal = null | 'seed' | 'market' | 'work' | 'animal' | 'inv' | 'menu' | 'auto' | 'pond' | 'hive' | 'achieve' | 'carp' | 'estate' | 'ledger' | 'quests' | 'museum' | 'home' | 'almanac' | 'mail' | 'fishing' | 'festival' | 'atlas';
export interface Toast { id: number; icon: string; text: string; locale?: 'fa' | 'en' }

export const UI = {
  started: false,
  scene: 'farm' as SceneKey,
  tool: 'hand' as Tool,
  seed: 'wheat' as CropId,
  modal: null as Modal,
  afterModal: null as Modal,
  fairTab: 'judge' as 'judge' | 'cauldron' | 'archery' | 'prizes',
  afterTalkNpc: null as null | number | 'sharkhar',
  directorReplay: false,
  info: null as null | { plot: number; x: number; y: number },
  toasts: [] as Toast[],
  combo: { count: 0, until: 0, kind: 'harvest' },
  needRodHint: 0,
  paused: false,
  speed: 1,
  sound: CFG.sound,
  seedTray: false,
  confirm: null as null | 'reset' | 'exit' | 'newgame',
  portrait: false,
  profile: 'small' as 'small' | 'tall' | 'tablet' | 'desktop' | 'portrait',
};
// سرعت بازی همواره و قطعی ۱× است و قابلیت تند کردن بازی (۲× / ۳× / ۵×) به طور کامل غیرفعال است
Object.defineProperty(UI, 'speed', {
  get: () => 1,
  set: () => { /* قفل دائمی سرعت روی ۱× */ },
  enumerable: true,
  configurable: true,
});

const KEY = 'mazrae-rangi-save-v1';
let ver = 0;
const subs = new Set<() => void>();
export function notify() { ver++; subs.forEach((f) => f()); }
export function useGame() {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => ver, () => ver);
}

function newPlot(): Plot { return { st: 0, crop: null, prog: 0, water: 0, fert: 0.7, last: null, dead: false, dry: 0, ripe: false, n: 0 }; }
function fresh(): Save {
  const dem: Record<string, number> = {};
  GOODS.forEach((g) => (dem[g.id] = 1));
  const sdem: Record<string, number> = {};
  CROPS.forEach((c) => (sdem[c.id] = 1));
  return {
    v: SAVE_VERSION, coins: 700, day: 1, hour: 7, stamina: 100,
    plots: Array.from({ length: COLS * ROWS }, newPlot),
    northPlots: Array.from({ length: NORTH_PLOTS_COUNT }, newPlot),
    valleyPlots: Array.from({ length: VALLEY_PLOTS_COUNT }, newPlot),
    inv: {}, seeds: { wheat: 8, carrot: 4 }, fert: 0, can: 8, rod: 0,
    lv: { hoe: 0, can: 0, bag: 0, stam: 0, land: 0, soil: 0 },
    animals: [
      { id: 1, kind: 'chicken', ready: 0, hue: 0, sex: 'f', grown: 0 },
      { id: 2, kind: 'chicken', ready: 0, hue: 1, sex: 'm', grown: 0 },
    ],
    trough: 0, workers: 0, dem, sdem, weather: 0, nextId: 3, earned: 0,
    cityVisits: 0, machines: {}, auto: {}, ponds: [], hives: 0, honeyAcc: 0, builds: [],
    pens: { chicken: 1 }, gh: 0, silo: 0, nests: [],
    xp: 0, stats: {}, ach: {},
    story: { chapter: 0, seen: {}, prologueSeen: false, postgame: false, pending: null, questDone: {} },
    debt: null,
    quests: { day: 0, week: 0, daily: [], weekly: null, claimed: {}, base: {} },
    event: null,
    wellLv: 0,
    contract: null,
    museumVisited: false,
    secrets: {},
  };
}
export let S: Save = fresh();

const BAK1 = KEY + '-bak1';
const BAK2 = KEY + '-bak2';
const BAK_LEGACY = KEY + '-bak';

let simBatchMode = false;
let trustedSaveA = '';
let trustedSaveB = '';
export function setSimBatchMode(on: boolean) {
  simBatchMode = on;
  setMailSilentMode(on);
}

function isValidSaveText(raw: string | null): raw is string {
  if (!raw) return false;
  if (raw === trustedSaveA || raw === trustedSaveB) return true;
  try {
    const p = JSON.parse(raw) as Record<string, unknown> | null;
    return !!p && typeof p === 'object' && !Array.isArray(p) && typeof p.day === 'number';
  } catch (e) { setLastError(`has-save-failed:${String((e as Error)?.message ?? e)}`, 'storage'); return false; }
}

/** فاصلهٔ حداقلی بین دو چرخش پشتیبان (ms): پشتیبان‌ها «سیوهای چندده دقیقه‌ای» هستند نه دو ذخیرهٔ آخر */
export const BACKUP_INTERVAL_MS = 10 * 60 * 1000;
let lastRotateAt = 0;
/** قفل ذخیره: وقتی سِیوِ موجود خوانده نشده، تا تصمیم بازیکن (ادامه/جدید) هیچ ذخیره‌ای سیوهای قبلی را بازنویسی نمی‌کند */
let saveLocked = false;
export function isSaveLocked() { return saveLocked; }
export function setSaveLocked(on: boolean) { saveLocked = on; }

let saveFailToastAt = 0;
function reportSaveFailure(where: string, err: unknown) {
  setLastError(`save-failed:${where}:${String((err as Error)?.message ?? err)}`, 'runtime');
  const now = Date.now();
  if (now - saveFailToastAt > 15000) {
    saveFailToastAt = now;
    toast('bag', GT.gSaveFail);
  }
}

/** ذخیرهٔ امن: خطاها ثبت و به بازیکن گزارش می‌شوند؛ پشتیبان‌ها هر BACKUP_INTERVAL_MS چرخش می‌کنند */
export function saveGame(): boolean {
  if (simBatchMode || saveLocked) return false;
  try {
    const now = Date.now();
    const cur = localStorage.getItem(KEY);
    if (now - lastRotateAt >= BACKUP_INTERVAL_MS && isValidSaveText(cur)) {
      const b1 = localStorage.getItem(BAK1);
      if (isValidSaveText(b1)) nativeSetItem(BAK2, b1);
      nativeSetItem(BAK1, cur);
      trustedSaveB = cur;
      lastRotateAt = now;
    }
    S.savedAt = now;
    const serialized = JSON.stringify(S);
    trustedSaveA = serialized;
    // نوشتن اصلی باید واقعاً موفق باشد؛ خطای حافظه (QuotaExceeded) نباید بی‌صدا رد شود
    localStorage.setItem(KEY, serialized);
    nativeSetItem(KEY, serialized);
    if (!localStorage.getItem(BAK1)) nativeSetItem(BAK1, serialized);
    return true;
  } catch (err) {
    reportSaveFailure('main', err);
    return false;
  }
}

export function hasSave() {
  try {
    return [KEY, BAK1, BAK2, BAK_LEGACY].some((k) => !!localStorage.getItem(k));
  } catch (e) { setLastError(`has-save-failed:${String((e as Error)?.message ?? e)}`, 'storage'); return false; }
}
function applyParsedSave(rawObj: unknown): boolean {
  const d = migrateSave(rawObj);
  if (!d) return false;
  S = { ...fresh(), ...(d as Partial<Save>) } as Save;
  S.v = SAVE_VERSION;
  // سازگاری‌های فیلدی که به نسخه گره نخورده‌اند (سِیو ناقص هم باید لود شود)
  S.machines = S.machines ?? {}; S.auto = S.auto ?? {};
  S.ponds = S.ponds ?? []; S.hives = S.hives ?? 0; S.honeyAcc = S.honeyAcc ?? 0;
  S.builds = S.builds ?? []; S.cityVisits = S.cityVisits ?? 0; S.rod = S.rod ?? 0;
  S.pens = S.pens ?? {}; S.gh = S.gh ?? 0; S.silo = S.silo ?? 0; S.nests = S.nests ?? [];
  for (const a of S.animals) if (!S.pens[a.kind]) S.pens[a.kind] = 1;
  S.xp = S.xp ?? 0; S.stats = S.stats ?? {}; S.ach = S.ach ?? {};
  S.lv = S.lv ?? fresh().lv; S.lv.soil = S.lv.soil ?? 0;
  for (const k2 of Object.keys(S.machines) as MachineId[]) {
    if (typeof S.machines[k2] !== 'number') S.machines[k2] = S.machines[k2] ? 1 : 0;
  }
  S.workers = Math.min(WORKER_MAX, Math.max(0, S.workers ?? 0));
  S.quests = S.quests ?? fresh().quests;
  S.event = hydrateEvent(S.event);
  S.wellLv = S.wellLv ?? 0;
  S.contract = S.contract ?? null;
  S.museumVisited = S.museumVisited ?? false;
  S.secrets = S.secrets ?? {};
  S.farmSeeds = S.farmSeeds ?? {};
  S.crewRole = S.crewRole ?? 'balanced';
  S.skills = S.skills ?? {};
  S.decor = S.decor ?? {};
  S.fishLog = S.fishLog ?? {};
  S.affinity = S.affinity ?? {};
  S.giftedDay = S.giftedDay ?? {};
  S.morning = S.morning ?? null;
  syncPlayerOutfitPalette();
  // جنسیت پیش‌فرض قطعی از شناسه (نه RNG): بارگذاری، جریان تصادفی بازی را دست‌کاری نمی‌کند
  S.animals = (S.animals ?? []).map((a) => ({ ...a, sex: a.sex ?? (a.id % 2 === 0 ? 'm' : 'f'), grown: a.grown ?? 0 }));
  // طول آرایهٔ کرت‌ها در migrateSave اعتبارسنجی شده؛ اینجا فقط مقدار گمشده را پر می‌کنیم
  S.plots = (S.plots && S.plots.length === COLS * ROWS ? S.plots : fresh().plots);
  S.northPlots = (S.northPlots && S.northPlots.length === NORTH_PLOTS_COUNT ? S.northPlots : Array.from({ length: NORTH_PLOTS_COUNT }, newPlot));
  S.valleyPlots = (S.valleyPlots && S.valleyPlots.length === VALLEY_PLOTS_COUNT ? S.valleyPlots : Array.from({ length: VALLEY_PLOTS_COUNT }, newPlot));
  resetLvCache();
  ensureFrontier();
  syncMailboxState(false);
  return true;
}

/** بارگذاری: اگر هیچ‌کدام از سیوها خوانده نشود، false برمی‌گرداند و ذخیره قفل می‌شود (سیو قبلی بازنویسی نمی‌شود) */
export function loadGame(): boolean {
  const attempt = (k: string): boolean => {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) return false;
      return applyParsedSave(JSON.parse(raw));
    } catch { return false; }
  };
  const ok = attempt(KEY) || attempt(BAK1) || attempt(BAK2) || attempt(BAK_LEGACY);
  if (ok) { saveLocked = false; lastRotateAt = 0; resetAutoClock(); }
  else if (hasSave()) saveLocked = true;
  return ok;
}

/** فهرست اسلات‌های پشتیبان ۲گانه برای نمایش و بازیابی دستی (P9-03) */
export function listBackupSlots(): Array<{ slot: 1 | 2; day: number; coins: number }> {
  const out: Array<{ slot: 1 | 2; day: number; coins: number }> = [];
  for (const [slot, k] of [[1, BAK1], [2, BAK2]] as const) {
    try {
      const raw = localStorage.getItem(k);
      if (!isValidSaveText(raw)) continue;
      const p = JSON.parse(raw) as { day?: number; coins?: number };
      out.push({ slot, day: p.day ?? 1, coins: p.coins ?? 0 });
    } catch { /* */ }
  }
  return out;
}

/** بازیابی دستی یکی از ۲ اسلات پشتیبان خودکار (P9-03) */
export function restoreBackupSlot(slot: 1 | 2): boolean {
  try {
    const raw = localStorage.getItem(slot === 1 ? BAK1 : BAK2);
    if (!raw || !applyParsedSave(JSON.parse(raw))) return false;
    saveLocked = false;
    nativeSetItem(KEY, JSON.stringify(S));
    notify();
    return true;
  } catch (e) { setLastError(`has-save-failed:${String((e as Error)?.message ?? e)}`, 'storage'); return false; }
}

/** برون‌بری سِیو به رشتهٔ JSON استاندارد (P9-02) */
export function exportSaveJson(): string {
  return JSON.stringify({ app: 'mazrae-rangi', format: 1, save: S }, null, 2);
}

/** درون‌بری سِیو از رشتهٔ JSON با مهاجرت خودکار و اعتبارسنجی (P9-02) */
export function importSaveJson(text: string): boolean {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
    const candidate = (parsed.app === 'mazrae-rangi' && parsed.save && typeof parsed.save === 'object')
      ? parsed.save
      : parsed;
    if (typeof (candidate as Record<string, unknown>).day !== 'number' && typeof (candidate as Record<string, unknown>).coins !== 'number') {
      return false;
    }
    if (!applyParsedSave(candidate)) return false;
    saveLocked = false;
    saveGame();
    notify();
    return true;
  } catch {
    return false;
  }
}
import { syncPlayerOutfitPalette } from './core/rpgSystems';
import { resetWorkerSim } from './core/workers';
import { syncMailboxState } from './core/mailbox';
import { resetAutoClock } from './core/dayLoop';

export function resetGame() {
  S = fresh();
  saveLocked = false;
  lastRotateAt = 0;
  resetAutoClock();
  UI.afterModal = null;
  UI.afterTalkNpc = null;
  UI.directorReplay = false;
  UI.fairTab = 'judge';
  UI.info = null;
  UI.seedTray = false;
  UI.combo = { count: 0, until: 0, kind: 'harvest' };
  UI.needRodHint = 0;
  syncPlayerOutfitPalette();
  resetLvCache();
  resetWorkerSim();
  ensureFrontier();
  syncMailboxState(false);
  try {
    for (const k of [KEY, BAK1, BAK2, BAK_LEGACY]) nativeRemoveItem(k);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const lk = localStorage.key(i);
      if (lk && lk.startsWith('mazrae-rangi-save')) nativeRemoveItem(lk);
    }
  } catch { /* */ }
  notify();
}

export const season = () => Math.floor((S.day - 1) / 7) % 4;
bindSeason(season);
export const year = () => Math.floor((S.day - 1) / 28) + 1;

let tid = 1;
let toastClearTimer: ReturnType<typeof setTimeout> | null = null;
export function toast(icon: string, text: string) {
  const t: Toast = { id: tid++, icon, text, locale: CFG.locale };
  // چند رویداد هم‌زمان نباید یک پیام یکسان را روی صفحه تکرار کنند.
  const unique = UI.toasts.filter((q) => q.icon !== icon || q.text !== text || q.locale !== CFG.locale);
  UI.toasts = [...unique.slice(-1), t];
  notify();
  if (toastClearTimer) clearTimeout(toastClearTimer);
  toastClearTimer = setTimeout(() => {
    toastClearTimer = null;
    if (UI.toasts.length) {
      UI.toasts = [];
      notify();
    }
  }, 2400);
  if (typeof toastClearTimer === 'object' && toastClearTimer !== null && 'unref' in toastClearTimer) {
    toastClearTimer.unref();
  }
}

// ===== سطح، تجربه و ابزارها =====
// ===== مؤلفه‌های دستگاه‌ها =====
export const mkOf = (id: MachineId) => S.machines[id] ?? 0;
export const fertAddAmt = () => MK_FERTADD[mkOf('drone')] || 0.5;
export const soilBonus = () => 1 + S.lv.soil * SOIL_BONUS;
export function machineForAuto(k: string): MachineId | null {
  for (const id of Object.keys(MACHINES) as MachineId[]) if (MACHINES[id].auto === k && mkOf(id) > 0) return id;
  return null;
}

// ===== ماهی و زنبور =====
// ===== اتوماسیون =====
export function toggleAuto(k: string) {
  if (!machineForAuto(k)) { sfx.err(); return; }
  S.auto[k] = !S.auto[k];
  sfx.tap(); saveGame(); notify();
}
export function pickSeed(ignoreSeason = false, farm: FarmSceneId = 'farm'): CropId | null {
  const locked = S.farmSeeds?.[farm];
  if (locked && locked !== 'auto') {
    const have = S.seeds[locked] ?? 0;
    const def = CROP[locked];
    if (have > 0 && def && def.lv <= farmLevel() && (ignoreSeason || def.seasons.includes(season()))) return locked;
  }
  let best: CropId | null = null;
  let bestScore = -1;
  for (const c of CROPS) {
    const n = S.seeds[c.id] ?? 0;
    if (n <= 0 || c.lv > farmLevel() || (!ignoreSeason && !c.seasons.includes(season()))) continue;
    const harvests = c.maxH ?? 1;
    const totalDays = c.days + (c.regrow ?? 0) * Math.max(0, harvests - 1);
    const avgYield = (c.yield[0] + c.yield[1]) * 0.5;
    const specMult = farm === 'farm' ? 1 : estateSpecialtyMult(farm, c.id);
    const score = ((goodPrice(c.id) * avgYield * harvests * specMult) - c.seed) / Math.max(1, totalDays);
    if (score > bestScore) { bestScore = score; best = c.id; }
  }
  return best;
}

// ===== عملیات روی زمین (در هر ۳ مزرعه: اصلی ۴۰ کرت، دشت شمالی ۵۴ کرت، باغ‌دره ۶۰ کرت) =====
const COST: Record<string, number> = { plant: 2, water: 1.5, harvest: 2.5, fert: 1.5, collect: 0.5, feed: 1, well: 1 };
export const costOf = (k: string) => (k === 'till' ? 4 * HOE_COST[S.lv.hoe] : COST[k] ?? 1);

export function activeFarm(): FarmSceneId {
  return isFarmScene(UI.scene) ? UI.scene : 'farm';
}

export function plotsForFarm(farm: FarmSceneId): Plot[] {
  if (farm === 'north') return S.northPlots;
  if (farm === 'valley') return S.valleyPlots;
  return S.plots;
}

const FARM_LIST_1: readonly FarmSceneId[] = ['farm'];
const FARM_LIST_2: readonly FarmSceneId[] = ['farm', 'north'];
const FARM_LIST_3: readonly FarmSceneId[] = ['farm', 'north', 'valley'];

export function ownedFarms(): readonly FarmSceneId[] {
  if (S.lv.land >= 3) return FARM_LIST_3;
  if (S.lv.land >= 1) return FARM_LIST_2;
  return FARM_LIST_1;
}

export function ghCoversFarm(farm: FarmSceneId, i: number): boolean {
  if (farm === 'farm') return ghCovers(S.gh, i, COLS, ROWS, S.lv.land);
  if (S.gh <= 0 || !isEstateOwned(farm, S.lv.land)) return false;
  const spec = ESTATES[farm];
  const cIdx = i % spec.cols, rIdx = Math.floor(i / spec.cols);
  return cIdx >= spec.cols - 2 && rIdx < (S.gh >= 2 ? spec.rows : 2);
}

export function canAct(kind: string, i: number, worker = false, seed?: CropId, farm: FarmSceneId = activeFarm(), freeStam = false): string {
  if (!isEstateOwned(farm, S.lv.land)) return 'locked';
  const arr = plotsForFarm(farm);
  const p = arr[i];
  if (!p || (farm === 'farm' && !isUnlocked(i, S.lv.land))) return 'locked';
  if (!worker && !freeStam && S.stamina < costOf(kind)) return 'tired';
  switch (kind) {
    case 'till': return p.st === 0 || (p.st === 2 && p.dead) ? '' : 'skip';
    case 'plant': {
      const s = seed ?? UI.seed;
      if (p.st !== 1) return 'skip';
      if ((S.seeds[s] ?? 0) <= 0) return 'noseed';
      if (CROP[s].lv > farmLevel()) return 'locked';
      if (!CROP[s].seasons.includes(season()) && !ghCoversFarm(farm, i)) return 'season';
      return '';
    }
    case 'water': if (p.st === 0 || (p.st === 2 && p.dead) || p.water > 0.9) return 'skip'; return worker || S.can > 0 ? '' : 'nocan';
    case 'harvest': if (p.st !== 2 || !p.ripe || p.dead) return 'skip'; return invCount() >= invCap() ? 'full' : '';
    case 'fert': if (p.st === 0 || (p.st === 2 && p.dead) || p.fert > 0.95) return 'skip'; return S.fert > 0 ? '' : 'nofert';
  }
  return 'skip';
}

export interface ActResult { crop?: CropId; qty?: number }
export function doAct(kind: string, i: number, worker = false, seed?: CropId, silent = false, farm: FarmSceneId = activeFarm(), freeStam = false): ActResult {
  const arr = plotsForFarm(farm);
  const p = arr[i];
  if (!p || !isEstateOwned(farm, S.lv.land)) return {};
  if (!worker && !freeStam) S.stamina = Math.max(0, S.stamina - costOf(kind));
  switch (kind) {
    case 'till':
      if (p.st === 2) { p.last = null; p.crop = null; p.dead = false; p.prog = 0; p.ripe = false; p.n = 0; p.hand = false; }
      p.st = 1; p.water = Math.min(p.water, 0.3);
      p.fert = Math.min(1, p.fert + MK_FERTSOIL[mkOf('tractor')]);
      if (!silent) sfx.dig(); break;
    case 'plant': {
      const id = seed ?? UI.seed;
      if (!CROP[id]) return {};
      if (rnd() >= MK_SEEDSAVE[mkOf('seeder')]) S.seeds[id] = Math.max(0, (S.seeds[id] ?? 0) - 1);
      applyCropRotation(i, id, p);
      p.st = 2; p.crop = id; p.prog = 0; p.ripe = false; p.dead = false; p.dry = 0; p.n = 0;
      p.hand = !worker && farm !== 'farm' && UI.scene === farm;
      addStat('plants', 1);
      addXp(XP.plant);
      if (!seed && (S.seeds[id] ?? 0) <= 0) {
        const next = pickSeed(S.gh > 0, farm);
        if (next && next !== id) {
          UI.seed = next;
          toast(next, `${GT.autoSeedSwitched}${CROP[next].fa}`);
        }
      }
      if (!silent) sfx.pop();
      return { crop: id };
    }
    case 'water': if (!worker && S.can > 0) S.can--; p.water = 1; p.dry = 0; if (!silent) sfx.water(); break;
    case 'fert':
      if (S.fert <= 0) return {};
      if (!S.skills?.['crop-2'] || ((S.day + i) % 4) >= mkOf('drone')) S.fert--;
      p.fert = Math.min(1, p.fert + fertAddAmt());
      if (!silent) sfx.pop();
      break;
    case 'harvest': {
      if (!p.crop) return {};
      const def = CROP[p.crop];
      const harvMk = mkOf('harvester');
      const dedicatedLock = Boolean(p.hand || (S.farmSeeds?.[farm] && S.farmSeeds[farm] !== 'auto'));
      const specMult = dedicatedLock ? estateSpecialtyMult(farm, p.crop) : 1;
      const skillMult = S.skills?.['crop-3'] ? 1.18 : 1;
      const base = def.yield[0] + Math.floor(rnd() * (def.yield[1] - def.yield[0] + 1));
      const mult = (0.5 + 0.7 * p.fert) * (p.last === p.crop ? 0.8 : 1) * soilBonus() * specMult * skillMult * (1 + MK_HARVEST[harvMk]);
      const qty = Math.max(1, Math.round(base * mult));
      const got = addGood(p.crop!, qty);
      if (dedicatedLock && harvMk >= 3 && ((S.day + i + p.n) % 8 === 0)) {
        S.seeds[p.crop] = (S.seeds[p.crop] ?? 0) + 1;
      }
      p.fert = Math.max(0.05, p.fert - 0.18);
      const id = p.crop!;
      p.n++;
      if (def.regrow && p.n < (def.maxH ?? 1)) {
        p.ripe = false;
        p.prog = Math.max(0.15, 1 - def.regrow / def.days);
        p.water = Math.max(p.water, 0.35);
        p.dry = 0;
        p.dead = false;
      } else { p.last = id; p.crop = null; p.st = 0; p.prog = 0; p.ripe = false; p.n = 0; p.water = 0; p.hand = false; }
      addStat('harv', got);
      addXp(XP.harvestBase + def.price / XP.harvestPerPrice);
      if (!silent) sfx.pop();
      return { crop: id, qty: got };
    }
  }
  return {};
}

// ===== ماژول‌های جدا‌شده (فایل‌های کوچک؛ قاعدهٔ ۶۰۰ خط) =====
export * from './core/progress';
export * from './core/economy';
export * from './core/build';
export * from './core/ponds';
export * from './core/debt';
export * from './core/advisor';
export * from './core/events';
export * from './core/farmDeep';
export * from './core/artisan';
export * from './core/rpgSystems';
export * from './core/autoMachines';
export * from './core/mailbox';

export * from './core/dayLoop';
