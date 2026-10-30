import { DAY_RATE } from '../data';
import { estateGrowthRate, type FarmSceneId } from '../estates';

/** Base growth duration in game days, using the same constants as the live plot simulation. */
export function seedDurationDays(
  crop: { days: number },
  farm: FarmSceneId = 'farm',
  landLevel = 0,
  fertility = 0,
): number {
  const fert = Number.isFinite(fertility) ? Math.max(0, Math.min(1, fertility)) : 0;
  const dailyRate = (DAY_RATE * estateGrowthRate(farm, landLevel) * (0.83 + 0.44 * fert)) / crop.days;
  const days = 1 / Math.max(0.0001, dailyRate);
  return Math.round(days * 10) / 10;
}
