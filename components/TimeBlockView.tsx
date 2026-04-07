
import { callAI } from '../services/aiProxy';
import { cfg } from '../services/config';
const OPENROUTER_KEY = cfg.openrouterKey();
import React, { useState, useEffect, useCallback } from 'react';
import { CalendarEvent, Task, VipTask } from '../types';
import {
  Clock, Zap, CheckCircle2, AlertTriangle, Calendar,
  RefreshCw, ChevronRight, Brain, Coffee, Moon, Sun,
  Sunrise, Sunset, Play, Star, Target, TrendingUp,
  Battery, Shield, Loader
} from 'lucide-react';

interface TimeBlockViewProps {
  calendarEvents?: CalendarEvent[];
  tasks?: Task[];
  session?: any;
}

interface TimeBlock {
  hour: number;
  type: 'free' | 'busy' | 'suggested' | 'break';
  label: string;
  duration: number; // minutes
  taskId?: string;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  color?: string;
}

interface AIAdvice {
  overallScore: number; // 0-100
  freeHours: number;
  busyHours: number;
  overloaded: boolean;
  suggestions: string[];
  urgentTasks: string[];
  bestFocusWindow: string;
  warning?: string;
}

const ICAL_URL = 'https://calendar.google.com/calendar/ical/carlosgalera2roman%40gmail.com/public/basic.ics';

const HOUR_LABELS: Record<number, { label: string; icon: React.FC<any> }> = {
  6:  { label: 'Amanecer',   icon: Sunrise },
  7:  { label: 'Mañana',     icon: Sunrise },
  8:  { label: 'Mañana',     icon: Sun },
  9:  { label: 'Mañana',     icon: Sun },
  10: { label: 'Mañana',     icon: Sun },
  11: { label: 'Mañana',     icon: Sun },
  12: { label: 'Mediodía',   icon: Sun },
  13: { label: 'Mediodía',   icon: Sun },
  14: { label: 'Tarde',      icon: Sunset },
  15: { label: 'Tarde',      icon: Sunset },
  16: { label: 'Tarde',      icon: Sunset },
  17: { label: 'Tarde',      icon: Sunset },
  18: { label: 'Tarde',      icon: Sunset },
  19: { label: 'Noche',      icon: Moon },
  20: { label: 'Noche',      icon: Moon },
  21: { label: 'Noche',      icon: Moon },
  22: { label: 'Noche',      icon: Moon },
};

function getDayName(offset: number): string {
  const days = ['Hoy', 'Mañana', 'Pasado', 'En 3d', 'En 4d', 'En 5d', 'En 6d'];
  return days[offset] || `En ${offset}d`;
}

function getDateLabel(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

function getWeekEvents(events: CalendarEvent[]): Record<number, CalendarEvent[]> {
  const result: Record<number, CalendarEvent[]> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() + i);
    result[i] = events.filter(ev => {
      const evDate = new Date(ev.start);
      evDate.setHours(0, 0, 0, 0);
      return evDate.getTime() === day.getTime();
    });
  }
  return result;
}

function analyzeDay(events: CalendarEvent[], tasks: Task[], vipTasks: VipTask[]): AIAdvice {
  const busyHours = events.length * 1.5;
  const freeHours = Math.max(0, 14 - busyHours);
  const pendingTasks = tasks.filter(t => !t.completed);
  const urgentVip = vipTasks.filter(v => !v.completed && (v.priority === 'urgent' || v.priority === 'high'));
  const overloaded = freeHours < 2 || pendingTasks.length > 8;

  const suggestions: string[] = [];
  if (freeHours > 4) suggestions.push('Tienes buen margen — ideal para tareas de concentración profunda');
  if (freeHours < 2) suggestions.push('Día muy cargado — delega o pospón tareas no urgentes');
  if (urgentVip.length > 0) suggestions.push(`${urgentVip.length} tarea(s) VIP urgente(s) pendientes`);
  if (pendingTasks.length > 5) suggestions.push('Muchas tareas pendientes — considera hacer un mini-sprint de 25 min');
  if (events.length === 0) suggestions.push('Sin eventos programados — bloque perfecto para trabajo profundo');

  const focusHours = freeHours > 3 ? '9:00–12:00' : freeHours > 1 ? '16:00–18:00' : 'Sin ventana clara hoy';

  return {
    overallScore: Math.round(Math.min(100, (freeHours / 8) * 100)),
    freeHours: Math.round(freeHours * 10) / 10,
    busyHours: Math.round(busyHours * 10) / 10,
    overloaded,
    suggestions,
    urgentTasks: urgentVip.slice(0, 3).map(v => v.title),
    bestFocusWindow: focusHours,
    warning: overloaded ? 'Riesgo de sobrecarga — revisa tu agenda' : undefined,
  };
}

function buildTimeBlocks(events: CalendarEvent[], tasks: Task[]): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  const busyHours = new Set<number>();

  events.forEach(ev => {
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    for (let h = start.getHours(); h < end.getHours(); h++) {
      busyHours.add(h);
    }
    blocks.push({
      hour: start.getHours(),
      type: 'busy',
      label: ev.title,
      duration: Math.max(30, (end.getTime() - start.getTime()) / 60000),
      color: ev.type === 'work' ? 'indigo' : ev.type === 'fitness' ? 'emerald' : 'violet',
    });
  });

  const pendingTasks = tasks.filter(t => !t.completed).slice(0, 4);
  const freeSlots = [9, 10, 11, 15, 16, 17, 19, 20].filter(h => !busyHours.has(h));

  pendingTasks.forEach((task, i) => {
    const hour = freeSlots[i];
    if (!hour) return;
    blocks.push({
      hour,
      type: 'suggested',
      label: task.title,
      duration: task.duration || 30,
      taskId: task.id,
      priority: task.priority as any,
      color: task.priority === 'high' ? 'amber' : 'blue',
    });
  });

  // Break suggestions
  if (!busyHours.has(13)) blocks.push({ hour: 13, type: 'break', label: 'Descanso comida', duration: 60, color: 'slate' });
  if (!busyHours.has(18)) blocks.push({ hour: 18, type: 'break', label: 'Pausa activa', duration: 20, color: 'emerald' });

  return blocks.sort((a, b) => a.hour - b.hour);
}

const TimeBlockView: React.FC<TimeBlockViewProps> = ({ calendarEvents = [], tasks = [], session }) => {
  const [selectedDay, setSelectedDay] = useState(0);
  const [vipTasks, setVipTasks] = useState<VipTask[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiPlan, setAiPlan] = useState<string>('');
  const [showAIPlan, setShowAIPlan] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('filehub_vip_tasks');
      if (raw) setVipTasks(JSON.parse(raw));
    } catch {}
  }, []);

  const weekEvents = getWeekEvents(calendarEvents);
  const todayEvents = weekEvents[selectedDay] || [];
  const pendingTasks = tasks.filter(t => !t.completed);
  const advice = analyzeDay(todayEvents, pendingTasks, vipTasks);
  const blocks = buildTimeBlocks(todayEvents, pendingTasks);

  const generateAIPlan = useCallback(async () => {
    setIsLoadingAI(true);
    setShowAIPlan(true);
    try {
      const prompt = `Soy médico de familia. Analiza mi día y crea un plan optimizado:

EVENTOS HOY: ${todayEvents.length > 0 ? todayEvents.map(e => `- ${e.title} (${new Date(e.start).getHours()}:00)`).join('\n') : 'Sin eventos'}

TAREAS PENDIENTES: ${pendingTasks.slice(0, 8).map(t => `- [${t.priority}] ${t.title}`).join('\n') || 'Sin tareas'}

TAREAS VIP URGENTES: ${vipTasks.filter(v => !v.completed && v.priority === 'urgent').map(v => `- ${v.title}`).join('\n') || 'Ninguna'}

Crea un plan horario realista para hoy con:
1. Bloques de trabajo profundo (máx 90 min seguidos)
2. Pausas obligatorias cada 90 min
3. Orden de tareas por urgencia/impacto
4. Estimación de tiempo libre al final del día
5. Un consejo de productividad personalizado

Sé concreto con horas. Responde en español, máximo 200 palabras.`;

      const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_KEY || '';
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'HTTP-Referer': 'https://ramongalera22-ai.github.io/FILEHUB-IA',
          'X-Title': 'FILEHUB IA',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-haiku-4.5',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || 'No se pudo generar el plan';
      setAiPlan(text);
    } catch {
      setAiPlan('Error al conectar con IA. Verifica tu conexión.');
    } finally {
      setIsLoadingAI(false);
    }
  }, [todayEvents, pendingTasks, vipTasks]);

  const scoreColor = advice.overallScore > 60 ? 'text-emerald-400' : advice.overallScore > 30 ? 'text-amber-400' : 'text-red-400';
  const scoreBg = advice.overallScore > 60 ? 'bg-emerald-500' : advice.overallScore > 30 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8fafc] dark:bg-slate-950 p-4 md:p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <Brain size={24} className="text-indigo-500" />
            Asesor de Tiempo IA
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Cruza tu calendario, tareas y tiempo libre para optimizar tu día</p>
        </div>
        <button
          onClick={generateAIPlan}
          disabled={isLoadingAI}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-indigo-900/20"
        >
          {isLoadingAI ? <Loader size={16} className="animate-spin" /> : <Zap size={16} />}
          {isLoadingAI ? 'Generando...' : 'Plan IA del Día'}
        </button>
      </div>

      {/* Day selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {Array.from({ length: 7 }, (_, i) => {
          const evCount = (weekEvents[i] || []).length;
          return (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              className={`flex-shrink-0 flex flex-col items-center px-4 py-3 rounded-2xl border transition-all ${
                selectedDay === i
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-indigo-500/40'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-widest">{getDayName(i)}</span>
              <span className="text-xs font-semibold mt-0.5 opacity-70">{getDateLabel(i)}</span>
              {evCount > 0 && (
                <span className={`text-[10px] font-black mt-1 px-1.5 py-0.5 rounded-full ${selectedDay === i ? 'bg-white/20' : 'bg-indigo-500/10 text-indigo-500'}`}>
                  {evCount} ev.
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Tiempo libre', value: `${advice.freeHours}h`, icon: Battery, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Ocupado', value: `${advice.busyHours}h`, icon: Shield, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'Tareas pend.', value: pendingTasks.length, icon: CheckCircle2, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Mejor foco', value: advice.bestFocusWindow, icon: Target, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/60 dark:border-white/5 shadow-sm">
            <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center mb-2`}>
              <stat.icon size={18} className={stat.color} />
            </div>
            <div className="text-xl font-black text-slate-800 dark:text-white">{stat.value}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Score + warnings */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-black text-slate-800 dark:text-white text-base">Índice de Disponibilidad</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{getDayName(selectedDay)} — {getDateLabel(selectedDay)}</p>
          </div>
          <div className={`text-3xl font-black ${scoreColor}`}>{advice.overallScore}%</div>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 mb-4">
          <div className={`h-2.5 rounded-full transition-all ${scoreBg}`} style={{ width: `${advice.overallScore}%` }} />
        </div>
        {advice.warning && (
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-3">
            <AlertTriangle size={16} className="text-amber-400 shrink-0" />
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{advice.warning}</span>
          </div>
        )}
        <div className="space-y-2">
          {advice.suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-2">
              <ChevronRight size={14} className="text-indigo-400 shrink-0 mt-0.5" />
              <span className="text-xs text-slate-600 dark:text-slate-400">{s}</span>
            </div>
          ))}
        </div>
        {advice.urgentTasks.length > 0 && (
          <div className="mt-4 p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
            <p className="text-[11px] font-black text-red-400 uppercase tracking-widest mb-2">🔴 Tareas VIP urgentes</p>
            {advice.urgentTasks.map((t, i) => (
              <div key={i} className="flex items-center gap-2 mb-1">
                <Star size={12} className="text-red-400 shrink-0" />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{t}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Timeline */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm p-5">
          <h2 className="font-black text-slate-800 dark:text-white text-base mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-indigo-400" />
            Timeline del Día
          </h2>
          {blocks.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Clock size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Día libre — sin eventos ni tareas</p>
              <p className="text-xs mt-1 opacity-70">Perfecto para trabajo profundo</p>
            </div>
          ) : (
            <div className="space-y-2">
              {blocks.map((block, i) => {
                const hourInfo = HOUR_LABELS[block.hour];
                const HourIcon = hourInfo?.icon || Clock;
                const blockColors = {
                  busy: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400',
                  suggested: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400',
                  break: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
                  free: 'bg-slate-100 dark:bg-slate-800 border-slate-200/60 dark:border-white/5 text-slate-500',
                };
                return (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${blockColors[block.type]}`}>
                    <div className="text-center shrink-0 w-12">
                      <div className="text-sm font-black">{block.hour}:00</div>
                      <HourIcon size={12} className="mx-auto mt-0.5 opacity-60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">{block.label}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{block.duration} min · {block.type === 'busy' ? 'Evento' : block.type === 'suggested' ? 'Sugerida' : 'Pausa'}</div>
                    </div>
                    {block.type === 'suggested' && (
                      <Play size={12} className="shrink-0 opacity-60" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending tasks ranked */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm p-5">
          <h2 className="font-black text-slate-800 dark:text-white text-base mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-400" />
            Tareas por Prioridad
          </h2>
          {pendingTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <CheckCircle2 size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">¡Sin tareas pendientes!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...pendingTasks]
                .sort((a, b) => {
                  const order = { high: 0, medium: 1, low: 2 };
                  return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
                })
                .slice(0, 10)
                .map((task, i) => {
                  const prioColors = {
                    high: 'text-red-500 bg-red-500/10',
                    medium: 'text-amber-500 bg-amber-500/10',
                    low: 'text-slate-400 bg-slate-100 dark:bg-slate-800',
                  };
                  return (
                    <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <span className="text-[11px] font-black text-slate-400 w-5 shrink-0">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate block">{task.title}</span>
                        <span className="text-[10px] text-slate-400">{task.category} · {task.duration || 30}min</span>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${prioColors[task.priority] || prioColors.low}`}>
                        {task.priority}
                      </span>
                    </div>
                  );
                })}
              {pendingTasks.length > 10 && (
                <p className="text-xs text-slate-400 text-center pt-1">+{pendingTasks.length - 10} más</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AI Plan panel */}
      {showAIPlan && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-indigo-500/30 shadow-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Brain size={16} className="text-white" />
            </div>
            <h2 className="font-black text-slate-800 dark:text-white">Plan IA Personalizado</h2>
          </div>
          {isLoadingAI ? (
            <div className="flex items-center gap-3 py-6 justify-center text-slate-400">
              <Loader size={20} className="animate-spin text-indigo-400" />
              <span className="text-sm">Analizando tu agenda...</span>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-300 font-sans leading-relaxed bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                {aiPlan}
              </pre>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button
              onClick={generateAIPlan}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors"
            >
              <RefreshCw size={12} /> Regenerar
            </button>
            <button
              onClick={() => setShowAIPlan(false)}
              className="px-3 py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Cron tip */}
      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4 flex gap-3">
        <Coffee size={18} className="text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Resumen diario automático</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            El bot te envía este análisis cada mañana a las 7:30h. Configúralo en <strong className="text-slate-600 dark:text-slate-300">Cron Jobs Bot</strong> con schedule <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded font-mono text-[11px]">0 7 * * *</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TimeBlockView;
