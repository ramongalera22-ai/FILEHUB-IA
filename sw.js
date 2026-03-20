/**
 * FileHub Service Worker v4
 * - Cache-first para assets estáticos (app funciona offline)
 * - Network-first para API calls (con fallback a caché)
 * - Background sync para sincronizar cuando vuelva conexión
 * - Push notifications para guardias y presupuesto
 */

const CACHE_VERSION = 'filehub-v11-1773969044';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const OFFLINE_PAGE = '/FILEHUB-IA/index.html';

// Assets siempre en caché (shell de la app)
const PRECACHE_URLS = [
  '/FILEHUB-IA/',
  '/FILEHUB-IA/index.html',
  '/FILEHUB-IA/404.html',
  '/FILEHUB-IA/manifest.json',
  '/FILEHUB-IA/sw.js',
];

// Dominios externos que cacheamos si están disponibles
const CACHEABLE_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.tailwindcss.com',
  'img.icons8.com',
];

// APIs que NO cacheamos nunca (siempre live o fallo silencioso)
const NO_CACHE_PATTERNS = [
  'api.anthropic.com',
  'api.moonshot.cn',
  'supabase.co',
  'railway.app',
  'wttr.in',
  'api.qrserver.com',
  'corsproxy.io',
  'allorigins.win',
];

// ── INSTALL ──────────────────────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      console.log('[SW] Precaching app shell...');
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.warn('[SW] Some precache failed (ok for first load):', err.message);
      });
    })
  );
});

// ── ACTIVATE ─────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      console.log('[SW] Active caches:', keys);
      return Promise.all(
        keys
          .filter(k => !k.startsWith(CACHE_VERSION) && k !== 'filehub-data')
          .map(k => {
            console.log('[SW] Deleting stale cache:', k);
            return caches.delete(k);
          })
      );
    }).then(() => {
      console.log('[SW] Claiming all clients...');
      return self.clients.claim();
    }).then(() => {
      // Tell all clients to reload so they get fresh content
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
      });
    })
  );
});

// ── FETCH ─────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET
  if (req.method !== 'GET') return;

  // Skip API/external services — always network, never cache
  if (NO_CACHE_PATTERNS.some(p => url.hostname.includes(p))) return;

  // Skip chrome-extension, etc
  if (!url.protocol.startsWith('http')) return;

  // Main JS/CSS bundle — Cache First (these are hashed, change = new filename)
  if (url.pathname.includes('/assets/') && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Fonts, icons — Cache First
  if (CACHEABLE_HOSTS.some(h => url.hostname.includes(h))) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // App shell (HTML) — Network First with offline fallback
  if (req.headers.get('accept')?.includes('text/html') ||
      url.pathname.startsWith('/FILEHUB-IA/') ||
      url.pathname === '/FILEHUB-IA') {
    event.respondWith(networkFirstWithOfflineFallback(req));
    return;
  }

  // Everything else — Stale While Revalidate
  event.respondWith(staleWhileRevalidate(req));
});

// ── STRATEGIES ───────────────────────────────────────────────────
async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    if (fresh.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch {
    return cached || new Response('Offline — recurso no disponible', { status: 503 });
  }
}

async function networkFirstWithOfflineFallback(req) {
  try {
    const fresh = await fetch(req, { signal: AbortSignal.timeout(5000) });
    if (fresh.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch {
    const cached = await caches.match(req) || await caches.match(OFFLINE_PAGE) || await caches.match('/FILEHUB-IA/index.html');
    return cached || new Response('<h1>FileHub — Sin conexión</h1><p>La app se cargará cuando vuelva la conexión.</p>', {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then(fresh => {
    if (fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  }).catch(() => cached);
  return cached || fetchPromise;
}

// ── PUSH NOTIFICATIONS ────────────────────────────────────────────
self.addEventListener('push', event => {
  let data = { title: '📲 FileHub', body: 'Tienes una notificación' };
  try { if (event.data) Object.assign(data, event.data.json()); } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'https://img.icons8.com/ios-filled/192/4f46e5/lightning-bolt.png',
      tag: data.tag || 'filehub',
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/FILEHUB-IA/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── BACKGROUND SYNC ───────────────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'check-shift-reminders') event.waitUntil(checkShiftReminders());
  if (event.tag === 'check-budget-alerts') event.waitUntil(checkBudgetAlerts());
});

async function checkShiftReminders() {
  try {
    const cache = await caches.open('filehub-data');
    const r = await cache.match('shifts-data');
    if (!r) return;
    const { events } = await r.json();
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const tStr = tomorrow.toISOString().split('T')[0];
    const shift = (events || []).find(e => e.start?.startsWith(tStr) && e.title?.toLowerCase().includes('guardia'));
    if (shift) {
      await self.registration.showNotification('🛡️ Guardia mañana — FileHub', {
        body: `Tienes guardia el ${tStr}. Turno de 24h. Prepara todo con tiempo.`,
        tag: 'shift-reminder',
        icon: 'https://img.icons8.com/ios-filled/192/4f46e5/lightning-bolt.png',
      });
    }
  } catch {}
}

async function checkBudgetAlerts() {
  try {
    const cache = await caches.open('filehub-data');
    const r = await cache.match('budget-alerts-data');
    if (!r) return;
    const { alerts, expenses } = await r.json();
    const now = new Date();
    for (const alert of (alerts || [])) {
      if (!alert.notify) continue;
      const total = (expenses || [])
        .filter(e => {
          const d = new Date(e.date);
          return e.category === alert.category && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((s, e) => s + Math.abs(e.amount || 0), 0);
      if (total >= alert.limit * 0.9) {
        await self.registration.showNotification('⚠️ Alerta presupuesto — FileHub', {
          body: `${alert.category}: ${total.toFixed(0)}€ de ${alert.limit}€ (${Math.round(total / alert.limit * 100)}%)`,
          tag: `budget-${alert.category}`,
          icon: 'https://img.icons8.com/ios-filled/192/4f46e5/lightning-bolt.png',
        });
      }
    }
  } catch {}
}

// ── MESSAGES FROM APP ─────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CACHE_DATA') {
    caches.open('filehub-data').then(cache => {
      cache.put(event.data.key, new Response(JSON.stringify(event.data.value), {
        headers: { 'Content-Type': 'application/json' }
      }));
    });
  }
});
