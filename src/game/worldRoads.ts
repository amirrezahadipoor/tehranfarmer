// Hand-drawn Architecture: Farmland Terrace & Cached Soil Layer, Gate Plaques, Mountain Arch, Glasshouse & Stands
import { box, cached, circ, ell, ln, oval, put, shape, soilTile, type Ctx } from './art';
import { worldLabelBoost } from './labelScale';

export interface SoilPlotView {
  st: number;
  fert: number;
  water: number;
}

interface CachedSoilLayer {
  sig: string;
  cv: HTMLCanvasElement;
}

const soilLayers: Record<string, CachedSoilLayer> = {};

/** Draws the permanent hand-crafted earthen terrace, garden footpaths & weathered oak timber kerb around a farm field */
export function drawFarmlandBed(
  c: Ctx,
  fx: number,
  fy: number,
  cols: number,
  rows: number,
  dx: number,
  dy: number,
  season: number,
) {
  const w = cols * dx;
  const h = rows * dy;
  const pad = 9;
  const x0 = fx - pad, y0 = fy - pad, bw = w + pad * 2, bh = h + pad * 2;
  c.save();

  // Soft outer ambient shadow grounding the raised terrace onto the meadow
  c.fillStyle = 'rgba(42,26,10,0.16)';
  c.beginPath();
  c.roundRect(x0 - 4, y0 - 2, bw + 8, bh + 8, 16);
  c.fill();

  // Warm compacted-earth courtyard bed underneath all plots
  c.fillStyle = season === 3 ? '#cdc5b8' : season === 2 ? '#ae8754' : '#b79260';
  c.beginPath();
  c.roundRect(x0, y0, bw, bh, 13);
  c.fill();

  // Subtle trodden footpaths between rows & columns so plots read as neat raised beds
  c.strokeStyle = 'rgba(78,50,24,0.18)';
  c.lineWidth = 2;
  c.beginPath();
  for (let col = 1; col < cols; col++) {
    const gx = fx + col * dx;
    c.moveTo(gx, fy + 2); c.lineTo(gx, fy + h - 2);
  }
  for (let row = 1; row < rows; row++) {
    const gy = fy + row * dy;
    c.moveTo(fx + 2, gy); c.lineTo(fx + w - 2, gy);
  }
  c.stroke();

  // Weathered oak timber kerb with inviting West & East open farm thresholds
  const gateMidY = fy + h * 0.5;
  const gateHalf = 36;
  const beam = (ax: number, ay: number, bx: number, by: number) => {
    ln(c, [[ax, ay], [bx, by]], 10.5, '#4b2e19');
    ln(c, [[ax, ay], [bx, by]], 6.4, '#9e6a36');
    ln(c, [[ax, ay - 1.3], [bx, by - 1.3]], 2, '#c89358');
    if (season === 3 && Math.abs(ay - by) < 2) {
      ln(c, [[ax + 4, ay - 3.2], [bx - 4, by - 3.2]], 2.6, 'rgba(255,255,255,0.88)');
    }
  };
  // Top & Bottom continuous oak beams
  beam(x0 + 4, y0, x0 + bw - 4, y0);
  beam(x0 + 4, y0 + bh, x0 + bw - 4, y0 + bh);
  // Left & Right beams split cleanly by open farm entry gateways
  beam(x0, y0 + 4, x0, gateMidY - gateHalf);
  beam(x0, gateMidY + gateHalf, x0, y0 + bh - 4);
  beam(x0 + bw, y0 + 4, x0 + bw, gateMidY - gateHalf);
  beam(x0 + bw, gateMidY + gateHalf, x0 + bw, y0 + bh - 4);

  // Corner & gateway oak posts with iron pegs
  const posts: Array<[number, number]> = [
    [x0, y0], [x0 + bw, y0], [x0, y0 + bh], [x0 + bw, y0 + bh],
    [x0, gateMidY - gateHalf], [x0, gateMidY + gateHalf],
    [x0 + bw, gateMidY - gateHalf], [x0 + bw, gateMidY + gateHalf],
  ];
  for (const [px, py] of posts) {
    circ(c, px, py, 6.4, '#8a5828', 2.4);
    circ(c, px, py - 0.8, 2.1, '#4b2e19', 0);
  }

  // Tiny stones & meadow grass tufts hugging the outer timber edge
  for (let k = 0; k < cols; k += 2) {
    const sx = fx + k * dx + 22;
    oval(c, sx, y0 + bh + 6, 4.5, 2.3, '#bfb29c', 0.1, 1.4);
    if (season !== 3) {
      const grassCol = season === 2 ? '#9d7c2f' : '#4da53b';
      ln(c, [[sx + 28, y0 - 4], [sx + 25, y0 - 11]], 2, grassCol);
      ln(c, [[sx + 29, y0 - 4], [sx + 32, y0 - 10]], 2, grassCol);
    }
  }
  c.restore();
}

/** Single-blit dirty-flagged plot grid layer: blits 40–60 rich sculpted plots in ONE drawImage call per frame */
export function drawFarmlandPlotsLayer(
  ctx: Ctx,
  key: string,
  fx: number,
  fy: number,
  cols: number,
  rows: number,
  dx: number,
  dy: number,
  plots: ReadonlyArray<SoilPlotView>,
  owned: boolean,
  isPlotOpen?: (idx: number) => boolean,
) {
  const total = cols * rows;
  let sig = owned ? '1|' : '0|';
  for (let i = 0; i < total; i++) {
    const p = plots[i];
    const open = owned && (!isPlotOpen || isPlotOpen(i));
    if (!open || !p) {
      sig += 'w';
    } else {
      const fb = p.fert < 0.35 ? 0 : p.fert < 0.7 ? 1 : 2;
      const wb = p.st > 0 && p.water > 0.3 ? 1 : 0;
      sig += `${p.st > 0 ? 't' : 'r'}${fb}${wb}`;
    }
  }

  const w = cols * dx;
  const h = rows * dy;
  let entry = soilLayers[key];
  if (!entry || entry.cv.width !== w || entry.cv.height !== h) {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    entry = { sig: '', cv };
    soilLayers[key] = entry;
  }
  if (entry.sig !== sig) {
    const lc = (entry.cv.getContext('2d', { willReadFrequently: true }) ?? entry.cv.getContext('2d'));
    if (lc) {
      lc.clearRect(0, 0, w, h);
      for (let i = 0; i < total; i++) {
        const p = plots[i];
        const open = owned && (!isPlotOpen || isPlotOpen(i));
        const x0 = (i % cols) * dx;
        const y0 = Math.floor(i / cols) * dy;
        const part = !open || !p
          ? soilTile('wild', 1, false, i, dx, dy)
          : soilTile(p.st === 0 ? 'raw' : 'tilled', p.fert, p.st > 0 && p.water > 0.3, i, dx, dy);
        put(lc, part, x0, y0);
      }
      entry.sig = sig;
    }
  }
  ctx.drawImage(entry.cv, fx, fy);
}

/** Draws a pre-cached hand-drawn parchment destination plaque right above a signpost (0 per-frame HarfBuzz text shaping!) */
export function drawSignPlaque(ctx: Ctx, x: number, postBaseY: number, label: string) {
  ctx.save();
  ctx.font = '700 15px Vazirmatn, sans-serif';
  const rawW = Math.ceil(ctx.measureText(label).width);
  ctx.restore();
  const tw = Math.max(62, rawW + 26);
  const bw = tw + 14;
  const sp = cached(`sign-plaque:${label}:${bw}`, bw, 36, bw * 0.5, 18, (c) => {
    c.font = '700 15px Vazirmatn, sans-serif';
    const hw = tw * 0.5;
    shape(c, [
      [-hw, -12], [hw, -12], [hw + 2, 11], [-hw - 2, 11],
    ], { fill: '#fff8e2', smooth: false, line: 2.3, jit: 0.7 });
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#472a18';
    c.fillText(label, 0, 0);
  });
  // در landscapeِ 800×360 مقدار 15px با scaleِ دوربین به 7.5px می‌رسید؛ پلاک را فقط روی موبایل بزرگ کن.
  const boost = worldLabelBoost();
  const halfW = (bw * boost) / 2;
  // متن‌های بلندِ غار/جنگل پس از بزرگ‌نمایی از لبهٔ راست بیرون می‌زدند؛ مرکز را داخل دنیا نگه دار.
  const safeX = boost > 1 ? Math.max(halfW + 8, Math.min(1280 - halfW - 8, x)) : x;
  put(ctx, sp, safeX, postBaseY - 122, boost);
}

/** Scenic stone-and-timber country arch framing the Northern Meadow pass on Main Farm */
export function drawMountainPassArch(c: Ctx, cx: number, baseY: number) {
  c.save();
  c.fillStyle = 'rgba(40,30,10,.16)';
  c.beginPath(); c.ellipse(cx - 34, baseY + 2, 14, 5, 0, 0, 6.3); c.fill();
  c.beginPath(); c.ellipse(cx + 34, baseY + 2, 14, 5, 0, 0, 6.3); c.fill();
  for (const sx of [cx - 34, cx + 34]) {
    shape(c, box(sx - 9, baseY - 58, 18, 58), { fill: '#c6b69f', smooth: false, hatch: 0.14, line: 2.5, jit: 1.2 });
    shape(c, box(sx - 11, baseY - 62, 22, 6), { fill: '#8a5a28', smooth: false, line: 2.2 });
  }
  shape(c, [
    [cx - 46, baseY - 62], [cx, baseY - 78], [cx + 46, baseY - 62],
    [cx + 42, baseY - 54], [cx, baseY - 68], [cx - 42, baseY - 54],
  ], { fill: '#a8742a', smooth: false, hatch: 0.14, line: 2.5 });
  circ(c, cx, baseY - 68, 5.5, '#ffd93b', 2);
  c.restore();
}

/** Gravel-and-timber parking bay for heavy farm machines (Tractor, Seeder, Harvester) cleanly above plots */
export function drawMachineryPad(c: Ctx, x0: number, y0: number, w: number, h: number) {
  shape(c, [
    [x0, y0], [x0 + w, y0], [x0 + w + 6, y0 + h], [x0 - 6, y0 + h],
  ], { fill: '#d8ceb9', smooth: false, hatch: 0.12, line: 2.2, jit: 1.4 });
  ln(c, [[x0 + 4, y0 + 2], [x0 + w - 4, y0 + 2]], 3, '#8a5a28');
}

/** Cohesive, pre-cached timber & glass greenhouse structure spanning covered plot columns (1 blit/frame, 0 vector churn!) */
export function drawGlasshouseSpan(
  ctx: Ctx,
  fx: number,
  fy: number,
  colStart: number,
  colCount: number,
  rowCount: number,
  dx: number,
  dy: number,
) {
  const w = colCount * dx + 20;
  const h = rowCount * dy + 42;
  const sp = cached(`gh-span:${colCount}:${rowCount}:${dx}:${dy}`, w, h, 10, 32, (gc) => {
    const x0 = 0;
    const x1 = colCount * dx + 4;
    const y0 = 0;
    const y1 = rowCount * dy + 14;
    const midX = (x0 + x1) * 0.5;
    gc.globalAlpha = 0.17;
    gc.fillStyle = '#c8eeff';
    gc.beginPath();
    gc.roundRect(x0, y0, x1 - x0, y1 - y0, 14);
    gc.fill();
    gc.globalAlpha = 1;

    shape(gc, [
      [x0 - 4, y0 + 4], [midX, y0 - 16], [x1 + 4, y0 + 4], [x0 - 4, y0 + 4],
    ], { fill: 'rgba(195,236,255,0.45)', smooth: false, line: 2.6, jit: 0.8 });

    gc.strokeStyle = '#5c8aa6';
    gc.lineWidth = 3.2;
    gc.beginPath();
    gc.roundRect(x0, y0, x1 - x0, y1 - y0, 14);
    gc.stroke();

    gc.strokeStyle = 'rgba(110,168,200,0.62)';
    gc.lineWidth = 1.8;
    for (let c = 1; c < colCount; c++) {
      const rx = 2 + c * dx;
      gc.beginPath(); gc.moveTo(rx, y0); gc.lineTo(rx, y1); gc.stroke();
    }
    for (let r = 1; r < rowCount; r++) {
      const ry = 12 + r * dy;
      gc.beginPath(); gc.moveTo(x0, ry); gc.lineTo(x1, ry); gc.stroke();
    }
    for (let r = 0; r < rowCount; r++) {
      const gx = x0 + 16 + (r % 2) * 38;
      const gy = 12 + r * dy + 12;
      ln(gc, [[gx, gy + 14], [gx + 16, gy]], 2.2, 'rgba(255,255,255,0.68)');
    }
    for (const px of [x0 + 2, x1 - 2]) {
      ln(gc, [[px, y1 - 2], [px, y0 + 2]], 4.2, '#8a5a28');
    }
  });
  put(ctx, sp, fx + colStart * dx - 2, fy - 12, 1);
}

/** Straight hand-drawn timber beehive stands with support posts directly under all 12 Apiary hive slots */
export function drawApiaryBenches(c: Ctx) {
  const rows: Array<[number, number, number]> = [
    [276, 1112, 344],
    [314, 1150, 456],
  ];
  for (const [x0, x1, y] of rows) {
    c.fillStyle = 'rgba(40,30,10,.15)';
    c.beginPath(); c.ellipse((x0 + x1) * 0.5, y + 22, (x1 - x0) * 0.51, 8, 0, 0, 6.3); c.fill();
    for (let px = x0 + 26; px <= x1 - 20; px += 176) {
      shape(c, box(px - 5, y + 6, 10, 16), { fill: '#8a5a28', smooth: false, line: 2.2 });
    }
    shape(c, [[x0, y - 4], [x1, y - 4], [x1 + 4, y + 8], [x0 - 4, y + 8]], {
      fill: '#c8924e', smooth: false, hatch: 0.14, line: 2.8, jit: 1.2,
    });
  }
}

/** Natural multi-tiered mountain stone waterfall & mossy spring pool for Sunlit Valley */
export function drawValleyWaterfall(c: Ctx) {
  shape(c, [
    [22, 278], [32, 198], [52, 134], [96, 114], [148, 118], [178, 176], [190, 278],
  ], { fill: '#9f9181', smooth: false, hatch: 0.18, line: 2.8, jit: 2.2 });
  shape(c, [[42, 206], [84, 194], [164, 198], [176, 276], [34, 276]], {
    fill: '#8d7f70', smooth: false, hatch: 0.14, line: 2.2, jit: 1.8,
  });
  shape(c, [[84, 118], [134, 118], [146, 196], [76, 196]], { fill: '#63caf7', smooth: false, line: 2.4 });
  shape(c, [[72, 196], [150, 196], [160, 278], [64, 278]], { fill: '#4dbaf0', smooth: false, line: 2.4 });
  for (const x of [92, 110, 128]) {
    ln(c, [[x, 126], [x + 2, 190]], 2.4, 'rgba(255,255,255,.82)');
    ln(c, [[x - 4, 204], [x + 3, 270]], 2.6, 'rgba(255,255,255,.82)');
  }
  shape(c, ell(112, 196, 42, 7, 12), { fill: '#e6f8ff', line: 1.8 });
  shape(c, ell(112, 284, 68, 19, 16), { fill: '#369cd9', line: 3.2 });
  shape(c, ell(112, 281, 34, 8, 12), { fill: 'rgba(232,250,255,0.65)', line: 0 });
  shape(c, ell(44, 278, 16, 10, 10), { fill: '#8b8378', line: 2.2 });
  shape(c, ell(180, 280, 15, 9, 10), { fill: '#8b8378', line: 2.2 });
}
