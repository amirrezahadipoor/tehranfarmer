// ===== هوش مصنوعی جامع و بدون باگ کارگران در هر ۳ مزرعه + دامداری، کاه تخم‌ها، استخر، رودخانه و کندو =====
import { ANIMALS, FINGER_PRICE, POND_FEED, POND_GROW_DAYS, XP, type CropId } from '../data';
import type { FarmSceneId } from '../estates';
import {
  S, addGood, addStat, addXp, canAct, cureAnimal, doAct, fertAddAmt,
  ghCoversFarm, invCap, invCount, ownedFarms, pickSeed, plotsForFarm, troughCap,
} from '../state';
import { harvestHoney, harvestPond, stockPond } from './ponds';
import { hasGrazingLivestock, isPoultry, pendingStrawEggs } from '../farmZones';
import { machineSynergySpeedMult } from './rpgSystems';
import { rnd } from '../rng';

let workerSimAcc = 0;
let workerRiverAcc = 0;
let rrCursor = 0;

/** پر کردن هوشمند آخور توسط کارگر — فقط و فقط وقتی واقعاً دام علوفه‌خوار داریم! */
export function workerRefillGrazingTrough(): number {
  if (!hasGrazingLivestock()) return 0;
  if (S.trough >= Math.min(8, troughCap() * 0.45)) return 0;
  let space = troughCap() - S.trough;
  let moved = 0;
  for (const id of ['feed', 'wheat', 'corn'] as const) {
    const have = S.inv[id] ?? 0;
    const n = Math.floor(Math.min(space, have));
    if (n > 0) {
      S.inv[id] -= n;
      if (S.inv[id] <= 0) delete S.inv[id];
      space -= n;
      S.trough += n;
      moved += n;
    }
    if (space <= 0) break;
  }
  return moved;
}

/** سرویس کامل استخر یکسره (برداشت ماهی رسیده + رهاسازی بچه ماهی موجود + غذادهی) توسط کارگر */
export function workerServiceUnifiedPond(): boolean {
  if (!S.ponds.length) return false;
  let acted = false;
  for (let i = 0; i < S.ponds.length; i++) {
    const p = S.ponds[i];
    if (p.stocked && p.grow >= POND_GROW_DAYS && invCount() < invCap()) {
      if (harvestPond(i, true, true) > 0) acted = true;
    }
    if (!p.stocked && ((S.inv.fingerling ?? 0) > 0 || S.coins > FINGER_PRICE * 12)) {
      stockPond(i);
      acted = true;
    }
    if (p.stocked && p.feed < POND_FEED * 4 && (S.inv.feed ?? 0) >= 1) {
      const n = Math.floor(Math.min(POND_FEED * 4 - p.feed, S.inv.feed ?? 0));
      if (n > 0) {
        S.inv.feed -= n;
        if (S.inv.feed <= 0) delete S.inv.feed;
        p.feed += n;
        acted = true;
      }
    }
  }
  return acted;
}

/** ماهیگیری مستقیم کارگر در رودخانه */
export function workerCatchRiverFish(): number {
  if (invCount() >= invCap()) return 0;
  const roll = rnd();
  if (roll < 0.25) {
    const got = addGood('roe', 1);
    if (got > 0) { addStat('roeN', got); addXp(10); }
    return got;
  }
  const got = addGood('fish', 1 + Math.floor(rnd() * 2));
  if (got > 0) { addStat('fish', got); addXp(XP.fish); }
  return got;
}

/** جمع‌آوری یکجای تخم‌ها از روی کاه + محصولات دام‌های هر بخش توسط کارگر */
export function workerCollectAllRanchGoods(): number {
  let total = 0;
  for (const a of S.animals) {
    if (a.sick && S.coins > 400) cureAnimal(a.id);
    if (a.grown > 0 || a.ready <= 0) continue;
    const prod = isPoultry(a.kind) ? 'egg' : ANIMALS[a.kind].prod;
    const got = addGood(prod, a.ready);
    a.ready -= got;
    if (got > 0) {
      total += got;
      addStat('collect', got);
      addXp(got * XP.collect);
    } else break;
  }
  return total;
}

export function resetWorkerSim() {
  workerSimAcc = 0;
  workerRiverAcc = 0;
  rrCursor = 0;
}

function stepFarmWorkerPlotOp(farm: FarmSceneId, startIdx: number): boolean {
  const arr = plotsForFarm(farm);
  const len = arr.length;
  if (len <= 0) return false;
  const seedOut = pickSeed(false, farm) ?? undefined;
  const seedGh = S.gh > 0 ? (pickSeed(true, farm) ?? undefined) : seedOut;
  // کارگر ساده فقط تک‌کرتی و بدون ضرایب صنعتی کار می‌کند؛ ماشین‌ها سرعت کارگر و بازده را جهش می‌دهند
  for (const kind of ['harvest', 'water', 'plant', 'till', 'fert'] as const) {
    if (kind === 'plant' && !seedOut && !seedGh) continue;
    for (let k = 0; k < len; k++) {
      const i = (startIdx + k) % len;
      const p = arr[i];
      if (kind === 'fert') {
        if (S.fert > 0 && (p.st === 1 || (p.st === 2 && !p.dead)) && p.fert < 0.55) {
          S.fert--;
          p.fert = Math.min(1, p.fert + fertAddAmt());
          return true;
        }
        continue;
      }
      if (kind === 'water' && (p.st !== 2 || p.dead || p.water >= 0.55)) continue;
      const seed: CropId | undefined = kind === 'plant' ? (ghCoversFarm(farm, i) ? seedGh : seedOut) : undefined;
      if (kind === 'plant' && !seed) continue;
      if (canAct(kind, i, true, seed, farm) === '') {
        doAct(kind, i, true, seed, true, farm);
        return true;
      }
    }
  }
  return false;
}

/** اجرای پیوسته و چرخشی کارگران با احترام به اولویت کاری (همه‌جانبه / کشت ۳ مزرعه / دام و شیلات) و هم‌افزایی ماشین‌ها */
export function tickWorkersSim(hours: number) {
  if (S.workers <= 0 || S.hour < 6 || S.hour > 21.5) return;
  const role = S.crewRole ?? 'balanced';
  const syn = machineSynergySpeedMult();
  workerSimAcc += hours * S.workers * syn * (role === 'crops' ? 1.18 : 1);
  workerRiverAcc += hours * S.workers * syn * (role === 'ranch' ? 1.35 : role === 'crops' ? 0.35 : 1);

  while (workerSimAcc >= 6.8) {
    workerSimAcc -= 6.8;
    if (role !== 'crops') {
      if (pendingStrawEggs() > 0 || S.animals.some((a) => a.grown <= 0 && a.ready > 0)) {
        workerCollectAllRanchGoods();
      }
      workerRefillGrazingTrough();
      workerServiceUnifiedPond();
      if (S.hives > 0 && S.honeyAcc >= 2 && invCount() < invCap()) {
        harvestHoney(true, true);
      }
    }
    const farms = ownedFarms();
    rrCursor = (rrCursor + 7) % 9973;
    let workedPlot = false;
    for (let fi = 0; fi < farms.length; fi++) {
      const farm = farms[(rrCursor + fi) % farms.length];
      if (stepFarmWorkerPlotOp(farm, rrCursor)) { workedPlot = true; break; }
    }
    if (!workedPlot && role === 'crops') {
      if (pendingStrawEggs() > 0 || S.animals.some((a) => a.grown <= 0 && a.ready > 0)) {
        workerCollectAllRanchGoods();
      }
      workerRefillGrazingTrough();
    }
  }

  while (workerRiverAcc >= 3) {
    workerRiverAcc -= 3;
    workerCatchRiverFish();
  }
}
