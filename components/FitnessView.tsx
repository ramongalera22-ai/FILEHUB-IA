
import React, { useState, useRef, useMemo } from 'react';
import { Workout, CalendarEvent, TrainingSession, TrainingPlan } from '../types';
import { 
  Dumbbell, Plus, TrendingUp, Flame, Timer, Activity, ChevronRight, X, 
  FileText, Loader2, Calendar, UploadCloud, FileSpreadsheet, CheckCircle2, 
  Table, CalendarDays, BrainCircuit, Sparkles, Trash2, Edit3, ClipboardList, Eye
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
}

const FitnessView: React.FC<FitnessViewProps> = ({ 
  sessions, plans, onAddSession, onDeleteSession, onAddPlan, onDeletePlan, onSyncPlan 
}) => {
  const [activeTab, setActiveTab] = useState<'weekly' | 'plans' | 'table'>('weekly');
  const [isGenerating, setIsGenerating] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [showModal, setShowModal] = useState(false);
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
        // Simplified: using Gemini service for both, in real impl Ollama would call local endpoint
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
        
        // Auto-add sessions to DB and Calendar
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
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm gap-1">
           <button onClick={() => setActiveTab('weekly')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'weekly' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Semana</button>
           <button onClick={() => setActiveTab('plans')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'plans' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Planes</button>
           <button onClick={() => setActiveTab('table')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'table' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Sesiones</button>
        </div>
      </header>

      {/* Action Bar */}
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
                             <p className="font-bold text-xs text-slate-800">{s.title}</p>
                             <p className="text-[9px] font-black text-slate-400 uppercase mt-1">{s.type} • {s.duration}m</p>
                             <button onClick={() => onDeleteSession(s.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"><Trash2 size={12}/></button>
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
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2"><ClipboardList size={18}/> Mis Planes</h3>
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
                          <button onClick={() => onDeletePlan(p.id)} className="p-2 bg-white hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg border border-slate-100 shadow-sm transition-all"><Trash2 size={16}/></button>
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
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2"><Table size={18}/> Registro de Sesiones</h3>
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
                         <button onClick={() => onDeleteSession(s.id)} className="p-2 bg-white hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg border border-slate-100 shadow-sm transition-all"><Trash2 size={16}/></button>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="font-black text-xl text-slate-900 flex items-center gap-2"><Sparkles className="text-indigo-500"/> Entrenador IA</h3>
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
                 <button 
                   onClick={handleGeneratePlan}
                   disabled={isGenerating}
                   className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                    {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <BrainCircuit size={16} />}
                    Generar Rutina
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default FitnessView;
