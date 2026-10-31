// In-Engine Live Cinematic Director Overlay:
// Drives real world actors on Canvas, world-anchored comic speech bubbles with live head tracking,
// character voice blips + mouth-flap, dramatic pauses, Skip with full consequences, and Next Objective shot.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { S, UI, farmLevel, notify, ownedFarms, resetGame } from '../game/state';
import { advanceNode, clearSceneQueue, openPendingDebtVisit, pendingNode, skipActiveCutscene } from '../story/engine';
import { nodeById } from '../story/story';
import { compileSceneScript, objectiveKeyFor } from '../story/sceneScripts';
import {
  actorScreenAnchor, applyBeatToStage, beginSceneStage, cinema, endSceneStage, enterClosingShot, notifyTypewriterStep,
} from '../game/cinemaStage';
import { clearVisit, debt } from '../game/core/debt';
import { STAND_BEAT } from '../story/debtData';
import { CFG, isReducedMotion, setShortBeat, updateSetting } from '../game/settings';
import { fa } from '../strings/fa';
import { Ic, useDialogFocus } from './parts';
import { sfx } from '../game/sound';
import { UT } from '../strings/uiText';
import { CHAR_NAMES, CINEMA_UI, EN_LINES, OBJECTIVES } from '../strings/cinemaLocales';
import { SCENE_CHOICES, applyDialogueChoice, canGiftVillagerToday, findBestGiftInBag, giftVillager, type SocialNpcId } from '../story/socialVillagers';
import { WX } from '../strings/worldExpansionText';
import type { SceneScript } from '../story/cinemaTypes';
const CPS = 42;

export const isBeatingNode = (id: string) => id.startsWith('visit-due-missed');
export const canSkipBeating = (beatings: number) => beatings >= 3;
export const beatVariantOf = (id: string, beatings: number): 0 | 1 | 2 => {
  if (id.endsWith('-1')) return 1;
  if (id.endsWith('-2')) return 2;
  if (id.endsWith('-0')) return 0;
  return (((Math.max(1, beatings) - 1) % 3 + 3) % 3) as 0 | 1 | 2;
};

/** Classic hand-drawn SVG badge kept exported for backwards compatibility & inspection */
export function BeatStage({ variant }: { variant: 0 | 1 | 2 }) {
  return (
    <div data-beat-variant={variant} className="hidden" aria-hidden="true">
      {variant === 0 && <svg data-anim="club-boop" viewBox="0 0 10 10" />}
      {variant === 1 && <svg data-anim="dust-brawl" viewBox="0 0 10 10" />}
      {variant === 2 && <svg data-anim="table-slam" viewBox="0 0 10 10" />}
    </div>
  );
}

function FinaleTableau() {
  const stats = [
    { icon: 'sun', value: fa(S.day), label: UT.finaleDays, key: 'days' },
    { icon: 'medal', value: fa(farmLevel()), label: UT.finaleLevel, key: 'level' },
    { icon: 'land', value: fa(ownedFarms().length), label: UT.finaleEstates, key: 'estates' },
    { icon: 'note', value: fa(S.debt?.paidTotal ?? 0), label: UT.finaleDebtPaid, key: 'debt' },
    { icon: 'wheat', value: fa(S.stats.cropHarv ?? 0), label: UT.finaleHarvests, key: 'harvests' },
    { icon: 'coin', value: fa(S.earned), label: UT.finaleEarned, key: 'earned' },
  ];
  const sideStats = [
    { icon: 'fish', value: fa(S.stats.fish ?? 0), label: UT.finaleFish, key: 'fish' },
    { icon: 'cave', value: fa(S.stats.mineNodes ?? 0), label: UT.finaleMines, key: 'mines' },
  ];
  return (
    <div data-finale-tableau="1" className="finale-tableau pointer-events-none fixed inset-0 z-[5] flex items-center justify-center overflow-hidden px-3 py-20" role="status" aria-label={UT.finaleLegacyTitle}>
      <div className="finale-tableau-rays" aria-hidden="true" />
      <div className="finale-legacy-card paper relative max-h-full w-[min(92vw,42rem)] px-4 py-4 text-center shadow-2xl sm:px-7 sm:py-5">
        <div className="finale-estates mb-1 flex items-end justify-center gap-3" aria-label={UT.museumEstateSeal}>
          <Ic n="house" s={3.1} cls="finale-estate" />
          <Ic n="greenhouse" s={3.8} cls="finale-estate" />
          <Ic n="valley" s={3.1} cls="finale-estate" />
        </div>
        <Ic n="trophy" s={4.2} cls="finale-trophy mx-auto" />
        <div className="ft mt-1 text-2xl text-[#4b2b18] sm:text-3xl">{UT.finaleLegacyTitle}</div>
        <div className="finale-legacy-copy mx-auto mt-1 max-w-xl text-xs font-extrabold leading-relaxed opacity-80 sm:text-sm">{UT.finaleLegacyText}</div>
        <div className="finale-stats mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
          {stats.map((item) => (
            <div key={item.key} data-finale-stat={item.key} className="finale-stat rounded-xl border-2 border-[#c89b53] bg-[#fff4d8]/85 px-1.5 py-2">
              <Ic n={item.icon} s={1.8} cls="mx-auto mb-0.5" />
              <div className="ft break-words text-lg leading-none text-[#5a3518] sm:text-xl">{item.value}</div>
              <div className="finale-stat-label mt-1 text-[.65rem] font-black leading-tight opacity-75 sm:text-xs">{item.label}</div>
            </div>
          ))}
        </div>
        <div className="finale-side-stats mt-2 grid grid-cols-2 gap-2 text-xs font-black text-[#5a3518]">
          {sideStats.map((item) => (
            <div key={item.key} data-finale-stat={item.key} className="flex items-center justify-center gap-1.5">
              <Ic n={item.icon} s={1.35} /><span>{item.label}: {item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Cutscene() {
  const activePending = pendingNode();
  const [script, setScript] = useState<SceneScript | null>(null);
  const [beatIdx, setBeatIdx] = useState(0);
  const [typed, setTyped] = useState(0);
  const [closing, setClosing] = useState(false);
  const [summary, setSummary] = useState(false);
  const [fineAck, setFineAck] = useState(false);
  const [anchor, setAnchor] = useState({ x: 640, y: 240 });
  const [boxSize, setBoxSize] = useState({ w: 360, h: 96 });
  const [barH, setBarH] = useState({ top: 52, bot: 54 });
  const [holding, setHolding] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  const botBarRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null), closingTimer = useRef<number | null>(null);
  const ptrHandledRef = useRef(false);

  const locale = CFG.locale === 'en' ? 'en' : 'fa';
  const ui = CINEMA_UI[locale];
  const rtl = locale === 'fa';

  const d = debt();
  const beatings = d?.beatings ?? 0;
  const effectiveScript: SceneScript | null = script ?? (activePending ? compileSceneScript(activePending.id) : null);
  const rootId = effectiveScript?.id ?? activePending?.id ?? '';
  const prologueDigest = /^p[1-7]$/.test(rootId) && !UI.directorReplay;
  const finaleScene = effectiveScript?.beats.some((step) => step.nodeId === 'finale') ?? false;
  const beating = isBeatingNode(rootId);
  const queuedScenes = S.story.queue?.length ?? 0;

  // Start or refresh live stage sequence when `S.story.pending` opens a new scene
  useEffect(() => {
    const pid = activePending?.id ?? null;
    if (!pid) {
      if (script && !closing && !summary) {
        endSceneStage();
        setScript(null);
      }
      return;
    }
    // advanceNode در آخرین beat ممکن است صحنهٔ بعدیِ صف را فعال کرده باشد؛
    // کارنامهٔ finale تا تأیید بازیکن می‌ماند و سپس همان صف ادامه می‌یابد.
    if (closing && finaleScene && script) return;
    if (script && script.beats[beatIdx]?.nodeId === pid) return;

    if ((isBeatingNode(pid) || pid.startsWith('visit-raid')) && CFG.shortBeat) {
      skipActiveCutscene();
      clearVisit();
      setSummary(true);
      return;
    }
    const compiled = compileSceneScript(pid);
    if (!compiled) {
      skipActiveCutscene();
      return;
    }
    if (closingTimer.current !== null) { window.clearTimeout(closingTimer.current); closingTimer.current = null; }
    setSummary(false);
    setClosing(false);
    setFineAck(false);
    setScript(compiled);
    setBeatIdx(0);
    setTyped(0);
    beginSceneStage(compiled);
  }, [activePending?.id, closing]);

  useEffect(() => () => {
    if (closingTimer.current !== null) window.clearTimeout(closingTimer.current);
  }, []);

  useEffect(() => {
    if (closing) nextButtonRef.current?.focus({ preventScroll: true });
  }, [closing]);

  const beat = effectiveScript?.beats[beatIdx];
  const rawFa = beat ? (nodeById(beat.nodeId)?.lines[beat.lineIdx]?.text ?? '') : '';
  const rawEn = beat ? EN_LINES[beat.nodeId]?.[beat.lineIdx] : undefined;
  const full = locale === 'en' && rawEn ? rawEn : rawFa;
  const done = typed >= full.length;
  const showingSummary = summary && Boolean(d?.lastVisit);
  const showingFine = beating && !fineAck && d?.lastVisit?.kind === 'due-missed';
  const showingScene = Boolean(effectiveScript && (beat || closing));
  const focusKey = showingSummary ? 'summary' : showingFine ? 'fine' : showingScene ? `scene:${effectiveScript!.id}` : null;
  const dialogRef = useDialogFocus<HTMLDivElement>('[data-cutscene-next="1"]', focusKey);

  // Live head anchor & dramatic pause tracker (paced cleanly at ~30 FPS & paused when tab is hidden to save battery)
  useEffect(() => {
    if (!script) return;
    let raf = 0;
    let lastSync = 0;
    const sync = (now: number) => {
      raf = window.requestAnimationFrame(sync);
      if (typeof document !== 'undefined' && document.hidden) return;
      if (now - lastSync < 31) return;
      lastSync = now;
      const who = closing ? 'narrator' : (script.beats[beatIdx]?.who ?? 'narrator');
      const a = actorScreenAnchor(who);
      setAnchor((prev) => (Math.abs(prev.x - a.x) > 1.5 || Math.abs(prev.y - a.y) > 1.5 ? { x: a.x, y: a.y } : prev));
      const nextHold = cinema.pauseLeft > 0.04;
      setHolding((prev) => (prev !== nextHold ? nextHold : prev));
    };
    raf = window.requestAnimationFrame(sync);
    return () => window.cancelAnimationFrame(raf);
  }, [script, beatIdx, closing]);

  // Measure live speech bubble & letterbox bar heights so clamping keeps 100% clear of top & bottom UI bars
  useLayoutEffect(() => {
    const el = bubbleRef.current;
    if (el) {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w > 0 && h > 0 && (Math.abs(w - boxSize.w) > 2 || Math.abs(h - boxSize.h) > 2)) {
        setBoxSize({ w, h });
      }
    }
    const th = topBarRef.current?.offsetHeight ?? 52;
    const bh = botBarRef.current?.offsetHeight ?? 54;
    if (Math.abs(th - barH.top) > 2 || Math.abs(bh - barH.bot) > 2) {
      setBarH({ top: th, bot: bh });
    }
  });

  // Typewriter reveal with per-character voice blips & mouth-flap sync
  useEffect(() => {
    if (!beat || prologueDigest || summary || closing || holding) return;
    if (typed >= full.length) return;
    // پرولوگ کوتاه بلافاصله خوانا است؛ تایپ تدریجی برای صحنه‌های سینمایی بعدی حفظ می‌شود.
    if (rootId === 'p1' || isReducedMotion()) { setTyped(full.length); return; }
    const stepChars = rootId.startsWith('visit-') && Boolean(S.story.seen[rootId]) ? 4 : 2;
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setTyped((prev) => {
        const nxt = Math.min(full.length, prev + stepChars);
        notifyTypewriterStep(beat.who, nxt);
        return nxt;
      });
    }, 1000 / CPS);
    return () => { if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; } };
  }, [typed, full, beat, summary, closing, holding]);

  const finishSceneCompletely = (wasVisit: boolean) => {
    if (closingTimer.current !== null) { window.clearTimeout(closingTimer.current); closingTimer.current = null; }
    endSceneStage();
    setScript(null);
    setClosing(false);
    if (wasVisit && debt()?.lastVisit) {
      clearVisit();
      setSummary(true);
    } else if (wasVisit) {
      clearVisit();
    }
    notify();
  };

  const skipScene = () => {
    const wasVisit = rootId.startsWith('visit-');
    // در closing، گره جاری قبلاً advance شده و pending متعلق به صحنهٔ بعدی است.
    if (!closing) skipActiveCutscene();
    sfx.tap();
    finishSceneCompletely(wasVisit);
  };

  const next = () => {
    if (closing) {
      sfx.tap();
      finishSceneCompletely(rootId.startsWith('visit-'));
      return;
    }
    if (!script || !beat) return;
    if (cinema.pauseLeft > 0) {
      cinema.pauseLeft = 0;
      setHolding(false);
    }
    if (!done) {
      setTyped(full.length);
      return;
    }
    const choiceRequired = beatIdx + 1 >= script.beats.length && !UI.directorReplay
      && !S.story.seen[`choice:${beat.nodeId}`] && Boolean(SCENE_CHOICES[beat.nodeId]);
    if (choiceRequired) { sfx.err(); return; }
    const nextBeat = script.beats[beatIdx + 1];
    // If leaving current StoryNode, commit its effects cleanly right on schedule
    if (!nextBeat || nextBeat.nodeId !== beat.nodeId) {
      const finishedNode = nodeById(beat.nodeId);
      if (finishedNode) advanceNode(finishedNode);
    }
    if (nextBeat) {
      const ni = beatIdx + 1;
      setBeatIdx(ni);
      setTyped(0);
      applyBeatToStage(ni);
      sfx.tap();
      return;
    }
    // Strong closing shot + Next Objective ribbon before returning control smoothly.
    // The campaign finale remains until explicit confirmation so its personalized
    // legacy tableau is readable; reduced motion gets the same content statically.
    if (script.durationKind === 'major' && (!isReducedMotion() || finaleScene)) {
      setClosing(true);
      if (!isReducedMotion()) enterClosingShot();
      if (!finaleScene) {
        closingTimer.current = window.setTimeout(() => {
          closingTimer.current = null;
          finishSceneCompletely(rootId.startsWith('visit-'));
        }, 1650);
      }
    } else {
      sfx.tap();
      finishSceneCompletely(rootId.startsWith('visit-'));
    }
  };

  const closeSummary = () => {
    clearVisit();
    S.story.pending = null;
    setSummary(false);
    notify();
  };

  const onSceneKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && (!beating || canSkipBeating(beatings))) {
      e.preventDefault();
      e.stopPropagation();
      skipScene();
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
      e.preventDefault();
      next();
    }
  };

  const visit = d?.lastVisit ?? null;
  if (summary && visit) {
    return (
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={UT.u8}
        tabIndex={-1}
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-3"
        dir={rtl ? 'rtl' : 'ltr'}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSummary(); } }}
      >
        <div className="paper popin w-[min(94vw,34rem)] p-4">
          <div className="ft text-center text-3xl text-[#e8564a]">{UT.u8}</div>
          <div className="mt-3 space-y-1 text-sm font-extrabold">
            <Row l={UT.u9} v={fa(visit.taken)} icon="coin" />
            <Row l={UT.u10} v={fa(visit.toDebt)} icon="ledger" />
            {visit.lateFee > 0 && <Row l={UT.u11} v={fa(visit.lateFee)} icon="hammer" />}
            <Row l={UT.u12} v={fa(visit.remaining)} icon="note" />
          </div>
          <div className="mt-2 text-center text-xs font-bold opacity-70">{visit.text}</div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {visit.kind === 'due-missed' && beatings >= 3 && (
              <button
                className={'btn press !px-3 !py-1.5 ' + (CFG.shortBeat ? 'p' : 'y')}
                onClick={() => { setShortBeat(!CFG.shortBeat); notify(); }}
              >
                <span className="text-xs font-black">{CFG.shortBeat ? UT.shortOn : UT.alwaysShort}</span>
              </button>
            )}
            <button className="btn g press !px-5 !py-2" onClick={closeSummary}>
              <Ic n="check" s={2.4} /><span className="ft text-xl">{UT.u13}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // کارت خلاصهٔ جریمه — قبل از صحنهٔ ضرب‌وشتم، بازیکن باید همهٔ اثرات را ببیند و تأیید کند
  if (beating && !fineAck && visit?.kind === 'due-missed') {
    return (
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ui.fineTitle}
        tabIndex={-1}
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-3"
        dir={rtl ? 'rtl' : 'ltr'}
        data-fine-card="1"
      >
        <div className="paper popin w-[min(94vw,30rem)] p-4">
          <div className="ft text-center text-3xl text-[#e8564a]">{ui.fineTitle}</div>
          <div className="mt-3 space-y-1 text-sm font-extrabold">
            <Row l={UT.u9} v={fa(visit.taken)} icon="coin" />
            {visit.lateFee > 0 && <Row l={UT.u11} v={fa(visit.lateFee)} icon="hammer" />}
            <Row l={ui.fineEnergy} v={ui.fineEnergyVal} icon="bolt" />
            <Row l={ui.fineStand} v={fa(STAND_BEAT)} icon="note" />
          </div>
          <div className="mt-4 text-center">
            <button className="btn g press !px-5 !py-2" data-fine-ack="1" onClick={() => { setFineAck(true); sfx.tap(); }}>
              <Ic n="check" s={2.4} /><span className="ft text-xl">{ui.fineAckBtn}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!effectiveScript || (!beat && !closing)) return null;

  // پرولوگ به‌جای شش توقف تایپ‌نویس، یک کارت خوانا و یک انتخاب پایانی دارد.
  // انتخاب و اثرات گره‌ها، فصل و شروع بدهی از همان مسیرهای واقعی حفظ می‌شوند.
  if (prologueDigest && beat) {
    const lines = effectiveScript.beats.map((line) => {
      const node = nodeById(line.nodeId);
      const textFa = node?.lines[line.lineIdx]?.text ?? '';
      const textEn = EN_LINES[line.nodeId]?.[line.lineIdx];
      return { key: `${line.nodeId}:${line.lineIdx}`, who: line.who, text: locale === 'en' && textEn ? textEn : textFa };
    });
    const choiceNodeId = effectiveScript.beats[effectiveScript.beats.length - 1]?.nodeId ?? rootId;
    const prologueChoices = !S.story.seen[`choice:${choiceNodeId}`] ? SCENE_CHOICES[choiceNodeId] : undefined;
    const choosePrologue = (index: number) => {
      applyDialogueChoice(choiceNodeId, index === 1 ? 1 : 0);
      skipScene();
    };
    return (
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={UT.prologueTitle}
        tabIndex={-1}
        data-tap="cutscene"
        data-prologue-digest="1"
        data-instant-text="1"
        className="fixed inset-0 z-[70] flex items-center justify-center bg-[#1c120e]/70 p-3"
        dir={rtl ? 'rtl' : 'ltr'}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); skipScene(); } }}
      >
        <section className="paper popin flex max-h-[calc(100dvh-1.5rem)] w-[min(94vw,38rem)] flex-col overflow-hidden p-3 sm:p-5">
          <header className="flex shrink-0 items-center gap-2 border-b-2 border-[#d7b270] pb-2">
            <Ic n="house" s={2.4} />
            <div className="min-w-0 flex-1">
              <h2 className="ft text-2xl text-[#4b2b18]">{UT.prologueTitle}</h2>
              <p className="text-[.7rem] font-bold leading-relaxed opacity-70">{UT.prologueReadHint}</p>
            </div>
            <button
              type="button"
              data-lang-toggle="1"
              className="btn b press !min-h-[48px] !min-w-[48px] !px-2.5 !py-1 text-xs font-black"
              onClick={() => { updateSetting('locale', locale === 'fa' ? 'en' : 'fa'); sfx.tap(); notify(); }}
            >{ui.langToggle}</button>
          </header>
          <div className="scroll min-h-0 flex-1 space-y-2 py-3 pl-1" tabIndex={0} data-modal-scroll="1">
            {lines.map((line) => (
              <article key={line.key} className="rounded-xl border-2 border-[#dfc28b] bg-[#fff9e9]/75 p-2.5">
                <div className="text-xs font-black text-[#8a5a2e]">{CHAR_NAMES[locale][line.who]}</div>
                <p className="mt-0.5 text-sm font-extrabold leading-7 text-[#3d251a]">{line.text}</p>
              </article>
            ))}
          </div>
          {prologueChoices ? (
            <div className="mt-1 shrink-0" aria-label={UT.prologueStart}>
              <div className="mb-1 flex items-center justify-center gap-1 text-xs font-black opacity-75"><Ic n="check" s={1.25} />{UT.prologueStart}</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {prologueChoices.map((choice, index) => (
                  <button
                    key={index}
                    type="button"
                    data-scene-choice={index}
                    className="btn g press !min-h-[52px] !whitespace-normal !px-3 !py-2 text-xs font-black leading-5"
                    onClick={() => choosePrologue(index)}
                  ><span>{locale === 'en' ? choice.labelEn : choice.labelFa}</span></button>
                ))}
              </div>
            </div>
          ) : (
            <button
              type="button"
              data-cutscene-next="1"
              className="btn g press mt-1 !min-h-[52px] shrink-0 !px-5 !py-2"
              onClick={skipScene}
            >
              <Ic n="check" s={2.1} /><span className="ft text-xl">{UT.prologueStart}</span>
            </button>
          )}
        </section>
      </div>
    );
  }

  const who = closing ? 'narrator' : beat!.who;
  const speakerName = CHAR_NAMES[locale][who];
  const isNarrator = who === 'narrator';
  const objText = OBJECTIVES[locale][objectiveKeyFor(effectiveScript.id, S.story.postgame)] ?? OBJECTIVES[locale].default;
  const isLastBeat = beatIdx + 1 >= effectiveScript.beats.length, choiceNodeId = beat?.nodeId ?? effectiveScript.id;
  const sceneChoices = (!closing && done && isLastBeat && !UI.directorReplay && !S.story.seen['choice:' + choiceNodeId])
    ? SCENE_CHOICES[choiceNodeId]
    : undefined;
  const talkVillagerId: SocialNpcId | null = (who === 'jahangir' || who === 'grandma' || who === 'sara' || who === 'engineer' || who === 'rancher')
    ? who : null;
  const quickGiftId = talkVillagerId && canGiftVillagerToday(talkVillagerId)
    ? findBestGiftInBag(talkVillagerId)
    : null;

  // روی گوشی واقعی (e.isTrusted) پیشروی فقط روی click انجام می‌شود تا هنگام اتمام کات‌سین هیچ ضربه‌ای به بوم زیرین نفوذ نکند؛
  // برای رویدادهای مصنوعی تست‌های خودکار (!e.isTrusted) مسیر pointerdown همچنان فعال است
  const onStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.isTrusted) return;
    ptrHandledRef.current = true;
    next();
  };
  const onStageClick = () => {
    if (ptrHandledRef.current) {
      ptrHandledRef.current = false;
      return;
    }
    next();
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={speakerName}
      tabIndex={-1}
      className="fixed inset-0 z-[70] select-none"
      dir={rtl ? 'rtl' : 'ltr'}
      onKeyDown={onSceneKeyDown}
      data-tap="cutscene"
      style={{ touchAction: 'manipulation' }}
      onPointerDown={onStagePointerDown}
      onClick={onStageClick}
      data-scene-id={effectiveScript.id} data-beat-node={beat?.nodeId} data-scene-closing={closing ? '1' : undefined} data-shop-dialogue={UI.modal === 'shop' ? '1' : undefined}
      data-instant-text={rootId === 'p1' ? '1' : undefined}
    >
      {beating && <BeatStage variant={beatVariantOf(rootId, beatings)} />}

      {/* Top cinema letterbox controls: live language switch + Skip Scene */}
      <div
        ref={topBarRef} data-cutscene-topbar="1"
        className="pointer-events-auto fixed inset-x-0 top-0 flex items-center justify-between border-b-2 border-[#d9a441] bg-[#1c120e]/95 px-3 py-1"
        style={{
          paddingTop: 'calc(var(--safe-top) + 0.25rem)',
          paddingLeft: 'max(0.75rem, var(--safe-left))',
          paddingRight: 'max(0.75rem, var(--safe-right))',
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-lang-toggle="1"
            className="btn b press !min-h-[max(48px,2.15rem)] !min-w-[max(48px,3.2rem)] !px-2.5 !py-0.5 text-xs font-black"
            onClick={() => { updateSetting('locale', locale === 'fa' ? 'en' : 'fa'); sfx.tap(); notify(); }}
          >
            <span>{ui.langToggle}</span>
          </button>
          {talkVillagerId && quickGiftId && (
            <button
              type="button"
              className="btn g press !min-h-[max(48px,2.15rem)] !min-w-[max(48px,3.2rem)] !px-2.5 !py-0.5 text-xs font-black"
              onClick={() => { giftVillager(talkVillagerId, quickGiftId); }}
            >
              <Ic n={quickGiftId} s={1.5} />
              <span>{WX.giftBtn}</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!closing && (!beating || canSkipBeating(beatings)) && (
            <button
              type="button"
              data-skip-beat={beating ? '1' : undefined}
              data-cutscene-skip="1"
              data-skip-all={queuedScenes > 0 ? '1' : undefined}
              className="btn p press !min-h-[max(48px,2.15rem)] !min-w-[max(48px,3.2rem)] !px-3 !py-0.5 text-xs font-black"
              onClick={() => { if (queuedScenes > 0) clearSceneQueue(); skipScene(); }}
            >
              <span>{queuedScenes > 0 ? ui.skipAll : ui.skip}</span>
            </button>
          )}
        </div>
      </div>

      {closing && finaleScene && <FinaleTableau />}

      {/* Live world-anchored comic speech bubble OR narrator cinema caption */}
      {!closing && !holding && (() => {
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 720;
        const compact = vh <= 430;
        const halfW = boxSize.w * 0.5;
        const shopDialogue = UI.modal === 'shop' && UI.afterModal === 'shop';
        const bx = shopDialogue ? vw / 2 : Math.max(halfW + 10, Math.min(vw - halfW - 10, anchor.x));
        const safeTop = Math.max(46, barH.top + 4);
        const safeBot = Math.max(44, barH.bot + 4);
        const by = shopDialogue ? safeTop + 4 : Math.min(vh - safeBot, Math.max(safeTop + boxSize.h, anchor.y));
        // Keep unusually long choice bubbles between the measured letterbox bars.
        // Only the body scrolls; the hand-drawn frame and tail remain stationary.
        const bubbleBodyMaxH = Math.max(140, vh - safeTop - safeBot - 24);
        const tailDx = shopDialogue ? 0 : Math.max(-(halfW - 22), Math.min(halfW - 22, anchor.x - bx));
        return isNarrator ? (
          <div
            style={{ top: `${Math.max(safeTop + 4, Math.round(vh * 0.12))}px`, backgroundColor: '#241914' }}
            className="pointer-events-none fixed left-1/2 w-[min(88vw,38rem)] -translate-x-1/2 rounded-xl border-2 border-[#d9a441] bg-[#241914]/94 px-4 py-2 text-center text-[#fff6da] shadow-lg"
          >
            <span className="sr-only">{full}</span>
            <div aria-hidden="true" className={compact ? 'text-[0.86rem] font-extrabold leading-snug' : 'text-[1rem] font-extrabold leading-relaxed'}>
              {full.slice(0, typed)}
              {!done && <span className="opacity-45">|</span>}
            </div>
          </div>
        ) : (
          <div
            ref={bubbleRef} data-shop-speech={shopDialogue ? '1' : undefined}
            style={{
              left: `${bx}px`,
              top: `${by}px`,
              transform: shopDialogue ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
              backgroundColor: '#fffdf4',
            }}
            className={'pointer-events-none fixed w-fit min-w-[9.5rem] rounded-2xl border-[3px] border-[#503426] bg-[#fffdf4]/97 text-[#3d251a] shadow-xl ' + (compact ? 'max-w-[min(76vw,21.5rem)] px-3 py-1.5' : 'max-w-[min(82vw,24.5rem)] px-3.5 py-2.5')}
          >
            <div
              data-cutscene-bubble-body="1"
              style={{ maxHeight: `${bubbleBodyMaxH}px`, overflowY: 'auto', overscrollBehavior: 'contain', pointerEvents: 'auto', scrollbarWidth: 'thin' }}
            >
            <span className="sr-only">{speakerName}: {full}</span>
            <div aria-hidden="true" className="mb-0.5 flex items-center gap-1.5">
              <span className="ft rounded-md border border-[#503426] bg-[#ffe6a3] px-2 py-0.2 text-xs sm:text-sm text-[#503426]">
                {speakerName}
              </span>
            </div>
            <div className="grid" aria-hidden="true">
              <div className={'invisible col-start-1 row-start-1 ' + (compact ? 'text-[0.84rem] font-extrabold leading-snug' : 'text-[0.98rem] font-extrabold leading-relaxed')}>
                {full}
              </div>
              <div className={'col-start-1 row-start-1 ' + (compact ? 'text-[0.84rem] font-extrabold leading-snug' : 'text-[0.98rem] font-extrabold leading-relaxed')}>
                {full.slice(0, typed)}
                {!done && <span className="opacity-40">|</span>}
              </div>
            </div>
            {sceneChoices && (
              <div
                className="pointer-events-auto mt-2 grid grid-cols-1 gap-1 border-t border-[#d8c498] pt-1.5"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                {sceneChoices.map((ch, idx) => (
                  <button
                    key={idx}
                    type="button"
                    autoFocus={idx === 0}
                    data-scene-choice={idx}
                    className="btn y press !min-h-[max(48px,2rem)] !min-w-0 w-full !justify-start !whitespace-normal !px-2.5 !py-1 text-start text-xs font-black"
                    onClick={() => { applyDialogueChoice(choiceNodeId, idx as 0 | 1); next(); }}
                  >
                    <span className="min-w-0 whitespace-normal break-words leading-snug [overflow-wrap:anywhere]">{locale === 'en' ? ch.labelEn : ch.labelFa}</span>
                  </button>
                ))}
              </div>
            )}
            </div>
            {/* Hand-drawn pointer tail aimed directly toward the live actor's head */}
            <div
              aria-hidden="true"
              style={{ left: `calc(50% + ${tailDx}px)` }}
              className="absolute -bottom-[9px] h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-b-[3px] border-r-[3px] border-[#503426] bg-[#fffdf4]"
            />

          </div>
        );
      })()}

      {/* Bottom cinema letterbox bar: full readable Next Objective sentence + beat dots + Advance button */}
      <div
        ref={botBarRef} data-cutscene-bottombar="1"
        className="pointer-events-auto fixed inset-x-0 bottom-0 flex items-center justify-between gap-2.5 border-t-2 border-[#d9a441] bg-[#1c120e]/95 px-3 py-1 text-[#fff6da]"
        style={{
          backgroundColor: '#1c120e',
          paddingBottom: 'calc(var(--safe-bottom) + 0.25rem)',
          paddingLeft: 'max(0.75rem, var(--safe-left))',
          paddingRight: 'max(0.75rem, var(--safe-right))',
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div data-cutscene-objective="1" className="flex min-w-0 flex-1 items-center gap-1.5 text-xs font-extrabold leading-snug">
          <Ic n="star" s={1.5} cls="shrink-0" />
          <div className="min-w-0 flex-1 whitespace-normal break-words leading-relaxed [overflow-wrap:anywhere]">
            <span className="text-[#ffd93b]">{ui.objectivePrefix} </span>
            <span>{objText}</span>
          </div>
        </div>
        <div data-cutscene-actions="1" className="flex shrink-0 items-center gap-2">
          <div className="hidden md:flex items-center gap-1 text-xs opacity-75">
            {effectiveScript.beats.map((_, i) => (
              <span key={i} className={i === beatIdx ? 'text-[#ffd93b]' : 'opacity-40'}>•</span>
            ))}
          </div>
          <button
            ref={nextButtonRef}
            type="button"
            data-cutscene-next="1"
            disabled={Boolean(sceneChoices)}
            className="btn g press !min-h-[max(48px,2.15rem)] !min-w-[max(48px,3.5rem)] !px-3 !py-0.5 text-xs font-black"
            onClick={next}
          >
            <Ic n="arrow" s={1.5} />
            <span>{sceneChoices ? ui.choose : closing || isLastBeat ? ui.finish : ui.next}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ l, v, icon }: { l: string; v: string; icon: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-[#f3e6c4] px-2 py-1">
      <Ic n={icon} s={1.7} />
      <span className="flex-1">{l}</span>
      <span className="ft text-lg">{v}</span>
    </div>
  );
}

/** VisitGate: triggers live Sharkhar visit cutscenes cleanly when due/raid occurs */
export function VisitGate() {
  const sceneAt = useRef<number>(Date.now());
  const firstMount = useRef<boolean>(true);
  const scene = UI.scene;
  useEffect(() => {
    if (firstMount.current) { firstMount.current = false; return; }
    sceneAt.current = Date.now() - 18000;
  }, [scene]);

  useEffect(() => {
    const iv = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (Date.now() - sceneAt.current < 20000) return;
      openPendingDebtVisit();
    }, 1200);
    return () => window.clearInterval(iv);
  }, []);

  return null;
}

export function resetStory() { resetGame(); }
