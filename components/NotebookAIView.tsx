import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  BookOpen, Plus, Trash2, Send, Bot, User, Loader2, Sparkles,
  Upload, X, FileText, Globe, CheckCircle2, AlertCircle,
  Settings, Zap, RefreshCw, ChevronRight, MessageSquare,
  Brain, Star, Copy, ThumbsUp, Volume2, Moon
} from 'lucide-react';
import {
  chatWithKimi, notebookChatWithKimi, checkKimiStatus, FILEHUB_SYSTEM_PROMPT,
  KimiConfig, KimiMessage, DEFAULT_KIMI_CONFIG
} from '../services/kimiService';

// ─── TYPES ───────────────────────────────────────────────────────
interface Source {
  id: string;
  name: string;
  type: 'text' | 'url' | 'pdf' | 'note';
  content: string;
  addedAt: string;
}

interface Notebook {
  id: string;
  title: string;
  sources: Source[];
  chatHistory: KimiMessage[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'filehub_kimi_notebooks';
const CONFIG_KEY = 'filehub_kimi_config';

// ─── MARKDOWN RENDERER (simple) ──────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3 class="font-black text-sm mt-3 mb-1 text-slate-800 dark:text-white">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="font-black text-base mt-4 mb-2 text-slate-800 dark:text-white">$2</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="font-black text-lg mt-4 mb-2 text-slate-800 dark:text-white">$1</h1>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-sm">$1</li>')
    .replace(/`(.+?)`/g, '<code class="bg-slate-100 dark:bg-slate-700 px-1 rounded text-xs font-mono">$1</code>')
    .replace(/\n/g, '<br/>');
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────
const NotebookAIView: React.FC = () => {
  const [notebooks, setNotebooks] = useState<Notebook[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [kimiConfig, setKimiConfig] = useState<Partial<KimiConfig>>(() => {
    try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}'); } catch { return {}; }
  });
  const [activeNbId, setActiveNbId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'notebook' | 'settings'>('list');
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [kimiStatus, setKimiStatus] = useState<'unknown' | 'ok' | 'error'>('unknown');
  const [statusMsg, setStatusMsg] = useState('');
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSource, setNewSource] = useState({ type: 'text' as Source['type'], name: '', content: '' });
  const [showNewNb, setShowNewNb] = useState(false);
  const [newNbTitle, setNewNbTitle] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'sources' | 'notes'>('chat');
  const [showSettings, setShowSettings] = useState(false);
  const [configForm, setConfigForm] = useState({
    baseUrl: kimiConfig.baseUrl || DEFAULT_KIMI_CONFIG.baseUrl,
    apiKey: kimiConfig.apiKey || DEFAULT_KIMI_CONFIG.apiKey,
    model: kimiConfig.model || DEFAULT_KIMI_CONFIG.model,
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeNb = notebooks.find(n => n.id === activeNbId) || null;

  // Persist
  const saveNbs = (updated: Notebook[]) => {
    setNotebooks(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const updateNb = (id: string, patch: Partial<Notebook>) => {
    const updated = notebooks.map(n => n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n);
    saveNbs(updated);
  };

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeNb?.chatHistory, streamText]);

  // Check Kimi status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setKimiStatus('unknown');
    const cfg = { ...DEFAULT_KIMI_CONFIG, ...kimiConfig };
    if (!cfg.apiKey && !cfg.baseUrl) {
      setKimiStatus('error');
      setStatusMsg('Configura la API key en ⚙️ Configuración');
      return;
    }
    const result = await checkKimiStatus(cfg);
    setKimiStatus(result.ok ? 'ok' : 'error');
    setStatusMsg(result.ok
      ? `Kimi conectado · ${result.models?.length || '?'} modelos disponibles`
      : `Error: ${result.error}`);
  };

  const saveConfig = () => {
    setKimiConfig(configForm);
    localStorage.setItem(CONFIG_KEY, JSON.stringify(configForm));
    setShowSettings(false);
    checkStatus();
  };

  // ── CREATE NOTEBOOK ──────────────────────────────────────────
  const createNotebook = () => {
    if (!newNbTitle.trim()) return;
    const nb: Notebook = {
      id: `nb_${Date.now()}`,
      title: newNbTitle.trim(),
      sources: [],
      chatHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveNbs([nb, ...notebooks]);
    setActiveNbId(nb.id);
    setView('notebook');
    setNewNbTitle('');
    setShowNewNb(false);
  };

  // ── ADD SOURCE ───────────────────────────────────────────────
  const addSource = async () => {
    if (!activeNb || !newSource.name.trim() || !newSource.content.trim()) return;
    let content = newSource.content;

    // Fetch URL content if type=url
    if (newSource.type === 'url') {
      try {
        const r = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(newSource.content)}`);
        if (r.ok) {
          const html = await r.text();
          // Strip HTML tags
          content = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 30000);
        }
      } catch {}
    }

    const source: Source = {
      id: `src_${Date.now()}`,
      name: newSource.name.trim(),
      type: newSource.type,
      content,
      addedAt: new Date().toISOString(),
    };
    const updated = [...(activeNb.sources || []), source];
    updateNb(activeNb.id, { sources: updated });
    setNewSource({ type: 'text', name: '', content: '' });
    setShowAddSource(false);
    setActiveTab('sources');
  };

  // Upload PDF/text file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setNewSource({ type: 'pdf', name: file.name, content: text.substring(0, 50000) });
      setShowAddSource(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const removeSource = (srcId: string) => {
    if (!activeNb) return;
    updateNb(activeNb.id, { sources: activeNb.sources.filter(s => s.id !== srcId) });
  };

  // ── CHAT ─────────────────────────────────────────────────────
  const sendMessage = useCallback(async (msg?: string) => {
    if (!activeNb) return;
    const text = (msg || chatInput).trim();
    if (!text || isThinking) return;
    setChatInput('');
    setIsThinking(true);
    setStreamText('');

    const userMsg: KimiMessage = { role: 'user', content: text };
    const updatedHistory: KimiMessage[] = [...(activeNb.chatHistory || []), userMsg];
    updateNb(activeNb.id, { chatHistory: updatedHistory });

    try {
      const cfg = { ...DEFAULT_KIMI_CONFIG, ...kimiConfig };
      let response: string;

      if (activeNb.sources.length > 0) {
        // RAG mode with sources
        response = await notebookChatWithKimi(text, activeNb.sources, activeNb.chatHistory || [], cfg);
      } else {
        // General chat mode
        const messages: KimiMessage[] = [...(activeNb.chatHistory || []), userMsg];
        response = await chatWithKimi(messages, cfg);
      }

      const assistantMsg: KimiMessage = { role: 'assistant', content: response };
      updateNb(activeNb.id, { chatHistory: [...updatedHistory, assistantMsg] });
    } catch (err: any) {
      const errMsg: KimiMessage = { role: 'assistant', content: `❌ Error: ${err.message}` };
      updateNb(activeNb.id, { chatHistory: [...updatedHistory, errMsg] });
    } finally {
      setIsThinking(false);
      setStreamText('');
    }
  }, [activeNb, chatInput, isThinking, kimiConfig, notebooks]);

  const clearChat = () => {
    if (!activeNb) return;
    updateNb(activeNb.id, { chatHistory: [] });
  };

  const copyMsg = (content: string | any) => {
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    navigator.clipboard.writeText(text).catch(() => {});
  };

  // ── QUICK PROMPTS ─────────────────────────────────────────────
  const QUICK_PROMPTS = [
    'Resume los puntos más importantes',
    'Extrae las fechas y plazos clave',
    'Dame los datos más relevantes',
    '¿Qué acciones debería tomar?',
    'Explícame esto en términos simples',
    'Compara los diferentes puntos',
  ];

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════

  // ── STATUS BAR ───────────────────────────────────────────────
  const StatusBar = () => (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${
      kimiStatus === 'ok' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
      kimiStatus === 'error' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' :
      'bg-slate-50 dark:bg-slate-800 text-slate-500'
    }`}>
      <div className={`w-2 h-2 rounded-full ${kimiStatus === 'ok' ? 'bg-emerald-500 animate-pulse' : kimiStatus === 'error' ? 'bg-red-500' : 'bg-slate-400'}`} />
      {kimiStatus === 'unknown' ? 'Verificando conexión...' : statusMsg}
    </div>
  );

  // ── SETTINGS PANEL ───────────────────────────────────────────
  if (showSettings) return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
          <ChevronRight size={18} className="rotate-180 text-slate-600" />
        </button>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">Configuración Kimi IA</h2>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Brain size={18} className="text-white" />
          </div>
          <div>
            <p className="font-black text-slate-800 dark:text-white">OpenClaw · Kimi 2.5</p>
            <p className="text-xs text-slate-500">moonshot-ai / kimi-k2 via OpenAI-compatible API</p>
          </div>
        </div>

        <div>
          <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">Base URL</label>
          <input value={configForm.baseUrl} onChange={e => setConfigForm(f => ({ ...f, baseUrl: e.target.value }))}
            placeholder="https://api.moonshot.cn/v1 ó URL de Open WebUI"
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400" />
          <p className="text-[10px] text-slate-400 mt-1">Open WebUI: {import.meta.env.VITE_OPEN_WEBUI_URL || 'no configurado'}</p>
        </div>

        <div>
          <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">API Key</label>
          <input type="password" value={configForm.apiKey} onChange={e => setConfigForm(f => ({ ...f, apiKey: e.target.value }))}
            placeholder="sk-... (Moonshot API key o Open WebUI key)"
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400" />
        </div>

        <div>
          <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">Modelo</label>
          <select value={configForm.model} onChange={e => setConfigForm(f => ({ ...f, model: e.target.value }))}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-violet-500/20">
            <option value="kimi-k2-0711-preview">kimi-k2-0711-preview (Kimi 2.5 — Recomendado)</option>
            <option value="moonshot-v1-128k">moonshot-v1-128k (128k contexto)</option>
            <option value="moonshot-v1-32k">moonshot-v1-32k (32k contexto)</option>
            <option value="moonshot-v1-8k">moonshot-v1-8k (8k contexto, más rápido)</option>
            <option value="gpt-4o">gpt-4o (si usas Open WebUI con OpenAI)</option>
            <option value="gpt-4o-mini">gpt-4o-mini</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={saveConfig}
            className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-black rounded-xl shadow-lg hover:opacity-90 transition-all">
            ✓ Guardar configuración
          </button>
          <button onClick={checkStatus}
            className="px-4 bg-slate-100 dark:bg-slate-700 font-bold text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 transition-all">
            Probar
          </button>
        </div>

        <StatusBar />

        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 text-xs text-slate-500 space-y-1">
          <p className="font-bold text-slate-600 dark:text-slate-400">💡 Cómo obtener la API key de Kimi:</p>
          <p>1. Ve a <a href="https://platform.moonshot.cn" target="_blank" rel="noopener noreferrer" className="text-violet-500 underline">platform.moonshot.cn</a></p>
          <p>2. Crea una cuenta → API Keys → Crear nueva key</p>
          <p>3. Pégala aquí. El modelo <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">kimi-k2-0711-preview</code> es gratuito con límite generoso.</p>
          <p className="mt-2 font-bold text-slate-600 dark:text-slate-400">🔌 O usa tu Open WebUI:</p>
          <p>Pon la URL de Open WebUI como Base URL y la API key de Open WebUI.</p>
        </div>
      </div>
    </div>
  );

  // ── LIST VIEW ────────────────────────────────────────────────
  if (view === 'list') return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/25">
            <BookOpen size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Notebook IA
            </h2>
            <div className="flex items-center gap-2">
              <StatusBar />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSettings(true)}
            className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-violet-500 hover:border-violet-400/50 transition-all">
            <Settings size={16} />
          </button>
          <button onClick={() => setShowNewNb(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-violet-500/25 hover:scale-105 transition-all">
            <Plus size={18} /> Nuevo cuaderno
          </button>
        </div>
      </div>

      {/* New notebook form */}
      {showNewNb && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-400/40 shadow-xl p-5 flex gap-3">
          <input value={newNbTitle} onChange={e => setNewNbTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createNotebook()}
            autoFocus placeholder="Título del cuaderno..."
            className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400" />
          <button onClick={createNotebook} className="px-5 bg-violet-500 hover:bg-violet-600 text-white font-bold rounded-xl transition-all">Crear</button>
          <button onClick={() => setShowNewNb(false)} className="p-3 text-slate-400 hover:text-slate-600 rounded-xl"><X size={16} /></button>
        </div>
      )}

      {/* Notebooks grid */}
      {notebooks.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-500/10 dark:to-indigo-500/10 rounded-3xl flex items-center justify-center mb-4">
            <BookOpen size={36} className="text-violet-400" />
          </div>
          <p className="font-black text-xl text-slate-700 dark:text-slate-200 mb-2">Tu primer cuaderno IA</p>
          <p className="text-sm text-slate-400 max-w-xs">Crea un cuaderno, añade fuentes (texto, PDFs, URLs) y chatea con Kimi sobre ellas.</p>
          <button onClick={() => setShowNewNb(true)}
            className="mt-6 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-bold rounded-2xl shadow-lg hover:scale-105 transition-all">
            <Plus size={16} /> Crear primer cuaderno
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notebooks.map(nb => (
            <button key={nb.id} onClick={() => { setActiveNbId(nb.id); setView('notebook'); setActiveTab('chat'); }}
              className="group text-left bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:border-violet-400/50 hover:shadow-lg hover:shadow-violet-500/5 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-500/20 dark:to-indigo-500/20 rounded-xl flex items-center justify-center">
                  <BookOpen size={18} className="text-violet-500" />
                </div>
                <ChevronRight size={16} className="text-slate-400 group-hover:text-violet-500 transition-colors mt-1" />
              </div>
              <h3 className="font-black text-slate-800 dark:text-white mb-1">{nb.title}</h3>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>{nb.sources.length} fuente{nb.sources.length !== 1 ? 's' : ''}</span>
                <span>·</span>
                <span>{nb.chatHistory.length} msg</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {new Date(nb.updatedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // ── NOTEBOOK VIEW ────────────────────────────────────────────
  if (!activeNb) { setView('list'); return null; }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-h-[900px]">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <ChevronRight size={18} className="rotate-180 text-slate-600" />
          </button>
          <div>
            <h3 className="font-black text-slate-800 dark:text-white">{activeNb.title}</h3>
            <p className="text-xs text-slate-400">{activeNb.sources.length} fuentes · modelo: <span className="font-mono text-violet-500">{(kimiConfig.model || DEFAULT_KIMI_CONFIG.model).split('-')[0]}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBar />
          <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-violet-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <Settings size={15} />
          </button>
          <button onClick={() => { if (confirm('¿Eliminar este cuaderno?')) { saveNbs(notebooks.filter(n => n.id !== activeNb.id)); setView('list'); } }}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-fit mb-4 shrink-0">
        {[
          { id: 'chat', label: `💬 Chat`, count: activeNb.chatHistory.length },
          { id: 'sources', label: `📄 Fuentes`, count: activeNb.sources.length },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === t.id ? 'bg-white dark:bg-slate-700 text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
            {t.count > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-lg font-black ${activeTab === t.id ? 'bg-violet-100 text-violet-600' : 'bg-slate-200 dark:bg-slate-600 text-slate-500'}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* SOURCES TAB */}
      {activeTab === 'sources' && (
        <div className="flex-1 overflow-y-auto space-y-3">
          <button onClick={() => setShowAddSource(!showAddSource)}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-violet-300 dark:border-violet-500/40 rounded-2xl text-sm font-bold text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/5 transition-all">
            <Plus size={16} /> Añadir fuente
          </button>

          {showAddSource && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-violet-400/40 shadow-lg p-5 space-y-3">
              <div className="flex gap-2">
                {(['text', 'url', 'pdf'] as const).map(t => (
                  <button key={t} onClick={() => setNewSource(s => ({ ...s, type: t }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${newSource.type === t ? 'bg-violet-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                    {t === 'text' ? '📝 Texto' : t === 'url' ? '🌐 URL' : '📄 Archivo'}
                  </button>
                ))}
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 transition-all">
                  ⬆️ Subir
                </button>
                <input ref={fileInputRef} type="file" accept=".txt,.md,.pdf,.csv" onChange={handleFileUpload} className="hidden" />
              </div>
              <input value={newSource.name} onChange={e => setNewSource(s => ({ ...s, name: e.target.value }))}
                placeholder="Nombre de la fuente..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-violet-500/20" />
              <textarea value={newSource.content} onChange={e => setNewSource(s => ({ ...s, content: e.target.value }))}
                placeholder={newSource.type === 'url' ? 'https://...' : 'Pega el contenido aquí...'}
                rows={4} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm resize-none focus:ring-2 focus:ring-violet-500/20" />
              <div className="flex gap-2">
                <button onClick={addSource} className="flex-1 py-2.5 bg-violet-500 hover:bg-violet-600 text-white font-black rounded-xl transition-all">✓ Añadir</button>
                <button onClick={() => setShowAddSource(false)} className="px-4 bg-slate-100 dark:bg-slate-700 text-slate-500 font-bold rounded-xl">Cancelar</button>
              </div>
            </div>
          )}

          {activeNb.sources.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center text-slate-400">
              <FileText size={32} className="mb-3 text-slate-300" />
              <p className="font-bold text-sm">Sin fuentes aún</p>
              <p className="text-xs mt-1">Añade texto, PDFs o URLs</p>
            </div>
          ) : (
            activeNb.sources.map(src => (
              <div key={src.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-start gap-3">
                <div className="w-9 h-9 bg-violet-50 dark:bg-violet-500/10 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-lg">{src.type === 'url' ? '🌐' : src.type === 'pdf' ? '📄' : '📝'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{src.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{src.content.length.toLocaleString()} caracteres · {new Date(src.addedAt).toLocaleDateString('es-ES')}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{src.content.substring(0, 100)}</p>
                </div>
                <button onClick={() => removeSource(src.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* CHAT TAB */}
      {activeTab === 'chat' && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {activeNb.chatHistory.length === 0 && (
              <div className="flex flex-col items-center pt-8 pb-4 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-500/10 dark:to-indigo-500/10 rounded-3xl flex items-center justify-center mb-3">
                  <Brain size={28} className="text-violet-500" />
                </div>
                <p className="font-black text-slate-700 dark:text-slate-200 mb-1">Kimi 2.5 listo</p>
                <p className="text-xs text-slate-400 max-w-xs">
                  {activeNb.sources.length > 0
                    ? `Tengo ${activeNb.sources.length} fuente(s) cargadas. Pregúntame sobre ellas.`
                    : 'Sin fuentes — puedo ayudarte con cualquier pregunta o añade fuentes para análisis de documentos.'}
                </p>
                {/* Quick prompts */}
                <div className="flex flex-wrap gap-2 mt-4 justify-center max-w-sm">
                  {QUICK_PROMPTS.slice(0, activeNb.sources.length > 0 ? 6 : 3).map(p => (
                    <button key={p} onClick={() => sendMessage(p)}
                      className="text-xs font-bold px-3 py-1.5 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl hover:bg-violet-100 transition-all border border-violet-200 dark:border-violet-500/20">
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeNb.chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shrink-0 mt-1 shadow-sm">
                    <Bot size={14} className="text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-violet-500 text-white rounded-br-sm'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-bl-sm'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div
                      className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed prose-sm"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)) }}
                    />
                  ) : (
                    <p className="text-sm">{typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}</p>
                  )}
                  {msg.role === 'assistant' && (
                    <button onClick={() => copyMsg(msg.content)} className="mt-1 p-1 text-slate-400 hover:text-slate-600 transition-colors">
                      <Copy size={11} />
                    </button>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 bg-violet-100 dark:bg-violet-500/20 rounded-xl flex items-center justify-center shrink-0 mt-1">
                    <User size={14} className="text-violet-600" />
                  </div>
                )}
              </div>
            ))}

            {isThinking && (
              <div className="flex justify-start gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                  <Bot size={14} className="text-white" />
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-violet-500" />
                  <span className="text-xs text-slate-500">Kimi está pensando...</span>
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="mt-3 shrink-0">
            {activeNb.chatHistory.length > 0 && (
              <div className="flex justify-end mb-2">
                <button onClick={clearChat} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                  <Trash2 size={11} /> Limpiar chat
                </button>
              </div>
            )}
            <div className="flex gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2 shadow-sm focus-within:border-violet-400/60 transition-all">
              <textarea
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={activeNb.sources.length > 0 ? `Pregunta sobre ${activeNb.sources.map(s => s.name).join(', ')}...` : 'Escribe un mensaje... (Enter para enviar)'}
                rows={2}
                className="flex-1 bg-transparent border-0 outline-none resize-none text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 px-2 py-1"
              />
              <button onClick={() => sendMessage()} disabled={isThinking || !chatInput.trim()}
                className="self-end p-2.5 bg-gradient-to-br from-violet-500 to-indigo-600 text-white rounded-xl hover:opacity-90 disabled:opacity-40 transition-all shadow-sm shadow-violet-500/25">
                {isThinking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">
              Kimi 2.5 · <span className="font-mono">{kimiConfig.model || DEFAULT_KIMI_CONFIG.model}</span> · Enter para enviar · Shift+Enter para salto de línea
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default NotebookAIView;
