/**
 * مهارتی، قطعی و قابل‌برنامه‌ریزی: سامانهٔ استخراج غار.
 * هیچ پاداش پایه‌ای به شانس وابسته نیست؛ نوع گوهر روی رگه دیده می‌شود و دقت
 * بازیکن فقط جایزهٔ اضافی و دستاورد را تعیین می‌کند. ظرفیت و هزینه از core
 * واحد استفاده می‌کنند تا سیو، کوله، ماشین‌ها و اقتصاد از هم جدا نشوند.
 */
import { GOOD, fa, type GoodId } from '../data';
import { S, UI, addStat, addXp, notify, saveGame, toast } from '../state';
import { sfx } from '../sound';
import { grantGoodWithMailOverflow } from './mailbox';
import { ensureFrontier } from './frontier';
import { FT } from '../../strings/frontierText';
import { GT } from '../../strings/gameText';
import { notePlayerAction } from '../../story/engine';

export interface MineNodeSpot {
  idx: number;
  x: number;
  y: number;
  good: GoodId;
  stam: number;
  strikes: number;
}

export interface MineResult {
  good: GoodId;
  qty: number;
  accuracy: number;
  perfect: boolean;
  liftUnlocked: boolean;
}

interface MineEncounter { floor: number; idx: number; token: number }
let encounter: MineEncounter | null = null;
let encounterToken = 0;

const CAVE_COORDS = [[305, 478], [468, 548], [642, 578], [808, 478], [945, 568], [520, 632]] as const;
const FLOOR_GOODS: GoodId[][] = [
  ['quartz', 'quartz', 'turquoise', 'quartz', 'amber', 'turquoise'],
  ['turquoise', 'amber', 'quartz', 'amethyst', 'garnet', 'opal'],
  ['amber', 'amethyst', 'garnet', 'opal', 'sapphire', 'ruby'],
];
export const MINE_FLOOR_COUNT = 3;
export const MINE_LIFT_REQUIREMENT = 2;

/** چیدمان deterministic هر روز کمی می‌چرخد؛ نوع گوهر همیشه دیده می‌شود و رگهٔ سلطنتی ثابت می‌ماند. */
export function activeMineNodes(floor = ensureFrontier().caveFloor): MineNodeSpot[] {
  const goods = FLOOR_GOODS[Math.max(0, Math.min(2, floor - 1))];
  const poolSize = floor === 3 ? 5 : goods.length;
  const rotation = (S.day - 1) % poolSize;
  return CAVE_COORDS.map(([x, y], idx) => {
    const royal = floor === 3 && idx === 5;
    const good = royal ? 'ruby' : goods[(idx + rotation) % poolSize];
    return { idx, x, y, good, stam: 10 + floor * 3 + (royal ? 4 : 0), strikes: royal ? 4 : 3 };
  });
}

export function mineNodeKey(floor: number, idx: number) { return `cave:${floor}:${idx}`; }
export function isMineNodeHarvested(idx: number, floor = ensureFrontier().caveFloor) {
  return ensureFrontier().nodesDone[mineNodeKey(floor, idx)] === true;
}
export function mineFloorProgress(floor = ensureFrontier().caveFloor) {
  const f = ensureFrontier();
  const cleared = activeMineNodes(floor).reduce((n, spot) => n + (isMineNodeHarvested(spot.idx, floor) ? 1 : 0), 0);
  return { cleared, total: activeMineNodes(floor).length, required: MINE_LIFT_REQUIREMENT, liftOpen: !!f.stairsFound[`cave:${floor}`] || f.maxCaveFloor > floor };
}

/** هدف مرحلهٔ جاری مینی‌گیم؛ deterministic است و هنگام render جهانی را تغییر نمی‌دهد. */
export function mineWeakPoint(floor: number, idx: number, stage: number) {
  const center = 18 + ((idx * 23 + floor * 17 + stage * 31 + (S.day - 1) * 7) % 64);
  const width = Math.max(12, 27 - floor * 3 - stage * 2);
  return { center, width };
}

export function mineAccuracyAt(
  floor: number, idx: number, stage: number, marker: number,
  runtime?: { center: number; width: number; open?: boolean },
) {
  if (runtime?.open === false) return 0;
  const target = runtime ?? mineWeakPoint(floor, idx, stage);
  const distance = Math.abs(marker - target.center);
  return Math.max(0, Math.min(1, 1 - distance / Math.max(1, target.width / 2)));
}

/** Floor 2 has a drifting seam; floor 3 keeps its position but pulses on a readable timer. */
export function mineWeakPointAt(floor: number, idx: number, stage: number, elapsed: number) {
  const base = mineWeakPoint(floor, idx, stage);
  if (floor !== 2) return base;
  const center = Math.max(10, Math.min(90, base.center + Math.sin(elapsed * 1.55 + idx * 0.7) * 10));
  return { ...base, center };
}

export function mineTargetOpenAt(floor: number, elapsed: number): boolean {
  return floor < 3 || (Math.max(0, elapsed) % 2.8) < 2;
}

export function currentMineEncounter() {
  const active = encounter;
  if (!active || UI.modal !== 'mining') return null;
  const spot = activeMineNodes(active.floor).find((n) => n.idx === active.idx);
  return spot && !isMineNodeHarvested(spot.idx, active.floor) ? { ...active, spot } : null;
}

export function openMineEncounter(idx: number) {
  const f = ensureFrontier();
  const spot = activeMineNodes(f.caveFloor).find((n) => n.idx === idx);
  if (!spot || isMineNodeHarvested(idx, f.caveFloor)) return false;
  if (S.stamina < spot.stam) { toast('bolt', GT.g148); sfx.err(); return false; }
  encounter = { floor: f.caveFloor, idx, token: ++encounterToken };
  UI.modal = 'mining';
  notify();
  return true;
}

export function closeMineEncounter() {
  encounter = null;
  if (UI.modal === 'mining') UI.modal = null;
  notify();
}

/**
 * پایان یک رگه: هزینه فقط یک‌بار و هنگام نتیجهٔ واقعی گرفته می‌شود. لغو مینی‌گیم
 * هزینه/جایزه ندارد. دقت بالا گوهر پایه را حذف نمی‌کند و فقط برای گوهرهای ارزان
 * مقدار اضافه می‌دهد؛ رگهٔ سلطنتی هم در استخراج بی‌نقص به الماس ارتقا می‌یابد.
 */
export function completeMineNode(floor: number, idx: number, accuracies: number[]): MineResult | null {
  const f = ensureFrontier();
  const spot = activeMineNodes(floor).find((n) => n.idx === idx);
  if (!spot || isMineNodeHarvested(idx, floor)) return null;
  const scores = accuracies.slice(0, spot.strikes).map((n) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0)));
  if (scores.length !== spot.strikes || S.stamina < spot.stam) return null;
  const accuracy = scores.reduce((a, b) => a + b, 0) / scores.length;
  const perfect = scores.every((n) => n >= 0.9) && accuracy >= 0.94;
  let good = spot.good;
  if (good === 'ruby' && perfect) good = 'diamond';
  const base = GOOD[good]?.base ?? 0;
  const qty = 1 + (accuracy >= 0.72 && base <= 900 ? 1 : 0) + (perfect && base <= 215 ? 1 : 0);
  S.stamina = Math.max(0, S.stamina - spot.stam);
  f.nodesDone[mineNodeKey(floor, idx)] = true;
  grantGoodWithMailOverflow(good, qty, 'engineer', 'mine-vein');
  addStat('mineNodes', 1);
  addStat('mineGems', qty);
  addStat('harv', qty); // سازگاری با دستاوردها و کوئست‌های کلی برداشت در نسخهٔ قبلی
  if (perfect) addStat('minePerfect', 1);
  const bestKey = `mineBest:${floor}:${idx}`;
  S.stats[bestKey] = Math.max(S.stats[bestKey] ?? 0, Math.round(accuracy * 100));
  addXp(7 * floor + Math.round(accuracy * 9));
  const progress = mineFloorProgress(floor);
  const liftUnlocked = floor < MINE_FLOOR_COUNT && progress.cleared >= MINE_LIFT_REQUIREMENT && !f.stairsFound[`cave:${floor}`];
  if (liftUnlocked) {
    f.stairsFound[`cave:${floor}`] = true;
    f.maxCaveFloor = Math.max(f.maxCaveFloor, Math.min(MINE_FLOOR_COUNT, floor + 1));
    toast('cave', FT.mineLiftOpened);
    sfx.fanfare();
  } else {
    toast(good, FT.mineLoot(GOOD[good]?.fa ?? good, qty));
    if (perfect) sfx.fanfare(); else sfx.dig();
  }
  notePlayerAction(1);
  saveGame();
  notify();
  return { good, qty, accuracy, perfect, liftUnlocked };
}

export function finishMineEncounter(accuracies: number[], token?: number) {
  // تایمرِ پایانِ یک رگهٔ بسته‌شده نباید encounter تازه‌ای را که دوباره باز شده مصرف کند.
  if (typeof token === 'number' && encounter?.token !== token) return null;
  const active = currentMineEncounter();
  if (!active) { closeMineEncounter(); return null; }
  const result = completeMineNode(active.floor, active.idx, accuracies);
  encounter = null;
  UI.modal = null;
  notify();
  return result;
}

export function stepMineFloor(delta: number) {
  const f = ensureFrontier();
  const next = Math.max(1, Math.min(MINE_FLOOR_COUNT, f.caveFloor + Math.sign(delta)));
  if (next === f.caveFloor) return false;
  const p = mineFloorProgress(f.caveFloor);
  if (next > f.caveFloor && !p.liftOpen && p.cleared < MINE_LIFT_REQUIREMENT) {
    toast('cave', FT.stairsLocked); sfx.err(); return false;
  }
  if (next > f.caveFloor) {
    f.stairsFound[`cave:${f.caveFloor}`] = true;
    f.maxCaveFloor = Math.max(f.maxCaveFloor, next);
  }
  f.caveFloor = next;
  sfx.dig();
  saveGame(); notify();
  return true;
}

export function travelMineFloor(floor: number) {
  const f = ensureFrontier();
  const next = Math.max(1, Math.min(MINE_FLOOR_COUNT, Math.round(floor)));
  if (next > f.maxCaveFloor) return false;
  f.caveFloor = next;
  sfx.tap();
  saveGame(); notify();
  return true;
}

export function openMineMap() { UI.modal = 'mineMap'; notify(); }
export function mineFloorTitle(floor: number) { return `${FT.mineFloorShort} ${fa(floor)}`; }
