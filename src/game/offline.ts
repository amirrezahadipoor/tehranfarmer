export const OFFLINE_MUSIC_URLS = [
  './music/peaceful-forest.mp3', './music/ch2.mp3', './music/ch3.mp3', './music/ch4.mp3',
  './music/ch5.mp3', './music/ch6.mp3', './music/ch7.mp3',
] as const;

/** Explicit, user-initiated full music download; normal startup never calls this. */
export async function prepareOfflineMusic(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || typeof MessageChannel === 'undefined') return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const worker = registration.active;
    if (!worker) return false;
    return await new Promise<boolean>((resolve) => {
      const channel = new MessageChannel();
      const finish = (ok: boolean) => {
        clearTimeout(timer);
        channel.port1.close();
        resolve(ok);
      };
      const timer = setTimeout(() => finish(false), 120_000);
      channel.port1.onmessage = (event) => finish(Boolean((event.data as { ok?: boolean })?.ok));
      worker.postMessage({ type: 'CACHE_MUSIC', urls: [...OFFLINE_MUSIC_URLS] }, [channel.port2]);
    });
  } catch {
    return false;
  }
}
