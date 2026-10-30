import { useEffect, useRef, useState } from 'react';
import { FISH_STAM, fa } from '../game/data';
import { S, UI, addXp, bumpPlayerCombo, catchRegionalFish, grantGoodWithMailOverflow, notify, rollRiverTreasure, toast } from '../game/state';
import { faPct } from '../strings/fa';
import { checkSecretTriggers } from '../story/secrets';
import { sfx } from '../game/sound';
import { FT } from '../strings/frontierText';
import { UT } from '../strings/uiText';
import { GT } from '../strings/gameText';
import { Ic, useDialogFocus } from './parts';
import { advanceFishMotion, createFishMotionState } from '../game/fishMotion';
import { PRACTICE_FISH_PROFILE, fishingStaminaCost, isPracticeFishing, type FishProfile } from '../game/fishingRules';

const PROFILES: readonly FishProfile[] = [
  { speed: 0.72, barH: 30, bonusMult: 1.0, behavior: 'sine' },
  { speed: 0.9, barH: 28, bonusMult: 1.15, behavior: 'dart' },
  { speed: 1.15, barH: 25, bonusMult: 1.3, behavior: 'pause' },
  { speed: 1.28, barH: 23, bonusMult: 1.5, behavior: 'surge' },
  { speed: 1.48, barH: 21, bonusMult: 1.85, behavior: 'dive' },
];

export function FishingModal() {
  const dialogRef = useDialogFocus<HTMLDivElement>();
  // آمارِ کسری یا نامعتبر (سیوهای قدیمی) نباید ایندکس را خارج از محدوده ببرد و مودال را از کار بیندازد
  const rawIdx = S.day + Math.floor(S.hour) + (S.stats.fish ?? 0);
  const idx = Number.isFinite(rawIdx) ? Math.abs(Math.floor(rawIdx)) % PROFILES.length : 0;
  const practice = isPracticeFishing(S.stats);
  const prof = practice ? PRACTICE_FISH_PROFILE : PROFILES[idx];
  const initialBarY = practice ? 36 : 52;
  const [barY, setBarY] = useState(initialBarY);
  const [fishY, setFishY] = useState(48);
  const [chestY] = useState(() => 22 + ((S.day * 17) % 52));
  const [progress, setProgress] = useState(34);
  const [chestProg, setChestProg] = useState(0);
  const [holding, setHolding] = useState(false);
  const [phase, setPhase] = useState<'ready' | 'playing' | 'result'>('ready');
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [resultSpecies, setResultSpecies] = useState<string | null>(null);

  const stRef = useRef({
    ...createFishMotionState(), barY: initialBarY, vel: 0,
    progress: 34, chestProg: 0, missed: 0, holding: false, ended: false,
  });
  stRef.current.holding = holding;

  const chargeAttempt = (landed: boolean): boolean => {
    const attempt = (S.stats.fishCasts ?? 0) + 1;
    S.stats.fishCasts = attempt;
    const cost = fishingStaminaCost(attempt, landed, FISH_STAM);
    S.stamina = Math.max(0, S.stamina - cost);
    return cost === 0;
  };

  const closeResult = () => {
    stRef.current.ended = true;
    UI.modal = null;
    notify();
  };

  const settleCatch = (won: boolean, perfect: boolean, gotChest: boolean) => {
    if (stRef.current.ended) return;
    stRef.current.ended = true;
    setPhase('result');
    if (S.stamina < FISH_STAM) {
      sfx.err();
      toast('bolt', GT.g35);
      setResultMsg(GT.g35);
      notify();
      return;
    }
    const freeFirstFailure = chargeAttempt(won);
    if (!won) {
      const msg = freeFirstFailure ? `${FT.fishEscaped} · ${FT.fishFirstFailFree}` : FT.fishEscaped;
      sfx.err();
      toast('fish', msg);
      setResultMsg(msg);
      notify();
      return;
    }
    const hasRod = S.rod > 0;
    const rawMult = prof.bonusMult * (perfect ? 1.8 : 1.25);
    const mult = hasRod ? rawMult : Math.min(rawMult, 0.9);
    const res = catchRegionalFish(mult);
    setResultSpecies(res.species.id);
    const extraPerfect = hasRod && perfect && res.qty > 0 ? 1 : 0;
    if (extraPerfect) grantGoodWithMailOverflow(res.species.good, 1, 'rancher', 'fish');
    const totalQty = res.qty + extraPerfect;
    let msg = `+${fa(Math.max(1, totalQty))} ${res.species.name}`;
    if (perfect) {
      bumpPlayerCombo('fish');
      addXp(18);
      msg += ` · ${FT.fishPerfect}`;
    }
    if (hasRod && gotChest) {
      const gold = rollRiverTreasure(() => 0.42);
      grantGoodWithMailOverflow('turquoise', 1, 'engineer', 'fish-chest');
      msg += ` · ${FT.fishChestGot} (+${fa(gold)})`;
      sfx.fanfare();
    } else {
      sfx.splash();
      sfx.coin();
    }
    checkSecretTriggers('fish');
    toast('fish', msg);
    setResultMsg(msg);
    notify();
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    let raf = 0;
    let prev = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.008, (now - prev) / 1000));
      prev = now;
      const s = stRef.current;
      if (s.ended) return;

      const accel = s.holding ? -135 : 108;
      s.vel = Math.max(-92, Math.min(92, s.vel * 0.9 + accel * dt));
      s.barY += s.vel * dt;
      if (s.barY < 4) { s.barY = 4; s.vel = Math.max(0, s.vel * -0.25); }
      if (s.barY > 96 - prof.barH) { s.barY = 96 - prof.barH; s.vel = Math.min(0, s.vel * -0.25); }

      advanceFishMotion(s, prof.behavior, prof.speed, now, dt);

      const inside = s.fishY >= s.barY - 3 && s.fishY <= s.barY + prof.barH + 3;
      if (inside) s.progress = Math.min(100, s.progress + dt * (practice ? 36 : 29));
      else {
        s.missed += dt;
        s.progress = Math.max(0, s.progress - dt * (practice ? 8 : 16.5));
      }

      const onChest = chestY >= s.barY - 2 && chestY <= s.barY + prof.barH + 2;
      if (onChest) s.chestProg = Math.min(100, s.chestProg + dt * 42);

      setBarY(s.barY);
      setFishY(s.fishY);
      setProgress(s.progress);
      setChestProg(s.chestProg);

      if (s.progress >= 100) {
        settleCatch(true, s.missed < 0.35, s.chestProg >= 100);
        return;
      }
      if (s.progress <= 0) {
        settleCatch(false, false, false);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase, practice, prof]);

  const quickCast = () => {
    if (stRef.current.ended) return;
    stRef.current.ended = true;
    setPhase('result');
    if (S.stamina < FISH_STAM) {
      sfx.err(); toast('bolt', GT.g35); setResultMsg(GT.g35); notify(); return;
    }
    const res = catchRegionalFish(S.rod > 0 ? 1 : 0.75, S.rod > 0 ? 0.55 : 0.35);
    const landed = res.qty > 0;
    const freeFirstFailure = chargeAttempt(landed);
    const msg = landed
      ? `+${fa(res.qty)} ${res.species.name}`
      : `${GT.g155}${freeFirstFailure ? ` · ${FT.fishFirstFailFree}` : ''}`;
    if (landed) { setResultSpecies(res.species.id); sfx.splash(); }
    else sfx.err();
    toast('fish', msg);
    setResultMsg(msg);
    checkSecretTriggers('fish');
    notify();
  };

  const beginHolding = () => {
    if (stRef.current.ended) return;
    if (phase === 'ready' && S.stamina < FISH_STAM) {
      stRef.current.ended = true;
      setPhase('result');
      setResultMsg(GT.g35);
      sfx.err();
      toast('bolt', GT.g35);
      notify();
      return;
    }
    if (phase === 'ready') setPhase('playing');
    setHolding(true);
    sfx.water();
  };
  const stopHolding = () => setHolding(false);
  const holdKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== ' ' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    if (!e.repeat) beginHolding();
  };
  const holdKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== ' ' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    stopHolding();
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={FT.fishModalTitle}
      tabIndex={-1}
      data-fishing-minigame="1"
      data-fish-phase={phase}
      data-fish-behavior={prof.behavior}
      data-fish-practice={practice ? '1' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-2 select-none"
      onPointerUp={() => setHolding(false)}
      onPointerCancel={() => setHolding(false)}
    >
      <div
        className="paper popin scroll flex max-h-[94dvh] w-[min(94vw,30rem)] flex-col gap-2.5 overflow-y-auto p-3.5"
        data-modal-scroll="1"
        data-fish-dialog="1"
        role="region"
        aria-label={`${FT.fishModalTitle} — ${UT.modalContent}`}
        tabIndex={0}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="paper-dark flex items-center gap-2 px-3 py-1 text-[#fff4d8]">
            <Ic n="fish" s={2} />
            <span className="ft text-lg">{FT.fishModalTitle}</span>
          </div>
          <button
            type="button"
            aria-label={UT.closeBtn}
            className="btn r press !p-1"
            onClick={closeResult}
          >
            <Ic n="close" s={2} />
          </button>
        </div>

        <div data-fish-hint="1" className="rounded-xl bg-[#f7edd2] px-3 py-1.5 text-center text-xs font-extrabold text-[#503426]">
          <div>{practice ? FT.fishPracticeLabel : FT.fishMotionLabel(prof.behavior)}</div>
          <div id="fish-hold-hint" className="mt-0.5 text-[.7rem]">{phase === 'ready' ? FT.fishReadyHint : FT.fishHoldHint}</div>
        </div>

        {/* Interactive Water Column + Tension Progress Gauge */}
        <div data-fish-playfield="1" className="flex items-stretch justify-center gap-4 py-1">
          <div
            data-fish-water="1"
            className="relative h-56 w-20 touch-none overflow-hidden rounded-2xl border-[3px] border-[#3d291a] bg-gradient-to-b from-[#67c3f3] via-[#2b7cb3] to-[#164268]"
            onPointerDown={beginHolding}
          >
            {/* Sunken Gem Chest */}
            {chestProg < 100 && (
              <div
                style={{ top: `${chestY}%` }}
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md border border-amber-900 bg-amber-300 px-1.5 py-0.5 text-[.62rem] font-black text-amber-950 shadow"
              >
                {faPct(Math.round(chestProg))}
              </div>
            )}
            {/* Player Buoyant Catch Window */}
            <div
              style={{ top: `${barY}%`, height: `${prof.barH}%` }}
              className="pointer-events-none absolute inset-x-1.5 rounded-xl border-2 border-[#d9f99d] bg-emerald-400/55 shadow-inner transition-colors"
            />
            {/* Swimming Fish Silhouette */}
            <div
              style={{ top: `${fishY}%` }}
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#503426] bg-[#ffd93b] p-1 shadow-md"
            >
              <Ic n="fish" s={1.5} />
            </div>
          </div>

          {/* Catch Progress Column */}
          <div className="flex flex-col items-center justify-between">
            <span className="ft text-base text-emerald-800">{faPct(Math.round(progress))}</span>
            <div
              data-fish-progress="1"
              className="relative h-44 w-6 overflow-hidden rounded-full border-2 border-[#503426] bg-[#e9dcc0]"
              role="progressbar"
              aria-label={FT.fishCatchProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
            >
              <div
                style={{ height: `${progress}%` }}
                className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-amber-500 via-lime-500 to-emerald-500"
              />
            </div>
            <Ic n="star" s={1.6} />
          </div>
        </div>

        {resultMsg ? (
          <div className="flex flex-col gap-2" data-fish-result="1">
            <div role="status" aria-live="polite" data-fish-result-species={resultSpecies ?? undefined} className="rounded-xl bg-emerald-100 p-2 text-center text-sm font-black leading-6 text-emerald-950">
              {resultMsg}
            </div>
            <button type="button" data-fish-result-close="1" className="btn g press !min-h-[48px] !px-4 !py-1.5 text-sm font-black" onClick={closeResult}>
              <Ic n="check" s={1.5} /><span>{FT.fishResultClose}</span>
            </button>
          </div>
        ) : (
          <div data-fish-actions="1" className="flex flex-wrap gap-2">
            <button
              type="button"
              data-fish-hold="1"
              aria-label={FT.fishHoldBtn}
              aria-describedby="fish-hold-hint"
              aria-pressed={holding}
              className={'btn press touch-none flex-1 !py-2.5 text-sm font-black ' + (holding ? 'y' : 'g')}
              onPointerDown={beginHolding}
              onPointerUp={stopHolding}
              onPointerCancel={stopHolding}
              onKeyDown={holdKeyDown}
              onKeyUp={holdKeyUp}
              onBlur={stopHolding}
            >
              <Ic n="fish" s={1.8} />
              <span>{phase === 'ready' ? FT.fishStartBtn : FT.fishHoldBtn}</span>
            </button>
            <button
              type="button"
              data-fish-quick="1"
              aria-label={FT.fishQuickBtn}
              className="btn b press !px-3 !py-2 text-xs font-black"
              onClick={quickCast}
            >
              <span>{FT.fishQuickBtn}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
