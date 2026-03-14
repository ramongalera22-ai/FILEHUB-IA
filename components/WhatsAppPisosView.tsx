import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Home, MapPin, Maximize2, BedDouble, Bath, Send, Sparkles,
    RefreshCw, Mail, Trash2, Wifi, WifiOff, Euro, Clock,
    CheckCircle2, AlertTriangle, ExternalLink, Eye, Search,
    MessageCircle, Heart, HeartOff, Filter, Star, Loader2,
    X, ChevronDown, ChevronUp, Bot, Zap, Globe, Plus
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
    source: 'whatsapp' | 'manual' | 'scrape' | string;
    sent: boolean;
    senderPhone?: string;
    senderName?: string;
    url?: string;
    favorite?: boolean;
}

interface SearchFilters {
    city: string;
    maxPrice: string;
    minRooms: string;
    propertyType: 'alquiler' | 'venta';
}

const WA_SERVER = import.meta.env.VITE_WA_SERVER_URL || 'https://whatsapp-filehub-production.up.railway.app';
const WA_WS = import.meta.env.VITE_WA_WS_URL || 'wss://whatsapp-filehub-production.up.railway.app/ws';
const STORAGE_KEY = 'filehub_pisos_data_v2';

// ============ PARSE FROM WA TEXT ============
function parsePisoFromText(text: string, msgId: string, timestamp: number, senderPhone?: string, senderName?: string): Property | null {
    const t = text.toLowerCase();
    const hasPiso = ['piso', 'vivienda', 'alquiler', 'apartamento', 'habitación', 'casa ', 'ático', 'estudio', 'loft', 'duplex', 'chalet'].some(k => t.includes(k));
    const hasDetail = ['€', 'eur', 'precio', 'mes', 'm2', 'm²', 'zona', 'barrio', 'habitaciones', 'baño', 'dormitorio'].some(k => t.includes(k));
    if (!hasPiso || !hasDetail) return null;

    const extractLine = (kw: string) => {
        const m = text.match(new RegExp(`${kw}[:\\*\\s]*(.*)`, 'i'));
        return m ? m[1].trim().replace(/\*+/g, '').trim() : '';
    };

    const priceMatch = text.match(/(\d[\d.,]*)\s*€/);
    const price = extractLine('Precio') || extractLine('Alquiler') || (priceMatch ? priceMatch[0] : 'Consultar');
    const sqmMatch = text.match(/(\d+)\s*m[²2]/i);
    const sqm = parseInt(extractLine('Metros') || extractLine('m2')) || (sqmMatch ? parseInt(sqmMatch[1]) : 0);
    const roomsMatch = text.match(/(\d+)\s*(?:hab|dormitorio|habitaci)/i);
    const rooms = parseInt(extractLine('Habitaciones')) || (roomsMatch ? parseInt(roomsMatch[1]) : 0);
    const bathsMatch = text.match(/(\d+)\s*(?:baño|bañ)/i);
    const baths = parseInt(extractLine('Baños')) || (bathsMatch ? parseInt(bathsMatch[1]) : 0);
    const title = extractLine('Título') || extractLine('Piso') ||
        text.split('\n').find(l => l.trim().length > 5 && l.trim().length < 80)?.replace(/\*+/g, '').trim() || 'Inmueble detectado';
    const location = extractLine('Zona') || extractLine('Ubicación') || extractLine('Barrio') || 'No especificada';
    const urlMatch = text.match(/https?:\/\/[^\s\)>"]+/);

    return {
        id: `wa_piso_${msgId}_${timestamp}`,
        title: title.substring(0, 80), price,
        location: location.substring(0, 60), sqm, rooms, baths,
        description: text.length > 300 ? text.substring(0, 300) + '...' : text,
        rawText: text, timestamp, source: 'whatsapp', sent: false,
        senderPhone, senderName, url: urlMatch ? urlMatch[0] : undefined
    };
}

// ============ COMPONENT ============
const WhatsAppPisosView: React.FC = () => {
    const [properties, setProperties] = useState<Property[]>(() => {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
    });
    const [wsConnected, setWsConnected] = useState(false);
    const [activeTab, setActiveTab] = useState<'pisos' | 'buscar' | 'favoritos'>('pisos');
    const [selectedProp, setSelectedProp] = useState<Property | null>(null);
    const [searchFilters, setSearchFilters] = useState<SearchFilters>({ city: 'murcia', maxPrice: '', minRooms: '', propertyType: 'alquiler' });
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Property[]>([]);
    const [scrapeStatus, setScrapeStatus] = useState('');
    const [quickMsg, setQuickMsg] = useState('');
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const persist = useCallback((updated: Property[]) => {
        setProperties(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 200)));
    }, []);

    // ── WEBSOCKET ──────────────────────────────────────────────
    const connectWS = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        try {
            const ws = new WebSocket(WA_WS);
            wsRef.current = ws;
            ws.onopen = () => setWsConnected(true);
            ws.onclose = () => {
                setWsConnected(false);
                reconnectRef.current = setTimeout(connectWS, 5000);
            };
            ws.onerror = () => ws.close();
            ws.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);

                    // New WA message → try to parse as piso
                    if (data.type === 'message' && data.message?.type === 'incoming') {
                        const msg = data.message;
                        const parsed = parsePisoFromText(msg.body || '', msg.id, msg.timestamp, msg.from, msg.fromName);
                        if (parsed) {
                            setProperties(prev => {
                                if (prev.some(p => p.id === parsed.id)) return prev;
                                const updated = [parsed, ...prev];
                                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 200)));
                                return updated;
                            });
                        }
                    }

                    // History load
                    if (data.type === 'history') {
                        const msgs = data.messages || [];
                        const newPisos: Property[] = [];
                        msgs.forEach((msg: any) => {
                            if (msg.type !== 'incoming' || !msg.body) return;
                            const p = parsePisoFromText(msg.body, msg.id, msg.timestamp, msg.from, msg.fromName);
                            if (p) newPisos.push(p);
                        });
                        if (newPisos.length > 0) {
                            setProperties(prev => {
                                const existingIds = new Set(prev.map(p => p.id));
                                const merged = [...prev, ...newPisos.filter(p => !existingIds.has(p.id))];
                                localStorage.setItem(STORAGE_KEY, JSON.stringify(merged.slice(0, 200)));
                                return merged;
                            });
                        }
                    }

                    // Scraping results from bot command
                    if (data.type === 'scrape_results' && data.target === 'pisos') {
                        const newProps: Property[] = (data.items || []).map((item: any) => ({
                            id: item.id || `scrape_${Date.now()}_${Math.random()}`,
                            title: item.title || 'Piso encontrado',
                            price: item.price || '—',
                            location: item.location || '',
                            sqm: item.sqm || 0, rooms: item.rooms || 0, baths: item.baths || 0,
                            description: item.description || '',
                            rawText: item.description || '',
                            timestamp: item.timestamp || Date.now(),
                            source: 'scrape', sent: false,
                            url: item.url
                        }));
                        setSearchResults(newProps);
                        setIsSearching(false);
                        setScrapeStatus(`✅ ${newProps.length} pisos encontrados`);
                    }

                    if (data.type === 'bot_scrape_results' && data.target === 'pisos') {
                        const newProps: Property[] = (data.items || []).map((item: any) => ({
                            id: item.id || `bot_${Date.now()}_${Math.random()}`,
                            title: item.title || 'Piso encontrado',
                            price: item.price || '—', location: item.location || data.city || '',
                            sqm: 0, rooms: 0, baths: 0, description: item.description || '',
                            rawText: '', timestamp: Date.now(), source: 'scrape', sent: false,
                            url: item.url
                        }));
                        setProperties(prev => {
                            const existingIds = new Set(prev.map(p => p.id));
                            const merged = [...newProps.filter(p => !existingIds.has(p.id)), ...prev];
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged.slice(0, 200)));
                            return merged;
                        });
                        setScrapeStatus(`🤖 Bot encontró ${newProps.length} pisos en ${data.city}`);
                    }

                    if (data.type === 'scrape_status') setScrapeStatus(data.message || '');

                } catch {}
            };
            // Ping keepalive
            const pingInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
            }, 15000);
            ws.addEventListener('close', () => clearInterval(pingInterval));
        } catch {}
    }, []);

    useEffect(() => {
        connectWS();
        return () => {
            if (reconnectRef.current) clearTimeout(reconnectRef.current);
            wsRef.current?.close();
        };
    }, [connectWS]);

    // ── SYNC FROM SERVER ────────────────────────────────────────
    const syncFromServer = async () => {
        setIsSyncing(true);
        try {
            const r = await fetch(`${WA_SERVER}/messages/classified`);
            const data = await r.json();
            const pisoMsgs = data.pisos || [];
            const newPisos: Property[] = [];
            pisoMsgs.forEach((msg: any) => {
                const p = parsePisoFromText(msg.body, msg.id, msg.timestamp, msg.from, msg.fromName);
                if (p) newPisos.push(p);
            });
            if (newPisos.length > 0) {
                setProperties(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const merged = [...prev, ...newPisos.filter(p => !existingIds.has(p.id))];
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged.slice(0, 200)));
                    return merged;
                });
            }
        } catch {}
        setIsSyncing(false);
    };

    // ── SEARCH (scraping) ──────────────────────────────────────
    const handleSearch = () => {
        if (!searchFilters.city.trim()) return;
        setIsSearching(true);
        setScrapeStatus(`🔍 Buscando pisos en ${searchFilters.city}...`);
        setSearchResults([]);

        // Via WebSocket to server (preferred - server-side scraping avoids CORS)
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'scrape_pisos',
                city: searchFilters.city,
                maxPrice: searchFilters.maxPrice || undefined,
                rooms: searchFilters.minRooms || undefined,
                propertyType: searchFilters.propertyType,
                maxItems: 20
            }));
            // Timeout fallback
            setTimeout(() => {
                setIsSearching(prev => { if (prev) setScrapeStatus('⏱️ Timeout — intenta de nuevo'); return false; });
            }, 30000);
        } else {
            // REST fallback
            const params = new URLSearchParams({ city: searchFilters.city, type: searchFilters.propertyType, limit: '20' });
            if (searchFilters.maxPrice) params.set('maxPrice', searchFilters.maxPrice);
            if (searchFilters.minRooms) params.set('rooms', searchFilters.minRooms);
            fetch(`${WA_SERVER}/scrape/pisos?${params}`)
                .then(r => r.json())
                .then(data => {
                    const items: Property[] = (data.pisos || []).map((item: any, i: number) => ({
                        id: item.id || `rest_${Date.now()}_${i}`,
                        title: item.title || 'Piso', price: item.price || '—',
                        location: item.location || searchFilters.city,
                        sqm: item.sqm || 0, rooms: item.rooms || 0, baths: item.baths || 0,
                        description: item.description || '', rawText: '', timestamp: Date.now(),
                        source: 'scrape', sent: false, url: item.url
                    }));
                    setSearchResults(items);
                    setScrapeStatus(`✅ ${items.length} pisos encontrados`);
                })
                .catch(() => setScrapeStatus('❌ Error al buscar'))
                .finally(() => setIsSearching(false));
        }
    };

    // ── SEND WA MESSAGE ─────────────────────────────────────────
    const sendQuickWA = async (prop: Property, customMsg?: string) => {
        if (!prop.senderPhone) return;
        setSendingId(prop.id);
        const text = customMsg || quickMsg || `Hola, he visto tu anuncio sobre el ${prop.title} en ${prop.location} a ${prop.price}. ¿Podría visitarlo? Gracias 🏠`;
        try {
            const r = await fetch(`${WA_SERVER}/send`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: prop.senderPhone, message: text })
            });
            if (r.ok) persist(properties.map(p => p.id === prop.id ? { ...p, sent: true } : p));
        } catch {}
        setSendingId(null);
    };

    // ── FAVORITE ────────────────────────────────────────────────
    const toggleFavorite = (id: string) => {
        persist(properties.map(p => p.id === id ? { ...p, favorite: !p.favorite } : p));
    };

    const addToMyPisos = (prop: Property) => {
        if (properties.some(p => p.id === prop.id)) return;
        persist([prop, ...properties]);
        setScrapeStatus(`✅ "${prop.title}" añadido a Mis Pisos`);
    };

    const deleteProp = (id: string) => persist(properties.filter(p => p.id !== id));

    // ── FILTERED LISTS ──────────────────────────────────────────
    const myPisos = properties.sort((a, b) => b.timestamp - a.timestamp);
    const favorites = properties.filter(p => p.favorite);

    // ── PROPERTY CARD ────────────────────────────────────────────
    const PropCard = ({ prop, showAddBtn = false }: { prop: Property; showAddBtn?: boolean }) => (
        <div className={`group bg-white dark:bg-slate-800 rounded-2xl border transition-all hover:shadow-lg ${
            prop.favorite ? 'border-pink-300 dark:border-pink-500/40' : 'border-slate-200 dark:border-slate-700'
        }`}>
            {/* Source badge */}
            <div className="px-4 pt-3 flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg ${
                    prop.source === 'whatsapp' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                    prop.source === 'scrape' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                    'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                }`}>
                    {prop.source === 'whatsapp' ? '💬 WhatsApp' : prop.source === 'scrape' ? '🔍 Scraping' : '✏️ Manual'}
                </span>
                <div className="flex gap-1">
                    <button onClick={() => toggleFavorite(prop.id)}
                        className="p-1.5 rounded-lg hover:bg-pink-50 dark:hover:bg-pink-500/10 transition-colors">
                        {prop.favorite
                            ? <Heart size={14} className="text-pink-500 fill-pink-500" />
                            : <HeartOff size={14} className="text-slate-400" />}
                    </button>
                    {showAddBtn
                        ? <button onClick={() => addToMyPisos(prop)}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 transition-colors">
                            <Plus size={14} className="text-emerald-600" />
                          </button>
                        : <button onClick={() => deleteProp(prop.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 size={14} className="text-slate-400 hover:text-red-500" />
                          </button>
                    }
                </div>
            </div>

            <div className="p-4 pt-2">
                {/* Title & Price */}
                <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-black text-sm text-slate-800 dark:text-white leading-snug line-clamp-2">{prop.title}</p>
                    <span className="shrink-0 text-base font-black text-emerald-600 dark:text-emerald-400">{prop.price}</span>
                </div>

                {/* Location */}
                <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                    <MapPin size={11} />
                    <span className="truncate">{prop.location}</span>
                </div>

                {/* Stats chips */}
                <div className="flex gap-1.5 flex-wrap mb-3">
                    {prop.sqm > 0 && <span className="flex items-center gap-1 text-[10px] font-bold bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg"><Maximize2 size={9}/>{prop.sqm}m²</span>}
                    {prop.rooms > 0 && <span className="flex items-center gap-1 text-[10px] font-bold bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg"><BedDouble size={9}/>{prop.rooms}hab</span>}
                    {prop.baths > 0 && <span className="flex items-center gap-1 text-[10px] font-bold bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg"><Bath size={9}/>{prop.baths}baños</span>}
                    {prop.sent && <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-lg">✓ Enviado</span>}
                </div>

                {/* Description */}
                {prop.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{prop.description}</p>
                )}

                {/* URL link */}
                {prop.url && (
                    <a href={prop.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:text-blue-700 mb-3 truncate">
                        <ExternalLink size={11} /> Ver anuncio
                    </a>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                    <button onClick={() => setSelectedProp(prop)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-all">
                        <Eye size={12} /> Ver
                    </button>
                    {prop.senderPhone && (
                        <button
                            onClick={() => sendQuickWA(prop)}
                            disabled={sendingId === prop.id}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-xl text-xs font-bold text-white transition-all shadow-sm shadow-green-500/20">
                            {sendingId === prop.id ? <Loader2 size={12} className="animate-spin" /> : <MessageCircle size={12} />}
                            {sendingId === prop.id ? 'Enviando...' : 'WhatsApp'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-5">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                        <Home size={24} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                            Pisos Bot WA
                        </h2>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                            <p className="text-xs text-slate-500 dark:text-slate-400">{wsConnected ? 'Bot conectado' : 'Bot desconectado'}</p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={syncFromServer} disabled={isSyncing}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:border-emerald-400/50 transition-all disabled:opacity-50">
                        {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Sincronizar
                    </button>
                </div>
            </div>

            {/* BOT COMMAND HELP */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-500/10 dark:to-emerald-500/5 rounded-2xl border border-green-200 dark:border-green-500/20 p-4">
                <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center shadow-md shrink-0">
                        <Bot size={18} className="text-white" />
                    </div>
                    <div>
                        <p className="font-black text-sm text-green-700 dark:text-green-400 mb-1">Comandos del Bot WhatsApp</p>
                        <div className="flex flex-wrap gap-1.5">
                            {[
                                { cmd: '/buscar piso murcia 800', desc: 'Busca pisos' },
                                { cmd: '/buscar trabajo enfermero murcia', desc: 'Busca empleo' },
                                { cmd: '/pisos', desc: 'Lista últimos' },
                                { cmd: '/ayuda', desc: 'Ver comandos' },
                            ].map(c => (
                                <span key={c.cmd} className="font-mono text-[10px] bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-1 rounded-lg">
                                    {c.cmd}
                                </span>
                            ))}
                        </div>
                        <p className="text-[10px] text-green-600/70 dark:text-green-400/50 mt-1">Envía estos comandos a tu propio número de WhatsApp para que el bot busque y te responda</p>
                    </div>
                </div>
            </div>

            {/* TABS */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-fit">
                {[
                    { id: 'pisos', label: `🏠 Mis Pisos (${myPisos.length})` },
                    { id: 'buscar', label: '🔍 Buscar' },
                    { id: 'favoritos', label: `❤️ Favoritos (${favorites.length})` },
                ].map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                            activeTab === t.id ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* TAB: BUSCAR */}
            {activeTab === 'buscar' && (
                <div className="space-y-4">
                    {/* Search form */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                        <h3 className="font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <Search size={16} className="text-emerald-500" /> Búsqueda de pisos
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                            <div className="col-span-2 sm:col-span-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Ciudad</label>
                                <input value={searchFilters.city} onChange={e => setSearchFilters(f => ({ ...f, city: e.target.value }))}
                                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                    placeholder="murcia, valencia..."
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Precio max €</label>
                                <input type="number" value={searchFilters.maxPrice} onChange={e => setSearchFilters(f => ({ ...f, maxPrice: e.target.value }))}
                                    placeholder="800"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Hab. mín.</label>
                                <input type="number" value={searchFilters.minRooms} onChange={e => setSearchFilters(f => ({ ...f, minRooms: e.target.value }))}
                                    placeholder="2"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Tipo</label>
                                <select value={searchFilters.propertyType} onChange={e => setSearchFilters(f => ({ ...f, propertyType: e.target.value as any }))}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20">
                                    <option value="alquiler">Alquiler</option>
                                    <option value="venta">Venta</option>
                                </select>
                            </div>
                        </div>
                        <button onClick={handleSearch} disabled={isSearching}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black rounded-xl shadow-lg shadow-emerald-500/20 hover:opacity-90 disabled:opacity-50 transition-all">
                            {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                            {isSearching ? 'Buscando pisos...' : 'Buscar pisos ahora'}
                        </button>
                        {scrapeStatus && (
                            <p className={`text-xs font-bold mt-2 text-center ${scrapeStatus.startsWith('❌') ? 'text-red-500' : 'text-emerald-600'}`}>
                                {scrapeStatus}
                            </p>
                        )}
                    </div>

                    {/* Search results */}
                    {searchResults.length > 0 && (
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                                <Globe size={12} /> Resultados scraping ({searchResults.length})
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {searchResults.map(p => <PropCard key={p.id} prop={p} showAddBtn />)}
                            </div>
                        </div>
                    )}

                    {!isSearching && searchResults.length === 0 && scrapeStatus && !scrapeStatus.startsWith('❌') && (
                        <div className="flex flex-col items-center py-12 text-center">
                            <div className="text-4xl mb-3">🏠</div>
                            <p className="font-bold text-slate-500">Sin resultados</p>
                            <p className="text-xs text-slate-400 mt-1">Prueba con otra ciudad o quita el filtro de precio</p>
                        </div>
                    )}
                </div>
            )}

            {/* TAB: MIS PISOS */}
            {activeTab === 'pisos' && (
                <div>
                    {myPisos.length === 0 ? (
                        <div className="flex flex-col items-center py-16 text-center">
                            <div className="text-5xl mb-4">🏠</div>
                            <p className="font-bold text-slate-600 dark:text-slate-300">Sin pisos todavía</p>
                            <p className="text-xs text-slate-400 mt-1 max-w-xs">Los pisos aparecerán automáticamente cuando el bot reciba mensajes con anuncios, o búscalos con la pestaña 🔍 Buscar</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {myPisos.map(p => <PropCard key={p.id} prop={p} />)}
                        </div>
                    )}
                </div>
            )}

            {/* TAB: FAVORITOS */}
            {activeTab === 'favoritos' && (
                <div>
                    {favorites.length === 0 ? (
                        <div className="flex flex-col items-center py-16 text-center">
                            <Heart size={48} className="text-pink-300 mb-4" />
                            <p className="font-bold text-slate-600 dark:text-slate-300">Sin favoritos</p>
                            <p className="text-xs text-slate-400 mt-1">Pulsa ❤️ en cualquier piso para guardarlo aquí</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {favorites.map(p => <PropCard key={p.id} prop={p} />)}
                        </div>
                    )}
                </div>
            )}

            {/* DETAIL MODAL */}
            {selectedProp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedProp(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
                            <div className="flex-1">
                                <h3 className="font-black text-lg text-slate-800 dark:text-white">{selectedProp.title}</h3>
                                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{selectedProp.price}</p>
                            </div>
                            <button onClick={() => setSelectedProp(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { icon: MapPin, val: selectedProp.location },
                                    selectedProp.sqm > 0 && { icon: Maximize2, val: `${selectedProp.sqm} m²` },
                                    selectedProp.rooms > 0 && { icon: BedDouble, val: `${selectedProp.rooms} hab.` },
                                    selectedProp.baths > 0 && { icon: Bath, val: `${selectedProp.baths} baños` },
                                ].filter(Boolean).map((chip: any, i) => (
                                    <span key={i} className="flex items-center gap-1.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl">
                                        <chip.icon size={12} className="text-emerald-500" /> {chip.val}
                                    </span>
                                ))}
                            </div>
                            {selectedProp.description && (
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Descripción</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedProp.rawText || selectedProp.description}</p>
                                </div>
                            )}
                            {selectedProp.url && (
                                <a href={selectedProp.url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition-all text-sm">
                                    <ExternalLink size={14} /> Ver anuncio completo
                                </a>
                            )}
                            {selectedProp.senderPhone && (
                                <div className="space-y-2">
                                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">Respuesta rápida WhatsApp</p>
                                    <textarea value={quickMsg} onChange={e => setQuickMsg(e.target.value)}
                                        placeholder={`Hola, me interesa el piso en ${selectedProp.location} a ${selectedProp.price}. ¿Podría visitarlo?`}
                                        rows={3} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400" />
                                    <button onClick={() => { sendQuickWA(selectedProp); setSelectedProp(null); }}
                                        disabled={sendingId === selectedProp.id}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white font-black rounded-xl transition-all shadow-md shadow-green-500/20 disabled:opacity-50">
                                        {sendingId === selectedProp.id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                        Enviar por WhatsApp
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhatsAppPisosView;
