import { beforeEach } from 'vitest';
import { setSeed } from '../src/game/rng';

// هر تست با seed ثابت شروع می‌شود تا نتیجه بازتولیدپذیر باشد
beforeEach(() => setSeed(20261021));

// محیط تست: localStorage ساده + بی‌صداسازی صدا برای اجرای headless
class MemStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
}
const g = globalThis as unknown as { localStorage?: unknown; window?: unknown; document?: unknown };
if (!g.localStorage) Object.defineProperty(globalThis, 'localStorage', { value: new MemStorage(), writable: true });
if (!g.window) Object.defineProperty(globalThis, 'window', { value: globalThis, writable: true });
