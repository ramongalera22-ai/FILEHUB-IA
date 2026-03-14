/**
 * FileHub – Google Calendar Sync Service
 * Parsea ICS directamente sin IA (rápido, gratis, sin tokens)
 * Filtra "Guardia Montse" y eventos irrelevantes
 */

import { CalendarEvent } from '../types';

// ─── CALENDARIOS DE CARLOS ───────────────────────────────────────
export const CARLOS_CALENDARS = [
  {
    id: 'carlos-main',
    name: 'Carlos Galera',
    email: 'carlosgalera2roman@gmail.com',
    color: '#4f46e5',
    icalUrl: 'https://calendar.google.com/calendar/ical/carlosgalera2roman%40gmail.com/public/basic.ics',
    embedUrl: 'https://calendar.google.com/calendar/embed?src=carlosgalera2roman%40gmail.com&ctz=Europe%2FMadrid',
    active: true,
  },
  {
    id: 'ramon-galera',
    name: 'Ramon Galera',
    email: 'ramongalera22@gmail.com',
    color: '#10b981',
    icalUrl: 'https://calendar.google.com/calendar/ical/ramongalera22%40gmail.com/public/basic.ics',
    embedUrl: 'https://calendar.google.com/calendar/embed?src=ramongalera22%40gmail.com&ctz=Europe%2FMadrid',
    active: true,
  },
];

// ─── FILTERS ─────────────────────────────────────────────────────
const IGNORE_KEYWORDS = [
  'guardia montse',
  'montse guardia',
  'guardia de montse',
];

const SHIFT_KEYWORDS = ['guardia', 'inferior', 'turno', 'mañana trabajo', 'tarde trabajo', 'noche trabajo'];

function shouldIgnoreEvent(title: string): boolean {
  const lower = title.toLowerCase().trim();
  return IGNORE_KEYWORDS.some(k => lower.includes(k));
}

function classifyEvent(title: string): CalendarEvent['type'] {
  const lower = title.toLowerCase();
  if (SHIFT_KEYWORDS.some(k => lower.includes(k))) return 'work';
  if (['cumpleaños', 'birthday', 'aniversario', 'boda', 'fiesta'].some(k => lower.includes(k))) return 'personal';
  if (['gym', 'entrena', 'correr', 'deporte', 'fitness', 'pádel', 'padel'].some(k => lower.includes(k))) return 'fitness';
  if (['vuelo', 'viaje', 'hotel', 'vacaciones', 'trip'].some(k => lower.includes(k))) return 'trip';
  if (['pago', 'factura', 'recibo', 'hipoteca', 'alquiler'].some(k => lower.includes(k))) return 'expense';
  return 'personal';
}

// ─── ICS DATE PARSER ─────────────────────────────────────────────
function parseICSDate(val: string): string {
  // All-day: 20260315 → 2026-03-15
  if (/^\d{8}$/.test(val)) {
    return `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}`;
  }
  // DateTime: 20260315T093000Z or 20260315T093000
  if (/^\d{8}T\d{6}/.test(val)) {
    const y = val.slice(0,4), mo = val.slice(4,6), d = val.slice(6,8);
    const h = val.slice(9,11), mi = val.slice(11,13), s = val.slice(13,15);
    return `${y}-${mo}-${d}T${h}:${mi}:${s}${val.endsWith('Z') ? 'Z' : ''}`;
  }
  return val;
}

function unescapeICS(s: string): string {
  return s.replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

// ─── NATIVE ICS PARSER ───────────────────────────────────────────
export function parseICS(icsText: string, sourceId: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  // Unfold lines (RFC 5545: lines starting with space/tab are continuations)
  const unfolded = icsText.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);

  let inEvent = false;
  let current: Record<string, string> = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      inEvent = false;
      const ev = buildEvent(current, sourceId);
      if (ev) events.push(ev);
      continue;
    }
    if (!inEvent) continue;

    // Parse property: KEY;PARAMS:VALUE
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const keyFull = line.slice(0, colonIdx);
    const value = line.slice(colonIdx + 1);
    // Strip params from key (e.g. DTSTART;TZID=... → DTSTART)
    const key = keyFull.split(';')[0].toUpperCase();
    current[key] = unescapeICS(value);
  }

  return events;
}

function buildEvent(raw: Record<string, string>, sourceId: string): CalendarEvent | null {
  const title = raw['SUMMARY'] || '';
  if (!title) return null;

  // Filter out Guardia Montse and similar
  if (shouldIgnoreEvent(title)) return null;

  // Skip cancelled events
  if (raw['STATUS'] === 'CANCELLED') return null;

  const uid = raw['UID'] || `${sourceId}_${Date.now()}_${Math.random()}`;
  const id = `gcal_${uid.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}`;

  const start = parseICSDate(raw['DTSTART'] || raw['DTSTART;VALUE=DATE'] || '');
  const end = parseICSDate(raw['DTEND'] || raw['DTEND;VALUE=DATE'] || start);

  if (!start) return null;

  return {
    id,
    title: title.trim(),
    start,
    end,
    type: classifyEvent(title),
    source: 'google',
  };
}

// ─── CORS PROXIES (fallback chain) ───────────────────────────────
const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://cors-anywhere.herokuapp.com/${url}`,
];

async function fetchWithProxy(icalUrl: string): Promise<string> {
  let lastError: Error | null = null;
  for (const proxyFn of CORS_PROXIES) {
    try {
      const proxyUrl = proxyFn(icalUrl);
      const resp = await fetch(proxyUrl, {
        headers: { 'Accept': 'text/calendar, text/plain, */*' },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();
      if (text.includes('BEGIN:VCALENDAR')) return text;
      throw new Error('Not a valid ICS response');
    } catch (e) {
      lastError = e as Error;
      continue;
    }
  }
  throw lastError || new Error('All proxies failed');
}

// ─── MAIN SYNC FUNCTION ──────────────────────────────────────────
export interface SyncResult {
  calendarId: string;
  calendarName: string;
  events: CalendarEvent[];
  newCount: number;
  error?: string;
}

export async function syncGoogleCalendar(
  calendarId: string,
  icalUrl: string,
  calendarName: string,
  existingEvents: CalendarEvent[]
): Promise<SyncResult> {
  try {
    const icsText = await fetchWithProxy(icalUrl);
    const parsed = parseICS(icsText, calendarId);

    const existingIds = new Set(existingEvents.map(e => e.id));
    const newEvents = parsed.filter(e => !existingIds.has(e.id));

    return { calendarId, calendarName, events: parsed, newCount: newEvents.length };
  } catch (err: any) {
    return { calendarId, calendarName, events: [], newCount: 0, error: err.message };
  }
}

export async function syncAllCarlosCalendars(
  existingEvents: CalendarEvent[]
): Promise<{ allEvents: CalendarEvent[]; results: SyncResult[] }> {
  const results = await Promise.all(
    CARLOS_CALENDARS.filter(c => c.active).map(c =>
      syncGoogleCalendar(c.id, c.icalUrl, c.name, existingEvents)
    )
  );

  // Merge all parsed events, deduplicate by id
  const allParsed = results.flatMap(r => r.events);
  const seen = new Set<string>();
  const deduped = allParsed.filter(e => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  // Keep existing manual events (not from google source), merge with synced
  const manualEvents = existingEvents.filter(e => e.source !== 'google');
  const merged = [...manualEvents];
  for (const ev of deduped) {
    if (!merged.find(e => e.id === ev.id)) merged.push(ev);
  }

  return { allEvents: merged, results };
}
