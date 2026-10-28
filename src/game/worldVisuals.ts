// Hand-drawn world overlays: Courtyard Decor & Pets, Live Festival Bunting, Dormant Crop Badge & River Cast Gauge
import { INK, cached, circ, ell, iconPart, ln, oval, put, shape, type Ctx } from './art';
import { S, season } from './state';
import { CROP } from './data';

const courtyardLanternGlow = () => cached('fx:courtyard-lantern', 56, 56, 28, 28, (gCtx) => {
  const rg = gCtx.createRadialGradient(0, 0, 2, 0, 0, 24);
  rg.addColorStop(0, 'rgba(255,214,102,1)');
  rg.addColorStop(1, 'rgba(255,214,102,0)');
  gCtx.fillStyle = rg;
  gCtx.beginPath(); gCtx.arc(0, 0, 24, 0, 6.3); gCtx.fill();
});

export const fishCast = {
  active: false,
  armed: false,
  spotX: 0,
  t: 0,
  streak: 0,
};

export function castPrecisionNow(): number {
  // Oscillates smoothly 0 -> 1 -> 0; center of sweet spot is around 0.50
  const pos = 0.5 + 0.5 * Math.sin(fishCast.t * 5.2);
  return Math.max(0, 1 - Math.abs(pos - 0.5) * 2.4);
}

export function castMarkerPos(): number {
  return 0.5 + 0.5 * Math.sin(fishCast.t * 5.2);
}

export function drawRiverCastGauge(ctx: Ctx, x: number, y: number) {
  if (!fishCast.active && !fishCast.armed) return;
  const wx = fishCast.spotX || x;
  const wy = 392;
  // موج‌های زندهٔ آب و سایهٔ ماهی زیر قلاب در رودخانه
  ctx.save();
  const rip = 10 + ((fishCast.t * 28) % 24);
  ctx.strokeStyle = 'rgba(255,255,255,0.72)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(wx, wy, rip, rip * 0.42, 0, 0, 6.3); ctx.stroke();
  const swimX = wx + Math.cos(fishCast.t * 3.8) * 18;
  const swimY = wy + Math.sin(fishCast.t * 3.8) * 6;
  oval(ctx, swimX, swimY, 10, 4.5, 'rgba(24,58,86,0.55)', Math.sin(fishCast.t * 3.8) * 0.35, 0);
  if (fishCast.active) circ(ctx, wx, wy - Math.abs(Math.sin(fishCast.t * 7)) * 4, 4.5, '#ef4444', 1.8);
  ctx.restore();

  if (!fishCast.active) return;
  const gx = x, gy = y - 108, w = 114, h = 15;
  ctx.save();
  shape(ctx, [[gx - w / 2 - 4, gy - h / 2 - 4], [gx + w / 2 + 4, gy - h / 2 - 4], [gx + w / 2 + 4, gy + h / 2 + 4], [gx - w / 2 - 4, gy + h / 2 + 4]], {
    fill: '#3c2618', smooth: false, line: 2.6,
  });
  ctx.fillStyle = '#d97736';
  ctx.fillRect(gx - w / 2, gy - h / 2, w, h);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(gx - w * 0.27, gy - h / 2, w * 0.54, h);
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(gx - w * 0.12, gy - h / 2, w * 0.24, h);
  const nx = gx - w / 2 + castMarkerPos() * w;
  ln(ctx, [[nx, gy - h / 2 - 6], [nx, gy + h / 2 + 6]], 4.4, '#ffffff');
  ln(ctx, [[nx, gy - h / 2 - 5], [nx, gy + h / 2 + 5]], 2.2, INK);
  ctx.restore();
}

export function drawCourtyardDecor(ctx: Ctx, t: number, nightA: number) {
  const D = S.decor ?? {};
  // 1) Turquoise Persian Tile Pool in sunny front courtyard (clean gap between house, well & sheep pen)
  if (D.tilepool) {
    const px = 318, py = 252;
    shape(ctx, ell(px, py, 19, 8.5, 14), { fill: '#1d9bf0', line: 2.6 });
    shape(ctx, ell(px, py, 22, 10.5, 14), { fill: 'rgba(29,155,240,0.18)', line: 2 });
    const jet = 6 + Math.sin(t * 5) * 2;
    ln(ctx, [[px, py - 2], [px, py - 2 - jet]], 2.4, '#e0f7ff');
    circ(ctx, px, py - 3.5 - jet, 2.2, '#ffffff', 1);
  }
  // 2) Wooden Resting Pergola on open west lawn beside farmhouse (zero tree or chicken-coop overlap)
  if (D.pergola) {
    const gx = 46, gy = 246;
    ln(ctx, [[gx - 18, gy], [gx - 18, gy - 42]], 3.2, '#7a4b2a');
    ln(ctx, [[gx + 18, gy], [gx + 18, gy - 42]], 3.2, '#7a4b2a');
    shape(ctx, [[gx - 23, gy - 42], [gx + 23, gy - 42], [gx + 20, gy - 50], [gx - 20, gy - 50]], {
      fill: '#9c6639', smooth: false, line: 2.2,
    });
    for (const vx of [-13, 0, 13]) oval(ctx, gx + vx, gy - 41, 6.5, 3.8, '#4da83b', 0.2, 1.6);
  }
  // 3) Glowing Garden Lanterns flanking porch & field gates (never over windows, cat, or road signs)
  if (D.lanterns) {
    const glow = courtyardLanternGlow();
    for (const [lx, ly] of [[80, 248], [414, 242], [1142, 242]] as const) {
      ln(ctx, [[lx, ly], [lx, ly - 28]], 2.8, '#4a3525');
      if (nightA > 0.14) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, 0.24 + nightA * 0.42);
        put(ctx, glow, lx, ly - 32, 0.9);
        ctx.restore();
      }
      circ(ctx, lx, ly - 32, 5.8, '#ffe082', 2);
    }
  }
  // 4) Purring Tabby Barn Cat on sunny porch doorstep
  if (D.barncat) {
    const cx = 188 + Math.sin(t * 0.7) * 5, cy = 256;
    ctx.save();
    oval(ctx, cx, cy - 6, 10, 6.5, '#e09f5a', 0, 2);
    circ(ctx, cx + 9, cy - 11, 5.6, '#e09f5a', 2);
    shape(ctx, [[cx + 5, cy - 15], [cx + 7, cy - 20], [cx + 10, cy - 15]], { fill: '#c97b38', smooth: false, line: 1.6 });
    shape(ctx, [[cx + 10, cy - 15], [cx + 12, cy - 20], [cx + 15, cy - 15]], { fill: '#c97b38', smooth: false, line: 1.6 });
    ln(ctx, [[cx - 9, cy - 7], [cx - 16, cy - 13 + Math.sin(t * 3.2) * 2.5]], 2.4, '#c97b38');
    ctx.restore();
  }
  // 5) Loyal Sheepdog guarding barn forecourt (cleanly beside barn, above field kerb)
  if (D.sheepdog) {
    const dx = 944 + Math.sin(t * 0.9) * 8, dy = 236;
    ctx.save();
    oval(ctx, dx, dy - 10, 14, 8.2, '#d8c3a5', 0, 2.2);
    circ(ctx, dx - 12, dy - 16, 6.8, '#c4a482', 2.2);
    oval(ctx, dx - 17, dy - 14, 3.8, 2.8, '#6b4f3a', 0, 1.6);
    for (const lx2 of [-8, -3, 4, 9]) ln(ctx, [[dx + lx2, dy - 4], [dx + lx2, dy + 2]], 2.4, '#8a6d52');
    ln(ctx, [[dx + 13, dy - 12], [dx + 20, dy - 19 + Math.sin(t * 5.5) * 3]], 2.6, '#c4a482');
    ctx.restore();
  }
}

export function drawFestivalDecor(ctx: Ctx, scene: 'farm' | 'town', t: number) {
  const sn = season();
  const dayInSeason = ((Math.max(1, S.day) - 1) % 28) + 1;
  const isSpringFest = sn === 0 && dayInSeason <= 6;
  const isYaldaFest = sn === 3 && dayInSeason >= 23;
  if (!isSpringFest && !isYaldaFest) return;

  const spanX0 = scene === 'town' ? 92 : 84;
  const spanX1 = scene === 'town' ? 1208 : 296;
  const baseY = scene === 'town' ? 284 : 156;
  const cols = isSpringFest
    ? ['#ff6b6b', '#ffd93b', '#4ecdc4', '#a66cff']
    : ['#d90429', '#ffb703', '#fb8500', '#e63946'];

  ctx.save();
  const steps = scene === 'town' ? 18 : 7;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = spanX0 + (spanX1 - spanX0) * u;
    const sag = Math.sin(u * Math.PI) * (scene === 'town' ? 11 : 6) + Math.sin(t * 2 + i) * 1.2;
    pts.push([x, baseY + sag]);
  }
  ln(ctx, pts, 2.2, '#503426');
  for (let i = 0; i < steps; i++) {
    const [x, y] = pts[i];
    const w = 11;
    shape(ctx, [[x + 2, y], [x + w, y + 1], [x + w * 0.55, y + 13]], {
      fill: cols[i % cols.length], smooth: false, line: 1.6,
    });
  }
  if (isYaldaFest && scene === 'town') {
    put(ctx, iconPart('pomegranate'), 506, 422 + Math.sin(t * 2.2) * 2, 0.62);
  }
  ctx.restore();
}

export function isCropDormantNow(cropId: string, inGh: boolean): boolean {
  const def = CROP[cropId as keyof typeof CROP];
  if (!def || inGh || def.regrow) return false;
  return !def.seasons.includes(season());
}
