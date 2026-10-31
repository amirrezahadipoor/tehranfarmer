// ===== صف اعلان‌های متوالی و قابل‌توقف =====
// فقط اعلان اول صف تایمر دارد؛ پیام‌های بعدی تا آزادشدن نوبت صبر می‌کنند.
// هنگام گزارش صبح، زمان اعلان فعال هم متوقف می‌شود تا هیچ پیامی پشت مودال از دست نرود.
import type { Toast } from './state';

export const MAX_TOASTS = 4;
export const TOAST_MS = 2500;

let tid = 1;
let activeTimer: ReturnType<typeof setTimeout> | null = null;
let activeId: number | null = null;
let remainingMs = TOAST_MS;
let startedAt = 0;
let paused = false;

interface ToastHost {
  toasts: Toast[];
  notify: () => void;
  locale: () => 'fa' | 'en';
}

let host: ToastHost | null = null;

/** اتصال صف اعلان‌ها به وضعیت بازی (یک بار در state.ts فراخوانی می‌شود) */
export function bindToastHost(h: ToastHost) {
  host = h;
}

function stopActiveTimer(preserveRemaining: boolean) {
  if (!activeTimer) return;
  if (preserveRemaining) remainingMs = Math.max(0, remainingMs - (Date.now() - startedAt));
  clearTimeout(activeTimer);
  activeTimer = null;
}

function armActiveToast() {
  const current = host?.toasts[0];
  if (!current || paused || activeTimer) return;
  if (activeId !== current.id) {
    activeId = current.id;
    remainingMs = TOAST_MS;
  }
  const id = current.id;
  startedAt = Date.now();
  activeTimer = setTimeout(() => {
    activeTimer = null;
    if (!host) return;
    host.toasts = host.toasts.filter((q) => q.id !== id);
    activeId = null;
    remainingMs = TOAST_MS;
    host.notify();
    armActiveToast();
  }, remainingMs);
  const timer = activeTimer;
  if (typeof timer === 'object' && timer !== null && 'unref' in timer) (timer as { unref: () => void }).unref();
}

/** توقف/ازسرگیری عمر اعلان فعال؛ صف و زمان باقی‌مانده حفظ می‌شوند. */
export function setToastsPaused(value: boolean) {
  if (paused === value) return;
  paused = value;
  if (paused) stopActiveTimer(true);
  else armActiveToast();
}

/** پاک‌سازی کامل صف اعلان‌ها (برای تست‌ها و بازنشانی بازی) */
export function clearToasts() {
  stopActiveTimer(false);
  activeId = null;
  remainingMs = TOAST_MS;
  if (host) host.toasts = [];
}

export function toast(icon: string, text: string) {
  if (!host) return;
  const locale = host.locale();
  const t: Toast = { id: tid++, icon, text, locale };
  // پیام تکراری دوباره صف نمی‌شود؛ اگر روی صفحه است، عمرش تازه می‌شود.
  const prev = host.toasts.find((q) => q.icon === icon && q.text === text && q.locale === locale);
  if (prev) {
    if (host.toasts[0]?.id === prev.id) {
      stopActiveTimer(false);
      activeId = prev.id;
      remainingMs = TOAST_MS;
      armActiveToast();
    }
    host.notify();
    return;
  }
  const routine = (q: Toast) => q.icon === 'mail';
  const preemptedId = !routine(t) && host.toasts[0] && routine(host.toasts[0]) ? host.toasts[0].id : null;
  let next: Toast[];
  if (preemptedId !== null) {
    // نتیجهٔ واقعی فعالیت نباید چند ثانیه پشت اعلان عادی نامه پنهان بماند.
    // نامه فقط به نوبت بعد می‌رود؛ متن و تایمر آن حذف نمی‌شود.
    stopActiveTimer(false);
    activeId = null;
    remainingMs = TOAST_MS;
    next = [t, ...host.toasts];
  } else if (!routine(t)) {
    // نتایج تازه پیش از نامه‌های در انتظار قرار می‌گیرند، ولی اعلان فعالیتِ
    // در حال نمایش قطع نمی‌شود.
    const firstRoutine = host.toasts.findIndex((q, index) => index > 0 && routine(q));
    next = firstRoutine < 0
      ? [...host.toasts, t]
      : [...host.toasts.slice(0, firstRoutine), t, ...host.toasts.slice(firstRoutine)];
  } else {
    next = [...host.toasts, t];
  }
  while (next.length > MAX_TOASTS) {
    // در پرشدن صف، ابتدا پیام‌های غیرضروریِ غیرفعال حذف می‌شوند؛ نامه‌ای که
    // همین حالا برای نمایش loot عقب رفته تا حد امکان حفظ می‌شود.
    let dropIndex = next.findIndex((q) => q.id !== activeId && q.id !== preemptedId && routine(q));
    if (dropIndex < 0) dropIndex = next.findIndex((q) => q.id !== activeId && q.id !== preemptedId);
    if (dropIndex < 0) dropIndex = next.findIndex((q) => q.id !== activeId);
    if (dropIndex < 0) dropIndex = 0;
    const [dropped] = next.splice(dropIndex, 1);
    if (dropped?.id === activeId) {
      stopActiveTimer(false);
      activeId = null;
      remainingMs = TOAST_MS;
    }
  }
  host.toasts = next;
  armActiveToast();
  host.notify();
}
