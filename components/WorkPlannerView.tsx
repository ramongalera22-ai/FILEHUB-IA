import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Brain, Calendar, Clock, CheckCircle2, Circle, ChevronRight,
  Plus, Trash2, Star, Shield, AlertTriangle, Zap, Target,
  PlayCircle, PauseCircle, StopCircle, RotateCcw, Coffee,
  TrendingUp, Lightbulb, ChevronDown, ChevronUp, Flame,
  CheckSquare, BarChart3, Move, ArrowUp, ArrowDown, Sparkles
} from 'lucide-react';
import { Task, CalendarEvent } from '../types';
import { supabase } from '../services/supabaseClient';

// ─── TYPES ────────────────────────────────────────────────────
interface PlannedSlot {
  id: string;
  taskId: string;
  date: string;
  startTime: string; // "09:00"
  duration: number;  // minutes
  done: boolean;
}

interface WorkPlannerProps {
  tasks: Task[];
  events: CalendarEvent[];
  onAddTask: (t: Task) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  session?: any;
}

// ─── UTILS ────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0];

const addDays = (dateStr: string, n: number) => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

const fmtDate = (dateStr: string) =>
  new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

const isGuardiaDay = (dateStr: string, events: CalendarEvent[]) =>
  events.some(e => e.start.startsWith(dateStr) && e.title.toLowerCase().includes('guardia'));

const isBlockedDay = (dateStr: string, events: CalendarEvent[]) => {
  if (isGuardiaDay(dateStr, events)) return true;
  // Morning after guardia is blocked
  const prev = addDays(dateStr, -1);
  if (isGuardiaDay(prev, events)) return true;
  return false;
};

const getBlockReason = (dateStr: string, events: CalendarEvent[]) => {
  if (isGuardiaDay(dateStr, events)) return 'Guardia 24h — día bloqueado';
  const prev = addDays(dateStr, -1);
  if (isGuardiaDay(prev, events)) return 'Mañana post-guardia — recuperación';
  return null;
};

const PRIORITY_SCORE: Record<string, number> = { urgent: 100, high: 70, medium: 40, low: 10 };
const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-red-500 bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/30',
  high:   'text-orange-500 bg-orange-50 dark:bg-orange-500/10 border-orange-300 dark:border-orange-500/30',
  medium: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30',
  low:    'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30',
};
const PRIORITY_LABELS: Record<string, string> = { urgent: '🔴 Urgente', high: '🟠 Alta', medium: '🟡 Media', low: '🟢 Baja' };

// ─── POMODORO ────────────────────────────────────────────────
const PomodoroTimer: React.FC<{ taskTitle?: string; onClose: () => void }> = ({ taskTitle, onClose }) => {
  const MODES = [
    { id: 'work', label: 'Trabajo', duration: 25 * 60, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' },
    { id: 'short', label: 'Descanso corto', duration: 5 * 60, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { id: 'long', label: 'Descanso largo', duration: 15 * 60, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  ];
  const [modeIdx, setModeIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(MODES[0].duration);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const intervalRef = useRef<any>(null);

  const mode = MODES[modeIdx];
  const pct = ((mode.duration - timeLeft) / mode.duration) * 100;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            setRunning(false);
            clearInterval(intervalRef.current);
            if (modeIdx === 0) setCycles(c => c + 1);
            // Browser notification if permitted
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('⏰ FileHub Pomodoro', {
                body: modeIdx === 0 ? '¡25 min completados! Tómate un descanso.' : '¡Descanso terminado! A trabajar.',
              });
            }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, modeIdx]);

  const switchMode = (idx: number) => {
    setModeIdx(idx);
    setTimeLeft(MODES[idx].duration);
    setRunning(false);
    clearInterval(intervalRef.current);
  };

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');

  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Mode tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800">
          {MODES.map((m, i) => (
            <button key={m.id} onClick={() => switchMode(i)}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all ${modeIdx === i ? `${m.color} border-b-2 border-current` : 'text-slate-400 hover:text-slate-600'}`}>
              {m.label}
            </button>
          ))}
        </div>

        <div className="p-8 flex flex-col items-center gap-6">
          {taskTitle && (
            <p className="text-xs font-bold text-slate-500 text-center truncate max-w-full">
              🎯 {taskTitle}
            </p>
          )}

          {/* Circle timer */}
          <div className="relative w-36 h-36">
            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-800" />
              <circle cx="60" cy="60" r="54" fill="none" strokeWidth="8"
                stroke={modeIdx === 0 ? '#ef4444' : modeIdx === 1 ? '#10b981' : '#3b82f6'}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 1s linear' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-slate-800 dark:text-white font-mono">{mins}:{secs}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{mode.label}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <button onClick={() => { setTimeLeft(mode.duration); setRunning(false); clearInterval(intervalRef.current); }}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <RotateCcw size={20} />
            </button>
            <button onClick={() => setRunning(r => !r)}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 ${mode.bg}`}>
              {running
                ? <PauseCircle size={36} className={mode.color} />
                : <PlayCircle size={36} className={mode.color} />
              }
            </button>
            <div className="flex items-center gap-1 text-amber-500">
              {Array.from({ length: Math.min(cycles, 4) }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-amber-400" />
              ))}
              {Array.from({ length: Math.max(0, 4 - cycles) }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700" />
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-400">{cycles} pomodoro{cycles !== 1 ? 's' : ''} completado{cycles !== 1 ? 's' : ''} hoy</p>

          <button onClick={onClose} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
            Cerrar timer
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────
const WorkPlannerView: React.FC<WorkPlannerProps> = ({
  tasks, events, onAddTask, onToggleTask, onDeleteTask, session
}) => {
  const [slots, setSlots] = useState<PlannedSlot[]>(() => {
    const saved = localStorage.getItem('filehub_planner_slots');
    return saved ? JSON.parse(saved) : [];
  });
  const [view, setView] = useState<'week' | 'ai' | 'board'>('week');
  const [pomodoroTask, setPomodoroTask] = useState<string | null>(null);
  const [showPomo, setShowPomo] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'high', duration: 60, dueDate: '' });
  const [showAddTask, setShowAddTask] = useState(false);
  const [dragTask, setDragTask] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Build 7-day window from today
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(todayStr(), i);
      days.push({
        date: d,
        label: fmtDate(d),
        isToday: d === todayStr(),
        blocked: isBlockedDay(d, events),
        blockReason: getBlockReason(d, events),
        isGuardia: isGuardiaDay(d, events),
        slots: slots.filter(s => s.date === d),
      });
    }
    return days;
  }, [slots, events]);

  // AI suggestion: sort pending tasks by priority + due date, assign to free days
  const aiSuggestions = useMemo(() => {
    const pending = tasks.filter(t => !t.completed);
    const scored = pending.map(t => {
      let score = PRIORITY_SCORE[t.priority] || 40;
      if (t.dueDate) {
        const daysUntil = Math.ceil((new Date(t.dueDate + 'T12:00:00').getTime() - Date.now()) / 86400000);
        if (daysUntil <= 0) score += 60;
        else if (daysUntil <= 2) score += 40;
        else if (daysUntil <= 7) score += 20;
      }
      return { ...t, score };
    }).sort((a, b) => b.score - a.score);

    // Assign to days
    const suggestions: { task: typeof scored[0]; date: string; reason: string }[] = [];
    let dayIndex = 0;

    for (const task of scored.slice(0, 10)) {
      // Skip blocked days
      while (dayIndex < 7 && weekDays[dayIndex]?.blocked) dayIndex++;
      if (dayIndex >= 7) break;

      const day = weekDays[dayIndex];
      const alreadyAssigned = slots.filter(s => s.date === day.date).length;
      if (alreadyAssigned >= 4) dayIndex++;

      const reasons: string[] = [];
      if (task.priority === 'urgent') reasons.push('urgente');
      if (task.dueDate) {
        const d = Math.ceil((new Date(task.dueDate + 'T12:00:00').getTime() - Date.now()) / 86400000);
        if (d <= 0) reasons.push('vencida');
        else if (d <= 2) reasons.push(`vence en ${d}d`);
      }
      if (task.score > 80) reasons.push('alta prioridad');

      suggestions.push({ task, date: day.date, reason: reasons.join(' · ') || 'planificada por IA' });
      if (alreadyAssigned + 1 >= 4) dayIndex++;
    }

    return suggestions;
  }, [tasks, slots, weekDays]);

  const saveSlots = (updated: PlannedSlot[]) => {
    setSlots(updated);
    localStorage.setItem('filehub_planner_slots', JSON.stringify(updated));
  };

  const addSlot = (taskId: string, date: string) => {
    const slot: PlannedSlot = {
      id: `slot_${Date.now()}`,
      taskId,
      date,
      startTime: '09:00',
      duration: 60,
      done: false,
    };
    saveSlots([...slots, slot]);
  };

  const removeSlot = (slotId: string) => saveSlots(slots.filter(s => s.id !== slotId));

  const addNewTask = () => {
    if (!newTask.title.trim()) return;
    const t: Task = {
      id: `task_${Date.now()}`,
      title: newTask.title.trim(),
      completed: false,
      category: 'work',
      priority: newTask.priority as Task['priority'],
      dueDate: newTask.dueDate || undefined,
      duration: newTask.duration,
    };
    onAddTask(t);
    setNewTask({ title: '', priority: 'high', duration: 60, dueDate: '' });
    setShowAddTask(false);
  };

  // KPIs
  const pending = tasks.filter(t => !t.completed).length;
  const done = tasks.filter(t => t.completed).length;
  const urgent = tasks.filter(t => t.priority === 'urgent' && !t.completed).length;
  const plannedToday = slots.filter(s => s.date === todayStr()).length;

  return (
    <div className="space-y-6">
      {/* POMODORO MODAL */}
      {showPomo && (
        <PomodoroTimer
          taskTitle={tasks.find(t => t.id === pomodoroTask)?.title}
          onClose={() => { setShowPomo(false); setPomodoroTask(null); }}
        />
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Brain size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Planificador IA
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Organización inteligente · Guardias detectadas automáticamente
            </p>
          </div>
        </div>
        <button onClick={() => setShowAddTask(!showAddTask)}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-violet-500/25 hover:scale-105 transition-all">
          <Plus size={18} /> Nueva tarea
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pendientes', value: pending, icon: Circle, color: 'from-slate-500 to-slate-600' },
          { label: 'Completadas', value: done, icon: CheckCircle2, color: 'from-emerald-500 to-teal-600' },
          { label: 'Urgentes', value: urgent, icon: AlertTriangle, color: 'from-red-500 to-rose-600' },
          { label: 'Planif. hoy', value: plannedToday, icon: Calendar, color: 'from-violet-500 to-indigo-600' },
        ].map(k => (
          <div key={k.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
            <div className={`w-9 h-9 bg-gradient-to-br ${k.color} rounded-xl flex items-center justify-center mb-2 shadow`}>
              <k.icon size={16} className="text-white" />
            </div>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{k.value}</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{k.label}</p>
          </div>
        ))}
      </div>

      {/* ADD TASK FORM */}
      {showAddTask && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-400/40 shadow-xl p-6">
          <h3 className="font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Zap size={16} className="text-violet-500" /> Añadir tarea al planificador
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && addNewTask()}
              placeholder="¿Qué tienes que hacer?"
              className="sm:col-span-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400" />
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Prioridad</label>
              <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-violet-500/20">
                <option value="urgent">🔴 Urgente</option>
                <option value="high">🟠 Alta</option>
                <option value="medium">🟡 Media</option>
                <option value="low">🟢 Baja</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Fecha límite</label>
              <input type="date" value={newTask.dueDate} onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/20" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Duración estimada</label>
              <select value={newTask.duration} onChange={e => setNewTask({ ...newTask, duration: +e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-violet-500/20">
                <option value={25}>25 min (1 pomodoro)</option>
                <option value={50}>50 min (2 pomodoros)</option>
                <option value={60}>1 hora</option>
                <option value={120}>2 horas</option>
                <option value={180}>3 horas</option>
                <option value={240}>Medio día</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={addNewTask}
              className="flex-1 bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-black py-3 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-violet-500/20">
              ✓ Añadir y planificar
            </button>
            <button onClick={() => setShowAddTask(false)}
              className="px-4 bg-slate-100 dark:bg-slate-700 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-all">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* VIEW TABS */}
      <div className="flex gap-2 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl w-fit">
        {[
          { id: 'week', label: '📅 Semana', icon: Calendar },
          { id: 'ai', label: '🤖 Sugerencias IA', icon: Brain },
          { id: 'board', label: '📋 Tablero', icon: CheckSquare },
        ].map(t => (
          <button key={t.id} onClick={() => setView(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              view === t.id ? 'bg-white dark:bg-slate-800 text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── WEEK VIEW ─────────────────────────────────── */}
      {view === 'week' && (
        <div className="space-y-3">
          {weekDays.map(day => (
            <div key={day.date} className={`rounded-2xl border overflow-hidden transition-all ${
              day.blocked
                ? 'border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5'
                : day.isToday
                  ? 'border-violet-400/60 bg-violet-50/30 dark:bg-violet-500/5 shadow-md shadow-violet-500/10'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
            }`}>
              {/* Day header */}
              <div
                className="flex items-center justify-between px-5 py-3 cursor-pointer"
                onClick={() => setExpandedDay(expandedDay === day.date ? null : day.date)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-xs font-black shadow-sm ${
                    day.blocked ? 'bg-red-500 text-white' :
                    day.isToday ? 'bg-violet-500 text-white shadow-violet-500/25' :
                    'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    <span className="text-[10px] uppercase leading-none">
                      {new Date(day.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short' })}
                    </span>
                    <span className="text-base leading-tight">
                      {new Date(day.date + 'T12:00:00').getDate()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`font-black text-sm ${day.isToday ? 'text-violet-600 dark:text-violet-400' : 'text-slate-700 dark:text-slate-200'}`}>
                        {day.isToday ? 'Hoy' : fmtDate(day.date)}
                      </p>
                      {day.blocked && (
                        <span className="flex items-center gap-1 text-[10px] font-black bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-lg">
                          <Shield size={9} /> {day.blockReason}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {day.blocked ? 'No disponible' : `${day.slots.length} tarea${day.slots.length !== 1 ? 's' : ''} planificada${day.slots.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!day.blocked && (
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map(i => (
                        <div key={i} className={`w-2 h-2 rounded-full ${i < day.slots.length ? 'bg-violet-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                      ))}
                    </div>
                  )}
                  {expandedDay === day.date ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
              </div>

              {/* Expanded content */}
              {expandedDay === day.date && (
                <div className="border-t border-slate-100 dark:border-slate-700 p-4 space-y-3">
                  {day.blocked ? (
                    <div className="flex items-center gap-3 py-4 justify-center text-red-400">
                      <Shield size={20} />
                      <div>
                        <p className="font-bold text-sm">{day.blockReason}</p>
                        <p className="text-xs text-red-300">Este día no es posible planificar tareas</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Planned slots */}
                      {day.slots.map(slot => {
                        const task = tasks.find(t => t.id === slot.taskId);
                        if (!task) return null;
                        const pConf = PRIORITY_COLORS[task.priority] || '';
                        return (
                          <div key={slot.id} className={`flex items-center gap-3 p-3 rounded-xl border ${pConf}`}>
                            <button onClick={() => onToggleTask(task.id)} className="shrink-0">
                              {task.completed ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Circle size={20} className="text-slate-300" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-bold truncate ${task.completed ? 'line-through text-slate-400' : ''}`}>
                                {task.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Clock size={9} /> {slot.duration} min
                                </span>
                                <span className="text-[10px] font-bold">{PRIORITY_LABELS[task.priority]}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => { setPomodoroTask(task.id); setShowPomo(true); }}
                                className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 text-red-400 transition-colors" title="Pomodoro">
                                <PlayCircle size={16} />
                              </button>
                              <button onClick={() => removeSlot(slot.id)}
                                className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 text-slate-400 hover:text-red-500 transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Add task to this day */}
                      <div className="mt-2">
                        <select onChange={e => { if (e.target.value) { addSlot(e.target.value, day.date); e.target.value = ''; } }}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-dashed border-violet-300 dark:border-violet-500/30 rounded-xl px-3 py-2.5 text-sm text-slate-500 focus:ring-2 focus:ring-violet-500/20 cursor-pointer">
                          <option value="">+ Añadir tarea a este día...</option>
                          {tasks.filter(t => !t.completed && !slots.some(s => s.date === day.date && s.taskId === t.id)).map(t => (
                            <option key={t.id} value={t.id}>
                              {PRIORITY_LABELS[t.priority].split(' ')[0]} {t.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── AI SUGGESTIONS VIEW ───────────────────────── */}
      {view === 'ai' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-500/10 dark:to-indigo-500/5 rounded-2xl border border-violet-200 dark:border-violet-500/20 p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-violet-500 rounded-xl flex items-center justify-center shadow-md shadow-violet-500/25 shrink-0">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-black text-violet-700 dark:text-violet-400 mb-1">Plan inteligente de la semana</h3>
                <p className="text-xs text-violet-600/70 dark:text-violet-400/70 leading-relaxed">
                  La IA ha analizado tus tareas pendientes, prioridades y fechas límite. Los días de guardia (24h) y
                  las mañanas posteriores están bloqueados automáticamente. Se sugiere el orden óptimo para tu semana.
                </p>
              </div>
            </div>
          </div>

          {/* Blocked days warning */}
          {weekDays.filter(d => d.blocked).length > 0 && (
            <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-200 dark:border-red-500/20 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-red-600 mb-2 flex items-center gap-2">
                <Shield size={12} /> Días bloqueados esta semana
              </p>
              <div className="flex flex-wrap gap-2">
                {weekDays.filter(d => d.blocked).map(d => (
                  <span key={d.date} className="text-xs font-bold bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-xl">
                    🔴 {fmtDate(d.date)} — {d.blockReason}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions list */}
          {aiSuggestions.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <CheckCircle2 size={48} className="text-emerald-400 mb-4" />
              <p className="font-bold text-slate-600 dark:text-slate-300">¡Sin tareas pendientes!</p>
              <p className="text-xs text-slate-400 mt-1">Añade tareas para ver el plan inteligente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {aiSuggestions.map((s, i) => {
                const pConf = PRIORITY_COLORS[s.task.priority] || '';
                const alreadyPlanned = slots.some(sl => sl.taskId === s.task.id && sl.date === s.date);
                return (
                  <div key={s.task.id} className={`bg-white dark:bg-slate-800 rounded-2xl border p-4 flex items-start gap-4 ${pConf}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shadow-sm shrink-0 ${
                      i === 0 ? 'bg-amber-400 text-white' :
                      i === 1 ? 'bg-slate-400 text-white' :
                      'bg-orange-300 text-white'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-black text-sm text-slate-800 dark:text-white">{s.task.title}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold">{PRIORITY_LABELS[s.task.priority]}</span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Calendar size={9} /> {fmtDate(s.date)}
                            </span>
                            {s.reason && (
                              <span className="text-[10px] bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-lg font-bold">
                                💡 {s.reason}
                              </span>
                            )}
                          </div>
                        </div>
                        {!alreadyPlanned ? (
                          <button onClick={() => addSlot(s.task.id, s.date)}
                            className="shrink-0 px-3 py-2 bg-violet-500 hover:bg-violet-600 text-white text-xs font-black rounded-xl transition-all shadow-sm">
                            + Planificar
                          </button>
                        ) : (
                          <span className="shrink-0 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 rounded-xl">
                            ✓ Planificada
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Auto-plan button */}
          {aiSuggestions.length > 0 && (
            <button
              onClick={() => {
                const newSlots = [...slots];
                aiSuggestions.forEach(s => {
                  if (!newSlots.some(sl => sl.taskId === s.task.id && sl.date === s.date)) {
                    newSlots.push({ id: `slot_ai_${Date.now()}_${s.task.id}`, taskId: s.task.id, date: s.date, startTime: '09:00', duration: s.task.duration || 60, done: false });
                  }
                });
                saveSlots(newSlots);
              }}
              className="w-full py-4 bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-violet-500/20 hover:opacity-90 transition-all flex items-center justify-center gap-2">
              <Sparkles size={18} /> Aplicar plan completo de la IA
            </button>
          )}
        </div>
      )}

      {/* ── BOARD VIEW ────────────────────────────────── */}
      {view === 'board' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { id: 'pending', label: '⏳ Pendientes', color: 'border-amber-400/40', headerBg: 'bg-amber-50 dark:bg-amber-500/10', tasks: tasks.filter(t => !t.completed && t.priority !== 'urgent') },
            { id: 'urgent', label: '🔴 Urgentes', color: 'border-red-400/40', headerBg: 'bg-red-50 dark:bg-red-500/10', tasks: tasks.filter(t => !t.completed && t.priority === 'urgent') },
            { id: 'done', label: '✅ Completadas', color: 'border-emerald-400/40', headerBg: 'bg-emerald-50 dark:bg-emerald-500/10', tasks: tasks.filter(t => t.completed).slice(0, 10) },
          ].map(col => (
            <div key={col.id} className={`bg-white dark:bg-slate-800 rounded-2xl border-2 ${col.color} overflow-hidden`}>
              <div className={`${col.headerBg} px-4 py-3 border-b border-slate-100 dark:border-slate-700`}>
                <p className="font-black text-sm text-slate-700 dark:text-slate-200">{col.label}</p>
                <p className="text-xs text-slate-400">{col.tasks.length} tareas</p>
              </div>
              <div className="p-3 space-y-2 min-h-[200px] max-h-[500px] overflow-y-auto">
                {col.tasks.map(task => (
                  <div key={task.id} className="group bg-slate-50 dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all">
                    <div className="flex items-start gap-2">
                      <button onClick={() => onToggleTask(task.id)} className="mt-0.5 shrink-0">
                        {task.completed ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Circle size={16} className="text-slate-300 hover:text-violet-500" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold leading-snug ${task.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg border ${PRIORITY_COLORS[task.priority]}`}>
                            {PRIORITY_LABELS[task.priority]}
                          </span>
                          {task.dueDate && (
                            <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                              <Clock size={8} />
                              {new Date(task.dueDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setPomodoroTask(task.id); setShowPomo(true); }}
                          className="p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors" title="Pomodoro">
                          <PlayCircle size={12} />
                        </button>
                        <button onClick={() => onDeleteTask(task.id)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {col.tasks.length === 0 && (
                  <div className="flex items-center justify-center py-8 text-slate-300 dark:text-slate-600 text-xs font-bold">
                    Sin tareas aquí
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* POMODORO QUICK LAUNCH */}
      <div className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-500/10 dark:to-rose-500/5 rounded-2xl border border-red-200 dark:border-red-500/20 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-md shadow-red-500/25">
              <PlayCircle size={20} className="text-white" />
            </div>
            <div>
              <p className="font-black text-red-700 dark:text-red-400">Temporizador Pomodoro</p>
              <p className="text-xs text-red-400/70">25 min trabajo · 5 min descanso · modo focus</p>
            </div>
          </div>
          <button onClick={() => { setPomodoroTask(null); setShowPomo(true); }}
            className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold text-sm rounded-xl shadow-md shadow-red-500/20 transition-all">
            ▶ Iniciar
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkPlannerView;
