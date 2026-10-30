// ظرفیت واقعی کوئست‌ها؛ فقط هنگام تولید/مهاجرت کوئست صدا زده می‌شود، نه در حلقهٔ فریم.
import {
  ANIMALS, DAY_RATE, GH_LV, GH_PRICE, GOOD, HIVE_LV, HIVE_MAX, HONEY_CAP_PER_HIVE,
  HONEY_SEASON_MULT, MACHINE_LIST, MK_PRICE_MULT, PEN_CAP_LV, PEN_KINDS, POND_GROW_DAYS, POND_LV, POND_MAX,
  SILO_LV, SILO_PRICE, WELL_LV_REQ, WELL_PRICES, machineMkLv,
  type AnimalKind,
} from '../game/data';
import { upgradeLvReq, upgradePrice, type UpKey } from '../game/core/build';
import {
  S, farmLevel, ownedFarms, penCap, plotsForFarm, saleValueSel, season, srcHave,
} from '../game/state';
import type { QKind } from './dailyQuests';

const UP_KEYS: UpKey[] = ['hoe', 'can', 'bag', 'stam', 'land', 'soil', 'barn'];
const SELL_TARGET_STEP = 100;
const DAILY_HARD_CAP: Record<QKind, number> = {
  harvest: 40, plant: 40, collect: 60, honey: 40, pond: 10,
  sell: 1800, build: 3, fish: 8, babies: 4,
};

/** ساخت‌هایی که همین حالا یا با پایان سفارش فعلی واقعاً قابل تکمیل‌اند. */
export function availableBuildActions(): number {
  const queued = (kind: string, key: string) => S.builds.some((b) => b.kind === kind && b.key === key);
  let n = 0;
  const lv = farmLevel();
  for (const k of UP_KEYS) {
    const hasNext = upgradePrice(k) !== null;
    if (queued('upgrade', k) || (hasNext && upgradeLvReq(k) <= lv)) n++;
  }
  for (const id of MACHINE_LIST) {
    const mk = S.machines[id] ?? 0;
    if (queued('machine', id) || (mk < MK_PRICE_MULT.length && machineMkLv(id, mk + 1) <= lv)) n++;
  }
  for (const kind of PEN_KINDS) {
    const penLv = S.pens[kind] ?? 0;
    if (queued('pen', kind) || queued('penup', kind) ||
      (penLv === 0 ? ANIMALS[kind].lv <= lv : penLv < PEN_CAP_LV.length - 1)) n++;
  }
  if (queued('gh', 'gh') || (S.gh < GH_PRICE.length && GH_LV[S.gh] <= lv)) n++;
  if (queued('silo', 'silo') || (S.silo < SILO_PRICE.length && SILO_LV[S.silo] <= lv)) n++;
  if (queued('pond', 'pond') || (S.ponds.length < POND_MAX && POND_LV[S.ponds.length] <= lv)) n++;
  if (queued('hive', 'hive') || (S.hives < HIVE_MAX && HIVE_LV[S.hives] <= lv)) n++;
  if (queued('well', 'well') || (S.wellLv < WELL_PRICES.length && WELL_LV_REQ[S.wellLv] <= lv)) n++;
  if (queued('scarecrow', 'scarecrow') || (S.debt && (S.debt.scarecrow ?? 0) < 3)) n++;
  return n;
}

function plotCount(): number {
  return ownedFarms().reduce((sum, farm) => sum + plotsForFarm(farm).length, 0);
}

function allAdultsCanBeFed(): boolean {
  const food = S.trough + (S.inv.feed ?? 0);
  const required = S.animals.reduce((sum, a) => sum + (a.grown <= 0 ? ANIMALS[a.kind].eat * DAY_RATE : 0), 0);
  return food >= required; // ضرایب کاهش خوراک فقط حاشیهٔ اطمینان‌اند
}

function collectCap(atDawn: boolean): number {
  let n = 0;
  const fed = allAdultsCanBeFed();
  for (const a of S.animals) {
    if (a.sex !== 'f' || a.grown > 0 || a.sick) continue;
    const d = ANIMALS[a.kind];
    const ready = Math.max(0, Math.floor(a.ready ?? 0));
    const produced = atDawn && S.day % d.every === 0 && (d.eat <= 0 || fed) ? d.qty * DAY_RATE : 0;
    n += Math.min(d.cap, ready + produced);
  }
  return Math.floor(n);
}

function honeyCapToday(atDawn: boolean): number {
  if (S.hives <= 0) return 0;
  const produced = atDawn ? S.hives * HONEY_SEASON_MULT[season()] * DAY_RATE : 0;
  return Math.max(0, Math.floor(Math.min(S.hives * HONEY_CAP_PER_HIVE, S.honeyAcc + produced)));
}

function pondCapToday(atDawn: boolean): number {
  let n = 0;
  let autoFeedBudget = atDawn && S.auto.feed ? Math.floor((S.inv.feed ?? 0) / DAY_RATE) : 0;
  for (const p of S.ponds) {
    if (!p.stocked) continue;
    let grow = p.grow;
    if (atDawn) {
      if (p.feed > 0) grow += Math.min(p.feed, DAY_RATE);
      else if (autoFeedBudget > 0) { grow += DAY_RATE; autoFeedBudget--; }
    }
    if (grow >= POND_GROW_DAYS) n++;
  }
  return n;
}

function babyCapToday(atDawn: boolean): number {
  if (!atDawn) return 0;
  const space = new Map<AnimalKind, number>();
  const room = (kind: AnimalKind) => {
    if (!space.has(kind)) space.set(kind, Math.max(0, penCap(kind) - S.animals.filter((a) => a.kind === kind).length));
    return space.get(kind) ?? 0;
  };
  const take = (kind: AnimalKind) => {
    if (room(kind) <= 0) return 0;
    space.set(kind, room(kind) - 1);
    return 1;
  };
  let n = 0;
  for (const nest of S.nests) if (nest.hatch <= DAY_RATE) n += take(nest.kind);
  const fed = allAdultsCanBeFed();
  for (const a of S.animals) {
    const d = ANIMALS[a.kind];
    if ((a.preg ?? 0) > 0 && (a.preg ?? 0) <= DAY_RATE && !a.sick && (d.eat <= 0 || fed)) n += take(a.kind);
  }
  return n;
}

function currentSaleCap(): number {
  let n = 0;
  const ids = new Set([...Object.keys(S.inv), ...Object.keys(S.pack)]);
  for (const id of ids) {
    if (id === 'feed' || id === 'fingerling' || !GOOD[id]) continue;
    const keep = S.contract?.good === id ? S.contract.qty : 0;
    const qty = Math.max(0, srcHave(id) - keep);
    if (qty > 0) n += saleValueSel(id, qty);
  }
  return Math.floor(n);
}

/** سقف محافظه‌کارانهٔ پیشرفتِ همان روز؛ صفر یعنی این نوع امروز پیشنهاد نمی‌شود. */
export function dailyKindCap(kind: QKind, atDawn = false): number {
  const hard = DAILY_HARD_CAP[kind];
  switch (kind) {
    case 'harvest':
    case 'plant': return Math.min(hard, plotCount());
    case 'collect': return Math.min(hard, collectCap(atDawn));
    case 'honey': return Math.min(hard, honeyCapToday(atDawn));
    case 'pond': return Math.min(hard, pondCapToday(atDawn));
    case 'build': return Math.min(hard, availableBuildActions());
    case 'fish': return S.rod > 0 ? hard : 0;
    case 'babies': return Math.min(hard, babyCapToday(atDawn));
    case 'sell': {
      const current = currentSaleCap();
      const cap = current > 0 ? Math.min(hard, current) : 0;
      return Math.floor(cap / SELL_TARGET_STEP) * SELL_TARGET_STEP;
    }
  }
}

export function weeklyKindCap(kind: QKind, target: number): number {
  return kind === 'build' ? Math.min(target, availableBuildActions()) : target;
}
