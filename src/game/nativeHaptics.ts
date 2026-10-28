// ===== بازخورد لمسی بومی (رفع U-3) =====
// @capacitor/haptics در وابستگی‌ها نصب بود ولی هیچ‌جا استفاده نمی‌شد و فقط
// navigator.vibrate صدا زده می‌شد؛ در WebView بعضی گوشی‌ها (و در iOS) vibrate کار نمی‌کند.
// این لایه اول پلاگین بومی را (اگر در محیط Capacitor موجود باشد) صدا می‌زند و اگر نبود
// به vibrate وب برمی‌گردد. هیچ import مستقیمی ندارد تا بستهٔ وب سنگین/شکننده نشود.
interface HapticsPlugin {
  impact: (opts: { style: 'LIGHT' | 'MEDIUM' | 'HEAVY' }) => Promise<void>;
  notification: (opts: { type: 'SUCCESS' | 'WARNING' | 'ERROR' }) => Promise<void>;
}

let plugin: HapticsPlugin | null | undefined;

function getPlugin(): HapticsPlugin | null {
  if (plugin !== undefined) return plugin;
  plugin = null;
  try {
    const cap = (globalThis as {
      Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { Haptics?: HapticsPlugin } };
    }).Capacitor;
    if (cap?.isNativePlatform?.() && cap.Plugins?.Haptics) plugin = cap.Plugins.Haptics;
  } catch { plugin = null; }
  return plugin;
}

/** true اگر بازخورد لمسی بومی در دسترس است (اندروید/iOS) */
export function hasNativeHaptics(): boolean {
  return getPlugin() !== null;
}

/** اجرای لرزش بومی؛ همیشه بی‌صدا و بدون پرتاب خطا */
export function nativeImpact(style: 'LIGHT' | 'MEDIUM' | 'HEAVY' = 'LIGHT'): boolean {
  const p = getPlugin();
  if (!p) return false;
  try { void p.impact({ style }).catch(() => { /* بی‌صدا */ }); return true; } catch { return false; }
}

export function nativeNotify(type: 'SUCCESS' | 'WARNING' | 'ERROR' = 'SUCCESS'): boolean {
  const p = getPlugin();
  if (!p) return false;
  try { void p.notification({ type }).catch(() => { /* بی‌صدا */ }); return true; } catch { return false; }
}
