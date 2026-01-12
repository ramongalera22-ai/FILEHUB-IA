
import React, { useState, useEffect, useRef } from 'react';
import { OllamaConfig, OpenNotebookConfig } from '../types';
import { 
  Cpu, 
  Globe, 
  Settings, 
  Zap, 
  Cloud, 
  Server, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  Loader2, 
  Terminal, 
  History, 
  Trash2,
  Sparkles,
  Link,
  ShieldCheck,
  Code,
  Library,
  BookOpen,
  Key
} from 'lucide-react';
import { chatWithGemini } from '../services/geminiService';

interface AIHubViewProps {
  ollamaConfig: OllamaConfig;
  openNotebookConfig: OpenNotebookConfig;
  onUpdateConfig: (config: OllamaConfig) => void;
  onUpdateNotebookConfig: (config: OpenNotebookConfig) => void;
  globalContext: any;
}

const AIHubView: React.FC<AIHubViewProps> = ({ ollamaConfig, openNotebookConfig, onUpdateConfig, onUpdateNotebookConfig, globalContext }) => {
  const [mode, setMode] = useState<'cloud' | 'local' | 'notebook'>('cloud');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localStatus, setLocalStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [notebookStatus, setNotebookStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkOllamaStatus();
  }, [ollamaConfig.baseUrl]);

  useEffect(() => {
    checkNotebookStatus();
  }, [openNotebookConfig.baseUrl]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkOllamaStatus = async () => {
    setLocalStatus('checking');
    try {
      const headers: any = {};
      if (ollamaConfig.apiKey) {
        headers['Authorization'] = `Bearer ${ollamaConfig.apiKey}`;
      }
      const response = await fetch(`${ollamaConfig.baseUrl}/api/tags`, { headers });
      if (response.ok) setLocalStatus('online');
      else setLocalStatus('offline');
    } catch (e) {
      setLocalStatus('offline');
    }
  };

  const checkNotebookStatus = async () => {
    setNotebookStatus('checking');
    try {
      // Simulation of health check for OpenNotebookLM
      const response = await fetch(`${openNotebookConfig.baseUrl}/health`);
      if (response.ok) setNotebookStatus('online');
      else setNotebookStatus('offline');
    } catch (e) {
      setNotebookStatus('offline');
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', content: input, engine: mode };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    try {
      if (mode === 'cloud') {
        const res = await chatWithGemini(input, globalContext);
        setMessages(prev => [...prev, { role: 'ai', content: res.text, engine: 'cloud' }]);
      } else if (mode === 'local') {
        // Local Ollama Request
        const headers: any = { 'Content-Type': 'application/json' };
        if (ollamaConfig.apiKey) {
          headers['Authorization'] = `Bearer ${ollamaConfig.apiKey}`;
        }

        const response = await fetch(`${ollamaConfig.baseUrl}/api/generate`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: ollamaConfig.model,
            prompt: `CONTEXTO FILEHUB: ${JSON.stringify(globalContext)}\n\nUSUARIO: ${input}\n\nRESPUESTA CORTA:`,
            stream: false
          })
        });
        
        if (!response.ok) throw new Error('Ollama Error');
        const data = await response.json();
        setMessages(prev => [...prev, { role: 'ai', content: data.response, engine: 'local' }]);
      } else if (mode === 'notebook') {
        // OpenNotebookLM Request (Generic RAG Interface)
        const response = await fetch(`${openNotebookConfig.baseUrl}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collection: openNotebookConfig.collectionName,
            query: input
          })
        });

        if (!response.ok) throw new Error('OpenNotebookLM Error');
        const data = await response.json();
        // Assuming response has 'answer' or 'text'
        setMessages(prev => [...prev, { role: 'ai', content: data.answer || data.text || "Respuesta recibida.", engine: 'notebook' }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'error', content: 'Fallo en la conexión con el nodo seleccionado.', engine: mode }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
             Centro de Inteligencia Híbrida
             <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse delay-75"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse delay-100"></div>
             </div>
          </h2>
          <p className="text-slate-500 font-bold mt-1">Alterna entre modelos de nube, servidor local y base de conocimiento.</p>
        </div>
        
        <div className="flex bg-white p-2 rounded-[1.5rem] border border-slate-100 shadow-sm overflow-x-auto no-scrollbar gap-2">
           <button 
            onClick={() => setMode('cloud')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${
              mode === 'cloud' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-indigo-600'
            }`}
           >
             <Cloud size={16} /> Cloud
           </button>
           <button 
            onClick={() => setMode('local')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${
              mode === 'local' ? 'bg-cyan-500 text-white shadow-xl' : 'text-slate-400 hover:text-cyan-500'
            }`}
           >
             <Server size={16} /> Ollama
           </button>
           <button 
            onClick={() => setMode('notebook')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${
              mode === 'notebook' ? 'bg-amber-500 text-white shadow-xl' : 'text-slate-400 hover:text-amber-500'
            }`}
           >
             <Library size={16} /> Knowledge
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Chat Interface */}
        <div className="lg:col-span-8 space-y-6">
           <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm flex flex-col h-[700px] overflow-hidden">
              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar bg-slate-50/20">
                 {messages.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-40">
                      <div className={`p-8 rounded-[3rem] ${mode === 'cloud' ? 'bg-indigo-50 text-indigo-600' : mode === 'local' ? 'bg-cyan-50 text-cyan-600' : 'bg-amber-50 text-amber-600'}`}>
                         <Terminal size={64} />
                      </div>
                      <p className="font-black text-xs uppercase tracking-[0.3em]">
                        Nodo {mode === 'cloud' ? 'Google Cloud' : mode === 'local' ? 'Ollama Local' : 'OpenNotebook'} listo
                      </p>
                   </div>
                 )}

                 {messages.map((m, i) => (
                   <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-6 rounded-[2.5rem] relative group ${
                        m.role === 'user' 
                          ? 'bg-slate-900 text-white' 
                          : m.role === 'error'
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : m.engine === 'cloud'
                              ? 'bg-white text-slate-800 border border-indigo-100 shadow-md'
                              : m.engine === 'local'
                                ? 'bg-white text-slate-800 border border-cyan-100 shadow-md'
                                : 'bg-white text-slate-800 border border-amber-100 shadow-md'
                      }`}>
                         <p className="text-sm leading-relaxed font-medium">{m.content}</p>
                         <div className={`mt-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${m.role === 'user' ? 'text-slate-500' : 'text-slate-400'}`}>
                           {m.role === 'user' ? <History size={10}/> : (
                             m.engine === 'cloud' ? <Zap size={10} className="text-indigo-500"/> : 
                             m.engine === 'local' ? <Cpu size={10} className="text-cyan-500"/> :
                             <BookOpen size={10} className="text-amber-500"/>
                           )}
                           {m.engine || 'user'} • {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                         </div>
                      </div>
                   </div>
                 ))}
                 <div ref={chatEndRef} />
              </div>

              {/* Input Control */}
              <div className="p-8 bg-white border-t border-slate-50">
                 <div className={`flex items-center gap-4 p-3 rounded-[2rem] border transition-all ${
                   mode === 'cloud' ? 'bg-indigo-50/30 border-indigo-100' : 
                   mode === 'local' ? 'bg-cyan-50/30 border-cyan-100' :
                   'bg-amber-50/30 border-amber-100'
                 }`}>
                    <input 
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSend()}
                      placeholder={mode === 'cloud' ? "Pregunta a Gemini Cloud..." : mode === 'local' ? `Preguntando a Ollama (${ollamaConfig.model})...` : `Consultando OpenNotebook (${openNotebookConfig.collectionName})...`}
                      className="flex-1 bg-transparent px-6 py-3 font-bold text-slate-800 outline-none placeholder-slate-400"
                    />
                    <button 
                      onClick={handleSend}
                      disabled={isProcessing || !input.trim()}
                      className={`p-5 rounded-2xl text-white shadow-xl transition-all active:scale-95 disabled:opacity-50 ${
                        mode === 'cloud' ? 'bg-indigo-600 hover:bg-indigo-700' : 
                        mode === 'local' ? 'bg-cyan-500 hover:bg-cyan-600' :
                        'bg-amber-500 hover:bg-amber-600'
                      }`}
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
                    </button>
                 </div>
              </div>
           </div>
        </div>

        {/* Configuration Sidebar */}
        <div className="lg:col-span-4 space-y-8">
           
           {/* Engine Status Card */}
           <section className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-10"><Cpu size={100} /></div>
              <h4 className="text-lg font-black mb-8 flex items-center gap-3">
                 <ShieldCheck className="text-indigo-400" size={24} /> Engine Status
              </h4>
              
              <div className="space-y-4 relative z-10">
                 <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-4">
                       <Cloud size={18} className="text-indigo-400" />
                       <span className="text-xs font-black uppercase">Gemini Cloud</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div> Online
                    </div>
                 </div>

                 <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-4">
                       <Server size={18} className="text-cyan-400" />
                       <span className="text-xs font-black uppercase">Ollama Node</span>
                    </div>
                    <div className={`flex items-center gap-2 text-[10px] font-black uppercase ${
                      localStatus === 'online' ? 'text-emerald-400' : 
                      localStatus === 'checking' ? 'text-amber-400' : 'text-red-400'
                    }`}>
                       <div className={`w-1.5 h-1.5 rounded-full ${
                         localStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 
                         localStatus === 'checking' ? 'bg-amber-400 animate-bounce' : 'bg-red-400'
                       }`}></div>
                       {localStatus}
                    </div>
                 </div>

                 <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-4">
                       <Library size={18} className="text-amber-400" />
                       <span className="text-xs font-black uppercase">OpenNotebook</span>
                    </div>
                    <div className={`flex items-center gap-2 text-[10px] font-black uppercase ${
                      notebookStatus === 'online' ? 'text-emerald-400' : 
                      notebookStatus === 'checking' ? 'text-amber-400' : 'text-red-400'
                    }`}>
                       <div className={`w-1.5 h-1.5 rounded-full ${
                         notebookStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 
                         notebookStatus === 'checking' ? 'bg-amber-400 animate-bounce' : 'bg-red-400'
                       }`}></div>
                       {notebookStatus}
                    </div>
                 </div>
              </div>

              <button 
                onClick={() => { checkOllamaStatus(); checkNotebookStatus(); }}
                className="w-full mt-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Re-Escanear Nodos
              </button>
           </section>

           {/* Ollama Config Form */}
           <section className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm space-y-6">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                 <Settings className="text-cyan-600" size={18} /> Ollama Config
              </h4>

              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Host URL</label>
                    <div className="relative">
                       <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                       <input 
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl px-10 py-3 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-cyan-500/5 focus:border-cyan-500"
                         value={ollamaConfig.baseUrl}
                         onChange={e => onUpdateConfig({...ollamaConfig, baseUrl: e.target.value})}
                       />
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Model Name</label>
                    <div className="relative">
                       <Code className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                       <input 
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl px-10 py-3 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-cyan-500/5 focus:border-cyan-500"
                         placeholder="llama3, mistral..."
                         value={ollamaConfig.model}
                         onChange={e => onUpdateConfig({...ollamaConfig, model: e.target.value})}
                       />
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">API Key</label>
                    <div className="relative">
                       <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                       <input 
                         type="password"
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl px-10 py-3 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-cyan-500/5 focus:border-cyan-500"
                         placeholder="Opcional"
                         value={ollamaConfig.apiKey || ''}
                         onChange={e => onUpdateConfig({...ollamaConfig, apiKey: e.target.value})}
                       />
                    </div>
                 </div>
              </div>
           </section>

           {/* OpenNotebookLM Config Form */}
           <section className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm space-y-6">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                 <Settings className="text-amber-600" size={18} /> OpenNotebook Config
              </h4>

              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">RAG Endpoint</label>
                    <div className="relative">
                       <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                       <input 
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl px-10 py-3 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500"
                         value={openNotebookConfig.baseUrl}
                         onChange={e => onUpdateNotebookConfig({...openNotebookConfig, baseUrl: e.target.value})}
                         placeholder="http://localhost:8000"
                       />
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Collection / Index</label>
                    <div className="relative">
                       <Library className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                       <input 
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl px-10 py-3 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500"
                         placeholder="my-docs"
                         value={openNotebookConfig.collectionName}
                         onChange={e => onUpdateNotebookConfig({...openNotebookConfig, collectionName: e.target.value})}
                       />
                    </div>
                 </div>
              </div>
           </section>

           {/* Quick Actions */}
           <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl">
              <h4 className="font-black text-sm mb-4 flex items-center gap-2">
                 <Sparkles size={16} className="text-amber-300" /> IA de Soporte
              </h4>
              <p className="text-xs text-indigo-100 mb-6 leading-relaxed">
                Toda la inteligencia de este módulo está optimizada para analizar tus archivos locales sin que los datos salgan nunca de tu red.
              </p>
              <button 
                onClick={() => setMessages([])}
                className="w-full py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> Limpiar Sesión
              </button>
           </div>

        </div>
      </div>
    </div>
  );
};

export default AIHubView;
