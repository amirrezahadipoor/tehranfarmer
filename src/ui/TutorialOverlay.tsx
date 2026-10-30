// ===== آموزش روز اول: فلش ابزار در چهار گام نخست و coach mark برای فروش/دفتر/خواب =====
// فلش روی دکمهٔ ابزار گام فعلی می‌نشیند و شمارهٔ گام روی کرت دیده می‌شود.
// گام‌های پایانی متن کوتاه دارند، اما بازی یا سفر را قفل نمی‌کنند.
import { useEffect, useState } from 'react';
import { UI, useGame } from '../game/state';
import { TUT_STEP_COUNT, syncTut, tutActive, tutExpectedTool, tutMaybeStart, tutSkip, tutStep } from '../game/tutorial';
import { UT } from '../strings/uiText';
import { Ic } from './parts';

export function TutorialOverlay() {
  useGame();
  useEffect(() => {
    tutMaybeStart();
    syncTut();
  });
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  // ردیابِ زندهٔ دکمهٔ ابزارِ گامِ فعلی — setState فقط هنگامِ جابه‌جاییِ واقعی (بدون بارِ رندر)
  useEffect(() => {
    if (!tutActive() || tutStep() >= 4) { setTip(null); return; }
    let raf = 0;
    const loop = () => {
      const el = document.querySelector<HTMLElement>(`[data-tool="${tutExpectedTool()}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        const nx = r.left + r.width / 2;
        const ny = r.top;
        setTip((prev) => (prev && Math.abs(prev.x - nx) < 0.6 && Math.abs(prev.y - ny) < 0.6 ? prev : { x: nx, y: ny }));
      } else {
        setTip(null);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  });
  if (!tutActive()) return null;
  const step = tutStep();
  const guide = step === 4
    ? { icon: 'cart', title: UT.tutSell, hint: UT.tutSellHint }
    : step === 5
      ? { icon: 'ledger', title: UT.tutLedger, hint: UT.tutLedgerHint }
      : step === 6
        ? { icon: 'moon', title: UT.tutSleep, hint: UT.tutSleepHint }
        : null;
  return (
    <div data-tutorial="1" data-tutorial-step={step} className="pointer-events-none fixed inset-0 z-[45]">
      <div
        aria-hidden
        className="absolute left-1/2 flex -translate-x-1/2 gap-1.5"
        style={{ top: 'calc(var(--safe-top) + 6.4rem)' }}
      >
        {Array.from({ length: TUT_STEP_COUNT }, (_, n) => (
          <span
            key={n}
            className={
              'h-2.5 w-2.5 rounded-full ' +
              (n === step ? 'animate-pulse bg-amber-400 ring-2 ring-white' : n < step ? 'bg-emerald-500' : 'bg-white/45')
            }
          />
        ))}
      </div>
      {guide && (
        <div className="paper absolute left-1/2 flex w-[min(70vw,28rem)] -translate-x-1/2 items-center gap-2 px-3 py-1.5 text-xs" style={{ top: 'calc(var(--safe-top) + 8.2rem)' }} data-tutorial-guide="1">
          <Ic n={guide.icon} s={2.2} />
          <div className="min-w-0 flex-1">
            <div className="font-black">{guide.title}</div>
            <div className="font-bold opacity-80">{guide.hint}</div>
          </div>
        </div>
      )}
      {tip && (
        <svg
          aria-hidden
          viewBox="0 0 40 36"
          className="absolute h-9 w-10 animate-bounce"
          style={{ left: tip.x - 20, top: tip.y - 42, animationDuration: '0.9s' }}
        >
          <path d="M20 3 L20 21" stroke="#5b3a1e" strokeWidth="13" strokeLinecap="round" fill="none" />
          <path d="M20 3 L20 21" stroke="#ffd93b" strokeWidth="6.5" strokeLinecap="round" fill="none" />
          <path d="M7.5 17 L20 33 L32.5 17 Z" fill="#ffd93b" stroke="#5b3a1e" strokeWidth="4.5" strokeLinejoin="round" />
        </svg>
      )}
      <button
        type="button"
        aria-label={UT.uTutSkip}
        title={UT.uTutSkip}
        onClick={() => tutSkip()}
        className="btn r press pointer-events-auto fixed z-[60] !min-h-[48px] !min-w-[48px] !p-1"
        style={{
          right: '.6rem',
          top: UI.portrait ? 'calc(var(--safe-top) + 15rem)' : 'auto',
          bottom: UI.portrait ? 'auto' : 'calc(var(--safe-bottom) + 4.5rem)',
        }}
      >
        <Ic n="close" s={2.2} />
      </button>
    </div>
  );
}
