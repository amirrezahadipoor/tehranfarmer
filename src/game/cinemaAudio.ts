// Synthesized per-character voice blips, audio ducking & procedural cinematic foley (zero external audio files)
import { ambient, audioCtx, haptic, sfx } from './sound';
import type { CharId } from '../story/types';
import type { CueKind } from '../story/cinemaTypes';

const VOICE_SPEC: Record<CharId, { base: number; wave: OscillatorType; spread: number; vol: number }> = {
  narrator: { base: 460, wave: 'sine', spread: 24, vol: 0.018 },
  player: { base: 238, wave: 'triangle', spread: 42, vol: 0.042 },
  grandma: { base: 332, wave: 'sine', spread: 36, vol: 0.038 },
  jahangir: { base: 146, wave: 'sawtooth', spread: 28, vol: 0.028 },
  engineer: { base: 292, wave: 'square', spread: 30, vol: 0.022 },
  sara: { base: 382, wave: 'triangle', spread: 48, vol: 0.038 },
  rancher: { base: 184, wave: 'triangle', spread: 26, vol: 0.04 },
  carpenter: { base: 172, wave: 'triangle', spread: 22, vol: 0.036 },
  estateAgent: { base: 356, wave: 'sine', spread: 34, vol: 0.034 },
};

let lastBlipAt = 0;

export function setMusicDuck(ducked: boolean) {
  ambient.duck = ducked ? 0.28 : 1;
}

export function playVoiceBlip(who: CharId, charIdx: number) {
  const a = audioCtx();
  if (!a) return;
  const now = a.currentTime;
  if (now - lastBlipAt < 0.048) return;
  lastBlipAt = now;
  const v = VOICE_SPEC[who] ?? VOICE_SPEC.player;
  const detune = ((charIdx * 37) % 7 - 3) * (v.spread / 3);
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = v.wave;
  o.frequency.setValueAtTime(Math.max(95, v.base + detune), now);
  o.frequency.exponentialRampToValueAtTime(Math.max(85, (v.base + detune) * 1.07), now + 0.045);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(v.vol, now + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.052);
  o.connect(g);
  g.connect(a.destination);
  o.start(now);
  o.stop(now + 0.065);
}

function quickChord(freqs: number[], dur: number, type: OscillatorType, vol: number, stagger = 0.06) {
  const a = audioCtx();
  if (!a) return;
  freqs.forEach((f, i) => {
    const t0 = a.currentTime + i * stagger;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(a.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  });
}

export function playCinemaCue(cue?: CueKind) {
  if (!cue) return;
  switch (cue) {
    case 'establish':
      quickChord([261.6, 329.6, 392.0], 0.36, 'sine', 0.03, 0.08);
      break;
    case 'whoosh':
      quickChord([210, 320], 0.14, 'sine', 0.028, 0.03);
      break;
    case 'stamp':
      haptic('heavy');
      sfx.dig();
      quickChord([130.8, 196.0], 0.26, 'triangle', 0.055, 0.02);
      break;
    case 'reveal':
      haptic('medium');
      quickChord([220, 277.2, 329.6, 440], 0.42, 'triangle', 0.04, 0.07);
      break;
    case 'boop':
      haptic('heavy');
      sfx.boop();
      break;
    case 'scuffle':
      haptic('medium');
      sfx.dig();
      sfx.boop();
      break;
    case 'slam':
      haptic('heavy');
      quickChord([98, 146.8], 0.24, 'sawtooth', 0.05, 0.01);
      break;
    case 'coins':
      sfx.coin();
      break;
    case 'cheer':
      sfx.fanfare();
      break;
    case 'suspense':
      quickChord([146.8, 155.6], 0.5, 'sine', 0.03, 0.12);
      break;
    case 'objective':
      quickChord([392.0, 493.9, 587.3], 0.28, 'triangle', 0.035, 0.06);
      break;
  }
}
