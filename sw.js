const CACHE_NAME = 'boardos-v10'; // bumped: fixed Supabase/API requests being re-piped through fetch(event.request), which could break CORS Origin negotiation

const EXTERNAL_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap',
];

// App files — always fetched from network, never served stale from cache
// NOTE: both extension-less and .html variants are listed because Vercel's
// cleanUrls rewrites /app.html -> /app at the routing layer, but a stale
// service worker, a cached link, or a hardcoded .html reference could still
// request the .html path during the transition. Keep both until every
// internal reference has been migrated off .html.
const NETWORK_FIRST = ['/', '/index', '/index.html', '/app', '/app.html', '/db.js', '/migrate.js', '/sw.js', '/manifest.json'];

// ── Install: cache only external assets ──────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(
        EXTERNAL_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Failed to cache:', url, err))
        )
      )
    ).then(() => self.skipWaiting())
  );
});

// ── Activate: purge old caches ────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => { console.log('[SW] Deleting old cache:', key); return caches.delete(key); })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignore third-party tracking/analytics entirely — let the browser handle
  // these directly against the page's CSP. The SW has no business caching
  // or re-fetching tracking scripts.
  const THIRD_PARTY_IGNORE = ['clarity.ms', 'umami.is'];
  if (THIRD_PARTY_IGNORE.some(host => url.hostname.includes(host))) {
    return; // not calling event.respondWith() lets the browser handle it natively
  }

  // Supabase and API routes: let the browser handle these entirely
  // untouched — do NOT re-pipe through fetch(event.request). Passing the
  // original Request object back through fetch() inside a Service Worker
  // can alter how the browser negotiates the Origin header on cross-origin
  // requests, which is what caused Supabase's CORS check to fail here even
  // though the same request works fine outside SW interception. Matches
  // the THIRD_PARTY_IGNORE pattern above: no respondWith() call at all.
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co')
  ) {
    return;
  }

  // Non-GET requests to our own origin (not covered by the case above):
  // still explicitly pass through via respondWith, since some browsers
  // won't correctly fall back to network-handling for a fetch event with
  // no respondWith() call at all on same-origin non-GET requests.
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-first: own app files — always get fresh code
  const isAppFile = NETWORK_FIRST.some(p => url.pathname === p || url.pathname.endsWith(p));
  if (isAppFile) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          // Update cache with fresh version
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback: serve cached version if available
          return caches.match(event.request).then(cached => {
            if (cached) return cached;
            if (event.request.mode === 'navigate') return caches.match('/');
          });
        })
    );
    return;
  }

  // Cache-first: external fonts and libraries (these never change)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});