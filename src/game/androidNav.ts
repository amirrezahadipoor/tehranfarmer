// ===== مدیریت دکمهٔ سخت‌افزاری/ژست Back اندروید و کلید Escape دسکتاپ (P10-04) =====
// ترتیب اولویت: صحنهٔ سینمایی -> پنجرهٔ تأیید -> بستن مودال -> بستن کارت اطلاعات کرت -> سینی بذر -> بازگشت به مزرعه -> تأیید خروج
import { S, UI, clearVisit, notify, saveGame } from './state';
import { sfx } from './sound';
import { cinema, endSceneStage } from './cinemaStage';
import { skipActiveCutscene } from '../story/engine';

export type BackOutcome =
  | 'cutscene-skipped'
  | 'cutscene-locked'
  | 'confirm-closed'
  | 'modal-closed'
  | 'info-closed'
  | 'tray-closed'
  | 'returned-farm'
  | 'confirm-exit';

export function exitNativeApp() {
  if (UI.started) saveGame();
  try {
    const cap = (typeof window !== 'undefined'
      ? (window as unknown as { Capacitor?: { Plugins?: { App?: { exitApp?: () => unknown } } } }).Capacitor
      : undefined);
    if (cap?.Plugins?.App?.exitApp) {
      Promise.resolve(cap.Plugins.App.exitApp()).catch(() => {});
    }
  } catch { /* */ }
}

export function handleHardwareBack(): BackOutcome {
  if (UI.confirm !== null) {
    UI.confirm = null;
    sfx.tap();
    notify();
    return 'confirm-closed';
  }
  if (UI.modal !== null) {
    UI.modal = null;
    sfx.tap();
    notify();
    return 'modal-closed';
  }
  if (cinema.active) {
    const rootId = cinema.script?.id ?? '';
    if (rootId.startsWith('visit-due-missed') && (S.debt?.beatings ?? 0) < 3) {
      sfx.tap();
      return 'cutscene-locked';
    }
    skipActiveCutscene();
    endSceneStage();
    clearVisit();
    sfx.tap();
    notify();
    return 'cutscene-skipped';
  }
  if (UI.info !== null) {
    UI.info = null;
    sfx.tap();
    notify();
    return 'info-closed';
  }
  if (UI.seedTray) {
    UI.seedTray = false;
    sfx.tap();
    notify();
    return 'tray-closed';
  }
  if (UI.scene !== 'farm') {
    UI.scene = 'farm';
    UI.info = null;
    sfx.tap();
    notify();
    return 'returned-farm';
  }
  if (UI.started) saveGame();
  UI.confirm = 'exit';
  sfx.tap();
  notify();
  return 'confirm-exit';
}

export function installAndroidBackHandler(): () => void {
  if (typeof window === 'undefined') return () => {};
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && (UI.started || UI.confirm !== null)) {
      e.preventDefault();
      handleHardwareBack();
    }
  };
  window.addEventListener('keydown', onKey);

  let removeNative: (() => void) | null = null;
  type ListenerHandle = { remove: () => unknown };
  const appPlugin = (window as unknown as {
    Capacitor?: {
      Plugins?: {
        App?: {
          addListener?: (event: string, cb: () => void) => ListenerHandle | Promise<ListenerHandle>;
        };
      };
    };
  }).Capacitor?.Plugins?.App;

  if (appPlugin?.addListener) {
    try {
      Promise.resolve(appPlugin.addListener('backButton', () => { handleHardwareBack(); }))
        .then((h) => {
          if (h && typeof h.remove === 'function') {
            removeNative = () => {
              try { Promise.resolve(h.remove()).catch(() => {}); } catch { /* */ }
            };
          }
        })
        .catch(() => {});
    } catch { /* */ }
  }

  return () => {
    window.removeEventListener('keydown', onKey);
    removeNative?.();
  };
}
