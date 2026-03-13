/**
 * FileHub Notification Service
 * Handles: push notifications, budget alerts, shift reminders, pomodoro
 */

export interface BudgetAlert {
  id: string;
  category: string;
  limit: number;
  period: 'monthly' | 'weekly';
  notify: boolean;
}

// ── PERMISSION ──────────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

// ── SHOW LOCAL NOTIFICATION ─────────────────────────────────────
export async function showLocalNotification(title: string, body: string, options: {
  tag?: string;
  url?: string;
  requireInteraction?: boolean;
  badge?: string;
} = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg) {
      await reg.showNotification(title, {
        body,
        icon: 'https://img.icons8.com/ios-filled/192/4f46e5/lightning-bolt.png',
        badge: options.badge || 'https://img.icons8.com/ios-filled/96/4f46e5/lightning-bolt.png',
        tag: options.tag || 'filehub',
        requireInteraction: options.requireInteraction || false,
        data: options.url ? { url: options.url } : undefined,
      } as NotificationOptions);
      return true;
    }
    // Fallback: direct Notification API
    new Notification(title, { body, icon: 'https://img.icons8.com/ios-filled/192/4f46e5/lightning-bolt.png', tag: options.tag });
    return true;
  } catch (e) {
    console.warn('Notification error:', e);
    return false;
  }
}

// ── BUDGET ALERTS ───────────────────────────────────────────────
export function checkBudgetAlerts(
  expenses: any[],
  alerts: BudgetAlert[],
  onAlert: (alert: BudgetAlert, spent: number) => void
) {
  const now = new Date();
  for (const alert of alerts) {
    if (!alert.notify) continue;
    const filtered = expenses.filter(e => {
      const d = new Date(e.date);
      const sameCategory = e.category === alert.category;
      if (alert.period === 'monthly') {
        return sameCategory && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      } else {
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        return sameCategory && d >= weekAgo;
      }
    });
    const total = filtered.reduce((s: number, e: any) => s + Math.abs(e.amount), 0);
    if (total >= alert.limit * 0.9) {
      onAlert(alert, total);
    }
  }
}

// ── STORE DATA FOR SW BACKGROUND SYNC ───────────────────────────
export async function storeSWData(key: string, data: any) {
  try {
    const cache = await caches.open('filehub-data');
    await cache.put(key, new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } }));
  } catch {}
}

// ── SHIFT REMINDERS (schedule daily check) ─────────────────────
let shiftReminderInterval: any = null;

export function startShiftReminderChecker(events: any[]) {
  if (shiftReminderInterval) clearInterval(shiftReminderInterval);

  const check = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tStr = tomorrow.toISOString().split('T')[0];
    const shift = events.find(e => e.start.startsWith(tStr) && e.title.toLowerCase().includes('guardia'));
    if (shift && Notification.permission === 'granted') {
      showLocalNotification(
        '🛡️ Guardia mañana',
        `Tienes guardia el ${tStr}. Turno de 24h. Prepara todo con tiempo.`,
        { tag: 'shift-reminder', requireInteraction: true }
      );
    }
  };

  // Check at 9pm every day
  const scheduleFor9pm = () => {
    const now = new Date();
    const next9pm = new Date(now);
    next9pm.setHours(21, 0, 0, 0);
    if (next9pm <= now) next9pm.setDate(next9pm.getDate() + 1);
    const ms = next9pm.getTime() - now.getTime();
    return setTimeout(() => {
      check();
      shiftReminderInterval = setInterval(check, 24 * 60 * 60 * 1000);
    }, ms);
  };

  shiftReminderInterval = scheduleFor9pm();
  return () => clearInterval(shiftReminderInterval);
}

export function stopShiftReminderChecker() {
  if (shiftReminderInterval) clearInterval(shiftReminderInterval);
}

// ── GUARDIA iCAL EXPORT ─────────────────────────────────────────
export function exportShiftsToICal(events: any[]) {
  const shiftKeywords = ['guardia', 'mañana', 'tarde', 'noche', 'inferior', 'libre'];
  const shiftEvents = events.filter(e =>
    e.type === 'work' || shiftKeywords.some(k => e.title.toLowerCase().includes(k))
  );

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FileHub//Carlos Turnos//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:FileHub - Guardias',
    'X-WR-TIMEZONE:Europe/Madrid',
  ];

  for (const ev of shiftEvents) {
    const startDate = ev.start.replace(/-/g, '');
    const endDate = ev.end ? ev.end.replace(/-/g, '') : startDate;
    const isGuardia = ev.title.toLowerCase().includes('guardia');
    lines.push(
      'BEGIN:VEVENT',
      `UID:filehub-${ev.id}@filehub-ia`,
      `DTSTART;VALUE=DATE:${startDate}`,
      `DTEND;VALUE=DATE:${endDate}`,
      `SUMMARY:🛡️ ${ev.title}`,
      isGuardia ? 'DESCRIPTION:Guardia de 24h. Mañana siguiente bloqueada para recuperación.' : `DESCRIPTION:Turno: ${ev.title}`,
      `STATUS:CONFIRMED`,
      `TRANSP:OPAQUE`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'filehub-guardias.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
