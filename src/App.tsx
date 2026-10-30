import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { cmd, startEngine } from './game/engine';
import { S, UI, hasSave, loadGame, notify, resetGame as resetGameFn, saveGame, useGame } from './game/state';
import { Hud } from './ui/Hud';
import { TutorialOverlay } from './ui/TutorialOverlay';
import { SceneA11y } from './ui/SceneA11y';

import { Ic, useDialogFocus } from './ui/parts';
import { Cutscene, VisitGate } from './ui/Cutscene';
declare const __DEV_TOOLS__: boolean;
// رفع N-6: در بیلد production این ماژول اصلاً بارگذاری نمی‌شود (import تنبل + شرط ثابت بیلد).
// شرط خام روی define تا در بیلد نهایی false شود و کل dynamic import حذف شود.
const SceneDebugMenu = __DEV_TOOLS__
  ? lazy(() => import('./ui/SceneDebugMenu').then((m) => ({ default: m.SceneDebugMenu })))
  : null;
const GameModals = lazy(() => import('./ui/Modals').then((m) => ({ default: m.Modals })));
import { clearSceneQueue, maybeStartPrologue, pendingNode, skipActiveCutscene } from './story/engine';
import { cinema, endSceneStage } from './game/cinemaStage';
import { fa } from './strings/fa';
import { GT } from './strings/gameText';
import { UT } from './strings/uiText';
import { CINEMA_UI } from './strings/cinemaLocales';
import { installAndroidBackHandler } from './game/androidNav';
import { BootLoader } from './ui/BootLoader';
import { isBootAlreadyWarm, runGenuinePreload } from './game/preloader';
import { CFG, updateSetting } from './game/settings';
import { resumeAudioFromBackground, sfx, snd, suspendAudioForBackground, syncAudioSettings } from './game/sound';
import { readSavedFarmMeta } from './game/saveSummary';
import { journeyCopy } from './strings/journeyText';
import { APP_VERSION, formatVersion } from './strings/version';

function isNativeCapacitor(): boolean {
  return Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
}

function enterFullscreen() {
  // در APK بومی اندروید، تمام‌صفحه و جهت افقی در MainActivity مدیریت می‌شود؛
  // فراخوانی requestFullscreen در WebView اندروید باعث اختلال CustomView و از کار افتادن تاچ می‌شد.
  if (isNativeCapacitor()) return;
  try {
    const mobileLike = window.innerWidth <= 960 || 'ontouchstart' in window;
    if (!mobileLike) return;
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
    if (!document.fullscreenElement) {
      Promise.resolve(el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.()).catch(() => {});
    }
    const o = screen.orientation as ScreenOrientation & { lock?: (t: string) => Promise<void> };
    o?.lock?.('landscape')?.catch(() => {});
  } catch { /* تمام‌صفحه اختیاری است */ }
}

function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3d251a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#ffd93b" />
      {on ? (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.8 5.8a9 9 0 0 1 0 12.4" />
        </>
      ) : (
        <>
          <line x1="22" y1="9" x2="16" y2="15" stroke="#c93b2b" />
          <line x1="16" y1="9" x2="22" y2="15" stroke="#c93b2b" />
        </>
      )}
    </svg>
  );
}

let portraitHintDone = false;
// رفع U-2/V-3: در وب، حالت عمودی تا وقتی بازیکن صریحاً «ادامه با همین حالت» را نزند
// با یک صفحهٔ تمام‌صفحهٔ محترمانه مدیریت می‌شود (در اندروید قفل افقی فعال است).
let portraitAck = false;
const PORTRAIT_ACK_KEY = 'mazrae-rangi-portrait-ack-v1';
function portraitAcknowledged(): boolean {
  if (portraitAck) return true;
  try { return localStorage.getItem(PORTRAIT_ACK_KEY) === '1'; } catch { return false; }
}
function acknowledgePortrait() {
  portraitAck = true;
  try { localStorage.setItem(PORTRAIT_ACK_KEY, '1'); } catch { /* بی‌صدا */ }
}

function Start() {
  const saved = hasSave();
  const savedMeta = saved ? readSavedFarmMeta() : null;
  const journey = journeyCopy();
  const [loadErr, setLoadErr] = useState(false);
  const [vp, setVp] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 720,
  }));

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const compactLand = vp.h <= 460 && vp.w > vp.h;
  const isPortrait = vp.h > vp.w;

  const go = (cont: boolean) => {
    // اگر سِیو موجود خوانده نشود، بازی شروع نمی‌شود تا پیشرفت با یک مزرعهٔ تازه بازنویسی نشود
    if (cont && !loadGame()) {
      setLoadErr(true);
      sfx.err();
      return;
    }
    setLoadErr(false);
    UI.started = true;
    if (!cont) resetGameFn();
    maybeStartPrologue();
    enterFullscreen();
    sfx.fanfare();
    notify();
  };

  return (
    <div
      data-testid="start-screen"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,rgba(255,248,225,0.28),rgba(42,26,14,0.16))] px-4 select-none"
      style={{
        paddingTop: compactLand ? 'calc(var(--safe-top) + 0.55rem)' : 'calc(var(--safe-top) + 2.4rem)',
        paddingBottom: compactLand ? 'calc(var(--safe-bottom) + 0.4rem)' : 'calc(var(--safe-bottom) + 1rem)',
        paddingLeft: 'max(1rem, var(--safe-left))',
        paddingRight: 'max(1rem, var(--safe-right))',
      }}
    >
      {/* تابلوی مرکزی مزرعه — طراحی اختصاصی برای گوشی افقی، گوشی عمودی و دسکتاپ روی منظرهٔ زندهٔ آفتابی */}
      <div
        className={
          'paper popin relative flex max-h-full flex-col items-center overflow-y-auto text-center ' +
          (compactLand
            ? 'w-[min(86vw,28rem)] px-4 py-2'
            : isPortrait
              ? 'w-[min(90vw,22.5rem)] px-5 py-5'
              : 'w-[min(88vw,30.5rem)] px-7 py-5')
        }
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#503426] bg-[#ffe79c] px-3 py-0.5 text-[0.72rem] font-black text-[#4b2f20]">
          <Ic n="wheat" s={1.4} />
          <span>{UT.startRibbon}</span>
          <Ic n="sun" s={1.4} />
        </div>

        <div className={compactLand ? 'mt-1 flex items-center justify-center gap-2.5' : 'mt-2.5 flex items-center justify-center gap-3'}>
          <Ic n="cow" s={compactLand ? 2.35 : 3.2} cls="bob" />
          <div
            data-start-title="1"
            className={'ft min-w-0 max-w-full whitespace-normal break-words text-center leading-none ' + (compactLand ? 'text-[2.1rem]' : isPortrait ? 'text-[2.85rem]' : 'text-[3.4rem]')}
            style={{ textShadow: '.13rem .13rem 0 rgba(80,52,38,.3)' }}
          >
            <span style={{ color: '#e8564a' }}>{UT.u1}</span>{' '}
            <span style={{ color: '#3f9a3a' }}>{UT.u2}</span>
          </div>
          <Ic n="chicken" s={compactLand ? 2.2 : 2.9} cls="bob" />
        </div>

        <p className={'font-extrabold text-[#5b3d2b]/90 ' + (compactLand ? 'mt-1 text-xs leading-snug' : 'mt-2 text-xs sm:text-sm leading-relaxed')}>
          {UT.startTagline}
        </p>

        {!compactLand && (
          <div className="mt-2 flex justify-center gap-3">
            {['hoe', 'seedbag', 'can', 'sickle'].map((n) => <Ic key={n} n={n} s={2.4} />)}
          </div>
        )}

        {savedMeta && (
          <>
            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border-2 border-[#503426]/65 bg-[#fff8df] px-3 py-0.5 text-xs font-black text-[#3d251a]">
              <Ic n="atlas" s={1.35} />
              <span>{UT.startSavedDay}{fa(savedMeta.day)}</span>
              <span className="opacity-45">•</span>
              <Ic n="coin" s={1.35} />
              <span>{fa(savedMeta.coins)}</span>
            </div>
            <div data-save-story="1" className="mt-1 flex max-w-full items-center justify-center gap-1.5 text-center text-[.72rem] font-black leading-snug text-[#6c4a2c]">
              <Ic n="scroll" s={1.2} />
              <span>{savedMeta.postgame ? journey.postgameTitle : journey.chapters[savedMeta.chapter].title}</span>
            </div>
          </>
        )}

        {/* دکمهٔ اصلی باید اولین <button> داخل Start بماند تا لمس مستقیم و تست‌های آفلاین آن را هدف بگیرند */}
        {loadErr && (
          <p role="alert" className="mt-2 max-w-[24rem] rounded-xl border-2 border-[#c93b2b] bg-[#fff0e6] px-3 py-2 text-sm font-black text-[#8a2a1e]">
            {GT.gLoadFail}
          </p>
        )}
        <div
          className={
            'flex w-full items-center justify-center gap-2.5 ' +
            (compactLand ? 'mt-2 flex-row' : isPortrait ? 'mt-4 flex-col' : 'mt-4 flex-row')
          }
        >
          {saved && (
            <button
              type="button"
              className={'btn g press ' + (compactLand ? '!min-h-[max(48px,2.85rem)] flex-1 !px-5' : isPortrait ? '!min-h-[max(48px,3.25rem)] w-full !px-6' : '!min-h-[max(48px,3.2rem)] min-w-[10.5rem] !px-6')}
              onClick={() => go(true)}
            >
              <Ic n="play" s={compactLand ? 2.2 : 2.8} />
              <span className={compactLand ? 'ft text-xl' : 'ft text-2xl sm:text-3xl'}>{UT.u3}</span>
            </button>
          )}
          <button
            type="button"
            className={
              'btn y press ' +
              (saved
                ? compactLand ? '!min-h-[max(48px,2.85rem)] !px-4' : isPortrait ? '!min-h-[max(48px,3rem)] w-full !px-5' : '!min-h-[max(48px,3.2rem)] min-w-[8.5rem] !px-5'
                : compactLand ? '!min-h-[max(48px,2.95rem)] min-w-[13.5rem] !px-7' : isPortrait ? '!min-h-[max(48px,3.35rem)] w-full !px-8' : '!min-h-[max(48px,3.35rem)] min-w-[15rem] !px-8')
            }
            onClick={() => {
              if (saved) {
                sfx.tap();
                UI.confirm = 'newgame';
                notify();
                return;
              }
              go(false);
            }}
          >
            <Ic n="plant" s={compactLand ? 2.2 : 2.9} />
            <span className={compactLand ? 'ft text-2xl' : 'ft text-2xl sm:text-3xl'}>{saved ? UT.u4 : UT.u5}</span>
          </button>
        </div>
      </div>

      {/* نوار کنترل بالایی با فاصلهٔ امن از بریدگی دوربین سلفی و لبه‌های ژست اندروید */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center justify-between gap-2"
        style={{
          paddingTop: 'max(0.55rem, var(--safe-top))',
          paddingLeft: 'max(0.85rem, var(--safe-left))',
          paddingRight: 'max(0.85rem, var(--safe-right))',
        }}
      >
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            data-lang-toggle="1"
            className="btn b press !min-h-[max(48px,2.35rem)] !min-w-[max(48px,4rem)] !px-3 !py-0.5 text-xs font-black"
            onClick={() => { updateSetting('locale', CFG.locale === 'en' ? 'fa' : 'en'); sfx.tap(); notify(); }}
          >
            <span>{CINEMA_UI[CFG.locale].langToggle}</span>
          </button>
          <button
            type="button"
            className="btn press !min-h-[max(48px,2.35rem)] min-w-[max(48px,6.4rem)] !bg-[#fff4d8] !px-2.5 !py-0.5 text-xs font-black"
            onClick={() => { UI.sound = !UI.sound; snd.on = UI.sound; updateSetting('sound', UI.sound); syncAudioSettings(); sfx.tap(); notify(); }}
          >
            <SpeakerIcon on={UI.sound} />
            <span>{UI.sound ? UT.startSoundOn : UT.startSoundOff}</span>
          </button>
        </div>

        <div data-app-version={APP_VERSION} className="paper pointer-events-none flex items-center gap-1.5 !rounded-full px-3 py-1 text-xs font-black">
          <Ic n="star" s={1.4} />
          <span>{UT.startOfflineBadge}{formatVersion(APP_VERSION)}</span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  useGame();
  const ref = useRef<HTMLCanvasElement>(null);
  const autoFastBoot =
    typeof navigator !== 'undefined' &&
    navigator.webdriver === true &&
    typeof window !== 'undefined' &&
    !window.location?.search?.includes('boot=1');
  // حتی در automated run هم موتور تا پایان prewarm شروع نمی‌شود؛ رندر زودهنگامِ
  // canvas هم‌زمان با مقداردهی مرورگر یک long task چندصدمیلی‌ثانیه‌ای می‌ساخت.
  const [bootReady, setBootReady] = useState(() => isBootAlreadyWarm());
  const [bootFading, setBootFading] = useState(false);
  const [bootProg, setBootProg] = useState(() => ({ pct: 12, label: UT.bootStepSave }));

  useEffect(() => {
    let alive = true;
    const finishBoot = () => {
      if (!alive) return;
      notify();
      setBootFading(true);
      window.setTimeout(() => {
        if (alive) setBootReady(true);
      }, autoFastBoot ? 0 : 180);
    };
    // نگهبان ایمنی مطلق: حتی اگر مرورگر یا پلاگین بومی متوقف شود، لودینگ هرگز قفل نمی‌ماند
    const watchdog = window.setTimeout(finishBoot, 3500);
    runGenuinePreload((p) => {
      if (alive) setBootProg(p);
    })
      .then(() => {
        window.clearTimeout(watchdog);
        finishBoot();
      })
      .catch(() => {
        window.clearTimeout(watchdog);
        finishBoot();
      });
    return () => {
      alive = false;
      window.clearTimeout(watchdog);
    };
  }, [autoFastBoot]);

  useEffect(() => {
    if (!bootReady || !ref.current) return;
    const stop = startEngine(ref.current);
    const stopBack = installAndroidBackHandler();
    // ابزارهای دیباگ رانتایم فقط در بیلد داخلی/تستی — شرط خام روی define تا در بیلد نهایی کلاً حذف شود
    if (__DEV_TOOLS__) {
      (window as unknown as { __gameApi?: unknown }).__gameApi = {
        openModal: (m: typeof UI.modal) => { UI.modal = m; notify(); },
        setEnv: (patch: { scene?: typeof UI.scene; day?: number; hour?: number; weather?: number; chapter?: number; postgame?: boolean; land?: number; soil?: number; bag?: number; coins?: number; infoIdx?: number | null }) => {
          if (cinema.active || S.story.pending) { UI.afterModal = null; UI.afterTalkNpc = null; clearSceneQueue(); skipActiveCutscene(); endSceneStage(); }
          if (patch.scene) { cmd.resetMotion(); UI.modal = null; UI.afterModal = null; UI.afterTalkNpc = null; UI.scene = patch.scene; }
          if (typeof patch.day === 'number') S.day = patch.day;
          if (typeof patch.hour === 'number') S.hour = patch.hour;
          if (typeof patch.weather === 'number') S.weather = patch.weather as 0 | 1 | 2 | 3;
          if (typeof patch.chapter === 'number' && Number.isFinite(patch.chapter)) S.story.chapter = Math.max(0, Math.min(6, Math.floor(patch.chapter)));
          if (typeof patch.postgame === 'boolean') S.story.postgame = patch.postgame;
          if (typeof patch.land === 'number') S.lv.land = patch.land;
          if (typeof patch.soil === 'number') S.lv.soil = patch.soil;
          if (typeof patch.bag === 'number') S.lv.bag = Math.max(0, Math.min(6, Math.round(patch.bag)));
          if (typeof patch.coins === 'number') S.coins = patch.coins;
          if (patch.infoIdx !== undefined) UI.info = patch.infoIdx === null ? null : { plot: patch.infoIdx, x: 120, y: 120 };
          notify();
        },
        summary: () => ({ coins: S.coins, day: S.day, hour: S.hour, scene: UI.scene, modal: UI.modal, stageMoved: cinema.totalDistanceMoved, secrets: Object.keys(S.secrets ?? {}).length }),
      };
    }
    const onHide = () => {
      if (UI.started) saveGame();
      suspendAudioForBackground();
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        if (UI.started) saveGame();
        suspendAudioForBackground();
      } else {
        resumeAudioFromBackground();
      }
    };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); stopBack(); window.removeEventListener('pagehide', onHide); document.removeEventListener('visibilitychange', onVis); };
  }, [bootReady]);
  const inCinema = Boolean(pendingNode()) || cinema.active;
  useEffect(() => {
    if (!UI.started || !UI.portrait || inCinema || portraitHintDone || !portraitAcknowledged()) return;
    const t = window.setTimeout(() => { portraitHintDone = true; notify(); }, 4200);
    return () => window.clearTimeout(t);
  }, [UI.started, UI.portrait, inCinema]);
  const portraitGateOpen = UI.started && UI.portrait && !portraitAcknowledged();
  const portraitGateVisible = portraitGateOpen && !inCinema;
  const portraitGateRef = useDialogFocus<HTMLDivElement>('[data-portrait-continue="1"]', portraitGateVisible);
  const bgInert = Boolean(UI.modal || UI.confirm || portraitGateOpen) || undefined;
  return (
    <div className="fixed inset-0" dir={CFG.locale === 'en' ? 'ltr' : 'rtl'}>
      <div className="contents" inert={bgInert}>
        {UI.started && !inCinema && <SceneA11y />}
        {bootReady && (
          <canvas
            id="game-canvas"
            ref={ref}
            className="absolute inset-0 h-full w-full outline-offset-[-4px] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ffd93b]"
            role="application"
            tabIndex={0}
            aria-label={cmd.sceneAnnouncement()}
            aria-describedby={UI.started ? 'scene-keyboard-help' : undefined}
            onKeyDown={(e) => { if (cmd.canvasKey(e.key)) e.preventDefault(); }}
          />
        )}
        {UI.started && !inCinema && <Hud />}
        {UI.started && !inCinema && !portraitGateOpen && <TutorialOverlay />}
      </div>
      {(UI.modal || UI.confirm) && (
        <Suspense fallback={null}>
          <GameModals />
        </Suspense>
      )}
      {UI.started && <VisitGate />}
      {UI.started && <Cutscene />}
      {SceneDebugMenu && (
        <Suspense fallback={null}>
          <SceneDebugMenu />
        </Suspense>
      )}
      {!bootReady && <BootLoader pct={bootProg.pct} label={bootProg.label} fadingOut={bootFading} />}
      {bootReady && !UI.started && <Start />}
      {portraitGateVisible && (
        <div ref={portraitGateRef} tabIndex={-1} className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#2b1a10]/92 px-6 text-center" role="dialog" aria-modal="true" aria-label={UT.u186}>
          <svg viewBox="0 0 120 120" className="h-24 w-24 rotate-90" aria-hidden="true">
            <rect x="34" y="10" width="52" height="100" rx="9" fill="#ffd93b" stroke="#503426" strokeWidth="5" />
            <rect x="42" y="24" width="36" height="70" rx="4" fill="#fff4d8" stroke="#503426" strokeWidth="3" />
            <circle cx="60" cy="102" r="5" fill="#503426" />
          </svg>
          <h2 className="ft text-2xl text-[#fff4d8]">{UT.u186}</h2>
          <p className="max-w-[24rem] text-sm font-bold text-[#f3e4c6]">{UT.u187}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button data-portrait-continue="1" className="btn g press px-4" onClick={() => { acknowledgePortrait(); notify(); }}>{UT.u188}</button>
            <button className="btn b press px-4" onClick={() => { portraitHintDone = true; notify(); }}>{UT.u189}</button>
          </div>
        </div>
      )}
      {UI.started && UI.portrait && portraitAcknowledged() && !inCinema && !UI.modal && !portraitHintDone && (
        <button
          data-portrait-hint="1"
          aria-label={UT.u7}
          className="paper-dark pointer-events-auto fixed left-1/2 z-30 flex !min-h-[max(48px,3rem)] -translate-x-1/2 items-center gap-2 px-3 py-1"
          style={{ bottom: 'max(14.5rem, 196px)' }}
          onClick={() => { portraitHintDone = true; notify(); }}
          title={UT.u6}
        >
          <Ic n="sun" s={2} cls="bob" />
          <span className="whitespace-nowrap text-xs font-extrabold text-[#fff4d8]">{UT.u7}</span>
        </button>
      )}
    </div>
  );
}
