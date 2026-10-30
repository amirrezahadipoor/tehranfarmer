import { S, UI, isNight, notify, ownedFarms, plotsForFarm, saveGame, sleepToMorning, stamCap } from './state';
import { tutOnSleep } from './tutorial';
import { debt, daysToDue } from './core/debt';
import { fa } from './data';
import { sfx } from './sound';
import { UT } from '../strings/uiText';

export type SleepOrigin = 'home' | 'quick';
let pendingSleepOrigin: SleepOrigin = 'quick';

/** استراحت سریع ۷۵٪ نیروی ازدست‌رفته را برمی‌گرداند؛ خواب خانگی همیشه کامل است. */
export function sleepStaminaAfter(before: number, natural: number, cap: number, origin: SleepOrigin): number {
  const safeCap = Math.max(0, cap);
  const safeBefore = Math.max(0, Math.min(safeCap, before));
  const safeNatural = Math.max(safeBefore, Math.min(safeCap, natural));
  if (origin === 'home') return safeCap;
  const quickTarget = Math.min(safeCap, Math.round(safeBefore + (safeCap - safeBefore) * 0.75));
  return Math.max(safeBefore, Math.min(safeNatural, quickTarget));
}

/** قبل از غروب یک تأیید کوتاه؛ شب و بعد از ساعت ۱۸ همان خواب سریع قبلی. */
export function requestSleep(origin: SleepOrigin = 'quick'): boolean {
  pendingSleepOrigin = origin;
  if (!isNight() && S.hour < 18) {
    UI.confirm = 'sleep';
    notify();
    return false;
  }
  performSleep(origin);
  return true;
}

export function performSleep(origin: SleepOrigin = pendingSleepOrigin) {
  const staminaBefore = S.stamina;
  pendingSleepOrigin = 'quick';
  UI.confirm = null;
  tutOnSleep();
  sleepToMorning();
  S.stamina = sleepStaminaAfter(staminaBefore, S.stamina, stamCap(), origin);
  saveGame();
  sfx.buy();
  UI.modal = null;
  notify();
}

export function sleepConfirmMessage(origin: SleepOrigin = pendingSleepOrigin): string {
  let ripe = 0;
  for (const farm of ownedFarms()) for (const p of plotsForFarm(farm)) if (p.st === 2 && p.ripe && !p.dead) ripe++;
  const parts = [
    UT.confirmSleepMsg,
    `${UT.sleepCurrentDay}${fa(S.day)}`,
    `${UT.sleepRipePrefix}${fa(ripe)}`,
    origin === 'home' ? UT.sleepHomeBonus : UT.sleepQuickBonus,
  ];
  if (debt()) parts.push(`${UT.sleepDuePrefix}${fa(daysToDue())}`);
  return parts.join(' · ');
}
