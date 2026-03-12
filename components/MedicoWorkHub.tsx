// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, addDoc, deleteDoc, query, orderBy, getDocs, updateDoc } from 'firebase/firestore';
import {
    Layout,
    Target,
    Calendar as CalendarIcon,
    BookOpen,
    Bell,
    Briefcase,
    Plus,
    CheckCircle2,
    Clock,
    ChevronLeft,
    ChevronRight,
    Trash2,
    ExternalLink,
    Search,
    Stethoscope,
    StickyNote,
    AlertCircle,
    Send,
    Sparkles,
    Bot,
    MessageSquare,
    Loader2,
    FileText,
    Layers,
    X,
    PlusCircle,
    Info,
    Pin,
    Download,
    Check,
    FileEdit,
    BrainCircuit,
    Volume2,
    Play,
    Pause,
    Paperclip,
    ShoppingCart,
    CalendarDays,
    ListTodo,
    UserRound,
    History
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE ---
// Adaptación para entorno Vite/React estándar si las variables globales no están definidas
const getFirebaseConfig = () => {
    try {
        // Si existe la global inyectada por el usuario
        if (typeof __firebase_config !== 'undefined') return JSON.parse(__firebase_config);

        // Fallback a variables de entorno VITE
        return {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_FIREBASE_APP_ID
        };
    } catch (e) {
        console.warn("Using fallback firebase config");
        return {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_FIREBASE_APP_ID
        };
    }
};

let app: any = null;
let auth: any = null;
let db: any = null;
let firebaseReady = false;

try {
    const firebaseConfig = getFirebaseConfig();
    if (firebaseConfig.apiKey) {
        app = initializeApp(firebaseConfig, 'medico-workhub');
        auth = getAuth(app);
        db = getFirestore(app);
        firebaseReady = true;
        console.log('✅ MedicoWorkHub Firebase initialized');
    } else {
        console.warn('⚠️ MedicoWorkHub: Firebase API key not configured. Firebase features disabled.');
    }
} catch (e) {
    console.warn('⚠️ MedicoWorkHub: Firebase initialization failed. Running without Firebase.', e);
}

const getAppId = () => {
    if (typeof __app_id !== 'undefined') return __app_id;
    return 'medico-workhub-2026';
};
const appId = getAppId();
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

export default function MedicoWorkHub() {
    // --- ESTADOS PRINCIPALES ---
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('workhub');
    const [currentDate, setCurrentDate] = useState(new Date());

    // Datos Generales
    const [objectives, setObjectives] = useState([]);
    const [tasks, setTasks] = useState([]); // Tareas del WorkHub (Panel)
    const [todoNotes, setTodoNotes] = useState([]); // Tareas del Cuaderno Digital
    const [patientSources, setPatientSources] = useState([]); // NotebookLM de Pacientes
    const [jobOffers, setJobOffers] = useState([]);
    const [vipTasks, setVipTasks] = useState([]); // Tareas VIP
    const [loadingJobs, setLoadingJobs] = useState(false);

    // Estados de Formularios
    const [newObj, setNewObj] = useState({ title: '', deadline: '' });
    const [newTask, setNewTask] = useState({ title: '', deadline: '' });
    const [newTodo, setNewTodo] = useState({ title: '', category: 'Pendiente' });
    const [newSourceTitle, setNewSourceTitle] = useState('');
    const [showAddSource, setShowAddSource] = useState(false);
    const [newVipTask, setNewVipTask] = useState('');

    // Estados de IA y Audio
    const [activeSourceId, setActiveSourceId] = useState(null);
    const [aiChat, setAiChat] = useState([]);
    const [aiInput, setAiInput] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);

    // Refs
    const audioRef = useRef(null);
    const chatEndRef = useRef(null);

    // --- AUTENTICACIÓN (REGLA 3) ---
    useEffect(() => {
        if (!firebaseReady || !auth) return;
        const initAuth = async () => {
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (err) { console.error("Auth error:", err); }
        };
        initAuth();
        const unsubscribe = onAuthStateChanged(auth, (u) => { if (u) setUser(u); });
        return () => unsubscribe();
    }, []);

    // --- ESCUCHADORES DE FIRESTORE (REGLAS 1 Y 2) ---
    useEffect(() => {
        if (!user || !firebaseReady || !db) return;

        // Escuchar Objetivos e Hitos
        const unsubObj = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'objectives'), (s) => setObjectives(s.docs.map(d => ({ id: d.id, ...d.data() }))));

        // Escuchar Tareas del Panel
        const unsubTasks = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'tasks'), (s) => setTasks(s.docs.map(d => ({ id: d.id, ...d.data() }))));

        // Escuchar Tareas del Cuaderno Digital
        const unsubTodo = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'digital_todo'), (s) => setTodoNotes(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))));

        // Escuchar Fuentes de Pacientes (NotebookLM)
        const unsubSources = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'patient_lm'), (s) => {
            const docs = s.docs.map(d => ({ id: d.id, ...d.data() }));
            setPatientSources(docs.sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1)));
            if (docs.length > 0 && !activeSourceId) setActiveSourceId(docs[0].id);
        });

        // Escuchar Tareas VIP
        const unsubVip = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'vip_tasks'), (s) => setVipTasks(s.docs.map(d => ({ id: d.id, ...d.data() }))));

        return () => { unsubObj(); unsubTasks(); unsubTodo(); unsubSources(); unsubVip(); };
    }, [user]);

    // --- IA ENGINE (CON REINTENTOS) ---
    const callGemini = async (payload, endpoint = "generateContent", model = "gemini-2.5-flash-preview-09-2025", retries = 5, delay = 1000) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}?key=${apiKey}`;
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.json();
            } catch (err) {
                if (i === retries - 1) throw err;
                await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
            }
        }
    };

    // --- ASISTENTE DE PACIENTES ---
    const askAiAssistant = async () => {
        if (!aiInput.trim() || isAiLoading) return;
        const userMsg = aiInput;
        setAiChat(prev => [...prev, { role: 'user', text: userMsg }]);
        setAiInput(''); setIsAiLoading(true);
        try {
            const context = patientSources.map(s => `PACIENTE: ${s.title}\nANOTACIONES: ${s.content}`).join("\n\n---\n\n");
            const payload = {
                contents: [{ parts: [{ text: userMsg }] }],
                systemInstruction: { parts: [{ text: `Eres un asistente de gestión de pacientes. Tu contexto actual son estas fichas clínicas: ${context}. Responde basándote en los datos anonimizados de forma concisa.` }] }
            };
            const res = await callGemini(payload);
            const text = res?.candidates?.[0]?.content?.parts?.[0]?.text || "No pude procesar la consulta.";
            setAiChat(prev => [...prev, { role: 'ai', text }]);
        } catch (e) {
            setAiChat(prev => [...prev, { role: 'ai', text: "Error de conexión con el asistente clínico. Por favor, inténtalo de nuevo." }]);
        } finally { setIsAiLoading(false); }
    };

    // --- AUDIO RESUMEN ---
    const pcmToWav = (pcmBase64, sampleRate = 24000) => {
        try {
            const binaryString = window.atob(pcmBase64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
            const wavHeader = new ArrayBuffer(44);
            const view = new DataView(wavHeader);
            const writeString = (offset, string) => {
                for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
            };
            writeString(0, 'RIFF'); view.setUint32(4, 36 + bytes.length, true);
            writeString(8, 'WAVE'); writeString(12, 'fmt ');
            view.setUint32(16, 16, true); view.setUint16(20, 1, true);
            view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
            view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true);
            view.setUint16(34, 16, true); writeString(36, 'data');
            view.setUint32(40, bytes.length, true);
            return URL.createObjectURL(new Blob([wavHeader, bytes], { type: 'audio/wav' }));
        } catch (e) { return null; }
    };

    const handleGenerateAudio = async () => {
        if (patientSources.length === 0 || isAudioLoading) return;
        setIsAudioLoading(true); setAudioUrl(null);
        try {
            const context = patientSources.map(s => `PACIENTE: ${s.title}\nDATOS: ${s.content}`).join("\n\n");
            const payload = {
                contents: [{ parts: [{ text: `Resume los puntos más importantes de estos casos de pacientes para que el doctor los escuche. Sé profesional:\n${context}` }] }],
                generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } } }
            };
            const data = await callGemini(payload, "generateContent", "gemini-2.5-flash-preview-tts");
            const audioPart = data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (audioPart?.inlineData?.data) setAudioUrl(pcmToWav(audioPart.inlineData.data));
        } catch (err) { console.error(err); } finally { setIsAudioLoading(false); }
    };

    // --- ACCIONES DE DATOS ---
    const updateSourceContent = async (text) => { if (user && activeSourceId && firebaseReady && db) await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'patient_lm', activeSourceId), { content: text, updatedAt: new Date().toISOString() }); };
    const addPatientSource = async () => {
        if (!user || !newSourceTitle.trim() || !firebaseReady || !db) return;
        const docRef = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'patient_lm'), { title: newSourceTitle.trim(), content: '', pinned: false, createdAt: new Date().toISOString() });
        setNewSourceTitle(''); setShowAddSource(false); setActiveSourceId(docRef.id);
    };
    const addItem = async (col, item) => { if (user && item.title?.trim() && firebaseReady && db) await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, col), { ...item, createdAt: new Date().toISOString() }); };
    const deleteItem = async (col, id) => { if (user && firebaseReady && db) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, col, id)); };

    const fetchJobs = useCallback(async () => {
        if (!user) return;
        setLoadingJobs(true);
        try {
            const payload = {
                contents: [{ parts: [{ text: "Busca 3 ofertas médico familia Barcelona reales. Devuelve un objeto JSON con la propiedad 'jobs' que contenga 'title', 'company' y 'link'." }] }],
                generationConfig: { responseMimeType: "application/json" }
            };
            const res = await callGemini(payload);
            const text = res?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
            const parsed = JSON.parse(text);
            if (parsed.jobs) setJobOffers(parsed.jobs);
        } catch (e) {
            console.error("Jobs fetch error:", e);
        } finally { setLoadingJobs(false); }
    }, [user]);

    useEffect(() => { fetchJobs(); }, [fetchJobs]);

    // --- COMPONENTES UI ---
    const TabBtn = ({ active, onClick, icon, label }) => (
        <button onClick={onClick} className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-bold text-xs transition-all duration-300 ${active ? 'bg-white text-blue-600 shadow-xl border border-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}>
            <span className={active ? 'text-blue-600' : 'text-slate-300'}>{icon}</span>
            <span className="uppercase tracking-tighter">{label}</span>
        </button>
    );

    const activeSource = patientSources.find(s => s.id === activeSourceId);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-blue-100">
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex flex-wrap justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600 p-2.5 rounded-[1.2rem] text-white shadow-xl shadow-blue-200"><Stethoscope size={24} /></div>
                    <div>
                        <h1 className="text-xl font-black tracking-tighter text-slate-800 uppercase leading-none">WorkHub <span className="text-blue-600">Med</span></h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestión Médica 2.0</p>
                    </div>
                </div>
                <nav className="flex gap-2 bg-slate-100 p-1.5 rounded-[1.8rem]">
                    <TabBtn active={activeTab === 'workhub'} onClick={() => setActiveTab('workhub')} icon={<Layout size={18} />} label="Panel" />
                    <TabBtn active={activeTab === 'tareas'} onClick={() => setActiveTab('tareas')} icon={<ListTodo size={18} />} label="Tareas" />
                    <TabBtn active={activeTab === 'trabajo'} onClick={() => setActiveTab('trabajo')} icon={<Target size={18} />} label="Hitos" />
                    <TabBtn active={activeTab === 'notebook'} onClick={() => setActiveTab('notebook')} icon={<UserRound size={18} />} label="Pacientes LM" />
                </nav>
            </header>

            <main className="flex-1 p-8 max-w-[1750px] mx-auto w-full">

                {activeTab === 'workhub' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-2">
                        <div className="lg:col-span-8 space-y-8">
                            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
                                <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-10 flex items-center gap-4"><CheckCircle2 size={24} className="text-blue-500" /> Resumen de Guardia</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {tasks.slice(0, 4).map(t => (
                                        <div key={t.id} className="p-6 bg-white border-2 border-slate-50 rounded-[2rem] flex items-center justify-between shadow-sm">
                                            <span className="text-sm font-black text-slate-700 uppercase truncate">{t.title}</span>
                                            <button onClick={() => deleteItem('tasks', t.id)} className="text-slate-200 hover:text-red-500"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                    <div className="md:col-span-2 flex gap-4 mt-6">
                                        <input className="flex-1 text-sm bg-slate-50 border-none rounded-2xl px-8 py-5 outline-none shadow-inner" placeholder="Recordatorio rápido..." value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} />
                                        <button onClick={() => { addItem('tasks', newTask); setNewTask({ title: '', deadline: '' }); }} className="bg-blue-600 text-white p-5 rounded-[1.8rem] shadow-xl active:scale-95 transition-all"><Plus size={28} /></button>
                                    </div>
                                </div>
                            </div>


                            <div className="bg-slate-900 p-12 rounded-[3.5rem] text-white relative shadow-2xl overflow-hidden">
                                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none"><Search size={240} /></div>
                                <div className="flex justify-between items-center mb-12 relative z-10">
                                    <h2 className="text-3xl font-black tracking-tighter uppercase">Empleo Barcelona</h2>
                                    <button onClick={fetchJobs} className="bg-white/10 p-5 rounded-[2rem] hover:bg-white/20 transition-all"><Search size={28} /></button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                                    {jobOffers.map((j, i) => (
                                        <div key={i} className="bg-white/5 border border-white/10 p-10 rounded-[2.8rem] flex flex-col justify-between hover:bg-white/10 transition-all">
                                            <div><h3 className="font-black text-xl leading-tight mb-4 uppercase tracking-tighter">{j.title}</h3><p className="text-[10px] text-slate-400 font-black uppercase mb-8">{j.company}</p></div>
                                            <a href={j.link} target="_blank" rel="noopener noreferrer" className="mt-6 bg-blue-600 text-white text-[10px] font-black uppercase py-5 rounded-[1.8rem] text-center shadow-2xl">Ver Oferta</a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-4 space-y-8">
                            {/* --- VIP TASKS TABLE (MOVED) --- */}
                            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
                                <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-10 flex items-center gap-4"><Sparkles size={24} className="text-yellow-500" /> Tareas VIP</h2>
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <input
                                            className="flex-1 text-sm bg-slate-50 border-none rounded-2xl px-6 py-4 outline-none shadow-inner font-bold text-slate-700"
                                            placeholder="Añadir tarea VIP..."
                                            value={newVipTask}
                                            onChange={e => setNewVipTask(e.target.value)}
                                            onKeyPress={e => e.key === 'Enter' && addItem('vip_tasks', { title: newVipTask }) && setNewVipTask('')}
                                        />
                                        <button
                                            onClick={() => { addItem('vip_tasks', { title: newVipTask }); setNewVipTask(''); }}
                                            className="bg-yellow-500 text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {vipTasks.map(t => (
                                            <div key={t.id} className="p-5 bg-yellow-50 border border-yellow-100 rounded-2xl flex items-center justify-between group">
                                                <span className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                                                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                                                    {t.title}
                                                </span>
                                                <button onClick={() => deleteItem('vip_tasks', t.id)} className="text-yellow-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                        {vipTasks.length === 0 && (
                                            <div className="text-center p-6 text-slate-300 text-xs font-black uppercase tracking-widest">No hay tareas prioritarias</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                                <h2 className="text-xs font-black text-slate-300 uppercase tracking-[0.3em] mb-10 text-center font-bold">Actividad Médica</h2>
                                <div className="grid grid-cols-7 gap-3 text-center">
                                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <div key={d} className="text-[10px] font-black text-slate-200 uppercase mb-2">{d}</div>)}
                                    {Array.from({ length: 31 }).map((_, i) => (
                                        <div key={i} className={`h-12 rounded-[1.2rem] flex items-center justify-center font-black text-xs ${i + 1 === currentDate.getDate() ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 bg-slate-50 border border-slate-100'}`}>{i + 1}</div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'tareas' && (
                    <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                        <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-5 mb-12"><ListTodo size={48} className="text-blue-500" /> Cuaderno de Tareas</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 shadow-inner">
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Tarea</label>
                                <input className="w-full text-lg bg-white border-none rounded-2xl px-8 py-5 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20" placeholder="Ej: Revisar analítica de control..." value={newTodo.title} onChange={e => setNewTodo({ ...newTodo, title: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Prioridad</label>
                                <div className="flex gap-3">
                                    <select className="flex-1 bg-white border-none rounded-2xl px-6 py-5 shadow-sm outline-none text-slate-500 text-sm font-bold uppercase" value={newTodo.category} onChange={e => setNewTodo({ ...newTodo, category: e.target.value })}>
                                        <option>Urgente</option><option>Pendiente</option><option>Administrativo</option>
                                    </select>
                                    <button onClick={() => { addItem('digital_todo', newTodo); setNewTodo({ title: '', category: 'Pendiente' }); }} className="bg-blue-600 text-white px-8 rounded-2xl font-black shadow-xl active:scale-95 transition-all text-sm uppercase">Añadir</button>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            {todoNotes.map(t => (
                                <div key={t.id} className="bg-white border-2 border-slate-50 rounded-[2rem] p-8 flex items-center justify-between hover:border-blue-100 hover:shadow-xl transition-all group">
                                    <div className="flex items-center gap-6">
                                        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${t.category === 'Urgente' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>{t.category}</div>
                                        <span className="text-xl font-bold text-slate-700">{t.title}</span>
                                    </div>
                                    <button onClick={() => deleteItem('digital_todo', t.id)} className="p-4 bg-slate-50 text-slate-200 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={22} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'notebook' && (
                    <div className="h-[calc(100vh-180px)] grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in">
                        <div className="lg:col-span-3 bg-white rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                            <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center font-black">
                                <h2 className="text-xs text-slate-400 uppercase tracking-widest">Fichas Clínicas</h2>
                                <button onClick={() => setShowAddSource(!showAddSource)} className={`transition-all ${showAddSource ? 'rotate-45 text-red-500' : 'text-blue-600'}`}><PlusCircle size={24} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-3">
                                {showAddSource && (
                                    <div className="bg-blue-600 p-5 rounded-[1.8rem] shadow-2xl animate-in fade-in slide-in-from-top-4 mb-4">
                                        <input className="w-full text-xs p-4 rounded-xl border-none outline-none mb-3 bg-white/10 text-white placeholder:text-white/40 font-bold" placeholder="ID Paciente..." value={newSourceTitle} onChange={(e) => setNewSourceTitle(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addPatientSource()} />
                                        <button onClick={addPatientSource} className="w-full bg-white text-blue-600 p-3 rounded-xl text-[10px] font-black uppercase">Crear</button>
                                    </div>
                                )}
                                {patientSources.map(s => (
                                    <div key={s.id} onClick={() => setActiveSourceId(s.id)} className={`p-4 rounded-[1.4rem] cursor-pointer transition-all border flex items-center justify-between group ${activeSourceId === s.id ? 'bg-white border-blue-600 shadow-md ring-2 ring-blue-600/10' : 'bg-white border-slate-100 hover:border-blue-200'}`}>
                                        <div className="flex items-center gap-3 truncate font-black">
                                            <div className={`p-2 rounded-xl ${activeSourceId === s.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}><UserRound size={18} /></div>
                                            <span className="text-xs truncate text-slate-700 uppercase">{s.title}</span>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); deleteItem('patient_lm', s.id); }} className="text-slate-200 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"><X size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="lg:col-span-5 bg-white rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden relative">
                            {activeSource ? (
                                <div className="flex-1 flex flex-col overflow-y-auto">
                                    <div className="p-12 pb-0">
                                        <div className="flex items-start gap-6 mb-8">
                                            <div className="p-4 bg-blue-50 text-blue-600 rounded-[1.5rem] shadow-sm"><BrainCircuit size={32} /></div>
                                            <div className="flex-1">
                                                <h2 className="text-4xl font-black tracking-tighter text-slate-800 uppercase leading-none mb-3">{activeSource.title}</h2>
                                                <div className="w-20 h-2 bg-blue-600 rounded-full mb-8"></div>
                                                <div className="p-8 bg-slate-50 rounded-[2.5rem] border-l-[6px] border-blue-600 italic text-slate-500 text-sm leading-relaxed mb-12 shadow-sm font-medium">
                                                    "Análisis inteligente del expediente. Integra notas y antecedentes para optimizar la consulta."
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                                            <div className="space-y-8">
                                                <h3 className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-emerald-600"><History size={18} /> Evolución</h3>
                                                <div className="p-8 bg-emerald-50 rounded-[2.8rem] border border-emerald-100 shadow-sm min-h-[180px] flex flex-col justify-center">
                                                    <p className="text-emerald-900 font-black text-sm mb-3">Resumen IA</p>
                                                    <p className="text-emerald-700/70 text-xs leading-relaxed font-bold uppercase">Datos clínicos procesados.</p>
                                                </div>
                                            </div>
                                            <div className="space-y-8">
                                                <h3 className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-blue-600"><Bell size={18} /> Alertas</h3>
                                                <div className="p-8 bg-white rounded-[2.8rem] border-2 border-slate-50 shadow-sm min-h-[180px] relative overflow-hidden group flex flex-col justify-center">
                                                    <div className="absolute top-0 right-0 p-5 bg-[#4fb27f] text-white text-[10px] font-black uppercase rounded-bl-2xl tracking-tighter">Activa</div>
                                                    <p className="text-slate-800 font-black text-lg">Seguimiento OK</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-12 pb-12 flex-1 flex flex-col">
                                        <textarea className="flex-1 min-h-[450px] p-0 text-xl leading-relaxed outline-none resize-none bg-transparent font-serif text-slate-700" placeholder="Escribe las notas del paciente aquí..." value={activeSource.content} onChange={(e) => updateSourceContent(e.target.value)} />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-24 text-slate-300 text-center"><UserRound size={100} className="opacity-5 mb-8" /><h3 className="font-black uppercase text-lg">Selecciona un Paciente</h3></div>
                            )}
                        </div>

                        <div className="lg:col-span-4 bg-white rounded-[3rem] shadow-xl border border-blue-100 flex flex-col overflow-hidden font-black">
                            <div className="bg-blue-600 p-8 text-white flex items-center justify-between shadow-lg">
                                <div className="flex items-center gap-4"><Bot size={32} /><div><h2 className="text-lg uppercase">Asistente IA</h2><p className="text-[10px] text-blue-100 uppercase tracking-widest">{patientSources.length} fichas</p></div></div>
                                <button onClick={handleGenerateAudio} disabled={isAudioLoading || patientSources.length === 0} className={`p-3 rounded-2xl shadow-lg transition-all ${isAudioLoading ? 'bg-white/10 animate-pulse' : 'bg-white/20'}`}><Volume2 size={24} /></button>
                            </div>
                            {audioUrl && <div className="p-6 bg-blue-50 border-b border-blue-100 flex items-center gap-4 animate-in slide-in-from-top-2"><audio ref={audioRef} controls src={audioUrl} className="flex-1 h-8 filter grayscale" autoPlay /></div>}
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-blue-50/20">
                                {aiChat.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[95%] p-6 rounded-[2.2rem] text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-blue-50'}`}>{msg.text}</div>
                                    </div>
                                ))}
                                {isAiLoading && <div className="flex items-center gap-4 bg-white p-5 rounded-[1.8rem] w-fit shadow-xl"><Loader2 className="animate-spin text-blue-500" size={20} /><span className="text-[10px] uppercase">Consultando...</span></div>}
                                <div ref={chatEndRef} />
                            </div>
                            <div className="p-8 bg-white border-t border-blue-50">
                                <div className="relative flex items-center">
                                    <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-8 py-5 pr-16 text-sm outline-none focus:border-blue-600 font-medium placeholder:text-slate-300 shadow-inner" placeholder="Consulta sobre pacientes..." value={aiInput} onChange={(e) => setAiInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && askAiAssistant()} />
                                    <button onClick={askAiAssistant} disabled={isAiLoading || !aiInput.trim() || patientSources.length === 0} className="absolute right-3 p-3 bg-blue-600 text-white rounded-2xl active:scale-90 transition-transform"><Send size={24} /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'trabajo' && (
                    <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 font-black">
                        <h2 className="text-3xl text-slate-800 mb-10 flex items-center gap-4 uppercase tracking-tighter"><Target size={40} className="text-[#4fb27f]" /> Hitos Profesionales</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 relative shadow-inner">
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] text-slate-400 uppercase tracking-[0.2em] ml-4">Descripción</label>
                                <input className="w-full text-lg bg-white border-none rounded-2xl px-8 py-5 shadow-sm outline-none" placeholder="Meta..." value={newObj.title} onChange={e => setNewObj({ ...newObj, title: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] text-slate-400 uppercase tracking-[0.2em] ml-4">Fecha</label>
                                <div className="flex gap-3">
                                    <input type="date" className="flex-1 bg-white border-none rounded-2xl px-6 py-5 shadow-sm outline-none text-slate-500" value={newObj.deadline} onChange={e => setNewObj({ ...newObj, deadline: e.target.value })} />
                                    <button onClick={() => { addItem('objectives', newObj); setNewObj({ title: '', deadline: '' }); }} className="bg-[#4fb27f] text-white px-8 rounded-2xl shadow-xl active:scale-95 text-sm uppercase">Fijar</button>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {objectives.map(o => (
                                <div key={o.id} className="bg-white border-2 border-slate-50 rounded-[2.5rem] p-10 flex flex-col justify-between min-h-[220px] hover:border-[#4fb27f] transition-all group">
                                    <div><div className="flex justify-between items-start mb-8"><span className="bg-[#4fb27f]/10 text-[#4fb27f] text-[10px] px-5 py-2 rounded-full uppercase border border-[#4fb27f]/20 font-black">Meta</span><button onClick={() => deleteItem('objectives', o.id)} className="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={22} /></button></div><h3 className="text-slate-800 text-xl leading-tight uppercase">{o.title}</h3></div>
                                    <div className="flex items-center gap-3 text-slate-400 text-xs font-black pt-8 border-t border-slate-50 uppercase tracking-[0.1em]"><Clock size={18} className="text-[#4fb27f]" />{o.deadline ? o.deadline.split('-').reverse().join('/') : 'Pendiente'}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </main>

            <footer className="bg-white border-t border-slate-100 py-8 px-12 text-center text-slate-300 text-[10px] font-black uppercase tracking-[0.6em]">&copy; 2026 WorkHub Med • Sistema de Inteligencia Clínica</footer>
        </div>
    );
}
