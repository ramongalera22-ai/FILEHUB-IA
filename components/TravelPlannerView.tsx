import React, { useState, useRef, useEffect } from 'react';
import {
  Plane, MapPin, Calendar, Plus, Trash2, Sparkles, Loader2,
  Clock, Euro, Hotel, Utensils, Camera, ChevronDown, ChevronUp,
  Copy, Check, Download, Globe, Star, X, RefreshCw, Sun,
  Navigation, Coffee, ShoppingBag, Music, Mountain, Waves,
  ExternalLink, Heart, HeartOff, Bot, Send
} from 'lucide-react';
import { chatWithKimi } from '../services/kimiService';
import { callAI } from '../services/aiProxy';
import { NY_PLAN_PRESET } from '../data/nyItinerary';

// ─── TYPES ───────────────────────────────────────────────────────
interface TravelPlan {
  id: string;
  destination: string;
  origin: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budget: number;
  currency: string;
  style: 'mochilero' | 'comfort' | 'lujo' | 'familia' | 'romantico' | 'aventura';
  interests: string[];
  notes: string;
  mustVisitPlaces?: string;  // lista de sitios obligatorios del usuario
  itinerary?: GeneratedItinerary;
  favorite: boolean;
  createdAt: string;
}

interface ItineraryDay {
  day: number;
  date: string;
  title: string;
  theme: string;
  activities: Activity[];
  meals: { breakfast?: string; lunch?: string; dinner?: string };
  tips: string[];
  estimatedCost: number;
}

interface Activity {
  time: string;
  title: string;
  type: 'transport' | 'sight' | 'food' | 'hotel' | 'activity' | 'free' | 'shopping';
  description: string;
  duration: string;
  cost?: number;
  tip?: string;
  mustSee?: boolean;
}

interface GeneratedItinerary {
  destination: string;
  summary: string;
  totalDays: number;
  estimatedTotal: number;
  currency: string;
  bestTimeToVisit: string;
  language: string;
  currency_info: string;
  days: ItineraryDay[];
  generalTips: string[];
  emergencyInfo: string;
  generatedAt: string;
  model: string;
}

const STORAGE_KEY = 'filehub_travel_plans';

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  transport: <Plane size={12} />, sight: <Camera size={12} />, food: <Utensils size={12} />,
  hotel: <Hotel size={12} />, activity: <Mountain size={12} />, free: <Sun size={12} />,
  shopping: <ShoppingBag size={12} />,
};

const ACTIVITY_COLORS: Record<string, string> = {
  transport: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  sight: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
  food: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  hotel: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400',
  activity: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  free: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  shopping: 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400',
};

const STYLE_LABELS: Record<string, string> = {
  mochilero: '🎒 Mochilero', comfort: '🏨 Confort', lujo: '👑 Lujo',
  familia: '👨‍👩‍👧 Familia', romantico: '💑 Romántico', aventura: '🏔️ Aventura',
};

const INTERESTS_OPTIONS = [
  '🏛️ Cultura e historia', '🍽️ Gastronomía', '🏖️ Playa y sol', '🌿 Naturaleza',
  '🎭 Arte y museos', '🛍️ Compras', '🌃 Vida nocturna', '🏃 Deportes',
  '📸 Fotografía', '🕌 Religión y espiritualidad', '🎵 Música', '🌊 Deportes acuáticos',
];

// ─── PROMPT BUILDER ──────────────────────────────────────────────
function buildItineraryPrompt(plan: TravelPlan): string {
  const days = Math.ceil((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / 86400000) + 1;
  const mustVisitSection = plan.mustVisitPlaces?.trim()
    ? `\nSITIOS QUE EL USUARIO QUIERE VISITAR (OBLIGATORIO incluirlos todos distribuidos por días):\n${plan.mustVisitPlaces}\n`
    : '';
  return `Crea un itinerario de viaje detallado y práctico en JSON.

DATOS DEL VIAJE:
- Destino: ${plan.destination}
- Origen: ${plan.origin}
- Fechas: ${plan.startDate} → ${plan.endDate} (${days} días)
- Viajeros: ${plan.travelers}
- Presupuesto total: ${plan.budget} ${plan.currency}
- Estilo: ${STYLE_LABELS[plan.style]}
- Intereses: ${plan.interests.join(', ')}
- Notas especiales: ${plan.notes || 'ninguna'}
${mustVisitSection}
Devuelve ÚNICAMENTE este JSON (sin texto extra, sin markdown, sin \`\`\`):
{
  "destination": "${plan.destination}",
  "summary": "Resumen atractivo del viaje en 2-3 frases",
  "totalDays": ${days},
  "estimatedTotal": <número en ${plan.currency}>,
  "currency": "${plan.currency}",
  "bestTimeToVisit": "...",
  "language": "idioma local",
  "currency_info": "info sobre moneda y pagos",
  "days": [
    {
      "day": 1,
      "date": "${plan.startDate}",
      "title": "Título del día",
      "theme": "Tema/zona del día",
      "activities": [
        {
          "time": "09:00",
          "title": "Nombre actividad",
          "type": "sight|food|transport|hotel|activity|free|shopping",
          "description": "Descripción útil y práctica",
          "duration": "2h",
          "cost": 15,
          "tip": "Consejo práctico opcional",
          "mustSee": true
        }
      ],
      "meals": {
        "breakfast": "Sugerencia desayuno con restaurante específico",
        "lunch": "Sugerencia almuerzo con restaurante específico",
        "dinner": "Sugerencia cena con restaurante específico"
      },
      "tips": ["Consejo del día 1", "Consejo del día 2"],
      "estimatedCost": <coste del día en ${plan.currency}>
    }
  ],
  "generalTips": ["tip1", "tip2", "tip3", "tip4", "tip5"],
  "emergencyInfo": "Número emergencias, embajada española si aplica, hospitales principales",
  "generatedAt": "${new Date().toISOString()}",
  "model": "Claude Haiku 4.5"
}

Instrucciones:
- Sé muy específico: nombres reales de lugares, restaurantes, museos
- Adapta al estilo ${STYLE_LABELS[plan.style]} y presupuesto ${plan.budget}${plan.currency}
- Incluye horarios realistas con tiempo de desplazamiento
- ${plan.mustVisitPlaces ? 'INTEGRA TODOS los sitios listados arriba de forma inteligente, sin sobrecargar cada día. Ritmo tranquilo.' : 'Selecciona los mejores lugares del destino'}
- Costes aproximados en ${plan.currency}
- Consejos locales que no están en las guías típicas
- Marca con mustSee:true los imprescindibles`;
}

// ─── COMPONENT ───────────────────────────────────────────────────
const TravelPlannerView: React.FC = () => {
  const [plans, setPlans] = useState<TravelPlan[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      // Auto-load NY preset if no plans yet
      if (saved.length === 0) {
        const preset = { ...NY_PLAN_PRESET, id: `ny_trip_${Date.now()}` };
        localStorage.setItem(STORAGE_KEY, JSON.stringify([preset]));
        return [preset];
      }
      return saved;
    } catch { return []; }
  });
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedPlan, setSelectedPlan] = useState<TravelPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [expandedDay, setExpandedDay] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'tips' | 'budget' | 'chat'>('itinerary');
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'assistant'; content: string; isModification?: boolean}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [selectedModel, setSelectedModel] = useState<'kimi' | 'haiku'>('haiku');
  const [showProxySettings, setShowProxySettings] = useState(false);
  const [proxyUrl, setProxyUrl] = useState(() => {
    try { return JSON.parse(localStorage.getItem('filehub_ai_proxy') || '{}').url || ''; } catch { return ''; }
  });
  const saveProxyUrl = (url: string) => {
    setProxyUrl(url);
    localStorage.setItem('filehub_ai_proxy', JSON.stringify({ url }));
  };

  const [form, setForm] = useState({
    destination: '', origin: 'Murcia, España', startDate: '', endDate: '',
    travelers: 1, budget: 1000, currency: 'EUR',
    style: 'comfort' as TravelPlan['style'],
    interests: [] as string[], notes: '',
    mustVisitPlaces: '',
  });

  const savePlans = (updated: TravelPlan[]) => {
    setPlans(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const toggleInterest = (interest: string) => {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(interest)
        ? f.interests.filter(i => i !== interest)
        : [...f.interests, interest],
    }));
  };

  const generateItinerary = async (plan: TravelPlan) => {
    setGenerating(true);
    setGenError('');
    try {
      const prompt = buildItineraryPrompt(plan);

      // callAI: Railway proxy → Anthropic direct → Kimi fallback
      const responseText = await callAI(
        [{ role: 'user', content: prompt }],
        { model: 'claude-haiku-4-5-20251001', maxTokens: 4096 }
      );

      // Parse JSON
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const startIdx = cleaned.indexOf('{');
      const endIdx = cleaned.lastIndexOf('}');
      if (startIdx === -1 || endIdx === -1) throw new Error('La IA no devolvió JSON válido. Inténtalo de nuevo.');
      const itinerary: GeneratedItinerary = JSON.parse(cleaned.slice(startIdx, endIdx + 1));
      itinerary.model = 'Claude Haiku 4.5';

      const updated = plans.map(p => p.id === plan.id ? { ...p, itinerary } : p);
      savePlans(updated);
      setSelectedPlan({ ...plan, itinerary });
    } catch (err: any) {
      setGenError(err.message || 'Error generando itinerario');
    }
    setGenerating(false);
  };

  const createPlan = () => {
    if (!form.destination.trim() || !form.startDate || !form.endDate) return;
    const plan: TravelPlan = {
      id: `trip_${Date.now()}`,
      ...form,
      favorite: false,
      createdAt: new Date().toISOString(),
    };
    savePlans([plan, ...plans]);
    setSelectedPlan(plan);
    setView('detail');
  };

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ── CHAT WITH ITINERARY ───────────────────────────────────────
  const chatWithItinerary = async () => {
    if (!chatInput.trim() || !selectedPlan?.itinerary || isChatting) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setIsChatting(true);

    const newMessages = [...chatMessages, { role: 'user' as const, content: userMsg }];
    setChatMessages(newMessages);

    // Detect if it's a modification request
    const isModification = /cambi|añad|quita|sustitu|modific|actualiz|agrega|elimina|mueve|traslad|reemplaz|borra|pon|ponme|ponle|incluye|incorpora|adapta|reorganiz/i.test(userMsg);

    const systemPrompt = `Eres el asistente de viajes de FileHub. Tienes acceso al itinerario completo de ${selectedPlan.destination}.

ITINERARIO ACTUAL (JSON):
${JSON.stringify(selectedPlan.itinerary, null, 2)}

INSTRUCCIONES:
- Si el usuario pide información, preguntas o consejos: responde en texto claro y útil.
- Si el usuario pide MODIFICAR el itinerario (cambiar, añadir, quitar, mover actividades, cambiar restaurantes, etc.):
  1. Explica brevemente qué vas a cambiar
  2. Devuelve el itinerario COMPLETO modificado en JSON válido entre las etiquetas <ITINERARY_UPDATE> y </ITINERARY_UPDATE>
  3. El JSON debe tener exactamente la misma estructura que el original
- Responde SIEMPRE en español.
- Sé conciso en la explicación (2-3 frases máximo antes del JSON).
- Preserva TODOS los días y actividades que no se modifican.`;

    try {
      const responseText = await callAI(
        newMessages.slice(-6).map(m => ({ role: m.role as 'user'|'assistant', content: m.content })),
        {
          system: systemPrompt,
          model: 'claude-haiku-4-5-20251001',
          maxTokens: isModification ? 8000 : 1024,
        }
      );

      // Check if response contains itinerary update
      const updateMatch = responseText.match(/<ITINERARY_UPDATE>([\s\S]*?)<\/ITINERARY_UPDATE>/);
      let displayText = responseText.replace(/<ITINERARY_UPDATE>[\s\S]*?<\/ITINERARY_UPDATE>/g, '').trim();

      if (updateMatch) {
        try {
          const jsonStr = updateMatch[1].trim();
          const start = jsonStr.indexOf('{');
          const end = jsonStr.lastIndexOf('}');
          const updatedItinerary = JSON.parse(jsonStr.slice(start, end + 1));
          updatedItinerary.model = updatedItinerary.model || selectedPlan.itinerary.model;

          // Apply the update
          const updatedPlan = { ...selectedPlan, itinerary: updatedItinerary };
          const updatedPlans = plans.map(p => p.id === selectedPlan.id ? updatedPlan : p);
          savePlans(updatedPlans);
          setSelectedPlan(updatedPlan);

          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: displayText || '✅ Itinerario actualizado correctamente.',
            isModification: true
          }]);
        } catch {
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: displayText || responseText
          }]);
        }
      } else {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: responseText
        }]);
      }
    } catch (err: any) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ ${err.message}`
      }]);
    }
    setIsChatting(false);
  };

  const deletePlan = (id: string) => {
    savePlans(plans.filter(p => p.id !== id));
    if (selectedPlan?.id === id) { setSelectedPlan(null); setView('list'); }
  };

  const toggleFavorite = (id: string) => {
    const updated = plans.map(p => p.id === id ? { ...p, favorite: !p.favorite } : p);
    savePlans(updated);
    if (selectedPlan?.id === id) setSelectedPlan(prev => prev ? { ...prev, favorite: !prev.favorite } : null);
  };

  const copyItinerary = () => {
    if (!selectedPlan?.itinerary) return;
    const it = selectedPlan.itinerary;
    const text = `🌍 ITINERARIO: ${it.destination}\n${'='.repeat(40)}\n${it.summary}\n\n${
      it.days.map(d => `📅 DÍA ${d.day}: ${d.title}\n${d.activities.map(a => `  ${a.time} ${a.mustSee ? '⭐' : '·'} ${a.title}: ${a.description}${a.cost ? ` (~${a.cost}€)` : ''}`).join('\n')}`).join('\n\n')
    }\n\n💡 CONSEJOS GENERALES:\n${it.generalTips.map(t => `• ${t}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const days = form.startDate && form.endDate
    ? Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000) + 1
    : 0;

  // ── LIST VIEW ────────────────────────────────────────────────
  if (view === 'list') return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/25">
            <Plane size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">Planificador de Viajes IA</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Itinerarios con Kimi 2.5 · Claude Haiku 4.5</p>
          </div>
        </div>
        <button onClick={() => setView('create')}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-sky-500/25 hover:scale-105 transition-all">
          <Plus size={18} /> Nuevo viaje
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="text-6xl mb-4">✈️</div>
          <p className="font-black text-xl text-slate-700 dark:text-slate-200 mb-2">¿A dónde quieres ir?</p>
          <p className="text-sm text-slate-400 max-w-xs">Dinos el destino, fechas y presupuesto, y la IA te diseña el itinerario perfecto.</p>
          <button onClick={() => setView('create')}
            className="mt-6 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold rounded-2xl shadow-lg hover:scale-105 transition-all">
            <Plus size={16} /> Planificar primer viaje
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => {
            const d = plan.startDate && plan.endDate
              ? Math.ceil((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / 86400000) + 1 : 0;
            return (
              <div key={plan.id} className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:border-sky-400/50 hover:shadow-lg transition-all">
                {/* Top gradient bar */}
                <div className="h-1.5 bg-gradient-to-r from-sky-500 to-blue-600" />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🌍</span>
                      <div>
                        <h3 className="font-black text-slate-800 dark:text-white">{plan.destination}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">desde {plan.origin.split(',')[0]}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => toggleFavorite(plan.id)}
                        className="p-1.5 rounded-lg hover:bg-pink-50 dark:hover:bg-pink-500/10 transition-colors">
                        {plan.favorite ? <Heart size={14} className="text-pink-500 fill-pink-500" /> : <HeartOff size={14} className="text-slate-400" />}
                      </button>
                      <button onClick={() => deletePlan(plan.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={14} className="text-slate-400 hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="text-[10px] font-bold px-2 py-1 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-lg flex items-center gap-1"><Calendar size={9}/>{d} días</span>
                    <span className="text-[10px] font-bold px-2 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center gap-1"><Euro size={9}/>{plan.budget}</span>
                    <span className="text-[10px] font-bold px-2 py-1 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg">{STYLE_LABELS[plan.style]}</span>
                  </div>
                  {plan.startDate && <p className="text-xs text-slate-400 mb-3">{plan.startDate} → {plan.endDate}</p>}
                  <button onClick={() => { setSelectedPlan(plan); setView('detail'); setExpandedDay(0); setActiveTab('itinerary'); }}
                    className={`w-full py-2.5 rounded-xl text-sm font-black transition-all ${
                      plan.itinerary
                        ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm hover:opacity-90'
                        : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-500/10'
                    }`}>
                    {plan.itinerary ? '📋 Ver itinerario' : '✨ Generar itinerario IA'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── CREATE VIEW ──────────────────────────────────────────────
  if (view === 'create') return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
          <X size={18} className="text-slate-600" />
        </button>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">Nuevo viaje</h2>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
        {/* Destination + origin */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">🌍 Destino *</label>
            <input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
              placeholder="Tokio, Japón / París, Francia..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400" />
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">🛫 Origen</label>
            <input value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500/20" />
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">👥 Viajeros</label>
            <input type="number" min={1} max={20} value={form.travelers} onChange={e => setForm(f => ({ ...f, travelers: +e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500/20" />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">📅 Ida *</label>
            <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500/20" />
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">📅 Vuelta *</label>
            <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500/20" />
          </div>
        </div>
        {days > 0 && <p className="text-xs text-sky-600 font-bold text-center">✈️ {days} días de viaje</p>}

        {/* Budget */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">💶 Presupuesto total</label>
            <input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: +e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500/20" />
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">Moneda</label>
            <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-3 text-sm font-bold focus:ring-2 focus:ring-sky-500/20">
              <option>EUR</option><option>USD</option><option>GBP</option><option>JPY</option><option>MXN</option>
            </select>
          </div>
        </div>

        {/* Style */}
        <div>
          <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2 block">🎯 Estilo de viaje</label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(STYLE_LABELS).map(([key, label]) => (
              <button key={key} onClick={() => setForm(f => ({ ...f, style: key as TravelPlan['style'] }))}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                  form.style === key ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-sky-50'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Interests */}
        <div>
          <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2 block">❤️ Intereses</label>
          <div className="flex flex-wrap gap-2">
            {INTERESTS_OPTIONS.map(interest => (
              <button key={interest} onClick={() => toggleInterest(interest)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  form.interests.includes(interest) ? 'bg-sky-500 text-white' : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-sky-50'
                }`}>
                {interest}
              </button>
            ))}
          </div>
        </div>

        {/* Must-visit places */}
        <div>
          <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">📍 Sitios que quiero visitar</label>
          <textarea value={form.mustVisitPlaces} onChange={e => setForm(f => ({ ...f, mustVisitPlaces: e.target.value }))}
            placeholder="Pega aquí tu lista de sitios (uno por línea):&#10;- Times Square&#10;- Central Park&#10;- MOMA&#10;- Brooklyn Bridge..."
            rows={5} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 font-mono" />
          <p className="text-[10px] text-slate-400 mt-1">La IA los distribuirá en los días de forma equilibrada y sin agobios</p>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5 block">📝 Notas especiales</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Alergias, movilidad reducida, preferencias, ocasión especial..."
            rows={2} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-sky-500/20" />
        </div>

        {/* Model selector */}
        <div>
          <label className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2 block">🤖 Modelo IA para generar</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setSelectedModel('kimi')}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                selectedModel === 'kimi' ? 'bg-violet-500 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
              🌙 Kimi k2 (OpenClaw)
            </button>
            <button onClick={() => setSelectedModel('haiku')}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                selectedModel === 'haiku' ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
              ⚡ Claude Haiku 4.5
            </button>
          </div>
        </div>

        <button onClick={createPlan} disabled={!form.destination || !form.startDate || !form.endDate}
          className="w-full py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black rounded-2xl shadow-lg shadow-sky-500/20 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
          <Plane size={18} /> Crear viaje y generar itinerario IA
        </button>
      </div>
    </div>
  );

  // ── DETAIL / ITINERARY VIEW ──────────────────────────────────
  if (!selectedPlan) { setView('list'); return null; }
  const it = selectedPlan.itinerary;

  // Budget breakdown helpers
  const budgetScenarios = it ? [
    { label: 'Gasto total estimado', amount: it.estimatedTotal, color: 'text-slate-800 dark:text-white' },
    { label: `Tu presupuesto libre`, amount: selectedPlan.budget, color: selectedPlan.budget >= it.estimatedTotal ? 'text-emerald-600' : 'text-amber-500' },
  ] : [];

  // Cost by category from activities
  const costByType = it ? it.days.reduce((acc: Record<string,number>, day) => {
    (day.activities || []).forEach((act: any) => {
      if (act.cost && act.cost > 0) {
        const cat = act.type === 'food' ? '🍽️ Comida' : act.type === 'transport' ? '🚇 Transporte' : act.type === 'hotel' ? '🏨 Alojamiento' : '🎭 Actividades';
        acc[cat] = (acc[cat] || 0) + act.cost;
      }
    });
    return acc;
  }, {}) : {};

  return (
    <div className="space-y-4">
      {/* ── HEADER ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6 text-white shadow-2xl">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <button onClick={() => setView('list')} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
              <X size={16} />
            </button>
            <div className="flex gap-2">
              <button onClick={() => toggleFavorite(selectedPlan.id)} className="p-2 bg-white/10 hover:bg-pink-500/40 rounded-xl transition-all">
                {selectedPlan.favorite ? <Heart size={16} className="text-pink-400 fill-pink-400" /> : <HeartOff size={16} className="text-white/60" />}
              </button>
              {it && <button onClick={copyItinerary} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-white/60" />}
              </button>}
            </div>
          </div>
          <div className="mb-4">
            <p className="text-sky-300 text-[10px] font-black uppercase tracking-widest mb-1">Próximo viaje</p>
            <h2 className="text-3xl font-black tracking-tight leading-none">🗽 {selectedPlan.destination}</h2>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="bg-white/10 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"><Calendar size={11}/>{selectedPlan.startDate} → {selectedPlan.endDate}</span>
              <span className="bg-white/10 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"><Euro size={11}/>Presupuesto libre: {selectedPlan.budget}€</span>
              <span className="bg-white/10 px-3 py-1.5 rounded-xl text-xs font-bold">{STYLE_LABELS[selectedPlan.style]}</span>
            </div>
          </div>
          {it && (
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
              <p className="text-xs text-white/70 leading-relaxed">{it.summary}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {it.bestTimeToVisit && <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-lg font-bold">☀️ {it.bestTimeToVisit}</span>}
                <span className="text-[10px] bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-lg font-bold">🌍 {it.language}</span>
                <span className="text-[10px] bg-sky-400/20 text-sky-300 px-2 py-0.5 rounded-lg font-bold">✈️ {it.totalDays} días</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── GENERATE (if no itinerary) ───────────────────────── */}
      {!it ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8 text-center shadow-sm">
          <div className="text-5xl mb-4">✨</div>
          <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Generar itinerario con IA</h3>
          <p className="text-sm text-slate-500 mb-6">La IA diseñará un itinerario detallado día a día con actividades, restaurantes y consejos.</p>
          <div className="flex gap-2 justify-center mb-5">
            {(['kimi','haiku'] as const).map(m => (
              <button key={m} onClick={() => setSelectedModel(m)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedModel===m?(m==='kimi'?'bg-violet-500 text-white':'bg-orange-500 text-white'):'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                {m==='kimi'?'🌙 Kimi k2':'⚡ Haiku 4.5'}
              </button>
            ))}
          </div>
          {genError && <p className="text-sm text-red-500 mb-3">❌ {genError}</p>}
          <button onClick={() => generateItinerary(selectedPlan)} disabled={generating}
            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black rounded-2xl shadow-lg hover:opacity-90 disabled:opacity-50 transition-all mx-auto">
            {generating ? <><Loader2 size={18} className="animate-spin"/>Generando...</> : <><Sparkles size={18}/>Generar itinerario</>}
          </button>
          {generating && <p className="text-xs text-slate-400 mt-3">Esto puede tardar 20-30 segundos...</p>}
        </div>
      ) : (
        <>
          {/* ── TABS ─────────────────────────────────────────── */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto">
            {[
              { id: 'itinerary', label: '📋 Días' },
              { id: 'budget', label: '💰 Presupuesto' },
              { id: 'chat', label: `🤖 Chat IA${chatMessages.length > 0 ? ` (${chatMessages.length})` : ''}` },
              { id: 'tips', label: '💡 Tips' },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                className={`px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 ${activeTab===t.id ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── TAB: ITINERARIO ──────────────────────────────── */}
          {activeTab === 'itinerary' && (
            <div className="space-y-3">
              {it.days.map((day: any, idx: number) => {
                const dayDate = new Date(day.date + 'T12:00:00');
                const weekday = dayDate.toLocaleDateString('es-ES', { weekday: 'long' });
                const dateStr = dayDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
                const isOpen = expandedDay === idx;
                const paidActs = (day.activities || []).filter((a:any) => a.title?.includes('🤑'));
                const totalFreeDay = (day.activities||[]).reduce((s:number,a:any)=>s+(a.cost||0),0);

                return (
                  <div key={day.day} className={`rounded-2xl border overflow-hidden transition-all duration-200 ${isOpen ? 'border-sky-400/60 shadow-lg' : 'border-slate-200 dark:border-slate-700'}`}>
                    {/* Day header button */}
                    <button onClick={() => setExpandedDay(isOpen ? null : idx)}
                      className={`w-full flex items-center gap-3 p-4 text-left transition-all ${isOpen ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white' : 'bg-white dark:bg-slate-800'}`}>
                      {/* Date badge */}
                      <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 shadow-sm ${isOpen ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>
                        <span className="text-[9px] uppercase tracking-wider">{weekday.slice(0,3)}</span>
                        <span className="text-xl leading-tight">{dayDate.getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-black text-sm leading-snug ${isOpen ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{day.title}</p>
                        <p className={`text-[11px] mt-0.5 truncate ${isOpen ? 'text-sky-100' : 'text-slate-400'}`}>{dateStr} · {(day.activities||[]).length} paradas · {totalFreeDay > 0 ? `~${totalFreeDay}€` : 'Gratis'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {paidActs.length > 0 && <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${isOpen?'bg-white/20 text-white':'bg-amber-50 dark:bg-amber-500/10 text-amber-600'}`}>🤑 ×{paidActs.length}</span>}
                        {isOpen ? <ChevronUp size={15} className="text-white/70"/> : <ChevronDown size={15} className="text-slate-400"/>}
                      </div>
                    </button>

                    {/* Day content */}
                    {isOpen && (
                      <div className="bg-white dark:bg-slate-800 border-t border-sky-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/50">
                        {/* Activities timeline */}
                        <div className="p-4 space-y-0">
                          {(day.activities||[]).map((act: any, ai: number) => (
                            <div key={ai} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
                              {/* Time + line */}
                              <div className="flex flex-col items-center shrink-0 w-10">
                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 font-mono">{act.time}</span>
                                {ai < (day.activities.length-1) && <div className="w-px flex-1 bg-slate-100 dark:bg-slate-700 mt-1"/>}
                              </div>
                              {/* Content */}
                              <div className="flex-1 min-w-0 pb-1">
                                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                  <span className={`inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-md ${ACTIVITY_COLORS[act.type] || 'bg-slate-100 text-slate-500'}`}>
                                    {ACTIVITY_ICONS[act.type]}{act.type}
                                  </span>
                                  {act.mustSee && <span className="text-[9px] font-black text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded-md">⭐ must-see</span>}
                                  {act.title?.includes('🤑') && <span className="text-[9px] font-black text-violet-600 bg-violet-50 dark:bg-violet-500/10 px-1.5 py-0.5 rounded-md">🤑 pagado</span>}
                                </div>
                                <p className="font-bold text-sm text-slate-800 dark:text-white leading-snug">{act.title}</p>
                                {act.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{act.description}</p>}
                                <div className="flex items-center gap-3 mt-1">
                                  {act.duration && <span className="text-[10px] text-slate-400 flex items-center gap-0.5">⏱ {act.duration}</span>}
                                  {act.cost > 0 && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">💶 ~{act.cost}€</span>}
                                  {act.cost === 0 && act.type !== 'hotel' && <span className="text-[10px] font-bold text-emerald-600">✓ Gratis</span>}
                                </div>
                                {act.tip && (
                                  <div className="mt-1.5 flex gap-1.5 items-start bg-sky-50 dark:bg-sky-500/10 rounded-lg px-2 py-1.5">
                                    <span className="text-sky-500 text-[10px] shrink-0 mt-px">💡</span>
                                    <p className="text-[10px] text-sky-700 dark:text-sky-300 leading-relaxed">{act.tip}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Meals strip */}
                        {(day.meals?.breakfast || day.meals?.lunch || day.meals?.dinner) && (
                          <div className="px-4 py-3 bg-orange-50/50 dark:bg-orange-500/5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-orange-500 mb-2">🍽️ Comidas del día</p>
                            <div className="grid grid-cols-3 gap-2">
                              {[{label:'Desayuno',emoji:'☕',val:day.meals.breakfast},{label:'Almuerzo',emoji:'🍜',val:day.meals.lunch},{label:'Cena',emoji:'🌙',val:day.meals.dinner}].map(m => m.val && (
                                <div key={m.label} className="bg-white dark:bg-slate-800 rounded-xl p-2 border border-orange-100 dark:border-orange-500/10">
                                  <p className="text-[9px] font-black text-orange-400 uppercase tracking-wider">{m.emoji} {m.label}</p>
                                  <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">{m.val}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Day tips */}
                        {day.tips?.length > 0 && (
                          <div className="px-4 py-3 space-y-1">
                            {day.tips.map((tip: string, ti: number) => (
                              <p key={ti} className="text-[11px] text-slate-500 dark:text-slate-400 flex gap-2 leading-relaxed">
                                <span className="text-violet-400 shrink-0">→</span>{tip}
                              </p>
                            ))}
                          </div>
                        )}

                        {/* Day cost footer */}
                        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Coste estimado día {day.day}</span>
                          <span className="font-black text-sm text-slate-700 dark:text-slate-200">{day.estimatedCost}€</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── TAB: PRESUPUESTO ─────────────────────────────── */}
          {activeTab === 'budget' && (
            <div className="space-y-4">
              {/* Hero total */}
              <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-3xl p-6 text-white">
                <p className="text-[10px] font-black uppercase tracking-widest text-sky-300 mb-1">Gasto total estimado</p>
                <p className="text-5xl font-black tracking-tight">{it.estimatedTotal}€</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${selectedPlan.budget >= it.estimatedTotal ? 'bg-emerald-400' : 'bg-amber-400'}`}/>
                  <p className="text-sm text-white/70">
                    Tu presupuesto libre: <span className={`font-black ${selectedPlan.budget >= it.estimatedTotal ? 'text-emerald-400' : 'text-amber-400'}`}>{selectedPlan.budget}€</span>
                    {selectedPlan.budget >= it.estimatedTotal ? ' ✅ cubierto' : ' ⚠️ excedido'}
                  </p>
                </div>
                <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${selectedPlan.budget >= it.estimatedTotal ? 'bg-emerald-400' : 'bg-amber-400'}`}
                    style={{ width: `${Math.min((it.estimatedTotal / Math.max(selectedPlan.budget, it.estimatedTotal)) * 100, 100)}%` }}/>
                </div>
              </div>

              {/* Info nota presupuesto */}
              <div className="bg-sky-50 dark:bg-sky-500/10 rounded-2xl border border-sky-200 dark:border-sky-500/20 p-4">
                <p className="text-xs font-black text-sky-700 dark:text-sky-400 mb-1">ℹ️ Sobre el presupuesto</p>
                <p className="text-xs text-sky-600 dark:text-sky-300 leading-relaxed">
                  <strong>Desayunos incluidos (0€)</strong> en LIC Plaza días 1-6. Día 7 (Pod Brooklyn) no incluye — brunch ~14€.<br/>
                  <strong>Cenas supermercado</strong> ~7€/noche. Las actividades 🤑 ya están pagadas y no restan del presupuesto libre.<br/>
                  Si Summit + Tour + MOMA ya pagados: gasto libre real ≈ <strong>193€</strong> ✅
                </p>
              </div>

              {/* Day by day bars */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="font-black text-slate-800 dark:text-white text-sm">Desglose por días</h3>
                </div>
                <div className="p-5 space-y-3">
                  {it.days.map((day: any) => {
                    const pct = Math.min((day.estimatedCost / Math.max(...it.days.map((d:any)=>d.estimatedCost))) * 100, 100);
                    const dayDate = new Date(day.date + 'T12:00:00');
                    const label = dayDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
                    return (
                      <div key={day.day} className="flex items-center gap-3">
                        <div className="w-20 shrink-0">
                          <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">{label}</p>
                          <p className="text-[9px] text-slate-400 truncate">{day.title.split('·')[0].trim().replace(/[🗽✈️🌃🎭🌿🏛️]/g,'').trim().slice(0,18)}...</p>
                        </div>
                        <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${day.estimatedCost > 60 ? 'bg-gradient-to-r from-red-400 to-rose-500' : day.estimatedCost > 30 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-sky-400 to-blue-500'}`}
                            style={{ width: `${pct}%` }}/>
                        </div>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-200 w-10 text-right shrink-0">{day.estimatedCost}€</span>
                      </div>
                    );
                  })}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">Total</span>
                    <span className="text-2xl font-black text-slate-800 dark:text-white">{it.estimatedTotal}€</span>
                  </div>
                </div>
              </div>

              {/* By category */}
              {Object.keys(costByType).length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="font-black text-slate-800 dark:text-white text-sm">Por categoría</h3>
                  </div>
                  <div className="p-5 grid grid-cols-2 gap-3">
                    {Object.entries(costByType).map(([cat, total]) => (
                      <div key={cat} className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3">
                        <p className="text-xs font-black text-slate-600 dark:text-slate-300">{cat}</p>
                        <p className="text-xl font-black text-slate-800 dark:text-white">{Math.round(total as number)}€</p>
                        <p className="text-[10px] text-slate-400">{Math.round(((total as number)/it.estimatedTotal)*100)}% del total</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scenarios if paid */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="font-black text-slate-800 dark:text-white text-sm">Escenarios según 🤑 pagados</h3>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-slate-700">
                  {[
                    { label: 'Todo de pago libre', amount: it.estimatedTotal, note: '' },
                    { label: 'Summit ya pagado (-35€)', amount: it.estimatedTotal - 35, note: '' },
                    { label: '+ Tour ya pagado (-50€)', amount: it.estimatedTotal - 35 - 50, note: '✅ Dentro del presupuesto' },
                    { label: '+ MOMA ya pagado (-27€)', amount: it.estimatedTotal - 35 - 50 - 27, note: '💚 Muy holgado' },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{s.label}</p>
                        {s.note && <p className="text-[10px] text-emerald-600">{s.note}</p>}
                      </div>
                      <span className={`text-sm font-black ${s.amount <= selectedPlan.budget ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-200'}`}>{s.amount}€</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Regenerate */}
              <button onClick={() => generateItinerary(selectedPlan)} disabled={generating}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-sky-300 dark:border-sky-500/40 rounded-2xl text-sm font-bold text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/5 transition-all disabled:opacity-50">
                {generating ? <Loader2 size={15} className="animate-spin"/> : <RefreshCw size={15}/>}
                {generating ? 'Regenerando...' : 'Regenerar itinerario con IA'}
              </button>
            </div>
          )}

          {/* ── TAB: CHAT IA ─────────────────────────────────── */}
          {activeTab === 'chat' && (
            <div className="flex flex-col gap-3" style={{ minHeight: '480px' }}>
              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-500/10 dark:to-indigo-500/5 rounded-2xl border border-violet-200 dark:border-violet-500/20 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-md">
                    <Bot size={16} className="text-white"/>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-black text-sm text-violet-700 dark:text-violet-400">Chat IA — modifica el itinerario</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black px-2 py-0.5 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-lg">Groq</span>
                        <span className="text-[9px] font-black px-2 py-0.5 bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-lg">Haiku 4.5</span>
                        <button onClick={() => setShowProxySettings(p => !p)}
                          className="text-[10px] font-bold px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-lg hover:bg-slate-200 transition-all">
                          ⚙️
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-violet-600/70 dark:text-violet-400/60 mt-0.5">Los cambios se aplican y guardan automáticamente</p>
                    {showProxySettings && (
                      <div className="mt-2 bg-white dark:bg-slate-800 rounded-xl border border-violet-200 dark:border-violet-500/20 p-3 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-violet-600">🔧 URL Proxy Cloudflare Worker</p>
                        <input value={proxyUrl} onChange={e => saveProxyUrl(e.target.value)}
                          placeholder="https://filehub-ai-proxy.TU-USUARIO.workers.dev"
                          className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-violet-400"/>
                        <div className="bg-amber-50 dark:bg-amber-500/10 rounded-lg p-2 text-[10px] text-amber-700 dark:text-amber-300 space-y-0.5">
                          <p className="font-bold mb-1">Desde Terminal en tu Mac:</p>
                          <p className="font-mono">npm install -g wrangler && wrangler login</p>
                          <p className="font-mono">cd ~/Desktop/filehub/cloudflare-worker</p>
                          <p className="font-mono">wrangler secret put GROQ_KEY</p>
                          <p className="font-mono">wrangler secret put OR_KEY</p>
                          <p className="font-mono">wrangler deploy → copia la URL aquí</p>
                        </div>
                        <button onClick={() => setShowProxySettings(false)}
                          className="w-full py-1.5 bg-violet-500 text-white text-xs font-bold rounded-lg">✓ Guardar</button>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {['Cambia el restaurante del día 3','Añade el Cloisters al día 6','¿Cuánto cuesta el MOMA?','Mueve la High Line al día 3','Quita el Tour de Contrastes','¿Cómo llego desde JFK?'].map(s => (
                        <button key={s} onClick={() => setChatInput(s)}
                          className="text-[10px] font-bold px-2.5 py-1 bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 rounded-lg hover:bg-violet-200 transition-all border border-violet-200 dark:border-violet-500/30">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[380px] pr-1">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center py-10 text-center text-slate-400">
                    <div className="text-4xl mb-3">💬</div>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-300">Sin mensajes aún</p>
                    <p className="text-xs mt-1">Usa los accesos rápidos o escribe tu petición</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role==='user'?'justify-end':'justify-start'}`}>
                    {msg.role==='assistant' && <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shrink-0 mt-1 shadow-sm"><Bot size={12} className="text-white"/></div>}
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role==='user'?'bg-sky-500 text-white rounded-br-sm':msg.isModification?'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-200 rounded-bl-sm':'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-bl-sm'}`}>
                      {msg.isModification && <div className="flex items-center gap-1.5 mb-1.5 text-emerald-600 dark:text-emerald-400"><Check size={12}/><span className="text-[10px] font-black uppercase tracking-wider">Itinerario actualizado ✅</span></div>}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.role==='user' && <div className="w-7 h-7 bg-sky-100 dark:bg-sky-500/20 rounded-xl flex items-center justify-center shrink-0 mt-1"><Navigation size={12} className="text-sky-600"/></div>}
                  </div>
                ))}
                {isChatting && (
                  <div className="flex gap-2">
                    <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shrink-0"><Bot size={12} className="text-white"/></div>
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                      <Loader2 size={12} className="animate-spin text-violet-500"/>
                      <span className="text-xs text-slate-400">Pensando...</span>
                      <span className="text-[9px] font-black bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded">Groq · Haiku 4.5</span>
                      {[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{animationDelay:`${i*0.12}s`}}/>)}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef}/>
              </div>
              <div className="flex gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2 focus-within:border-violet-400/60 transition-all shadow-sm">
                <textarea value={chatInput} onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();chatWithItinerary();}}}
                  placeholder="¿Qué quieres cambiar? (Enter para enviar)" rows={2}
                  className="flex-1 bg-transparent border-0 outline-none resize-none text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 px-2 py-1"/>
                <button onClick={chatWithItinerary} disabled={isChatting||!chatInput.trim()}
                  className="self-end p-2.5 bg-gradient-to-br from-violet-500 to-indigo-600 text-white rounded-xl hover:opacity-90 disabled:opacity-40 transition-all shadow-sm">
                  {isChatting?<Loader2 size={15} className="animate-spin"/>:<Send size={15}/>}
                </button>
              </div>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-[9px] font-black px-2 py-0.5 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-lg">⚡ Groq Llama 3.3</span>
                <span className="text-[9px] text-slate-400">·</span>
                <span className="text-[9px] font-black px-2 py-0.5 bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-lg">🤖 Claude Haiku 4.5</span>
                <span className="text-[9px] text-slate-400">· Enter para enviar</span>
              </div>
            </div>
          )}

          {/* ── TAB: TIPS ────────────────────────────────────── */}
          {activeTab === 'tips' && (
            <div className="space-y-4">
              {it.generalTips?.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-amber-50 dark:bg-amber-500/5">
                    <h3 className="font-black text-slate-800 dark:text-white text-sm flex items-center gap-2">⭐ Consejos esenciales</h3>
                  </div>
                  <div className="divide-y divide-slate-50 dark:divide-slate-700">
                    {it.generalTips.map((tip: string, i: number) => (
                      <div key={i} className="flex gap-3 items-start px-5 py-3">
                        <span className="w-5 h-5 bg-amber-100 dark:bg-amber-500/20 text-amber-600 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black mt-0.5">{i+1}</span>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {it.emergencyInfo && (
                <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-200 dark:border-red-500/20 p-5">
                  <h3 className="font-black text-red-700 dark:text-red-400 text-sm mb-2">🚨 Emergencias y datos útiles</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{it.emergencyInfo}</p>
                </div>
              )}
              {it.currency_info && (
                <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 p-5">
                  <h3 className="font-black text-emerald-700 dark:text-emerald-400 text-sm mb-2">💳 Dinero y pagos</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{it.currency_info}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TravelPlannerView;
