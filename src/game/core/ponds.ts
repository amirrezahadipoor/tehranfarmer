// ===== استخر ماهی و زنبورداری =====
import { FINGER_PRICE, HONEY_CAP_PER_HIVE, POND_FEED_BATCH, POND_FEED_CAP, POND_GROW_DAYS, POND_ROE_CHANCE, POND_YIELD, ROE_RATE_CAP, SKILL_NAT3_ROE_MULT, XP } from '../data';
import { S, notify, saveGame, toast, pay, addGood, grantGoodWithMailOverflow, invCap, invCount, addStat, addXp } from '../state';
import { sfx } from '../sound';
import { rnd } from '../rng';
import { fa } from '../../strings/fa';
import { GT } from '../../strings/gameText';

export function stockPond(i: number) {
  const p = S.ponds[i];
  if (!p || p.stocked) return;
  if ((S.inv.fingerling ?? 0) > 0) {
    S.inv.fingerling--;
    if (S.inv.fingerling <= 0) delete S.inv.fingerling;
  } else if (!pay(FINGER_PRICE)) return;
  p.stocked = true; p.grow = 0;
  toast('fish', GT.g52);
  saveGame(); notify();
}
export function feedPond(i: number) {
  const p = S.ponds[i];
  if (!p || !p.stocked) return;
  const n = Math.floor(Math.min(POND_FEED_BATCH, S.inv.feed ?? 0));
  if (n <= 0) { toast('feed', GT.g53); sfx.err(); return; }
  S.inv.feed -= n; if (S.inv.feed <= 0) delete S.inv.feed;
  p.feed = Math.min(POND_FEED_CAP, p.feed + n);
  sfx.pop(); saveGame(); notify();
}
export function harvestPond(i: number, silent = false): number {
  const p = S.ponds[i];
  if (!p || !p.stocked || p.grow < POND_GROW_DAYS) return 0;
  if (invCount() >= invCap()) {
    if (!silent) { toast('bag', GT.g43); sfx.err(); }
    return 0;
  }
  const qty = POND_YIELD[0] + Math.floor(rnd() * (POND_YIELD[1] - POND_YIELD[0] + 1));
  grantGoodWithMailOverflow('fish', qty);
  const roeRate = POND_ROE_CHANCE * (S.skills?.['nature-3'] ? SKILL_NAT3_ROE_MULT : 1);
  const roe = rnd() < Math.min(ROE_RATE_CAP, roeRate) ? 1 + Math.floor(rnd() * 2) : 0;
  if (roe) grantGoodWithMailOverflow('roe', roe);
  p.stocked = false; p.grow = 0; p.feed = 0;
  addStat('pondH', 1);
  addXp(XP.pond + roe * XP.roe);
  if (!silent) toast('fish', '+' + fa(qty) + GT.g54);
  sfx.pop(); saveGame(); notify();
  return qty;
}
export function harvestHoney(silent = false): number {
  const cap = S.hives * HONEY_CAP_PER_HIVE;
  const got = addGood('honey', Math.min(cap, Math.floor(S.honeyAcc)));
  if (got <= 0) { if (!silent) { toast('hive', S.honeyAcc >= 1 ? GT.g43 : GT.g55); sfx.err(); } return 0; }
  S.honeyAcc -= got;
  addStat('honey', got);
  addXp(got * XP.honey);
  if (!silent) toast('honey', '+' + fa(got) + GT.g56);
  sfx.pop(); saveGame(); notify();
  return got;
}
export function honeyCap() { return S.hives * HONEY_CAP_PER_HIVE; }

