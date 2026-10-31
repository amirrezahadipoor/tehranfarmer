import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bindToastHost, clearToasts, setToastsPaused, toast, TOAST_MS } from './toasts';
import type { Toast } from './state';

describe('sequential toast queue', () => {
  let host: { toasts: Toast[]; notify: () => void; locale: () => 'fa' | 'en' };

  beforeEach(() => {
    vi.useFakeTimers();
    host = { toasts: [], notify: vi.fn(), locale: () => 'fa' };
    bindToastHost(host);
    setToastsPaused(false);
  });

  afterEach(() => {
    clearToasts();
    setToastsPaused(false);
    vi.useRealTimers();
  });

  it('runs only the active timer and reveals pending messages one by one', () => {
    toast('star', 'اول');
    toast('coin', 'دوم');
    toast('mail', 'سوم');
    expect(host.toasts.map((t) => t.text)).toEqual(['اول', 'دوم', 'سوم']);
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(TOAST_MS - 1);
    expect(host.toasts.map((t) => t.text)).toEqual(['اول', 'دوم', 'سوم']);
    vi.advanceTimersByTime(1);
    expect(host.toasts.map((t) => t.text)).toEqual(['دوم', 'سوم']);
    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(TOAST_MS);
    expect(host.toasts.map((t) => t.text)).toEqual(['سوم']);
    vi.advanceTimersByTime(TOAST_MS);
    expect(host.toasts).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('pauses the active remaining lifetime and messages queued behind the morning report', () => {
    toast('star', 'فعال');
    vi.advanceTimersByTime(1000);
    setToastsPaused(true);
    toast('mail', 'بعد از گزارش');
    vi.advanceTimersByTime(10_000);
    expect(host.toasts.map((t) => t.text)).toEqual(['فعال', 'بعد از گزارش']);
    expect(vi.getTimerCount()).toBe(0);

    setToastsPaused(false);
    vi.advanceTimersByTime(TOAST_MS - 1000 - 1);
    expect(host.toasts.map((t) => t.text)).toEqual(['فعال', 'بعد از گزارش']);
    vi.advanceTimersByTime(1);
    expect(host.toasts.map((t) => t.text)).toEqual(['بعد از گزارش']);
    vi.advanceTimersByTime(TOAST_MS);
    expect(host.toasts).toEqual([]);
  });
});
