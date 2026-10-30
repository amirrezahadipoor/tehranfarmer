import { describe, expect, it } from 'vitest';
import { advanceFishMotion, createFishMotionState, type FishBehavior } from './fishMotion';

function path(behavior: FishBehavior) {
  const state = createFishMotionState();
  const points: number[] = [];
  for (let i = 0; i < 300; i++) {
    advanceFishMotion(state, behavior, 1, i * (1000 / 60), 1 / 60);
    if (i % 15 === 0) points.push(state.fishY);
  }
  return points;
}

describe('fishing motion', () => {
  it('is deterministic and gives all five behaviors distinct paths', () => {
    const behaviors: FishBehavior[] = ['sine', 'dart', 'pause', 'surge', 'dive'];
    const paths = behaviors.map(path);
    for (let i = 0; i < paths.length; i++) {
      expect(path(behaviors[i])).toEqual(paths[i]);
      for (let j = i + 1; j < paths.length; j++) {
        const difference = paths[i].reduce((sum, y, k) => sum + Math.abs(y - paths[j][k]), 0);
        expect(difference, `${behaviors[i]} vs ${behaviors[j]}`).toBeGreaterThan(10);
      }
    }
  });

  it('keeps every position inside the water column', () => {
    for (const behavior of ['sine', 'dart', 'pause', 'surge', 'dive'] as const) {
      for (const y of path(behavior)) {
        expect(y).toBeGreaterThanOrEqual(8);
        expect(y).toBeLessThanOrEqual(90);
      }
    }
  });
});
