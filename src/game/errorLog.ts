// ثبت محلی خطاها با بافر حلقوی — صددرصد آفلاین، بدون هیچ ارسالی به شبکه (P9-06)
export interface LocalErrorEntry {
  at: number;
  kind: 'react' | 'runtime' | 'rejection' | 'storage' | 'ui';
  msg: string;
}

const KEY_LAST = 'mazrae-rangi-lasterr';
const KEY_LOG = 'mazrae-rangi-errlog-v1';
const MAX_ENTRIES = 10;

let cache: string | null = null;
let hooked = false;

export function getErrorLog(): LocalErrorEntry[] {
  try {
    const raw = localStorage.getItem(KEY_LOG);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function setLastError(msg: string, kind: LocalErrorEntry['kind'] = 'react') {
  const clean = msg.slice(0, 300);
  cache = clean;
  try {
    localStorage.setItem(KEY_LAST, clean);
    const prev = getErrorLog();
    const next: LocalErrorEntry[] = [...prev.slice(-(MAX_ENTRIES - 1)), { at: Date.now(), kind, msg: clean }];
    localStorage.setItem(KEY_LOG, JSON.stringify(next));
  } catch (e) { /* error logger should never throw */ }
}

export function getLastError(): string | null {
  if (cache !== null) return cache || null;
  try { cache = localStorage.getItem(KEY_LAST) ?? ''; } catch { cache = ''; }
  return cache || null;
}

export function clearErrorLog() {
  cache = '';
  try {
    localStorage.removeItem(KEY_LAST);
    localStorage.removeItem(KEY_LOG);
  } catch (e) { /* error logger should never throw */ }
}

export function exportErrorLogJson(): string {
  return JSON.stringify({ app: 'mazrae-rangi', localOnly: true, entries: getErrorLog() }, null, 2);
}

export function installGlobalErrorHooks() {
  if (hooked || typeof window === 'undefined') return;
  hooked = true;
  window.addEventListener('error', (ev) => {
    setLastError(String(ev.message || ev.error || 'runtime-error'), 'runtime');
  });
  window.addEventListener('unhandledrejection', (ev) => {
    setLastError(String(ev.reason || 'unhandled-rejection'), 'rejection');
  });
}
