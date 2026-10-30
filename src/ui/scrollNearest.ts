export interface VerticalRect {
  top: number;
  bottom: number;
}

/** کمترین جابه‌جایی لازم برای دیده‌شدن هدف؛ هدف کاملاً دیده‌شده نباید صفحه را جابه‌جا کند. */
export function nearestScrollDelta(container: VerticalRect, target: VerticalRect, padding = 8): number {
  if (target.top >= container.top && target.bottom <= container.bottom) return 0;
  if (target.top < container.top) return target.top - container.top - padding;
  return target.bottom - container.bottom + padding;
}
