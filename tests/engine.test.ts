import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { installDom, makeCanvas, tap } from './helpers/dom';
import { S, UI, resetGame, advance } from './helpers/game';
import { checkInvariants } from './helpers/invariants';
import { plotsForFarm } from '../src/game/state';
import { ensureFrontier } from '../src/game/core/frontier';

let dom: ReturnType<typeof installDom>;
let stop: (() => void) | null = null;
let canvas: HTMLCanvasElement;
let startEngine: typeof import('../src/game/engine').startEngine;
let cmd: typeof import('../src/game/engine').cmd;

beforeAll(async () => {
  dom = installDom();
  const mod = await import('../src/game/engine');
  startEngine = mod.startEngine;
  cmd = mod.cmd;
});

beforeEach(() => {
  localStorage.clear();
  resetGame();
  S.coins = 5000;
  UI.started = true;
  UI.scene = 'farm';
  UI.modal = null;
  UI.tool = 'hand';
  if (!stop) {
    canvas = makeCanvas();
    stop = startEngine(canvas);
    dom.pump(2);
  }
});

describe('موتور headless', () => {
  it('موتور بوت می‌شود و فریم می‌دهد', () => {
    expect(dom.pump(10)).toBe(10);
    expect(UI.portrait).toBe(false);
  });

  it('لمس زمین با ابزار شخم، واقعاً شخم می‌زند', () => {
    UI.tool = 'till';
    S.stamina = 100;
    expect(S.plots[0].st).toBe(0);
    // مرکز اولین قطعه در مختصات منطقی ۱۲۸۰×۷۲۰ (FX=420, FY=215)
    tap(canvas, 477, 280);
    dom.pump(400);
    expect(S.plots.some((p) => p.st === 1)).toBe(true);
    checkInvariants('engine-till');
  });

  it('سفر بین صحنه‌ها کار می‌کند (بدون ترنزیشن گیر)', () => {
    for (const scene of ['town', 'river', 'apiary', 'farm'] as const) {
      cmd.travelTo(scene);
      dom.pump(240);
      expect(['farm', 'town', 'river', 'apiary']).toContain(UI.scene);
    }
    checkInvariants('travel');
  });

  it('۶۰۰ فریم با زمان سریع و مودال‌های باز، کرش نمی‌کند', () => {
    UI.speed = 3;
    for (const m of ['seed', 'market', 'inv', 'menu', null] as const) {
      UI.modal = m;
      expect(() => dom.pump(120)).not.toThrow();
    }
    UI.modal = null;
    advance(24 * 2);
    dom.pump(60);
    checkInvariants('frames');
  });

  it('۲۰۰ ضربهٔ تصادفی در همهٔ صحنه‌ها بدون استثنا', () => {
    const scenes: Array<'farm' | 'town' | 'river' | 'apiary'> = ['farm', 'town', 'river', 'apiary'];
    expect(() => {
      for (let i = 0; i < 50; i++) cmd.travelTo(scenes[i % 4]);
      dom.pump(300);
      UI.tool = 'harvest';
      dom.pump(200);
    }).not.toThrow();
    checkInvariants('taps');
  });

  it('کلبهٔ جهانگیر در شهر قابل لمس است و دفتر کل را باز می‌کند', () => {
    cmd.travelTo('town');
    dom.pump(120);
    expect(UI.scene).toBe('town');
    expect(UI.modal).toBeNull();
    tap(canvas, 1035, 645);
    dom.pump(400);
    expect(UI.modal).toBe('ledger');
  });

  it('تمام‌شدن آب در صف، در هر سه مزرعه چاه و ادامهٔ همان کرت‌ها را اجرا می‌کند', () => {
    S.lv.land = 99;
    for (const scene of ['farm', 'north', 'valley'] as const) {
      UI.scene = scene;
      dom.pump(2);
      const plots = plotsForFarm(scene);
      for (const i of [0, 1]) {
        plots[i] = { st: 2, crop: 'wheat', prog: 0.2, water: 0, fert: 0, last: null, dead: false, dry: 0, ripe: false, n: 0 };
      }
      S.can = 1; // کرت نخست آب را تمام می‌کند؛ کرت دوم باید چاه را در صف بیاورد.
      S.stamina = 100;
      cmd.actPlot('water', 0);
      cmd.actPlot('water', 1);
      dom.pump(1800);
      expect(plots[0].water, `${scene}: کرت نخست`).toBeGreaterThan(0.95);
      expect(plots[1].water, `${scene}: کرت دوم`).toBeGreaterThan(0.95);
      expect(S.can, `${scene}: دو بار آبیاری پس از پرکردن`).toBeGreaterThan(0);
    }
  });

  it('کلنگ فقط پس از راه‌رفتن به سنگ اجرا می‌شود', () => {
    UI.scene = 'cave';
    dom.pump(2);
    S.stamina = 150;
    expect(ensureFrontier().nodesDone['cave:1:0']).toBeUndefined();
    tap(canvas, 305, 478);
    dom.pump(30);
    expect(ensureFrontier().nodesDone['cave:1:0']).toBeUndefined();
    dom.pump(1200);
    expect(ensureFrontier().nodesDone['cave:1:0']).toBe(true);
  });
});
