import React, { useState, useEffect } from 'react';
import { Stethoscope, Plus, Trash2, Search, Clock, AlertCircle, CheckCircle2, Edit3, X, Save, User, FileText, Filter } from 'lucide-react';

interface PatientNote {
  id: string;
  patientId: string;
  patientName: string;
  content: string;
  category: 'pending' | 'followup' | 'result' | 'medication' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  completed: boolean;
}

const CATEGORIES = [
  { id: 'pending', label: 'Tarea Pendiente', emoji: '📋', color: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  { id: 'followup', label: 'Seguimiento', emoji: '🔄', color: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  { id: 'result', label: 'Resultado Pendiente', emoji: '🔬', color: 'bg-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
  { id: 'medication', label: 'Medicación', emoji: '💊', color: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'other', label: 'Otro', emoji: '📝', color: 'bg-slate-500', bg: 'bg-slate-50 dark:bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400' },
];

const PRIORITIES = [
  { id: 'low', label: 'Baja', color: 'text-emerald-500', dot: 'bg-emerald-500' },
  { id: 'medium', label: 'Media', color: 'text-amber-500', dot: 'bg-amber-500' },
  { id: 'high', label: 'Alta', color: 'text-orange-500', dot: 'bg-orange-500' },
  { id: 'urgent', label: 'Urgente', color: 'text-red-500', dot: 'bg-red-500' },
];

const PatientNotesView: React.FC = () => {
  const [notes, setNotes] = useState<PatientNote[]>(() => {
    try { return JSON.parse(localStorage.getItem('filehub_patient_notes') || '[]'); } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showCompleted, setShowCompleted] = useState(false);

  const [form, setForm] = useState({ patientId: '', patientName: '', content: '', category: 'pending' as PatientNote['category'], priority: 'medium' as PatientNote['priority'] });

  useEffect(() => { localStorage.setItem('filehub_patient_notes', JSON.stringify(notes)); }, [notes]);

  const handleSave = () => {
    if (!form.patientName.trim() || !form.content.trim()) return;
    const now = new Date().toISOString();
    if (editingId) {
      setNotes(prev => prev.map(n => n.id === editingId ? { ...n, ...form, updatedAt: now } : n));
      setEditingId(null);
    } else {
      const newNote: PatientNote = { id: `pn-${Date.now()}`, ...form, patientId: form.patientId || `PAC-${Date.now().toString().slice(-4)}`, createdAt: now, updatedAt: now, completed: false };
      setNotes(prev => [newNote, ...prev]);
    }
    setForm({ patientId: '', patientName: '', content: '', category: 'pending', priority: 'medium' });
    setShowForm(false);
  };

  const startEdit = (note: PatientNote) => {
    setForm({ patientId: note.patientId, patientName: note.patientName, content: note.content, category: note.category, priority: note.priority });
    setEditingId(note.id);
    setShowForm(true);
  };

  const toggleComplete = (id: string) => setNotes(prev => prev.map(n => n.id === id ? { ...n, completed: !n.completed, updatedAt: new Date().toISOString() } : n));
  const deleteNote = (id: string) => setNotes(prev => prev.filter(n => n.id !== id));

  const filtered = notes.filter(n => {
    if (!showCompleted && n.completed) return false;
    if (filterCat !== 'all' && n.category !== filterCat) return false;
    if (filterPriority !== 'all' && n.priority !== filterPriority) return false;
    if (search && !n.patientName.toLowerCase().includes(search.toLowerCase()) && !n.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    const pOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const pendingCount = notes.filter(n => !n.completed).length;
  const urgentCount = notes.filter(n => !n.completed && (n.priority === 'urgent' || n.priority === 'high')).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Stethoscope size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Notas de Pacientes</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold mt-0.5">Tareas pendientes, seguimientos y datos clínicos</p>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          {urgentCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertCircle size={14} className="text-red-500" />
              <span className="text-xs font-black text-red-600 dark:text-red-400">{urgentCount} urgente{urgentCount > 1 ? 's' : ''}</span>
            </div>
          )}
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-black text-slate-600 dark:text-slate-300">{pendingCount} pendientes</div>
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ patientId: '', patientName: '', content: '', category: 'pending', priority: 'medium' }); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-teal-600/20">
            <Plus size={16} /> Nueva Nota
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {CATEGORIES.map(cat => {
          const count = notes.filter(n => n.category === cat.id && !n.completed).length;
          return (
            <div key={cat.id} className={`${cat.bg} rounded-xl p-4 border ${count > 0 ? 'border-current' : 'border-transparent'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{cat.emoji}</span>
                <span className={`text-[10px] font-black uppercase tracking-wider ${cat.text}`}>{cat.label}</span>
              </div>
              <p className="text-2xl font-black text-slate-800 dark:text-white">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar paciente o nota..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-teal-400" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none">
          <option value="all">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none">
          <option value="all">Todas las prioridades</option>
          {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <button onClick={() => setShowCompleted(!showCompleted)}
          className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${showCompleted ? 'bg-teal-600 text-white border-teal-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
          {showCompleted ? '✓ Completados' : 'Mostrar completados'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-teal-200 dark:border-teal-700 p-6 shadow-lg animate-in slide-in-from-top-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-lg text-slate-800 dark:text-white">{editingId ? 'Editar Nota' : 'Nueva Nota de Paciente'}</h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"><X size={18} className="text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input value={form.patientName} onChange={e => setForm({ ...form, patientName: e.target.value })} placeholder="Nombre del paciente..."
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-teal-400" />
            <input value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })} placeholder="ID / NHC (opcional)..."
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-teal-400" />
          </div>
          <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Tarea pendiente, dato a recordar, seguimiento..."
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-teal-400 resize-none h-24" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Categoría</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setForm({ ...form, category: c.id as any })}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all ${form.category === c.id ? `${c.color} text-white` : `${c.bg} ${c.text}`}`}>
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Prioridad</label>
              <div className="flex gap-1.5">
                {PRIORITIES.map(p => (
                  <button key={p.id} onClick={() => setForm({ ...form, priority: p.id as any })}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black border transition-all ${form.priority === p.id ? `${p.dot} text-white border-transparent` : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button onClick={handleSave} disabled={!form.patientName.trim() || !form.content.trim()}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black text-xs uppercase tracking-wider disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg">
            <Save size={14} /> {editingId ? 'Actualizar' : 'Guardar Nota'}
          </button>
        </div>
      )}

      {/* Notes List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <Stethoscope size={40} className="mx-auto text-slate-200 dark:text-slate-600 mb-4" />
            <p className="text-slate-400 text-sm font-bold">No hay notas que mostrar</p>
          </div>
        ) : (
          filtered.map(note => {
            const cat = CATEGORIES.find(c => c.id === note.category) || CATEGORIES[4];
            const pri = PRIORITIES.find(p => p.id === note.priority) || PRIORITIES[1];
            return (
              <div key={note.id} className={`bg-white dark:bg-slate-800 rounded-xl border p-4 group hover:shadow-md transition-all ${note.completed ? 'opacity-60 border-slate-100 dark:border-slate-700' : note.priority === 'urgent' ? 'border-red-200 dark:border-red-800 border-l-4 border-l-red-500' : note.priority === 'high' ? 'border-orange-200 dark:border-orange-800 border-l-4 border-l-orange-500' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="flex items-start gap-4">
                  <button onClick={() => toggleComplete(note.id)} className={`mt-1 flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${note.completed ? 'bg-teal-500 border-teal-500 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-teal-400'}`}>
                    {note.completed && <CheckCircle2 size={14} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                        <User size={12} className="text-teal-500" /> {note.patientName}
                      </span>
                      {note.patientId && <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-md">{note.patientId}</span>}
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${cat.bg} ${cat.text}`}>{cat.emoji} {cat.label}</span>
                      <span className={`w-2 h-2 rounded-full ${pri.dot}`} title={pri.label} />
                    </div>
                    <p className={`text-sm text-slate-600 dark:text-slate-300 leading-relaxed ${note.completed ? 'line-through' : ''}`}>{note.content}</p>
                    <p className="text-[9px] text-slate-400 mt-2 font-bold">{new Date(note.updatedAt).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                    <button onClick={() => startEdit(note)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-teal-500"><Edit3 size={14} /></button>
                    <button onClick={() => deleteNote(note.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PatientNotesView;
