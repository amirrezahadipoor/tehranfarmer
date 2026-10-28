import { beforeEach, describe, expect, it } from 'vitest';
import { S, advance, doAct, resetGame, sellAll, tickBuilds } from './helpers/game';

beforeEach(() => { localStorage.clear(); resetGame(); });

describe('بودجهٔ کارایی', () => {
  it('۱۰۰۰ نیم‌ساعت شبیه‌سازی زیر ۲ ثانیه', () => {
    S.coins = 1e6;
    for (let i = 0; i < 40; i++) { S.plots[i].st = 2; S.plots[i].crop = 'wheat'; S.plots[i].prog = 0.2; }
    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) { advance(0.5); tickBuilds(0.5); }
    const dt = performance.now() - t0;
    expect(dt).toBeLessThan(2000);
  });

  it('۵۰۰۰ عملیات کاشت/برداشت زیر ۱٫۵ ثانیه', () => {
    S.coins = 1e6;
    S.seeds.wheat = 1000;
    const t0 = performance.now();
    for (let i = 0; i < 2500; i++) {
      const p = S.plots[i % 12];
      p.st = 1; p.crop = null;
      doAct('plant', i % 12, true, 'wheat', true);
      p.ripe = true; p.st = 2;
      doAct('harvest', i % 12, true, undefined, true);
      sellAll();
    }
    expect(performance.now() - t0).toBeLessThan(1500);
  });

  it('حلقهٔ روز برای ۳۶۵ روز سنگین نمی‌شود', () => {
    S.coins = 1e6;
    for (let i = 0; i < 40; i++) { S.plots[i].st = 2; S.plots[i].crop = 'wheat'; S.plots[i].water = 1; }
    const t0 = performance.now();
    for (let d = 0; d < 365; d++) { for (const p of S.plots) p.water = 1; advance(24); }
    expect(performance.now() - t0).toBeLessThan(4000);
  });

  it('رندر شب (فانوس/پنجره) و مه صبحگاهی بدون افت فریم (۲۴۰ فریم واقعی < ۶۰۰ms)', async () => {
    const { installDom, makeCanvas } = await import('./helpers/dom');
    const { startEngine } = await import('../src/game/engine');
    const { UI } = await import('../src/game/state');
    const dom = installDom();
    const cv = makeCanvas();
    UI.started = true;
    const stop = startEngine(cv);
    const t0 = Number(process.hrtime.bigint()) / 1e6;
    S.hour = 22.5;
    dom.pump(120);
    S.hour = 6.2;
    dom.pump(120);
    stop();
    const elapsedMs = Number(process.hrtime.bigint()) / 1e6 - t0;
    expect(elapsedMs).toBeLessThan(600);
  });

  it('آب‌وهوای پیشرفته (باد، رگبار چاله‌دار، برف انباشته) در ۳۰۰ فریم زیر ۷۰۰ms رندر می‌شود (P8-05)', async () => {
    const { installDom, makeCanvas } = await import('./helpers/dom');
    const { startEngine } = await import('../src/game/engine');
    const { UI } = await import('../src/game/state');
    const dom = installDom();
    const cv = makeCanvas();
    UI.started = true;
    const stop = startEngine(cv);
    const t0 = Number(process.hrtime.bigint()) / 1e6;
    for (const w of [1, 2, 3]) {
      S.weather = w;
      dom.pump(100);
    }
    stop();
    expect(Number(process.hrtime.bigint()) / 1e6 - t0).toBeLessThan(700);
  });
});
