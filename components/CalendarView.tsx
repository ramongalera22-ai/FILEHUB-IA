
import { callAI } from '../services/aiProxy';
import { cfg } from '../services/config';
const OPENROUTER_KEY = cfg.openrouterKey();

import React, { useState, useMemo, useRef } from 'react';
import { Expense, Project, CalendarEvent, Task, Goal, CalendarSource } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Briefcase,
  Loader2,
  Clock,
  Zap,
  FileUp,
  List,
  CalendarDays,
  AlertTriangle,
  BrainCircuit,
  MessageSquarePlus,
  Link2,
  Trash2,
  Plus,
  X,
  LayoutGrid
} from 'lucide-react';
import { analyzeCalendarIntelligence, extractEventsFromICS } from '../services/openrouterService';

const ICAL_URL = 'https://calendar.google.com/calendar/ical/carlosgalera2roman%40gmail.com/public/basic.ics';

async function analyzeCalendarAI(events: string): Promise<string> {
  if (!OPENROUTER_KEY) return 'Configura tu API key de OpenRouter.';
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'HTTP-Referer': 'https://ramongalera22-ai.github.io/FILEHUB-IA' },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4.5', max_tokens: 800,
        messages: [{ role: 'user', content: `Analiza estos eventos de mi calendario de esta semana y dime: 1) Días más cargados, 2) Tiempo libre disponible, 3) Recomendaciones para organizar mejor mi semana, 4) Alertas importantes. Responde de forma concisa en español.\n\nEventos:\n${events}` }]
      })
    });
    const d = await res.json();
    return d.choices?.[0]?.message?.content || 'Error analizando calendario.';
  } catch { return 'Error de conexión.'; }
}
import { supabase } from '../services/supabaseClient';
import { syncAllCarlosCalendars, CARLOS_CALENDARS, SyncResult } from '../services/googleCalendarSync';
import { BotPanelCalendario } from './BotPanel';

// ── GOOGLE CALENDAR EVENT CREATION VIA ANTHROPIC MCP ───────────────
async function createGoogleCalendarEvent(
  title: string,
  date: string,
  startTime?: string,
  endTime?: string,
  description?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const timeInfo = startTime && endTime
      ? `from ${startTime} to ${endTime} on ${date}`
      : `all day on ${date}`;
    
    const descPart = description ? ` Description: "${description}".` : '';

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Create a Google Calendar event titled "${title}" ${timeInfo}. Timezone: Europe/Madrid.${descPart} Confirm when done.`
        }],
        mcp_servers: [{
          type: 'url',
          url: 'https://gcal.mcp.claude.com/mcp',
          name: 'google-calendar'
        }]
      })
    });

    const data = await res.json();
    const textBlocks = data.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n') || '';
    const toolResults = data.content?.filter((b: any) => b.type === 'mcp_tool_result') || [];
    
    const hasSuccess = toolResults.length > 0 || textBlocks.toLowerCase().includes('created') || textBlocks.toLowerCase().includes('creado');
    
    return {
      success: hasSuccess,
      message: hasSuccess ? '✅ Evento creado en Google Calendar' : textBlocks || 'No se pudo crear el evento'
    };
  } catch (err: any) {
    console.error('Error creating Google Calendar event:', err);
    return { success: false, message: `❌ Error: ${err.message}` };
  }
}

interface CalendarViewProps {
  expenses: Expense[];
  projects: Project[];
  calendarEvents: CalendarEvent[];
  tasks?: Task[];
  goals?: Goal[];
  onAddEvent: (event: CalendarEvent) => void;
  onUpdateAllEvents?: (events: CalendarEvent[]) => void;
  onDeleteEvent?: (id: string) => void;
}

type SubView = 'month' | 'week' | 'daily' | 'quick' | 'sources' | 'google-view';

// ── EMBEDDED GOOGLE CALENDAR VIEW (two calendars with tab switcher) ──────────
const GCAL_EMBEDS = [
  {
    id: 'carlos',
    name: 'Carlos Galera',
    email: 'carlosgalera2roman@gmail.com',
    color: '#4f46e5',
    src: 'https://calendar.google.com/calendar/embed?src=carlosgalera2roman%40gmail.com&ctz=Europe%2FMadrid&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&mode=MONTH',
  },
  {
    id: 'ramon',
    name: 'Ramon Galera',
    email: 'ramongalera22@gmail.com',
    color: '#10b981',
    src: 'https://calendar.google.com/calendar/embed?src=ramongalera22%40gmail.com&ctz=Europe%2FMadrid&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&mode=MONTH',
  },
  {
    id: 'both',
    name: 'Ambos calendarios',
    email: '',
    color: '#f59e0b',
    // Google supports multiple src params for combined view
    src: 'https://calendar.google.com/calendar/embed?src=carlosgalera2roman%40gmail.com&src=ramongalera22%40gmail.com&ctz=Europe%2FMadrid&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=1&mode=MONTH',
  },
];

function GoogleCalendarEmbedView() {
  const [active, setActive] = React.useState('both');
  const cal = GCAL_EMBEDS.find(c => c.id === active) || GCAL_EMBEDS[2];

  return (
    <div className="animate-in zoom-in-95 space-y-3 p-4">

      <div className="px-4 pb-2 pt-4"><BotPanelCalendario /></div>
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          📅 Google Calendar — Vista directa
        </p>
        <a
          href={`https://calendar.google.com/calendar/r?cid=${cal.email}`}
          target="_blank" rel="noopener noreferrer"
          className="text-xs font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
        >
          Abrir en Google ↗
        </a>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 flex-wrap">
        {GCAL_EMBEDS.map(c => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all border ${
              active === c.id
                ? 'text-white shadow-md'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
            }`}
            style={active === c.id ? { backgroundColor: c.color, borderColor: c.color } : {}}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: active === c.id ? 'rgba(255,255,255,0.7)' : c.color }} />
            {c.name}
          </button>
        ))}
      </div>

      {/* iFrame embed */}
      <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm bg-white" style={{ height: '620px' }}>
        <iframe
          key={cal.src}
          src={cal.src}
          style={{ border: 0 }}
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          title={`Google Calendar — ${cal.name}`}
        />
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2 pt-1">
        {GCAL_EMBEDS.filter(c => c.id !== 'both').map(c => (
          <a
            key={c.id}
            href={`https://calendar.google.com/calendar/r?cid=${c.email}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-300 transition-all"
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
            {c.email}
          </a>
        ))}
      </div>
    </div>
  );
}

export default function CalendarView({
  expenses = [],
  projects = [],
  calendarEvents = [],
  tasks = [],
  goals = [],
  onAddEvent,
  onDeleteEvent,
  onUpdateAllEvents
}: CalendarViewProps) {
  const [activeSubView, setActiveSubView] = useState<SubView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  // Google Calendar Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(() => {
    const s = localStorage.getItem('filehub_last_gcal_sync');
    return s ? new Date(s) : null;
  });

  // Auto-sync on mount if last sync was > 30 min ago
  React.useEffect(() => {
    const shouldSync = !lastSync || (Date.now() - lastSync.getTime()) > 30 * 60 * 1000;
    if (shouldSync) handleGoogleSync();
  }, []);

  // Sources State
  const [sources, setSources] = useState<CalendarSource[]>([
    { id: 'carlos-main', name: 'Carlos Galera', type: 'google', url: 'https://calendar.google.com/calendar/embed?src=carlosgalera2roman%40gmail.com&ctz=Europe%2FMadrid', color: '#4f46e5', active: true },
    { id: 'ramon-galera', name: 'Ramon Galera', type: 'google', url: 'https://calendar.google.com/calendar/embed?src=ramongalera22%40gmail.com&ctz=Europe%2FMadrid', color: '#10b981', active: true },
  ]);
  const [newSourceUrl, setNewSourceUrl] = useState('');

  // AI Analysis States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Quick Add State
  const [quickEvent, setQuickEvent] = useState({ 
    title: '', 
    date: new Date().toISOString().split('T')[0], 
    type: 'personal' as any,
    startTime: '',
    endTime: '',
    description: '',
    syncToGoogle: true 
  });
  const [isCreatingGCal, setIsCreatingGCal] = useState(false);
  const [gcalFeedback, setGcalFeedback] = useState('');

  // Inline add state for week/month views
  const [inlineAddDate, setInlineAddDate] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const [inlineType, setInlineType] = useState<'personal' | 'work' | 'project' | 'fitness'>('personal');
  const [inlineSyncGoogle, setInlineSyncGoogle] = useState(true);
  const [isInlineCreating, setIsInlineCreating] = useState(false);

  const icsInputRef = useRef<HTMLInputElement>(null);

  // Background Sync for Sources
  React.useEffect(() => {
    const activeSources = sources.filter(s => s.active && s.url && (s.type === 'ical' || s.type === 'google' || s.url.includes('.ics') || s.url.includes('/public/basic')));
    if (activeSources.length > 0) {
      console.log("Sincronizando fuentes externas...");
      activeSources.forEach(src => handleSyncSource(src));
    }
  }, []);

  const handleSyncSource = async (source: CalendarSource) => {
    if (!source.url) return;

    // Convert Google Embed to iCal if detected
    let fetchUrl = source.url;
    if (fetchUrl.includes('calendar.google.com/calendar/embed')) {
      const urlObj = new URL(fetchUrl);
      const src = urlObj.searchParams.get('src');
      if (src) {
        fetchUrl = `https://calendar.google.com/calendar/ical/${src}/public/basic.ics`;
      }
    }

    try {
      // Use corsproxy.io to bypass CORS for public iCals
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(fetchUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const icsData = await response.text();

      const events = await extractEventsFromICS(icsData);

      // Filter out events already present to avoid duplication
      const existingIds = new Set(calendarEvents.map(e => e.id));
      const newEvents = events.filter(e => !existingIds.has(e.id));

      if (newEvents.length > 0) {
        newEvents.forEach(ev => onAddEvent({ ...ev, source: source.type as any }));
      }
      console.log(`Sincronizados ${newEvents.length} eventos nuevos de ${source.name}`);
    } catch (error) {
      console.warn(`No se pudo sincronizar la fuente ${source.name}:`, error);
    }
  };

  const handleGoogleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const { allEvents, results } = await syncAllCarlosCalendars(calendarEvents);
      setSyncResults(results);
      const now = new Date();
      setLastSync(now);
      localStorage.setItem('filehub_last_gcal_sync', now.toISOString());

      // Use onUpdateAllEvents if provided (replaces all google events cleanly)
      if (typeof onUpdateAllEvents === 'function') {
        onUpdateAllEvents(allEvents);
      } else {
        // Fallback: add only new events individually
        const existingIds = new Set(calendarEvents.map(e => e.id));
        allEvents.filter(e => !existingIds.has(e.id)).forEach(ev => onAddEvent(ev));
      }
    } catch (err) {
      console.error('Google Calendar sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const monthName = currentDate.toLocaleString('es-ES', { month: 'long' });
  const year = currentDate.getFullYear();

  const handlePrev = () => {
    if (activeSubView === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    }
  };

  const handleNext = () => {
    if (activeSubView === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    }
  };

  const runAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeCalendarIntelligence(calendarEvents);
      setAnalysisResult(analysis);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleICSImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const content = reader.result as string;
      try {
        const events = await extractEventsFromICS(content);
        events.forEach(ev => onAddEvent(ev));
        alert(`Se han importado ${events.length} eventos del archivo ICS.`);
      } catch (error) {
        console.error("Fallo al importar ICS:", error);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEvent.title) return;
    
    const newEvent: CalendarEvent = {
      id: `quick-${Date.now()}`,
      title: quickEvent.title,
      start: quickEvent.startTime ? `${quickEvent.date}T${quickEvent.startTime}` : quickEvent.date,
      end: quickEvent.endTime ? `${quickEvent.date}T${quickEvent.endTime}` : quickEvent.date,
      type: quickEvent.type,
      source: 'manual'
    };
    
    // Save locally + Supabase
    onAddEvent(newEvent);
    
    // Sync to Google Calendar if enabled
    if (quickEvent.syncToGoogle) {
      setIsCreatingGCal(true);
      setGcalFeedback('⏳ Creando en Google Calendar...');
      const result = await createGoogleCalendarEvent(
        quickEvent.title,
        quickEvent.date,
        quickEvent.startTime || undefined,
        quickEvent.endTime || undefined,
        quickEvent.description || undefined
      );
      setGcalFeedback(result.message);
      setIsCreatingGCal(false);
      // Clear feedback after 4s
      setTimeout(() => setGcalFeedback(''), 4000);
    }
    
    setQuickEvent({ title: '', date: new Date().toISOString().split('T')[0], type: 'personal', startTime: '', endTime: '', description: '', syncToGoogle: true });
  };

  // Inline add handler for week/daily views
  const handleInlineAdd = async (dateStr: string) => {
    if (!inlineTitle.trim()) return;
    
    const newEvent: CalendarEvent = {
      id: `inline-${Date.now()}`,
      title: inlineTitle,
      start: dateStr,
      end: dateStr,
      type: inlineType,
      source: 'manual'
    };
    
    onAddEvent(newEvent);
    
    if (inlineSyncGoogle) {
      setIsInlineCreating(true);
      await createGoogleCalendarEvent(inlineTitle, dateStr);
      setIsInlineCreating(false);
    }
    
    setInlineTitle('');
    setInlineAddDate(null);
  };

  const handleAddSource = () => {
    if (!newSourceUrl) return;
    const isGoogle = newSourceUrl.includes('google.com/calendar');
    const newSrc: CalendarSource = {
      id: `src-${Date.now()}`,
      name: isGoogle ? 'Google Calendar' : 'Nuevo Calendario',
      type: isGoogle ? 'google' : 'ical',
      url: newSourceUrl,
      color: '#10b981',
      active: true
    };
    setSources([...sources, newSrc]);
    setNewSourceUrl('');
    handleSyncSource(newSrc);
  };

  const handleDeleteSource = (id: string) => {
    setSources(sources.filter(s => s.id !== id));
  };

  const eventsForSelectedDay = useMemo(() => {
    return calendarEvents.filter(ev => {
      const d = new Date(ev.start);
      return d.getDate() === selectedDay && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });
  }, [calendarEvents, selectedDay, currentDate]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    calendarEvents.forEach(event => {
      const d = new Date(event.start);
      if (d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear()) {
        const key = `${d.getDate()}`;
        if (!map[key]) map[key] = [];
        map[key].push(event);
      }
    });
    return map;
  }, [calendarEvents, currentDate]);

  // Logic for Weekly View
  const weekDates = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
    startOfWeek.setDate(diff);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  }, [currentDate]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500 pb-16">

      {/* Main Content Column */}
      <div className="lg:col-span-9 space-y-8">
        <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col">

          {/* Internal Header & Navigation */}
          <div className="p-8 pb-0 border-b border-slate-50">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-lg shadow-indigo-200">
                  <CalendarIcon size={24} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Mi Agenda</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Gestión Inteligente de Tiempo</p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Google Calendar Sync */}
                <button
                  onClick={handleGoogleSync}
                  disabled={isSyncing}
                  className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-100 transition-all disabled:opacity-50"
                >
                  {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <span>🔄</span>}
                  Google Calendar
                </button>
                <button
                  onClick={runAIAnalysis}
                  disabled={isAnalyzing}
                  className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-600 transition-all disabled:opacity-50"
                >
                  {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={16} />}
                  Análisis IA
                </button>
              </div>
            </div>

            {/* Sync status */}
            {(syncResults.length > 0 || isSyncing) && (
              <div className="px-8 pb-4 flex flex-wrap gap-2 items-center">
                {isSyncing && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
                    <Loader2 size={11} className="animate-spin" /> Sincronizando...
                  </span>
                )}
                {syncResults.map(r => (
                  <span key={r.calendarId} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border ${r.error ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                    {r.error ? '❌' : '✅'} {r.calendarName}
                    {!r.error && <span className="opacity-70">· {r.events.length} eventos</span>}
                    {r.error && <span className="text-red-400 font-normal text-[10px] ml-1">(privado/sin acceso)</span>}
                  </span>
                ))}
                {lastSync && !isSyncing && (
                  <span className="text-[10px] text-slate-400">🕐 {lastSync.toLocaleTimeString('es-ES', {hour:'2-digit',minute:'2-digit'})}</span>
                )}
              </div>
            )}

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-6 px-8">
              {[
                { id: 'month', label: 'Mes', icon: CalendarIcon },
                { id: 'week', label: 'Semana', icon: LayoutGrid },
                { id: 'google-view', label: 'Google', icon: Link2 },
                { id: 'daily', label: 'Día', icon: List },
                { id: 'quick', label: 'Añadir', icon: MessageSquarePlus },
                { id: 'sources', label: 'Fuentes', icon: Link2 }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubView(tab.id as SubView)}
                  className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubView === tab.id
                    ? 'bg-slate-100 text-indigo-600 border border-indigo-100'
                    : 'text-slate-400 hover:bg-slate-50'
                    }`}
                >
                  <tab.icon size={16} /> {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-8 flex-1 min-h-[600px]">

            {/* MONTH VIEW */}
            {activeSubView === 'month' && (
              <div className="flex flex-col animate-in slide-in-from-bottom-2">
                <div className="flex justify-between items-center mb-10">
                  <h2 className="text-4xl font-black text-slate-800 flex items-center gap-3">
                    <CalendarDays className="text-indigo-600" size={36} />
                    <span className="capitalize">{monthName}</span> <span className="text-slate-300 font-medium">{year}</span>
                  </h2>
                  <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                    <button onClick={handlePrev} className="p-3 hover:bg-white rounded-xl text-slate-400 hover:text-slate-800 transition-all"><ChevronLeft size={20} /></button>
                    <button onClick={handleNext} className="p-3 hover:bg-white rounded-xl text-slate-400 hover:text-slate-800 transition-all"><ChevronRight size={20} /></button>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-[2.5rem] overflow-hidden">
                  {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                    <div key={day} className="bg-slate-50/50 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</div>
                  ))}

                  {Array.from({ length: firstDayOfMonth(currentDate) }).map((_, i) => (
                    <div key={`empty-${i}`} className="bg-slate-50/20" />
                  ))}

                  {Array.from({ length: daysInMonth(currentDate) }).map((_, i) => {
                    const day = i + 1;
                    const dayEvents = eventsByDay[day] || [];
                    const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();
                    const isSelected = day === selectedDay;

                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`bg-white p-3 min-h-[100px] text-left group transition-all hover:bg-slate-50/50 border-b border-r border-slate-50 relative ${isSelected ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-50/10' : ''
                          }`}
                      >
                        <span className={`text-sm font-black ${isToday ? 'bg-indigo-600 text-white w-7 h-7 flex items-center justify-center rounded-xl' : isSelected ? 'text-indigo-600' : 'text-slate-600'
                          }`}>
                          {day}
                        </span>
                        <div className="mt-1.5 space-y-0.5">
                          {dayEvents.slice(0, 2).map((event, idx) => {
                            const isGuardia = event.title.toLowerCase().includes('guardia');
                            return (
                              <div key={idx} className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md truncate ${isGuardia ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' :
                                event.type === 'work' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' :
                                event.type === 'fitness' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                                'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400'
                                }`} title={event.title}>
                                {isGuardia ? '🔴' : event.type === 'work' ? '💼' : event.type === 'fitness' ? '💪' : '📌'} {event.title.substring(0, 12)}{event.title.length > 12 ? '…' : ''}
                              </div>
                            );
                          })}
                          {dayEvents.length > 2 && <p className="text-[8px] text-slate-400 font-bold px-1">+{dayEvents.length - 2} más</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* WEEKLY VIEW */}
            {activeSubView === 'week' && (
              <div className="flex flex-col animate-in slide-in-from-bottom-2 h-[800px]">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-slate-800">Semana del {weekDates[0].getDate()}</h2>
                  <div className="flex bg-slate-50 p-1 rounded-xl">
                    <button onClick={handlePrev} className="p-2 hover:bg-white rounded-lg"><ChevronLeft size={16} /></button>
                    <button onClick={handleNext} className="p-2 hover:bg-white rounded-lg"><ChevronRight size={16} /></button>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-7 gap-2 h-full overflow-y-auto">
                  {weekDates.map(day => {
                    const dateStr = day.toISOString().split('T')[0];
                    const dayEvents = calendarEvents.filter(e => e.start.startsWith(dateStr));
                    const isAddingHere = inlineAddDate === dateStr;
                    const dayIsToday = dateStr === new Date().toISOString().split('T')[0];

                    return (
                      <div key={dateStr} className={`flex flex-col rounded-2xl p-2 border transition-all ${dayIsToday ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}>
                        <div className={`text-center p-2 border-b mb-2 ${dayIsToday ? 'border-indigo-200' : 'border-slate-200'}`}>
                          <p className={`text-[10px] font-black uppercase ${dayIsToday ? 'text-indigo-500' : 'text-slate-400'}`}>{day.toLocaleDateString('es-ES', { weekday: 'short' })}</p>
                          <p className={`font-black ${dayIsToday ? 'text-indigo-700' : 'text-slate-700'}`}>{day.getDate()}</p>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          {dayEvents.map(ev => {
                            const isGuardia = ev.title.toLowerCase().includes('guardia');
                            return (
                              <div key={ev.id} className={`bg-white p-2 rounded-lg text-[9px] font-bold shadow-sm border-l-4 text-slate-700 group relative ${isGuardia ? 'border-orange-500 bg-orange-50/50 text-orange-800' : ev.type === 'work' ? 'border-red-400' : ev.type === 'fitness' ? 'border-emerald-400' : 'border-indigo-500'}`}>
                                {ev.title}
                                {onDeleteEvent && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); onDeleteEvent(ev.id); }}
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                                  >✕</button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Inline Add */}
                        {isAddingHere ? (
                          <div className="mt-2 space-y-1.5 animate-in slide-in-from-bottom-1">
                            <input
                              autoFocus
                              value={inlineTitle}
                              onChange={e => setInlineTitle(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleInlineAdd(dateStr); if (e.key === 'Escape') setInlineAddDate(null); }}
                              placeholder="Evento..."
                              className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-400/30"
                            />
                            <select value={inlineType} onChange={e => setInlineType(e.target.value as any)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-bold outline-none">
                              <option value="personal">📌 Personal</option>
                              <option value="work">🔴 Trabajo</option>
                              <option value="project">📋 Proyecto</option>
                              <option value="fitness">💪 Fitness</option>
                            </select>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input type="checkbox" checked={inlineSyncGoogle} onChange={e => setInlineSyncGoogle(e.target.checked)} className="rounded" />
                              <span className="text-[8px] font-bold text-slate-500">📅 Google Cal</span>
                            </label>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleInlineAdd(dateStr)}
                                disabled={isInlineCreating}
                                className="flex-1 bg-indigo-600 text-white text-[9px] font-black py-1.5 rounded-lg hover:bg-indigo-500 disabled:opacity-50 flex items-center justify-center gap-1"
                              >
                                {isInlineCreating ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />} Crear
                              </button>
                              <button onClick={() => { setInlineAddDate(null); setInlineTitle(''); }} className="px-2 bg-slate-200 text-slate-600 text-[9px] font-bold rounded-lg hover:bg-slate-300">
                                <X size={10} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setInlineAddDate(dateStr); setInlineTitle(''); }}
                            className="mt-2 w-full py-1.5 rounded-lg border border-dashed border-slate-300 text-[9px] font-bold text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-1"
                          >
                            <Plus size={10} /> Añadir
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* DAILY VIEW */}
            {activeSubView === 'daily' && (
              <div className="min-h-[600px] animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-12">
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">Agenda del {selectedDay} de {monthName}</h3>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Inspección de eventos diaria</p>
                  </div>
                  <button onClick={() => setActiveSubView('month')} className="p-4 bg-slate-50 hover:bg-indigo-50 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all">
                    <ChevronLeft size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  {eventsForSelectedDay.length === 0 ? (
                    <div className="py-32 text-center flex flex-col items-center">
                      <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 text-slate-200"><CalendarIcon size={40} /></div>
                      <p className="text-slate-400 font-black uppercase text-xs tracking-widest">No hay eventos para este día</p>
                    </div>
                  ) : (
                    eventsForSelectedDay.map((ev, i) => {
                      // Check for Guardia
                      const isGuardia = ev.title.toLowerCase().includes('guardia');

                      return (
                        <div key={i} className="flex gap-8 group">
                          <div className="w-20 pt-2 text-right">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isGuardia ? 'text-orange-500' : 'text-slate-400'}`}>
                              {isGuardia ? 'GUARDIA' : 'TODO EL DÍA'}
                            </span>
                          </div>
                          <div className={`flex-1 p-8 rounded-[2rem] border transition-all flex items-center justify-between shadow-sm
                            ${isGuardia
                              ? 'bg-orange-50 border-orange-200 text-orange-900'
                              : ev.type === 'project' ? 'bg-amber-50 border-amber-100 text-amber-900'
                                : ev.type === 'expense' ? 'bg-emerald-50 border-emerald-100 text-emerald-900'
                                  : 'bg-indigo-50 border-indigo-100 text-indigo-900'
                            }`}>
                            <div className="flex items-center gap-5">
                              <div className={`p-4 rounded-2xl shadow-sm ${isGuardia ? 'bg-orange-100 text-orange-600' : 'bg-white'}`}>
                                {isGuardia ? <AlertTriangle size={20} /> : ev.type === 'project' ? <Briefcase size={20} /> : <Zap size={20} />}
                              </div>
                              <div>
                                <h4 className="font-black text-lg">{ev.title}</h4>
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                  {isGuardia ? 'Turno Especial' : ev.type}
                                </span>
                              </div>
                            </div>
                            {onDeleteEvent && (
                              <button onClick={() => onDeleteEvent(ev.id)} className={`p-3 rounded-xl transition-all shadow-sm opacity-0 group-hover:opacity-100 ${isGuardia ? 'bg-white/50 hover:bg-red-100 text-orange-800 hover:text-red-600' : 'bg-white hover:bg-red-50 text-slate-300 hover:text-red-500'}`}>
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Quick add in daily view */}
                <div className="mt-8 border-t border-slate-100 pt-8">
                  {(() => {
                    const dayDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
                    const isAddingHere = inlineAddDate === dayDateStr;
                    
                    return isAddingHere ? (
                      <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-200 animate-in slide-in-from-bottom-2 space-y-4">
                        <h4 className="font-black text-slate-700 text-sm flex items-center gap-2"><Plus size={16} className="text-indigo-500" /> Nuevo evento para el {selectedDay} de {monthName}</h4>
                        <input
                          autoFocus
                          value={inlineTitle}
                          onChange={e => setInlineTitle(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleInlineAdd(dayDateStr); if (e.key === 'Escape') setInlineAddDate(null); }}
                          placeholder="Nombre del evento..."
                          className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <select value={inlineType} onChange={e => setInlineType(e.target.value as any)} className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none">
                            <option value="personal">📌 Personal</option>
                            <option value="work">🔴 Trabajo / Guardia</option>
                            <option value="project">📋 Proyecto</option>
                            <option value="fitness">💪 Fitness</option>
                          </select>
                          <label className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 cursor-pointer hover:border-indigo-300 transition-all">
                            <input type="checkbox" checked={inlineSyncGoogle} onChange={e => setInlineSyncGoogle(e.target.checked)} className="rounded text-indigo-600" />
                            <span className="text-xs font-bold text-slate-600">📅 Google Calendar</span>
                          </label>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleInlineAdd(dayDateStr)}
                            disabled={isInlineCreating || !inlineTitle.trim()}
                            className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-indigo-500 disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {isInlineCreating ? <><Loader2 size={14} className="animate-spin" /> Creando...</> : <><Plus size={14} /> Crear Evento</>}
                          </button>
                          <button onClick={() => { setInlineAddDate(null); setInlineTitle(''); }} className="px-5 bg-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-300 transition-all">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setInlineAddDate(dayDateStr); setInlineTitle(''); }}
                        className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 text-sm font-bold text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={18} /> Añadir evento a este día
                      </button>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* QUICK ADD */}
            {activeSubView === 'quick' && (
              <div className="bg-slate-900 p-8 sm:p-12 rounded-[3rem] text-white shadow-2xl min-h-[500px] flex flex-col items-center justify-center animate-in slide-in-from-top-4">
                <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl shadow-indigo-900/50">
                  <MessageSquarePlus size={36} />
                </div>
                <h3 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">Añadir Evento</h3>
                <p className="text-slate-400 font-medium mb-8 text-center max-w-md">Se guardará localmente y en Google Calendar si lo activas.</p>

                {gcalFeedback && (
                  <div className={`mb-6 px-6 py-3 rounded-2xl text-sm font-bold border ${gcalFeedback.includes('✅') ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : gcalFeedback.includes('❌') ? 'bg-red-500/20 border-red-500/30 text-red-300' : 'bg-blue-500/20 border-blue-500/30 text-blue-300'}`}>
                    {gcalFeedback}
                  </div>
                )}

                <form onSubmit={handleQuickAddSubmit} className="w-full max-w-xl space-y-5">
                  {/* Title */}
                  <div className="relative group">
                    <Zap className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400" size={22} />
                    <input placeholder="¿Qué quieres agendar?" className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-16 pr-8 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-lg font-bold transition-all" value={quickEvent.title} onChange={e => setQuickEvent({ ...quickEvent, title: e.target.value })} autoFocus />
                  </div>

                  {/* Date + Type */}
                  <div className="grid grid-cols-2 gap-4">
                    <input type="date" className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500 transition-all" value={quickEvent.date} onChange={e => setQuickEvent({ ...quickEvent, date: e.target.value })} />
                    <select className="bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-black uppercase outline-none focus:border-indigo-500" value={quickEvent.type} onChange={e => setQuickEvent({ ...quickEvent, type: e.target.value as any })} >
                      <option value="personal">📌 Recordatorio</option>
                      <option value="work">🔴 Laboral / Guardia</option>
                      <option value="project">📋 Proyecto</option>
                      <option value="fitness">💪 Fitness</option>
                      <option value="trip">✈️ Viaje</option>
                    </select>
                  </div>

                  {/* Start/End Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5 block">Hora inicio (opcional)</label>
                      <input type="time" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500 transition-all" value={quickEvent.startTime} onChange={e => setQuickEvent({ ...quickEvent, startTime: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5 block">Hora fin (opcional)</label>
                      <input type="time" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold outline-none focus:border-indigo-500 transition-all" value={quickEvent.endTime} onChange={e => setQuickEvent({ ...quickEvent, endTime: e.target.value })} />
                    </div>
                  </div>

                  {/* Description */}
                  <textarea
                    placeholder="Descripción o notas (opcional)..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-medium outline-none focus:border-indigo-500 transition-all resize-none h-24"
                    value={quickEvent.description}
                    onChange={e => setQuickEvent({ ...quickEvent, description: e.target.value })}
                  />

                  {/* Google Calendar Toggle */}
                  <div
                    onClick={() => setQuickEvent({ ...quickEvent, syncToGoogle: !quickEvent.syncToGoogle })}
                    className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${quickEvent.syncToGoogle ? 'bg-indigo-600/20 border-indigo-500/40' : 'bg-white/5 border-white/10'}`}
                  >
                    <div className={`w-12 h-7 rounded-full flex items-center transition-all ${quickEvent.syncToGoogle ? 'bg-indigo-500 justify-end' : 'bg-slate-600 justify-start'}`}>
                      <div className="w-5 h-5 bg-white rounded-full shadow-md mx-1" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">📅 Sincronizar con Google Calendar</p>
                      <p className="text-[10px] text-slate-400">El evento se creará también en tu Google Calendar</p>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isCreatingGCal || !quickEvent.title}
                    className="w-full py-5 bg-indigo-600 rounded-2xl font-black text-xs uppercase tracking-[0.15em] shadow-xl hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    {isCreatingGCal ? (
                      <><Loader2 size={16} className="animate-spin" /> Creando evento...</>
                    ) : (
                      <><Plus size={16} /> Crear Evento</>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* SOURCES MANAGEMENT */}
            {activeSubView === 'sources' && (
              <div className="animate-in slide-in-from-bottom-2">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-black text-slate-900">Fuentes de Calendario</h3>
                  <button
                    onClick={() => sources.forEach(s => handleSyncSource(s))}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-2"
                  >
                    <Clock size={14} /> Sincronizar Ahora
                  </button>
                </div>

                <div className="space-y-4 mb-8">
                  {sources.map(src => (
                    <div key={src.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: src.color }}></div>
                        <div className="overflow-hidden">
                          <p className="font-bold text-sm text-slate-800 truncate max-w-[200px]">{src.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest truncate max-w-[200px]">{src.url || src.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {src.type === 'google' && src.url && (
                          <button
                            onClick={() => {
                              setActiveSubView('google-view');
                            }}
                            className="p-2 text-indigo-400 hover:text-indigo-600"
                            title="Ver en pestaña Google"
                          >
                            <Link2 size={16} />
                          </button>
                        )}
                        <button onClick={() => handleDeleteSource(src.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                  <h4 className="font-bold text-slate-700 text-sm mb-4">Añadir Nueva Fuente</h4>
                  <div className="flex gap-2 mb-4">
                    <input
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold font-mono"
                      placeholder="URL de calendario (iCal/Embed)..."
                      value={newSourceUrl}
                      onChange={e => setNewSourceUrl(e.target.value)}
                    />
                    <button onClick={handleAddSource} className="bg-slate-900 text-white px-4 rounded-xl font-bold text-xs"><Plus size={16} /></button>
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Importar Archivo</p>
                    <input type="file" ref={icsInputRef} className="hidden" accept=".ics" onChange={handleICSImport} />
                    <button onClick={() => icsInputRef.current?.click()} className="w-full bg-white border border-indigo-200 text-indigo-600 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all">
                      {isImporting ? <Loader2 className="animate-spin" size={14} /> : <FileUp size={14} />}
                      Subir .ICS
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSubView === 'google-view' && (
              <GoogleCalendarEmbedView />
            )}
          </div>
        </div>

        {/* ═══ UNIFIED SIDEBAR PANEL ═══ */}
        <div className="lg:col-span-3 space-y-4">
          {/* Today summary */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-5 text-white relative overflow-hidden shadow-xl">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 rounded-full blur-xl" />
            <p className="text-[10px] font-black uppercase tracking-wider opacity-70">Hoy · {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <div className="flex gap-4 mt-3">
              <div><p className="text-2xl font-black">{calendarEvents.filter(e => e.start.startsWith(new Date().toISOString().split('T')[0])).length}</p><p className="text-[9px] opacity-60">Eventos</p></div>
              <div><p className="text-2xl font-black">{(tasks||[]).filter(t => !t.completed && t.dueDate === new Date().toISOString().split('T')[0]).length}</p><p className="text-[9px] opacity-60">Tareas</p></div>
              <div><p className="text-2xl font-black">{(() => { try { return JSON.parse(localStorage.getItem('filehub_hangouts')||'[]').filter((h:any) => h.date === new Date().toISOString().split('T')[0] && h.status !== 'done').length; } catch { return 0; } })()}</p><p className="text-[9px] opacity-60">Quedadas</p></div>
            </div>
          </div>

          {/* Today's events */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
              <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">📅 Eventos de hoy</h3>
            </div>
            <div className="p-3 space-y-2 max-h-[200px] overflow-y-auto">
              {calendarEvents.filter(e => e.start.startsWith(new Date().toISOString().split('T')[0])).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Sin eventos hoy</p>
              ) : calendarEvents.filter(e => e.start.startsWith(new Date().toISOString().split('T')[0])).map((ev, i) => {
                const isGuardia = ev.title.toLowerCase().includes('guardia');
                return (
                  <div key={i} className={`px-3 py-2 rounded-xl text-xs font-bold border-l-4 ${isGuardia ? 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400' : ev.type === 'work' ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'}`}>
                    {isGuardia ? '🔴 ' : ev.type === 'work' ? '💼 ' : ev.type === 'fitness' ? '💪 ' : '📌 '}{ev.title}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pending tasks */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
              <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">✅ Tareas pendientes</h3>
            </div>
            <div className="p-3 space-y-1.5 max-h-[200px] overflow-y-auto">
              {(tasks||[]).filter(t => !t.completed).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Sin tareas pendientes</p>
              ) : (tasks||[]).filter(t => !t.completed).sort((a,b) => {
                const pOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
                return (pOrder[a.priority]||2) - (pOrder[b.priority]||2);
              }).slice(0, 8).map((t, i) => (
                <div key={i} className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${t.priority === 'high' ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400' : t.priority === 'medium' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.priority === 'high' ? 'bg-red-500' : t.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                  <span className="truncate">{t.title}</span>
                  {t.dueDate && <span className="text-[8px] ml-auto flex-shrink-0 opacity-60">{new Date(t.dueDate+'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming hangouts */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
              <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">🍻 Próximas quedadas</h3>
            </div>
            <div className="p-3 space-y-1.5 max-h-[180px] overflow-y-auto">
              {(() => {
                try {
                  const hangouts = JSON.parse(localStorage.getItem('filehub_hangouts') || '[]')
                    .filter((h: any) => h.status !== 'done' && h.status !== 'cancelled' && h.date >= new Date().toISOString().split('T')[0])
                    .sort((a: any, b: any) => a.date.localeCompare(b.date))
                    .slice(0, 5);
                  if (hangouts.length === 0) return <p className="text-xs text-slate-400 text-center py-4">Sin quedadas próximas</p>;
                  return hangouts.map((h: any, i: number) => (
                    <div key={i} className="px-3 py-2 rounded-xl bg-pink-50 dark:bg-pink-500/10 text-xs font-bold text-pink-700 dark:text-pink-400 flex items-center gap-2">
                      <span>{h.emoji || '🍻'}</span>
                      <span className="truncate">{h.title}</span>
                      <span className="text-[8px] ml-auto opacity-60 flex-shrink-0">
                        {h.date === new Date().toISOString().split('T')[0] ? '¡HOY!' : new Date(h.date + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  ));
                } catch { return <p className="text-xs text-slate-400 text-center py-4">Sin quedadas</p>; }
              })()}
            </div>
          </div>

          {/* This week overview */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
              <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">📊 Esta semana</h3>
            </div>
            <div className="p-3 space-y-1.5">
              {(() => {
                const today = new Date();
                const startOfWeek = new Date(today);
                const day = startOfWeek.getDay();
                startOfWeek.setDate(startOfWeek.getDate() - day + (day === 0 ? -6 : 1));
                const days = Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(startOfWeek);
                  d.setDate(d.getDate() + i);
                  return d;
                });
                return days.map((d, i) => {
                  const dateStr = d.toISOString().split('T')[0];
                  const evCount = calendarEvents.filter(e => e.start.startsWith(dateStr)).length;
                  const taskCount = (tasks||[]).filter(t => !t.completed && t.dueDate === dateStr).length;
                  const isToday = dateStr === today.toISOString().split('T')[0];
                  const isPast = d < today && !isToday;
                  return (
                    <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] ${isToday ? 'bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-200 dark:ring-indigo-500/30' : isPast ? 'opacity-40' : ''}`}>
                      <span className={`w-7 font-black ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>{d.toLocaleDateString('es-ES', { weekday: 'short' }).slice(0,2).toUpperCase()}</span>
                      <span className={`font-bold ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>{d.getDate()}</span>
                      <div className="flex-1 flex gap-1 ml-2">
                        {Array.from({ length: Math.min(evCount, 5) }).map((_, j) => <div key={j} className="w-2 h-2 rounded-full bg-indigo-400" />)}
                        {Array.from({ length: Math.min(taskCount, 3) }).map((_, j) => <div key={`t-${j}`} className="w-2 h-2 rounded-full bg-amber-400" />)}
                      </div>
                      {(evCount + taskCount) > 0 && <span className="text-[8px] font-bold text-slate-400">{evCount + taskCount}</span>}
                    </div>
                  );
                });
              })()}
              <div className="flex gap-4 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-1.5 text-[9px] text-slate-400"><div className="w-2 h-2 rounded-full bg-indigo-400" /> Eventos</div>
                <div className="flex items-center gap-1.5 text-[9px] text-slate-400"><div className="w-2 h-2 rounded-full bg-amber-400" /> Tareas</div>
              </div>
            </div>
          </div>

          {/* AI Advisor */}
          <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden border border-indigo-500/20">
            <h3 className="text-sm font-black mb-3 flex items-center gap-2">
              <BrainCircuit className="text-indigo-400" size={16} /> AI Advisor
            </h3>
            {analysisResult ? (
              <div className="space-y-3 animate-in fade-in">
                <p className="text-[10px] text-slate-300 leading-relaxed italic">"{analysisResult.summary}"</p>
                {analysisResult.conflicts && analysisResult.conflicts.length > 0 && (
                  <div className="p-2.5 bg-red-500/20 rounded-lg border border-red-500/30">
                    <p className="text-[8px] font-black uppercase text-red-300 mb-1.5">⚠️ Conflictos</p>
                    <ul className="text-[9px] space-y-0.5 text-red-200">{analysisResult.conflicts.map((c: string, i: number) => <li key={i}>• {c}</li>)}</ul>
                  </div>
                )}
                {analysisResult.suggestions && (
                  <div className="p-2.5 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                    <p className="text-[8px] font-black uppercase text-emerald-300 mb-1.5">💡 Sugerencias</p>
                    <ul className="text-[9px] space-y-0.5 text-emerald-200">{analysisResult.suggestions.map((s: string, i: number) => <li key={i}>• {s}</li>)}</ul>
                  </div>
                )}
                <button onClick={() => setAnalysisResult(null)} className="text-[8px] font-black uppercase text-indigo-400 hover:text-white w-full text-center">Limpiar</button>
              </div>
            ) : (
              <p className="text-[10px] text-slate-500">Pulsa "Análisis IA" para detectar conflictos y optimizar tu tiempo.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
