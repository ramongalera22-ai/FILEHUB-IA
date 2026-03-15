import React, { useState, useEffect, useRef } from 'react';
import { OllamaConfig, OpenNotebookConfig, AnythingLLMConfig, OpenWebUIConfig, LocalLlmConfig, ChatMessage } from '../types';
import {
  Cpu,
  Settings,
  Zap,
  Cloud,
  Server,
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
  Key,
  Layout,
  MessageSquare,
  Lock
} from 'lucide-react';
import { chatWithGemini } from '../services/openrouterService';
import { checkOllamaStatus, chatWithOllama } from '../services/ollamaService';
import { checkAnythingStatus, chatWithAnything } from '../services/anythingLlmService';
import { checkLocalLlmStatus, chatWithLocalLlm } from '../services/localLlmService';

interface AIHubViewProps {
  ollamaConfig: OllamaConfig;
  openNotebookConfig: OpenNotebookConfig;
  anythingLLMConfig?: AnythingLLMConfig;
  localLlmConfig?: LocalLlmConfig;
  onUpdateConfig: (config: OllamaConfig) => void;
  onUpdateNotebookConfig: (config: OpenNotebookConfig) => void;
  onUpdateAnythingConfig?: (config: AnythingLLMConfig) => void;
  onUpdateLocalLlmConfig?: (config: LocalLlmConfig) => void;
  openWebUIConfig?: OpenWebUIConfig;
  onUpdateOpenWebUIConfig?: (config: OpenWebUIConfig) => void;
  globalContext: any;
}

const AIHubView: React.FC<AIHubViewProps> = ({
  ollamaConfig,
  openNotebookConfig,
  anythingLLMConfig,
  localLlmConfig,
  onUpdateConfig,
  onUpdateNotebookConfig,
  onUpdateAnythingConfig,
  onUpdateLocalLlmConfig,
  openWebUIConfig,
  onUpdateOpenWebUIConfig,
  globalContext
}) => {
  const [mode, setMode] = useState<'cloud' | 'local' | 'notebook' | 'anything' | 'openwebui' | 'local_llm'>('local');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Status states
  const [localStatus, setLocalStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [localLlmStatus, setLocalLlmStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [notebookStatus, setNotebookStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [anythingStatus, setAnythingStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [openWebUIStatus, setOpenWebUIStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAllStatuses();
  }, []);

  useEffect(() => {
    checkStatusOllama();
  }, [ollamaConfig.baseUrl, ollamaConfig.apiKey]);

  useEffect(() => {
    checkStatusAnything();
  }, [anythingLLMConfig]);

  useEffect(() => {
    if (localLlmConfig) checkStatusLocalLlm();
  }, [localLlmConfig?.baseUrl, localLlmConfig?.apiKey]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkAllStatuses = () => {
    checkStatusOllama();
    checkNotebookStatus();
    checkStatusAnything();
    checkStatusOpenWebUI();
    checkStatusLocalLlm();
  };

  const checkStatusLocalLlm = async () => {
    if (!localLlmConfig || !localLlmConfig.isActive) {
      setLocalLlmStatus('offline');
      return;
    }
    setLocalLlmStatus('checking');
    const isOnline = await checkLocalLlmStatus(localLlmConfig);
    setLocalLlmStatus(isOnline ? 'online' : 'offline');
  };

  const checkStatusOllama = async () => {
    if (!ollamaConfig.isActive) {
      setLocalStatus('offline');
      return;
    }
    setLocalStatus('checking');
    const isOnline = await checkOllamaStatus(ollamaConfig);
    setLocalStatus(isOnline ? 'online' : 'offline');
  };

  const checkStatusAnything = async () => {
    if (!anythingLLMConfig) return;
    setAnythingStatus('checking');
    const isOnline = await checkAnythingStatus(anythingLLMConfig);
    setAnythingStatus(isOnline ? 'online' : 'offline');
  };

  const checkStatusOpenWebUI = async () => {
    if (!openWebUIConfig) return;
    setOpenWebUIStatus('checking');
    try {
      const response = await fetch(openWebUIConfig.baseUrl, { method: 'HEAD', mode: 'no-cors' });
      setOpenWebUIStatus('online');
    } catch {
      setOpenWebUIStatus('offline');
    }
  };

  const checkNotebookStatus = async () => {
    setNotebookStatus('checking');
    if (!openNotebookConfig?.isActive) {
      setNotebookStatus('offline');
      return;
    }
    try {
      const headers: any = {};
      if (openNotebookConfig.apiKey) {
        headers['Authorization'] = `Bearer ${openNotebookConfig.apiKey}`;
      }
      const response = await fetch(`${openNotebookConfig.baseUrl}/health`, { headers });
      if (response.ok) setNotebookStatus('online');
      else setNotebookStatus('offline');
    } catch (e) {
      setNotebookStatus('offline');
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: input, engine: mode, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    try {
      let responseText = '';

      if (mode === 'cloud') {
        const res = await chatWithGemini(input, globalContext);
        responseText = res.text;
      } else if (mode === 'local') {
        responseText = await chatWithOllama(input, ollamaConfig, globalContext);
      } else if (mode === 'openwebui') {
        // Use the same ollama service but with OpenWebUI endpoint and token
        const openWebUIProxyConfig: OllamaConfig = {
          baseUrl: openWebUIConfig?.baseUrl || 'http://localhost:3000',
          model: ollamaConfig.model,
          isActive: true,
          apiKey: import.meta.env.VITE_OPEN_WEBUI_API_KEY
        };
        responseText = await chatWithOllama(input, openWebUIProxyConfig, globalContext);
      } else if (mode === 'anything' && anythingLLMConfig) {
        responseText = await chatWithAnything(input, anythingLLMConfig);
      } else if (mode === 'notebook') {
        const headers: any = { 'Content-Type': 'application/json' };
        if (openNotebookConfig.apiKey) {
          headers['Authorization'] = `Bearer ${openNotebookConfig.apiKey}`;
        }

        const response = await fetch(`${openNotebookConfig.baseUrl}/query`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            collection: openNotebookConfig.collectionName,
            query: input
          })
        });

        if (!response.ok) throw new Error('OpenNotebookLM Error');
        const data = await response.json();
        responseText = data.answer || data.text || "Respuesta recibida.";
      } else if (mode === 'local_llm' && localLlmConfig) {
        responseText = await chatWithLocalLlm(input, localLlmConfig, globalContext);
      }

      setMessages(prev => [...prev, { role: 'ai', content: responseText, engine: mode, timestamp: Date.now() }]);

    } catch (error: any) {
      console.error(error);
      const isMixedContent = window.location.protocol === 'https:' && (ollamaConfig.baseUrl.startsWith('http:') || openWebUIConfig?.baseUrl.startsWith('http:'));

      let errorMsg = isMixedContent
        ? "🔒 BLOQUEO DE SEGURIDAD NATIVO: Haz clic en el icono de AJUSTES (barra de URL) -> Configuración del sitio -> 'Contenido no seguro' -> CAMBIAR A 'PERMITIR'. Esto activará tu IA local permanentemente."
        : `Error conectando con ${mode}. Verifique que el servidor en su Mac esté encendido y Tailscale activo.`;

      setMessages(prev => [...prev, { role: 'error', content: errorMsg, engine: mode, timestamp: Date.now() }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-4">
            Centro de Inteligencia Híbrida
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse delay-75"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse delay-100"></div>
            </div>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-1">Alterna entre modelos de nube, servidor local y base de conocimiento.</p>
        </div>

        <div className="flex bg-white dark:bg-slate-900 p-2 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto no-scrollbar gap-2">
          {[
            { id: 'cloud', label: 'Cloud', icon: Cloud, color: 'bg-indigo-600' },
            { id: 'local', label: 'Ollama', icon: Server, color: 'bg-cyan-500' },
            { id: 'notebook', label: 'Knowledge', icon: Library, color: 'bg-amber-500' },
            { id: 'anything', label: 'AnythingLLM', icon: Sparkles, color: 'bg-purple-600' },
            { id: 'openwebui', label: 'OpenWebUI', icon: Layout, color: 'bg-emerald-600' },
            { id: 'local_llm', label: 'LM Studio', icon: Cpu, color: 'bg-pink-600' }
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id as any)}
              className={`px-4 md:px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${mode === m.id ? `${m.color} text-white shadow-xl` : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
                }`}
            >
              <m.icon size={16} /> {m.label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col h-[700px] overflow-hidden">
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/20 dark:bg-slate-800/20">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-30">
                  <div className="p-8 rounded-[2.5rem] bg-slate-100 dark:bg-slate-800">
                    <Terminal size={64} className="text-slate-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-black text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                      Nodo {mode} listo
                    </p>
                    <p className="text-xs max-w-xs mx-auto text-slate-400">
                      Conectado de forma segura vía Tailscale y API local.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-6 rounded-[2rem] relative group ${m.role === 'user'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : m.role === 'error'
                        ? 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30'
                        : 'bg-white text-slate-800 border border-slate-100 shadow-md dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                      }`}>
                      <p className="text-sm leading-relaxed">{m.content}</p>
                      <div className={`mt-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${m.role === 'user' ? 'text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>
                        {m.engine} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] rounded-tl-none border border-slate-100 dark:border-slate-700 flex gap-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-100"></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-200"></div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-8 bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-slate-800">
              <div className="flex gap-4 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-200 dark:border-slate-700">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder={`Habla con ${mode}...`}
                  className="flex-1 bg-transparent px-6 py-4 font-bold text-slate-800 dark:text-white outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={isProcessing || !input.trim()}
                  className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 w-14 h-14 rounded-full flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-30 shadow-xl"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <section className="bg-slate-900 dark:bg-black/40 rounded-[3.5rem] p-10 text-white shadow-2xl relative overflow-hidden backdrop-blur-md border border-white/10">
            <div className="absolute top-0 right-0 p-10 opacity-10"><Cpu size={100} /></div>
            <h4 className="text-lg font-black mb-8 flex items-center gap-3 uppercase tracking-tighter">
              <ShieldCheck className="text-emerald-400" size={24} /> Engine Status
            </h4>

            <div className="space-y-4 relative z-10">
              {[
                { label: 'Gemini Cloud', status: 'online', icon: Cloud, color: 'text-indigo-400' },
                { label: 'Ollama Node', status: localStatus, icon: Server, color: 'text-cyan-400' },
                { label: 'OpenNotebook', status: notebookStatus, icon: Library, color: 'text-amber-400' },
                { label: 'AnythingLLM', status: anythingStatus, icon: Sparkles, color: 'text-purple-400' },
                { label: 'OpenWebUI', status: openWebUIStatus, icon: Layout, color: 'text-emerald-400' }
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-4">
                    <s.icon size={18} className={s.color} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{s.label}</span>
                  </div>
                  <div className={`flex items-center gap-2 text-[10px] font-black uppercase ${s.status === 'online' ? 'text-emerald-400' : s.status === 'checking' ? 'text-amber-400' : 'text-red-400'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${s.status === 'online' ? 'bg-emerald-400 animate-pulse' : s.status === 'checking' ? 'bg-amber-400 animate-bounce' : 'bg-red-400'}`}></div>
                    {s.status}
                  </div>
                </div>
              ))}
            </div>

            <button
              className="w-full mt-8 py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-[9px] uppercase tracking-[0.3em] hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              onClick={checkAllStatuses}
            >
              <Zap size={14} /> RE-ESCANEAR NODOS
            </button>
          </section>

          {/* Quick Config Card */}
          <section className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <Settings className="text-slate-400" size={18} /> Configuración
            </h4>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelo Actual</label>
                <div className="relative">
                  <Code className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-3 text-xs font-bold text-slate-700 dark:text-white focus:ring-4 focus:ring-cyan-500/5 focus:border-cyan-500 outline-none transition-all"
                    value={ollamaConfig.model}
                    onChange={e => onUpdateConfig({ ...ollamaConfig, model: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Ollama URL (Cyan)</label>
                <div className="relative">
                  <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-3 text-xs font-bold text-slate-700 dark:text-white focus:ring-4 focus:ring-cyan-500/5 focus:border-cyan-500 outline-none transition-all"
                    value={ollamaConfig.baseUrl}
                    onChange={e => onUpdateConfig({ ...ollamaConfig, baseUrl: e.target.value })}
                  />
                </div>
              </div>

              {openWebUIConfig && onUpdateOpenWebUIConfig && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Open WebUI URL (Green)</label>
                  <div className="relative">
                    <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-3 text-xs font-bold text-slate-700 dark:text-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all"
                      value={openWebUIConfig.baseUrl}
                      onChange={e => onUpdateOpenWebUIConfig({ ...openWebUIConfig, baseUrl: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                <div className="flex items-start gap-4">
                  <Sparkles size={18} className="text-indigo-600 mt-1" />
                  <p className="text-[10px] font-bold text-indigo-900 dark:text-indigo-300 leading-relaxed">
                    Usa la URL de Cloudflare (HTTPS) en el cuadro verde para chatear sin errores de seguridad.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setMessages([])}
                className="w-full py-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> Limpiar Chat
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AIHubView;
