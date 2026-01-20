
import React, { useState, useRef, useEffect } from 'react';
import { Task, CalendarEvent, WorkDocument } from '../types';
import {
  CheckSquare,
  Plus,
  Circle,
  CheckCircle2,
  Trash2,
  Search,
  Tag,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Sparkles,
  Zap,
  X,
  Repeat,
  BrainCircuit,
  Lightbulb,
  BarChart3,
  BookOpen,
  ArrowUpRight,
  Brain,
  Share2,
  Edit3
} from 'lucide-react';
import { extractTasksFromPDF, getTaskSuggestions, analyzeTaskEfficiency } from '../services/geminiService';

interface TasksViewProps {
  tasks: Task[];
  calendarEvents: CalendarEvent[];
  expenses: any[];
  onAddTask: (task: Task) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
}

const TasksView: React.FC<TasksViewProps> = ({ tasks, calendarEvents, expenses, onAddTask, onToggleTask, onDeleteTask }) => {
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState(() => localStorage.getItem('filehub_task_draft') || '');
  const [activeTab, setActiveTab] = useState<'tasks' | 'documents' | 'notebook'>('notebook');
  const [notes, setNotes] = useState(`***

### **HOJA DE RUTA: BARCELONA 2025 (Sanidad + Transporte + Vivienda)**

#### **1. El Veredicto: Las 2 Mejores Opciones**
* **La Opción Racional (Equilibrio Calidad/Precio): TERRASSA**
    * **Transporte:** Excelente. Red **FGC S1** (funciona como un metro).
    * **Vivienda:** Amplia y asequible (**200.000€ - 260.000€** por ~100m²).
    * **Sanidad:** Hospital Mútua Terrassa (Digestivo con carga media-baja) y CAP Sant Llàtzer.`);
  const [documents, setDocuments] = useState<WorkDocument[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveNotesAsDocument = () => {
    if (!notes.trim()) return;
    const newDoc: WorkDocument = {
      id: `task-doc-${Date.now()}`,
      name: `Nota Tareas ${new Date().toLocaleDateString('es-ES')}`,
      type: 'text',
      uploadDate: new Date().toISOString().split('T')[0],
      content: notes
    };
    setDocuments([...documents, newDoc]);
    setNotes('');
    setActiveTab('documents');
    alert('Nota guardada en Documentos de Tareas');
  };

  useEffect(() => {
    localStorage.setItem('filehub_task_draft', newTaskTitle);
  }, [newTaskTitle]);
  const [filter, setFilter] = useState<string>('all');
  const [showOptions, setShowOptions] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Deep Analysis State
  const [efficiencyReport, setEfficiencyReport] = useState<any>(null);
  const [isAnalyzingEfficiency, setIsAnalyzingEfficiency] = useState(false);

  const pdfInputRef = useRef<HTMLInputElement>(null);

  // New task options state
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [category, setCategory] = useState<Task['category']>('personal');

  const fetchAiSuggestions = async () => {
    setIsSuggesting(true);
    try {
      // Calculate date 7 days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      // Filter completed tasks: Include those with due date within last 7 days or no date (general context)
      const recentCompletedTasks = tasks.filter(t =>
        t.completed && (!t.dueDate || t.dueDate >= sevenDaysAgoStr)
      ).slice(0, 50); // Limit context size to avoid token overload

      const suggestions = await getTaskSuggestions({
        currentTasks: tasks.filter(t => !t.completed),
        history: recentCompletedTasks,
        calendarEvents,
        expenses
      });
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error("AI Suggestions error:", error);
    } finally {
      setIsSuggesting(false);
    }
  };

  const runDeepAnalysis = async () => {
    setIsAnalyzingEfficiency(true);
    try {
      const report = await analyzeTaskEfficiency(tasks.filter(t => !t.completed));
      setEfficiencyReport(report);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzingEfficiency(false);
    }
  };

  useEffect(() => {
    fetchAiSuggestions();
  }, []);

  const handlePDFUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const extractedTasks = await extractTasksFromPDF(base64);
        extractedTasks.forEach((t: any) => {
          onAddTask({
            ...t,
            id: `extracted-${Date.now()}-${Math.random()}`,
            completed: false
          });
        });
      } catch (error) {
        console.error("Failed to extract tasks:", error);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const addTask = (customTask?: any) => {
    const title = customTask ? customTask.title : newTaskTitle;
    if (!title) return;

    const baseTask: Task = {
      id: Date.now().toString(),
      title: title,
      completed: false,
      category: customTask ? (customTask.category as any) : category,
      priority: customTask ? (customTask.priority as any) : priority,
      dueDate: new Date().toISOString().split('T')[0],
      isRecurring: !customTask && isRecurring,
      frequency: (!customTask && isRecurring) ? frequency : undefined
    };

    onAddTask(baseTask);

    if (!customTask) {
      setNewTaskTitle('');
      localStorage.removeItem('filehub_task_draft');
      setShowOptions(false);
      setIsRecurring(false);
    } else {
      setAiSuggestions(prev => prev.filter(s => s.title !== customTask.title));
    }
  };

  const filteredTasks = tasks.filter(t => filter === 'all' || t.category === filter);
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (a.dueDate || '').localeCompare(b.dueDate || '');
  });

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 overflow-hidden">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Tareas & Brain</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-1">Sincronización inteligente de tu flujo diario</p>
        </div>
        <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'tasks' ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Tareas
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'documents' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Documentos
          </button>
          <button
            onClick={() => setActiveTab('notebook')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'notebook' ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Cuaderno
          </button>
        </div>
      </header>

      {activeTab === 'tasks' && (
        <div className="space-y-10 animate-in fade-in duration-500">
          <div className="flex justify-end px-2">
            <input type="file" ref={pdfInputRef} accept="application/pdf" className="hidden" onChange={handlePDFUpload} />
            <button
              onClick={() => pdfInputRef.current?.click()}
              disabled={isUploading}
              className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              {isUploading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={16} />}
              Escanear PDF para Tareas
            </button>
          </div>

          <section className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5"><BrainCircuit size={120} className="text-slate-900 dark:text-white" /></div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20"><Sparkles size={24} /></div>
                <div>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">AI Task Brain</h4>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Análisis predictivo de tu agenda</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={runDeepAnalysis}
                  disabled={isAnalyzingEfficiency}
                  className="flex items-center gap-2 px-6 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all disabled:opacity-50"
                >
                  {isAnalyzingEfficiency ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
                  Analizar Productividad
                </button>
                <button
                  onClick={fetchAiSuggestions}
                  disabled={isSuggesting}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all disabled:opacity-50"
                >
                  {isSuggesting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  Refrescar Sugerencias
                </button>
              </div>
            </div>

            {efficiencyReport && (
              <div className="mb-10 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-4">
                <div className="flex justify-between items-center mb-6">
                  <h5 className="font-black text-slate-900 dark:text-white flex items-center gap-2"><BarChart3 className="text-amber-500" /> Reporte de Eficiencia</h5>
                  <button onClick={() => setEfficiencyReport(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Puntuación Flujo</p>
                    <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{efficiencyReport.score}/100</p>
                  </div>
                  <div className="md:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Diagnóstico</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed italic">"{efficiencyReport.summary}"</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {efficiencyReport.bottlenecks && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                      <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Cuellos de Botella Detectados</p>
                      <ul className="list-disc list-inside text-xs font-bold text-red-700 dark:text-red-300 space-y-1">
                        {efficiencyReport.bottlenecks.map((b: string, i: number) => <li key={i}>{b}</li>)}
                      </ul>
                    </div>
                  )}
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Acciones Recomendadas</p>
                    <ul className="list-disc list-inside text-xs font-bold text-emerald-800 dark:text-emerald-300 space-y-1">
                      {efficiencyReport.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
              {isSuggesting ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-44 bg-slate-50 dark:bg-slate-800 rounded-[2rem] animate-pulse border border-slate-100 dark:border-slate-700"></div>
                ))
              ) : aiSuggestions.length > 0 ? (
                aiSuggestions.map((s, idx) => (
                  <div key={idx} className={`p-6 rounded-[2rem] border transition-all flex flex-col justify-between group h-full ${s.isInsight
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30'
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-800'
                    }`}>
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${s.priority === 'high' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                          s.isInsight ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                          }`}>
                          {s.isInsight ? <Lightbulb size={10} className="inline mr-1" /> : null}
                          {s.category} • {s.priority}
                        </span>
                        <button onClick={() => setAiSuggestions(prev => prev.filter(item => item.title !== s.title))} className="text-slate-300 hover:text-red-400 transition-colors"><X size={14} /></button>
                      </div>
                      <h5 className="font-black text-slate-900 dark:text-white text-sm mb-2 leading-tight">{s.title}</h5>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 italic font-bold leading-relaxed">"{s.reason}"</p>
                    </div>
                    {!s.isInsight && (
                      <button
                        onClick={() => addTask(s)}
                        className="mt-6 w-full bg-slate-900 dark:bg-indigo-600 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-all"
                      >
                        <Plus size={12} /> Añadir a mi Lista
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">IA en espera de datos nuevos</p>
                </div>
              )}
            </div>
          </section>

          <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6 px-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rendimiento Diario</span>
              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{completedCount}/{tasks.length} Completado</span>
            </div>
            <div className="h-4 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner border border-slate-100 dark:border-slate-700">
              <div
                className="bg-indigo-600 dark:bg-indigo-500 h-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-10 border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/20">
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="relative flex-1 group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={24} />
                    <input
                      type="text"
                      placeholder="¿Qué tienes en mente hoy?"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-16 pr-8 py-5 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 shadow-sm transition-all font-bold text-slate-700 dark:text-white placeholder-slate-400"
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addTask()}
                    />
                  </div>
                  <button
                    onClick={() => setShowOptions(!showOptions)}
                    className={`p-5 rounded-2xl border transition-all ${showOptions ? 'bg-slate-900 dark:bg-indigo-600 border-slate-900 dark:border-indigo-600 text-white shadow-xl' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-500'}`}
                  >
                    {showOptions ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </button>
                  <button
                    onClick={() => addTask()}
                    className="bg-indigo-600 dark:bg-indigo-500 text-white px-10 rounded-2xl font-black shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 dark:hover:bg-indigo-400 transition-all active:scale-95 flex items-center justify-center"
                  >
                    <Plus size={32} />
                  </button>
                </div>

                {showOptions && (
                  <div className="p-10 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-[2.5rem] shadow-sm space-y-8 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Configuración Básica</label>
                        <div className="flex gap-4">
                          <select
                            value={category}
                            onChange={e => setCategory(e.target.value as Task['category'])}
                            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-6 py-4 text-xs font-black text-slate-800 dark:text-white uppercase focus:outline-none appearance-none cursor-pointer hover:border-indigo-300 transition-all"
                          >
                            <option value="personal">Personal</option>
                            <option value="work">Trabajo</option>
                            <option value="fitness">Fitness</option>
                            <option value="finance">Finanzas</option>
                          </select>
                          <select
                            value={priority}
                            onChange={e => setPriority(e.target.value as any)}
                            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-6 py-4 text-xs font-black text-slate-800 dark:text-white uppercase focus:outline-none appearance-none cursor-pointer hover:border-indigo-300 transition-all"
                          >
                            <option value="low">Prioridad Baja</option>
                            <option value="medium">Normal</option>
                            <option value="high">Urgente</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center ml-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recurrencia IA</label>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setIsRecurring(!isRecurring)}
                              className={`w-12 h-6 rounded-full transition-all relative ${isRecurring ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isRecurring ? 'left-7' : 'left-1'}`} />
                            </button>
                          </div>
                        </div>
                        {isRecurring && (
                          <div className="flex gap-3">
                            {['daily', 'weekly', 'monthly'].map(freq => (
                              <button
                                key={freq}
                                onClick={() => setFrequency(freq as any)}
                                className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${frequency === freq ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:border-indigo-200'
                                  }`}
                              >
                                {freq}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 px-2">
                  {['all', 'work', 'personal', 'fitness', 'finance'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setFilter(cat)}
                      className={`px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.15em] transition-all border ${filter === cat ? 'bg-slate-900 dark:bg-indigo-600 border-slate-900 dark:border-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700 hover:border-slate-300'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {sortedTasks.length === 0 ? (
                <div className="p-32 text-center flex flex-col items-center">
                  <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 text-slate-200 dark:text-slate-600 rounded-[2.5rem] flex items-center justify-center mb-8 border border-slate-100 dark:border-slate-700">
                    <CheckSquare size={48} />
                  </div>
                  <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Sin tareas pendientes para este filtro</p>
                </div>
              ) : (
                sortedTasks.map(task => (
                  <div key={task.id} className={`p-10 flex flex-col md:flex-row md:items-center justify-between group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all ${task.completed ? 'opacity-40' : ''}`}>
                    <div className="flex items-center gap-8 flex-1">
                      <button onClick={() => onToggleTask(task.id)} className={`transition-all transform hover:scale-110 shrink-0 ${task.completed ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-200 dark:text-slate-600 hover:text-indigo-300'}`}>
                        {task.completed ? <CheckCircle2 size={40} /> : <Circle size={40} />}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-4 flex-wrap">
                          <h4 className={`text-xl font-black text-slate-900 dark:text-white tracking-tight ${task.completed ? 'line-through decoration-indigo-500 decoration-2' : ''}`}>{task.title}</h4>
                          {task.isRecurring && (
                            <span className="flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-900/50">
                              <Repeat size={10} /> {task.frequency}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Tag size={14} className="text-indigo-500" /> {task.category}
                          </span>
                          {task.dueDate && (
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <Calendar size={14} className="text-indigo-500" /> {task.dueDate}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-8 mt-6 md:mt-0 ml-16 md:ml-0">
                      <span className={`text-[10px] px-4 py-1.5 rounded-full font-black uppercase tracking-widest ${task.priority === 'high' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' :
                        task.priority === 'medium' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                        {task.priority}
                      </span>

                      <button onClick={() => onDeleteTask(task.id)} className="text-slate-200 dark:text-slate-700 hover:text-red-500 dark:hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 p-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl">
                        <Trash2 size={24} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
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
                  <p className="text-slate-400 text-sm mt-3 font-bold leading-relaxed">Analiza tu productividad y genera planes inteligentes con la IA de Google.</p>
                </div>
              </div>
              <div className="mt-10 relative z-10">
                <a
                  href="https://notebooklm.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-center shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 group/btn"
                >
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
                  <p className="text-slate-400 text-sm mt-3 font-bold leading-relaxed">Tu base de conocimiento de productividad privado y local.</p>
                </div>
              </div>
              <div className="mt-10 relative z-10">
                <a
                  href="https://open-notebooklm.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-center shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 group/btn"
                >
                  Lanzar Alpha <ArrowUpRight size={16} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-6">
            <div className="flex justify-between items-center px-4">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Cuaderno de Tareas</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isSaving ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isSaving ? 'text-amber-500' : 'text-slate-400'}`}>
                    {isSaving ? 'Guardando...' : 'Sincronizado'}
                  </span>
                </div>
                <button
                  onClick={saveNotesAsDocument}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
                >
                  <FileText size={14} />
                  Convertir en Documento
                </button>
              </div>
            </div>
            <div className="bg-slate-900 rounded-[3rem] border border-slate-800 p-10 shadow-2xl flex group focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all">
              <textarea
                className="w-full bg-transparent border-none focus:outline-none resize-none text-xl font-medium leading-relaxed text-slate-100 placeholder:text-slate-600 font-serif"
                placeholder="Anota tus pendientes, ideas rápidas o reflexiones sobre tu flujo de trabajo..."
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

      {activeTab === 'documents' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3 mb-10">
              <FileText className="text-indigo-600" size={24} /> Documentos de Productividad
            </h3>
            {documents.length === 0 ? (
              <div className="p-24 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] bg-slate-50/50 dark:bg-slate-800/50">
                <FileText size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                <p className="text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest">No hay documentos guardados</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {documents.map(doc => (
                  <div key={doc.id} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 group hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                    <div className="flex flex-col h-full">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-6">
                        <FileText size={24} />
                      </div>
                      <h4 className="font-black text-slate-800 dark:text-white text-sm mb-1 truncate">{doc.name}</h4>
                      <p className="text-[9px] font-bold text-slate-400 mb-6">{doc.uploadDate}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-4 mb-8 flex-1 leading-relaxed">{doc.content}</p>
                      <button
                        onClick={() => {
                          setNotes(doc.content || '');
                          setActiveTab('notebook');
                        }}
                        className="w-full py-3.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 hover:bg-slate-900 dark:hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                      >
                        <Edit3 size={16} /> Editar en Cuaderno
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TasksView;
