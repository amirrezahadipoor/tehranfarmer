import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fresh, S, UI } from '../state';
import { activeFrontierNodes, freshFrontier } from './frontier';
import { activeMineNodes } from './mining';
import { resolveFrontierHit } from './frontierHits';
import { createSceneTapRouter, type SceneInputDeps } from '../engineInput';
import type { Task, Walker } from '../engineRender';

describe('frontier hit resolution across every node and layer', () => {
  beforeEach(() => {
    Object.assign(S, fresh());
    S.frontier = freshFrontier();
    S.frontier.nodesDay = S.day;
  });

  it('resolves all 18 mine nodes as resources, including the former lift overlap', () => {
    for (let floor = 1; floor <= 3; floor++) {
      for (const node of activeMineNodes(floor)) {
        expect(resolveFrontierHit('cave', node.x, node.y, floor, activeMineNodes(floor), () => false))
          .toEqual({ kind: 'node', idx: node.idx });
      }
      expect(resolveFrontierHit('cave', 945, 568, floor, activeMineNodes(floor), () => false))
        .toEqual({ kind: 'node', idx: 4 });
    }
  });

  it('resolves all 18 forest nodes as resources, including layer two node four', () => {
    for (let layer = 1; layer <= 3; layer++) {
      S.frontier!.forestLayer = layer;
      const nodes = activeFrontierNodes('forest');
      for (const node of nodes) {
        expect(resolveFrontierHit('forest', node.x, node.y, layer, nodes, () => false))
          .toEqual({ kind: 'node', idx: node.idx });
      }
      expect(resolveFrontierHit('forest', 956, 566, layer, nodes, () => false))
        .toEqual({ kind: 'node', idx: 4 });
    }
  });

  it('keeps explicit lift controls independent and lets harvested nodes yield the arch again', () => {
    const mine = activeMineNodes(2);
    expect(resolveFrontierHit('cave', 980, 400, 2, mine, () => false)).toEqual({ kind: 'prev' });
    expect(resolveFrontierHit('cave', 1148, 400, 2, mine, () => false)).toEqual({ kind: 'next' });
    expect(resolveFrontierHit('cave', 945, 568, 2, mine, (idx) => idx === 4)).toEqual({ kind: 'prev' });

    S.frontier!.forestLayer = 2;
    const forest = activeFrontierNodes('forest');
    expect(resolveFrontierHit('forest', 956, 566, 2, forest, (idx) => idx === 4)).toEqual({ kind: 'prev' });
  });

  it('routes every node through both production tap and semantic activation without changing layer', () => {
    const farmer = { tasks: [], cur: null, mode: 'idle', x: 0, y: 0, face: 1 } as unknown as Walker;
    const mkTask = (kind: string, x: number, y: number, extra: Partial<Task> = {}) => ({ kind, x, y, ...extra } as Task);
    const deps: SceneInputDeps = {
      farmer, animals: new Map(), npcs: [], jahangir: farmer,
      getDragLast: () => -1, setDragLast: vi.fn(), clearTrans: vi.fn(), moveTo: vi.fn(), mkTask,
      enqueuePlot: vi.fn(() => true), reasonToast: vi.fn(), toScreen: (x, y) => ({ x, y }),
      pop: vi.fn(), finishRiverCast: vi.fn(),
    };
    const router = createSceneTapRouter(deps);
    S.stamina = 1000;
    for (const scene of ['cave', 'forest'] as const) {
      UI.scene = scene;
      for (let layer = 1; layer <= 3; layer++) {
        if (scene === 'cave') S.frontier!.caveFloor = layer;
        else S.frontier!.forestLayer = layer;
        const nodes = scene === 'cave' ? activeMineNodes(layer) : activeFrontierNodes(scene);
        for (const node of nodes) {
          for (const semantic of [false, true]) {
            farmer.tasks = [];
            if (semantic) expect(router.activateTarget(`node:${node.idx}`)).toBe(true);
            else router.dispatchTap(node.x, node.y, { clientX: 0, clientY: 0 });
            expect(farmer.tasks[0]?.kind, `${scene} layer ${layer} node ${node.idx} (${semantic ? 'semantic' : 'tap'})`).toBe('mine');
            expect(farmer.tasks[0]?.node).toBe(node.idx);
            expect(scene === 'cave' ? S.frontier!.caveFloor : S.frontier!.forestLayer).toBe(layer);
          }
        }
      }
    }
  });
});
