export interface FrontierHitNode {
  idx: number;
  x: number;
  y: number;
}

export type FrontierHit =
  | { kind: 'exit' }
  | { kind: 'shrine' }
  | { kind: 'node'; idx: number }
  | { kind: 'next' }
  | { kind: 'prev' }
  | null;

/**
 * Shared pointer/semantic hit resolver for the mine and forest.
 * Active resource circles take priority over the broad lift rectangles: the
 * fifth resource on deeper floors intentionally sits close to the return arch.
 */
export function resolveFrontierHit(
  scene: 'cave' | 'forest',
  x: number,
  y: number,
  layer: number,
  nodes: readonly FrontierHitNode[],
  isHarvested: (idx: number) => boolean,
): FrontierHit {
  if (x >= 76 && x <= 220 && y >= 294 && y <= 680) return { kind: 'exit' };
  if (scene === 'forest' && Math.abs(x - 640) <= 86 && y >= 250 && y <= 425) return { kind: 'shrine' };

  for (const spot of nodes) {
    if (isHarvested(spot.idx)) continue;
    if (Math.hypot(x - spot.x, y - spot.y) <= 66) return { kind: 'node', idx: spot.idx };
  }

  if (layer < 3 && x >= 1072 && x <= 1224 && y >= 252 && y <= 574) return { kind: 'next' };
  if (layer > 1 && x >= 916 && x <= 1044 && y >= 282 && y <= 574) return { kind: 'prev' };
  return null;
}
