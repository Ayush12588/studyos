const CACHE_NAME = 'studyos-v4'; // bumped to purge old caches

// Only cache truly immutable external assets — things with no cache-busting
// that we want available offline. Our own JS/CSS/HTML are handled by the
// browser's HTTP cache (Cache-Control: immutable in vercel.json) which is
// faster than SW interception for network-first assets.
const PRECACHE_URLS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap',
  'https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2JL7.woff2',
  'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4xD-IQ.woff2',
];

// ── Install: pre-cache fonts only ────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache =>
        Promise.allSettled(
          PRECACHE_URLS.map(url =>
            cache.add(url).catch(err => console.warn('[SW] Failed to cache:', url, err))
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

// ── Activate: purge old caches ────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            })
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. Always bypass SW for: non-GET, Supabase API, own API routes.
  //    Let the browser handle these directly — no caching ever.
  if (
    event.request.method !== 'GET' ||
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/')
  ) {
    return; // don't call event.respondWith — browser handles it natively
  }

  // 2. Own app files (JS, CSS, HTML, images, manifest): network-first,
  //    NO SW cache write. The browser's HTTP cache (Cache-Control: immutable
  //    from vercel.json) handles this more efficiently than SW interception.
  //    SW only provides the offline fallback.
  if (url.hostname === self.location.hostname) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then(cached => {
          if (cached) return cached;
          // For navigation requests, fall back to cached index.html
          if (event.request.mode === 'navigate') return caches.match('/');
        })
      )
    );
    return;
  }

  // 3. External assets (fonts, CDN): cache-first.
  //    These are truly immutable — font files never change at a given URL.
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Only cache successful, non-opaque responses
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // External asset unavailable offline — just fail gracefully
        return new Response('', { status: 503 });
      });
    })
  );
});