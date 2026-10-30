import { useEffect, useRef, useState } from 'react';
import { Ic, ModalShell } from './parts';
import { FT } from '../strings/frontierText';
import { CFG } from '../game/settings';
import { GOOD, fa, faPct } from '../game/data';
import { sfx } from '../game/sound';
import {
  closeMineEncounter, currentMineEncounter, finishMineEncounter, mineAccuracyAt, mineTargetOpenAt, mineWeakPointAt,
} from '../game/core/mining';

/** استخراج مهارتی کوتاه: سه/چهار نقطهٔ شکست، بدون شکست سخت یا خالی‌آمدن شانسی. */
export function MiningModal() {
  const active = currentMineEncounter();
  const [stage, setStage] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [flash, setFlash] = useState<'perfect' | 'good' | 'miss' | null>(null);
  const [finished, setFinished] = useState(false);
  const markerRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);
  const targetCenterRef = useRef(50);
  const targetWidthRef = useRef(20);
  const targetOpenRef = useRef(true);
  const modifierClockRef = useRef(0);
  const positionRef = useRef(8);
  const directionRef = useRef(1);
  const stageRef = useRef(stage);
  const finishedRef = useRef(false);
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  stageRef.current = stage;
  finishedRef.current = finished;

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      if (!finishedRef.current) {
        const speed = (48 + active.floor * 9 + stageRef.current * 7) * (CFG.reduceMotion ? 0.78 : 1);
        let p = positionRef.current + directionRef.current * speed * dt;
        if (p >= 98) { p = 98; directionRef.current = -1; }
        if (p <= 2) { p = 2; directionRef.current = 1; }
        positionRef.current = p;
        if (markerRef.current) markerRef.current.style.left = `${p}%`;

        modifierClockRef.current += dt * (CFG.reduceMotion ? 0.6 : 1);
        const runtime = mineWeakPointAt(active.floor, active.idx, Math.min(stageRef.current, active.spot.strikes - 1), modifierClockRef.current);
        const open = mineTargetOpenAt(active.floor, modifierClockRef.current);
        targetCenterRef.current = runtime.center;
        targetWidthRef.current = runtime.width;
        targetOpenRef.current = open;
        if (targetRef.current) {
          targetRef.current.style.left = `${runtime.center}%`;
          targetRef.current.style.width = `${runtime.width}%`;
          targetRef.current.style.opacity = open ? '1' : '0.18';
          targetRef.current.setAttribute('data-mine-target-open', String(open));
        }
        if (targetLineRef.current) {
          targetLineRef.current.style.left = `${runtime.center}%`;
          targetLineRef.current.style.opacity = open ? '1' : '0.12';
          targetLineRef.current.setAttribute('data-mine-target-center', runtime.center.toFixed(3));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); if (finishTimer.current) clearTimeout(finishTimer.current); };
  }, [active?.floor, active?.idx]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return null;
  const { floor, idx, spot } = active;
  const target = mineWeakPointAt(floor, idx, Math.min(stage, spot.strikes - 1), 0);
  if (stage === 0 && scores.length === 0 && positionRef.current === 8) {
    targetCenterRef.current = target.center;
    targetWidthRef.current = target.width;
  }
  const royal = spot.good === 'ruby';
  const gemName = GOOD[spot.good]?.fa ?? spot.good;

  const strike = () => {
    if (finished) return;
    const accuracy = mineAccuracyAt(floor, idx, stage, positionRef.current, {
      center: targetCenterRef.current, width: targetWidthRef.current, open: targetOpenRef.current,
    });
    const next = [...scores, accuracy];
    setScores(next);
    const grade = accuracy >= 0.9 ? 'perfect' : accuracy >= 0.48 ? 'good' : 'miss';
    setFlash(grade);
    if (grade === 'miss') sfx.err(); else sfx.dig();
    if (next.length >= spot.strikes) {
      setFinished(true);
      finishTimer.current = setTimeout(() => finishMineEncounter(next, active.token), 520);
    } else {
      setStage(next.length);
    }
  };

  const quick = () => {
    if (finished) return;
    setFinished(true);
    finishMineEncounter(Array.from({ length: spot.strikes }, () => 0.45), active.token);
  };

  const modifierHint = floor === 2 ? FT.mineDriftHint : floor === 3 ? FT.minePulseHint : FT.mineWeakPointHint;
  const flashText = flash === 'perfect' ? FT.minePerfectHit : flash === 'good' ? FT.mineGoodHit : flash === 'miss' ? FT.mineMissHit : modifierHint;
  const average = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const actionBar = (
    <div className="flex items-center gap-1.5">
      <button data-mine-strike="1" className="btn y press min-h-[48px] flex-1 text-sm font-black" disabled={finished} onClick={strike}><Ic n="hammer" s={2} />{finished ? FT.mineGoodHit : FT.mineStrikeBtn}</button>
      <button data-mine-quick="1" className="btn press min-h-[48px] px-3 text-xs font-black" title={FT.mineQuickHint} disabled={finished} onClick={quick}><Ic n="bolt" s={1.5} />{FT.mineQuickBtn}</button>
    </div>
  );

  return (
    <ModalShell title={FT.mineGameTitle} icon="cave" onClose={closeMineEncounter} actions={actionBar}>
      <div data-mining-modal="1" data-mine-stage={stage} data-mine-modifier={floor === 2 ? 'drift' : floor === 3 ? 'pulse' : 'static'} className="mx-auto flex max-w-[39rem] flex-col gap-1.5 p-1 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-black">
          <span className="rounded-full bg-[#503426] px-3 py-1 text-[#fff4d8]">{FT.mineFloorShort} {fa(floor)}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#fff2cf] px-3 py-1 ring-1 ring-[#8a633f]"><Ic n={spot.good} s={1.35} />{gemName}</span>
          <span className="rounded-full bg-[#e4f4e4] px-3 py-1 text-[#315d35]">{FT.mineStageLabel} {fa(Math.min(stage + 1, spot.strikes))}/{fa(spot.strikes)}</span>
        </div>

        <div className="relative mx-auto h-24 w-52 overflow-hidden rounded-2xl border-4 border-[#503426] bg-gradient-to-b from-[#273b4a] to-[#101a25] shadow-inner">
          <svg viewBox="0 0 220 108" className="h-full w-full" role="img" aria-label={gemName}>
            <path d="M18 98 L34 55 L72 24 L133 16 L184 48 L204 98 Z" fill={royal ? '#553343' : '#425564'} stroke="#18242d" strokeWidth="5" />
            <path d="M35 86 L68 49 L107 32 L154 43 L185 88" fill="none" stroke={royal ? '#e45c76' : '#79c9d2'} strokeWidth="10" strokeLinecap="round" opacity=".8" />
            <path d="M48 83 L75 57 L105 45 L145 53 L172 83" fill="none" stroke="#e9fbff" strokeWidth="3" strokeLinecap="round" opacity=".82" />
            {scores.map((score, i) => (
              <path key={i} d={`M${78 + i * 26} ${48 + (i % 2) * 8} l${score > 0.45 ? 18 : 9} 20 l-12 19`} fill="none" stroke="#fff2c4" strokeWidth="3" strokeLinecap="round" />
            ))}
          </svg>
          <div className="absolute bottom-1 left-2 flex items-center gap-1 rounded-full bg-[#101a25cc] px-2 py-0.5 text-white"><Ic n={spot.good} s={1.55} /><span className="text-[.68rem] font-black">{scores.length ? faPct(average * 100) : '—'}</span></div>
        </div>

        <div
          className="flex justify-center gap-2"
          dir="ltr"
          role="progressbar"
          aria-label={FT.mineStageLabel}
          aria-valuemin={0}
          aria-valuemax={spot.strikes}
          aria-valuenow={scores.length}
          aria-valuetext={`${fa(scores.length)} / ${fa(spot.strikes)}`}
        >
          {Array.from({ length: spot.strikes }, (_, i) => <span key={i} className={`h-3 w-9 rounded-full border-2 border-[#503426] ${i < scores.length ? (scores[i] >= 0.9 ? 'bg-[#ffd93b]' : scores[i] >= 0.48 ? 'bg-[#75cf79]' : 'bg-[#b69b80]') : 'bg-[#e5d5b4]'}`} />)}
        </div>

        <div className="select-none px-1" dir="ltr">
          <div className="relative h-14 rounded-xl border-4 border-[#503426] bg-[#1d2c38] shadow-inner">
            <div className="absolute inset-x-3 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[#607483]" />
            <div ref={targetRef} data-mine-target="1" data-mine-target-open="true" className="absolute top-1/2 h-9 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-[#fff4b0] bg-[#f8d94e66] shadow-[0_0_18px_#ffe66d88]" style={{ left: `${target.center}%`, width: `${target.width}%` }} />
            <div ref={targetLineRef} data-mine-target-center={target.center} className="absolute top-1/2 h-11 w-1 -translate-x-1/2 -translate-y-1/2 bg-[#fff7c7]" style={{ left: `${target.center}%` }} />
            <div ref={markerRef} data-mine-marker="1" className="absolute top-1/2 z-10 flex h-12 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border-2 border-[#fff4d8] bg-[#8f4e2d] shadow-lg" style={{ left: '8%' }}><Ic n="hammer" s={2.05} /></div>
          </div>
        </div>

        <div className={`min-h-5 text-xs font-black ${flash === 'perfect' ? 'text-[#8a5a00]' : flash === 'miss' ? 'text-[#8b493b]' : 'text-[#385b45]'}`} aria-live="polite">{flashText}</div>
        {royal && <div className="rounded-lg bg-[#fff0c2] px-2 py-1 text-xs font-black text-[#793343] ring-1 ring-[#d7a43c]"><Ic n="diamond" s={1.25} /> {FT.mineRoyalHint}</div>}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-[#50342630] pt-1.5">
          <Ic n="bolt" s={1.4} />
          <span className="max-w-md text-xs font-bold leading-4 text-[#66503c]">{FT.mineQuickHint}</span>
        </div>
      </div>
    </ModalShell>
  );
}
