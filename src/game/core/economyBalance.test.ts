import { afterEach, describe, expect, it, vi } from 'vitest';
import { CROP, CROPS, FISH_STAM, type CropId } from '../data';
import { rnd, setSeed } from '../rng';
import {
  S, UI, buySeed, canAct, canCap, costOf, doAct, farmLevel, holdCount,
  resetGame, season, sellAll, sellGood, sleepToMorning, startDebt,
} from '../state';
import { activeMineNodes, canEnterMineFloor, completeMineNode, isMineNodeHarvested, travelMineFloor } from './mining';
import { catchRegionalFish } from './rpgSystems';
import { ensureFrontier } from './frontier';
import { minPay } from './debt';
import { performPlayerPlotSweep } from './artisan';

type Strategy = 'farm' | 'side' | 'mixed';
interface DayRow {
  day: number;
  coins: number;
  gross: number;
  level: number;
  stamina: number;
  staminaSpent: number;
  realSeconds: number;
  toolCost: number;
  coinsPerStamina: number;
  coinsPerRealMinute: number;
  harvested: number;
  mineNodes: number;
  fish: number;
  canPayMin: boolean;
}

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
        if (!completeMineNode(floor, node.idx, [0, 0, 0])) continue;
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
    catchRegionalFish(0.75, 0.35);
  }
  UI.scene = 'town';
  sellAll();
  UI.scene = 'farm';
}

function replay(strategy: Strategy, seed: number): DayRow[] {
  resetScenario(seed);
  const rows: DayRow[] = [];
  for (let day = 1; day <= 7; day++) {
    const grossBefore = S.earned;
    if (strategy !== 'side') runFarm(strategy === 'mixed' ? 85 : Number.POSITIVE_INFINITY);
    if (strategy !== 'farm') runSideActivities();
    else sellCrops();
    const netCoins = Math.round(S.coins) - 700 - usage.toolCost;
    const realMinutes = Math.max(0.001, usage.realSeconds / 60);
    const row: DayRow = {
      day: S.day,
      coins: Math.round(S.coins),
      gross: Math.round(S.earned - grossBefore),
      level: farmLevel(),
      stamina: Math.round(S.stamina),
      staminaSpent: usage.stamina,
      realSeconds: Math.round(usage.realSeconds * 10) / 10,
      toolCost: usage.toolCost,
      coinsPerStamina: Math.round(netCoins / Math.max(1, usage.stamina) * 100) / 100,
      coinsPerRealMinute: Math.round(netCoins / realMinutes * 100) / 100,
      harvested: S.stats.cropHarv ?? 0,
      mineNodes: S.stats.mineNodes ?? 0,
      fish: (S.stats.fish ?? 0) + (S.stats.roeN ?? 0),
      canPayMin: S.coins >= minPay(),
    };
    rows.push(row);
    expect(Number.isFinite(S.coins)).toBe(true);
    expect(S.coins).toBeGreaterThanOrEqual(0);
    expect(S.stamina).toBeGreaterThanOrEqual(0);
    if (day < 7) {
      usage.realSeconds += 2;
      sleepToMorning();
    }
  }
  return rows;
}

describe('seven-day economy replay through the real core', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps farm, side activity and mixed strategies valid and comparable across seeds', () => {
    stubStorage();
    const seeds = [1, 7, 42, 12345, 54321, 987654, 0x51f15e];
    const summaries: unknown[] = [];
    for (const seed of seeds) {
      const farm = replay('farm', seed);
      const side = replay('side', seed);
      const mixed = replay('mixed', seed);
      const summarize = (rows: DayRow[]) => ({
        firstMinDay: rows.find((row) => row.canPayMin)?.day ?? null,
        finalCoins: rows.at(-1)!.coins,
        gross: rows.reduce((sum, row) => sum + row.gross, 0),
        staminaSpent: rows.at(-1)!.staminaSpent,
        realSeconds: rows.at(-1)!.realSeconds,
        toolCost: rows.at(-1)!.toolCost,
        coinsPerStamina: rows.at(-1)!.coinsPerStamina,
        coinsPerRealMinute: rows.at(-1)!.coinsPerRealMinute,
      });
      const farmSummary = summarize(farm);
      const sideSummary = summarize(side);
      const mixedSummary = summarize(mixed);
      summaries.push({ seed, farm: farmSummary, side: sideSummary, mixed: mixedSummary });
      // Design target: a single-focus path can pay the first minimum around
      // days 5–7; mixed may arrive in days 4–5 and finishes best or within 5%
      // of the best single-focus path. No strategy may bypass the debt on day 2.
      expect(farmSummary.firstMinDay).toBeGreaterThanOrEqual(5);
      expect(farmSummary.firstMinDay).toBeLessThanOrEqual(7);
      expect(sideSummary.firstMinDay).toBeGreaterThanOrEqual(5);
      expect(sideSummary.firstMinDay).toBeLessThanOrEqual(7);
      expect(mixedSummary.firstMinDay).toBeGreaterThanOrEqual(4);
      expect(mixedSummary.firstMinDay).toBeLessThanOrEqual(5);
      expect(mixedSummary.finalCoins).toBeGreaterThanOrEqual(sideSummary.finalCoins * 0.95);
      expect(mixedSummary.finalCoins).toBeGreaterThanOrEqual(farmSummary.finalCoins);
      expect(mixedSummary.coinsPerRealMinute).toBeGreaterThan(0);
      expect(mixedSummary.coinsPerStamina).toBeGreaterThan(0);
      expect(farm.at(-1)!.harvested).toBeGreaterThan(0);
      expect(side.at(-1)!.mineNodes).toBeGreaterThan(0);
      expect(side.at(-1)!.fish).toBeGreaterThan(0);
      expect(mixed.at(-1)!.harvested).toBeGreaterThan(0);
      expect(mixed.at(-1)!.mineNodes).toBeGreaterThan(0);
      if (seed === 0x51f15e) console.log('ECONOMY_7D', JSON.stringify({ farm, side, mixed }));
    }
    console.log('ECONOMY_7D_SUMMARY', JSON.stringify(summaries));
  });
});
