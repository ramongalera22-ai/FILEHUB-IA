import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GraduationCap, Plus, Trash2, X, Save, Clock, BookOpen, Upload, FileText,
  Send, Sparkles, Brain, Eye, ChevronDown, ChevronUp, CheckCircle2, Circle,
  Presentation, File, Loader2, Copy, Check, Star, Calendar, Tag, MessageCircle,
  Play, Pause, RotateCcw, Zap, Search, Filter
} from 'lucide-react';

const OPENROUTER_KEY = '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';
const AI_MODEL = 'anthropic/claude-haiku-4.5';

// ─── Types ───
interface CourseItem {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  url?: string;
  notes: string;
  createdAt: string;
}

interface SessionItem {
  id: string;
  title: string;
  description: string;
  courseId?: string;
  status: 'pending' | 'prepared' | 'done';
  date: string;
  fileContent?: string;
  fileName?: string;
  fileType?: 'pdf' | 'pptx';
  aiSummary?: string;
  aiFlashcards?: string[];
  notes: string;
  createdAt: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── PDF Extraction ───
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
    for (let i = 1; i <= Math.min(pdf.numPages, 100); i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      pages.push(`[Pág ${i}]\n${(tc.items as any[]).map((it: any) => it.str).join(' ').trim()}`);
    }
    return pages.join('\n\n') || 'No se pudo extraer texto del PDF.';
  } catch { return 'Error extrayendo PDF.'; }
}

// ─── PPTX Extraction ───
async function extractPptxText(file: File): Promise<string> {
  try {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const slides: string[] = [];
    const slideFiles = Object.keys(zip.files).filter(n => n.match(/ppt\/slides\/slide\d+\.xml/)).sort();
    for (const sf of slideFiles) {
      const xml = await zip.files[sf].async('text');
      const texts = xml.match(/<a:t>([^<]*)<\/a:t>/g)?.map(t => t.replace(/<\/?a:t>/g, '')) || [];
      if (texts.length) slides.push(`[Slide ${slides.length + 1}]\n${texts.join(' ')}`);
    }
    return slides.join('\n\n') || 'No se pudo extraer texto del PPTX.';
  } catch { return 'Error extrayendo PPTX.'; }
}

// ─── AI Call ───
async function callAI(messages: { role: string; content: string }[]): Promise<string> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENROUTER_KEY}` },
      body: JSON.stringify({ model: AI_MODEL, max_tokens: 2000, messages }),
    });
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || 'Sin respuesta.';
  } catch { return 'Error conectando con la IA.'; }
}

// ─── Persistence ───
const STORAGE_KEY = 'filehub_courses_sessions';
function loadData(): { courses: CourseItem[]; sessions: SessionItem[] } {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"courses":[],"sessions":[]}'); }
  catch { return { courses: [], sessions: [] }; }
}
function saveData(courses: CourseItem[], sessions: SessionItem[]) {
  const clean = sessions.map(s => ({ ...s, fileContent: s.fileContent?.substring(0, 50000) }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ courses, sessions: clean }));
}

// ─── Status helpers ───
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  'in-progress': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  prepared: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  done: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
};
const STATUS_LABELS: Record<string, string> = {
  pending: '⏳ Pendiente', 'in-progress': '🔄 En curso', completed: '✅ Completado',
  prepared: '📝 Preparada', done: '✅ Realizada',
};
const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-500/15 text-slate-400', medium: 'bg-amber-500/15 text-amber-400', high: 'bg-red-500/15 text-red-400',
};
const CATEGORIES = ['Medicina', 'IA / Tech', 'Idiomas', 'Investigación', 'Oposiciones', 'Otro'];

export default function CoursesSessionsView() {
  const [tab, setTab] = useState<'courses' | 'sessions' | 'ai'>('courses');
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCat, setFilterCat] = useState('all');

  // Course form
  const [cf, setCf] = useState({ title: '', description: '', category: 'Medicina', status: 'pending' as CourseItem['status'], priority: 'medium' as CourseItem['priority'], url: '', notes: '' });

  // Session form
  const [sf, setSf] = useState({ title: '', description: '', courseId: '', status: 'pending' as SessionItem['status'], date: new Date().toISOString().split('T')[0], notes: '' });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // AI Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [activeSessionForAI, setActiveSessionForAI] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load
  useEffect(() => {
    const d = loadData();
    setCourses(d.courses);
    setSessions(d.sessions);
  }, []);

  // Save
  useEffect(() => { saveData(courses, sessions); }, [courses, sessions]);

  // Auto-scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  // ─── Course CRUD ───
  const addCourse = () => {
    if (!cf.title.trim()) return;
    if (editId) {
      setCourses(prev => prev.map(c => c.id === editId ? { ...c, ...cf } : c));
      setEditId(null);
    } else {
      setCourses(prev => [{ ...cf, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...prev]);
    }
    setCf({ title: '', description: '', category: 'Medicina', status: 'pending', priority: 'medium', url: '', notes: '' });
    setShowForm(false);
  };

  const deleteCourse = (id: string) => {
    if (!confirm('¿Eliminar este curso?')) return;
    setCourses(prev => prev.filter(c => c.id !== id));
  };

  const editCourse = (c: CourseItem) => {
    setCf({ title: c.title, description: c.description, category: c.category, status: c.status, priority: c.priority, url: c.url || '', notes: c.notes });
    setEditId(c.id);
    setShowForm(true);
    setTab('courses');
  };

  // ─── Session CRUD ───
  const addSession = async () => {
    if (!sf.title.trim()) return;
    let fileContent = '';
    let fileName = '';
    let fileType: 'pdf' | 'pptx' | undefined;

    if (uploadFile) {
      setUploading(true);
      if (uploadFile.name.endsWith('.pdf')) {
        fileContent = await extractPdfText(uploadFile);
        fileType = 'pdf';
      } else if (uploadFile.name.endsWith('.pptx')) {
        fileContent = await extractPptxText(uploadFile);
        fileType = 'pptx';
      }
      fileName = uploadFile.name;
      setUploading(false);
    }

    if (editId) {
      setSessions(prev => prev.map(s => s.id === editId ? { ...s, ...sf, ...(fileContent ? { fileContent, fileName, fileType } : {}) } : s));
      setEditId(null);
    } else {
      setSessions(prev => [{ ...sf, id: crypto.randomUUID(), fileContent, fileName, fileType, createdAt: new Date().toISOString() }, ...prev]);
    }
    setSf({ title: '', description: '', courseId: '', status: 'pending', date: new Date().toISOString().split('T')[0], notes: '' });
    setUploadFile(null);
    setShowForm(false);
  };

  const deleteSession = (id: string) => {
    if (!confirm('¿Eliminar esta sesión?')) return;
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  // ─── AI Functions ───
  const startAIChat = (sessionId?: string) => {
    setActiveSessionForAI(sessionId || null);
    setTab('ai');
    const session = sessionId ? sessions.find(s => s.id === sessionId) : null;
    if (session?.fileContent) {
      setChatMessages([{
        role: 'assistant',
        content: `📄 He cargado "${session.fileName}" (${session.fileType?.toUpperCase()}). Puedo:\n\n• 📝 **Resumir** el contenido\n• 🃏 **Crear flashcards** para estudiar\n• ❓ **Generar preguntas** de examen\n• 🎯 **Extraer conceptos clave**\n• 📋 **Crear un esquema** de la presentación\n\n¿Qué necesitas?`
      }]);
    } else {
      setChatMessages([{
        role: 'assistant',
        content: `¡Hola! Soy tu asistente de estudio. Puedo ayudarte con:\n\n• 📝 Preparar sesiones y presentaciones\n• 🃏 Crear flashcards y resúmenes\n• ❓ Generar preguntas de examen\n• 📚 Explicar conceptos médicos\n• 🎯 Planificar tu estudio\n\n¿En qué te ayudo?`
      }]);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);

    const session = activeSessionForAI ? sessions.find(s => s.id === activeSessionForAI) : null;
    const contextMsg = session?.fileContent
      ? `Contexto: Tengo un archivo "${session.fileName}" con este contenido:\n\n${session.fileContent.substring(0, 15000)}\n\n---\nResponde en español. Sé conciso y útil. Si te piden flashcards, usa formato "P: ... / R: ...". Si te piden resumen, usa bullets cortos.`
      : 'Eres un asistente de estudio para un médico de familia. Responde en español, sé conciso y práctico.';

    const messages = [
      { role: 'system', content: contextMsg },
      ...chatMessages.slice(-8).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMsg },
    ];

    const reply = await callAI(messages);
    setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    setChatLoading(false);
  };

  const generateSummary = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session?.fileContent) return;
    setChatLoading(true);
    const summary = await callAI([
      { role: 'system', content: 'Eres un asistente de estudio. Genera un resumen conciso en español con los puntos clave.' },
      { role: 'user', content: `Resume este contenido en bullets concisos:\n\n${session.fileContent.substring(0, 20000)}` }
    ]);
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, aiSummary: summary } : s));
    setChatLoading(false);
  };

  const generateFlashcards = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session?.fileContent) return;
    setChatLoading(true);
    const result = await callAI([
      { role: 'system', content: 'Genera 10 flashcards en formato "P: pregunta\nR: respuesta" basadas en el contenido. En español.' },
      { role: 'user', content: session.fileContent.substring(0, 20000) }
    ]);
    const cards = result.split('\n').filter(l => l.startsWith('P:') || l.startsWith('R:'));
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, aiFlashcards: cards } : s));
    setChatLoading(false);
  };

  // ─── Filters ───
  const filteredCourses = courses
    .filter(c => filterStatus === 'all' || c.status === filterStatus)
    .filter(c => filterCat === 'all' || c.category === filterCat)
    .filter(c => !search || c.title.toLowerCase().includes(search.toLowerCase()));

  const filteredSessions = sessions
    .filter(s => filterStatus === 'all' || s.status === filterStatus)
    .filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase()));

  const stats = {
    totalCourses: courses.length,
    pendingCourses: courses.filter(c => c.status === 'pending').length,
    activeCourses: courses.filter(c => c.status === 'in-progress').length,
    totalSessions: sessions.length,
    withFiles: sessions.filter(s => s.fileContent).length,
  };

  // ═══════════════════════════════════════════════
  return (
    <div className="h-full overflow-y-auto bg-[#0a0e1a] text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0e1a]/95 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
              <GraduationCap size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">Cursos & Sesiones</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Tablón de formación + IA</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {Object.entries(stats).map(([k, v]) => (
              <span key={k} className="hidden md:inline px-2 py-1 bg-white/5 rounded-lg text-[10px] font-bold text-slate-400">
                {k === 'totalCourses' ? '📚' : k === 'pendingCourses' ? '⏳' : k === 'activeCourses' ? '🔄' : k === 'totalSessions' ? '🎓' : '📄'} {v}
              </span>
            ))}
            <button onClick={() => { setShowForm(true); setEditId(null); }} className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-xs font-bold transition-all">
              <Plus size={14} /> Nuevo
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
          {[
            { id: 'courses', label: '📚 Cursos', count: courses.length },
            { id: 'sessions', label: '🎓 Sesiones', count: sessions.length },
            { id: 'ai', label: '🤖 Asistente IA', count: null },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${tab === t.id ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
              {t.label} {t.count !== null && <span className="ml-1 text-[10px] opacity-60">({t.count})</span>}
            </button>
          ))}
        </div>

        {/* Search + Filters */}
        {tab !== 'ai' && (
          <div className="flex gap-2 mt-3">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-violet-500" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs">
              <option value="all">Todos</option>
              {tab === 'courses'
                ? <><option value="pending">Pendiente</option><option value="in-progress">En curso</option><option value="completed">Completado</option></>
                : <><option value="pending">Pendiente</option><option value="prepared">Preparada</option><option value="done">Realizada</option></>
              }
            </select>
            {tab === 'courses' && (
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs">
                <option value="all">Categoría</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      {/* ═══ FORM MODAL ═══ */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-[#111827] rounded-2xl border border-white/10 w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black">{editId ? 'Editar' : 'Nuevo'} {tab === 'courses' ? 'Curso' : 'Sesión'}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
            </div>

            {tab === 'courses' ? (
              <>
                <input value={cf.title} onChange={e => setCf({ ...cf, title: e.target.value })} placeholder="Nombre del curso"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:border-violet-500 focus:outline-none" autoFocus />
                <textarea value={cf.description} onChange={e => setCf({ ...cf, description: e.target.value })} placeholder="Descripción..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm h-20 resize-none focus:border-violet-500 focus:outline-none" />
                <div className="grid grid-cols-3 gap-2">
                  <select value={cf.category} onChange={e => setCf({ ...cf, category: e.target.value })}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={cf.status} onChange={e => setCf({ ...cf, status: e.target.value as any })}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs">
                    <option value="pending">Pendiente</option><option value="in-progress">En curso</option><option value="completed">Completado</option>
                  </select>
                  <select value={cf.priority} onChange={e => setCf({ ...cf, priority: e.target.value as any })}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs">
                    <option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option>
                  </select>
                </div>
                <input value={cf.url} onChange={e => setCf({ ...cf, url: e.target.value })} placeholder="URL del curso (opcional)"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:border-violet-500 focus:outline-none" />
                <textarea value={cf.notes} onChange={e => setCf({ ...cf, notes: e.target.value })} placeholder="Notas..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm h-16 resize-none focus:border-violet-500 focus:outline-none" />
              </>
            ) : (
              <>
                <input value={sf.title} onChange={e => setSf({ ...sf, title: e.target.value })} placeholder="Título de la sesión"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:border-violet-500 focus:outline-none" autoFocus />
                <textarea value={sf.description} onChange={e => setSf({ ...sf, description: e.target.value })} placeholder="Descripción..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm h-20 resize-none focus:border-violet-500 focus:outline-none" />
                <div className="grid grid-cols-3 gap-2">
                  <select value={sf.courseId} onChange={e => setSf({ ...sf, courseId: e.target.value })}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs">
                    <option value="">Sin curso</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  <select value={sf.status} onChange={e => setSf({ ...sf, status: e.target.value as any })}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs">
                    <option value="pending">Pendiente</option><option value="prepared">Preparada</option><option value="done">Realizada</option>
                  </select>
                  <input type="date" value={sf.date} onChange={e => setSf({ ...sf, date: e.target.value })}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs" />
                </div>
                {/* File upload */}
                <div className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center hover:border-violet-500/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}>
                  <input ref={fileInputRef} type="file" accept=".pdf,.pptx" className="hidden"
                    onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                  {uploadFile ? (
                    <div className="flex items-center justify-center gap-2">
                      {uploadFile.name.endsWith('.pdf') ? <FileText size={20} className="text-red-400" /> : <Presentation size={20} className="text-orange-400" />}
                      <span className="text-xs font-bold">{uploadFile.name}</span>
                      <button onClick={e => { e.stopPropagation(); setUploadFile(null); }} className="text-slate-500 hover:text-red-400"><X size={14} /></button>
                    </div>
                  ) : (
                    <>
                      <Upload size={24} className="mx-auto text-slate-500 mb-2" />
                      <p className="text-xs text-slate-400">Subir <strong>PDF</strong> o <strong>PPTX</strong></p>
                      <p className="text-[10px] text-slate-600 mt-1">La IA podrá analizar el contenido</p>
                    </>
                  )}
                </div>
                <textarea value={sf.notes} onChange={e => setSf({ ...sf, notes: e.target.value })} placeholder="Notas..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm h-16 resize-none focus:border-violet-500 focus:outline-none" />
              </>
            )}

            <button onClick={tab === 'courses' ? addCourse : addSession} disabled={uploading}
              className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
              {uploading ? <><Loader2 size={16} className="animate-spin" /> Procesando archivo...</> : <><Save size={16} /> {editId ? 'Guardar cambios' : 'Crear'}</>}
            </button>
          </div>
        </div>
      )}

      {/* ═══ COURSES TAB ═══ */}
      {tab === 'courses' && (
        <div className="p-4 space-y-3">
          {filteredCourses.length === 0 && (
            <div className="text-center py-16">
              <GraduationCap size={40} className="mx-auto text-slate-700 mb-3" />
              <p className="text-sm font-bold text-slate-500">No hay cursos</p>
              <p className="text-xs text-slate-600 mt-1">Pulsa "Nuevo" para añadir tu primer curso</p>
            </div>
          )}
          {filteredCourses.map(c => (
            <div key={c.id} className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-2xl p-4 transition-all group">
              <div className="flex items-start gap-3">
                <button onClick={() => {
                  const next = c.status === 'pending' ? 'in-progress' : c.status === 'in-progress' ? 'completed' : 'pending';
                  setCourses(prev => prev.map(x => x.id === c.id ? { ...x, status: next } : x));
                }} className="mt-0.5 shrink-0">
                  {c.status === 'completed' ? <CheckCircle2 size={20} className="text-emerald-400" /> : c.status === 'in-progress' ? <Play size={20} className="text-blue-400" /> : <Circle size={20} className="text-slate-600" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`text-sm font-bold ${c.status === 'completed' ? 'line-through text-slate-500' : 'text-white'}`}>{c.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[c.status]}`}>{STATUS_LABELS[c.status]}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[c.priority]}`}>{c.priority === 'high' ? '🔴' : c.priority === 'medium' ? '🟡' : '🟢'}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400">{c.category}</span>
                  </div>
                  {c.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.description}</p>}
                  {c.url && <a href={c.url} target="_blank" className="text-[10px] text-indigo-400 hover:underline mt-1 block truncate">{c.url}</a>}
                  {c.notes && <p className="text-[10px] text-slate-600 mt-1 italic">{c.notes}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => editCourse(c)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white"><FileText size={14} /></button>
                  <button onClick={() => deleteCourse(c.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ SESSIONS TAB ═══ */}
      {tab === 'sessions' && (
        <div className="p-4 space-y-3">
          {filteredSessions.length === 0 && (
            <div className="text-center py-16">
              <Presentation size={40} className="mx-auto text-slate-700 mb-3" />
              <p className="text-sm font-bold text-slate-500">No hay sesiones</p>
              <p className="text-xs text-slate-600 mt-1">Sube un PDF o PPTX y la IA te ayudará a prepararlo</p>
            </div>
          )}
          {filteredSessions.map(s => {
            const course = s.courseId ? courses.find(c => c.id === s.courseId) : null;
            return (
              <div key={s.id} className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-2xl p-4 transition-all group">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {s.fileType === 'pdf' ? <FileText size={20} className="text-red-400" /> : s.fileType === 'pptx' ? <Presentation size={20} className="text-orange-400" /> : <BookOpen size={20} className="text-slate-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-white">{s.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[s.status]}`}>{STATUS_LABELS[s.status]}</span>
                      {course && <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400">📚 {course.title}</span>}
                      <span className="text-[10px] text-slate-600">{s.date}</span>
                    </div>
                    {s.description && <p className="text-xs text-slate-500 mt-1">{s.description}</p>}
                    {s.fileName && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] px-2 py-1 bg-white/5 rounded-lg text-slate-400 flex items-center gap-1">
                          {s.fileType === 'pdf' ? <FileText size={10} className="text-red-400" /> : <Presentation size={10} className="text-orange-400" />}
                          {s.fileName}
                        </span>
                      </div>
                    )}
                    {/* AI Actions */}
                    {s.fileContent && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => generateSummary(s.id)} disabled={chatLoading}
                          className="flex items-center gap-1 px-2 py-1 bg-violet-500/10 hover:bg-violet-500/20 rounded-lg text-[10px] font-bold text-violet-400 transition-all disabled:opacity-50">
                          <Sparkles size={10} /> Resumen IA
                        </button>
                        <button onClick={() => generateFlashcards(s.id)} disabled={chatLoading}
                          className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg text-[10px] font-bold text-amber-400 transition-all disabled:opacity-50">
                          <Brain size={10} /> Flashcards
                        </button>
                        <button onClick={() => startAIChat(s.id)}
                          className="flex items-center gap-1 px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg text-[10px] font-bold text-indigo-400 transition-all">
                          <MessageCircle size={10} /> Chat IA
                        </button>
                      </div>
                    )}
                    {/* AI Summary */}
                    {s.aiSummary && (
                      <div className="mt-3 p-3 bg-violet-500/5 border border-violet-500/10 rounded-xl">
                        <p className="text-[10px] font-bold text-violet-400 mb-1">📝 Resumen IA</p>
                        <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{s.aiSummary}</p>
                      </div>
                    )}
                    {/* AI Flashcards */}
                    {s.aiFlashcards && s.aiFlashcards.length > 0 && (
                      <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                        <p className="text-[10px] font-bold text-amber-400 mb-2">🃏 Flashcards</p>
                        <div className="space-y-1">
                          {s.aiFlashcards.map((card, i) => (
                            <p key={i} className={`text-xs ${card.startsWith('P:') ? 'font-bold text-white' : 'text-slate-400 mb-2'}`}>{card}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { const next = s.status === 'pending' ? 'prepared' : s.status === 'prepared' ? 'done' : 'pending'; setSessions(prev => prev.map(x => x.id === s.id ? { ...x, status: next } : x)); }}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white"><CheckCircle2 size={14} /></button>
                    <button onClick={() => deleteSession(s.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ AI CHAT TAB ═══ */}
      {tab === 'ai' && (
        <div className="flex flex-col h-[calc(100vh-200px)]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${m.role === 'user'
                  ? 'bg-violet-600 text-white rounded-br-md'
                  : 'bg-white/5 text-slate-300 rounded-bl-md border border-white/5'
                }`}>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/5 rounded-2xl rounded-bl-md px-4 py-3">
                  <Loader2 size={16} className="animate-spin text-violet-400" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick actions */}
          {chatMessages.length <= 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {['Resume el archivo', 'Crea 10 flashcards', 'Genera preguntas de examen', 'Explica los conceptos clave', 'Haz un esquema'].map(q => (
                <button key={q} onClick={() => { setChatInput(q); }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-bold text-slate-400 transition-all">
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-white/5 p-4">
            <div className="flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                placeholder="Pregunta a la IA sobre tus cursos..."
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500" />
              <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
                className="px-4 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl transition-all">
                <Send size={16} />
              </button>
            </div>
            {activeSessionForAI && (
              <p className="text-[10px] text-slate-600 mt-1">
                📄 Contexto: {sessions.find(s => s.id === activeSessionForAI)?.fileName || 'sesión'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
