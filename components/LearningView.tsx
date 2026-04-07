
import { callAI } from '../services/aiProxy';
import { cfg } from '../services/config';
const OPENROUTER_KEY = cfg.openrouterKey();
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Course } from '../types';
import {
  GraduationCap, Plus, PlayCircle, CheckCircle2, Clock, Award, BookOpen, ChevronRight,
  Trash2, Edit3, X, Save, Calendar, ExternalLink, Link, ChevronLeft, Star, Target, Loader2,
  Brain, Upload, FileText, Send, Sparkles, RefreshCw, Zap, Copy, Check, MessageCircle
} from 'lucide-react';


// PDF text extraction
async function extractPdfText(file: File): Promise<string> {
  try {
    await new Promise<void>((resolve, reject) => {
      if ((window as any).pdfjsLib) { resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload = () => resolve(); s.onerror = reject; document.head.appendChild(s);
    });
    const lib = (window as any).pdfjsLib;
    lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= Math.min(pdf.numPages, 80); i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      const text = (tc.items as any[]).map((item: any) => item.str).join(' ').trim();
      if (text) pages.push(`[Pág ${i}]\n${text}`);
    }
    return pages.join('\n\n') || 'No se pudo extraer texto.';
  } catch (e: any) { return `Error PDF: ${e?.message}`; }
}

async function studyAI(messages: {role:string;content:string}[], context: string): Promise<string> {
  if (!OPENROUTER_KEY) return '⚠️ Configura VITE_OPENROUTER_KEY para usar el asistente de estudio.';
  const models = ['anthropic/claude-haiku-4.5', 'anthropic/claude-3-haiku', 'google/gemini-flash-1.5'];
  for (const model of models) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'HTTP-Referer': 'https://ramongalera22-ai.github.io/FILEHUB-IA' },
        body: JSON.stringify({
          model, max_tokens: 2000,
          messages: [
            { role: 'system', content: `Eres un tutor IA experto en formación médica continuada para médicos de familia (MFyC). El usuario es médico con guardias de 24h.

MATERIALES DEL CURSO:
${context || 'No hay materiales subidos aún.'}

INSTRUCCIONES:
- Responde en español con emojis para hacerlo visual
- Puedes: resumir contenidos, generar flashcards, crear preguntas tipo test, explicar conceptos
- Si piden flashcards: formato "📋 Pregunta: ... / ✅ Respuesta: ..."
- Si piden resumen: estructura con títulos, puntos clave, y conclusiones
- Si piden test: preguntas tipo MIR con 4 opciones y respuesta correcta al final
- Adapta las explicaciones a un médico de familia en activo
- Si piden planificar estudio, ten en cuenta que hace guardias de 24h` },
            ...messages
          ]
        })
      });
      const d = await res.json();
      if (d.error) continue;
      const reply = d.choices?.[0]?.message?.content;
      if (reply) return reply;
    } catch { continue; }
  }
  return '⚠️ No se pudo conectar. Verifica tu API key.';
}

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
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'calendar' | 'study'>('all');
  const [calMonth, setCalMonth] = useState(new Date());

  // Study Mode State
  const [studyMaterials, setStudyMaterials] = useState<{id:string;title:string;content:string;pages:number;addedAt:string}[]>(() => {
    try { return JSON.parse(localStorage.getItem('filehub_study_materials') || '[]'); } catch { return []; }
  });
  const [studyChat, setStudyChat] = useState<{id:string;role:'user'|'assistant';content:string;ts:Date}[]>([]);
  const [studyChatIn, setStudyChatIn] = useState('');
  const [studyLoading, setStudyLoading] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [studyPlan, setStudyPlan] = useState<{day:string;topic:string;duration:string;done:boolean}[]>(() => {
    try { return JSON.parse(localStorage.getItem('filehub_study_plan') || '[]'); } catch { return []; }
  });
  const studyChatRef = useRef<HTMLDivElement>(null);
  const studyFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { studyChatRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [studyChat]);
  useEffect(() => { localStorage.setItem('filehub_study_materials', JSON.stringify(studyMaterials)); }, [studyMaterials]);
  useEffect(() => { localStorage.setItem('filehub_study_plan', JSON.stringify(studyPlan)); }, [studyPlan]);

  const studyContext = useMemo(() => {
    return studyMaterials.map((m, i) => `[MATERIAL ${i+1}: "${m.title}" — ${m.pages} pág]\n${m.content.slice(0, 10000)}`).join('\n\n---\n\n');
  }, [studyMaterials]);

  const handleStudyChat = useCallback(async (overrideMsg?: string) => {
    const msg = overrideMsg || studyChatIn.trim();
    if (!msg || studyLoading) return;
    const userMsg = { id: `sc-${Date.now()}`, role: 'user' as const, content: msg, ts: new Date() };
    setStudyChat(prev => [...prev, userMsg]);
    setStudyChatIn(''); setStudyLoading(true);
    const history = [...studyChat.slice(-12), userMsg].map(m => ({ role: m.role, content: m.content }));
    const reply = await studyAI(history, studyContext);
    setStudyChat(prev => [...prev, { id: `sc-${Date.now()+1}`, role: 'assistant', content: reply, ts: new Date() }]);
    setStudyLoading(false);
  }, [studyChatIn, studyChat, studyLoading, studyContext]);

  const handleStudyFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true);
    try {
      let content = '';
      if (file.name.endsWith('.pdf')) {
        content = await extractPdfText(file);
      } else {
        content = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string || '');
          reader.readAsText(file);
        });
      }
      const pages = (content.match(/\[Pág \d+\]/g) || []).length || 1;
      setStudyMaterials(prev => [...prev, {
        id: `sm-${Date.now()}`, title: file.name.replace(/\.[^.]+$/, ''),
        content, pages, addedAt: new Date().toISOString()
      }]);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
    setUploadingPdf(false);
    e.target.value = '';
  };

  const generateStudyPlan = async () => {
    setStudyLoading(true);
    const materialsInfo = studyMaterials.map(m => `"${m.title}" (${m.pages} pág)`).join(', ');
    const reply = await studyAI(
      [{ role: 'user', content: `Crea un plan de estudio semanal para estos materiales: ${materialsInfo || 'curso de medicina de familia'}. Tengo guardias de 24h los martes y viernes. Sesiones de 30-45 min. Formato: una línea por día con "DIA | TEMA | DURACIÓN". Solo las 7 líneas, sin explicación extra.` }],
      studyContext
    );
    // Parse plan
    const lines = reply.split('\n').filter(l => l.includes('|')).slice(0, 7);
    const plan = lines.map(l => {
      const parts = l.split('|').map(p => p.trim());
      return { day: parts[0] || '', topic: parts[1] || '', duration: parts[2] || '30 min', done: false };
    });
    if (plan.length > 0) setStudyPlan(plan);
    setStudyLoading(false);
  };

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
          { id: 'study', label: '🧠 Modo Estudio' },
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

      {/* ═══ STUDY MODE ═══ */}
      {activeTab === 'study' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2">
          {/* Header */}
          <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 rounded-2xl p-6 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full blur-[60px]" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center"><Brain size={28} /></div>
              <div>
                <h3 className="text-2xl font-black">Modo Estudio IA</h3>
                <p className="text-white/60 text-sm font-bold">Sube materiales del curso, la IA los resume, genera flashcards y planifica tu estudio</p>
              </div>
            </div>
            <div className="flex gap-3 mt-4 text-[10px] font-bold uppercase tracking-wider text-white/50">
              <span>📄 {studyMaterials.length} materiales</span>
              <span>💬 {studyChat.length} mensajes</span>
              <span>📋 {studyPlan.length} sesiones planificadas</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT: Materials + Plan */}
            <div className="space-y-4">
              {/* Upload materials */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2"><FileText size={14} className="text-violet-500" /> Materiales del curso</h4>
                <input ref={studyFileRef} type="file" accept=".pdf,.txt,.md,.doc" className="hidden" onChange={handleStudyFileUpload} />
                <button onClick={() => studyFileRef.current?.click()} disabled={uploadingPdf}
                  className="w-full py-3 border-2 border-dashed border-violet-200 dark:border-violet-700 rounded-xl text-xs font-bold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {uploadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploadingPdf ? 'Procesando...' : 'Subir PDF / documento del curso'}
                </button>
                <div className="mt-3 space-y-2">
                  {studyMaterials.map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl group">
                      <div className="w-8 h-8 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center text-red-600 flex-shrink-0"><FileText size={14} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{m.title}</p>
                        <p className="text-[9px] text-slate-400">{m.pages} pág · {new Date(m.addedAt).toLocaleDateString('es-ES')}</p>
                      </div>
                      <button onClick={() => setStudyMaterials(prev => prev.filter(x => x.id !== m.id))} className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Study Plan */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2"><Calendar size={14} className="text-blue-500" /> Plan de estudio</h4>
                  <button onClick={generateStudyPlan} disabled={studyLoading}
                    className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-[10px] font-bold hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1">
                    {studyLoading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} Generar
                  </button>
                </div>
                {studyPlan.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">Sube materiales y pulsa "Generar" para crear un plan adaptado a tus guardias</p>
                ) : (
                  <div className="space-y-1.5">
                    {studyPlan.map((session, i) => (
                      <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${session.done ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-slate-50 dark:bg-slate-900'}`}>
                        <button onClick={() => setStudyPlan(prev => prev.map((s, j) => j === i ? { ...s, done: !s.done } : s))}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${session.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                          {session.done && <CheckCircle2 size={12} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] font-bold ${session.done ? 'text-emerald-600 dark:text-emerald-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>{session.topic}</p>
                          <p className="text-[9px] text-slate-400">{session.day} · {session.duration}</p>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between text-[10px] text-slate-400 font-bold">
                      <span>{studyPlan.filter(s => s.done).length}/{studyPlan.length} completadas</span>
                      <button onClick={() => setStudyPlan([])} className="text-red-400 hover:text-red-500">Limpiar</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick prompts */}
              <div className="space-y-1.5">
                {[
                  { emoji: '📝', text: 'Resume los puntos clave del material' },
                  { emoji: '🃏', text: 'Genera 10 flashcards de repaso' },
                  { emoji: '📋', text: 'Crea un test tipo MIR con 10 preguntas' },
                  { emoji: '🗺️', text: 'Haz un mapa conceptual del tema' },
                  { emoji: '📅', text: 'Planifica mi estudio para esta semana con guardias martes y viernes' },
                ].map((p, i) => (
                  <button key={i} onClick={() => handleStudyChat(p.text)}
                    className="w-full text-left px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:border-violet-300 hover:text-violet-600 transition-all">
                    {p.emoji} {p.text}
                  </button>
                ))}
              </div>
            </div>

            {/* RIGHT: AI Chat (2 columns wide) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col" style={{ minHeight: '600px' }}>
              <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-violet-50/50 dark:bg-violet-500/5 flex items-center justify-between">
                <h4 className="text-xs font-black text-violet-700 dark:text-violet-300 uppercase tracking-wider flex items-center gap-2"><Brain size={14} /> Tutor IA de Estudio</h4>
                {studyChat.length > 0 && <button onClick={() => setStudyChat([])} className="text-[9px] font-bold text-slate-400 hover:text-red-500 flex items-center gap-1"><RefreshCw size={10} /> Limpiar</button>}
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[550px]">
                {studyChat.length === 0 && (
                  <div className="text-center py-20">
                    <Brain size={40} className="mx-auto text-violet-200 dark:text-violet-800 mb-4" />
                    <h4 className="font-black text-lg text-slate-800 dark:text-white mb-2">Tu tutor personal de estudio</h4>
                    <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">Sube los PDFs de tu curso y pregúntame lo que quieras. Puedo resumir, generar flashcards, crear tests tipo MIR y planificar tu estudio.</p>
                    {studyMaterials.length === 0 && (
                      <button onClick={() => studyFileRef.current?.click()} className="px-6 py-3 bg-violet-600 text-white rounded-xl text-xs font-black hover:bg-violet-700 transition-all shadow-lg shadow-violet-600/20 flex items-center gap-2 mx-auto">
                        <Upload size={14} /> Subir material del curso
                      </button>
                    )}
                  </div>
                )}
                {studyChat.map(m => (
                  <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'assistant' && <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-lg"><Brain size={14} className="text-white" /></div>}
                    <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${m.role === 'user' ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200'}`}>
                      <pre className="text-sm font-sans whitespace-pre-wrap leading-relaxed break-words">{m.content}</pre>
                    </div>
                    {m.role === 'user' && <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center flex-shrink-0 mt-1"><GraduationCap size={14} className="text-slate-500" /></div>}
                  </div>
                ))}
                {studyLoading && (
                  <div className="flex gap-3"><div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><Brain size={14} className="text-white" /></div>
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm text-violet-600 font-bold flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Estudiando los materiales...</div></div>
                )}
                <div ref={studyChatRef} />
              </div>

              <div className="border-t border-slate-100 dark:border-slate-700 p-4 bg-slate-50/50 dark:bg-slate-900/30 flex gap-3">
                <textarea value={studyChatIn} onChange={e => setStudyChatIn(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleStudyChat(); } }}
                  placeholder="Pregunta sobre el curso, pide resúmenes, flashcards, tests..."
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none min-h-[48px] max-h-[100px]" rows={1} />
                <button onClick={() => handleStudyChat()} disabled={!studyChatIn.trim() || studyLoading}
                  className="w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-2xl flex items-center justify-center disabled:opacity-40 shadow-lg flex-shrink-0">
                  {studyLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningView;
