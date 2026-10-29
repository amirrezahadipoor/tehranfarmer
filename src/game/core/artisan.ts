// ===== سیستم‌های تنوع گیم‌پلی و حذف کارهای تکراری: پاتیل فرآوری روستایی، شعاع ضربهٔ ابزار (AoE) و مدیریت یک‌جا =====
import { POND_GROW_DAYS, XP } from '../data';
import { ESTATES } from '../estates';
import { S, UI, activeFarm, addGood, addPack, addStat, addXp, checkAch, feedPond, goodPrice, harvestPond, invCap, invCount, notify, saveGame, stamCap, stockPond, toast } from '../state';
import { addStanding } from './debt';
import { ensureQuests, isClaimed, questDone, type QuestGoal } from '../../story/dailyQuests';
import { sfx } from '../sound';
import { fa } from '../../strings/fa';
import { GT } from '../../strings/gameText';
import { UT } from '../../strings/uiText';
import { WX } from '../../strings/worldExpansionText';
import { FT } from '../../strings/frontierText';

export interface ArtisanRecipe {
  id:
    | 'homestead-feed' | 'village-bread' | 'tabriz-cheese' | 'kashan-syrup' | 'yalda-nectar' | 'caspian-feast'
    | 'rudbar-olive' | 'malayer-grape' | 'spring-jam' | 'royal-baklava' | 'saveh-pomegranate' | 'orchard-lavashak'
    | 'shiraz-citrus' | 'garden-torshi' | 'herbal-elixir' | 'turquoise-amulet';
  icon: string;
  name: string;
  sub: string;
  inputs: Array<[goodId: string, qty: number]>;
  mult: number;
  staminaGain: number;
  standingGain: number;
  feedOut: number;
  xp: number;
}

export const ARTISAN_RECIPES: ArtisanRecipe[] = [
  {
    id: 'homestead-feed', icon: 'feed',
    get name() { return UT.recFeedName; }, get sub() { return UT.recFeedSub; },
    inputs: [['wheat', 2]], mult: 0, staminaGain: 0, standingGain: 0, feedOut: 7, xp: 10,
  },
  {
    id: 'village-bread', icon: 'wheat',
    get name() { return UT.recBreadName; }, get sub() { return UT.recBreadSub; },
    inputs: [['wheat', 3], ['egg', 2]], mult: 1.75, staminaGain: 35, standingGain: 0, feedOut: 0, xp: 22,
  },
  {
    id: 'tabriz-cheese', icon: 'milk',
    get name() { return UT.recCheeseName; }, get sub() { return UT.recCheeseSub; },
    inputs: [['milk', 3], ['wool', 1]], mult: 1.8, staminaGain: 20, standingGain: 0, feedOut: 0, xp: 32,
  },
  {
    id: 'garden-torshi', icon: 'tomato',
    get name() { return WX.recPickleName; }, get sub() { return WX.recPickleSub; },
    inputs: [['cucumber', 2], ['tomato', 2], ['pepper', 2]], mult: 1.85, staminaGain: 25, standingGain: 0, feedOut: 0, xp: 28,
  },
  {
    id: 'spring-jam', icon: 'strawberry',
    get name() { return WX.recJamName; }, get sub() { return WX.recJamSub; },
    inputs: [['strawberry', 3], ['honey', 1]], mult: 1.88, staminaGain: 30, standingGain: 0, feedOut: 0, xp: 36,
  },
  {
    id: 'shiraz-citrus', icon: 'orange',
    get name() { return WX.recCitrusName; }, get sub() { return WX.recCitrusSub; },
    inputs: [['orange', 2], ['sunflower', 2], ['honey', 1]], mult: 1.9, staminaGain: 40, standingGain: 2, feedOut: 0, xp: 40,
  },
  {
    id: 'orchard-lavashak', icon: 'plum',
    get name() { return WX.recFruitRollName; }, get sub() { return WX.recFruitRollSub; },
    inputs: [['plum', 2], ['cherry', 2], ['peach', 2]], mult: 1.92, staminaGain: 30, standingGain: 1, feedOut: 0, xp: 44,
  },
  {
    id: 'herbal-elixir', icon: 'herbal-elixir',
    get name() { return FT.recElixirName; }, get sub() { return FT.recElixirDesc; },
    inputs: [['herb', 2], ['honey', 1]], mult: 2.02, staminaGain: 45, standingGain: 2, feedOut: 0, xp: 48,
  },
  {
    id: 'turquoise-amulet', icon: 'turquoise-amulet',
    get name() { return FT.recAmuletName; }, get sub() { return FT.recAmuletDesc; },
    inputs: [['turquoise', 1], ['quartz', 1], ['saffron', 1]], mult: 2.15, staminaGain: 25, standingGain: 4, feedOut: 0, xp: 72,
  },
  {
    id: 'malayer-grape', icon: 'grape',
    get name() { return WX.recGrapeName; }, get sub() { return WX.recGrapeSub; },
    inputs: [['grape', 3], ['wheat', 2]], mult: 1.56, staminaGain: 35, standingGain: 0, feedOut: 0, xp: 42,
  },
  {
    id: 'saveh-pomegranate', icon: 'pomegranate',
    get name() { return WX.recPomPasteName; }, get sub() { return WX.recPomPasteSub; },
    inputs: [['pomegranate', 3], ['fig', 2]], mult: 1.95, staminaGain: 35, standingGain: 1, feedOut: 0, xp: 46,
  },
  {
    id: 'rudbar-olive', icon: 'olive',
    get name() { return WX.recOliveName; }, get sub() { return WX.recOliveSub; },
    inputs: [['olive', 3], ['sunflower', 2]], mult: 1.96, staminaGain: 35, standingGain: 0, feedOut: 0, xp: 48,
  },
  {
    id: 'kashan-syrup', icon: 'saffron',
    get name() { return UT.recSyrupName; }, get sub() { return UT.recSyrupSub; },
    inputs: [['saffron', 1], ['rose', 2]], mult: 1.95, staminaGain: 999, standingGain: 0, feedOut: 0, xp: 52,
  },
  {
    id: 'yalda-nectar', icon: 'pomegranate',
    get name() { return UT.recNectarName; }, get sub() { return UT.recNectarSub; },
    inputs: [['honey', 2], ['pomegranate', 2]], mult: 1.9, staminaGain: 30, standingGain: 3, feedOut: 0, xp: 45,
  },
  {
    id: 'caspian-feast', icon: 'roe',
    get name() { return UT.recFeastName; }, get sub() { return UT.recFeastSub; },
    inputs: [['fish', 3], ['roe', 1]], mult: 1.95, staminaGain: 40, standingGain: 0, feedOut: 0, xp: 58,
  },
  {
    id: 'royal-baklava', icon: 'pistachio',
    get name() { return WX.recBaklavaName; }, get sub() { return WX.recBaklavaSub; },
    inputs: [['pistachio', 2], ['rose', 2], ['honey', 1]], mult: 2.08, staminaGain: 60, standingGain: 2, feedOut: 0, xp: 70,
  },
];

/** محاسبهٔ ارزش فروش ویژهٔ یک نوبت پاتیل بر اساس قیمت روز مواد اولیه */
export function artisanRewardCoins(rec: ArtisanRecipe): number {
  if (rec.mult <= 0) return 0;
  let raw = 0;
  for (const [id, q] of rec.inputs) raw += goodPrice(id) * q;
  const skillBoost = S.skills?.['trade-2'] ? 1.15 : 1;
  // سقف بازدهٔ فرآوری: دستورهای ردهٔ بالا (mult ≥ ۲) تا ۱٫۸ و بقیه تا ۱٫۶۸ — تفکیک رده‌ها بدون تورم‌زایی
  const netMult = Math.min(rec.mult >= 2 ? 1.8 : 1.68, rec.mult) * skillBoost;
  return Math.max(10, Math.round(raw * netMult));
}

/** بیشینه تعداد قابل‌پخت بر پایهٔ موجودی فعلی انبار */
export function artisanMaxBatches(rec: ArtisanRecipe): number {
  let maxB = Infinity;
  for (const [id, q] of rec.inputs) {
    maxB = Math.min(maxB, Math.floor((S.inv[id] ?? 0) / q));
  }
  if (rec.feedOut > 0) {
    const netPerBatch = rec.feedOut - rec.inputs.reduce((a, [, q]) => a + q, 0);
    if (netPerBatch > 0) {
      const freeSpace = Math.max(0, invCap() - invCount());
      maxB = Math.min(maxB, Math.floor(freeSpace / netPerBatch));
    }
  }
  return Number.isFinite(maxB) ? Math.max(0, maxB) : 0;
}

const MAX_CAULDRON_PER_DAY = 8;

/** اجرای فرآوری روستایی (تکی یا دسته‌ای) با ظرفیت روزانهٔ پایدار روی سِیو و سقف منطقی اعتبار */
export function craftArtisan(id: ArtisanRecipe['id'], requestedBatches = 1): number {
  const rec = ARTISAN_RECIPES.find((r) => r.id === id);
  if (!rec) return 0;
  if (!S.cauldron || S.cauldron.day !== S.day) {
    S.cauldron = { day: S.day, counts: {} };
  }
  const cauldronCooked = S.cauldron.counts;
  const leftToday = rec.feedOut > 0 ? 999 : Math.max(0, MAX_CAULDRON_PER_DAY - (cauldronCooked[id] ?? 0));
  const safeReq = Number.isFinite(requestedBatches) ? Math.floor(requestedBatches) : 0;
  if (safeReq <= 0) return 0;
  const batches = Math.min(safeReq, artisanMaxBatches(rec), leftToday);
  if (batches <= 0) {
    sfx.err();
    return 0;
  }
  if (rec.feedOut <= 0) cauldronCooked[id] = (cauldronCooked[id] ?? 0) + batches;
  const payout = rec.feedOut <= 0 ? artisanRewardCoins(rec) * batches : 0;
  for (const [gid, q] of rec.inputs) {
    S.inv[gid] = (S.inv[gid] ?? 0) - q * batches;
    if (S.inv[gid] <= 0) delete S.inv[gid];
  }
  if (rec.feedOut > 0) {
    const gotFeed = addGood('feed', rec.feedOut * batches);
    toast('feed', GT.feedMilled + fa(gotFeed));
  } else {
    S.coins += payout;
    S.earned += payout;
    addXp(payout / XP.sellPer);
    toast('coin', `${GT.artisanDone} +${fa(payout)}`);
  }
  if (rec.staminaGain > 0) {
    S.stamina = Math.min(stamCap(), S.stamina + rec.staminaGain * batches);
  }
  if (rec.standingGain > 0) addStanding(Math.min(6, rec.standingGain * batches));
  addStat('artisan', batches);
  addXp(rec.xp * batches);
  checkAch();
  sfx.coin();
  saveGame();
  notify();
  return batches;
}

/** شعاع ضربهٔ ابزار ارتقایافته (بیل و آبپاش) متناسب با ابعاد دقیق مزرعهٔ فعلی (۸×۵، ۹×۶ یا ۱۰×۶) */
export function aoePlots(centerIdx: number, toolLv: number): number[] {
  const spec = ESTATES[activeFarm()];
  const cols = spec.cols;
  const rows = spec.rows;
  const c0 = centerIdx % cols;
  const r0 = Math.floor(centerIdx / cols);
  if (toolLv <= 1) return [centerIdx];
  const out: number[] = [centerIdx];
  const rRange = toolLv >= 4 ? [-1, 0, 1] : [0];
  for (const dr of rRange) {
    for (const dc of [-1, 0, 1]) {
      const r = r0 + dr;
      const c = c0 + dc;
      if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
      const idx = r * cols + c;
      if (idx !== centerIdx) out.push(idx);
    }
  }
  return out;
}

/** کرت‌های هدف ضربهٔ ابزار بازیکن بر پایهٔ سطح بیل یا آبپاش (۱×۱ -> ۱×۳ -> ۳×۳) */
export function playerToolPlots(centerIdx: number, kind: string): number[] {
  const toolLv = kind === 'till' || kind === 'plant' || kind === 'harvest'
    ? S.lv.hoe
    : kind === 'water' || kind === 'fert'
      ? S.lv.can
      : 0;
  return aoePlots(centerIdx, toolLv);
}

export function bumpPlayerCombo(kind = 'harvest'): number {
  const now = Date.now();
  const nextCount = UI.combo.until > now ? UI.combo.count + 1 : 1;
  UI.combo = { count: nextCount, until: now + 5500, kind };
  if (nextCount >= 2) {
    sfx.combo(nextCount);
    addXp(Math.min(3, nextCount - 1));
    if (nextCount % 5 === 0) {
      S.stamina = Math.min(stamCap(), S.stamina + 2);
      toast('star', WX.comboEnergyBoost);
    }
    notify();
  }
  return nextCount;
}

export function performPlayerPlotSweep(
  centerIdx: number,
  kind: string,
  canActFn: (k: string, idx: number, worker?: boolean, seed?: undefined, farm?: undefined, freeStam?: boolean) => string,
  doActFn: (k: string, idx: number, worker?: boolean, seed?: undefined, silent?: boolean, farm?: undefined, freeStam?: boolean) => { crop?: string; qty?: number },
  randFn: () => number,
): Array<{ plot: number; crop?: string; qty?: number; golden?: boolean }> {
  const targets = playerToolPlots(centerIdx, kind);
  const hits: Array<{ plot: number; crop?: string; qty?: number; golden?: boolean }> = [];
  targets.forEach((idx, order) => {
    const isExtraCell = order > 0;
    // کرت‌های جانبی جاروی بازیکن عمل مستقیم خودِ بازیکن هستند (worker = false => حفظ p.hand = true و پاداش اقلیمی!)، فقط نیرو یک‌بار کسر می‌شود
    if (canActFn(kind, idx, false, undefined, undefined, isExtraCell) !== '') return;
    const res = doActFn(kind, idx, false, undefined, isExtraCell, undefined, isExtraCell);
    let golden = false;
    // ضریب خاک با پله‌های جدید (۵ پله) بازنشانی شد تا سقف طلاییِ قبلی حفظ شود: ۵×۰٫۰۱۵ = ۳×۰٫۰۲۵
    const goldChance = 0.1 + S.lv.soil * 0.015 + (S.skills?.['crop-2'] ? 0.12 : 0);
    if (kind === 'harvest' && res.crop && (res.qty ?? 0) > 0 && randFn() < goldChance) {
      const exA = addPack(res.crop, res.qty!); // پاداش طلایی هم اول به کولهٔ بازیکن
      const extra = exA + (exA < res.qty! ? addGood(res.crop, res.qty! - exA) : 0);
      S.seeds[res.crop as keyof typeof S.seeds] = (S.seeds[res.crop as keyof typeof S.seeds] ?? 0) + 1;
      addStat('harv', extra);
      addXp(18);
      res.qty = (res.qty ?? 0) + extra;
      golden = true;
      toast('star', GT.goldenHarvest);
    }
    hits.push({ plot: idx, crop: res.crop, qty: res.qty, golden });
  });
  if (hits.length > 0 && (kind === 'harvest' || kind === 'plant')) bumpPlayerCombo(kind);
  return hits;
}

/** پاداش صندوقچهٔ غرق‌شدهٔ رودخانه هنگام ماهی‌گیری */
export function rollRiverTreasure(randFn: () => number): number {
  const baseCoins = 180 + Math.floor(randFn() * 240);
  const bonusCoins = S.skills?.['nature-2'] ? Math.round(baseCoins * 1.5) : baseCoins;
  S.coins += bonusCoins;
  S.earned += bonusCoins;
  S.fert += 1;
  addXp(25);
  toast('coin', `${GT.riverTreasure} (+${fa(bonusCoins)})`);
  return bonusCoins;
}

/** سرویس یک‌جای همهٔ حوضچه‌های ماهی (برداشت رسیده‌ها + رهاسازی بچه‌ماهی + خوراک‌دهی) */
export function manageAllPonds(): number {
  let ops = 0;
  for (let i = 0; i < S.ponds.length; i++) {
    if (S.ponds[i].stocked && S.ponds[i].grow >= POND_GROW_DAYS) {
      if (harvestPond(i, true) > 0) ops++;
    }
    if (!S.ponds[i].stocked) {
      const before = S.ponds[i].stocked;
      stockPond(i);
      if (!before && S.ponds[i].stocked) ops++;
    }
    if (S.ponds[i].stocked && S.ponds[i].feed < 4 && (S.inv.feed ?? 0) > 0) {
      feedPond(i);
      ops++;
    }
  }
  if (ops > 0) toast('fish', GT.pondsManaged);
  notify();
  return ops;
}

/** شمارش کوئست‌های روزانه/هفتگی آمادهٔ دریافت برای نشانگر HUD */
export function readyQuestCount(): number {
  ensureQuests();
  if (!S.quests) return 0;
  let n = 0;
  for (const g of S.quests.daily) if (questDone(g) && !isClaimed(g, false)) n++;
  if (S.quests.weekly && questDone(S.quests.weekly, true) && !isClaimed(S.quests.weekly, true)) n++;
  return n;
}

/** دریافت یک‌جای همهٔ پاداش‌های آمادهٔ روزانه و هفتگی با یک کلیک */
export function claimAllReadyQuests(claimFn: (g: QuestGoal, week?: boolean) => boolean): number {
  ensureQuests();
  if (!S.quests) return 0;
  let totalCoins = 0;
  for (const g of S.quests.daily) {
    if (questDone(g) && !isClaimed(g, false)) {
      const r = g.reward;
      if (claimFn(g, false)) totalCoins += r;
    }
  }
  if (S.quests.weekly && questDone(S.quests.weekly, true) && !isClaimed(S.quests.weekly, true)) {
    const r = S.quests.weekly.reward;
    if (claimFn(S.quests.weekly, true)) totalCoins += r;
  }
  if (totalCoins > 0) toast('star', GT.allQuestsClaimed + fa(totalCoins));
  return totalCoins;
}
