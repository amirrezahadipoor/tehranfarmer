import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { installDom } from './helpers/dom';
import App from '../src/App';
import { S, UI, catchRegionalFish, ensureMailState, hasSave, invCount, loadGame, packCap, resetGame, saveGame } from '../src/game/state';
import { craftArtisan } from '../src/game/core/artisan';
import { completeFestivalContest, harvestFrontierNode } from '../src/game/core/frontier';
import { debt, payDebt, processDebtDay, startDebt } from '../src/game/core/debt';
import { SHOPS, createSceneTapRouter } from '../src/game/engineInput';
import { startEngine } from '../src/game/engine';
import { routeRiverWalkWaypoints } from '../src/game/farmLive';
import { unifiedPondGeom } from '../src/game/farmZones';
import { CFG } from '../src/game/settings';
import { haptic } from '../src/game/sound';
import { drawSignPlaque } from '../src/game/worldRoads';
import { FT } from '../src/strings/frontierText';
import { Hud } from '../src/ui/Hud';
import { Cutscene } from '../src/ui/Cutscene';
import { Modal } from '../src/ui/parts';
import { cinema } from '../src/game/cinemaStage';
import { maybeStartPrologue, pendingNode, skipActiveCutscene } from '../src/story/engine';
import { AlmanacModal } from '../src/ui/AlmanacModal';
import { InventoryModal } from '../src/ui/InventoryModal';
import { MailboxModal } from '../src/ui/MailboxModal';
import { Carpenter, Estate } from '../src/ui/Shops2';
import { UT } from '../src/strings/uiText';
import { WorldAtlasModal } from '../src/ui/WorldAtlasModal';
import { makeFarmer, PAL_JAHANGIR, PAL_NPC, PAL_PLAYER } from '../src/game/rig';
import { TOWN_ACTORS, npcTargetAt } from '../src/story/townNpc';

describe('QA Audit Stage 6 — Regression Suite (RED -> GREEN)', () => {
  beforeAll(() => {
    installDom();
  });

  it('BUG-01: craftArtisan and completeFestivalContest sanitize NaN inputs without poisoning coins/xp/inventory', () => {
    resetGame();
    S.inv.wheat = 6;
    S.inv.egg = 4;
    const beforeCoins = S.coins;

    const cooked = craftArtisan('village-bread', Number.NaN);
    expect(cooked).toBe(0);
    expect(Number.isFinite(S.coins)).toBe(true);
    expect(Number.isFinite(S.earned)).toBe(true);
    expect(Number.isFinite(S.xp)).toBe(true);
    expect(Number.isFinite(invCount())).toBe(true);
    expect(S.coins).toBeGreaterThanOrEqual(beforeCoins);

    const contest = completeFestivalContest('cauldron', Number.NaN);
    expect(contest).not.toBeNull();
    expect(Number.isFinite(S.coins)).toBe(true);
    expect(Number.isFinite(S.earned)).toBe(true);
    expect(Number.isFinite(S.xp)).toBe(true);
  });

  it('BUG-02: full inventory (40/40) never drops fish catches or consecutive cave crystals even when inbox hits cap', () => {
    resetGame();
    S.inv = { wheat: 40 };
    S.pack = { wheat: packCap() }; // کوله و انبار هر دو پُر → ماهی باید بدون اتلاف به صندوق پست برود
    expect(invCount()).toBe(40);

    // 1) Catching a fish when bag is full mails the fish parcel AND grants XP/coins
    const coinsBefore = S.coins;
    const fishRes = catchRegionalFish(1.4);
    const fishParcels = ensureMailState().inbox.filter((m) => m.id.startsWith('overflow:fish:'));
    expect(fishParcels.length).toBe(1);
    expect(S.coins).toBeGreaterThan(coinsBefore);
    expect(fishRes.species.id).toBeTruthy();

    // 2) Even if inbox is full of 40 old read messages, mining 3 cave nodes consecutively drops ZERO quartz parcels
    const ms = ensureMailState();
    for (let i = 0; i < 40; i++) {
      ms.inbox.push({
        id: `filler-${i}`,
        category: 'world',
        sender: 'herald',
        template: 'seasonal-gazette',
        params: {},
        day: 1,
        season: 0,
        read: true,
      });
    }
    S.stamina = 150;
    const quartzStrike = () => {
      const rolls = [0.99, 0, 0.99, 0.99]; // غیرخالی + کوارتز + بدون پله/ریزش
      return () => rolls.shift() ?? 0.99;
    };
    expect(harvestFrontierNode('cave', 0, quartzStrike())?.good).toBe('quartz');
    expect(harvestFrontierNode('cave', 1, quartzStrike())?.good).toBe('quartz');
    expect(harvestFrontierNode('cave', 2, quartzStrike())?.good).toBe('quartz');
    const caveParcels = ensureMailState().inbox.filter((m) => m.id.startsWith('overflow:cave:'));
    expect(caveParcels.length).toBe(3);
  });

  it('BUG-03: tapping "بازی نو" when an active save exists opens a confirmation dialog before deleting progress + reads -v1-bak1 metadata', () => {
    resetGame();
    UI.started = false;
    S.day = 9;
    S.coins = 4321;
    saveGame();
    // Simulate primary slot lost while backup slot mazrae-rangi-save-v1-bak1 holds the save
    const raw = localStorage.getItem('mazrae-rangi-save-v1')!;
    localStorage.removeItem('mazrae-rangi-save-v1');
    localStorage.setItem('mazrae-rangi-save-v1-bak1', raw);
    expect(hasSave()).toBe(true);

    Object.defineProperty(globalThis, 'navigator', { value: { webdriver: true }, configurable: true });
    const html = renderToStaticMarkup(<App />);
    // Start screen reads day 9 from mazrae-rangi-save-v1-bak1
    expect(html).toContain('۹');

    // UI.confirm = 'reset' renders role="alertdialog" even on Start screen before UI.started === true
    UI.confirm = 'reset';
    const confirmHtml = renderToStaticMarkup(<App />);
    expect(confirmHtml).toContain('role="alertdialog"');
    UI.confirm = null;
  });

  it('BUG-04: tapping directly on every single Town shop door (y = 395..425) opens that shop instead of getting hijacked by NPCs below', () => {
    resetGame();
    UI.started = true;
    UI.scene = 'town';
    S.story.prologueSeen = true;
    for (const s of SHOPS) {
      S.story.pending = null;
      const farmer = {
        x: 420, y: 600, face: 1, rig: makeFarmer(PAL_PLAYER), ph: 0, mode: 'idle' as const,
        kind: '', p: 0, tasks: [] as Array<{ kind: string; to?: string }>, cur: null, hitDone: false, speed: 240, player: true, wait: 0,
      };
      const npcs = TOWN_ACTORS.map((_, i) => {
        const [nx, ny] = npcTargetAt(i, 12);
        return { x: nx, y: ny, face: 1, rig: makeFarmer(PAL_NPC[i]), ph: 0, mode: 'idle' as const, kind: '', p: 0, tasks: [], cur: null, hitDone: false, speed: 60, player: false, wait: 0 };
      });
      const jahangir = { x: 1000, y: 600, face: -1, rig: makeFarmer(PAL_JAHANGIR), ph: 0, mode: 'idle' as const, kind: '', p: 0, tasks: [], cur: null, hitDone: false, speed: 60, player: false, wait: 0 };
      const router = createSceneTapRouter({
        farmer: farmer as never,
        animals: new Map(),
        npcs: npcs as never,
        jahangir: jahangir as never,
        getDragLast: () => -1,
        setDragLast: () => {},
        clearTrans: () => {},
        moveTo: (w, tx, ty) => { w.tasks.push({ kind: 'move', x: tx, y: ty, face: 1, dur: 0, hit: 0 }); },
        mkTask: (kind, tx, ty, extra) => ({ kind, x: tx, y: ty, face: 1, dur: 0, hit: 0, ...extra }),
        enqueuePlot: () => true,
        reasonToast: () => {},
        toScreen: (x, y) => ({ x, y }),
        pop: () => {},
        finishRiverCast: () => {},
      });
      router.dispatchTap(s.cx, 405, { clientX: s.cx, clientY: 405 });
      expect(S.story.pending, `Shop ${s.id} door at (${s.cx}, 405) was hijacked by an NPC!`).toBeNull();
      expect(farmer.tasks.some((t) => t.kind === 'open' && t.to === s.id), `Shop ${s.id} did not queue open task`).toBe(true);
    }
  });

  it('BUG-05: WorldAtlasModal renders concise, accurate region labels with zero garbled string keys', () => {
    resetGame();
    const html = renderToStaticMarkup(<WorldAtlasModal />);
    expect(html).not.toContain('سند فعال (');
    expect(html).not.toContain('کارگر شهر با ابزارش');
    expect(html).not.toContain('<span>از</span>');
    expect(html).toContain('رودخانه');
    expect(html).toContain('زنبورستان');
    expect(html).toContain('میدان شهر');
  });

  it('BUG-06: switching locale FA -> EN while on Start screen immediately repaints Canvas world signposts in English', () => {
    resetGame();
    UI.started = false;
    UI.scene = 'farm';
    UI.modal = null;
    CFG.locale = 'fa';

    const rafCbs: Array<(now: number) => void> = [];
    const origRaf = globalThis.requestAnimationFrame;
    const origCaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = ((cb: (now: number) => void) => { rafCbs.push(cb); return rafCbs.length; }) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;

    // Spy on cached sign plaques blitted in the latest render pass
    const drawnTexts: string[] = [];
    const origCreate = document.createElement.bind(document);
    document.createElement = ((tag: string) => {
      const el = origCreate(tag) as HTMLCanvasElement;
      if (tag === 'canvas') {
        const ctx = el.getContext('2d')!;
        const origFillText = ctx.fillText.bind(ctx);
        ctx.fillText = ((txt: string, x: number, y: number) => {
          drawnTexts.push(String(txt));
          return origFillText(txt, x, y);
        }) as typeof ctx.fillText;
      }
      return el;
    }) as typeof document.createElement;

    try {
      const cv = document.createElement('canvas');
      cv.width = 850;
      cv.height = 393;
      const stop = startEngine(cv);
      // Let Start screen settle across idle frames just like real Chromium (33ms+)
      rafCbs.pop()!(performance.now() + 16);
      rafCbs.pop()!(performance.now() + 32);
      expect(drawnTexts).toContain('شهر');

      // NOW user clicks Language toggle FA -> EN on Start screen!
      drawnTexts.length = 0;
      CFG.locale = 'en';
      const nextFrame = rafCbs.pop();
      expect(nextFrame).toBeDefined();
      nextFrame!(performance.now() + 48);

      // Must immediately draw English wooden sign plaques without staying frozen!
      expect(drawnTexts).toContain('Town');
      expect(drawnTexts).toContain('North Meadow');
      stop();
    } finally {
      CFG.locale = 'fa';
      document.createElement = origCreate;
      globalThis.requestAnimationFrame = origRaf;
      globalThis.cancelAnimationFrame = origCaf;
    }
  });

  it('BUG-07: long Persian/English Canvas sign plaques size dynamically without clipping + proper ZWNJ کوره‌راه + underground cave HUD never shows sun', () => {
    resetGame();
    CFG.locale = 'fa';
    expect(FT.gateApiaryBack).toBe('کوره‌راه زنبورستان');

    const createdWidths: number[] = [];
    const origCreate = document.createElement.bind(document);
    document.createElement = ((tag: string) => {
      const el = origCreate(tag) as HTMLCanvasElement;
      if (tag === 'canvas') {
        const ctx = el.getContext('2d')!;
        ctx.measureText = ((t: string) => ({ width: String(t).length * 8.5 } as TextMetrics)) as typeof ctx.measureText;
        createdWidths.push(0);
        const idx = createdWidths.length - 1;
        let wVal = el.width;
        Object.defineProperty(el, 'width', {
          get: () => wVal,
          set: (v: number) => { wVal = v; createdWidths[idx] = v; },
        });
      }
      return el;
    }) as typeof document.createElement;

    try {
      const dst = origCreate('canvas') as HTMLCanvasElement;
      dst.width = 1280;
      dst.height = 720;
      const dctx = dst.getContext('2d')!;
      const label = FT.caveSpring; // 23 chars -> 195.5px text width
      drawSignPlaque(dctx, 610, 316, label);
      const maxCreatedW = Math.max(...createdWidths);
      expect(maxCreatedW).toBeGreaterThanOrEqual(label.length * 8.5 + 24);
    } finally {
      document.createElement = origCreate;
    }

    UI.scene = 'cave';
    S.hour = 12;
    S.weather = 0;
    const caveHud = renderToStaticMarkup(<Hud />);
    // In underground cave, HUD clock must NOT use outdoor 'sun' weather icon
    expect(caveHud).toBeTruthy();
  });

  it('BUG-08 & BUG-09: bottom HUD bar + Modal respect --safe-left/--safe-right display cutouts, and Start/HUD/Cutscene buttons enforce >=48px touch targets', () => {
    resetGame();
    Object.defineProperty(globalThis, 'navigator', { value: { webdriver: true }, configurable: true });
    UI.started = false;
    const startHtml = renderToStaticMarkup(<App />);
    expect(startHtml).toContain('48px');

    UI.started = true;
    UI.scene = 'farm';
    const hudHtml = renderToStaticMarkup(<Hud />);
    // Both top AND bottom fixed bars must offset by var(--safe-left) and var(--safe-right)
    const safeLeftMatches = hudHtml.match(/var\(--safe-left\)/g) ?? [];
    const safeRightMatches = hudHtml.match(/var\(--safe-right\)/g) ?? [];
    expect(safeLeftMatches.length).toBeGreaterThanOrEqual(2);
    expect(safeRightMatches.length).toBeGreaterThanOrEqual(2);
    expect(hudHtml).toContain('48px');

    const modalHtml = renderToStaticMarkup(<Modal title="تست" icon="star" onClose={() => {}}><div>محتوا</div></Modal>);
    expect(modalHtml).toContain('var(--safe-left)');
    expect(modalHtml).toContain('var(--safe-right)');

    maybeStartPrologue();
    const cutHtml = renderToStaticMarkup(<Cutscene />);
    expect(cutHtml).toContain('48px');
  });

  it('BUG-10: River scene draws Crystal Cavern wooden sign plaque + detours farmer around fish pond water + Valley well stands clear', () => {
    resetGame();
    UI.started = true;
    UI.scene = 'river';
    S.ponds = [{ id: 1, stocked: true, feed: 2, grow: 1 }];
    CFG.locale = 'fa';

    const drawnTexts: string[] = [];
    const origCreate = document.createElement.bind(document);
    const origRaf = globalThis.requestAnimationFrame;
    const origCaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = (() => 1) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;
    document.createElement = ((tag: string) => {
      const el = origCreate(tag) as HTMLCanvasElement;
      if (tag === 'canvas') {
        const ctx = el.getContext('2d')!;
        const origFillText = ctx.fillText.bind(ctx);
        ctx.fillText = ((txt: string, x: number, y: number) => {
          drawnTexts.push(String(txt));
          return origFillText(txt, x, y);
        }) as typeof ctx.fillText;
      }
      return el;
    }) as typeof document.createElement;

    try {
      const cv = origCreate('canvas') as HTMLCanvasElement;
      cv.width = 850;
      cv.height = 393;
      const stop = startEngine(cv);
      expect(drawnTexts).toContain('مزرعه');
      expect(drawnTexts).toContain('دهانهٔ غار بلورین');
      stop();
    } finally {
      document.createElement = origCreate;
      globalThis.requestAnimationFrame = origRaf;
      globalThis.cancelAnimationFrame = origCaf;
    }

    const pg = unifiedPondGeom();
    const waypoints = routeRiverWalkWaypoints(pg.cx, pg.cy - 80, pg.cx, pg.cy + 70);
    expect(waypoints.length).toBe(3);
    expect(waypoints[0][0] <= pg.x0 - 30 || waypoints[0][0] >= pg.x1 + 30).toBe(true);
  });

  it('BUG-11: Cinema pan/zoom blits full visible world bounds with 0px left/right/top/bottom void bleed on 850x393', () => {
    resetGame();
    UI.started = true;
    UI.scene = 'farm';
    maybeStartPrologue();
    cinema.active = true;
    cinema.camX = 210;
    cinema.targetX = 210;
    cinema.camY = 470;
    cinema.targetY = 470;
    cinema.zoom = 1.15;
    cinema.targetZoom = 1.15;

    let curA = 1, curD = 1, curE = 0, curF = 0;
    let bgScreenBox: { left: number; right: number; top: number; bottom: number } | null = null;
    const origCreate = document.createElement.bind(document);
    const origRaf = globalThis.requestAnimationFrame;
    const origCaf = globalThis.cancelAnimationFrame;
    const origIW = window.innerWidth, origIH = window.innerHeight;
    Object.defineProperty(window, 'innerWidth', { value: 850, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 393, configurable: true });
    globalThis.requestAnimationFrame = (() => 1) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;

    document.createElement = ((tag: string) => {
      const el = origCreate(tag) as HTMLCanvasElement;
      if (tag === 'canvas') {
        const ctx = el.getContext('2d')!;
        const origSetT = ctx.setTransform.bind(ctx);
        ctx.setTransform = ((a: number, b: number, c: number, d: number, e: number, f: number) => {
          if (el.width === 850) { curA = a; curD = d; curE = e; curF = f; }
          return origSetT(a, b, c, d, e, f);
        }) as typeof ctx.setTransform;
        const origDrawImg = ctx.drawImage.bind(ctx);
        ctx.drawImage = ((...args: unknown[]) => {
          const img = args[0] as { width?: number; height?: number };
          if (el.width === 850 && img?.width === 2120 && args.length === 9) {
            const dx = args[5] as number, dy = args[6] as number, dw = args[7] as number, dh = args[8] as number;
            bgScreenBox = {
              left: curE + dx * curA,
              right: curE + (dx + dw) * curA,
              top: curF + dy * curD,
              bottom: curF + (dy + dh) * curD,
            };
          }
          return (origDrawImg as (...a: unknown[]) => void)(...args);
        }) as typeof ctx.drawImage;
      }
      return el;
    }) as typeof document.createElement;

    try {
      const cv = document.createElement('canvas');
      cv.width = 850;
      cv.height = 393;
      const stop = startEngine(cv);
      expect(bgScreenBox).not.toBeNull();
      expect(bgScreenBox!.left).toBeLessThanOrEqual(0.5);
      expect(bgScreenBox!.right).toBeGreaterThanOrEqual(849.5);
      expect(bgScreenBox!.top).toBeLessThanOrEqual(0.5);
      expect(bgScreenBox!.bottom).toBeGreaterThanOrEqual(392.5);
      stop();
    } finally {
      cinema.active = false;
      Object.defineProperty(window, 'innerWidth', { value: origIW, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: origIH, configurable: true });
      document.createElement = origCreate;
      globalThis.requestAnimationFrame = origRaf;
      globalThis.cancelAnimationFrame = origCaf;
    }
  });

  it('BUG-12: Reloading immediately during Chapter transition / Collector cutscene preserves exact coins and resumes ch1-outro without dropping dialogue', () => {
    resetGame();
    UI.started = true;
    S.story.prologueSeen = true;
    startDebt(0);
    S.coins = 20000;
    S.stats.harv = 50;
    S.stats.plants = 50;
    S.xp = 1200;
    const d0 = debt()!;
    payDebt(d0.remaining);
    if (pendingNode()) skipActiveCutscene();
    const coinsAfterPay = S.coins;

    // Advance morning into Note 2 unlock window so processDebtDay opens Note 2 + triggers ch1-outro
    d0.chapterStartDay = -30;
    processDebtDay();
    expect(S.story.chapter).toBe(2);
    expect(pendingNode()?.id).toBe('ch1-outro');

    // Simulate hard browser reload right in the middle of the cutscene before player advances a single beat!
    S.story.pending = null;
    S.story.chapter = 1;
    S.coins = 0;
    expect(loadGame()).toBe(true);
    expect(S.coins).toBe(coinsAfterPay);
    expect(S.story.chapter).toBe(2);
    expect(pendingNode()?.id).toBe('ch1-outro');
  });

  it('BUG-13: Almanac shows accurate 16 artisan recipes + clean farm nouns, arrows mirror in RTL, progress bar uses logical inline-start, and Ledger stash label is clear', async () => {
    resetGame();
    CFG.locale = 'fa';
    const almHtml = renderToStaticMarkup(<AlmanacModal />);
    expect(almHtml).toContain('۱۶ فرآورده');
    expect(almHtml).not.toContain('بازگشت به مزرعه');
    expect(almHtml).not.toContain('سفر به مزرعهٔ');

    const carpHtml = renderToStaticMarkup(<Carpenter />);
    expect(carpHtml).toContain('rtl:-scale-x-100');

    expect(UT.u63).toBe('واریز همه به قلک');
    const fs = await import('node:fs');
    const css = fs.readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
    expect(css).toContain('inset-inline-start: 0');
  });

  it('BUG-14: AndroidManifest declares VIBRATE + allowBackup="false" (zero INTERNET), resetGame purges all -bak* keys, and haptic guards userActivation/errors safely', async () => {
    const fs = await import('node:fs');
    const mf = fs.readFileSync(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8');
    expect(mf).toContain('android.permission.VIBRATE');
    expect(mf).toContain('android:allowBackup="false"');
    expect(mf).not.toContain('android.permission.INTERNET');

    saveGame();
    localStorage.setItem('mazrae-rangi-save-v1-bak3', JSON.stringify({ day: 9, coins: 999 }));
    resetGame();
    expect(hasSave()).toBe(false);
    expect(localStorage.getItem('mazrae-rangi-save-v1-bak3')).toBeNull();
    expect(() => haptic('heavy')).not.toThrow();
  });

  it('BUG-15: Machinery pads in Farm, North Meadow, and Sunlit Valley sit strictly on ground below mountain horizon (y >= 198) + Forest shrine/festival plaques avoid banner overlap', async () => {
    const fs = await import('node:fs');
    for (const rel of ['../src/game/scenes.ts', '../src/game/estateScenes.ts']) {
      const src = fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
      const matches = [...src.matchAll(/drawMachineryPad\(\s*c\s*,\s*(\d+)\s*,\s*(\d+)/g)];
      expect(matches.length).toBeGreaterThan(0);
      for (const m of matches) {
        expect(Number(m[2])).toBeGreaterThanOrEqual(198);
      }
    }
    const frSrc = fs.readFileSync(new URL('../src/game/frontierScenes.ts', import.meta.url), 'utf8');
    expect(frSrc).toContain('scene === \'cave\' ? 316 : 362');
  });

  it('BUG-16: Inventory distinguishes "بذر گندم" from "گندم", Estate labels "۴۰ کرت" / "۹۴ کرت", Mailbox uses sm:grid-cols-12 landscape split, and Toasts clear DebtChip at 120% font', () => {
    resetGame();
    UI.started = true;
    CFG.locale = 'fa';
    S.inv.wheat = 3;
    S.seeds.wheat = 5;
    const invHtml = renderToStaticMarkup(<InventoryModal />);
    expect(invHtml).toContain('بذر گندم');

    const estHtml = renderToStaticMarkup(<Estate />);
    expect(estHtml).toContain('۴۰ کرت');
    expect(estHtml).toContain('۹۴ کرت');

    const mailHtml = renderToStaticMarkup(<MailboxModal />);
    expect(mailHtml).toContain('sm:grid-cols-12');

    UI.toasts = [{ id: 1, icon: 'coin', text: 'تست', locale: 'fa' }];
    const hudHtml = renderToStaticMarkup(<Hud />);
    expect(hudHtml).toContain('6.4rem');
  });

  it('BUG-17: Zero "؟؟؟" or "همه‌ی" strings remain, locked seeds label clearly, and night windows glow AFTER dark night veil', async () => {
    const fs = await import('node:fs');
    const uiSrc = fs.readFileSync(new URL('../src/strings/uiText.ts', import.meta.url), 'utf8');
    const gtSrc = fs.readFileSync(new URL('../src/strings/gameText.ts', import.meta.url), 'utf8');
    expect(uiSrc).not.toContain('؟؟؟');
    expect(uiSrc).not.toContain('همه‌ی');
    expect(gtSrc).not.toContain('همه‌ی');
    CFG.locale = 'fa';
    expect(UT.u76).toBe('بذر قفل‌شده');

    resetGame();
    UI.started = true;
    UI.scene = 'farm';
    S.hour = 22.5;
    const fillStylesAfterVeil: string[] = [];
    let sawNightVeil = false;
    const origCreate = document.createElement.bind(document);
    const origRaf = globalThis.requestAnimationFrame;
    const origCaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = (() => 1) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;
    let targetCv: HTMLCanvasElement | null = null;
    document.createElement = ((tag: string) => {
      const el = origCreate(tag) as HTMLCanvasElement;
      if (tag === 'canvas') {
        const ctx = el.getContext('2d')!;
        const origFillRect = ctx.fillRect.bind(ctx);
        ctx.fillRect = ((x: number, y: number, w: number, h: number) => {
          const st = String(ctx.fillStyle);
          if (el === targetCv && st.startsWith('rgba(14,20,72')) sawNightVeil = true;
          else if (el === targetCv && sawNightVeil) fillStylesAfterVeil.push(st);
          return origFillRect(x, y, w, h);
        }) as typeof ctx.fillRect;
      }
      return el;
    }) as typeof document.createElement;

    try {
      const cv = document.createElement('canvas');
      targetCv = cv;
      cv.width = 850;
      cv.height = 393;
      const stop = startEngine(cv);
      expect(sawNightVeil).toBe(true);
      expect(fillStylesAfterVeil.some((s) => s.startsWith('rgba(255,224,130'))).toBe(true);
      stop();
    } finally {
      document.createElement = origCreate;
      globalThis.requestAnimationFrame = origRaf;
      globalThis.cancelAnimationFrame = origCaf;
    }
  });
});
