// Semantic, keyboard-focusable mirror of the canvas scene. Labels describe real state;
// activation still goes through the same scene tap router as pointer input.
import { ANIMALS, CROP, GOOD, isUnlocked } from './data';
import { S, UI, plotsForFarm, stamCap } from './state';
import { CFG } from './settings';
import { ESTATES, isEstateOwned, isFarmScene, type FarmSceneId } from './estates';
import { RIVER_SPOTS, type SceneKey } from './scenes';
import { SHOPS } from './engineInput';
import { TOWN_ACTORS } from '../story/townNpc';
import { NPC_ROLES } from '../strings/estateStoryText';
import { activeFrontierNodes, ensureFrontier, isFrontierNodeHarvested, isTownFestivalActive } from './core/frontier';
import { activeMineNodes, isMineNodeHarvested } from './core/mining';
import { fishCast } from './worldVisuals';
import { FT } from '../strings/frontierText';
import { UT } from '../strings/uiText';
import { fa } from '../strings/fa';
import { SCENE_A11Y_TEXT } from '../strings/sceneA11yText';
import type { Plot } from './state';

export interface SceneA11yTarget {
  id: string;
  label: string;
  group: 'plot' | 'action' | 'travel';
  disabled?: boolean;
}

const en = () => CFG.locale === 'en';
const T = () => SCENE_A11Y_TEXT[en() ? 'en' : 'fa'];
const pct = (v: number) => `${fa(Math.round(Math.max(0, Math.min(1, v)) * 100))}${UT.u46}`;

const SCENE_NAMES: Record<SceneKey, () => string> = {
  farm: () => FT.placeFarm,
  north: () => FT.placeNorth,
  valley: () => FT.placeValley,
  town: () => FT.placeTown,
  river: () => FT.placeRiver,
  apiary: () => FT.placeApiary,
  cave: () => FT.navCave,
  forest: () => FT.navForest,
};

const TOOL_NAMES: Record<string, () => string> = {
  hand: () => UT.u26,
  till: () => UT.u27,
  plant: () => UT.u28,
  water: () => UT.u29,
  harvest: () => UT.u30,
  fert: () => UT.u31,
};

export function plotA11yLabel(farm: FarmSceneId, index: number): string {
  const t = T();
  const p: Plot | undefined = plotsForFarm(farm)[index];
  const prefix = t.plot(fa(index + 1));
  const locked = !isEstateOwned(farm, S.lv.land) || (farm === 'farm' && !isUnlocked(index, S.lv.land));
  if (locked) return `${prefix} — ${t.locked}`;
  if (!p) return `${prefix} — ${t.unavailable}`;
  if (p.st === 0) return `${prefix} — ${t.untilled}`;
  if (p.st === 1) return `${prefix} — ${t.tilled}`;
  const crop = p.crop ? CROP[p.crop]?.fa ?? p.crop : t.unknownCrop;
  if (p.dead) return `${prefix} — ${crop}, ${t.withered}`;
  const growth = p.ripe ? t.ripe : t.growth(pct(p.prog));
  return `${prefix} — ${crop}, ${growth}, ${t.water} ${pct(p.water)}, ${t.fertility} ${pct(p.fert)}`;
}

export function sceneSummary(): string {
  const t = T();
  const scene = SCENE_NAMES[UI.scene]();
  const clock = t.clock(fa(S.day), fa(Math.floor(S.hour)));
  const stamina = t.stamina(fa(Math.floor(S.stamina)), fa(stamCap()));
  const coins = t.coins(fa(Math.floor(S.coins)));
  const tool = TOOL_NAMES[UI.tool]?.() ?? UI.tool;
  return `${scene}. ${clock}. ${stamina}. ${coins}. ${t.selectedTool(tool)}.`;
}

function action(id: string, label: string, disabled = false): SceneA11yTarget {
  return { id, label, group: 'action', disabled };
}

function travelTargets(): SceneA11yTarget[] {
  const t = T();
  const ids: SceneKey[] = ['farm', 'north', 'valley', 'town', 'river', 'apiary', 'forest', 'cave'];
  return ids.filter((id) => id !== UI.scene).map((id) => ({
    id: `travel:${id}`,
    label: t.travelTo(SCENE_NAMES[id]()),
    group: 'travel',
    disabled: (id === 'north' || id === 'valley') && !isEstateOwned(id, S.lv.land),
  }));
}

export function sceneA11yTargets(): SceneA11yTarget[] {
  const t = T();
  const out: SceneA11yTarget[] = [];
  if (isFarmScene(UI.scene)) {
    const count = ESTATES[UI.scene].cols * ESTATES[UI.scene].rows;
    for (let i = 0; i < count; i++) out.push({ id: `plot:${i}`, label: plotA11yLabel(UI.scene, i), group: 'plot' });
  }

  if (UI.scene === 'farm') {
    out.push(
      action('home', t.openHome),
      action('barn', t.openBarn),
      action('well', t.refillWell),
      action('feed', t.fillTrough),
      action('straw', t.gatherEggs),
      action('mail', t.readMail),
      action('ledger', t.openLedger),
    );
    for (const a of S.animals) {
      const animalName = ANIMALS[a.kind].fa;
      const status = a.grown > 0 ? t.young : a.ready > 0 ? t.productsReady(fa(a.ready)) : t.noProducts;
      out.push(action(`animal:${a.id}`, `${animalName} — ${status}`));
    }
  } else if (UI.scene === 'north' || UI.scene === 'valley') {
    out.push(
      action('well', t.estateWell),
      action('barn', t.stoneBarn),
    );
    if (UI.scene === 'north') out.push(action('windmill', t.windmill));
    else out.push(action('spring', t.valleySpring));
  } else if (UI.scene === 'town') {
    for (const shop of SHOPS) out.push(action(`shop:${shop.id}`, t.open(t.shopNames[shop.id])));
    const loc = en() ? 'en' : 'fa';
    TOWN_ACTORS.forEach((actor, i) => out.push(action(`npc:${i}`, t.talkTo(NPC_ROLES[loc][actor.who].name))));
    out.push(action('sharkhar', t.talkTo(NPC_ROLES[loc].jahangir.name)));
    if (isTownFestivalActive()) {
      out.push(action('fair:judge', t.fairJudge));
      out.push(action('fair:cauldron', t.fairCauldron));
      out.push(action('fair:archery', t.fairArchery));
    }
    if (S.story.postgame) out.push(action('museum', t.museum));
  } else if (UI.scene === 'river') {
    if (fishCast.active) out.push(action('fish:finish', t.reelIn));
    RIVER_SPOTS.forEach((_, i) => out.push(action(`fish:${i}`, t.castAt(fa(i + 1)))));
    if (S.ponds.length) out.push(action('pond', t.ponds));
  } else if (UI.scene === 'apiary') {
    out.push(action('barn', t.apiaryBarn));
    if (S.hives > 0) out.push(action('hive', t.manageHives(fa(S.hives))));
  } else if (UI.scene === 'cave' || UI.scene === 'forest') {
    const f = ensureFrontier();
    if (UI.scene === 'forest') out.push(action('shrine', t.shrine));
    const spots = UI.scene === 'cave' ? activeMineNodes() : activeFrontierNodes('forest');
    for (const spot of spots) {
      const harvested = UI.scene === 'cave' ? isMineNodeHarvested(spot.idx) : isFrontierNodeHarvested('forest', spot.idx);
      if (harvested) continue;
      out.push(action(`node:${spot.idx}`, t.extract(GOOD[spot.good]?.fa ?? spot.good, fa(spot.stam))));
    }
    const layer = UI.scene === 'cave' ? f.caveFloor : f.forestLayer;
    if (layer > 1) out.push(action('layer:prev', t.previousLayer));
    if (layer < 3) out.push(action('layer:next', t.nextLayer));
  }
  out.push(...travelTargets());
  return out;
}
