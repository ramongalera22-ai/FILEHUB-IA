const CACHE_NAME = 'filehub-v3';

// ── PUSH NOTIFICATIONS ──────────────────────────────────────────
self.addEventListener('push', event => {
  let data = { title: '📲 FileHub', body: 'Tienes una notificación nueva' };
  try { if (event.data) Object.assign(data, event.data.json()); } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'https://img.icons8.com/ios-filled/192/4f46e5/lightning-bolt.png',
      badge: 'https://img.icons8.com/ios-filled/96/4f46e5/lightning-bolt.png',
      tag: data.tag || 'filehub',
      data: data.url ? { url: data.url } : undefined,
      vibrate: [200, 100, 200],
      requireInteraction: data.requireInteraction || false,
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if ('focus' in client) { client.postMessage({ type: 'notification_click', url }); return client.focus(); }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── BACKGROUND SYNC ─────────────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'check-budget-alerts') event.waitUntil(checkBudgetAlerts());
  if (event.tag === 'check-shift-reminders') event.waitUntil(checkShiftReminders());
});

async function checkBudgetAlerts() {
  try {
    const cache = await caches.open('filehub-data');
    const r = await cache.match('budget-alerts-data');
    if (!r) return;
    const { alerts, expenses } = await r.json();
    const now = new Date();
    for (const alert of (alerts || [])) {
      const total = (expenses || [])
        .filter(e => { const d = new Date(e.date); return e.category === alert.category && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
        .reduce((s, e) => s + Math.abs(e.amount), 0);
      if (total >= alert.limit * 0.9) {
        await self.registration.showNotification('⚠️ Alerta de presupuesto FileHub', {
          body: `${alert.category}: ${total.toFixed(0)}€ de ${alert.limit}€ (${Math.round(total/alert.limit*100)}% usado)`,
          tag: `budget-${alert.category}`,
          icon: 'https://img.icons8.com/ios-filled/192/4f46e5/lightning-bolt.png',
        });
      }
    }
  } catch {}
}

async function checkShiftReminders() {
  try {
    const cache = await caches.open('filehub-data');
    const r = await cache.match('shifts-data');
    if (!r) return;
    const { events } = await r.json();
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const tStr = tomorrow.toISOString().split('T')[0];
    const shift = (events || []).find(e => e.start.startsWith(tStr) && e.title.toLowerCase().includes('guardia'));
    if (shift) {
      await self.registration.showNotification('🛡️ Guardia mañana — FileHub', {
        body: `Tienes guardia el ${tStr}. Turno de 24h. Prepara todo con tiempo.`,
        tag: 'shift-reminder', requireInteraction: true,
        icon: 'https://img.icons8.com/ios-filled/192/4f46e5/lightning-bolt.png',
      });
    }
  } catch {}
}

// ── CACHE ────────────────────────────────────────────────────────
const PRE_CACHE_RESOURCES = ['/', '/index.html', '/manifest.json'];
const LIBRARY_HOSTS = ['esm.sh', 'cdn.tailwindcss.com', 'fonts.gstatic.com', 'fonts.googleapis.com'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRE_CACHE_RESOURCES)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(names.map(n => n !== CACHE_NAME && caches.delete(n))))
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.hostname.includes('generativelanguage.googleapis.com')) return;
  if (LIBRARY_HOSTS.some(h => url.hostname.includes(h))) {
    event.respondWith(
      caches.match(event.request).then(c => c || fetch(event.request).then(r => {
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, r.clone()));
        return r;
      }))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => {
      const net = fetch(event.request).then(r => {
        if (r && r.status === 200) caches.open(CACHE_NAME).then(c => c.put(event.request, r.clone()));
        return r;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
