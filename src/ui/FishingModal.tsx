import { useEffect, useRef, useState } from 'react';
import { FISH_STAM, fa } from '../game/data';
import { S, UI, addXp, bumpPlayerCombo, catchRegionalFish, grantGoodWithMailOverflow, notify, rollRiverTreasure, toast } from '../game/state';
import { faPct } from '../strings/fa';
import { checkSecretTriggers } from '../story/secrets';
import { sfx } from '../game/sound';
import { FT } from '../strings/frontierText';
import { UT } from '../strings/uiText';
import { GT } from '../strings/gameText';
import { Ic } from './parts';

interface FishProfile {
  nameKey: 'fishSpeciesTrout' | 'fishSpeciesCarp' | 'fishSpeciesSalmon' | 'fishSpeciesPearl' | 'fishSpeciesSturgeon';
  speed: number;
  barH: number;
  bonusMult: number;
}

const PROFILES: readonly FishProfile[] = [
  { nameKey: 'fishSpeciesTrout', speed: 0.72, barH: 30, bonusMult: 1.0 },
  { nameKey: 'fishSpeciesCarp', speed: 0.9, barH: 28, bonusMult: 1.15 },
  { nameKey: 'fishSpeciesSalmon', speed: 1.15, barH: 25, bonusMult: 1.3 },
  { nameKey: 'fishSpeciesPearl', speed: 1.28, barH: 23, bonusMult: 1.5 },
  { nameKey: 'fishSpeciesSturgeon', speed: 1.48, barH: 21, bonusMult: 1.85 },
];

export function FishingModal() {
  const idx = (S.day + Math.floor(S.hour) + (S.stats.fish ?? 0)) % PROFILES.length;
  const prof = PROFILES[idx];
  const [barY, setBarY] = useState(52);
  const [fishY, setFishY] = useState(48);
  const [chestY] = useState(() => 22 + ((S.day * 17) % 52));
  const [progress, setProgress] = useState(34);
  const [chestProg, setChestProg] = useState(0);
  const [holding, setHolding] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stRef = useRef({
    barY: 52, vel: 0, fishY: 48, fishTarget: 32, retarget: 0.5,
    progress: 34, chestProg: 0, missed: 0, holding: false, ended: false,
  });
  stRef.current.holding = holding;

  const scheduleAutoClose = (ms: number) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      if (UI.modal === 'fishing') { UI.modal = null; notify(); }
    }, ms);
  };

  const settleCatch = (won: boolean, perfect: boolean, gotChest: boolean) => {
    if (stRef.current.ended) return;
    stRef.current.ended = true;
    if (S.stamina < FISH_STAM) {
      sfx.err();
      toast('bolt', GT.g35);
      setResultMsg(GT.g35);
      scheduleAutoClose(650);
      notify();
      return;
    }
    S.stamina = Math.max(0, S.stamina - FISH_STAM);
    if (!won) {
      sfx.err();
      toast('fish', FT.fishEscaped);
      setResultMsg(FT.fishEscaped);
      scheduleAutoClose(650);
      notify();
      return;
    }
    const hasRod = S.rod > 0;
    const rawMult = prof.bonusMult * (perfect ? 1.8 : 1.25);
    const mult = hasRod ? rawMult : Math.min(rawMult, 0.9);
    const res = catchRegionalFish(mult);
    const extraPerfect = hasRod && perfect && res.qty > 0 ? grantGoodWithMailOverflow(res.species.good, 1, 'rancher', 'fish') : 0;
    const totalQty = res.qty + extraPerfect;
    let msg = `+${fa(Math.max(1, totalQty))} ${FT[prof.nameKey]}`;
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
    scheduleAutoClose(850);
    notify();
  };

  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.008, (now - prev) / 1000));
      prev = now;
      const s = stRef.current;
      if (s.ended) return;

      // Buoyant lift vs water gravity
      const accel = s.holding ? -135 : 108;
      s.vel = Math.max(-92, Math.min(92, s.vel * 0.9 + accel * dt));
      s.barY += s.vel * dt;
      if (s.barY < 4) { s.barY = 4; s.vel = Math.max(0, s.vel * -0.25); }
      if (s.barY > 96 - prof.barH) { s.barY = 96 - prof.barH; s.vel = Math.min(0, s.vel * -0.25); }

      // Fish AI darting movement
      s.retarget -= dt;
      if (s.retarget <= 0) {
        s.retarget = 0.45 + ((now % 7) * 0.09);
        const wave = Math.sin(now * 0.0023 * prof.speed) * 34;
        s.fishTarget = Math.max(8, Math.min(90, 48 + wave));
      }
      s.fishY += (s.fishTarget - s.fishY) * Math.min(1, dt * 2.8 * prof.speed);

      const inside = s.fishY >= s.barY - 3 && s.fishY <= s.barY + prof.barH + 3;
      if (inside) s.progress = Math.min(100, s.progress + dt * 29);
      else {
        s.missed += dt;
        s.progress = Math.max(0, s.progress - dt * 16.5);
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
    return () => {
      cancelAnimationFrame(raf);
      if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    };
  }, []);

  const quickCast = () => {
    if (stRef.current.ended) return;
    stRef.current.ended = true;
    if (S.stamina < FISH_STAM) { sfx.err(); toast('bolt', GT.g35); UI.modal = null; notify(); return; }
    S.stamina = Math.max(0, S.stamina - FISH_STAM);
    const res = catchRegionalFish(S.rod > 0 ? 1.1 : 0.85);
    if (res.qty <= 0) { sfx.err(); toast('fish', GT.g155); }
    else { sfx.splash(); toast('fish', `+${fa(res.qty)}`); }
    checkSecretTriggers('fish');
    UI.modal = null;
    notify();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={FT.fishModalTitle}
      data-fishing-minigame="1"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-2 select-none"
      onPointerUp={() => setHolding(false)}
      onPointerCancel={() => setHolding(false)}
    >
      <div className="paper popin flex w-[min(94vw,30rem)] flex-col gap-2.5 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="paper-dark flex items-center gap-2 px-3 py-1 text-[#fff4d8]">
            <Ic n="fish" s={2} />
            <span className="ft text-lg">{FT.fishModalTitle}</span>
          </div>
          <button
            type="button"
            aria-label={UT.closeBtn}
            className="btn r press !p-1"
            onClick={() => {
              stRef.current.ended = true;
              if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
              UI.modal = null;
              notify();
            }}
          >
            <Ic n="close" s={2} />
          </button>
        </div>

        <div className="rounded-xl bg-[#f7edd2] px-3 py-1.5 text-center text-xs font-extrabold text-[#503426]">
          <div>{FT[prof.nameKey]}</div>
          <div className="mt-0.5 text-[.7rem] opacity-80">{FT.fishHoldHint}</div>
        </div>

        {/* Interactive Water Column + Tension Progress Gauge */}
        <div className="flex items-stretch justify-center gap-4 py-1">
          <div
            className="relative h-56 w-20 overflow-hidden rounded-2xl border-[3px] border-[#3d291a] bg-gradient-to-b from-[#67c3f3] via-[#2b7cb3] to-[#164268]"
            onPointerDown={() => { setHolding(true); sfx.water(); }}
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
            <div className="relative h-44 w-6 overflow-hidden rounded-full border-2 border-[#503426] bg-[#e9dcc0]">
              <div
                style={{ height: `${progress}%` }}
                className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-amber-500 via-lime-500 to-emerald-500"
              />
            </div>
            <Ic n="star" s={1.6} />
          </div>
        </div>

        {resultMsg ? (
          <div className="rounded-xl bg-emerald-100 p-2 text-center text-sm font-black text-emerald-950">
            {resultMsg}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-fish-hold="1"
              aria-label={FT.fishHoldBtn}
              className={'btn press flex-1 !py-2.5 text-sm font-black ' + (holding ? 'y' : 'g')}
              onPointerDown={() => { setHolding(true); sfx.water(); }}
              onPointerUp={() => setHolding(false)}
            >
              <Ic n="fish" s={1.8} />
              <span>{FT.fishHoldBtn}</span>
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
