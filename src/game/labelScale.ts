// مقیاس خواناییِ متن‌های داخل canvas؛ دسکتاپ دست‌نخورده می‌ماند.
const WORLD_W = 1280;
const WORLD_H = 720;
const PORTRAIT_MIN_W = 650;

/** ضریب لازم برای اینکه متنِ world پس از scaleِ دوربین روی گوشی هنوز خوانا باشد. */
export function worldLabelBoost(basePx = 15, minCssPx = 12, maxBoost = 1.6): number {
  if (typeof window === 'undefined') return 1;
  const cw = window.innerWidth || WORLD_W;
  const ch = window.innerHeight || WORLD_H;
  const sc = cw / ch < 0.76
    ? Math.min(ch / WORLD_H, Math.max(cw / WORLD_W, cw / PORTRAIT_MIN_W))
    : Math.min(cw / WORLD_W, ch / WORLD_H);
  if (sc >= 0.75) return 1;
  return Math.max(1, Math.min(maxBoost, minCssPx / (basePx * sc)));
}
