// ===== مسیر استادی postgame: اهداف متنوع و پاداش‌های یک‌باره برای رسیدن به سقف سطح =====
import { S, addXp, farmLevel, notify, saveGame, toast } from '../state';
import { sfx } from '../sound';
import { xpRewardMultiplier } from './progress';
import { masteryCopy, masteryGoalText, masteryMilestoneText } from '../../strings/masteryText';

export const MASTERY_METRICS = ['cropHarv', 'quests', 'fish', 'pondH', 'collect', 'honey', 'babies', 'artisan', 'contracts', 'mineGems', 'builds'] as const;
export type MasteryMetric = (typeof MASTERY_METRICS)[number];

export interface MasteryState {
  startedDay: number;
  base: Record<string, number>;
  claimed: Record<string, boolean>;
}

export interface MasteryGoal {
  key: string;
  kind: 'metric' | 'secrets' | 'claimed';
  target: number;
  metric?: MasteryMetric;
}

export interface MasteryDef {
  id: string;
  level: number;
  icon: string;
  goals: MasteryGoal[];
  coins: number;
  /** XP پایه؛ ضریب فعلیِ پاداش هنگام دریافت اعمال و در UI هم واقعی نمایش داده می‌شود. */
  xp: number;
}

const metric = (id: MasteryMetric, target: number): MasteryGoal => ({ key: `metric:${id}`, kind: 'metric', metric: id, target });
const secrets = (target: number): MasteryGoal => ({ key: 'secrets', kind: 'secrets', target });
const claimed = (target: number): MasteryGoal => ({ key: 'claimed', kind: 'claimed', target });

export const MASTERY_DEFS: MasteryDef[] = [
  { id: 'harvest', level: 18, icon: 'sickle', coins: 10000, xp: 8000, goals: [metric('cropHarv', 80), metric('quests', 2)] },
  { id: 'water', level: 19, icon: 'fish', coins: 12000, xp: 10000, goals: [metric('fish', 12), metric('pondH', 2)] },
  { id: 'ranch', level: 20, icon: 'nest', coins: 15000, xp: 12000, goals: [metric('collect', 25), metric('honey', 20), metric('babies', 1)] },
  { id: 'artisan', level: 22, icon: 'saffron', coins: 18000, xp: 14000, goals: [metric('artisan', 8), metric('contracts', 2)] },
  { id: 'frontier', level: 24, icon: 'hammer', coins: 20000, xp: 16000, goals: [metric('mineGems', 25), metric('builds', 2)] },
  { id: 'community', level: 26, icon: 'scroll', coins: 25000, xp: 18000, goals: [secrets(4), metric('quests', 5)] },
  { id: 'legacy', level: 28, icon: 'trophy', coins: 50000, xp: 20000, goals: [claimed(6), secrets(5)] },
];

function metricValue(id: MasteryMetric): number {
  return Math.max(0, S.stats[id] ?? 0);
}

function snapshot(): Record<string, number> {
  const base: Record<string, number> = {};
  for (const id of MASTERY_METRICS) base[id] = metricValue(id);
  return base;
}

function validState(value: unknown): value is MasteryState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as Partial<MasteryState>;
  return Number.isFinite(state.startedDay) && !!state.base && typeof state.base === 'object' && !Array.isArray(state.base)
    && !!state.claimed && typeof state.claimed === 'object' && !Array.isArray(state.claimed);
}

/**
 * سیوهای postgame قدیمی مبنای صفر نمی‌گیرند؛ در نخستین استفاده، آمار فعلی مبنا
 * می‌شود تا اهداف تازه واقعاً بازی شوند و همهٔ پاداش‌ها یک‌جا مجانی داده نشوند.
 */
export function ensureMastery(): MasteryState | null {
  if (!S.story.postgame) return null;
  const raw: unknown = S.mastery;
  let state: MasteryState;
  if (!validState(raw)) {
    const previous = raw && typeof raw === 'object' && 'claimed' in raw
      ? (raw as { claimed?: Record<string, boolean> }).claimed ?? {}
      : {};
    const cleanClaimed: Record<string, boolean> = {};
    for (const def of MASTERY_DEFS) if (previous[def.id]) cleanClaimed[def.id] = true;
    state = { startedDay: S.day, base: snapshot(), claimed: cleanClaimed };
    S.mastery = state;
  } else {
    state = raw;
  }
  for (const id of MASTERY_METRICS) {
    if (!Number.isFinite(state.base[id])) state.base[id] = metricValue(id);
  }
  return state;
}

export function startMastery(): MasteryState | null {
  return ensureMastery();
}

export function masteryClaimedCount(): number {
  const state = ensureMastery();
  if (!state) return 0;
  return MASTERY_DEFS.filter((def) => state.claimed[def.id]).length;
}

export function masteryGoalProgress(goal: MasteryGoal): number {
  const state = ensureMastery();
  if (!state) return 0;
  if (goal.kind === 'secrets') return Object.values(S.secrets ?? {}).filter(Boolean).length;
  if (goal.kind === 'claimed') return masteryClaimedCount();
  const id = goal.metric!;
  const current = metricValue(id);
  if (!Number.isFinite(state.base[id])) state.base[id] = current;
  return Math.max(0, current - state.base[id]);
}

export function masteryGoalDone(goal: MasteryGoal): boolean {
  return masteryGoalProgress(goal) >= goal.target;
}

export function masteryProgress(def: MasteryDef): number {
  if (!def.goals.length) return 1;
  return def.goals.reduce((sum, goal) => sum + Math.min(1, masteryGoalProgress(goal) / Math.max(1, goal.target)), 0) / def.goals.length;
}

export function masteryStatus(def: MasteryDef) {
  const state = ensureMastery();
  const isClaimed = !!state?.claimed[def.id];
  const levelOk = farmLevel() >= def.level;
  const goalsOk = def.goals.every(masteryGoalDone);
  return { claimed: isClaimed, levelOk, goalsOk, ready: !isClaimed && levelOk && goalsOk };
}

export function masteryXpReward(def: MasteryDef): number {
  return Math.round(def.xp * xpRewardMultiplier());
}

export function claimMastery(id: string): boolean {
  const def = MASTERY_DEFS.find((item) => item.id === id);
  const state = ensureMastery();
  if (!def || !state || state.claimed[id]) return false;
  const status = masteryStatus(def);
  if (!status.ready) { sfx.err(); return false; }
  state.claimed[id] = true;
  const xp = masteryXpReward(def);
  S.coins += def.coins;
  addXp(def.xp);
  toast('medal', masteryCopy().rewardToast(masteryMilestoneText(id), def.coins, xp));
  sfx.coin();
  saveGame();
  notify();
  return true;
}

export function nextMastery(): MasteryDef | null {
  const state = ensureMastery();
  if (!state) return null;
  return MASTERY_DEFS.find((def) => !state.claimed[def.id]) ?? null;
}

export function masteryGoalLabel(goal: MasteryGoal): string {
  return masteryGoalText(goal.key);
}
