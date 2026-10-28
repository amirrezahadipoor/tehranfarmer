// ===== صف اعلان‌ها (رفع C-2) =====
// قبلاً فقط دو پیام نگه داشته می‌شد و یک تایمر مشترک همه را با هم پاک می‌کرد؛
// نتیجه این بود که پیام «هدیهٔ بذر مادربزرگ» یا «پول/برداشت» با نامهٔ تاجر جایگزین می‌شد.
// حالا هر اعلان تا سقف MAX_TOASTS در صف می‌ماند، هر کدام تایمر مستقل خودش را دارد
// و پیام‌های هم‌زمان همدیگر را حذف نمی‌کنند. منطق در ماژول جدا نگه داشته شده تا state.ts
// از سقف ۶۰۰ خط (گیت audit:agents) عبور نکند.
import type { Toast } from './state';

export const MAX_TOASTS = 4;
export const TOAST_MS = 2500;

let tid = 1;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

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

function arm(id: number) {
  if (!host) return;
  const t = setTimeout(() => {
    timers.delete(id);
    if (!host) return;
    if (host.toasts.some((q) => q.id === id)) {
      host.toasts = host.toasts.filter((q) => q.id !== id);
      host.notify();
    }
  }, TOAST_MS);
  if (typeof t === 'object' && t !== null && 'unref' in t) (t as { unref: () => void }).unref();
  timers.set(id, t);
}

/** پاک‌سازی کامل صف اعلان‌ها (برای تست‌ها و بازنشانی بازی) */
export function clearToasts() {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
  if (host) host.toasts = [];
}

export function toast(icon: string, text: string) {
  if (!host) return;
  const locale = host.locale();
  const t: Toast = { id: tid++, icon, text, locale };
  // پیام تکراری (همان آیکون و همان متن) دوباره صف نمی‌شود؛ فقط عمرش تازه می‌شود.
  const prev = host.toasts.find((q) => q.icon === icon && q.text === text && q.locale === locale);
  if (prev) {
    const old = timers.get(prev.id);
    if (old) clearTimeout(old);
    timers.delete(prev.id);
    arm(prev.id);
    host.notify();
    return;
  }
  const next = [...host.toasts, t];
  while (next.length > MAX_TOASTS) {
    const dropped = next.shift();
    if (dropped) {
      const dt = timers.get(dropped.id);
      if (dt) clearTimeout(dt);
      timers.delete(dropped.id);
    }
  }
  host.toasts = next;
  arm(t.id);
  host.notify();
}
