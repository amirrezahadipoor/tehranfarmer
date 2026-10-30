import type { FishBehavior } from './fishMotion';

export interface FishProfile {
  speed: number;
  barH: number;
  bonusMult: number;
  behavior: FishBehavior;
}

/** اولین صیدها تا ثبت اولین ماهی، آرام و با کادر بزرگ‌تر آموزش داده می‌شوند. */
export const PRACTICE_FISH_PROFILE: Readonly<FishProfile> = {
  speed: 0.38,
  barH: 38,
  bonusMult: 1,
  behavior: 'sine',
};

export function isPracticeFishing(stats: Record<string, number>): boolean {
  return (stats.fish ?? 0) + (stats.roeN ?? 0) <= 0;
}

/** فقط نخستین شکستِ ثبت‌شده در کل سیو نیرو مصرف نمی‌کند. */
export function fishingStaminaCost(attempt: number, landed: boolean, normalCost: number): number {
  return !landed && Math.max(1, Math.floor(attempt)) === 1 ? 0 : normalCost;
}
