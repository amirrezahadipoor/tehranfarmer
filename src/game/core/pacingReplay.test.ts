import { afterEach, describe, expect, it, vi } from 'vitest';
import { CROP, CROPS, FISH_STAM, GOOD, MACHINE_LIST, type CropId, type MachineId } from '../data';
import { rnd, setSeed } from '../rng';
import {
  S, UI, buySeed, canAct, canCap, costOf, doAct, farmLevel, holdCount,
  advance, landPrice, resetGame, runAuto, season, sellAll, sellGood, sleepToMorning, startDebt,
} from '../state';
import { activeMineNodes, canEnterMineFloor, completeMineNode, isMineNodeHarvested, travelMineFloor } from './mining';
import { catchRegionalFish } from './rpgSystems';
import { ensureFrontier } from './frontier';
import { minPay, payDebt } from './debt';
import { performPlayerPlotSweep } from './artisan';
import { buyGh, buyHive, buyMachine, buyPen, buyPond, buySilo, buyUpgrade, buyWorker, upgradeLvReq } from './build';
import { buyWell } from './farmDeep';
import { isQuestDone } from '../../story/quests';
import { completeFestivalContest, festivalBoothPlayed, isTownFestivalActive, judgeFestivalSubmission, redeemFestivalTokens, ringTownFestivalBell } from './frontier';


// Deterministic interaction-time model, deliberately separate from game hours:
// farm tap 0.55s, well 1.2s, three-strike mine node 4s, lift 6s, Quick Cast
// 1.5s, scene/market round trip 12s, crop sale 1s and seed order 0.25s.
// These are comparable cost weights, not a claim of measured human reaction
// time. The browser replay remains the source for observed wall-clock flow.
const ACTION_SECONDS: Record<string, number> = { till: 0.55, plant: 0.55, water: 0.55, harvest: 0.55, fert: 0.55 };
let usage = { stamina: 0, realSeconds: 0, toolCost: 0 };

function stubStorage() {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    get length() { return values.size; },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, String(value)),
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
  });
}

function resetScenario(seed: number) {
  usage = { stamina: 0, realSeconds: 0, toolCost: 0 };
  setSeed(seed);
  resetGame();
  setSeed(seed);
  UI.started = true;
  UI.scene = 'farm';
  UI.modal = null;
  UI.confirm = null;
  S.tut = { step: 7, active: false, done: true };
  S.story.prologueSeen = true;
  startDebt();
  setSeed(seed);
}

function plotAct(kind: string, index: number, seed: CropId = 'wheat'): boolean {
  if (canAct(kind, index, false, seed)) return false;
  UI.seed = seed;
  const cost = costOf(kind);
  const hits = performPlayerPlotSweep(index, kind, canAct, doAct, rnd);
  const done = hits.some((hit) => hit.plot === index);
  if (done) {
    usage.stamina += cost;
    usage.realSeconds += ACTION_SECONDS[kind] ?? 0.55;
  }
  return done;
}

function refillCan(): boolean {
  if (S.can > 0 || S.stamina < costOf('well')) return false;
  S.stamina = Math.max(0, S.stamina - costOf('well'));
  S.can = canCap();
  usage.stamina += costOf('well');
  usage.realSeconds += 1.2;
  return true;
}

function sellCrop(id: CropId) {
  const count = holdCount(id);
  if (count > 0) {
    sellGood(id, count);
    usage.realSeconds += 1;
  }
}

function sellCrops() {
  for (const crop of CROPS) sellCrop(crop.id);
}

function cropChoices() {
  const sn = season();
  const lv = farmLevel();
  return CROPS
    .filter((crop) => crop.lv <= lv && crop.seasons.includes(sn))
    .sort((a, b) => {
      const score = (crop: typeof a) => ((crop.yield[0] + crop.yield[1]) / 2 * crop.price - crop.seed) / crop.days;
      return score(b) - score(a);
    });
}

function nextCrop(): CropId | null {
  const choices = cropChoices();
  for (const crop of choices) if ((S.seeds[crop.id] ?? 0) > 0) return crop.id;
  for (const crop of choices) {
    if (S.coins <= CROP[crop.id].seed + 50) continue;
    buySeed(crop.id, 1);
    if ((S.seeds[crop.id] ?? 0) > 0) {
      usage.realSeconds += 0.25;
      return crop.id;
    }
  }
  return null;
}

function runFarm(budget: number) {
  const started = S.stamina;
  const spent = () => started - S.stamina;
  // Harvest first, selling in realistic backpack-sized batches so capacity cannot
  // silently destroy the very crops this replay is meant to measure.
  for (let i = 0; i < S.plots.length && spent() < budget; i++) {
    if (!S.plots[i].ripe) continue;
    const id = S.plots[i].crop;
    if (!plotAct('harvest', i)) continue;
    if (id && holdCount(id) >= 20) sellCrop(id);
  }
  sellCrops();

  for (let i = 0; i < S.plots.length && spent() < budget; i++) {
    const p = S.plots[i];
    if (p.st === 2 && p.crop && !p.ripe && !p.dead && p.water < 0.25) {
      refillCan();
      plotAct('water', i);
      continue;
    }
    if (p.st !== 0 && p.st !== 1 && !p.dead) continue;
    const id = nextCrop();
    if (!id) continue;
    if (p.st === 0 || p.dead) {
      if (!plotAct('till', i)) continue;
    }
    if (!plotAct('plant', i, id)) continue;
    refillCan();
    plotAct('water', i);
  }
  sellCrops();
}

function runMine() {
  const f = ensureFrontier();
  let moved = true;
  while (moved) {
    moved = false;
    for (const floor of [3, 2, 1]) {
      if (!canEnterMineFloor(floor)) continue;
      if (f.caveFloor !== floor) {
        if (!travelMineFloor(floor)) continue;
        usage.realSeconds += 6;
      }
      for (const node of activeMineNodes(floor)) {
        if (isMineNodeHarvested(node.idx, floor) || S.stamina < node.stam) continue;
        if (!completeMineNode(floor, node.idx, Array(node.strikes).fill(0.45))) continue;
        usage.stamina += node.stam;
        usage.realSeconds += 4;
        moved = true;
      }
    }
    // A second pass is required when clearing two veins has just powered a lift.
    if (!moved) break;
    let anyAvailable = false;
    for (const floor of [3, 2, 1]) {
      if (!canEnterMineFloor(floor)) continue;
      if (activeMineNodes(floor).some((node) => !isMineNodeHarvested(node.idx, floor) && S.stamina >= node.stam)) anyAvailable = true;
    }
    if (!anyAvailable) break;
  }
}

function runSideActivities() {
  usage.realSeconds += 12;
  UI.scene = 'cave';
  runMine();
  UI.scene = 'river';
  // Quick Cast remains an actual core catch with its real stamina cost,
  // reduced unskilled cash factor and 50% landing chance. No reward injection.
  while (S.stamina >= FISH_STAM && holdCount('fish') + holdCount('roe') < 60) {
    S.stamina = Math.max(0, S.stamina - FISH_STAM);
    usage.stamina += FISH_STAM;
    usage.realSeconds += 1.5;
    catchRegionalFish(1.25, 1);
  }
  UI.scene = 'town';
  runFestival();
  sellAll();
  UI.scene = 'farm';
}


function runFestival() {
  if (!isTownFestivalActive()) ringTownFestivalBell();
  if (!isTownFestivalActive()) return;
  if (!festivalBoothPlayed('judge')) {
    const items = Object.keys(GOOD).filter((id) => holdCount(id) > 0).sort((a, b) => GOOD[b].base - GOOD[a].base).slice(0, 3);
    if (items.length) judgeFestivalSubmission(items);
  }
  if (!festivalBoothPlayed('cauldron')) completeFestivalContest('cauldron', 0.9);
  if (!festivalBoothPlayed('archery')) completeFestivalContest('archery', 0.9);
  while (ensureFrontier().festivalTokens >= 5) redeemFestivalTokens('gold');
}

const machineCount = () => MACHINE_LIST.filter((id) => (S.machines[id] ?? 0) >= 1).length;
const toolUps = () => (S.lv.hoe ?? 0) + (S.lv.can ?? 0) + (S.lv.bag ?? 0) + (S.lv.stam ?? 0);

function attempt(buy: () => void): boolean {
  const coins = S.coins, builds = S.builds.length, workers = S.workers;
  buy();
  return S.coins < coins || S.builds.length > builds || S.workers > workers;
}

/** One planned, chapter-relevant purchase per day; unaffordable items are saved for. */
function landPurchaseAllowed(): boolean {
  const cap = [0, 1, 2, 2, 3, 3, 4][S.story.chapter] ?? 4;
  return S.lv.land < cap && farmLevel() >= upgradeLvReq('land');
}

function buyNextRequirement(): boolean {
  if (landPurchaseAllowed()) return attempt(() => buyUpgrade('land'));
  const chapter = S.story.chapter;
  const pens = Object.values(S.pens).filter((v) => (v ?? 0) > 0).length;
  const buyMachineId = (id: MachineId) => attempt(() => buyMachine(id));
  if (chapter === 2) {
    if (pens < 1) return attempt(() => buyPen('chicken'));
    if (pens < 2) return attempt(() => buyPen('rabbit'));
    if (S.lv.land < 1) return attempt(() => buyUpgrade('land'));
    if (toolUps() < 1) return attempt(() => buyUpgrade('hoe'));
  }
  if (chapter === 3) {
    if (S.ponds.length < 2) return attempt(() => buyPond());
    if (S.hives < 2) return attempt(() => buyHive());
    for (const id of MACHINE_LIST) if (machineCount() < 2 && !(S.machines[id] ?? 0)) return buyMachineId(id);
  }
  if (chapter === 4) {
    if (S.gh < 1) return attempt(() => buyGh());
    if (S.wellLv < 1) return attempt(() => buyWell());
    if (S.lv.land < 2) return attempt(() => buyUpgrade('land'));
    for (const id of MACHINE_LIST) if (machineCount() < 4 && !(S.machines[id] ?? 0)) return buyMachineId(id);
  }
  if (chapter === 5) {
    if (S.workers < 3) return attempt(() => buyWorker());
    if (S.silo < 1) return attempt(() => buySilo());
    if (S.lv.land < 3) return attempt(() => buyUpgrade('land'));
    for (const id of MACHINE_LIST) if (machineCount() < 5 && !(S.machines[id] ?? 0)) return buyMachineId(id);
    if (!MACHINE_LIST.some((id) => (S.machines[id] ?? 0) >= 2)) return buyMachineId('feeder');
  }
  if (chapter === 6) {
    if (S.lv.land < 4) return attempt(() => buyUpgrade('land'));
    if (S.lv.soil < 1) return attempt(() => buyUpgrade('soil'));
    for (const id of MACHINE_LIST) if (machineCount() < 6 && !(S.machines[id] ?? 0)) return buyMachineId(id);
    if (toolUps() < 3) {
      for (const key of ['hoe', 'can', 'bag'] as const) if (toolUps() < 3) return attempt(() => buyUpgrade(key));
    }
  }
  return false;
}

function ensureWorkerSeeds() {
  if (S.workers <= 0) return;
  S.farmSeeds ??= {};
  const required: CropId[] = [];
  if (S.lv.land >= 1) {
    const north: CropId = season() === 1 ? 'corn' : 'wheat';
    S.farmSeeds.north = north;
    required.push(north);
  }
  if (S.lv.land >= 3 && farmLevel() >= 8) {
    S.farmSeeds.valley = 'grape';
    required.push('grape');
  }
  const general = cropChoices()[0]?.id;
  if (general) required.push(general);
  for (const id of required) {
    if ((S.seeds[id] ?? 0) >= 24) continue;
    const cost = CROP[id].seed * 24;
    const debtReserve = S.debt && S.debt.remaining > 0 ? minPay() : 0;
    if (S.coins > cost + debtReserve + 200) buySeed(id, 24);
  }
}

function serviceDebt() {
  if (!S.debt || S.debt.remaining <= 0 || S.story.postgame) return;
  const available = Math.max(0, Math.floor(S.coins - 200));
  if (available <= 0) return;
  const savingForLand = landPurchaseAllowed();
  if (isQuestDone(S.story.chapter) && !savingForLand) payDebt(available);
  else {
    const cycleNeed = Math.max(0, minPay() - S.debt.paidThisCycle);
    if (cycleNeed > 0) payDebt(Math.min(available, cycleNeed));
  }
}

describe('full pacing replay through the real core', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('reaches the finale without injected coins or XP', { timeout: 40000 }, () => {
    stubStorage();
    resetScenario(0x51f15e);
    const rows: unknown[] = [];
    const noteDays: Record<number, number> = {};
    let previousNote = 0;
    for (let day = 1; day <= Number(process.env.PACING_MAX_DAYS ?? 750) && !S.story.postgame; day++) {
      if (S.debt && S.debt.noteIdx !== previousNote) {
        previousNote = S.debt.noteIdx;
        noteDays[previousNote] = S.day;
      }
      runAuto();
      if (farmLevel() < 22) runFarm(Number.POSITIVE_INFINITY);
      advance(18);
      ensureWorkerSeeds();
      runSideActivities();
      ensureWorkerSeeds();
      buyNextRequirement();
      serviceDebt();
      if (S.day % 28 === 1 || S.story.postgame) rows.push({ day: S.day, coins: Math.round(S.coins), level: farmLevel(), note: S.debt?.noteIdx, remaining: Math.round(S.debt?.remaining ?? 0), land: S.lv.land, quest: S.story.chapter, realMinutes: Math.round(usage.realSeconds / 6) / 10 });
      if (!S.story.postgame) {
        usage.realSeconds += 2;
        sleepToMorning();
      }
    }
    const result = { postgame: S.story.postgame, day: S.day, coins: Math.round(S.coins), earned: Math.round(S.earned), level: farmLevel(), noteDays, debtPaid: Math.round(S.debt?.paidTotal ?? 0), remaining: Math.round(S.debt?.remaining ?? 0), beatings: S.debt?.beatings, land: S.lv.land, nextLandPrice: landPrice(S.lv.land), machines: S.machines, workers: S.workers, buildings: { ponds: S.ponds.length, hives: S.hives, gh: S.gh, silo: S.silo, well: S.wellLv, soil: S.lv.soil, tools: toolUps() }, stats: { plants: S.stats.plants, harv: S.stats.harv, cropHarv: S.stats.cropHarv, farm: S.stats['cropHarv:farm'], north: S.stats['cropHarv:north'], valley: S.stats['cropHarv:valley'], market: S.stats.marketEarned, mine: S.stats.mineNodes, fish: S.stats.fish }, seeds: S.seeds, farmSeeds: S.farmSeeds, northPlots: { planted: S.northPlots.filter((p) => p.st === 2).length, ripe: S.northPlots.filter((p) => p.ripe).length, sample: S.northPlots.slice(0, 4) }, valleyPlots: { planted: S.valleyPlots.filter((p) => p.st === 2).length, ripe: S.valleyPlots.filter((p) => p.ripe).length, sample: S.valleyPlots.slice(0, 4) }, realHours: Math.round(usage.realSeconds / 360) / 10, rows };
    console.log('PACING_REPLAY', JSON.stringify(result));
    expect(S.story.postgame).toBe(true);
    expect(S.debt?.remaining).toBe(0);
    expect(S.day).toBeLessThanOrEqual(750);
  });
});
