import { describe, expect, it } from 'vitest';
import { CROPS, fa, xpNeed } from '../src/game/data';

describe('پایه', () => {
  it('تابع fa اعداد را فارسی و سه‌رقمی جدا می‌کند', () => {
    expect(fa(1234567)).toBe('۱٬۲۳۴٬۵۶۷');
    expect(fa(-42)).toBe('-۴۲');
  });
  it('۲۴ محصول تعریف شده و شناسه‌ها یکتا هستند', () => {
    expect(CROPS).toHaveLength(24);
    expect(new Set(CROPS.map((c) => c.id)).size).toBe(24);
  });
  it('تجربهٔ سطح صعودی است', () => {
    for (let i = 1; i < 30; i++) expect(xpNeed(i + 1)).toBeGreaterThan(xpNeed(i));
  });
});
