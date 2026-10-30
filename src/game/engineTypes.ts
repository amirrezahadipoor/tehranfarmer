import type { AnimalKind } from './data';
import type { FarmSceneId } from './estates';

export interface EngineRigSnapshot {
  builder: { phase: 'off' | 'walk' | 'work' | 'exit'; mode: string; x: number; y: number; legF: number; legB: number; shinF: number; armF: number; hasTool: boolean };
  workers: Array<{ x: number; y: number; mode: string; kind: string; legF: number; stuckRecoveries: number; post?: FarmSceneId; visible: boolean }>;
  animals: Array<{ id: number; kind: AnimalKind; x: number; y: number; mode: string; scale: number }>;
  pausedInBackground: boolean;
  framesRendered: number;
  viewport: { scale: number; tx: number; ty: number };
}
