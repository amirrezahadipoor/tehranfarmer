// ===== ربات بازیکن — موتور مشترک شبیه‌ساز بالانس و داستان =====
import {
  S, UI, advance, buyAnimal, buyFeed, buyFert, buyGh, buyHive, buyMachine, buyPen, buyPenUp, buyPond,
  buyRod, buySeed, buySilo, buyUpgrade, buyWell, buyWorker, canAct, cureAllAnimals, doAct, farmLevel, feedPond,
  ghCoversFarm, harvestHoney, harvestPond, invCap, invCount, mkOf, ownedFarms, plotsForFarm, resetGame, saveGame,
  season, sellAll, sellGood, setSimBatchMode, stockPond, tickBuilds,
  troughCap, upgradeLvReq, upgradePrice, wellLvReq, wellPrice, addGood, addStat, addXp,
} from '../src/game/state';
import {
  ACHS, ANIMALS, COLS, CROPS, HIVE_LV, HIVE_MAX, hivePrice, lvReward, machineMkLv,
  machineMkPrice, PEN_KINDS, POND_LV, POND_MAX, pondPrice, ROWS, WORKER_LV, WORKER_MAX, WORKER_PRICES, XP,
  type AnimalKind, type CropId, type MachineId,
} from '../src/game/data';
import { NOTES } from '../src/story/debtData';
import {
  activeNote, buyScarecrow, clearVisit, daysToDue, debt, floorCoins, maybeOpenNextNote, minPay,
  payDebt, scarecrowPrice, startDebt, stashDeposit, stashWithdraw,
} from '../src/game/core/debt';
import { QUESTS, checkStoryQuests, isQuestDone } from '../src/story/quests';
import { advanceNode, maybeStartPrologue, pendingNode } from '../src/story/engine';
import { claim, ensureQuests, questDone } from '../src/story/dailyQuests';
import { setSeed } from '../src/game/rng';

export type Policy = 'normal' | 'good' | 'bad' | 'optimal';

export interface SimMetrics {
  days: number;
  level30Day: number | null;
  postgameDay: number | null;
  beatings: number;
  extorted: number;
  paidTotal: number;
  coins: number;
  earned: number;
  notesOpened: number;
  chapter: number;
  softLockDays: number;
  maxLevel: number;
  harvested: number;
  built: number;
  chapterIncome: Record<number, number>;
  chapterDays: Record<number, number>;
  noteShare: number[];
}

void COLS;
void ROWS;

/** کل درآمد ناخالص تجمعی بازیکن (فروش بازار + جوایز کوئست‌ها، سطوح و دستاوردها) */
export function totalGrossEarned(): number {
  let bonus = 0;
  const lv = farmLevel();
  for (let l = 2; l <= lv; l++) bonus += lvReward(l);
  for (const a of ACHS) {
    const have = S.ach[a.id] ?? 0;
    for (let t = 0; t < have; t++) bonus += a.tiers[t].reward;
  }
  for (const q of QUESTS) {
    if (S.story.questDone[q.chapter]) bonus += q.reward;
  }
  return S.earned + bonus;
}

let rankCacheKey = '';
let rankCacheOut: { id: CropId; score: number; seed: number }[] = [];
let rankCacheGh: { id: CropId; score: number; seed: number }[] = [];

function computeRankedSeeds(ignoreSeason: boolean, lv: number, sn: number): { id: CropId; score: number; seed: number }[] {
  const nextSn = (sn + 1) % 4;
  const daysLeftInSeason = 7 - ((S.day - 1) % 7);
  const out: { id: CropId; score: number; seed: number }[] = [];
  for (const c of CROPS) {
    if (c.lv > lv) continue;
    if (!ignoreSeason && !c.seasons.includes(sn)) continue;
    const growsNext = ignoreSeason || c.seasons.includes(nextSn);
    const neededGameDays = c.days / 2;
    if (!growsNext && daysLeftInSeason < Math.min(3, neededGameDays)) continue;
    const harvests = c.maxH ?? 1;
    const totalDays = (c.days + (c.regrow ?? 0) * Math.max(0, harvests - 1)) / 2;
    const avgYield = (c.yield[0] + c.yield[1]) * 0.5;
    const gross = c.price * avgYield * harvests * (S.dem[c.id] ?? 1);
    const score = (gross - c.seed) / Math.max(0.75, totalDays);
    out.push({ id: c.id, score, seed: c.seed });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

export function rankedSeeds(ignoreSeason = false): { id: CropId; score: number; seed: number }[] {
  const lv = farmLevel();
  const sn = season();
  const key = `${S.day}:${lv}:${(S.dem.wheat ?? 1).toFixed(2)}:${(S.dem.corn ?? 1).toFixed(2)}:${(S.dem.saffron ?? 1).toFixed(2)}`;
  if (key !== rankCacheKey) {
    rankCacheKey = key;
    rankCacheOut = computeRankedSeeds(false, lv, sn);
    rankCacheGh = computeRankedSeeds(true, lv, sn);
  }
  return ignoreSeason ? rankCacheGh : rankCacheOut;
}

export function bestSeed(): { id: CropId; score: number } | null {
  const list = rankedSeeds(false);
  return list[0] ? { id: list[0].id, score: list[0].score } : null;
}

function tendAnimalsAndPonds(policy: Policy = 'normal') {
  if (policy !== 'bad' && S.animals.some((a) => a.sick) && S.coins > 300) cureAllAnimals();
  if (S.animals.some((a) => ANIMALS[a.kind].eat > 0) && S.trough < troughCap() * 0.5) {
    let space = troughCap() - S.trough;
    for (const id of ['feed', 'wheat', 'corn']) {
      const n = Math.floor(Math.min(space, S.inv[id] ?? 0));
      if (n > 0) {
        S.inv[id] -= n;
        if (S.inv[id] <= 0) delete S.inv[id];
        space -= n;
        S.trough += n;
      }
    }
  }
  for (const a of S.animals) {
    if (a.grown > 0 || a.ready <= 0) continue;
    const got = addGood(ANIMALS[a.kind].prod, a.ready);
    if (got <= 0) break;
    a.ready -= got;
    addStat('collect', got);
    addXp(got * XP.collect);
  }
  for (let i = 0; i < S.ponds.length; i++) {
    harvestPond(i, true);
    if (!S.ponds[i].stocked && S.coins > 120) stockPond(i);
    if (S.ponds[i].stocked && S.ponds[i].feed < 4) feedPond(i);
  }
  if (S.hives > 0) harvestHoney(true);
}

function smartSell(policy: Policy, forceAll = false) {
  if (forceAll || policy === 'bad' || invCount() >= invCap() * 0.85) {
    sellAll();
    return;
  }
  if (policy === 'normal') {
    if (invCount() >= invCap() * 0.4) sellAll();
    return;
  }
  for (const id of Object.keys(S.inv)) {
    if (id === 'feed' || id === 'fingerling') continue;
    const have = S.inv[id] ?? 0;
    if (have <= 0) continue;
    const dem = S.dem[id] ?? 1;
    if (dem >= 0.9) sellGood(id, Math.min(have, 9));
    else if (have > 26) sellGood(id, Math.min(have - 12, 7));
  }
}

function restockSeeds(policy: Policy) {
  const diversity = policy === 'bad' ? 1 : policy === 'normal' ? 2 : 3;
  const topOut = rankedSeeds(false).slice(0, diversity);
  const topGh = S.gh > 0 && policy !== 'bad' ? rankedSeeds(true).slice(0, 2) : [];
  const picks = [...topGh, ...topOut];
  if (!picks.length) return;
  let emptyPlots = 0;
  for (const f of ownedFarms()) {
    for (const p of plotsForFarm(f)) {
      if (p.st !== 2 || p.dead) emptyPlots++;
    }
  }
  if (emptyPlots <= 0) return;
  const perKind = Math.max(3, Math.ceil((emptyPlots + 4) / Math.min(3, picks.length)));
  const maxSpend = policy === 'bad' ? S.coins * 0.35 : S.coins * 0.6;
  let spent = 0;
  for (let k = 0; k < Math.min(3, picks.length); k++) {
    const p = picks[k];
    const have = S.seeds[p.id] ?? 0;
    const want = Math.max(0, perKind - have);
    if (want <= 0) continue;
    const canBuy = Math.min(want, Math.floor(Math.max(0, maxSpend - spent) / Math.max(1, p.seed)));
    if (canBuy > 0) {
      const before = S.coins;
      buySeed(p.id, canBuy);
      spent += before - S.coins;
    }
  }
  const anySeeds = Object.values(S.seeds).reduce((a, b) => a + b, 0);
  if (anySeeds === 0 && S.coins >= 10) {
    const cheap = [...CROPS]
      .filter((c) => c.lv <= farmLevel() && c.seasons.includes(season()))
      .sort((a, b) => a.seed - b.seed)[0];
    if (cheap) buySeed(cheap.id, Math.max(1, Math.floor(S.coins / cheap.seed)));
  }
}

function workPlots(budgetActions: number, workerPass = false, policy: Policy = 'normal') {
  let acts = 0;
  const outRanks = rankedSeeds(false);
  const ghRanks = S.gh > 0 ? rankedSeeds(true) : outRanks;
  let availOut = outRanks.filter((s) => (S.seeds[s.id] ?? 0) > 0);
  let availGh = S.gh > 0 ? ghRanks.filter((s) => (S.seeds[s.id] ?? 0) > 0) : availOut;
  for (const farm of ownedFarms()) {
    const arr = plotsForFarm(farm);
    for (let i = 0; i < arr.length && acts < budgetActions; i++) {
      if (canAct('harvest', i, workerPass, undefined, farm) === '') {
        doAct('harvest', i, workerPass, undefined, true, farm);
        acts++;
        if (invCount() >= invCap() - 2) smartSell(policy, true);
      }
      if (acts >= budgetActions) break;
      const p = arr[i];
      if (p.st === 2 && p.crop && !p.dead && p.water < 0.55 && acts < budgetActions) {
        if (!workerPass && S.can <= 0) S.can = 8;
        if (canAct('water', i, workerPass, undefined, farm) === '') {
          doAct('water', i, workerPass, undefined, true, farm);
          acts++;
        }
      }
      if ((policy === 'good' || policy === 'optimal') && p.st === 2 && p.crop && !p.dead && p.fert < 0.8 && S.fert > 0 && acts < budgetActions) {
        if (canAct('fert', i, workerPass, undefined, farm) === '') {
          doAct('fert', i, workerPass, undefined, true, farm);
          acts++;
        }
      }
      if (acts >= budgetActions) break;
      if (canAct('till', i, workerPass, undefined, farm) === '') {
        doAct('till', i, workerPass, undefined, true, farm);
        acts++;
      }
      if (p.st === 1 && acts < budgetActions) {
        const useGh = S.gh > 0 && ghCoversFarm(farm, i);
        const avail = useGh ? availGh : availOut;
        const pick = avail.length ? avail[i % avail.length] : undefined;
        if (pick && canAct('plant', i, workerPass, pick.id, farm) === '') {
          doAct('plant', i, workerPass, pick.id, true, farm);
          acts++;
          if ((S.seeds[pick.id] ?? 0) <= 0) {
            availOut = outRanks.filter((s) => (S.seeds[s.id] ?? 0) > 0);
            availGh = S.gh > 0 ? ghRanks.filter((s) => (S.seeds[s.id] ?? 0) > 0) : availOut;
          }
        }
      }
    }
  }
  return acts;
}

export function drainStory() {
  let guard = 0;
  while (pendingNode() && guard++ < 40) {
    advanceNode(pendingNode()!);
  }
}

/** تخصیص روزانهٔ سهم بدهی (۴۰٪ درآمد ناخالص روز) پیش از خرج‌کردن بقیه در توسعهٔ مزرعه (۶۰٪) */
function allocateDebtBudget(policy: Policy, chPaidSoFar: number, chEarnedSoFar: number, cycleIdx: number) {
  const d = debt();
  if (!d) return;
  const note = activeNote();
  if (!note || d.remaining <= 0) return;

  if (policy === 'bad') {
    if (S.coins > d.remaining * 3 && isQuestDone(note.chapter)) payDebt(Math.floor(d.remaining * 0.5));
    return;
  }

  const mp = minPay();
  const due = daysToDue();
  const keepForSeeds = Math.max(floorCoins() * 2, 250);
  const targetDebtSoFar = chEarnedSoFar * 0.396;
  const budgetNeed = Math.max(0, Math.round(targetDebtSoFar - chPaidSoFar));

  if (policy === 'normal') {
    const disciplinedThisCycle = (d.beatings ?? 0) >= 24 ? true : cycleIdx % 9 < 3;
    if (disciplinedThisCycle) {
      if (due <= 4 && d.stash > 0) stashWithdraw(d.stash);
      if (due <= 4 && d.paidThisCycle < mp) smartSell(policy, true);
      const dueNeed = due <= 4 ? Math.max(0, mp - d.paidThisCycle) : 0;
      const want = Math.max(dueNeed, budgetNeed);
      const canPay = Math.min(want, Math.max(0, S.coins - keepForSeeds));
      if (canPay > 0) payDebt(canPay);
      const nextRoom = Math.max(0, mp - d.stash);
      if (nextRoom > 0 && S.coins > keepForSeeds * 3) stashDeposit(Math.min(nextRoom, Math.floor((S.coins - keepForSeeds * 2) * 0.5)));
    } else if (due > 4 && due < 25 && budgetNeed > 0 && S.coins > keepForSeeds) {
      if (S.coins < budgetNeed + keepForSeeds) smartSell(policy, true);
      const forgetfulCap = Math.max(0, mp - 1 - d.paidThisCycle);
      const canPay = Math.min(budgetNeed, forgetfulCap, Math.max(0, S.coins - keepForSeeds));
      if (canPay > 0) payDebt(canPay);
      const stashRoom = Math.max(0, mp - d.stash);
      if (stashRoom > 0 && S.coins > keepForSeeds * 2) stashDeposit(Math.min(stashRoom, Math.floor((S.coins - keepForSeeds) * 0.6)));
    }
    return;
  }

  // خوش‌حساب و بهینه: قسط سر وقت از قلک + تخصیص منظم ۴۰٪ درآمد به تسویهٔ سند
  if (due <= 3 && d.stash > 0) stashWithdraw(d.stash);
  const minNeed = due <= 3 ? Math.max(0, mp - d.paidThisCycle) : 0;
  if (minNeed > 0 && S.coins < minNeed + keepForSeeds) smartSell(policy, true);
  const want = Math.max(minNeed, budgetNeed);
  const canPay = Math.min(want, Math.max(0, S.coins - keepForSeeds));
  if (canPay > 0) payDebt(canPay);

  // نگهداری ذخیرهٔ امن قسط بعدی در قلک تا از باج سرزده مصون بماند
  const nextInstallmentRoom = Math.max(0, mp - d.stash);
  if (nextInstallmentRoom > 0 && S.coins > keepForSeeds * 3) {
    stashDeposit(Math.min(nextInstallmentRoom, Math.floor((S.coins - keepForSeeds * 2) * 0.4)));
  }
}

function buyPhase(policy: Policy) {
  const lv = farmLevel();
  const d = debt();
  const needFeed = S.animals.length * 2 + S.ponds.length * 3;
  if (needFeed > 0 && (S.inv.feed ?? 0) < needFeed && S.coins > 120) {
    buyFeed(Math.min(needFeed - (S.inv.feed ?? 0), Math.floor((S.coins * 0.3) / 9)));
  }

  ensureQuests();
  if (policy === 'optimal' || policy === 'good') {
    for (const g of S.quests.daily) if (questDone(g)) claim(g, false);
    if (S.quests.weekly && questDone(S.quests.weekly)) claim(S.quests.weekly, true);
  } else if (policy === 'normal' && S.day % 3 === 0) {
    for (const g of S.quests.daily) if (questDone(g)) claim(g, false);
  }

  const maxBuilds = policy === 'bad' ? 1 : 2;
  if (S.builds.length >= maxBuilds) return;
  const cushion = policy === 'bad' ? 2.6 : policy === 'normal' ? 1.58 : 1.0;
  const dueSoon = d && daysToDue() <= 5 ? Math.max(0, minPay() - d.paidThisCycle) : 0;
  const reserve = policy === 'bad' ? 0 : dueSoon;
  const safeStash = d && daysToDue() > 8 && (policy === 'good' || policy === 'optimal') ? Math.floor(d.stash * 0.85) : 0;
  const avail = () => Math.max(0, S.coins + safeStash - reserve);
  const ensureCash = (need: number) => {
    if (d && S.coins < need && safeStash > 0) stashWithdraw(Math.min(safeStash, need - S.coins + 200));
  };

  for (const k of ['land', 'barn', 'hoe', 'stam', 'can'] as const) {
    const price = upgradePrice(k);
    if (price === null || upgradeLvReq(k) > lv) continue;
    if (avail() > price * cushion) { ensureCash(price); buyUpgrade(k); break; }
  }
  if (S.builds.length >= maxBuilds) return;

  if (S.workers < WORKER_MAX && WORKER_LV[S.workers] <= lv && avail() > WORKER_PRICES[S.workers] * 1.15 * cushion) buyWorker();
  if (S.rod === 0 && lv >= 3 && avail() > 1600 * cushion) buyRod();
  const penCount = PEN_KINDS.filter((k) => (S.pens[k] ?? 0) > 0).length;
  if (penCount < PEN_KINDS.length) {
    for (const k of PEN_KINDS) {
      if (!S.pens[k] && ANIMALS[k].lv <= lv && avail() > (ANIMALS[k].price * 2 + 1200) * cushion) {
        buyPen(k); break;
      }
    }
  }
  if (S.ponds.length < POND_MAX && POND_LV[S.ponds.length] <= lv && avail() > pondPrice(S.ponds.length) * cushion) {
    buyPond();
  }
  if (S.hives < HIVE_MAX && HIVE_LV[S.hives] <= lv && avail() > hivePrice(S.hives) * cushion) {
    buyHive();
  }
  if (S.gh < 2 && avail() > (S.gh === 0 ? 44000 : 145000) * cushion) buyGh();
  if (S.silo < 2 && avail() > (S.silo === 0 ? 40000 : 125000) * cushion) buySilo();
  {
    const wp = wellPrice();
    if (wp !== null && wellLvReq() <= lv && avail() > wp * cushion) buyWell();
  }
  {
    const sp = upgradePrice('soil');
    if (sp !== null && upgradeLvReq('soil') <= lv && avail() > sp * cushion) { ensureCash(sp); buyUpgrade('soil'); }
  }

  const savingForMaster = policy !== 'bad' && S.story.chapter >= 6 && (S.lv.land < 4 || S.lv.soil < 1);
  for (const id of ['sprinkler', 'harvester', 'tractor', 'seeder', 'feeder', 'collector', 'drone'] as MachineId[]) {
    const nextMk = mkOf(id) + 1;
    if (nextMk > 3 || machineMkLv(id, nextMk) > lv) continue;
    if (savingForMaster && nextMk >= 2 && Object.values(S.machines).filter((m) => (m ?? 0) >= 1).length >= 6) continue;
    const p = machineMkPrice(id, nextMk);
    if (avail() > p * cushion) { ensureCash(p); buyMachine(id); break; }
  }

  for (const k of PEN_KINDS) {
    const plv = S.pens[k] ?? 0;
    if (plv >= 1 && plv < 3 && avail() > (plv === 1 ? 3200 : 12000) * cushion) { buyPenUp(k); break; }
  }
  for (const k of ['cow', 'goat', 'sheep', 'duck', 'rabbit', 'chicken'] as AnimalKind[]) {
    if ((S.pens[k] ?? 0) > 0 && ANIMALS[k].lv <= lv && avail() > ANIMALS[k].price * 2.5 * cushion) {
      buyAnimal(k);
    }
  }

  if ((policy === 'optimal' || policy === 'good') && d && d.scarecrow < 3) {
    const sp = scarecrowPrice();
    if (avail() > sp * 2) buyScarecrow();
  }
  if (policy !== 'bad' && avail() > 800 && S.fert < 22) buyFert(policy === 'normal' ? 2 : 8);
}

function runLoop(policy: Policy, maxDays: number): SimMetrics {
  const m: SimMetrics = {
    days: 0, level30Day: null, postgameDay: null, beatings: 0, extorted: 0, paidTotal: 0,
    coins: 0, earned: 0, notesOpened: 1, chapter: 1, softLockDays: 0, maxLevel: 1,
    harvested: 0, built: 0, chapterIncome: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    chapterDays: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }, noteShare: [],
  };

  let prevGross = totalGrossEarned();
  let chStartPaid = 0;
  let lastCh = S.story.chapter;
  let stuckRun = 0;
  const actionBudget = policy === 'bad' ? 3 : policy === 'normal' ? 14 : policy === 'good' ? 13 : 16;

  for (let day = 0; day < maxDays; day++) {
    const chAtStart = S.story.chapter;
    const coinsBefore = S.coins;
    const xpBefore = S.xp;
    const remBefore = debt()?.remaining ?? 0;

    restockSeeds(policy);
    tendAnimalsAndPonds();

    for (let h = 0; h < 24; h++) {
      if (S.hour >= 6 && S.hour < 21) {
        const hasDebt = Boolean(debt());
        const budget = policy === 'good' ? (hasDebt ? 9 : 22) : actionBudget;
        const restHour = policy === 'normal' ? h % 4 === 3 : policy === 'good' && hasDebt ? h % 3 === 2 : false;
        if (S.stamina > 8 && !restHour) workPlots(budget, false, policy);
        if (S.rod > 0 && S.stamina > 40 && policy !== 'bad' && h % (policy === 'normal' ? 8 : 3) === 0) {
          S.stamina -= 4;
          addGood('fish', 1);
          addStat('fish', 1);
          addXp(XP.fish);
        }
      }
      if (Math.floor(S.hour) === 18) {
        tendAnimalsAndPonds();
        smartSell(policy, false);
      }
      advance(1);
      tickBuilds(8);
    }

    const grossNow = totalGrossEarned();
    const deltaGross = Math.max(0, grossNow - prevGross);
    prevGross = grossNow;
    const chKey = Math.min(6, Math.max(1, chAtStart));
    if (!S.story.postgame) {
      m.chapterIncome[chKey] = (m.chapterIncome[chKey] ?? 0) + deltaGross;
      m.chapterDays[chKey] = (m.chapterDays[chKey] ?? 0) + 1;
    }

    if (S.story.chapter !== lastCh) {
      lastCh = S.story.chapter;
      chStartPaid = debt()?.paidTotal ?? 0;
    }
    const chPaidSoFar = Math.max(0, (debt()?.paidTotal ?? 0) - chStartPaid);
    allocateDebtBudget(policy, chPaidSoFar, m.chapterIncome[chKey] ?? 0, Math.floor(S.day / 28));
    buyPhase(policy);

    if (debt()?.pendingVisit) clearVisit();
    checkStoryQuests();
    maybeOpenNextNote();
    drainStory();

    const afterQuestGross = totalGrossEarned();
    if (afterQuestGross > prevGross) {
      m.chapterIncome[chKey] = (m.chapterIncome[chKey] ?? 0) + (afterQuestGross - prevGross);
      prevGross = afterQuestGross;
    }

    if (S.story.postgame && m.postgameDay === null) m.postgameDay = S.day;
    m.days = m.postgameDay ?? S.day;
    m.beatings = debt()?.beatings ?? 0;
    m.extorted = debt()?.extorted ?? 0;
    m.paidTotal = debt()?.paidTotal ?? 0;
    m.coins = S.coins;
    m.earned = S.earned;
    m.notesOpened = (debt()?.noteIdx ?? 0) + 1;
    m.chapter = S.story.chapter;
    m.maxLevel = Math.max(m.maxLevel, farmLevel());
    if (m.level30Day === null && farmLevel() >= 30) m.level30Day = S.day;

    if (S.coins === coinsBefore && S.xp === xpBefore && (debt()?.remaining ?? 0) === remBefore) {
      stuckRun++;
      if (stuckRun >= 10) m.softLockDays++;
    } else stuckRun = 0;

    if ((!debt() && m.level30Day) || (m.postgameDay && m.level30Day)) break;
  }

  m.harvested = S.stats.harv ?? 0;
  m.built = S.stats.builds ?? 0;
  m.noteShare = NOTES.map((n, i) => Number((n.amount / Math.max(1, m.chapterIncome[i + 1])).toFixed(3)));
  return m;
}

export interface RunSimOpts {
  /**
   * قطب «قفل بذر» رشد مزارع ماهواره‌ای: با فعال شدن، دشت/دره به‌جای مسیر کُند خودکار
   * از مسیر سریع (قفل بذر مشخص) رشد می‌کنند. فقط برای سنجش دیاگنوستیک هر دو قطب در sim-balance.
   */
  satelliteLocks?: boolean;
}

export function runSim(policy: Policy, maxDays: number, seed: number, startDebtNow = true, opts?: RunSimOpts): SimMetrics {
  resetGame();
  setSeed(seed);
  UI.started = true;
  if (opts?.satelliteLocks) {
    // قفل‌های سازگار با تخصص هر مزرعه — رفتار کاشت بات را تغییر نمی‌دهند، فقط مسیر رشد را روشن می‌کنند
    S.farmSeeds = { farm: 'wheat', north: 'wheat', valley: 'grape' };
  }
  if (startDebtNow) {
    startDebt(0);
    S.story.chapter = 1;
    S.story.prologueSeen = true;
  }
  setSimBatchMode(true);
  try {
    return runLoop(policy, maxDays);
  } finally {
    setSimBatchMode(false);
    saveGame();
  }
}

export function runStoryBot(seed: number, maxDays = 4000): SimMetrics & { prologueDone: boolean; questsDone: number; finaleSeen: boolean } {
  resetGame();
  setSeed(seed);
  UI.started = true;
  maybeStartPrologue();
  drainStory();
  const prologueDone = !!S.debt && S.story.chapter === 1 && S.story.prologueSeen;
  setSimBatchMode(true);
  let m: SimMetrics;
  try {
    m = runLoop('normal', maxDays);
  } finally {
    setSimBatchMode(false);
    saveGame();
  }
  const questsDone = [1, 2, 3, 4, 5, 6].filter((c) => isQuestDone(c) || S.story.questDone[c]).length;
  const finaleSeen = !!S.story.seen.finale;
  return { ...m, prologueDone, questsDone, finaleSeen };
}

export const NOTES_COUNT = NOTES.length;
