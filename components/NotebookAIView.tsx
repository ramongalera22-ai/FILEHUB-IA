import React, { useState, useRef, useEffect } from 'react';
import {
    Book,
    FileText,
    Plus,
    Search,
    ChevronRight,
    DollarSign,
    Calendar,
    ShoppingCart,
    Info,
    ArrowLeft,
    LayoutGrid,
    MapPin,
    Clock,
    Upload,
    X,
    CheckCircle2,
    Trash2,
    Send,
    User,
    Bot,
    Loader2,
    Sparkles
} from 'lucide-react';

interface Notebook {
    id: string;
    title: string;
    sources: string[];
    lastModified: string;
    summary: string;
    budget: {
        total: number;
        breakdown: { label: string; value: number }[];
    };
    groceryTips: { store: string; note: string; icon: React.ReactNode }[];
    freeMuseums: { day: string; name: string; cost: string }[];
}

const NotebookAIView = () => {
    const [view, setView] = useState('dashboard');
    const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newNotebookTitle, setNewNotebookTitle] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    // Estados para el historial de chat por cuaderno
    const [chatInput, setChatInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [chatHistory, setChatHistory] = useState<Record<string, { role: 'model' | 'user'; text: string }[]>>({
        'ny-2026': [
            { role: 'model', text: '¡Hola! He analizado tus documentos de Nueva York. ¿En qué puedo ayudarte hoy? Puedo informarte sobre el presupuesto de $2,370 o los museos gratis.' }
        ]
    });

    // Estado maestro de cuadernos
    const [notebooks, setNotebooks] = useState<Notebook[]>([
        {
            id: 'ny-2026',
            title: 'Viaje a Nueva York - Marzo 2026',
            sources: ['Booking_Confirmation.pdf', 'billetes_level.pdf', 'guia_primavera.md', 'billetes_broadway.pdf'],
            lastModified: 'Hace 2 min',
            summary: 'Planificación integral para 6 días en NYC. Incluye logística de vuelos, estancia en Queens y estrategia de ahorro en alimentación y cultura.',
            budget: {
                total: 2370,
                breakdown: [
                    { label: 'Alojamiento (LIC Plaza)', value: 792.69 },
                    { label: 'Vuelos (BCN-JFK)', value: 450 },
                    { label: 'Broadway (Chicago)', value: 228 },
                    { label: 'Comida estimada', value: 300 }
                ]
            },
            groceryTips: [
                { store: "Trader Joe's", note: "Opción más barata. Ensaladas y platos preparados por $5-$7.", icon: <ShoppingCart className="w-4 h-4" /> },
                { store: "Whole Foods", note: "Barra caliente por peso ($12-$14/lb). Útil para cenas rápidas.", icon: <Info className="w-4 h-4" /> }
            ],
            freeMuseums: [
                { day: 'Miércoles 18', name: 'Zoológico del Bronx / Museo Ciudad NY', cost: 'GRATIS' },
                { day: 'Jueves 19', name: 'Museum of Moving Image (Queens)', cost: 'GRATIS' },
                { day: 'Viernes 20', name: 'Whitney Museum / Morgan Library', cost: 'GRATIS' },
                { day: 'Sábado 21', name: 'Jewish Museum', cost: 'GRATIS' }
            ]
        }
    ]);

    const selectedNotebook = notebooks.find(nb => nb.id === selectedNotebookId);

    // Desplazamiento automático del chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory, isTyping]);

    const handleCreateNotebook = () => {
        if (!newNotebookTitle.trim()) return;
        const newId = Date.now().toString();
        const newNb: Notebook = {
            id: newId,
            title: newNotebookTitle,
            sources: [],
            lastModified: 'Recién creado',
            summary: 'Analizando fuentes para generar resumen...',
            budget: { total: 0, breakdown: [] },
            groceryTips: [],
            freeMuseums: []
        };
        setNotebooks([newNb, ...notebooks]);
        setChatHistory({ ...chatHistory, [newId]: [{ role: 'model', text: `¡Cuaderno "${newNotebookTitle}" creado con éxito! Sube archivos para empezar el análisis.` }] });
        setNewNotebookTitle('');
        setShowCreateModal(false);
    };

    const handleOpenNotebook = (nb: Notebook) => {
        setSelectedNotebookId(nb.id);
        setView('notebook-detail');
    };

    const triggerFileUpload = () => fileInputRef.current?.click();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files: File[] = event.target.files ? Array.from(event.target.files) : [];
        if (files.length === 0) return;
        setIsUploading(true);
        setTimeout(() => {
            const newFileNames = files.map(f => f.name);
            setNotebooks(prev => prev.map(nb => nb.id === selectedNotebookId ? { ...nb, sources: [...nb.sources, ...newFileNames], lastModified: 'Recién actualizado' } : nb));
            setIsUploading(false);
            setUploadSuccess(true);
            setTimeout(() => setUploadSuccess(false), 3000);
        }, 1500);
    };

    const handleDeleteSource = (sourceName: string) => {
        setNotebooks(prev => prev.map(nb => nb.id === selectedNotebookId ? { ...nb, sources: nb.sources.filter(src => src !== sourceName) } : nb));
    };

    // Llamada a la API de Gemini
    const askIA = async (prompt: string) => {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        // Updated model to stable version 1.5 flash
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        if (!selectedNotebook) return "Error: No notebook selected";
        if (!apiKey) return "Error: API Key no configurada. Revisa tu archivo .env";

        const context = `
      CUADERNO ACTUAL: ${selectedNotebook.title}
      RESUMEN DE IA: ${selectedNotebook.summary}
      PRESUPUESTO DETECTADO: $${selectedNotebook.budget.total}
      CONSEJOS DE AHORRO: ${selectedNotebook.groceryTips.map(t => t.store + ": " + t.note).join('; ')}
      AGENDA GRATUITA: ${selectedNotebook.freeMuseums.map(m => m.day + ": " + m.name).join('; ')}
    `;

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: {
                parts: [{ text: `Eres un asistente inteligente de FileHub. Responde preguntas basándote en este contexto del cuaderno: ${context}. Sé muy directo, amable y usa formato markdown si es necesario.` }]
            }
        };

        let delay = 1000;
        for (let i = 0; i < 3; i++) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (response.ok) {
                    const result = await response.json();
                    return result.candidates?.[0]?.content?.parts?.[0]?.text || "No hay respuesta disponible.";
                } else {
                    const errText = await response.text();
                    console.error("Gemini API Error:", response.status, errText);
                }
            } catch (e) {
                console.error("Fetch Error:", e);
            }
            await new Promise(r => setTimeout(r, delay));
            delay *= 2;
        }
        return "Error de red o modelo no disponible. Intenta preguntar de nuevo.";
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || isTyping || !selectedNotebookId) return;

        const userMsg = chatInput;
        setChatInput('');
        setChatHistory(prev => ({
            ...prev,
            [selectedNotebookId]: [...(prev[selectedNotebookId] || []), { role: 'user', text: userMsg }]
        }));

        setIsTyping(true);
        const response = await askIA(userMsg);
        setChatHistory(prev => ({
            ...prev,
            [selectedNotebookId]: [...(prev[selectedNotebookId] || []), { role: 'model', text: response }]
        }));
        setIsTyping(false);
    };

    return (
        <div className="bg-[#F8FAFC] text-slate-900 font-sans flex flex-col h-full rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-sm">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />

            {/* Navegación Superior */}
            <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-xl cursor-pointer hover:scale-105 transition-transform" onClick={() => setView('dashboard')}>
                        <LayoutGrid className="text-white w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-lg leading-tight text-slate-800">FileHub</span>
                        <span className="text-[10px] uppercase tracking-widest text-blue-600 font-bold">Cuadernos</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-100"
                    >
                        <Plus className="w-4 h-4" /> Nuevo Cuaderno
                    </button>
                </div>
            </nav>

            <main className="flex-grow p-6 w-full overflow-y-auto">
                {view === 'dashboard' ? (
                    <div className="animate-in fade-in duration-500">
                        <header className="mb-10">
                            <h1 className="text-3xl font-black text-slate-800 mb-2">Mis Inteligencias</h1>
                            <p className="text-slate-500 font-medium italic">Documentos que cobran vida para responder tus dudas.</p>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {notebooks.map((nb) => (
                                <div key={nb.id} onClick={() => handleOpenNotebook(nb)} className="group bg-white border border-slate-200 rounded-3xl p-6 hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col h-full relative">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <Book className="w-6 h-6" />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full uppercase tracking-wider">{nb.lastModified}</span>
                                    </div>
                                    <h3 className="font-bold text-xl mb-3 text-slate-800 group-hover:text-blue-600 transition-colors">{nb.title}</h3>
                                    <p className="text-slate-500 text-sm mb-6 flex-grow line-clamp-3">{nb.summary}</p>
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                            <FileText className="w-3.5 h-3.5" />
                                            <span>{nb.sources.length} Archivos</span>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    selectedNotebook && (
                        <div className="animate-in slide-in-from-bottom-6 duration-700 grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                            {/* Barra Lateral: Fuentes y Gasto */}
                            <div className="lg:col-span-3 space-y-6">
                                <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors mb-2">
                                    <ArrowLeft className="w-4 h-4" /> Volver al panel
                                </button>

                                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                                    <h4 className="font-bold text-xs uppercase tracking-[0.2em] text-slate-400 mb-5 flex items-center justify-between">
                                        Fuentes <span>{selectedNotebook.sources.length}</span>
                                    </h4>
                                    <div className="space-y-2 mb-6 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                                        {selectedNotebook.sources.map((src, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-[#F8FAFC] hover:bg-blue-50 rounded-2xl group transition-all border border-transparent hover:border-blue-100">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                                    <span className="text-xs font-bold text-slate-600 truncate">{src}</span>
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteSource(src) }} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={triggerFileUpload}
                                        disabled={isUploading}
                                        className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 text-xs font-bold transition-all disabled:opacity-50"
                                    >
                                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Upload className="w-4 h-4" />}
                                        {isUploading ? 'Procesando...' : 'Añadir Archivos'}
                                    </button>
                                </div>

                                {selectedNotebook.budget.total > 0 && (
                                    <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
                                        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">Análisis de Gastos</h4>
                                        <div className="text-4xl font-black mb-6">${selectedNotebook.budget.total.toLocaleString()}</div>
                                        <div className="space-y-3">
                                            {selectedNotebook.budget.breakdown.map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-xs border-b border-white/5 pb-2">
                                                    <span className="text-slate-400">{item.label}</span>
                                                    <span className="font-bold">${item.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Contenido Principal y Chat */}
                            <div className="lg:col-span-9 flex flex-col space-y-6">
                                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-blue-50 rounded-bl-full opacity-50"></div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Sparkles className="w-5 h-5 text-blue-500" />
                                            <h2 className="text-3xl font-black text-slate-800">{selectedNotebook.title}</h2>
                                        </div>
                                        <p className="text-slate-600 leading-relaxed font-medium italic border-l-4 border-blue-500 pl-4 bg-slate-50 py-3 rounded-r-2xl max-w-2xl mb-8">
                                            "{selectedNotebook.summary}"
                                        </p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {selectedNotebook.groceryTips.length > 0 && (
                                                <div>
                                                    <h3 className="flex items-center gap-2 font-black text-slate-700 mb-4 uppercase tracking-tighter">
                                                        <ShoppingCart className="w-5 h-5 text-green-500" /> Estrategia de Ahorro
                                                    </h3>
                                                    <div className="space-y-3">
                                                        {selectedNotebook.groceryTips.map((tip, idx) => (
                                                            <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                                                <div className="font-bold text-sm text-slate-700 mb-1 flex items-center gap-2">
                                                                    <span className="bg-green-50 text-green-600 p-1.5 rounded-lg">{tip.icon}</span> {tip.store}
                                                                </div>
                                                                <p className="text-xs text-slate-500 font-medium pl-9 leading-relaxed">{tip.note}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {selectedNotebook.freeMuseums.length > 0 && (
                                                <div>
                                                    <h3 className="flex items-center gap-2 font-black text-slate-700 mb-4 uppercase tracking-tighter">
                                                        <Calendar className="w-5 h-5 text-orange-500" /> Agenda Gratuita
                                                    </h3>
                                                    <div className="bg-[#F8FAFC] rounded-2xl overflow-hidden border border-slate-100">
                                                        {selectedNotebook.freeMuseums.map((item, idx) => (
                                                            <div key={idx} className="flex items-center justify-between p-4 border-b border-white last:border-0">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.day}</span>
                                                                    <span className="text-xs font-bold text-slate-700">{item.name}</span>
                                                                </div>
                                                                <span className="bg-green-500 text-white text-[9px] font-black px-2 py-1 rounded-md tracking-wider uppercase">
                                                                    {item.cost}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Sección de Chat IA */}
                                <div className="flex-grow flex flex-col bg-[#0F172A] rounded-[2.5rem] shadow-2xl overflow-hidden min-h-[500px] border border-slate-800">
                                    <div className="px-8 py-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-blue-900/40">
                                                <Sparkles className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-sm">Consulta al Cuaderno</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">IA sincronizada</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-grow p-8 overflow-y-auto space-y-6 custom-scrollbar scroll-smooth">
                                        {(chatHistory[selectedNotebookId!] || []).map((msg, idx) => (
                                            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-800'} shadow-md`}>
                                                    {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-blue-400" />}
                                                </div>
                                                <div className={`max-w-[75%] p-5 rounded-3xl text-sm leading-relaxed font-medium ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-900/20' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                                                    {msg.text}
                                                </div>
                                            </div>
                                        ))}
                                        {isTyping && (
                                            <div className="flex gap-4 items-center animate-pulse">
                                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center"><Bot className="w-4 h-4 text-blue-400" /></div>
                                                <div className="bg-slate-800 border border-slate-700 px-4 py-3 rounded-full flex gap-1">
                                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={chatEndRef} />
                                    </div>

                                    <div className="p-8 bg-slate-900/80 border-t border-slate-800">
                                        <form onSubmit={handleSendMessage} className="relative">
                                            <input
                                                type="text"
                                                value={chatInput}
                                                onChange={(e) => setChatInput(e.target.value)}
                                                placeholder="Pregunta algo sobre este cuaderno..."
                                                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-5 pl-6 pr-20 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                                disabled={isTyping}
                                            />
                                            <button
                                                type="submit"
                                                disabled={!chatInput.trim() || isTyping}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold text-xs uppercase px-6 py-3 rounded-xl transition-all shadow-lg active:scale-95"
                                            >
                                                {isTyping ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Enviar'}
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                )}

                {/* Modal de Creación */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                            <h2 className="text-2xl font-black text-slate-800 mb-2 text-center">Nuevo Cuaderno</h2>
                            <p className="text-slate-500 text-sm mb-6 font-medium text-center">Escribe un nombre para tu nuevo proyecto.</p>
                            <input
                                autoFocus
                                type="text"
                                value={newNotebookTitle}
                                onChange={(e) => setNewNotebookTitle(e.target.value)}
                                placeholder="Ej: Proyecto Rediseño Web"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold mb-6 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <div className="flex gap-3">
                                <button onClick={() => setShowCreateModal(false)} className="flex-grow py-4 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">Cancelar</button>
                                <button onClick={handleCreateNotebook} className="flex-grow bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all shadow-blue-100">Crear</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
      `}</style>
        </div>
    );
};

export default NotebookAIView;
