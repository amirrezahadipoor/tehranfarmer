// ===== سطح، تجربه، دستاورد و آمار =====
import { ACHS, ACH_OUTFIT_REWARDS, ANIMALS, CROPS, HIVE_LV, LEVEL_CAP, MACHINES, POND_LV, fa, lvReward, machineMkLv, xpNeed, type AnimalKind, type MachineId } from '../data';
import { S, toast } from '../state';
import { sfx } from '../sound';
import { GT } from '../../strings/gameText';

let lvCache = -1;
let lvCacheXp = -1;
/** ابطال کش سطح (بعد از لود/ریست سِیو) */
export function resetLvCache() { lvCache = -1; lvCacheXp = -1; }
export function farmLevel(): number {
  if (lvCache >= 0 && lvCacheXp === S.xp) return lvCache;
  let lv = 1;
  let need = 0;
  while (lv < LEVEL_CAP && S.xp >= need + xpNeed(lv)) { need += xpNeed(lv); lv++; }
  lvCache = lv;
  lvCacheXp = S.xp;
  return lv;
}
export function xpProgress(): { cur: number; need: number; lv: number } {
  const lv = farmLevel();
  if (lv >= LEVEL_CAP) return { cur: 1, need: 1, lv };
  let below = 0;
  for (let n = 1; n < lv; n++) below += xpNeed(n);
  return { cur: S.xp - below, need: xpNeed(lv), lv };
}
function unlockNews(lv: number): string[] {
  const out: string[] = [];
  for (const c of CROPS) if (c.lv === lv) out.push(c.fa);
  for (const k of Object.keys(ANIMALS) as AnimalKind[]) if (ANIMALS[k].lv === lv) out.push(ANIMALS[k].fa);
  for (const m of Object.keys(MACHINES) as MachineId[]) if (MACHINES[m].lv === lv || machineMkLv(m, 2) === lv || machineMkLv(m, 3) === lv) out.push(MACHINES[m].fa);
  if (POND_LV.includes(lv)) out.push(GT.g57);
  if (HIVE_LV.includes(lv)) out.push(GT.g58);
  return out;
}
export function achValue(stat: string): number {
  if (stat === 'level') return farmLevel();
  if (stat === 'animals') return S.animals.length;
  if (stat === 'day') return S.day;
  if (stat === 'earned') return S.earned;
  if (stat === 'debtPaid') return S.debt?.paidTotal ?? 0;
  if (stat === 'chapter') return S.story?.chapter ?? 0;
  if (stat === 'scarecrow') return S.debt?.scarecrow ?? 0;
  if (stat === 'stash') return S.debt?.stash ?? 0;
  if (stat === 'secrets') return Object.values(S.secrets ?? {}).filter(Boolean).length;
  return S.stats[stat] ?? 0;
}

export function checkAch() {
  for (const a of ACHS) {
    const val = achValue(a.stat);
    let have = S.ach[a.id] ?? 0;
    while (have < a.tiers.length && val >= a.tiers[have].n) {
      const rew = a.tiers[have].reward;
      S.coins += rew;
      S.ach[a.id] = have + 1;
      have++;
      const cosmetic = ACH_OUTFIT_REWARDS.find((r) => r.ach === a.id && r.tier === have);
      toast('medal', ((a.fa) + ": +" + (fa(rew)) + GT.g59 + (cosmetic ? ` · ${GT.achOutfitUnlocked}` : '')));
      sfx.coin();
    }
  }
}
export function addXp(n: number) {
  if (n <= 0) return;
  const before = farmLevel();
  S.xp += n;
  lvCache = -1;
  const after = farmLevel();
  if (after > before) {
    for (let l = before + 1; l <= after; l++) {
      S.coins += lvReward(l);
      toast('medal', (GT.levelUpPrefix + (fa(l)) + "! +" + (fa(lvReward(l))) + GT.g59));
      const news = unlockNews(l);
      if (news.length) toast('star', GT.g60 + news.slice(0, 3).join(GT.g61) + (news.length > 3 ? '…' : ''));
    }
    sfx.coin();
  }
  checkAch();
}
export function addStat(k: string, n: number) {
  S.stats[k] = (S.stats[k] ?? 0) + n;
  checkAch();
}

