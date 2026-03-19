import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Brain, Calendar, Clock, CheckCircle2, Circle, ChevronRight,
  Plus, Trash2, Star, Shield, AlertTriangle, Zap, Target,
  PlayCircle, PauseCircle, RotateCcw, Coffee,
  TrendingUp, Lightbulb, ChevronDown, ChevronUp, Flame,
  CheckSquare, BarChart3, Sparkles, Plane, MapPin,
  SunMedium, Layers, RefreshCw, X, Send, Loader2, Bot
} from 'lucide-react';
import { Task, CalendarEvent } from '../types';
import { chatWithKimi } from '../services/kimiService';
import { callAI } from '../services/aiProxy';

// ─── TYPES ────────────────────────────────────────────────────────
interface PlannedSlot { id: string; taskId: string; date: string; startTime: string; duration: number; done: boolean; }
interface TravelDay { tripId: string; tripName: string; destination: string; dayNum: number; date: string; theme: string; activities: any[]; }

interface WorkPlannerProps {
  tasks: Task[];
  events: CalendarEvent[];
  onAddTask: (t: Task) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  session?: any;
}

// ─── UTILS ───────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0];
const addDays = (d: string, n: number) => { const dt = new Date(d + 'T12:00:00'); dt.setDate(dt.getDate() + n); return dt.toISOString().split('T')[0]; };
const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtDateFull = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

const isGuardiaDay = (d: string, events: CalendarEvent[]) => events.some(e => e.start.startsWith(d) && e.title.toLowerCase().includes('guardia'));
const isBlockedDay = (d: string, events: CalendarEvent[]) => isGuardiaDay(d, events) || isGuardiaDay(addDays(d, -1), events);
const getBlockReason = (d: string, events: CalendarEvent[]) => {
  if (isGuardiaDay(d, events)) return 'Guardia 24h';
  if (isGuardiaDay(addDays(d, -1), events)) return 'Post-guardia';
  return null;
};

const PRIORITY_SCORE: Record<string, number> = { urgent: 100, high: 70, medium: 40, low: 10 };
const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-red-500 bg-red-50 dark:bg-red-500/10 border-red-300',
  high: 'text-orange-500 bg-orange-50 dark:bg-orange-500/10 border-orange-300',
  medium: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-300',
  low: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300',
};
const PRIORITY_DOT: Record<string, string> = { urgent: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-amber-500', low: 'bg-emerald-500' };

// ─── POMODORO ────────────────────────────────────────────────────
const PomodoroTimer: React.FC<{ taskTitle?: string; onClose: () => void }> = ({ taskTitle, onClose }) => {
  const MODES = [
    { id: 'work', label: 'Trabajo', duration: 25 * 60, color: 'text-red-500', ringColor: '#ef4444' },
    { id: 'short', label: 'Descanso corto', duration: 5 * 60, color: 'text-emerald-500', ringColor: '#10b981' },
    { id: 'long', label: 'Descanso largo', duration: 15 * 60, color: 'text-blue-500', ringColor: '#3b82f6' },
  ];
  const [modeIdx, setModeIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(MODES[0].duration);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const intervalRef = useRef<any>(null);
  const mode = MODES[modeIdx];
  const pct = ((mode.duration - timeLeft) / mode.duration) * 100;
  const circumference = 2 * Math.PI * 54;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            setRunning(false);
            clearInterval(intervalRef.current);
            if (modeIdx === 0) setCycles(c => c + 1);
            if ('Notification' in window && Notification.permission === 'granted')
              new Notification('⏰ FileHub', { body: modeIdx === 0 ? '¡25 min! Descansa.' : '¡A trabajar!' });
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, modeIdx]);

  const switchMode = (idx: number) => { setModeIdx(idx); setTimeLeft(MODES[idx].duration); setRunning(false); clearInterval(intervalRef.current); };
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xs mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex border-b border-slate-100 dark:border-slate-800">
          {MODES.map((m, i) => (
            <button key={m.id} onClick={() => switchMode(i)}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all ${modeIdx === i ? `${m.color} border-b-2 border-current` : 'text-slate-400'}`}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="p-7 flex flex-col items-center gap-5">
          {taskTitle && <p className="text-xs font-bold text-slate-400 text-center truncate max-w-full">🎯 {taskTitle}</p>}
          <div className="relative w-36 h-36">
            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-800" />
              <circle cx="60" cy="60" r="54" fill="none" strokeWidth="8" stroke={mode.ringColor} strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={circumference - (pct / 100) * circumference}
                style={{ transition: 'stroke-dashoffset 1s linear' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-slate-800 dark:text-white font-mono">{mins}:{secs}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">{mode.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => { setTimeLeft(mode.duration); setRunning(false); clearInterval(intervalRef.current); }} className="p-2 text-slate-400 hover:text-slate-600">
              <RotateCcw size={20} />
            </button>
            <button onClick={() => setRunning(r => !r)}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 bg-slate-50 dark:bg-slate-800`}>
              {running ? <PauseCircle size={36} className={mode.color} /> : <PlayCircle size={36} className={mode.color} />}
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i < cycles % 4 ? 'bg-amber-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-400">{cycles} pomodoro{cycles !== 1 ? 's' : ''} hoy</p>
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600">Cerrar</button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────
const WorkPlannerView: React.FC<WorkPlannerProps> = ({ tasks, events, onAddTask, onToggleTask, onDeleteTask, session }) => {
  const [slots, setSlots] = useState<PlannedSlot[]>(() => {
    try { return JSON.parse(localStorage.getItem('filehub_planner_slots') || '[]'); } catch { return []; }
  });
  const [view, setView] = useState<'unified' | 'ai' | 'board' | 'focus'>('unified');
  const [pomodoroTask, setPomodoroTask] = useState<string | null>(null);
  const [showPomo, setShowPomo] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'high', duration: 60, dueDate: '' });
  const [showAddTask, setShowAddTask] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(todayStr());
  const [weekOffset, setWeekOffset] = useState(0);
  const [aiChatInput, setAiChatInput] = useState('');
  const [aiChatMessages, setAiChatMessages] = useState<{role:'user'|'assistant';content:string}[]>([]);
  const [aiChatting, setAiChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load travel plans from localStorage
  const travelPlans = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('filehub_travel_plans') || '[]'); } catch { return []; }
  }, []);

  // Build travel days indexed by date
  const travelDaysByDate = useMemo(() => {
    const map: Record<string, TravelDay[]> = {};
    travelPlans.forEach((plan: any) => {
      if (!plan.itinerary?.days) return;
      plan.itinerary.days.forEach((d: any) => {
        const dateKey = d.date?.split('T')[0];
        if (!dateKey) return;
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push({ tripId: plan.id, tripName: plan.destination, destination: plan.destination, dayNum: d.day, date: dateKey, theme: d.theme || d.title, activities: d.activities || [] });
      });
    });
    return map;
  }, [travelPlans]);

  // Build 7-day window
  const baseDate = useMemo(() => addDays(todayStr(), weekOffset * 7), [weekOffset]);
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(baseDate, i);
      const dayEvents = events.filter(e => e.start.startsWith(d));
      const daySlots = slots.filter(s => s.date === d);
      const dayTravel = travelDaysByDate[d] || [];
      const dayTasks = tasks.filter(t => t.dueDate === d && !t.completed);
      return {
        date: d, label: fmtDate(d), isToday: d === todayStr(),
        blocked: isBlockedDay(d, events),
        blockReason: getBlockReason(d, events),
        isGuardia: isGuardiaDay(d, events),
        events: dayEvents, slots: daySlots,
        travel: dayTravel,
        dueTasks: dayTasks,
        totalItems: dayEvents.length + daySlots.length + dayTravel.length,
      };
    });
  }, [baseDate, slots, events, travelDaysByDate, tasks]);

  // AI suggestions
  const aiSuggestions = useMemo(() => {
    const pending = tasks.filter(t => !t.completed);
    const scored = pending.map(t => {
      let score = PRIORITY_SCORE[t.priority] || 40;
      if (t.dueDate) {
        const d = Math.ceil((new Date(t.dueDate + 'T12:00:00').getTime() - Date.now()) / 86400000);
        if (d <= 0) score += 60; else if (d <= 2) score += 40; else if (d <= 7) score += 20;
      }
      return { ...t, score };
    }).sort((a, b) => b.score - a.score);

    const suggestions: { task: typeof scored[0]; date: string; reason: string }[] = [];
    let dayIdx = 0;
    for (const task of scored.slice(0, 10)) {
      while (dayIdx < 7 && weekDays[dayIdx]?.blocked) dayIdx++;
      if (dayIdx >= 7) break;
      const day = weekDays[dayIdx];
      // Skip days with travel (don't overload travel days)
      if (day.travel.length > 0) { dayIdx++; continue; }
      const reasons: string[] = [];
      if (task.priority === 'urgent') reasons.push('urgente');
      if (task.dueDate) {
        const d = Math.ceil((new Date(task.dueDate + 'T12:00:00').getTime() - Date.now()) / 86400000);
        if (d <= 0) reasons.push('vencida'); else if (d <= 2) reasons.push(`vence en ${d}d`);
      }
      if (day.travel.length === 0 && day.slots.length < 3) {
        suggestions.push({ task, date: day.date, reason: reasons.join(' · ') || 'planificada por IA' });
        if (day.slots.length + 1 >= 3) dayIdx++;
      } else dayIdx++;
    }
    return suggestions;
  }, [tasks, weekDays]);

  const saveSlots = (updated: PlannedSlot[]) => { setSlots(updated); localStorage.setItem('filehub_planner_slots', JSON.stringify(updated)); };
  const addSlot = (taskId: string, date: string) => saveSlots([...slots, { id: `slot_${Date.now()}`, taskId, date, startTime: '09:00', duration: 60, done: false }]);
  const removeSlot = (slotId: string) => saveSlots(slots.filter(s => s.id !== slotId));

  const addNewTask = () => {
    if (!newTask.title.trim()) return;
    onAddTask({ id: `task_${Date.now()}`, title: newTask.title.trim(), completed: false, category: 'work', priority: newTask.priority as any, dueDate: newTask.dueDate || undefined, duration: newTask.duration });
    setNewTask({ title: '', priority: 'high', duration: 60, dueDate: '' });
    setShowAddTask(false);
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [aiChatMessages]);

  // AI Chat for planning
  const sendAIChat = async () => {
    if (!aiChatInput.trim() || aiChatting) return;
    const msg = aiChatInput.trim();
    setAiChatInput('');
    setAiChatting(true);
    const newMsgs = [...aiChatMessages, { role: 'user' as const, content: msg }];
    setAiChatMessages(newMsgs);

    const context = {
      today: todayStr(),
      tasks: tasks.filter(t => !t.completed).slice(0, 10).map(t => ({ title: t.title, priority: t.priority, dueDate: t.dueDate })),
      events: events.filter(e => e.start >= todayStr()).slice(0, 10).map(e => ({ title: e.title, date: e.start })),
      travel: travelPlans.map((p: any) => ({ destination: p.destination, dates: `${p.startDate} → ${p.endDate}` })),
      shifts: events.filter(e => e.title.toLowerCase().includes('guardia') && e.start >= todayStr()).slice(0, 5).map(e => e.start),
    };

    const systemPrompt = `Eres el asistente de planificación personal de FileHub para Carlos (enfermero español).
Tienes acceso a:
- Tareas pendientes: ${JSON.stringify(context.tasks)}
- Eventos del calendario: ${JSON.stringify(context.events)}
- Viajes planificados: ${JSON.stringify(context.travel)}
- Guardias próximas (días bloqueados 24h + mañana siguiente): ${JSON.stringify(context.shifts)}
- Fecha actual: ${context.today}

Ayúdale a organizar su tiempo de forma inteligente. Sé conciso y práctico. Responde en español.`;

    try {
      const response = await callAI(
        newMsgs.slice(-6).map(m => ({ role: m.role as 'user'|'assistant', content: m.content })),
        { system: systemPrompt, model: 'claude-haiku-4-5-20251001', maxTokens: 1024 }
      );
      setAiChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (e: any) {
      setAiChatMessages(prev => [...prev, { role: 'assistant', content: `❌ ${e.message}` }]);
    }
    setAiChatting(false);
  };

  // Stats
  const stats = {
    pending: tasks.filter(t => !t.completed).length,
    done: tasks.filter(t => t.completed).length,
    urgent: tasks.filter(t => t.priority === 'urgent' && !t.completed).length,
    trips: travelPlans.length,
    guardias: events.filter(e => e.title.toLowerCase().includes('guardia') && e.start >= todayStr()).length,
    today: weekDays[0],
  };

  // ── EVENT TYPE CONFIG ─────────────────────────────────────────
  const eventTypeColor = (type: string) => {
    const m: Record<string,string> = { work:'bg-red-500', personal:'bg-blue-500', fitness:'bg-emerald-500', trip:'bg-sky-500', expense:'bg-amber-500' };
    return m[type] || 'bg-slate-400';
  };

  return (
    <div className="space-y-5">
      {/* POMODORO */}
      {showPomo && <PomodoroTimer taskTitle={tasks.find(t => t.id === pomodoroTask)?.title} onClose={() => { setShowPomo(false); setPomodoroTask(null); }} />}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Layers size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">Gestor de Tiempo</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tareas · Viajes · Calendario · Guardias — todo en un solo lugar</p>
          </div>
        </div>
        <button onClick={() => setShowAddTask(!showAddTask)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-all text-sm">
          <Plus size={16} /> Nueva tarea
        </button>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {[
          { label: 'Pendientes', value: stats.pending, color: 'text-slate-700 dark:text-slate-200', bg: 'bg-slate-50 dark:bg-slate-800', icon: Circle },
          { label: 'Completadas', value: stats.done, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: CheckCircle2 },
          { label: 'Urgentes', value: stats.urgent, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-500/10', icon: AlertTriangle },
          { label: 'Viajes', value: stats.trips, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-500/10', icon: Plane },
          { label: 'Guardias', value: stats.guardias, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-500/10', icon: Shield },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-3 border border-slate-200/60 dark:border-slate-700`}>
            <div className="flex items-center justify-between mb-1">
              <s.icon size={14} className={s.color} />
            </div>
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ADD TASK FORM */}
      {showAddTask && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-400/40 shadow-xl p-5">
          <h3 className="font-black text-slate-800 dark:text-white mb-3 flex items-center gap-2 text-sm"><Zap size={14} className="text-violet-500" /> Añadir tarea</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <input value={newTask.title} onChange={e => setNewTask(n => ({ ...n, title: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addNewTask()}
              placeholder="Título de la tarea..."
              className="col-span-2 sm:col-span-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400" />
            <select value={newTask.priority} onChange={e => setNewTask(n => ({ ...n, priority: e.target.value }))}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-violet-500/20">
              <option value="urgent">🔴 Urgente</option>
              <option value="high">🟠 Alta</option>
              <option value="medium">🟡 Media</option>
              <option value="low">🟢 Baja</option>
            </select>
            <input type="date" value={newTask.dueDate} onChange={e => setNewTask(n => ({ ...n, dueDate: e.target.value }))}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/20" />
            <select value={newTask.duration} onChange={e => setNewTask(n => ({ ...n, duration: +e.target.value }))}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-violet-500/20">
              <option value={25}>🍅 25 min</option>
              <option value={60}>1 hora</option>
              <option value={120}>2 horas</option>
              <option value={240}>Medio día</option>
            </select>
            <button onClick={addNewTask} className="bg-violet-500 hover:bg-violet-600 text-white font-black rounded-xl text-sm transition-all">✓ Añadir</button>
          </div>
        </div>
      )}

      {/* VIEW TABS */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-fit">
        {[
          { id: 'unified', label: '📅 Vista unificada' },
          { id: 'ai', label: '🤖 IA Planning' },
          { id: 'board', label: '📋 Tablero' },
          { id: 'focus', label: '🍅 Focus' },
        ].map(t => (
          <button key={t.id} onClick={() => setView(t.id as any)}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${view === t.id ? 'bg-white dark:bg-slate-700 text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── VISTA UNIFICADA ─────────────────────────────────────── */}
      {view === 'unified' && (
        <div className="space-y-3">
          {/* Week navigator */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-2.5">
            <button onClick={() => setWeekOffset(w => w - 1)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
              <ChevronRight size={16} className="rotate-180 text-slate-600" />
            </button>
            <div className="text-center">
              <p className="font-black text-sm text-slate-800 dark:text-white">
                {weekOffset === 0 ? 'Esta semana' : weekOffset === 1 ? 'Semana que viene' : weekOffset === -1 ? 'Semana pasada' : `Semana ${weekOffset > 0 ? '+' : ''}${weekOffset}`}
              </p>
              <p className="text-[10px] text-slate-400">{fmtDate(baseDate)} — {fmtDate(addDays(baseDate, 6))}</p>
            </div>
            <button onClick={() => setWeekOffset(w => w + 1)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
              <ChevronRight size={16} className="text-slate-600" />
            </button>
          </div>

          {/* Day cards */}
          {weekDays.map(day => (
            <div key={day.date} className={`rounded-2xl border overflow-hidden transition-all ${
              day.blocked ? 'border-red-200 dark:border-red-500/20 bg-red-50/30 dark:bg-red-500/5'
              : day.travel.length > 0 ? 'border-sky-300 dark:border-sky-500/30 bg-sky-50/30 dark:bg-sky-500/5'
              : day.isToday ? 'border-violet-400/60 bg-violet-50/20 dark:bg-violet-500/5 shadow-md'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
            }`}>
              {/* Day header */}
              <button onClick={() => setExpandedDay(expandedDay === day.date ? null : day.date)}
                className="w-full flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  {/* Date badge */}
                  <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center text-xs font-black shrink-0 ${
                    day.blocked ? 'bg-red-500 text-white'
                    : day.travel.length > 0 ? 'bg-sky-500 text-white'
                    : day.isToday ? 'bg-violet-500 text-white shadow-md shadow-violet-500/25'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    <span className="text-[9px] uppercase">{new Date(day.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                    <span className="text-base leading-tight">{new Date(day.date + 'T12:00:00').getDate()}</span>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-black text-sm ${day.isToday ? 'text-violet-600 dark:text-violet-400' : 'text-slate-700 dark:text-slate-200'}`}>
                        {day.isToday ? 'Hoy' : fmtDate(day.date)}
                      </p>
                      {day.blocked && <span className="text-[10px] font-black bg-red-100 dark:bg-red-500/20 text-red-600 px-2 py-0.5 rounded-lg flex items-center gap-1"><Shield size={9}/>{day.blockReason}</span>}
                      {day.travel.length > 0 && <span className="text-[10px] font-black bg-sky-100 dark:bg-sky-500/20 text-sky-600 px-2 py-0.5 rounded-lg flex items-center gap-1"><Plane size={9}/>{day.travel[0].destination} · Día {day.travel[0].dayNum}</span>}
                    </div>
                    {/* Mini indicators */}
                    <div className="flex items-center gap-2 mt-0.5">
                      {day.events.length > 0 && <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Calendar size={8}/>{day.events.length} eventos</span>}
                      {day.slots.length > 0 && <span className="text-[10px] text-violet-500 flex items-center gap-0.5"><CheckSquare size={8}/>{day.slots.length} tareas</span>}
                      {day.dueTasks.length > 0 && <span className="text-[10px] text-orange-500 flex items-center gap-0.5"><AlertTriangle size={8}/>{day.dueTasks.length} vencen</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Density dots */}
                  <div className="flex gap-0.5">
                    {[0,1,2,3].map(i => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < day.totalItems ? (day.travel.length > 0 ? 'bg-sky-500' : 'bg-violet-500') : 'bg-slate-200 dark:bg-slate-700'}`} />
                    ))}
                  </div>
                  {expandedDay === day.date ? <ChevronUp size={15} className="text-slate-400"/> : <ChevronDown size={15} className="text-slate-400"/>}
                </div>
              </button>

              {/* Expanded content */}
              {expandedDay === day.date && (
                <div className="border-t border-slate-100 dark:border-slate-700 p-3 space-y-2">
                  {day.blocked ? (
                    <div className="flex items-center gap-3 py-3 justify-center text-red-400">
                      <Shield size={18}/>
                      <div>
                        <p className="font-bold text-sm">{day.blockReason}</p>
                        <p className="text-xs text-red-300">Sin planificación de tareas</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Travel activities for this day */}
                      {day.travel.map(td => (
                        <div key={td.tripId} className="bg-sky-50 dark:bg-sky-500/10 rounded-xl border border-sky-200 dark:border-sky-500/20 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Plane size={13} className="text-sky-500"/>
                            <p className="font-black text-xs text-sky-700 dark:text-sky-400">✈️ {td.destination} — Día {td.dayNum}: {td.theme}</p>
                          </div>
                          <div className="space-y-1">
                            {td.activities.slice(0, 4).map((act: any, i: number) => (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <span className="font-mono text-sky-400 shrink-0 w-8">{act.time}</span>
                                <span className={`font-bold ${act.mustSee ? 'text-sky-700 dark:text-sky-300' : 'text-sky-600 dark:text-sky-400'}`}>
                                  {act.mustSee ? '⭐ ' : ''}{act.title}
                                  {act.cost && act.cost > 0 ? <span className="text-sky-400 font-normal"> (~{act.cost}€)</span> : ''}
                                </span>
                              </div>
                            ))}
                            {td.activities.length > 4 && <p className="text-[10px] text-sky-400 ml-10">+{td.activities.length - 4} más...</p>}
                          </div>
                        </div>
                      ))}

                      {/* Calendar events */}
                      {day.events.filter(e => !e.title.toLowerCase().includes('guardia')).map(ev => (
                        <div key={ev.id} className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-700 rounded-xl">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${eventTypeColor(ev.type)}`}/>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{ev.title}</p>
                          {ev.start.includes('T') && <span className="text-[10px] text-slate-400 shrink-0 ml-auto">{ev.start.split('T')[1].slice(0,5)}</span>}
                        </div>
                      ))}

                      {/* Tasks due today */}
                      {day.dueTasks.map(t => (
                        <div key={t.id} className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl">
                          <AlertTriangle size={11} className="text-orange-500 shrink-0"/>
                          <p className="text-xs font-bold text-orange-700 dark:text-orange-400 truncate">⏰ Vence hoy: {t.title}</p>
                          <button onClick={() => onToggleTask(t.id)} className="ml-auto shrink-0">
                            <Circle size={14} className="text-orange-400 hover:text-emerald-500 transition-colors"/>
                          </button>
                        </div>
                      ))}

                      {/* Planned slots */}
                      {day.slots.map(slot => {
                        const task = tasks.find(t => t.id === slot.taskId);
                        if (!task) return null;
                        return (
                          <div key={slot.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${PRIORITY_COLORS[task.priority]}`}>
                            <button onClick={() => onToggleTask(task.id)} className="shrink-0">
                              {task.completed ? <CheckCircle2 size={16} className="text-emerald-500"/> : <Circle size={16} className="text-slate-300 hover:text-violet-500"/>}
                            </button>
                            <span className={`flex-1 text-xs font-bold truncate ${task.completed ? 'line-through opacity-50' : ''}`}>{task.title}</span>
                            <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`}/>
                            <button onClick={() => { setPomodoroTask(task.id); setShowPomo(true); }} className="p-1 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg text-red-400 transition-colors" title="Pomodoro">
                              <PlayCircle size={13}/>
                            </button>
                            <button onClick={() => removeSlot(slot.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                              <X size={12}/>
                            </button>
                          </div>
                        );
                      })}

                      {/* Add task to day — only if not travel day (or allow anyway) */}
                      {!day.blocked && (
                        <select onChange={e => { if (e.target.value) { addSlot(e.target.value, day.date); e.target.value = ''; } }}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-dashed border-violet-300 dark:border-violet-500/30 rounded-xl px-3 py-2 text-xs text-slate-400 focus:outline-none cursor-pointer">
                          <option value="">+ Añadir tarea a este día...</option>
                          {tasks.filter(t => !t.completed && !slots.some(s => s.date === day.date && s.taskId === t.id)).map(t => (
                            <option key={t.id} value={t.id}>{'🔴🟠🟡🟢'[['urgent','high','medium','low'].indexOf(t.priority)] || '·'} {t.title}</option>
                          ))}
                        </select>
                      )}

                      {/* Empty state */}
                      {day.totalItems === 0 && day.dueTasks.length === 0 && (
                        <p className="text-[10px] text-slate-400 text-center py-2">Día libre — añade tareas o déjalo descansar 🌿</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── IA PLANNING ─────────────────────────────────────────── */}
      {view === 'ai' && (
        <div className="space-y-4">
          {/* AI suggestions */}
          {aiSuggestions.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Sparkles size={11} className="text-violet-500"/> Sugerencias IA para esta semana</p>
              {aiSuggestions.map((s, i) => {
                const alreadyPlanned = slots.some(sl => sl.taskId === s.task.id && sl.date === s.date);
                return (
                  <div key={s.task.id} className={`bg-white dark:bg-slate-800 rounded-2xl border p-4 flex items-center gap-3 ${PRIORITY_COLORS[s.task.priority]}`}>
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shadow-sm shrink-0 ${i===0?'bg-amber-400 text-white':i===1?'bg-slate-400 text-white':'bg-slate-200 text-slate-600'}`}>{i+1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-slate-800 dark:text-white truncate">{s.task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1"><Calendar size={8}/>{fmtDate(s.date)}</span>
                        {s.reason && <span className="text-[10px] bg-violet-100 dark:bg-violet-500/20 text-violet-600 px-1.5 py-0.5 rounded-lg font-bold">💡 {s.reason}</span>}
                      </div>
                    </div>
                    {!alreadyPlanned
                      ? <button onClick={() => addSlot(s.task.id, s.date)} className="shrink-0 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-black rounded-xl transition-all">+ Plan</button>
                      : <span className="shrink-0 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1.5 rounded-xl">✓ Lista</span>
                    }
                  </div>
                );
              })}
              <button onClick={() => {
                const newSlots = [...slots];
                aiSuggestions.forEach(s => {
                  if (!newSlots.some(sl => sl.taskId === s.task.id && sl.date === s.date))
                    newSlots.push({ id: `slot_ai_${Date.now()}_${s.task.id}`, taskId: s.task.id, date: s.date, startTime: '09:00', duration: s.task.duration || 60, done: false });
                });
                saveSlots(newSlots);
              }} className="w-full py-3 bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-black rounded-2xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 text-sm">
                <Sparkles size={16}/> Aplicar plan completo de la IA
              </button>
            </div>
          )}

          {/* AI Chat */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-400/30 shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
              <Bot size={16} className="text-violet-500"/>
              <p className="font-black text-sm text-slate-800 dark:text-white">Chat con IA de planificación</p>
              <span className="text-[10px] bg-violet-100 dark:bg-violet-500/20 text-violet-600 px-2 py-0.5 rounded-lg font-bold ml-auto">Kimi · Haiku</span>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {['¿Cuándo tengo tiempo libre esta semana?','Organiza mis tareas urgentes','¿Tengo algún viaje próximo?','¿Qué días tengo guardia?','Dame un plan para el fin de semana'].map(s => (
                  <button key={s} onClick={() => setAiChatInput(s)} className="text-[10px] font-bold px-2.5 py-1 bg-violet-50 dark:bg-violet-500/10 text-violet-600 rounded-lg hover:bg-violet-100 transition-all border border-violet-200 dark:border-violet-500/20">{s}</button>
                ))}
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto mb-3">
                {aiChatMessages.map((m, i) => (
                  <div key={i} className={`flex gap-2 ${m.role==='user'?'justify-end':'justify-start'}`}>
                    {m.role==='assistant' && <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center shrink-0 mt-0.5"><Bot size={11} className="text-white"/></div>}
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${m.role==='user'?'bg-violet-500 text-white rounded-br-sm':'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-bl-sm'}`}>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>
                ))}
                {aiChatting && (
                  <div className="flex gap-2"><div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center shrink-0"><Bot size={11} className="text-white"/></div>
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-1.5">
                      <Loader2 size={11} className="animate-spin text-violet-500"/>
                      {[0,1,2].map(i => <div key={i} className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{animationDelay:`${i*0.1}s`}}/>)}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef}/>
              </div>
              <div className="flex gap-2">
                <input value={aiChatInput} onChange={e => setAiChatInput(e.target.value)} onKeyDown={e => e.key==='Enter' && sendAIChat()}
                  placeholder="Pregúntame sobre tu agenda, viajes o tareas..."
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"/>
                <button onClick={sendAIChat} disabled={aiChatting || !aiChatInput.trim()} className="p-2.5 bg-violet-500 hover:bg-violet-600 text-white rounded-xl disabled:opacity-40 transition-all">
                  {aiChatting ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BOARD ─────────────────────────────────────────────────── */}
      {view === 'board' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { id: 'urgent', label: '🔴 Urgentes', filter: (t: Task) => !t.completed && t.priority==='urgent', color: 'border-red-300 dark:border-red-500/30' },
            { id: 'pending', label: '⏳ Pendientes', filter: (t: Task) => !t.completed && t.priority!=='urgent', color: 'border-amber-300 dark:border-amber-500/30' },
            { id: 'done', label: '✅ Hechas', filter: (t: Task) => t.completed, color: 'border-emerald-300 dark:border-emerald-500/30' },
          ].map(col => (
            <div key={col.id} className={`bg-white dark:bg-slate-800 rounded-2xl border-2 ${col.color} overflow-hidden`}>
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <p className="font-black text-sm text-slate-700 dark:text-slate-200">{col.label}</p>
                <p className="text-xs text-slate-400">{tasks.filter(col.filter).length} tareas</p>
              </div>
              <div className="p-3 space-y-2 min-h-[200px] max-h-[500px] overflow-y-auto">
                {tasks.filter(col.filter).map(task => (
                  <div key={task.id} className="group bg-slate-50 dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all">
                    <div className="flex items-start gap-2">
                      <button onClick={() => onToggleTask(task.id)} className="mt-0.5 shrink-0">
                        {task.completed ? <CheckCircle2 size={15} className="text-emerald-500"/> : <Circle size={15} className="text-slate-300 hover:text-violet-500"/>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold leading-snug ${task.completed?'line-through text-slate-400':'text-slate-700 dark:text-slate-200'}`}>{task.title}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`}/>
                          {task.dueDate && <span className="text-[9px] text-slate-400 flex items-center gap-0.5"><Clock size={8}/>{new Date(task.dueDate+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setPomodoroTask(task.id); setShowPomo(true); }} className="p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"><PlayCircle size={11}/></button>
                        <button onClick={() => onDeleteTask(task.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"><Trash2 size={11}/></button>
                      </div>
                    </div>
                  </div>
                ))}
                {tasks.filter(col.filter).length === 0 && <p className="text-xs text-slate-300 dark:text-slate-600 text-center py-6 font-bold">Sin tareas</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── FOCUS / POMODORO ─────────────────────────────────────── */}
      {view === 'focus' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-500/10 dark:to-rose-500/5 rounded-2xl border border-red-200 dark:border-red-500/20 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-md shadow-red-500/25">
                  <PlayCircle size={20} className="text-white"/>
                </div>
                <div>
                  <p className="font-black text-red-700 dark:text-red-400">Modo Focus — Pomodoro</p>
                  <p className="text-xs text-red-400/70">25 min trabajo · 5 min descanso</p>
                </div>
              </div>
              <button onClick={() => { setPomodoroTask(null); setShowPomo(true); }}
                className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold text-sm rounded-xl shadow-md transition-all">
                ▶ Iniciar
              </button>
            </div>
          </div>

          {/* Tasks to focus on */}
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Elige una tarea para el pomodoro:</p>
          <div className="space-y-2">
            {tasks.filter(t => !t.completed).slice(0, 8).map(task => (
              <div key={task.id} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer hover:shadow-md transition-all ${PRIORITY_COLORS[task.priority]}`}
                onClick={() => { setPomodoroTask(task.id); setShowPomo(true); }}>
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`}/>
                <span className="flex-1 text-sm font-bold text-slate-800 dark:text-white truncate">{task.title}</span>
                <PlayCircle size={16} className="text-red-400 shrink-0"/>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkPlannerView;
