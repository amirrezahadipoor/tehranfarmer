import { fa } from '../strings/fa';
import { GT } from '../strings/gameText';
import { notePlayerAction } from '../story/engine';
import { harvestFrontierNode } from './core/frontier';
import type { Task, Walker } from './engineRender';
import { sfx } from './sound';
import { activeFarm, toast } from './state';

/** صف فعلی را حفظ می‌کند و چاه + همان کرت را پیش از بقیهٔ وظایف قرار می‌دهد. */
export function queueWellAndResume(w: Walker, tk: Task, mkTask: (kind: string, x: number, y: number, extra?: Partial<Task>) => Task) {
  const farm = activeFarm();
  const well = farm === 'north' ? { x: 196, y: 362 } : farm === 'valley' ? { x: 226, y: 404 } : { x: 372, y: 284 };
  w.tasks.unshift(mkTask('well', well.x, well.y, { face: -1 }), tk);
  toast('can', GT.autoRefill);
  sfx.tap();
}

export function strikeFrontierRock(
  scene: 'cave' | 'forest', node: number, x: number, y: number,
  pop: (x: number, y: number, icon: string, n?: number, text?: string) => void,
  dust: (x: number, y: number, col: string, n: number) => void,
) {
  const res = harvestFrontierNode(scene, node);
  if (res?.qty) pop(x + 42, y - 58, res.good, Math.min(3, res.qty), '+' + fa(res.qty));
  dust(x + 42, y - 12, '#b7a59a', 10);
  notePlayerAction(1);
}
