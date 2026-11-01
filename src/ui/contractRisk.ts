import { CROP, DAY_RATE, GH_SPEED, MK_GROW, type CropDef } from '../game/data';
import { S, ghCoversFarm, mkOf, ownedFarms, plotsForFarm } from '../game/state';
import { estateGrowthRate, estateSpecialtyMult } from '../game/estates';
import { hasSkill } from '../game/core/rpgSystems';

export interface ContractPlantingAssessment {
  openFieldLate: boolean;
  greenhouseRescue: boolean;
}

const seasonForDay = (day: number) => Math.floor((day - 1) / 7) % 4;

/** Best current legitimate rate, with ideal fertility/watering so the warning never overstates risk. */
function bestPlantingRate(crop: CropDef, greenhouse: boolean): number {
  const dedicatedMode = S.crewRole === 'crops' || hasSkill('crop-1');
  const sprinklerGrow = dedicatedMode ? MK_GROW[mkOf('sprinkler')] : 1;
  const skillGrow = (hasSkill('crop-1') ? 1.1 : 1) * ((S.affinity?.grandma ?? 0) >= 100 ? 1.1 : 1) * ((S.affinity?.engineer ?? 0) >= 100 ? 1.06 : 1);
  let best = 0;
  for (const farm of ownedFarms()) {
    const hasPlot = plotsForFarm(farm).some((_, i) => (S.gh > 0 && ghCoversFarm(farm, i)) === greenhouse);
    if (!hasPlot) continue;
    const automatic = DAY_RATE * estateGrowthRate(farm, S.lv.land) * sprinklerGrow * skillGrow;
    const manual = farm === 'farm' ? 0 : DAY_RATE * 0.36 * estateSpecialtyMult(farm, crop.id) * MK_GROW[mkOf('sprinkler')] * (1 + mkOf('drone') * 0.03) * skillGrow;
    const growth = farm === 'farm' ? automatic : Math.max(automatic, manual);
    const greenhouseMult = greenhouse ? GH_SPEED[S.gh] : 1;
    best = Math.max(best, (growth / crop.days) * greenhouseMult * (0.83 + 0.44));
  }
  return best;
}

function daysThroughDue(dueDay: number, crop?: CropDef): number {
  const hour = Math.max(0, Math.min(24, S.hour));
  let days = 0;
  for (let day = S.day; day <= dueDay; day++) {
    if (crop && !crop.regrow && !crop.seasons.includes(seasonForDay(day))) continue;
    days += (day === S.day ? 24 - hour : 24) / 24;
  }
  return days;
}

/** Read-only pre-sign assessment; null means there is not enough safe growth data to warn. */
export function assessContractPlanting(good: string, dueDay: number): ContractPlantingAssessment | null {
  const crop = CROP[good];
  if (!crop || !Number.isFinite(dueDay) || !Number.isFinite(S.day) || !Number.isFinite(S.hour) || dueDay < S.day || dueDay - S.day > 62) return null;
  const openRate = bestPlantingRate(crop, false);
  if (!Number.isFinite(openRate) || openRate <= 0) return null;
  const openFieldLate = daysThroughDue(dueDay, crop) * openRate < 1 - 1e-9;
  if (!openFieldLate) return { openFieldLate: false, greenhouseRescue: false };
  const greenhouseRate = S.gh > 0 ? bestPlantingRate(crop, true) : 0;
  const greenhouseRescue = greenhouseRate > 0 && daysThroughDue(dueDay) * greenhouseRate >= 1 - 1e-9;
  return { openFieldLate: true, greenhouseRescue };
}
