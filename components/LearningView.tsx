import React, { useState, useEffect, useMemo } from 'react';
import { Course } from '../types';
import {
  GraduationCap, Plus, PlayCircle, CheckCircle2, Clock, Award, BookOpen, ChevronRight,
  Trash2, Edit3, X, Save, Calendar, ExternalLink, Link, ChevronLeft, Star, Target, Loader2
} from 'lucide-react';

const PLATFORMS = ['Coursera', 'Udemy', 'LinkedIn Learning', 'edX', 'MasterClass', 'Domestika', 'YouTube', 'MIR/Formación', 'Universidad', 'Otro'];
const CATEGORIES = ['Medicina', 'Tecnología', 'Finanzas', 'Idiomas', 'Desarrollo Personal', 'Fitness', 'Cocina', 'Otro'];
const STATUS_OPTIONS = [
  { id: 'interested', label: 'Interesado', emoji: '👀', color: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' },
  { id: 'enrolled', label: 'Matriculado', emoji: '📚', color: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  { id: 'in-progress', label: 'En Curso', emoji: '🎯', color: 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  { id: 'completed', label: 'Completado', emoji: '✅', color: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  { id: 'dropped', label: 'Abandonado', emoji: '❌', color: 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400', dot: 'bg-red-500' },
];

interface ExtendedCourse extends Course {
  status?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  cost?: number;
}

const LearningView: React.FC = () => {
  const [courses, setCourses] = useState<ExtendedCourse[]>(() => {
    try { return JSON.parse(localStorage.getItem('filehub_courses') || '[]'); } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'calendar'>('all');
  const [calMonth, setCalMonth] = useState(new Date());

  const [form, setForm] = useState({
    title: '', platform: 'Coursera', category: 'Medicina', totalLessons: '10', completedLessons: '0',
    status: 'enrolled', url: '', startDate: new Date().toISOString().split('T')[0], endDate: '', notes: '', cost: ''
  });

  useEffect(() => { localStorage.setItem('filehub_courses', JSON.stringify(courses)); }, [courses]);

  const handleSave = () => {
    if (!form.title.trim()) return;
    const total = parseInt(form.totalLessons) || 1;
    const completed = Math.min(parseInt(form.completedLessons) || 0, total);
    const progress = Math.round((completed / total) * 100);
    const courseData: ExtendedCourse = {
      id: editingId || `course-${Date.now()}`, title: form.title, platform: form.platform,
      category: form.category, totalLessons: total, completedLessons: completed, progress,
      status: form.status, url: form.url, startDate: form.startDate, endDate: form.endDate,
      notes: form.notes, cost: form.cost ? parseFloat(form.cost) : undefined,
      nextLessonDate: form.startDate
    };
    if (editingId) {
      setCourses(prev => prev.map(c => c.id === editingId ? courseData : c));
      setEditingId(null);
    } else {
      setCourses(prev => [courseData, ...prev]);
    }
    resetForm(); setShowForm(false);
  };

  const startEdit = (c: ExtendedCourse) => {
    setForm({
      title: c.title, platform: c.platform, category: c.category,
      totalLessons: c.totalLessons.toString(), completedLessons: c.completedLessons.toString(),
      status: c.status || 'enrolled', url: c.url || '', startDate: c.startDate || '',
      endDate: c.endDate || '', notes: c.notes || '', cost: c.cost?.toString() || ''
    });
    setEditingId(c.id); setShowForm(true);
  };

  const resetForm = () => setForm({ title: '', platform: 'Coursera', category: 'Medicina', totalLessons: '10', completedLessons: '0', status: 'enrolled', url: '', startDate: new Date().toISOString().split('T')[0], endDate: '', notes: '', cost: '' });

  const markComplete = (id: string) => setCourses(prev => prev.map(c => c.id === id ? { ...c, status: 'completed', progress: 100, completedLessons: c.totalLessons, endDate: new Date().toISOString().split('T')[0] } : c));
  const incrementLesson = (id: string) => setCourses(prev => prev.map(c => {
    if (c.id !== id || c.completedLessons >= c.totalLessons) return c;
    const newCompleted = c.completedLessons + 1;
    return { ...c, completedLessons: newCompleted, progress: Math.round((newCompleted / c.totalLessons) * 100), status: newCompleted >= c.totalLessons ? 'completed' : c.status };
  }));

  const stats = useMemo(() => ({
    total: courses.length,
    active: courses.filter(c => c.status === 'enrolled' || c.status === 'in-progress').length,
    completed: courses.filter(c => c.status === 'completed').length,
    interested: courses.filter(c => c.status === 'interested').length,
    totalCost: courses.reduce((t, c) => t + (c.cost || 0), 0),
  }), [courses]);

  const filtered = activeTab === 'completed' ? courses.filter(c => c.status === 'completed')
    : activeTab === 'active' ? courses.filter(c => c.status === 'enrolled' || c.status === 'in-progress')
    : activeTab === 'all' ? courses : courses;

  // Calendar
  const calYear = calMonth.getFullYear(); const calMo = calMonth.getMonth();
  const daysInMonth = new Date(calYear, calMo + 1, 0).getDate();
  const firstDay = (new Date(calYear, calMo, 1).getDay() + 6) % 7;
  const calDays: (null | number)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const todayStr = new Date().toISOString().split('T')[0];

  const getStatusConf = (status?: string) => STATUS_OPTIONS.find(s => s.id === status) || STATUS_OPTIONS[1];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <GraduationCap size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Mis Cursos</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">Formación continua y certificaciones</p>
          </div>
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-600/20">
          <Plus size={16} /> Nuevo Curso
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: BookOpen, gradient: 'from-slate-600 to-slate-700' },
          { label: 'Activos', value: stats.active, icon: PlayCircle, gradient: 'from-blue-500 to-blue-600' },
          { label: 'Completados', value: stats.completed, icon: Award, gradient: 'from-emerald-500 to-emerald-600' },
          { label: 'Interesado', value: stats.interested, icon: Star, gradient: 'from-amber-500 to-amber-600' },
          { label: 'Invertido', value: `${stats.totalCost.toFixed(0)}€`, icon: Target, gradient: 'from-purple-500 to-purple-600' },
        ].map((s, i) => (
          <div key={i} className={`bg-gradient-to-br ${s.gradient} rounded-2xl p-4 text-white relative overflow-hidden`}>
            <div className="absolute -right-3 -top-3 w-16 h-16 bg-white/10 rounded-full blur-xl" />
            <s.icon size={16} className="opacity-70 mb-2" />
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm gap-1 w-fit">
        {[
          { id: 'all', label: '📚 Todos' },
          { id: 'active', label: '🎯 Activos' },
          { id: 'completed', label: '✅ Completados' },
          { id: 'calendar', label: '📅 Calendario' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-blue-200 dark:border-blue-700 p-6 shadow-lg animate-in slide-in-from-top-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-lg text-slate-800 dark:text-white">{editingId ? 'Editar Curso' : 'Nuevo Curso'}</h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }}><X size={18} className="text-slate-400" /></button>
          </div>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Nombre del curso..."
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-400" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none">
              {PLATFORMS.map(p => <option key={p}>{p}</option>)}
            </select>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input type="number" value={form.totalLessons} onChange={e => setForm({ ...form, totalLessons: e.target.value })} placeholder="Total lecciones" className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none" />
            <input type="number" value={form.completedLessons} onChange={e => setForm({ ...form, completedLessons: e.target.value })} placeholder="Completadas" className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none" />
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(s => (
              <button key={s.id} onClick={() => setForm({ ...form, status: s.id })}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all ${form.status === s.id ? `${s.color} border-current shadow-md` : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none" />
            <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} placeholder="Fin" className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none" />
            <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="URL del curso..." className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none" />
            <input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} placeholder="Coste €" className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none" />
          </div>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notas..." className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none resize-none h-16" />
          <button onClick={handleSave} disabled={!form.title.trim()} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg">
            <Save size={14} /> {editingId ? 'Actualizar' : 'Guardar Curso'}
          </button>
        </div>
      )}

      {/* Courses List */}
      {activeTab !== 'calendar' && (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <GraduationCap size={40} className="mx-auto text-slate-200 dark:text-slate-600 mb-4" />
              <p className="text-sm font-bold text-slate-400">No hay cursos en esta categoría</p>
            </div>
          ) : filtered.map(course => {
            const st = getStatusConf(course.status);
            return (
              <div key={course.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 group hover:shadow-lg transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 relative flex-shrink-0">
                    <svg className="w-12 h-12 -rotate-90"><circle cx="24" cy="24" r="20" fill="transparent" stroke="currentColor" className="text-slate-100 dark:text-slate-700" strokeWidth="4" /><circle cx="24" cy="24" r="20" fill="transparent" stroke="currentColor" className={`${course.progress >= 100 ? 'text-emerald-500' : 'text-blue-500'}`} strokeWidth="4" strokeDasharray={126} strokeDashoffset={126 - (126 * course.progress) / 100} strokeLinecap="round" /></svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-700 dark:text-slate-300">{course.progress}%</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-black text-sm text-slate-800 dark:text-white">{course.title}</h4>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${st.color}`}>{st.emoji} {st.label}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-bold">
                      <span>{course.platform}</span>
                      <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">{course.category}</span>
                      <span><CheckCircle2 size={10} className="inline" /> {course.completedLessons}/{course.totalLessons}</span>
                      {course.startDate && <span><Calendar size={10} className="inline" /> {course.startDate}</span>}
                      {course.cost && <span>💰 {course.cost}€</span>}
                    </div>
                    {course.notes && <p className="text-xs text-slate-400 mt-1 italic line-clamp-1">{course.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {course.status !== 'completed' && (
                      <>
                        <button onClick={() => incrementLesson(course.id)} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg text-slate-400 hover:text-blue-500 transition-all" title="+1 lección"><PlayCircle size={16} /></button>
                        <button onClick={() => markComplete(course.id)} className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg text-slate-400 hover:text-emerald-500 transition-all" title="Completar"><CheckCircle2 size={16} /></button>
                      </>
                    )}
                    {course.url && <a href={course.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-500"><ExternalLink size={14} /></a>}
                    <button onClick={() => startEdit(course)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all"><Edit3 size={14} /></button>
                    <button onClick={() => setCourses(prev => prev.filter(c => c.id !== course.id))} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Calendar View */}
      {activeTab === 'calendar' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-blue-50/50 dark:bg-blue-500/5">
            <button onClick={() => setCalMonth(new Date(calYear, calMo - 1))} className="p-2 rounded-xl hover:bg-blue-100"><ChevronLeft size={18} className="text-slate-500" /></button>
            <h3 className="text-lg font-black text-slate-800 dark:text-white capitalize">{calMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h3>
            <button onClick={() => setCalMonth(new Date(calYear, calMo + 1))} className="p-2 rounded-xl hover:bg-blue-100"><ChevronRight size={18} className="text-slate-500" /></button>
          </div>
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700">
            {['L','M','X','J','V','S','D'].map(d => <div key={d} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {calDays.map((day, i) => {
              if (!day) return <div key={`e-${i}`} className="min-h-[70px] border-r border-b border-slate-50 dark:border-slate-700/50" />;
              const dateStr = `${calYear}-${String(calMo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;
              const dayCourses = courses.filter(c => (c.startDate && c.startDate <= dateStr && (!c.endDate || c.endDate >= dateStr)) || c.nextLessonDate === dateStr);
              return (
                <div key={dateStr} className={`min-h-[70px] border-r border-b border-slate-50 dark:border-slate-700/50 p-1.5 ${isToday ? 'bg-blue-50 dark:bg-blue-500/5' : ''}`}>
                  <div className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-black mb-1 ${isToday ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>{day}</div>
                  {dayCourses.slice(0, 2).map(c => (
                    <div key={c.id} className="text-[8px] font-bold px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 truncate mb-0.5">📚 {c.title}</div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningView;
