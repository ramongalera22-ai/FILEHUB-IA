
import React, { useState, useRef } from 'react';
import { CalendarEvent, TrainingSession, TrainingPlan, WorkDocument } from '../types';
import {
  Dumbbell, Plus, TrendingUp, Flame, Timer, Activity, ChevronRight, X,
  FileText, Loader2, Calendar, UploadCloud, FileSpreadsheet, CheckCircle2,
  Table, CalendarDays, BrainCircuit, Sparkles, Trash2, Edit3, ClipboardList,
  Brain, Share2, ArrowUpRight
} from 'lucide-react';
import { extractTrainingPlanFromPDF, generateTrainingPlan } from '../services/geminiService';

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
  const [goalInput, setGoalInput] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [documents, setDocuments] = useState<WorkDocument[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveNotesAsDocument = () => {
    if (!notes.trim()) return;
    const newDoc: WorkDocument = {
      id: `fit-doc-${Date.now()}`,
      name: `Nota Entrenamiento ${new Date().toLocaleDateString('es-ES')}`,
      type: 'text',
      uploadDate: new Date().toISOString().split('T')[0],
      content: notes
    };
    setDocuments([...documents, newDoc]);
    setNotes('');
    setActiveTab('files');
    alert('Nota guardada');
  };
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const currentDate = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(currentDate.getDate() - currentDate.getDay() + 1 + i);
    return d;
  });

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
          id: `plan-${Date.now()}`,
          name: file.name.replace('.pdf', ''),
          description: `Plan importado con ${engine}`,
          durationWeeks: 4,
          sessions: extracted.map((s: any) => ({ ...s, status: 'planned' })),
          source: 'file'
        };
        onAddPlan(newPlan);
        const newSessions = newPlan.sessions;
        newSessions.forEach(s => onAddSession(s));
        onSyncPlan(newSessions.map((s: any) => ({ id: s.id, title: s.title, start: s.date, end: s.date, type: 'fitness' })));
        alert(`Plan "${newPlan.name}" importado con éxito.`);
      } catch (error) {
        console.error(error);
        alert("Error procesando plan.");
      } finally {
        setIsGenerating(false);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleGeneratePlan = async () => {
    if (!goalInput) return;
    setIsGenerating(true);
    try {
      const newSessions = await generateTrainingPlan(goalInput);
      const newPlan: TrainingPlan = {
        id: `gen-${Date.now()}`,
        name: `Plan IA: ${goalInput.substring(0, 15)}...`,
        description: goalInput,
        durationWeeks: 1,
        sessions: newSessions,
        source: 'ai'
      };
      onAddPlan(newPlan);
      newSessions.forEach(s => onAddSession(s));
      setGoalInput('');
      setShowModal(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Centro de Entrenamiento</h2>
          <p className="text-slate-500 font-bold mt-1">Gestión de rutinas, planes IA y calendario atlético.</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm gap-1 overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('weekly')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'weekly' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Semana</button>
          <button onClick={() => setActiveTab('plans')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'plans' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Planes</button>
          <button onClick={() => setActiveTab('table')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'table' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Sesiones</button>
          <button onClick={() => setActiveTab('files')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'files' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Docs</button>
          <button onClick={() => setActiveTab('notebook')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'notebook' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Cuaderno</button>
        </div>
      </header>

      <div className="flex flex-wrap gap-4">
        <button onClick={() => setShowModal(true)} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg">
          <BrainCircuit size={16} /> Generar Rutina IA
        </button>
        <input type="file" ref={pdfInputRef} accept=".pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'gemini')} />
        <button onClick={() => pdfInputRef.current?.click()} className="bg-white text-indigo-600 border border-indigo-100 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center gap-2">
          <UploadCloud size={16} /> Analizar PDF (Gemini/Ollama)
        </button>
      </div>

      {activeTab === 'weekly' && (
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm overflow-x-auto">
          <div className="grid grid-cols-7 gap-4 min-w-[800px]">
            {weekDays.map(day => {
              const dateStr = day.toISOString().split('T')[0];
              const daySessions = sessions.filter(s => s.date === dateStr);
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              return (
                <div key={dateStr} className={`rounded-[2rem] p-4 min-h-[300px] flex flex-col ${isToday ? 'bg-indigo-50/50 ring-2 ring-indigo-100' : 'bg-slate-50 border border-slate-100'}`}>
                  <div className="text-center mb-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{day.toLocaleDateString('es-ES', { weekday: 'short' })}</p>
                    <p className={`text-lg font-black ${isToday ? 'text-indigo-600' : 'text-slate-700'}`}>{day.getDate()}</p>
                  </div>
                  <div className="space-y-2 flex-1">
                    {daySessions.map(s => (
                      <div key={s.id} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 group relative">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-xs text-slate-800">{s.title}</p>
                          <button onClick={() => onDeleteSession(s.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={12} /></button>
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mt-1 flex items-center gap-1">
                          {s.type} • {s.duration}m
                          {s.notes && <FileText size={10} className="text-indigo-400" />}
                        </p>
                        <div className="mt-2 pt-2 border-t border-slate-50 flex gap-2">
                          <button
                            onClick={() => onUpdateSession({ ...s, status: s.status === 'completed' ? 'planned' : 'completed' })}
                            className={`flex-1 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${s.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-500'}`}
                          >
                            {s.status === 'completed' ? 'Hecho' : 'Hacer'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 bg-slate-50/30 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2"><ClipboardList size={18} /> Mis Planes</h3>
          </div>
          {plans.length === 0 ? (
            <div className="p-20 text-center">
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest">No hay planes registrados</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Plan</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Duración</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Fuente</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {plans.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="p-6 text-sm font-black text-slate-800">{p.name}</td>
                    <td className="p-6 text-xs font-bold text-slate-600">{p.durationWeeks} semanas</td>
                    <td className="p-6"><span className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-[9px] font-black uppercase text-slate-500">{p.source}</span></td>
                    <td className="p-6 text-right">
                      <button onClick={() => onDeletePlan(p.id)} className="p-2 bg-white hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg border border-slate-100 shadow-sm transition-all"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'table' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 bg-slate-50/30 border-b border-slate-50">
            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2"><Table size={18} /> Registro de Sesiones</h3>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Fecha</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Actividad</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Tipo</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Duración</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sessions.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="p-6 text-xs font-bold text-slate-500">{s.date}</td>
                  <td className="p-6 text-sm font-black text-slate-800">{s.title}</td>
                  <td className="p-6"><span className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-[9px] font-black uppercase text-slate-500">{s.type}</span></td>
                  <td className="p-6 text-xs font-bold text-slate-600">{s.duration} min</td>
                  <td className="p-6 text-right">
                    <button onClick={() => onDeleteSession(s.id)} className="p-2 bg-white hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg border border-slate-100 shadow-sm transition-all"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'notebook' && (
        <div className="space-y-12 animate-in slide-in-from-bottom-6 duration-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 flex flex-col justify-between group hover:border-indigo-500/50 transition-all shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-[60px] rounded-full -mr-10 -mt-10 group-hover:bg-indigo-600/20 transition-all"></div>
              <div className="space-y-6 relative z-10">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                  <Brain size={32} />
                </div>
                <div>
                  <h4 className="text-2xl font-black text-white">NotebookLM</h4>
                  <p className="text-slate-400 text-sm mt-3 font-bold leading-relaxed">Analiza tus entrenamientos y genera insights inteligentes con la IA de Google.</p>
                </div>
              </div>
              <div className="mt-10 relative z-10">
                <a href="https://notebooklm.google.com/" target="_blank" rel="noopener noreferrer" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-center shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 group/btn">
                  Abrir Notebook <ArrowUpRight size={16} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                </a>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 flex flex-col justify-between group hover:border-emerald-500/50 transition-all shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/10 blur-[60px] rounded-full -mr-10 -mt-10 group-hover:bg-emerald-600/20 transition-all"></div>
              <div className="space-y-6 relative z-10">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Share2 size={32} />
                </div>
                <div>
                  <h4 className="text-2xl font-black text-white">OpenNotebook</h4>
                  <p className="text-slate-400 text-sm mt-3 font-bold leading-relaxed">La alternativa Open Source para tu gestión de conocimiento atlético.</p>
                </div>
              </div>
              <div className="mt-10 relative z-10">
                <a href="https://open-notebooklm.vercel.app/" target="_blank" rel="noopener noreferrer" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-center shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 group/btn">
                  Lanzar Alpha <ArrowUpRight size={16} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                </a>
              </div>
            </div>
          </div>

          {/* Writing Board */}
          <div className="flex flex-col space-y-6">
            <div className="flex justify-between items-center px-4">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Cuaderno de Entrenamiento</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isSaving ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isSaving ? 'text-amber-500' : 'text-slate-400'}`}>
                    {isSaving ? 'Guardando...' : 'Sincronizado'}
                  </span>
                </div>
                <button
                  onClick={saveNotesAsDocument}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
                >
                  <FileText size={14} /> Convertir en Documento
                </button>
              </div>
            </div>
            <div className="bg-slate-900 rounded-[3rem] border border-slate-800 p-10 shadow-2xl flex group focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all">
              <textarea
                className="w-full bg-transparent border-none focus:outline-none resize-none text-xl font-medium leading-relaxed text-slate-100 placeholder:text-slate-600 font-serif"
                placeholder="Escribe tus sensaciones, récords o apuntes de hoy..."
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setIsSaving(true);
                  if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                  saveTimeoutRef.current = setTimeout(() => setIsSaving(false), 1000);
                }}
                rows={12}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 mb-10">
              <FileText className="text-indigo-600" size={24} /> Documentos de Entrenamiento
            </h3>
            {documents.length === 0 ? (
              <div className="p-24 text-center border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50">
                <FileText size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">No hay notas guardadas</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documents.map(doc => (
                  <div key={doc.id} className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 group hover:shadow-xl hover:border-indigo-200 transition-all">
                    <div className="flex flex-col h-full">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-6">
                        <FileText size={24} />
                      </div>
                      <h4 className="font-black text-slate-800 text-sm mb-1 truncate">{doc.name}</h4>
                      <p className="text-[9px] font-bold text-slate-400 mb-6">{doc.uploadDate}</p>
                      <p className="text-[10px] text-slate-500 line-clamp-4 mb-8 flex-1">{doc.content}</p>
                      <button
                        onClick={() => {
                          setNotes(doc.content || '');
                          setActiveTab('notebook');
                        }}
                        className="w-full py-3.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                      >
                        <Edit3 size={16} /> Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xl text-slate-900 flex items-center gap-2"><Sparkles className="text-indigo-500" /> Entrenador IA</h3>
              <button onClick={() => setShowModal(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-slate-500 font-medium">Describe tu objetivo (ej: "Perder grasa y ganar resistencia en 4 semanas") y generaré un plan completo.</p>
              <textarea
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 h-32 resize-none"
                placeholder="Tu objetivo aquí..."
                value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
              />
              <button onClick={handleGeneratePlan} disabled={isGenerating} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <BrainCircuit size={16} />} Generar Rutina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FitnessView;
