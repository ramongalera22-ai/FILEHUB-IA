
import React, { useState, useRef } from 'react';
import { Presentation, Task, Project, WorkDocument, Slide, OllamaConfig } from '../types';
import {
  Monitor, Plus, CheckCircle2, Clock, Presentation as PresIcon, ExternalLink, MoreVertical,
  AlertCircle, FileText, ChevronRight, X, Sparkles, Loader2, FileUp, Briefcase, Layers,
  FileCode, FileCheck, Zap, ArrowRight, Play, Download, Check, Circle, CheckSquare,
  BookOpen, Library, Image as ImageIcon, MessageSquare, Send, Server, Cloud, Trash2,
  LayoutDashboard, Heart, Brain, ArrowUpRight, Share2, Edit3
} from 'lucide-react';
import { extractWorkItemsFromDoc, generatePresentationFromDoc, generatePresentationOllama, askOllamaDocument, chatWithGemini } from '../services/geminiService';
import ProjectManager from './ProjectManager';
import { BotPanelWorkHub } from './BotPanel';

interface WorkViewProps {
  initialProjects: Project[];
  initialPresentations: Presentation[];
  initialTasks: Task[];
  ollamaConfig?: OllamaConfig; // Added prop
  onAddProject: (project: Project) => void;
  onAddTask: (task: Task) => void;
  onAddPresentation: (pres: Presentation) => void;
  onUpdateProject?: (project: Project) => void;
  onDeleteProject?: (id: string) => void;
  onDeletePresentation?: (id: string) => void;
}

const STRATEGY_NOTEBOOK_URL = "https://notebooklm.google.com/notebook/5a4a18b6-26a3-4676-a320-059428f4fa39";
const MAIN_NOTEBOOK_URL = "https://notebooklm.google.com/notebook/355486c8-eb6d-4c8f-abaa-1bc80134e41b";
const ALL_NOTEBOOKS_URL = "https://notebooklm.google.com/";

const WorkView: React.FC<WorkViewProps> = ({
  initialProjects,
  initialPresentations,
  initialTasks,
  ollamaConfig,
  onAddProject,
  onAddTask,
  onAddPresentation,
  onUpdateProject,
  onDeleteProject,
  onDeletePresentation
}) => {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [documents, setDocuments] = useState<WorkDocument[]>([]); // New state for loose documents
  const [activeTab, setActiveTab] = useState<'feed' | 'projects' | 'documents' | 'presentations' | 'notebook'>('feed');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Document Chat State
  const [selectedDoc, setSelectedDoc] = useState<WorkDocument | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatEngine, setChatEngine] = useState<'gemini' | 'ollama'>('gemini');
  const [isChatting, setIsChatting] = useState(false);

  // Presentation Gen State
  const [generatedSlides, setGeneratedSlides] = useState<Slide[] | null>(null);
  const [isGeneratingPres, setIsGeneratingPres] = useState(false);
  const [presEngine, setPresEngine] = useState<'gemini' | 'ollama'>('gemini');

  // Analysis State
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);

  // Create Project State
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({ name: '', description: '', budget: 0, deadline: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const presGenInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectForm.name) return;
    onAddProject({
      id: `proj-${Date.now()}`,
      name: newProjectForm.name,
      budget: newProjectForm.budget,
      spent: 0,
      deadline: newProjectForm.deadline || new Date().toISOString().split('T')[0],
      tasks: [],
      status: 'active',
      documents: []
    });
    setShowNewProjectModal(false);
    setNewProjectForm({ name: '', description: '', budget: 0, deadline: '' });
  };

  const handleDocUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const newDoc: WorkDocument = {
          id: `doc-${Date.now()}`,
          name: file.name,
          type: file.type.includes('pdf') ? 'pdf' : 'text',
          uploadDate: new Date().toISOString().split('T')[0],
          url: URL.createObjectURL(file),
          content: reader.result as string // Storing content for AI context (simplified)
        };
        setDocuments([...documents, newDoc]);
      };
      if (file.type.includes('pdf')) {
        // PDF handling typically requires parsing, for this demo we'll assume binary handling in services or mock text
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    }
    event.target.value = '';
  };

  const saveNotesAsDocument = () => {
    if (!notes.trim()) return;
    const newDoc: WorkDocument = {
      id: `doc-${Date.now()}`,
      name: `Nota Trabajo ${new Date().toLocaleDateString('es-ES')}`,
      type: 'text',
      uploadDate: new Date().toISOString().split('T')[0],
      content: notes
    };
    setDocuments([...documents, newDoc]);
    setNotes(''); // Clear notes after saving
    setActiveTab('documents'); // Switch to documents tab
    alert('Nota guardada en Documentos');
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || !selectedDoc) return;

    const userMsg = { role: 'user' as const, content: chatInput };
    setChatMessages([...chatMessages, userMsg]);
    setChatInput('');
    setIsChatting(true);

    try {
      let responseText = '';
      if (chatEngine === 'ollama' && ollamaConfig?.isActive) {
        // Need to extract text from doc. For PDF/Binary, assume service handles base64 or similar.
        // Simplified: Passing a mock string or content if available
        const content = selectedDoc.content || "Contenido binario o no parseado.";
        responseText = await askOllamaDocument(userMsg.content, content, ollamaConfig.baseUrl, ollamaConfig.model, ollamaConfig.apiKey);
      } else {
        // Gemini
        const res = await chatWithGemini(userMsg.content, { documentName: selectedDoc.name, type: selectedDoc.type });
        responseText = res.text;
      }
      setChatMessages(prev => [...prev, { role: 'ai', content: responseText }]);
    } catch (e) {
      console.error(e);
      setChatMessages(prev => [...prev, { role: 'ai', content: "Error conectando con la IA." }]);
    } finally {
      setIsChatting(false);
    }
  };

  const handlePresGeneration = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsGeneratingPres(true);
    setGeneratedSlides(null);
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        let slides: Slide[] = [];
        if (presEngine === 'ollama' && ollamaConfig?.isActive) {
          // Ollama requires text context usually, or vision if multimodal
          // For demo, assuming text based generation
          const textContent = "Simulated extracted text from PDF for Ollama context.";
          slides = await generatePresentationOllama(textContent, ollamaConfig.baseUrl, ollamaConfig.model, ollamaConfig.apiKey);
        } else {
          // Gemini (Native PDF/Image support)
          const mimeType = file.type;
          const base64 = (reader.result as string).split(',')[1];
          slides = await generatePresentationFromDoc(base64, mimeType);
        }
        setGeneratedSlides(slides);
      } catch (error) {
        console.error("Presentation generation failed:", error);
        alert("Fallo en la generación. Verifica la conexión o el formato.");
      } finally {
        setIsGeneratingPres(false);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">

      <div className="px-4 pb-2 pt-4"><BotPanelWorkHub /></div>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Work Hub</h2>
          <p className="text-slate-500 font-bold mt-1">Gestión de proyectos y documentos inteligentes.</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar gap-1">
          {[
            { id: 'feed', label: 'Feed', icon: LayoutDashboard },
            { id: 'projects', label: 'Tareas', icon: Briefcase },
            { id: 'documents', label: 'Documentos', icon: FileText },
            { id: 'notebook', label: 'Cuaderno', icon: BookOpen },
            { id: 'presentations', label: 'Pizarra', icon: PresIcon }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* --- FEED TAB (DASHBOARD) --- */}
      {activeTab === 'feed' && (
        <div className="space-y-10 animate-in fade-in duration-700">
          {/* Dashboard Hub Style Triple Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div
              onClick={() => setActiveTab('presentations')}
              className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-[2.5rem] cursor-pointer group hover:scale-[1.02] transition-all shadow-xl shadow-indigo-500/20 overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[40px] rounded-full -mr-10 -mt-10"></div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white mb-6 group-hover:rotate-12 transition-transform">
                  <PresIcon size={24} />
                </div>
                <h4 className="text-xl font-black text-white uppercase">Pizarra</h4>
                <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                  ACCESO RÁPIDO <ArrowUpRight size={14} />
                </p>
              </div>
            </div>

            <div
              onClick={() => setActiveTab('notebook')}
              className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-[2.5rem] cursor-pointer group hover:scale-[1.02] transition-all shadow-xl shadow-emerald-500/20 overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[40px] rounded-full -mr-10 -mt-10"></div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white mb-6 group-hover:rotate-12 transition-transform">
                  <BookOpen size={24} />
                </div>
                <h4 className="text-xl font-black text-white uppercase">Cuaderno</h4>
                <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                  NOTAS & DOCUMENTOS <ArrowUpRight size={14} />
                </p>
              </div>
            </div>

            <div
              onClick={() => setActiveTab('projects')}
              className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 p-8 rounded-[2.5rem] cursor-pointer group hover:border-pink-500/50 transition-all shadow-sm"
            >
              <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-pink-500 transition-colors mb-6">
                <Briefcase size={24} />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase">Work Hub</h4>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                GESTIONAR PROYECTOS <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </p>
            </div>
          </div>

          {/* Activity Section */}
          <section className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                <Clock size={24} className="text-indigo-500" /> Actividad Reciente
              </h3>
              <div className="flex gap-2">
                <button className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-indigo-500 transition-colors">
                  <Plus size={16} />
                </button>
                <span className="text-[10px] font-black px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg uppercase tracking-widest self-center">REALTIME FEED</span>
              </div>
            </div>

            <div className="p-10 space-y-8">
              {/* Mocking some activity based on state */}
              {[...projects, ...documents].slice(0, 5).length > 0 ? (
                [...projects, ...documents].slice(0, 5).map((item: any, idx) => (
                  <div key={idx} className="flex items-start gap-6 group hover:translate-x-2 transition-transform">
                    <div className={`p-4 rounded-2xl shrink-0 ${'status' in item ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {'status' in item ? <Briefcase size={20} /> : <FileText size={20} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-widest">
                        {'status' in item ? 'Proyecto actualizado' : 'Documento subido'}
                      </p>
                      <h4 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                        {item.name}
                      </h4>
                      <div className="mt-3 flex items-center gap-2 text-slate-400">
                        <Clock size={12} />
                        <span className="text-[10px] font-bold">{item.uploadDate || item.deadline}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-200 mb-6">
                    <Clock size={32} />
                  </div>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Sin actividad reciente en el espacio de trabajo</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* --- PROJECTS TAB --- */}
      {activeTab === 'projects' && (
        <ProjectManager
          projects={initialProjects}
          onAddProject={onAddProject}
          onUpdateProject={onUpdateProject}
          onDeleteProject={onDeleteProject}
        />
      )}

      {/* --- DOCUMENTS TAB --- */}
      {activeTab === 'documents' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[600px]">
          <div className="lg:col-span-4 flex flex-col gap-4 h-full">
            <div
              onClick={() => docInputRef.current?.click()}
              className="p-6 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center gap-3 cursor-pointer hover:bg-slate-800 transition-all shadow-lg shrink-0"
            >
              <FileUp size={20} />
              <span className="font-black text-xs uppercase tracking-widest">Subir Documento</span>
              <input type="file" ref={docInputRef} className="hidden" onChange={handleDocUpload} />
            </div>

            <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 overflow-y-auto custom-scrollbar space-y-3">
              {documents.length === 0 && <p className="text-center text-slate-400 text-xs font-bold py-10">Sin documentos</p>}
              {documents.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => { setSelectedDoc(doc); setChatMessages([]); }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${selectedDoc?.id === doc.id ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100' : 'bg-slate-50 border-slate-100 hover:border-indigo-100'}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText size={18} className="text-indigo-500 shrink-0" />
                    <span className="text-xs font-bold truncate">{doc.name}</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-300" />
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            {selectedDoc ? (
              <>
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                  <div className="flex items-center gap-3">
                    <FileText className="text-indigo-600" />
                    <h3 className="font-black text-slate-800">{selectedDoc.name}</h3>
                  </div>
                  <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                    <button onClick={() => setChatEngine('gemini')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${chatEngine === 'gemini' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Gemini</button>
                    <button onClick={() => setChatEngine('ollama')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${chatEngine === 'ollama' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}>Ollama</button>
                  </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4 bg-slate-50/10">
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium ${m.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-100 text-slate-700 shadow-sm'}`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {isChatting && <div className="flex items-center gap-2 text-slate-400 text-xs font-bold ml-2"><Loader2 size={12} className="animate-spin" /> Analizando...</div>}
                </div>

                <div className="p-4 border-t border-slate-50 flex gap-2">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleChatSend()}
                    placeholder={`Pregunta a ${chatEngine === 'gemini' ? 'Gemini Cloud' : 'Ollama Local'} sobre el documento...`}
                    className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                  <button onClick={handleChatSend} disabled={isChatting} className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50">
                    <Send size={18} />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-300 space-y-4">
                <MessageSquare size={64} className="opacity-20" />
                <p className="font-black text-xs uppercase tracking-widest">Selecciona un documento para chatear</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- PRESENTATIONS TAB --- */}
      {activeTab === 'presentations' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 opacity-20 group-hover:rotate-12 transition-transform"><Layers size={120} /></div>
            <h3 className="text-3xl font-black mb-4">Generador de Slides</h3>
            <p className="text-indigo-200 text-sm font-medium leading-relaxed max-w-sm mb-8">
              Sube un PDF y la IA estructurará tu presentación automáticamente.
            </p>

            <div className="flex gap-4 mb-8">
              <button onClick={() => setPresEngine('gemini')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20 ${presEngine === 'gemini' ? 'bg-white text-indigo-600' : 'bg-indigo-800/50 text-indigo-200'}`}>
                <Cloud size={14} /> Gemini
              </button>
              <button onClick={() => setPresEngine('ollama')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/20 ${presEngine === 'ollama' ? 'bg-white text-indigo-600' : 'bg-indigo-800/50 text-indigo-200'}`}>
                <Server size={14} /> Ollama
              </button>
            </div>

            <input type="file" ref={presGenInputRef} className="hidden" accept=".pdf" onChange={handlePresGeneration} />
            <button
              onClick={() => presGenInputRef.current?.click()}
              disabled={isGeneratingPres}
              className="w-full bg-white text-indigo-700 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center justify-center gap-3 shadow-lg"
            >
              {isGeneratingPres ? <Loader2 className="animate-spin" size={18} /> : <PresIcon size={18} />}
              Generar Slides ({presEngine})
            </button>

            {generatedSlides && (
              <div className="mt-8 bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/20 animate-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-sm">Estructura Generada:</h4>
                  <button
                    onClick={() => { if (confirm("¿Eliminar todas las presentaciones generadas?")) { /* Logic if needed or just clear state if it was temporary */ setGeneratedSlides(null); } }}
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {generatedSlides.map((slide, i) => (
                    <div key={i} className="p-3 bg-indigo-900/30 rounded-xl border border-white/10">
                      <p className="font-bold text-xs">Slide {i + 1}: {slide.title}</p>
                      <ul className="list-disc list-inside text-[10px] text-indigo-200 mt-1">
                        {slide.content.slice(0, 2).map((pt, j) => <li key={j}>{pt}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- NOTEBOOK TAB --- */}
      {activeTab === 'notebook' && (
        <div className="space-y-12 animate-in slide-in-from-bottom-6 duration-700">
          {/* AI Integrations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* NotebookLM */}
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 flex flex-col justify-between group hover:border-indigo-500/50 transition-all shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-[60px] rounded-full -mr-10 -mt-10 group-hover:bg-indigo-600/20 transition-all"></div>
              <div className="space-y-6 relative z-10">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                  <Brain size={32} />
                </div>
                <div>
                  <h4 className="text-2xl font-black text-white">NotebookLM</h4>
                  <p className="text-slate-400 text-sm mt-3 font-bold leading-relaxed">Analiza tus proyectos y documentos con la potencia de Google AI.</p>
                </div>
              </div>
              <div className="mt-10 relative z-10">
                <a href="https://notebooklm.google.com/" target="_blank" rel="noopener noreferrer" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-center shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 group/btn">
                  Abrir Notebook <ArrowUpRight size={16} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                </a>
              </div>
            </div>

            {/* OpenNotebookLM */}
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 flex flex-col justify-between group hover:border-emerald-500/50 transition-all shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/10 blur-[60px] rounded-full -mr-10 -mt-10 group-hover:bg-emerald-600/20 transition-all"></div>
              <div className="space-y-6 relative z-10">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Share2 size={32} />
                </div>
                <div>
                  <h4 className="text-2xl font-black text-white">OpenNotebook</h4>
                  <p className="text-slate-400 text-sm mt-3 font-bold leading-relaxed">Gestiona tu base de conocimiento local de forma privada.</p>
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
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Cuaderno de Trabajo</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isSaving ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isSaving ? 'text-amber-500' : 'text-slate-400'}`}>
                    {isSaving ? 'Guardando...' : 'Sincronizado'}
                  </span>
                </div>
                <button
                  onClick={saveNotesAsDocument}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
                >
                  <FileText size={14} />
                  Convertir en Documento
                </button>
              </div>
            </div>
            <div className="bg-slate-900 rounded-[3rem] border border-slate-800 p-10 shadow-2xl flex group focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all">
              <textarea
                className="w-full bg-transparent border-none focus:outline-none resize-none text-xl font-medium leading-relaxed text-slate-100 placeholder:text-slate-600 font-serif"
                placeholder="Escribe tus ideas, resúmenes de reuniones o planes aquí..."
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setIsSaving(true);
                  setTimeout(() => setIsSaving(false), 1000);
                }}
                rows={12}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkView;
