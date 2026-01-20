import React, { useState, useEffect, useRef } from 'react';
import { OllamaConfig, OpenNotebookConfig, AnythingLLMConfig, OpenWebUIConfig, LocalLlmConfig, ChatMessage } from '../types';
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
  Key,
  Database,

  Layout
} from 'lucide-react';
import { chatWithGemini } from '../services/geminiService';
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
  const [mode, setMode] = useState<'cloud' | 'local' | 'notebook' | 'anything' | 'openwebui' | 'local_llm'>('anything');
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

  // Re-check when configs change
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
      // In no-cors mode, we get an opaque response, but it implies connectivity
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
      } else if (mode === 'anything' && anythingLLMConfig) {
        responseText = await chatWithAnything(input, anythingLLMConfig);
      } else if (mode === 'notebook') {
        const headers: any = { 'Content-Type': 'application/json' };
        if (openNotebookConfig.apiKey) {
          headers['Authorization'] = `Bearer ${openNotebookConfig.apiKey}`;
        }

        // OpenNotebookLM Request (Generic RAG Interface)
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

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'error', content: `Error conectando con ${mode}. Verifique la configuración.`, engine: mode }]);
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
          <button
            onClick={() => setMode('cloud')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${mode === 'cloud' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-600'
              }`}
          >
            <Cloud size={16} /> Cloud
          </button>
          <button
            onClick={() => setMode('local')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${mode === 'local' ? 'bg-cyan-500 text-white shadow-xl' : 'text-slate-400 dark:text-slate-500 hover:text-cyan-500'
              }`}
          >
            <Server size={16} /> Ollama
          </button>
          <button
            onClick={() => setMode('notebook')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${mode === 'notebook' ? 'bg-amber-500 text-white shadow-xl' : 'text-slate-400 dark:text-slate-500 hover:text-amber-500'
              }`}
          >
            <Library size={16} /> Knowledge
          </button>
          <button
            onClick={() => setMode('anything')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${mode === 'anything' ? 'bg-purple-600 text-white shadow-xl' : 'text-slate-400 dark:text-slate-500 hover:text-purple-600'
              }`}
          >
            <Sparkles size={16} /> AnythingLLM
          </button>
          <button
            onClick={() => setMode('openwebui')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${mode === 'openwebui' ? 'bg-emerald-600 text-white shadow-xl' : 'text-slate-400 dark:text-slate-500 hover:text-emerald-600'
              }`}
          >
            <Layout size={16} /> OpenWebUI
          </button>
          <button
            onClick={() => setMode('local_llm')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${mode === 'local_llm' ? 'bg-pink-600 text-white shadow-xl' : 'text-slate-400 dark:text-slate-500 hover:text-pink-600'
              }`}
          >
            <Cpu size={16} /> LM Studio
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* Chat Interface */}
        {mode !== 'openwebui' && (
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col h-[700px] overflow-hidden">
              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar bg-slate-50/20 dark:bg-slate-800/20">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-40">
                    <div className={`p-8 rounded-[3rem] ${mode === 'cloud' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : mode === 'local' ? 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'}`}>
                      <Terminal size={64} />
                    </div>
                    <p className="font-black text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                      Nodo {mode === 'cloud' ? 'Google Cloud' : mode === 'local' ? 'Ollama Local' : mode === 'anything' ? 'AnythingLLM' : mode === 'local_llm' ? 'LM Studio Node' : 'OpenNotebook'} listo
                    </p>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-6 rounded-[2.5rem] relative group ${m.role === 'user'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : m.role === 'error'
                        ? 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30'
                        : 'bg-white text-slate-800 border border-slate-100 shadow-md dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                      }`}>
                      <p className="text-sm leading-relaxed font-medium">{m.content}</p>
                      <div className={`mt-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${m.role === 'user' ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>
                        {m.role === 'user' ? <History size={10} /> : (
                          m.engine === 'cloud' ? <Zap size={10} className="text-indigo-500" /> :
                            m.engine === 'local' ? <Cpu size={10} className="text-cyan-500" /> :
                              m.engine === 'anything' ? <Sparkles size={10} className="text-purple-500" /> :
                                m.engine === 'local_llm' ? <Cpu size={10} className="text-pink-500" /> :
                                  <BookOpen size={10} className="text-amber-500" />
                        )}
                        {m.engine || 'user'} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input Control */}
              <div className="p-8 bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-slate-800">
                <div className={`flex items-center gap-4 p-3 rounded-[2rem] border transition-all ${mode === 'cloud' ? 'bg-indigo-50/30 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-900/30' :
                  mode === 'local' ? 'bg-cyan-50/30 border-cyan-100 dark:bg-cyan-900/10 dark:border-cyan-900/30' :
                    mode === 'local' ? 'bg-cyan-50/30 border-cyan-100 dark:bg-cyan-900/10 dark:border-cyan-900/30' :
                      mode === 'anything' ? 'bg-purple-50/30 border-purple-100 dark:bg-purple-900/10 dark:border-purple-900/30' :
                        mode === 'local_llm' ? 'bg-pink-50/30 border-pink-100 dark:bg-pink-900/10 dark:border-pink-900/30' :
                          'bg-amber-50/30 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30'
                  }`}>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder={mode === 'cloud' ? "Pregunta a Gemini Cloud..." : mode === 'local' ? `Preguntando a Ollama (${ollamaConfig.model})...` : mode === 'anything' ? "Consultando AnythingLLM..." : `Consultando OpenNotebook (${openNotebookConfig.collectionName})...`}
                    className="flex-1 bg-transparent px-6 py-3 font-bold text-slate-800 dark:text-white outline-none placeholder-slate-400 dark:placeholder-slate-500"
                  />
                  <button
                    onClick={handleSend}
                    disabled={isProcessing || !input.trim()}
                    className={`p-5 rounded-2xl text-white shadow-xl transition-all active:scale-95 disabled:opacity-50 ${mode === 'cloud' ? 'bg-indigo-600 hover:bg-indigo-700' :
                      mode === 'local' ? 'bg-cyan-500 hover:bg-cyan-600' :
                        mode === 'anything' ? 'bg-purple-600 hover:bg-purple-700' :
                          mode === 'local_llm' ? 'bg-pink-600 hover:bg-pink-700' :
                            'bg-amber-500 hover:bg-amber-600'
                      }`}
                  >
                    {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
        }

        {mode === 'openwebui' && openWebUIConfig && (
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden h-[700px]">
            {window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? (
              <iframe
                src={openWebUIConfig.baseUrl}
                title="OpenWebUI"
                className="w-full h-full border-none"
                allow="microphone"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-12 space-y-8">
                {/* Botones de Modo - Siempre Visibles */}
                <div className="w-full max-w-4xl mb-4">
                  <div className="flex bg-white dark:bg-slate-900 p-2 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-x-auto no-scrollbar gap-2 justify-center">
                    <button
                      onClick={() => setMode('cloud')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${mode === 'cloud' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-600'}`}
                    >
                      <Cloud size={14} /> Cloud
                    </button>
                    <button
                      onClick={() => setMode('local')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${mode === 'local' ? 'bg-cyan-500 text-white shadow-xl' : 'text-slate-400 dark:text-slate-500 hover:text-cyan-500'}`}
                    >
                      <Server size={14} /> Ollama
                    </button>
                    <button
                      onClick={() => setMode('anything')}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${mode === 'anything' ? 'bg-purple-600 text-white shadow-xl' : 'text-slate-400 dark:text-slate-500 hover:text-purple-600'}`}
                    >
                      <Sparkles size={14} /> AnythingLLM
                    </button>
                  </div>
                </div>

                <div className="p-12 rounded-[3rem] bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-900/20 dark:to-cyan-900/20">
                  <Layout size={80} className="text-emerald-600 dark:text-emerald-400" />
                </div>

                <div className="text-center space-y-4 max-w-2xl">
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                    🔒 Conexión Local Requerida
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                    Open WebUI y Ollama están corriendo en tu máquina local (<code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-mono text-sm">localhost:3000</code> y <code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-mono text-sm">localhost:11434</code>).
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Por razones de seguridad, no puedes acceder a servicios locales desde una aplicación web pública.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-8 space-y-6 max-w-2xl w-full border border-slate-200 dark:border-slate-700">
                  <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-3">
                    <Sparkles className="text-emerald-600" size={20} />
                    Opciones para Chatear con tu IA:
                  </h4>

                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
                        1
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white mb-1">Accede desde tu red local</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Abre <code className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-xs">http://localhost:3000</code> en tu navegador
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center font-black text-sm">
                        2
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white mb-1">Usa el modo "Ollama" en este panel</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Cambia a modo "Ollama" arriba para chatear directamente (sin iframe)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-black text-sm">
                        3
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white mb-1">Expón Ollama públicamente (Avanzado)</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Usa <a href="https://ngrok.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">ngrok</a> o <a href="https://www.cloudflare.com/products/tunnel/" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">Cloudflare Tunnel</a> para exponer tu Ollama local a internet
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setMode('local')}
                  className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:shadow-xl transition-all flex items-center gap-3"
                >
                  <Server size={20} />
                  Cambiar a Modo Ollama
                </button>
              </div>
            )}
          </div>
        )}

        {/* Configuration Sidebar */}
        <div className="lg:col-span-4 space-y-8">

          {/* Engine Status Card */}
          <section className="bg-slate-900 dark:bg-black/40 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden backdrop-blur-md border border-white/10">
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
                <div className={`flex items-center gap-2 text-[10px] font-black uppercase ${localStatus === 'online' ? 'text-emerald-400' :
                  localStatus === 'checking' ? 'text-amber-400' : 'text-red-400'
                  }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${localStatus === 'online' ? 'bg-emerald-400 animate-pulse' :
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
                <div className={`flex items-center gap-2 text-[10px] font-black uppercase ${notebookStatus === 'online' ? 'text-emerald-400' :
                  notebookStatus === 'checking' ? 'text-amber-400' : 'text-red-400'
                  }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${notebookStatus === 'online' ? 'bg-emerald-400 animate-pulse' :
                    notebookStatus === 'checking' ? 'bg-amber-400 animate-bounce' : 'bg-red-400'
                    }`}></div>
                  {notebookStatus}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="flex items-center gap-4">
                  <Sparkles size={18} className="text-purple-400" />
                  <span className="text-xs font-black uppercase">AnythingLLM</span>
                </div>
                <div className={`flex items-center gap-2 text-[10px] font-black uppercase ${anythingStatus === 'online' ? 'text-emerald-400' :
                  anythingStatus === 'checking' ? 'text-amber-400' : 'text-red-400'
                  }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${anythingStatus === 'online' ? 'bg-emerald-400 animate-pulse' :
                    anythingStatus === 'checking' ? 'bg-amber-400 animate-bounce' : 'bg-red-400'
                    }`}></div>
                  {anythingStatus}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="flex items-center gap-4">
                  <Layout size={18} className="text-emerald-400" />
                  <span className="text-xs font-black uppercase">OpenWebUI</span>
                </div>
                <div className={`flex items-center gap-2 text-[10px] font-black uppercase ${openWebUIStatus === 'online' ? 'text-emerald-400' :
                  openWebUIStatus === 'checking' ? 'text-amber-400' : 'text-red-400'
                  }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${openWebUIStatus === 'online' ? 'bg-emerald-400 animate-pulse' :
                    openWebUIStatus === 'checking' ? 'bg-amber-400 animate-bounce' : 'bg-red-400'
                    }`}></div>
                  {openWebUIStatus}
                </div>
              </div>
            </div>

            <button
              className="w-full mt-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              onClick={() => {
                checkOllamaStatus(ollamaConfig);
                checkAnythingStatus(anythingLLMConfig);
                checkNotebookStatus();
                checkOllamaStatus(ollamaConfig);
                checkAnythingStatus(anythingLLMConfig);
                checkNotebookStatus();
                checkStatusOpenWebUI();
                checkStatusLocalLlm();
              }}
            >
              <Zap size={16} /> RE-ESCANEAR NODOS
            </button>
          </section>

          {/* Ollama Config Form */}
          <section className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Settings className="text-cyan-600" size={18} /> Ollama Config
            </h4>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Host URL</label>
                <div className="relative">
                  <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-3 text-xs font-bold text-slate-700 dark:text-white focus:ring-4 focus:ring-cyan-500/5 focus:border-cyan-500"
                    placeholder="https://nucbox-g10.tail3a7cac.ts.net"
                    value={ollamaConfig.baseUrl}
                    onChange={e => onUpdateConfig({ ...ollamaConfig, baseUrl: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Model Name</label>
                <div className="relative">
                  <Code className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-3 text-xs font-bold text-slate-700 dark:text-white focus:ring-4 focus:ring-cyan-500/5 focus:border-cyan-500"
                    placeholder="llama3, mistral..."
                    value={ollamaConfig.model}
                    onChange={e => onUpdateConfig({ ...ollamaConfig, model: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">API Key</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input
                    type="password"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-3 text-xs font-bold text-slate-700 dark:text-white focus:ring-4 focus:ring-cyan-500/5 focus:border-cyan-500"
                    placeholder="Opcional"
                    value={ollamaConfig.apiKey || ''}
                    onChange={e => onUpdateConfig({ ...ollamaConfig, apiKey: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* OpenNotebookLM Config Form */}
          <section className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Settings className="text-amber-600" size={18} /> OpenNotebook Config
            </h4>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">RAG Endpoint</label>
                <div className="relative">
                  <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-3 text-xs font-bold text-slate-700 dark:text-white focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500"
                    value={openNotebookConfig.baseUrl}
                    onChange={e => onUpdateNotebookConfig({ ...openNotebookConfig, baseUrl: e.target.value })}
                    placeholder="http://localhost:8000"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Collection / Index</label>
                <div className="relative">
                  <Library className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-3 text-xs font-bold text-slate-700 dark:text-white focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500"
                    placeholder="my-docs"
                    value={openNotebookConfig.collectionName}
                    onChange={e => onUpdateNotebookConfig({ ...openNotebookConfig, collectionName: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* AnythingLLM Config Form */}
          {anythingLLMConfig && onUpdateAnythingConfig && (
            <section className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Settings className="text-purple-600" size={18} /> AnythingLLM Config
              </h4>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Base URL (Local o Remoto)</label>
                  <div className="relative">
                    <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-3 text-xs font-bold text-slate-700 dark:text-white focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500"
                      value={anythingLLMConfig.baseUrl}
                      onChange={e => onUpdateAnythingConfig({ ...anythingLLMConfig, baseUrl: e.target.value })}
                      placeholder="https://nucbox-g10.tail3a7cac.ts.net:10000/api/v1"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">API Key</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-3 text-xs font-bold text-slate-700 dark:text-white focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500"
                      value={anythingLLMConfig.apiKey}
                      onChange={e => onUpdateAnythingConfig({ ...anythingLLMConfig, apiKey: e.target.value })}
                      type="password"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Workspace Slug</label>
                  <div className="relative">
                    <Code className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-3 text-xs font-bold text-slate-700 dark:text-white focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500"
                      value={anythingLLMConfig.workspaceSlug || ''}
                      onChange={e => onUpdateAnythingConfig({ ...anythingLLMConfig, workspaceSlug: e.target.value })}
                      placeholder="default"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* OpenWebUI Config Form */}
          {openWebUIConfig && onUpdateOpenWebUIConfig && (
            <section className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Settings className="text-emerald-600" size={18} /> OpenWebUI Config
              </h4>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Base URL</label>
                  <div className="relative">
                    <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-3 text-xs font-bold text-slate-700 dark:text-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500"
                      value={openWebUIConfig.baseUrl}
                      onChange={e => onUpdateOpenWebUIConfig({ ...openWebUIConfig, baseUrl: e.target.value })}
                      placeholder="http://localhost:3000"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Local LLM Config Form */}
          {localLlmConfig && onUpdateLocalLlmConfig && (
            <section className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Settings className="text-pink-600" size={18} /> LM Studio Config
              </h4>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Base URL</label>
                  <div className="relative">
                    <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-3 text-xs font-bold text-slate-700 dark:text-white focus:ring-4 focus:ring-pink-500/5 focus:border-pink-500"
                      value={localLlmConfig.baseUrl}
                      onChange={e => onUpdateLocalLlmConfig({ ...localLlmConfig, baseUrl: e.target.value })}
                      placeholder="http://localhost:1234/v1"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Model Name</label>
                  <div className="relative">
                    <Code className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-3 text-xs font-bold text-slate-700 dark:text-white focus:ring-4 focus:ring-pink-500/5 focus:border-pink-500"
                      value={localLlmConfig.model}
                      onChange={e => onUpdateLocalLlmConfig({ ...localLlmConfig, model: e.target.value })}
                      placeholder="local-model"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

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
