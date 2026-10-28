// ===== کوئست‌های روزانه و هفتگی (هوشمند نسبت به پیشرفت واقعی مزرعه + دو زبانه FA/EN) =====
import { S, addStat, addXp, notify, saveGame, toast } from '../game/state';
import { CFG } from '../game/settings';
import { fa } from '../strings/fa';
import { sfx } from '../game/sound';

export type QKind = 'harvest' | 'plant' | 'collect' | 'honey' | 'pond' | 'sell' | 'build' | 'fish' | 'babies';

export interface QuestGoal { kind: QKind; target: number; reward: number; xp: number; label: string }
export interface QuestsState {
  day: number;
  week: number;
  daily: QuestGoal[];
  weekly: QuestGoal | null;
  claimed: Record<string, boolean>;
  base: Partial<Record<QKind, number>>;
  weeklyBase?: number;
}

export function metric(kind: QKind): number {
  switch (kind) {
    case 'harvest': return S.stats.harv ?? 0;
    case 'plant': return S.stats.plants ?? 0;
    case 'collect': return S.stats.collect ?? 0;
    case 'honey': return S.stats.honey ?? 0;
    case 'pond': return S.stats.pondH ?? 0;
    case 'sell': return S.earned ?? 0;
    case 'build': return S.stats.builds ?? 0;
    case 'fish': return S.stats.fish ?? 0;
    case 'babies': return S.stats.babies ?? 0;
  }
}

const DAILY_LABELS: Record<QKind, { fa: string; en: string }> = {
  harvest: { fa: 'محصول تازه برداشت کن', en: 'Harvest fresh farm crops' },
  plant: { fa: 'بذر فصل بکار', en: 'Plant seasonal seeds' },
  collect: { fa: 'محصول دام جمع کن', en: 'Gather eggs, milk, wool or cheese' },
  honey: { fa: 'عسل طلایی برداشت کن', en: 'Collect golden honey jars' },
  pond: { fa: 'حوضچهٔ ماهی را صید کن', en: 'Harvest stocked fish ponds' },
  sell: { fa: 'از فروش بازار سکه دربیاور', en: 'Earn coins selling at Market' },
  build: { fa: 'ساخت‌وساز یا ارتقا انجام بده', en: 'Complete farm builds or upgrades' },
  fish: { fa: 'از رودخانه ماهی بگیر', en: 'Catch fish at the River' },
  babies: { fa: 'تولیدمثل دام در حصار', en: 'Breed young animals in pens' },
};

const WEEKLY_LABELS: Record<string, { fa: string; en: string }> = {
  harvest: { fa: 'برداشت بزرگ هفتگی', en: 'Big Weekly Harvest' },
  plant: { fa: 'کاشت گستردهٔ هفتگی', en: 'Weekly Planting Drive' },
  sell: { fa: 'فروش بزرگ بازار', en: 'Major Market Sales' },
  collect: { fa: 'جمع‌آوری هفتگی دامستان', en: 'Weekly Barn Roundup' },
  honey: { fa: 'برداشت عسل هفتگی', en: 'Weekly Honey Harvest' },
  fish: { fa: 'صید هفتگی رودخانه', en: 'Weekly River Angling' },
};

export function questLabelOf(g: QuestGoal, week = false): string {
  const en = CFG.locale === 'en';
  if (week) return WEEKLY_LABELS[g.kind]?.[en ? 'en' : 'fa'] ?? g.label;
  if (g.kind === 'build' && g.target === 1) {
    return en ? 'Complete 1 farm build or upgrade' : 'یک ساخت‌وساز یا ارتقا کامل کن';
  }
  return DAILY_LABELS[g.kind]?.[en ? 'en' : 'fa'] ?? g.label;
}

const DAILY_POOL: Array<{ kind: QKind; tiers: number[]; reward: number; xp: number }> = [
  { kind: 'harvest', tiers: [8, 14, 22], reward: 260, xp: 25 },
  { kind: 'plant', tiers: [10, 16, 24], reward: 200, xp: 20 },
  { kind: 'collect', tiers: [4, 8, 14], reward: 240, xp: 22 },
  { kind: 'honey', tiers: [8, 18, 32], reward: 320, xp: 26 },
  { kind: 'pond', tiers: [1, 2, 3], reward: 300, xp: 24 },
  { kind: 'sell', tiers: [800, 1600, 2800], reward: 340, xp: 28 },
  { kind: 'build', tiers: [1, 1, 2], reward: 400, xp: 30 },
  { kind: 'fish', tiers: [2, 4, 7], reward: 280, xp: 24 },
  { kind: 'babies', tiers: [1, 1, 2], reward: 360, xp: 28 },
];

const WEEKLY_POOL: Array<{ kind: QKind; target: number; reward: number; xp: number }> = [
  { kind: 'harvest', target: 135, reward: 140, xp: 17 },
  { kind: 'plant', target: 155, reward: 125, xp: 16 },
  { kind: 'sell', target: 14000, reward: 160, xp: 19 },
  { kind: 'collect', target: 65, reward: 135, xp: 17 },
  { kind: 'honey', target: 85, reward: 150, xp: 18 },
  { kind: 'fish', target: 20, reward: 130, xp: 16 },
];

const weekOf = () => Math.floor((S.day - 1) / 7) + 1;
const key = (kind: QKind, week: boolean) => (week ? 'w:' : 'd:') + kind;

function snapshot(kinds: QKind[]) {
  const base: Partial<Record<QKind, number>> = {};
  for (const k of kinds) base[k] = metric(k);
  return base;
}

function hasBreedingPair(): boolean {
  const byKind = new Map<string, { m: boolean; f: boolean }>();
  for (const a of S.animals) {
    if (a.grown > 0) continue;
    const cur = byKind.get(a.kind) ?? { m: false, f: false };
    if (a.sex === 'm') cur.m = true;
    else cur.f = true;
    if (cur.m && cur.f) return true;
    byKind.set(a.kind, cur);
  }
  return false;
}

function isKindUnlocked(kind: QKind): boolean {
  if (kind === 'honey') return S.hives > 0;
  if (kind === 'pond') return S.ponds.length > 0;
  if (kind === 'fish') return S.rod > 0;
  if (kind === 'collect') return S.animals.some((a) => a.sex === 'f' && a.grown <= 0);
  if (kind === 'babies') return hasBreedingPair();
  return true;
}

export function ensureQuests(force = false, shouldNotify = false) {
  if (!S.quests) return;
  const q = S.quests;
  const needDaily = force || q.day !== S.day || q.daily.length === 0;
  const needWeekly = force || q.week !== weekOf() || !q.weekly;
  if (!needDaily && !needWeekly) return;
  if (needDaily) {
    const avail = DAILY_POOL.filter((p) => isKindUnlocked(p.kind));
    const triples: [number, number, number][] = [];
    for (let i = 0; i < avail.length; i++) {
      for (let j = i + 1; j < avail.length; j++) {
        for (let k = j + 1; k < avail.length; k++) triples.push([i, j, k]);
      }
    }
    const dayZero = Math.max(0, S.day - 1);
    const step = triples.length === 84 ? 23 : 7;
    const idx = (dayZero * step) % triples.length;
    const epoch = Math.floor(dayZero / triples.length);
    const picks = triples[idx].map((ti) => avail[ti]);
    const tier = Math.min(2, Math.floor(dayZero / 30));
    const progMult = 1 + Math.min(4, Math.floor(dayZero / 70)) * 0.14;
    q.daily = picks.map((p) => {
      const target = p.kind === 'sell'
        ? p.tiers[tier] + epoch * 200 + (S.day % 3) * 100
        : p.kind === 'build' || p.kind === 'babies'
          ? p.tiers[tier] + Math.min(1, epoch)
          : p.tiers[tier] + epoch * 3 + (S.day % 3);
      const g: QuestGoal = {
        kind: p.kind,
        target,
        reward: Math.round((p.reward + tier * 120 + epoch * 20) * progMult),
        xp: Math.round((p.xp + tier * 12) * progMult),
        get label() { return questLabelOf(g, false); },
      };
      return g;
    });
    q.day = S.day;
    q.claimed = Object.fromEntries(Object.entries(q.claimed).filter(([k]) => k.startsWith('w:')));
    q.base = { ...snapshot(q.daily.map((d) => d.kind)) };
  }
  if (needWeekly) {
    const wAvail = WEEKLY_POOL.filter((p) => isKindUnlocked(p.kind));
    const p = wAvail[(weekOf() - 1) % wAvail.length];
    const wMult = 1 + Math.min(4, Math.floor((weekOf() - 1) / 10)) * 0.16;
    const wg: QuestGoal = {
      kind: p.kind,
      target: p.target,
      reward: Math.round(p.reward * wMult),
      xp: Math.round(p.xp * wMult),
      get label() { return questLabelOf(wg, true); },
    };
    q.weekly = wg;
    q.week = weekOf();
    q.weeklyBase = metric(p.kind);
    q.claimed = Object.fromEntries(Object.entries(q.claimed).filter(([k]) => !k.startsWith('w:')));
  }
  if (shouldNotify && (needDaily || needWeekly)) notify();
}

export function questProgress(g: QuestGoal, week = false): number {
  if (!S.quests) return 0;
  const isWeek = week || g === S.quests.weekly;
  const base = isWeek
    ? (S.quests.weeklyBase ?? S.quests.base[g.kind] ?? metric(g.kind))
    : (S.quests.base[g.kind] ?? metric(g.kind));
  return Math.max(0, metric(g.kind) - base);
}

export const questDone = (g: QuestGoal, week = false) => questProgress(g, week) >= g.target;

export function claim(g: QuestGoal, week = false): boolean {
  if (!S.quests) return false;
  const k = key(g.kind, week) + ':' + g.target;
  const en = CFG.locale === 'en';
  if (S.quests.claimed[k]) { toast('star', en ? 'Already claimed' : 'قبلاً گرفته‌ای'); sfx.err(); return false; }
  if (!questDone(g, week)) { toast('star', en ? 'Quest not finished yet' : 'هنوز کامل نشده'); sfx.err(); return false; }
  S.quests.claimed[k] = true;
  S.coins += g.reward;
  addXp(g.xp);
  addStat('quests', 1);
  toast('star', en ? `Quest reward: +${fa(g.reward)} coins` : `پاداش کوئست: ${fa(g.reward)} سکه`);
  sfx.coin();
  saveGame(); notify();
  return true;
}

export const isClaimed = (g: QuestGoal, week = false) => !!S.quests?.claimed[key(g.kind, week) + ':' + g.target];

export function freshQuests(): QuestsState {
  return { day: 0, week: 0, daily: [], weekly: null, claimed: {}, base: {} };
}

export function tickQuests() { ensureQuests(false, true); }
