import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { installGlobalErrorHooks } from './game/errorLog';
import { installTouchBridge } from './game/touchBridge';

installGlobalErrorHooks();
installTouchBridge();

if (
  typeof navigator !== 'undefined' &&
  'serviceWorker' in navigator &&
  location.protocol.startsWith('http') &&
  !(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let refreshed = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || refreshed) return;
    refreshed = true;
    window.location.reload();
  });
  const regSw = () => {
    navigator.serviceWorker.register('./sw.js').then((r) => {
      void r.update().catch(() => {});
      const cacheMusic = () => {
        void navigator.serviceWorker.ready.then((reg) => {
          reg.active?.postMessage({
            type: 'CACHE_MUSIC',
            urls: [
              './music/peaceful-forest.mp3', './music/ch2.mp3', './music/ch3.mp3', './music/ch4.mp3',
              './music/ch5.mp3', './music/ch6.mp3', './music/ch7.mp3',
            ],
          });
        }).catch(() => {});
      };
      if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(cacheMusic, { timeout: 8000 });
      else window.setTimeout(cacheMusic, 3000);
    }).catch(() => {});
  };
  if (document.readyState === 'complete') regSw();
  else window.addEventListener('load', regSw);
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
