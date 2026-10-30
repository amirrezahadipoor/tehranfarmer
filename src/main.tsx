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
