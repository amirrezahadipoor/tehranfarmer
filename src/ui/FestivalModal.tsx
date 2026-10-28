import { useEffect, useRef, useState } from 'react';
import { GOOD, fa } from '../game/data';
import { S, UI, notify } from '../game/state';
import { faPct } from '../strings/fa';
import {
  completeFestivalContest, ensureFrontier, isTownFestivalActive,
  judgeFestivalSubmission, redeemFestivalTokens, ringTownFestivalBell,
} from '../game/core/frontier';
import { sfx } from '../game/sound';
import { FT } from '../strings/frontierText';
import { Ic, ModalShell } from './parts';

export type FairTab = 'judge' | 'cauldron' | 'archery' | 'prizes';

export function FestivalModal() {
  const f = ensureFrontier();
  const [tab, setTab] = useState<FairTab>(UI.fairTab ?? 'judge');
  const [picked, setPicked] = useState<string[]>([]);
  const [banner, setBanner] = useState<string | null>(null);

  // Cauldron Stir Physics
  const [stirRunning, setStirRunning] = useState(false);
  const [heat, setHeat] = useState(50);
  const [sweet, setSweet] = useState(50);
  const [stirScore, setStirScore] = useState(0);
  const [stoking, setStoking] = useState(false);
  const stirRef = useRef({ heat: 50, sweet: 50, okTime: 0, elapsed: 0, stoking: false });
  stirRef.current.stoking = stoking;

  // Archery Sight Physics
  const [sight, setSight] = useState(50);
  const [arrowsLeft, setArrowsLeft] = useState(3);
  const [archHits, setArchHits] = useState(0);

  useEffect(() => {
    if (!stirRunning) return;
    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const st = stirRef.current;
      st.elapsed += dt;
      st.sweet = 50 + Math.sin(st.elapsed * 1.9) * 28;
      st.heat = Math.max(5, Math.min(95, st.heat + (st.stoking ? 72 : -54) * dt));
      if (Math.abs(st.heat - st.sweet) <= 16) st.okTime += dt;
      setHeat(st.heat);
      setSweet(st.sweet);
      setStirScore(Math.min(100, Math.round((st.okTime / 5.5) * 100)));
      if (st.elapsed >= 5.5) {
        setStirRunning(false);
        const res = completeFestivalContest('cauldron', st.okTime / 5.5);
        if (res) setBanner(`+${fa(res.coins)} · +${fa(res.tokens)} ${FT.fairTokens}`);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stirRunning]);

  useEffect(() => {
    if (tab !== 'archery') return;
    let raf = 0;
    const loop = (now: number) => {
      setSight(50 + Math.sin(now * 0.0044) * 42);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tab]);

  const invEntries = Object.entries(S.inv).filter(([id, n]) => n > 0 && GOOD[id]);
  const validPicked = picked.filter((id) => (S.inv[id] ?? 0) > 0);
  const fairLive = isTownFestivalActive();

  const togglePick = (id: string) => {
    sfx.tap();
    setPicked((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < 3 ? [...cur, id] : cur);
  };

  const fireArrow = () => {
    if (arrowsLeft <= 0) return;
    const dist = Math.abs(sight - 50);
    const pts = dist <= 9 ? 1 : dist <= 22 ? 0.65 : 0.25;
    const nextHits = archHits + pts;
    const rem = arrowsLeft - 1;
    sfx.pop();
    setArchHits(nextHits);
    setArrowsLeft(rem);
    if (rem <= 0) {
      const res = completeFestivalContest('archery', nextHits / 3);
      if (res) setBanner(`+${fa(res.coins)} — +${fa(res.tokens)} ${FT.fairTokens}`);
    }
  };

  return (
    <ModalShell title={FT.fairTitle} icon="star" wide onClose={() => { UI.modal = null; notify(); }}>
      <div data-festival-modal="1" className="space-y-2.5 pb-2">
        <div className="paper flex flex-wrap items-center justify-between gap-2 p-2.5 text-xs font-extrabold">
          <span>{FT.fairSub}</span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-amber-200 px-2.5 py-1 text-amber-950">
              {FT.fairTokens}: {fa(f.festivalTokens)}
            </span>
            {!fairLive && (
              <button
                type="button"
                data-ring-fair-bell="1"
                aria-label={FT.fairOpenBell}
                className="btn y press !px-3 !py-1.5 text-xs font-black"
                onClick={() => ringTownFestivalBell()}
              >
                <Ic n="star" s={1.5} />
                <span>{FT.fairOpenBell}</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {([
            ['judge', 'star', FT.fairBoothJudge],
            ['cauldron', 'fire', FT.fairBoothCauldron],
            ['archery', 'target', FT.fairBoothArchery],
            ['prizes', 'coin', FT.fairBoothPrizes],
          ] as const).map(([id, ic, label]) => (
            <button
              key={id}
              type="button"
              data-fair-tab={id}
              aria-label={label}
              className={'btn press !px-3 !py-1 text-xs font-black ' + (tab === id ? 'y' : 'b')}
              onClick={() => { sfx.tap(); setTab(id); setBanner(null); }}
            >
              <Ic n={ic} s={1.4} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {banner && (
          <div className="rounded-xl border-2 border-emerald-700 bg-emerald-100 p-2 text-center text-sm font-black text-emerald-950">
            {banner}
          </div>
        )}

        {tab === 'judge' && (
          <div className="paper space-y-2.5 p-3">
            <div className="text-xs font-extrabold">{FT.judgeHint}</div>
            <div className="flex flex-wrap gap-1.5">
              {invEntries.map(([id, qty]) => {
                const on = validPicked.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    aria-label={GOOD[id].fa}
                    className={'btn press !px-2.5 !py-1 text-xs font-black ' + (on ? 'g' : '')}
                    onClick={() => togglePick(id)}
                  >
                    <Ic n={id} s={1.4} />
                    <span>{GOOD[id].fa} ({fa(qty)})</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              data-judge-submit="1"
              aria-label={FT.judgeSubmit}
              disabled={!validPicked.length || f.fairPlayed.judge === S.day}
              className="btn y press w-full !py-2 text-sm font-black"
              onClick={() => {
                const res = judgeFestivalSubmission(validPicked);
                if (res) {
                  setPicked([]);
                  setBanner(`${fa(res.rank)} · ${fa(res.score)}/${fa(100)} · +${fa(res.coins)} · +${fa(res.tokens)} ${FT.fairTokens}`);
                }
              }}
            >
              <Ic n="crown" s={1.7} />
              <span>{f.fairPlayed.judge === S.day ? FT.fairDoneToday : FT.judgeSubmit}</span>
            </button>
          </div>
        )}

        {tab === 'cauldron' && (
          <div className="paper space-y-3 p-3">
            <div className="text-xs font-extrabold">{FT.stirHint}</div>
            <div className="relative h-9 overflow-hidden rounded-full border-2 border-[#503426] bg-[#f3e3c3]">
              <div
                style={{ left: `${Math.max(0, sweet - 16)}%`, width: '32%' }}
                className="absolute inset-y-0 bg-amber-300/80"
              />
              <div
                style={{ left: `${heat}%` }}
                className="absolute inset-y-0 w-2.5 -translate-x-1/2 bg-rose-600"
              />
            </div>
            <div className="text-center text-xs font-black">{faPct(stirScore)}</div>
            {!stirRunning ? (
              <button
                type="button"
                data-stir-start="1"
                aria-label={FT.stirStart}
                disabled={f.fairPlayed.cauldron === S.day}
                className="btn g press w-full !py-2 text-sm font-black"
                onClick={() => {
                  stirRef.current = { heat: 50, sweet: 50, okTime: 0, elapsed: 0, stoking: false };
                  setStirRunning(true);
                }}
              >
                <Ic n="fire" s={1.6} />
                <span>{f.fairPlayed.cauldron === S.day ? FT.fairDoneToday : FT.stirStart}</span>
              </button>
            ) : (
              <button
                type="button"
                aria-label={FT.stirHold}
                className={'btn press w-full !py-2.5 text-sm font-black ' + (stoking ? 'y' : 'g')}
                onPointerDown={() => setStoking(true)}
                onPointerUp={() => setStoking(false)}
                onPointerLeave={() => setStoking(false)}
              >
                <span>{FT.stirHold}</span>
              </button>
            )}
          </div>
        )}

        {tab === 'archery' && (
          <div className="paper space-y-3 p-3">
            <div className="text-xs font-extrabold">{FT.archeryHint}</div>
            <div className="relative h-9 overflow-hidden rounded-full border-2 border-[#503426] bg-[#e6f0dc]">
              <div style={{ left: '41%', width: '18%' }} className="absolute inset-y-0 bg-amber-400" />
              <div style={{ left: `${sight}%` }} className="absolute inset-y-0 w-2.5 -translate-x-1/2 bg-[#1d4ed8]" />
            </div>
            <button
              type="button"
              data-archery-fire="1"
              aria-label={FT.archeryFire}
              disabled={arrowsLeft <= 0 || f.fairPlayed.archery === S.day}
              className="btn y press w-full !py-2 text-sm font-black"
              onClick={fireArrow}
            >
              <Ic n="target" s={1.6} />
              <span>{f.fairPlayed.archery === S.day ? FT.fairDoneToday : `${FT.archeryFire} (${fa(arrowsLeft)})`}</span>
            </button>
          </div>
        )}

        {tab === 'prizes' && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {([
              ['elixir', 'herbal-elixir', FT.recElixirName, 3],
              ['saffron', 'seed:saffron', GOOD.saffron.fa + ' ×' + fa(3), 3],
              ['turquoise', 'turquoise', FT.goodTurquoise + ' ×' + fa(2), 4],
              ['gold', 'coin', '+' + fa(650), 5],
            ] as const).map(([pid, ic, title, cost]) => (
              <div key={pid} className="paper flex items-center justify-between gap-2 p-2.5 text-xs font-black">
                <div className="flex items-center gap-2">
                  <Ic n={ic} s={1.8} />
                  <span>{title}</span>
                </div>
                <button
                  type="button"
                  data-redeem-prize={pid}
                  aria-label={title}
                  disabled={f.festivalTokens < cost}
                  className="btn g press !px-2.5 !py-1 text-xs font-black"
                  onClick={() => redeemFestivalTokens(pid)}
                >
                  <span>{fa(cost)} {FT.fairTokens}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
