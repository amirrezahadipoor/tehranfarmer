// ===== اقتصاد: قیمت‌ها، خرید و فروش =====
import {
  ANIMALS, ANIMAL_RESALE_RATE, ANIMAL_SELL_XP, BARN_CAP, CAN_CAP, CROP, DEMAND_DECAY, DEMAND_FLOOR,
  FEED_PRICE, FERT_PRICE, FINGER_PRICE, GOOD, HEART_BOND_5, LAND_PRICES, PACK_CAP, PEN_CAP_LV, PEN_KINDS, ROD_LV, ROD_PRICE,
  SARA5_DEMAND_DECAY, SEASON_IN_MULT, SEASON_OUT_MULT, SEED_DEMAND_CAP, SEED_DEMAND_GROW, SILO_MULT,
  SKILL_RANCH3_MULT, SKILL_TRADE1_MULT, STAM_CAP, TILEPOOL_BONUS_CAN, TROUGH_CAP, WEALTH_DIVISOR, WEALTH_MULT_CAP,
  XP, type AnimalKind, type CropId,
} from '../data';
import { S, notify, saveGame, toast, farmLevel, addStat, addXp, checkAch, wellBonusCan } from '../state';
import { animalQualityMult } from './farmDeep';
import { frontierGoodMult, recordMarketSaleVolume } from './frontier';
import { hasDecor, hasSkill } from './rpgSystems';
import { sfx } from '../sound';
import { rnd } from '../rng';
import { fa } from '../../strings/fa';
import { GT } from '../../strings/gameText';

/** تعیین‌کنندهٔ آب‌وهوا/فصل برای ضریب قیمت */
type SeasonFn = () => number;
let seasonFn: SeasonFn = () => 0;
export function bindSeason(fn: SeasonFn) { seasonFn = fn; }
const season = () => seasonFn();

export function seasonMult(id: string): number {
  const cd = CROP[id];
  if (!cd) return 1;
  return cd.seasons.includes(season()) ? SEASON_IN_MULT : SEASON_OUT_MULT;
}
const RANCH_GOODS = new Set(['egg', 'milk', 'wool', 'cheese']);
function skillGoodMult(id: string): number {
  let m = (hasSkill('trade-1') ? SKILL_TRADE1_MULT : 1) * frontierGoodMult(id);
  if (RANCH_GOODS.has(id) && hasSkill('ranch-3')) m *= SKILL_RANCH3_MULT;
  return m;
}
function effectiveDemandDecay(): number {
  return (S.affinity?.sara ?? 0) >= HEART_BOND_5 ? SARA5_DEMAND_DECAY : DEMAND_DECAY;
}

export const goodPrice = (id: string) => Math.max(1, Math.round((GOOD[id]?.base ?? 1) * seasonMult(id) * (S.dem[id] ?? 1) * skillGoodMult(id)));
export const goodRatio = (id: string) => goodPrice(id) / GOOD[id].base;
export const seedPrice = (id: CropId) => Math.max(1, Math.round(CROP[id].seed * (S.sdem[id] ?? 1)));
/** ارزش واقعی و دقیق فروش n واحد کالا با احتساب افت تدریجی تقاضا (بدون تغییر وضعیت) */
function priceSum(id: string, n: number, cap: number): number {
  let d = S.dem[id] ?? 1;
  const decay = effectiveDemandDecay();
  const sMult = skillGoodMult(id);
  let sum = 0;
  const count = Math.max(0, Math.min(n, cap));
  for (let i = 0; i < count; i++) {
    sum += Math.max(1, Math.round((GOOD[id]?.base ?? 1) * seasonMult(id) * d * sMult));
    d = Math.max(DEMAND_FLOOR, d * decay);
  }
  return sum;
}
export const saleValue = (id: string, n: number): number => priceSum(id, n, S.inv[id] ?? 0);
/** تعداد موجودی کالا در منبعِ انتخابیِ فروش (کوله / انبار / هر دو) */
export function srcHave(id: string): number {
  const s = S.sellFrom ?? 'both';
  const p = Math.floor(S.pack[id] ?? 0);
  const b = Math.floor(S.inv[id] ?? 0);
  return s === 'pack' ? p : s === 'barn' ? b : p + b;
}
/** مثل saleValue ولی با سقفِ منبعِ انتخابیِ فروش در بازار */
export const saleValueSel = (id: string, n: number): number => priceSum(id, n, srcHave(id));
/** کل موجودی یک کالا نزد بازیکن (کوله + انبار) — مبنای همهٔ مسیرهای تحویل/اهدا/هدیه */
export const holdCount = (id: string): number => Math.floor(S.pack[id] ?? 0) + Math.floor(S.inv[id] ?? 0);
/** کم‌کردن n عدد از کالا؛ اول از کوله، بعد از انبار — مقدار واقعیِ کم‌شده را برمی‌گرداند */
export function takeHold(id: string, n: number): number {
  n = Math.max(0, Math.floor(n));
  let taken = 0;
  const p = Math.min(Math.floor(S.pack[id] ?? 0), n);
  if (p > 0) { S.pack[id] -= p; if (S.pack[id] <= 0) delete S.pack[id]; taken = p; }
  if (taken < n) {
    const b = Math.min(Math.floor(S.inv[id] ?? 0), n - taken);
    if (b > 0) { S.inv[id] -= b; if (S.inv[id] <= 0) delete S.inv[id]; taken += b; }
  }
  return taken;
}
/** هزینهٔ واقعی و دقیق خرید بستهٔ nتایی بذر با احتساب رشد تقاضای بذر (بدون تغییر وضعیت) */
export function seedPackPrice(id: CropId, n: number): number {
  let d = S.sdem[id] ?? 1;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += Math.max(1, Math.round(CROP[id].seed * d));
    d = Math.min(SEED_DEMAND_CAP, d * SEED_DEMAND_GROW);
  }
  return sum;
}
export const invCount = () => Object.values(S.inv).reduce((a, b) => a + b, 0);
export const invCap = () => BARN_CAP[S.lv.barn];
export const packCount = () => Object.values(S.pack).reduce((a, b) => a + b, 0);
export const packCap = () => PACK_CAP[S.lv.bag];
/** افزودن کالا بهکولهٔ پشتی بازیکن — سقف کوله رعایت می‌شود */
export function addPack(id: string, n: number): number {
  // کوله هم مانند انبار: فقط اعداد صحیح؛ ورودی کسری کف می‌شود و پسماند کسری ترمیم می‌گردد
  const want = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  const room = Math.max(0, Math.floor(packCap() - packCount()));
  const add = Math.min(room, want);
  if (add > 0) S.pack[id] = Math.floor(S.pack[id] ?? 0) + add;
  return add;
}
/** تخلیهٔ کوله به انبار — هرچه جا باشد جابه‌جا می‌شود؛ مابقی در کوله می‌ماند */
export function transferPackToBarn(): number {
  let moved = 0;
  for (const id of Object.keys(S.pack)) {
    const got = addGood(id, S.pack[id]);
    if (got > 0) {
      S.pack[id] -= got;
      moved += got;
      if (S.pack[id] <= 0) delete S.pack[id];
    }
  }
  return moved;
}
export const canCap = () => CAN_CAP[S.lv.can] + wellBonusCan() + (hasDecor('tilepool') ? TILEPOOL_BONUS_CAN : 0);
export const stamCap = () => STAM_CAP[S.lv.stam];
export const troughCap = () => TROUGH_CAP * SILO_MULT[S.silo]; // سیلو ظرفیت آخور را چند برابر می‌کند
export const penCap = (k: AnimalKind) => PEN_CAP_LV[S.pens[k] ?? 0];
export const penHas = (k: AnimalKind) => (S.pens[k] ?? 0) > 0;
export const penTotal = () => PEN_KINDS.reduce((t, k) => t + penCap(k), 0);

/** قیمت شفاف اسناد توسعهٔ مزارع متناسب با پیشرفت اقتصادی، بدون جریمهٔ رفت‌وآمد به شهر (#۱۷) */
export function landPrice(i: number): number {
  const base = LAND_PRICES[i];
  if (base === undefined) return Infinity;
  // پیشنهاد بهبود (گزارش ۳۰۰X): ضریب ثروت فقط از «درآمدِ ۳۰ روز اخیر» می‌آید تا
  // بازیکنِ پس‌اندازکننده (درآمدِ عمری بالا، جریانِ فعلی عادی) به خاطر پساندازش تنبیه نشود.
  const recent = (S.earn30 ?? []).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
  // The final heritage charter must not become more expensive merely because
  // the player improved their income; other estate tiers retain the existing curve.
  const wealthCap = i === LAND_PRICES.length - 1 ? 0.5 : WEALTH_MULT_CAP;
  const richMult = 1 + Math.min(wealthCap, recent / WEALTH_DIVISOR);
  return Math.round(base * richMult);
}

export function addGood(id: string, n: number): number {
  // کالا همیشه عدد صحیح است: ورودیِ کسری و فضای کسری (پسماند سیوهای قدیمی) نباید کسری بسازد
  const want = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  const room = Math.max(0, Math.floor(invCap() - invCount()));
  const add = Math.min(room, want);
  if (add > 0) S.inv[id] = Math.floor(S.inv[id] ?? 0) + add;
  return add;
}
export function sellGood(id: string, n: number): number {
  const s = S.sellFrom ?? 'both';
  const pHave = Math.floor(S.pack[id] ?? 0);
  const bHave = Math.floor(S.inv[id] ?? 0);
  const have = s === 'pack' ? pHave : s === 'barn' ? bHave : pHave + bHave;
  n = Number.isFinite(n) ? Math.min(Math.floor(n), have) : 0;
  if (n <= 0) return 0;
  const decay = effectiveDemandDecay();
  let sum = 0;
  for (let i = 0; i < n; i++) { sum += goodPrice(id); S.dem[id] = Math.max(DEMAND_FLOOR, (S.dem[id] ?? 1) * decay); }
  recordMarketSaleVolume(id, n);
  let left = n;
  if (s !== 'barn' && left > 0 && pHave > 0) {
    const take = Math.min(pHave, left);
    S.pack[id] -= take; if (S.pack[id] <= 0) delete S.pack[id];
    left -= take;
  }
  if (left > 0 && s !== 'pack') { S.inv[id] -= left; if (S.inv[id] <= 0) delete S.inv[id]; }
  S.coins += sum; S.earned += sum;
  addStat('marketEarned', sum);
  addXp(sum / XP.sellPer);
  sfx.coin(); saveGame(); notify();
  return sum;
}
export function sellAll(): number {
  const s = S.sellFrom ?? 'both';
  if (s === 'pack') {
    let tp = 0;
    for (const id of Object.keys(S.pack)) {
      if (id !== 'feed' && id !== 'fingerling' && GOOD[id]) {
        const keep = S.contract && S.contract.good === id ? S.contract.qty : 0;
        const qty = Math.max(0, Math.floor(S.pack[id] ?? 0) - keep);
        if (qty > 0) tp += sellGood(id, qty);
      }
    }
    return tp;
  }
  if (s === 'both') transferPackToBarn(); // حالت «هر دو»: رفتار پیشین بی‌تغییر (بات/شبیه‌ساز)
  let t = 0;
  for (const id of Object.keys(S.inv)) {
    if (id !== 'feed' && id !== 'fingerling' && GOOD[id]) {
      const keep = S.contract && S.contract.good === id ? S.contract.qty : 0;
      const qty = Math.max(0, Math.floor(S.inv[id] ?? 0) - keep);
      if (qty > 0) t += sellGood(id, qty);
    }
  }
  return t;
}
export function pay(n: number): boolean {
  if (!Number.isFinite(n) || n < 0 || S.coins < n) { sfx.err(); toast('coin', GT.g42); return false; }
  S.coins -= n; sfx.buy(); return true;
}
export function buySeed(id: CropId, n: number) {
  n = Number.isFinite(n) ? Math.floor(n) : 0;
  if (n < 1) return;
  if (CROP[id].lv > farmLevel()) { sfx.err(); toast('lock', (GT.g3 + fa(CROP[id].lv) + GT.g4)); return; }
  for (let i = 0; i < n; i++) { if (!pay(seedPrice(id))) break; S.seeds[id] = (S.seeds[id] ?? 0) + 1; S.sdem[id] = Math.min(SEED_DEMAND_CAP, (S.sdem[id] ?? 1) * SEED_DEMAND_GROW); }
  saveGame(); notify();
}
export function buyFert(n: number) {
  n = Number.isFinite(n) ? Math.floor(n) : 0;
  if (n < 1) return;
  for (let i = 0; i < n; i++) { if (!pay(FERT_PRICE)) break; S.fert++; }
  saveGame(); notify();
}
export function buyFingerling(n: number) {
  n = Number.isFinite(n) ? Math.floor(n) : 0;
  if (n < 1) return;
  for (let i = 0; i < n; i++) {
    // فاصلهٔ واقعی تا سقف: موجودی کسری نباید اجازهٔ عبور از سقف را بدهد
    if (Math.floor(invCap() - invCount()) < 1) { toast('bag', GT.g43); break; }
    if (!pay(FINGER_PRICE)) break;
    S.inv.fingerling = (S.inv.fingerling ?? 0) + 1;
  }
  saveGame(); notify();
}
export function buyFeed(n: number) {
  n = Number.isFinite(n) ? Math.floor(n) : 0;
  if (n < 1) return;
  for (let i = 0; i < n; i++) {
    // فاصلهٔ واقعی تا سقف: موجودی کسری نباید اجازهٔ عبور از سقف را بدهد
    if (Math.floor(invCap() - invCount()) < 1) { toast('bag', GT.g43); break; }
    if (!pay(FEED_PRICE)) break;
    S.inv.feed = (S.inv.feed ?? 0) + 1;
  }
  saveGame(); notify();
}
/** خرید حضوری چوب ماهیگیری از نجاری — بدون آن صید از رودخانه ممکن نیست */
export function buyRod() {
  if (S.rod > 0) { toast('fish', GT.g44); return; }
  if (farmLevel() < ROD_LV) { sfx.err(); toast('lock', GT.g45 + fa(ROD_LV) + GT.g46); return; }
  if (!pay(ROD_PRICE)) return;
  S.rod = 1; saveGame();
  toast('fish', GT.g48);
  notify();
}

export function penOccupied(kind: AnimalKind): number {
  return S.animals.filter((a) => a.kind === kind).length
    + S.nests.filter((n) => n.kind === kind).length
    + S.animals.filter((a) => a.kind === kind && (a.preg ?? 0) > 0).length;
}

export function animalSellPrice(kind: AnimalKind): number {
  return Math.max(1, Math.round(ANIMALS[kind].price * ANIMAL_RESALE_RATE * animalQualityMult(kind)));
}

export function buyAnimal(kind: AnimalKind, sex?: 'm' | 'f') {
  if (ANIMALS[kind].lv > farmLevel()) { sfx.err(); toast('lock', (GT.g3 + fa(ANIMALS[kind].lv) + GT.g4)); return; }
  if (!penHas(kind)) { sfx.err(); toast('carp', (GT.g49 + (ANIMALS[kind].fa) + GT.g50)); return; }
  const occupied = penOccupied(kind);
  const cap = penCap(kind);
  if (occupied >= cap) { toast(kind, (GT.g14 + (ANIMALS[kind].fa) + GT.g51)); sfx.err(); return; }
  if (!pay(ANIMALS[kind].price)) return;
  const hue = Math.floor(rnd() * 4);
  const rolled: 'm' | 'f' = rnd() < 0.5 ? 'm' : 'f';
  const hasFemale = S.animals.some((a) => a.kind === kind && a.sex === 'f');
  const chosenSex: 'm' | 'f' = sex ?? (!hasFemale && occupied + 1 >= cap ? 'f' : rolled);
  S.animals.push({ id: S.nextId++, kind, ready: 0, hue, sex: chosenSex, grown: 0 });
  checkAch();
  saveGame(); notify();
}

export function sellAnimal(kind: AnimalKind, sex: 'm' | 'f'): boolean {
  const adults = S.animals.filter((a) => a.kind === kind && a.sex === sex && a.grown <= 0);
  if (!adults.length) { sfx.err(); toast(kind, GT.noAdultToSell); return false; }
  adults.sort((a, b) => a.ready - b.ready);
  const target = adults[0];
  let overflowBonus = 0;
  if (target.ready > 0) {
    const prod = ANIMALS[kind].prod;
    const got = addGood(prod, target.ready);
    const overflow = target.ready - got;
    if (overflow > 0) overflowBonus = goodPrice(prod) * overflow;
    target.ready = 0;
  }
  S.animals = S.animals.filter((a) => a.id !== target.id);
  const gain = animalSellPrice(kind) + overflowBonus;
  S.coins += gain;
  S.earned += gain;
  addXp(ANIMAL_SELL_XP);
  sfx.coin();
  toast('coin', `${GT.animalSoldToast}${fa(gain)}${GT.g59}`);
  checkAch();
  saveGame(); notify();
  return true;
}
