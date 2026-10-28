// شبیه‌ساز DOM/Canvas برای اجرای موتور بازی به‌صورت headless
type AnyFn = (...a: unknown[]) => unknown;

function makeCtx(): CanvasRenderingContext2D {
  const base: Record<string, unknown> = {
    canvas: null, fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1, lineWidth: 1, lineCap: 'butt',
    lineJoin: 'miter', font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic',
    shadowBlur: 0, shadowColor: '#000', shadowOffsetX: 0, shadowOffsetY: 0, globalCompositeOperation: 'source-over',
    miterLimit: 10, lineDashOffset: 0, filter: 'none', imageSmoothingEnabled: true,
  };
  return new Proxy(base, {
    get(t, prop: string) {
      if (prop in t) return t[prop];
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createConicGradient') {
        return () => ({ addColorStop() { /* */ } });
      }
      if (prop === 'createPattern') return () => ({});
      if (prop === 'measureText') return (s: string) => ({ width: String(s).length * 6, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 });
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
      if (prop === 'isPointInPath') return () => false;
      if (prop === 'getLineDash') return () => [];
      const fn: AnyFn = () => undefined;
      t[prop] = fn;
      return fn;
    },
    set(t, prop: string, v) { t[prop] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
}

export function makeCanvas(w = 1280, h = 720) {
  const ctx = makeCtx();
  const handlers: Record<string, Set<(e: unknown) => void>> = {};
  const canvas = {
    __h: handlers,
    width: w, height: h, style: {} as CSSStyleDeclaration,
    getContext: () => ctx,
    toDataURL: () => 'data:image/png;base64,',
    getBoundingClientRect: () => ({ left: 0, top: 0, right: w, bottom: h, width: w, height: h, x: 0, y: 0 }),
    addEventListener: (k: string, f: (e: unknown) => void) => { const m = (canvas as unknown as { __h: Record<string, Set<(e: unknown) => void>> }).__h; (m[k] ??= new Set()).add(f); },
    removeEventListener: () => undefined,
    setPointerCapture: () => undefined,
    releasePointerCapture: () => undefined,
    clientWidth: w, clientHeight: h,
  };
  return canvas as unknown as HTMLCanvasElement & { __handlers?: Record<string, (e: unknown) => void> };
}

/** محیط مرورگر ساختگی را نصب می‌کند و امکانات کنترل حلقهٔ رندر را برمی‌گرداند */
export function installDom(w = 1280, h = 720) {
  const frames: FrameRequestCallback[] = [];
  const listeners = new Map<string, Set<(e: unknown) => void>>();
  const g = globalThis as unknown as Record<string, unknown>;
  if (typeof (g.localStorage as { getItem?: unknown } | undefined)?.getItem !== 'function') {
    const mem = new Map<string, string>();
    g.localStorage = {
      getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
      setItem: (k: string, v: string) => { mem.set(k, String(v)); },
      removeItem: (k: string) => { mem.delete(k); },
      clear: () => { mem.clear(); },
      key: (i: number) => Array.from(mem.keys())[i] ?? null,
      get length() { return mem.size; },
    };
  }
  g.window = {
    innerWidth: w, innerHeight: h, devicePixelRatio: 1,
    addEventListener: (k: string, f: (e: unknown) => void) => { if (!listeners.has(k)) listeners.set(k, new Set()); listeners.get(k)!.add(f); },
    removeEventListener: (k: string, f: (e: unknown) => void) => { listeners.get(k)?.delete(f); },
  };
  let now = 0;
  g.performance = { now: () => now };
  g.requestAnimationFrame = (cb: FrameRequestCallback) => { frames.push(cb); return frames.length; };
  g.cancelAnimationFrame = () => undefined;
  g.devicePixelRatio = 1;
  g.document = {
    createElement: (tag: string) => (tag === 'canvas' ? makeCanvas(256, 256) : { style: {}, appendChild() { /* */ }, addEventListener() { /* */ } }),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    body: { appendChild() { /* */ }, style: {} },
    documentElement: { style: {} },
  };
  g.ResizeObserver = class { observe() { /* */ } unobserve() { /* */ } disconnect() { /* */ } };
  g.Image = class { set src(_v: string) { /* */ } };
  return {
    /** یک فریم جلو می‌برد (۶۰fps) */
    pump(count = 1, dtMs = 16.7) {
      for (let i = 0; i < count; i++) {
        const cb = frames.shift();
        if (!cb) return i;
        now += dtMs;
        cb(now);
      }
      return count;
    },
    pending: () => frames.length,
    now: () => now,
    fire(k: string, e: unknown) { listeners.get(k)?.forEach((f) => f(e)); },
  };
}

/** رویداد لمسی روی canvas واقعی موتور (برای تست تعامل) */
export function tap(canvas: HTMLCanvasElement, x: number, y: number) {
  const h = (canvas as unknown as { __h: Record<string, Set<(e: unknown) => void>> }).__h;
  const ev = { clientX: x, clientY: y, pointerId: 1, preventDefault() { /* */ }, target: canvas };
  h.pointerdown?.forEach((f) => f(ev));
  h.pointerup?.forEach((f) => f(ev));
}
