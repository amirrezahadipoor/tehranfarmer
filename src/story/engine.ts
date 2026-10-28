// ===== موتور داستان و فراخوانی یکپارچهٔ صحنه‌های سینمایی (بدون هیچ قفل‌نرم در بازپخش یا رد کردن!) =====
import { S, UI, addXp, farmLevel, notify, saveGame, season, stamCap, addGood, type Modal } from '../game/state';
import { CFG } from '../game/settings';
import { nodeById } from './story';
import type { StoryNode, StoryCtx } from './types';
import { startDebt, minPay, standingBand } from '../game/core/debt';
import { sharkharNodeId, type SharkharMood } from './sharkhar';
import { TOWN_ACTORS } from './townNpc';
import { pickNpcQuestScene } from './npcQuests';
import type { SceneKey } from '../game/scenes';
import { fa } from '../strings/fa';
import { SCENE_CHOICES, addAffinity, applyDialogueChoice, isVillagerId, maybeGrantVillagerFriendTreat, villagerHearts } from './socialVillagers';

const sceneQueue = (): string[] => (S.story.queue ??= []);

export function clearSceneQueue() {
  if (S.story) S.story.queue = [];
}

/** تضمین اینکه پس از پرولوگ هیچ‌گاه وضعیت بدون بدهی فعال باقی نماند */
export function ensurePrologueInitialized() {
  if (!S.story) return;
  if (!S.debt && !S.story.postgame && S.story.prologueSeen) {
    startDebt(0);
    if (!S.story.chapter) S.story.chapter = 1;
  }
}

export function storyCtx(): StoryCtx {
  return {
    chapter: S.story?.chapter ?? 0,
    level: farmLevel(),
    coins: S.coins,
    noteIdx: S.debt?.noteIdx ?? -1,
    flags: S.debt?.flags ?? {},
  };
}

export function pendingNode(): StoryNode | null {
  const id = S.story?.pending;
  return id ? nodeById(id) : null;
}

type PacingStory = typeof S.story & { actionsSinceAuto?: number };

export function notePlayerAction(weight = 1) {
  if (!S.story) return;
  const st = S.story as PacingStory;
  st.actionsSinceAuto = Math.min(99, (st.actionsSinceAuto ?? 8) + weight);
}

export function triggerCutscene(
  id: string,
  opts?: { forceReplay?: boolean; replayable?: boolean; director?: boolean; explicitAction?: boolean },
): StoryNode | null {
  const node = nodeById(id);
  if (!node || !S.story) return null;
  if (!opts?.forceReplay && !opts?.replayable && S.story.seen[id]) return null;
  const wasDirectorReplay = UI.directorReplay;
  if (opts?.director) UI.directorReplay = true;
  else {
    UI.directorReplay = false;
    if (!opts?.explicitAction) {
      S.story.lastAutoDay = S.day;
      (S.story as PacingStory).actionsSinceAuto = 0;
    }
  }
  if (S.story.pending && S.story.pending !== id) {
    const q = sceneQueue();
    if (!opts?.forceReplay) {
      if (!q.includes(id)) q.push(id);
      return node;
    }
    if (!wasDirectorReplay && !S.story.seen[S.story.pending] && !q.includes(S.story.pending)) {
      q.unshift(S.story.pending);
    }
  }
  S.story.pending = id;
  UI.modal = null;
  if (UI.started && !UI.directorReplay) saveGame();
  notify();
  return node;
}

export function playNode(id: string): StoryNode | null {
  const keepDirector = UI.directorReplay;
  const res = triggerCutscene(id, { forceReplay: true, director: keepDirector });
  return res;
}

/** اثرهای گره را روی سِیو اعمال می‌کند (و هرگز اجازه نمی‌دهد پرولوگِ دیده‌نشده بدون شروع سند رها شود!) */
export function applyEffects(node: StoryNode) {
  const isFirstTimePrologue = !S.story.prologueSeen && (node.id === 'prologue' || node.id === 'p7');
  if (UI.directorReplay && !isFirstTimePrologue) return;
  const skipDupReward = Boolean(S.story.seen[node.id]) && !node.id.startsWith('visit-');
  for (const e of node.effects ?? []) {
    switch (e.k) {
      case 'chapter':
        S.story.chapter = e.v;
        if (S.debt) S.debt.chapter = e.v;
        break;
      case 'flag':
        if (S.debt) S.debt.flags[e.v] = e.on ?? true;
        S.story.seen[e.v] = true;
        break;
      case 'coins':
        if (!(e.v > 0 && skipDupReward)) S.coins = Math.max(0, S.coins + e.v);
        break;
      case 'item':
        if (!skipDupReward) addGood(e.good, e.v);
        break;
      case 'xp':
        if (!skipDupReward) addXp(e.v);
        break;
      case 'note':
        if (!S.debt) startDebt(e.v);
        break;
      case 'heal':
        if (!skipDupReward) S.stamina = stamCap();
        break;
      case 'end':
        S.story.postgame = true;
        S.story.chapter = 7;
        break;
    }
  }
  if (node.id === 'prologue' || node.id === 'p7') S.story.prologueSeen = true;
  if (node.id.startsWith('npc-q-') && node.id.endsWith('-done') && !S.story.seen[node.id]) {
    const who = node.id.split('-')[2] ?? '';
    if (isVillagerId(who)) addAffinity(who, 10);
  }
  S.story.seen[node.id] = true;
}

export interface AdvanceResult { next: StoryNode | null; done: boolean }

export function advanceNode(node: StoryNode): AdvanceResult {
  applyEffects(node);
  if (!node.next) {
    UI.directorReplay = false;
    const queued = sceneQueue().shift() ?? null;
    S.story.pending = queued;
    if (!queued && UI.afterModal) {
      UI.modal = UI.afterModal;
      UI.afterModal = null;
    }
    ensurePrologueInitialized();
    saveGame();
    notify();
    return { next: queued ? nodeById(queued) : null, done: true };
  }
  const next = playNode(node.next);
  saveGame();
  return { next, done: !next };
}

export function skipActiveCutscene() {
  let guard = 0;
  let cur = pendingNode();
  while (cur && guard++ < 32) {
    applyEffects(cur);
    if (!UI.directorReplay && SCENE_CHOICES[cur.id] && !S.story.seen[`choice:${cur.id}`]) {
      applyDialogueChoice(cur.id, 0);
    }
    cur = cur.next ? nodeById(cur.next) : null;
  }
  UI.directorReplay = false;
  const queued = sceneQueue().shift() ?? null;
  S.story.pending = queued;
  if (!queued && !S.story.prologueSeen && !sceneQueue().length) {
    S.story.prologueSeen = true;
    if (!S.debt && !S.story.postgame) startDebt(0);
    if (!S.story.chapter) S.story.chapter = 1;
  }
  if (!queued && UI.afterModal) {
    UI.modal = UI.afterModal;
    UI.afterModal = null;
  }
  saveGame();
  notify();
}

export const hasSeen = (id: string) => !!S.story?.seen?.[id];

export function maybeStartPrologue() {
  if (!S.story) return;
  if (S.story.pending) return;
  if (S.story.prologueSeen) {
    ensurePrologueInitialized();
    return;
  }
  triggerCutscene('p1', { forceReplay: true });
}

export function queueNode(id: string) {
  triggerCutscene(id, { forceReplay: true });
}

export function dueWarningText(days: number): string | null {
  if (days > 3 || days < 0) return null;
  if (CFG.locale === 'en') return days === 0 ? 'Installment due today!' : `Installment due in ${fa(days)}d`;
  return days === 0 ? 'امروز روز قسط است!' : `تا روز قسط ${fa(days)} روز مانده`;
}

export function playerMood(): SharkharMood {
  if (standingBand() === 'bad') return 'bad';
  if (S.coins >= Math.max(1500, minPay() * 2)) return 'rich';
  return 'debt';
}

export function talkToSharkhar(): StoryNode | null {
  const ch = S.story.postgame ? 7 : Math.max(1, S.story.chapter || 1);
  return triggerCutscene(sharkharNodeId(ch, playerMood()), { forceReplay: true });
}

export function talkToTownNpc(idx: number): StoryNode | null {
  const actor = TOWN_ACTORS[idx % TOWN_ACTORS.length];
  if (isVillagerId(actor.who)) {
    addAffinity(actor.who, 1);
    maybeGrantVillagerFriendTreat(actor.who);
  }
  const qScene = pickNpcQuestScene(actor.who);
  if (qScene) return triggerCutscene(qScene, { forceReplay: true });
  // دیالوگ واکنشی هوشمند بر پایهٔ آب‌وهوای بارانی، دوستی بالا (۳+ قلب)، آزادی مزرعه و فصل
  if (S.weather >= 2 && (S.day + idx) % 2 === 0) {
    return triggerCutscene(`town-${actor.who}-${actor.who === 'grandma' ? 6 : 7}`, { forceReplay: true });
  }
  if ((S.story.postgame || villagerHearts(actor.who) >= 3) && (S.day + idx) % 3 === 0) {
    return triggerCutscene(`town-${actor.who}-${actor.who === 'grandma' ? 7 : 6}`, { forceReplay: true });
  }
  const variant = (season() + S.day + idx) % 8;
  return triggerCutscene(`town-${actor.who}-${variant}`, { forceReplay: true });
}

export function triggerAreaIntro(area: Exclude<SceneKey, 'farm'>): boolean {
  if (!S.story || S.story.pending || UI.scene !== area) return false;
  return triggerCutscene(`area-intro-${area}`, { explicitAction: true }) !== null;
}

export function triggerShopIntro(shopId: string): boolean {
  if (!['seed', 'market', 'work', 'animal', 'carp', 'estate'].includes(shopId)) return false;
  if (S.story?.pending) return false;
  const started = triggerCutscene(`shop-intro-${shopId}`, { explicitAction: true }) !== null;
  if (started) UI.afterModal = shopId as Modal;
  return started;
}

export function triggerSeasonDawn(seasonIdx: number) {
  if (!S.story?.prologueSeen || S.story.pending || S.debt?.pendingVisit) return;
  if (S.story.lastAutoDay === S.day || ((S.story as PacingStory).actionsSinceAuto ?? 8) < 3) return;
  const key = ['season-dawn-spring', 'season-dawn-summer', 'season-dawn-autumn', 'season-dawn-winter'][((seasonIdx % 4) + 4) % 4];
  triggerCutscene(key);
}
