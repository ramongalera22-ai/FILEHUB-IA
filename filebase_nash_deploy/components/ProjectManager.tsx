
import React, { useState, useMemo } from 'react';
import { Project, Task } from '../types';
import {
  Briefcase,
  Plus,
  X,
  Calendar,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  Bell,
  Info,
  CheckCircle2,
  Lock,
  ArrowRight,
  Circle,
  Clock,
  Trash2,
  BarChart3,
  BookOpen,
  Sparkles,
  ExternalLink,
  Target,
  Trophy,
  Loader2,
  Zap,
  LayoutGrid,
  Settings2,
  Save,
  Link as LinkIcon
} from 'lucide-react';
import { chatWithGemini } from '../services/geminiService';

interface ProjectManagerProps {
  projects: Project[];
  onAddProject: (project: Project) => void;
  onUpdateProject?: (project: Project) => void;
  onDeleteProject?: (id: string) => void;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({ projects, onAddProject, onUpdateProject, onDeleteProject }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'dashboard'>('grid');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);

  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [projectBriefing, setProjectBriefing] = useState<string | null>(null);

  const [newProject, setNewProject] = useState({
    name: '',
    budget: '',
    deadline: '',
    notebookUrl: ''
  });

  const [editProjectData, setEditProjectData] = useState({
    name: '',
    budget: '',
    deadline: '',
    notebookUrl: ''
  });

  const [newTask, setNewTask] = useState({
    title: '',
    dependsOn: '',
    priority: 'medium' as const
  });

  const years = useMemo(() => {
    const ySet = new Set<number>();
    projects.forEach(p => ySet.add(new Date(p.deadline).getFullYear()));
    if (ySet.size === 0) ySet.add(new Date().getFullYear());
    return Array.from(ySet).sort((a, b) => b - a);
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => new Date(p.deadline).getFullYear() === selectedYear);
  }, [projects, selectedYear]);

  const statsByYear = useMemo(() => {
    const totalBudget = filteredProjects.reduce((acc, p) => acc + p.budget, 0);
    const totalSpent = filteredProjects.reduce((acc, p) => acc + p.spent, 0);
    const completedTasks = filteredProjects.reduce((acc, p) => acc + p.tasks.filter(t => t.completed).length, 0);
    const totalTasks = filteredProjects.reduce((acc, p) => acc + p.tasks.length, 0);

    return {
      totalBudget,
      totalSpent,
      progress: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      count: filteredProjects.length
    };
  }, [filteredProjects]);

  const generateProjectBriefing = async () => {
    if (!selectedProject) return;
    setIsGeneratingBriefing(true);
    try {
      const prompt = `Analiza este proyecto: ${selectedProject.name}. 
      Presupuesto: ${selectedProject.budget}, Gastado: ${selectedProject.spent}. 
      Tareas: ${JSON.stringify(selectedProject.tasks)}. 
      Genera un resumen estratégico de salud del proyecto, 3 riesgos potenciales y una recomendación de siguiente paso crítico. 
      Usa un tono profesional de Project Manager senior.`;

      const res = await chatWithGemini(prompt, { project: selectedProject }, { useThinking: true });
      setProjectBriefing(res.text);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingBriefing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name || !newProject.budget) return;

    const project: Project = {
      id: Date.now().toString(),
      name: newProject.name,
      budget: parseFloat(newProject.budget),
      spent: 0,
      deadline: newProject.deadline || new Date().toISOString().split('T')[0],
      tasks: [],
      notebookUrl: newProject.notebookUrl,
      status: 'active'
    };

    onAddProject(project);
    setNewProject({ name: '', budget: '', deadline: '', notebookUrl: '' });
    setShowModal(false);
  };

  const handleUpdateMetadata = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !onUpdateProject) return;

    const updated = {
      ...selectedProject,
      name: editProjectData.name,
      budget: parseFloat(editProjectData.budget),
      deadline: editProjectData.deadline,
      notebookUrl: editProjectData.notebookUrl
    };

    onUpdateProject(updated);
    setSelectedProject(updated);
    setIsEditingMetadata(false);
  };

  const startEditingMetadata = () => {
    if (!selectedProject) return;
    setEditProjectData({
      name: selectedProject.name,
      budget: selectedProject.budget.toString(),
      deadline: selectedProject.deadline,
      notebookUrl: selectedProject.notebookUrl || ''
    });
    setIsEditingMetadata(true);
  };

  const addTask = () => {
    if (!selectedProject || !newTask.title) return;

    const task: Task = {
      id: `task-${Date.now()}`,
      title: newTask.title,
      completed: false,
      priority: newTask.priority,
      category: 'work',
      dependsOn: newTask.dependsOn || undefined,
      dueDate: selectedProject.deadline
    };

    const updatedProject = {
      ...selectedProject,
      tasks: [...selectedProject.tasks, task]
    };

    setSelectedProject(updatedProject);
    if (onUpdateProject) onUpdateProject(updatedProject); // Save to Supabase
    setNewTask({ title: '', dependsOn: '', priority: 'medium' });
  };

  const toggleTask = (taskId: string) => {
    if (!selectedProject) return;

    const task = selectedProject.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!task.completed && task.dependsOn) {
      const dependency = selectedProject.tasks.find(t => t.id === task.dependsOn);
      if (dependency && !dependency.completed) {
        alert(`Debes completar "${dependency.title}" antes.`);
        return;
      }
    }

    const updatedTasks = selectedProject.tasks.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );

    const updatedProject = { ...selectedProject, tasks: updatedTasks };
    setSelectedProject(updatedProject);
    if (onUpdateProject) onUpdateProject(updatedProject); // Save to Supabase
  };

  const scrollToTask = (taskId: string) => {
    const el = document.getElementById(`task-${taskId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-indigo-200', 'ring-offset-2');
      setTimeout(() => el.classList.remove('ring-4', 'ring-indigo-200', 'ring-offset-2'), 2000);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Project Master Hub</h2>
          <p className="text-slate-500 font-bold mt-1">Inteligencia y control de ejecución multi-año</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-3 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode('dashboard')}
              className={`p-3 rounded-xl transition-all ${viewMode === 'dashboard' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <BarChart3 size={20} />
            </button>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-8 py-4 rounded-[1.25rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-3"
          >
            <Plus size={18} /> Nuevo Proyecto
          </button>
        </div>
      </header>

      <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar">
        {years.length > 0 ? years.map(year => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={`flex-shrink-0 px-8 py-4 rounded-[1.5rem] font-black text-xs transition-all border ${selectedYear === year
              ? 'bg-white border-indigo-200 text-indigo-600 shadow-xl shadow-indigo-500/5'
              : 'bg-slate-50 border-transparent text-slate-400 hover:bg-white hover:border-slate-200'
              }`}
          >
            {year}
          </button>
        )) : (
          <div className="px-8 py-4 bg-slate-50 rounded-2xl text-slate-300 font-bold text-xs uppercase tracking-widest">
            {new Date().getFullYear()} (Sin proyectos)
          </div>
        )}
      </div>

      {viewMode === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mb-6"><DollarSign size={32} /></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Presupuesto Anual</p>
            <h3 className="text-4xl font-black text-slate-900">€{statsByYear.totalBudget.toLocaleString()}</h3>
          </div>
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mb-6"><Trophy size={32} /></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gasto Ejecutado</p>
            <h3 className="text-4xl font-black text-slate-900">€{statsByYear.totalSpent.toLocaleString()}</h3>
          </div>
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl w-fit mb-6"><Zap size={32} /></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Progreso Medio</p>
            <h3 className="text-4xl font-black text-slate-900">{statsByYear.progress.toFixed(0)}%</h3>
          </div>
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="p-4 bg-slate-900 text-white rounded-2xl w-fit mb-6"><Briefcase size={32} /></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Proyectos Activos</p>
            <h3 className="text-4xl font-black text-slate-900">{statsByYear.count}</h3>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredProjects.length === 0 ? (
          <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center">
            <div className="w-24 h-24 bg-slate-50 text-slate-200 rounded-[2.5rem] flex items-center justify-center mb-6">
              <Briefcase size={48} />
            </div>
            <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">Sin proyectos para {selectedYear}</h3>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const percentSpent = Math.min((project.spent / project.budget) * 100, 100);
            const isOverBudget = project.spent > project.budget;
            const completedTasks = project.tasks.filter(t => t.completed).length;

            return (
              <div
                key={project.id}
                className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 hover:border-indigo-100 hover:scale-[1.01] transition-all duration-500 ease-out group relative overflow-hidden cursor-pointer"
                onClick={() => { setSelectedProject(project); setProjectBriefing(null); setIsEditingMetadata(false); }}
              >
                <div className="flex justify-between items-start mb-10">
                  <div className={`p-4 rounded-2xl ${isOverBudget ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'} group-hover:scale-110 transition-transform duration-300`}>
                    <Briefcase size={28} />
                  </div>
                  <div className="flex gap-2 relative z-10">
                    {project.notebookUrl && (
                      <a
                        href={project.notebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm group/link"
                        title="Abrir NotebookLM"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <BookOpen size={18} />
                        <span className="text-[9px] font-black uppercase tracking-tighter hidden group-hover/link:block">NotebookLM</span>
                      </a>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedProject(project); setProjectBriefing(null); setIsEditingMetadata(false); }}
                      className="p-3 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-indigo-600 transition-colors"
                    >
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </div>

                <h3 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{project.name}</h3>

                <div className="flex items-center gap-3 mb-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                  <CheckCircle2 size={16} className="text-indigo-500" />
                  {completedTasks} / {project.tasks.length} Tareas Completadas
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inversión Actual</p>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-4xl font-black tracking-tight ${isOverBudget ? 'text-red-600' : 'text-slate-900'}`}>
                          €{project.spent.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {isOverBudget && (
                      <div className="flex items-center gap-2 text-red-600 text-[10px] font-black bg-red-50 px-3 py-1.5 rounded-xl uppercase tracking-widest">
                        <AlertTriangle size={14} /> Crítico
                      </div>
                    )}
                  </div>

                  <div className="relative h-4 w-full bg-slate-50 rounded-full overflow-hidden shadow-inner border border-slate-100">
                    <div
                      className={`absolute top-0 left-0 h-full transition-all duration-1000 ${isOverBudget ? 'bg-red-500' : percentSpent > 80 ? 'bg-amber-500' : 'bg-indigo-600'
                        }`}
                      style={{ width: `${percentSpent}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    <span>{percentSpent.toFixed(0)}% Utilizado</span>
                    <span>Meta: €{project.budget.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-10 pt-10 border-t border-slate-50 flex justify-between items-center group-hover:border-indigo-50 transition-colors">
                  <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Calendar size={16} className="text-indigo-400" /> {project.deadline}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal and Detail View (same as before) */}
      {selectedProject && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-[400] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-[#f8fafc] rounded-[4rem] w-full max-w-[1200px] max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-white/20">
            <div className="p-10 md:p-12 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-slate-900 text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-slate-900/30">
                  <Briefcase size={32} />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">{selectedProject.name}</h3>
                  <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mt-1">Laboratorio Digital de Proyecto</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={startEditingMetadata}
                  className="p-4 bg-slate-50 hover:bg-indigo-50 rounded-full text-slate-400 hover:text-indigo-600 transition-all shadow-sm"
                  title="Editar Detalles"
                >
                  <Settings2 size={24} />
                </button>
                <button
                  onClick={() => { if (confirm("¿Eliminar este proyecto?")) { onDeleteProject?.(selectedProject.id); setSelectedProject(null); } }}
                  className="p-4 bg-slate-50 hover:bg-red-50 rounded-full text-slate-400 hover:text-red-600 transition-all shadow-sm"
                  title="Eliminar Proyecto"
                >
                  <Trash2 size={24} />
                </button>
                <button onClick={() => setSelectedProject(null)} className="p-4 bg-slate-50 hover:bg-white rounded-full text-slate-400 hover:text-slate-900 transition-all shadow-sm">
                  <X size={32} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 md:p-12 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                <div className="lg:col-span-7 space-y-10">
                  {/* Metadata Edit Form (Hidden by default) */}
                  {isEditingMetadata ? (
                    <section className="bg-white p-10 rounded-[2.5rem] border-2 border-indigo-100 shadow-xl animate-in slide-in-from-top-4 duration-300">
                      <div className="flex justify-between items-center mb-8">
                        <h4 className="text-xl font-black text-indigo-900 uppercase tracking-tight flex items-center gap-3">
                          <Settings2 size={24} /> Editar Información
                        </h4>
                        <button onClick={() => setIsEditingMetadata(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={24} /></button>
                      </div>
                      <form onSubmit={handleUpdateMetadata} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
                            <input
                              value={editProjectData.name}
                              onChange={e => setEditProjectData({ ...editProjectData, name: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Presupuesto (€)</label>
                            <input
                              type="number"
                              value={editProjectData.budget}
                              onChange={e => setEditProjectData({ ...editProjectData, budget: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 transition-all"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deadline</label>
                            <input
                              type="date"
                              value={editProjectData.deadline}
                              onChange={e => setEditProjectData({ ...editProjectData, deadline: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL NotebookLM</label>
                            <input
                              type="url"
                              placeholder="https://..."
                              value={editProjectData.notebookUrl}
                              onChange={e => setEditProjectData({ ...editProjectData, notebookUrl: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 transition-all"
                            />
                          </div>
                        </div>
                        <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-indigo-200">
                          <Save size={18} /> Guardar Cambios
                        </button>
                      </form>
                    </section>
                  ) : null}

                  {/* Tasks Section */}
                  <section>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                      <Clock size={16} className="text-indigo-500" /> Hoja de Ruta de Ejecución
                    </h4>
                    <div className="space-y-4">
                      {selectedProject.tasks.length === 0 ? (
                        <div className="p-16 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
                          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No hay pasos definidos aún</p>
                        </div>
                      ) : (
                        selectedProject.tasks.map((task) => {
                          const dependency = selectedProject.tasks.find(t => t.id === task.dependsOn);
                          const isLocked = task.dependsOn && dependency && !dependency.completed;

                          return (
                            <div
                              id={`task-${task.id}`}
                              key={task.id}
                              className={`p-8 rounded-[2rem] border transition-all flex items-center justify-between group ${task.completed
                                ? 'bg-emerald-50/50 border-emerald-100 opacity-60'
                                : isLocked
                                  ? 'bg-slate-50 border-slate-100'
                                  : 'bg-white border-slate-100 shadow-sm hover:border-indigo-300'
                                }`}>
                              <div className="flex items-center gap-6">
                                <button
                                  onClick={() => toggleTask(task.id)}
                                  className={`transition-all ${isLocked ? 'text-slate-200 cursor-not-allowed' : task.completed ? 'text-emerald-500' : 'text-slate-200 hover:text-indigo-600'}`}
                                >
                                  {task.completed ? <CheckCircle2 size={32} /> : isLocked ? <Lock size={32} /> : <Circle size={32} />}
                                </button>
                                <div>
                                  <h5 className={`text-lg font-black tracking-tight ${task.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                    {task.title}
                                  </h5>
                                  {task.dependsOn && (
                                    <div className="flex items-center gap-2 mt-2 text-[9px] font-black uppercase tracking-widest text-indigo-400">
                                      <Lock size={12} />
                                      <span>Bloqueado por:</span>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); scrollToTask(task.dependsOn!); }}
                                        className="hover:underline hover:text-indigo-600 transition-colors flex items-center gap-1"
                                      >
                                        {dependency?.title || 'Step Anterior'} <LinkIcon size={10} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${task.priority === 'high' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'
                                }`}>
                                {task.priority}
                              </span>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </section>

                  <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <h4 className="text-lg font-black mb-6 flex items-center gap-3"><Plus size={20} className="text-indigo-600" /> Añadir Nuevo Paso</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <input
                        value={newTask.title}
                        onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                        placeholder="Título de la tarea..."
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      />
                      <select
                        value={newTask.dependsOn}
                        onChange={e => setNewTask({ ...newTask, dependsOn: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black uppercase tracking-widest appearance-none focus:outline-none"
                      >
                        <option value="">Sin Dependencia</option>
                        {selectedProject.tasks.map(t => (
                          <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={addTask}
                      className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-600 transition-all"
                    >
                      Inyectar en Hoja de Ruta
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-8">
                  <div className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between border border-indigo-500/20 min-h-[500px]">
                    <div className="absolute top-0 right-0 p-10 opacity-10"><BookOpen size={120} /></div>

                    <div className="relative z-10">
                      <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-full mb-8">
                        <Sparkles size={16} className="text-indigo-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Project AI Intelligence</span>
                      </div>

                      <h3 className="text-3xl font-black mb-4 tracking-tighter">Project Notebook</h3>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-10 italic">Tu centro de investigación y estrategia</p>

                      {projectBriefing ? (
                        <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] animate-in fade-in slide-in-from-top-2 duration-500 max-h-[250px] overflow-y-auto custom-scrollbar">
                          <div className="text-[11px] text-slate-300 leading-relaxed font-medium space-y-4">
                            {projectBriefing.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                          </div>
                          <button onClick={() => setProjectBriefing(null)} className="text-[9px] font-black uppercase text-indigo-400 mt-6 hover:text-white transition-colors">Refrescar Análisis</button>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="flex items-start gap-5 p-6 bg-white/5 rounded-[2rem] border border-white/10 group hover:bg-white/10 transition-all">
                            <div className="p-3 bg-white/10 rounded-xl text-indigo-400"><Info size={20} /></div>
                            <p className="text-xs text-slate-300 leading-relaxed font-medium italic">
                              "Toda la investigación técnica, presupuestos detallados y planes de contingencia para {selectedProject.name} están centralizados en tu NotebookLM."
                            </p>
                          </div>
                          <button
                            onClick={generateProjectBriefing}
                            disabled={isGeneratingBriefing}
                            className="w-full bg-white/5 border border-white/10 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white/10 transition-all"
                          >
                            {isGeneratingBriefing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            Generar Resumen Estratégico IA
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-12 relative z-10">
                      {selectedProject.notebookUrl ? (
                        <a
                          href={selectedProject.notebookUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full bg-white text-slate-900 py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-indigo-50 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-slate-950/50"
                        >
                          Abrir Documento NotebookLM <ExternalLink size={18} />
                        </a>
                      ) : (
                        <div className="text-center p-6 bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sin URL de NotebookLM asignada</p>
                          <button onClick={startEditingMetadata} className="mt-3 text-[9px] font-black text-indigo-400 uppercase tracking-widest hover:underline">Vincular Ahora</button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Ejecución Presupuestaria</h4>
                        <span className="text-xs font-black text-indigo-600 font-black">€{selectedProject.budget.toLocaleString()}</span>
                      </div>
                      <div className="h-3 bg-slate-50 rounded-full overflow-hidden shadow-inner">
                        <div
                          className={`h-full transition-all duration-1000 ${isOverBudget(selectedProject) ? 'bg-red-500' : 'bg-indigo-600'}`}
                          style={{ width: `${Math.min((selectedProject.spent / selectedProject.budget) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="p-3 bg-white rounded-xl shadow-sm"><AlertTriangle size={20} className="text-amber-500" /></div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Alertas IA</p>
                        <p className="text-xs font-bold text-slate-700">Has consumido el {(selectedProject.spent / selectedProject.budget * 100).toFixed(0)}% del fondo.</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-[500] flex items-center justify-center p-6 animate-in zoom-in duration-300">
          <div className="bg-white rounded-[4rem] w-full max-w-xl overflow-hidden shadow-2xl border border-slate-100">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Nuevo Proyecto</h3>
              <button onClick={() => setShowModal(false)} className="p-4 hover:bg-white rounded-full text-slate-400 transition-all"><X size={32} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-12 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Identificador de Proyecto</label>
                <div className="relative">
                  <Briefcase className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                  <input
                    type="text"
                    placeholder="Ej: Lanzamiento Producto X, Reforma..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-5 pl-16 pr-8 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold text-slate-700"
                    value={newProject.name}
                    onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fondo Asignado (€)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                    <input
                      type="number"
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-5 pl-16 pr-8 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold text-slate-700"
                      value={newProject.budget}
                      onChange={e => setNewProject({ ...newProject, budget: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fecha Límite</label>
                  <div className="relative">
                    <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                    <input
                      type="date"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-5 pl-16 pr-8 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold text-slate-700"
                      value={newProject.deadline}
                      onChange={e => setNewProject({ ...newProject, deadline: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">URL de NotebookLM (Opcional)</label>
                <div className="relative">
                  <BookOpen className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                  <input
                    type="url"
                    placeholder="https://notebooklm.google.com/notebook/..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-5 pl-16 pr-8 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold text-slate-700"
                    value={newProject.notebookUrl}
                    onChange={e => setNewProject({ ...newProject, notebookUrl: e.target.value })}
                  />
                </div>
                <p className="text-[9px] text-slate-400 ml-2 font-medium italic">Enlaza tu cuaderno de investigación para tener acceso directo.</p>
              </div>

              <button
                type="submit"
                className="w-full py-6 bg-slate-900 text-white font-black rounded-2xl shadow-2xl hover:bg-indigo-600 transition-all uppercase tracking-[0.2em] text-xs"
              >
                Registrar Proyecto Maestro
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function isOverBudget(project: Project) {
  return project.spent > project.budget;
}

export default ProjectManager;
