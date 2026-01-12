const CACHE_NAME = 'filehub-v2';

// Assets to cache immediately on installation
const PRE_CACHE_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
  'https://cdn-icons-png.flaticon.com/512/3135/3135706.png'
];

// ESM libraries from esm.sh to cache as they are requested
const LIBRARY_HOSTS = ['esm.sh', 'cdn.tailwindcss.com', 'fonts.gstatic.com', 'fonts.googleapis.com'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(PRE_CACHE_RESOURCES);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Strategy for Gemini API: Network only (cannot work offline)
  if (url.hostname.includes('generativelanguage.googleapis.com')) {
    return;
  }

  // Strategy: Cache-First for Libraries and Fonts (High Performance)
  if (LIBRARY_HOSTS.some(host => url.hostname.includes(host))) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then(networkResponse => {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        });
      })
    );
    return;
  }

  // Strategy: Stale-While-Revalidate for everything else (UI scripts, styles)
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        // Only cache valid responses
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback if network fails and no cache exists
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});