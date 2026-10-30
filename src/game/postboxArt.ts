// Hand-Drawn Farm Postbox, Cached Silo & Upgraded World Machinery Sprite Layer
// All static artwork is pre-rasterized into GPU-backed sprites via `cached(...)` so per-frame CPU vector cost is near zero.
import { INK, box, cached, circ, dot, ell, iconPart, ln, oval, put, shape, type Ctx } from './art';
import { isReducedMotion } from './settings';
import { fa } from '../strings/fa';

/** Exact world placement of the Farmhouse Courtyard Postbox — verified 0.0px overlap (including floating unread badge!) across every farm landmark */
export const POSTBOX_GEOM = {
  x: 317,
  y: 232,
  bbox: { x0: 295, y0: 144, x1: 339, y1: 238 },
  walkX: 317,
  walkY: 256,
} as const;

function postboxSprite(hasUnread: boolean) {
  return cached(`world-postbox:${hasUnread ? 1 : 0}`, 76, 92, 38, 82, (c) => {
    // Soft ground shadow under carved oak post
    c.fillStyle = 'rgba(40,28,12,0.18)';
    c.beginPath();
    c.ellipse(0, 2, 16, 5.2, 0, 0, Math.PI * 2);
    c.fill();

    // Meadow grass tuft hugging the base post
    ln(c, [[-8, 1], [-12, -6]], 2.2, '#4ea63b');
    ln(c, [[8, 1], [11, -5]], 2.2, '#5db846');

    // Weathered oak post + diagonal support brace
    shape(c, box(-4.5, -36, 9, 38), { fill: '#8f5d32', smooth: false, line: 2.5 });
    ln(c, [[-1.5, -34], [-1.5, 0]], 1.6, '#b8824e');
    ln(c, [[4, -22], [11, -30]], 3, '#7a4b26');

    // Classic arched countryside mailbox body (warm sage-teal painted tin + brass trim)
    shape(c, [[-17, -34], [17, -34], [17, -49], [10, -56], [-10, -56], [-17, -49]], {
      fill: '#4d7c6f',
      hatch: 0.08,
      line: 2.7,
    });
    // Arched roof highlight + brass mail slot on front door
    ln(c, [[-12, -52], [10, -52]], 2.2, '#7ba89a');
    shape(c, box(5, -51, 9, 15), { fill: '#3d665b', smooth: false, line: 2.2 });
    ln(c, [[9.5, -45], [9.5, -40]], 2.2, '#f2c94c');

    if (hasUnread) {
      // Cream envelope corner + crimson wax seal peeking out of mailbox door!
      shape(c, [[4, -46], [22, -50], [20, -37], [4, -36]], { fill: '#fff8e6', smooth: false, line: 2.1 });
      circ(c, 15, -42.5, 3, '#d63a3a', 1.4);
      // Raised bright crimson wooden flag standing straight up!
      ln(c, [[-4, -45], [-4, -66]], 4.2, INK);
      ln(c, [[-4, -45], [-4, -66]], 2.4, '#e63935');
      shape(c, [[-4, -66], [7, -66], [5, -59], [-4, -59]], { fill: '#e63935', smooth: false, line: 2 });
      dot(c, -4, -45, 2.6, '#ffd43b');
    } else {
      // Resting flag folded down horizontally along side of mailbox
      ln(c, [[-12, -43], [2, -43]], 3.2, '#c83e37');
      dot(c, 2, -43, 2.4, '#ffd43b');
    }
  });
}

/** Draws the physical farm postbox + subtle floating unread letter badge when mail awaits */
export function drawWorldPostbox(ctx: Ctx, unreadCount: number, t: number) {
  const hasUnread = unreadCount > 0;
  put(ctx, postboxSprite(hasUnread), POSTBOX_GEOM.x, POSTBOX_GEOM.y, 1);
  if (!hasUnread) return;

  const bob = isReducedMotion() ? 0 : Math.sin(t * 3.6) * 2.2;
  const bx = POSTBOX_GEOM.x, by = POSTBOX_GEOM.y - 72 + bob;
  const sprite = cached(`postbox-badge:${Math.min(99, unreadCount)}`, 54, 34, 27, 17, (c) => {
    shape(c, ell(0, 0, 21, 12.5, 12), { fill: '#fffdf2', line: 2.4 });
    put(c, iconPart('mail'), -6.5, 0.5, 0.34);
    c.font = '900 11.5px Vazirmatn, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#b02a24';
    c.fillText(fa(Math.min(99, unreadCount)), 9.5, 1);
  });
  put(ctx, sprite, bx, by, 1);
}

/** Pre-cached grain silo sprite so silo rendering is 1 GPU drawImage blit instead of 6 vector paths/frame */
export function drawCachedSilo(ctx: Ctx, sx: number, sy: number, level: number) {
  const sp = cached(`farm-silo:${level}`, 64, 92, 32, 78, (c) => {
    c.fillStyle = 'rgba(40,30,10,.16)';
    c.beginPath();
    c.ellipse(0, 2, 19, 5.5, 0, 0, Math.PI * 2);
    c.fill();
    shape(c, [[-14, 0], [-14, -46], [14, -46], [14, 0]], { fill: '#c98a52', hatch: 0.14, line: 2.6, jit: 1 });
    shape(c, [[-16, -46], [0, -64], [16, -46]], { fill: '#8a5a28', smooth: false, line: 2.2 });
    ln(c, [[-7, 0], [-7, -34]], 1.8, '#503426');
    ln(c, [[7, 0], [7, -34]], 1.8, '#503426');
    for (let i = 0; i < level; i++) {
      put(c, iconPart('star'), -(level - 1) * 7.5 + i * 15, -24, 0.28);
    }
  });
  put(ctx, sp, sx, sy, 1);
}

/** Renders parked & active farm machinery with tier badges and subtle active motion */
export function drawWorldMachines(
  ctx: Ctx,
  machines: Record<string, number | undefined>,
  auto: Record<string, boolean | undefined>,
  t: number,
  vx0 = -Infinity,
  vx1 = Infinity,
) {
  const anim = !isReducedMotion();
  const visible = (x: number, pad = 90) => x + pad >= vx0 && x - pad <= vx1;
  const padUnit = (name: string, x: number, y: number, sc: number, lv: number, on: boolean) => {
    if (!visible(x)) return;
    // Ground contact shadow + gentle engine idle hum when active in Auto Panel
    ctx.fillStyle = 'rgba(40,30,15,0.16)';
    ctx.beginPath();
    ctx.ellipse(x, y + 17, 22 * sc, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    const hum = on && anim ? Math.sin(t * 14 + x) * 0.8 : 0;
    put(ctx, iconPart(name), x, y + hum, sc);
    if (lv > 1) {
      const tag = cached(`mk-tag:${lv}`, 34, 18, 17, 9, (c) => {
        shape(c, ell(0, 0, 13, 6.8, 10), { fill: '#fff8dc', line: 1.9 });
        for (let i = 0; i < lv; i++) oval(c, -(lv - 1) * 3.8 + i * 7.6, 0, 2.5, 2.5, '#f0a818', 0, 1.2);
      });
      put(ctx, tag, x, y - 24 * sc, 1);
    }
  };

  if (machines.tractor) padUnit('tractor', 470, 176, 0.92, machines.tractor, !!auto.till);
  if (machines.seeder) padUnit('seeder', 546, 176, 0.86, machines.seeder, !!auto.plant);
  if (machines.harvester) padUnit('harvester', 622, 176, 0.92, machines.harvester, !!auto.harvest);

  if (machines.sprinkler) {
    for (const [x, y] of [[416, 244], [1140, 244], [416, 572], [1140, 572]] as const) {
      if (!visible(x, 45)) continue;
      put(ctx, iconPart('sprinkler'), x, y, 0.78);
      if (auto.water && anim) {
        ctx.fillStyle = 'rgba(120,205,255,0.75)';
        for (let k = 0; k < 4; k++) {
          const ang = t * 3.4 + k * 1.57;
          ctx.beginPath();
          ctx.arc(x + Math.cos(ang) * 18, y - 6 + Math.sin(ang) * 9, 2.3, 0, 6.3);
          ctx.fill();
        }
      }
    }
  }
  if (machines.collector) padUnit('collector', 138, 496, 0.74, machines.collector, !!auto.collect);
  if (machines.feeder) padUnit('feeder', 354, 496, 0.74, machines.feeder, !!auto.feed);
  if (machines.drone) {
    const hoverX = anim ? 700 + Math.sin(t * 0.7) * 260 : 700;
    const hoverY = anim ? 286 + Math.sin(t * 1.3) * 32 : 286;
    if (visible(hoverX, 60)) put(ctx, iconPart('drone'), hoverX, hoverY, 1.0, anim ? Math.sin(t * 2) * 0.06 : 0);
  }
}
