export type RenderQualityCap = 1 | 1.5 | 2;

/** روی صفحه‌های لمسی DPR پیش‌فرض ۱٫۵ است؛ افزایش تطبیعی نیز از همین سقف بالاتر نمی‌رود. */
export const qualityCeiling = (coarsePointer: boolean): RenderQualityCap => coarsePointer ? 1.5 : 2;

// کاهش تطبیعی هرگز از ۱× پایین‌تر نمی‌رود: خوانایی نام کرت‌ها، دام‌ها و کنترل‌ها
// برای بازی موبایل مهم‌تر از صرفه‌جویی اندکِ رندر در ۰٫۷۵× است.
export const lowerQualityCap = (cap: RenderQualityCap): RenderQualityCap => cap === 2 ? 1.5 : 1;
export const raiseQualityCap = (cap: RenderQualityCap): RenderQualityCap => cap === 1 ? 1.5 : 2;

/** آستانه‌ها برای فاصلهٔ فریمِ واقعیِ رندر، نه rAFهایی که بدون رندر رد می‌شوند. */
export const frameIsSlow = (ms: number, active: boolean) => ms > (active ? 22 : 40);
export const frameIsStable = (ms: number, active: boolean) => ms < (active ? 18 : 34);

/**
 * Cutscenes freeze gameplay simulation, not rendering cost. They still need
 * adaptive DPR so the most particle-heavy scenes do not get stuck at 1.5×.
 */
export const shouldAdaptRenderQuality = (stepDriven: boolean, frozen: boolean, cinemaActive: boolean) =>
  !stepDriven && (!frozen || cinemaActive);
