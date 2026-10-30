// Pure declarative data types for the in-engine cinematic sequencer (JSON-serializable tracks)
import type { CharId } from './types';

export type SceneArea = 'farm' | 'north' | 'valley' | 'town' | 'river' | 'apiary' | 'cave' | 'forest';

export type EmoteKind = '!' | '?' | 'heart' | 'anger' | 'sweat' | 'music' | 'idea' | 'dots';

export type ActPose =
  | 'idle'
  | 'walk'
  | 'wave'
  | 'talk'
  | 'explain'
  | 'point'
  | 'club-point'
  | 'club-swing'
  | 'recoil'
  | 'sigh'
  | 'cheer'
  | 'stamp'
  | 'think'
  | 'bow'
  | 'laugh'
  | 'work'
  | 'dance'
  | 'dig'
  | 'cast'
  | 'inspect'
  | 'present';

export type StagePropKind =
  | 'deed-table'
  | 'treasure-chest'
  | 'qanat-fountain'
  | 'golden-fish'
  | 'bee-swarm'
  | 'yalda-table'
  | 'contract-rip'
  | 'runaway-rooster'
  | 'flying-ledger'
  | 'kaveh-drone'
  | 'sky-lanterns'
  | 'river-leap';

export type CueKind =
  | 'establish'
  | 'whoosh'
  | 'stamp'
  | 'reveal'
  | 'boop'
  | 'scuffle'
  | 'slam'
  | 'coins'
  | 'cheer'
  | 'suspense'
  | 'objective';

export type ParticleKind = 'coin' | 'star' | 'heart' | 'dust' | 'paper' | 'spark' | 'leaf';

export interface StageMark {
  actor: Exclude<CharId, 'narrator'>;
  x: number;
  y: number;
  face?: -1 | 1;
  prop?: string;
}

export interface CameraKeyframe {
  x: number;
  y: number;
  zoom: number;
  shake?: number;
}

export interface BeatStep {
  nodeId: string;
  lineIdx: number;
  who: CharId;
  area?: SceneArea;
  marks?: StageMark[];
  move?: { actor: Exclude<CharId, 'narrator'>; toX: number; toY: number; face?: -1 | 1 };
  pose?: ActPose;
  prop?: string;
  react?: { actor: Exclude<CharId, 'narrator'>; pose?: ActPose; emote?: EmoteKind; squash?: boolean };
  emote?: EmoteKind;
  cam: CameraKeyframe;
  prePause?: number;      // silent dramatic/comedic hold BEFORE line speaks (in seconds)
  cue?: CueKind;
  burst?: { kind: ParticleKind; actor?: Exclude<CharId, 'narrator'>; x?: number; y?: number; count: number };
}

export interface SceneScript {
  id: string;
  chapter: number;
  category: 'prologue' | 'chapter' | 'deed' | 'visit' | 'sharkhar' | 'villager' | 'area' | 'quest' | 'shop' | 'season' | 'secret';
  trigger: string;
  prereqs: string[];
  flagsSet: string[];
  replayable: boolean;
  durationKind: 'major' | 'routine';
  area: SceneArea;
  setPiece?: { kind: StagePropKind; x: number; y: number };
  cast: Exclude<CharId, 'narrator'>[];
  initialMarks: StageMark[];
  establishingShot: CameraKeyframe;
  closingShot: CameraKeyframe;
  beats: BeatStep[];
  proceduralNotes: string[];
  afterOpenModal?: 'shop' | 'seed' | 'market' | 'work' | 'animal' | 'carp' | 'estate' | null;
}
