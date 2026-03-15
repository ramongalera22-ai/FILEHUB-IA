
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
import { BotPanelPisos } from './BotPanel';
    Home, MapPin, Maximize2, BedDouble, Bath, Send, Sparkles,
    RefreshCw, Mail, Trash2, Wifi, WifiOff, Euro, Clock,
    CheckCircle2, AlertTriangle, Settings, ExternalLink, Eye,
    Search, Globe
} from 'lucide-react';

// ============ TYPES ============
interface Property {
    id: string;
    title: string;
    price: string;
    location: string;
    sqm: number;
    rooms: number;
    baths: number;
    description: string;
    rawText: string;
    timestamp: number;
    source: 'whatsapp' | 'manual';
    sent: boolean;
    senderPhone?: string;
    senderName?: string;
}

interface EmailConfig {
    gmailUser: string;
    gmailAppPassword: string;
    recipientEmail: string;
}

const WA_SERVER = import.meta.env.VITE_WA_SERVER_URL || 'https://whatsapp-filehub-production.up.railway.app';
const WA_WS = import.meta.env.VITE_WA_WS_URL || 'wss://whatsapp-filehub-production.up.railway.app/ws';
const STORAGE_KEY = 'filehub_pisos_data';
const EMAIL_CONFIG_KEY = 'filehub_email_config';

// ============ HELPER: Parse piso from text ============
function parsePisoFromText(text: string, msgId: string, timestamp: number, senderPhone?: string, senderName?: string): Property | null {
    const t = text.toLowerCase();

    // Must match property-related keywords
    const hasPisoKeyword = ['piso', 'vivienda', 'alquiler', 'apartamento', 'habitación', 'casa ', 'ático', 'estudio', 'loft', 'duplex', 'chalet'].some(k => t.includes(k));
    const hasDetailKeyword = ['€', 'eur', 'precio', 'mes', 'm2', 'm²', 'zona', 'barrio', 'habitaciones', 'baño', 'dormitorio'].some(k => t.includes(k));

    if (!hasPisoKeyword || !hasDetailKeyword) return null;

    const extractLine = (keyword: string): string => {
        const regex = new RegExp(`${keyword}[:\\*\\s]*(.*)`, 'i');
        const match = text.match(regex);
        return match ? match[1].trim().replace(/\*+/g, '').trim() : '';
    };

    // Extract price
    const priceMatch = text.match(/(\d[\d.,]*)\s*€/);
    const priceFromLine = extractLine('Precio') || extractLine('Valor') || extractLine('Alquiler');
    const price = priceFromLine || (priceMatch ? priceMatch[0] : 'Consultar');

    // Extract sqm
    const sqmMatch = text.match(/(\d+)\s*m[²2]/i);
    const sqmFromLine = extractLine('Metros') || extractLine('Superficie') || extractLine('m2');
    const sqm = parseInt(sqmFromLine) || (sqmMatch ? parseInt(sqmMatch[1]) : 0);

    // Extract rooms
    const roomsMatch = text.match(/(\d+)\s*(?:hab|dormitorio|habitaci)/i);
    const roomsFromLine = extractLine('Habitaciones') || extractLine('Dormitorios');
    const rooms = parseInt(roomsFromLine) || (roomsMatch ? parseInt(roomsMatch[1]) : 0);

    // Extract baths
    const bathsMatch = text.match(/(\d+)\s*(?:baño|bañ)/i);
    const bathsFromLine = extractLine('Baños');
    const baths = parseInt(bathsFromLine) || (bathsMatch ? parseInt(bathsMatch[1]) : 0);

    // Extract title
    const title = extractLine('Título') || extractLine('Vivienda') || extractLine('Piso') ||
        text.split('\n').find(l => l.trim().length > 5 && l.trim().length < 80)?.replace(/\*+/g, '').trim() ||
        'Inmueble detectado';

    // Extract location
    const location = extractLine('Zona') || extractLine('Ubicación') || extractLine('Barrio') ||
        extractLine('Dirección') || extractLine('Ciudad') || 'No especificada';

    return {
        id: `wa_piso_${msgId}_${timestamp}`,
        title: title.substring(0, 80),
        price,
        location: location.substring(0, 60),
        sqm,
        rooms,
        baths,
        description: text.length > 200 ? text.substring(0, 200) + '...' : text,
        rawText: text,
        timestamp,
        source: 'whatsapp',
        sent: false,
        senderPhone,
        senderName
    };
}

// ============ COMPONENT ============
const RealEstateView: React.FC = () => {
    // State
    const [properties, setProperties] = useState<Property[]>(() => {
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
    const [selectedPiso, setSelectedPiso] = useState<Property | null>(null);
    const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [replyText, setReplyText] = useState("");
    const [isReplyingWa, setIsReplyingWa] = useState(false);

    // Scraping state
    const [isScraping, setIsScraping] = useState(false);
    const [showScrapeConfig, setShowScrapeConfig] = useState(false);
    const [scrapeConfig, setScrapeConfig] = useState({
        city: 'barcelona',
        propertyType: 'alquiler',
        maxPrice: 1200,
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
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
    }, [properties]);

    useEffect(() => {
        localStorage.setItem(EMAIL_CONFIG_KEY, JSON.stringify(emailConfig));
    }, [emailConfig]);

    // Notification helper
    const notify = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
        setNotification({ text, type });
        setTimeout(() => setNotification(null), 4000);
    }, []);

    // ======== WEBSOCKET (auto-receive) ========
    const processMessage = useCallback((msg: any) => {
        if (!msg.body) return;
        const parsed = parsePisoFromText(msg.body, msg.id, msg.timestamp, msg.from, msg.fromName);
        if (parsed) {
            setProperties(prev => {
                if (prev.some(p => p.id === parsed.id)) return prev;
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
                    if (data.type === 'history' && data.messages) {
                        data.messages.forEach((m: any) => processMessage(m));
                    }
                } catch { }
            };
            ws.onclose = () => {
                setWsConnected(false);
                wsRef.current = null;
                reconnectRef.current = setTimeout(connectWS, 4000);
            };
            ws.onerror = () => setWsConnected(false);
            wsRef.current = ws;
        } catch { setWsConnected(false); }
    }, [processMessage]);

    useEffect(() => {
        connectWS();
        return () => {
            wsRef.current?.close();
            if (reconnectRef.current) clearTimeout(reconnectRef.current);
        };
    }, [connectWS]);

    // ======== MANUAL SYNC ========
    const syncFromServer = async () => {
        setIsSyncing(true);
        try {
            const res = await fetch(`${WA_SERVER}/messages/classified`);
            const data = await res.json();
            let count = 0;
            if (data.pisos) {
                data.pisos.forEach((msg: any) => {
                    const parsed = parsePisoFromText(msg.body, msg.id, msg.timestamp, msg.from, msg.fromName);
                    if (parsed) {
                        setProperties(prev => {
                            if (prev.some(p => p.id === parsed.id)) return prev;
                            count++;
                            return [parsed, ...prev];
                        });
                    }
                });
            }
            notify(count > 0 ? `✅ ${count} nuevos pisos importados` : 'No se encontraron nuevos pisos', count > 0 ? 'success' : 'info');
        } catch {
            notify('Error al conectar con el servidor WhatsApp', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    // ======== APIFY SCRAPING ========
    const scrapeFromApify = async () => {
        setIsScraping(true);
        try {
            const res = await fetch(`${WA_SERVER}/scrape/pisos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scrapeConfig)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error de scraping');
            if (data.pisos && data.pisos.length > 0) {
                setProperties(prev => {
                    const newPisos = data.pisos.filter((p: Property) => !prev.some(e => e.id === p.id));
                    return [...newPisos, ...prev];
                });
                notify(`✅ ${data.count} pisos encontrados via web scraping`, 'success');
            } else {
                notify('No se encontraron pisos con esos filtros', 'info');
            }
        } catch (err: any) {
            notify(`Error scraping: ${err.message}`, 'error');
        } finally {
            setIsScraping(false);
        }
    };

    // ======== EMAIL ========
    const generateEmailHTML = (prop: Property): string => {
        return `
        <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden;">
            <div style="background:linear-gradient(135deg,#059669,#10b981); padding:24px; color:white;">
                <h1 style="margin:0; font-size:20px;">🏠 ${prop.title}</h1>
                <p style="margin:8px 0 0; opacity:0.9; font-size:14px;">Enviado desde FileHub IA</p>
            </div>
            <div style="padding:24px;">
                <table style="width:100%; border-collapse:collapse;">
                    <tr><td style="padding:8px 0; color:#64748b; font-size:13px;">📍 Ubicación</td><td style="padding:8px 0; font-weight:600; font-size:14px;">${prop.location}</td></tr>
                    <tr><td style="padding:8px 0; color:#64748b; font-size:13px;">💶 Precio</td><td style="padding:8px 0; font-weight:700; color:#059669; font-size:16px;">${prop.price}</td></tr>
                    <tr><td style="padding:8px 0; color:#64748b; font-size:13px;">📐 Superficie</td><td style="padding:8px 0; font-weight:600; font-size:14px;">${prop.sqm} m²</td></tr>
                    <tr><td style="padding:8px 0; color:#64748b; font-size:13px;">🛏️ Habitaciones</td><td style="padding:8px 0; font-weight:600; font-size:14px;">${prop.rooms}</td></tr>
                    <tr><td style="padding:8px 0; color:#64748b; font-size:13px;">🛁 Baños</td><td style="padding:8px 0; font-weight:600; font-size:14px;">${prop.baths}</td></tr>
                </table>
                <hr style="border:none; border-top:1px solid #e2e8f0; margin:16px 0;">
                <p style="color:#334155; font-size:13px; line-height:1.6; white-space:pre-wrap;">${prop.rawText}</p>
            </div>
            <div style="background:#f8fafc; padding:16px 24px; text-align:center; font-size:11px; color:#94a3b8;">
                FileHub IA · Gestión Inmobiliaria · ${new Date().toLocaleDateString('es-ES')}
            </div>
        </div>`;
    };

    const sendEmail = async (prop: Property) => {
        if (!emailConfig.gmailUser || !emailConfig.gmailAppPassword) {
            setShowEmailConfig(true);
            notify('Configura tu Gmail primero', 'error');
            return;
        }
        const recipient = emailConfig.recipientEmail || emailConfig.gmailUser;
        setSendingEmailId(prop.id);
        try {
            const res = await fetch(`${WA_SERVER}/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: recipient,
                    subject: `🏠 Piso: ${prop.title} - ${prop.price}`,
                    html: generateEmailHTML(prop),
                    gmailUser: emailConfig.gmailUser,
                    gmailAppPassword: emailConfig.gmailAppPassword
                })
            });
            const result = await res.json();
            if (result.success) {
                setProperties(prev => prev.map(p => p.id === prop.id ? { ...p, sent: true } : p));
                notify(`✅ Email enviado a ${recipient}`, 'success');
            } else {
                notify(`Error: ${result.error}`, 'error');
            }
        } catch {
            notify('Error de conexión con el servidor', 'error');
        } finally {
            setSendingEmailId(null);
        }
    };

    const sendAllByEmail = async () => {
        if (!emailConfig.gmailUser || !emailConfig.gmailAppPassword) {
            setShowEmailConfig(true);
            return;
        }
        const unsent = properties.filter(p => !p.sent);
        if (unsent.length === 0) { notify('No hay pisos pendientes de enviar', 'info'); return; }

        setSendingAll(true);
        const recipient = emailConfig.recipientEmail || emailConfig.gmailUser;
        const allHTML = unsent.map(p => generateEmailHTML(p)).join('<br/><br/>');

        try {
            const res = await fetch(`${WA_SERVER}/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: recipient,
                    subject: `🏠 ${unsent.length} Pisos disponibles - FileHub IA`,
                    html: `<h2 style="font-family:sans-serif; color:#0f172a;">📋 Resumen de ${unsent.length} pisos</h2>${allHTML}`,
                    gmailUser: emailConfig.gmailUser,
                    gmailAppPassword: emailConfig.gmailAppPassword
                })
            });
            const result = await res.json();
            if (result.success) {
                setProperties(prev => prev.map(p => ({ ...p, sent: true })));
                notify(`✅ ${unsent.length} pisos enviados a ${recipient}`, 'success');
            } else {
                notify(`Error: ${result.error}`, 'error');
            }
        } catch {
            notify('Error de conexión', 'error');
        } finally {
            setSendingAll(false);
        }
    };

    const deletePiso = (id: string) => {
        setProperties(prev => prev.filter(p => p.id !== id));
        if (selectedPiso?.id === id) setSelectedPiso(null);
    };

    const clearAll = () => {
        if (confirm('¿Eliminar todos los pisos guardados?')) {
            setProperties([]);
            setSelectedPiso(null);
        }
    };

    const sendReplyWa = async (prop: Property) => {
        if (!prop.senderPhone) {
            notify('No hay número de teléfono para responder a este piso', 'error');
            return;
        }
        setIsReplyingWa(true);
        try {
            const res = await fetch(`${WA_SERVER}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: prop.senderPhone,
                    message: replyText || `Hola, me interesa el piso ubicado en ${prop.location} de ${prop.price} que encontraste.`
                })
            });
            const result = await res.json();
            if (result.success) {
                notify('✅ Mensaje de WhatsApp enviado', 'success');
                setReplyText('');
                setSelectedPiso(null);
            } else {
                notify(`Error: ${result.error || 'No se pudo enviar'}`, 'error');
            }
        } catch {
            notify('Error de conexión enviando WA', 'error');
        } finally {
            setIsReplyingWa(false);
        }
    };

    // ======== RENDER ========
    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">


      <div className="px-4 pb-2 pt-4"><BotPanelPisos /></div>
            {/* Notification */}
            {notification && (
                <div className={`mx-6 mt-4 px-5 py-3 rounded-2xl text-sm font-bold flex items-center gap-3 shadow-lg animate-pulse ${notification.type === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : notification.type === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                    }`}>
                    {notification.type === 'success' ? <CheckCircle2 size={18} /> : notification.type === 'error' ? <AlertTriangle size={18} /> : <Sparkles size={18} />}
                    {notification.text}
                </div>
            )}

            {/* Header */}
            <header className="p-6 pb-0">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/20">
                            <Home className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Pisos</h1>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-slate-500">{properties.length} guardados</span>
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
                        <button onClick={sendAllByEmail} disabled={sendingAll || properties.length === 0}
                            className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold text-sm py-2.5 px-5 rounded-xl transition-all active:scale-95 disabled:opacity-60 shadow-lg shadow-red-500/20">
                            <Mail size={15} />
                            {sendingAll ? 'Enviando...' : 'Enviar todo a Gmail'}
                        </button>
                        <button onClick={() => setShowEmailConfig(!showEmailConfig)}
                            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                            <Settings size={16} className="text-slate-500" />
                        </button>
                        {properties.length > 0 && (
                            <button onClick={clearAll}
                                className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-colors group">
                                <Trash2 size={16} className="text-slate-400 group-hover:text-red-500" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Gmail Config Panel */}
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
                                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contraseña App</label>
                                <input type="password" value={emailConfig.gmailAppPassword} onChange={e => setEmailConfig(c => ({ ...c, gmailAppPassword: e.target.value }))}
                                    placeholder="xxxx xxxx xxxx xxxx"
                                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enviar a (opcional)</label>
                                <input type="email" value={emailConfig.recipientEmail} onChange={e => setEmailConfig(c => ({ ...c, recipientEmail: e.target.value }))}
                                    placeholder="destino@gmail.com"
                                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-3">
                            💡 Ve a <a href="https://myaccount.google.com/apppasswords" target="_blank" className="text-emerald-500 underline">myaccount.google.com/apppasswords</a> para generar una contraseña de aplicación. Necesitas tener 2FA activado.
                        </p>
                    </div>
                )}

                {/* Scrape Config Panel */}
                {showScrapeConfig && (
                    <div className="mt-4 p-5 bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 rounded-2xl shadow-sm">
                        <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                            <Globe size={16} className="text-violet-500" /> Scraping Web (Apify)
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ciudad</label>
                                <input type="text" value={scrapeConfig.city} onChange={e => setScrapeConfig(c => ({ ...c, city: e.target.value }))}
                                    placeholder="barcelona"
                                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo</label>
                                <select value={scrapeConfig.propertyType} onChange={e => setScrapeConfig(c => ({ ...c, propertyType: e.target.value }))}
                                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 outline-none">
                                    <option value="alquiler">Alquiler</option>
                                    <option value="venta">Venta</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Precio máx (€)</label>
                                <input type="number" value={scrapeConfig.maxPrice} onChange={e => setScrapeConfig(c => ({ ...c, maxPrice: parseInt(e.target.value) || 0 }))}
                                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Máx resultados</label>
                                <input type="number" value={scrapeConfig.maxItems} onChange={e => setScrapeConfig(c => ({ ...c, maxItems: parseInt(e.target.value) || 10 }))}
                                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 outline-none" />
                            </div>
                        </div>
                        <button onClick={scrapeFromApify} disabled={isScraping}
                            className="mt-4 flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold text-sm py-2.5 px-6 rounded-xl transition-all active:scale-95 disabled:opacity-60 shadow-lg shadow-violet-500/20">
                            <Search size={15} className={isScraping ? 'animate-bounce' : ''} />
                            {isScraping ? 'Buscando pisos...' : 'Buscar pisos'}
                        </button>
                        <p className="text-[11px] text-slate-400 mt-2">🔍 Busca pisos en Idealista usando Apify. Requiere API key configurada.</p>
                    </div>
                )}
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 pt-4">
                {properties.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-20">
                        <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                            <Home size={40} className="text-emerald-400" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Sin pisos todavía</h3>
                        <p className="text-slate-500 max-w-sm text-sm leading-relaxed">
                            Cuando tu bot de WhatsApp envíe anuncios de pisos, aparecerán aquí automáticamente.
                            También puedes pulsar "Sincronizar WA" para importar del historial.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                        {properties.map(prop => (
                            <article key={prop.id}
                                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col overflow-hidden group">

                                {/* Card Header */}
                                <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-850 p-5 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-lg px-3 py-1 rounded-xl flex items-center gap-1">
                                            <Euro size={16} />
                                            {prop.price}
                                        </div>
                                    </div>
                                    {prop.sent && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-lg">
                                            <CheckCircle2 size={12} /> Enviado
                                        </span>
                                    )}
                                </div>

                                {/* Card Body */}
                                <div className="p-5 flex-1 flex flex-col">
                                    <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug mb-2 line-clamp-2">{prop.title}</h3>

                                    <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-4">
                                        <MapPin size={13} className="text-emerald-500 shrink-0" />
                                        <span className="truncate">{prop.location}</span>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                                        <div className="flex flex-col items-center gap-0.5 text-slate-500">
                                            <Maximize2 size={14} />
                                            <span className="text-[11px] font-bold">{prop.sqm || '—'} m²</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-0.5 text-slate-500 border-x border-slate-200 dark:border-slate-700">
                                            <BedDouble size={14} />
                                            <span className="text-[11px] font-bold">{prop.rooms || '—'} Hab</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-0.5 text-slate-500">
                                            <Bath size={14} />
                                            <span className="text-[11px] font-bold">{prop.baths || '—'} Bañ</span>
                                        </div>
                                    </div>

                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 flex-1 leading-relaxed mb-4">{prop.description}</p>

                                    <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-3">
                                        <Clock size={10} />
                                        {new Date(prop.timestamp).toLocaleString('es-ES')}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="px-5 pb-5 flex gap-2">
                                    <button onClick={() => sendEmail(prop)} disabled={sendingEmailId === prop.id}
                                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-red-500/10 disabled:opacity-50">
                                        {sendingEmailId === prop.id
                                            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            : <><Mail size={14} /> Gmail</>}
                                    </button>
                                    <button onClick={() => setSelectedPiso(prop)}
                                        className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                                        <Eye size={14} className="text-slate-500" />
                                    </button>
                                    <button onClick={() => deletePiso(prop.id)}
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
            {selectedPiso && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedPiso(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-black text-slate-900 dark:text-white">{selectedPiso.title}</h2>
                            <button onClick={() => setSelectedPiso(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
                        </div>
                        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                            {selectedPiso.rawText}
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button onClick={() => { sendEmail(selectedPiso); setSelectedPiso(null); }}
                                className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors">
                                <Mail size={16} /> Enviar a Gmail
                            </button>
                        </div>
                        {selectedPiso.source === 'whatsapp' && selectedPiso.senderPhone && (
                            <div className="mt-4 bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Responder por WhatsApp</h4>
                                <textarea
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 h-20 mb-3"
                                    placeholder="Escribe tu mensaje aquí..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                ></textarea>
                                <button onClick={() => sendReplyWa(selectedPiso)} disabled={isReplyingWa}
                                    className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
                                    {isReplyingWa ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send size={16} /> Enviar WhatsApp</>}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RealEstateView;
