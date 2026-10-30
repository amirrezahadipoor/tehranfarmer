// ===== هوش حرکتی زنده و بدون باگ کارگران در هر ۳ مزرعه + دامداری، رودخانه و زنبورستان =====
import { PEN_KINDS, type AnimalKind } from './data';
import type { FarmSceneId } from './estates';
import { makeAnimal, poseAnimal } from './rig';
import { PEN_SLOTS } from './scenes';
import { S } from './state';
import { rnd } from './rng';
import { unifiedPondGeom } from './farmZones';
import type { AR, Walker } from './engineRender';

/** مسیر خشک‌زمینی دور حوضچهٔ پرورش ماهی رودخانه تا کشاورز هرگز از وسط آب حوضچه عبور نکند */
export function routeRiverWalkWaypoints(wx: number, wy: number, x: number, y: number): Array<[number, number]> {
  const pg = unifiedPondGeom();
  if (x > pg.x0 - 26 && x < pg.x1 + 26 && Math.abs(y - pg.cy) < 50) y = y <= pg.cy ? pg.cy - 68 : pg.cy + 58;
  const pts: Array<[number, number]> = [];
  if ((wy < pg.cy - 20 && y > pg.cy + 20) || (wy > pg.cy + 20 && y < pg.cy - 20)) {
    const midX = (wx + x) * 0.5;
    if (midX > pg.x0 - 24 && midX < pg.x1 + 24) {
      const dxL = Math.max(46, pg.x0 - 34), dxR = Math.min(1238, pg.x1 + 34);
      const detourX = Math.abs(wx - dxL) <= Math.abs(wx - dxR) ? dxL : dxR;
      pts.push([detourX, wy], [detourX, y]);
    }
  }
  pts.push([x, y]);
  return pts;
}

export const penRect = (kind: AnimalKind) => PEN_SLOTS[Math.max(0, PEN_KINDS.indexOf(kind))] ?? PEN_SLOTS[0];

/** کارگر تازه‌ایستاده یا تغییرپست‌داده‌ شده فقط روی همان مزرعهٔ کاری قرار می‌گیرد. */
export function placeWorkerAtPost(w: Walker, wi: number, post: FarmSceneId) {
  w.post = post;
  w.cur = null; w.tasks = []; w.wait = 0.2; w.mode = 'idle'; w.kind = '';
  if (post === 'farm') { w.x = 402 + (wi % 5) * 62; w.y = 238 + (wi % 2) * 18; }
  else { w.x = 268 + (wi % 5) * 95; w.y = 248 + (wi % 2) * 18; }
}

export function placeActorsForScene(to: string, from: string | null, farmer: Walker) {
  if (to === 'town') { farmer.x = 152; farmer.y = 616; farmer.face = 1; }
  else if (to === 'north' || to === 'valley') { farmer.x = 186; farmer.y = 582; farmer.face = 1; }
  else if (to === 'river') { farmer.x = from === 'cave' ? 168 : 1138; farmer.y = 534; farmer.face = from === 'cave' ? 1 : -1; }
  else if (to === 'apiary') { farmer.x = from === 'forest' ? 168 : 1132; farmer.y = 620; farmer.face = from === 'forest' ? 1 : -1; }
  else if (to === 'cave') { farmer.x = 168; farmer.y = 598; farmer.face = 1; }
  else if (to === 'forest') { farmer.x = 168; farmer.y = 602; farmer.face = 1; }
  else if (from === 'north') { farmer.x = 818; farmer.y = 228; farmer.face = -1; }
  else if (from === 'valley') { farmer.x = 1136; farmer.y = 486; farmer.face = -1; }
  else if (from === 'river') { farmer.x = 152; farmer.y = 606; farmer.face = 1; }
  else if (from === 'apiary') { farmer.x = 308; farmer.y = 602; farmer.face = -1; }
  else if (from) { farmer.x = 1142; farmer.y = 338; farmer.face = -1; }
  else { farmer.x = 404; farmer.y = 356; farmer.face = 1; }
  // کارگران این‌جا عمداً دست نمی‌خورند: سفرِ بازیکن نه پست، نه مسیر و نه وظیفهٔ تصویری آن‌ها را پاک نمی‌کند.
  farmer.cur = null; farmer.tasks = []; farmer.mode = 'idle';
}

export function syncLiveAnimals(animals: Map<number, AR>) {
  for (let idx = 0; idx < S.animals.length; idx++) {
    const a = S.animals[idx];
    if (!animals.has(a.id)) {
      const k = a.kind;
      const pr = penRect(k);
      const rig = makeAnimal(k, a.hue, a.sex);
      poseAnimal(rig, { mode: 'idle', ph: 0, t: 0, seed: 0 });
      const minX = pr.x0 + (k === 'chicken' ? 104 : 64), maxX = pr.x1 - 22;
      const slotFrac = ((idx * 37) % 100) / 100;
      animals.set(a.id, {
        id: a.id,
        kind: k,
        rig,
        x: minX + slotFrac * Math.max(12, maxX - minX),
        y: pr.y0 + 38 + rnd() * Math.max(6, pr.y1 - pr.y0 - 46),
        face: rnd() < 0.5 ? 1 : -1,
        mode: 'idle',
        timer: rnd() * 2,
        tx: 0,
        ty: 0,
        ph: 0,
        seed: rnd() * 10,
        sc: k === 'chicken' ? 0.96 : k === 'duck' ? 0.76 : k === 'rabbit' ? 0.6 : k === 'cow' ? 0.52 : 0.55,
      });
    }
  }
  if (animals.size !== S.animals.length) {
    for (const id of [...animals.keys()]) {
      if (!S.animals.some((a) => a.id === id)) animals.delete(id);
    }
  }
}

export function stepLiveBuilder(
  builder: Walker,
  bph: 'off' | 'walk' | 'work' | 'exit',
  site: { x: number; y: number },
  dt: number,
  stepW: (w: Walker, dt: number) => void,
  onDust: (x: number, y: number, col: string, n: number) => void,
  onDone: (id: number) => void,
): 'off' | 'walk' | 'work' | 'exit' {
  const job = S.builds[0];
  if (bph === 'off') {
    if (!job) return 'off';
    builder.tasks = []; builder.cur = null; builder.mode = 'idle'; builder.kind = '';
    builder.x = 1290; builder.y = 340; builder.face = -1;
    builder.tasks.push({ kind: 'move', x: site.x, y: site.y, face: 0, dur: 0, hit: 0 });
    return 'walk';
  }
  let next = bph;
  if (!job && next !== 'exit') {
    next = 'exit';
    builder.mode = 'idle'; builder.kind = ''; builder.tasks = []; builder.cur = null;
    builder.tasks.push({ kind: 'move', x: 1290, y: 340, face: 0, dur: 0, hit: 0 });
  }
  stepW(builder, dt);
  if (next === 'walk' && !builder.cur && !builder.tasks.length) { next = 'work'; builder.kind = 'build'; builder.mode = 'act'; builder.p = 0; }
  if (next === 'work' && job) {
    builder.kind = 'build'; builder.mode = 'act'; builder.p = (builder.p + dt * 1.2) % 1;
    job.prog += dt;
    if (rnd() < dt * 3) onDust(site.x + (rnd() - 0.5) * 70, site.y + (rnd() - 0.5) * 30, '#c8924e', 2);
    if (job.prog >= job.dur) { onDone(job.id); builder.mode = 'idle'; builder.kind = ''; }
  }
  if (next === 'exit' && !builder.cur && !builder.tasks.length) return 'off';
  return next;
}

export function stepLiveAnimal(a: AR, dt: number, t: number) {
  const spd = a.kind === 'chicken' ? 38 : a.kind === 'sheep' ? 26 : 20;
  if (a.mode === 'walk') {
    const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
    if (d < 3) { a.mode = 'idle'; a.timer = 1 + rnd() * 3; }
    else {
      a.x += (dx / d) * spd * dt;
      a.y += (dy / d) * spd * dt;
      a.ph += spd * dt * (a.kind === 'chicken' ? 0.2 : 0.09);
      if (Math.abs(dx) > 2) a.face = dx > 0 ? 1 : -1;
    }
  } else {
    a.timer -= dt;
    if (a.timer <= 0) {
      const r = rnd();
      if (r < 0.5) {
        const pr = penRect(a.kind);
        a.mode = 'walk';
        const minX = pr.x0 + (a.kind === 'chicken' ? 104 : 64), maxX = pr.x1 - 22;
        a.tx = minX + rnd() * Math.max(10, maxX - minX);
        a.ty = pr.y0 + 38 + rnd() * Math.max(6, pr.y1 - pr.y0 - 46);
      } else if (r < 0.8) { a.mode = 'graze'; a.timer = 2 + rnd() * 3; }
      else { a.mode = 'idle'; a.timer = 1 + rnd() * 2; }
    }
  }
  poseAnimal(a.rig, { mode: a.mode, ph: a.ph, t, seed: a.seed });
}
