import { S, UI, isNight, notify, ownedFarms, plotsForFarm, sleepToMorning } from './state';
import { tutOnSleep } from './tutorial';
import { debt, daysToDue } from './core/debt';
import { fa } from './data';
import { sfx } from './sound';
import { UT } from '../strings/uiText';

/** قبل از غروب یک تأیید کوتاه؛ شب و بعد از ساعت ۱۸ همان خواب سریع قبلی. */
export function requestSleep(): boolean {
  if (!isNight() && S.hour < 18) {
    UI.confirm = 'sleep';
    notify();
    return false;
  }
  performSleep();
  return true;
}

export function performSleep() {
  UI.confirm = null;
  tutOnSleep();
  sleepToMorning();
  sfx.buy();
  UI.modal = null;
  notify();
}

export function sleepConfirmMessage(): string {
  let ripe = 0;
  for (const farm of ownedFarms()) for (const p of plotsForFarm(farm)) if (p.st === 2 && p.ripe && !p.dead) ripe++;
  const parts = [
    UT.confirmSleepMsg,
    `${UT.sleepCurrentDay}${fa(S.day)}`,
    `${UT.sleepRipePrefix}${fa(ripe)}`,
  ];
  if (debt()) parts.push(`${UT.sleepDuePrefix}${fa(daysToDue())}`);
  return parts.join(' · ');
}
