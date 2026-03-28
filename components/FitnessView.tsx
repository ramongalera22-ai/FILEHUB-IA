
import React, { useState, useRef, useMemo } from 'react';
import { CalendarEvent, TrainingSession, TrainingPlan, WorkDocument } from '../types';
import {
  Dumbbell, Plus, TrendingUp, Flame, Timer, Activity, ChevronRight, X,
  FileText, Loader2, Calendar, UploadCloud, FileSpreadsheet, CheckCircle2,
  Table, CalendarDays, BrainCircuit, Sparkles, Trash2, Edit3, ClipboardList,
  Brain, Share2, ArrowUpRight, Target, Zap, Award, ChevronLeft, Clock,
  HeartPulse, BarChart3
} from 'lucide-react';
import { extractTrainingPlanFromPDF, generateTrainingPlan } from '../services/openrouterService';

const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_KEY || '';

async function generatePlanAI(goal: string, days: number): Promise<string> {
  if (!OPENROUTER_KEY) return 'Configura tu API key de OpenRouter.';
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'HTTP-Referer': 'https://ramongalera22-ai.github.io/FILEHUB-IA' },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4.5', max_tokens: 1200,
        messages: [{ role: 'user', content: `Crea un plan de entrenamiento de ${days} días para: ${goal}. Soy médico con guardias de 24h, necesito entrenamientos de 30-45 min máximo. Incluye: día, tipo de ejercicio, duración, series/reps, intensidad y consejo de recuperación. Responde en español con emojis.` }]
      })
    });
    const d = await res.json();
    return d.choices?.[0]?.message?.content || 'Error generando plan.';
  } catch { return 'Error de conexión.'; }
}
import { BotPanelFitness } from './BotPanel';

// Session type configs
const SESSION_TYPES = [
  { id: 'strength', label: 'Fuerza', emoji: '🏋️', color: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
  { id: 'cardio', label: 'Cardio', emoji: '🏃', color: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  { id: 'flexibility', label: 'Flexibilidad', emoji: '🧘', color: 'bg-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  { id: 'sport', label: 'Deporte', emoji: '⚽', color: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
];

const INTENSITY_LEVELS = [
  { id: 'low', label: 'Baja', emoji: '🟢', color: 'text-emerald-500' },
  { id: 'medium', label: 'Media', emoji: '🟡', color: 'text-amber-500' },
  { id: 'high', label: 'Alta', emoji: '🔴', color: 'text-red-500' },
];

interface FitnessViewProps {
  sessions: TrainingSession[];
  plans: TrainingPlan[];
  onAddSession: (session: TrainingSession) => void;
  onDeleteSession: (id: string) => void;
  onAddPlan: (plan: TrainingPlan) => void;
  onDeletePlan: (id: string) => void;
  onSyncPlan: (events: CalendarEvent[]) => void;
  onUpdateSession: (session: TrainingSession) => void;
}

const FitnessView: React.FC<FitnessViewProps> = ({
  sessions, plans, onAddSession, onDeleteSession, onAddPlan, onDeletePlan, onSyncPlan, onUpdateSession
}) => {
  const [activeTab, setActiveTab] = useState<'weekly' | 'plans' | 'table' | 'notebook' | 'files'>('weekly');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPlanResult, setAiPlanResult] = useState('');
  const [daysCount, setDaysCount] = useState(7);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [documents, setDocuments] = useState<WorkDocument[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Inline add session state
  const [addingForDate, setAddingForDate] = useState<string | null>(null);
  const [newSession, setNewSession] = useState({
    title: '',
    type: 'strength' as TrainingSession['type'],
    duration: 30,
    intensity: 'medium' as TrainingSession['intensity'],
    notes: ''
  });

  // Week navigation
  const [weekOffset, setWeekOffset] = useState(0);

  const weekDays = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) + (weekOffset * 7);
    startOfWeek.setDate(diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  // ── STATS ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const today = new Date();
    const thisWeekStart = new Date(today);
    const dayOfWeek = thisWeekStart.getDay();
    thisWeekStart.setDate(thisWeekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    const thisWeekStr = thisWeekStart.toISOString().split('T')[0];

    const weekSessions = sessions.filter(s => s.date >= thisWeekStr);
    const completedThisWeek = weekSessions.filter(s => s.status === 'completed');
    const plannedThisWeek = weekSessions.filter(s => s.status === 'planned');
    const totalMinutes = completedThisWeek.reduce((acc, s) => acc + s.duration, 0);

    // Streak
    let streak = 0;
    const check = new Date(today);
    while (true) {
      const dateStr = check.toISOString().split('T')[0];
      const hasCompleted = sessions.some(s => s.date === dateStr && s.status === 'completed');
      if (hasCompleted) { streak++; check.setDate(check.getDate() - 1); } else { break; }
    }

    const totalCompleted = sessions.filter(s => s.status === 'completed').length;
    const weeklyGoal = 5;
    const weeklyProgress = Math.min(100, Math.round((completedThisWeek.length / weeklyGoal) * 100));

    return { completedThisWeek: completedThisWeek.length, plannedThisWeek: plannedThisWeek.length, totalMinutes, streak, totalCompleted, weeklyProgress, weeklyGoal };
  }, [sessions]);

  // ── HANDLERS ──────────────────────────────────────────────────────
  const handleGenerateAIPlan = async () => {
    if (!goalInput.trim()) return;
    setGeneratingAI(true);
    const result = await generatePlanAI(goalInput, daysCount);
    setAiPlanResult(result);
    setGeneratingAI(false);
  };

  const saveNotesAsDocument = () => {
    if (!notes.trim()) return;
    const newDoc: WorkDocument = {
      id: `fit-doc-${Date.now()}`, name: `Nota Entrenamiento ${new Date().toLocaleDateString('es-ES')}`,
      type: 'text', uploadDate: new Date().toISOString().split('T')[0], content: notes
    };
    setDocuments([...documents, newDoc]); setNotes(''); setActiveTab('files');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, engine: 'gemini' | 'ollama' = 'gemini') => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsGenerating(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const extracted = await extractTrainingPlanFromPDF(base64);
        const newPlan: TrainingPlan = {
          id: `plan-${Date.now()}`, name: file.name.replace('.pdf', ''),
          description: `Plan importado con ${engine}`, durationWeeks: 4,
          sessions: extracted.map((s: any) => ({ ...s, status: 'planned' })), source: 'file'
        };
        onAddPlan(newPlan);
        newPlan.sessions.forEach(s => onAddSession(s));
        onSyncPlan(newPlan.sessions.map((s: any) => ({ id: s.id, title: s.title, start: s.date, end: s.date, type: 'fitness' })));
      } catch (error) { console.error(error); } finally { setIsGenerating(false); }
    };
    reader.readAsDataURL(file); event.target.value = '';
  };

  const handleGeneratePlan = async () => {
    if (!goalInput) return;
    setIsGenerating(true);
    try {
      const newSessions = await generateTrainingPlan(goalInput);
      const newPlan: TrainingPlan = {
        id: `gen-${Date.now()}`, name: `Plan IA: ${goalInput.substring(0, 15)}...`,
        description: goalInput, durationWeeks: 1, sessions: newSessions, source: 'ai'
      };
      onAddPlan(newPlan); newSessions.forEach(s => onAddSession(s));
      setGoalInput(''); setShowModal(false);
    } catch (e) { console.error(e); } finally { setIsGenerating(false); }
  };

  const handleAddSession = (dateStr: string) => {
    if (!newSession.title.trim()) return;
    const session: TrainingSession = {
      id: `session-${Date.now()}`, title: newSession.title, date: dateStr,
      type: newSession.type, duration: newSession.duration,
      intensity: newSession.intensity, notes: newSession.notes || undefined, status: 'planned'
    };
    onAddSession(session);
    setNewSession({ title: '', type: 'strength', duration: 30, intensity: 'medium', notes: '' });
    setAddingForDate(null);
  };

  const getSessionTypeConfig = (type: string) => SESSION_TYPES.find(t => t.id === type) || SESSION_TYPES[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="px-4 pb-2 pt-4"><BotPanelFitness /></div>

      {/* ── HEADER ──────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Centro de Entrenamiento</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-1">Gestión de rutinas, planes IA y calendario atlético.</p>
        </div>
        <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'weekly', label: 'Semana', icon: CalendarDays },
            { id: 'plans', label: 'Planes', icon: ClipboardList },
            { id: 'table', label: 'Sesiones', icon: Table },
            { id: 'files', label: 'Docs', icon: FileText },
            { id: 'notebook', label: 'Cuaderno', icon: Edit3 },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── STATS DASHBOARD ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Flame, label: 'Racha', value: stats.streak, unit: 'días', gradient: 'from-emerald-500 to-emerald-600' },
          { icon: CheckCircle2, label: 'Esta semana', value: stats.completedThisWeek, unit: `/ ${stats.weeklyGoal}`, gradient: 'from-blue-500 to-blue-600' },
          { icon: Timer, label: 'Minutos', value: stats.totalMinutes, unit: 'min', gradient: 'from-purple-500 to-purple-600' },
          { icon: Award, label: 'Total', value: stats.totalCompleted, unit: 'sesiones', gradient: 'from-amber-500 to-orange-500' },
        ].map((s, i) => (
          <div key={i} className={`bg-gradient-to-br ${s.gradient} rounded-2xl p-5 text-white relative overflow-hidden`}>
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl" />
            <div className="flex items-center gap-2 mb-3">
              <s.icon size={18} className="opacity-80" />
              <span className="text-[10px] font-black uppercase tracking-wider opacity-80">{s.label}</span>
            </div>
            <p className="text-3xl font-black">{s.value}<span className="text-lg opacity-70 ml-1">{s.unit}</span></p>
          </div>
        ))}
      </div>

      {/* Weekly progress bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Target size={14} className="text-indigo-500" /> Progreso semanal
          </span>
          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{stats.weeklyProgress}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${stats.weeklyProgress}%` }} />
        </div>
        <p className="text-[10px] text-slate-400 mt-2">{stats.completedThisWeek} de {stats.weeklyGoal} sesiones completadas · {stats.plannedThisWeek} planificadas</p>
      </div>

      {/* ── ACTION BUTTONS ──────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <button onClick={() => setShowModal(true)} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20">
          <BrainCircuit size={16} /> Generar Rutina IA
        </button>
        <input type="file" ref={pdfInputRef} accept=".pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'gemini')} />
        <button onClick={() => pdfInputRef.current?.click()} className="bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all flex items-center gap-2">
          <UploadCloud size={16} /> Analizar PDF
        </button>
      </div>

      {/* ═══════ WEEKLY VIEW ═══════ */}
      {activeTab === 'weekly' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between">
            <button onClick={() => setWeekOffset(w => w - 1)} className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"><ChevronLeft size={18} className="text-slate-500" /></button>
            <div className="text-center">
              <h3 className="font-black text-slate-800 dark:text-white text-lg">
                {weekDays[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} — {weekDays[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </h3>
              {weekOffset !== 0 && <button onClick={() => setWeekOffset(0)} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 mt-1">← Esta semana</button>}
            </div>
            <button onClick={() => setWeekOffset(w => w + 1)} className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"><ChevronRight size={18} className="text-slate-500" /></button>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-x-auto">
            <div className="grid grid-cols-7 gap-3 min-w-[850px]">
              {weekDays.map(day => {
                const dateStr = day.toISOString().split('T')[0];
                const daySessions = sessions.filter(s => s.date === dateStr);
                const isToday = dateStr === new Date().toISOString().split('T')[0];
                const isAddingHere = addingForDate === dateStr;

                return (
                  <div key={dateStr} className={`rounded-2xl p-3 min-h-[280px] flex flex-col transition-all ${isToday ? 'bg-indigo-50 dark:bg-indigo-500/10 ring-2 ring-indigo-200 dark:ring-indigo-500/30' : 'bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700'}`}>
                    <div className="text-center mb-3 pb-2 border-b border-slate-200/50 dark:border-slate-700/50">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-indigo-500' : 'text-slate-400'}`}>{day.toLocaleDateString('es-ES', { weekday: 'short' })}</p>
                      <p className={`text-xl font-black ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>{day.getDate()}</p>
                      {daySessions.length > 0 && (
                        <div className="flex justify-center gap-1 mt-1">
                          {daySessions.map((ds, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${ds.status === 'completed' ? 'bg-emerald-400' : 'bg-slate-300 dark:bg-slate-600'}`} />)}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 flex-1">
                      {daySessions.map(s => {
                        const typeConf = getSessionTypeConfig(s.type);
                        const intConf = INTENSITY_LEVELS.find(il => il.id === s.intensity);
                        return (
                          <div key={s.id} className={`p-2.5 rounded-xl border group relative transition-all ${s.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm'}`}>
                            <div className="flex justify-between items-start">
                              <p className={`font-bold text-[11px] leading-tight ${s.status === 'completed' ? 'text-emerald-700 dark:text-emerald-400 line-through opacity-70' : 'text-slate-800 dark:text-slate-200'}`}>
                                {typeConf.emoji} {s.title}
                              </p>
                              <button onClick={() => onDeleteSession(s.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all -mt-0.5"><Trash2 size={11} /></button>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">{s.duration}m</span>
                              <span className={`text-[8px] font-black uppercase ${intConf?.color || 'text-slate-400'}`}>{intConf?.emoji}</span>
                            </div>
                            <button onClick={() => onUpdateSession({ ...s, status: s.status === 'completed' ? 'planned' : 'completed' })}
                              className={`w-full mt-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all ${s.status === 'completed' ? 'bg-emerald-200 dark:bg-emerald-600/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600'}`}>
                              {s.status === 'completed' ? '✓ Hecho' : 'Marcar ✓'}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Inline Add Session */}
                    {isAddingHere ? (
                      <div className="mt-2 space-y-2 animate-in slide-in-from-bottom-1 bg-white dark:bg-slate-800 rounded-xl p-2.5 border border-indigo-200 dark:border-indigo-700 shadow-md">
                        <input autoFocus value={newSession.title} onChange={e => setNewSession({ ...newSession, title: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddSession(dateStr); if (e.key === 'Escape') setAddingForDate(null); }}
                          placeholder="Ejercicio..." className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-[10px] font-bold outline-none focus:ring-2 focus:ring-indigo-400/30" />
                        <div className="flex flex-wrap gap-1">
                          {SESSION_TYPES.map(t => (
                            <button key={t.id} onClick={() => setNewSession({ ...newSession, type: t.id as any })}
                              className={`px-2 py-1 rounded-lg text-[8px] font-black transition-all ${newSession.type === t.id ? `${t.color} text-white` : `${t.bg} ${t.text}`}`}>{t.emoji}</button>
                          ))}
                        </div>
                        <div className="flex gap-1.5">
                          <select value={newSession.duration} onChange={e => setNewSession({ ...newSession, duration: +e.target.value })}
                            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[9px] font-bold outline-none">
                            {[15,20,30,45,60,90].map(m => <option key={m} value={m}>{m}m</option>)}
                          </select>
                          <select value={newSession.intensity} onChange={e => setNewSession({ ...newSession, intensity: e.target.value as any })}
                            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[9px] font-bold outline-none">
                            {INTENSITY_LEVELS.map(il => <option key={il.id} value={il.id}>{il.emoji} {il.label}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => handleAddSession(dateStr)} disabled={!newSession.title.trim()}
                            className="flex-1 bg-emerald-600 text-white text-[9px] font-black py-1.5 rounded-lg hover:bg-emerald-500 disabled:opacity-40 flex items-center justify-center gap-1"><Plus size={10} /> Crear</button>
                          <button onClick={() => setAddingForDate(null)} className="px-2.5 bg-slate-200 dark:bg-slate-700 text-slate-500 text-[9px] font-bold rounded-lg hover:bg-slate-300"><X size={10} /></button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setAddingForDate(dateStr); setNewSession({ title: '', type: 'strength', duration: 30, intensity: 'medium', notes: '' }); }}
                        className="mt-2 w-full py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-[9px] font-bold text-slate-400 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-all flex items-center justify-center gap-1">
                        <Plus size={10} /> Sesión
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ PLANS ═══════ */}
      {activeTab === 'plans' && (
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2">
          <div className="p-6 bg-slate-50/30 dark:bg-slate-900/30 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center">
            <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2"><ClipboardList size={18} /> Mis Planes</h3>
          </div>
          {plans.length === 0 ? (
            <div className="p-20 text-center">
              <ClipboardList size={40} className="mx-auto text-slate-200 dark:text-slate-600 mb-4" />
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest">No hay planes registrados</p>
              <p className="text-slate-300 dark:text-slate-500 text-[10px] mt-2">Genera uno con IA o importa un PDF</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-700">
              {plans.map(p => (
                <div key={p.id} className="flex items-center justify-between p-5 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.source === 'ai' ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600' : p.source === 'file' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                      {p.source === 'ai' ? <BrainCircuit size={18} /> : p.source === 'file' ? <FileText size={18} /> : <ClipboardList size={18} />}
                    </div>
                    <div>
                      <p className="font-black text-sm text-slate-800 dark:text-white">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{p.durationWeeks} sem · {p.sessions.length} sesiones</p>
                    </div>
                  </div>
                  <button onClick={() => onDeletePlan(p.id)} className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-300 hover:text-red-500 rounded-lg transition-all"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════ SESSIONS TABLE ═══════ */}
      {activeTab === 'table' && (
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2">
          <div className="p-6 bg-slate-50/30 dark:bg-slate-900/30 border-b border-slate-50 dark:border-slate-700">
            <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2"><Table size={18} /> Registro de Sesiones</h3>
          </div>
          {sessions.length === 0 ? (
            <div className="p-20 text-center">
              <Dumbbell size={40} className="mx-auto text-slate-200 dark:text-slate-600 mb-4" />
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Aún no hay sesiones</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-700">
              {[...sessions].sort((a, b) => b.date.localeCompare(a.date)).map(s => {
                const typeConf = getSessionTypeConfig(s.type);
                return (
                  <div key={s.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm ${typeConf.bg}`}>{typeConf.emoji}</div>
                      <div>
                        <p className={`font-bold text-sm ${s.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {s.status === 'completed' && '✓ '}{s.title}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] font-bold text-slate-400">{s.date}</span>
                          <span className={`text-[10px] font-black uppercase ${typeConf.text}`}>{typeConf.label}</span>
                          <span className="text-[10px] font-bold text-slate-400">{s.duration}m</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => onUpdateSession({ ...s, status: s.status === 'completed' ? 'planned' : 'completed' })}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${s.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:bg-emerald-50 hover:text-emerald-500'}`}>
                        {s.status === 'completed' ? '✓ Hecho' : 'Hacer'}
                      </button>
                      <button onClick={() => onDeleteSession(s.id)} className="p-1.5 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════ NOTEBOOK ═══════ */}
      {activeTab === 'notebook' && (
        <div className="space-y-10 animate-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 flex flex-col justify-between group hover:border-indigo-500/50 transition-all shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-[60px] rounded-full -mr-10 -mt-10 group-hover:bg-indigo-600/20 transition-all" />
              <div className="space-y-4 relative z-10">
                <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform"><Brain size={28} /></div>
                <div><h4 className="text-xl font-black text-white">NotebookLM</h4><p className="text-slate-400 text-sm mt-2 font-bold">Analiza entrenamientos con IA de Google.</p></div>
              </div>
              <a href="https://notebooklm.google.com/" target="_blank" rel="noopener noreferrer" className="mt-8 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest text-center shadow-xl transition-all flex items-center justify-center gap-2 relative z-10">Abrir <ArrowUpRight size={14} /></a>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 flex flex-col justify-between group hover:border-emerald-500/50 transition-all shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/10 blur-[60px] rounded-full -mr-10 -mt-10 group-hover:bg-emerald-600/20 transition-all" />
              <div className="space-y-4 relative z-10">
                <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform"><Share2 size={28} /></div>
                <div><h4 className="text-xl font-black text-white">OpenNotebook</h4><p className="text-slate-400 text-sm mt-2 font-bold">Alternativa Open Source.</p></div>
              </div>
              <a href="https://open-notebooklm.vercel.app/" target="_blank" rel="noopener noreferrer" className="mt-8 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest text-center shadow-xl transition-all flex items-center justify-center gap-2 relative z-10">Lanzar <ArrowUpRight size={14} /></a>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Cuaderno de Entrenamiento</h3>
              <button onClick={saveNotesAsDocument} className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-1.5"><FileText size={12} /> Guardar</button>
            </div>
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-2xl focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all">
              <textarea className="w-full bg-transparent border-none focus:outline-none resize-none text-base font-medium leading-relaxed text-slate-100 placeholder:text-slate-600 font-serif" placeholder="Escribe tus sensaciones, récords o apuntes..." value={notes}
                onChange={(e) => { setNotes(e.target.value); setIsSaving(true); if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); saveTimeoutRef.current = setTimeout(() => setIsSaving(false), 1000); }} rows={10} />
            </div>
          </div>
        </div>
      )}

      {/* ═══════ FILES ═══════ */}
      {activeTab === 'files' && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm animate-in slide-in-from-bottom-3">
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 mb-8"><FileText className="text-indigo-600" size={20} /> Documentos</h3>
          {documents.length === 0 ? (
            <div className="p-16 text-center border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
              <FileText size={40} className="mx-auto text-slate-200 dark:text-slate-600 mb-4" /><p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">No hay notas guardadas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map(doc => (
                <div key={doc.id} className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 group hover:shadow-lg hover:border-indigo-200 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 flex items-center justify-center mb-4"><FileText size={20} /></div>
                  <h4 className="font-black text-slate-800 dark:text-white text-sm mb-1 truncate">{doc.name}</h4>
                  <p className="text-[9px] font-bold text-slate-400 mb-4">{doc.uploadDate}</p>
                  <p className="text-[10px] text-slate-500 line-clamp-3 mb-6">{doc.content}</p>
                  <button onClick={() => { setNotes(doc.content || ''); setActiveTab('notebook'); }}
                    className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-900 hover:text-white transition-all"><Edit3 size={14} /> Editar</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════ AI MODAL ═══════ */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xl text-slate-900 dark:text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center"><Sparkles className="text-emerald-600" size={20} /></div>
                Entrenador IA
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"><X className="text-slate-400" size={20} /></button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">Describe tu objetivo y generaré un plan adaptado a tu horario de médico.</p>
              <textarea className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 h-28 resize-none text-slate-800 dark:text-white transition-all"
                placeholder="Ej: Perder grasa, ganar resistencia, 30 min max..." value={goalInput} onChange={e => setGoalInput(e.target.value)} autoFocus />
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-bold shrink-0">Duración:</span>
                {[7, 14, 30].map(d => (
                  <button key={d} onClick={() => setDaysCount(d)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${daysCount === d ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20' : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'}`}>{d}d</button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={handleGenerateAIPlan} disabled={generatingAI || !goalInput.trim()}
                  className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-600/20">
                  {generatingAI ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />} {generatingAI ? 'Generando...' : 'Plan con IA'}
                </button>
                <button onClick={handleGeneratePlan} disabled={isGenerating || !goalInput.trim()}
                  className="px-5 py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2 disabled:opacity-50">
                  {isGenerating ? <Loader2 className="animate-spin" size={14} /> : <BrainCircuit size={14} />} Gemini
                </button>
              </div>
              {aiPlanResult && (
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">{aiPlanResult}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FitnessView;
