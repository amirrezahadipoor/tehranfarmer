// ===== راهنمای روز اول: کارت خوانا، هدف زنده و کنترل آشکار؛ بدون قفل‌کردن بازی =====
import { useEffect, useState } from 'react';
import { cmd } from '../game/engine';
import { CFG } from '../game/settings';
import { FIELD_X, FIELD_Y, PLOT_DX, PLOT_DY } from '../game/scenes';
import { UI, useGame } from '../game/state';
import { TUT_STEP_COUNT, syncTut, tutActive, tutExpectedTool, tutMaybeStart, tutSkip, tutStep } from '../game/tutorial';
import { fa } from '../strings/fa';
import { TUTORIAL_COPY } from '../strings/tutorialText';
import { Ic } from './parts';

type TargetRect = { x: number; y: number; w: number; h: number };

function elementTarget(selectors: string[]): TargetRect | null {
  for (const selector of selectors) {
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none') {
        return { x: r.left, y: r.top, w: r.width, h: r.height };
      }
    }
  }
  return null;
}

function canvasTarget(step: number): TargetRect | null {
  const logical = step < 4
    ? { x: FIELD_X, y: FIELD_Y, w: PLOT_DX, h: PLOT_DY }
    : step === 4 && UI.scene === 'town'
      ? { x: 292, y: 210, w: 116, h: 238 }
      : null;
  const viewport = cmd.inspectEngine()?.viewport;
  const canvas = document.getElementById('game-canvas');
  if (!logical || !viewport || !canvas) return null;
  const bounds = canvas.getBoundingClientRect();
  return {
    x: bounds.left + viewport.tx + logical.x * viewport.scale,
    y: bounds.top + viewport.ty + logical.y * viewport.scale,
    w: logical.w * viewport.scale,
    h: logical.h * viewport.scale,
  };
}

function findTarget(step: number): TargetRect | null {
  const selectors = step === 4 && UI.scene !== 'town'
    ? ['[data-nav="town"]', '[data-mobile-atlas="1"]']
    : step === 5
      ? ['[data-open-ledger="1"]']
      : step === 6
        ? ['[data-rest-anytime="1"]']
        : [];
  const dom = selectors.length ? elementTarget(selectors) : null;
  const raw = dom ?? canvasTarget(step);
  if (!raw || raw.w <= 0 || raw.h <= 0) return null;
  if (raw.x + raw.w < 0 || raw.y + raw.h < 0 || raw.x > innerWidth || raw.y > innerHeight) return null;
  const left = Math.max(4, raw.x - 4), top = Math.max(4, raw.y - 4);
  const right = Math.min(innerWidth - 4, raw.x + raw.w + 4);
  const bottom = Math.min(innerHeight - 4, raw.y + raw.h + 4);
  return { x: left, y: top, w: Math.max(0, right - left), h: Math.max(0, bottom - top) };
}

const sameRect = (a: TargetRect | null, b: TargetRect | null) => Boolean(a && b
  && Math.abs(a.x - b.x) < 0.6 && Math.abs(a.y - b.y) < 0.6
  && Math.abs(a.w - b.w) < 0.6 && Math.abs(a.h - b.h) < 0.6);

export function TutorialOverlay() {
  useGame();
  useEffect(() => { tutMaybeStart(); syncTut(); });
  const active = tutActive();
  const step = tutStep();
  const scene = UI.scene;
  const [target, setTarget] = useState<TargetRect | null>(null);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (!active) { setTarget(null); return; }
    let raf = 0;
    const follow = () => {
      const next = findTarget(step);
      setTarget((previous) => sameRect(previous, next) ? previous : next);
      raf = requestAnimationFrame(follow);
    };
    raf = requestAnimationFrame(follow);
    return () => cancelAnimationFrame(raf);
  }, [active, step, scene]);

  if (!active) return null;
  const copy = TUTORIAL_COPY[CFG.locale === 'en' ? 'en' : 'fa'];
  const current = copy.steps[Math.min(step, TUT_STEP_COUNT - 1)];
  const needsTool = step < 4 && UI.tool !== tutExpectedTool();
  const hint = needsTool && current.selectHint
    ? current.selectHint
    : step === 4 && scene === 'town' && current.townHint
      ? current.townHint
      : current.hint;
  const stepLabel = `${copy.step} ${fa(step + 1)} ${copy.of} ${fa(TUT_STEP_COUNT)}`;

  return (
    <div
      data-tutorial="1"
      data-tutorial-step={step}
      data-tutorial-minimized={minimized ? '1' : '0'}
      className="pointer-events-none fixed inset-0 z-[45]"
    >
      {target && (
        <div
          aria-hidden="true"
          data-tutorial-target="1"
          className="tutorial-target"
          style={{ left: target.x, top: target.y, width: target.w, height: target.h }}
        />
      )}
      {minimized ? (
        <button
          type="button"
          className="tutorial-coach paper press pointer-events-auto flex !w-auto items-center gap-2 px-3 text-sm font-black"
          aria-label={copy.expand}
          onClick={() => setMinimized(false)}
        >
          <Ic n={current.icon} s={1.7} />
          <span>{copy.short}</span>
          <span className="rounded-full bg-[#503426] px-2 py-0.5 text-xs text-white" dir="ltr">{fa(step + 1)}/{fa(TUT_STEP_COUNT)}</span>
        </button>
      ) : (
        <section className="tutorial-coach paper popin pointer-events-auto p-[10px]" aria-label={copy.region} data-tutorial-card="1">
          <div className="flex items-center gap-[8px]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#503426] bg-[#ffd93b]">
              <Ic n={current.icon} s={2.15} cls="tutorial-step-icon" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="whitespace-nowrap text-[11px] font-black leading-tight text-[#765337]">{copy.kicker} · {stepLabel}</div>
              <div className="text-[16px] font-black leading-tight text-[#3d251a]" data-tutorial-title="1">{current.title}</div>
            </div>
            <button
              type="button"
              className="btn press shrink-0 !min-h-[48px] !min-w-[48px] !bg-[#fff9e9] !p-1"
              aria-label={copy.minimize}
              title={copy.minimize}
              onClick={() => setMinimized(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              className="btn press shrink-0 !min-h-[48px] !min-w-[48px] !bg-[#fff9e9] !px-[8px] !py-1 text-[12px]"
              aria-label={copy.skip}
              onClick={() => tutSkip()}
            >
              {copy.skip}
            </button>
          </div>
          <p className="mt-[6px] text-[13px] font-bold leading-[1.55] text-[#503426]" aria-live="polite" aria-atomic="true">{hint}</p>
          {(step === 2 || step === 3) && (
            <p data-tutorial-practice="1" className="mt-1 text-[11px] font-bold leading-4 text-emerald-800">{copy.practiceNote}</p>
          )}
          <div className="mt-[6px] flex items-center gap-[8px]">
            <div
              className="flex flex-1 gap-1"
              role="progressbar"
              aria-label={copy.progress}
              aria-valuemin={1}
              aria-valuemax={TUT_STEP_COUNT}
              aria-valuenow={step + 1}
              aria-valuetext={stepLabel}
              data-tutorial-progress="1"
            >
              {Array.from({ length: TUT_STEP_COUNT }, (_, index) => (
                <span
                  key={index}
                  className="h-[6px] flex-1 rounded-full border border-[#503426]/30"
                  style={{ background: index < step ? '#55a744' : index === step ? '#e6ad19' : '#ddcda9' }}
                />
              ))}
            </div>
            <span className="whitespace-nowrap text-[11px] font-black text-[#6a492e]">{copy.targetPrefix}{current.target}</span>
          </div>
        </section>
      )}
    </div>
  );
}
