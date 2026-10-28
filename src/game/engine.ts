import { ANIMALS, FISH_STAM, HOE_SPEED, PORTAL_TRAVEL_HOURS, XP, MACHINES, MK_SPEED, type AnimalKind, type CropId, type MachineId } from './data';
declare const __DEV_TOOLS__: boolean;
import {
  PAL_BUILDER, PAL_JAHANGIR, PAL_NPC, PAL_PLAYER, PAL_WORKERS, makeFarmer, poseFarmer, type AnimalRig, type FarmerRig, type Pal,
} from './rig';
import { ESTATES, estatePlotAt, estatePlotCenter, isFarmScene, type FarmSceneId } from './estates';
import { FIELD_X, FIELD_Y, type SceneKey } from './scenes';
import {
  S, UI, activeFarm, addGood, addStat, addXp, advance, bumpPlayerCombo, canAct, canCap, catchRegionalFish, completeBuild, doAct, harvestHoney, mkOf, notify, performPlayerPlotSweep, rollRiverTreasure, saveGame, syncMailboxState, tickLiveClock, toast, onNewDay, season, troughCap,
} from './state';
import { createSceneTapRouter } from './engineInput';
import { castPrecisionNow, fishCast } from './worldVisuals';
import { ambient, resumeAudioFromBackground, sfx, snd, suspendAudioForBackground } from './sound';
import { rnd } from './rng';
import { detectProfile } from '../ui/layout';
import { CFG, isReducedMotion } from './settings';
import { fa } from '../strings/fa';
import { GT } from '../strings/gameText';
import { TOWN_ACTORS, npcTargetAt } from '../story/townNpc';
import { notePlayerAction, playNode, talkToSharkhar, talkToTownNpc, triggerAreaIntro, triggerShopIntro } from '../story/engine';
import { checkSecretTriggers } from '../story/secrets';
import { bindCanvasInput, type CanvasPoint } from './touchBridge';
import { FEED_TROUGH, STRAW_NEST, collectAllStrawEggs, hasGrazingLivestock, unifiedPondGeom } from './farmZones';
import { workerCatchRiverFish, workerServiceUnifiedPond } from './core/workers';
import { checkSeamlessEdgePortal } from './core/frontier';
import { queueWellAndResume, strikeFrontierRock } from './engineTasks';
import { placeActorsForScene, planLiveWorker, routeRiverWalkWaypoints, stepLiveAnimal, stepLiveBuilder, syncLiveAnimals } from './farmLive';
const W = 1280, H = 720;
void FIELD_X; void FIELD_Y;
const plotC = (i: number) => estatePlotCenter(activeFarm(), i);
interface Task { kind: string; plot?: number; animal?: number; node?: number; x: number; y: number; face: number; dur: number; hit: number; to?: string; seed?: CropId }
interface Walker {
  x: number; y: number; face: number; rig: FarmerRig; ph: number; mode: 'idle' | 'walk' | 'act'; kind: string; p: number;
  tasks: Task[]; cur: Task | null; hitDone: boolean; speed: number; player: boolean; wait: number;
}
interface AR { id: number; kind: AnimalKind; rig: AnimalRig; x: number; y: number; face: number; mode: 'idle' | 'walk' | 'graze'; timer: number; tx: number; ty: number; ph: number; seed: number; sc: number }
interface Fx { x: number; y: number; vx: number; vy: number; g: number; life: number; max: number; icon?: string; text?: string; col?: string; sc: number; r?: number }
export const JAHANGIR_HUT = { cx: 1156, cy: 646 };
export interface EngineRigSnapshot {
  builder: { phase: 'off' | 'walk' | 'work' | 'exit'; mode: string; x: number; y: number; legF: number; legB: number; shinF: number; armF: number; hasTool: boolean };
  workers: Array<{ x: number; y: number; mode: string; kind: string; legF: number; stuckRecoveries: number }>;
  animals: Array<{ id: number; kind: AnimalKind; x: number; y: number; mode: string; scale: number }>;
  pausedInBackground: boolean;
  framesRendered: number;
  viewport: { scale: number; tx: number; ty: number };
}
export const cmd = {
  travelTo: (_: SceneKey) => { void _; },
  actPlot: (_kind: string, _idx: number) => { void _kind; void _idx; },
  resetMotion: () => {},
  inspectEngine: (): EngineRigSnapshot | null => null,
};
const TASK_AUTO: Record<string, string> = { till: 'till', plant: 'plant', water: 'water', harvest: 'harvest', fert: 'fert', feed: 'feed', collect: 'collect', well: 'water' };
function machineSpeed(kind: string): number {
  const k = TASK_AUTO[kind];
  if (!k) return 1;
  for (const id of Object.keys(S.machines) as MachineId[]) {
    if (MACHINES[id].auto === k && mkOf(id) > 0) return MK_SPEED[mkOf(id)];
  }
  return 1;
}
function mkWalker(pal: Pal, x: number, y: number, player: boolean): Walker {
  return { x, y, face: 1, rig: makeFarmer(pal), ph: 0, mode: 'idle', kind: '', p: 0, tasks: [], cur: null, hitDone: false, speed: player ? 320 : 210, player, wait: 0 };
}
import { createSceneRenderer } from './engineRender';
import { bindWorldActors, cinema, stepCinemaStage } from './cinemaStage';
export function startEngine(canvas: HTMLCanvasElement): () => void {
  // تنها ۱ بوم مرئی استاندارد (زیر سقف بودجهٔ Full-HD حافظهٔ GPU وب‌ویو، بدون باگ RGBX alpha:false و با صفر FBO مخفی)
  const ctx = canvas.getContext('2d')!;
  let dpr = 1, cw = 1, ch = 1, sc = 1, tx = 0, ty = 0;
  const farmer = mkWalker(PAL_PLAYER, 398, 356, true);
  const workers: Walker[] = PAL_WORKERS.map((p, i) => mkWalker(p, 352 + i * 56, 358 + (i % 2) * 20, false));
  const builder = mkWalker(PAL_BUILDER, 1290, 232, false);
  const BSITE = { x: 876, y: 232 };
  let bph: 'off' | 'walk' | 'work' | 'exit' = 'off';
  const npcs = PAL_NPC.map((p, i) => {
    const [sx, sy] = npcTargetAt(i, S.hour);
    const w = mkWalker(p, sx, sy, false);
    w.speed = TOWN_ACTORS[i]?.speed ?? 68;
    return w;
  });
  const jahangir = mkWalker(PAL_JAHANGIR, 984, 632, false);
  jahangir.face = -1;
  const animals = new Map<number, AR>();
  const fx: Fx[] = [];
  let t = 0, last = performance.now(), raf = 0, notifyT = 0, saveT = 0, musicT = 1.5;
  let trans: null | { t: number; to: SceneKey; from: SceneKey; done: boolean } = null;
  let lastScene: SceneKey = UI.scene, dragLast = -1, dragging = false;
  let knownWorkers = S.workers;
  let camX = 640, panStartX = 0, panCamStart = 640, panMoved = 0, panActive = false;
  bindWorldActors({ farmer, jahangir, npcs, builder });
  const renderView = createSceneRenderer(canvas, ctx, farmer, workers, builder, BSITE, jahangir, npcs, animals, fx);
  function syncViewport(dt = 1) {
    if (cw / ch < 0.76) {
      sc = Math.min(ch / H, Math.max(cw / W, cw / 650));
      ty = Math.round((ch - H * sc) * 0.44);
      if (cinema.active) {
        tx = (cw - W * sc) / 2;
      } else {
        if (!panActive && (farmer.mode === 'walk' || farmer.cur || farmer.tasks.length > 0)) {
          camX += (farmer.x - camX) * Math.min(1, dt * 4.5);
        }
        const halfView = cw / (2 * sc);
        camX = Math.max(halfView, Math.min(W - halfView, camX));
        tx = Math.min(0, Math.max(cw - W * sc, cw / 2 - camX * sc));
      }
    } else {
      sc = Math.min(cw / W, ch / H);
      tx = (cw - W * sc) / 2;
      ty = Math.round((ch - H * sc) * 0.48);
    }
  }

  let hoverPlot = -1;
  const render = () => renderView({ dpr, cw, ch, sc, tx, ty, t, bph, trans, hoverPlot });
  function resize() {
    const cssW = Math.max(1, canvas.clientWidth || window.innerWidth || 1);
    const cssH = Math.max(1, canvas.clientHeight || window.innerHeight || 1);
    const pixelCapScale = Math.sqrt((1920 * 1080) / (cssW * cssH));
    const nextDpr = Math.min(2, pixelCapScale, window.devicePixelRatio || 1);
    const nextW = Math.max(1, Math.round(window.innerWidth || 1));
    const nextH = Math.max(1, Math.round(window.innerHeight || 1));
    const pxW = Math.max(1, Math.round(nextW * nextDpr)), pxH = Math.max(1, Math.round(nextH * nextDpr));
    const changed = canvas.width !== pxW || canvas.height !== pxH || cw !== nextW || ch !== nextH || dpr !== nextDpr;
    dpr = nextDpr; cw = nextW; ch = nextH;
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    if (canvas.width !== pxW || canvas.height !== pxH) { canvas.width = pxW; canvas.height = pxH; }
    camX = farmer.x; syncViewport(1);
    const prof = detectProfile(cw, ch);
    if (prof.portrait !== UI.portrait) { UI.portrait = prof.portrait; notify(); }
    if (UI.profile !== prof.id) { UI.profile = prof.id; notify(); }
    if (changed) render();
  }
  resize();
  const toLogical = (e: CanvasPoint) => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left - tx) / sc, y: (e.clientY - r.top - ty) / sc };
  };
  const toScreen = (lx: number, ly: number) => ({ x: tx + lx * sc, y: ty + ly * sc });

  // ===== وظایف =====
  const DUR: Record<string, [number, number]> = {
    till: [0.85, 0.7], plant: [0.7, 0.5], water: [0.8, 0.55], harvest: [0.75, 0.55], fert: [0.7, 0.5], collect: [0.6, 0.5], feed: [0.8, 0.5], well: [1.0, 0.6], mine: [1.05, 0.58], fish: [1.3, 0.9], build: [1.2, 0.8],
  };
  function mkTask(kind: string, x: number, y: number, extra: Partial<Task> = {}): Task {
    const d = DUR[kind] ?? [0, 0];
    let dur = d[0];
    if (kind === 'till') dur /= (HOE_SPEED[S.lv.hoe] ?? 1);
    dur *= machineSpeed(kind);
    return { kind, x, y, face: 1, dur, hit: d[1], ...extra };
  }
  function plotTask(kind: string, i: number, player: boolean, seed?: CropId): Task {
    const { cx, cy } = plotC(i);
    return mkTask(kind, player ? cx - 32 : cx + 34, cy + 26, { plot: i, face: player ? 1 : -1, seed });
  }
  function reasonToast(r: string) {
    const map: Record<string, () => void> = {
      locked: () => toast('lock', GT.g147),
      tired: () => { toast('bolt', GT.g148); sfx.err(); },
      noseed: () => { toast('seed:' + UI.seed, GT.g149); UI.seedTray = true; sfx.err(); notify(); },
      season: () => { toast(['spring', 'summer', 'autumn', 'winter'][season()], GT.g150); sfx.err(); },
      nocan: () => { toast('can', GT.g151); sfx.err(); },
      nofert: () => { toast('fert', GT.g152); sfx.err(); },
      full: () => { toast('bag', GT.gPackFull); sfx.err(); },
    };
    map[r]?.();
  }
  function enqueuePlot(kind: string, i: number) {
    const r = canAct(kind, i);
    if (r) { if (r !== 'skip') reasonToast(r); return false; }
    if (farmer.tasks.some((q) => q.plot === i && q.kind === kind) || (farmer.cur?.plot === i && farmer.cur.kind === kind)) return false;
    if (farmer.tasks.length > 40) return false;
    farmer.tasks.push(plotTask(kind, i, true));
    sfx.tap();
    return true;
  }
  function moveTo(w: Walker, x: number, y: number, clearQ = true) {
    if (clearQ) { w.tasks = []; w.cur = null; w.mode = 'idle'; }
    const ymin = UI.scene === 'town' ? 476 : UI.scene === 'river' ? 486 : 212;
    const pts = UI.scene === 'river'
      ? routeRiverWalkWaypoints(w.x, w.y, Math.max(36, Math.min(1248, x)), Math.max(ymin, Math.min(682, y)))
      : [[Math.max(36, Math.min(1248, x)), Math.max(ymin, Math.min(682, y))] as [number, number]];
    for (const [px, py] of pts) w.tasks.push({ kind: 'move', x: px, y: py, face: 0, dur: 0, hit: 0 });
  }

  // ===== افکت‌ها =====
  function pop(x: number, y: number, icon: string, n = 1, text?: string) {
    for (let i = 0; i < n; i++) fx.push({ x: x + (i - (n - 1) / 2) * 26, y, vx: 0, vy: -70, g: 0, life: 1.1, max: 1.1, icon, sc: 0.75 });
    if (text) fx.push({ x: x + 34, y: y - 6, vx: 0, vy: -50, g: 0, life: 1.1, max: 1.1, text, col: '#fff3b0', sc: 1 });
  }
  function dust(x: number, y: number, col: string, n: number) {
    if (isReducedMotion()) return;
    for (let i = 0; i < n; i++) fx.push({ x, y, vx: (rnd() - 0.5) * 120, vy: -40 - rnd() * 80, g: 380, life: 0.6, max: 0.6, col, sc: 1, r: 3 + rnd() * 3 });
  }
  function drops(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) fx.push({ x: x + rnd() * 8, y: y + rnd() * 6, vx: 50 + rnd() * 40, vy: -20, g: 520, life: 0.7, max: 0.7, col: '#5fb4ee', sc: 1, r: 3 });
  }

  // ===== اجرای وظیفه =====
  function applyTask(w: Walker, tk: Task) {
    const player = w.player;
    if (tk.plot !== undefined) {
      const i = tk.plot;
      const r = canAct(tk.kind, i, !player, tk.seed);
      if (player && tk.kind === 'water' && r === 'nocan') {
        queueWellAndResume(w, tk, mkTask);
        notify();
        return;
      }
      if (r) { if (player && r !== 'skip') reasonToast(r); return; }
      const hits = player ? performPlayerPlotSweep(i, tk.kind, canAct, doAct, rnd) : [{ plot: i, ...doAct(tk.kind, i, true, tk.seed) }];
      if (player) {
        notePlayerAction(Math.max(1, hits.length));
        if (tk.kind === 'harvest' && hits.some((h) => (h.qty ?? 0) > 0)) {
          if (UI.scene === 'north' && !S.story.seen['estate-north-harvest']) playNode('estate-north-harvest');
          else if (UI.scene === 'valley' && !S.story.seen['estate-valley-harvest']) playNode('estate-valley-harvest');
        }
      }
      for (const h of hits) {
        const { cx, cy } = plotC(h.plot);
        if (tk.kind === 'till') dust(cx, cy + 10, '#8a5a34', 9);
        else if (tk.kind === 'plant') { pop(cx, cy - 10, 'seed:' + h.crop, 1); dust(cx, cy + 10, '#7a4b2c', 4); }
        else if (tk.kind === 'water') { drops(cx, cy - 30, 6); dust(cx, cy + 4, '#6bb4ee', 5); }
        else if (tk.kind === 'harvest') { pop(cx, cy - 30, h.crop!, Math.min(3, h.qty ?? 1), h.qty ? '+' + fa(h.qty) : undefined); if (h.golden) pop(cx, cy - 58, 'star', 2); if (!h.qty) toast('bag', GT.g43); }
        else if (tk.kind === 'fert') { pop(cx, cy - 20, 'fert', 1); dust(cx, cy, '#8de06a', 6); }
      }
      return;
    }
    switch (tk.kind) {
      case 'well': S.can = canCap(); drops(w.x + w.face * 30, w.y - 30, 12); sfx.water(); toast('can', GT.g153); notePlayerAction(1); checkSecretTriggers('well'); break;
      case 'mine':
        if ((UI.scene === 'cave' || UI.scene === 'forest') && tk.node !== undefined) strikeFrontierRock(UI.scene, tk.node, tk.x, tk.y, pop, dust);
        break;
      case 'straw': {
        const got = collectAllStrawEggs(!player);
        if (got > 0) { if (player) notePlayerAction(1); pop(STRAW_NEST.cx, STRAW_NEST.cy - 34, 'egg', Math.min(4, got), '+' + fa(got)); }
        break;
      }
      case 'pondwork': if (workerServiceUnifiedPond()) { const g = unifiedPondGeom(); pop(g.cx, g.cy - 36, 'fish', 2); } break;
      case 'hivework': {
        if (S.hives > 0 && S.honeyAcc >= 1) { const got = harvestHoney(true); if (got > 0) pop(w.x, w.y - 46, 'honey', Math.min(3, got), '+' + fa(got)); }
        break;
      }
      case 'collect': {
        const a = S.animals.find((q) => q.id === tk.animal);
        if (a && a.ready > 0) {
          if (player) S.stamina = Math.max(0, S.stamina - 0.5);
          const prod = ANIMALS[a.kind].prod, got = addGood(prod, a.ready);
          if (player && got < a.ready) toast('bag', GT.g43);
          a.ready -= got;
          if (got > 0) { addStat('collect', got); addXp(got * XP.collect); const ar = animals.get(a.id); pop(ar?.x ?? w.x, (ar?.y ?? w.y) - 50, prod, Math.min(3, got), '+' + fa(got)); if (player) sfx.pop(); }
        }
        break;
      }
      case 'feed': {
        if (!hasGrazingLivestock()) {
          if (player) { toast('feed', GT.noGrazersForFeed); sfx.tap(); }
          break;
        }
        let space = troughCap() - S.trough, moved = 0;
        for (const id of ['feed', 'wheat', 'corn']) {
          const n = Math.floor(Math.min(space, S.inv[id] ?? 0));
          if (n > 0) { S.inv[id] -= n; if (S.inv[id] <= 0) delete S.inv[id]; space -= n; S.trough += n; moved += n; }
        }
        if (moved > 0) { pop(FEED_TROUGH.cx, FEED_TROUGH.cy - 28, 'feed', 1, '+' + fa(moved)); if (player) sfx.pop(); }
        else if (player) { toast('feed', space <= 0 ? GT.g154 : GT.g53); sfx.err(); }
        break;
      }
      case 'fish': {
        if (!player) {
          const got = workerCatchRiverFish();
          if (got > 0) pop(w.x, w.y - 56, 'fish', Math.min(2, got), '+' + fa(got));
          break;
        }
        resolveCast(w.x, w.y, 0.35);
        break;
      }
      case 'open':
        if (tk.to === 'market' && checkSecretTriggers('market-open')) { UI.info = null; sfx.tap(); break; }
        if (tk.to && triggerShopIntro(tk.to)) { UI.info = null; sfx.tap(); break; }
        UI.modal = tk.to as typeof UI.modal; UI.info = null; sfx.tap(); break;
      case 'travel': startTrans(tk.to as SceneKey); break;
    }
    notify();
  }
  function startTrans(to: SceneKey) {
    if (to === UI.scene) return;
    if (to === 'town') S.cityVisits++;
    fishCast.active = false; fishCast.armed = false;
    trans = { t: 0, to, from: UI.scene, done: false }; farmer.tasks = []; farmer.cur = null;
  }
  cmd.travelTo = startTrans;
  cmd.resetMotion = () => {
    trans = null; farmer.tasks = []; farmer.cur = null; farmer.mode = 'idle';
    fishCast.active = false; fishCast.armed = false;
  };
  onNewDay.cb = () => { for (const w of workers) { w.tasks = []; w.cur = null; } };
  function updateWalker(w: Walker, dt: number) {
    if (!w.cur && w.tasks.length) { w.cur = w.tasks.shift()!; w.mode = 'walk'; w.hitDone = false; w.p = 0; }
    if (w.cur) {
      const tk = w.cur;
      if (w.mode === 'walk') {
        const dx = tk.x - w.x, dy = tk.y - w.y, d = Math.hypot(dx, dy);
        const spd = w.player && (w.tasks.some((q) => q.kind === 'travel' || q.kind === 'open') ? true : false) ? 520 : (w.player && d > 240 ? 390 : w.speed);
        const st = spd * dt;
        if (d <= st + 1) {
          w.x = tk.x; w.y = tk.y; w.mode = 'act'; w.p = 0; w.kind = tk.kind; if (tk.face) w.face = tk.face;
          if (w.player && tk.kind === 'fish' && fishCast.armed) { fishCast.armed = false; fishCast.active = true; fishCast.t = 0; sfx.nibble(); notify(); }
          if (tk.dur === 0) { applyTask(w, tk); w.cur = null; w.mode = 'idle'; }
        }
        else { w.x += (dx / d) * st; w.y += (dy / d) * st; w.ph += st * 0.075; if (Math.abs(dx) > 3) w.face = dx > 0 ? 1 : -1; }
      } else if (w.mode === 'act') {
        w.p += dt / tk.dur;
        if (!w.hitDone && w.p >= tk.hit) { w.hitDone = true; applyTask(w, tk); }
        if (w.p >= 1) { w.cur = null; w.mode = 'idle'; }
      }
    } else w.mode = 'idle';
  }
  const workerThink = (w: Walker, wi: number) => planLiveWorker(w, wi, t, mkTask, plotTask, moveTo, workers);
  const updateBuilder = (dt: number) => { bph = stepLiveBuilder(builder, bph, BSITE, dt, updateWalker, dust, completeBuild); };
  const syncAnimals = () => syncLiveAnimals(animals);
  const updateAnimal = (a: AR, dt: number) => stepLiveAnimal(a, dt, t);

  cmd.actPlot = (kind: string, idx: number) => { UI.info = null; enqueuePlot(kind, idx); notify(); };
  // ===== ورودی =====
  function resolveCast(rx: number, ry: number, treasureBase: number) {
    const precision = castPrecisionNow();
    fishCast.active = false; fishCast.armed = false;
    fishCast.streak = precision > 0.72 ? fishCast.streak + 1 : 0;
    S.stamina = Math.max(0, S.stamina - FISH_STAM);
    const boost = Math.min(0.45, fishCast.streak * 0.12);
    const res = catchRegionalFish(1 + precision * 0.55 + boost);
    if (res.qty <= 0) { fishCast.streak = 0; toast('fish', GT.g155); sfx.err(); }
    else {
      if (fishCast.streak >= 2) bumpPlayerCombo('fish');
      pop(rx, ry - 60, res.species.good, Math.min(3, res.qty), '+' + fa(res.qty));
      if (res.sweet && rnd() < treasureBase + boost * 0.3) {
        pop(rx, ry - 84, 'coin', 2, '+' + fa(rollRiverTreasure(rnd))); sfx.coin();
      } else sfx.pop();
    }
    notePlayerAction(1); checkSecretTriggers('fish');
  }
  function finishRiverCast() {
    if (!fishCast.active) return;
    farmer.tasks = []; farmer.cur = null; farmer.mode = 'idle';
    resolveCast(farmer.x, farmer.y, 0.45); notify();
  }
  const tapRouter = createSceneTapRouter({
    farmer, animals, npcs, jahangir,
    getDragLast: () => dragLast,
    setDragLast: (v) => { dragLast = v; },
    clearTrans: () => { trans = null; },
    moveTo, mkTask, enqueuePlot, reasonToast, toScreen, pop, finishRiverCast,
  });
  const dispatchTap = tapRouter.dispatchTap;
  const unbindInput = bindCanvasInput(canvas, resize, {
    onDown: (e) => {
      lastInputAt = performance.now(); lastPaint = 0;
      if (!UI.started || UI.modal || UI.confirm || (trans && !trans.done) || cinema.active) return;
      dragging = true; dragLast = -1; panMoved = 0; panActive = false;
      panStartX = e.clientX; panCamStart = camX;
      const { x, y } = toLogical(e);
      const curSpec = isFarmScene(UI.scene) ? ESTATES[UI.scene] : null;
      const inFieldWithTool = !!curSpec && UI.tool !== 'hand' && estatePlotAt(UI.scene as FarmSceneId, x, y) >= 0;
      if (cw / ch < 0.76 && !inFieldWithTool && !fishCast.active) { panActive = true; return; }
      dispatchTap(x, y, e);
    },
    onMove: (e) => {
      lastInputAt = performance.now();
      const pt = toLogical(e);
      hoverPlot = isFarmScene(UI.scene) ? estatePlotAt(UI.scene, pt.x, pt.y) : -1;
      if (!dragging) return;
      if (panActive) {
        const dx = e.clientX - panStartX;
        panMoved = Math.max(panMoved, Math.abs(dx));
        if (panMoved > 28) { camX = panCamStart - dx / sc; syncViewport(1); }
        return;
      }
      if (!isFarmScene(UI.scene)) return;
      if (UI.scene === 'farm') tapRouter.farmTap(pt.x, pt.y, e, false);
      else tapRouter.estateTap(UI.scene, pt.x, pt.y, false);
    },
    onUp: (e) => {
      if (dragging && panActive && panMoved <= 28) { const { x, y } = toLogical(e); dispatchTap(x, y, e); }
      dragging = false; dragLast = -1; panActive = false;
    },
    onLeave: () => { hoverPlot = -1; },
  });

  // ===== حلقه بازی (بهینه‌شده برای مصرف باتری گوشی‌های هوشمند بدون حذف کوچک‌ترین جزئیات بصری یا انیمیشن) =====
  let lastIdleKey = '';
  let lastPaint = 0;
  let lastInputAt = performance.now();
  let bgPaused = false;
  let framesRendered = 0;
  let prevHudMin = -1;
  syncMailboxState(false);

  interface StuckState { lx: number; ly: number; t: number; fixes: number }
  const farmerStuck: StuckState = { lx: farmer.x, ly: farmer.y, t: 0, fixes: 0 };
  const workerStuck: StuckState[] = workers.map((w) => ({ lx: w.x, ly: w.y, t: 0, fixes: 0 }));
  const npcStuck: StuckState[] = npcs.map((n) => ({ lx: n.x, ly: n.y, t: 0, fixes: 0 }));
  let builderLastX = builder.x, builderStuckT = 0;

  function guardWalker(w: Walker, st: StuckState, dt: number) {
    if (w.cur && w.mode === 'walk') {
      if (Math.hypot(w.x - st.lx, w.y - st.ly) < 0.4) {
        st.t += dt;
        if (st.t > 0.5) { w.x = w.cur.x; w.y = w.cur.y; st.t = 0; st.fixes++; }
      } else st.t = 0;
    } else st.t = 0;
    st.lx = w.x; st.ly = w.y;
  }

  cmd.inspectEngine = () => ({
    scene: UI.scene,
    farmer: { x: farmer.x, y: farmer.y, mode: farmer.mode, kind: farmer.kind, cur: farmer.cur ? { ...farmer.cur } : null, tasks: farmer.tasks.map((q) => ({ ...q })) },
    builder: { phase: bph, mode: builder.mode, x: builder.x, y: builder.y, legF: builder.rig.legF.r, legB: builder.rig.legB.r, shinF: builder.rig.shinF.r, armF: builder.rig.armF.r, hasTool: Boolean(builder.rig.tool.p) },
    workers: workers.slice(0, S.workers).map((w, i) => ({ x: w.x, y: w.y, mode: w.mode, kind: w.kind, legF: w.rig.legF.r, stuckRecoveries: workerStuck[i]?.fixes ?? 0 })),
    animals: [...animals.values()].map((a) => ({ id: a.id, kind: a.kind, x: a.x, y: a.y, mode: a.mode, scale: a.sc })),
    pausedInBackground: bgPaused,
    framesRendered,
    viewport: { scale: sc, tx, ty },
  });
  if (__DEV_TOOLS__) (window as unknown as { __inspectEngine?: typeof cmd.inspectEngine }).__inspectEngine = cmd.inspectEngine;

  function frame(now: number) {
    if (bgPaused) { raf = 0; return; }
    raf = requestAnimationFrame(frame);
    const stepDriven = Boolean((window as unknown as { __stepFrames?: unknown }).__stepFrames);
    // گام‌بندی تطبیقی باتری: ۶۰ فریم در هر تعامل/حرکت/بارش/ذره، ۳۰ فریم نرم در سکون کامل، ۰ فریم در مودال/توقف
    const active = dragging || now - lastInputAt < 2500 || farmer.mode !== 'idle' || bph !== 'off' || !!trans || fx.length > 0 || S.weather >= 2 || cinema.active || fishCast.active || fishCast.armed;
    if (!stepDriven && lastPaint > 0 && now - lastPaint < (active ? 15.2 : 31.5)) return;
    lastPaint = now;

    const liveW = Math.max(1, Math.round(window.innerWidth || cw));
    const liveH = Math.max(1, Math.round(window.innerHeight || ch));
    const resized = liveW !== cw || liveH !== ch;
    if (resized) resize();
    const frozen = UI.paused || !!UI.modal || !!UI.confirm || !UI.started || cinema.active;
    const idleKey = `${frozen ? 1 : 0}:${fishCast.active || fishCast.armed ? 1 : 0}:${UI.modal ?? ''}:${UI.confirm ?? ''}:${UI.started ? 1 : 0}:${CFG.locale}:${UI.scene}:${Math.round(S.hour * 20)}`;
    if (frozen && !fishCast.active && !fishCast.armed && !cinema.active && !resized && !stepDriven && idleKey === lastIdleKey) return;
    lastIdleKey = idleKey;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now; snd.on = UI.sound; t += dt;
    if (fishCast.active || fishCast.armed) fishCast.t += dt;
    const busy = !!trans;
    if (cinema.active || cinema.letterbox > 0.005) {
      musicT -= dt; if (musicT <= 0) { musicT = 2.8; ambient.note(season(), S.hour); }
      stepCinemaStage(dt);
    }
    // کارگر جدید بدون نیاز به نجار خودش پای پیاده از جادهٔ دهکده وارد مزرعه می‌شود!
    if (S.workers > knownWorkers) {
      for (let wi = knownWorkers; wi < S.workers; wi++) {
        const w = workers[wi];
        if (!w) continue;
        w.x = 1272; w.y = 352; w.face = -1; w.wait = 0; w.cur = null; w.tasks = [];
        w.tasks.push({ kind: 'move', x: 520 + wi * 65, y: 318, face: -1, dur: 0, hit: 0 });
      }
      knownWorkers = S.workers;
    } else if (S.workers < knownWorkers) knownWorkers = S.workers;

    syncAnimals();
    if (!frozen) {
      if (!busy) tickLiveClock(dt * UI.speed);
      musicT -= dt; if (musicT <= 0) { musicT = 2.8; ambient.note(season(), S.hour); }
      updateBuilder(dt);
      // سپر ضد گیرکردن نجار حین ورود/خروج جادهٔ دهکده
      if (bph === 'walk' || bph === 'exit') {
        if (Math.abs(builder.x - builderLastX) < 0.3) {
          builderStuckT += dt;
          if (builderStuckT > 0.5) {
            builder.x = bph === 'walk' ? BSITE.x : 1292;
            builderStuckT = 0;
          }
        } else builderStuckT = 0;
      } else builderStuckT = 0;
      builderLastX = builder.x;

      updateWalker(farmer, dt);
      guardWalker(farmer, farmerStuck, dt);
      if (!busy && farmer.mode === 'walk' && farmer.cur?.kind === 'move' && !farmer.tasks.length) {
        const edgeTo = checkSeamlessEdgePortal(UI.scene, farmer.x, farmer.y);
        if (edgeTo) startTrans(edgeTo);
      }
      workers.forEach((w, wi) => {
        if (wi >= S.workers) return;
        w.wait -= dt;
        if (w.wait <= 0 || w.cur || w.tasks.length > 0) {
          updateWalker(w, dt);
          guardWalker(w, workerStuck[wi], dt);
          if (!busy) workerThink(w, wi);
        } else w.mode = 'idle';
      });
      for (const a of animals.values()) updateAnimal(a, dt);
      if (UI.scene === 'town') npcs.forEach((n, ni) => {
        updateWalker(n, dt);
        guardWalker(n, npcStuck[ni], dt);
        if (!n.cur && !n.tasks.length) {
          n.wait -= dt;
          if (n.wait <= 0) {
            const [tx2, ty2] = npcTargetAt(ni, S.hour);
            n.wait = 2.5 + rnd() * 3.5;
            n.tasks.push({ kind: 'move', x: tx2 + (rnd() - 0.5) * 44, y: Math.max(592, ty2 + (rnd() - 0.5) * 20), face: 0, dur: 0, hit: 0 });
          }
        }
      });
    }
    if (trans) {
      if (cinema.active) { trans = null; } else {
        trans.t += dt;
        if (trans.t > 0.31 && !trans.done) {
          trans.done = true; UI.scene = trans.to; UI.info = null;
          fishCast.active = false; fishCast.armed = false;
          placeActorsForScene(trans.to, trans.from, farmer, workers);
          lastScene = trans.to; camX = farmer.x;
          advance(PORTAL_TRAVEL_HOURS); notify();
        }
        if (trans.t > 0.62) {
          const arrived = trans.to; trans = null;
          notePlayerAction(1);
          if (arrived === 'apiary') checkSecretTriggers('apiary');
          if (UI.afterTalkNpc !== null && !S.story.pending) {
            const target = UI.afterTalkNpc;
            UI.afterTalkNpc = null;
            if (target === 'sharkhar') talkToSharkhar();
            else talkToTownNpc(target);
            notify();
          } else if (UI.afterModal && !S.story.pending) {
            UI.modal = UI.afterModal;
            UI.afterModal = null;
            notify();
          } else if (arrived !== 'farm') triggerAreaIntro(arrived);
        }
      }
    } else if (!cinema.active && UI.scene !== lastScene) {
      lastScene = UI.scene;
      placeActorsForScene(UI.scene, null, farmer, workers);
      camX = farmer.x;
    }
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i]; f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += f.g * dt;
      if (f.life <= 0) fx.splice(i, 1);
    }
    if (!frozen) notifyT += dt;
    saveT += dt;
    const curHudMin = Math.floor(S.hour * 6) + Math.floor(S.stamina);
    if (notifyT > 1.0 && curHudMin !== prevHudMin) {
      notifyT = 0;
      prevHudMin = curHudMin;
      if (UI.started && !cinema.active) notify();
    }
    if (saveT > 20) { saveT = 0; if (UI.started) saveGame(); }
    if (!cinema.active) {
      poseFarmer(farmer.rig, { mode: farmer.mode, ph: farmer.ph, t, kind: farmer.kind, p: farmer.p });
      if (bph !== 'off') {
        poseFarmer(builder.rig, { mode: builder.mode, ph: builder.ph, t, kind: builder.kind, p: builder.p });
      }
      workers.forEach((w, wi) => { if (wi < S.workers) poseFarmer(w.rig, { mode: w.mode, ph: w.ph, t, kind: w.kind, p: w.p }); });
      for (const n of npcs) poseFarmer(n.rig, { mode: n.mode, ph: n.ph, t, kind: n.kind, p: n.p });
    }
    syncViewport(dt);
    render();
    framesRendered++;
  }

  // تعلیق کامل حلقهٔ رندر و صدای WebAudio هنگام خاموشی صفحه یا رفتن برنامه به پس‌زمینه (صرفه‌جویی حداکثری باتری گوشی)
  const syncVisibility = () => {
    const hidden = typeof document !== 'undefined' && document.hidden === true;
    if (typeof document !== 'undefined') document.documentElement.dataset.bg = hidden ? '1' : '0';
    if (hidden) {
      bgPaused = true;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      suspendAudioForBackground();
      if (UI.started) saveGame();
    } else if (bgPaused) {
      bgPaused = false;
      last = performance.now();
      lastPaint = 0;
      lastIdleKey = '';
      resumeAudioFromBackground();
      if (!raf) raf = requestAnimationFrame(frame);
    }
  };
  document.addEventListener('visibilitychange', syncVisibility);
  window.addEventListener('pagehide', syncVisibility);
  window.addEventListener('pageshow', syncVisibility);

  raf = requestAnimationFrame(frame);
  return () => {
    if (raf) cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', syncVisibility);
    window.removeEventListener('pagehide', syncVisibility);
    window.removeEventListener('pageshow', syncVisibility);
    cmd.inspectEngine = () => null;
    unbindInput();
  };
}

