// ===== تنظیمات بازیکن — جدا از فایل سِیو ذخیره می‌شود و فوری روی DOM و صدا اثر می‌گذارد =====
export interface UserSettings {
  sound: boolean;
  music: boolean;
  musicVolume: number;
  sfxVolume: number;
  lowPower: boolean;
  haptics: boolean;
  fontScale: 1 | 1.1 | 1.2;
  reduceMotion: boolean;
  colorblind: boolean;
  shortBeat: boolean;
  locale: 'fa' | 'en';
  /** فقط سرعت حرکت/انیمیشن کار بازیکن؛ شبیه‌سازی اقتصاد و زمان جهان ثابت می‌ماند. */
  actionSpeed: 1 | 1.5 | 2;
}

export const SETTINGS_KEY = 'mazrae-rangi-settings-v1';

const DEFAULTS: UserSettings = {
  sound: true,
  music: true,
  musicVolume: 100,
  sfxVolume: 100,
  lowPower: false,
  haptics: false,
  fontScale: 1,
  reduceMotion: false,
  colorblind: false,
  shortBeat: false,
  locale: 'fa',
  actionSpeed: 1,
};

export const CFG: UserSettings = { ...DEFAULTS };

export function applySettingsToDom() {
  try {
    if (typeof document === 'undefined' || !document.documentElement) return;
    const root = document.documentElement as HTMLElement & { dataset?: Record<string, string>; setAttribute?: (k: string, v: string) => void };
    if (!root.dataset) root.dataset = {};
    root.dataset.fontScale = String(CFG.fontScale);
    root.dataset.reduceMotion = CFG.reduceMotion ? '1' : '0';
    root.dataset.colorblind = CFG.colorblind ? '1' : '0';
    root.setAttribute?.('data-font-scale', String(CFG.fontScale));
    root.setAttribute?.('data-reduce-motion', CFG.reduceMotion ? '1' : '0');
    root.setAttribute?.('data-colorblind', CFG.colorblind ? '1' : '0');
    root.setAttribute?.('lang', CFG.locale);
    root.setAttribute?.('dir', CFG.locale === 'en' ? 'ltr' : 'rtl');
    document.title = CFG.locale === 'en'
      ? 'Colorful Farm | Hand-drawn farming game'
      : 'مزرعه رنگی | بازی کشاورزی نقاشی‌شده';
  } catch (e) { setLastError(`settings-dom-failed:${String((e as Error)?.message ?? e)}`, 'ui'); }
}

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) { applySettingsToDom(); return CFG; }
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    Object.assign(CFG, DEFAULTS, parsed);
    if (CFG.locale !== 'fa' && CFG.locale !== 'en') CFG.locale = 'fa';
    if (![1, 1.5, 2].includes(CFG.actionSpeed)) CFG.actionSpeed = 1;
    CFG.musicVolume = Number.isFinite(Number(CFG.musicVolume)) ? Math.max(0, Math.min(100, Number(CFG.musicVolume))) : 100;
    CFG.sfxVolume = Number.isFinite(Number(CFG.sfxVolume)) ? Math.max(0, Math.min(100, Number(CFG.sfxVolume))) : 100;
    CFG.lowPower = CFG.lowPower === true;
    applySettingsToDom();
  } catch (e) { setLastError(`settings-load-failed:${String((e as Error)?.message ?? e)}`, 'storage'); }
  return CFG;
}

import { nativeSetItem } from './nativeStorage';
import { setLastError } from './errorLog';

export function saveSettings() {
  let serialized = JSON.stringify(CFG);
  try { nativeSetItem(SETTINGS_KEY, serialized); } catch (e) { setLastError(`settings-save-failed:${String((e as Error)?.message ?? e)}`, 'storage'); }
  applySettingsToDom();
}

export function updateSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
  CFG[key] = value;
  saveSettings();
}

export function setShortBeat(on: boolean) {
  updateSetting('shortBeat', on);
}

let reducedMotionQuery: MediaQueryList | null | undefined;

/** آیا حرکت کاهش‌یافته از سوی سیستم‌عامل یا تنظیم دستی بازیکن فعال است؟ */
export function isReducedMotion(): boolean {
  if (CFG.reduceMotion) return true;
  try {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    // MediaQueryList.matches is live. Reusing the query avoids constructing a
    // native media-query object several times per canvas frame.
    if (reducedMotionQuery === undefined) reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    return !!reducedMotionQuery?.matches;
  } catch { return false; }
}

export function resetSettings() {
  Object.assign(CFG, DEFAULTS);
  saveSettings();
}

loadSettings();
