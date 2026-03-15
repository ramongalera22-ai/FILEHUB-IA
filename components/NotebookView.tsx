import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FileText, Plus, Trash2, MessageSquare, Send, BookOpen,
  Loader, Sparkles, X, Upload,
  AlignLeft, HelpCircle, Clock,
  Copy, Check,
  PenLine, Star, Globe, Hash
} from 'lucide-react';

interface Source {
  id: string;
  title: string;
  type: 'text' | 'url' | 'file';
  content: string;
  addedAt: string;
  wordCount: number;
  selected: boolean;
  color: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  pinned: boolean;
}

interface GeneratedContent {
  type: string;
  title: string;
  content: string;
  generatedAt: string;
}

const SOURCE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];
const STORAGE_KEY = 'filehub_notebook_v2';
const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_KEY || '';

async function callAI(systemPrompt: string, userPrompt: string, maxTokens = 1500): Promise<string> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'HTTP-Referer': 'https://ramongalera22-ai.github.io/FILEHUB-IA',
        'X-Title': 'FILEHUB Notebook',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4.5',
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No se pudo generar respuesta.';
  } catch {
    return 'Error al conectar con la IA. Verifica tu API key de OpenRouter en Settings.';
  }
}

function buildSourceContext(sources: Source[]): string {
  const selected = sources.filter(s => s.selected);
  if (selected.length === 0) return 'No hay fuentes seleccionadas.';
  return selected.map((s, i) =>
    `[FUENTE ${i + 1}: "${s.title}"]\n${s.content.slice(0, 4000)}`
  ).join('\n\n---\n\n');
}

const SourceCard: React.FC<{
  source: Source;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: (title: string) => void;
}> = ({ source, onToggle, onDelete, onEdit }) => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(source.title);
  return (
    <div
      className={`group flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
        source.selected
          ? 'border-indigo-500/40 bg-indigo-500/5'
          : 'border-slate-200/60 dark:border-white/5 bg-white dark:bg-slate-900 hover:border-indigo-500/30'
      }`}
      onClick={onToggle}
    >
      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: source.color }} />
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            className="w-full text-xs font-bold bg-transparent border-b border-indigo-500 text-slate-800 dark:text-white focus:outline-none"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => { onEdit(title); setEditing(false); }}
            onKeyDown={e => { if (e.key === 'Enter') { onEdit(title); setEditing(false); } }}
            autoFocus
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{source.title}</p>
        )}
        <p className="text-[10px] text-slate-400 mt-0.5">{source.wordCount} palabras</p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
        <button onClick={() => setEditing(true)} className="p-1 hover:text-indigo-400 text-slate-400 transition-colors">
          <PenLine size={11} />
        </button>
        <button onClick={onDelete} className="p-1 hover:text-red-400 text-slate-400 transition-colors">
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
};

const NotebookView: React.FC<any> = () => {
  const [sources, setSources] = useState<Source[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY + '_sources') || '[]'); } catch { return []; }
  });
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY + '_messages') || '[]'); } catch { return []; }
  });
  const [notes, setNotes] = useState<Note[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY + '_notes') || '[]'); } catch { return []; }
  });
  const [generated, setGenerated] = useState<GeneratedContent[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY + '_generated') || '[]'); } catch { return []; }
  });

  const [activePanel, setActivePanel] = useState<'chat' | 'studio' | 'notes'>('chat');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [addSourceType, setAddSourceType] = useState<'text' | 'url'>('text');
  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [newSourceContent, setNewSourceContent] = useState('');
  const [generatingType, setGeneratingType] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem(STORAGE_KEY + '_sources', JSON.stringify(sources)); }, [sources]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY + '_messages', JSON.stringify(messages)); }, [messages]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY + '_notes', JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY + '_generated', JSON.stringify(generated)); }, [generated]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const selectedSources = sources.filter(s => s.selected);

  const addSource = () => {
    if (!newSourceContent.trim()) return;
    const title = newSourceTitle || `Fuente ${sources.length + 1}`;
    const colorIdx = sources.length % SOURCE_COLORS.length;
    const source: Source = {
      id: Date.now().toString(),
      title,
      type: addSourceType,
      content: newSourceContent,
      addedAt: new Date().toISOString(),
      wordCount: newSourceContent.split(/\s+/).length,
      selected: true,
      color: SOURCE_COLORS[colorIdx],
    };
    setSources(prev => [...prev, source]);
    setNewSourceTitle('');
    setNewSourceContent('');
    setShowAddSource(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setNewSourceContent(ev.target?.result as string);
      setNewSourceTitle(file.name.replace(/\.[^.]+$/, ''));
      setAddSourceType('text');
    };
    reader.readAsText(file);
  };

  const sendMessage = useCallback(async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;
    setInput('');
    const userMsg: ChatMessage = {
      id: Date.now().toString(), role: 'user', content: msg,
      timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    const context = buildSourceContext(sources);
    const reply = await callAI(
      `Eres un asistente estilo NotebookLM. Responde SOLO basándote en las fuentes. Si no encuentras info, dilo. Cita usando [Fuente N]. Responde en español.\n\nFUENTES:\n${context}`,
      msg, 1200
    );
    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(), role: 'assistant', content: reply,
      timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    }]);
    setIsLoading(false);
  }, [input, sources, isLoading]);

  const generateContent = async (type: string) => {
    if (selectedSources.length === 0) return;
    setGeneratingType(type);
    const context = buildSourceContext(sources);
    const prompts: Record<string, string> = {
      'study-guide': 'Crea una guía de estudio completa con: conceptos clave, resumen por sección, puntos importantes y preguntas de repaso. Formato con títulos y listas.',
      'faq': 'Genera las 8-10 preguntas más relevantes con respuestas detalladas. Formato: **P: pregunta** + A: respuesta.',
      'briefing': 'Crea un briefing ejecutivo: resumen ejecutivo (3-4 frases), 5 puntos clave, implicaciones y próximos pasos.',
      'timeline': 'Extrae todos los eventos y fechas cronológicas de las fuentes y crea una línea temporal ordenada.',
      'mindmap': 'Crea un mapa mental en texto con el tema central, ramas principales y sub-ramas. Usa indentación y emojis.',
    };
    const titles: Record<string, string> = {
      'study-guide': '📚 Guía de Estudio', 'faq': '❓ Preguntas Frecuentes',
      'briefing': '📋 Briefing Ejecutivo', 'timeline': '📅 Línea Temporal', 'mindmap': '🧠 Mapa Mental',
    };
    const content = await callAI(`Eres un experto en síntesis. Responde en español.\nFuentes:\n${context}`, prompts[type] || '', 1500);
    setGenerated(prev => [{ type, title: titles[type] || type, content, generatedAt: new Date().toLocaleString('es-ES') }, ...prev.filter(g => g.type !== type)]);
    setGeneratingType(null);
    setActivePanel('studio');
  };

  const createNote = () => {
    const note: Note = { id: Date.now().toString(), title: 'Nueva nota', content: '', createdAt: new Date().toLocaleString('es-ES'), pinned: false };
    setNotes(prev => [note, ...prev]);
    setActiveNote(note.id);
    setActivePanel('notes');
  };

  const saveToNote = (text: string) => {
    const note: Note = { id: Date.now().toString(), title: text.slice(0, 50) + '...', content: text, createdAt: new Date().toLocaleString('es-ES'), pinned: false };
    setNotes(prev => [note, ...prev]);
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id); setTimeout(() => setCopied(null), 2000);
  };

  const activeNoteObj = notes.find(n => n.id === activeNote);

  return (
    <div className="flex h-full overflow-hidden bg-[#f8fafc] dark:bg-slate-950">
      {/* LEFT: Sources */}
      <div className="w-64 shrink-0 flex flex-col border-r border-slate-200/60 dark:border-white/5 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-4 border-b border-slate-200/60 dark:border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Fuentes</h2>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-500 font-bold px-2 py-0.5 rounded-full">{selectedSources.length}/{sources.length}</span>
          </div>
          <button onClick={() => setShowAddSource(true)} className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors">
            <Plus size={14} /> Añadir fuente
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {sources.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen size={28} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-[11px] text-slate-400">Sin fuentes aún</p>
              <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-1">Añade texto, PDFs o URLs</p>
            </div>
          ) : (
            <>
              <div className="flex gap-1 mb-1">
                <button onClick={() => setSources(s => s.map(x => ({ ...x, selected: true })))} className="flex-1 text-[10px] font-bold text-indigo-500 py-1 rounded-lg hover:bg-indigo-500/5">Todas</button>
                <button onClick={() => setSources(s => s.map(x => ({ ...x, selected: false })))} className="flex-1 text-[10px] font-bold text-slate-400 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">Ninguna</button>
              </div>
              {sources.map(source => (
                <SourceCard key={source.id} source={source}
                  onToggle={() => setSources(s => s.map(x => x.id === source.id ? { ...x, selected: !x.selected } : x))}
                  onDelete={() => setSources(s => s.filter(x => x.id !== source.id))}
                  onEdit={(title) => setSources(s => s.map(x => x.id === source.id ? { ...x, title } : x))}
                />
              ))}
            </>
          )}
        </div>
        {selectedSources.length > 0 && (
          <div className="p-3 border-t border-slate-200/60 dark:border-white/5 space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Generar con IA</p>
            {[
              { type: 'study-guide', label: 'Guía de estudio', icon: BookOpen },
              { type: 'faq', label: 'Preguntas frecuentes', icon: HelpCircle },
              { type: 'briefing', label: 'Briefing ejecutivo', icon: AlignLeft },
              { type: 'timeline', label: 'Línea temporal', icon: Clock },
              { type: 'mindmap', label: 'Mapa mental', icon: Hash },
            ].map(({ type, label, icon: Icon }) => (
              <button key={type} onClick={() => generateContent(type)} disabled={!!generatingType}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-500 transition-colors disabled:opacity-50">
                {generatingType === type ? <Loader size={12} className="animate-spin text-indigo-400" /> : <Icon size={12} />}
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CENTER: Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-slate-200/60 dark:border-white/5 bg-white dark:bg-slate-900">
          {[
            { id: 'chat', label: 'Chat', icon: MessageSquare },
            { id: 'studio', label: 'Studio', icon: Sparkles },
            { id: 'notes', label: `Notas${notes.length > 0 ? ` (${notes.length})` : ''}`, icon: PenLine },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActivePanel(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${activePanel === tab.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              <tab.icon size={13} />{tab.label}
            </button>
          ))}
          <div className="ml-auto pb-1 flex gap-2">
            {selectedSources.length === 0 && <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-1 rounded-full">Sin fuentes</span>}
            {!OPENROUTER_KEY && <span className="text-[10px] text-red-400 font-bold bg-red-500/10 px-2 py-1 rounded-full">Sin API key</span>}
          </div>
        </div>

        {/* CHAT */}
        {activePanel === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-4">
                    <MessageSquare size={28} className="text-indigo-400" />
                  </div>
                  <h3 className="text-base font-black text-slate-700 dark:text-white mb-2">Pregunta sobre tus fuentes</h3>
                  <p className="text-sm text-slate-400 max-w-xs mb-6">El asistente responde basándose únicamente en los documentos añadidos, igual que NotebookLM</p>
                  {selectedSources.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
                      {['Resume los puntos principales', '¿Cuáles son las ideas clave?', 'Crea un resumen ejecutivo', '¿Qué conclusiones se pueden extraer?'].map(q => (
                        <button key={q} onClick={() => sendMessage(q)}
                          className="text-left px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:border-indigo-500/40 hover:text-indigo-500 transition-all">
                          {q} →
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles size={14} className="text-white" />
                    </div>
                  )}
                  <div className={`max-w-[80%] group`}>
                    <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-md' : 'bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/5 text-slate-700 dark:text-slate-300 rounded-tl-md'}`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <div className={`flex items-center gap-2 mt-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                      {msg.role === 'assistant' && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => copyText(msg.content, msg.id)} className="p-1 hover:text-indigo-400 text-slate-400">
                            {copied === msg.id ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          </button>
                          <button onClick={() => saveToNote(msg.content)} className="p-1 hover:text-indigo-400 text-slate-400"><PenLine size={11} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                    <Sparkles size={14} className="text-white" />
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/5 rounded-2xl rounded-tl-md px-4 py-3">
                    <div className="flex gap-1.5">
                      {[0, 150, 300].map(d => <div key={d} className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-slate-200/60 dark:border-white/5 bg-white dark:bg-slate-900">
              {messages.length > 0 && (
                <button onClick={() => setMessages([])} className="text-[10px] text-slate-400 hover:text-red-400 mb-2 flex items-center gap-1">
                  <Trash2 size={10} /> Limpiar chat
                </button>
              )}
              <div className="flex gap-2 items-end">
                <textarea
                  className="flex-1 min-h-[44px] max-h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 border border-slate-200/60 dark:border-white/5 focus:outline-none focus:border-indigo-500 resize-none"
                  placeholder={selectedSources.length === 0 ? 'Añade fuentes primero...' : 'Pregunta sobre tus documentos...'}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  disabled={selectedSources.length === 0 || isLoading}
                  rows={1}
                />
                <button onClick={() => sendMessage()} disabled={!input.trim() || selectedSources.length === 0 || isLoading}
                  className="w-11 h-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-2xl flex items-center justify-center transition-colors shrink-0">
                  {isLoading ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STUDIO */}
        {activePanel === 'studio' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {generatingType && (
              <div className="flex items-center gap-3 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl">
                <Loader size={18} className="animate-spin text-indigo-400" />
                <span className="text-sm font-bold text-indigo-500">Generando con IA...</span>
              </div>
            )}
            {generated.length === 0 && !generatingType && (
              <div className="text-center py-16">
                <Sparkles size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                <h3 className="text-base font-black text-slate-700 dark:text-white mb-2">Studio de Contenido</h3>
                <p className="text-sm text-slate-400 mb-6">Genera contenido estructurado a partir de tus fuentes</p>
                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                  {[
                    { type: 'study-guide', label: '📚 Guía de estudio', desc: 'Conceptos + preguntas' },
                    { type: 'faq', label: '❓ FAQ', desc: 'Preguntas y respuestas' },
                    { type: 'briefing', label: '📋 Briefing', desc: 'Resumen ejecutivo' },
                    { type: 'mindmap', label: '🧠 Mapa mental', desc: 'Jerarquía de conceptos' },
                  ].map(({ type, label, desc }) => (
                    <button key={type} onClick={() => generateContent(type)} disabled={selectedSources.length === 0}
                      className="p-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/5 rounded-2xl text-left hover:border-indigo-500/40 transition-all disabled:opacity-40">
                      <div className="text-sm font-black text-slate-700 dark:text-white mb-1">{label}</div>
                      <div className="text-[10px] text-slate-400">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {generated.map((g, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-white/5 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 dark:border-white/5">
                  <h3 className="font-black text-sm text-slate-800 dark:text-white">{g.title}</h3>
                  <div className="flex gap-1.5">
                    <button onClick={() => copyText(g.content, `gen-${i}`)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-400">
                      {copied === `gen-${i}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                    <button onClick={() => saveToNote(g.title + '\n\n' + g.content)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-400">
                      <PenLine size={13} />
                    </button>
                    <button onClick={() => setGenerated(prev => prev.filter((_, j) => j !== i))} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-400">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">{g.content}</pre>
                  <p className="text-[10px] text-slate-400 mt-3">{g.generatedAt}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* NOTES */}
        {activePanel === 'notes' && (
          <div className="flex-1 flex overflow-hidden">
            <div className="w-48 shrink-0 border-r border-slate-200/60 dark:border-white/5 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
              <div className="p-3 border-b border-slate-200/60 dark:border-white/5">
                <button onClick={createNote} className="w-full flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold">
                  <Plus size={13} /> Nueva nota
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {notes.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-6">Sin notas</p>
                ) : notes.map(note => (
                  <button key={note.id} onClick={() => setActiveNote(note.id)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all ${activeNote === note.id ? 'bg-indigo-500/10 border border-indigo-500/30' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                    <div className="flex items-center gap-1.5">
                      {note.pinned && <Star size={10} className="text-amber-400 shrink-0" />}
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{note.title || 'Sin título'}</p>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{note.content.slice(0, 30) || '...'}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              {activeNoteObj ? (
                <>
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200/60 dark:border-white/5 bg-white dark:bg-slate-900">
                    <input
                      className="flex-1 text-sm font-black text-slate-800 dark:text-white bg-transparent focus:outline-none"
                      value={activeNoteObj.title}
                      onChange={e => setNotes(n => n.map(x => x.id === activeNoteObj.id ? { ...x, title: e.target.value } : x))}
                      placeholder="Título..."
                    />
                    <button onClick={() => setNotes(n => n.map(x => x.id === activeNoteObj.id ? { ...x, pinned: !x.pinned } : x))}
                      className={`p-1.5 rounded-lg ${activeNoteObj.pinned ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'}`}>
                      <Star size={14} />
                    </button>
                    <button onClick={() => { setNotes(n => n.filter(x => x.id !== activeNoteObj.id)); setActiveNote(null); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <textarea
                    className="flex-1 p-4 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 focus:outline-none resize-none leading-relaxed placeholder:text-slate-300 dark:placeholder:text-slate-600"
                    value={activeNoteObj.content}
                    onChange={e => setNotes(n => n.map(x => x.id === activeNoteObj.id ? { ...x, content: e.target.value } : x))}
                    placeholder="Escribe tu nota...&#10;&#10;Tip: guarda respuestas del chat con el icono ✏️"
                  />
                  <div className="px-4 py-2 border-t border-slate-200/60 dark:border-white/5 bg-white dark:bg-slate-900">
                    <p className="text-[10px] text-slate-400">{activeNoteObj.content.split(/\s+/).filter(Boolean).length} palabras · {activeNoteObj.createdAt}</p>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div>
                    <PenLine size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                    <p className="text-sm font-bold text-slate-500">Selecciona o crea una nota</p>
                    <p className="text-xs text-slate-400 mt-1">Guarda respuestas del chat con ✏️</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ADD SOURCE MODAL */}
      {showAddSource && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-white/10 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200/60 dark:border-white/5">
              <h2 className="font-black text-slate-800 dark:text-white">Añadir fuente</h2>
              <button onClick={() => setShowAddSource(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-2">
                {[{ id: 'text' as const, label: '📝 Texto/Documento' }, { id: 'url' as const, label: '🔗 URL/Enlace' }].map(t => (
                  <button key={t.id} onClick={() => setAddSourceType(t.id)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${addSourceType === t.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/5'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <Upload size={14} className="text-slate-500" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Subir archivo .txt / .md / .csv</span>
                <input type="file" accept=".txt,.md,.csv" className="hidden" onChange={handleFileUpload} />
              </label>
              <input
                className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white border border-slate-200 dark:border-white/5 focus:outline-none focus:border-indigo-500 font-bold"
                placeholder="Título de la fuente (opcional)"
                value={newSourceTitle}
                onChange={e => setNewSourceTitle(e.target.value)}
              />
              {addSourceType === 'text' ? (
                <textarea
                  className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white border border-slate-200 dark:border-white/5 focus:outline-none focus:border-indigo-500 resize-none"
                  placeholder="Pega aquí el contenido del documento, artículo, apuntes..."
                  rows={6}
                  value={newSourceContent}
                  onChange={e => setNewSourceContent(e.target.value)}
                />
              ) : (
                <input
                  className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white border border-slate-200 dark:border-white/5 focus:outline-none focus:border-indigo-500"
                  placeholder="https://..."
                  value={newSourceContent}
                  onChange={e => setNewSourceContent(e.target.value)}
                />
              )}
              <div className="flex gap-2">
                <button onClick={addSource} disabled={!newSourceContent.trim()}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-sm font-black transition-colors">
                  Añadir fuente
                </button>
                <button onClick={() => setShowAddSource(false)}
                  className="px-5 py-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotebookView;
