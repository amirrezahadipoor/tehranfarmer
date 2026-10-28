// Multi-Estate Geometry, Regional Soil Specialties, Ownership & Plot Addressing (Main 40 + North 54 + Valley 60 = 154 plots)
import type { CropId } from './data';

export type FarmSceneId = 'farm' | 'north' | 'valley';
export type SceneId = FarmSceneId | 'town' | 'river' | 'apiary';

export interface EstatePlot {
  st: 0 | 1 | 2;
  crop: CropId | null;
  prog: number;
  water: number;
  fert: number;
  last: CropId | null;
  dead: boolean;
  dry: number;
  ripe: boolean;
  n: number;
  hand?: boolean;
}

export interface EstateSpec {
  id: FarmSceneId;
  cols: number;
  rows: number;
  fx: number;
  fy: number;
  dx: number;
  dy: number;
  minLandLv: number;
  wellX: number;
  wellY: number;
  barnX: number;
  barnY: number;
}

export const NORTH_COLS = 9;
export const NORTH_ROWS = 6;
export const NORTH_PLOTS_COUNT = NORTH_COLS * NORTH_ROWS; // 54 (> 40 Main Farm)

export const VALLEY_COLS = 10;
export const VALLEY_ROWS = 6;
export const VALLEY_PLOTS_COUNT = VALLEY_COLS * VALLEY_ROWS; // 60 (> 54 Northern Meadow)

/** Level gates for the 4 Estate Office milestones:
 *  0->1: Buy Northern Meadow Farm (54 plots, Lv 4 / Ch 2)
 *  1->2: Restore Northern Meadow Qanat (Lv 9 / Ch 3-4)
 *  2->3: Buy Sunlit Valley Farm (60 plots, Lv 14 / Ch 4-5)
 *  3->4: Unify Three-Estate Heritage Charter (Lv 21 / Ch 6)
 */
export const ESTATE_LV_REQ = [4, 9, 14, 21] as const;

/** Real, calibrated crop growth rate per farm (specialty microclimate boosts regional crops cleanly inside every 7-day season!) */
/** Calibrated estate growth rate (when a dedicated regional seed is assigned to North/Valley, its microclimate boosts ripening into every 7-day season!) */
export function estateGrowthRate(farm: FarmSceneId, landLv: number): number {
  if (farm === 'farm') return 0.36;
  if (farm === 'north') return landLv >= 2 ? 0.046 : 0.036;
  return landLv >= 4 ? 0.046 : 0.031;
}

export const ESTATE_SPECIALTIES: Record<FarmSceneId, readonly CropId[]> = {
  farm: ['carrot', 'potato', 'cucumber', 'tomato', 'strawberry', 'pepper', 'watermelon', 'pumpkin'],
  north: ['wheat', 'onion', 'corn', 'rice', 'sunflower', 'saffron'],
  valley: ['grape', 'olive', 'fig', 'plum', 'cherry', 'peach', 'orange', 'pomegranate', 'pistachio', 'rose'],
};

export function bestEstateForCrop(crop: CropId): FarmSceneId {
  if (ESTATE_SPECIALTIES.valley.includes(crop)) return 'valley';
  if (ESTATE_SPECIALTIES.north.includes(crop)) return 'north';
  return 'farm';
}

export function estateSpecialtyMult(farm: FarmSceneId, crop: CropId | null): number {
  if (!crop) return 1;
  if (!ESTATE_SPECIALTIES[farm].includes(crop)) return 1;
  if (farm === 'valley') return 1.25;
  if (farm === 'north') return 1.2;
  return 1.12;
}

export const ESTATES: Record<FarmSceneId, EstateSpec> = {
  farm: {
    id: 'farm',
    cols: 8,
    rows: 5,
    fx: 434,
    fy: 248,
    dx: 86,
    dy: 64,
    minLandLv: 0,
    wellX: 372,
    wellY: 284,
    barnX: 1040,
    barnY: 240,
  },
  north: {
    id: 'north',
    cols: NORTH_COLS,
    rows: NORTH_ROWS,
    fx: 262,
    fy: 228,
    dx: 88,
    dy: 56,
    minLandLv: 1,
    wellX: 150,
    wellY: 392,
    barnX: 1148,
    barnY: 244,
  },
  valley: {
    id: 'valley',
    cols: VALLEY_COLS,
    rows: VALLEY_ROWS,
    fx: 248,
    fy: 228,
    dx: 82,
    dy: 56,
    minLandLv: 3,
    wellX: 148,
    wellY: 388,
    barnX: 1158,
    barnY: 244,
  },
};

export const ALL_FARM_IDS: readonly FarmSceneId[] = ['farm', 'north', 'valley'];

export function isFarmScene(sc: string): sc is FarmSceneId {
  return sc === 'farm' || sc === 'north' || sc === 'valley';
}

export function isEstateOwned(farm: FarmSceneId, landLv: number): boolean {
  return landLv >= ESTATES[farm].minLandLv;
}

export function totalPlotsForLand(landLv: number): number {
  let total = ESTATES.farm.cols * ESTATES.farm.rows;
  if (landLv >= ESTATES.north.minLandLv) total += NORTH_PLOTS_COUNT;
  if (landLv >= ESTATES.valley.minLandLv) total += VALLEY_PLOTS_COUNT;
  return total;
}

export function estatePlotCenter(farm: FarmSceneId, i: number): { cx: number; cy: number } {
  const e = ESTATES[farm];
  return {
    cx: e.fx + (i % e.cols) * e.dx + e.dx / 2,
    cy: e.fy + Math.floor(i / e.cols) * e.dy + e.dy / 2,
  };
}

export function estatePlotAt(farm: FarmSceneId, x: number, y: number): number {
  const e = ESTATES[farm];
  if (x < e.fx || x >= e.fx + e.cols * e.dx || y < e.fy || y >= e.fy + e.rows * e.dy) return -1;
  const c = Math.floor((x - e.fx) / e.dx);
  const r = Math.floor((y - e.fy) / e.dy);
  return r * e.cols + c;
}

export function estateWaterRetention(farm: FarmSceneId, landLv: number): number {
  if (farm === 'north' && landLv >= 2) return 0.84;
  if (farm === 'valley' && landLv >= 4) return 0.82;
  return 1;
}
