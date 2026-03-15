import React, { useState, useCallback } from 'react';
import {
  MessageSquare, RefreshCw, Star, Clock, AlertTriangle,
  CheckCircle2, ChevronRight, Phone, Users, Loader,
  Zap, Filter, Search, ArrowUp, Info, Send
} from 'lucide-react';

interface WhatsAppConversation {
  id: string;
  contact: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  urgency: 'urgent' | 'important' | 'normal';
  category: 'work' | 'personal' | 'family' | 'group' | 'unknown';
  summary: string;
  action?: string;
}

interface InboxAnalysis {
  totalUnread: number;
  urgentCount: number;
  conversations: WhatsAppConversation[];
  topPriority: string[];
  generalAdvice: string;
}

const URGENCY_CONFIG = {
  urgent:    { label: '🔴 Urgente',    color: 'text-red-500',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
  important: { label: '🟡 Importante', color: 'text-amber-500',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
  normal:    { label: '🟢 Informativo', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
};

const CATEGORY_CONFIG = {
  work:     { label: 'Trabajo',  icon: '💼' },
  personal: { label: 'Personal', icon: '👤' },
  family:   { label: 'Familia',  icon: '👨‍👩‍👧' },
  group:    { label: 'Grupo',    icon: '👥' },
  unknown:  { label: 'Otro',     icon: '💬' },
};

// Demo data to show while not connected
const DEMO_CONVERSATIONS: WhatsAppConversation[] = [
  {
    id: '1', contact: 'Dr. Martínez (Jefe)', lastMessage: 'Necesito que confirmes tu guardia del viernes urgente', timestamp: '10:23',
    unread: 3, urgency: 'urgent', category: 'work', summary: 'Tu jefe necesita confirmación de guardia del viernes',
    action: 'Confirmar disponibilidad para guardia del viernes'
  },
  {
    id: '2', contact: 'Mama', lastMessage: 'Llámame cuando puedas, tengo algo que contarte', timestamp: '09:45',
    unread: 1, urgency: 'important', category: 'family', summary: 'Tu madre quiere hablar contigo, parece algo personal',
    action: 'Llamar cuando tengas 10 minutos'
  },
  {
    id: '3', contact: 'Grupo CAP Barcelona', lastMessage: 'Reunión protocolo COVID mañana 15h, confirmar asistencia', timestamp: 'Ayer',
    unread: 12, urgency: 'urgent', category: 'group', summary: 'Reunión de protocolo mañana a las 15h, requiere confirmación',
    action: 'Confirmar asistencia a reunión de mañana'
  },
  {
    id: '4', contact: 'Ana (pareja)', lastMessage: 'Mira lo que he encontrado para el piso de Barcelona 🏠', timestamp: '08:12',
    unread: 2, urgency: 'important', category: 'personal', summary: 'Tu pareja encontró un piso interesante en Barcelona',
    action: 'Ver el piso que ha encontrado Ana'
  },
  {
    id: '5', contact: 'Compañero guardia', lastMessage: 'Oye puedes cubrirme el sábado? te cambio el domingo', timestamp: 'Ayer',
    unread: 1, urgency: 'important', category: 'work', summary: 'Compañero pide cambio de guardia sábado por domingo',
    action: 'Decidir si aceptas el cambio de guardia'
  },
  {
    id: '6', contact: 'Farmacia Murcia', lastMessage: 'Su pedido está listo para recoger', timestamp: 'Ayer',
    unread: 1, urgency: 'normal', category: 'personal', summary: 'Pedido en farmacia listo para recoger',
    action: 'Recoger pedido en farmacia'
  },
  {
    id: '7', contact: 'Grupo Amigos', lastMessage: 'El sábado quedamos a las 20h en La Cervecería', timestamp: 'Lunes',
    unread: 8, urgency: 'normal', category: 'group', summary: 'Quedada de amigos el sábado a las 20h',
    action: null
  },
  {
    id: '8', contact: 'Netflix', lastMessage: 'Nueva temporada de tu serie favorita disponible', timestamp: 'Lunes',
    unread: 1, urgency: 'normal', category: 'unknown', summary: 'Notificación de nueva temporada en Netflix',
    action: null
  },
  {
    id: '9', contact: 'Banco Santander', lastMessage: 'Movimiento en tu cuenta: -234€ supermercado', timestamp: 'Domingo',
    unread: 1, urgency: 'normal', category: 'personal', summary: 'Notificación de gasto de 234€ en supermercado',
    action: null
  },
  {
    id: '10', contact: 'Formación MIR', lastMessage: 'Nuevo material disponible: Cardiología avanzada PDF', timestamp: 'Domingo',
    unread: 1, urgency: 'normal', category: 'work', summary: 'Nuevo material de formación disponible',
    action: 'Revisar material de cardiología'
  },
];

const WhatsAppInboxView: React.FC = () => {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [analysis, setAnalysis] = useState<InboxAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'important' | 'normal'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const [botPrompt, setBotPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  const CRON_PROMPT = `Lee mis últimas 10 conversaciones de WhatsApp. Para cada una dame:
- Nombre del contacto
- Resumen en 1 línea
- Nivel de urgencia: 🔴 urgente / 🟡 importante / 🟢 informativo
- Acción recomendada si la hay

Luego lista las 3 más urgentes que debo contestar primero hoy, ordenadas por prioridad.`;

  const loadDemo = () => {
    setShowDemo(true);
    const demoAnalysis: InboxAnalysis = {
      totalUnread: DEMO_CONVERSATIONS.reduce((s, c) => s + c.unread, 0),
      urgentCount: DEMO_CONVERSATIONS.filter(c => c.urgency === 'urgent').length,
      conversations: DEMO_CONVERSATIONS,
      topPriority: ['Dr. Martínez (Jefe) — confirmar guardia viernes', 'Grupo CAP Barcelona — confirmar reunión mañana 15h', 'Compañero guardia — decidir cambio sábado/domingo'],
      generalAdvice: 'Tienes 2 temas laborales urgentes que requieren respuesta hoy. Empieza por confirmar la guardia del viernes y la reunión de protocolo.',
    };
    setConversations(DEMO_CONVERSATIONS);
    setAnalysis(demoAnalysis);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(CRON_PROMPT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const filtered = conversations.filter(c => {
    const matchFilter = filter === 'all' || c.urgency === filter;
    const matchSearch = !searchTerm || c.contact.toLowerCase().includes(searchTerm.toLowerCase()) || c.summary.toLowerCase().includes(searchTerm.toLowerCase());
    return matchFilter && matchSearch;
  });

  const sortedConvs = [...filtered].sort((a, b) => {
    const order = { urgent: 0, important: 1, normal: 2 };
    return order[a.urgency] - order[b.urgency];
  });

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8fafc] dark:bg-slate-950 p-4 md:p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <MessageSquare size={24} className="text-emerald-500" />
            Inbox WhatsApp IA
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Resumen y priorización de tus conversaciones por IA</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadDemo}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-emerald-900/20"
          >
            <Zap size={16} />
            Ver Demo
          </button>
        </div>
      </div>

      {/* How to use */}
      {!showDemo && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Info size={18} className="text-indigo-400" />
            <h2 className="font-black text-slate-800 dark:text-white">Cómo usar con tu bot</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <span className="text-lg shrink-0">1️⃣</span>
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Manda este prompt a tu bot de WhatsApp</p>
                <p className="text-xs text-slate-500 mt-0.5">El bot OpenClaw leerá tus conversaciones y te dará el resumen</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <span className="text-lg shrink-0">2️⃣</span>
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">O configura un cron automático cada mañana</p>
                <p className="text-xs text-slate-500 mt-0.5">El bot te enviará el resumen a las 7:30h sin que hagas nada</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <span className="text-lg shrink-0">3️⃣</span>
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">El resultado aparece aquí automáticamente</p>
                <p className="text-xs text-slate-500 mt-0.5">Con prioridades, resumen y acciones recomendadas</p>
              </div>
            </div>
          </div>

          {/* Prompt to copy */}
          <div className="bg-slate-900 dark:bg-slate-950 rounded-xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prompt para el bot</span>
              <button
                onClick={copyPrompt}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${copied ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                {copied ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
            <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">{CRON_PROMPT}</pre>
          </div>

          {/* Cron command */}
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
            <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-2">Cron automático cada mañana</p>
            <code className="text-xs text-slate-600 dark:text-slate-300 font-mono block leading-relaxed">
              openclaw cron add --name "resumen-whatsapp" --schedule "30 7 * * *" --message "Lee mis últimas 10 conversaciones de WhatsApp, dame resumen de cada una con urgencia 🔴/🟡/🟢 y lista las 3 más urgentes para contestar hoy"
            </code>
          </div>

          <button
            onClick={loadDemo}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black transition-colors"
          >
            Ver cómo se vería el resultado →
          </button>
        </div>
      )}

      {/* Analysis */}
      {analysis && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/60 dark:border-white/5 shadow-sm text-center">
              <div className="text-2xl font-black text-slate-800 dark:text-white">{analysis.totalUnread}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-medium">Sin leer</div>
            </div>
            <div className="bg-red-500/5 rounded-2xl p-4 border border-red-500/20 shadow-sm text-center">
              <div className="text-2xl font-black text-red-500">{analysis.urgentCount}</div>
              <div className="text-[11px] text-red-400 mt-0.5 font-medium">Urgentes</div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/60 dark:border-white/5 shadow-sm text-center">
              <div className="text-2xl font-black text-slate-800 dark:text-white">{conversations.length}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-medium">Conversaciones</div>
            </div>
          </div>

          {/* Top priority */}
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <ArrowUp size={16} className="text-red-400" />
              <h2 className="font-black text-red-500 text-sm">Contestar AHORA</h2>
            </div>
            <div className="space-y-2">
              {analysis.topPriority.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs font-black text-red-400 shrink-0">#{i + 1}</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 italic">{analysis.generalAdvice}</p>
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/5 rounded-xl text-xs text-slate-700 dark:text-white focus:outline-none focus:border-indigo-500"
                placeholder="Buscar contacto..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            {(['all', 'urgent', 'important', 'normal'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  filter === f
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200/60 dark:border-white/5 hover:border-indigo-500/40'
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'urgent' ? '🔴 Urgente' : f === 'important' ? '🟡 Importante' : '🟢 Normal'}
              </button>
            ))}
          </div>

          {/* Conversation list */}
          <div className="space-y-3">
            {sortedConvs.map((conv, i) => {
              const urg = URGENCY_CONFIG[conv.urgency];
              const cat = CATEGORY_CONFIG[conv.category];
              return (
                <div key={conv.id} className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm p-4 ${urg.border}`}>
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`w-10 h-10 ${urg.bg} rounded-xl flex items-center justify-center shrink-0 text-lg`}>
                      {cat.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-800 dark:text-white text-sm">{conv.contact}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${urg.bg} ${urg.color} border ${urg.border}`}>
                          {urg.label}
                        </span>
                        {conv.unread > 0 && (
                          <span className="text-[10px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">
                            {conv.unread}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{conv.summary}</p>

                      {conv.action && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <ChevronRight size={12} className="text-indigo-400" />
                          <span className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400">{conv.action}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-2">
                        <Clock size={11} className="text-slate-400" />
                        <span className="text-[10px] text-slate-400">{conv.timestamp}</span>
                        <span className="text-[10px] text-slate-400">·</span>
                        <span className="text-[10px] text-slate-400">{cat.label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={loadDemo}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/5 rounded-2xl text-sm font-bold text-slate-500 hover:border-indigo-500/40 transition-colors"
          >
            <RefreshCw size={14} />
            Actualizar análisis
          </button>
        </>
      )}
    </div>
  );
};

export default WhatsAppInboxView;
