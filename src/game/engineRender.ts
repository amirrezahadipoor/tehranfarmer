import { TW, TH, cached, cropPart, ell, iconPart, ln, put, rng, shape, type Ctx } from './art';
import { ANIMALS, COLS, ROWS, ghCovers, isUnlocked, type AnimalKind, type CropId } from './data';
import { drawAnimal, drawFarmer, poseFarmer, type AnimalRig, type FarmerRig } from './rig';
import { FIELD_X, FIELD_Y, HIVE_SLOTS, OX, OY, PLOT_DX, PLOT_DY, RIVER_SPOTS, BW, BH, getSceneSource } from './scenes';
import { S, UI, season, unreadMailCount } from './state';
import { isReducedMotion } from './settings';
import { faPct } from '../strings/fa';
import { cinema, drawCinemaForegroundUI, drawCinemaWorldExtras, isActorStagedInScene } from './cinemaStage';
import { drawAnimalStatusExtra, drawFieldUpgradesAndHover, drawFullScarecrow, liveAnimalScale } from './farmVisuals';
import { renderEstateFieldScene } from './estateScenes';
import { drawTownWorldExpansions, renderFrontierScene } from './frontierScenes';
import { drawFarmlandPlotsLayer, drawGlasshouseSpan, drawSignPlaque } from './worldRoads';
import { FT } from '../strings/frontierText';
import { WX } from '../strings/worldExpansionText';
import { drawCourtyardDecor, drawFestivalDecor, drawRiverCastGauge, isCropDormantNow } from './worldVisuals';
import { drawNpcOverheadInfo } from './npcLabels';
import { POSTBOX_GEOM, drawCachedSilo, drawWorldMachines, drawWorldPostbox } from './postboxArt';
import type { SceneKey } from './scenes';

import { drawFarmZonesAndTrough, drawUnifiedPond, isPoultry } from './farmZones';

const W = 1280;
const H = 720;
const FX = FIELD_X;
const FY = FIELD_Y;
const plotC = (i: number) => ({ cx: FX + (i % COLS) * PLOT_DX + TW / 2, cy: FY + Math.floor(i / COLS) * PLOT_DY + TH / 2 });

export interface Task { kind: string; plot?: number; animal?: number; node?: number; x: number; y: number; face: number; dur: number; hit: number; to?: string; seed?: CropId }
export interface Walker {
  x: number; y: number; face: number; rig: FarmerRig; ph: number; mode: 'idle' | 'walk' | 'act'; kind: string; p: number;
  tasks: Task[]; cur: Task | null; hitDone: boolean; speed: number; player: boolean; wait: number;
}
export interface AR { id: number; kind: AnimalKind; rig: AnimalRig; x: number; y: number; face: number; mode: 'idle' | 'walk' | 'graze'; timer: number; tx: number; ty: number; ph: number; seed: number; sc: number }
export interface Fx { x: number; y: number; vx: number; vy: number; g: number; life: number; max: number; icon?: string; text?: string; col?: string; sc: number; r?: number }

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a), B = hexToRgb(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
}
const SKY: [number, string, string][] = [
  [0, '#0f1740', '#2a3068'], [5, '#1c2250', '#4a4a88'], [6.5, '#ff9a6b', '#ffd9a0'], [8, '#6fc2f2', '#d8f3ff'],
  [16.5, '#6fc2f2', '#d8f3ff'], [18.5, '#ff8a5b', '#ffd08a'], [20, '#1c2250', '#4a4a88'], [24, '#0f1740', '#2a3068'],
];
function skyAt(h: number): [string, string] {
  for (let i = 0; i < SKY.length - 1; i++) {
    const a = SKY[i], b = SKY[i + 1];
    if (h >= a[0] && h <= b[0]) {
      const t = (h - a[0]) / (b[0] - a[0]);
      const m = (x: string, y: string) => { const c = mix(x, y, t); return c; };
      return [m(a[1], b[1]), m(a[2], b[2])];
    }
  }
  return [SKY[0][1], SKY[0][2]];
}
function nightAlpha(h: number): number {
  if (h < 5) return 0.6;
  if (h < 7) return 0.6 * (1 - (h - 5) / 2);
  if (h < 17) return 0;
  if (h < 20) return 0.56 * ((h - 17) / 3);
  return 0.56 + 0.04 * ((h - 20) / 4);
}

export interface FrameView {
  dpr: number; cw: number; ch: number; sc: number; tx: number; ty: number; t: number;
  bph: 'off' | 'walk' | 'work' | 'exit';
  trans: null | { t: number; to: SceneKey; done: boolean };
  hoverPlot?: number;
}

export function createSceneRenderer(
  canvas: HTMLCanvasElement,
  ctx: Ctx,
  farmer: Walker,
  workers: Walker[],
  builder: Walker,
  BSITE: { x: number; y: number },
  jahangir: Walker,
  npcs: Walker[],
  animals: Map<number, AR>,
  fx: Fx[],
) {
  let bgSeason = -1;
  let bgEdge: Record<string, string> = {};
  let bgActive: CanvasImageSource | null = null;
  let weatherKey = -1;
  const rr = rng(3);
  const rain = Array.from({ length: 95 }, () => ({ x: rr() * 2200 - 460, y: rr() * 1100 - 250, s: 0.7 + rr() }));
  const flakes = Array.from({ length: 120 }, () => ({ x: rr() * 2200 - 460, y: rr() * 1100 - 250, s: 0.4 + rr(), p: rr() * 6 }));
  const clouds = Array.from({ length: 8 }, (_, i) => ({ x: rr() * 1900 - 300, y: 30 + rr() * 90, s: 0.7 + rr() * 0.8, v: 6 + rr() * 8, k: i }));
  function circSafe(c: Ctx, x: number, y: number, r: number, col: string) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 6.3); c.fill(); }
  const cloudW = cached('cloudW', 260, 130, 130, 80, (c) => cloudShape(c, '#ffffff'));
  const cloudG = cached('cloudG', 260, 130, 130, 80, (c) => cloudShape(c, '#b9c3cf'));
  const cloudD = cached('cloudD', 260, 130, 130, 80, (c) => cloudShape(c, '#8f9aa8'));
  const lanternGlowPart = cached('fx:lantern92', 192, 192, 96, 96, (c) => {
    const rg = c.createRadialGradient(0, 0, 4, 0, 0, 92);
    rg.addColorStop(0, 'rgba(255,226,138,1)');
    rg.addColorStop(1, 'rgba(255,226,138,0)');
    c.fillStyle = rg;
    c.beginPath(); c.arc(0, 0, 92, 0, 6.3); c.fill();
  });
  let skyGradKey = '';
  let skyGradCache: CanvasGradient | null = null;

  function cloudShape(c: Ctx, col: string) {
    shape(c, [[-100, 30], [-110, 6], [-76, -8], [-60, -36], [-20, -42], [0, -24], [30, -46], [66, -30], [76, -4], [108, 4], [110, 30], [60, 38], [-20, 40]], { fill: col, hatch: 0.06, line: 3 });
  }

  const SEASON_GROUND_EDGE = ['#9ad85f', '#82d04d', '#d3b957', '#e9f1f6'] as const;
  function ensureActiveBG(sn: number) {
    if (bgSeason !== sn) {
      bgSeason = sn;
      const gCol = SEASON_GROUND_EDGE[sn] ?? '#8fd35a';
      bgEdge = { farm: gCol, north: gCol, valley: gCol, town: gCol, river: gCol, apiary: gCol, cave: '#1b2638', forest: '#2d5a34' };
    }
    bgActive = getSceneSource(UI.scene, sn);
  }

  return function renderView(v: FrameView) {
    const { dpr, cw, ch, sc, tx, ty, t, bph, trans, hoverPlot = -1 } = v;
    let activeSc = sc, activeTx = tx, activeTy = ty;
  function render() {
    const sn = season();
    ensureActiveBG(sn);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // آسمان (با کش هوشمند گرادیان جهت صرفه‌جویی باتری گوشی بدون کوچک‌ترین تغییر بصری)
    const renderHr = UI.started ? S.hour : 10.5;
    const skyH = Math.max(80, Math.round((ty + 230 * sc) * dpr));
    const gKey = `${Math.round(renderHr * 20)}:${S.weather}:${skyH}`;
    if (gKey !== skyGradKey || !skyGradCache) {
      const [c1, c2] = skyAt(renderHr);
      const wmix = S.weather === 0 ? 0 : S.weather === 1 ? 0.3 : 0.55;
      const g = ctx.createLinearGradient(0, 0, 0, skyH);
      g.addColorStop(0, wmix ? blend(c1, '#9aa6b4', wmix) : c1);
      g.addColorStop(1, wmix ? blend(c2, '#c4ccd6', wmix) : c2);
      skyGradKey = gKey;
      skyGradCache = g;
    }
    ctx.fillStyle = skyGradCache;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // نوار پایین قاب ادامهٔ زمینِ صحنه است (نه آسمان) — بدون خط قطع‌شدن در صفحه‌های بلند
    ctx.fillStyle = bgEdge[UI.scene] ?? '#8fd35a';
    ctx.fillRect(0, Math.round((ty + H * sc) * dpr), canvas.width, Math.max(0, canvas.height - Math.round((ty + H * sc) * dpr)) + 2);
    activeSc = sc; activeTx = tx; activeTy = ty;
    cinema.viewSc = sc; cinema.viewTx = tx; cinema.viewTy = ty; cinema.viewCw = cw; cinema.viewCh = ch;
    if (cinema.active) {
      const shkX = cinema.shake > 0 ? Math.sin(t * 47) * cinema.shake : 0;
      const shkY = cinema.shake > 0 ? Math.cos(t * 59) * cinema.shake * 0.7 : 0;
      const z = sc * cinema.zoom;
      const minCx = (tx + W * 0.5 * sc - OX * z) / z;
      const maxCx = (tx + W * 0.5 * sc + (BW - OX) * z - cw) / z;
      const minCy = (ty + H * 0.5 * sc - OY * z) / z;
      const maxCy = (ty + H * 0.5 * sc + (BH - OY) * z - ch) / z;
      if (minCx <= maxCx) cinema.camX = Math.max(minCx, Math.min(maxCx, cinema.camX));
      if (minCy <= maxCy) cinema.camY = Math.max(minCy, Math.min(maxCy, cinema.camY));
      const clX = minCx <= maxCx ? Math.max(minCx, Math.min(maxCx, cinema.camX + shkX)) : cinema.camX + shkX;
      const clY = minCy <= maxCy ? Math.max(minCy, Math.min(maxCy, cinema.camY + shkY)) : cinema.camY + shkY;
      activeSc = z;
      activeTx = tx + (W * 0.5 - clX * cinema.zoom) * sc;
      activeTy = ty + (H * 0.5 - clY * cinema.zoom) * sc;
      ctx.setTransform(activeSc * dpr, 0, 0, activeSc * dpr, activeTx * dpr, activeTy * dpr);
    } else {
      ctx.setTransform(sc * dpr, 0, 0, sc * dpr, tx * dpr, ty * dpr);
    }
    ctx.lineJoin = 'round';
    // خورشید و ماه و ستاره
    const hr = renderHr;
    if (hr >= 5.5 && hr <= 18.5) {
      const u = (hr - 5.5) / 13;
      const sx = -200 + u * 1680, sy = 200 - Math.sin(u * Math.PI) * 160;
      ctx.save(); ctx.globalAlpha = S.weather >= 2 ? 0.35 : 1; put(ctx, iconPart('sun'), sx, sy, 2.6); ctx.restore();
    }
    if (hr >= 18 || hr <= 6) {
      const h2 = hr < 12 ? hr + 24 : hr;
      const u = (h2 - 18) / 12;
      const mx = -200 + u * 1680, my = 200 - Math.sin(Math.max(0, Math.min(1, u)) * Math.PI) * 150;
      for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,255,220,${0.4 + 0.4 * Math.sin(t * 2 + i)})`; ctx.fillRect(-300 + ((i * 197) % 1900), (i * 53) % 150, 3, 3); }
      put(ctx, iconPart('moon'), mx, my, 2.2);
    }
    // ابرها
    const nc = S.weather === 0 ? 3 : 8;
    for (let i = 0; i < nc; i++) {
      const c = clouds[i];
      c.x += 0.016 * c.v * 0.6; if (c.x > 1750) c.x = -380;
      ctx.save(); ctx.globalAlpha = S.weather === 0 ? 0.92 : 0.96;
      put(ctx, S.weather === 2 ? cloudD : S.weather === 0 ? cloudW : cloudG, c.x, c.y, c.s);
      ctx.restore();
    }
    if (UI.scene === 'farm') renderFarm();
    else if (UI.scene === 'north') {
      renderEstateFieldScene(ctx, 'north', bgActive!, OX, OY, t, S.lv.land, S.gh, S.weather, S.northPlots, hoverPlot, farmer, workers, S.workers);
    } else if (UI.scene === 'valley') {
      renderEstateFieldScene(ctx, 'valley', bgActive!, OX, OY, t, S.lv.land, S.gh, S.weather, S.valleyPlots, hoverPlot, farmer, workers, S.workers);
    } else if (UI.scene === 'town') renderTown();
    else if (UI.scene === 'river') renderRiver();
    else if (UI.scene === 'cave' || UI.scene === 'forest') {
      renderFrontierScene(ctx, UI.scene, bgActive!, t, farmer, workers);
    }
    else renderApiary();
    // بازیگران و دکور صحنهٔ سینمایی پیش از باران/برف/شب رسم می‌شوند تا نورپردازی و هوا روی کاراکترها طبیعی بنشیند
    drawCinemaWorldExtras(ctx);
    // آب‌وهوای پیشرفته: باد (۱)، رگبار و دایره‌های چالهٔ آب (۲)، برف انباشته و کولاک نرم (۳) (P8-05)
    if (S.weather === 1 && !isReducedMotion()) {
      ctx.strokeStyle = 'rgba(255,255,255,.32)';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let w2 = 0; w2 < 8; w2++) {
        const wx = 1650 - ((t * 210 + w2 * 230) % 2100);
        const wy = 240 + (w2 * 57) % 410;
        ctx.moveTo(wx, wy);
        ctx.lineTo(wx - 74, wy + 7);
      }
      ctx.stroke();
    }
    if (S.weather === 2) {
      ctx.strokeStyle = 'rgba(130,195,245,.45)';
      ctx.lineWidth = 1.8;
      for (let p2 = 0; p2 < 7; p2++) {
        const px = 140 + p2 * 175, py = 612 + (p2 % 3) * 28;
        const rad = 6 + (((t * 22 + p2 * 9) % 18));
        ctx.beginPath(); ctx.ellipse(px, py, rad, rad * 0.38, 0, 0, 6.3); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(80,150,220,.65)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath();
      for (const d of rain) { d.y += 980 * d.s * 0.016; d.x -= 175 * d.s * 0.016; if (d.y > 940) { d.y = -260; d.x = rr() * 2200 - 460; } ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 7, d.y + 20); }
      ctx.stroke();
    }
    if (S.weather === 3) {
      ctx.fillStyle = 'rgba(250,253,255,.88)';
      ctx.beginPath();
      for (let s2 = 0; s2 < 9; s2++) {
        const sx = -80 + s2 * 185, sy = 696 + (s2 % 2) * 10;
        ctx.moveTo(sx + 128, sy);
        ctx.ellipse(sx, sy, 128, 22, 0, 0, 6.3);
      }
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      for (const f of flakes) {
        f.y += 70 * f.s * 0.016;
        f.x += Math.sin(t + f.p) * 0.5;
        if (f.y > 940) { f.y = -260; f.x = rr() * 2200 - 460; }
        const rad = 2.5 + f.s * 2;
        ctx.moveTo(f.x + rad, f.y);
        ctx.arc(f.x, f.y, rad, 0, 6.3);
      }
      ctx.fill();
    }
    // شب، هالهٔ گرم فانوس‌ها، پنجره‌های روشن و مه صبحگاهی (P8-04)
    const na = nightAlpha(renderHr) + (S.weather >= 2 ? 0.12 : 0);
    if (na > 0.01) { ctx.fillStyle = `rgba(14,20,72,${na})`; ctx.fillRect(-1600, -1600, 4800, 4400); }
    if (renderHr > 17 && renderHr < 20) { ctx.fillStyle = `rgba(255,130,50,${0.14 * Math.sin(((renderHr - 17) / 3) * Math.PI)})`; ctx.fillRect(-1600, -1600, 4800, 4400); }
    if (na > 0.22) {
      const lanternsMap: Record<string, [number, number][]> = {
        farm: [[190, 210], [1040, 175]], north: [[118, 192], [1204, 184]], valley: [[198, 372], [1204, 184]],
        town: [[150, 384], [550, 384], [1136, 616]], river: [[490, 496], [920, 496]], apiary: [[154, 298]],
      };
      const lanterns: [number, number][] = lanternsMap[UI.scene] ?? [[610, 320], [farmer.x, farmer.y - 36]];
      ctx.save(); ctx.globalAlpha = Math.min(1, 0.48 * na);
      for (const [lx, ly] of lanterns) put(ctx, lanternGlowPart, lx, ly, 1);
      ctx.restore();
      const panesMap: Record<string, [number, number, number, number][]> = {
        farm: [[109, 175, 36, 32], [233, 175, 36, 32]],
        north: [[109, 183, 18, 18], [1160, 178, 18, 20], [1230, 178, 18, 20]],
        valley: [[1160, 178, 18, 20], [1230, 178, 18, 20]],
        apiary: [[92, 286, 24, 24], [192, 286, 24, 24]],
        town: [...[150, 350, 550, 750, 950].flatMap((cx): [number, number, number, number][] => [[cx - 57, 353, 20, 22], [cx + 37, 353, 20, 22]]), [1093, 317, 20, 22], [1185, 317, 20, 22], [1093, 355, 20, 22], [1187, 355, 20, 22]],
      };
      const winPanes = panesMap[UI.scene] ?? [];
      if (winPanes.length) {
        ctx.fillStyle = `rgba(255,224,130,${Math.min(0.88, na * 1.2).toFixed(3)})`;
        ctx.strokeStyle = '#503426';
        ctx.lineWidth = 2.2;
        for (const [wx, wy, ww, wh] of winPanes) {
          ctx.fillRect(wx, wy, ww, wh);
          ctx.beginPath();
          ctx.moveTo(wx + ww * 0.5, wy); ctx.lineTo(wx + ww * 0.5, wy + wh);
          ctx.moveTo(wx, wy + wh * 0.5); ctx.lineTo(wx + ww, wy + wh * 0.5);
          ctx.stroke();
        }
      }
    }
    if (S.hour >= 5.2 && S.hour <= 7.8) {
      const mistA = 0.16 * Math.sin(((S.hour - 5.2) / 2.6) * Math.PI);
      ctx.fillStyle = `rgba(244,250,255,${mistA})`;
      for (let m = 0; m < 3; m++) {
        const mx = -260 + ((t * 14 + m * 540) % 1900);
        ctx.beginPath(); ctx.ellipse(mx, 280 + m * 95, 360, 44, 0, 0, 6.3); ctx.fill();
      }
    }
    // برچسب نام + شغل و علامت تعجب زرد اهالی در شهر بالای تاریکی شب تا در شب هم ۱۰۰٪ درخشان و خوانا بمانند
    if (UI.scene === 'town' && !cinema.active) {
      drawNpcOverheadInfo(ctx, 'jahangir', jahangir.x, jahangir.y, 0.8, t);
      const npcIds2 = ['grandma', 'sara', 'engineer', 'rancher'] as const;
      const npcScales2 = [0.71, 0.74, 0.79, 0.81];
      npcs.forEach((n, ni) => drawNpcOverheadInfo(ctx, npcIds2[ni % 4], n.x, n.y, npcScales2[ni % 4], t));
    }
    // افکت‌ها و پلاک‌های نام شخصیت‌ها در کات‌سین بالای نور شب
    drawCinemaForegroundUI(ctx);
    for (const f of fx) {
      const a = Math.max(0, Math.min(1, (f.life / f.max) * 2));
      ctx.save(); ctx.globalAlpha = a;
      if (f.icon) put(ctx, iconPart(f.icon), f.x, f.y, f.sc);
      else if (f.text) { ctx.font = '34px Lalezar, Vazirmatn, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 6; ctx.strokeStyle = '#503426'; ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.col ?? '#fff'; ctx.fillText(f.text, f.x, f.y); }
      else { ctx.fillStyle = f.col ?? '#fff'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r ?? 3, 0, 6.3); ctx.fill(); }
      ctx.restore();
    }
    // تاریکی انتقال
    const ov = trans ? Math.min(1, Math.sin(Math.min(1, trans.t / 0.62) * Math.PI) * 1.6) : 0;
    if (ov > 0.01) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = `rgba(32,22,52,${ov})`; ctx.fillRect(0, 0, cw, ch);
      ctx.globalAlpha = ov; ctx.setTransform(sc * dpr, 0, 0, sc * dpr, tx * dpr, ty * dpr);
      put(ctx, iconPart('cart'), W / 2, H / 2 + Math.sin(t * 8) * (trans ? 4 : 0), 3.2);
      ctx.globalAlpha = 1;
    }
    if (cinema.fadeAlpha > 0.01 || cinema.letterbox > 0.01) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (cinema.fadeAlpha > 0.01) {
        ctx.fillStyle = `rgba(26,18,14,${cinema.fadeAlpha})`;
        ctx.fillRect(0, 0, cw, ch);
      }
      if (cinema.letterbox > 0.01) {
        const bh = Math.round(ch * 0.095 * cinema.letterbox);
        ctx.fillStyle = 'rgba(28,18,14,0.94)';
        ctx.fillRect(0, 0, cw, bh);
        ctx.fillRect(0, ch - bh, cw, bh);
        ctx.fillStyle = '#d9a441';
        ctx.fillRect(0, Math.max(0, bh - 2), cw, 2);
        ctx.fillRect(0, ch - bh, cw, 2);
      }
    }
    weatherKey = S.weather;
  }
  void weatherKey;
  function blend(a: string, b: string, k: number) { return mix(rgbHex(a), b, k); }
  function rgbHex(c: string): string {
    if (c.startsWith('#')) return c;
    const m = c.match(/\d+/g)!.map(Number);
    return '#' + m.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');
  }

  type Dr = { y: number; f: () => void };
  // برش دقیق بخش قابل‌رؤیت بوم ۲۱۲۰×۱۱۲۰ به اندازهٔ نمای دوربین گوشی (حذف تا ۸۳٪ انتقال پیکسل‌های بیرون کادر به GPU با صفر تغییر بصری!)
  function blitVisibleBG() {
    const sx = Math.max(0, Math.floor(-activeTx / activeSc) + OX - 4);
    const sy = Math.max(0, Math.floor(-activeTy / activeSc) + OY - 4);
    const ex = Math.min(BW, Math.ceil((cw - activeTx) / activeSc) + OX + 4);
    const ey = Math.min(BH, Math.ceil((ch - activeTy) / activeSc) + OY + 4);
    const sw = ex - sx, sh = ey - sy;
    if (sw > 0 && sh > 0) ctx.drawImage(bgActive!, sx, sy, sw, sh, sx - OX, sy - OY, sw, sh);
  }
  const viewMinX = () => -activeTx / activeSc - 96;
  const viewMaxX = () => (cw - activeTx) / activeSc + 96;

  function renderFarm() {
    blitVisibleBG();
    const vx0 = viewMinX(), vx1 = viewMaxX();
    // نور گرم پنجره‌های خانه قبل از رسم هر کاراکتری کشیده می‌شود تا هرگز روی صورت هیچ شخصیتی نیفتد!
    if (nightAlpha(UI.started ? S.hour : 10.5) > 0.22) {
      ctx.fillStyle = 'rgba(255,220,120,.82)';
      for (const wx of [106, 232]) ctx.fillRect(wx + 2, 174, 36, 34);
    }
    drawFestivalDecor(ctx, 'farm', t);
    drawCourtyardDecor(ctx, t, nightAlpha(UI.started ? S.hour : 10.5));
    // زمین‌ها (لایهٔ یکپارچهٔ کش‌شده برای اجرای روان ۶۰ فریم روی گوشی‌های اقتصادی اندروید)
    drawFarmlandPlotsLayer(ctx, 'farm', FX, FY, COLS, ROWS, PLOT_DX, PLOT_DY, S.plots, true, (i) => isUnlocked(i, S.lv.land));
    // === گلخانه: سازهٔ شیشه‌ای و چوبی یکپارچه و شفاف روی ستون‌های پوشیده ===
    if (S.gh > 0) {
      let cMin = COLS, cMax = -1, rMax = -1;
      for (let i = 0; i < COLS * ROWS; i++) {
        if (!ghCovers(S.gh, i, COLS, ROWS, S.lv.land)) continue;
        const cIdx = i % COLS, rIdx = Math.floor(i / COLS);
        if (cIdx < cMin) cMin = cIdx;
        if (cIdx > cMax) cMax = cIdx;
        if (rIdx > rMax) rMax = rIdx;
      }
      if (cMax >= cMin && rMax >= 0) {
        drawGlasshouseSpan(ctx, FX, FY, cMin, cMax - cMin + 1, rMax + 1, PLOT_DX, PLOT_DY);
      }
    }
    drawFieldUpgradesAndHover(ctx, t, hoverPlot);
    // بخش‌های جداگانهٔ دام‌ها، بستر کاه جمع‌آوری یکجای تخم‌ها و آخور چوبی هم‌تراز علوفه
    if (vx0 <= 410) drawFarmZonesAndTrough(ctx, t, season());
    // نشانگر وظایف
    const mk2 = [...farmer.tasks, ...(farmer.cur ? [farmer.cur] : [])];
    const colr: Record<string, string> = { till: '#c8924e', plant: '#6cc84c', water: '#4aa3df', harvest: '#ffd93b', fert: '#b48aff' };
    for (const q of mk2) if (q.plot !== undefined) {
      const { cx, cy } = plotC(q.plot);
      ctx.save(); ctx.strokeStyle = colr[q.kind] ?? '#fff'; ctx.lineWidth = 4; ctx.setLineDash([8, 7]); ctx.lineDashOffset = -t * 20;
      ctx.beginPath(); ctx.ellipse(cx, cy + 2, 36, 28, 0, 0, 6.3); ctx.stroke(); ctx.restore();
    }
    drawWorldMachines(ctx, S.machines, S.auto, t);
    const list: Dr[] = [];
    // صندوق پست دست‌ساز مزرعه کنار مسیر ایوان خانه با پرچم سرخ هنگام وجود نامهٔ تازه (صفر هم‌پوشانی!)
    if (vx0 <= POSTBOX_GEOM.x + 50 && vx1 >= POSTBOX_GEOM.x - 50) {
      list.push({ y: POSTBOX_GEOM.y, f: () => drawWorldPostbox(ctx, unreadMailCount(), t) });
    }
    // === سیلوی خوراک کنار انبار سرخ (کاملاً پایین‌تر از HUD بدهی و بیرون از دروازهٔ شمالی) ===
    if (S.silo > 0) {
      list.push({ y: 230, f: () => drawCachedSilo(ctx, 910, 230, S.silo) });
    }
    // Full-body hand-drawn scarecrow cleanly in South-East corner below Valley signpost
    if (vx1 >= 1120) {
      list.push({ y: 628, f: () => drawFullScarecrow(ctx, 1196, 628, t, S.debt?.scarecrow ?? 0) });
    }
    for (let i = 0; i < COLS * ROWS; i++) {
      const p = S.plots[i];
      if (p.st !== 2 || !p.crop) continue;
      const { cx, cy } = plotC(i);
      if (cx < vx0 || cx > vx1) continue;
      list.push({
        y: cy + 16,
        f: () => {
          const stage = p.ripe ? 3 : p.prog < 0.2 ? 0 : p.prog < 0.55 ? 1 : 2;
          const part = cropPart(p.crop!, stage, p.dead);
          const sway = p.dead ? 0 : Math.sin(t * 1.6 + i) * (S.weather === 2 ? 0.05 : 0.022);
          put(ctx, part, cx, cy + 16, 0.72, sway);
          if (!p.dead && p.water < 0.05) put(ctx, iconPart('drop'), cx + 26, cy - 18 + Math.sin(t * 4 + i) * 2.2, 0.44);
          if (!p.dead && !p.ripe && isCropDormantNow(p.crop!, S.gh > 0 && ghCovers(S.gh, i, COLS, ROWS, S.lv.land))) {
            put(ctx, iconPart('lock'), cx - 26, cy - 18, 0.31);
          }
          if (p.ripe && !p.dead) {
            const scStar = (p.fert ?? 1) > 1.05 ? 0.4 + Math.sin(t * 5 + i) * 0.05 : 0.32 + Math.sin(t * 5 + i) * 0.04;
            put(ctx, iconPart('star'), cx + 27, cy - 19 + Math.sin(t * 3 + i) * 2, scStar);
          }
        },
      });
    }
    list.push({ y: farmer.y, f: () => drawFarmer(ctx, farmer.rig, farmer.x, farmer.y, farmer.face, 0.72) });
    workers.forEach((w, wi) => { if (wi < S.workers) list.push({ y: w.y, f: () => drawFarmer(ctx, w.rig, w.x, w.y, w.face, 0.72) }); });
    if (bph !== 'off') list.push({ y: builder.y, f: () => drawFarmer(ctx, builder.rig, builder.x, builder.y, builder.face, 0.72) });
    for (const a of animals.values()) {
      if (a.x < vx0 || a.x > vx1) continue;
      // دام‌ها بخشی از صحنهٔ زنده‌اند؛ حتی نزدیک دوربین سینمایی هم نباید ناپدید شوند.
      list.push({
        y: a.y,
        f: () => {
          const s = S.animals.find((q) => q.id === a.id);
          const scLive = liveAnimalScale(a.sc, s);
          drawAnimal(ctx, a.rig, a.x, a.y, a.face, scLive);
          drawAnimalStatusExtra(ctx, a.x, a.y, a.rig.h, scLive, t, a.seed, s);
          if (s && s.ready > 0 && !isPoultry(a.kind)) {
            // حباب ظریف و کوچک دقیقاً بالای شاخ/گوش دام تا ۱۰۰٪ صورت و چشمان حیوان همیشه آزاد و پیدا بماند!
            const by = a.y - a.rig.h * scLive - 11 + Math.sin(t * 3 + a.seed) * 1.8;
            shape(ctx, ell(a.x, by, 11.5, 10.5, 12), { fill: '#fffdf4', line: 2.1 });
            put(ctx, iconPart(ANIMALS[a.kind].prod), a.x, by, 0.34);
          }
          if (s && (s.preg ?? 0) > 0) {
            const hy = a.y - a.rig.h * scLive - 4 + Math.sin(t * 2.4 + a.seed) * 1.8;
            ctx.fillStyle = '#ff5d7a';
            ctx.beginPath(); ctx.arc(a.x - 3.5, hy - 3, 3.6, 0, 6.3); ctx.fill();
            ctx.beginPath(); ctx.arc(a.x + 3.5, hy - 3, 3.6, 0, 6.3); ctx.fill();
            shape(ctx, [[a.x - 7, hy - 2], [a.x + 7, hy - 2], [a.x, hy + 6]], { fill: '#ff5d7a', smooth: false, line: 0 });
          }
        },
      });
    }
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.f();
    // پلاک خوانای مقصد بالای هر ۵ تابلوی خروجی مزرعه
    drawSignPlaque(ctx, 1216, 344, WX.gateTown);
    drawSignPlaque(ctx, 696, 214, WX.gateNorth);
    drawSignPlaque(ctx, 1212, 464, WX.gateValley);
    drawSignPlaque(ctx, 60, 628, WX.gateRiver);
    drawSignPlaque(ctx, 316, 628, WX.gateApiary);
    // تابلوی جمع‌وجور پیشرفت ساخت‌وساز در حیاط باز بالای کرت‌ها (صفر تداخل با محصولات یا HUD!)
    const job0 = S.builds[0];
    if (job0 && (bph === 'work' || bph === 'walk')) {
      const bx = BSITE.x, by = 176;
      const w0 = Math.max(0, Math.min(1, job0.prog / job0.dur));
      shape(ctx, [[bx - 72, by + 20], [bx + 72, by + 20], [bx + 68, by - 22], [bx - 68, by - 22]], { fill: '#f5dfb0', line: 2.8, hatch: 0.1, jit: 1 });
      ctx.font = '700 16px Lalezar, Vazirmatn, sans-serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeStyle = '#fff6da'; ctx.strokeText(job0.label, bx, by - 5);
      ctx.fillStyle = '#503426'; ctx.fillText(job0.label, bx, by - 5);
      shape(ctx, ell(bx, by + 10, 56, 7, 10), { fill: '#fffdf4', line: 2 });
      if (w0 > 0.01) shape(ctx, [[bx - 52, by + 5], [bx - 52 + 104 * w0, by + 5], [bx - 52 + 104 * w0, by + 15], [bx - 52, by + 15]], { fill: '#6cc84c', smooth: false, line: 0 });
      ctx.font = '700 14px Lalezar, Vazirmatn, sans-serif';
      const pctTxt = faPct(Math.round(100 * w0));
      ctx.lineWidth = 3.2; ctx.strokeStyle = '#fff6da'; ctx.strokeText(pctTxt, bx, by + 14);
      ctx.fillStyle = '#2e7d32'; ctx.fillText(pctTxt, bx, by + 14);
      if (bph === 'work') put(ctx, iconPart('hammer'), bx + 72 + Math.sin(t * 9) * 2.5, by - 4 + Math.abs(Math.sin(t * 9)) * -6, 0.62);
    }
  }

  function renderRiver() {
    blitVisibleBG();
    drawUnifiedPond(ctx, t);
    const activeRods = Math.min(RIVER_SPOTS.length, S.workers);
    RIVER_SPOTS.forEach((sp, si) => {
      shape(ctx, ell(sp.x + 28, sp.y + 14 + Math.sin(t * 2 + sp.x) * 2, 26, 9.5, 12), { fill: 'rgba(255,255,255,.44)', line: 2 });
      if (si < activeRods) {
        ln(ctx, [[sp.x - 10, 444], [sp.x + 18, 382]], 3.4, '#8a5a34');
        ln(ctx, [[sp.x + 18, 382], [sp.x + 30, sp.y + 14]], 1.5, 'rgba(255,255,255,.82)');
      }
      put(ctx, iconPart('fish'), sp.x + 36, sp.y + 12 + Math.sin(t * 2.4 + sp.x) * 3.5, 0.46);
    });
    const list: Dr[] = [];
    list.push({ y: farmer.y, f: () => drawFarmer(ctx, farmer.rig, farmer.x, farmer.y, farmer.face, 0.75) });
    workers.forEach((w, wi) => { if (wi < S.workers) list.push({ y: w.y, f: () => drawFarmer(ctx, w.rig, w.x, w.y, w.face, 0.75) }); });
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.f();
    drawSignPlaque(ctx, 1212, 576, WX.gateFarm);
    drawSignPlaque(ctx, 96, 576, FT.gateCave);
    drawRiverCastGauge(ctx, farmer.x, farmer.y);
  }

  function renderApiary() {
    blitVisibleBG();
    for (let i = 0; i < HIVE_SLOTS.length; i++) {
      const sp = HIVE_SLOTS[i];
      if (!sp) break;
      if (i < S.hives) {
        put(ctx, iconPart('hive'), sp.x, sp.y, 1.18);
        for (let k = 0; k < 3; k++) {
          const a = t * (1.2 + k * 0.2) + k * 2.1 + i;
          put(ctx, iconPart('bee'), sp.x + Math.cos(a) * 34, sp.y - 24 + Math.sin(a * 1.7) * 16, 0.48);
        }
      } else {
        shape(ctx, [[sp.x - 22, sp.y + 16], [sp.x + 22, sp.y + 16], [sp.x + 18, sp.y + 7], [sp.x - 18, sp.y + 7]], { fill: '#cfa26a', smooth: false, line: 2 });
        if (i === 0) put(ctx, iconPart('hive'), sp.x, sp.y - 5, 0.68);
      }
    }
    if (S.hives > 0 && S.honeyAcc >= 1) {
      const sp = HIVE_SLOTS[Math.min(S.hives, HIVE_SLOTS.length) - 1];
      put(ctx, iconPart('honey'), sp.x + 42, sp.y - 38 + Math.sin(t * 3) * 2.5, 0.72);
    }
    const list: Dr[] = [];
    list.push({ y: farmer.y, f: () => drawFarmer(ctx, farmer.rig, farmer.x, farmer.y, farmer.face, 0.74) });
    workers.forEach((w, wi) => { if (wi < S.workers) list.push({ y: w.y, f: () => drawFarmer(ctx, w.rig, w.x, w.y, w.face, 0.74) }); });
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.f();
    drawSignPlaque(ctx, 1218, 626, WX.gateFarm);
    drawSignPlaque(ctx, 84, 626, FT.gateForest);
  }

  function renderTown() {
    blitVisibleBG();
    drawFestivalDecor(ctx, 'town', t);
    drawTownWorldExpansions(ctx, t);
    const nAlpha = nightAlpha(UI.started ? S.hour : 10.5);
    if (nAlpha > 0.22) {
      ctx.fillStyle = 'rgba(255,222,130,.82)';
      ctx.fillRect(1174, 614, 20, 18);
      const townWins: [number, number][] = [];
      for (const sx of [150, 350, 550, 750, 950]) townWins.push([sx - 58, 352], [sx + 36, 352]);
      townWins.push([1092, 354], [1186, 354], [1092, 300], [1138, 300], [1184, 300]);
      for (const [wx, wy] of townWins) {
        ctx.fillRect(wx + 2, wy + 2, 18, 20);
        ln(ctx, [[wx + 11, wy], [wx + 11, wy + 24]], 2);
        ln(ctx, [[wx, wy + 12], [wx + 22, wy + 12]], 2);
      }
      // فانوس گرم ورودی جادهٔ مزرعه در شب
      ln(ctx, [[122, 548], [122, 504]], 3, '#4a3525');
      circSafe(ctx, 122, 500, 6.5, '#ffe082');
    }
    if (S.story.postgame) {
      // تندیس طلایی یادبود جهانگیر و مزرعه‌دار در میدان باز شهر (کاملاً بالای پلاک‌های اهالی و زیر مغازه‌ها!)
      const gx = 892, gy = 452;
      shape(ctx, [[gx - 18, gy], [gx + 18, gy], [gx + 15, gy - 11], [gx - 15, gy - 11]], { fill: '#b6b0a6', smooth: false, line: 2.4 });
      shape(ctx, [[gx - 8, gy - 11], [gx + 8, gy - 11], [gx + 7, gy - 36], [gx - 8, gy - 36]], { fill: '#ffd93b', smooth: false, line: 2.2 });
      circSafe(ctx, gx, gy - 44, 7, '#ffd93b');
      put(ctx, iconPart('medal'), gx, gy - 60 + Math.sin(t * 2) * 2, 0.38);
    }
    if (!cinema.active) poseFarmer(jahangir.rig, { mode: 'idle', ph: t * 0.8, t, kind: '', p: 0 });
    const list: Dr[] = [];
    list.push({ y: farmer.y, f: () => drawFarmer(ctx, farmer.rig, farmer.x, farmer.y, farmer.face, 0.76) });
    if (!cinema.active || isActorStagedInScene('jahangir')) {
      list.push({ y: jahangir.y, f: () => drawFarmer(ctx, jahangir.rig, jahangir.x, jahangir.y, jahangir.face, 0.78) });
    }
    const npcIds = ['grandma', 'sara', 'engineer', 'rancher'] as const;
    const npcScales = [0.71, 0.74, 0.78, 0.79];
    npcs.forEach((n, ni) => {
      const role = npcIds[ni % 4];
      if (cinema.active && !isActorStagedInScene(role)) return;
      list.push({ y: n.y, f: () => drawFarmer(ctx, n.rig, n.x, n.y, n.face, npcScales[ni % 4]) });
    });
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.f();
    drawSignPlaque(ctx, 68, 608, WX.gateFarm);
  }

    render();
  };
}
