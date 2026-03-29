import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame, Plus, Trash2, Check, Trophy, Star, Target,
  RotateCcw, ChevronLeft, ChevronRight, Zap, Award, TrendingUp
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface Habit {
  id: string;
  title: string;
  emoji: string;
  color: string;
  goal: number; // days to build (default 21)
  created_at: string;
  completions: string[]; // ISO date strings
  user_id?: string;
}

interface HabitsViewProps {
  session?: any;
}

const COLORS = [
  { id: 'violet', bg: 'bg-violet-500', light: 'bg-violet-100 dark:bg-violet-500/20', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-300 dark:border-violet-500/40' },
  { id: 'emerald', bg: 'bg-emerald-500', light: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-300 dark:border-emerald-500/40' },
  { id: 'amber', bg: 'bg-amber-500', light: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-500/40' },
  { id: 'red', bg: 'bg-red-500', light: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-300 dark:border-red-500/40' },
  { id: 'blue', bg: 'bg-blue-500', light: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-500/40' },
  { id: 'pink', bg: 'bg-pink-500', light: 'bg-pink-100 dark:bg-pink-500/20', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-300 dark:border-pink-500/40' },
];

const EMOJIS = ['💪', '🏃', '📚', '🥗', '💧', '🧘', '😴', '✍️', '🎯', '🩺', '🌿', '🚴', '🧠', '❤️', '💊', '🍎'];

const todayStr = () => new Date().toISOString().split('T')[0];
const addDays = (dateStr: string, n: number) => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

const getCurrentStreak = (completions: string[]): number => {
  let streak = 0;
  let d = todayStr();
  while (completions.includes(d)) {
    streak++;
    d = addDays(d, -1);
  }
  return streak;
};

const getLongestStreak = (completions: string[]): number => {
  if (completions.length === 0) return 0;
  const sorted = [...completions].sort();
  let max = 1, curr = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i-1]).getTime()) / 86400000;
    if (diff === 1) { curr++; max = Math.max(max, curr); }
    else curr = 1;
  }
  return max;
};

const HabitsView: React.FC<HabitsViewProps> = ({ session }) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', emoji: '💪', color: 'violet', goal: 21 });
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week
  const [loading, setLoading] = useState(true);

  // Build 7-day window based on weekOffset
  const weekDays = useMemo(() => {
    const days = [];
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7 - base.getDay() + 1); // Monday
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }, [weekOffset]);

  const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  useEffect(() => {
    const saved = localStorage.getItem('filehub_habits');
    if (saved) setHabits(JSON.parse(saved));
    setLoading(false);
  }, []);

  const persist = (updated: Habit[]) => {
    setHabits(updated);
    localStorage.setItem('filehub_habits', JSON.stringify(updated));
  };

  const addHabit = async () => {
    if (!form.title.trim()) return;
    const h: Habit = {
      id: `habit_${Date.now()}`,
      title: form.title.trim(),
      emoji: form.emoji,
      color: form.color,
      goal: form.goal,
      created_at: new Date().toISOString(),
      completions: [],
      user_id: session?.user?.id,
    };
    persist([...habits, h]);
    if (session) { try {
      await supabase.from('habits').insert({
        id: h.id, user_id: session?.user?.id, title: h.title,
        emoji: h.emoji, color: h.color, goal: h.goal,
        completions: JSON.stringify([]), created_at: h.created_at
      });
    }
    setForm({ title: '', emoji: '💪', color: 'violet', goal: 21 });
    setShowForm(false);
  };

  const toggleDay = async (habitId: string, date: string) => {
    const updated = habits.map(h => {
      if (h.id !== habitId) return h;
      const completions = h.completions.includes(date)
        ? h.completions.filter(d => d !== date)
        : [...h.completions, date];
      return { ...h, completions };
    });
    persist(updated);
    const habit = updated.find(h => h.id === habitId)!;
    if (session) { try {
      await supabase.from('habits').update({ completions: JSON.stringify(habit.completions) }).eq('id', habitId);
    }
  };

  const deleteHabit = async (id: string) => {
    persist(habits.filter(h => h.id !== id));
    if (session) { try { await supabase.from('habits').delete().eq('id', id); } catch (e) { console.warn('Habit delete error:', e); } }
  };

  const totalStreak = useMemo(() =>
    habits.reduce((sum, h) => sum + getCurrentStreak(h.completions), 0), [habits]);

  const completedToday = useMemo(() =>
    habits.filter(h => h.completions.includes(todayStr())).length, [habits]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/25">
            <Flame size={24} className="text-white fill-orange-200" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              Hábitos Diarios
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">21 días para crear un hábito · racha continua</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-orange-400 to-red-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/25 hover:scale-105 transition-all">
          <Plus size={18} /> Nuevo hábito
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-500/10 dark:to-red-500/10 rounded-2xl border border-orange-200 dark:border-orange-500/20 p-4 text-center">
          <Flame size={20} className="mx-auto text-orange-500 fill-orange-200 mb-1" />
          <p className="text-2xl font-black text-slate-800 dark:text-white">{totalStreak}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Racha total</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 p-4 text-center">
          <Check size={20} className="mx-auto text-emerald-500 mb-1" />
          <p className="text-2xl font-black text-slate-800 dark:text-white">{completedToday}/{habits.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Hoy</p>
        </div>
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-500/10 dark:to-indigo-500/10 rounded-2xl border border-violet-200 dark:border-violet-500/20 p-4 text-center">
          <Trophy size={20} className="mx-auto text-violet-500 mb-1" />
          <p className="text-2xl font-black text-slate-800 dark:text-white">{habits.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Hábitos</p>
        </div>
      </div>

      {/* ADD FORM */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-orange-400/40 shadow-xl p-6 space-y-4">
          <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Flame size={16} className="text-orange-500" /> Nuevo hábito
          </h3>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && addHabit()}
            placeholder="Nombre del hábito (ej: Correr 30 min)..."
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Emoji</label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setForm({ ...form, emoji: e })}
                    className={`w-9 h-9 text-lg rounded-xl transition-all ${form.emoji === e ? 'bg-orange-100 dark:bg-orange-500/20 ring-2 ring-orange-400' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c.id} onClick={() => setForm({ ...form, color: c.id })}
                      className={`w-7 h-7 rounded-full ${c.bg} transition-all ${form.color === c.id ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`} />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Objetivo (días)</label>
                <select value={form.goal} onChange={e => setForm({ ...form, goal: +e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm font-bold">
                  <option value={7}>7 días (1 semana)</option>
                  <option value={21}>21 días (clásico)</option>
                  <option value={30}>30 días</option>
                  <option value={66}>66 días (científico)</option>
                  <option value={90}>90 días</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={addHabit}
              className="flex-1 bg-gradient-to-r from-orange-400 to-red-500 text-white font-black py-3 rounded-xl shadow-lg hover:opacity-90 transition-all">
              ✓ Crear hábito
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 bg-slate-100 dark:bg-slate-700 text-slate-500 font-bold rounded-xl">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* WEEK NAVIGATOR */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3">
        <button onClick={() => setWeekOffset(w => w - 1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 transition-all">
          <ChevronLeft size={18} />
        </button>
        <p className="font-black text-sm text-slate-700 dark:text-slate-200">
          {weekOffset === 0 ? 'Esta semana' : weekOffset === -1 ? 'Semana pasada' :
           weekOffset === 1 ? 'Semana que viene' :
           `${new Date(weekDays[0] + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} — ${new Date(weekDays[6] + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`
          }
        </p>
        <button onClick={() => setWeekOffset(w => w + 1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 transition-all">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* HABITS GRID */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : habits.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="text-6xl mb-4">🔥</div>
          <p className="font-bold text-slate-600 dark:text-slate-300 mb-1">Sin hábitos todavía</p>
          <p className="text-xs text-slate-400">Añade tu primer hábito para empezar tu racha</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Column headers */}
          <div className="flex items-center gap-3 px-2">
            <div className="flex-1" />
            <div className="flex gap-1">
              {weekDays.map((d, i) => (
                <div key={d} className={`w-9 text-center text-[10px] font-black uppercase tracking-wider ${d === todayStr() ? 'text-violet-600' : 'text-slate-400'}`}>
                  {dayLabels[i]}<br />
                  <span className={`text-xs font-black ${d === todayStr() ? 'text-violet-600' : 'text-slate-600 dark:text-slate-300'}`}>
                    {new Date(d + 'T12:00:00').getDate()}
                  </span>
                </div>
              ))}
            </div>
            <div className="w-16 text-center text-[10px] font-black uppercase text-slate-400 tracking-wider">Racha</div>
          </div>

          {habits.map(habit => {
            const colorConf = COLORS.find(c => c.id === habit.color) || COLORS[0];
            const streak = getCurrentStreak(habit.completions);
            const progress = Math.min((streak / habit.goal) * 100, 100);
            const longestStreak = getLongestStreak(habit.completions);

            return (
              <div key={habit.id} className={`bg-white dark:bg-slate-800 rounded-2xl border ${colorConf.border} overflow-hidden`}>
                {/* Progress bar */}
                <div className="h-1 bg-slate-100 dark:bg-slate-700">
                  <div className={`h-full ${colorConf.bg} transition-all duration-500`} style={{ width: `${progress}%` }} />
                </div>

                <div className="p-3 flex items-center gap-3">
                  {/* Emoji + title */}
                  <div className={`w-10 h-10 ${colorConf.light} rounded-xl flex items-center justify-center text-xl shrink-0`}>
                    {habit.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-slate-800 dark:text-white truncate">{habit.title}</p>
                    <p className="text-[10px] text-slate-400">
                      {streak}/{habit.goal}d · mejor racha: {longestStreak}d
                    </p>
                  </div>

                  {/* Day checkboxes */}
                  <div className="flex gap-1 shrink-0">
                    {weekDays.map(d => {
                      const done = habit.completions.includes(d);
                      const isFuture = d > todayStr();
                      return (
                        <button key={d} onClick={() => !isFuture && toggleDay(habit.id, d)}
                          disabled={isFuture}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all ${
                            done ? `${colorConf.bg} text-white shadow-sm hover:opacity-80` :
                            d === todayStr() ? `border-2 ${colorConf.border} ${colorConf.text} hover:${colorConf.light}` :
                            isFuture ? 'text-slate-200 dark:text-slate-700 cursor-not-allowed' :
                            'bg-slate-100 dark:bg-slate-700 text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                          }`}>
                          {done ? '✓' : d === todayStr() ? '○' : isFuture ? '·' : '○'}
                        </button>
                      );
                    })}
                  </div>

                  {/* Streak badge */}
                  <div className={`w-16 flex flex-col items-center shrink-0 ${colorConf.text}`}>
                    <div className="flex items-center gap-0.5">
                      <Flame size={14} className={streak > 0 ? 'fill-current' : ''} />
                      <span className="font-black text-lg leading-none">{streak}</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400">días</span>
                  </div>

                  {/* Delete */}
                  <button onClick={() => deleteHabit(habit.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Achievement badges */}
                {streak > 0 && (
                  <div className={`px-3 pb-2 flex items-center gap-2`}>
                    {streak >= 7 && <span className="text-[10px] font-black bg-amber-100 dark:bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded-lg">🏅 1 semana</span>}
                    {streak >= 21 && <span className="text-[10px] font-black bg-violet-100 dark:bg-violet-500/20 text-violet-600 px-2 py-0.5 rounded-lg">🏆 21 días</span>}
                    {streak >= 30 && <span className="text-[10px] font-black bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 px-2 py-0.5 rounded-lg">🌟 1 mes</span>}
                    {streak >= 66 && <span className="text-[10px] font-black bg-blue-100 dark:bg-blue-500/20 text-blue-600 px-2 py-0.5 rounded-lg">🧠 Hábito formado</span>}
                    {progress >= 100 && <span className="text-[10px] font-black bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2 py-0.5 rounded-lg">🎉 ¡Objetivo!</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HabitsView;
