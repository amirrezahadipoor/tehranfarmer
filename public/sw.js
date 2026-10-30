const CACHE_NAME = 'mazrae-rangi-offline-v18';
const BUILD_ASSETS = /*__TF_BUILD_ASSETS__*/null;
const CORE_ASSETS = [
  './', './index.html', './manifest.webmanifest', './icon.svg',
  ...(BUILD_ASSETS ?? []),
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Full music caching is explicit (Settings > Prepare offline) so first-use 4G
// does not download several megabytes in the background. Playback still caches
// the current track on demand through the fetch handler below.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CACHE_MUSIC' || !Array.isArray(event.data.urls)) return;
  const urls = event.data.urls.filter((url) => typeof url === 'string' && url.includes('music/'));
  const work = caches.open(CACHE_NAME).then((cache) => Promise.allSettled(
    urls.map(async (url) => {
      const request = new Request(new URL(url, self.registration.scope).href);
      if (await cache.match(request)) return;
      await cache.add(request);
    }),
  ));
  event.waitUntil(work.then((results) => {
    const ok = results.every((result) => result.status === 'fulfilled');
    event.ports?.[0]?.postMessage({ ok });
  }));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isMusic = url.origin === self.location.origin && url.pathname.includes('/music/') && url.pathname.endsWith('.mp3');

  // موسیقی cache-first است تا پخش آفلاین به شبکه یا fallback صفحهٔ HTML وابسته نباشد.
  if (isMusic) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)));
        }
        return res;
      })),
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)));
        }
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req);
        if (hit) return hit;
        if (req.mode === 'navigate') return (await caches.match('./index.html')) || (await caches.match('./'));
        return Response.error();
      }),
  );
});
