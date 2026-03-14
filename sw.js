// TOP 10 Party Hra — Service Worker
const CACHE_NAME = 'top10-v1';

// Files to cache for offline use
const PRECACHE = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// Google Fonts — cache if available, fallback gracefully
const FONT_CACHE = 'top10-fonts-v1';

// ── Install ──────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== FONT_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Google Fonts — cache-first with network fallback
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request)
            .then(response => {
              if (response.ok) cache.put(event.request, response.clone());
              return response;
            })
            .catch(() => cached || new Response('', { status: 408 }));
        })
      )
    );
    return;
  }

  // Anthropic API — always network, never cache
  if (url.hostname === 'api.anthropic.com') {
    event.respondWith(fetch(event.request));
    return;
  }

  // App shell & assets — cache-first, network fallback, cache update
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request)
        .then(response => {
          if (response.ok && event.request.method === 'GET') {
            caches.open(CACHE_NAME).then(cache =>
              cache.put(event.request, response.clone())
            );
          }
          return response;
        })
        .catch(() => null);

      return cached || networkFetch || new Response(
        '<!DOCTYPE html><html><body><h1>Offline</h1><p>Připoj se k internetu a reload.</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    })
  );
});
