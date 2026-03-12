import React from 'react';
import { ExternalLink, AlertTriangle, MessageSquare, Zap } from 'lucide-react';

interface OpenWebUIViewProps {
    url?: string;
}

const OpenWebUIView: React.FC<OpenWebUIViewProps> = ({ url }) => {
    // URL específica proporcionada por el usuario o fallback
    const targetUrl = url || 'https://decorating-entitled-officials-expiration.trycloudflare.com';

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 h-[calc(100vh-140px)] flex flex-col">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Open WebUI</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                        Interfaz de chat inteligente conectada vía Tunnel Seguro
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <a
                        href={targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all"
                    >
                        <ExternalLink size={18} />
                        Abrir Interfaz Completa
                    </a>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden relative flex flex-col">
                {/* Connection Status Bar */}
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800/30 px-6 py-3 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <Zap size={16} className="text-emerald-600 dark:text-emerald-400" />
                        <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-wide">
                            Conexión Segura Establecida (Cloudflare Tunnel)
                        </p>
                    </div>
                </div>

                {/* Iframe Container */}
                <div className="flex-1 relative bg-slate-50 dark:bg-slate-950">
                    <iframe
                        src={targetUrl}
                        className="w-full h-full border-0"
                        title="Open WebUI Interface"
                        allow="microphone; camera; clipboard-write"
                    ></iframe>

                    {/* Placeholder background/loader behind iframe */}
                    <div className="absolute inset-0 -z-10 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700">
                        <MessageSquare size={48} className="mb-4 animate-pulse" />
                        <p className="font-bold text-sm uppercase tracking-widest">Cargando Interfaz...</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OpenWebUIView;
