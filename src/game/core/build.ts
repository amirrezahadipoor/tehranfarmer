// ===== ساخت‌وساز، ارتقاها و سفارش‌های نجاری =====
import {
  ANIMALS, GH_LV, GH_PRICE, HEART_BOND_2, HIVE_LV, HIVE_MAX, HOE_PRICES, CAN_PRICES, BAG_PRICES, KAVEH2_PRICE_MULT,
  STAM_PRICES, LAND_PRICES, MACHINES, PEN_BUILD, PEN_UP, POND_LV, POND_MAX, SILO_LV, SILO_PRICE, SOIL_LV, SOIL_PRICES,
  UP_LV, WORKER_LV, WORKER_MAX, WORKER_PRICES, buildDur, hivePrice, pondPrice, machineMkLv, machineMkPrice, XP,
  type AnimalKind, type BuildJob, type MachineId,
} from '../data';
import { S, UI, notify, notifyFarmMilestoneMail, saveGame, syncMailboxState, toast, pay, farmLevel, landPrice, canCap, stamCap, addStat, addXp, troughCap, scarecrowPrice } from '../state';
import { sfx } from '../sound';
import { fa } from '../../strings/fa';
import { GT } from '../../strings/gameText';
import { ESTATE_LV_REQ } from '../estates';
import { charterBuildDurMult, charterMachinePriceMult } from './frontier';
import { triggerCutscene } from '../../story/engine';

export type UpKey = 'hoe' | 'can' | 'bag' | 'stam' | 'land' | 'soil';
export function upgradePrice(k: UpKey): number | null {
  if (k === 'land') return S.lv.land >= LAND_PRICES.length ? null : landPrice(S.lv.land);
  if (k === 'soil') return S.lv.soil >= SOIL_PRICES.length ? null : SOIL_PRICES[S.lv.soil];
  const t = { hoe: HOE_PRICES, can: CAN_PRICES, bag: BAG_PRICES, stam: STAM_PRICES }[k];
  return t[S.lv[k]] ?? null;
}
/** سطح لازم برای ارتقای بعدی */
export function upgradeLvReq(k: UpKey): number {
  if (k === 'soil') return SOIL_LV[S.lv.soil] ?? 0;
  if (k === 'land') return ESTATE_LV_REQ[S.lv.land] ?? 0;
  const t = UP_LV[k];
  return t[S.lv[k]] ?? 0;
}

// ===== ساخت و ساز: کارگر شهر می‌آید، می‌سازد و می‌رود =====
export function enqueueBuild(kind: BuildJob['kind'], key: string, label: string, icon: string, price: number, instantApply?: () => void): boolean {
  if (S.builds.some((b) => b.kind === kind && b.key === key)) { toast('hammer', GT.g1); sfx.err(); return false; }
  if (!pay(price)) return false;
  if (instantApply) instantApply();
  S.builds.push({ id: S.nextId++, kind, key, label, icon, prog: 0, dur: buildDur(price) * charterBuildDurMult() });
  addStat('builds_queued', 1);
  toast('hammer', GT.g2);
  saveGame(); notify();
  return true;
}
export function buyUpgrade(k: UpKey) {
  const p = upgradePrice(k);
  if (p === null) return;
  const req = upgradeLvReq(k);
  if (req > farmLevel()) { sfx.err(); toast('lock', (GT.g3 + fa(req) + GT.g4)); return; }
  const names = { hoe: GT.g5, can: GT.g6, bag: GT.g7, stam: GT.g8, land: GT.g9, soil: GT.g10 };
  const icons = { hoe: 'hoe', can: 'can', bag: 'bag', stam: 'bolt', land: 'land', soil: 'fert' };
  enqueueBuild('upgrade', k, GT.g11 + names[k], icons[k], p);
}
export function effectiveMachinePrice(id: MachineId, mk: number): number {
  const base = machineMkPrice(id, mk);
  const bond = (S.affinity?.engineer ?? 0) >= HEART_BOND_2 ? KAVEH2_PRICE_MULT : 1;
  return Math.round(base * bond * charterMachinePriceMult());
}
export function buyMachine(id: MachineId) {
  const mk = S.machines[id] ?? 0;
  if (mk >= 3) return;
  if (mk + S.builds.filter((b) => b.kind === 'machine' && b.key === id).length >= 3) return;
  const req = machineMkLv(id, mk + 1);
  if (req > farmLevel()) { sfx.err(); toast('lock', (GT.g3 + fa(req) + GT.g4)); return; }
  enqueueBuild('machine', id, ((MACHINES[id].fa) + GT.g12 + fa(mk + 1) + ")"), MACHINES[id].icon, effectiveMachinePrice(id, mk + 1));
}
export function buyWorker() {
  if (S.workers >= WORKER_MAX) return;
  const req = WORKER_LV[S.workers];
  if (req > farmLevel()) { sfx.err(); toast('lock', (GT.g3 + fa(req) + GT.g4)); return; }
  // استخدام مجدد کارگرانی که قبلاً خریداری شده‌اند (اشتراک از دست رفته در کسری حقوق) رایگان است؛
  // نردبان قیمت فقط هنگام فراتر رفتن از بیشینهٔ تاکنونی اعمال می‌شود تا یک شب کسری حقوق ۲۸۱٬۹۰۰ سکه نسوزاند.
  const rehire = (S.workersHired ?? 0) > S.workers;
  if (!rehire && !pay(WORKER_PRICES[S.workers])) return;
  S.workers = Math.min(WORKER_MAX, S.workers + 1);
  S.workersHired = Math.max(S.workersHired ?? 0, S.workers);
  addStat('builds', 1);
  addXp(XP.buildBase);
  toast('worker', GT.workerArrived);
  sfx.coin();
  saveGame();
  notify();
}
// ===== سفارش‌های نجار: ابزار، انبار، خاک، حصار، گلخانه، سیلو، استخر، کندو =====
export function buyPen(kind: AnimalKind) {
  if ((S.pens[kind] ?? 0) > 0) return;
  if (ANIMALS[kind].lv > farmLevel()) { sfx.err(); toast('lock', (GT.g3 + fa(ANIMALS[kind].lv) + GT.g4)); return; }
  enqueueBuild('pen', kind, GT.g14 + ANIMALS[kind].fa, kind, PEN_BUILD[kind]);
}
export function buyPenUp(kind: AnimalKind) {
  const lv = S.pens[kind] ?? 0;
  if (lv < 1 || lv >= 3) return;
  enqueueBuild('penup', kind, GT.g15 + ANIMALS[kind].fa, kind, PEN_UP[lv]);
}
export function buyGh() {
  if (S.gh >= GH_PRICE.length) return;
  const req = GH_LV[S.gh];
  if (req > farmLevel()) { sfx.err(); toast('lock', (GT.g3 + fa(req) + GT.g4)); return; }
  enqueueBuild('gh', 'gh', S.gh ? GT.g16 : GT.g17, 'greenhouse', GH_PRICE[S.gh]);
}
export function buySilo() {
  if (S.silo >= SILO_PRICE.length) return;
  const req = SILO_LV[S.silo];
  if (req > farmLevel()) { sfx.err(); toast('lock', (GT.g3 + fa(req) + GT.g4)); return; }
  enqueueBuild('silo', 'silo', S.silo ? GT.g18 : GT.g19, 'silo', SILO_PRICE[S.silo]);
}
export function buyPond() {
  if (S.ponds.length >= POND_MAX) { toast('pond', GT.g20); return; }
  const req = POND_LV[S.ponds.length];
  if (req > farmLevel()) { sfx.err(); toast('lock', (GT.g3 + fa(req) + GT.g4)); return; }
  enqueueBuild('pond', 'pond', GT.g21, 'pond', pondPrice(S.ponds.length));
}
export function buyHive() {
  if (S.hives >= HIVE_MAX) { toast('hive', GT.g22); return; }
  const req = HIVE_LV[S.hives];
  if (req > farmLevel()) { sfx.err(); toast('lock', (GT.g3 + fa(req) + GT.g4)); return; }
  enqueueBuild('hive', 'hive', GT.g23, 'hive', hivePrice(S.hives));
}
export function orderScarecrow() {
  if (!S.debt || S.debt.scarecrow >= 3) return;
  enqueueBuild('scarecrow', 'scarecrow', GT.scarecrowBuild, 'scarecrow', scarecrowPrice());
}
export function buildJobLabel(j: Pick<BuildJob, 'kind' | 'key' | 'label'>): string {
  switch (j.kind) {
    case 'upgrade': {
      const names: Record<UpKey, string> = { hoe: GT.g5, can: GT.g6, bag: GT.g7, stam: GT.g8, land: GT.g9, soil: GT.g10 };
      return names[j.key as UpKey] ? GT.g11 + names[j.key as UpKey] : j.label;
    }
    case 'machine': {
      const m = MACHINES[j.key as MachineId];
      if (!m) return j.label;
      const mk = Math.min(3, Math.max(1, S.machines[j.key as MachineId] || 1));
      return m.fa + GT.g12 + fa(mk) + ')';
    }
    case 'pen': return ANIMALS[j.key as AnimalKind] ? GT.g14 + ANIMALS[j.key as AnimalKind].fa : j.label;
    case 'penup': return ANIMALS[j.key as AnimalKind] ? GT.g15 + ANIMALS[j.key as AnimalKind].fa : j.label;
    case 'gh': return S.gh > 1 ? GT.g16 : GT.g17;
    case 'silo': return S.silo > 1 ? GT.g18 : GT.g19;
    case 'pond': return GT.g21;
    case 'hive': return GT.g23;
    case 'scarecrow': return GT.scarecrowBuild;
    case 'well': return GT.wellLabel;
    default: return j.label;
  }
}

export function completeBuild(id: number) {
  const j = S.builds.find((b) => b.id === id);
  if (!j) return;
  S.builds = S.builds.filter((b) => b.id !== id);
  switch (j.kind) {
    case 'upgrade': {
      const k = j.key as UpKey;
      S.lv[k]++;
      if (k === 'can') S.can = canCap();
      if (k === 'stam') S.stamina = stamCap();
      if (k === 'land' && UI.started) {
        const landStory = ['estate-north-bought', 'estate-north-qanat', 'estate-valley-bought', 'estate-valley-legacy'][S.lv.land - 1];
        if (landStory) triggerCutscene(landStory as Parameters<typeof triggerCutscene>[0]);
      }
      break;
    }
    case 'machine': {
      const k = j.key as MachineId;
      S.machines[k] = Math.min(3, (S.machines[k] ?? 0) + 1);
      S.auto[MACHINES[k].auto] = true;
      break;
    }
    case 'pond': S.ponds.push({ id: S.nextId++, stocked: false, grow: 0, feed: 0 }); break;
    case 'hive': S.hives++; break;
    case 'worker': S.workers = Math.min(WORKER_MAX, S.workers + 1); S.workersHired = Math.max(S.workersHired ?? 0, S.workers); break;
    case 'pen': S.pens[j.key as AnimalKind] = 1; break;
    case 'penup': S.pens[j.key as AnimalKind] = Math.min(3, (S.pens[j.key as AnimalKind] ?? 0) + 1); break;
    case 'gh': S.gh = Math.min(GH_PRICE.length, S.gh + 1); break;
    case 'silo': S.silo = Math.min(SILO_PRICE.length, S.silo + 1); S.trough = Math.min(S.trough, troughCap()); break;
    case 'scarecrow': if (S.debt && S.debt.scarecrow < 3) S.debt.scarecrow = (S.debt.scarecrow + 1) as 0 | 1 | 2 | 3; break;
    case 'well': S.wellLv = Math.min(3, (S.wellLv ?? 0) + 1); S.can = canCap(); break;
    case 'soil': S.lv.soil++; break;
  }
  addStat('builds', 1);
  addXp(XP.buildBase);
  toast(j.icon, buildJobLabel(j) + GT.g24);
  notifyFarmMilestoneMail('build', buildJobLabel(j), j.kind, j.key);
  syncMailboxState(false);
  sfx.coin();
  saveGame(); notify();
}
/** پیشرفت ساخت‌وساز با زمان واقعی */
export function tickBuilds(dt: number) {
  if (!S.builds.length) return;
  const j = S.builds[0];
  j.prog += dt;
  if (j.prog >= j.dur) completeBuild(j.id);
}

