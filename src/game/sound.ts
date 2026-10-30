import { nativeImpact } from './nativeHaptics';
// ===== موتور صدای ارگانیک مبتنی بر نمونهٔ صوتی واقعی (.mp3 استودیویی کم‌حجم درون‌خطی + دیکد یک‌بارهٔ AudioBuffer + بازخورد لمسی) =====
// همهٔ ۱۶ فایل صوتی واقعی (.mp3 با حجم مجموع ~۳۰ کیلوبایت) در تک‌فایل آفلاین اینلاین می‌شوند:
//   ۱) صفر صدای گوش‌خراش مربعی/اره‌ای — صدای واقعی چوب، خاک، آب، سکه، کاغذ نامه، گیتار آکوستیک و سنتور
//   ۲) دیکد سخت‌افزاری یک‌باره در حافظهٔ AudioBuffer برای تأخیر ۰ میلی‌ثانیه و حداقل مصرف باتری موبایل
//   ۳) تغییر ظریف طبیعی گام (±۲٪) در کارهای تکراری تا گوش هرگز خسته نشود + تعلیق خودکار در پس‌زمینه/سکوت
import { NIGHT_END_H, NIGHT_START_H } from './data';
import { CFG } from './settings';
import { SFX_DATA_URIS } from '../assets/sfx/bank';

export const AUDIO_SAMPLE_URIS = SFX_DATA_URIS;

export type SampleId = keyof typeof AUDIO_SAMPLE_URIS;

let ac: AudioContext | null = null;
export const snd = { on: true };

// مولد مستقل نوسان ظریف صوتی تا هرگز RNG گیم‌پلی را جابه‌جا نکند
let nSeed = 987654321;
function audioRnd(): number {
  nSeed = (nSeed * 1664525 + 1013904223) >>> 0;
  return nSeed / 4294967296;
}

let bgAudioPaused = false;
let idleSuspendTimer: ReturnType<typeof setTimeout> | null = null;
let decodedForCtx: AudioContext | null = null;
let decodeStarted = false;
const decodedBank = new Map<SampleId, AudioBuffer>();

function dataUriToArrayBuffer(uri: string): ArrayBuffer | null {
  const comma = uri.indexOf(',');
  if (comma < 0) return null;
  const b64 = uri.slice(comma + 1);
  if (typeof atob !== 'function') return null;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function warmDecodeSamples(ctx: AudioContext) {
  if (decodedForCtx === ctx && decodeStarted) return;
  decodedForCtx = ctx;
  decodeStarted = true;
  decodedBank.clear();
  if (typeof ctx.decodeAudioData !== 'function') return;
  for (const id of Object.keys(AUDIO_SAMPLE_URIS) as SampleId[]) {
    const raw = dataUriToArrayBuffer(AUDIO_SAMPLE_URIS[id]);
    if (!raw) continue;
    try {
      const p = ctx.decodeAudioData(raw.slice(0));
      if (p && typeof p.then === 'function') {
        void p.then((buf) => { decodedBank.set(id, buf); }).catch(() => {});
      }
    } catch { /* محیط بدون دیکدر صوتی (مثلاً تست واحد) از مسیر پشتیبان نرم استفاده می‌کند */ }
  }
}

function scheduleIdleAudioSuspend(a: AudioContext) {
  if (idleSuspendTimer) clearTimeout(idleSuspendTimer);
  idleSuspendTimer = setTimeout(() => {
    idleSuspendTimer = null;
    if (a.state === 'running' && (!CFG.music || !CFG.sound || !snd.on)) {
      void a.suspend().catch(() => {});
    }
  }, 3800);
  if (typeof idleSuspendTimer === 'object' && idleSuspendTimer !== null && 'unref' in idleSuspendTimer) {
    idleSuspendTimer.unref();
  }
}

export function suspendAudioForBackground() {
  bgAudioPaused = true;
  syncMusicPlayback();
  if (ac && ac.state === 'running') {
    void ac.suspend().catch(() => {});
  }
}

export function resumeAudioFromBackground() {
  bgAudioPaused = false;
  if (!snd.on || !CFG.sound) return;
  if (ac && ac.state === 'suspended') {
    void ac.resume().catch(() => {});
  }
  syncMusicPlayback();
}

export function isAudioSuspended(): boolean {
  return bgAudioPaused || Boolean(ac && ac.state === 'suspended');
}

export function audioCtx(): AudioContext | null {
  if (!snd.on || !CFG.sound || bgAudioPaused) return null;
  if (typeof document !== 'undefined' && document.hidden) return null;
  try {
    if (!ac && typeof window !== 'undefined') {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) ac = new AC();
    }
    if (ac) {
      if (ac.state === 'suspended') void ac.resume().catch(() => {});
      warmDecodeSamples(ac);
    }
    return ac;
  } catch { return null; }
}

// پشتیبان نرم سینوسی (صفر موج مربعی یا اره‌ای!) فقط برای اولین میلی‌ثانیه پیش از اتمام دیکد یا محیط تست Node
function gentleFallbackTone(a: AudioContext, f: number, d: number, v = 0.045, to = 0, delay = 0) {
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(v, t + Math.min(0.018, d * 0.32));
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g);
  g.connect(a.destination);
  o.start(t);
  o.stop(t + d + 0.02);
}

/** پخش نمونهٔ صوتی استودیویی (.mp3 دیکدشده در AudioBuffer یا HTMLAudio در WebViewهای خاص اندروید) */
export function playSample(
  id: SampleId,
  opts?: { vol?: number; rate?: number; jitter?: number; delay?: number; fallbackHz?: number; fallbackDur?: number },
): boolean {
  if (!snd.on || !CFG.sound || bgAudioPaused) return false;
  if (typeof document !== 'undefined' && document.hidden) return false;
  const vol = opts?.vol ?? 0.55;
  const jit = opts?.jitter ? 1 + (audioRnd() - 0.5) * 2 * opts.jitter : 1;
  const rate = Math.max(0.35, Math.min(3.2, (opts?.rate ?? 1) * jit));
  const delay = opts?.delay ?? 0;

  const a = audioCtx();
  if (a) {
    const buf = decodedBank.get(id);
    if (buf) {
      const src = a.createBufferSource();
      src.buffer = buf;
      if (src.playbackRate) src.playbackRate.value = rate;
      const g = a.createGain();
      const now = a.currentTime + delay;
      const dur = Math.max(0.03, buf.duration / rate);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(vol, now + Math.min(0.008, dur * 0.2));
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      src.connect(g);
      g.connect(a.destination);
      src.start(now);
      if (typeof src.stop === 'function') src.stop(now + dur + 0.03);
      scheduleIdleAudioSuspend(a);
      return true;
    }
    gentleFallbackTone(a, (opts?.fallbackHz ?? 440) * rate, opts?.fallbackDur ?? 0.12, Math.min(0.08, vol * 0.14), 0, delay);
    scheduleIdleAudioSuspend(a);
    return true;
  }

  // پشتیبان مستقیم HTMLAudioElement اگر مرورگر قدیمی موبایل AudioContext نداشت
  if (typeof Audio !== 'undefined') {
    try {
      const el = new Audio(AUDIO_SAMPLE_URIS[id]);
      el.volume = Math.max(0, Math.min(1, vol));
      el.playbackRate = rate;
      void el.play().catch(() => {});
      return true;
    } catch { /* */ }
  }
  return false;
}

export const sfx = {
  coin() { haptic('medium'); playSample('coin', { vol: 0.62, jitter: 0.025, fallbackHz: 880, fallbackDur: 0.18 }); },
  buy() { haptic('light'); playSample('buy', { vol: 0.58, jitter: 0.02, fallbackHz: 659, fallbackDur: 0.16 }); },
  dig() { haptic('light'); playSample('dig', { vol: 0.64, jitter: 0.045, fallbackHz: 140, fallbackDur: 0.15 }); },
  water() { playSample('water', { vol: 0.56, jitter: 0.04, fallbackHz: 520, fallbackDur: 0.22 }); },
  pop() { haptic('light'); playSample('pop', { vol: 0.62, jitter: 0.045, fallbackHz: 587, fallbackDur: 0.11 }); },
  err() { haptic('heavy'); playSample('err', { vol: 0.5, fallbackHz: 196, fallbackDur: 0.15 }); },
  tap() { playSample('tap', { vol: 0.42, jitter: 0.025, fallbackHz: 460, fallbackDur: 0.05 }); },
  step() { playSample('step', { vol: 0.24, jitter: 0.06, fallbackHz: 180, fallbackDur: 0.05 }); },
  cluck() { playSample('cluck', { vol: 0.36, jitter: 0.05, fallbackHz: 520, fallbackDur: 0.1 }); },
  boop() { playSample('boop', { vol: 0.54, jitter: 0.02, fallbackHz: 392, fallbackDur: 0.16 }); },
  fanfare() { haptic('medium'); playSample('fanfare', { vol: 0.66, fallbackHz: 523, fallbackDur: 0.32 }); },
  splash() { playSample('splash', { vol: 0.58, jitter: 0.035, fallbackHz: 310, fallbackDur: 0.22 }); },
  nibble() { haptic('light'); playSample('nibble', { vol: 0.48, jitter: 0.03, fallbackHz: 587, fallbackDur: 0.1 }); },
  paper() { haptic('light'); playSample('paper', { vol: 0.54, jitter: 0.03, fallbackHz: 420, fallbackDur: 0.12 }); },
  combo(streak = 1) {
    const notes = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
    const f = notes[Math.min(notes.length - 1, Math.max(0, streak - 1))];
    haptic(streak >= 5 ? 'medium' : 'light');
    playSample('guitar', { vol: 0.54, rate: f / 261.6256, fallbackHz: f, fallbackDur: 0.18 });
    if (streak >= 3) {
      playSample('guitar', { vol: 0.34, rate: (f * 1.5) / 261.6256, delay: 0.05, fallbackHz: f * 1.5, fallbackDur: 0.18 });
    }
  },
};

// ===== موسیقی هر فصل — آثار رایگان CC0 از OpenGameArt =====
// فصل ۱: Peaceful Forest (Samza) · فصل ۲: Countryside (TAD) · فصل ۳: Feel-good ambient w/ beat (annandistance)
// فصل ۴: Florist (TAD) · فصل ۵: A cup of tea (TAD) · فصل ۶: Town Theme (cynicmusic) · فصل ۷: Forest Ambience (TinyWorlds)
// فصل ۱ استریو 96kbps است؛ فصل‌های ۲–۷ مونو ۲۴–۳۲kbps و حدود ۹۰ تا ۱۴۰ ثانیه با فِید نرم‌اند.
const MUSIC_FILES: Record<number, string> = {
  1: 'peaceful-forest.mp3',
  2: 'ch2.mp3',
  3: 'ch3.mp3',
  4: 'ch4.mp3',
  5: 'ch5.mp3',
  6: 'ch6.mp3',
  7: 'ch7.mp3',
};
// در production هر هفت آهنگ در بلوک‌های inert همان HTML‌اند. فقط آهنگ جاری
// به data URI تبدیل و cache می‌شود؛ bootstrap دیگر هر هفت را با کد بازی باز نمی‌کند.
const packedMusicUrls = new Map<string, string>();
const musicUrlFor = (chapter: number) => {
  const file = MUSIC_FILES[chapter] ?? MUSIC_FILES[1];
  const cached = packedMusicUrls.get(file);
  if (cached) return cached;
  if (typeof window !== 'undefined') {
    const packed = (window as unknown as { __MUSIC_PACK__?: Record<string, string> }).__MUSIC_PACK__?.[file];
    if (packed) return packed;
  }
  if (typeof document !== 'undefined') {
    const encoded = typeof document.querySelector === 'function'
      ? document.querySelector(`script[data-music-pack="${file}"]`)?.textContent?.trim()
      : undefined;
    if (encoded) {
      const url = `data:audio/mpeg;base64,${encoded}`;
      packedMusicUrls.set(file, url);
      return url;
    }
    try {
      return new URL(`music/${file}`, document.baseURI).href;
    } catch {
      // baseURI نامعتبر (مثل about:blank در jsdom) — مسیرِ نسبی خودِ مرورگر کافی است
    }
  }
  return `music/${file}`; // محیطِ تست بدون DOM — پخشی در کار نیست
};
let musicChapter = 1;
let musicTrackChapter = 1;
let musicCompanion = false;
let musicSrcLoaded = '';
let musicEl: HTMLAudioElement | null = null;
let musicWanted = false;
let musicBaseVolume = 0.27;
let musicDuck = 1;

function updateMusicVolume() {
  if (musicEl) musicEl.volume = Math.max(0, Math.min(0.6, musicBaseVolume * musicDuck));
}

// هر فصل یک آهنگ مکمل دارد؛ تعویض در پایان طبیعی قطعه، بدون timer و بدون مصرف
// منابع هم‌زمان، از تکرار بی‌پایان همان ۹۰–۱۴۰ ثانیه جلوگیری می‌کند.
const MUSIC_COMPANION: Record<number, number> = { 1: 7, 2: 5, 3: 6, 4: 2, 5: 1, 6: 3, 7: 4 };

function syncMusicPlayback() {
  const hidden = typeof document !== 'undefined' && document.hidden;
  const shouldPlay = musicWanted && CFG.music && CFG.sound && snd.on && !bgAudioPaused && !hidden;
  if (!shouldPlay) {
    if (musicEl && !musicEl.paused) musicEl.pause();
    return;
  }
  if (typeof Audio === 'undefined') return;
  const wantUrl = musicUrlFor(musicTrackChapter);
  if (!musicEl) {
    musicEl = new Audio(wantUrl);
    musicSrcLoaded = wantUrl;
    musicEl.loop = false;
    musicEl.preload = 'auto';
    musicEl.onended = () => {
      if (!musicWanted || !musicEl) return;
      musicCompanion = !musicCompanion;
      musicTrackChapter = musicCompanion ? MUSIC_COMPANION[musicChapter] : musicChapter;
      musicEl.currentTime = 0;
      syncMusicPlayback();
    };
  } else if (musicSrcLoaded !== wantUrl) {
    // تعویض آهنگ هنگام تغییر فصل — بدون از دست رفتن تنظیمات صدا
    musicEl.src = wantUrl;
    musicSrcLoaded = wantUrl;
    try { musicEl.currentTime = 0; } catch { /* پخش تازه از صفر */ }
  }
  updateMusicVolume();
  if (musicEl.paused) void musicEl.play().catch(() => { /* اولین لمس بعدی دوباره تلاش می‌کند */ });
}

export const ambient = {
  playing: false,
  get duck() { return musicDuck; },
  set duck(value: number) {
    musicDuck = Math.max(0.18, Math.min(1, value));
    updateMusicVolume();
  },
  note(_seasonIdx: number, hour: number, chapter?: number) {
    if (!CFG.music || !CFG.sound || !snd.on) { this.stop(); return; }
    musicWanted = true;
    this.playing = true;
    // هر فصل آهنگ خودش را دارد (پیشنهاد بهبود گزارش ۳۰۰X)
    if (typeof chapter === 'number' && Number.isFinite(chapter)) {
      const want = Math.max(1, Math.min(7, Math.round(chapter)));
      if (want !== musicChapter) {
        musicChapter = want;
        musicTrackChapter = want;
        musicCompanion = false;
      }
    }
    const night = hour >= NIGHT_START_H || hour < NIGHT_END_H;
    musicBaseVolume = night ? 0.2 : 0.27;
    updateMusicVolume();
    audioCtx(); // بازکردن قفل صدا در WebView اندروید؛ پخش موسیقی با HTMLAudio کم‌مصرف است.
    syncMusicPlayback();
  },
  stop() {
    musicWanted = false;
    this.playing = false;
    if (musicEl && !musicEl.paused) musicEl.pause();
  },
};

export function haptic(kind: 'light' | 'medium' | 'heavy' = 'light'): number {
  if (!CFG.haptics || bgAudioPaused) return 0;
  const ms = kind === 'heavy' ? 35 : kind === 'medium' ? 18 : 8;
  // رفع U-3: اول پلاگین بومی @capacitor/haptics (اندروید/iOS)، بعد fallback به vibrate وب
  const style = kind === 'heavy' ? 'HEAVY' : kind === 'medium' ? 'MEDIUM' : 'LIGHT';
  if (nativeImpact(style)) return ms;
  try {
    if (
      typeof navigator !== 'undefined'
      && typeof navigator.vibrate === 'function'
      && (navigator as Navigator & { userActivation?: { hasBeenActive?: boolean } }).userActivation?.hasBeenActive !== false
    ) {
      navigator.vibrate(ms);
    }
  } catch { /* */ }
  return ms;
}
