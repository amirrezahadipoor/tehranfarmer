// Hand-drawn comic emotes, live mouth-flap/blink, action motion arcs & world stage set-pieces
import { INK, cached, circ, dot, ell, ln, oval, shape, type Ctx, type Part } from './art';
import type { EmoteKind, StagePropKind } from '../story/cinemaTypes';

const warnedAssets = new Set<string>();

export function safePropName(prop?: string): string {
  if (!prop) return '';
  if (
    prop === 'hoe' || prop === 'can' || prop === 'seedbag' || prop === 'fertsack'
    || prop === 'sickle' || prop === 'club' || prop === 'scroll' || prop === 'teacup'
    || prop === 'bread' || prop === 'hammer' || prop === 'rod'
  ) {
    return prop;
  }
  if (!warnedAssets.has(prop)) {
    warnedAssets.add(prop);
    console.warn(`[cinema] Missing prop asset "${prop}", substituting hand-drawn placeholder scroll.`);
  }
  return 'scroll';
}

export function emotePart(kind: EmoteKind): Part {
  return cached('emote:' + kind, 72, 76, 36, 66, (c: Ctx) => {
    shape(c, ell(0, -34, 24, 21, 14), { fill: '#fffdf4', line: 3, jit: 1.1 });
    shape(c, [[-6, -15], [5, -15], [-2, -4]], { fill: '#fffdf4', smooth: false, line: 2.5 });
    switch (kind) {
      case '!':
        shape(c, [[-4, -50], [4, -50], [2.5, -31], [-2.5, -31]], { fill: '#e84838', smooth: false, line: 2.2 });
        circ(c, 0, -23, 3.6, '#e84838', 2);
        break;
      case '?':
        ln(c, [[-6, -45], [-2, -50], [5, -49], [7, -43], [1, -37], [0, -32]], 4.2, '#d96b27');
        circ(c, 0, -23, 3.3, '#d96b27', 2);
        break;
      case 'heart':
        c.fillStyle = '#eb4d68';
        c.beginPath();
        c.moveTo(0, -21);
        c.bezierCurveTo(-18, -33, -15, -50, -3, -45);
        c.bezierCurveTo(0, -43, 0, -43, 3, -45);
        c.bezierCurveTo(15, -50, 18, -33, 0, -21);
        c.fill();
        ln(c, [[-11, -43], [-6, -47]], 2, '#ffc2cd');
        break;
      case 'anger':
        for (const [dx, dy] of [[-7, -41], [7, -41], [-7, -27], [7, -27]] as const) {
          ln(c, [[dx - 4, dy], [dx, dy], [dx, dy - 4]], 3.2, '#d93025');
        }
        break;
      case 'sweat':
        shape(c, [[0, -49], [9, -32], [5, -22], [-5, -22], [-9, -32]], { fill: '#63b8f6', line: 2.4 });
        ln(c, [[-3, -36], [-2, -28]], 2, '#d8f3ff');
        break;
      case 'music':
        ln(c, [[-6, -25], [-4, -46], [8, -48], [6, -27]], 3, '#7c4dff');
        oval(c, -9, -25, 4.5, 3.4, '#7c4dff', -0.4, 2);
        oval(c, 3, -27, 4.5, 3.4, '#7c4dff', -0.4, 2);
        break;
      case 'idea':
        circ(c, 0, -37, 9.5, '#ffe055', 2.4);
        shape(c, [[-4, -27], [4, -27], [3, -22], [-3, -22]], { fill: '#b0b8c4', smooth: false, line: 2 });
        for (const a of [-2.2, -1.57, -0.95]) {
          ln(c, [[Math.cos(a) * 13, -37 + Math.sin(a) * 13], [Math.cos(a) * 18, -37 + Math.sin(a) * 18]], 2.2, '#f29d26');
        }
        break;
      case 'dots':
        dot(c, -9, -34, 3.2, INK);
        dot(c, 0, -34, 3.2, INK);
        dot(c, 9, -34, 3.2, INK);
        break;
    }
  });
}

/** Procedural live mouth-flap & eye blink drawn cleanly on actor (zero strokes/icons over faces) */
export function drawActorFaceOverlay(
  c: Ctx, x: number, y: number, face: number, scale: number, mouthOpen: number, blink: boolean, _actionArc = 0,
) {
  void _actionArc;
  c.save();
  c.translate(x, y);
  c.scale(face * scale, scale);
  if (mouthOpen > 0.04) {
    oval(c, 12.5, -112.5, 3.6, 1.4 + mouthOpen * 3.8, '#8f2d2a', 0, 1.8);
  }
  if (blink) {
    ln(c, [[8, -124], [14, -124]], 2.6, INK);
  }
  c.restore();
}

/** Hand-drawn animated stage props & world set-pieces for lively story action */
export function drawCinemaSetPiece(c: Ctx, kind: StagePropKind, x: number, y: number, clock: number) {
  c.save();
  c.translate(x, y);
  c.strokeStyle = INK;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  switch (kind) {
    case 'deed-table': {
      c.fillStyle = 'rgba(0,0,0,0.16)';
      c.beginPath(); c.ellipse(0, 26, 58, 12, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#8b5732';
      c.lineWidth = 2.8;
      c.beginPath(); c.roundRect(-48, -8, 96, 15, 5); c.fill(); c.stroke();
      c.fillRect(-38, 7, 9, 19); c.strokeRect(-38, 7, 9, 19);
      c.fillRect(29, 7, 9, 19); c.strokeRect(29, 7, 9, 19);
      c.fillStyle = '#fbf0d4';
      c.beginPath(); c.roundRect(-24, -18, 32, 11, 3); c.fill(); c.stroke();
      circ(c, 0, -12.5, 3.8, '#d64545', 1.6);
      c.fillStyle = '#d99b38';
      c.beginPath(); c.roundRect(16, -26, 15, 18, 4); c.fill(); c.stroke();
      ln(c, [[23, -29], [20 + Math.sin(clock * 4) * 3, -38], [24, -46]], 2, 'rgba(255,255,255,0.8)');
      break;
    }
    case 'treasure-chest': {
      const s = 1 + Math.sin(clock * 5) * 0.04;
      c.scale(s, s);
      c.fillStyle = 'rgba(255,215,64,0.22)';
      c.beginPath(); c.arc(0, -16, 48 + Math.sin(clock * 4) * 4, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#8b5428'; c.lineWidth = 2.8;
      c.beginPath(); c.roundRect(-34, -16, 68, 34, 6); c.fill(); c.stroke();
      for (let i = -20; i <= 20; i += 8) circ(c, i, -16 - Math.abs(Math.sin(clock * 3 + i)) * 5, 6.2, '#ffd43b', 1.8);
      c.fillStyle = '#a46331';
      c.beginPath(); c.roundRect(-36, -32, 72, 14, 6); c.fill(); c.stroke();
      circ(c, 0, -2, 6, '#ffd43b', 2);
      break;
    }
    case 'qanat-fountain': {
      const h = 72 + Math.sin(clock * 8) * 14;
      oval(c, 0, 12, 42, 12, '#9aa5b1', 0, 2.8);
      oval(c, 0, 10, 32, 8, '#4fc3f7', 0, 1.5);
      c.fillStyle = '#4fc3f7';
      c.beginPath();
      c.moveTo(-10, 10); c.quadraticCurveTo(-15, -h * 0.6, -22, -h);
      c.quadraticCurveTo(0, -h - 12, 22, -h); c.quadraticCurveTo(15, -h * 0.6, 10, 10);
      c.closePath(); c.fill();
      for (let i = 0; i < 6; i++) {
        const ph = (clock * 2.4 + i / 6) % 1;
        dot(c, (i % 2 === 0 ? 1 : -1) * (12 + i * 6) * ph, -h + ph * ph * 80, 4, '#e1f5fe');
      }
      break;
    }
    case 'golden-fish': {
      const arc = Math.abs(Math.sin(clock * 2.7));
      oval(c, Math.cos(clock * 2.7) * 30, -20 - arc * 68, 22, 12, '#ffd43b', Math.sin(clock * 2.7) * 0.45, 2.6);
      break;
    }
    case 'bee-swarm': {
      for (let i = 0; i < 6; i++) {
        const a = clock * 3.1 + (i * Math.PI) / 3;
        oval(c, Math.cos(a) * (40 + (i % 2) * 16), -44 + Math.sin(a * 2) * 16, 7.5, 5, '#ffd43b', 0, 1.8);
      }
      break;
    }
    case 'yalda-table': {
      c.fillStyle = '#a61e4d'; c.lineWidth = 2.8;
      c.beginPath(); c.roundRect(-44, -10, 88, 26, 6); c.fill(); c.stroke();
      circ(c, -16, -15, 11, '#fa5252', 2);
      circ(c, 12, -15, 6.5, '#c92a2a', 1.8);
      circ(c, 22, -15, 6.5, '#c92a2a', 1.8);
      break;
    }
    case 'contract-rip': {
      const sp = 14 + Math.abs(Math.sin(clock * 3.2)) * 26;
      for (const dir of [-1, 1] as const) {
        c.save();
        c.translate(dir * sp, -50 + Math.sin(clock * 5 + dir) * 7);
        c.rotate(dir * 0.34);
        c.fillStyle = '#fff9db'; c.lineWidth = 2.2;
        c.beginPath(); c.roundRect(-12, -16, 24, 32, 3); c.fill(); c.stroke();
        c.restore();
      }
      break;
    }
    case 'runaway-rooster': {
      // خروس شیطان با بال‌زدن تند و پرهای معلق از جلو صحنه می‌دود!
      const rx = Math.sin(clock * 2.1) * 92;
      const dir = Math.cos(clock * 2.1) >= 0 ? 1 : -1;
      const hop = Math.abs(Math.sin(clock * 11)) * 11;
      c.save();
      c.translate(rx, 14 - hop);
      c.scale(dir, 1);
      oval(c, 0, 0, 15, 11, '#d97236', 0.08, 2.4);
      oval(c, -12, -8, 6, 11, '#2b4a3e', -0.6, 2);
      circ(c, 12, -10, 7, '#d97236', 2.2);
      oval(c, 13, -18, 4.5, 3, '#e8302a', 0, 1.8);
      shape(c, [[18, -11], [25, -9], [18, -7]], { fill: '#ffae2b', smooth: false, line: 1.8 });
      oval(c, -1, -2 + Math.sin(clock * 18) * 5, 9, 5.5, '#a85220', -0.3, 2);
      ln(c, [[-3, 10], [-7, 17]], 2.4, '#e8962a');
      ln(c, [[4, 10], [8, 17]], 2.4, '#e8962a');
      c.restore();
      for (let f = 0; f < 3; f++) {
        const fx = rx - dir * (24 + f * 18);
        const fy = 4 - Math.sin(clock * 4 + f * 2) * 9;
        oval(c, fx, fy, 4.5, 2.2, f % 2 ? '#fff4d8' : '#d97236', clock * 2 + f, 1.4);
      }
      break;
    }
    case 'flying-ledger': {
      // پرتاب کمیک برگه‌های دفترچه و استکان چای در هوا همراه با کلاغ بازیگوش!
      for (let i = 0; i < 3; i++) {
        const a = clock * 2.6 + i * 2.1;
        c.save();
        c.translate(Math.cos(a) * (28 + i * 12), -56 - Math.abs(Math.sin(a * 1.4)) * 26);
        c.rotate(Math.sin(a) * 0.65);
        c.fillStyle = '#fff9db'; c.lineWidth = 2;
        c.beginPath(); c.roundRect(-9, -12, 18, 24, 3); c.fill(); c.stroke();
        circ(c, 0, 4, 2.8, '#d64545', 1.2);
        c.restore();
      }
      const cx2 = Math.sin(clock * 1.7) * 76;
      const cy2 = -92 + Math.cos(clock * 3.4) * 10;
      oval(c, cx2, cy2, 11, 6, '#2b2d42', 0, 2);
      ln(c, [[cx2 - 8, cy2], [cx2 - 16, cy2 - 8 + Math.sin(clock * 15) * 7]], 2.6, '#2b2d42');
      ln(c, [[cx2 + 8, cy2], [cx2 + 16, cy2 - 8 + Math.sin(clock * 15) * 7]], 2.6, '#2b2d42');
      break;
    }
    case 'kaveh-drone': {
      // پهپاد چهارملخهٔ مهندس کاوه با حرکت هشت‌انگلیسی و قطرات آبیاری در هوا
      const dx = Math.sin(clock * 2.2) * 74;
      const dy = -86 + Math.sin(clock * 4.4) * 14;
      c.save();
      c.translate(dx, dy);
      c.rotate(Math.cos(clock * 2.2) * 0.14);
      ln(c, [[-24, -4], [24, -4]], 3.2, '#495057');
      oval(c, 0, 0, 13, 8, '#3bc9db', 0, 2.4);
      const spin = Math.abs(Math.sin(clock * 22)) * 12 + 4;
      oval(c, -24, -7, spin, 2.4, '#e9ecef', 0, 1.5);
      oval(c, 24, -7, spin, 2.4, '#e9ecef', 0, 1.5);
      circ(c, 0, 2, 3.2, '#ffd43b', 1.4);
      c.restore();
      for (let k = 0; k < 4; k++) {
        const dropP = (clock * 2.2 + k * 0.25) % 1;
        dot(c, dx + (k - 1.5) * 9, dy + 10 + dropP * 44, 2.8, '#74c0fc');
      }
      break;
    }
    case 'sky-lanterns': {
      // فانوس‌های گرم آسمانی و شهاب‌سنگ طلایی بر فراز دره
      for (let i = 0; i < 4; i++) {
        const up = ((clock * 0.35 + i * 0.27) % 1);
        const lx = -84 + i * 56 + Math.sin(clock * 1.6 + i) * 12;
        const ly = -34 - up * 96;
        c.save();
        c.translate(lx, ly);
        c.fillStyle = 'rgba(255,212,59,0.24)';
        c.beginPath(); c.arc(0, 0, 16, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ff922b'; c.lineWidth = 2;
        c.beginPath(); c.roundRect(-8, -11, 16, 20, 4); c.fill(); c.stroke();
        circ(c, 0, 6, 3.2, '#fff3bf', 1.2);
        c.restore();
      }
      const st = (clock * 0.55) % 1;
      if (st < 0.45) {
        const u = st / 0.45;
        const sx = -110 + u * 220, sy = -128 + u * 34;
        ln(c, [[sx - 24, sy - 4], [sx, sy]], 2.6, 'rgba(255,243,191,0.85)');
        circ(c, sx, sy, 3.8, '#ffd43b', 1.4);
      }
      break;
    }
    case 'river-leap': {
      // پرش قوس‌دار ماهی‌های نقره‌ای و قورباغهٔ لب رودخانه
      for (const dir of [-1, 1] as const) {
        const p = (clock * 0.85 + (dir > 0 ? 0.5 : 0)) % 1;
        const fx = dir * (-54 + p * 108);
        const fy = 12 - Math.sin(p * Math.PI) * 58;
        oval(c, fx, fy, 13, 6.5, dir > 0 ? '#74c0fc' : '#ffd43b', dir * (p - 0.5) * 1.1, 2.2);
      }
      const fh = Math.abs(Math.sin(clock * 4.2)) * 12;
      oval(c, 64, 16 - fh, 9, 6.5, '#51cf66', 0, 2);
      dot(c, 67, 12 - fh, 1.8, INK);
      break;
    }
  }
  c.restore();
}
