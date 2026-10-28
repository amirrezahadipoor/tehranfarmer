// Hand-sculpted Farmland Soil Tiles (Raw Pasture / Dry Terra-Cotta Plow Furrows / Dark Watered Humus / Wild)
import { cached, dot, ln, oval, rng, type Ctx, type Part, type Pt } from './art';

export const TW = 86;
export const TH = 64;

function rrectPath(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

export function soilTile(kind: 'raw' | 'tilled' | 'wild', fert: number, wet: boolean, variant: number, cw = TW, ch = TH): Part {
  const f = fert < 0.35 ? 0 : fert < 0.7 ? 1 : 2;
  const v = ((variant % 4) + 4) % 4;
  return cached(`soil3:${kind}:${f}:${wet ? 1 : 0}:${v}:${cw}x${ch}`, cw, ch, 0, 0, (c) => {
    const r = rng(v * 37 + 11);
    const pad = 3, x = pad, y = pad, w = cw - pad * 2, h = ch - pad * 2, rad = 8;
    if (kind === 'wild') {
      rrectPath(c, x + 1, y + 1, w - 2, h - 2, rad);
      c.fillStyle = 'rgba(255,255,255,0.08)'; c.fill();
      c.strokeStyle = 'rgba(78,96,46,0.24)'; c.lineWidth = 1.5; c.setLineDash([5, 4]); c.stroke(); c.setLineDash([]);
      for (let i = 0; i < 3; i++) {
        const gx = x + 12 + r() * (w - 24), gy = y + 14 + r() * (h - 22);
        ln(c, [[gx - 3, gy], [gx - 4, gy - 7]], 2, 'rgba(68,138,54,0.65)');
        ln(c, [[gx, gy], [gx + 2, gy - 8]], 2, 'rgba(84,158,62,0.65)');
      }
      return;
    }

    c.fillStyle = 'rgba(48,28,10,0.20)';
    rrectPath(c, x + 1, y + 2.2, w, h, rad); c.fill();

    if (kind === 'raw') {
      const base = f === 2 ? '#c8a16b' : f === 0 ? '#dab988' : '#d2ae79';
      c.fillStyle = base;
      rrectPath(c, x, y, w, h, rad); c.fill();
      c.strokeStyle = 'rgba(255,246,224,0.48)'; c.lineWidth = 2;
      rrectPath(c, x + 1.5, y + 1.5, w - 3, h - 3, rad - 1.5); c.stroke();
      c.strokeStyle = 'rgba(106,70,38,0.62)'; c.lineWidth = 1.7;
      rrectPath(c, x, y, w, h, rad); c.stroke();
      for (let i = 0; i < 5; i++) {
        const px = x + 10 + r() * (w - 20), py = y + 10 + r() * (h - 20);
        oval(c, px, py, 2.8, 1.6, i % 2 ? '#b78e58' : '#e5c899', 0, 0);
      }
      for (let i = 0; i < 2; i++) {
        const gx = x + 15 + r() * (w - 30), gy = y + 15 + r() * (h - 24);
        ln(c, [[gx, gy], [gx - 2.4, gy - 5.6]], 1.8, '#6cae44');
        ln(c, [[gx, gy], [gx + 2.4, gy - 5.2]], 1.8, '#5d9e39');
      }
      return;
    }

    // Sculpted 3D plow beds: warm golden terra-cotta when dry vs deep dark espresso humus when watered!
    const base = wet
      ? (f === 2 ? '#341d0f' : '#3e2313')
      : (f === 2 ? '#8f592e' : f === 0 ? '#a96f3e' : '#9c6335');
    c.fillStyle = base;
    rrectPath(c, x, y, w, h, rad); c.fill();
    c.save();
    rrectPath(c, x + 1, y + 1, w - 2, h - 2, rad - 1); c.clip();
    const rows = 4;
    const step = (h - 10) / rows;
    const ridgeCol = wet ? '#58351f' : '#b77f4d';
    const crestCol = wet ? '#70472c' : '#d29e6e';
    const troughCol = wet ? '#1d0e06' : '#573116';
    for (let i = 0; i < rows; i++) {
      const ry = y + 7 + i * step;
      const wob = (i % 2 === 0 ? 1 : -1) * (0.9 + (v % 2) * 0.4);
      const pts1: Pt[] = [[x + 4, ry], [x + w * 0.33, ry + wob], [x + w * 0.67, ry - wob], [x + w - 4, ry]];
      const pts2: Pt[] = pts1.map(([px, py]) => [px, py - 2.3]);
      const pts3: Pt[] = pts1.map(([px, py]) => [px, py + 2.8]);
      ln(c, pts1, 5.2, ridgeCol);
      ln(c, pts2, 2.0, crestCol);
      ln(c, pts3, 3.4, troughCol);
      if (wet) {
        const sx = x + 10 + ((i * 17 + v * 13) % Math.max(12, w - 34));
        ln(c, [[sx, ry + 2.6], [sx + 15, ry + 2.6]], 1.8, 'rgba(138,214,255,0.72)');
      }
    }
    if (wet) {
      for (let k = 0; k < 3; k++) {
        dot(c, x + 14 + ((v * 19 + k * 23) % (w - 28)), y + 11 + ((v * 11 + k * 15) % (h - 22)), 1.9, 'rgba(162,228,255,0.82)');
      }
    }
    if (f === 2) {
      for (let k = 0; k < 4; k++) {
        dot(c, x + 10 + ((v * 17 + k * 21) % Math.max(12, w - 20)), y + 8 + ((v * 11 + k * 13) % Math.max(10, h - 16)), 1.7, '#f7ca56');
      }
    }
    c.restore();
    c.strokeStyle = wet ? '#241209' : '#563218'; c.lineWidth = 2.1;
    rrectPath(c, x, y, w, h, rad); c.stroke();
  });
}

export function soilPart(kind: 'raw' | 'tilled' | 'wild', fert: number, wet: boolean, variant: number): Part {
  return soilTile(kind, fert, wet, variant, TW, TH);
}
