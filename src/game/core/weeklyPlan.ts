import { GOODS } from '../data';
import { S, notify, ownedFarms, plotsForFarm, saveGame, toast } from '../state';
import { addStat } from './progress';
import { sfx } from '../sound';
import { WX } from '../../strings/worldExpansionText';

export type WeeklyPlanKind = 'field' | 'market';
export const WEEKLY_PLAN_FIELD_COST = 10;
export const WEEKLY_PLAN_MARKET_COST = 12;

/** One optional, deterministic decision on day three of each week in chapters 2–5. */
export function weeklyPlanStatus() {
  const week = Math.floor((S.day - 1) / 7);
  const selected = S.weeklyPlan?.week === week ? S.weeklyPlan.kind : null;
  const offered = S.story.chapter >= 2 && S.story.chapter <= 5 && !S.story.postgame && (S.day - 1) % 7 === 2;
  let fieldTargets = 0;
  if (offered && !selected) {
    for (const farm of ownedFarms()) {
      for (const plot of plotsForFarm(farm)) if (plot.st === 2 && !plot.dead) fieldTargets++;
    }
  }
  return { week, offered, selected, fieldTargets };
}

export function chooseWeeklyPlan(kind: WeeklyPlanKind): boolean {
  const status = weeklyPlanStatus();
  const cost = kind === 'field' ? WEEKLY_PLAN_FIELD_COST : WEEKLY_PLAN_MARKET_COST;
  if (!status.offered || status.selected || S.stamina < cost) return false;
  if (kind === 'field' && status.fieldTargets === 0) return false;

  S.weeklyPlan = { week: status.week, day: S.day, kind };
  S.stamina = Math.max(0, S.stamina - cost);
  if (kind === 'field') {
    for (const farm of ownedFarms()) {
      for (const plot of plotsForFarm(farm)) {
        if (plot.st === 2 && !plot.dead) plot.water = Math.min(1, plot.water + 0.35);
      }
    }
  } else {
    for (const good of GOODS) S.dem[good.id] = Math.min(1.75, (S.dem[good.id] ?? 1) * 1.1);
  }
  addStat('weeklyPlans', 1);
  addStat(`weeklyPlan:${kind}`, 1);
  toast(kind === 'field' ? 'drop' : 'market', kind === 'field' ? WX.morningWeeklyFieldDone : WX.morningWeeklyMarketDone);
  if (kind === 'field') sfx.water(); else sfx.buy();
  saveGame();
  notify();
  return true;
}
