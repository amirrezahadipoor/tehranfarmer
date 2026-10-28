// ===== هوش حرکتی زنده و بدون باگ کارگران در هر ۳ مزرعه + دامداری، رودخانه و زنبورستان =====
import { PEN_KINDS, type AnimalKind, type CropId } from './data';
import { ESTATES, estatePlotCenter, isEstateOwned, isFarmScene } from './estates';
import { makeAnimal, poseAnimal } from './rig';
import { HIVE_SLOTS, PEN_SLOTS, RIVER_SPOTS } from './scenes';
import { S, UI, activeFarm, canAct, ghCoversFarm, invCap, invCount, pickSeed, plotsForFarm } from './state';
import { rnd } from './rng';
import { FEED_TROUGH, STRAW_NEST, hasGrazingLivestock, isPoultry, pendingStrawEggs, unifiedPondGeom } from './farmZones';
import type { AR, Task, Walker } from './engineRender';

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

function claimedByPeers(allWorkers: Walker[], selfIdx: number) {
  const plots = new Set<number>();
  const kinds = new Set<string>();
  const anims = new Set<number>();
  const seedUsed = new Map<CropId, number>();
  allWorkers.forEach((peer, idx) => {
    if (idx === selfIdx) return;
    const tasks = peer.cur ? [peer.cur, ...peer.tasks] : peer.tasks;
    for (const q of tasks) {
      if (q.plot !== undefined) plots.add(q.plot);
      kinds.add(q.kind);
      if (q.animal !== undefined) anims.add(q.animal);
      if (q.kind === 'plant' && q.seed) seedUsed.set(q.seed, (seedUsed.get(q.seed) ?? 0) + 1);
    }
  });
  return { plots, kinds, anims, seedUsed };
}

function tryAssignRanchWork(
  w: Walker,
  claimed: ReturnType<typeof claimedByPeers>,
  mkTask: (kind: string, x: number, y: number, extra?: Partial<Task>) => Task,
): boolean {
  if (
    !claimed.kinds.has('feed') &&
    hasGrazingLivestock() &&
    S.trough < 6 &&
    ((S.inv.feed ?? 0) + (S.inv.wheat ?? 0) + (S.inv.corn ?? 0)) > 0
  ) {
    w.wait = 0;
    w.tasks.push(mkTask('feed', FEED_TROUGH.walkX, FEED_TROUGH.walkY, { face: -1 }));
    return true;
  }
  if (!claimed.kinds.has('straw') && pendingStrawEggs() > 0 && invCount() < invCap()) {
    w.wait = 0;
    w.tasks.push(mkTask('straw', STRAW_NEST.walkX, STRAW_NEST.walkY, { face: -1, dur: 0.65, hit: 0.4 }));
    return true;
  }
  if (invCount() < invCap()) {
    const ready = S.animals.find((q) => !isPoultry(q.kind) && q.grown <= 0 && q.ready > 0 && !claimed.anims.has(q.id));
    if (ready) {
      const pr = penRect(ready.kind);
      const gateY = pr.y0 < 350 ? pr.y0 - 4 : pr.y1 + 10;
      w.wait = 0;
      w.tasks.push(mkTask('collect', (pr.x0 + pr.x1) * 0.5, gateY, { animal: ready.id }));
      return true;
    }
  }
  return false;
}

export function planLiveWorker(
  w: Walker,
  wi: number,
  t: number,
  mkTask: (kind: string, x: number, y: number, extra?: Partial<Task>) => Task,
  plotTask: (kind: string, i: number, player: boolean, seed?: CropId) => Task,
  moveTo: (w: Walker, x: number, y: number, clearQ?: boolean) => void,
  allWorkers: Walker[] = [],
) {
  if (wi >= S.workers || w.cur || w.tasks.length || S.hour < 6 || S.hour > 21) return;
  const claimed = claimedByPeers(allWorkers, wi);
  const role = S.crewRole ?? 'balanced';

  if (UI.scene === 'river') {
    const g = unifiedPondGeom();
    w.wait = 0;
    if (S.ponds.length > 0 && !claimed.kinds.has('pondwork') && rnd() < 0.5) {
      w.tasks.push(mkTask('pondwork', g.cx + (wi - 1) * 56, 498, { dur: 0.9, hit: 0.5 }));
    } else if (invCount() < invCap()) {
      const sp = RIVER_SPOTS[(wi + Math.floor(t * 0.2)) % RIVER_SPOTS.length];
      w.tasks.push(mkTask('fish', sp.x - 16, 494, { face: 1 }));
    } else {
      moveTo(w, 620 + wi * 70, 496, false);
      w.wait = 1.6;
    }
    return;
  }

  if (UI.scene === 'apiary') {
    const hi = S.hives > 0 ? wi % S.hives : 0;
    const sp = HIVE_SLOTS[hi] ?? { x: 480, y: 440 };
    w.wait = 0;
    w.tasks.push(mkTask('hivework', sp.x + 18, 622, { face: -1, dur: 0.85, hit: 0.5 }));
    return;
  }

  if (!isFarmScene(UI.scene)) return;
  const farm = activeFarm();
  if (!isEstateOwned(farm, S.lv.land)) return;

  // روی مزرعهٔ اصلی: احترام کامل به نقش انتخابی خدمه (همه‌جانبه / کشت / دامداری)
  if (farm === 'farm' && role !== 'crops' && tryAssignRanchWork(w, claimed, mkTask)) {
    return;
  }

  // انتخاب نزدیک‌ترین کرت آزاد با اولویت هوشمند (برداشت > آبیاری تشنه‌ها > کاشت > شخم > کوددهی)
  const arr = plotsForFarm(farm);
  const total = ESTATES[farm].cols * ESTATES[farm].rows;
  const bagFull = invCount() >= invCap();
  for (const kind of ['harvest', 'water', 'plant', 'till', 'fert'] as const) {
    if (kind === 'harvest' && bagFull) continue;
    let bestIdx = -1;
    let bestSeed: CropId | undefined;
    let bestDist = Infinity;
    for (let i = 0; i < total; i++) {
      if (claimed.plots.has(i)) continue;
      const p = arr[i];
      if (!p) continue;
      if (kind === 'water' && (p.st !== 2 || p.dead || p.water >= 0.5)) continue;
      const seed = kind === 'plant' ? (pickSeed(ghCoversFarm(farm, i), farm) ?? undefined) : undefined;
      if (kind === 'plant') {
        if (!seed) continue;
        const left = (S.seeds[seed] ?? 0) - (claimed.seedUsed.get(seed) ?? 0);
        if (left <= 0) continue;
      }
      if (canAct(kind, i, true, seed, farm) !== '') continue;
      const { cx, cy } = estatePlotCenter(farm, i);
      const d = Math.hypot(cx - w.x, cy - w.y);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
        bestSeed = seed;
      }
    }
    if (bestIdx >= 0) {
      w.wait = 0;
      w.tasks.push(plotTask(kind, bestIdx, false, bestSeed));
      return;
    }
  }

  if (farm === 'farm' && role === 'crops' && tryAssignRanchWork(w, claimed, mkTask)) {
    return;
  }

  const spec = ESTATES[farm];
  w.wait = 1.8 + rnd() * 2.2;
  moveTo(w, spec.fx + 30 + rnd() * Math.max(40, spec.cols * spec.dx - 80), 236 + rnd() * 20, false);
}

export function placeActorsForScene(to: string, from: string | null, farmer: Walker, workers: Walker[]) {
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
  for (let wi = 0; wi < workers.length; wi++) {
    const w = workers[wi];
    w.cur = null; w.tasks = []; w.wait = 0.2;
    if (to === 'river') { w.x = 380 + wi * 165; w.y = 496; }
    else if (to === 'apiary') { w.x = 380 + wi * 175; w.y = 622; }
    else if (to === 'cave' || to === 'forest') { w.x = 238 + wi * 92; w.y = 592; }
    else if (to === 'north' || to === 'valley') { w.x = 268 + wi * 95; w.y = 248; }
    else { w.x = 402 + wi * 62; w.y = 238; }
  }
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
