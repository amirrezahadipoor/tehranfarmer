// ===== Live-clock campaign bot: real 480-second days, walking/action costs and separate sleep-spam policy =====
import {
  S, UI, catchRegionalFish, farmLevel, resetGame, saveGame, setSimBatchMode,
  sleepToMorning, tickBuilds, tickLiveClock,
} from '../src/game/state';
import { ANIMALS, FISH_STAM, HOE_SPEED } from '../src/game/data';
import { CFG } from '../src/game/settings';
import { estatePlotCenter, type FarmSceneId } from '../src/game/estates';
import { clearVisit, debt, maybeOpenNextNote, startDebt } from '../src/game/core/debt';
import { checkStoryQuests } from '../src/story/quests';
import { advanceNode, pendingNode } from '../src/story/engine';
import { NOTES } from '../src/story/debtData';
import { setSeed } from '../src/game/rng';
import {
  allocateDebtBudget, buyPhase, restockSeeds, smartSell, tendAnimalsAndPonds,
  totalGrossEarned, workPlots, type Policy, type SimMetrics,
} from './bot';

export type LivePolicy = 'normal' | 'optimal' | 'sleep-spam';

export interface LiveSimMetrics extends SimMetrics {
  policy: LivePolicy;
  seed: number;
  completed: boolean;
  wallSeconds: number;
  wallHours: number;
  worldSeconds: number;
  pausedSeconds: number;
  plotActionSeconds: number;
  actions: number;
  plotActions: number;
  menuBatches: number;
  dialogBeats: number;
  sleeps: number;
  actionSpeed: number;
  dayCap: number;
}

const ACTION_DUR: Record<string, number> = {
  till: 0.85, plant: 0.7, water: 0.8, harvest: 0.75, fert: 0.7,
};

function blankMetrics(): SimMetrics {
  return {
    days: 0, level30Day: null, postgameDay: null, beatings: 0, extorted: 0, paidTotal: 0,
    coins: 0, earned: 0, notesOpened: 1, chapter: 1, softLockDays: 0, maxLevel: 1,
    harvested: 0, built: 0, chapterIncome: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    chapterDays: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }, noteShare: [],
  };
}

/**
 * The live bot deliberately uses tickLiveClock rather than advance(h). Shop and
 * dialogue time is wall time while the game is paused; plot work also pays the
 * same walking speed and action duration used by the canvas engine.
 */
export function runLiveSim(policy: LivePolicy, maxDays: number, seed: number): LiveSimMetrics {
  resetGame();
  setSeed(seed);
  UI.started = true;
  startDebt(0);
  S.story.chapter = 1;
  S.story.prologueSeen = true;

  const basePolicy: Policy = policy === 'normal' ? 'normal' : policy === 'optimal' ? 'optimal' : 'bad';
  const previousSpeed = CFG.actionSpeed;
  CFG.actionSpeed = policy === 'optimal' ? 2 : 1;
  const m = blankMetrics();
  let wallSeconds = 0;
  let worldSeconds = 0;
  let pausedSeconds = 0;
  let plotActionSeconds = 0;
  let actions = 0;
  let plotActions = 0;
  let menuBatches = 0;
  let dialogBeats = 0;
  let sleeps = 0;
  let prevGross = totalGrossEarned();
  let chStartPaid = 0;
  let lastCh = S.story.chapter;
  let stuckRun = 0;
  const position: { farm: FarmSceneId; x: number; y: number } = { farm: 'farm', x: 398, y: 356 };

  const elapseWorld = (seconds: number) => {
    let left = Math.max(0, seconds);
    while (left > 0.0001) {
      const dt = Math.min(2, left);
      tickLiveClock(dt);
      tickBuilds(dt);
      wallSeconds += dt;
      worldSeconds += dt;
      left -= dt;
    }
  };
  const elapsePaused = (seconds: number) => {
    wallSeconds += seconds;
    pausedSeconds += seconds;
  };
  const drainLiveStory = () => {
    let guard = 0;
    const beatSeconds = policy === 'normal' ? 1.4 : policy === 'optimal' ? 0.35 : 0.1;
    while (pendingNode() && guard++ < 40) {
      advanceNode(pendingNode()!);
      dialogBeats++;
      elapsePaused(beatSeconds);
    }
  };
  const menu = (seconds: number, fn: () => void) => {
    menuBatches++;
    elapsePaused(policy === 'optimal' ? seconds * 0.55 : seconds);
    fn();
    drainLiveStory();
  };
  const plotAction = (kind: string, farm: FarmSceneId, index: number) => {
    if (position.farm !== farm) {
      elapseWorld(0.72); // actual scene transition duration
      position.farm = farm;
      position.x = farm === 'farm' ? 404 : 186;
      position.y = farm === 'farm' ? 356 : 582;
    }
    const { cx, cy } = estatePlotCenter(farm, index);
    const x = cx - 32;
    const y = cy + 26;
    const distance = Math.hypot(x - position.x, y - position.y);
    const walkSpeed = distance > 240 ? 390 : 320;
    const hoeMult = kind === 'till' ? (HOE_SPEED[S.lv.hoe] ?? 1) : 1;
    const duration = (ACTION_DUR[kind] ?? 0.75) / hoeMult;
    const seconds = (distance / walkSpeed + duration) / CFG.actionSpeed;
    elapseWorld(seconds);
    plotActionSeconds += seconds;
    position.x = x;
    position.y = y;
    actions++;
    plotActions++;
  };
  const tendLive = () => {
    const ready = S.animals.filter((a) => a.grown <= 0 && a.ready > 0).length;
    const feeding = S.animals.some((a) => ANIMALS[a.kind].eat > 0) && S.trough < 4 ? 1 : 0;
    const tasks = ready + feeding + S.ponds.length + (S.hives > 0 ? 1 : 0);
    if (tasks > 0) {
      elapseWorld(tasks * (policy === 'optimal' ? 0.55 : 1.1));
      // The old aggregate bot did not charge collection stamina; the live player does.
      S.stamina = Math.max(0, S.stamina - ready * 0.5 - feeding);
      actions += tasks;
    }
    tendAnimalsAndPonds(basePolicy);
  };
  const updateProgress = () => {
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
  };

  setSimBatchMode(true);
  try {
    for (let dayIndex = 0; dayIndex < maxDays && !S.story.postgame; dayIndex++) {
      const currentDay = S.day;
      const chAtStart = S.story.chapter;
      const coinsBefore = S.coins;
      const xpBefore = S.xp;
      const remBefore = debt()?.remaining ?? 0;

      if (policy === 'sleep-spam') {
        sleepToMorning();
        sleeps++;
        actions++;
        elapsePaused(1.2); // open farmhouse, confirm sleep, return to the scene
        if (debt()?.pendingVisit) clearVisit();
        checkStoryQuests();
        maybeOpenNextNote();
        drainLiveStory();
        updateProgress();
      } else {
        menu(2.4, () => restockSeeds(basePolicy));
        tendLive();
        let lastWorkHour = -1;
        let sold = false;
        let guard = 0;
        while (S.day === currentDay && guard++ < 220 && !S.story.postgame) {
          if (S.hour >= 6 && S.hour < 21) {
            const wholeHour = Math.floor(S.hour);
            if (wholeHour !== lastWorkHour) {
              lastWorkHour = wholeHour;
              const hasDebt = Boolean(debt());
              const budget = policy === 'optimal' ? (hasDebt ? 9 : 22) : 14;
              const restHour = policy === 'normal' && wholeHour % 4 === 3;
              if (S.stamina > 8 && !restHour) workPlots(budget, false, basePolicy, plotAction);
              if (S.rod > 0 && S.stamina > 40 && wholeHour % (policy === 'normal' ? 8 : 3) === 0) {
                elapseWorld(policy === 'optimal' ? 3.5 : 7);
                S.stamina = Math.max(0, S.stamina - FISH_STAM);
                catchRegionalFish(policy === 'optimal' ? 1.35 : 1);
                actions++;
              }
            }
          }
          if (S.day !== currentDay) break;
          if (Math.floor(S.hour) >= 18 && !sold) {
            sold = true;
            tendLive();
            menu(2.2, () => smartSell(basePolicy, false));
          }
          drainLiveStory();
          if (S.hour >= (policy === 'optimal' ? 21 : 20.5)) {
            sleepToMorning();
            sleeps++;
            actions++;
            elapsePaused(1.2);
            break;
          }
          elapseWorld(5);
        }
        if (S.day === currentDay) {
          sleepToMorning();
          sleeps++;
          elapsePaused(1.2);
        }
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
      if (policy !== 'sleep-spam') {
        const chPaidSoFar = Math.max(0, (debt()?.paidTotal ?? 0) - chStartPaid);
        menu(1.2, () => allocateDebtBudget(basePolicy, chPaidSoFar, m.chapterIncome[chKey] ?? 0, Math.floor(S.day / 28)));
        menu(3.2, () => buyPhase(basePolicy));
      }
      if (debt()?.pendingVisit) clearVisit();
      checkStoryQuests();
      maybeOpenNextNote();
      drainLiveStory();
      const afterQuestGross = totalGrossEarned();
      if (afterQuestGross > prevGross) {
        m.chapterIncome[chKey] = (m.chapterIncome[chKey] ?? 0) + (afterQuestGross - prevGross);
        prevGross = afterQuestGross;
      }
      updateProgress();
      if (S.coins === coinsBefore && S.xp === xpBefore && (debt()?.remaining ?? 0) === remBefore) {
        stuckRun++;
        if (stuckRun >= 10) m.softLockDays++;
      } else stuckRun = 0;
    }
  } finally {
    CFG.actionSpeed = previousSpeed;
    setSimBatchMode(false);
    saveGame();
  }

  m.harvested = S.stats.harv ?? 0;
  m.built = S.stats.builds ?? 0;
  m.noteShare = NOTES.map((n, i) => Number((n.amount / Math.max(1, m.chapterIncome[i + 1])).toFixed(3)));
  updateProgress();
  return {
    ...m,
    policy,
    seed,
    completed: m.postgameDay !== null,
    wallSeconds: Math.round(wallSeconds * 10) / 10,
    wallHours: Math.round((wallSeconds / 3600) * 100) / 100,
    worldSeconds: Math.round(worldSeconds * 10) / 10,
    pausedSeconds: Math.round(pausedSeconds * 10) / 10,
    plotActionSeconds: Math.round(plotActionSeconds * 10) / 10,
    actions,
    plotActions,
    menuBatches,
    dialogBeats,
    sleeps,
    actionSpeed: policy === 'optimal' ? 2 : 1,
    dayCap: maxDays,
  };
}
