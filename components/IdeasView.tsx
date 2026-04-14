import React, { useState, useMemo } from 'react';
import { Idea } from '../types';
import {
  Lightbulb, Plus, Trash2, Search, Brain, Sparkles, X, Loader2, Zap, Edit3,
  ArrowRight, Star, Tag, Filter, LayoutGrid, List, Clock, TrendingUp, CheckCircle2,
  Upload, Download, FileText, Image, Archive, Paperclip, Presentation
} from 'lucide-react';
import { callAI } from '../services/aiProxy';
import { supabase } from '../services/supabaseClient';

interface IdeasViewProps {
  ideas: Idea[];
  onAddIdea: (idea: Idea) => void;
  onDeleteIdea: (id: string) => void;
  onUpdateIdea: (idea: Idea) => void;
}

const CATEGORIES = [
  { id: 'tech', label: 'Tecnología', emoji: '💻', color: 'bg-blue-500' },
  { id: 'business', label: 'Negocio', emoji: '💼', color: 'bg-emerald-500' },
  { id: 'health', label: 'Salud', emoji: '🏥', color: 'bg-rose-500' },
  { id: 'personal', label: 'Personal', emoji: '🧠', color: 'bg-violet-500' },
  { id: 'finance', label: 'Finanzas', emoji: '💰', color: 'bg-amber-500' },
  { id: 'creative', label: 'Creativo', emoji: '🎨', color: 'bg-pink-500' },
  { id: 'General', label: 'General', emoji: '📌', color: 'bg-slate-500' },
];

const STATUS_FLOW = [
  { id: 'draft', label: 'Borrador', emoji: '📝', color: 'bg-slate-400' },
  { id: 'brainstorming', label: 'Explorando', emoji: '🧪', color: 'bg-amber-500' },
  { id: 'approved', label: 'Aprobada', emoji: '✅', color: 'bg-emerald-500' },
  { id: 'in_progress', label: 'En marcha', emoji: '🚀', color: 'bg-blue-500' },
  { id: 'done', label: 'Completada', emoji: '🏆', color: 'bg-violet-500' },
];

const PRIORITIES = [
  { id: 'high', label: 'Alta', dot: 'bg-red-500' },
  { id: 'medium', label: 'Media', dot: 'bg-amber-500' },
  { id: 'low', label: 'Baja', dot: 'bg-emerald-500' },
];

const IdeasView: React.FC<IdeasViewProps> = ({ ideas, onAddIdea, onDeleteIdea, onUpdateIdea }) => {
  const [quickTitle, setQuickTitle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCat, setFilterCat] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');
  const [editing, setEditing] = useState<Idea | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', category: 'General', priority: 'medium' as string, status: 'draft' });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<{ name: string; url: string; type: string; size: number }> => {
    const path = `ideas/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    try {
      const { error } = await supabase.storage.from('session-files').upload(path, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from('session-files').getPublicUrl(path);
        return { name: file.name, url: data?.publicUrl || '', type: file.type, size: file.size };
      }
    } catch {}
    // Fallback base64
    const reader = new FileReader();
    const url = await new Promise<string>((r) => { reader.onload = () => r(reader.result as string); reader.readAsDataURL(file); });
    return { name: file.name, url, type: file.type, size: file.size };
  };

  const fileIcon = (name: string) => {
    if (name.match(/\.pdf$/i)) return <FileText size={14} className="text-red-400" />;
    if (name.match(/\.pptx?$/i)) return <Presentation size={14} className="text-orange-400" />;
    if (name.match(/\.(jpe?g|png|gif|webp)$/i)) return <Image size={14} className="text-blue-400" />;
    if (name.match(/\.zip$/i)) return <Archive size={14} className="text-violet-400" />;
    return <Paperclip size={14} className="text-slate-400" />;
  };

  const fmtSize = (b: number) => b < 1024 ? `${b}B` : b < 1048576 ? `${(b/1024).toFixed(0)}KB` : `${(b/1048576).toFixed(1)}MB`;

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    onAddIdea({
      id: `idea-${Date.now()}`, title: quickTitle, description: '', category: 'General',
      priority: 'medium', status: 'draft', createdAt: new Date().toISOString().split('T')[0]
    });
    setQuickTitle('');
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return;
    setUploading(true);
    let files: { name: string; url: string; type: string; size: number }[] = editing?.files || [];
    if (pendingFiles.length > 0) {
      const uploaded = await Promise.all(pendingFiles.map(f => uploadFile(f)));
      files = [...files, ...uploaded];
    }
    if (editing) {
      onUpdateIdea({ ...editing, ...formData, files } as any);
    } else {
      onAddIdea({ id: `idea-${Date.now()}`, ...formData, files, createdAt: new Date().toISOString().split('T')[0] } as Idea);
    }
    setShowForm(false); setEditing(null); setPendingFiles([]);
    setFormData({ title: '', description: '', category: 'General', priority: 'medium', status: 'draft' });
    setUploading(false);
  };

  const openEdit = (idea: Idea) => {
    setEditing(idea);
    setFormData({ title: idea.title, description: idea.description || '', category: idea.category, priority: idea.priority, status: idea.status || 'draft' });
    setPendingFiles([]);
    setShowForm(true);
  };

  const changeStatus = (idea: Idea, newStatus: string) => {
    onUpdateIdea({ ...idea, status: newStatus });
  };

  const aiExpand = async (idea: Idea) => {
    setAiLoading(true);
    try {
      const result = await callAI([{ role: 'user', content: `Expande esta idea en 3-4 puntos concretos con pasos accionables: "${idea.title}". ${idea.description ? `Contexto: ${idea.description}` : ''}\nFormato: título en negrita + descripción corta para cada punto. En español, directo.` }],
        { system: 'Eres un coach de innovación. Sé conciso, práctico y creativo.', maxTokens: 600 });
      setAiResult(result);
    } catch { setAiResult('Error generando análisis.'); }
    finally { setAiLoading(false); }
  };

  const aiBrainstorm = async () => {
    setAiLoading(true);
    try {
      const existingTitles = ideas.map(i => i.title).join(', ');
      const result = await callAI([{ role: 'user', content: `Carlos es médico residente que desarrolla apps (Cartagenaeste, FILEHUB-IA) y se muda a Barcelona.\nIdeas actuales: ${existingTitles || 'ninguna'}\nGenera 3 ideas nuevas ORIGINALES que NO tenga. Formato JSON array:\n[{"title":"...","description":"...","category":"tech","priority":"high"}]\nSolo JSON.` }],
        { system: 'Generador de ideas innovadoras. SOLO JSON array.', maxTokens: 500 });
      const clean = result.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed)) {
        parsed.forEach((p: any) => onAddIdea({
          id: `idea-ai-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,
          title: p.title, description: p.description || '', category: p.category || 'General',
          priority: p.priority || 'medium', status: 'draft', createdAt: new Date().toISOString().split('T')[0]
        }));
        setAiResult(`✅ ${parsed.length} ideas generadas por IA`);
      }
    } catch { setAiResult('Error generando ideas.'); }
    finally { setAiLoading(false); setTimeout(() => setAiResult(null), 4000); }
  };

  const filtered = useMemo(() => ideas.filter(i => {
    const matchSearch = i.title.toLowerCase().includes(searchTerm.toLowerCase()) || (i.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || i.status === filterStatus;
    const matchCat = filterCat === 'all' || i.category === filterCat;
    return matchSearch && matchStatus && matchCat;
  }), [ideas, searchTerm, filterStatus, filterCat]);

  const stats = useMemo(() => ({
    total: ideas.length,
    draft: ideas.filter(i => i.status === 'draft').length,
    active: ideas.filter(i => i.status === 'brainstorming' || i.status === 'in_progress').length,
    done: ideas.filter(i => i.status === 'done' || i.status === 'approved').length,
    highPri: ideas.filter(i => i.priority === 'high').length,
  }), [ideas]);

  const getCat = (id: string) => CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
  const getStatus = (id: string) => STATUS_FLOW.find(s => s.id === id) || STATUS_FLOW[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Lightbulb size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Ideas Lab</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Captura · Evoluciona · Ejecuta</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={aiBrainstorm} disabled={aiLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white font-bold rounded-xl shadow-lg text-xs disabled:opacity-50">
            {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />} Brainstorm IA
          </button>
          <button onClick={() => { setEditing(null); setFormData({ title:'', description:'', category:'General', priority:'medium', status:'draft' }); setPendingFiles([]); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl shadow-lg text-xs">
            <Plus size={14} /> Nueva Idea
          </button>
        </div>
      </div>

      {/* AI Result toast */}
      {aiResult && (
        <div className="bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30 rounded-2xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2">
          <Sparkles size={16} className="text-violet-500 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm text-violet-700 dark:text-violet-300 whitespace-pre-wrap">{aiResult}</div>
          <button onClick={() => setAiResult(null)} className="text-violet-400"><X size={14} /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: '💡', color: 'text-amber-500' },
          { label: 'Borradores', value: stats.draft, icon: '📝', color: 'text-slate-500' },
          { label: 'Activas', value: stats.active, icon: '🧪', color: 'text-blue-500' },
          { label: 'Completadas', value: stats.done, icon: '✅', color: 'text-emerald-500' },
          { label: 'Alta prioridad', value: stats.highPri, icon: '🔥', color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3">
            <span className="text-xl">{s.icon}</span>
            <div><p className={`text-xl font-black ${s.color}`}>{s.value}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Quick add */}
      <form onSubmit={handleQuickAdd} className="flex gap-2">
        <div className="flex-1 flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-1.5 shadow-sm">
          <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl"><Lightbulb className="text-amber-500" size={20} /></div>
          <input type="text" placeholder="Tengo una idea para..." value={quickTitle} onChange={e => setQuickTitle(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none font-bold text-slate-700 dark:text-white px-3 text-sm" />
        </div>
        <button type="submit" className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white p-4 rounded-xl font-black shadow-lg"><Plus size={18} /></button>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar ideas..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold">
          <option value="all">Todos los estados</option>
          {STATUS_FLOW.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold">
          <option value="all">Todas categorías</option>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
        </select>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-amber-400/40 shadow-xl p-6 space-y-4 animate-in slide-in-from-top-2">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-slate-800 dark:text-white">{editing ? 'Editar Idea' : 'Nueva Idea'}</h3>
            <button onClick={() => setShowForm(false)}><X size={18} className="text-slate-400" /></button>
          </div>
          <input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Título de la idea..."
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold" />
          <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Descripción larga, contexto, enlaces, notas..."
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm h-40 resize-y" />
          {/* File Upload */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">📎 Archivos adjuntos</label>
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-amber-500/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.pptx,.ppt,.zip,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.txt,.csv,.xlsx" className="hidden"
                onChange={e => { if (e.target.files) setPendingFiles(prev => [...prev, ...Array.from(e.target.files!)]); }} />
              <div className="text-center">
                <Upload size={20} className="mx-auto text-slate-400 mb-1" />
                <p className="text-xs text-slate-500">PDF, PPTX, ZIP, JPEG, PNG, DOCX...</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Pulsa o arrastra archivos aquí</p>
              </div>
            </div>
            {/* Pending files */}
            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {pendingFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 rounded-lg text-xs">
                    {fileIcon(f.name)}
                    <span className="font-bold text-slate-600 dark:text-slate-300 max-w-[150px] truncate">{f.name}</span>
                    <span className="text-slate-400 text-[10px]">{fmtSize(f.size)}</span>
                    <button onClick={e => { e.stopPropagation(); setPendingFiles(prev => prev.filter((_, j) => j !== i)); }} className="text-slate-400 hover:text-red-400"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
            {/* Already uploaded files (editing) */}
            {editing?.files && editing.files.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {editing.files.map((f, i) => (
                  <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" download={f.name}
                    className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-lg text-xs hover:bg-emerald-500/20 transition-all">
                    {fileIcon(f.name)}
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 max-w-[150px] truncate">{f.name}</span>
                    <Download size={10} className="text-emerald-500" />
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Categoría</label>
              <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold">
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Prioridad</label>
              <div className="flex gap-1">
                {PRIORITIES.map(p => (
                  <button key={p.id} type="button" onClick={() => setFormData({ ...formData, priority: p.id })}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-black border transition-all ${formData.priority === p.id ? `${p.dot} text-white border-transparent` : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Estado</label>
              <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold">
                {STATUS_FLOW.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleSave} disabled={uploading} className="w-full py-3 bg-amber-600 text-white font-black rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
            {uploading ? <><Loader2 size={16} className="animate-spin" /> Subiendo archivos...</> : editing ? '✓ Actualizar' : '✓ Crear Idea'}
          </button>
        </div>
      )}

      {/* Ideas grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">💡</div>
          <p className="font-bold text-slate-600 dark:text-slate-300">Sin ideas todavía</p>
          <p className="text-xs text-slate-400 mt-1">Añade una idea o usa Brainstorm IA</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.sort((a, b) => {
            const pri = { high: 0, medium: 1, low: 2 };
            return (pri[a.priority as keyof typeof pri] || 1) - (pri[b.priority as keyof typeof pri] || 1);
          }).map(idea => {
            const cat = getCat(idea.category);
            const status = getStatus(idea.status || 'draft');
            return (
              <div key={idea.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden group hover:shadow-lg hover:border-amber-300 dark:hover:border-amber-500/40 transition-all">
                {/* Top color bar */}
                <div className={`h-1 ${cat.color}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${status.color} text-white uppercase`}>{status.emoji} {status.label}</span>
                      <span className={`w-2 h-2 rounded-full ${idea.priority === 'high' ? 'bg-red-500' : idea.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => aiExpand(idea)} className="p-1.5 text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-lg" title="Expandir con IA">
                        <Sparkles size={13} />
                      </button>
                      <button onClick={() => openEdit(idea)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg">
                        <Edit3 size={13} />
                      </button>
                      <button onClick={() => onDeleteIdea(idea.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-black text-slate-800 dark:text-white text-sm mb-2 leading-tight">{idea.title}</h4>
                  {idea.description && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mb-3 whitespace-pre-wrap">{idea.description}</p>}

                  {/* Attached files */}
                  {idea.files && idea.files.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {idea.files.map((f, fi) => (
                        <a key={fi} href={f.url} target="_blank" rel="noopener noreferrer" download={f.name}
                          onClick={e => { if (f.url.startsWith('data:')) { e.preventDefault(); const a = document.createElement('a'); a.href = f.url; a.download = f.name; a.click(); } }}
                          className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg text-[10px] font-bold text-emerald-600 dark:text-emerald-400 transition-all">
                          {fileIcon(f.name)}
                          <span className="max-w-[100px] truncate">{f.name}</span>
                          <Download size={9} />
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <span>{cat.emoji}</span> {cat.label}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock size={10} /> {idea.createdAt}
                    </span>
                  </div>

                  {/* Status flow buttons */}
                  <div className="flex gap-1 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                    {STATUS_FLOW.map(s => (
                      <button key={s.id} onClick={() => changeStatus(idea, s.id)}
                        className={`flex-1 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${(idea.status || 'draft') === s.id ? `${s.color} text-white` : 'bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-slate-600'}`}>
                        {s.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default IdeasView;
