
import React, { useState, useRef } from 'react';
import { Presentation, Task, Project, WorkDocument, Slide, OllamaConfig } from '../types';
import { 
  Monitor, Plus, CheckCircle2, Clock, Presentation as PresIcon, ExternalLink, MoreVertical, 
  AlertCircle, FileText, ChevronRight, X, Sparkles, Loader2, FileUp, Briefcase, Layers, 
  FileCode, FileCheck, Zap, ArrowRight, Play, Download, Check, Circle, CheckSquare, 
  BookOpen, Library, Image as ImageIcon, MessageSquare, Send, Server, Cloud
} from 'lucide-react';
import { extractWorkItemsFromDoc, generatePresentationFromDoc, generatePresentationOllama, askOllamaDocument, chatWithGemini } from '../services/geminiService';
import ProjectManager from './ProjectManager';

interface WorkViewProps {
  initialProjects: Project[];
  initialPresentations: Presentation[];
  initialTasks: Task[];
  ollamaConfig?: OllamaConfig; // Added prop
  onAddProject: (project: Project) => void;
  onAddTask: (task: Task) => void;
  onAddPresentation: (pres: Presentation) => void;
  onUpdateProject?: (project: Project) => void;
}

const STRATEGY_NOTEBOOK_URL = "https://notebooklm.google.com/notebook/5a4a18b6-26a3-4676-a320-059428f4fa39";
const ALL_NOTEBOOKS_URL = "https://notebooklm.google.com/";

const WorkView: React.FC<WorkViewProps> = ({ 
  initialProjects, 
  initialPresentations, 
  initialTasks,
  ollamaConfig,
  onAddProject,
  onAddTask,
  onAddPresentation,
  onUpdateProject
}) => {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [documents, setDocuments] = useState<WorkDocument[]>([]); // New state for loose documents
  const [activeTab, setActiveTab] = useState<'projects' | 'documents' | 'presentations' | 'knowledge'>('projects');
  
  // Document Chat State
  const [selectedDoc, setSelectedDoc] = useState<WorkDocument | null>(null);
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'ai', content: string}[]>([]);
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
    if(!newProjectForm.name) return;
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
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Work Hub</h2>
          <p className="text-slate-500 font-bold mt-1">Gestión de proyectos y documentos inteligentes.</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar gap-1">
           {[
             { id: 'projects', label: 'Proyectos', icon: Briefcase },
             { id: 'documents', label: 'Docs & Chat', icon: FileText },
             { id: 'presentations', label: 'Slides IA', icon: PresIcon },
             { id: 'knowledge', label: 'Knowledge', icon: BookOpen }
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                 activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
               }`}
             >
               <tab.icon size={14} /> {tab.label}
             </button>
           ))}
        </div>
      </header>

      {/* --- PROJECTS TAB --- */}
      {activeTab === 'projects' && (
        <ProjectManager projects={initialProjects} onAddProject={onAddProject} onUpdateProject={onUpdateProject} />
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
                     {isChatting && <div className="flex items-center gap-2 text-slate-400 text-xs font-bold ml-2"><Loader2 size={12} className="animate-spin"/> Analizando...</div>}
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
                   <h4 className="font-bold text-sm mb-4">Estructura Generada:</h4>
                   <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                      {generatedSlides.map((slide, i) => (
                        <div key={i} className="p-3 bg-indigo-900/30 rounded-xl border border-white/10">
                           <p className="font-bold text-xs">Slide {i+1}: {slide.title}</p>
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

      {/* --- KNOWLEDGE TAB --- */}
      {activeTab === 'knowledge' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:border-indigo-200 transition-all group">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-blue-200">
                 <BookOpen size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Google NotebookLM</h3>
              <p className="text-slate-500 text-sm font-medium mb-8">Accede a tus cuadernos de investigación en la nube de Google.</p>
              <a href={ALL_NOTEBOOKS_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 px-6 py-3 bg-slate-50 text-blue-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all">
                 Abrir NotebookLM <ExternalLink size={14} />
              </a>
           </div>

           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:border-amber-200 transition-all group">
              <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-amber-200">
                 <Library size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">OpenNotebookLM</h3>
              <p className="text-slate-500 text-sm font-medium mb-8">Conexión con tu base de conocimiento local (RAG System).</p>
              <button className="inline-flex items-center gap-3 px-6 py-3 bg-slate-50 text-amber-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-amber-50 transition-all">
                 Configurar Local <Server size={14} />
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default WorkView;
