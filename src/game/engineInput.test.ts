import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AR } from './engineRender';
import type { Task, Walker } from './engineRender';
import { createSceneTapRouter, type SceneInputDeps } from './engineInput';
import { UI } from './state';
import { TOWN_ACTORS } from '../story/townNpc';

const { talkToTownNpc } = vi.hoisted(() => ({ talkToTownNpc: vi.fn() }));
vi.mock('../story/engine', () => ({
  talkToTownNpc,
  talkToSharkhar: vi.fn(),
  triggerCutscene: vi.fn(),
}));

function walker(x: number, y: number): Walker {
  return {
    x, y, face: 1, rig: {} as Walker['rig'], ph: 0, mode: 'idle', kind: '', p: 0,
    tasks: [], cur: null, hitDone: false, speed: 0, player: false, wait: 0,
  };
}

function setup() {
  const farmer = walker(600, 500);
  const npcs = TOWN_ACTORS.map((actor) => walker(...actor.morning));
  const mkTask = vi.fn((kind: string, x: number, y: number, extra?: Partial<Task>) => ({ kind, x, y, ...extra }) as Task);
  const deps: SceneInputDeps = {
    farmer,
    animals: new Map<number, AR>(),
    npcs,
    jahangir: walker(1096, 628),
    getDragLast: () => -1,
    setDragLast: vi.fn(),
    clearTrans: vi.fn(),
    moveTo: vi.fn(),
    mkTask,
    enqueuePlot: vi.fn(() => true),
    reasonToast: vi.fn(),
    toScreen: (x, y) => ({ x, y }),
    pop: vi.fn(),
    finishRiverCast: vi.fn(),
  };
  return { router: createSceneTapRouter(deps), farmer, npcs, mkTask };
}

describe('walking town NPC pointer routing', () => {
  beforeEach(() => {
    talkToTownNpc.mockClear();
    UI.scene = 'town';
    UI.modal = null;
    UI.confirm = null;
  });

  it('opens the same conversation from a direct tap on every walking NPC body', () => {
    const { router, npcs } = setup();
    npcs.forEach((npc, index) => {
      router.dispatchTap(npc.x, npc.y - 80, { clientX: 0, clientY: 0 });
      expect(talkToTownNpc).toHaveBeenLastCalledWith(index);
    });
    expect(talkToTownNpc).toHaveBeenCalledTimes(TOWN_ACTORS.length);
  });

  it('keeps the market shop hit area separate from the NPC router', () => {
    const { router, farmer, mkTask } = setup();
    router.dispatchTap(350, 320, { clientX: 0, clientY: 0 });
    expect(talkToTownNpc).not.toHaveBeenCalled();
    expect(mkTask).toHaveBeenCalledWith('open', 350, 488, { to: 'market' });
    expect(farmer.tasks).toHaveLength(1);
  });
});
