// ===== پل ذخیره‌سازی امن اندروید (Capacitor Preferences <-> localStorage) (P9-07) =====
// نوشتن‌ها به‌ترتیب و در یک صف انجام می‌شوند (ترتیب هرگز برعکس نمی‌شود) و خطایشان ثبت می‌شود.
// خواندن از بومی با مهلت مشخص انجام می‌شود؛ اگر پل پاسخ ندهد، داده‌های محلی دست‌نخورده می‌مانند.

export interface PreferencesLike {
  get(opts: { key: string }): Promise<{ value: string | null }> | { value: string | null };
  set(opts: { key: string; value: string }): Promise<void> | void;
  remove(opts: { key: string }): Promise<void> | void;
}

const PERSISTED_KEYS = [
  'mazrae-rangi-save-v1',
  'mazrae-rangi-save-v1-bak1',
  'mazrae-rangi-save-v1-bak2',
  'mazrae-rangi-save-v1-bak',
  'mazrae-rangi-settings-v1',
] as const;

let customDriver: PreferencesLike | null = null;

export function setNativePreferencesDriver(driver: PreferencesLike | null) {
  customDriver = driver;
}

function getDriver(): PreferencesLike | null {
  if (customDriver) return customDriver;
  if (typeof window === 'undefined') return null;
  const cap = (window as unknown as {
    Capacitor?: { Plugins?: { Preferences?: PreferencesLike } };
  }).Capacitor;
  return cap?.Plugins?.Preferences ?? null;
}

import { setLastError } from './errorLog';

/** صف ترتیبی نوشتن‌ها: هر نوشتن پس از نوشتن قبلی اجرا می‌شود و خطایش ثبت می‌گردد */
let writeChain: Promise<void> = Promise.resolve();
function enqueueNativeWrite(label: string, op: () => Promise<unknown> | unknown) {
  writeChain = writeChain
    .then(() => op())
    .then(() => undefined)
    .catch((err) => {
      setLastError(`native-write-failed:${label}:${String((err as Error)?.message ?? err)}`, 'runtime');
    });
}

/** بازگشت مقدار یا undefined در صورت timeout/خطا؛ undefined یعنی «نامعلوم» (نباید داده را بازنویسی کرد) */
function withBridgeTimeout<T>(op: () => Promise<T> | T, ms: number): Promise<T | undefined> {
  return new Promise<T | undefined>((resolve) => {
    let settled = false;
    const done = (v: T | undefined) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    const timer = setTimeout(() => done(undefined), ms);
    try {
      Promise.resolve(op())
        .then((v) => { clearTimeout(timer); done(v); })
        .catch(() => { clearTimeout(timer); done(undefined); });
    } catch {
      clearTimeout(timer);
      done(undefined);
    }
  });
}

/** زمان ذخیرهٔ یک رشته (فقط برای سیوها؛ بقیه صفر) */
function savedAtOf(text: string): number {
  try {
    const p = JSON.parse(text) as { savedAt?: unknown } | null;
    return p && typeof p.savedAt === 'number' ? p.savedAt : 0;
  } catch { return 0; }
}

/** انتظار برای تخلیهٔ کامل صف نوشتن‌های بومی (قبل از هر خواندن از بومی) */
export function flushNativeWrites(): Promise<void> { return writeChain; }

/** نوشتن هم‌زمان در localStorage (فوری) و در صف بومی. خطای localStorage به فراخوان برگردانده می‌شود. */
export function nativeSetItem(key: string, value: string): boolean {
  let ok = true;
  try { localStorage.setItem(key, value); } catch { ok = false; }
  const drv = getDriver();
  if (drv) enqueueNativeWrite(`set:${key}`, () => drv.set({ key, value }));
  return ok;
}

export function nativeRemoveItem(key: string) {
  try { localStorage.removeItem(key); } catch { /* */ }
  const drv = getDriver();
  if (drv) enqueueNativeWrite(`remove:${key}`, () => drv.remove({ key }));
}

/**
 * همگام‌سازی کلیدهای حیاتی بین localStorage و حافظهٔ بومی.
 * - فقط وقتی بومی مقدار دارد و محلی ندارد، بازیابی می‌شود.
 * - اگر هر دو باشند، سیوی که زمان ذخیره‌اش جدیدتر است برنده است (نه همیشه محلی).
 * - اگر پل پاسخ نداد (timeout)، هیچ چیزی بازنویسی نمی‌شود.
 */
export async function hydrateNativeStorage(): Promise<number> {
  const drv = getDriver();
  if (!drv) return 0;
  // نوشتن‌های در صف باید اول تمام شوند تا بومی نسخهٔ واقعی آخرین ذخیره را داشته باشد
  await writeChain;
  let restored = 0;
  for (const key of PERSISTED_KEYS) {
    try {
      const local = localStorage.getItem(key);
      const res = await withBridgeTimeout(() => drv.get({ key }), 2000);
      if (res === undefined) continue; // نامعلوم: دست نمی‌زنیم
      const nat = res?.value ?? null;
      if (nat === null) {
        if (local !== null) enqueueNativeWrite(`seed:${key}`, () => drv.set({ key, value: local }));
        continue;
      }
      if (local === null) {
        try { localStorage.setItem(key, nat); } catch (e) { setLastError(`local-set-failed:${key}:${String((e as Error)?.message ?? e)}`, 'storage'); }
        restored++;
        continue;
      }
      if (nat === local) continue;
      if (savedAtOf(nat) > savedAtOf(local)) {
        try { localStorage.setItem(key, nat); } catch (e) { setLastError(`local-set-failed:${key}:${String((e as Error)?.message ?? e)}`, 'storage'); }
        restored++;
      } else {
        enqueueNativeWrite(`seed:${key}`, () => drv.set({ key, value: local }));
      }
    } catch (err) {
      setLastError(`native-hydrate-failed:${key}:${String((err as Error)?.message ?? err)}`, 'runtime');
    }
  }
  return restored;
}
