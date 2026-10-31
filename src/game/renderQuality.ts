export type RenderQualityCap = 0.75 | 1 | 1.5 | 2;

/** روی صفحه‌های لمسی DPR پیش‌فرض ۱٫۵ است؛ افزایش تطبیعی نیز از همین سقف بالاتر نمی‌رود. */
export const qualityCeiling = (coarsePointer: boolean): RenderQualityCap => coarsePointer ? 1.5 : 2;

export const lowerQualityCap = (cap: RenderQualityCap): RenderQualityCap => cap === 2 ? 1.5 : cap === 1.5 ? 1 : 0.75;
export const raiseQualityCap = (cap: RenderQualityCap): RenderQualityCap => cap === 0.75 ? 1 : cap === 1 ? 1.5 : 2;

/** آستانه‌ها برای فاصلهٔ فریمِ واقعیِ رندر، نه rAFهایی که بدون رندر رد می‌شوند. */
export const frameIsSlow = (ms: number, active: boolean) => ms > (active ? 22 : 40);
export const frameIsStable = (ms: number, active: boolean) => ms < (active ? 18 : 34);

/**
 * Cutscenes freeze gameplay simulation, not rendering cost. They still need
 * adaptive DPR so the most particle-heavy scenes do not get stuck at 1.5×.
 */
export const shouldAdaptRenderQuality = (stepDriven: boolean, frozen: boolean, cinemaActive: boolean) =>
  !stepDriven && (!frozen || cinemaActive);
