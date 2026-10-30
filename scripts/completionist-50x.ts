import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  S, UI, advance, buySeed, buyUpgrade, buyMachine, buyPen, buyPenUp, buyGh, buySilo, buyPond, buyHive, buyWell,
  orderScarecrow, catchRegionalFish, farmLevel, mkOf, ownedFarms, plotsForFarm,
  resetGame, sellAnimal, setSimBatchMode, sleepToMorning, tickBuilds, upgradePrice, season,
} from '../src/game/state';
import {
  CROPS, FISH_STAM, HIVE_MAX, MACHINE_LIST, PEN_CAP_LV, PEN_KINDS, POND_MAX, WORKER_MAX,
} from '../src/game/data';
import { debt, maybeOpenNextNote, stashWithdraw } from '../src/game/core/debt';
import { checkStoryQuests, isQuestDone } from '../src/story/quests';
import { maybeStartPrologue, openPendingDebtVisit } from '../src/story/engine';
import { drainStory, restockSeeds, smartSell, tendAnimalsAndPonds, workPlots, allocateDebtBudget, buyPhase } from './bot';
import { claim, ensureQuests, isClaimed, questDone, type QKind } from '../src/story/dailyQuests';
import { NPC_QUEST_SPECS, isNpcQuestReadyToStart, isNpcQuestReadyToTurnIn } from '../src/story/npcQuests';
import { talkToShopkeeper } from '../src/story/engine';
import { setSeed } from '../src/game/rng';
import type { ShopId } from '../src/game/shops';
import { ARTISAN_RECIPES, craftArtisan } from '../src/game/core/artisan';

const OUT = process.env.AUDIT_OUT ?? path.resolve(process.cwd(), '../tehranfarmer-review/completionist-latest');
mkdirSync(OUT, { recursive: true });
const POLICY = process.env.POLICY === 'good' ? 'good' : 'optimal';
const SEED = Number(process.env.SEED ?? 505050);
const DAILY: QKind[] = ['harvest', 'plant', 'collect', 'honey', 'pond', 'sell', 'build', 'fish', 'babies'];
const WEEKLY = [...DAILY];
const dailyClaimed = new Set<QKind>();
const weeklyClaimed = new Set<QKind>();
const snapshots: Array<Record<string, unknown>> = [];
const anomalies: Array<Record<string, unknown>> = [];
const affinityBefore = new Map<string, number>();
const affinityLogged = new Set<string>();
const shopFor = { grandma: 'seed', sara: 'market', engineer: 'work', rancher: 'animal' } as const;
let snapshotIndex = 0;
let previousChapter = -1;
const scheduledDaySnapshots = new Set([2, 8, 15, 29, 60, 120, 240, 480, 960]);
const takenDaySnapshots = new Set<number>();
let previousLevelBand = 0;
let postgameSnapshot = false;
let npcSnapshot = false;
let equipmentSnapshot = false;
let lastDayWithProgress = 1;
let lastSignature = '';
let debtVisitCapture: Record<string, unknown> | null = null;

function snapshot(label: string) {
  const id = `${String(snapshotIndex++).padStart(2, '0')}-${label}`;
  writeFileSync(path.join(OUT, `${id}.json`), JSON.stringify(S));
  snapshots.push({
    id, file: `${id}.json`, day: S.day, hour: S.hour, chapter: S.story.chapter,
    level: farmLevel(), coins: Math.floor(S.coins), earned: Math.floor(S.earned),
    storyQuests: [1, 2, 3, 4, 5, 6].filter((c) => isQuestDone(c) || S.story.questDone[c]).length,
    npcQuests: NPC_QUEST_SPECS.filter((q) => S.story.seen[`${q.id}-done`]).length,
    dailyTypes: [...dailyClaimed], weeklyTypes: [...weeklyClaimed],
    machines: Object.fromEntries(MACHINE_LIST.map((m) => [m, mkOf(m)])),
    upgrades: { ...S.lv }, builds: S.builds.length,
  });
}

function claimAvailable() {
  ensureQuests();
  for (const g of S.quests.daily) {
    if (questDone(g) && !isClaimed(g)) claim(g, false);
    if (isClaimed(g)) dailyClaimed.add(g.kind);
  }
  if (S.quests.weekly) {
    if (questDone(S.quests.weekly, true) && !isClaimed(S.quests.weekly, true)) claim(S.quests.weekly, true);
    if (isClaimed(S.quests.weekly, true)) weeklyClaimed.add(S.quests.weekly.kind);
  }
}

function craftForQuest() {
  if (S.story.seen['npc-q-sara-3-done'] || farmLevel() < 12) return;
  for (const recipe of ARTISAN_RECIPES) craftArtisan(recipe.id, 1);
}

function talkForQuests() {
  // هر NPC فقط وقتی واقعاً مأموریتِ قابل‌پذیرش/تحویل دارد؛ مسیر همان گفت‌وگوی داخل‌فروشگاه است.
  for (let pass = 0; pass < 2; pass++) {
    let acted = false;
    for (const q of NPC_QUEST_SPECS) {
      if (!isNpcQuestReadyToStart(q) && !isNpcQuestReadyToTurnIn(q)) continue;
      const shop = shopFor[q.who] as ShopId;
      UI.scene = 'town'; UI.activeShop = shop; UI.shopPanel = 'lobby'; UI.modal = 'shop'; UI.afterModal = 'shop';
      affinityBefore.set(q.id, S.affinity?.[q.who] ?? 0);
      talkToShopkeeper(shop);
      drainStory();
      UI.modal = null; UI.afterModal = null; UI.scene = 'farm';
      if (S.story.seen[`${q.id}-done`] && !affinityLogged.has(q.id)) {
        affinityLogged.add(q.id);
        const before = affinityBefore.get(q.id) ?? 0;
        const after = S.affinity?.[q.who] ?? 0;
        if (after - before < 10) anomalies.push({ type: 'NPC_QUEST_AFFINITY_NOT_GRANTED', quest: q.id, before, after, day: S.day });
      }
      acted = true;
    }
    if (!acted) break;
  }
}

function buyOneWeeklyBuild(): boolean {
  const actions: Array<() => void> = [
    ...(['bag', 'barn', 'hoe', 'can', 'stam', 'soil', 'land'] as const).map((k) => () => buyUpgrade(k)),
    ...MACHINE_LIST.map((id) => () => buyMachine(id)),
    ...PEN_KINDS.map((kind) => () => buyPen(kind)),
    ...PEN_KINDS.map((kind) => () => buyPenUp(kind)),
    buyGh, buySilo, buyPond, buyHive, buyWell, orderScarecrow,
  ];
  for (const action of actions) {
    const before = S.builds.length;
    action();
    if (S.builds.length > before) return true;
  }
  return false;
}

function manageQuestFocus() {
  ensureQuests();
  const weekly = S.quests.weekly;
  if (weekly?.kind === 'build' && !isClaimed(weekly, true)) {
    if (process.env.QUEST_TRACE) console.error('BUILD_TRACE', JSON.stringify({ day: S.day, target: weekly.target, base: S.quests.weeklyBase, builds: S.stats.builds ?? 0, queued: S.builds.length, coins: Math.floor(S.coins), level: farmLevel() }));
    if ((debt()?.stash ?? 0) > 0) stashWithdraw(debt()!.stash);
    smartSell(POLICY, true);
    // تمرکز completionist روی همان هدف: خرید و پایان واقعی چند ساخت در هفته،
    // بدون تزریق پول/آمار یا تغییر ظرفیت و قیمت production.
    for (let i = 0; i < 12 && !questDone(weekly); i++) {
      if (!buyOneWeeklyBuild()) break; // در بودجهٔ فعلی خرید تازه‌ای ممکن نبود؛ روز بعد دوباره تلاش می‌کنیم.
      tickBuilds(50);
    }
    if (process.env.QUEST_TRACE) console.error('BUILD_AFTER', JSON.stringify({ day: S.day, builds: S.stats.builds ?? 0, queued: S.builds.map((b) => b.key), coins: Math.floor(S.coins), lv: S.lv, machines: S.machines, debt: debt() ? { remaining: debt()!.remaining, paidThisCycle: debt()!.paidThisCycle, stash: debt()!.stash } : null }));
  }
  const plantFocus = S.quests.daily.some((g) => g.kind === 'plant' && !isClaimed(g)) || (weekly?.kind === 'plant' && !isClaimed(weekly, true));
  if (plantFocus) {
    const fast = CROPS.filter((c) => c.days <= 2 && c.lv <= farmLevel() && c.seasons.includes(season())).sort((a, b) => a.days - b.days)[0];
    if (fast) {
      buySeed(fast.id, Math.max(0, 220 - (S.seeds[fast.id] ?? 0)));
      for (const farm of ownedFarms()) (S.farmSeeds ??= {})[farm] = fast.id;
    }
  } else {
    for (const farm of ownedFarms()) if (S.farmSeeds?.[farm]) S.farmSeeds[farm] = 'auto';
  }
  if (weekly?.kind === 'babies' && !isClaimed(weekly, true)) {
    // برای هدف تولیدمثل، با فروش واقعی دام اضافی و حفظ یک نر و یک ماده، جای نوزاد باز می‌شود.
    for (const kind of PEN_KINDS) {
      while (S.animals.filter((a) => a.kind === kind).length > 4) {
        const females = S.animals.filter((a) => a.kind === kind && a.sex === 'f' && a.grown <= 0).length;
        const males = S.animals.filter((a) => a.kind === kind && a.sex === 'm' && a.grown <= 0).length;
        const sex = females > 1 && females >= males ? 'f' : males > 1 ? 'm' : null;
        if (!sex || !sellAnimal(kind, sex)) break;
      }
    }
  }
}

function ensureShopIntros() {
  for (const shop of ['seed', 'market', 'work', 'animal'] as const) {
    UI.scene = 'town'; UI.activeShop = shop; UI.shopPanel = 'lobby'; UI.modal = 'shop'; UI.afterModal = 'shop';
    talkToShopkeeper(shop); drainStory();
    UI.modal = null; UI.afterModal = null; UI.scene = 'farm';
  }
}

function equipmentStatus() {
  const upgradeKeys = ['hoe', 'can', 'bag', 'stam', 'land', 'soil', 'barn'] as const;
  const missing: string[] = [];
  for (const k of upgradeKeys) if (upgradePrice(k) !== null) missing.push(`upgrade:${k}:${S.lv[k]}`);
  for (const m of MACHINE_LIST) if (mkOf(m) < 3) missing.push(`machine:${m}:${mkOf(m)}`);
  if (S.wellLv < 3) missing.push(`well:${S.wellLv}`);
  if (S.workers < WORKER_MAX) missing.push(`workers:${S.workers}`);
  if (S.gh < 2) missing.push(`greenhouse:${S.gh}`);
  if (S.silo < 2) missing.push(`silo:${S.silo}`);
  if (S.ponds.length < POND_MAX) missing.push(`ponds:${S.ponds.length}`);
  if (S.hives < HIVE_MAX) missing.push(`hives:${S.hives}`);
  if (S.rod < 1) missing.push('rod');
  for (const k of PEN_KINDS) if ((S.pens[k] ?? 0) < 3) missing.push(`pen:${k}:${S.pens[k] ?? 0}`);
  if (S.builds.length) missing.push(`queued-builds:${S.builds.length}`);
  return { complete: missing.length === 0, missing };
}

function numericAudit() {
  const nums = [S.coins, S.xp, S.stamina, S.fert, S.can, S.trough, S.earned, ...Object.values(S.inv), ...Object.values(S.seeds), ...Object.values(S.pack)];
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) anomalies.push({ type: 'INVALID_NUMBER', day: S.day });
  for (const farm of ownedFarms()) {
    for (const [i, p] of plotsForFarm(farm).entries()) {
      if (![0, 1, 2].includes(p.st) || (p.st === 2 && !p.crop) || !Number.isFinite(p.prog) || p.prog < 0) anomalies.push({ type: 'INVALID_PLOT', day: S.day, farm, plot: i });
    }
  }
}

resetGame();
setSeed(SEED);
UI.started = true;
setSimBatchMode(true);
maybeStartPrologue();
drainStory();
ensureShopIntros();
snapshot('start');

const maxDays = Number(process.env.MAX_DAYS ?? 5000);
let prevGross = S.earned;
let chStartPaid = 0;
let lastChapterForBudget = S.story.chapter;
let chapterIncome: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
let completionDay: number | null = null;

for (let dayIndex = 0; dayIndex < maxDays; dayIndex++) {
  const currentDay = S.day;
  const chAtStart = Math.max(1, Math.min(6, S.story.chapter));
  restockSeeds(POLICY);
  tendAnimalsAndPonds(POLICY);
  craftForQuest();
  claimAvailable();
  manageQuestFocus();
  talkForQuests();

  for (let h = 0; h < 24 && S.day === currentDay; h++) {
    if (openPendingDebtVisit()) drainStory();
    if (S.hour >= 6 && S.hour < 21) {
      if (S.stamina > 8) workPlots(22, false, POLICY);
      if (S.rod > 0 && S.stamina > 40 && h % 3 === 0) {
        S.stamina = Math.max(0, S.stamina - FISH_STAM);
        catchRegionalFish(1.25);
      }
    }
    if (Math.floor(S.hour) === 18) {
      tendAnimalsAndPonds(POLICY);
      smartSell(POLICY, false);
    }
    if (S.hour >= 18) claimAvailable(); // پیش از ریست نیمه‌شب، پاداش همان روز گرفته می‌شود
    advance(1);
    tickBuilds(8);
    drainStory();
  }
  if (S.day === currentDay) sleepToMorning();

  chapterIncome[chAtStart] = (chapterIncome[chAtStart] ?? 0) + Math.max(0, S.earned - prevGross);
  prevGross = S.earned;
  if (S.story.chapter !== lastChapterForBudget) {
    lastChapterForBudget = S.story.chapter;
    chStartPaid = debt()?.paidTotal ?? 0;
  }
  const chPaidSoFar = Math.max(0, (debt()?.paidTotal ?? 0) - chStartPaid);
  allocateDebtBudget(POLICY, chPaidSoFar, chapterIncome[chAtStart] ?? 0, Math.floor(S.day / 28));
  buyPhase(POLICY);
  // بات پایه bag را در اولویت ندارد؛ این هارنس آن را با پول واقعی و همان ساخت‌وساز بازی می‌خرد.
  if (S.builds.length < 2) {
    const bagPrice = upgradePrice('bag');
    if (bagPrice !== null && S.coins > bagPrice * 1.15) buyUpgrade('bag');
  }
  claimAvailable();
  talkForQuests();
  if (debt()?.pendingVisit) {
    if (!debtVisitCapture) {
      debtVisitCapture = { file: 'debt-visit.json', day: S.day, hour: S.hour, kind: debt()!.pendingVisit, lastVisit: debt()!.lastVisit };
      writeFileSync(path.join(OUT, 'debt-visit.json'), JSON.stringify(S));
    }
  }
  checkStoryQuests();
  maybeOpenNextNote();
  drainStory();
  tickBuilds(50); // اجرای تسریعی هارنس؛ منطق پایان ساخت تغییر نمی‌کند

  const equipment = equipmentStatus();
  const npcDone = NPC_QUEST_SPECS.filter((q) => S.story.seen[`${q.id}-done`]).length;
  const storyDone = [1, 2, 3, 4, 5, 6].filter((c) => isQuestDone(c) || S.story.questDone[c]).length;
  const levelBand = Math.floor(farmLevel() / 10);
  if (S.story.chapter !== previousChapter) { snapshot(`chapter-${S.story.chapter}`); previousChapter = S.story.chapter; }
  if (scheduledDaySnapshots.has(S.day) && !takenDaySnapshots.has(S.day)) { snapshot(`day-${S.day}`); takenDaySnapshots.add(S.day); }
  if (levelBand !== previousLevelBand) { snapshot(`level-${farmLevel()}`); previousLevelBand = levelBand; }
  if (S.story.postgame && !postgameSnapshot) { snapshot('postgame'); postgameSnapshot = true; }
  if (npcDone === NPC_QUEST_SPECS.length && !npcSnapshot) { snapshot('all-npc-quests'); npcSnapshot = true; }
  if (equipment.complete && !equipmentSnapshot) { snapshot('all-equipment'); equipmentSnapshot = true; }

  const signature = `${S.coins.toFixed(1)}:${S.xp}:${storyDone}:${npcDone}:${equipment.missing.join(',')}:${dailyClaimed.size}:${weeklyClaimed.size}`;
  if (signature !== lastSignature) { lastSignature = signature; lastDayWithProgress = S.day; }
  if (S.day - lastDayWithProgress === 120) anomalies.push({ type: 'NO_COMPLETION_PROGRESS_120_DAYS', day: S.day, equipment, daily: [...dailyClaimed], weekly: [...weeklyClaimed], npcDone });
  numericAudit();

  const allDone = S.story.postgame && storyDone === 6 && npcDone === NPC_QUEST_SPECS.length &&
    equipment.complete && weeklyClaimed.size === WEEKLY.length && dailyClaimed.size === DAILY.length;
  if (allDone) { completionDay = S.day; break; }
}

setSimBatchMode(false);
snapshot('final');
const equipment = equipmentStatus();
const report = {
  schema: 2,
  seed: SEED,
  policy: POLICY,
  acceleration: '50x audit harness; production UI.speed remains locked at 1x',
  completionDay,
  finalDay: S.day,
  level: farmLevel(),
  coins: Math.floor(S.coins),
  earned: Math.floor(S.earned),
  storyQuests: [1, 2, 3, 4, 5, 6].filter((c) => isQuestDone(c) || S.story.questDone[c]),
  npcQuestsDone: NPC_QUEST_SPECS.filter((q) => S.story.seen[`${q.id}-done`]).map((q) => q.id),
  npcQuestsMissing: NPC_QUEST_SPECS.filter((q) => !S.story.seen[`${q.id}-done`]).map((q) => q.id),
  dailyClaimed: [...dailyClaimed], dailyMissing: DAILY.filter((k) => !dailyClaimed.has(k)),
  weeklyClaimed: [...weeklyClaimed], weeklyMissing: WEEKLY.filter((k) => !weeklyClaimed.has(k)),
  equipment,
  animalCounts: Object.fromEntries(PEN_KINDS.map((k) => [k, { count: S.animals.filter((a) => a.kind === k).length, cap: PEN_CAP_LV[S.pens[k] ?? 0] ?? 0 }])),
  stats: S.stats,
  anomalies,
  debtVisitCapture,
  snapshots,
};
writeFileSync(path.join(OUT, 'completionist-report.json'), JSON.stringify(report, null, 2));
writeFileSync(path.join(OUT, 'completionist-anomalies.json'), JSON.stringify(anomalies, null, 2));
console.log(JSON.stringify({ ...report, snapshots: snapshots.map((s) => s.id), stats: undefined }, null, 2));
if (completionDay === null) process.exitCode = 2;
