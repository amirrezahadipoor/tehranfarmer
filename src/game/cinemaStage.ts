// Real-time In-Engine Cinematic Stage: drives LIVE world Walker rigs, 12-bone procedural acting,
// camera pan/zoom/shake, letterbox bars, cross-scene transitions, and a zero-GC 48-slot particle pool.
import { toolPart, iconPart, put, type Ctx } from './art';
import { drawFarmer, poseFarmer, type FarmerRig } from './rig';
import { drawActorFaceOverlay, drawCinemaSetPiece, safePropName } from './cinemaArt';
import { safeSceneMark } from './npcLabels';
export { safeSceneMark };
import { playCinemaCue, playVoiceBlip, setMusicDuck } from './cinemaAudio';
import { UI, notify } from './state';
import { isReducedMotion } from './settings';
import type { CharId } from '../story/types';
import type { ActPose, BeatStep, EmoteKind, ParticleKind, SceneArea, SceneScript } from '../story/cinemaTypes';
import type { Walker } from './engineRender';

export type RealActorId = Exclude<CharId, 'narrator'>;

interface ActorSaved {
  x: number;
  y: number;
  face: number;
}

interface ActorStageState {
  staged: boolean;
  area: SceneArea;
  x: number;
  y: number;
  tx: number;
  ty: number;
  face: number;
  pose: ActPose;
  prop: string;
  emote: EmoteKind | null;
  emoteT: number;
  squashT: number;
  jumpY: number;
  actionArc: number;
  talking: boolean;
}

interface PoolParticle {
  active: boolean;
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  life: number;
  max: number;
  scale: number;
}

const POOL_SIZE = 48;
const ACTORS: RealActorId[] = ['player', 'grandma', 'sara', 'engineer', 'rancher', 'jahangir', 'carpenter', 'estateAgent'];

const pool: PoolParticle[] = Array.from({ length: POOL_SIZE }, () => ({
  active: false, kind: 'star', x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0, life: 0, max: 1, scale: 1,
}));

const mkSlot = (): ActorStageState => ({
  staged: false, area: 'farm', x: 640, y: 460, tx: 640, ty: 460, face: 1,
  pose: 'idle', prop: '', emote: null, emoteT: 0, squashT: 0, jumpY: 0, actionArc: 0, talking: false,
});

const slots: Record<RealActorId, ActorStageState> = {
  player: mkSlot(),
  grandma: mkSlot(),
  sara: mkSlot(),
  engineer: mkSlot(),
  rancher: mkSlot(),
  jahangir: mkSlot(),
  carpenter: mkSlot(),
  estateAgent: mkSlot(),
};

let savedSnapshot: Partial<Record<RealActorId, ActorSaved>> | null = null;
let savedScene: SceneArea | null = null;

interface WorldBinding {
  farmer: Walker;
  jahangir: Walker;
  npcs: Walker[];
  builder: Walker;
}
let world: WorldBinding | null = null;

export const cinema = {
  active: false,
  script: null as SceneScript | null,
  beatIdx: 0,
  camX: 640,
  camY: 360,
  targetX: 640,
  targetY: 360,
  zoom: 1,
  targetZoom: 1,
  shake: 0,
  letterbox: 0,
  fadeAlpha: 0,
  clock: 0,
  pauseLeft: 0,
  closingHold: 0,
  speaker: 'narrator' as CharId,
  mouthPhase: 0,
  viewSc: 1,
  viewTx: 0,
  viewTy: 0,
  viewCw: 1280,
  viewCh: 720,
  totalDistanceMoved: 0,
  maxArmSwingRad: 0,
  posesObserved: new Set<string>(),
};

function walkerOf(id: RealActorId): Walker | null {
  if (!world) return null;
  switch (id) {
    case 'player': return world.farmer;
    case 'jahangir': return world.jahangir;
    case 'grandma': return world.npcs[0] ?? null;
    case 'sara': return world.npcs[1] ?? null;
    case 'engineer': return world.npcs[2] ?? null;
    case 'rancher': return world.npcs[3] ?? null;
    // فروشندهٔ نجاری و کارشناس املاک فقط روی صحنهٔ داخلی SVG دیده می‌شوند؛ هیچ بدن اضافه‌ای در خیابان ساخته نمی‌شود.
    case 'carpenter':
    case 'estateAgent': return null;
  }
}

export function bindWorldActors(b: WorldBinding) {
  world = b;
}

export function spawnCinemaParticles(kind: ParticleKind, x: number, y: number, count: number) {
  let left = Math.min(count, 12);
  for (let i = 0; i < POOL_SIZE && left > 0; i++) {
    const p = pool[i];
    if (p.active) continue;
    const ang = ((left * 2.39996) % (Math.PI * 2));
    const spd = 42 + (left % 4) * 20;
    p.active = true;
    p.kind = kind;
    // ذرات فقط نزدیک زمین پا پخش می‌شوند و هرگز روی صورت کاراکترها قرار نمی‌گیرند!
    p.x = x + Math.cos(ang) * 28;
    p.y = y - 14 + Math.sin(ang) * 6;
    p.vx = Math.cos(ang) * spd;
    p.vy = -Math.abs(Math.sin(ang)) * 34 - 22;
    p.rot = ang;
    p.vr = (left % 2 === 0 ? 1 : -1) * 2.4;
    p.max = 0.72;
    p.life = p.max;
    p.scale = kind === 'dust' ? 0.95 : 0.48;
    left--;
  }
}

function clearPool() {
  for (let i = 0; i < POOL_SIZE; i++) pool[i].active = false;
}

export function beginSceneStage(script: SceneScript) {
  if (!savedSnapshot && world) {
    savedSnapshot = {};
    for (const id of ACTORS) {
      const w = walkerOf(id);
      if (w) savedSnapshot[id] = { x: w.x, y: w.y, face: w.face };
    }
    savedScene = UI.scene;
  }
  clearPool();
  for (const id of ACTORS) {
    slots[id].staged = false;
    slots[id].emote = null;
    slots[id].emoteT = 0;
    slots[id].squashT = 0;
    slots[id].jumpY = 0;
    slots[id].talking = false;
    slots[id].prop = '';
    slots[id].pose = 'idle';
  }
  UI.scene = script.area;
  for (const m of script.initialMarks) {
    const s = slots[m.actor];
    s.staged = true;
    s.area = script.area;
    const face = m.face ?? 1;
    const dst = safeSceneMark(script.area, m.x, m.y);
    const enter = safeSceneMark(script.area, dst.x - face * 64, dst.y);
    s.x = enter.x; s.y = enter.y; s.tx = dst.x; s.ty = dst.y;
    s.face = face;
    s.pose = 'walk';
    s.prop = safePropName(m.prop);
    const w = walkerOf(m.actor);
    if (w) { w.x = enter.x; w.y = enter.y; w.face = s.face; w.cur = null; w.tasks = []; w.mode = 'walk'; }
  }
  cinema.totalDistanceMoved = 0;
  cinema.maxArmSwingRad = 0;
  cinema.posesObserved = new Set<string>();
  cinema.active = true;
  cinema.script = script;
  cinema.beatIdx = 0;
  cinema.camX = script.establishingShot.x;
  cinema.camY = script.establishingShot.y;
  cinema.targetX = script.establishingShot.x;
  cinema.targetY = script.establishingShot.y;
  cinema.zoom = Math.max(1, script.establishingShot.zoom * 0.94);
  cinema.targetZoom = script.establishingShot.zoom;
  cinema.shake = script.establishingShot.shake ?? 0;
  cinema.fadeAlpha = 0.55;
  cinema.closingHold = 0;
  setMusicDuck(true);
  playCinemaCue('establish');
  applyBeatToStage(0);
  notify();
}

export function applyBeatToStage(idx: number) {
  const script = cinema.script;
  if (!script) return;
  const beat: BeatStep | undefined = script.beats[idx];
  if (!beat) return;
  cinema.beatIdx = idx;
  cinema.speaker = beat.who;
  cinema.pauseLeft = isReducedMotion() ? 0 : (beat.prePause ?? 0);

  if (beat.area && beat.area !== UI.scene && !(UI.scene === 'town' && beat.area === 'farm' && script.category !== 'prologue')) {
    UI.scene = beat.area;
    cinema.fadeAlpha = 0.72;
    for (const id of ACTORS) slots[id].staged = false;
    playCinemaCue('whoosh');
  }
  if (beat.marks) {
    for (const m of beat.marks) {
      const s = slots[m.actor];
      const face = m.face ?? s.face ?? 1;
      const dst = safeSceneMark(UI.scene, m.x, m.y);
      const enter = safeSceneMark(UI.scene, dst.x - face * 28, dst.y);
      s.staged = true;
      s.area = UI.scene;
      s.x = enter.x; s.y = enter.y; s.tx = dst.x; s.ty = dst.y;
      s.face = face;
      s.pose = 'walk';
      if (m.prop !== undefined) s.prop = safePropName(m.prop);
      const w = walkerOf(m.actor);
      if (w) { w.x = enter.x; w.y = enter.y; w.face = s.face; }
    }
  }
  for (const id of ACTORS) {
    slots[id].talking = id === beat.who;
    if (slots[id].pose !== 'walk') slots[id].pose = 'idle';
  }
  if (beat.move) {
    const s = slots[beat.move.actor];
    const dst = safeSceneMark(UI.scene, beat.move.toX, beat.move.toY);
    s.staged = true;
    s.area = UI.scene;
    s.tx = dst.x;
    s.ty = dst.y;
    s.face = beat.move.face ?? (dst.x >= s.x ? 1 : -1);
    s.pose = 'walk';
  }
  if (beat.who !== 'narrator') {
    const sp = slots[beat.who];
    sp.staged = true;
    sp.area = UI.scene;
    if (beat.pose && sp.pose !== 'walk') sp.pose = beat.pose;
    else if (sp.pose !== 'walk') sp.pose = 'talk';
    if (beat.prop !== undefined) sp.prop = safePropName(beat.prop);
    if (beat.emote) { sp.emote = beat.emote; sp.emoteT = 2.4; }
    // Automatically orient listener toward speaker for natural eye-lines
    for (const other of ACTORS) {
      if (other !== beat.who && slots[other].staged && slots[other].pose === 'idle') {
        slots[other].face = sp.x >= slots[other].x ? 1 : -1;
      }
    }
  }
  if (beat.react) {
    const r = slots[beat.react.actor];
    r.staged = true;
    r.area = UI.scene;
    if (beat.react.pose) r.pose = beat.react.pose;
    if (beat.react.emote) { r.emote = beat.react.emote; r.emoteT = 2.6; }
    if (beat.react.squash) r.squashT = 0.85;
  }
  cinema.targetX = beat.cam.x;
  cinema.targetY = beat.who !== 'narrator' && slots[beat.who].staged
    ? Math.max(205, Math.min(beat.cam.y, slots[beat.who].y - 68))
    : beat.cam.y;
  cinema.targetZoom = isReducedMotion() ? Math.min(1.22, beat.cam.zoom) : beat.cam.zoom;
  if (beat.cam.shake && !isReducedMotion()) cinema.shake = beat.cam.shake;
  if (beat.cue) playCinemaCue(beat.cue);
  if (beat.burst) {
    const ref = beat.burst.actor ? slots[beat.burst.actor] : null;
    spawnCinemaParticles(beat.burst.kind, beat.burst.x ?? ref?.x ?? beat.cam.x, beat.burst.y ?? ref?.y ?? beat.cam.y, beat.burst.count);
  }
}

export function enterClosingShot() {
  const script = cinema.script;
  if (!script) return;
  cinema.targetX = script.closingShot.x;
  cinema.targetY = script.closingShot.y;
  cinema.targetZoom = script.closingShot.zoom;
  cinema.speaker = 'narrator';
  for (const id of ACTORS) {
    slots[id].talking = false;
    if (slots[id].staged) slots[id].pose = id === 'player' ? 'cheer' : 'wave';
  }
  playCinemaCue('objective');
}

export function endSceneStage(restoreScene = true) {
  const curId = cinema.script?.id ?? '';
  const scriptArea = cinema.script?.area ?? null;
  const afterModal = cinema.script?.afterOpenModal ?? null;
  cinema.active = false;
  cinema.script = null;
  cinema.targetZoom = 1;
  cinema.zoom = 1;
  cinema.camX = 640;
  cinema.camY = 360;
  cinema.shake = 0;
  cinema.letterbox = 0;
  cinema.fadeAlpha = 0;
  cinema.pauseLeft = 0;
  clearPool();
  setMusicDuck(false);
  if (savedSnapshot && world) {
    for (const id of ACTORS) {
      const snap = savedSnapshot[id];
      const w = walkerOf(id);
      if (w && snap) {
        w.x = snap.x; w.y = snap.y; w.face = snap.face;
        w.rig.root.sx = 1; w.rig.root.sy = 1; w.rig.tool.p = undefined;
      }
      slots[id].staged = false;
    }
  }
  const keepDest = curId.startsWith('area-intro-') || curId.startsWith('shop-intro-');
  if (keepDest && scriptArea) UI.scene = scriptArea;
  else if (restoreScene && savedScene) UI.scene = savedScene;
  savedSnapshot = null;
  savedScene = null;
  if (afterModal) UI.modal = afterModal;
  notify();
}

export function notifyTypewriterStep(who: CharId, charIdx: number) {
  cinema.mouthPhase += 0.85;
  playVoiceBlip(who, charIdx);
}

function applyProceduralPose(rig: FarmerRig, st: ActorStageState, t: number) {
  rig.root.sx = 1;
  rig.root.sy = 1;
  st.jumpY = 0;
  st.actionArc = 0;
  if (st.pose === 'walk') {
    poseFarmer(rig, { mode: 'walk', ph: t * 9.5, t, kind: '', p: 0 });
  } else {
    poseFarmer(rig, { mode: 'idle', ph: 0, t, kind: '', p: 0 });
  }
  cinema.posesObserved.add(st.pose);
  switch (st.pose) {
    case 'wave':
      rig.armF.r = -2.35 + Math.sin(t * 9) * 0.46; rig.foreF.r = -0.45 + Math.cos(t * 9) * 0.3;
      rig.head.r = -0.09 + Math.sin(t * 4) * 0.05; st.jumpY = -Math.abs(Math.sin(t * 4.5)) * 6; break;
    case 'talk':
      rig.armF.r = -0.88 + Math.sin(t * 6.5) * 0.34; rig.armB.r = -0.42 - Math.cos(t * 6.5) * 0.22;
      rig.foreF.r = -0.62 + Math.cos(t * 6.5) * 0.2; rig.torso.r = 0.06; rig.head.r = Math.sin(t * 5.2) * 0.06; break;
    case 'explain':
      rig.armF.r = -1.25 + Math.sin(t * 5.6) * 0.4; rig.armB.r = -0.92 - Math.sin(t * 5.6) * 0.34;
      rig.foreF.r = -0.5; rig.foreB.r = -0.45; rig.torso.r = Math.sin(t * 2.8) * 0.07; break;
    case 'point':
    case 'club-point':
      rig.armF.r = -1.52 + Math.sin(t * 4.6) * 0.14; rig.foreF.r = -0.12; rig.torso.r = 0.11; break;
    case 'club-swing': {
      const sw = Math.sin(t * 8.2);
      rig.armF.r = -1.55 + sw * 1.12; rig.foreF.r = -0.18 + sw * 0.22; rig.torso.r = 0.2 * sw;
      st.jumpY = -Math.max(0, -sw) * 14; st.actionArc = Math.abs(sw) * 0.9; break;
    }
    case 'recoil':
      rig.armF.r = -2.4; rig.armB.r = -2.1; rig.torso.r = -0.25; rig.head.r = -0.18;
      st.jumpY = -Math.abs(Math.sin(t * 7.5)) * 16; break;
    case 'sigh':
      rig.torso.r = 0.24; rig.head.r = 0.28; rig.armF.r = 0.2; rig.torso.sy = 0.95 + Math.sin(t * 2) * 0.02; break;
    case 'cheer':
      rig.armF.r = -2.58 + Math.sin(t * 8.5) * 0.28; rig.armB.r = -2.48 - Math.sin(t * 8.5) * 0.28;
      st.jumpY = -Math.abs(Math.sin(t * 6.5)) * 20; break;
    case 'dance': {
      const b = Math.sin(t * 7.6);
      rig.armF.r = -2.2 + b * 0.72; rig.armB.r = -2.2 - b * 0.72; rig.legF.r = b * 0.42; rig.legB.r = -b * 0.42;
      rig.torso.r = b * 0.15; st.jumpY = -Math.abs(Math.cos(t * 7.6)) * 18; break;
    }
    case 'stamp': {
      const slam = Math.abs(Math.sin(t * 6.2));
      rig.armF.r = -2.05 + slam * 1.7; rig.torso.r = -0.08 + slam * 0.3; st.actionArc = slam * 0.7; break;
    }
    case 'dig':
    case 'work': {
      const ch = Math.sin(t * 6.2);
      rig.armF.r = -1.85 + ch * 1.1; rig.armB.r = -1.35 + ch * 0.85; rig.torso.r = 0.2 + ch * 0.2;
      st.actionArc = Math.max(0, ch) * 0.75; break;
    }
    case 'cast': {
      const pull = Math.sin(t * 5.6);
      rig.armF.r = -1.95 + pull * 0.65; rig.armB.r = -1.55 + pull * 0.5; rig.torso.r = -0.18 + pull * 0.14;
      st.jumpY = -Math.max(0, -pull) * 8; st.actionArc = 0.55; break;
    }
    case 'inspect':
      rig.torso.r = 0.34 + Math.sin(t * 3.2) * 0.05; rig.head.r = 0.22; rig.armF.r = -1.05 + Math.sin(t * 4) * 0.18; break;
    case 'present':
      rig.armF.r = -1.32 + Math.sin(t * 4.2) * 0.14; rig.armB.r = -1.18 + Math.sin(t * 4.2) * 0.14;
      rig.foreF.r = -0.4; rig.torso.r = 0.08; st.jumpY = -Math.abs(Math.sin(t * 4.2)) * 5; break;
    case 'think':
      rig.armF.r = -1.25; rig.foreF.r = -1.65; rig.head.r = 0.14; break;
    case 'bow':
      rig.torso.r = 0.38; rig.head.r = 0.24; rig.armF.r = 0.28; break;
    case 'laugh':
      rig.torso.sy = 1 + Math.sin(t * 14) * 0.06; rig.head.r = -0.15 + Math.sin(t * 14) * 0.05;
      rig.armF.r = -0.85 + Math.sin(t * 14) * 0.2; st.jumpY = -Math.abs(Math.sin(t * 7)) * 7; break;
  }
  if (st.squashT > 0) {
    const w = Math.sin(st.squashT * 18) * st.squashT * 0.3;
    rig.root.sx = 1 + w;
    rig.root.sy = Math.max(0.68, 1 - w);
  }
  rig.tool.p = st.prop ? toolPart(st.prop) : undefined;
  if (st.prop) {
    const freeSwing = st.pose === 'club-swing' || st.pose === 'stamp' || st.pose === 'dig' || st.pose === 'work'
      || st.pose === 'cast' || st.pose === 'cheer' || st.pose === 'dance' || st.pose === 'wave';
    if (!freeSwing) {
      rig.armF.r = Math.max(-1.35, Math.min(-0.42, rig.armF.r));
      rig.foreF.r = -0.35;
    }
    rig.tool.r = -(rig.armF.r + rig.foreF.r + rig.torso.r) * 0.55 + 0.28;
  }
  cinema.maxArmSwingRad = Math.max(cinema.maxArmSwingRad, Math.abs(rig.armF.r));
}

export function stepCinemaStage(dt: number) {
  const targetLb = cinema.active ? 1 : 0;
  cinema.letterbox += (targetLb - cinema.letterbox) * Math.min(1, dt * 7);
  if (!cinema.active) return;

  cinema.clock += dt;
  if (cinema.pauseLeft > 0) cinema.pauseLeft = Math.max(0, cinema.pauseLeft - dt);
  if (cinema.fadeAlpha > 0) cinema.fadeAlpha = Math.max(0, cinema.fadeAlpha - dt * 1.9);
  if (cinema.shake > 0) cinema.shake = Math.max(0, cinema.shake - dt * 26);

  const k = Math.min(1, dt * 4.4);
  cinema.camX += (cinema.targetX - cinema.camX) * k;
  cinema.camY += (cinema.targetY - cinema.camY) * k;
  cinema.zoom += (cinema.targetZoom - cinema.zoom) * k;

  for (const id of ACTORS) {
    const st = slots[id];
    if (!st.staged) continue;
    const dx = st.tx - st.x;
    const dy = st.ty - st.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 2.5) {
      const spd = 205 * dt;
      const r = Math.min(1, spd / dist);
      st.x += dx * r;
      st.y += dy * r;
      cinema.totalDistanceMoved += Math.hypot(dx * r, dy * r);
      st.pose = 'walk';
    } else if (st.pose === 'walk') {
      st.x = st.tx;
      st.y = st.ty;
      const curBeat = cinema.script?.beats[cinema.beatIdx];
      st.pose = (st.talking && curBeat?.pose) ? curBeat.pose : (st.talking ? 'talk' : 'idle');
    }
    if (st.emoteT > 0) {
      st.emoteT -= dt;
      if (st.emoteT <= 0) st.emote = null;
    }
    if (st.squashT > 0) st.squashT = Math.max(0, st.squashT - dt * 1.5);
    const w = walkerOf(id);
    if (w) {
      w.x = st.x;
      w.y = st.y + st.jumpY;
      w.face = st.face;
      applyProceduralPose(w.rig, st, cinema.clock);
    }
  }

  for (let i = 0; i < POOL_SIZE; i++) {
    const p = pool[i];
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) { p.active = false; continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += (p.kind === 'dust' ? -28 : 230) * dt;
    p.rot += p.vr * dt;
  }
}

export function isActorStagedInScene(id: RealActorId): boolean {
  return cinema.active && slots[id].staged && slots[id].area === UI.scene;
}

function activeSetPiece(): { kind: SceneScript['setPiece'] extends infer T ? T extends { kind: infer K } ? K : never : never; x: number; y: number } | undefined {
  const sp = cinema.script?.setPiece;
  const curId = cinema.script?.beats[cinema.beatIdx]?.nodeId ?? cinema.script?.id ?? '';
  if (curId === 'p4' || curId === 'p5' || curId === 'p7' || curId === 'ch6-outro') {
    return { kind: 'deed-table', x: 912, y: 658 };
  }
  if (curId === 'secret-true-epilogue') return { kind: 'guardian-bell', x: 846, y: 626 };
  if (curId === 'finale') {
    return { kind: 'treasure-chest', x: 846, y: 664 };
  }
  if (curId === 'secret-midnight-well' || curId === 'ch4-outro') {
    return { kind: 'qanat-fountain', x: 372, y: 266 };
  }
  if (sp && UI.scene === cinema.script?.area) return sp;
  return undefined;
}

/** Draws world set-pieces, cross-scene guest actors & live facial overlays IN WORLD LIGHTING (before rain/night tint) */
export function drawCinemaWorldExtras(c: Ctx) {
  if (!cinema.active || !world) return;
  const sp = activeSetPiece();
  if (sp) drawCinemaSetPiece(c, sp.kind, sp.x, sp.y, cinema.clock);
  const nativeToScene = (id: RealActorId): boolean => {
    if (id === 'player') return true;
    return UI.scene === 'town';
  };
  for (const id of ACTORS) {
    const st = slots[id];
    if (!st.staged || st.area !== UI.scene) continue;
    const w = walkerOf(id);
    if (!w) continue;
    const sc = id === 'grandma' ? 0.71 : id === 'sara' ? 0.74 : id === 'engineer' ? 0.79 : id === 'rancher' ? 0.81 : id === 'jahangir' ? 0.8 : 0.75;
    if (!nativeToScene(id)) {
      drawFarmer(c, w.rig, w.x, w.y, w.face, sc);
    }
    const mouth = st.talking && cinema.pauseLeft <= 0 ? (0.45 + 0.55 * Math.abs(Math.sin(cinema.mouthPhase))) : 0;
    const blink = ((Math.floor(cinema.clock * 2.3 + id.length) % 11) === 0);
    drawActorFaceOverlay(c, w.x, w.y, w.face, sc, mouth, blink, st.actionArc);
  }
}

/** Draws cinema particles only; speech bubbles already identify the speaker. */
export function drawCinemaForegroundUI(c: Ctx) {
  if (!cinema.active || !world) return;
  for (let i = 0; i < POOL_SIZE; i++) {
    const p = pool[i];
    if (!p.active) continue;
    c.save();
    c.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
    if (p.kind === 'dust') {
      c.fillStyle = '#efe2c6';
      c.beginPath();
      c.arc(p.x, p.y, 16 * (1.4 - p.life / p.max), 0, Math.PI * 2);
      c.fill();
    } else if (p.kind === 'paper') {
      c.translate(p.x, p.y);
      c.rotate(p.rot * 0.25);
      c.fillStyle = '#fffdf4';
      c.strokeStyle = '#503426';
      c.lineWidth = 2;
      c.fillRect(-9, -12, 18, 24);
      c.strokeRect(-9, -12, 18, 24);
    } else {
      const ic = p.kind === 'coin' ? 'coin' : p.kind === 'leaf' ? 'wheat' : 'star';
      put(c, iconPart(ic), p.x, p.y, p.scale, p.rot * 0.15);
    }
    c.restore();
  }
}

/** Projects an actor's head world position into live CSS viewport coordinates cleanly ABOVE Name + Job plates */
export function actorScreenAnchor(who: CharId): { x: number; y: number; visible: boolean } {
  if (who === 'narrator') return { x: cinema.viewCw * 0.5, y: cinema.viewCh * 0.16, visible: true };
  const st = slots[who];
  const wx = st.staged ? st.x : cinema.camX;
  const wy = (st.staged ? st.y + st.jumpY : cinema.camY) - (who === 'player' ? 168 : 206);
  const sx = cinema.viewTx + ((wx - cinema.camX) * cinema.zoom + 640) * cinema.viewSc;
  const sy = cinema.viewTy + ((wy - cinema.camY) * cinema.zoom + 360) * cinema.viewSc;
  return {
    x: Math.max(138, Math.min(cinema.viewCw - 138, sx)),
    y: Math.max(66, Math.min(cinema.viewCh - 120, sy)),
    visible: true,
  };
}
