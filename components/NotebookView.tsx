import React, { useState, useRef } from 'react';
import { WorkDocument } from '../types';
import {
    FileText,
    BookOpen,
    ArrowUpRight,
    Brain,
    Share2,
    Edit3
} from 'lucide-react';

interface NotebookViewProps {
    notes: string;
    documents: WorkDocument[];
    onNotesChange: (notes: string) => void;
    onSaveDocument: (doc: WorkDocument) => void;
    onLoadDocument: (content: string) => void;
}

const NotebookView: React.FC<NotebookViewProps> = ({
    notes: initialNotes,
    documents: initialDocuments,
    onNotesChange,
    onSaveDocument,
    onLoadDocument
}) => {
    const [notes, setNotes] = useState(initialNotes);
    const [documents, setDocuments] = useState<WorkDocument[]>(initialDocuments);
    const [isSaving, setIsSaving] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [activeTab, setActiveTab] = useState<'notebook' | 'documents'>('notebook');

    const saveNotesAsDocument = () => {
        if (!notes.trim()) return;
        const newDoc: WorkDocument = {
            id: `note-${Date.now()}`,
            name: `Nota Privada ${new Date().toLocaleDateString('es-ES')}`,
            type: 'text',
            uploadDate: new Date().toISOString().split('T')[0],
            content: notes
        };
        const updatedDocs = [...documents, newDoc];
        setDocuments(updatedDocs);
        onSaveDocument(newDoc);
        setNotes('');
        onNotesChange('');
        setActiveTab('documents');
        alert('Nota guardada en Documentos Privados');
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 overflow-hidden">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Cuaderno Privado</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-bold mt-1">Tu espacio personal para ideas y notas</p>
                </div>
                <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                    <button
                        onClick={() => setActiveTab('notebook')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'notebook' ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Cuaderno
                    </button>
                    <button
                        onClick={() => setActiveTab('documents')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'documents' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Documentos
                    </button>
                </div>
            </header>

            {activeTab === 'notebook' && (
                <div className="space-y-12 animate-in slide-in-from-bottom-6 duration-700">
                    {/* AI Integrations */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 flex flex-col justify-between group hover:border-indigo-500/50 transition-all shadow-2xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-[60px] rounded-full -mr-10 -mt-10 group-hover:bg-indigo-600/20 transition-all"></div>
                            <div className="space-y-6 relative z-10">
                                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                    <Brain size={32} />
                                </div>
                                <div>
                                    <h4 className="text-2xl font-black text-white">NotebookLM</h4>
                                    <p className="text-slate-400 text-sm mt-3 font-bold leading-relaxed">Analiza tus notas y genera insights con la IA de Google.</p>
                                </div>
                            </div>
                            <div className="mt-10 relative z-10">
                                <a
                                    href="https://notebooklm.google.com/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-center shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 group/btn"
                                >
                                    Abrir Notebook <ArrowUpRight size={16} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                                </a>
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 flex flex-col justify-between group hover:border-emerald-500/50 transition-all shadow-2xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/10 blur-[60px] rounded-full -mr-10 -mt-10 group-hover:bg-emerald-600/20 transition-all"></div>
                            <div className="space-y-6 relative z-10">
                                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                    <Share2 size={32} />
                                </div>
                                <div>
                                    <h4 className="text-2xl font-black text-white">OpenNotebook</h4>
                                    <p className="text-slate-400 text-sm mt-3 font-bold leading-relaxed">Tu base de conocimiento privada y local.</p>
                                </div>
                            </div>
                            <div className="mt-10 relative z-10">
                                <a
                                    href="https://open-notebooklm.vercel.app/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-center shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 group/btn"
                                >
                                    Lanzar Alpha <ArrowUpRight size={16} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Writing Board */}
                    <div className="flex flex-col space-y-6">
                        <div className="flex justify-between items-center px-4">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Cuaderno de Trabajo</h3>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${isSaving ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isSaving ? 'text-amber-500' : 'text-slate-400'}`}>
                                        {isSaving ? 'Guardando...' : 'Sincronizado'}
                                    </span>
                                </div>
                                <button
                                    onClick={saveNotesAsDocument}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
                                >
                                    <FileText size={14} />
                                    Convertir en Documento
                                </button>
                            </div>
                        </div>
                        <div className="bg-slate-900 rounded-[3rem] border border-slate-800 p-10 shadow-2xl flex group focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all">
                            <textarea
                                className="w-full bg-transparent border-none focus:outline-none resize-none text-xl font-medium leading-relaxed text-slate-100 placeholder:text-slate-600 font-serif"
                                placeholder="Escribe tus ideas, planes o reflexiones aquí..."
                                value={notes}
                                onChange={(e) => {
                                    const newNotes = e.target.value;
                                    setNotes(newNotes);
                                    onNotesChange(newNotes);
                                    setIsSaving(true);
                                    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                                    saveTimeoutRef.current = setTimeout(() => setIsSaving(false), 1000);
                                }}
                                rows={16}
                            />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'documents' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4">
                    <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3 mb-10">
                            <FileText className="text-indigo-600" size={24} /> Documentos Privados
                        </h3>
                        {documents.length === 0 ? (
                            <div className="p-24 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] bg-slate-50/50 dark:bg-slate-800/50">
                                <FileText size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                                <p className="text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest">No hay documentos guardados</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                                {documents.map(doc => (
                                    <div key={doc.id} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 group hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                                        <div className="flex flex-col h-full">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-6">
                                                <FileText size={24} />
                                            </div>
                                            <h4 className="font-black text-slate-800 dark:text-white text-sm mb-1 truncate">{doc.name}</h4>
                                            <p className="text-[9px] font-bold text-slate-400 mb-6">{doc.uploadDate}</p>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-4 mb-8 flex-1 leading-relaxed">{doc.content}</p>
                                            <button
                                                onClick={() => {
                                                    const content = doc.content || '';
                                                    setNotes(content);
                                                    onLoadDocument(content);
                                                    setActiveTab('notebook');
                                                }}
                                                className="w-full py-3.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 hover:bg-slate-900 dark:hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <Edit3 size={16} /> Editar en Cuaderno
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotebookView;
