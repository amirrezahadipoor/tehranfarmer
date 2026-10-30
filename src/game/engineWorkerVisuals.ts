// بازنمایی رویدادهای واقعی شیفت کارگران؛ این ماژول هرگز تولید یا مصرف منابع انجام نمی‌دهد.
import type { CropId } from './data';
import { isFarmScene, type FarmSceneId } from './estates';
import { FEED_TROUGH } from './farmZones';
import { penRect } from './farmLive';
import { S, UI } from './state';
import { fa } from '../strings/fa';
import { discardWorkerVisualEvents, drainWorkerVisualEvents, type WorkerVisualEvent } from './core/workers';
import type { AR, Task, Walker } from './engineRender';

interface WorkerVisualDeps {
  workers: Walker[];
  animals: Map<number, AR>;
  plotCenter: (plot: number) => { cx: number; cy: number };
  plotTask: (kind: string, plot: number, player: boolean, seed?: CropId) => Task;
  mkTask: (kind: string, x: number, y: number, extra?: Partial<Task>) => Task;
  pop: (x: number, y: number, icon: string, n?: number, text?: string) => void;
  dust: (x: number, y: number, col: string, n: number) => void;
  drops: (x: number, y: number, n: number) => void;
}

export function createWorkerVisuals(deps: WorkerVisualDeps) {
  const { workers, animals, plotCenter, plotTask, mkTask, pop, dust, drops } = deps;

  function apply(w: Walker, tk: Task) {
    if (tk.plot !== undefined) {
      const { cx, cy } = plotCenter(tk.plot);
      const good = tk.good ?? tk.seed;
      if (tk.kind === 'till') dust(cx, cy + 10, '#8a5a34', 9);
      else if (tk.kind === 'plant') { if (good) pop(cx, cy - 10, 'seed:' + good, 1); dust(cx, cy - 10, '#7a4b2c', 4); }
      else if (tk.kind === 'water') { drops(cx, cy - 30, 6); dust(cx, cy + 4, '#6bb4ee', 5); }
      else if (tk.kind === 'harvest' && good) {
        pop(cx, cy - 30, good, Math.min(3, tk.qty ?? 1), tk.qty ? '+' + fa(tk.qty) : undefined);
        if (tk.golden) pop(cx, cy - 58, 'star', 2);
      } else if (tk.kind === 'fert') { pop(cx, cy - 20, 'fert', 1); dust(cx, cy, '#8de06a', 6); }
    } else if (tk.kind === 'collect') {
      const a = S.animals.find((q) => q.id === tk.animal);
      const ar = a ? animals.get(a.id) : null;
      pop(ar?.x ?? w.x, (ar?.y ?? w.y) - 50, tk.good ?? 'egg', Math.min(3, tk.qty ?? 1), tk.qty ? '+' + fa(tk.qty) : undefined);
    } else if (tk.kind === 'feed') {
      pop(FEED_TROUGH.cx, FEED_TROUGH.cy - 28, 'feed', 1, tk.qty ? '+' + fa(tk.qty) : undefined);
    }
  }

  function taskForEvent(e: WorkerVisualEvent): Task | null {
    const extra = { visual: true, good: e.good, qty: e.qty, golden: e.golden } as const;
    if (e.plot !== undefined) return { ...plotTask(e.kind, e.plot, false, e.seed), ...extra };
    if (e.kind === 'collect') {
      const a = S.animals.find((q) => q.id === e.animal);
      if (!a) return null;
      const pr = penRect(a.kind);
      const gateY = pr.y0 < 350 ? pr.y0 - 4 : pr.y1 + 10;
      return mkTask('collect', (pr.x0 + pr.x1) * 0.5, gateY, { ...extra, animal: a.id, face: -1 });
    }
    if (e.kind === 'feed') return mkTask('feed', FEED_TROUGH.walkX, FEED_TROUGH.walkY, { ...extra, face: -1 });
    return null;
  }

  function assign() {
    if (!isFarmScene(UI.scene)) { discardWorkerVisualEvents(); return; }
    const events = drainWorkerVisualEvents(UI.scene as FarmSceneId);
    for (const e of events) {
      const w = workers[e.worker];
      if (!w || e.worker >= S.workers || w.post !== UI.scene || w.cur || w.tasks.length) continue;
      const tk = taskForEvent(e);
      if (tk) { w.wait = 0; w.tasks.push(tk); }
    }
  }

  return { apply, assign };
}
