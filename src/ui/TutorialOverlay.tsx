// ===== پوشش آموزش روز اول — بدون هیچ نوشته‌ای: نقاط پیشرفت + دکمهٔ بستن برای رد کردن =====
import { useEffect } from 'react';
import { useGame } from '../game/state';
import { syncTut, tutActive, tutMaybeStart, tutSkip, tutStep } from '../game/tutorial';
import { UT } from '../strings/uiText';
import { Ic } from './parts';

export function TutorialOverlay() {
  useGame();
  useEffect(() => {
    tutMaybeStart();
    syncTut();
  });
  if (!tutActive()) return null;
  const step = tutStep();
  return (
    <div data-tutorial="1" className="pointer-events-none fixed inset-0 z-[45]">
      <div
        aria-hidden
        className="absolute left-1/2 flex -translate-x-1/2 gap-1.5"
        style={{ top: 'calc(var(--safe-top) + 6.4rem)' }}
      >
        {[0, 1, 2, 3].map((n) => (
          <span
            key={n}
            className={
              'h-2.5 w-2.5 rounded-full ' +
              (n === step ? 'animate-pulse bg-amber-400 ring-2 ring-white' : n < step ? 'bg-emerald-500' : 'bg-white/45')
            }
          />
        ))}
      </div>
      <button
        type="button"
        aria-label={UT.uTutSkip}
        title={UT.uTutSkip}
        onClick={() => tutSkip()}
        className="btn r press pointer-events-auto fixed z-[60] !min-h-[48px] !min-w-[48px] !p-1"
        style={{ right: '.6rem', top: 'calc(var(--safe-top) + 6.4rem)' }}
      >
        <Ic n="close" s={2.2} />
      </button>
    </div>
  );
}
