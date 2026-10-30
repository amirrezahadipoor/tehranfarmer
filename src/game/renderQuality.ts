export type RenderQualityCap = 1 | 1.5 | 2;

export const lowerQualityCap = (cap: RenderQualityCap): RenderQualityCap => cap === 2 ? 1.5 : 1;
export const raiseQualityCap = (cap: RenderQualityCap): RenderQualityCap => cap === 1 ? 1.5 : 2;

/** آستانه‌ها برای فاصلهٔ فریمِ واقعیِ رندر، نه rAFهایی که بدون رندر رد می‌شوند. */
export const frameIsSlow = (ms: number, active: boolean) => ms > (active ? 22 : 40);
export const frameIsStable = (ms: number, active: boolean) => ms < (active ? 18 : 34);
