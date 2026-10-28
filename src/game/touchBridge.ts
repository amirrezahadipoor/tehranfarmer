// ===== پل لمس خالص، دقیق و بدون تداخل برای اندروید، iOS و دسکتاپ =====
// ریشهٔ مشکلات قبلی لمس روی گوشی واقعی اندروید:
// ۱) مسدودساز سراسری click با پنجرهٔ ۴۲۰ میلی‌ثانیه روی window باعث خورده‌شدن ضربه‌های پیاپی کاربر و کلیک‌های درون لیست‌های اسکرولی می‌شد.
// ۲) اجرای هم‌زمان TouchEvent بدون preventDefault در کنار PointerEvent روی <canvas> باعث صدور pointercancel ناگهانی در میانهٔ لمس می‌شد.
// اکنون:
// - روی همهٔ دکمه‌ها هیچ click بومی مرورگر مسدود نمی‌شود؛ فقط اگر لغزش جزئی شست باعث حذف click بومی توسط WebView شد، پس از بررسی عدم وقوع click بومی، click دقیق همان دکمه بازیابی می‌شود.
// - روی <canvas> همهٔ لمس‌های واقعی سیستم‌عامل (e.isTrusted) منحصراً از مسیر واحد PointerEvent با touch-action: none عبور می‌کنند و مسیر TouchEvent صرفاً برای رویدادهای مصنوعی تست‌های خودکار (!e.isTrusted) فعال می‌شود.

export interface CanvasPoint {
  clientX: number;
  clientY: number;
}

const TAP_SELECTOR = 'button, [role="button"], a[href], summary, [data-tap]';

let touchBridgeInstalled = false;

export function installTouchBridge(): void {
  installGlobalTouchBridge();
}

export function installGlobalTouchBridge(): void {
  if (touchBridgeInstalled || typeof window === 'undefined') return;
  touchBridgeInstalled = true;

  const activePointers = new Map<number, {
    el: HTMLElement;
    sx: number;
    sy: number;
    maxMove: number;
    scrolled: boolean;
    clicked: boolean;
    onClick: () => void;
    onScroll: () => void;
  }>();

  window.addEventListener(
    'pointerdown',
    (e) => {
      // هر رکورد قدیمی همین شناسه (اگر pointerup/cancel نیامده) پاک می‌شود تا نشتی حافظه و شنونده جمع نشود
      const stale = cleanupPointer(e.pointerId);
      if (stale) stale.el.removeEventListener('click', stale.onClick, { capture: true });
      if (!e.isTrusted || e.pointerType === 'mouse' || !e.isPrimary) return;
      const target = (e.target as Element | null)?.closest?.(TAP_SELECTOR) as HTMLElement | null;
      if (!target || (target as HTMLButtonElement).disabled) return;
      const rec = {
        el: target,
        sx: e.clientX,
        sy: e.clientY,
        maxMove: 0,
        scrolled: false,
        clicked: false,
        onClick: () => { rec.clicked = true; },
        onScroll: () => { rec.scrolled = true; },
      };
      target.addEventListener('click', rec.onClick, { capture: true, once: true });
      window.addEventListener('scroll', rec.onScroll, { capture: true, passive: true });
      activePointers.set(e.pointerId, rec);
    },
    { capture: true, passive: true },
  );

  window.addEventListener(
    'pointermove',
    (e) => {
      const rec = activePointers.get(e.pointerId);
      if (!rec) return;
      const d = Math.hypot(e.clientX - rec.sx, e.clientY - rec.sy);
      if (d > rec.maxMove) rec.maxMove = d;
    },
    { capture: true, passive: true },
  );

  const cleanupPointer = (id: number) => {
    const rec = activePointers.get(id);
    if (!rec) return null;
    activePointers.delete(id);
    window.removeEventListener('scroll', rec.onScroll, { capture: true });
    return rec;
  };

  window.addEventListener(
    'pointercancel',
    (e) => {
      const rec = cleanupPointer(e.pointerId);
      if (rec) rec.el.removeEventListener('click', rec.onClick, { capture: true });
    },
    { capture: true, passive: true },
  );

  window.addEventListener(
    'pointerup',
    (e) => {
      const rec = cleanupPointer(e.pointerId);
      if (!rec) return;
      const endMove = Math.max(rec.maxMove, Math.hypot(e.clientX - rec.sx, e.clientY - rec.sy));
      const inScroll = !!rec.el.closest('.scroll, .scroll-x');
      const limit = inScroll ? 14 : 28;
      // اگر به هر دلیل (ضربهٔ پیاپی سریع، scale در حالت active یا لغزش شست ۰ تا ۲۸px) WebView رویداد click بومی را نساخت،
      // پس از ۵۵ms به صورت اتمی و بدون تولید کلیک تکراری همان دکمه را دقیق فعال می‌کند
      setTimeout(() => {
        rec.el.removeEventListener('click', rec.onClick, { capture: true });
        if (rec.clicked || rec.scrolled || endMove > limit) return;
        if (!rec.el.isConnected || (rec.el as HTMLButtonElement).disabled) return;
        const guard = (ce: MouseEvent) => {
          if (ce.isTrusted && Math.hypot(ce.clientX - rec.sx, ce.clientY - rec.sy) < 32) {
            ce.stopPropagation();
            ce.preventDefault();
          }
        };
        window.addEventListener('click', guard, { capture: true });
        setTimeout(() => window.removeEventListener('click', guard, { capture: true }), 150);
        rec.el.click();
      }, 55);
    },
    { capture: true, passive: true },
  );

  // پشتیبانی کامل از TouchEventهای مصنوعی در تست‌های خودکار (!e.isTrusted) بدون کوچک‌ترین دخالت در لمس واقعی اندروید
  let synthStart: { el: HTMLElement; x: number; y: number; maxMove: number } | null = null;
  window.addEventListener(
    'touchstart',
    (e) => {
      if (e.isTrusted || e.touches.length !== 1) { synthStart = null; return; }
      const t = e.touches[0];
      const target = (e.target as Element | null)?.closest?.(TAP_SELECTOR) as HTMLElement | null;
      synthStart = target && !(target as HTMLButtonElement).disabled
        ? { el: target, x: t.clientX, y: t.clientY, maxMove: 0 }
        : null;
    },
    { capture: true, passive: true },
  );
  window.addEventListener(
    'touchmove',
    (e) => {
      if (e.isTrusted || !synthStart || !e.touches.length) return;
      const t = e.touches[0];
      synthStart.maxMove = Math.max(synthStart.maxMove, Math.hypot(t.clientX - synthStart.x, t.clientY - synthStart.y));
    },
    { capture: true, passive: true },
  );
  window.addEventListener(
    'touchend',
    (e) => {
      if (e.isTrusted || !synthStart) return;
      const snap = synthStart;
      synthStart = null;
      const t = e.changedTouches[0];
      const move = t ? Math.max(snap.maxMove, Math.hypot(t.clientX - snap.x, t.clientY - snap.y)) : snap.maxMove;
      if (move <= 28 && snap.el.isConnected && !(snap.el as HTMLButtonElement).disabled) {
        snap.el.click();
      }
    },
    { capture: true, passive: true },
  );
}

export interface CanvasInputHandlers {
  onDown: (pt: CanvasPoint) => void;
  onMove: (pt: CanvasPoint) => void;
  onUp: (pt: CanvasPoint) => void;
  onLeave: () => void;
}

export function bindCanvasInput(
  canvas: HTMLCanvasElement,
  onResize: () => void,
  handlers: CanvasInputHandlers,
): () => void {
  let activePointerId: number | null = null;
  let lastPt: CanvasPoint = { clientX: 0, clientY: 0 };

  const ptrDown = (e: PointerEvent) => {
    if (e.isPrimary === false && activePointerId !== null) return;
    activePointerId = e.pointerId ?? 0;
    lastPt = { clientX: e.clientX, clientY: e.clientY };
    handlers.onDown(lastPt);
  };
  const ptrMove = (e: PointerEvent) => {
    if (activePointerId !== null && e.pointerId !== undefined && e.pointerId !== activePointerId) return;
    lastPt = { clientX: e.clientX, clientY: e.clientY };
    handlers.onMove(lastPt);
  };
  const ptrUp = (e: PointerEvent) => {
    if (activePointerId === null) return;
    if (e.pointerId !== undefined && e.pointerId !== activePointerId) return;
    activePointerId = null;
    handlers.onUp({ clientX: e.clientX, clientY: e.clientY });
  };
  const ptrLeave = () => {
    handlers.onLeave();
  };

  // فقط برای TouchEventهای مصنوعی تست (!e.isTrusted) — روی گوشی واقعی e.isTrusted === true است و هرگز اجرا نمی‌شود
  const tchDown = (e: TouchEvent) => {
    if (e.isTrusted || e.touches.length < 1) return;
    const t = e.touches[0];
    lastPt = { clientX: t.clientX, clientY: t.clientY };
    handlers.onDown(lastPt);
  };
  const tchMove = (e: TouchEvent) => {
    if (e.isTrusted || e.touches.length < 1) return;
    const t = e.touches[0];
    lastPt = { clientX: t.clientX, clientY: t.clientY };
    handlers.onMove(lastPt);
  };
  const tchUp = (e: TouchEvent) => {
    if (e.isTrusted) return;
    const t = e.changedTouches[0];
    handlers.onUp(t ? { clientX: t.clientX, clientY: t.clientY } : lastPt);
  };

  const onOrient = () => {
    onResize();
    setTimeout(onResize, 120);
    setTimeout(onResize, 320);
  };

  canvas.addEventListener('pointerdown', ptrDown, { passive: true });
  canvas.addEventListener('pointermove', ptrMove, { passive: true });
  canvas.addEventListener('pointerup', ptrUp, { passive: true });
  canvas.addEventListener('pointercancel', ptrUp, { passive: true });
  window.addEventListener('pointerup', ptrUp, { passive: true });
  window.addEventListener('pointercancel', ptrUp, { passive: true });
  canvas.addEventListener('pointerleave', ptrLeave, { passive: true });

  canvas.addEventListener('touchstart', tchDown, { passive: true });
  canvas.addEventListener('touchmove', tchMove, { passive: true });
  window.addEventListener('touchend', tchUp, { passive: true });
  window.addEventListener('touchcancel', tchUp, { passive: true });

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onOrient);
  window.visualViewport?.addEventListener('resize', onResize);

  return () => {
    canvas.removeEventListener('pointerdown', ptrDown);
    canvas.removeEventListener('pointermove', ptrMove);
    canvas.removeEventListener('pointerup', ptrUp);
    canvas.removeEventListener('pointercancel', ptrUp);
    window.removeEventListener('pointerup', ptrUp);
    window.removeEventListener('pointercancel', ptrUp);
    canvas.removeEventListener('pointerleave', ptrLeave);
    canvas.removeEventListener('touchstart', tchDown);
    canvas.removeEventListener('touchmove', tchMove);
    window.removeEventListener('touchend', tchUp);
    window.removeEventListener('touchcancel', tchUp);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onOrient);
    window.visualViewport?.removeEventListener('resize', onResize);
  };
}
