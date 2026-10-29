// Complete Data-Driven In-Engine Cinematic Scene Registry & Timeline Compiler
import { UI } from '../game/state';
import { NODES, nodeById } from './story';
import type { CharId, StoryNode } from './types';
import type { ActPose, BeatStep, CameraKeyframe, CueKind, EmoteKind, ParticleKind, SceneArea, SceneScript, StageMark, StagePropKind } from './cinemaTypes';

type Actor = Exclude<CharId, 'narrator'>;

interface BeatOverride {
  area?: SceneArea;
  marks?: StageMark[];
  move?: { actor: Actor; toX: number; toY: number; face?: -1 | 1 };
  pose?: ActPose;
  prop?: string;
  react?: { actor: Actor; pose?: ActPose; emote?: EmoteKind; squash?: boolean };
  emote?: EmoteKind;
  cam?: CameraKeyframe;
  prePause?: number;
  cue?: CueKind;
  burst?: { kind: ParticleKind; actor?: Actor; x?: number; y?: number; count: number };
}

// Handcrafted directorial choreography overrides for key story beats & comedic set-pieces
const BEAT_OVERRIDES: Record<string, BeatOverride[]> = {
  p1: [
    {
      area: 'farm',
      marks: [{ actor: 'player', x: 566, y: 472, face: -1, prop: 'hoe' }, { actor: 'grandma', x: 446, y: 470, face: 1, prop: 'bread' }],
      move: { actor: 'player', toX: 522, toY: 472, face: -1 },
      cam: { x: 502, y: 422, zoom: 1.24 },
      cue: 'establish',
    },
    {
      pose: 'sigh',
      react: { actor: 'player', pose: 'sigh', emote: 'sweat' },
      cam: { x: 500, y: 422, zoom: 1.38 },
    },
  ],
  p2: [
    {
      pose: 'talk',
      prop: 'hoe',
      emote: '?',
      cam: { x: 504, y: 422, zoom: 1.5 },
    },
    {
      move: { actor: 'grandma', toX: 462, toY: 470, face: 1 },
      pose: 'wave',
      prop: 'bread',
      emote: '!',
      react: { actor: 'player', pose: 'recoil', emote: '!', squash: true },
      cam: { x: 492, y: 422, zoom: 1.46 },
      cue: 'whoosh',
    },
  ],
  p3: [
    {
      pose: 'explain',
      prop: 'bread',
      emote: 'heart',
      cam: { x: 488, y: 422, zoom: 1.54 },
      burst: { kind: 'heart', actor: 'grandma', count: 5 },
    },
    {
      pose: 'point',
      react: { actor: 'player', pose: 'bow', emote: 'idea' },
      cam: { x: 494, y: 422, zoom: 1.46 },
    },
  ],
  p4: [
    {
      area: 'town',
      marks: [
        { actor: 'jahangir', x: 966, y: 652, face: -1, prop: 'teacup' },
        { actor: 'player', x: 760, y: 654, face: 1, prop: 'hoe' },
      ],
      move: { actor: 'player', toX: 868, toY: 654, face: 1 },
      cam: { x: 912, y: 626, zoom: 1.28 },
      cue: 'suspense',
    },
    {
      pose: 'wave',
      prop: 'teacup',
      emote: '!',
      cam: { x: 924, y: 626, zoom: 1.5 },
    },
  ],
  p5: [
    {
      prePause: 0.62,
      pose: 'explain',
      prop: 'scroll',
      emote: '!',
      react: { actor: 'player', pose: 'recoil', emote: '!', squash: true },
      cam: { x: 918, y: 624, zoom: 1.64, shake: 9 },
      cue: 'slam',
    },
    {
      pose: 'sigh',
      prop: 'hoe',
      emote: 'sweat',
      cam: { x: 882, y: 626, zoom: 1.58 },
    },
    {
      pose: 'club-point',
      prop: 'club',
      emote: 'music',
      react: { actor: 'player', pose: 'sigh', emote: 'sweat' },
      cam: { x: 936, y: 624, zoom: 1.62 },
      cue: 'boop',
    },
  ],
  p6: [
    { pose: 'explain', prop: 'scroll', cam: { x: 920, y: 626, zoom: 1.48 } },
    { pose: 'point', prop: 'club', cam: { x: 932, y: 626, zoom: 1.54 } },
    { pose: 'talk', emote: '?', cam: { x: 884, y: 626, zoom: 1.56 } },
    { prePause: 0.4, pose: 'laugh', prop: 'teacup', react: { actor: 'player', emote: 'sweat' }, cam: { x: 920, y: 626, zoom: 1.5 } },
  ],
  p7: [
    {
      react: { actor: 'jahangir', pose: 'stamp', squash: true },
      cam: { x: 918, y: 624, zoom: 1.56, shake: 11 },
      cue: 'stamp',
      burst: { kind: 'spark', actor: 'jahangir', count: 10 },
    },
    {
      prePause: 0.55,
      pose: 'think',
      prop: 'scroll',
      react: { actor: 'player', pose: 'think', emote: '?' },
      cam: { x: 942, y: 622, zoom: 1.66 },
      cue: 'reveal',
    },
  ],
  'ch1-outro': [
    { pose: 'cheer', prop: 'sickle', emote: '!', cue: 'cheer', burst: { kind: 'leaf', actor: 'player', count: 10 }, cam: { x: 288, y: 286, zoom: 1.48 } },
    { prePause: 0.35, pose: 'recoil', prop: 'scroll', emote: '!', react: { actor: 'player', pose: 'laugh', emote: 'heart', squash: true }, cue: 'boop', cam: { x: 326, y: 286, zoom: 1.54, shake: 6 } },
  ],
  'ch2-outro': [
    { pose: 'stamp', prop: 'scroll', emote: '!', cue: 'stamp', burst: { kind: 'paper', actor: 'jahangir', count: 10 }, cam: { x: 318, y: 286, zoom: 1.5, shake: 7 } },
    { pose: 'dance', emote: 'heart', cue: 'coins', burst: { kind: 'coin', actor: 'player', count: 10 }, cam: { x: 274, y: 286, zoom: 1.48 } },
  ],
  'estate-north-bought': [
    { cue: 'cheer', pose: 'cheer', prop: 'scroll', emote: '!', burst: { kind: 'spark', actor: 'player', count: 12 }, cam: { x: 612, y: 618, zoom: 1.38 } },
    { pose: 'present', emote: 'idea', react: { actor: 'player', pose: 'dance', emote: 'heart' }, cam: { x: 634, y: 618, zoom: 1.44 } },
  ],
  'estate-valley-bought': [
    { cue: 'reveal', pose: 'cheer', prop: 'scroll', emote: 'heart', burst: { kind: 'heart', actor: 'player', count: 12 }, cam: { x: 622, y: 618, zoom: 1.38 } },
    { pose: 'dance', emote: 'music', cue: 'cheer', burst: { kind: 'coin', actor: 'player', count: 12 }, cam: { x: 636, y: 618, zoom: 1.44 } },
  ],
  'ch3-outro': [
    { pose: 'explain', prop: 'scroll', emote: '!', cam: { x: 274, y: 286, zoom: 1.48 } },
    { prePause: 0.7, cue: 'reveal', react: { actor: 'player', pose: 'think', emote: 'heart' }, cam: { x: 262, y: 286, zoom: 1.58 }, burst: { kind: 'paper', actor: 'grandma', count: 6 } },
    { prePause: 0.55, pose: 'think', prop: 'teacup', emote: 'sweat', cam: { x: 332, y: 286, zoom: 1.58 } },
  ],
  'ch4-outro': [
    { pose: 'cheer', prop: 'scroll', emote: '!', cam: { x: 298, y: 286, zoom: 1.48 }, cue: 'cheer', burst: { kind: 'spark', actor: 'engineer', count: 10 } },
    { pose: 'think', emote: 'sweat', cam: { x: 336, y: 288, zoom: 1.52 } },
    { pose: 'wave', emote: 'heart', cam: { x: 248, y: 288, zoom: 1.48 }, burst: { kind: 'coin', actor: 'sara', count: 8 } },
  ],
  'ch5-outro': [
    { prePause: 0.5, pose: 'stamp', prop: 'scroll', emote: '!', cam: { x: 292, y: 286, zoom: 1.54, shake: 7 }, cue: 'stamp', burst: { kind: 'paper', actor: 'engineer', count: 9 } },
    { pose: 'recoil', prop: 'club', emote: 'anger', cam: { x: 342, y: 286, zoom: 1.56 } },
  ],
  'ch6-outro': [
    {
      area: 'town',
      marks: [
        { actor: 'player', x: 846, y: 654, face: 1, prop: 'hoe' },
        { actor: 'jahangir', x: 966, y: 652, face: -1, prop: 'scroll' },
      ],
      pose: 'stamp',
      prop: 'scroll',
      emote: '!',
      cam: { x: 906, y: 626, zoom: 1.48, shake: 9 },
      cue: 'stamp',
      burst: { kind: 'spark', actor: 'jahangir', count: 12 },
    },
    { prePause: 0.8, pose: 'bow', prop: 'hoe', emote: 'heart', cam: { x: 928, y: 622, zoom: 1.58 }, cue: 'reveal' },
    { prePause: 0.45, pose: 'recoil', emote: '!', react: { actor: 'player', squash: true }, cam: { x: 866, y: 624, zoom: 1.58 } },
    { pose: 'explain', emote: 'heart', react: { actor: 'player', pose: 'bow', emote: 'heart' }, cam: { x: 906, y: 624, zoom: 1.48 } },
  ],
  finale: [
    {
      area: 'town',
      marks: [
        { actor: 'grandma', x: 700, y: 655, face: 1, prop: 'bread' },
        { actor: 'sara', x: 752, y: 664, face: 1 },
        { actor: 'player', x: 812, y: 656, face: 1 },
        { actor: 'jahangir', x: 882, y: 656, face: -1, prop: 'teacup' },
        { actor: 'engineer', x: 938, y: 664, face: -1 },
        { actor: 'rancher', x: 990, y: 655, face: -1 },
      ],
      cam: { x: 845, y: 626, zoom: 1.24 },
      cue: 'cheer',
      burst: { kind: 'coin', x: 845, y: 640, count: 16 },
    },
    { pose: 'laugh', prop: 'teacup', emote: 'heart', cam: { x: 855, y: 626, zoom: 1.48 }, cue: 'coins', burst: { kind: 'coin', actor: 'jahangir', count: 14 } },
    { pose: 'cheer', prop: 'bread', emote: 'music', react: { actor: 'player', pose: 'cheer', emote: 'heart' }, cam: { x: 835, y: 624, zoom: 1.3 }, cue: 'cheer', burst: { kind: 'heart', x: 825, y: 635, count: 12 } },
  ],
  'visit-due-missed': [
    { pose: 'club-point', prop: 'club', emote: 'anger', cam: { x: 312, y: 286, zoom: 1.5 }, cue: 'suspense' },
    { prePause: 0.35, react: { actor: 'player', pose: 'recoil', emote: '!', squash: true }, cam: { x: 274, y: 286, zoom: 1.58, shake: 12 }, cue: 'boop', burst: { kind: 'star', actor: 'player', count: 9 } },
    { pose: 'explain', prop: 'scroll', react: { actor: 'player', pose: 'sigh', emote: 'sweat' }, cam: { x: 298, y: 286, zoom: 1.46 }, burst: { kind: 'coin', actor: 'player', count: 6 } },
  ],
  'visit-due-missed-0': [
    { pose: 'club-swing', prop: 'club', emote: 'anger', cam: { x: 312, y: 286, zoom: 1.5 }, cue: 'suspense' },
    { prePause: 0.35, react: { actor: 'player', pose: 'recoil', emote: '!', squash: true }, cam: { x: 272, y: 286, zoom: 1.6, shake: 13 }, cue: 'boop', burst: { kind: 'star', actor: 'player', count: 10 } },
    { pose: 'point', prop: 'scroll', react: { actor: 'player', pose: 'sigh', emote: 'sweat' }, cam: { x: 298, y: 286, zoom: 1.46 } },
  ],
  'visit-due-missed-1': [
    { move: { actor: 'jahangir', toX: 316, toY: 298, face: -1 }, pose: 'club-swing', prop: 'club', emote: 'anger', cam: { x: 292, y: 286, zoom: 1.48 }, cue: 'scuffle' },
    { prePause: 0.3, react: { actor: 'player', pose: 'recoil', emote: 'sweat', squash: true }, cam: { x: 286, y: 286, zoom: 1.56, shake: 14 }, cue: 'scuffle', burst: { kind: 'dust', x: 294, y: 298, count: 14 } },
    { pose: 'explain', prop: 'scroll', cam: { x: 296, y: 286, zoom: 1.46 }, burst: { kind: 'paper', actor: 'jahangir', count: 8 } },
  ],
  'visit-due-missed-2': [
    { pose: 'stamp', prop: 'teacup', emote: '!', cam: { x: 310, y: 286, zoom: 1.52 }, cue: 'slam' },
    { prePause: 0.32, react: { actor: 'player', pose: 'recoil', emote: '!', squash: true }, cam: { x: 276, y: 286, zoom: 1.6, shake: 15 }, cue: 'slam', burst: { kind: 'star', actor: 'player', count: 11 } },
    { pose: 'point', prop: 'teacup', react: { actor: 'player', pose: 'sigh', emote: 'sweat' }, cam: { x: 296, y: 286, zoom: 1.48 } },
  ],
  'visit-raid': [
    { move: { actor: 'jahangir', toX: 318, toY: 298, face: -1 }, pose: 'point', prop: 'club', emote: '!', react: { actor: 'player', pose: 'recoil', emote: '!', squash: true }, cam: { x: 294, y: 286, zoom: 1.52, shake: 8 }, cue: 'suspense' },
    { prePause: 0.42, pose: 'think', prop: 'scroll', cam: { x: 308, y: 286, zoom: 1.58 }, cue: 'coins', burst: { kind: 'coin', actor: 'player', count: 10 } },
  ],
  'visit-rest': [
    { move: { actor: 'jahangir', toX: 336, toY: 298, face: -1 }, pose: 'think', emote: 'sweat', cam: { x: 298, y: 286, zoom: 1.46 } },
    { move: { actor: 'grandma', toX: 214, toY: 294, face: 1 }, pose: 'point', emote: '!', react: { actor: 'jahangir', pose: 'recoil', emote: 'sweat', squash: true }, cam: { x: 276, y: 286, zoom: 1.5 }, cue: 'boop' },
  ],
  'secret-midnight-well': [
    { cue: 'reveal', burst: { kind: 'spark', count: 14 }, cam: { x: 306, y: 282, zoom: 1.3 } },
    { move: { actor: 'grandma', toX: 218, toY: 294, face: 1 }, pose: 'present', prop: 'scroll', emote: 'heart', burst: { kind: 'coin', actor: 'player', count: 12 } },
    { pose: 'dance', emote: '!', cue: 'cheer' },
  ],
  'secret-golden-kingfish': [
    { cue: 'slam', cam: { x: 645, y: 525, zoom: 1.3, shake: 8 }, burst: { kind: 'spark', count: 14 } },
    { pose: 'recoil', emote: '!', react: { actor: 'player', pose: 'cast', squash: true } },
    { pose: 'cheer', emote: 'heart', cue: 'coins', burst: { kind: 'coin', actor: 'player', count: 14 } },
  ],
  'secret-queen-bee-bloom': [
    { cue: 'reveal', burst: { kind: 'heart', count: 12 } },
    { pose: 'dance', emote: 'heart', react: { actor: 'player', pose: 'cheer' } },
    { pose: 'wave', emote: 'music', cue: 'cheer' },
  ],
  'secret-scarecrow-duel': [
    { cue: 'boop', cam: { x: 304, y: 286, zoom: 1.38, shake: 12 }, burst: { kind: 'star', count: 12 } },
    { move: { actor: 'jahangir', toX: 376, toY: 298, face: 1 }, pose: 'recoil', prop: 'club', emote: '!', react: { actor: 'player', pose: 'laugh', squash: true } },
    { pose: 'dance', emote: 'heart', cue: 'coins', burst: { kind: 'coin', actor: 'jahangir', count: 12 } },
  ],
  'secret-yalda-lanterns': [
    { cue: 'reveal', burst: { kind: 'heart', count: 12 } },
    { pose: 'present', emote: 'heart', react: { actor: 'player', pose: 'wave' } },
    { pose: 'present', prop: 'teacup', emote: 'dots', react: { actor: 'sara', pose: 'laugh' } },
  ],
  'secret-grandpa-tree': [
    { cue: 'slam', cam: { x: 298, y: 284, zoom: 1.36, shake: 8 }, burst: { kind: 'dust', count: 12 } },
    { pose: 'dig', prop: 'hoe', emote: '!', cue: 'coins', burst: { kind: 'coin', actor: 'player', count: 16 } },
    { pose: 'dance', emote: 'heart', cue: 'cheer' },
  ],
  'secret-silk-merchant': [
    { pose: 'present', emote: '!', cue: 'coins', burst: { kind: 'coin', actor: 'sara', count: 16 } },
    { pose: 'dance', emote: 'heart', burst: { kind: 'star', actor: 'player', count: 12 } },
  ],
  'secret-true-epilogue': [
    {
      area: 'town',
      marks: [
        { actor: 'grandma', x: 700, y: 655, face: 1, prop: 'bread' },
        { actor: 'sara', x: 752, y: 664, face: 1 },
        { actor: 'player', x: 812, y: 656, face: 1 },
        { actor: 'jahangir', x: 882, y: 656, face: -1, prop: 'teacup' },
        { actor: 'engineer', x: 938, y: 664, face: -1 },
        { actor: 'rancher', x: 990, y: 655, face: -1 },
      ],
      cam: { x: 845, y: 626, zoom: 1.24 },
      cue: 'cheer',
      burst: { kind: 'coin', x: 845, y: 640, count: 16 },
    },
    { pose: 'bow', emote: 'heart', react: { actor: 'player', pose: 'present' } },
    { pose: 'cheer', emote: '!', cue: 'coins', burst: { kind: 'coin', actor: 'player', count: 16 } },
    { pose: 'dance', emote: 'music', cue: 'cheer', react: { actor: 'player', pose: 'dance', emote: 'heart' } },
  ],
};

const SHOP_META: Record<string, { cx: number; modal: NonNullable<SceneScript['afterOpenModal']> }> = {
  'shop-intro-seed': { cx: 150, modal: 'seed' },
  'shop-intro-market': { cx: 350, modal: 'market' },
  'shop-intro-work': { cx: 550, modal: 'work' },
  'shop-intro-animal': { cx: 750, modal: 'animal' },
  'shop-intro-carp': { cx: 950, modal: 'carp' },
  'shop-intro-estate': { cx: 1150, modal: 'estate' },
};

function defaultPropFor(who: Actor): string {
  // جهانگیر همیشه «مهربان» (چماق ابری) در دست دارد — club-point/club-swing قبلاً با دستِ خالی می‌آمد
  if (who === 'jahangir') return 'club';
  return '';
}

function defaultEmoteFor(text: string, who: Actor, lineIdx: number): EmoteKind {
  if (text.includes('؟') || text.includes('?')) return '?';
  if (text.includes('!')) return who === 'jahangir' ? '!' : lineIdx === 0 ? '!' : 'heart';
  if (who === 'grandma' || who === 'sara') return 'heart';
  if (who === 'engineer') return 'idea';
  if (who === 'jahangir') return 'dots';
  return 'music';
}

function defaultPoseFor(text: string, who: Actor): ActPose {
  if (text.includes('!')) return who === 'jahangir' ? 'club-point' : 'cheer';
  if (text.includes('؟') || text.includes('?')) return 'explain';
  if (who === 'grandma') return 'wave';
  if (who === 'engineer') return 'explain';
  return 'talk';
}

function categoryOf(id: string): SceneScript['category'] {
  if (id.startsWith('secret-')) return 'secret';
  if (id.startsWith('p')) return 'prologue';
  if (id.endsWith('-outro') || id === 'finale') return 'chapter';
  if (id.startsWith('note-open')) return 'deed';
  if (id.startsWith('visit-')) return 'visit';
  if (id.startsWith('sharkhar-') || id.startsWith('reaction-')) return 'sharkhar';
  if (id.startsWith('npc-q-')) return 'quest';
  if (id.startsWith('town-')) return 'villager';
  if (id.startsWith('area-intro-')) return 'area';
  if (id.startsWith('estate-')) return 'deed';
  if (id.startsWith('quest-done-')) return 'quest';
  if (id.startsWith('shop-intro-')) return 'shop';
  return 'season';
}

export function areaFor(id: string): SceneArea {
  if (id === 'area-intro-north' || id.startsWith('estate-north')) return 'north';
  if (id === 'area-intro-valley' || id.startsWith('estate-valley')) return 'valley';
  if (id.startsWith('npc-q-')) return 'town';
  // صحنه‌های کوئست، سپیده‌دم فصل و شب چله دقیقاً در همان مکان فعلی بازیکن اجرا می‌شوند (صفر پرش ناگهانی!)
  if (id.startsWith('quest-done-') || id.startsWith('season-dawn-') || id === 'secret-yalda-lanterns') {
    return UI.scene;
  }
  // اگر بازیکن در شهر است، دیالوگ‌های شرخر، سند، واکنش و ملاقات در همان شهر اجرا می‌شوند و هرگز وسط مکالمه به مزرعه نمی‌پرند!
  if (
    id.startsWith('sharkhar-') || id.startsWith('reaction-') || id.startsWith('note-open')
    || id.startsWith('visit-')
    || id === 'ch1-outro' || id === 'ch2-outro' || id === 'ch3-outro' || id === 'ch4-outro' || id === 'ch5-outro'
  ) {
    return UI.scene === 'town' ? 'town' : 'farm';
  }
  if (
    id.startsWith('town-') || id.startsWith('shop-intro-') || id === 'area-intro-town'
    || id === 'p4' || id === 'p5' || id === 'p6' || id === 'p7'
    || id === 'ch6-outro' || id === 'finale'
    || id === 'secret-silk-merchant' || id === 'secret-true-epilogue'
  ) return 'town';
  if (id === 'area-intro-river' || id === 'secret-golden-kingfish') return 'river';
  if (id === 'area-intro-apiary' || id === 'secret-queen-bee-bloom') return 'apiary';
  if (id === 'area-intro-cave') return 'cave';
  if (id === 'area-intro-forest') return 'forest';
  return 'farm';
}

function setPieceFor(id: string, area: SceneArea): { kind: StagePropKind; x: number; y: number } | undefined {
  const gy = area === 'town' ? 658 : area === 'river' ? 548 : area === 'apiary' ? 598 : area === 'north' || area === 'valley' ? 642 : 300;
  const cx = area === 'town' ? 912 : area === 'river' ? 660 : area === 'apiary' ? 660 : area === 'north' || area === 'valley' ? 620 : 298;
  if (id === 'p1' || id === 'p2' || id === 'p3' || id === 'ch1-outro' || id === 'shop-intro-animal' || id.startsWith('npc-q-rancher-') || id === 'visit-rest') {
    return { kind: 'runaway-rooster', x: area === 'town' ? 750 : cx, y: gy };
  }
  if (id === 'p4' || id === 'p5' || id === 'p6' || id === 'p7' || id.startsWith('note-open') || id === 'ch6-outro') {
    return { kind: 'deed-table', x: area === 'farm' ? 356 : cx, y: area === 'farm' ? 364 : gy };
  }
  if (id === 'ch2-outro' || id === 'ch3-outro' || id === 'visit-due-missed-2' || id === 'secret-scarecrow-duel') {
    return { kind: 'flying-ledger', x: cx, y: gy };
  }
  if (id === 'area-intro-north' || id.startsWith('estate-north') || id === 'shop-intro-work' || id.startsWith('npc-q-engineer-') || id === 'quest-done-q4') {
    return { kind: 'kaveh-drone', x: shopXOr(id, cx), y: gy };
  }
  if (id === 'finale' || id === 'secret-grandpa-tree' || id === 'secret-silk-merchant' || id === 'secret-true-epilogue') {
    return { kind: 'treasure-chest', x: area === 'town' ? 846 : cx, y: gy };
  }
  if (id === 'ch4-outro' || id === 'secret-midnight-well') return { kind: 'qanat-fountain', x: 372, y: 266 };
  if (id === 'ch5-outro') return { kind: 'contract-rip', x: cx, y: gy };
  if (id === 'secret-golden-kingfish') return { kind: 'golden-fish', x: cx, y: gy };
  if (id === 'area-intro-river' || id === 'quest-done-q3') return { kind: 'river-leap', x: cx, y: gy };
  if (id === 'area-intro-apiary' || id === 'secret-queen-bee-bloom' || id === 'npc-q-grandma-3') return { kind: 'bee-swarm', x: cx, y: gy };
  if (id === 'secret-yalda-lanterns') return { kind: 'yalda-table', x: cx, y: gy };
  if (id.startsWith('season-dawn-') || id === 'area-intro-valley' || id.startsWith('estate-valley') || id.startsWith('quest-done-')) {
    return { kind: 'sky-lanterns', x: cx, y: gy };
  }
  return undefined;
}

function shopXOr(id: string, fallback: number): number {
  return SHOP_META[id]?.cx ?? fallback;
}

export function objectiveKeyFor(id: string): string {
  if (id.startsWith('p')) return 'prologue';
  if (id === 'quest-done-q1') return 'q1done';
  if (id === 'quest-done-q2') return 'q2done';
  if (id === 'quest-done-q3') return 'q3done';
  if (id === 'quest-done-q4') return 'q4done';
  if (id === 'quest-done-q5') return 'q5done';
  if (id === 'quest-done-q6') return 'q6done';
  if (id === 'ch1-outro' || id === 'note-open-1') return 'ch1';
  if (id === 'ch2-outro' || id === 'note-open-2') return 'ch2';
  if (id === 'ch3-outro' || id === 'note-open-3') return 'ch3';
  if (id === 'ch4-outro' || id === 'note-open-4') return 'ch4';
  if (id === 'ch5-outro' || id === 'note-open-5') return 'ch5';
  if (id === 'ch6-outro' || id === 'finale') return 'finale';
  if (id.startsWith('visit-') || id.startsWith('sharkhar-')) return 'visit';
  if (id.includes('town') || id.startsWith('shop-intro-')) return 'town';
  if (id.includes('river')) return 'river';
  if (id.includes('apiary')) return 'apiary';
  return 'default';
}

/** Compiles any node (plus its automatic `.next` chain!) into a complete live multi-track `SceneScript` */
export function compileSceneScript(startId: string): SceneScript | null {
  const first = nodeById(startId);
  if (!first) return null;

  // Walk full chain (e.g. p1..p7, ch1-outro..note-open-1, ch6-outro..finale)
  const chain: StoryNode[] = [];
  const seenChain = new Set<string>();
  let cur: StoryNode | null = first;
  while (cur && !seenChain.has(cur.id)) {
    seenChain.add(cur.id);
    chain.push(cur);
    cur = cur.next ? nodeById(cur.next) : null;
  }

  const cat = categoryOf(startId);
  const area = areaFor(startId);
  const shop = SHOP_META[startId];
  const centerX = shop ? shop.cx : area === 'town' ? 640 : area === 'north' ? 610 : area === 'valley' ? 620 : area === 'river' ? 690 : area === 'apiary' ? 680 : 296;
  const centerY = area === 'town' ? 572 : area === 'north' || area === 'valley' ? 636 : area === 'river' ? 545 : area === 'apiary' ? 604 : 296;

  // Collect full chain cast + opening-node cast (never pre-spawn crowd from chained follow-up nodes onto opening beat!)
  const castSet = new Set<Actor>(['player']);
  const initialCastSet = new Set<Actor>(['player']);
  for (const node of chain) {
    const ovList = BEAT_OVERRIDES[node.id] ?? [];
    node.lines.forEach((l, li) => {
      const ov = ovList[li];
      if (l.who !== 'narrator') {
        castSet.add(l.who);
        if (node === first) initialCastSet.add(l.who);
      }
      if (ov?.marks && node === first) {
        for (const m of ov.marks) initialCastSet.add(m.actor);
      }
    });
  }
  const cast = [...castSet];
  const initialCast = [...initialCastSet];

  // An evenly spaced opening row keeps bodies clear without later corrective shuffling.
  const rowWidth = (initialCast.length - 1) * 96;
  const rowStart = Math.max(95, Math.min(1185 - rowWidth, centerX - rowWidth / 2));
  const initialMarks: StageMark[] = initialCast.map((actor, idx) => {
    const x = rowStart + idx * 96;
    return {
      actor, x,
      y: area === 'farm' ? centerY - (idx % 2 === 0 ? 3 : 0) : centerY + (idx % 2 === 0 ? -6 : 2),
      face: x > centerX ? -1 : 1,
      prop: actor === 'player' ? (startId === 'p1' ? 'hoe' : '') : defaultPropFor(actor),
    };
  });
  const actorPos = new Map<Actor, { x: number; y: number }>();
  for (const m of initialMarks) actorPos.set(m.actor, { x: m.x, y: m.y });

  const beats: BeatStep[] = [];
  const shiftToTown = area === 'town' && cat !== 'prologue' && cat !== 'villager' && cat !== 'shop' && cat !== 'area' && startId !== 'secret-true-epilogue';
  const dxTown = shiftToTown ? centerX - 296 : 0;
  const dyTown = shiftToTown ? centerY - 296 : 0;
  for (const node of chain) {
    const ovList = BEAT_OVERRIDES[node.id] ?? [];
    node.lines.forEach((line, li) => {
      const rawOv = ovList[li] ?? {};
      const ov: BeatOverride = shiftToTown ? {
        ...rawOv,
        area: rawOv.area === 'farm' ? undefined : rawOv.area,
        marks: rawOv.marks?.map((m) => (m.x < 460 && m.y < 390 ? { ...m, x: m.x + dxTown, y: m.y + dyTown } : m)),
        move: rawOv.move && rawOv.move.toX < 460 && rawOv.move.toY < 390
          ? { ...rawOv.move, toX: rawOv.move.toX + dxTown, toY: rawOv.move.toY + dyTown }
          : rawOv.move,
        cam: rawOv.cam && rawOv.cam.x < 460 && rawOv.cam.y < 390
          ? { ...rawOv.cam, x: rawOv.cam.x + dxTown, y: rawOv.cam.y + dyTown }
          : rawOv.cam,
      } : rawOv;
      if (ov.marks) {
        for (const m of ov.marks) actorPos.set(m.actor, { x: m.x, y: m.y });
      }
      if (ov.move) {
        actorPos.set(ov.move.actor, { x: ov.move.toX, y: ov.move.toY });
      }
      // Late speakers get an entrance, never a centre spawn or automatic line-to-line walk.
      const marks = ov.marks ? [...ov.marks] : [];
      if (line.who !== 'narrator' && !actorPos.has(line.who) && !ov.move) {
        const occupied = [...actorPos.values()];
        const dx = [190, -190, 280, -280, 380, -380].find((d) => occupied.every((p) => Math.abs(p.x - Math.max(95, Math.min(1185, centerX + d))) >= 92)) ?? 420;
        const x = Math.max(95, Math.min(1185, centerX + dx));
        marks.push({ actor: line.who, x, y: centerY + 2, face: x > centerX ? -1 : 1, prop: defaultPropFor(line.who) });
        actorPos.set(line.who, { x, y: centerY + 2 });
      }
      const spPos = line.who !== 'narrator' ? (actorPos.get(line.who) ?? { x: centerX, y: centerY }) : { x: centerX, y: centerY - 12 };
      const major = cat === 'prologue' || cat === 'chapter' || cat === 'deed' || cat === 'visit' || cat === 'quest';
      beats.push({
        nodeId: node.id,
        lineIdx: li,
        who: line.who,
        area: ov.area,
        marks: marks.length ? marks : undefined,
        move: ov.move,
        pose: ov.pose ?? (line.who === 'narrator' ? 'idle' : defaultPoseFor(line.text, line.who)),
        prop: ov.prop,
        react: ov.react ?? (line.who !== 'narrator' && line.who !== 'player' && line.text.includes('!')
          ? { actor: 'player', pose: 'wave', emote: '!' }
          : undefined),
        emote: ov.emote ?? (line.who === 'narrator' ? undefined : defaultEmoteFor(line.text, line.who, li)),
        cam: ov.cam ?? {
          x: spPos.x,
          y: spPos.y - 14,
          zoom: line.who === 'narrator' ? 1.2 : major ? 1.52 : 1.44,
        },
        prePause: ov.prePause ?? (major && li === 0 && node !== first ? 0.28 : 0),
        cue: ov.cue ?? (node.id.startsWith('quest-done-') && li === 0 ? 'cheer' : undefined),
        burst: ov.burst ?? (node.id.startsWith('quest-done-') && li === 0 ? { kind: 'coin', actor: 'player', count: 10 } : undefined),
      });
    });
  }

  const flagsSet: string[] = [];
  for (const node of chain) {
    flagsSet.push(`seen:${node.id}`);
    for (const e of node.effects ?? []) {
      if (e.k === 'flag') flagsSet.push(`debt.flags.${e.v}`);
      if (e.k === 'chapter') flagsSet.push(`story.chapter=${e.v}`);
      if (e.k === 'note') flagsSet.push(`debt.note=${e.v}`);
      if (e.k === 'end') flagsSet.push('story.postgame=true');
    }
  }

  return {
    id: startId,
    chapter: first.chapter ?? (cat === 'prologue' ? 0 : 1),
    category: cat,
    trigger: describeTrigger(startId, cat),
    prereqs: describePrereqs(startId, first.chapter),
    flagsSet,
    replayable: cat === 'villager' || cat === 'sharkhar' || cat === 'visit',
    durationKind: cat === 'villager' || cat === 'shop' || cat === 'season' ? 'routine' : 'major',
    area,
    setPiece: setPieceFor(startId, area),
    cast,
    initialMarks,
    establishingShot: { x: centerX, y: centerY - 22, zoom: 1.14 },
    closingShot: { x: centerX, y: centerY - 16, zoom: 1.18 },
    beats,
    proceduralNotes: [
      '12-bone procedural arm/torso/head acting poses',
      'Live world-rig mouth-flap + blink sync',
      'Hand-drawn comic emote cloud pop',
      'Critically-damped 2D world camera zoom/pan',
      ...(beats.some((b) => b.cam.shake) ? ['Damped harmonic impact shake + squash-and-stretch'] : []),
      ...(beats.some((b) => b.burst) ? ['Pooled world particles (48-slot zero-GC pool)'] : []),
    ],
    afterOpenModal: shop?.modal ?? null,
  };
}

function describeTrigger(id: string, cat: SceneScript['category']): string {
  if (id === 'p1') return 'New Game start (`maybeStartPrologue()` on first boot)';
  if (cat === 'chapter') return id === 'finale' ? 'Auto-chained after `ch6-outro` (`payDebt` / `finishGame`)' : `Settling Chapter ${id[2]} deed in ` + '`payDebt()`';
  if (cat === 'deed') return `Auto-chained after previous chapter outro (` + '`node.next`' + `)`;
  if (cat === 'visit') return 'VisitGate / `processDebtDay()` when installment due or Sharkhar raid fires';
  if (cat === 'sharkhar') return 'Tapping Jahangir on stage or clicking Talk in Ledger (`talkToSharkhar()`)';
  if (cat === 'villager') return 'Walking up & tapping a villager in Town (`talkToTownNpc(i)`)';
  if (cat === 'area') return `First arrival transition into ${id.replace('area-intro-', '')} (` + '`engine.ts`' + `)`;
  if (cat === 'shop') return `First tap on ${id.replace('shop-intro-', '')} storefront in Town (` + '`townTap`' + `)`;
  if (cat === 'quest') return `Completing Main Chapter Quest ${id.replace('quest-done-', '').toUpperCase()} (` + '`checkStoryQuests()`' + `)`;
  return `First dawn transition into ${id.replace('season-dawn-', '')} (` + '`newDay()`' + `)`;
}

function describePrereqs(id: string, ch?: number): string[] {
  if (id === 'p1') return ['!story.prologueSeen'];
  if (id.startsWith('area-intro-') || id.startsWith('shop-intro-') || id.startsWith('season-dawn-')) return [`!story.seen["${id}"]`];
  if (id.startsWith('quest-done-')) return [`chapter >= ${ch ?? 1}`, `quest metric >= target`];
  if (ch !== undefined) return [`story.chapter == ${ch}`];
  return ['story.prologueSeen'];
}

export type RealActorId_Internal = Actor;

/** Complete enumerable index of all standalone & entry-point scenes in story order */
export function listAllScenes(): SceneScript[] {
  return Object.keys(NODES)
    .map((id) => compileSceneScript(id))
    .filter((s): s is SceneScript => s !== null);
}
