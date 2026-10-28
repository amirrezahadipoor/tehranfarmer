// ===== جلوه‌های دیداری زندهٔ مزرعه: پیش‌نمایش شعاع ضربهٔ ابزار (AoE)، خاک طلایی، چاه قطره‌ای و دام‌ها =====
import { TW, TH, cached, ell, iconPart, ln, put, shape, type Ctx } from './art';
import { ANIMALS, COLS, ROWS, fa, isUnlocked } from './data';
import { FIELD_X, FIELD_Y, PLOT_DX, PLOT_DY } from './scenes';
import { S, UI, canAct, cureAnimal, playerToolPlots, toast, type AnimalS } from './state';
import { isReducedMotion } from './settings';
import { sfx } from './sound';
import { GT } from '../strings/gameText';

// بچه‌دام‌ها کوچک‌تر از بالغ‌اند، اما روی موبایل هم باید چشم و گونه‌شان خوانا بماند.
const BABY_SCALE = 0.74;

/** مقیاس رسم دام: بچه‌دام‌ها کوچکتر و بامزه‌تر از بالغ‌ها دیده می‌شوند */
export function liveAnimalScale(baseScale: number, st?: AnimalS): number {
  return st && st.grown > 0 ? baseScale * BABY_SCALE : baseScale;
}

/** تعامل زنده با دام روی چمن مزرعه: درمان فوری دام بی‌حال یا نوازش با نمایش جنسیت و وضعیت */
export function handleFarmAnimalTap(st: AnimalS): 'collect' | 'handled' {
  if (st.ready > 0 && st.kind !== 'chicken' && st.kind !== 'duck') return 'collect';
  if (st.sick) {
    if (cureAnimal(st.id)) sfx.fanfare();
    else { UI.modal = 'animal'; sfx.tap(); }
    return 'handled';
  }
  sfx.cluck();
  const def = ANIMALS[st.kind];
  if (st.grown > 0) {
    toast(st.kind, `${def.baby}${GT.petBabyToast}${fa(Math.ceil(st.grown))}${GT.petBabyEnd}`);
  } else {
    toast(st.kind, `${def.fa}${st.sex === 'f' ? GT.petFemaleToast : GT.petMaleToast}`);
  }
  return 'handled';
}

/** رسم نشانگر وضعیت بیماری بالای سر دام در مزرعه */
export function drawAnimalStatusExtra(ctx: Ctx, x: number, y: number, h: number, sc: number, t: number, seed: number, st?: AnimalS) {
  if (!st?.sick) return;
  const by = y - h * sc - 22 + (isReducedMotion() ? 0 : Math.sin(t * 4.2 + seed) * 2.5);
  shape(ctx, ell(x, by, 16, 15, 10), { fill: '#eef8ff', line: 2.6 });
  ln(ctx, [[x - 6, by], [x + 6, by]], 4.2, '#e04f4f');
  ln(ctx, [[x, by - 6], [x, by + 6]], 4.2, '#e04f4f');
}

/** رسم درخشش خاک طلایی، لوله‌کشی چاه قطره‌ای و پیش‌نمایش زندهٔ کرت‌های هدف ابزار بازیکن */
export function drawFieldUpgradesAndHover(ctx: Ctx, t: number, hoverPlot: number) {
  if (S.lv.soil > 0) {
    const soilLayer = cached(`soil-flecks:${S.lv.soil}:${S.lv.land}`, COLS * PLOT_DX, ROWS * PLOT_DY, 0, 0, (sc) => {
      const flecks = S.lv.soil * 2;
      sc.fillStyle = 'rgba(255,214,74,0.68)';
      for (let i = 0; i < COLS * ROWS; i++) {
        if (!isUnlocked(i, S.lv.land)) continue;
        const x0 = (i % COLS) * PLOT_DX, y0 = Math.floor(i / COLS) * PLOT_DY;
        for (let k = 0; k < flecks; k++) {
          const px = x0 + 18 + ((i * 19 + k * 29) % (TW - 36));
          const py = y0 + 16 + ((i * 13 + k * 23) % (TH - 28));
          sc.beginPath(); sc.arc(px, py, 2.1, 0, 6.3); sc.fill();
        }
      }
    });
    put(ctx, soilLayer, FIELD_X, FIELD_Y, 1);
  }

  if (S.wellLv > 0) {
    ln(ctx, [[392, FIELD_Y - 12], [FIELD_X + COLS * PLOT_DX - 10, FIELD_Y - 12]], 4.5, '#5c6f7e');
    ln(ctx, [[392, FIELD_Y - 12], [FIELD_X + COLS * PLOT_DX - 10, FIELD_Y - 12]], 2.2, '#9ec9e6');
    for (let i = 0; i < S.wellLv; i++) put(ctx, iconPart('star'), 374 - (S.wellLv - 1) * 8 + i * 16, 146, 0.3);
  }

  if (hoverPlot < 0 || hoverPlot >= COLS * ROWS || !isUnlocked(hoverPlot, S.lv.land) || UI.modal || UI.info) return;
  const targets = UI.tool === 'hand' ? [hoverPlot] : playerToolPlots(hoverPlot, UI.tool);
  ctx.save();
  for (let n = 0; n < targets.length; n++) {
    const idx = targets[n];
    if (!isUnlocked(idx, S.lv.land)) continue;
    const cx = FIELD_X + (idx % COLS) * PLOT_DX + TW / 2;
    const cy = FIELD_Y + Math.floor(idx / COLS) * PLOT_DY + TH / 2;
    const ok = UI.tool === 'hand' || canAct(UI.tool, idx, n > 0) === '';
    ctx.strokeStyle = ok ? 'rgba(122,235,96,0.92)' : 'rgba(255,214,102,0.52)';
    ctx.lineWidth = n === 0 ? 3.4 : 2.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, TW * 0.44, TH * 0.42, 0, 0, 6.3);
    ctx.stroke();
  }
  void t;
  ctx.restore();
}

/** رسم مترسک تمام‌قد دست‌ساز مزرعه با ارتقای ستاره‌دار (از پیش کش‌شده در بوم برای صفر هزینهٔ برداری در هر فریم!) */
export function drawFullScarecrow(ctx: Ctx, mx: number, my: number, t: number, scLv: number) {
  const sway = isReducedMotion() ? 0 : Math.sin(t * 1.8) * 0.03;
  const base = cached('full-scarecrow-base', 72, 26, 36, 13, (c) => {
    c.scale(0.88, 0.88);
    c.fillStyle = 'rgba(40,30,10,.24)';
    c.beginPath(); c.ellipse(0, 5, 31, 9, 0, 0, 6.3); c.fill();
    shape(c, ell(0, 2, 23, 6.5, 10), { fill: '#e8c04f', hatch: 0.16, line: 2.3 });
    ln(c, [[-14, 3], [0, -8], [14, 3]], 4.2, '#8a5a28');
  });
  const body = cached(`full-scarecrow-top:${scLv}`, 106, 176, 53, 162, (c) => {
    c.scale(0.88, 0.88);
    ln(c, [[0, 2], [0, -116]], 7.5, '#503426'); ln(c, [[0, 2], [0, -116]], 4.2, '#a8742a');
    shape(c, [[-16, -46], [-4, -46], [-5, -13], [-17, -13]], { fill: '#8d623f', hatch: 0.14, smooth: false, line: 2.6 });
    shape(c, [[4, -46], [16, -46], [17, -13], [5, -13]], { fill: '#8d623f', hatch: 0.14, smooth: false, line: 2.6 });
    shape(c, [[-15, -33], [-8, -33], [-8, -23], [-15, -23]], { fill: '#e8b85c', smooth: false, line: 1.9 });
    shape(c, ell(-12, -8, 8, 4.8, 10), { fill: '#5c3b24', line: 2.4 });
    shape(c, ell(12, -8, 8, 4.8, 10), { fill: '#5c3b24', line: 2.4 });
    for (const lx of [-11, 11]) {
      ln(c, [[lx - 4, -13], [lx - 7, -17]], 2.5, '#f2c94c');
      ln(c, [[lx + 4, -13], [lx + 7, -17]], 2.5, '#f2c94c');
    }
    ln(c, [[-38, -80], [38, -80]], 7.2, '#503426'); ln(c, [[-38, -80], [38, -80]], 4, '#a8742a');
    shape(c, [[-34, -86], [-18, -86], [-18, -72], [-34, -73]], { fill: '#5b93d3', smooth: false, line: 2.5 });
    shape(c, [[18, -86], [34, -86], [34, -73], [18, -72]], { fill: '#5b93d3', smooth: false, line: 2.5 });
    for (const sgn of [-1, 1]) {
      ln(c, [[sgn * 34, -80], [sgn * 43, -86]], 2.9, '#f2c94c');
      ln(c, [[sgn * 34, -79], [sgn * 44, -77]], 2.9, '#fff0a6');
      ln(c, [[sgn * 34, -78], [sgn * 42, -70]], 2.9, '#e8b838');
    }
    shape(c, [[-20, -88], [20, -88], [17, -44], [-17, -44]], { fill: '#5b93d3', hatch: 0.12, smooth: false, line: 2.8 });
    shape(c, [[-11, -90], [11, -90], [0, -77]], { fill: '#e0584d', smooth: false, line: 2.2 });
    shape(c, [[-14, -62], [-4, -62], [-4, -50], [-14, -50]], { fill: '#ffd93b', smooth: false, line: 2 });
    ln(c, [[-18, -64], [18, -64]], 3.6, '#c8924e');
    shape(c, ell(0, -112, 16, 16, 12), { fill: '#f5dc84', line: 3 });
    ln(c, [[-7, -116], [-3, -112]], 2.2, '#503426'); ln(c, [[-3, -116], [-7, -112]], 2.2, '#503426');
    ln(c, [[3, -116], [7, -112]], 2.2, '#503426'); ln(c, [[7, -116], [3, -112]], 2.2, '#503426');
    ln(c, [[-7, -105], [0, -101], [7, -105]], 2.2, '#503426');
    shape(c, ell(0, -125, 29, 6.5, 12), { fill: '#c99b52', line: 2.8 });
    shape(c, [[-15, -125], [0, -150], [15, -125]], { fill: '#d6ac63', smooth: false, hatch: 0.14, line: 2.8 });
    ln(c, [[-13, -127], [13, -127]], 3, '#c8433a');
    if (scLv > 0) {
      shape(c, [[-10, -78], [0, -86], [10, -78], [0, -63]], { fill: '#ffd93b', smooth: false, line: 2.4 });
      for (let i = 0; i < scLv; i++) put(c, iconPart('star'), -(scLv - 1) * 9 + i * 18, -158, 0.32);
    }
  });
  put(ctx, base, mx, my, 1);
  put(ctx, body, mx, my, 1, sway);
}
