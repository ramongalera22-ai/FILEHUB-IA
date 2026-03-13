
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Briefcase, MapPin, Building2, Euro, Clock, Send,
    RefreshCw, Mail, Trash2, Wifi, WifiOff, Sparkles,
    CheckCircle2, AlertTriangle, Settings, Eye, Users, GraduationCap,
    Search, Globe, ExternalLink, MessageSquare
} from 'lucide-react';

// ============ TYPES ============
interface JobOffer {
    id: string;
    title: string;
    company: string;
    salary: string;
    location: string;
    type: string; // jornada
    description: string;
    rawText: string;
    timestamp: number;
    source: 'whatsapp' | 'manual';
    sent: boolean;
    url?: string;          // enlace directo a la oferta
    senderPhone?: string;  // para responder por WA
    senderName?: string;
}

interface EmailConfig {
    gmailUser: string;
    gmailAppPassword: string;
    recipientEmail: string;
}

const WA_SERVER = import.meta.env.VITE_WA_SERVER_URL || 'https://whatsapp-filehub-production.up.railway.app';
const WA_WS = import.meta.env.VITE_WA_WS_URL || 'wss://whatsapp-filehub-production.up.railway.app/ws';
const STORAGE_KEY = 'filehub_jobs_data';
const EMAIL_CONFIG_KEY = 'filehub_email_config';

// ============ HELPER: Parse job from text ============
function parseJobFromText(text: string, msgId: string, timestamp: number, senderPhone?: string, senderName?: string): JobOffer | null {
    const t = text.toLowerCase();

    const hasJobKeyword = ['oferta', 'puesto', 'empleo', 'trabajo', 'vacante', 'contrato', 'selección', 'candidat'].some(k => t.includes(k));
    const hasDetailKeyword = ['salario', '€', 'eur', 'empresa', 'jornada', 'requisitos', 'experiencia', 'contrat', 'funciones', 'incorporación', 'sueldo'].some(k => t.includes(k));

    if (!hasJobKeyword || !hasDetailKeyword) return null;

    const extractLine = (keyword: string): string => {
        const regex = new RegExp(`${keyword}[:\\*\\s]*(.*)`, 'i');
        const match = text.match(regex);
        return match ? match[1].trim().replace(/\*+/g, '').trim() : '';
    };

    // Extract URL/link
    const urlMatch = text.match(/https?:\/\/[^\s\)>\"]+/);
    const url = urlMatch ? urlMatch[0] : undefined;

    // Extract salary
    const salaryMatch = text.match(/(\d[\d.,]*)\s*€/);
    const salaryFromLine = extractLine('Salario') || extractLine('Sueldo') || extractLine('Retribución');
    const salary = salaryFromLine || (salaryMatch ? salaryMatch[0] : 'A consultar');

    // Extract company
    const company = extractLine('Empresa') || extractLine('Compañía') || extractLine('Cliente') || 'No especificada';

    // Extract location
    const location = extractLine('Ubicación') || extractLine('Zona') || extractLine('Ciudad') ||
        extractLine('Localización') || extractLine('Lugar') || 'No especificada';

    // Extract type (jornada)
    const type = extractLine('Jornada') || extractLine('Horario') || extractLine('Tipo') ||
        extractLine('Modalidad') || extractLine('Contrato') || 'No especificada';

    // Extract title
    const title = extractLine('Puesto') || extractLine('Oferta') || extractLine('Vacante') ||
        extractLine('Título') || extractLine('Posición') ||
        text.split('\n').find(l => l.trim().length > 5 && l.trim().length < 80)?.replace(/\*+/g, '').trim() ||
        'Oferta detectada';

    return {
        id: `wa_job_${msgId}_${timestamp}`,
        title: title.substring(0, 80),
        company: company.substring(0, 60),
        salary,
        location: location.substring(0, 60),
        type: type.substring(0, 40),
        description: text.length > 200 ? text.substring(0, 200) + '...' : text,
        rawText: text,
        timestamp,
        source: 'whatsapp',
        sent: false,
        url,
        senderPhone,
        senderName
    };
}

// ============ COMPONENT ============
const JobsView: React.FC = () => {
    const [jobs, setJobs] = useState<JobOffer[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const [isSyncing, setIsSyncing] = useState(false);
    const [wsConnected, setWsConnected] = useState(false);
    const [showEmailConfig, setShowEmailConfig] = useState(false);
    const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
    const [sendingAll, setSendingAll] = useState(false);
    const [selectedJob, setSelectedJob] = useState<JobOffer | null>(null);
    const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [sendingWaId, setSendingWaId] = useState<string | null>(null);

    // Scraping state
    const [isScraping, setIsScraping] = useState(false);
    const [showScrapeConfig, setShowScrapeConfig] = useState(false);
    const [scrapeConfig, setScrapeConfig] = useState({
        query: 'desarrollador',
        city: 'barcelona',
        maxItems: 20
    });

    const [emailConfig, setEmailConfig] = useState<EmailConfig>(() => {
        try {
            const saved = localStorage.getItem(EMAIL_CONFIG_KEY);
            return saved ? JSON.parse(saved) : { gmailUser: '', gmailAppPassword: '', recipientEmail: '' };
        } catch { return { gmailUser: '', gmailAppPassword: '', recipientEmail: '' }; }
    });

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectRef = useRef<NodeJS.Timeout | null>(null);

    // Persist
    useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs)); }, [jobs]);
    useEffect(() => { localStorage.setItem(EMAIL_CONFIG_KEY, JSON.stringify(emailConfig)); }, [emailConfig]);

    const notify = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
        setNotification({ text, type });
        setTimeout(() => setNotification(null), 4000);
    }, []);

    // ======== WEBSOCKET ========
    const processMessage = useCallback((msg: any) => {
        if (!msg.body) return;
        const parsed = parseJobFromText(msg.body, msg.id, msg.timestamp, msg.from, msg.fromName);
        if (parsed) {
            setJobs(prev => {
                if (prev.some(j => j.id === parsed.id)) return prev;
                return [parsed, ...prev];
            });
        }
    }, []);

    const connectWS = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        try {
            const ws = new WebSocket(WA_WS);
            ws.onopen = () => setWsConnected(true);
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'message') processMessage(data.message);
                    if (data.type === 'history' && data.messages) data.messages.forEach((m: any) => processMessage(m));
                } catch { }
            };
            ws.onclose = () => { setWsConnected(false); wsRef.current = null; reconnectRef.current = setTimeout(connectWS, 4000); };
            ws.onerror = () => setWsConnected(false);
            wsRef.current = ws;
        } catch { setWsConnected(false); }
    }, [processMessage]);

    useEffect(() => {
        connectWS();
        return () => { wsRef.current?.close(); if (reconnectRef.current) clearTimeout(reconnectRef.current); };
    }, [connectWS]);

    // ======== MANUAL SYNC ========
    const syncFromServer = async () => {
        setIsSyncing(true);
        try {
            const res = await fetch(`${WA_SERVER}/messages/classified`);
            const data = await res.json();
            let count = 0;
            if (data.jobs) {
                data.jobs.forEach((msg: any) => {
                    const parsed = parseJobFromText(msg.body, msg.id, msg.timestamp);
                    if (parsed) {
                        setJobs(prev => {
                            if (prev.some(j => j.id === parsed.id)) return prev;
                            count++;
                            return [parsed, ...prev];
                        });
                    }
                });
            }
            notify(count > 0 ? `✅ ${count} nuevas ofertas importadas` : 'No se encontraron nuevas ofertas', count > 0 ? 'success' : 'info');
        } catch {
            notify('Error al conectar con el servidor WhatsApp', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    // ======== APIFY SCRAPING ========
    const scrapeJobsFromApify = async () => {
        setIsScraping(true);
        try {
            const res = await fetch(`${WA_SERVER}/scrape/jobs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scrapeConfig)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error de scraping');
            if (data.jobs && data.jobs.length > 0) {
                setJobs(prev => {
                    const newJobs = data.jobs.filter((j: JobOffer) => !prev.some(e => e.id === j.id));
                    return [...newJobs, ...prev];
                });
                notify(`✅ ${data.count} ofertas encontradas via web scraping`, 'success');
            } else {
                notify('No se encontraron ofertas con esos filtros', 'info');
            }
        } catch (err: any) {
            notify(`Error scraping: ${err.message}`, 'error');
        } finally {
            setIsScraping(false);
        }
    };

    // ======== EMAIL ========
    const generateEmailHTML = (job: JobOffer): string => {
        return `
        <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden;">
            <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6); padding:24px; color:white;">
                <h1 style="margin:0; font-size:20px;">💼 ${job.title}</h1>
                <p style="margin:8px 0 0; opacity:0.9; font-size:14px;">Enviado desde FileHub IA</p>
            </div>
            <div style="padding:24px;">
                <table style="width:100%; border-collapse:collapse;">
                    <tr><td style="padding:8px 0; color:#64748b; font-size:13px;">🏢 Empresa</td><td style="padding:8px 0; font-weight:600; font-size:14px;">${job.company}</td></tr>
                    <tr><td style="padding:8px 0; color:#64748b; font-size:13px;">💶 Salario</td><td style="padding:8px 0; font-weight:700; color:#6366f1; font-size:16px;">${job.salary}</td></tr>
                    <tr><td style="padding:8px 0; color:#64748b; font-size:13px;">📍 Ubicación</td><td style="padding:8px 0; font-weight:600; font-size:14px;">${job.location}</td></tr>
                    <tr><td style="padding:8px 0; color:#64748b; font-size:13px;">📋 Jornada</td><td style="padding:8px 0; font-weight:600; font-size:14px;">${job.type}</td></tr>
                </table>
                <hr style="border:none; border-top:1px solid #e2e8f0; margin:16px 0;">
                <p style="color:#334155; font-size:13px; line-height:1.6; white-space:pre-wrap;">${job.rawText}</p>
            </div>
            <div style="background:#f8fafc; padding:16px 24px; text-align:center; font-size:11px; color:#94a3b8;">
                FileHub IA · Ofertas de Empleo · ${new Date().toLocaleDateString('es-ES')}
            </div>
        </div>`;
    };

    const sendEmail = async (job: JobOffer) => {
        if (!emailConfig.gmailUser || !emailConfig.gmailAppPassword) { setShowEmailConfig(true); notify('Configura tu Gmail primero', 'error'); return; }
        const recipient = emailConfig.recipientEmail || emailConfig.gmailUser;
        setSendingEmailId(job.id);
        try {
            const res = await fetch(`${WA_SERVER}/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: recipient,
                    subject: `💼 Empleo: ${job.title} - ${job.company}`,
                    html: generateEmailHTML(job),
                    gmailUser: emailConfig.gmailUser,
                    gmailAppPassword: emailConfig.gmailAppPassword
                })
            });
            const result = await res.json();
            if (result.success) {
                setJobs(prev => prev.map(j => j.id === job.id ? { ...j, sent: true } : j));
                notify(`✅ Email enviado a ${recipient}`, 'success');
            } else { notify(`Error: ${result.error}`, 'error'); }
        } catch { notify('Error de conexión con el servidor', 'error'); }
        finally { setSendingEmailId(null); }
    };

    const sendAllByEmail = async () => {
        if (!emailConfig.gmailUser || !emailConfig.gmailAppPassword) { setShowEmailConfig(true); return; }
        const unsent = jobs.filter(j => !j.sent);
        if (unsent.length === 0) { notify('No hay ofertas pendientes de enviar', 'info'); return; }

        setSendingAll(true);
        const recipient = emailConfig.recipientEmail || emailConfig.gmailUser;
        const allHTML = unsent.map(j => generateEmailHTML(j)).join('<br/><br/>');
        try {
            const res = await fetch(`${WA_SERVER}/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: recipient,
                    subject: `💼 ${unsent.length} Ofertas de empleo - FileHub IA`,
                    html: `<h2 style="font-family:sans-serif; color:#0f172a;">📋 Resumen de ${unsent.length} ofertas</h2>${allHTML}`,
                    gmailUser: emailConfig.gmailUser,
                    gmailAppPassword: emailConfig.gmailAppPassword
                })
            });
            const result = await res.json();
            if (result.success) {
                setJobs(prev => prev.map(j => ({ ...j, sent: true })));
                notify(`✅ ${unsent.length} ofertas enviadas a ${recipient}`, 'success');
            } else { notify(`Error: ${result.error}`, 'error'); }
        } catch { notify('Error de conexión', 'error'); }
        finally { setSendingAll(false); }
    };

    const sendWaMessage = async (job: JobOffer) => {
        if (!job.senderPhone) {
            notify('No hay número de WhatsApp para esta oferta', 'error');
            return;
        }
        setSendingWaId(job.id);
        const msg = `Hola, he visto la oferta de trabajo "${job.title}" en ${job.company}. Me gustaría recibir más información. Gracias.`;
        try {
            const res = await fetch(`${WA_SERVER}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: job.senderPhone, message: msg })
            });
            const result = await res.json();
            if (result.success) {
                notify('✅ Mensaje WhatsApp enviado', 'success');
            } else {
                notify(`Error: ${result.error || 'No se pudo enviar'}`, 'error');
            }
        } catch {
            notify('Error de conexión con el servidor WhatsApp', 'error');
        } finally {
            setSendingWaId(null);
        }
    };

    const deleteJob = (id: string) => { setJobs(prev => prev.filter(j => j.id !== id)); if (selectedJob?.id === id) setSelectedJob(null); };
    const clearAll = () => { if (confirm('¿Eliminar todas las ofertas guardadas?')) { setJobs([]); setSelectedJob(null); } };

    // ======== RENDER ========
    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">

            {/* Notification */}
            {notification && (
                <div className={`mx-6 mt-4 px-5 py-3 rounded-2xl text-sm font-bold flex items-center gap-3 shadow-lg animate-pulse ${notification.type === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : notification.type === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                        : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'
                    }`}>
                    {notification.type === 'success' ? <CheckCircle2 size={18} /> : notification.type === 'error' ? <AlertTriangle size={18} /> : <Sparkles size={18} />}
                    {notification.text}
                </div>
            )}

            {/* Header */}
            <header className="p-6 pb-0">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl shadow-lg shadow-indigo-500/20">
                            <Briefcase className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Ofertas de Trabajo</h1>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-slate-500">{jobs.length} guardadas</span>
                                <span className="text-slate-300">•</span>
                                <span className={`text-xs font-bold flex items-center gap-1 ${wsConnected ? 'text-emerald-500' : 'text-slate-400'}`}>
                                    {wsConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                                    {wsConnected ? 'Auto-sync ON' : 'Offline'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={syncFromServer} disabled={isSyncing}
                            className="flex items-center gap-2 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-sm py-2.5 px-5 rounded-xl transition-all active:scale-95 disabled:opacity-60">
                            <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
                            Sincronizar WA
                        </button>
                        <button onClick={() => setShowScrapeConfig(!showScrapeConfig)} disabled={isScraping}
                            className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold text-sm py-2.5 px-5 rounded-xl transition-all active:scale-95 disabled:opacity-60 shadow-lg shadow-violet-500/20">
                            <Globe size={15} className={isScraping ? 'animate-spin' : ''} />
                            {isScraping ? 'Scraping...' : 'Scraping Web'}
                        </button>
                        <button onClick={sendAllByEmail} disabled={sendingAll || jobs.length === 0}
                            className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold text-sm py-2.5 px-5 rounded-xl transition-all active:scale-95 disabled:opacity-60 shadow-lg shadow-red-500/20">
                            <Mail size={15} />
                            {sendingAll ? 'Enviando...' : 'Enviar todo a Gmail'}
                        </button>
                        <button onClick={() => setShowEmailConfig(!showEmailConfig)}
                            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                            <Settings size={16} className="text-slate-500" />
                        </button>
                        {jobs.length > 0 && (
                            <button onClick={clearAll}
                                className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-colors group">
                                <Trash2 size={16} className="text-slate-400 group-hover:text-red-500" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Gmail Config */}
                {showEmailConfig && (
                    <div className="mt-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                        <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                            <Mail size={16} /> Configuración Gmail
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gmail</label>
                                <input type="email" value={emailConfig.gmailUser} onChange={e => setEmailConfig(c => ({ ...c, gmailUser: e.target.value }))}
                                    placeholder="tu@gmail.com"
                                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contraseña App</label>
                                <input type="password" value={emailConfig.gmailAppPassword} onChange={e => setEmailConfig(c => ({ ...c, gmailAppPassword: e.target.value }))}
                                    placeholder="xxxx xxxx xxxx xxxx"
                                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enviar a (opcional)</label>
                                <input type="email" value={emailConfig.recipientEmail} onChange={e => setEmailConfig(c => ({ ...c, recipientEmail: e.target.value }))}
                                    placeholder="destino@gmail.com"
                                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-3">
                            💡 Ve a <a href="https://myaccount.google.com/apppasswords" target="_blank" className="text-indigo-500 underline">myaccount.google.com/apppasswords</a> para generar una contraseña de aplicación.
                        </p>
                    </div>
                )}

                {/* Scrape Config Panel */}
                {showScrapeConfig && (
                    <div className="mt-4 p-5 bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 rounded-2xl shadow-sm">
                        <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                            <Globe size={16} className="text-violet-500" /> Scraping Web (Apify)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Búsqueda</label>
                                <input type="text" value={scrapeConfig.query} onChange={e => setScrapeConfig(c => ({ ...c, query: e.target.value }))}
                                    placeholder="desarrollador, marketing..."
                                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ciudad</label>
                                <input type="text" value={scrapeConfig.city} onChange={e => setScrapeConfig(c => ({ ...c, city: e.target.value }))}
                                    placeholder="barcelona"
                                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Máx resultados</label>
                                <input type="number" value={scrapeConfig.maxItems} onChange={e => setScrapeConfig(c => ({ ...c, maxItems: parseInt(e.target.value) || 10 }))}
                                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 outline-none" />
                            </div>
                        </div>
                        <button onClick={scrapeJobsFromApify} disabled={isScraping}
                            className="mt-4 flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold text-sm py-2.5 px-6 rounded-xl transition-all active:scale-95 disabled:opacity-60 shadow-lg shadow-violet-500/20">
                            <Search size={15} className={isScraping ? 'animate-bounce' : ''} />
                            {isScraping ? 'Buscando ofertas...' : 'Buscar ofertas'}
                        </button>
                        <p className="text-[11px] text-slate-400 mt-2">🔍 Busca ofertas en InfoJobs usando Apify. Requiere API key configurada.</p>
                    </div>
                )}
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 pt-4">
                {jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-20">
                        <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/30 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                            <Briefcase size={40} className="text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Sin ofertas todavía</h3>
                        <p className="text-slate-500 max-w-sm text-sm leading-relaxed">
                            Cuando tu bot de WhatsApp envíe ofertas de trabajo, aparecerán aquí automáticamente.
                            También puedes pulsar "Sincronizar WA" para importar del historial.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                        {jobs.map(job => (
                            <article key={job.id}
                                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col overflow-hidden">

                                {/* Card Header */}
                                <div className="relative bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-slate-800 dark:to-slate-850 p-5 flex items-center justify-between">
                                    <div className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-black text-lg px-3 py-1 rounded-xl flex items-center gap-1">
                                        <Euro size={16} />
                                        {job.salary}
                                    </div>
                                    {job.sent && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-lg">
                                            <CheckCircle2 size={12} /> Enviado
                                        </span>
                                    )}
                                </div>

                                {/* Card Body */}
                                <div className="p-5 flex-1 flex flex-col">
                                    <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug mb-2 line-clamp-2">{job.title}</h3>

                                    <div className="space-y-1.5 mb-4">
                                        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                                            <Building2 size={13} className="text-indigo-500 shrink-0" />
                                            <span className="truncate">{job.company}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                                            <MapPin size={13} className="text-indigo-500 shrink-0" />
                                            <span className="truncate">{job.location}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                                            <Clock size={13} className="text-indigo-500 shrink-0" />
                                            <span className="truncate">{job.type}</span>
                                        </div>
                                    </div>

                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 flex-1 leading-relaxed mb-4">{job.description}</p>

                                    {/* URL visible si existe */}
                                    {job.url && (
                                        <a href={job.url} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-xs font-bold text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 underline underline-offset-2 truncate mb-3 transition-colors"
                                            onClick={e => e.stopPropagation()}>
                                            <ExternalLink size={12} className="shrink-0" />
                                            Ver oferta completa
                                        </a>
                                    )}

                                    <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-3">
                                        <Clock size={10} />
                                        {new Date(job.timestamp).toLocaleString('es-ES')}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="px-5 pb-5 flex gap-2 flex-wrap">
                                    {/* Botón Aplicar (link externo) */}
                                    {job.url ? (
                                        <a href={job.url} target="_blank" rel="noopener noreferrer"
                                            className="flex-1 min-w-0 flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-indigo-500/20">
                                            <ExternalLink size={13} /> Aplicar
                                        </a>
                                    ) : (
                                        <button onClick={() => sendEmail(job)} disabled={sendingEmailId === job.id}
                                            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-red-500/10 disabled:opacity-50">
                                            {sendingEmailId === job.id
                                                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                : <><Mail size={14} /> Gmail</>}
                                        </button>
                                    )}
                                    {/* Botón WhatsApp respuesta rápida */}
                                    {job.senderPhone && (
                                        <button onClick={() => sendWaMessage(job)} disabled={sendingWaId === job.id}
                                            title="Responder por WhatsApp"
                                            className="px-3 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors disabled:opacity-50">
                                            {sendingWaId === job.id
                                                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                : <MessageSquare size={14} className="text-white" />}
                                        </button>
                                    )}
                                    {/* Email si ya hay link (ambas opciones) */}
                                    {job.url && (
                                        <button onClick={() => sendEmail(job)} disabled={sendingEmailId === job.id}
                                            title="Enviar por Gmail"
                                            className="px-3 py-2.5 bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors disabled:opacity-50">
                                            {sendingEmailId === job.id
                                                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                : <Mail size={14} className="text-white" />}
                                        </button>
                                    )}
                                    <button onClick={() => setSelectedJob(job)}
                                        className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                                        <Eye size={14} className="text-slate-500" />
                                    </button>
                                    <button onClick={() => deleteJob(job.id)}
                                        className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-colors group">
                                        <Trash2 size={14} className="text-slate-400 group-hover:text-red-500" />
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedJob && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedJob(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-black text-slate-900 dark:text-white">{selectedJob.title}</h2>
                            <button onClick={() => setSelectedJob(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
                        </div>

                        {/* Meta info */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            {selectedJob.company !== 'No especificada' && (
                                <span className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-lg font-semibold">🏢 {selectedJob.company}</span>
                            )}
                            {selectedJob.salary !== 'A consultar' && (
                                <span className="text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-lg font-semibold">💶 {selectedJob.salary}</span>
                            )}
                            {selectedJob.location !== 'No especificada' && (
                                <span className="text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-lg font-semibold">📍 {selectedJob.location}</span>
                            )}
                        </div>

                        {/* URL link */}
                        {selectedJob.url && (
                            <a href={selectedJob.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm font-bold text-indigo-500 hover:text-indigo-700 underline underline-offset-2 mb-3 transition-colors break-all">
                                <ExternalLink size={14} className="shrink-0" />
                                {selectedJob.url}
                            </a>
                        )}

                        {/* Raw text */}
                        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl mb-4">
                            {selectedJob.rawText}
                        </div>

                        {/* Sender info */}
                        {selectedJob.senderPhone && (
                            <p className="text-xs text-slate-400 mb-3">
                                📱 Enviado por: <span className="font-semibold text-slate-600 dark:text-slate-300">{selectedJob.senderName || selectedJob.senderPhone}</span>
                            </p>
                        )}

                        <div className="flex gap-2 flex-wrap">
                            {selectedJob.url && (
                                <a href={selectedJob.url} target="_blank" rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold py-3 rounded-xl transition-colors">
                                    <ExternalLink size={16} /> Ver oferta
                                </a>
                            )}
                            {selectedJob.senderPhone && (
                                <button onClick={() => { sendWaMessage(selectedJob); setSelectedJob(null); }}
                                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors">
                                    <MessageSquare size={16} /> Responder WA
                                </button>
                            )}
                            <button onClick={() => { sendEmail(selectedJob); setSelectedJob(null); }}
                                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold py-3 rounded-xl transition-colors">
                                <Mail size={16} /> Gmail
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobsView;
