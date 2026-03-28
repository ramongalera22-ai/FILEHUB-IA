import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity, Plus, Trash2, Calendar, MapPin, Clock, ChevronLeft, ChevronRight,
  X, Edit3, Save, CheckCircle2, Star, Sparkles, Eye, Heart, Users, Flame,
  Mountain, Music, Palette, Gamepad2, BookOpen, Utensils, Camera
} from 'lucide-react';

interface ActivityItem {
  id: string;
  title: string;
  description?: string;
  date?: string;
  time?: string;
  location?: string;
  category: string;
  emoji: string;
  column: 'wishlist' | 'planned' | 'done';
  createdAt: string;
}

const ACTIVITY_CATEGORIES = [
  { id: 'outdoor', label: 'Aire libre', emoji: '🏔️', icon: Mountain },
  { id: 'culture', label: 'Cultura', emoji: '🎭', icon: Palette },
  { id: 'food', label: 'Gastronomía', emoji: '🍽️', icon: Utensils },
  { id: 'sport', label: 'Deporte', emoji: '⚽', icon: Activity },
  { id: 'music', label: 'Música/Conciertos', emoji: '🎵', icon: Music },
  { id: 'gaming', label: 'Gaming/Ocio', emoji: '🎮', icon: Gamepad2 },
  { id: 'travel', label: 'Escapada', emoji: '✈️', icon: Mountain },
  { id: 'learning', label: 'Aprendizaje', emoji: '📚', icon: BookOpen },
  { id: 'social', label: 'Social', emoji: '👥', icon: Users },
  { id: 'wellness', label: 'Bienestar', emoji: '🧘', icon: Heart },
  { id: 'photo', label: 'Fotografía', emoji: '📸', icon: Camera },
  { id: 'other', label: 'Otro', emoji: '📌', icon: Star },
];

const COLUMNS = [
  { id: 'wishlist', label: 'Quiero Hacer', emoji: '💭', color: 'from-violet-500 to-purple-600', border: 'border-violet-200 dark:border-violet-800', bg: 'bg-violet-50/50 dark:bg-violet-500/5' },
  { id: 'planned', label: 'Programadas', emoji: '📅', color: 'from-blue-500 to-indigo-600', border: 'border-blue-200 dark:border-blue-800', bg: 'bg-blue-50/50 dark:bg-blue-500/5' },
  { id: 'done', label: 'Realizadas', emoji: '✅', color: 'from-emerald-500 to-teal-600', border: 'border-emerald-200 dark:border-emerald-800', bg: 'bg-emerald-50/50 dark:bg-emerald-500/5' },
];

const ActivitiesView: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('filehub_activities_board') || '[]'); } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'board' | 'calendar'>('board');
  const [calMonth, setCalMonth] = useState(new Date());
  const [formColumn, setFormColumn] = useState<'wishlist' | 'planned' | 'done'>('wishlist');

  const [form, setForm] = useState({
    title: '', description: '', date: '', time: '', location: '',
    category: 'outdoor', emoji: '🏔️'
  });

  useEffect(() => { localStorage.setItem('filehub_activities_board', JSON.stringify(activities)); }, [activities]);

  const handleSave = () => {
    if (!form.title.trim()) return;
    const cat = ACTIVITY_CATEGORIES.find(c => c.id === form.category);
    if (editingId) {
      setActivities(prev => prev.map(a => a.id === editingId ? { ...a, ...form, emoji: cat?.emoji || form.emoji } : a));
      setEditingId(null);
    } else {
      setActivities(prev => [{
        id: `act-${Date.now()}`, ...form, emoji: cat?.emoji || form.emoji,
        column: formColumn, createdAt: new Date().toISOString()
      }, ...prev]);
    }
    resetForm(); setShowForm(false);
  };

  const startEdit = (a: ActivityItem) => {
    setForm({ title: a.title, description: a.description || '', date: a.date || '', time: a.time || '', location: a.location || '', category: a.category, emoji: a.emoji });
    setEditingId(a.id); setFormColumn(a.column); setShowForm(true);
  };

  const moveActivity = (id: string, newColumn: ActivityItem['column']) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, column: newColumn } : a));
  };

  const resetForm = () => setForm({ title: '', description: '', date: '', time: '', location: '', category: 'outdoor', emoji: '🏔️' });

  const stats = useMemo(() => ({
    wishlist: activities.filter(a => a.column === 'wishlist').length,
    planned: activities.filter(a => a.column === 'planned').length,
    done: activities.filter(a => a.column === 'done').length,
  }), [activities]);

  // Calendar
  const calYear = calMonth.getFullYear(); const calMo = calMonth.getMonth();
  const daysInMonth = new Date(calYear, calMo + 1, 0).getDate();
  const firstDay = (new Date(calYear, calMo, 1).getDay() + 6) % 7;
  const calDays: (null | number)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const todayStr = new Date().toISOString().split('T')[0];

  const activitiesByDate = useMemo(() => {
    const map: Record<string, ActivityItem[]> = {};
    activities.filter(a => a.date).forEach(a => { if (!map[a.date!]) map[a.date!] = []; map[a.date!].push(a); });
    return map;
  }, [activities]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 text-3xl">🎯</div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Actividades</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">Tablón de planes, experiencias y cosas que quieres hacer</p>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 gap-1">
            <button onClick={() => setActiveView('board')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeView === 'board' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400'}`}>📋 Tablón</button>
            <button onClick={() => setActiveView('calendar')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeView === 'calendar' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400'}`}>📅 Calendario</button>
          </div>
          <button onClick={() => { setShowForm(true); setEditingId(null); resetForm(); setFormColumn('wishlist'); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-orange-600/20">
            <Plus size={16} /> Nueva Actividad
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map(col => (
          <div key={col.id} className={`bg-gradient-to-br ${col.color} rounded-2xl p-5 text-white relative overflow-hidden`}>
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
            <span className="text-2xl block mb-1">{col.emoji}</span>
            <p className="text-3xl font-black">{stats[col.id as keyof typeof stats]}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{col.label}</p>
          </div>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-orange-200 dark:border-orange-700 p-6 shadow-lg animate-in slide-in-from-top-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-lg text-slate-800 dark:text-white">{editingId ? 'Editar Actividad' : 'Nueva Actividad'}</h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }}><X size={18} className="text-slate-400" /></button>
          </div>
          {/* Category selector */}
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setForm({ ...form, category: c.id, emoji: c.emoji })}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all ${form.category === c.id ? 'bg-orange-600 text-white border-orange-600 shadow-md' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="¿Qué actividad?"
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-orange-400" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none" />
            <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none" />
            <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="📍 Lugar..."
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none" />
            <select value={formColumn} onChange={e => setFormColumn(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none">
              {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
            </select>
          </div>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descripción o notas..."
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none resize-none h-16" />
          <button onClick={handleSave} disabled={!form.title.trim()}
            className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs uppercase disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg">
            <Save size={14} /> {editingId ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      )}

      {/* ═══ BOARD VIEW ═══ */}
      {activeView === 'board' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-2">
          {COLUMNS.map(col => {
            const colActivities = activities.filter(a => a.column === col.id);
            return (
              <div key={col.id} className={`rounded-2xl border ${col.border} ${col.bg} min-h-[400px]`}>
                {/* Column Header */}
                <div className={`bg-gradient-to-r ${col.color} rounded-t-2xl px-5 py-4 text-white flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{col.emoji}</span>
                    <h3 className="font-black text-sm uppercase tracking-wider">{col.label}</h3>
                  </div>
                  <span className="bg-white/20 px-2.5 py-1 rounded-lg text-xs font-black">{colActivities.length}</span>
                </div>

                {/* Items */}
                <div className="p-3 space-y-3">
                  {colActivities.length === 0 && (
                    <div className="text-center py-10 text-slate-400">
                      <span className="text-3xl block mb-2">{col.emoji}</span>
                      <p className="text-xs font-bold">Sin actividades aquí</p>
                      <button onClick={() => { setShowForm(true); setFormColumn(col.id as any); resetForm(); setEditingId(null); }}
                        className="mt-3 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 hover:border-orange-300 transition-all">
                        <Plus size={12} className="inline mr-1" /> Añadir
                      </button>
                    </div>
                  )}
                  {colActivities.map(act => {
                    const cat = ACTIVITY_CATEGORIES.find(c => c.id === act.category);
                    return (
                      <div key={act.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 group hover:shadow-lg hover:border-orange-200 transition-all">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{act.emoji}</span>
                            <h4 className="font-black text-sm text-slate-800 dark:text-white leading-tight">{act.title}</h4>
                          </div>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => startEdit(act)} className="p-1 text-slate-400 hover:text-orange-500"><Edit3 size={12} /></button>
                            <button onClick={() => setActivities(prev => prev.filter(a => a.id !== act.id))} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
                          </div>
                        </div>
                        {act.description && <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 line-clamp-2">{act.description}</p>}
                        <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 font-bold">
                          {cat && <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">{cat.label}</span>}
                          {act.date && <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(act.date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>}
                          {act.time && <span className="flex items-center gap-1"><Clock size={10} /> {act.time}</span>}
                          {act.location && <span className="flex items-center gap-1"><MapPin size={10} /> {act.location}</span>}
                        </div>
                        {/* Move buttons */}
                        <div className="flex gap-1.5 mt-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                          {col.id !== 'wishlist' && (
                            <button onClick={() => moveActivity(act.id, 'wishlist')} className="flex-1 py-1.5 rounded-lg text-[9px] font-black bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-100 transition-all">💭 Quiero</button>
                          )}
                          {col.id !== 'planned' && (
                            <button onClick={() => moveActivity(act.id, 'planned')} className="flex-1 py-1.5 rounded-lg text-[9px] font-black bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-all">📅 Planificar</button>
                          )}
                          {col.id !== 'done' && (
                            <button onClick={() => moveActivity(act.id, 'done')} className="flex-1 py-1.5 rounded-lg text-[9px] font-black bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-all">✅ Hecha</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {/* Quick add at bottom */}
                  {colActivities.length > 0 && (
                    <button onClick={() => { setShowForm(true); setFormColumn(col.id as any); resetForm(); setEditingId(null); }}
                      className="w-full py-2.5 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold text-slate-400 hover:text-orange-600 hover:border-orange-300 transition-all flex items-center justify-center gap-1">
                      <Plus size={12} /> Añadir actividad
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ CALENDAR VIEW ═══ */}
      {activeView === 'calendar' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-orange-50/50 dark:bg-orange-500/5">
            <button onClick={() => setCalMonth(new Date(calYear, calMo - 1))} className="p-2 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-500/10"><ChevronLeft size={18} className="text-slate-500" /></button>
            <h3 className="text-lg font-black text-slate-800 dark:text-white capitalize">{calMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h3>
            <button onClick={() => setCalMonth(new Date(calYear, calMo + 1))} className="p-2 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-500/10"><ChevronRight size={18} className="text-slate-500" /></button>
          </div>
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700">
            {['L','M','X','J','V','S','D'].map(d => <div key={d} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {calDays.map((day, i) => {
              if (!day) return <div key={`e-${i}`} className="min-h-[90px] border-r border-b border-slate-50 dark:border-slate-700/50" />;
              const dateStr = `${calYear}-${String(calMo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayActs = activitiesByDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              return (
                <div key={dateStr}
                  onClick={() => { setShowForm(true); setFormColumn('planned'); setForm({ ...form, date: dateStr }); setEditingId(null); }}
                  className={`min-h-[90px] border-r border-b border-slate-50 dark:border-slate-700/50 p-1.5 cursor-pointer hover:bg-orange-50/50 dark:hover:bg-orange-500/5 transition-all ${isToday ? 'bg-orange-50 dark:bg-orange-500/5' : ''}`}>
                  <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-black mb-1 ${isToday ? 'bg-orange-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300'}`}>{day}</div>
                  <div className="space-y-0.5">
                    {dayActs.slice(0, 3).map(act => {
                      const colConf = COLUMNS.find(c => c.id === act.column);
                      return (
                        <div key={act.id} onClick={e => { e.stopPropagation(); startEdit(act); }}
                          className={`text-[8px] font-black px-1.5 py-0.5 rounded-md truncate cursor-pointer transition-all hover:opacity-80 ${
                            act.column === 'done' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                            act.column === 'planned' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' :
                            'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400'
                          }`}>
                          {act.emoji} {act.title}
                        </div>
                      );
                    })}
                    {dayActs.length > 3 && <p className="text-[8px] text-slate-400 font-bold px-1">+{dayActs.length - 3} más</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming activities list (below calendar) */}
      {activeView === 'calendar' && (
        <div className="space-y-3">
          <h3 className="font-black text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider">Próximas actividades programadas</h3>
          {activities.filter(a => a.date && a.date >= todayStr && a.column === 'planned').sort((a, b) => (a.date || '').localeCompare(b.date || '')).slice(0, 10).map(act => (
            <div key={act.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4 group hover:shadow-md transition-all">
              <span className="text-2xl">{act.emoji}</span>
              <div className="flex-1">
                <p className="font-black text-sm text-slate-800 dark:text-white">{act.title}</p>
                <div className="flex gap-3 text-[10px] text-slate-400 font-bold mt-0.5">
                  {act.date && <span><Calendar size={10} className="inline" /> {new Date(act.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>}
                  {act.time && <span><Clock size={10} className="inline" /> {act.time}</span>}
                  {act.location && <span><MapPin size={10} className="inline" /> {act.location}</span>}
                </div>
              </div>
              <button onClick={() => moveActivity(act.id, 'done')} className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-lg text-[9px] font-black hover:bg-emerald-100 transition-all">✅ Hecha</button>
              <button onClick={() => setActivities(prev => prev.filter(a => a.id !== act.id))} className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
            </div>
          ))}
          {activities.filter(a => a.date && a.date >= todayStr && a.column === 'planned').length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <Calendar size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs font-bold">Sin actividades programadas con fecha</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActivitiesView;
