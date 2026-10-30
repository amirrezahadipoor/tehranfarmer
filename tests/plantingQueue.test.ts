import { describe, expect, it } from 'vitest';
import { installDom, makeCanvas } from './helpers/dom';
import { cmd, startEngine } from '../src/game/engine';
import type { FarmSceneId } from '../src/game/estates';
import { plotsForFarm, resetGame, S, UI } from '../src/game/state';

type EngineWithQueue = { farmer: { tasks: Array<{ kind: string }>; cur: { kind: string } | null } };
const queueSnapshot = () => cmd.inspectEngine() as unknown as EngineWithQueue | null;

describe('توقف سراسری صف کاشت هنگام تمام‌شدن بذر', () => {
  it.each<FarmSceneId>(['farm', 'north', 'valley'])('%s: آخرین بذر همان‌جا تسک‌های کاشت باقی‌مانده را حذف می‌کند', (farm) => {
    resetGame();
    const dom = installDom(640, 360);
    UI.started = true;
    UI.scene = farm;
    UI.modal = null;
    UI.seed = 'wheat';
    S.lv.land = 3;
    S.stamina = 500;
    S.can = 10;
    S.seeds = { wheat: 1 };
    S.story.prologueSeen = true;
    for (const plot of plotsForFarm(farm).slice(0, 4)) {
      plot.st = 1;
      plot.crop = null;
      plot.ripe = false;
      plot.dead = false;
    }

    const stop = startEngine(makeCanvas(640, 360));
    try {
      for (let i = 0; i < 3; i++) cmd.actPlot('plant', i);
      cmd.actPlot('water', 3); // کار غیرکاشت باید در صف باقی بماند
      expect(queueSnapshot()?.farmer.tasks.filter((task) => task.kind === 'plant')).toHaveLength(3);

      let frames = 0;
      while ((S.seeds.wheat ?? 0) > 0 && frames < 900) {
        dom.pump();
        frames++;
      }

      expect(S.seeds.wheat ?? 0).toBe(0);
      expect(plotsForFarm(farm).filter((plot) => plot.crop === 'wheat')).toHaveLength(1);
      expect(queueSnapshot()?.farmer.tasks.filter((task) => task.kind === 'plant')).toEqual([]);
      expect(queueSnapshot()?.farmer.tasks.map((task) => task.kind)).toEqual(['water']);
    } finally {
      stop();
    }
  });
});
