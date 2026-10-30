// Deep RPG Progression, Interactive Estate Structures, Flower Synergy, Regional Fish & Homestead Customization
import { ACH_OUTFIT_REWARDS, CROPS, CROP, XP, type CropId } from '../data';
import { PAL_PLAYER, type Pal } from '../rig';
import { WX } from '../../strings/worldExpansionText';
import { fa, faDec } from '../../strings/fa';
import { sfx } from '../sound';
import { rnd } from '../rng';
import {
  S, UI, addPack, addStat, addXp, canCap, farmLevel, grantGoodWithMailOverflow,
  isSimBatch, notify, ownedFarms, pay, plotsForFarm, saveGame, season, stamCap, toast,
} from '../state';
import type { FarmSceneId } from '../estates';

// ===== ۱. درخت مهارت تخصصی RPG (۴ شاخه × ۳ سطح = ۱۲ مهارت واقعی) =====
export type SkillBranch = 'crop' | 'ranch' | 'nature' | 'trade';

export interface SkillDef {
  id: string;
  branch: SkillBranch;
  tier: 1 | 2 | 3;
  icon: string;
  reqSkill?: string;
  readonly label: string;
}

export const SKILL_DEFS: readonly SkillDef[] = [
  { id: 'crop-1', branch: 'crop', tier: 1, icon: 'plant', get label() { return WX.skCrop1; } },
  { id: 'crop-2', branch: 'crop', tier: 2, icon: 'sickle', reqSkill: 'crop-1', get label() { return WX.skCrop2; } },
  { id: 'crop-3', branch: 'crop', tier: 3, icon: 'star', reqSkill: 'crop-2', get label() { return WX.skCrop3; } },
  { id: 'ranch-1', branch: 'ranch', tier: 1, icon: 'feed', get label() { return WX.skRanch1; } },
  { id: 'ranch-2', branch: 'ranch', tier: 2, icon: 'nest', reqSkill: 'ranch-1', get label() { return WX.skRanch2; } },
  { id: 'ranch-3', branch: 'ranch', tier: 3, icon: 'milk', reqSkill: 'ranch-2', get label() { return WX.skRanch3; } },
  { id: 'nature-1', branch: 'nature', tier: 1, icon: 'rod', get label() { return WX.skNat1; } },
  { id: 'nature-2', branch: 'nature', tier: 2, icon: 'honey', reqSkill: 'nature-1', get label() { return WX.skNat2; } },
  { id: 'nature-3', branch: 'nature', tier: 3, icon: 'roe', reqSkill: 'nature-2', get label() { return WX.skNat3; } },
  { id: 'trade-1', branch: 'trade', tier: 1, icon: 'coin', get label() { return WX.skTrd1; } },
  { id: 'trade-2', branch: 'trade', tier: 2, icon: 'saffron', reqSkill: 'trade-1', get label() { return WX.skTrd2; } },
  { id: 'trade-3', branch: 'trade', tier: 3, icon: 'worker', reqSkill: 'trade-2', get label() { return WX.skTrd3; } },
];

export const hasSkill = (id: string): boolean => Boolean(S.skills?.[id]);

export function skillPointsTotal(): number {
  const fromLevel = Math.floor(Math.max(1, farmLevel()) / 2);
  const bonus = S.secrets?.['secret-true-epilogue'] ? 2 : 0;
  return Math.min(SKILL_DEFS.length, fromLevel + bonus);
}

export function skillPointsUsed(): number {
  return Object.values(S.skills ?? {}).filter(Boolean).length;
}

export function skillPointsAvailable(): number {
  return Math.max(0, skillPointsTotal() - skillPointsUsed());
}

export function unlockSkill(id: string): boolean {
  const def = SKILL_DEFS.find((s) => s.id === id);
  if (!def || hasSkill(id)) return false;
  if (def.reqSkill && !hasSkill(def.reqSkill)) { sfx.err(); return false; }
  if (skillPointsAvailable() <= 0) { sfx.err(); return false; }
  S.skills ??= {};
  S.skills[id] = true;
  sfx.fanfare();
  saveGame();
  notify();
  return true;
}

// ===== ۲. هم‌افزایی ماشین‌آلات صنعتی و کارگران + انتخاب بذر هر مزرعه =====
export function machineSynergySpeedMult(): number {
  const engBonus = ((S.affinity?.engineer ?? 0) >= 100 ? 0.15 : 0);
  const foremanBonus = hasSkill('trade-3') ? 0.2 : 0;
  return 1 + engBonus + foremanBonus;
}

export function setFarmSeedLock(farm: FarmSceneId, crop: CropId | 'auto') {
  S.farmSeeds ??= {};
  S.farmSeeds[farm] = crop;
  sfx.tap();
  saveGame();
  notify();
}

export function setCrewRole(role: 'balanced' | 'crops' | 'ranch') {
  S.crewRole = role;
  sfx.tap();
  saveGame();
  notify();
}

// ===== ۳. سازه‌های تعاملی دشت شمالی (آسیاب بادی) و باغ‌درهٔ آفتاب (چشمهٔ آبشار) =====
export function millAtNorthWindmill(): number {
  for (const grain of ['wheat', 'corn'] as const) {
    const have = Math.floor(S.inv[grain] ?? 0);
    if (have >= 2) {
      const batches = Math.min(4, Math.floor(have / 2));
      const feedOut = batches * 7;
      S.inv[grain] = have - batches * 2;
      if (S.inv[grain] <= 0) delete S.inv[grain];
      grantGoodWithMailOverflow('feed', feedOut);
      addStat('artisan', batches);
      addXp(14 * batches);
      sfx.fanfare();
      toast('feed', WX.windmillMilled + fa(feedOut));
      saveGame();
      notify();
      return feedOut;
    }
  }
  sfx.err();
  toast('wheat', WX.windmillNeedGrain);
  return 0;
}

export function drinkValleySpring(): boolean {
  S.can = canCap();
  if (S.springDay === S.day) {
    sfx.water();
    toast('drop', WX.springAlreadyUsed);
    notify();
    return false;
  }
  S.springDay = S.day;
  S.stamina = Math.min(stamCap(), S.stamina + stamCap() * 0.6);
  addXp(15);
  sfx.fanfare();
  toast('bolt', WX.springRefreshed);
  saveGame();
  notify();
  return true;
}

// ===== ۴. هم‌افزایی گل‌ها و شکوفه‌ها با زنبورستان (Apiary Flower Synergy) =====
const NECTAR_CROPS = new Set<CropId>(['sunflower', 'rose', 'strawberry', 'cherry', 'peach', 'orange', 'pomegranate']);

export function countBloomingNectarPlots(): number {
  let count = 0;
  for (const farm of ownedFarms()) {
    for (const p of plotsForFarm(farm)) {
      if (p.st === 2 && !p.dead && p.crop && NECTAR_CROPS.has(p.crop) && p.prog >= 0.35) count++;
    }
  }
  return count;
}

export function flowerSynergyMult(): number {
  const blooms = countBloomingNectarPlots();
  const bloomBonus = hasSkill('nature-2') ? Math.min(0.45, blooms * 0.03) : 0;
  return 1 + bloomBonus;
}

// ===== ۵. ۸ گونهٔ ماهی فصلی/ساعتی + مینی‌گیم دقت پرتاب قلاب (Sweet-Spot Cast) =====
export interface FishSpeciesDef {
  id: string;
  good: 'fish' | 'roe';
  seasons: readonly number[];
  minKg: number;
  maxKg: number;
  coinBonus: number;
  readonly name: string;
}

export const FISH_SPECIES: readonly FishSpeciesDef[] = [
  { id: 'silver-dart', good: 'fish', seasons: [0, 1, 2, 3], minKg: 0.4, maxKg: 1.4, coinBonus: 12, get name() { return WX.fishSp0; } },
  { id: 'mirror-carp', good: 'fish', seasons: [0, 1, 2], minKg: 1.2, maxKg: 4.5, coinBonus: 28, get name() { return WX.fishSp1; } },
  { id: 'mountain-trout', good: 'fish', seasons: [0, 3], minKg: 0.9, maxKg: 3.6, coinBonus: 42, get name() { return WX.fishSp2; } },
  { id: 'white-kutum', good: 'fish', seasons: [2, 3], minKg: 1.5, maxKg: 5.2, coinBonus: 55, get name() { return WX.fishSp3; } },
  { id: 'golden-zander', good: 'fish', seasons: [1, 2], minKg: 1.8, maxKg: 6.4, coinBonus: 72, get name() { return WX.fishSp4; } },
  { id: 'emerald-pike', good: 'fish', seasons: [0, 2], minKg: 2.4, maxKg: 8.5, coinBonus: 95, get name() { return WX.fishSp5; } },
  { id: 'beluga-sturgeon', good: 'roe', seasons: [0, 1, 2, 3], minKg: 6.0, maxKg: 18.5, coinBonus: 135, get name() { return WX.fishSp6; } },
  { id: 'storm-kingfish', good: 'roe', seasons: [0, 2, 3], minKg: 9.5, maxKg: 24.0, coinBonus: 220, get name() { return WX.fishSp7; } },
];

export function catchRegionalFish(precisionBoost = 1, cashFactor = 1): { species: FishSpeciesDef; kg: number; qty: number; sweet: boolean; coins: number } {
  const sn = season();
  const rain = S.weather === 2;
  const sweet = precisionBoost > 1.2;
  const skilled = precisionBoost >= 1;
  // Quick/unsuccessful casts stay a useful starter action, but cannot roll the
  // rare roe table or the high-value regional species. A controlled cast keeps
  // the full seasonal pool and its better expected quantity.
  const pool = FISH_SPECIES.filter((f) => f.seasons.includes(sn)
    && (f.id !== 'storm-kingfish' || rain || sweet)
    && (skilled || (f.good === 'fish' && f.coinBonus <= 42)));
  const roll = Math.min(0.999, rnd() * (sweet ? 1.22 : 1));
  const idx = Math.min(pool.length - 1, Math.floor(roll * pool.length));
  const sp = pool[idx] ?? FISH_SPECIES[0];
  const eagleMult = hasSkill('nature-1') ? 1.2 : 1;
  const rawKg = (sp.minKg + rnd() * (sp.maxKg - sp.minKg)) * (sweet ? 1.25 : 1) * eagleMult;
  const kg = Math.round(rawKg * 10) / 10;
  const baseQty = sp.good === 'roe' ? (sweet ? 2 : 1) : (sweet ? 3 : skilled ? 1 + Math.floor(rnd() * 2) : 1);
  // The no-rod, no-skill convenience action is not a guaranteed stamina-to-coin
  // converter. A won hold minigame and a rod-assisted quick cast still land.
  if (!skilled && cashFactor < 1 && rnd() >= 0.5) {
    return { species: sp, kg, qty: 0, sweet: false, coins: 0 };
  }
  S.fishLog ??= {};
  if (kg > (S.fishLog[sp.id] ?? 0)) S.fishLog[sp.id] = kg;
  // ماهیگیری دستی بازیکن: اول به کولهٔ پشتی؛ کوله پر شد مابقی به صندوق پست (بات/شبیه‌ساز: مستقیم انبار)
  const packGot = isSimBatch() ? 0 : addPack(sp.good, baseQty);
  const got = packGot + (packGot < baseQty ? grantGoodWithMailOverflow(sp.good, baseQty - packGot, 'rancher', 'fish') : 0);
  const awardedQty = Math.max(got, baseQty);
  const safeCashFactor = Number.isFinite(cashFactor) ? Math.max(0, Math.min(1, cashFactor)) : 1;
  const instantCoins = Math.round(sp.coinBonus * (sweet ? 0.9 : 0.35) * safeCashFactor);
  if (awardedQty > 0) {
    S.coins += instantCoins;
    S.earned += instantCoins;
    if (sp.good === 'roe') addStat('roeN', awardedQty);
    else addStat('fish', awardedQty);
    addXp(sweet ? 24 : 12);
    toast(sp.good, `${sweet ? WX.fishSweetHit : WX.fishGoodHit}${sp.name} (${faDec(kg)}${WX.fishWeightUnit})`);
  }
  return { species: sp, kg, qty: awardedQty, sweet, coins: awardedQty > 0 ? instantCoins : 0 };
}

// ===== ۶. شخصی‌سازی ظاهر کشاورز، نام مزرعه و دکوراسیون زندهٔ حیاط + حیوانات خانگی =====
export const OUTFIT_THEMES: ReadonlyArray<{
  id: number; swatch: string; pal: Partial<Pal>; readonly name: string;
  unlock?: { readonly ach: string; readonly tier: number };
}> = [
  { id: 0, swatch: '#4a90d9', pal: { shirt: '#ff8a5b', pants: '#4a90d9', hat: '#ffd166', band: '#d9534f' }, get name() { return WX.outfit0; } },
  { id: 1, swatch: '#c83e4d', pal: { shirt: '#ffe3b3', pants: '#c83e4d', hat: '#f4c95d', band: '#6a2c70' }, get name() { return WX.outfit1; } },
  { id: 2, swatch: '#2e8b57', pal: { shirt: '#ffd699', pants: '#2e8b57', hat: '#e9c46a', band: '#e76f51' }, get name() { return WX.outfit2; } },
  { id: 3, swatch: '#d99b26', pal: { shirt: '#5c374c', pants: '#d99b26', hat: '#fff1c1', band: '#9e2a2b' }, get name() { return WX.outfit3; } },
  { id: 4, swatch: '#d64d78', pal: { shirt: '#ffe0ea', pants: '#9c3556', hat: '#f7c8d8', band: '#7f2d4b' }, unlock: ACH_OUTFIT_REWARDS[0], get name() { return WX.outfit4; } },
  { id: 5, swatch: '#e77b32', pal: { shirt: '#fff0c2', pants: '#b9502d', hat: '#ffd166', band: '#7d3d2b' }, unlock: ACH_OUTFIT_REWARDS[1], get name() { return WX.outfit5; } },
  { id: 6, swatch: '#315b9a', pal: { shirt: '#bde8ef', pants: '#29456f', hat: '#d9f2f0', band: '#d9903d' }, unlock: ACH_OUTFIT_REWARDS[2], get name() { return WX.outfit6; } },
  { id: 7, swatch: '#7250a5', pal: { shirt: '#e5d4ff', pants: '#50366f', hat: '#d4b8f0', band: '#d9a33b' }, unlock: ACH_OUTFIT_REWARDS[3], get name() { return WX.outfit7; } },
  { id: 8, swatch: '#238b76', pal: { shirt: '#d1f0dc', pants: '#286457', hat: '#f0e6af', band: '#825b36' }, unlock: ACH_OUTFIT_REWARDS[4], get name() { return WX.outfit8; } },
];

export function isOutfitUnlocked(idx: number): boolean {
  const unlock = OUTFIT_THEMES[idx]?.unlock;
  return !unlock || (S.ach[unlock.ach] ?? 0) >= unlock.tier;
}

export interface DecorDef {
  id: 'lanterns' | 'tilepool' | 'pergola' | 'sheepdog' | 'barncat';
  icon: string;
  price: number;
  reqLv: number;
  readonly label: string;
}

export const DECOR_ITEMS: readonly DecorDef[] = [
  { id: 'lanterns', icon: 'sun', price: 2200, reqLv: 2, get label() { return WX.decLantern; } },
  { id: 'barncat', icon: 'heart', price: 4800, reqLv: 4, get label() { return WX.decCat; } },
  { id: 'tilepool', icon: 'drop', price: 7500, reqLv: 6, get label() { return WX.decPool; } },
  { id: 'pergola', icon: 'rose', price: 12000, reqLv: 9, get label() { return WX.decPergola; } },
  { id: 'sheepdog', icon: 'scarecrow', price: 18500, reqLv: 11, get label() { return WX.decDog; } },
];

export const hasDecor = (id: DecorDef['id']): boolean => Boolean(S.decor?.[id]);

export function syncPlayerOutfitPalette() {
  const idx = S.custom?.outfit ?? 0;
  const theme = OUTFIT_THEMES[idx] ?? OUTFIT_THEMES[0];
  Object.assign(PAL_PLAYER, theme.pal);
}

export function setPlayerOutfit(idx: number): boolean {
  if (!OUTFIT_THEMES[idx] || !isOutfitUnlocked(idx)) { sfx.err(); return false; }
  S.custom ??= { farmerName: WX.defaultFarmerName, farmName: WX.defaultFarmName, outfit: 0, morningCard: true };
  S.custom.outfit = idx;
  syncPlayerOutfitPalette();
  sfx.tap();
  saveGame();
  notify();
  return true;
}

export function setHomesteadNames(farmerName: string, farmName: string) {
  S.custom ??= { farmerName: WX.defaultFarmerName, farmName: WX.defaultFarmName, outfit: 0, morningCard: true };
  S.custom.farmerName = farmerName.trim().slice(0, 22) || WX.defaultFarmerName;
  S.custom.farmName = farmName.trim().slice(0, 28) || WX.defaultFarmName;
  saveGame();
  notify();
}

export function buyCourtyardDecor(id: DecorDef['id']): boolean {
  const item = DECOR_ITEMS.find((d) => d.id === id);
  if (!item || hasDecor(id) || farmLevel() < item.reqLv) { sfx.err(); return false; }
  if (!pay(item.price)) return false;
  S.decor ??= {};
  S.decor[id] = true;
  if (id === 'tilepool') S.can = canCap();
  addStat('builds', 1);
  addXp(XP.buildBase + 20);
  sfx.fanfare();
  saveGame();
  notify();
  return true;
}

export function processMorningCompanionAndReport() {
  // هدیهٔ صبحگاهی گربهٔ ملوس انبار هر ۳ روز
  if (hasDecor('barncat') && S.day % 3 === 0) {
    if (rnd() < 0.5) {
      const sn = season();
      const seasonal = CROPS.filter((c) => c.lv <= farmLevel() && c.seasons.includes(sn));
      const pick = seasonal[Math.floor(rnd() * seasonal.length)] ?? CROP.wheat;
      S.seeds[pick.id] = (S.seeds[pick.id] ?? 0) + 2;
    } else {
      grantGoodWithMailOverflow('fish', 2);
    }
  }
  // ثبت خلاصهٔ گزارش سپیده‌دم
  const prevEarned = S.snapEarned ?? S.earned;
  const curGather = (S.stats.harv ?? 0) + (S.stats.collect ?? 0) + (S.stats.honey ?? 0) + (S.stats.fish ?? 0);
  const prevGather = S.snapGathered ?? curGather;
  let ripe = 0;
  for (const f of ownedFarms()) {
    for (const p of plotsForFarm(f)) if (p.st === 2 && p.ripe && !p.dead) ripe++;
  }
  S.morning = {
    day: S.day,
    earned: Math.max(0, Math.round(S.earned - prevEarned)),
    gathered: Math.max(0, Math.round(curGather - prevGather)),
    ripe,
    shown: S.custom?.morningCard === false || !UI.started,
  };
  // حلقهٔ ۳۰ روز اخیر برای ضریب ثروتِ زمین (هر سحر یک پله جابه‌جا می‌شود)
  S.earn30 = [...(S.earn30 ?? []), Math.max(0, Math.round(S.earned - prevEarned))].slice(-30);
  S.snapEarned = S.earned;
  S.snapGathered = curGather;
}

export function dismissMorningReport() {
  if (S.morning) S.morning.shown = true;
  sfx.tap();
  saveGame();
  notify();
}

export function toggleMorningCard() {
  S.custom ??= { farmerName: WX.defaultFarmerName, farmName: WX.defaultFarmName, outfit: 0, morningCard: true };
  S.custom.morningCard = !(S.custom.morningCard ?? true);
  if (S.morning && !S.custom.morningCard) S.morning.shown = true;
  sfx.tap();
  saveGame();
  notify();
}

/** پیشنهاد بهبود (گزارش ۳۰۰X): حالت داستانِ فشرده — فاصلهٔ ضدِّرشِ باز شدنِ سند بعدی نصف می‌شود */
export function toggleCompactStory() {
  S.custom ??= { farmerName: WX.defaultFarmerName, farmName: WX.defaultFarmName, outfit: 0, morningCard: true };
  S.custom.compactStory = !(S.custom.compactStory ?? false);
  sfx.tap();
  saveGame();
  notify();
}
