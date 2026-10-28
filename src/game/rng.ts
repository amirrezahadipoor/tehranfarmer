// ===== تولید عدد تصادفی قابل تعیین (mulberry32) =====
// منطق بازی فقط از این ماژول استفاده می‌کند تا تست و شبیه‌ساز قطعی و بازتولیدپذیر باشند.
let seed = (Date.now() ^ 0x9e3779b9) >>> 0;

export function setSeed(s: number) { seed = s >>> 0; }
export function getSeed() { return seed; }
export function nextSeed() { return (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0); }

/** عدد اعشاری در [0,1) */
export function rnd(): number {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** عدد صحیح در [0,n) */
export const randInt = (n: number) => (n <= 0 ? 0 : Math.floor(rnd() * n));
/** عدد صحیح در [a,b] */
export const randRange = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
/** با احتمال p */
export const chance = (p: number) => rnd() < p;
/** انتخاب تصادفی از آرایه */
export function pick<T>(arr: readonly T[]): T { return arr[randInt(arr.length)]; }
/** لرزش ±jitter حول مقدار */
export const jitter = (v: number, j: number) => v + (rnd() * 2 - 1) * j;
