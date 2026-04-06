/**
 * FileHub Service Worker v28
 * Network-first for HTML (always fresh in PWA)
 * Cache-first for hashed assets only
 */

const CACHE_VERSION = 'filehub-v28';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const OFFLINE_PAGE = '/FILEHUB-IA/index.html';

const PRECACHE_URLS = ['/FILEHUB-IA/', '/FILEHUB-IA/index.html', '/FILEHUB-IA/manifest.json'];

const NO_CACHE = [
  'supabase.co','api.anthropic.com','api.deepseek.com','api.groq.com',
  'openrouter.ai','railway.app','corsproxy.io','allorigins.win',
  'api.moonshot.cn','wttr.in','calendar.google.com',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(c => c.addAll(PRECACHE_URLS).catch(() => {}))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => !k.startsWith(CACHE_VERSION)).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || !url.protocol.startsWith('http')) return;
  if (NO_CACHE.some(p => url.hostname.includes(p))) return;

  // Hashed bundles → cache first
  if (url.pathname.includes('/assets/') && /\.(js|css)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(c => c || fetch(req).then(r => {
        if (r.ok) { const cl = r.clone(); caches.open(STATIC_CACHE).then(ca => ca.put(req, cl)); }
        return r;
      })).catch(() => caches.match(OFFLINE_PAGE))
    );
    return;
  }

  // All other (HTML, nav) → network first
  event.respondWith(
    fetch(req).then(r => {
      if (r.ok) { const cl = r.clone(); caches.open(STATIC_CACHE).then(ca => ca.put(req, cl)); }
      return r;
    }).catch(() => caches.match(req).then(c => c || caches.match(OFFLINE_PAGE)))
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
