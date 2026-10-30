// Crisp Hand-Drawn Overhead NPC Name + Job Plaque & Conditional Golden-Yellow Quest Marker (!)
// Positioned strictly ABOVE NPC hats/hair — NEVER over character faces!
import { INK, cached, put, shape, type Ctx } from './art';
import { CFG } from './settings';
import type { SceneArea } from '../story/cinemaTypes';
import { NPC_ROLES, type NpcRoleActor } from '../strings/estateStoryText';
import { npcHasQuestMarker } from '../story/npcQuests';
import { worldLabelBoost } from './labelScale';

/** تضمین سراسری عدم برخورد یا گیر کردن سر و صورت کاراکترها روی پنجره، حصار دام، چشمه، کندو و دیوار ساختمان‌ها در تمام صحنه‌ها */
export function safeSceneMark(area: SceneArea, rawX: number, rawY: number): { x: number; y: number } {
  let x = Math.max(84, Math.min(1196, rawX));
  let y = Math.max(240, Math.min(676, rawY));
  if (area === 'farm') {
    if (x < 386) y = Math.max(524, y);
    if (x > 916) y = Math.max(344, y);
  } else if (area === 'north' || area === 'valley') {
    if (x < 216) y = Math.max(408, y);
    if (x > 1068) y = Math.max(362, y);
  } else if (area === 'town') {
    y = Math.max(614, Math.min(646, y));
    if (x > 1036) x = 1036;
  } else if (area === 'river') {
    y = Math.max(492, Math.min(540, y));
  } else if (area === 'apiary') {
    y = Math.max(598, Math.min(642, y));
  }
  return { x, y };
}

/** Draws a hand-drawn golden-yellow exclamation mark badge above the NPC nameplate when questReady is true */
function drawYellowQuestExclamation(c: Ctx, x: number, topY: number, t: number) {
  const bob = Math.sin(t * 5.2) * 3.5;
  const cy = topY - 22 + bob;
  c.save();
  // Soft warm gold halo
  c.fillStyle = 'rgba(255, 214, 51, 0.34)';
  c.beginPath();
  c.arc(x, cy, 19, 0, Math.PI * 2);
  c.fill();
  // Golden badge shield/circle
  c.fillStyle = '#ffd43b';
  c.strokeStyle = INK;
  c.lineWidth = 3;
  c.beginPath();
  c.arc(x, cy, 14.5, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  // Bold dark-ink exclamation stem & dot inside golden badge
  shape(c, [[x - 2.8, cy - 9.5], [x + 2.8, cy - 9.5], [x + 1.8, cy + 1.5], [x - 1.8, cy + 1.5]], {
    fill: '#3d2212',
    smooth: false,
    line: 1.4,
  });
  c.fillStyle = '#3d2212';
  c.beginPath();
  c.arc(x, cy + 6.8, 2.5, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

export interface NpcOverheadGeometry {
  name: string;
  role: string;
  hasQuest: boolean;
  plateTopY: number;
  plateBottomY: number;
  questBangCenterY: number;
}

export interface NpcOverheadEntry {
  who: NpcRoleActor;
  x: number;
  footY: number;
  actorScale: number;
}

export interface NpcOverheadPlacement extends NpcOverheadEntry {
  cx: number;
  width: number;
}

let measureCtx: Ctx | null = null;
function npcBasePlateWidth(who: NpcRoleActor): number {
  const info = NPC_ROLES[CFG.locale === 'en' ? 'en' : 'fa'][who];
  if (!info) return 88;
  if (!measureCtx && typeof document !== 'undefined') {
    measureCtx = document.createElement('canvas').getContext('2d');
  }
  if (!measureCtx) return Math.min(188, Math.max(88, Math.max(info.name.length * 8, info.job.length * 6) + 22));
  measureCtx.font = '800 13.5px Vazirmatn, sans-serif';
  const wName = measureCtx.measureText(info.name).width;
  measureCtx.font = '700 11px Vazirmatn, sans-serif';
  const wJob = measureCtx.measureText(info.job).width;
  return Math.min(188, Math.max(88, Math.max(wName, wJob) + 22));
}

/** چیدمانِ بدون برخوردِ پلاک‌های شهر؛ فقط موبایل، با حفظ اندازهٔ فونت و ترتیب شخصیت‌ها. */
export function placeNpcOverheadRow(entries: NpcOverheadEntry[]): NpcOverheadPlacement[] {
  const boost = worldLabelBoost(10.8, 11, 2);
  const placed = entries.map((e) => ({ ...e, cx: e.x, width: npcBasePlateWidth(e.who) * boost }));
  if (boost === 1) return placed;
  placed.sort((a, b) => a.x - b.x);
  let right = 8;
  for (const p of placed) {
    const half = p.width / 2;
    p.cx = Math.max(p.x - half, right) + half;
    right = p.cx + half + 10;
  }
  const overflow = right - 10 - 1272;
  if (overflow > 0) for (const p of placed) p.cx -= overflow;
  return placed;
}

export function drawNpcOverheadGroup(c: Ctx, entries: NpcOverheadEntry[], t: number) {
  for (const p of placeNpcOverheadRow(entries)) drawNpcOverheadInfo(c, p.who, p.cx, p.footY, p.actorScale, t);
}

export function npcOverheadLayout(
  who: NpcRoleActor,
  _x: number,
  footY: number,
  actorScale: number,
  t = 0,
): NpcOverheadGeometry | null {
  const locale = CFG.locale === 'en' ? 'en' : 'fa';
  const info = NPC_ROLES[locale][who];
  if (!info) return null;
  const plateBottomY = footY - Math.max(130, 152 * actorScale + 14);
  const boost = worldLabelBoost(10.8, 11, 2);
  const plateTopY = plateBottomY - 34 * boost;
  return {
    name: info.name,
    role: info.job,
    hasQuest: who === 'carpenter' || who === 'estateAgent' ? false : npcHasQuestMarker(who),
    plateTopY,
    plateBottomY,
    questBangCenterY: plateTopY - 22 + Math.sin(t * 5.2) * 3.5,
  };
}

/** Draws NPC Name + Job/Role cleanly ABOVE their head/hat + yellow ! above Name if quest-ready (pre-cached RTL glyph sprite!) */
export function drawNpcOverheadInfo(
  c: Ctx,
  who: NpcRoleActor,
  x: number,
  footY: number,
  actorScale: number,
  t: number,
) {
  const lay = npcOverheadLayout(who, x, footY, actorScale, t);
  if (!lay) return;

  const boxH = 34;
  const plate = cached(`npc-plate:${lay.name}|${lay.role}`, 196, 44, 98, 5, (pc) => {
    const padW = npcBasePlateWidth(who);
    const bx = -padW / 2;
    pc.textAlign = 'center';
    pc.textBaseline = 'middle';

    pc.fillStyle = 'rgba(255, 249, 232, 0.94)';
    pc.strokeStyle = '#503426';
    pc.lineWidth = 2.2;
    pc.beginPath();
    pc.roundRect(bx, 0, padW, boxH, 9);
    pc.fill();
    pc.stroke();

    pc.font = '800 13.5px Vazirmatn, sans-serif';
    pc.fillStyle = '#3b2316';
    pc.fillText(lay.name, 0, 11.5);

    pc.font = '700 10.8px Vazirmatn, sans-serif';
    pc.fillStyle = '#805226';
    pc.fillText(lay.role, 0, 25.5);
  });

  put(c, plate, x, lay.plateTopY, worldLabelBoost(10.8, 11, 2));

  if (lay.hasQuest) {
    drawYellowQuestExclamation(c, x, lay.plateTopY, t);
  }
}
