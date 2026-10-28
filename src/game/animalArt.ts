// Hand-Illustrated Farm Animal Anatomy, Grounded Skeletal Rigs & Storybook UI Icons
// Covers all 6 farm species (chicken, duck, rabbit, sheep, goat, cow) across male, female & 4 natural coat palettes.
// Every offscreen sprite canvas is generously padded so ears, horns, combs, wattles, bills & tails NEVER clip,
// and leg geometry is calibrated so all paws/hooves/talons rest squarely on the ground shadow (y = 0..+3).
import { INK, box, cached, circ, dot, ln, oval, shape, type Ctx, type Part } from './art';
import type { AnimalKind } from './data';

function hexMix(hex: string, target: [number, number, number], k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - k) + target[0] * k);
  const g = Math.round(((n >> 8) & 255) * (1 - k) + target[1] * k);
  const b = Math.round((n & 255) * (1 - k) + target[2] * k);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}
const shade = (hex: string, k: number) => hexMix(hex, [38, 24, 14], k);
const tint = (hex: string, k: number) => hexMix(hex, [255, 250, 240], k);

export interface AnimalBone {
  p: Part | null;
  x: number;
  y: number;
  r: number;
  sx: number;
  sy: number;
  ch: AnimalBone[];
   behind?: boolean;
}

export interface AnimalRigDef {
  kind: AnimalKind;
  sex: 'm' | 'f';
  root: AnimalBone;
  body: AnimalBone;
  head: AnimalBone;
  legs: AnimalBone[];
  extra: AnimalBone | null;
  h: number;
  len: number;
  baseBodyY: number;
}

const mkBone = (p: Part | null, x: number, y: number, ch: AnimalBone[] = [], behind = false): AnimalBone => ({
  p, x, y, r: 0, sx: 1, sy: 1, ch, behind,
});

function drawExpressiveEye(c: Ctx, x: number, y: number, r: number) {
  circ(c, x, y, r, '#241914', 1.4);
  dot(c, x + r * 0.34, y - r * 0.34, Math.max(1.1, r * 0.38), '#ffffff');
  dot(c, x - r * 0.25, y + r * 0.28, Math.max(0.7, r * 0.2), 'rgba(255,255,255,0.65)');
}

/** Articulated poultry & waterfowl rig (chicken / rooster, duck / mallard drake) — zero clipping, grounded feet */
export function buildBirdRig(hue: number, sex: 'm' | 'f', kind: 'chicken' | 'duck' = 'chicken'): AnimalRigDef {
  const male = sex === 'm';
  const duck = kind === 'duck';
  const bodyPal = duck
    ? (male ? ['#c9c2b6', '#b8b0a2', '#d6cfc2', '#beb5a8'] : ['#f6edd6', '#ebd39e', '#d6b47c', '#f0e2c4'])
    : (male ? ['#d97834', '#f2e4c8', '#b84b2c', '#8c5832'] : ['#fff6e4', '#e8a254', '#c97842', '#6e5244']);
  const col = bodyPal[hue % bodyPal.length];
  const wingCol = duck && male ? '#7d8c99' : shade(col, 0.12);
  const key = `bird2:${kind}:${sex}:${col}`;

  // Plump layered feather body + tail plumes (124x102 canvas — ample room for proud rooster sickle plumes!)
  const body = cached(key + ':body', 124, 102, 66, 54, (c) => {
    if (duck) {
      // Upturned waterfowl tail + curly drake feather on males
      shape(c, [[-24, 2], [-50, -14], [-42, 4], [-22, 12]], { fill: shade(col, 0.16), line: 2.6 });
      if (male) {
        shape(c, [[-44, -12], [-54, -22], [-46, -24], [-40, -14]], { fill: '#263c38', line: 2.2 });
      }
      // Buoyant boat-shaped duck body
      oval(c, -2, 3, 30, 21, col, -0.06, 3.1, 0.08);
      if (male) {
        // Chestnut breast patch on mallard drake
        shape(c, [[10, -10], [26, -4], [25, 14], [10, 14]], { fill: '#8a482c', line: 2.2 });
      }
    } else {
      // Multi-feather arched rooster sickle tail OR tidy fanned hen tail
      if (male) {
        const tailCols = ['#275248', '#3c6e5e', shade(col, 0.22)];
        for (let i = 0; i < 3; i++) {
          const lift = 34 - i * 8;
          shape(c, [[-20, -4 + i * 3], [-42 - i * 4, -lift], [-56, -lift + 12], [-36, 4 + i * 3]], {
            fill: tailCols[i],
            line: 2.5,
          });
        }
      } else {
        shape(c, [[-20, -2], [-44, -20], [-40, -6], [-45, 2], [-22, 10]], { fill: shade(col, 0.18), line: 2.6 });
      }
      oval(c, 0, 2, 27, 23, col, -0.08, 3.1, 0.08);
      // Soft breast highlight
      oval(c, 10, 4, 12, 13, tint(col, 0.22), 0.1, 0);
    }
  });

  // Layered scalloped wing sprite
  const wing = cached(key + ':wing', 56, 46, 26, 18, (c) => {
    oval(c, 0, 4, 17, 11.5, wingCol, 0.16, 2.7, 0.08);
    if (duck && male) {
      // Iridescent blue speculum bar on mallard wing
      ln(c, [[-8, 5], [7, 7]], 4, '#2f6fb2');
      ln(c, [[-8, 2], [7, 4]], 1.8, '#ffffff');
    } else {
      ln(c, [[-9, 6], [6, 8]], 2, shade(wingCol, 0.22));
      ln(c, [[-6, 10], [5, 11]], 1.8, shade(wingCol, 0.22));
    }
  });

  // Expressive unclipped head sprite (84x84, px=36, py=48)
  const head = cached(key + ':head', 84, 84, 36, 48, (c) => {
    const headCol = duck && male ? '#1f6a4a' : col;
    if (!duck) {
      // Scalloped crimson comb (proud tall crown on rooster, sweet tidy crown on hen)
      const lobes = male
        ? [[-9, -22, 5.2, 8.5], [-1, -25, 5.6, 10], [7, -22, 5, 8]]
        : [[-6, -18, 3.8, 5.5], [1, -20, 4, 6.2], [7, -17, 3.5, 5]];
      for (const [cx, cy, rx, ry] of lobes) {
        oval(c, cx, cy, rx, ry, '#e6352b', -0.1, 2.3);
      }
    }
    // Rounded head + graceful neck blend
    circ(c, 0, -2, duck ? 15.5 : 16, headCol, 3);
    if (duck && male) {
      // Classic crisp white mallard collar ring
      ln(c, [[-11, 11], [0, 14], [12, 11]], 4.2, '#ffffff');
      ln(c, [[-11, 13.5], [0, 16.5], [12, 13.5]], 1.8, INK);
    }
    if (duck) {
      // Smooth scooped waterfowl bill with nostril dot
      shape(c, [[12, -5], [33, -1], [32, 6], [12, 6]], { fill: male ? '#f0b429' : '#f2943a', line: 2.5 });
      dot(c, 20, -1, 1.4, INK);
    } else {
      // Two-part golden beak + red wattle + rosy cheek
      shape(c, [[13, -5], [29, 0], [13, 5]], { fill: '#ffb02e', smooth: false, line: 2.5 });
      ln(c, [[14, 0.5], [26, 0.5]], 1.6, INK);
      oval(c, 12, 10, male ? 5.2 : 3.6, male ? 8 : 5, '#e6352b', 0.15, 2.2);
      oval(c, 2, 4, 4.5, 3, 'rgba(255,138,128,0.45)', 0, 0);
    }
    drawExpressiveEye(c, 5, -5, 3.1);
  });

  // Grounded legs reaching y = 0 right on the shadow!
  const leg = cached(key + ':leg', 32, 34, 15, 6, (c) => {
    const legCol = duck ? '#f08c2d' : '#f0a22e';
    ln(c, [[0, 0], [0, 16]], 4.2, legCol);
    if (duck) {
      shape(c, [[-3, 16], [12, 18], [9, 22], [-4, 20]], { fill: legCol, smooth: false, line: 2 });
    } else {
      ln(c, [[-6, 18], [0, 16], [9, 18]], 3.2, legCol);
      ln(c, [[0, 16], [5, 21]], 2.6, legCol);
    }
  });

  const headB = mkBone(head, 20, -18);
  const wingB = mkBone(wing, -2, -2);
  const bodyB = mkBone(body, 0, -34, [wingB, headB]);
  const legB = mkBone(leg, -5, -18, [], true);
  const legF = mkBone(leg, 6, -18);
  return {
    kind,
    sex,
    root: mkBone(null, 0, 0, [legB, bodyB, legF]),
    body: bodyB,
    head: headB,
    legs: [legF, legB],
    extra: wingB,
    h: male && !duck ? 68 : 62,
    len: 66,
    baseBodyY: -34,
  };
}

/** Articulated quadruped rig (cow, sheep, goat, rabbit) — zero clipping, all 4 feet planted on ground shadow! */
export function buildQuadRig(kind: 'cow' | 'sheep' | 'goat' | 'rabbit', hue: number, sex: 'm' | 'f' = 'f'): AnimalRigDef {
  const male = sex === 'm';
  const palettes: Record<typeof kind, string[]> = {
    cow: ['#fcf9f2', '#e8b980', '#d89b6c', '#f4ead8'],
    sheep: ['#fbf5e8', '#f2e8d4', '#fffaf0', '#e6dcc8'],
    goat: ['#dfd0b8', '#c89b6e', '#f2ece1', '#9e8e80'],
    rabbit: ['#f5ece0', '#d9b38c', '#ffffff', '#b8a99a'],
  };
  const base = palettes[kind][hue % 4];
  const patchCol = kind === 'cow'
    ? ['#352f2d', '#8c5230', '#6e3b26', '#6b5e54'][hue % 4]
    : shade(base, 0.24);
  const key = `quad2:${kind}:${sex}:${hue}`;

  // Calibrated leg length so bodyY + legAttachY + legBottom === +2 (100% grounded on shadow!)
  const legLen = kind === 'cow' ? 35 : kind === 'rabbit' ? 20 : 30;
  const legAttachY = kind === 'cow' ? 24 : kind === 'rabbit' ? 18 : 22;
  const baseBodyY = -(legAttachY + legLen - 2); // cow=-57, sheep/goat=-50, rabbit=-36 -> hooves at y=+2!

  const body = cached(key + ':body', 168, 120, 84, 62, (c) => {
    if (kind === 'sheep') {
      // Fluffy woolly tail puff
      circ(c, -48, -4, 9.5, shade(base, 0.05), 2.6);
      // Clean unified scalloped cloud fleece silhouette (no overlapping internal stroke clutter!)
      const pts: [number, number][] = [];
      const lobes = 14;
      for (let i = 0; i < lobes; i++) {
        const a = (i / lobes) * Math.PI * 2;
        const rBump = i % 2 === 0 ? 1.13 : 0.94;
        pts.push([Math.cos(a) * 44 * rBump, Math.sin(a) * 29 * rBump - 2]);
      }
      shape(c, pts, { fill: base, line: 3.1, hatch: 0.06, jit: 1.2 });
      // Subtle soft inner wool curls without heavy outlines
      ln(c, [[-18, -8], [-12, -13], [-6, -8]], 2, shade(base, 0.16));
      ln(c, [[6, -4], [12, -9], [18, -4]], 2, shade(base, 0.16));
      ln(c, [[-6, 8], [0, 3], [6, 8]], 2, shade(base, 0.16));
    } else if (kind === 'cow') {
      // Swishing tufted tail
      ln(c, [[-48, -14], [-60, 4], [-58, 16]], 4.2, shade(base, 0.1));
      oval(c, -58, 19, 5, 7.5, patchCol, 0.2, 2.2);
      // Dairy udder strictly on female cows
      if (!male) {
        oval(c, -14, 24, 13, 9.5, '#ffb7c5', 0, 2.5);
        for (const tx of [-19, -14, -9]) ln(c, [[tx, 32], [tx, 36]], 2.8, '#f48fa4');
      }
      // Stately rounded barrel torso
      oval(c, 0, -2, male ? 50 : 48, male ? 31 : 29, base, 0, 3.2, 0.05);
      if (male) oval(c, 22, -24, 15, 10, shade(base, 0.08), -0.2, 2.6);
      // Organic breed coat patches (clipped cleanly inside torso silhouette)
      oval(c, -16, -12, 16, 12, patchCol, 0.28, 0);
      oval(c, 16, 2, 13, 11, patchCol, -0.22, 0);
      oval(c, -30, 6, 9, 8, patchCol, 0.1, 0);
      // Warm brass bell on red leather collar at chest!
      ln(c, [[34, -18], [41, 2], [35, 16]], 4.6, '#c83e32');
      circ(c, 39, 16, 5.5, '#ffd43b', 2.2);
    } else if (kind === 'goat') {
      // Perky upturned mountain-goat tail!
      shape(c, [[-40, -10], [-52, -26], [-43, -24], [-35, -8]], { fill: shade(base, 0.18), line: 2.5 });
      oval(c, 0, -2, 41, 24, base, -0.03, 3.1, 0.07);
      // Cream belly highlight + dark mountain dorsal stripe
      oval(c, 2, 10, 26, 9, tint(base, 0.3), 0, 0);
      ln(c, [[-32, -22], [26, -21]], 3.2, shade(base, 0.3));
      // Small brass collar bell
      ln(c, [[30, -14], [35, 6]], 3.6, '#9e472a');
      circ(c, 35, 10, 4.4, '#ffd43b', 2);
    } else {
      // Rabbit: adorable fluffy white cotton-puff tail + plump pear-shaped body
      circ(c, -35, 2, 9.5, '#ffffff', 2.6);
      oval(c, 0, 1, 31, 21, base, -0.08, 3, 0.06);
      oval(c, 6, 8, 18, 9, tint(base, 0.35), 0, 0);
    }
  });

  // Generous 118x118 head canvas (px=42, py=66 -> covers x in [-42..+76], y in [-66..+52], ZERO CLIPPING!)
  const head = cached(key + ':head', 118, 118, 42, 66, (c) => {
    if (kind === 'cow') {
      // Curved ivory horns behind ears
      const hLen = male ? 20 : 13;
      ln(c, [[-6, -15], [-13, -18 - hLen * 0.7], [-5, -20 - hLen]], 5.5, INK);
      ln(c, [[-6, -15], [-13, -18 - hLen * 0.7], [-5, -20 - hLen]], 3.2, '#f3e5be');
      ln(c, [[12, -16], [19, -19 - hLen * 0.7], [25, -19 - hLen]], 5.5, INK);
      ln(c, [[12, -16], [19, -19 - hLen * 0.7], [25, -19 - hLen]], 3.2, '#f3e5be');
      // Soft horizontal cow ears with warm pink inner lining
      oval(c, -16, -6, 12, 6.2, patchCol, -0.28, 2.6);
      oval(c, -15, -5.5, 7, 3.2, '#f7b7c4', -0.28, 0);
      // Expressive head + forehead patch + wide rosy muzzle
      oval(c, 6, 0, 21, 18.5, base, 0.06, 3.1);
      oval(c, -3, -9, 9.5, 7.5, patchCol, 0.2, 0);
      oval(c, 21, 8, 15, 11.5, '#ffc2cf', 0.05, 2.7);
      dot(c, 16, 7, 2.3, '#5a2d35');
      dot(c, 27, 7, 2.3, '#5a2d35');
      ln(c, [[17, 14], [22, 16], [27, 13.5]], 1.8, '#7a3b44');
      drawExpressiveEye(c, 8, -5, 3.5);
    } else if (kind === 'sheep') {
      // Dark velvet face + soft droopy ears + fluffy wool crown cap!
      oval(c, -14, -2, 10.5, 5.2, '#4d3e38', -0.42, 2.5);
      oval(c, 5, 2, 17.5, 15.5, '#594842', 0.1, 3);
      // Fluffy cream wool topknot cap on forehead
      for (const [wx, wy, wr] of [[-5, -13, 8.5], [4, -15, 9], [12, -12, 7.5]] as const) {
        circ(c, wx, wy, wr, base, 2.3);
      }
      if (male) {
        // Golden spiral ram horn curling gracefully beside cheek
        ln(c, [[0, -14], [-14, -24], [-24, -12], [-17, 2], [-7, -2]], 6.8, INK);
        ln(c, [[0, -14], [-14, -24], [-24, -12], [-17, 2], [-7, -2]], 4.2, '#d8b46a');
      }
      oval(c, 18, 7, 5.5, 4, '#f7b2c0', 0, 1.8);
      ln(c, [[15, 11], [19, 12.5]], 1.7, '#fff6eb');
      drawExpressiveEye(c, 9, -2, 3.2);
    } else if (kind === 'goat') {
      // Proud swept-back mountain horns (taller scimitar arc on billy goat)
      const hBack = male ? -28 : -18;
      const hTop = male ? -40 : -30;
      ln(c, [[2, -13], [-10, -28], [hBack, hTop]], 6.2, INK);
      ln(c, [[2, -13], [-10, -28], [hBack, hTop]], 3.6, '#b89b6c');
      ln(c, [[9, -14], [-1, -29], [hBack + 10, hTop - 2]], 5.8, INK);
      ln(c, [[9, -14], [-1, -29], [hBack + 10, hTop - 2]], 3.3, '#cbb082');
      // Perky angled ears
      oval(c, -13, -4, 10, 4.6, shade(base, 0.14), -0.35, 2.4);
      // Wispy chin beard!
      shape(c, [[10, 13], [6, 26], [14, 24], [16, 13]], { fill: shade(base, 0.18), line: 2.2 });
      // Tapered caprine head & muzzle
      shape(c, [[-10, -10], [8, -13], [26, -1], [24, 11], [4, 14], [-11, 6]], { fill: base, line: 2.9 });
      dot(c, 21, 4, 2, INK);
      ln(c, [[16, 9], [22, 8.5]], 1.8, INK);
      drawExpressiveEye(c, 8, -3, 3.2);
    } else {
      // Rabbit: two tall expressive upright ears completely inside [-66..+52] with rosy inner ear!
      oval(c, -3, -32, 6.2, 21, shade(base, 0.08), -0.24, 2.7);
      oval(c, -3, -31, 3.1, 14, '#f7b7c6', -0.24, 0);
      oval(c, 8, -33, 6.5, 22, base, 0.12, 2.8);
      oval(c, 8, -32, 3.3, 15, '#f7b7c6', 0.12, 0);
      // Plump cheeked bunny head + twitchy pink nose + whiskers
      oval(c, 5, 2, 16.5, 14.5, base, 0.04, 2.9);
      oval(c, 12, 6, 8, 6.5, tint(base, 0.35), 0, 0);
      oval(c, 20, 3, 3.6, 2.8, '#ff8ba0', 0, 1.8);
      ln(c, [[11, 5], [1, 3]], 1.4, 'rgba(80,52,38,0.65)');
      ln(c, [[11, 8], [2, 9]], 1.4, 'rgba(80,52,38,0.65)');
      drawExpressiveEye(c, 9, -2, 3.3);
    }
  });

  // Grounded species-proportioned legs + cloven hooves / soft bunny paws
  const leg = cached(key + ':leg', 32, 52, 16, 8, (c) => {
    if (kind === 'rabbit') {
      oval(c, 2, 12, 8.5, 6.5, shade(base, 0.1), 0.15, 2.5);
      oval(c, 6, 17, 7.5, 4.2, tint(base, 0.25), 0, 2.2);
    } else {
      const w = kind === 'cow' ? 8.2 : 6.6;
      const legCol = kind === 'sheep' ? '#594842' : shade(base, 0.15);
      ln(c, [[0, 0], [0, legLen - 6]], w + 3.6, INK);
      ln(c, [[0, 0], [0, legLen - 6]], w, legCol);
      shape(c, box(-w * 0.68, legLen - 7, w * 1.42, 7.5), { fill: '#3d312c', smooth: false, line: 2.2 });
    }
  });

  const headAttach: Record<typeof kind, [number, number]> = {
    cow: [42, -20],
    sheep: [38, -16],
    goat: [36, -20],
    rabbit: [24, -14],
  };
  const headB = mkBone(head, headAttach[kind][0], headAttach[kind][1]);
  const xFront = kind === 'cow' ? 28 : kind === 'rabbit' ? 16 : 24;
  const xBack = kind === 'cow' ? -30 : kind === 'rabbit' ? -18 : -24;
  const legs = [
    mkBone(leg, xBack, legAttachY - 1),
    mkBone(leg, xFront - 4, legAttachY - 1),
    mkBone(leg, xBack + 7, legAttachY + 1),
    mkBone(leg, xFront + 3, legAttachY + 1),
  ];
  legs[0].behind = true;
  legs[1].behind = true;
  const bodyB = mkBone(body, 0, baseBodyY, [legs[0], legs[1], headB, legs[2], legs[3]]);
  const heights: Record<typeof kind, number> = {
    cow: 102,
    goat: male ? 98 : 92,
    sheep: 86,
    rabbit: 94,
  };
  return {
    kind,
    sex,
    root: mkBone(null, 0, 0, [bodyB]),
    body: bodyB,
    head: headB,
    legs,
    extra: null,
    h: heights[kind],
    len: kind === 'rabbit' ? 76 : kind === 'cow' ? 114 : 98,
    baseBodyY,
  };
}

/** Crisp storybook portrait icons for all 6 farm animals (used in Shop, Almanac, Quests, Inventory & Letters) */
export function drawAnimalIcon(c: Ctx, kind: AnimalKind) {
  switch (kind) {
    case 'chicken':
      // Plump golden-cream hen portrait with 3-lobe red comb, rosy cheek & wattle
      for (const [cx, cy, r] of [[-7, -21, 5.2], [0, -24, 5.8], [7, -20, 4.8]] as const) oval(c, cx, cy, r, r * 1.25, '#e6352b', 0, 2.3);
      circ(c, -1, 3, 19.5, '#fff6e4', 3, 0.06);
      oval(c, -6, 9, 10, 7, '#f2d9a8', 0.2, 2);
      oval(c, 13, 12, 4.2, 6, '#e6352b', 0.1, 2);
      shape(c, [[15, -1], [28, 4], [15, 8]], { fill: '#ffb02e', smooth: false, line: 2.5 });
      drawExpressiveEye(c, 6, -2, 3);
      break;
    case 'duck':
      // Buoyant cream duck with golden bill & folded wing feather
      shape(c, [[-17, 4], [-26, -7], [-16, 13]], { fill: '#e6d39c', line: 2.3 });
      oval(c, -2, 8, 17, 13, '#faf1dc', -0.06, 2.9, 0.06);
      oval(c, -5, 9, 9.5, 6, '#ebd7a2', 0.12, 2);
      circ(c, 10, -10, 11.5, '#1f6a4a', 2.8);
      ln(c, [[3, -1], [10, 1], [17, -1]], 3.2, '#ffffff');
      shape(c, [[18, -12], [30, -8], [29, -4], [18, -5]], { fill: '#f2a435', line: 2.3 });
      drawExpressiveEye(c, 13, -12, 2.5);
      break;
    case 'rabbit':
      // Sweet bunny portrait with two unclipped pink-lined ears & rosy nose
      oval(c, -8, -16, 5.5, 13, '#f5ece0', -0.16, 2.6);
      oval(c, -8, -15, 2.7, 8.5, '#f7b7c6', -0.16, 0);
      oval(c, 8, -16, 5.5, 13, '#f5ece0', 0.16, 2.6);
      oval(c, 8, -15, 2.7, 8.5, '#f7b7c6', 0.16, 0);
      oval(c, 0, 7, 18, 15.5, '#f5ece0', 0, 3, 0.05);
      oval(c, 0, 10, 4, 3, '#ff8ba0', 0, 1.8);
      ln(c, [[0, 13], [-4, 16]], 1.8, INK); ln(c, [[0, 13], [4, 16]], 1.8, INK);
      drawExpressiveEye(c, -7, 3, 2.8);
      drawExpressiveEye(c, 7, 3, 2.8);
      break;
    case 'sheep':
      // Fluffy cloud wool halo + dark cocoa face + cute pink nose
      oval(c, -20, 2, 8.5, 4.5, '#4d3e38', -0.35, 2.4);
      oval(c, 20, 2, 8.5, 4.5, '#4d3e38', 0.35, 2.4);
      for (const [wx, wy, wr] of [[-14, -12, 10], [0, -17, 11.5], [14, -12, 10], [-15, 4, 9], [15, 4, 9]] as const) {
        circ(c, wx, wy, wr, '#fbf5e8', 2.4);
      }
      oval(c, 0, 6, 13.5, 16.5, '#594842', 0, 2.9);
      for (const [wx, wy, wr] of [[-6, -9, 6.5], [0, -11, 7], [6, -9, 6.5]] as const) circ(c, wx, wy, wr, '#fbf5e8', 2);
      oval(c, 0, 14, 5, 3.3, '#f7b2c0', 0, 1.7);
      drawExpressiveEye(c, -5.5, 3, 2.6);
      drawExpressiveEye(c, 5.5, 3, 2.6);
      break;
    case 'goat':
      // Mountain goat with curved horns, perky ears & chin beard
      ln(c, [[-8, -12], [-15, -26], [-21, -24]], 5.2, INK);
      ln(c, [[-8, -12], [-15, -26], [-21, -24]], 3, '#cbb082');
      ln(c, [[8, -12], [15, -26], [21, -24]], 5.2, INK);
      ln(c, [[8, -12], [15, -26], [21, -24]], 3, '#cbb082');
      oval(c, -19, -2, 8.5, 4, '#c8b496', -0.3, 2.3);
      oval(c, 19, -2, 8.5, 4, '#c8b496', 0.3, 2.3);
      shape(c, [[-4, 17], [0, 27], [4, 17]], { fill: '#c8b496', line: 2 });
      oval(c, 0, 3, 14.5, 17, '#e6d8c0', 0, 2.9, 0.05);
      oval(c, 0, 12, 7.5, 5.5, '#f7ede0', 0, 2);
      dot(c, -2.5, 11, 1.5); dot(c, 2.5, 11, 1.5);
      drawExpressiveEye(c, -6, 0, 2.7);
      drawExpressiveEye(c, 6, 0, 2.7);
      break;
    case 'cow':
      // Classic spotted dairy cow with ivory horns, two-tone ears & rosy muzzle
      ln(c, [[-12, -16], [-19, -26]], 5.2, INK); ln(c, [[-12, -16], [-19, -26]], 3, '#f3e5be');
      ln(c, [[12, -16], [19, -26]], 5.2, INK); ln(c, [[12, -16], [19, -26]], 3, '#f3e5be');
      oval(c, -22, -4, 9.5, 5.2, '#352f2d', -0.28, 2.5);
      oval(c, 22, -4, 9.5, 5.2, '#fcf9f2', 0.28, 2.5);
      oval(c, 0, 1, 18.5, 20.5, '#fcf9f2', 0, 3, 0.04);
      oval(c, -8, -8, 8.5, 8, '#352f2d', 0.2, 0);
      oval(c, 0, 12, 14.5, 9.5, '#ffc2cf', 0, 2.6);
      dot(c, -5, 11.5, 2, '#5a2d35'); dot(c, 5, 11.5, 2, '#5a2d35');
      drawExpressiveEye(c, -7.5, -2, 2.9);
      drawExpressiveEye(c, 7.5, -2, 2.9);
      break;
  }
}
