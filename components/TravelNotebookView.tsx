import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  BookOpen, Plus, Trash2, Send, Bot, User, Loader2,
  Upload, X, FileText, Check, Plane,
  ChevronRight, MessageSquare, Copy, Settings,
  Map, Star, RefreshCw
} from 'lucide-react';
import { callAI } from '../services/aiProxy';

// ─── TYPES ───────────────────────────────────────────────────────
interface Source {
  id: string; name: string; type: string;
  content: string; icon: string; addedAt: string; wordCount: number;
}
interface Message {
  id: string; role: 'user' | 'assistant';
  content: string; timestamp: number;
}
interface TravelNotebook {
  id: string; destination: string; emoji: string;
  dates: string; sources: Source[]; messages: Message[];
  notes: string; createdAt: string; color: string;
}

const COLORS = [
  'from-sky-500 to-blue-600', 'from-emerald-500 to-teal-600',
  'from-violet-500 to-purple-600', 'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
];
const STORAGE_KEY = 'filehub_travel_notebooks';

const QUICK_PROMPTS = [
  { icon: '🗺️', text: 'Resume el itinerario día a día' },
  { icon: '💰', text: '¿Cuál es el presupuesto total?' },
  { icon: '🍽️', text: '¿Qué restaurantes están recomendados?' },
  { icon: '🚇', text: '¿Cómo me muevo por la ciudad?' },
  { icon: '⭐', text: '¿Qué no me puedo perder?' },
  { icon: '💡', text: 'Dame consejos locales' },
  { icon: '🏨', text: '¿Dónde me alojo cada noche?' },
  { icon: '🌤️', text: '¿Qué tiempo hará en abril?' },
];

// ─── COMPONENT ───────────────────────────────────────────────────
const TravelNotebookView: React.FC = () => {
  const [notebooks, setNotebooks] = useState<TravelNotebook[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (saved.length > 0) return saved;
      // Auto-import NY itinerary
      const nyPlans = JSON.parse(localStorage.getItem('filehub_travel_plans') || '[]');
      if (nyPlans.length > 0 && nyPlans[0].itinerary) {
        const plan = nyPlans[0];
        const nb: TravelNotebook = {
          id: `nb_ny_${Date.now()}`,
          destination: plan.destination,
          emoji: '🗽',
          dates: `${plan.startDate} → ${plan.endDate}`,
          color: COLORS[0],
          createdAt: new Date().toISOString(),
          notes: '',
          messages: [{
            id: 'welcome', role: 'assistant',
            content: `¡Hola! Soy tu guía de **${plan.destination}**. He cargado tu itinerario completo de ${plan.itinerary.totalDays} días con todas las actividades, restaurantes y presupuesto.\n\n¿Qué quieres saber?`,
            timestamp: Date.now(),
          }],
          sources: [{
            id: 'src_ny', name: `Itinerario ${plan.destination}`,
            type: 'itinerary', icon: '✈️',
            content: JSON.stringify(plan.itinerary),
            addedAt: new Date().toISOString(),
            wordCount: JSON.stringify(plan.itinerary).split(' ').length,
          }],
        };
        const result = [nb];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
        return result;
      }
      return [];
    } catch { return []; }
  });

  const [activeId, setActiveId] = useState<string | null>(() => notebooks[0]?.id || null);
  const [view, setView] = useState<'list' | 'notebook'>(() => notebooks.length === 1 ? 'notebook' : 'list');
  const [activeTab, setActiveTab] = useState<'chat' | 'sources' | 'notes'>('chat');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [showNewNb, setShowNewNb] = useState(false);
  const [showProxyConfig, setShowProxyConfig] = useState(false);
  const [proxyUrl, setProxyUrl] = useState(() => {
    try { return JSON.parse(localStorage.getItem('filehub_ai_proxy') || '{}').url || ''; } catch { return ''; }
  });
  const [newNb, setNewNb] = useState({ destination: '', emoji: '✈️', dates: '' });
  const [newSrc, setNewSrc] = useState({ name: '', type: 'text', content: '' });
  const [copied, setCopied] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeNb = notebooks.find(n => n.id === activeId) || null;

  const save = (updated: TravelNotebook[]) => {
    setNotebooks(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };
  const updateNb = (id: string, patch: Partial<TravelNotebook>) =>
    save(notebooks.map(n => n.id === id ? { ...n, ...patch } : n));

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeNb?.messages]);

  const saveProxy = (url: string) => {
    setProxyUrl(url);
    localStorage.setItem('filehub_ai_proxy', JSON.stringify({ url }));
  };

  const createNotebook = () => {
    if (!newNb.destination.trim()) return;
    const nb: TravelNotebook = {
      id: `nb_${Date.now()}`, destination: newNb.destination,
      emoji: newNb.emoji, dates: newNb.dates,
      color: COLORS[notebooks.length % COLORS.length],
      notes: '', messages: [], sources: [],
      createdAt: new Date().toISOString(),
    };
    save([nb, ...notebooks]);
    setActiveId(nb.id); setView('notebook');
    setNewNb({ destination: '', emoji: '✈️', dates: '' }); setShowNewNb(false);
  };

  const importFromPlanner = () => {
    try {
      const plans = JSON.parse(localStorage.getItem('filehub_travel_plans') || '[]');
      if (!plans.length) return alert('No hay viajes en Viajes IA.');
      let imported = false;
      const newNbs = [...notebooks];
      plans.forEach((plan: any) => {
        if (!plan.itinerary) return;
        if (newNbs.some(n => n.destination === plan.destination)) return;
        newNbs.unshift({
          id: `nb_import_${plan.id}`, destination: plan.destination,
          emoji: '✈️', dates: `${plan.startDate} → ${plan.endDate}`,
          color: COLORS[newNbs.length % COLORS.length],
          createdAt: new Date().toISOString(), notes: '', messages: [],
          sources: [{ id: `src_${plan.id}`, name: `Itinerario ${plan.destination}`,
            type: 'itinerary', icon: '🗺️',
            content: JSON.stringify(plan.itinerary),
            addedAt: new Date().toISOString(),
            wordCount: JSON.stringify(plan.itinerary).split(' ').length }],
        });
        imported = true;
      });
      if (imported) { save(newNbs); setActiveId(newNbs[0].id); setView('notebook'); }
    } catch {}
  };

  const addSource = async () => {
    if (!activeNb || !newSrc.name.trim() || !newSrc.content.trim()) return;
    let content = newSrc.content;
    if (newSrc.type === 'url') {
      try {
        const r = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(newSrc.content)}`);
        if (r.ok) content = (await r.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 30000);
      } catch {}
    }
    const src: Source = {
      id: `src_${Date.now()}`, name: newSrc.name, type: newSrc.type,
      icon: newSrc.type === 'url' ? '🌐' : '📝', content,
      addedAt: new Date().toISOString(), wordCount: content.split(' ').length,
    };
    updateNb(activeNb.id, { sources: [...activeNb.sources, src] });
    setNewSrc({ name: '', type: 'text', content: '' }); setShowAddSource(false);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setNewSrc({ name: file.name, type: 'text', content: (reader.result as string).slice(0, 50000) }); setShowAddSource(true); };
    reader.readAsText(file); e.target.value = '';
  };

  const sendMessage = useCallback(async (text?: string) => {
    if (!activeNb || loading) return;
    const msg = (text || input).trim();
    if (!msg) return;
    setInput(''); setLoading(true);

    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', content: msg, timestamp: Date.now() };
    const history = [...activeNb.messages, userMsg];
    updateNb(activeNb.id, { messages: history });

    const sourcesText = activeNb.sources.length > 0
      ? activeNb.sources.map(s => `### ${s.name}\n${s.content.slice(0, 25000)}`).join('\n\n---\n\n')
      : 'Sin fuentes — responde con conocimiento general sobre el destino.';

    const system = `Eres el asistente de viajes de FileHub para Carlos (español).
Destino: ${activeNb.destination} | Fechas: ${activeNb.dates || 'sin especificar'}

FUENTES DEL VIAJE:
${sourcesText}

Responde siempre en español, de forma concisa. Usa **negrita** y listas cuando ayude. Sé como un guía local experto.`;

    try {
      const msgs = history.slice(-8).map(m => ({ role: m.role as 'user'|'assistant', content: m.content }));
      const response = await callAI(msgs, { system, maxTokens: 2048 });
      const aMsg: Message = { id: `a_${Date.now()}`, role: 'assistant', content: response, timestamp: Date.now() };
      updateNb(activeNb.id, { messages: [...history, aMsg] });
    } catch (err: any) {
      const errMsg: Message = {
        id: `e_${Date.now()}`, role: 'assistant', timestamp: Date.now(),
        content: `❌ ${err.message}\n\n💡 Configura el proxy en **⚙️** (esquina superior) para activar la IA.`,
      };
      updateNb(activeNb.id, { messages: [...history, errMsg] });
    }
    setLoading(false);
  }, [activeNb, input, loading, notebooks]);

  const copyMsg = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopied(id); setTimeout(() => setCopied(''), 2000);
  };

  // ── RENDER: LIST ─────────────────────────────────────────────
  if (view === 'list') return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/25">
            <BookOpen size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Cuadernos de Viaje IA</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Pregunta sobre tus itinerarios · tipo NotebookLM</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={importFromPlanner}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-amber-400/50 transition-all">
            <Plane size={13} className="text-amber-500" /> Importar viaje
          </button>
          <button onClick={() => setShowNewNb(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 hover:scale-105 transition-all text-sm">
            <Plus size={16} /> Nuevo
          </button>
        </div>
      </div>

      {showNewNb && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-amber-400/40 shadow-xl p-5 space-y-3">
          <h3 className="font-black text-sm text-slate-800 dark:text-white">Nuevo cuaderno</h3>
          <div className="flex gap-2">
            <input value={newNb.emoji} onChange={e => setNewNb(n => ({ ...n, emoji: e.target.value }))}
              className="w-14 text-center text-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl py-2" />
            <input value={newNb.destination} onChange={e => setNewNb(n => ({ ...n, destination: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && createNotebook()}
              placeholder="Destino del viaje..."
              className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400" />
          </div>
          <input value={newNb.dates} onChange={e => setNewNb(n => ({ ...n, dates: e.target.value }))}
            placeholder="Fechas (ej: 18-24 abril 2026)"
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500/20" />
          <div className="flex gap-2">
            <button onClick={createNotebook} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl transition-all">Crear</button>
            <button onClick={() => setShowNewNb(false)} className="px-4 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-xl">✕</button>
          </div>
        </div>
      )}

      {notebooks.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="text-6xl mb-4">📓</div>
          <p className="font-black text-xl text-slate-700 dark:text-slate-200 mb-2">Cuaderno de viaje IA</p>
          <p className="text-sm text-slate-400 max-w-xs mb-6">Importa tu itinerario y pregúntale lo que quieras sobre el viaje.</p>
          <div className="flex gap-3">
            <button onClick={importFromPlanner}
              className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-600 hover:border-amber-400/50 transition-all">
              <Plane size={16} className="text-amber-500" /> Importar de Viajes IA
            </button>
            <button onClick={() => setShowNewNb(true)}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-2xl shadow-lg hover:scale-105 transition-all text-sm">
              <Plus size={16} /> Crear nuevo
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notebooks.map(nb => (
            <button key={nb.id} onClick={() => { setActiveId(nb.id); setView('notebook'); setActiveTab('chat'); }}
              className="group text-left bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl hover:border-amber-400/40 transition-all">
              <div className={`h-1.5 bg-gradient-to-r ${nb.color}`} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">{nb.emoji}</div>
                  <ChevronRight size={16} className="text-slate-400 group-hover:text-amber-500 mt-1 transition-colors" />
                </div>
                <h3 className="font-black text-slate-800 dark:text-white">{nb.destination}</h3>
                {nb.dates && <p className="text-xs text-slate-400 mt-0.5">{nb.dates}</p>}
                <div className="flex gap-3 mt-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><FileText size={10} />{nb.sources.length} fuentes</span>
                  <span className="flex items-center gap-1"><MessageSquare size={10} />{nb.messages.length} msgs</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (!activeNb) { setView('list'); return null; }

  // ── RENDER: NOTEBOOK ─────────────────────────────────────────
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)', maxHeight: '900px' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <ChevronRight size={17} className="rotate-180 text-slate-500" />
          </button>
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${activeNb.color} flex items-center justify-center text-lg shrink-0`}>
            {activeNb.emoji}
          </div>
          <div>
            <h3 className="font-black text-slate-800 dark:text-white text-sm leading-tight">{activeNb.destination}</h3>
            <p className="text-[10px] text-slate-400">{activeNb.dates} · {activeNb.sources.length} fuentes</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setShowProxyConfig(!showProxyConfig)}
            title="Configurar proxy IA"
            className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${proxyUrl ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600'}`}>
            <Settings size={13} />{proxyUrl ? '✅' : '⚙️'}
          </button>
          <button onClick={() => { if (confirm('¿Eliminar cuaderno?')) { save(notebooks.filter(n => n.id !== activeNb.id)); setView('list'); } }}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Proxy config */}
      {showProxyConfig && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 space-y-3 shrink-0 mb-3">
          <p className="font-black text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wider">⚙️ URL Proxy IA (Cloudflare Worker)</p>
          <input value={proxyUrl} onChange={e => saveProxy(e.target.value)}
            placeholder="https://filehub-ai-proxy.TU-USUARIO.workers.dev"
            className="w-full text-xs bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-500/30 rounded-xl px-3 py-2.5 font-mono focus:outline-none focus:border-amber-400" />
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 font-mono text-[10px] text-slate-600 dark:text-slate-300 space-y-0.5">
            <p className="font-black text-slate-700 dark:text-white mb-1">Terminal Mac:</p>
            <p>sudo npm install -g wrangler && wrangler login</p>
            <p>cd ~/Desktop/filehub/cloudflare-worker</p>
            <p className="text-amber-600 font-bold">wrangler secret put GROQ_KEY  <span className="text-slate-400 font-normal">← pega tu key</span></p>
            <p className="text-amber-600 font-bold">wrangler secret put OR_KEY  <span className="text-slate-400 font-normal">← pega tu key</span></p>
            <p className="text-emerald-600 font-bold">wrangler deploy  <span className="text-slate-400 font-normal">← copia la URL aquí ↑</span></p>
          </div>
          <button onClick={() => setShowProxyConfig(false)}
            className="w-full py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition-all">
            Guardar y cerrar
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shrink-0 mb-3">
        {[
          { id: 'chat', label: `💬 Chat IA${activeNb.messages.length > 0 ? ` (${activeNb.messages.length})` : ''}` },
          { id: 'sources', label: `📄 Fuentes (${activeNb.sources.length})` },
          { id: 'notes', label: '📝 Notas' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === t.id ? `bg-white dark:bg-slate-700 shadow-sm text-amber-600` : 'text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CHAT ────────────────────────────────────────────────── */}
      {activeTab === 'chat' && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
            {activeNb.messages.length === 0 && (
              <div className="flex flex-col items-center pt-4 pb-2 text-center">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${activeNb.color} flex items-center justify-center text-2xl mb-3 shadow-lg`}>
                  {activeNb.emoji}
                </div>
                <p className="font-black text-slate-700 dark:text-slate-200 mb-1">¿Qué quieres saber?</p>
                <p className="text-xs text-slate-400 mb-4">
                  {activeNb.sources.length > 0
                    ? `${activeNb.sources.length} fuente${activeNb.sources.length > 1 ? 's' : ''} cargada${activeNb.sources.length > 1 ? 's' : ''}`
                    : 'Añade fuentes o pregunta directamente'}
                </p>
                <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                  {QUICK_PROMPTS.map(p => (
                    <button key={p.text} onClick={() => sendMessage(p.text)}
                      className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-left hover:border-amber-400/50 hover:shadow-sm transition-all group">
                      <span className="text-base shrink-0">{p.icon}</span>
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight group-hover:text-amber-600 transition-colors">{p.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeNb.messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${activeNb.color} flex items-center justify-center shrink-0 mt-0.5 text-sm shadow-sm`}>
                    {activeNb.emoji}
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed relative group ${
                  msg.role === 'user'
                    ? 'bg-amber-500 text-white rounded-br-sm'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-bl-sm shadow-sm'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div dangerouslySetInnerHTML={{ __html: msg.content
                      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-xs mt-0.5">$1</li>')
                      .replace(/\n/g, '<br/>') }} />
                  ) : <p>{msg.content}</p>}
                  {msg.role === 'assistant' && (
                    <button onClick={() => copyMsg(msg.content, msg.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all">
                      {copied === msg.id ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} className="text-slate-400" />}
                    </button>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 bg-amber-100 dark:bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <User size={14} className="text-amber-600" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${activeNb.color} flex items-center justify-center shrink-0 text-sm shadow-sm`}>{activeNb.emoji}</div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2 shadow-sm">
                  <Loader2 size={13} className="animate-spin text-amber-500" />
                  <span className="text-xs text-slate-400">Pensando...</span>
                  {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{animationDelay:`${i*0.12}s`}}/>)}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 pt-2">
            {activeNb.messages.length > 0 && (
              <button onClick={() => updateNb(activeNb.id, { messages: [] })}
                className="text-[10px] text-slate-400 hover:text-red-500 flex items-center gap-1 mb-1.5 ml-auto transition-colors">
                <Trash2 size={9} /> Limpiar
              </button>
            )}
            <div className="flex gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2 focus-within:border-amber-400/60 shadow-sm transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={`Pregunta sobre ${activeNb.destination}... (Enter)`}
                rows={2}
                className="flex-1 bg-transparent border-0 outline-none resize-none text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 px-2 py-1"
              />
              <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
                className={`self-end p-2.5 rounded-xl text-white transition-all shadow-sm disabled:opacity-40 bg-gradient-to-br ${activeNb.color} hover:opacity-90`}>
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 text-center">Haiku 4.5 · Groq · Enter para enviar</p>
          </div>
        </div>
      )}

      {/* ── SOURCES ──────────────────────────────────────────────── */}
      {activeTab === 'sources' && (
        <div className="flex-1 overflow-y-auto space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setShowAddSource(!showAddSource)}
              className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-amber-300 dark:border-amber-500/30 rounded-2xl text-sm font-bold text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/5 transition-all">
              <Plus size={15} /> Añadir fuente
            </button>
            <button onClick={() => fileInputRef.current?.click()}
              className="px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 hover:border-amber-400/50 transition-all">
              <Upload size={15} />
            </button>
            <input ref={fileInputRef} type="file" accept=".txt,.md,.json,.csv" onChange={handleFile} className="hidden" />
          </div>

          {showAddSource && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-amber-400/30 p-4 space-y-3 shadow-lg">
              <div className="flex gap-2">
                {['text','url'].map(t => (
                  <button key={t} onClick={() => setNewSrc(s => ({ ...s, type: t }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${newSrc.type === t ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                    {t === 'text' ? '📝 Texto' : '🌐 URL'}
                  </button>
                ))}
              </div>
              <input value={newSrc.name} onChange={e => setNewSrc(s => ({ ...s, name: e.target.value }))}
                placeholder="Nombre de la fuente..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-amber-400" />
              <textarea value={newSrc.content} onChange={e => setNewSrc(s => ({ ...s, content: e.target.value }))}
                placeholder="Pega confirmaciones de vuelo, hotel, guías..."
                rows={4} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-amber-400" />
              <div className="flex gap-2">
                <button onClick={addSource} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl transition-all">✓ Añadir</button>
                <button onClick={() => setShowAddSource(false)} className="px-4 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-xl">✕</button>
              </div>
            </div>
          )}

          {activeNb.sources.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center text-slate-400">
              <FileText size={32} className="mb-3 text-slate-300" />
              <p className="font-bold text-sm text-slate-500 dark:text-slate-300">Sin fuentes</p>
              <p className="text-xs mt-1">Añade confirmaciones, guías o URLs</p>
            </div>
          ) : activeNb.sources.map(src => (
            <div key={src.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0 text-lg">{src.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{src.name}</p>
                <div className="flex gap-3 mt-0.5 text-[10px] text-slate-400">
                  <span>{src.type}</span>
                  <span>{src.wordCount.toLocaleString()} palabras</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{src.content.slice(0, 100)}</p>
              </div>
              <button onClick={() => updateNb(activeNb.id, { sources: activeNb.sources.filter(s => s.id !== src.id) })}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── NOTES ────────────────────────────────────────────────── */}
      {activeTab === 'notes' && (
        <div className="flex-1 flex flex-col gap-2">
          <textarea
            value={activeNb.notes}
            onChange={e => updateNb(activeNb.id, { notes: e.target.value })}
            placeholder={`Notas de ${activeNb.destination}...\n\n• Qué llevar\n• Contactos\n• Ideas de última hora`}
            className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm text-slate-700 dark:text-slate-200 resize-none focus:outline-none focus:border-amber-400/60 transition-all placeholder-slate-400 leading-relaxed"
          />
          <p className="text-[10px] text-slate-400 text-right">{activeNb.notes.length} caracteres · guardado automáticamente</p>
        </div>
      )}
    </div>
  );
};

export default TravelNotebookView;
