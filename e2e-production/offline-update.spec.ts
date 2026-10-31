import { expect, test } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const CURRENT_CACHE = 'mazrae-rangi-offline-v19';
const OLD_CACHE = 'mazrae-rangi-offline-v18-update-test';
const OLD_SW = `
const CACHE_NAME = '${OLD_CACHE}';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(['./', './index.html'])));
});
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then(hit => {
    if (hit) return hit;
    if (event.request.mode === 'navigate') return caches.match('./index.html');
    return Response.error();
  })));
});
`;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg',
};

async function serveDist(server: Server, mode: () => 'old' | 'new') {
  const root = join(process.cwd(), 'dist');
  server.on('request', async (req, res) => {
    try {
      const pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname;
      if (pathname === '/sw.js') {
        const body = mode() === 'old' ? OLD_SW : await readFile(join(root, 'sw.js'), 'utf8');
        res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-cache', 'vary': 'Origin' });
        res.end(body);
        return;
      }
      const safe = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '');
      let file = join(root, safe || 'index.html');
      let body: Buffer;
      try { body = await readFile(file); }
      catch { file = join(root, 'index.html'); body = await readFile(file); }
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'vary': 'Origin' });
      res.end(body);
    } catch (error) {
      res.writeHead(500); res.end(String(error));
    }
  });
}

test('service-worker update waits for old clients and is offline-complete after activation', async ({ context }) => {
  let mode: 'old' | 'new' = 'old';
  const server = createServer();
  await serveDist(server, () => mode);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test-server port');
  const origin = `http://127.0.0.1:${address.port}`;
  const failures: string[] = [];
  try {
    const page = await context.newPage();
    page.on('requestfailed', request => failures.push(request.url()));
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.evaluate(async cache => {
      const registration = await navigator.serviceWorker.ready;
      if (!registration.active) throw new Error('Old worker did not activate');
      const names = await caches.keys();
      if (!names.includes(cache)) throw new Error('Old cache was not installed');
    }, OLD_CACHE);

    // The old worker must control a client; otherwise the new worker activates
    // immediately and this test would not exercise the waiting/update path.
    await page.reload({ waitUntil: 'networkidle' });
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    mode = 'new';
    await page.evaluate(async currentCache => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) throw new Error('Registration disappeared');
      await registration.update();
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        if (registration.waiting && (await caches.keys()).includes(currentCache)) return;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error('Updated worker did not reach waiting with its complete cache');
    }, CURRENT_CACHE);
    expect(await page.evaluate(async cache => (await caches.keys()).includes(cache), OLD_CACHE)).toBe(true);

    await page.close();
    const updated = await context.newPage();
    updated.on('requestfailed', request => failures.push(request.url()));
    await updated.goto(origin, { waitUntil: 'networkidle' });
    await updated.evaluate(async currentCache => {
      await navigator.serviceWorker.ready;
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        const names = await caches.keys();
        const registration = await navigator.serviceWorker.getRegistration();
        if (names.includes(currentCache) && !names.some(name => name.includes('update-test')) && registration?.active && !registration.waiting) return;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error('New worker did not activate and retire the old cache');
    }, CURRENT_CACHE);

    await context.setOffline(true);
    await updated.reload({ waitUntil: 'domcontentloaded' });
    await expect(updated.getByRole('button', { name: 'شروع', exact: true })).toBeVisible();
    expect(failures.filter(url => /\/assets\/.*\.(?:js|css)$/.test(url))).toEqual([]);
  } finally {
    await context.setOffline(false);
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
