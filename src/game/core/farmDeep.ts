// ===== مکانیک‌های عمیق مزرعه: سلامت/کیفیت دام، چاه قطره‌ای و قرارداد بازار (فاز ۶) =====
import {
  ANIMAL_QUALITY_BONUS, ANIMAL_SICK_MIN_DAY, ANIMAL_SICK_MOD, ANIMALS, CONTRACT_DAYS, CONTRACT_DEPOSIT_MIN,
  CONTRACT_DEPOSIT_RATE, CONTRACT_MAX_QTY, CONTRACT_MIN_QTY, CONTRACT_REWARD_MULT, CROPS, GOOD,
  HEART_BOND_2, MEDICINE_PRICE, MORAD2_QUALITY_MULT, MUSEUM_GIFT_COINS, ROTATION_FERT_BONUS,
  SARA2_CONTRACT_MULT, WELL_BONUS_CAN, WELL_LV_REQ, WELL_PRICES, WELL_WATER_RETENTION, XP,
  type AnimalKind,
} from '../data';
import { S, addStat, addXp, enqueueBuild, farmLevel, holdCount, notify, pay, saveGame, season, takeHold, toast, type Plot } from '../state';
import { sfx } from '../sound';
import { fa } from '../../strings/fa';
import { GT } from '../../strings/gameText';

/** ضریب کیفیت و بازده دام بر پایهٔ سطح ارتقای حصار گونه */
export function animalQualityMult(kind: AnimalKind): number {
  const lv = Math.max(1, S.pens[kind] ?? 1);
  const morad = (S.affinity?.rancher ?? 0) >= HEART_BOND_2 ? MORAD2_QUALITY_MULT : 1;
  return (1 + (lv - 1) * ANIMAL_QUALITY_BONUS) * morad;
}

/** بیمار کردن دستی یا سیستمی یک دام */
export function infectAnimal(id: number): boolean {
  const a = S.animals.find((x) => x.id === id);
  if (!a || a.sick) return false;
  a.sick = true;
  toast('heart', GT.animalSick);
  notify();
  return true;
}

/** درمان یک دام بیمار با دارو */
export function cureAnimal(id: number): boolean {
  const a = S.animals.find((x) => x.id === id);
  if (!a || !a.sick) return false;
  if (!pay(MEDICINE_PRICE)) return false;
  a.sick = false;
  addStat('cured', 1);
  toast('heart', GT.animalCured);
  sfx.coin();
  saveGame();
  notify();
  return true;
}

/** درمان همهٔ دام‌های بیمار در یک نوبت */
export function cureAllAnimals(): number {
  let cured = 0;
  for (const a of S.animals) {
    if (a.sick && cureAnimal(a.id)) cured++;
  }
  return cured;
}

/** بررسی روزانهٔ بیماری دام در صورت گرسنه‌ماندن آخور (پرندگان چرای آزاد استثنا هستند) */
export function processAnimalHealth(hungry: boolean) {
  if (!hungry || S.day < ANIMAL_SICK_MIN_DAY) return;
  for (const a of S.animals) {
    if (a.sick || a.grown > 0 || ANIMALS[a.kind].eat <= 0) continue;
    const h = (S.day * 3 + a.id) >>> 0;
    if (h % ANIMAL_SICK_MOD === 0) {
      a.sick = true;
      toast('heart', GT.animalSick);
      break;
    }
  }
}

// ===== چاه و آبیاری قطره‌ای + تناوب کشت (P6-04) =====
export const wellRetentionMult = () => WELL_WATER_RETENTION[Math.min(3, S.wellLv ?? 0)] ?? 1;
export const wellBonusCan = () => WELL_BONUS_CAN[Math.min(3, S.wellLv ?? 0)] ?? 0;
export const wellPrice = (): number | null => ((S.wellLv ?? 0) >= WELL_PRICES.length ? null : WELL_PRICES[S.wellLv ?? 0]);
export const wellLvReq = (): number => WELL_LV_REQ[S.wellLv ?? 0] ?? 0;

export function buyWell() {
  const p = wellPrice();
  if (p === null) return;
  const req = wellLvReq();
  if (req > farmLevel()) {
    sfx.err();
    toast('lock', GT.g3 + fa(req) + GT.g4);
    return;
  }
  enqueueBuild('well', 'well', GT.wellLabel, 'well', p);
}

/** پاداش کیفیت خاک هنگام کاشت محصول متفاوت از کشت قبلی (تناوب زراعی در هر ۳ مزرعه) */
export function applyCropRotation(plotIdx: number, cropId: string, plotObj?: Plot) {
  const p = plotObj ?? S.plots[plotIdx];
  if (p && p.last && p.last !== cropId) {
    p.fert = Math.min(1, p.fert + ROTATION_FERT_BONUS);
  }
}

// ===== قرارداد فروش بلندمدت بازار با ریسک و پاداش (P6-05) =====
export function offerContract() {
  const lv = farmLevel();
  const sn = season();
  const candidates = CROPS.filter((c) => c.lv <= lv && c.seasons.includes(sn));
  const pick = candidates[(Math.max(1, S.day) - 1) % Math.max(1, candidates.length)] ?? CROPS[0];
  const qty = CONTRACT_MIN_QTY + ((S.day * 3) % (CONTRACT_MAX_QTY - CONTRACT_MIN_QTY + 1));
  const baseVal = pick.price * qty;
  const deposit = Math.max(CONTRACT_DEPOSIT_MIN, Math.round(baseVal * CONTRACT_DEPOSIT_RATE));
  const saraMult = (S.affinity?.sara ?? 0) >= HEART_BOND_2 ? SARA2_CONTRACT_MULT : 1;
  const reward = Math.round(baseVal * CONTRACT_REWARD_MULT * saraMult) + deposit;
  return { good: pick.id, fa: GOOD[pick.id]?.fa ?? pick.fa, qty, deposit, reward, days: CONTRACT_DAYS };
}

export function signContract(): boolean {
  if (S.contract) return false;
  const offer = offerContract();
  if (!pay(offer.deposit)) return false;
  S.contract = {
    good: offer.good,
    qty: offer.qty,
    deposit: offer.deposit,
    reward: offer.reward,
    dueDay: S.day + offer.days,
  };
  toast('contract', GT.contractSigned);
  saveGame();
  notify();
  return true;
}

export function deliverContract(): boolean {
  const c = S.contract;
  if (!c) return false;
  // تحویل از کولهٔ پشتی هم ممکن است (سهم قرارداد در «فروش همه» در هر دو انبار محفوظ می‌ماند)
  if (holdCount(c.good) < c.qty) {
    sfx.err();
    return false;
  }
  takeHold(c.good, c.qty);
  S.coins += c.reward;
  S.earned += c.reward - c.deposit;
  addXp((c.reward - c.deposit) / XP.sellPer);
  addStat('contracts', 1);
  S.contract = null;
  toast('coin', GT.contractDone);
  sfx.coin();
  saveGame();
  notify();
  return true;
}

export function tickContract() {
  const c = S.contract;
  if (!c) return;
  if (S.day > c.dueDay) {
    S.contract = null;
    toast('close', GT.contractFailed);
    notify();
  }
}

/** بازدید و پرده‌برداری از تندیس/موزهٔ پایان‌بازی */
export function visitMuseum(): boolean {
  if (!S.story.postgame || S.museumVisited) return false;
  S.museumVisited = true;
  S.coins += MUSEUM_GIFT_COINS;
  toast('trophy', GT.museumGift);
  sfx.coin();
  saveGame();
  notify();
  return true;
}
