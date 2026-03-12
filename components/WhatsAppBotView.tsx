
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    MessageSquare,
    Settings,
    Send,
    Bot,
    User,
    Wifi,
    WifiOff,
    RefreshCw,
    Copy,
    Check,
    Trash2,
    Sparkles,
    Phone,
    QrCode,
    Link2,
    Shield,
    Zap,
    ArrowRight,
    ExternalLink,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Clock,
    Filter,
    Download,
    BarChart3,
    MessageCircle,
    Power,
    Loader2
} from 'lucide-react';
import { chatWithGemini } from '../services/geminiService';

// ============ TYPES ============
interface WAMessage {
    id: string;
    from: string;
    fromName?: string;
    to: string;
    body: string;
    timestamp: number;
    type: 'incoming' | 'outgoing';
    status: 'sent' | 'delivered' | 'read' | 'failed';
    isAIGenerated?: boolean;
}

interface WAConversation {
    contactNumber: string;
    contactName: string;
    lastMessage: string;
    lastTimestamp: number;
    unreadCount: number;
    messages: WAMessage[];
}

interface WABotStats {
    totalMessages: number;
    totalConversations: number;
    aiResponses: number;
    avgResponseTime: number;
}

interface WhatsAppBotViewProps {
    globalContext?: any;
}

const WA_SERVER_URL = import.meta.env.VITE_WA_SERVER_URL || 'https://whatsapp-filehub-production.up.railway.app';
const WA_WS_URL = import.meta.env.VITE_WA_WS_URL || 'wss://whatsapp-filehub-production.up.railway.app/ws';

const WhatsAppBotView: React.FC<WhatsAppBotViewProps> = ({ globalContext }) => {
    // ========== STATE ==========
    const [activeTab, setActiveTab] = useState<'chat' | 'config' | 'stats' | 'logs'>('config');
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'qr_ready' | 'connected'>('disconnected');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [serverOnline, setServerOnline] = useState(false);

    const [conversations, setConversations] = useState<WAConversation[]>(() => {
        const saved = localStorage.getItem('filehub_wa_conversations');
        return saved ? JSON.parse(saved) : [];
    });

    const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [searchFilter, setSearchFilter] = useState('');
    const [connectionLogs, setConnectionLogs] = useState<string[]>([]);
    const [autoReply, setAutoReply] = useState(() => localStorage.getItem('filehub_wa_autoreply') === 'true');
    const [aiEnabled, setAiEnabled] = useState(true);
    const [systemPrompt, setSystemPrompt] = useState(() =>
        localStorage.getItem('filehub_wa_prompt') ||
        `Eres el asistente IA de FileHub. Responde en español de forma profesional y concisa.
Ayudas a gestionar tareas, gastos, agenda y archivos del usuario.
Si te preguntan algo que no sabes, sugiere usar la webapp de FileHub.`
    );

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

    // ========== PERSIST ==========
    useEffect(() => {
        localStorage.setItem('filehub_wa_conversations', JSON.stringify(conversations));
    }, [conversations]);

    useEffect(() => {
        localStorage.setItem('filehub_wa_autoreply', String(autoReply));
    }, [autoReply]);

    useEffect(() => {
        localStorage.setItem('filehub_wa_prompt', systemPrompt);
    }, [systemPrompt]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedConversation, conversations]);

    // ========== LOGGING ==========
    const addLog = useCallback((msg: string) => {
        setConnectionLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 199)]);
    }, []);

    // ========== WEBSOCKET CONNECTION ==========
    const connectWebSocket = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        try {
            const ws = new WebSocket(WA_WS_URL);

            ws.onopen = () => {
                console.log('WS conectado al servidor WhatsApp');
                setServerOnline(true);
                addLog('🔌 Conectado al servidor WhatsApp');
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    switch (data.type) {
                        case 'status':
                            setConnectionStatus(data.status);
                            if (data.qr) setQrCode(data.qr);
                            if (data.status === 'connected') {
                                setQrCode(null);
                                addLog('✅ ¡WhatsApp conectado exitosamente!');
                            }
                            if (data.message) addLog(`📡 ${data.message}`);
                            break;

                        case 'qr':
                            setQrCode(data.qr);
                            setConnectionStatus('qr_ready');
                            addLog('📱 Nuevo código QR disponible - escanéalo con WhatsApp');
                            break;

                        case 'message':
                            handleIncomingMessage(data.message);
                            break;

                        case 'history':
                            if (data.messages) {
                                data.messages.forEach((msg: WAMessage) => handleIncomingMessage(msg, true));
                            }
                            break;

                        case 'message_status':
                            // Update message status
                            setConversations(prev => prev.map(conv => ({
                                ...conv,
                                messages: conv.messages.map(m =>
                                    m.id === data.id ? { ...m, status: data.status } : m
                                )
                            })));
                            break;
                    }
                } catch (err) {
                    console.error('Error procesando mensaje WS:', err);
                }
            };

            ws.onclose = () => {
                setServerOnline(false);
                wsRef.current = null;
                // Reconnect after 3s
                if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = setTimeout(connectWebSocket, 3000);
            };

            ws.onerror = () => {
                setServerOnline(false);
            };

            wsRef.current = ws;
        } catch (err) {
            setServerOnline(false);
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = setTimeout(connectWebSocket, 5000);
        }
    }, [addLog]);

    // Cleanup
    useEffect(() => {
        connectWebSocket();
        return () => {
            if (wsRef.current) wsRef.current.close();
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        };
    }, [connectWebSocket]);

    // ========== HANDLE INCOMING MESSAGE ==========
    const handleIncomingMessage = useCallback((msg: WAMessage, silent = false) => {
        setConversations(prev => {
            const contactNumber = msg.type === 'incoming' ? msg.from : msg.to;
            const contactName = msg.fromName || contactNumber;
            const existing = prev.find(c => c.contactNumber === contactNumber);

            if (existing) {
                return prev.map(c => {
                    if (c.contactNumber === contactNumber) {
                        const alreadyExists = c.messages.some(m => m.id === msg.id);
                        if (alreadyExists) return c;
                        return {
                            ...c,
                            messages: [...c.messages, msg],
                            lastMessage: msg.body,
                            lastTimestamp: msg.timestamp,
                            unreadCount: msg.type === 'incoming' && !silent ? c.unreadCount + 1 : c.unreadCount
                        };
                    }
                    return c;
                });
            } else {
                return [{
                    contactNumber,
                    contactName,
                    lastMessage: msg.body,
                    lastTimestamp: msg.timestamp,
                    unreadCount: msg.type === 'incoming' && !silent ? 1 : 0,
                    messages: [msg]
                }, ...prev];
            }
        });

        if (!silent && msg.type === 'incoming') {
            addLog(`📩 Mensaje de ${msg.fromName || msg.from}: ${msg.body.substring(0, 50)}...`);
        }
    }, [addLog]);

    // ========== AUTO-REPLY WITH AI ==========
    useEffect(() => {
        if (!autoReply || !aiEnabled || connectionStatus !== 'connected') return;

        const lastConv = conversations.find(c => {
            const lastMsg = c.messages[c.messages.length - 1];
            return lastMsg && lastMsg.type === 'incoming' && !c.messages.some(m => m.timestamp > lastMsg.timestamp && m.type === 'outgoing');
        });

        if (!lastConv) return;

        const lastMsg = lastConv.messages[lastConv.messages.length - 1];
        const timeSince = Date.now() - lastMsg.timestamp;
        if (timeSince > 10000) return; // Only auto-reply within 10 seconds

        const replyTimeout = setTimeout(async () => {
            try {
                const recentChat = lastConv.messages.slice(-5).map(m =>
                    `${m.type === 'incoming' ? lastConv.contactName : 'Bot'}: ${m.body}`
                ).join('\n');

                const response = await chatWithGemini(
                    `${systemPrompt}\n\nConversación:\n${recentChat}\n\nÚltimo mensaje: "${lastMsg.body}"\n\nResponde:`,
                    {}
                );

                const replyText = response.text || 'Lo siento, no pude generar una respuesta.';

                // Send via WebSocket
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                        type: 'send_message',
                        phone: lastConv.contactNumber,
                        text: replyText
                    }));
                    addLog(`🤖 Auto-respuesta IA enviada a ${lastConv.contactName}`);
                }
            } catch (err: any) {
                addLog(`❌ Error auto-respuesta IA: ${err.message}`);
            }
        }, 2000);

        return () => clearTimeout(replyTimeout);
    }, [conversations, autoReply, aiEnabled, connectionStatus, systemPrompt, addLog]);

    // ========== HANDLERS ==========
    const handleStartConnection = async () => {
        try {
            addLog('🔄 Iniciando conexión WhatsApp...');
            setConnectionStatus('connecting');
            const res = await fetch(`${WA_SERVER_URL}/connect`, { method: 'POST' });
            const data = await res.json();
            addLog(`📡 ${data.message}`);
        } catch (err: any) {
            addLog(`❌ Error: No se pudo conectar al servidor. ¿Está corriendo? (node server/whatsapp-server.js)`);
            setConnectionStatus('disconnected');
        }
    };

    const handleDisconnect = async () => {
        try {
            const res = await fetch(`${WA_SERVER_URL}/disconnect`, { method: 'POST' });
            const data = await res.json();
            setConnectionStatus('disconnected');
            setQrCode(null);
            addLog(`🔌 ${data.message}`);
        } catch (err: any) {
            addLog(`❌ Error desconectando: ${err.message}`);
        }
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim() || !selectedConversation || connectionStatus !== 'connected') return;
        setIsSending(true);

        try {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                    type: 'send_message',
                    phone: selectedConversation,
                    text: messageInput
                }));
                addLog(`📤 Mensaje enviado a ${selectedConversation}`);
            } else {
                // Fallback to REST
                await fetch(`${WA_SERVER_URL}/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: selectedConversation, message: messageInput })
                });
            }
            setMessageInput('');
        } catch (err: any) {
            addLog(`❌ Error enviando: ${err.message}`);
        } finally {
            setIsSending(false);
        }
    };

    const handleAIReply = async (conv: WAConversation) => {
        const lastMsg = conv.messages[conv.messages.length - 1];
        if (!lastMsg) return;

        try {
            addLog(`🤖 Generando respuesta IA para ${conv.contactName}...`);
            const recentChat = conv.messages.slice(-5).map(m =>
                `${m.type === 'incoming' ? conv.contactName : 'Bot'}: ${m.body}`
            ).join('\n');

            const response = await chatWithGemini(
                `${systemPrompt}\n\nConversación:\n${recentChat}\n\nResponde al último mensaje:`,
                {}
            );

            const replyText = response.text || 'Lo siento, no pude generar una respuesta.';

            if (wsRef.current?.readyState === WebSocket.OPEN && connectionStatus === 'connected') {
                wsRef.current.send(JSON.stringify({
                    type: 'send_message',
                    phone: conv.contactNumber,
                    text: replyText
                }));
                addLog(`✅ Respuesta IA enviada a ${conv.contactName}`);
            } else {
                // Show as local preview
                const aiMsg: WAMessage = {
                    id: `ai_${Date.now()}`,
                    from: 'me',
                    to: conv.contactNumber,
                    body: replyText,
                    timestamp: Date.now(),
                    type: 'outgoing',
                    status: 'sent',
                    isAIGenerated: true
                };
                handleIncomingMessage(aiMsg);
                addLog(`⚠️ Respuesta IA generada (no enviada - WhatsApp no conectado)`);
            }
        } catch (err: any) {
            addLog(`❌ Error IA: ${err.message}`);
        }
    };

    const clearConversation = (contactNumber: string) => {
        if (confirm('¿Eliminar esta conversación?')) {
            setConversations(prev => prev.filter(c => c.contactNumber !== contactNumber));
            if (selectedConversation === contactNumber) setSelectedConversation(null);
        }
    };

    const exportConversations = () => {
        const data = JSON.stringify(conversations, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `filehub-whatsapp-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        addLog('📦 Conversaciones exportadas');
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    // ========== COMPUTED ==========
    const stats: WABotStats = {
        totalMessages: conversations.reduce((acc, c) => acc + c.messages.length, 0),
        totalConversations: conversations.length,
        aiResponses: conversations.reduce((acc, c) => acc + c.messages.filter(m => m.isAIGenerated).length, 0),
        avgResponseTime: 2.3
    };

    const filteredConversations = conversations.filter(c =>
        c.contactName.toLowerCase().includes(searchFilter.toLowerCase()) ||
        c.contactNumber.includes(searchFilter)
    );

    const selectedConv = conversations.find(c => c.contactNumber === selectedConversation);

    // ========== STATUS BADGE ==========
    const statusConfig = {
        disconnected: { label: 'Desconectado', color: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500', icon: WifiOff },
        connecting: { label: 'Conectando...', color: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400', icon: Loader2 },
        qr_ready: { label: 'Escanea QR', color: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400', icon: QrCode },
        connected: { label: 'Conectado', color: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400', icon: Wifi }
    };

    const currentStatus = statusConfig[connectionStatus];
    const StatusIcon = currentStatus.icon;

    // ========== RENDER ==========
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25">
                        <MessageSquare size={24} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                            WhatsApp Bot
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            Conecta y gestiona tu bot de WhatsApp con IA
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Server Status */}
                    <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${serverOnline
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-800 text-emerald-600'
                        : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-800 text-red-500'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${serverOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`} />
                        {serverOnline ? 'Server ON' : 'Server OFF'}
                    </div>

                    {/* Connection Status */}
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all ${currentStatus.color}`}>
                        <StatusIcon size={14} className={connectionStatus === 'connecting' ? 'animate-spin' : connectionStatus === 'qr_ready' ? 'animate-pulse' : ''} />
                        {currentStatus.label}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white dark:bg-slate-800 rounded-2xl p-1.5 border border-slate-100 dark:border-slate-700 shadow-sm">
                {[
                    { id: 'chat', label: 'Conversaciones', icon: MessageCircle },
                    { id: 'config', label: 'Conexión QR', icon: QrCode },
                    { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
                    { id: 'logs', label: 'Logs', icon: Clock }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === tab.id
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/20'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                    >
                        <tab.icon size={16} />
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* =============== TAB: CONFIG / QR =============== */}
            {activeTab === 'config' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* QR Code Panel */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-500/5 dark:to-emerald-500/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                                    <QrCode size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white">Conectar WhatsApp</h3>
                                    <p className="text-xs text-slate-500">Escanea el código QR con tu teléfono</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            {/* Server not running */}
                            {!serverOnline && (
                                <div className="text-center py-8">
                                    <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                        <AlertTriangle size={32} className="text-red-400" />
                                    </div>
                                    <h4 className="text-lg font-black text-slate-700 dark:text-white mb-2">Servidor no detectado</h4>
                                    <p className="text-sm text-slate-500 mb-4 max-w-xs mx-auto">
                                        Ejecuta el servidor de WhatsApp en otra terminal:
                                    </p>
                                    <div className="bg-slate-900 rounded-xl p-4 text-left max-w-sm mx-auto mb-4">
                                        <code className="text-green-400 text-sm font-mono">node server/whatsapp-server.js</code>
                                    </div>
                                    <button
                                        onClick={() => {
                                            handleCopy('node server/whatsapp-server.js');
                                            addLog('📋 Comando copiado al portapapeles');
                                        }}
                                        className="flex items-center gap-2 mx-auto px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                                    >
                                        <Copy size={14} />
                                        Copiar comando
                                    </button>
                                </div>
                            )}

                            {/* Disconnected */}
                            {serverOnline && connectionStatus === 'disconnected' && (
                                <div className="text-center py-8">
                                    <div className="w-20 h-20 bg-green-50 dark:bg-green-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                        <Phone size={32} className="text-green-500" />
                                    </div>
                                    <h4 className="text-lg font-black text-slate-700 dark:text-white mb-2">Servidor listo</h4>
                                    <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">
                                        Pulsa el botón para generar el código QR y vincular tu WhatsApp
                                    </p>
                                    <button
                                        onClick={handleStartConnection}
                                        className="flex items-center gap-2 mx-auto px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-bold text-base shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all hover:scale-105"
                                    >
                                        <Power size={20} />
                                        Conectar WhatsApp
                                    </button>
                                </div>
                            )}

                            {/* Connecting */}
                            {serverOnline && connectionStatus === 'connecting' && (
                                <div className="text-center py-12">
                                    <Loader2 size={48} className="text-green-500 animate-spin mx-auto mb-4" />
                                    <h4 className="text-lg font-black text-slate-700 dark:text-white mb-2">Conectando...</h4>
                                    <p className="text-sm text-slate-500">Generando código QR, espera un momento</p>
                                </div>
                            )}

                            {/* QR Ready */}
                            {serverOnline && connectionStatus === 'qr_ready' && qrCode && (
                                <div className="text-center">
                                    <div className="bg-white p-4 rounded-2xl inline-block border-4 border-green-200 dark:border-green-800 shadow-xl shadow-green-500/10 mb-4">
                                        <img
                                            src={qrCode}
                                            alt="WhatsApp QR Code"
                                            className="w-64 h-64"
                                            style={{ imageRendering: 'pixelated' }}
                                        />
                                    </div>
                                    <div className="space-y-2 mb-4">
                                        <h4 className="text-lg font-black text-slate-700 dark:text-white">Escanea este código QR</h4>
                                        <div className="text-sm text-slate-500 space-y-1">
                                            <p>1. Abre <strong>WhatsApp</strong> en tu teléfono</p>
                                            <p>2. Ve a <strong>Ajustes → Dispositivos vinculados</strong></p>
                                            <p>3. Pulsa <strong>"Vincular un dispositivo"</strong></p>
                                            <p>4. Apunta la cámara a este código QR</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 justify-center">
                                        <button
                                            onClick={handleStartConnection}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                                        >
                                            <RefreshCw size={14} />
                                            Regenerar QR
                                        </button>
                                        <button
                                            onClick={handleDisconnect}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl font-bold text-sm hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
                                        >
                                            <XCircle size={14} />
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Connected */}
                            {serverOnline && connectionStatus === 'connected' && (
                                <div className="text-center py-8">
                                    <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 size={40} className="text-emerald-500" />
                                    </div>
                                    <h4 className="text-lg font-black text-emerald-700 dark:text-emerald-400 mb-2">¡WhatsApp Conectado!</h4>
                                    <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">
                                        Tu bot está activo y recibiendo mensajes. Ve a "Conversaciones" para ver los chats.
                                    </p>
                                    <div className="flex gap-3 justify-center">
                                        <button
                                            onClick={() => setActiveTab('chat')}
                                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all"
                                        >
                                            <MessageCircle size={16} />
                                            Ver Conversaciones
                                        </button>
                                        <button
                                            onClick={handleDisconnect}
                                            className="flex items-center gap-2 px-6 py-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl font-bold text-sm hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
                                        >
                                            <WifiOff size={16} />
                                            Desconectar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bot AI Settings */}
                    <div className="space-y-6">
                        {/* AI Config */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center">
                                        <Bot size={18} className="text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white">Configuración Bot IA</h3>
                                        <p className="text-xs text-slate-500">Personaliza el comportamiento del bot</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Sparkles size={16} className="text-indigo-500" />
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">IA Habilitada (Gemini)</span>
                                    </div>
                                    <button
                                        onClick={() => setAiEnabled(!aiEnabled)}
                                        className={`w-11 h-6 rounded-full relative transition-colors ${aiEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${aiEnabled ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <Zap size={16} className="text-amber-500" />
                                        <div>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Auto-Respuesta</span>
                                            <p className="text-[10px] text-slate-400">Responde automáticamente a mensajes</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setAutoReply(!autoReply)}
                                        className={`w-11 h-6 rounded-full relative transition-colors ${autoReply ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${autoReply ? 'left-6' : 'left-1'}`} />
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                                        Prompt del Sistema
                                    </label>
                                    <textarea
                                        value={systemPrompt}
                                        onChange={(e) => setSystemPrompt(e.target.value)}
                                        rows={5}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-green-500/20 transition-all resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Setup Guide */}
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-500/5 dark:to-emerald-500/5 rounded-2xl border border-green-200 dark:border-green-800 p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <Shield size={20} className="text-green-600 dark:text-green-400" />
                                <h3 className="font-bold text-green-800 dark:text-green-300">Pasos para conectar</h3>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { step: '1', text: 'Abre una terminal en la carpeta del proyecto', done: true },
                                    { step: '2', text: 'Ejecuta: node server/whatsapp-server.js', done: serverOnline },
                                    { step: '3', text: 'Pulsa "Conectar WhatsApp" arriba', done: connectionStatus !== 'disconnected' },
                                    { step: '4', text: 'Escanea el QR con tu teléfono', done: connectionStatus === 'connected' },
                                    { step: '5', text: 'Activa Auto-Respuesta si lo deseas', done: autoReply }
                                ].map(item => (
                                    <div key={item.step} className="flex items-center gap-3">
                                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${item.done ? 'bg-green-500 text-white' : 'bg-white dark:bg-slate-700 text-slate-500 border border-slate-200 dark:border-slate-600'
                                            }`}>
                                            {item.done ? <Check size={12} /> : item.step}
                                        </span>
                                        <span className={`text-sm font-medium ${item.done ? 'text-green-700 dark:text-green-400 line-through' : 'text-green-800 dark:text-green-300'}`}>
                                            {item.text}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =============== TAB: CHAT =============== */}
            {activeTab === 'chat' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: '600px' }}>
                    <div className="flex h-full">
                        {/* ---- Contact List Sidebar ---- */}
                        <div className={`${selectedConversation ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[340px] lg:min-w-[340px] border-r border-slate-100 dark:border-slate-700 h-full`}>
                            {/* Contact list header */}
                            <div className="p-3 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-green-50/80 to-emerald-50/80 dark:from-green-500/5 dark:to-emerald-500/5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-black text-slate-800 dark:text-white">Chats</h3>
                                    <div className="flex items-center gap-1">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                            {connectionStatus === 'connected' ? '● Online' : '○ Offline'}
                                        </span>
                                    </div>
                                </div>
                                <div className="relative">
                                    <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar o iniciar chat..."
                                        value={searchFilter}
                                        onChange={(e) => setSearchFilter(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl py-2 pl-9 pr-3 text-xs font-medium focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 transition-all placeholder:text-slate-400"
                                    />
                                </div>
                            </div>

                            {/* Contact list */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {filteredConversations.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
                                        <div className="w-16 h-16 bg-green-50 dark:bg-green-500/10 rounded-2xl flex items-center justify-center mb-4">
                                            <MessageSquare size={28} className="text-green-400" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Sin conversaciones</p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {connectionStatus === 'connected' ? 'Espera a recibir mensajes' : 'Conecta WhatsApp primero'}
                                        </p>
                                        {connectionStatus !== 'connected' && (
                                            <button
                                                onClick={() => setActiveTab('config')}
                                                className="flex items-center gap-1.5 mt-4 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all"
                                            >
                                                <QrCode size={12} />
                                                Conectar QR
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    filteredConversations.map(conv => (
                                        <button
                                            key={conv.contactNumber}
                                            onClick={() => {
                                                setSelectedConversation(conv.contactNumber);
                                                setConversations(prev => prev.map(c =>
                                                    c.contactNumber === conv.contactNumber ? { ...c, unreadCount: 0 } : c
                                                ));
                                            }}
                                            className={`w-full flex items-center gap-3 px-4 py-3 border-b border-slate-50 dark:border-slate-700/50 hover:bg-green-50/30 dark:hover:bg-green-500/5 transition-all text-left group ${selectedConversation === conv.contactNumber
                                                ? 'bg-green-50 dark:bg-green-500/10 border-l-4 border-l-green-500'
                                                : 'border-l-4 border-l-transparent'
                                                }`}
                                        >
                                            <div className="relative shrink-0">
                                                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-black text-base shadow-sm">
                                                    {conv.contactName.charAt(0).toUpperCase()}
                                                </div>
                                                {connectionStatus === 'connected' && (
                                                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-white dark:border-slate-800 rounded-full"></div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-bold text-slate-800 dark:text-white truncate">{conv.contactName}</span>
                                                    <span className={`text-[10px] font-medium shrink-0 ml-2 ${conv.unreadCount > 0 ? 'text-green-600 dark:text-green-400 font-bold' : 'text-slate-400'}`}>
                                                        {new Date(conv.lastTimestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between mt-0.5">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate pr-2">
                                                        {conv.messages[conv.messages.length - 1]?.type === 'outgoing' && (
                                                            <span className="text-green-500 mr-0.5">✓ </span>
                                                        )}
                                                        {conv.lastMessage}
                                                    </p>
                                                    {conv.unreadCount > 0 && (
                                                        <span className="bg-green-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                                                            {conv.unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* ---- Chat Window ---- */}
                        <div className={`${selectedConversation ? 'flex' : 'hidden lg:flex'} flex-col flex-1 h-full`}>
                            {selectedConv ? (
                                <>
                                    {/* Chat header */}
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-green-50/80 to-emerald-50/80 dark:from-green-500/5 dark:to-emerald-500/5 shrink-0">
                                        <div className="flex items-center gap-3">
                                            {/* Back button (mobile) */}
                                            <button
                                                onClick={() => setSelectedConversation(null)}
                                                className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-slate-500"
                                            >
                                                <ArrowRight size={18} className="rotate-180" />
                                            </button>
                                            <div className="relative">
                                                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-black shadow-sm">
                                                    {selectedConv.contactName.charAt(0).toUpperCase()}
                                                </div>
                                                {connectionStatus === 'connected' && (
                                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white dark:border-slate-800 rounded-full"></div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-slate-800 dark:text-white leading-tight">{selectedConv.contactName}</h3>
                                                <p className="text-[11px] text-slate-500 font-medium">
                                                    +{selectedConv.contactNumber} · {selectedConv.messages.length} mensajes
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleAIReply(selectedConv)}
                                                disabled={connectionStatus !== 'connected'}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all disabled:opacity-40"
                                            >
                                                <Sparkles size={12} />
                                                <span className="hidden sm:inline">IA Reply</span>
                                            </button>
                                            <button
                                                onClick={() => clearConversation(selectedConv.contactNumber)}
                                                className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                                title="Eliminar chat"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Messages area */}
                                    <div
                                        className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar"
                                        style={{
                                            backgroundColor: '#e5ddd5',
                                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                                        }}
                                    >
                                        {/* Date separators and messages */}
                                        {(() => {
                                            let lastDate = '';
                                            return selectedConv.messages.map((msg, idx) => {
                                                const msgDate = new Date(msg.timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
                                                const showDate = msgDate !== lastDate;
                                                lastDate = msgDate;

                                                // Check if consecutive same-sender messages (for grouping)
                                                const prevMsg = idx > 0 ? selectedConv.messages[idx - 1] : null;
                                                const nextMsg = idx < selectedConv.messages.length - 1 ? selectedConv.messages[idx + 1] : null;
                                                const isFirstInGroup = !prevMsg || prevMsg.type !== msg.type || showDate;
                                                const isLastInGroup = !nextMsg || nextMsg.type !== msg.type;

                                                return (
                                                    <React.Fragment key={msg.id}>
                                                        {/* Date separator */}
                                                        {showDate && (
                                                            <div className="flex justify-center my-3">
                                                                <span className="bg-white/90 dark:bg-slate-700/90 text-slate-600 dark:text-slate-300 text-[11px] font-bold px-4 py-1.5 rounded-lg shadow-sm backdrop-blur-sm">
                                                                    {msgDate}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Message bubble */}
                                                        <div className={`flex ${msg.type === 'outgoing' ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-2' : 'mt-0.5'}`}>
                                                            <div
                                                                className={`relative max-w-[80%] sm:max-w-[65%] px-3 py-2 shadow-sm ${msg.type === 'outgoing'
                                                                        ? msg.isAIGenerated
                                                                            ? 'bg-gradient-to-br from-indigo-400 to-purple-500 text-white'
                                                                            : 'bg-[#dcf8c6] dark:bg-emerald-800 text-slate-800 dark:text-slate-100'
                                                                        : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                                                                    } ${isFirstInGroup
                                                                        ? msg.type === 'outgoing'
                                                                            ? 'rounded-2xl rounded-tr-md'
                                                                            : 'rounded-2xl rounded-tl-md'
                                                                        : 'rounded-2xl'
                                                                    }`}
                                                            >
                                                                {/* Sender name (first in group, for incoming) */}
                                                                {isFirstInGroup && msg.type === 'incoming' && (
                                                                    <p className="text-xs font-black text-green-600 dark:text-green-400 mb-0.5">
                                                                        {selectedConv.contactName}
                                                                    </p>
                                                                )}

                                                                {/* AI badge */}
                                                                {msg.isAIGenerated && isFirstInGroup && (
                                                                    <div className="flex items-center gap-1 mb-1 opacity-80">
                                                                        <Sparkles size={10} />
                                                                        <span className="text-[9px] font-black uppercase tracking-widest">Respuesta IA</span>
                                                                    </div>
                                                                )}

                                                                {/* Message body + time + status inline */}
                                                                <div className="flex items-end gap-2">
                                                                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words flex-1">{msg.body}</p>
                                                                    <div className={`flex items-center gap-0.5 shrink-0 translate-y-0.5 ${msg.type === 'outgoing'
                                                                            ? msg.isAIGenerated ? 'text-white/50' : 'text-slate-500/60 dark:text-slate-400/60'
                                                                            : 'text-slate-400 dark:text-slate-500'
                                                                        }`}>
                                                                        <span className="text-[10px] font-medium">
                                                                            {new Date(msg.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                        {msg.type === 'outgoing' && (
                                                                            msg.status === 'read'
                                                                                ? <CheckCircle2 size={13} className="text-blue-500" />
                                                                                : msg.status === 'delivered'
                                                                                    ? <Check size={13} />
                                                                                    : msg.status === 'failed'
                                                                                        ? <XCircle size={13} className="text-red-400" />
                                                                                        : <Clock size={10} />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </React.Fragment>
                                                );
                                            });
                                        })()}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Message input */}
                                    <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shrink-0">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={messageInput}
                                                onChange={(e) => setMessageInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                                placeholder={connectionStatus === 'connected' ? 'Escribe un mensaje...' : 'Conecta WhatsApp para enviar mensajes...'}
                                                disabled={connectionStatus !== 'connected'}
                                                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-full py-2.5 px-5 text-sm font-medium focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 transition-all disabled:opacity-50 placeholder:text-slate-400"
                                            />
                                            <button
                                                onClick={handleSendMessage}
                                                disabled={!messageInput.trim() || isSending || connectionStatus !== 'connected'}
                                                className="w-11 h-11 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shrink-0"
                                            >
                                                {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} className="translate-x-0.5" />}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                /* Empty state - no conversation selected */
                                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gradient-to-br from-slate-50/50 to-green-50/30 dark:from-slate-900/50 dark:to-green-900/10">
                                    <div className="relative mb-8">
                                        <div className="w-32 h-32 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-500/10 dark:to-emerald-500/10 rounded-full flex items-center justify-center">
                                            <MessageSquare size={56} className="text-green-400" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                                            <Sparkles size={20} className="text-white" />
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-700 dark:text-white mb-3">FileHub WhatsApp</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
                                        {connectionStatus === 'connected'
                                            ? 'Selecciona una conversación de la lista para ver los mensajes completos y responder con IA.'
                                            : 'Conecta tu WhatsApp desde la pestaña "Conexión QR" para comenzar a gestionar tus conversaciones.'
                                        }
                                    </p>
                                    {connectionStatus === 'connected' && conversations.length > 0 && (
                                        <p className="text-xs text-green-600 dark:text-green-400 font-bold mt-4 flex items-center gap-1.5">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                            {conversations.length} conversación{conversations.length !== 1 ? 'es' : ''} activa{conversations.length !== 1 ? 's' : ''}
                                        </p>
                                    )}
                                    {connectionStatus !== 'connected' && (
                                        <button
                                            onClick={() => setActiveTab('config')}
                                            className="flex items-center gap-2 mt-6 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full font-bold text-sm shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 transition-all"
                                        >
                                            <QrCode size={16} />
                                            Conectar WhatsApp
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* =============== TAB: STATS =============== */}
            {activeTab === 'stats' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Mensajes Totales', value: stats.totalMessages, icon: MessageSquare, gradient: 'from-green-500 to-emerald-600' },
                            { label: 'Conversaciones', value: stats.totalConversations, icon: User, gradient: 'from-blue-500 to-indigo-600' },
                            { label: 'Respuestas IA', value: stats.aiResponses, icon: Sparkles, gradient: 'from-purple-500 to-violet-600' },
                            { label: 'Tiempo Resp. (s)', value: stats.avgResponseTime.toFixed(1), icon: Clock, gradient: 'from-amber-500 to-orange-600' }
                        ].map(stat => (
                            <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
                                <div className={`w-10 h-10 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center mb-3 shadow-lg`}>
                                    <stat.icon size={18} className="text-white" />
                                </div>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{stat.value}</p>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 dark:text-white">Actividad Reciente</h3>
                            <button
                                onClick={exportConversations}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all"
                            >
                                <Download size={14} />
                                Exportar
                            </button>
                        </div>
                        <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                            {conversations.slice(0, 5).flatMap(c => c.messages.slice(-2).map(m => ({ ...m, contactName: c.contactName })))
                                .sort((a, b) => b.timestamp - a.timestamp)
                                .slice(0, 10)
                                .map(msg => (
                                    <div key={msg.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${msg.type === 'incoming' ? 'bg-blue-50 dark:bg-blue-500/10' :
                                            msg.isAIGenerated ? 'bg-purple-50 dark:bg-purple-500/10' :
                                                'bg-green-50 dark:bg-green-500/10'
                                            }`}>
                                            {msg.type === 'incoming' ? <User size={14} className="text-blue-500" /> :
                                                msg.isAIGenerated ? <Sparkles size={14} className="text-purple-500" /> :
                                                    <Send size={14} className="text-green-500" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                                                {(msg as any).contactName} {msg.type === 'incoming' ? '→ Bot' : '← Bot'}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate">{msg.body}</p>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-medium shrink-0">
                                            {new Date(msg.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                            {conversations.length === 0 && (
                                <div className="p-12 text-center">
                                    <p className="text-sm text-slate-400">No hay actividad aún</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* =============== TAB: LOGS =============== */}
            {activeTab === 'logs' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                                <Clock size={18} className="text-slate-600 dark:text-slate-300" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 dark:text-white">Logs de Conexión</h3>
                                <p className="text-xs text-slate-500">{connectionLogs.length} entradas</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setConnectionLogs([])}
                            className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
                        >
                            <Trash2 size={14} />
                            Limpiar
                        </button>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                        {connectionLogs.length === 0 ? (
                            <div className="p-12 text-center">
                                <p className="text-sm text-slate-400">Sin logs todavía</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {connectionLogs.map((log, idx) => (
                                    <div key={idx} className="px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all">
                                        <span className="text-sm font-mono text-slate-600 dark:text-slate-300">{log}</span>
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

export default WhatsAppBotView;
