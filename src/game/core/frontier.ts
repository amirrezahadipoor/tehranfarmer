// ===== Frontier Expansion Core: Multi-Layer Cavern & Forest, 8-Region Portals, Charters, Fair & Late-Game Shocks =====
import { CROP, CROPS, GOOD, HEART_BOND_2, KAVEH2_PRICE_MULT, machineMkPrice, type MachineId } from '../data';
import { S, addStat, addXp, farmLevel, grantGoodWithMailOverflow, holdCount, notify, saveGame, season, stamCap, takeHold, toast } from '../state';
import { addStanding } from './debt';
import { sfx } from '../sound';
import { CFG } from '../settings';
import { fa } from '../../strings/fa';
import { CHARTER_DEFS, DECREE_LOCALE, FT, SHOCK_LOCALE, type CharterKey, type CharterValue } from '../../strings/frontierText';
import type { SceneKey } from '../scenes';

export interface FrontierState {
  caveFloor: number;          // 1..3
  maxCaveFloor: number;       // 1..3
  forestLayer: number;        // 1..3
  maxForestLayer: number;     // 1..3
  nodesDone: Record<string, boolean>;
  /** آسانسورهایی که با پیشرفت قطعی معدن باز شده‌اند؛ با سیوهای قدیمی هم سازگار است */
  stairsFound: Record<string, boolean>;
  nodesDay: number;
  springDay: number;
  shrineDay: number;
  monoculture: Record<string, number>;
  monoWeek: number;
  decreeClaimed: Record<string, boolean>;
  fairBellSeason: number;
  fairPlayed: Record<string, number>;
  festivalTokens: number;
  charters: Partial<Record<CharterKey, CharterValue>>;
}

export function freshFrontier(): FrontierState {
  return {
    caveFloor: 1,
    maxCaveFloor: 1,
    forestLayer: 1,
    maxForestLayer: 1,
    nodesDone: {},
    stairsFound: {},
    nodesDay: 1,
    springDay: 0,
    shrineDay: 0,
    monoculture: {},
    monoWeek: 1,
    decreeClaimed: {},
    fairBellSeason: -1,
    fairPlayed: {},
    festivalTokens: 0,
    charters: {},
  };
}

export function ensureFrontier(): FrontierState {
  if (!S.frontier) S.frontier = freshFrontier();
  const f = S.frontier;
  f.caveFloor = Math.max(1, Math.min(3, f.caveFloor || 1));
  f.maxCaveFloor = Math.max(f.caveFloor, Math.min(3, f.maxCaveFloor || 1));
  f.forestLayer = Math.max(1, Math.min(3, f.forestLayer || 1));
  f.maxForestLayer = Math.max(f.forestLayer, Math.min(3, f.maxForestLayer || 1));
  f.nodesDone ??= {};
  f.stairsFound ??= {};
  // سازگاری با سِیوهای قدیمی: طبقاتی که قبلاً باز شده بودند پلهٔ شناخته‌شده دارند.
  for (let floor = 2; floor <= f.maxCaveFloor; floor++) f.stairsFound[`cave:${floor - 1}`] = true;
  f.monoculture ??= {};
  f.decreeClaimed ??= {};
  f.fairPlayed ??= {};
  f.charters ??= {};
  f.festivalTokens = Math.max(0, Math.floor(f.festivalTokens || 0));
  const curWeek = Math.floor((S.day - 1) / 7) + 1;
  if (f.nodesDay !== S.day) {
    f.nodesDone = {};
    f.nodesDay = S.day;
  }
  if (f.monoWeek !== curWeek) {
    // Decay monoculture memory smoothly each week so strategic pivots pay off right away
    const nextMono: Record<string, number> = {};
    for (const [k, v] of Object.entries(f.monoculture)) {
      if (v * 0.45 >= 4) nextMono[k] = Math.round(v * 0.45);
    }
    f.monoculture = nextMono;
    f.monoWeek = curWeek;
  }
  return f;
}

// ===== ۱. منشورهای انشعابی دهکده (پیامد ماندگار روی ظاهر جهان، دیالوگ اهالی و اقتصاد) =====
export function activeCharter(key: CharterKey): CharterValue | null {
  return ensureFrontier().charters[key] ?? null;
}

export function charterRequiredChapter(key: CharterKey): number {
  return key === 'qanat' ? 2 : key === 'bazaar' ? 3 : key === 'frontier' ? 4 : 5;
}

export function chooseVillageCharter(key: CharterKey, val: CharterValue): boolean {
  const reqCh = charterRequiredChapter(key);
  if ((S.story?.chapter ?? 1) < reqCh && !S.story?.postgame) { sfx.err(); return false; }
  const f = ensureFrontier();
  const prev = f.charters[key];
  f.charters[key] = val;
  if (!prev) {
    if (val === 'commons') addStanding(10);
    if (val === 'credit') addStanding(8);
    addXp(95);
    S.coins += 280;
  }
  const def = CHARTER_DEFS.find((c) => c.key === key);
  const isA = def?.aVal === val;
  const title = CFG.locale === 'en'
    ? (isA ? def?.aTitleEn : def?.bTitleEn) ?? val
    : (isA ? def?.aTitleFa : def?.bTitleFa) ?? val;
  sfx.fanfare();
  toast('crown', title);
  saveGame();
  notify();
  return true;
}

export function charterMachinePriceMult(): number {
  return activeCharter('qanat') === 'turbine' ? 0.88 : 1;
}

export function charterBuildDurMult(): number {
  return activeCharter('frontier') === 'quarry' ? 0.88 : 1;
}

export function charterMorningWaterBonus(): number {
  return activeCharter('qanat') === 'commons' ? 0.18 : 0;
}

export function charterInterestMult(): number {
  return activeCharter('bank') === 'credit' ? 0.7 : 1;
}

export function charterStashMult(): number {
  return activeCharter('bank') === 'credit' ? 1.4 : 1;
}

export function charterRaidMult(): number {
  return activeCharter('bank') === 'council' ? 0.5 : 1;
}

export function computeMachineMkPriceWithCharters(id: MachineId, mk: number): number {
  const base = machineMkPrice(id, mk);
  const bondMult = (S.affinity?.engineer ?? 0) >= HEART_BOND_2 ? KAVEH2_PRICE_MULT : 1;
  return Math.round(base * bondMult * charterMachinePriceMult());
}

// ===== ۲. شوک‌های اقتصادی هفتگی + اشباع تک‌کشتی + فرمان‌های سه‌ستونهٔ اواخر بازی =====
export interface RegionalShock {
  id: 'pass-snow' | 'royal-banquet' | 'silk-caravan' | 'herbal-guild';
  titleFa: string;
  titleEn: string;
  descFa: string;
  descEn: string;
  boosted: readonly string[];
  boostMult: number;
}

export const REGIONAL_SHOCKS: readonly RegionalShock[] = [
  {
    id: 'royal-banquet',
    titleFa: SHOCK_LOCALE['royal-banquet'].faTitle,
    titleEn: SHOCK_LOCALE['royal-banquet'].enTitle,
    descFa: SHOCK_LOCALE['royal-banquet'].faDesc,
    descEn: SHOCK_LOCALE['royal-banquet'].enDesc,
    boosted: ['saffron', 'pistachio', 'honey', 'truffle'],
    boostMult: 1.14,
  },
  {
    id: 'pass-snow',
    titleFa: SHOCK_LOCALE['pass-snow'].faTitle,
    titleEn: SHOCK_LOCALE['pass-snow'].enTitle,
    descFa: SHOCK_LOCALE['pass-snow'].faDesc,
    descEn: SHOCK_LOCALE['pass-snow'].enDesc,
    boosted: ['pomegranate', 'cheese', 'roe', 'turquoise', 'amber'],
    boostMult: 1.14,
  },
  {
    id: 'silk-caravan',
    titleFa: SHOCK_LOCALE['silk-caravan'].faTitle,
    titleEn: SHOCK_LOCALE['silk-caravan'].enTitle,
    descFa: SHOCK_LOCALE['silk-caravan'].faDesc,
    descEn: SHOCK_LOCALE['silk-caravan'].enDesc,
    boosted: ['rose', 'grape', 'wool', 'milk', 'quartz', 'turquoise'],
    boostMult: 1.14,
  },
  {
    id: 'herbal-guild',
    titleFa: SHOCK_LOCALE['herbal-guild'].faTitle,
    titleEn: SHOCK_LOCALE['herbal-guild'].enTitle,
    descFa: SHOCK_LOCALE['herbal-guild'].faDesc,
    descEn: SHOCK_LOCALE['herbal-guild'].enDesc,
    boosted: ['orange', 'cherry', 'herb', 'mushroom', 'truffle', 'honey'],
    boostMult: 1.15,
  },
];

export function currentRegionalShock(): RegionalShock {
  const weekIdx = Math.floor((S.day - 1) / 7);
  return REGIONAL_SHOCKS[((weekIdx % REGIONAL_SHOCKS.length) + REGIONAL_SHOCKS.length) % REGIONAL_SHOCKS.length];
}

const LUXURY_AND_CRAFT = new Set(['saffron', 'pistachio', 'rose', 'roe', 'quartz', 'turquoise', 'amber', 'truffle', 'cheese', 'honey']);

export function recordMarketSaleVolume(goodId: string, qty: number) {
  if (qty <= 0 || farmLevel() < 22) return;
  const f = ensureFrontier();
  if (CROP[goodId]) {
    f.monoculture[goodId] = (f.monoculture[goodId] ?? 0) + qty;
  }
}

export function hasMonocultureSaturation(): boolean {
  if (farmLevel() < 22) return false;
  const vals = Object.values(ensureFrontier().monoculture);
  return vals.some((v) => v >= 45);
}

/** ضریب یکپارچهٔ بازار از منشورها + شوک هفتگی + ضد-تک‌کشتی اواخر بازی */
export function frontierGoodMult(goodId: string): number {
  let m = 1;
  const bazaar = activeCharter('bazaar');
  if (bazaar === 'coop' && (CROP[goodId] || goodId === 'milk' || goodId === 'egg' || goodId === 'wool' || goodId === 'cheese')) {
    m *= 1.1;
  } else if (bazaar === 'caravan' && LUXURY_AND_CRAFT.has(goodId)) {
    m *= 1.18;
  }
  // شوک اقتصادی چرخشی از سطح ۱۴ به بعد فعال می‌شود: کالاهای منتخب هفته اوج می‌گیرند و محصولات تکراری غیراولویت افت ملایم دارند تا میانگین خنثی ولی تغییر استراتژی بسیار پرسود (+۹۰٪) باشد
  if (farmLevel() >= 14) {
    const shock = currentRegionalShock();
    if (shock.boosted.includes(goodId)) m *= shock.boostMult;
    else if ((S.debt || S.story.postgame) && CROP[goodId] && CROP[goodId].lv >= 12) m *= 0.83;
  }
  // در سطوح بالا (۲۲+) تک‌کشتی افراطی اشباع می‌شود و هم‌زمان رشته‌های متنوع پاداش ضد-اشباع می‌گیرند
  if (farmLevel() >= 22) {
    const f = ensureFrontier();
    const entries = Object.entries(f.monoculture);
    const totalCropSold = entries.reduce((acc, [, v]) => acc + v, 0);
    const myVol = f.monoculture[goodId] ?? 0;
    if (totalCropSold >= 60 && myVol > totalCropSold * 0.72) {
      m *= 0.78;
    } else if (totalCropSold >= 45 && myVol < totalCropSold * 0.2) {
      m *= 1.08;
    }
  }
  return m;
}

export interface RoyalDecreeDef {
  id: string;
  minLv: number;
  titleFa: string;
  titleEn: string;
  items: readonly { good: string; qty: number }[];
  coins: number;
  xp: number;
  tokens: number;
}

export const ROYAL_DECREES: readonly RoyalDecreeDef[] = [
  {
    id: 'decree-1',
    minLv: 6,
    titleFa: DECREE_LOCALE['decree-1'].fa,
    titleEn: DECREE_LOCALE['decree-1'].en,
    items: [{ good: 'potato', qty: 6 }, { good: 'egg', qty: 5 }, { good: 'herb', qty: 3 }],
    coins: 920,
    xp: 75,
    tokens: 2,
  },
  {
    id: 'decree-2',
    minLv: 14,
    titleFa: DECREE_LOCALE['decree-2'].fa,
    titleEn: DECREE_LOCALE['decree-2'].en,
    items: [{ good: 'saffron', qty: 4 }, { good: 'honey', qty: 4 }, { good: 'turquoise', qty: 3 }],
    coins: 3400,
    xp: 185,
    tokens: 4,
  },
  {
    id: 'decree-3',
    minLv: 22,
    titleFa: DECREE_LOCALE['decree-3'].fa,
    titleEn: DECREE_LOCALE['decree-3'].en,
    items: [{ good: 'pomegranate', qty: 6 }, { good: 'cheese', qty: 5 }, { good: 'amber', qty: 2 }, { good: 'truffle', qty: 2 }],
    coins: 9600,
    xp: 420,
    tokens: 7,
  },
];

export function decreeWeekKey(id: string): string {
  return `${Math.floor((S.day - 1) / 7) + 1}:${id}`;
}

export function fulfillRoyalDecree(id: string): boolean {
  const def = ROYAL_DECREES.find((d) => d.id === id);
  if (!def || farmLevel() < def.minLv) { sfx.err(); return false; }
  const f = ensureFrontier();
  const wk = decreeWeekKey(id);
  if (f.decreeClaimed[wk]) { sfx.err(); return false; }
  for (const req of def.items) {
    if (holdCount(req.good) < req.qty) { sfx.err(); return false; } // کولهٔ پشتی هم به‌شمار می‌آید
  }
  for (const req of def.items) takeHold(req.good, req.qty);
  const mult = (activeCharter('bazaar') === 'caravan' ? 1.18 : 1) * (activeCharter('bank') === 'council' ? 1.15 : 1);
  const gold = Math.round(def.coins * mult);
  f.decreeClaimed[wk] = true;
  f.festivalTokens += def.tokens;
  S.coins += gold;
  S.earned += gold;
  addXp(def.xp);
  addStanding(5);
  sfx.fanfare();
  toast('crown', `+${fa(gold)}`);
  saveGame();
  notify();
  return true;
}

// ===== ۳. جنگل سه‌لایه؛ معدن مهارتی در core/mining.ts مستقل است =====
export interface FrontierNodeSpot {
  idx: number;
  x: number;
  y: number;
  good: 'herb' | 'mushroom' | 'truffle';
  stam: number;
}

const FOREST_COORDS: readonly [number, number][] = [
  [292, 466], [456, 548], [628, 582], [812, 474], [956, 566], [508, 632],
];

export function activeFrontierNodes(_scene: 'forest'): FrontierNodeSpot[] {
  const layer = ensureFrontier().forestLayer;
  return FOREST_COORDS.map(([x, y], idx) => ({
    idx, x, y,
    good: layer >= 3 && idx % 2 === 1 ? 'truffle' : layer >= 2 && idx % 2 === 0 ? 'mushroom' : idx === 4 ? 'mushroom' : 'herb',
    stam: 12 + layer * 4,
  }));
}

export function isFrontierNodeHarvested(_scene: 'forest', idx: number): boolean {
  const f = ensureFrontier();
  return !!f.nodesDone[`forest:${f.forestLayer}:${idx}`];
}

export function harvestFrontierNode(scene: 'forest', idx: number): { good: string; qty: number } | null {
  const f = ensureFrontier();
  const layer = f.forestLayer;
  const key = `forest:${layer}:${idx}`;
  const spot = activeFrontierNodes(scene)[idx];
  if (!spot || f.nodesDone[key]) return null;
  if (S.stamina < spot.stam) { sfx.err(); return null; }
  S.stamina = Math.max(0, S.stamina - spot.stam);
  f.nodesDone[key] = true;
  const qty = activeCharter('frontier') === 'sanctuary' ? 2 : 1;
  grantGoodWithMailOverflow(spot.good, qty, 'grandma', scene);
  addStat('harv', qty);
  addXp(11 * layer);
  sfx.pop();
  saveGame();
  notify();
  return { good: spot.good, qty };
}

export function stepFrontierLayer(_scene: 'forest', delta: 1 | -1): boolean {
  const f = ensureFrontier();
  const cur = f.forestLayer;
  const next = cur + delta;
  if (next < 1 || next > 3) return false;
  if (delta > 0) {
    const clearedHere = [0, 1, 2, 3, 4, 5].filter((i) => f.nodesDone[`forest:${cur}:${i}`]).length;
    const unlockedAlready = f.maxForestLayer >= next;
    if (!unlockedAlready && clearedHere < 2) {
      sfx.err();
      toast('lock', FT.gladeLocked);
      return false;
    }
  }
  f.forestLayer = next;
  f.maxForestLayer = Math.max(f.maxForestLayer, next);
  sfx.step();
  saveGame();
  notify();
  return true;
}

export function useFrontierLandmark(_scene: 'forest'): boolean {
  const f = ensureFrontier();
  if (f.shrineDay === S.day) { sfx.err(); toast('water', FT.springUsed); return false; }
  f.shrineDay = S.day;
  S.stamina = Math.min(stamCap(), S.stamina + 25);
  const sn = season();
  const lvNow = farmLevel();
  const plantable = CROPS.filter((c) => c.lv <= lvNow && c.seasons.includes(sn));
  const bestCrop = plantable[plantable.length - 1]?.id ?? 'wheat';
  S.seeds[bestCrop] = (S.seeds[bestCrop] ?? 0) + 2;
  sfx.fanfare();
  toast('star', FT.shrineBlessed);
  saveGame();
  notify();
  return true;
}

// ===== ۴. جشنوارهٔ قابل‌بازی میدان شهر =====
export function isTownFestivalActive(): boolean {
  const f = ensureFrontier();
  const seasonIdx = Math.floor((S.day - 1) / 4);
  return S.day % 7 === 0 || S.event?.id === 'festival' || S.event?.id === 'yalda' || f.fairBellSeason === seasonIdx;
}

export function ringTownFestivalBell(): boolean {
  const f = ensureFrontier();
  f.fairBellSeason = Math.floor((S.day - 1) / 4);
  sfx.fanfare();
  saveGame();
  notify();
  return true;
}

export function judgeFestivalSubmission(itemIds: string[]): { score: number; rank: 1 | 2 | 3; coins: number; tokens: number } | null {
  const f = ensureFrontier();
  if (f.fairPlayed.judge === S.day) { sfx.err(); toast('star', FT.fairDoneToday); return null; }
  // تصمیم طراحی: قلم‌های داوری «تقدیم» می‌شوند (مصرف از کوله اول، بعد انبار) و کل موجودی بازیکن به‌شمار می‌آید
  const valid = itemIds.filter((id, i) => id && GOOD[id] && holdCount(id) > 0 && itemIds.indexOf(id) === i).slice(0, 3);
  if (!valid.length) { sfx.err(); return null; }
  for (const id of valid) takeHold(id, 1);
  let valSum = 0;
  const cats = new Set<string>();
  for (const id of valid) {
    valSum += GOOD[id].base;
    if (CROP[id]) cats.add('crop');
    else if (id === 'quartz' || id === 'turquoise' || id === 'amber' || id === 'herb' || id === 'mushroom' || id === 'truffle') cats.add('frontier');
    else cats.add('ranch');
  }
  const score = Math.min(100, Math.round(28 + Math.min(42, valSum / 9) + cats.size * 10));
  const rank: 1 | 2 | 3 = score >= 78 ? 1 : score >= 54 ? 2 : 3;
  const coins = rank === 1 ? 750 : rank === 2 ? 420 : 220;
  const tokens = rank === 1 ? 5 : rank === 2 ? 3 : 2;
  f.fairPlayed.judge = S.day;
  f.festivalTokens += tokens;
  S.coins += coins;
  S.earned += coins;
  addStanding(rank === 1 ? 6 : 3);
  addXp(rank === 1 ? 90 : 50);
  sfx.fanfare();
  saveGame();
  notify();
  return { score, rank, coins, tokens };
}

export function completeFestivalContest(kind: 'cauldron' | 'archery', ratio: number): { coins: number; tokens: number } | null {
  const f = ensureFrontier();
  if (f.fairPlayed[kind] === S.day) { sfx.err(); toast('star', FT.fairDoneToday); return null; }
  const safeRatio = Number.isFinite(ratio) ? ratio : 0.5;
  const clean = Math.max(0.15, Math.min(1, safeRatio));
  const coins = Math.round(180 + clean * 520);
  const tokens = clean >= 0.8 ? 4 : clean >= 0.5 ? 3 : 2;
  f.fairPlayed[kind] = S.day;
  f.festivalTokens += tokens;
  S.coins += coins;
  S.earned += coins;
  S.stamina = Math.min(stamCap(), S.stamina + 25);
  addXp(Math.round(35 + clean * 60));
  sfx.fanfare();
  saveGame();
  notify();
  return { coins, tokens };
}

export function redeemFestivalTokens(prizeId: 'elixir' | 'saffron' | 'turquoise' | 'gold'): boolean {
  const f = ensureFrontier();
  const cost = prizeId === 'gold' ? 5 : prizeId === 'turquoise' ? 4 : 3;
  if (f.festivalTokens < cost) { sfx.err(); return false; }
  f.festivalTokens -= cost;
  if (prizeId === 'elixir') { S.stamina = stamCap(); grantGoodWithMailOverflow('herb', 2, 'grandma', 'fair'); }
  else if (prizeId === 'saffron') { S.seeds.saffron = (S.seeds.saffron ?? 0) + 3; }
  else if (prizeId === 'turquoise') { grantGoodWithMailOverflow('turquoise', 2, 'engineer', 'fair'); }
  else { S.coins += 650; S.earned += 650; }
  sfx.buy();
  saveGame();
  notify();
  return true;
}

// ===== ۵. پیمایش پیوستهٔ مرزها در دنیای باز ۸ ناحیه‌ای =====
export function checkSeamlessEdgePortal(scene: SceneKey, x: number, y: number): SceneKey | null {
  if (scene === 'farm') {
    if (x >= 1228 && y >= 285 && y <= 388) return 'town';
    if (x >= 1228 && y > 430 && y <= 535) return 'valley';
    if (x <= 56 && y >= 545 && y <= 658) return 'river';
    if (y <= 218 && x >= 710 && x <= 855) return 'north';
    if (y >= 668 && x >= 255 && x <= 368) return 'apiary';
  } else if (scene === 'town') {
    if (x <= 58 && y >= 500 && y <= 652) return 'farm';
  } else if (scene === 'river') {
    if (x >= 1224 && y >= 470 && y <= 625) return 'farm';
    if (x <= 62 && y >= 475 && y <= 645) return 'cave';
  } else if (scene === 'cave') {
    if (x <= 66 && y >= 515 && y <= 660) return 'river';
  } else if (scene === 'apiary') {
    if (x >= 1224 && y >= 520 && y <= 660) return 'farm';
    if (x <= 62 && y >= 500 && y <= 660) return 'forest';
  } else if (scene === 'forest') {
    if (x <= 66 && y >= 515 && y <= 660) return 'apiary';
  } else if (scene === 'north') {
    if (x <= 62 && y >= 515 && y <= 645) return 'farm';
    if (x >= 1224 && y >= 515 && y <= 645) return 'valley';
  } else if (scene === 'valley') {
    if (x <= 62 && y >= 460 && y <= 635) return 'farm';
  }
  return null;
}
