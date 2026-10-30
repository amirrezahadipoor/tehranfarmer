import { describe, expect, it } from 'vitest';
import { nearestScrollDelta } from './scrollNearest';

describe('nearestScrollDelta', () => {
  const container = { top: 20, bottom: 380 };

  it('does not move a fully visible market item', () => {
    expect(nearestScrollDelta(container, { top: 80, bottom: 240 })).toBe(0);
  });

  it('scrolls only the missing distance below the viewport', () => {
    expect(nearestScrollDelta(container, { top: 250, bottom: 410 })).toBe(38);
  });

  it('scrolls only the missing distance above the viewport', () => {
    expect(nearestScrollDelta(container, { top: 0, bottom: 120 })).toBe(-28);
  });
});
