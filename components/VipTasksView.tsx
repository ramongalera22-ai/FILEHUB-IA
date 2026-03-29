import React, { useState, useEffect, useCallback } from 'react';
import {
  Star, Plus, Trash2, Check, Clock, Target, Flame,
  Calendar, Tag, AlertTriangle, ChevronDown, ChevronUp,
  Sparkles, Trophy, Flag, Repeat, Circle, CheckCircle2
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

// ============ TYPES ============
export interface VipTask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  category: 'diario' | 'semanal' | 'mensual' | 'anual' | 'objetivo';
  due_date?: string;
  is_recurring: boolean;
  frequency?: 'daily' | 'weekly' | 'monthly';
  created_at: string;
  user_id?: string;
  pinned?: boolean;
  tags?: string[];
}

interface VipTasksViewProps {
  session?: any;
}

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgente', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/30', dot: 'bg-red-500' },
  high:   { label: 'Alta',    color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/30', dot: 'bg-orange-500' },
  medium: { label: 'Media',   color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/30', dot: 'bg-amber-500' },
  low:    { label: 'Baja',    color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-500' },
};

const CATEGORY_CONFIG = {
  diario:   { label: 'Hoy',       icon: Flame,   color: 'bg-rose-500/20 text-rose-400' },
  semanal:  { label: 'Semana',    icon: Calendar, color: 'bg-blue-500/20 text-blue-400' },
  mensual:  { label: 'Mes',       icon: Target,  color: 'bg-purple-500/20 text-purple-400' },
  anual:    { label: 'Año',       icon: Trophy,  color: 'bg-amber-500/20 text-amber-400' },
  objetivo: { label: 'Objetivo',  icon: Flag,    color: 'bg-emerald-500/20 text-emerald-400' },
};

const VipTasksView: React.FC<VipTasksViewProps> = ({ session }) => {
  const [tasks, setTasks] = useState<VipTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<VipTask>>({
    title: '', description: '', priority: 'high', category: 'diario',
    is_recurring: false, frequency: undefined, due_date: '', completed: false
  });

  // ===== LOAD FROM SUPABASE =====
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      if (session) {
        const { data, error } = await supabase
          .from('vip_tasks')
          .select('*')
          .eq('user_id', session?.user?.id)
          .order('created_at', { ascending: false });
        if (!error && data) {
          setTasks(data);
          localStorage.setItem('filehub_vip_tasks', JSON.stringify(data));
          setLoading(false);
          return;
        }
      }
    } catch (e) {}
    // Fallback localStorage
    const saved = localStorage.getItem('filehub_vip_tasks');
    if (saved) setTasks(JSON.parse(saved));
    setLoading(false);
  }, [session]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // ===== SAVE HELPERS =====
  const persist = (updated: VipTask[]) => {
    setTasks(updated);
    localStorage.setItem('filehub_vip_tasks', JSON.stringify(updated));
  };

  const addTask = async () => {
    if (!form.title?.trim()) return;
    const t: VipTask = {
      id: `vip_${Date.now()}`,
      title: form.title!.trim(),
      description: form.description || '',
      completed: false,
      priority: form.priority as VipTask['priority'] || 'high',
      category: form.category as VipTask['category'] || 'diario',
      due_date: form.due_date || undefined,
      is_recurring: form.is_recurring || false,
      frequency: form.frequency,
      created_at: new Date().toISOString(),
      user_id: session?.user?.id,
      pinned: form.priority === 'urgent',
      tags: [],
    };
    const updated = [t, ...tasks];
    persist(updated);
    if (session) {
      await supabase.from('vip_tasks').insert({
        id: t.id, user_id: session?.user?.id, title: t.title,
        description: t.description, completed: t.completed,
        priority: t.priority, category: t.category,
        due_date: t.due_date || null, is_recurring: t.is_recurring,
        frequency: t.frequency || null, pinned: t.pinned,
        created_at: t.created_at
      });
    }
    setForm({ title: '', description: '', priority: 'high', category: 'diario', is_recurring: false, due_date: '', completed: false });
    setShowForm(false);
  };

  const toggleTask = async (id: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    persist(updated);
    if (session) {
      const task = tasks.find(t => t.id === id);
      await supabase.from('vip_tasks').update({ completed: !task?.completed }).eq('id', id);
    }
  };

  const deleteTask = async (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    persist(updated);
    if (session) await supabase.from('vip_tasks').delete().eq('id', id);
  };

  const togglePin = async (id: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, pinned: !t.pinned } : t);
    persist(updated);
    if (session) {
      const task = tasks.find(t => t.id === id);
      await supabase.from('vip_tasks').update({ pinned: !task?.pinned }).eq('id', id);
    }
  };

  // ===== COMPUTED =====
  const filtered = tasks.filter(t => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'pending') return !t.completed;
    if (activeCategory === 'done') return t.completed;
    return t.category === activeCategory;
  });

  const pinned = filtered.filter(t => t.pinned && !t.completed);
  const pending = filtered.filter(t => !t.completed && !t.pinned).sort((a, b) => {
    const order = { urgent: 0, high: 1, medium: 2, low: 3 };
    return order[a.priority] - order[b.priority];
  });
  const done = filtered.filter(t => t.completed);

  const stats = {
    total: tasks.length,
    done: tasks.filter(t => t.completed).length,
    urgent: tasks.filter(t => t.priority === 'urgent' && !t.completed).length,
    today: tasks.filter(t => t.category === 'diario' && !t.completed).length,
  };

  // ===== TASK CARD =====
  const TaskCard = ({ task }: { task: VipTask }) => {
    const pConf = PRIORITY_CONFIG[task.priority];
    const cConf = CATEGORY_CONFIG[task.category];
    const CatIcon = cConf.icon;
    const isExpanded = expandedTask === task.id;
    const isOverdue = task.due_date && !task.completed && task.due_date < new Date().toISOString().split('T')[0];

    return (
      <div className={`group relative bg-white dark:bg-slate-800 rounded-2xl border transition-all hover:shadow-lg ${
        task.completed ? 'opacity-60 border-slate-200 dark:border-slate-700' :
        task.pinned ? 'border-amber-400/50 shadow-md shadow-amber-500/5' :
        `border-slate-200 dark:border-slate-700 ${isOverdue ? 'border-l-4 border-l-red-500' : ''}`
      }`}>
        <div className="p-4 flex items-start gap-3">
          {/* Checkbox */}
          <button onClick={() => toggleTask(task.id)} className="mt-0.5 shrink-0">
            {task.completed
              ? <CheckCircle2 size={22} className="text-emerald-500" />
              : <Circle size={22} className="text-slate-300 dark:text-slate-600 hover:text-indigo-500 transition-colors" />
            }
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className={`font-bold text-sm leading-snug ${task.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                {task.pinned && <Star size={12} className="inline text-amber-400 mr-1 fill-amber-400" />}
                {task.title}
              </p>
              <div className="flex items-center gap-1 shrink-0">
                {/* Priority dot */}
                <span className={`w-2 h-2 rounded-full ${pConf.dot}`} title={pConf.label} />
                {task.is_recurring && <Repeat size={11} className="text-slate-400" />}
                <button onClick={() => setExpandedTask(isExpanded ? null : task.id)} className="text-slate-400 hover:text-slate-600">
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cConf.color}`}>
                <CatIcon size={9} />
                {cConf.label}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pConf.bg} ${pConf.color}`}>
                {pConf.label}
              </span>
              {task.due_date && (
                <span className={`text-[10px] font-medium flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
                  <Clock size={9} />
                  {new Date(task.due_date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  {isOverdue && ' ⚠️'}
                </span>
              )}
            </div>

            {/* Expanded */}
            {isExpanded && (
              <div className="mt-3 space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                {task.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{task.description}</p>
                )}
                <div className="flex items-center gap-2">
                  <button onClick={() => togglePin(task.id)}
                    className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${
                      task.pinned ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                    }`}>
                    <Star size={11} className={task.pinned ? 'fill-amber-500' : ''} />
                    {task.pinned ? 'Fijada' : 'Fijar'}
                  </button>
                  <button onClick={() => deleteTask(task.id)}
                    className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 transition-colors">
                    <Trash2 size={11} /> Eliminar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Star size={24} className="text-white fill-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              Tareas VIP
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Prioridades críticas · sincronizado con Supabase</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105 transition-all">
          <Plus size={18} /> Nueva Tarea VIP
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'from-slate-500 to-slate-600', icon: CheckSquare2 },
          { label: 'Completadas', value: stats.done, color: 'from-emerald-500 to-teal-600', icon: Check },
          { label: 'Urgentes', value: stats.urgent, color: 'from-red-500 to-rose-600', icon: AlertTriangle },
          { label: 'Para hoy', value: stats.today, color: 'from-amber-400 to-orange-500', icon: Flame },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
            <div className={`w-9 h-9 bg-gradient-to-br ${s.color} rounded-xl flex items-center justify-center mb-2 shadow`}>
              <s.icon size={16} className="text-white" />
            </div>
            <p className="text-2xl font-black text-slate-800 dark:text-white">{s.value}</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-amber-400/40 shadow-xl shadow-amber-500/10 p-6">
          <h3 className="font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Sparkles size={16} className="text-amber-500" /> Nueva tarea VIP
          </h3>
          <div className="space-y-4">
            <input
              value={form.title || ''}
              onChange={e => setForm({ ...form, title: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="Título de la tarea..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
            />
            <textarea
              value={form.description || ''}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Descripción opcional..."
              rows={2}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Prioridad</label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as any })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-amber-500/20">
                  <option value="urgent">🔴 Urgente</option>
                  <option value="high">🟠 Alta</option>
                  <option value="medium">🟡 Media</option>
                  <option value="low">🟢 Baja</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Periodo</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as any })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-amber-500/20">
                  <option value="diario">🔥 Hoy</option>
                  <option value="semanal">📅 Semana</option>
                  <option value="mensual">🎯 Mes</option>
                  <option value="anual">🏆 Año</option>
                  <option value="objetivo">🚩 Objetivo</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Fecha límite</label>
                <input type="date" value={form.due_date || ''} onChange={e => setForm({ ...form, due_date: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500/20" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">¿Recurrente?</label>
                <select value={form.is_recurring ? (form.frequency || 'daily') : ''} onChange={e => setForm({ ...form, is_recurring: !!e.target.value, frequency: e.target.value as any || undefined })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-amber-500/20">
                  <option value="">No</option>
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={addTask}
                className="flex-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black py-3 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-amber-500/20">
                ✓ Añadir tarea VIP
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-all">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'all', label: 'Todas' },
          { id: 'pending', label: '⏳ Pendientes' },
          { id: 'diario', label: '🔥 Hoy' },
          { id: 'semanal', label: '📅 Semana' },
          { id: 'mensual', label: '🎯 Mes' },
          { id: 'anual', label: '🏆 Año' },
          { id: 'objetivo', label: '🚩 Objetivos' },
          { id: 'done', label: '✅ Hechas' },
        ].map(f => (
          <button key={f.id} onClick={() => setActiveCategory(f.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeCategory === f.id
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-400/50'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pinned */}
          {pinned.length > 0 && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-amber-500 mb-3 flex items-center gap-2">
                <Star size={12} className="fill-amber-500" /> Fijadas
              </h3>
              <div className="space-y-2">
                {pinned.map(t => <TaskCard key={t.id} task={t} />)}
              </div>
            </div>
          )}

          {/* Pending */}
          {pending.length > 0 && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                <Clock size={12} /> Pendientes ({pending.length})
              </h3>
              <div className="space-y-2">
                {pending.map(t => <TaskCard key={t.id} task={t} />)}
              </div>
            </div>
          )}

          {/* Done */}
          {done.length > 0 && activeCategory !== 'pending' && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-3 flex items-center gap-2">
                <Check size={12} /> Completadas ({done.length})
              </h3>
              <div className="space-y-2">
                {done.slice(0, 10).map(t => <TaskCard key={t.id} task={t} />)}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center mb-4">
                <Star size={28} className="text-amber-400" />
              </div>
              <p className="font-bold text-slate-600 dark:text-slate-300">Sin tareas VIP aquí</p>
              <p className="text-xs text-slate-400 mt-1">Añade tu primera tarea prioritaria</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// needed for stats icons
const CheckSquare2 = Check;

export default VipTasksView;
