import React, { useState, useRef } from 'react';
import {
  Plane, MapPin, Calendar, Plus, Trash2, Sparkles, Loader2,
  Clock, Euro, Hotel, Utensils, Camera, ChevronDown, ChevronUp,
  Copy, Check, Download, Globe, Star, X, RefreshCw, Sun,
  Navigation, Coffee, ShoppingBag, Music, Mountain, Waves,
  ExternalLink, Heart, HeartOff, Bot
} from 'lucide-react';
import { chatWithKimi } from '../services/kimiService';

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
  "model": "Kimi k2"
}

Instrucciones:
- Sé muy específico: nombres reales de lugares, restaurantes, museos
- Adapta al estilo ${STYLE_LABELS[plan.style]} y presupuesto ${plan.budget}${plan.currency}
- Incluye horarios realistas con tiempo de desplazamiento
- Costes aproximados en ${plan.currency}
- Consejos locales que no están en las guías típicas
- Marca con mustSee:true los imprescindibles`;
}

// ─── COMPONENT ───────────────────────────────────────────────────
const TravelPlannerView: React.FC = () => {
  const [plans, setPlans] = useState<TravelPlan[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedPlan, setSelectedPlan] = useState<TravelPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [expandedDay, setExpandedDay] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'tips' | 'budget'>('itinerary');
  const [selectedModel, setSelectedModel] = useState<'kimi' | 'haiku'>('kimi');

  const [form, setForm] = useState({
    destination: '', origin: 'Murcia, España', startDate: '', endDate: '',
    travelers: 1, budget: 1000, currency: 'EUR',
    style: 'comfort' as TravelPlan['style'],
    interests: [] as string[], notes: '',
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

      let responseText = '';

      if (selectedModel === 'haiku') {
        // Use Claude Haiku via Anthropic API artifact pattern
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 4096,
            messages: [{ role: 'user', content: prompt }],
          }),
        });
        if (!resp.ok) throw new Error(`Haiku API ${resp.status}`);
        const data = await resp.json();
        responseText = data.content?.[0]?.text || '';
      } else {
        // Use Kimi
        responseText = await chatWithKimi(
          [{ role: 'user', content: prompt }],
          {}, { maxTokens: 4096, temperature: 0.7 }
        );
      }

      // Parse JSON
      const jsonStr = responseText
        .replace(/```json\n?/g, '').replace(/```\n?/g, '')
        .trim();
      const startIdx = jsonStr.indexOf('{');
      const endIdx = jsonStr.lastIndexOf('}');
      const itinerary: GeneratedItinerary = JSON.parse(jsonStr.slice(startIdx, endIdx + 1));
      itinerary.model = selectedModel === 'haiku' ? 'Claude Haiku 4.5' : 'Kimi k2';

      const updated = plans.map(p =>
        p.id === plan.id ? { ...p, itinerary } : p
      );
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <X size={18} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              🌍 {selectedPlan.destination}
              {selectedPlan.favorite && <Heart size={14} className="text-pink-500 fill-pink-500" />}
            </h2>
            <p className="text-xs text-slate-500">{selectedPlan.startDate} → {selectedPlan.endDate} · {selectedPlan.travelers} viajero{selectedPlan.travelers > 1 ? 's' : ''} · {STYLE_LABELS[selectedPlan.style]}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toggleFavorite(selectedPlan.id)} className="p-2 hover:bg-pink-50 dark:hover:bg-pink-500/10 rounded-xl transition-colors">
            {selectedPlan.favorite ? <Heart size={16} className="text-pink-500 fill-pink-500" /> : <HeartOff size={16} className="text-slate-400" />}
          </button>
          {it && <button onClick={copyItinerary} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-slate-400" />}
          </button>}
        </div>
      </div>

      {/* Generate button or summary */}
      {!it ? (
        <div className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-500/10 dark:to-blue-500/5 rounded-3xl border border-sky-200 dark:border-sky-500/20 p-8 text-center">
          <div className="text-5xl mb-4">✨</div>
          <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Generar itinerario con IA</h3>
          <p className="text-sm text-slate-500 mb-6">La IA diseñará un itinerario detallado día a día con actividades, restaurantes y consejos locales.</p>

          <div className="flex gap-2 justify-center mb-4">
            <button onClick={() => setSelectedModel('kimi')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedModel === 'kimi' ? 'bg-violet-500 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}>
              🌙 Kimi k2
            </button>
            <button onClick={() => setSelectedModel('haiku')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedModel === 'haiku' ? 'bg-orange-500 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}>
              ⚡ Claude Haiku 4.5
            </button>
          </div>

          {genError && <p className="text-sm text-red-500 mb-3">❌ {genError}</p>}

          <button onClick={() => generateItinerary(selectedPlan)} disabled={generating}
            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black rounded-2xl shadow-lg shadow-sky-500/20 hover:opacity-90 disabled:opacity-50 transition-all mx-auto">
            {generating ? <><Loader2 size={20} className="animate-spin" /> Generando itinerario...</> : <><Sparkles size={20} /> Generar con {selectedModel === 'kimi' ? 'Kimi k2' : 'Claude Haiku 4.5'}</>}
          </button>
          {generating && <p className="text-xs text-slate-400 mt-3">Esto puede tardar 15-30 segundos...</p>}
        </div>
      ) : (
        <>
          {/* Summary card */}
          <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl p-5 text-white">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sky-100 text-xs font-bold uppercase tracking-wider mb-1">Itinerario generado con {it.model}</p>
                <p className="text-sm leading-relaxed">{it.summary}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="bg-white/20 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><Calendar size={10}/>{it.totalDays} días</span>
              <span className="bg-white/20 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><Euro size={10}/>~{it.estimatedTotal}{it.currency}</span>
              <span className="bg-white/20 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><Globe size={10}/>{it.language}</span>
              {it.bestTimeToVisit && <span className="bg-white/20 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><Sun size={10}/>{it.bestTimeToVisit}</span>}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl w-fit">
            {[
              { id: 'itinerary', label: '📋 Itinerario' },
              { id: 'tips', label: '💡 Consejos' },
              { id: 'budget', label: '💰 Presupuesto' },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === t.id ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-sm' : 'text-slate-500'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ITINERARY TAB */}
          {activeTab === 'itinerary' && (
            <div className="space-y-3">
              {it.days.map((day, idx) => (
                <div key={day.day} className={`bg-white dark:bg-slate-800 rounded-2xl border overflow-hidden transition-all ${expandedDay === idx ? 'border-sky-400/50 shadow-md' : 'border-slate-200 dark:border-slate-700'}`}>
                  <button onClick={() => setExpandedDay(expandedDay === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-4 text-left">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-xs font-black shadow-sm shrink-0 ${expandedDay === idx ? 'bg-sky-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                        <span className="text-[9px] uppercase">Día</span>
                        <span className="text-sm leading-none">{day.day}</span>
                      </div>
                      <div>
                        <p className="font-black text-sm text-slate-800 dark:text-white">{day.title}</p>
                        <p className="text-xs text-slate-400">{day.theme} · {day.activities.length} actividades · ~{day.estimatedCost}{it.currency}</p>
                      </div>
                    </div>
                    {expandedDay === idx ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </button>

                  {expandedDay === idx && (
                    <div className="border-t border-slate-100 dark:border-slate-700 p-4 space-y-3">
                      {/* Activities */}
                      <div className="space-y-2">
                        {day.activities.map((act, i) => (
                          <div key={i} className="flex gap-3 items-start">
                            <div className="text-xs font-mono text-slate-400 w-10 shrink-0 mt-1">{act.time}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 flex-wrap">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg ${ACTIVITY_COLORS[act.type]}`}>
                                  {ACTIVITY_ICONS[act.type]} {act.type}
                                </span>
                                {act.mustSee && <span className="text-[10px] font-black text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-lg">⭐ imprescindible</span>}
                              </div>
                              <p className="font-bold text-sm text-slate-800 dark:text-white mt-0.5">{act.title}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{act.description}</p>
                              <div className="flex gap-3 mt-1 text-xs text-slate-400">
                                {act.duration && <span>⏱️ {act.duration}</span>}
                                {act.cost != null && act.cost > 0 && <span>💶 ~{act.cost}{it.currency}</span>}
                              </div>
                              {act.tip && <p className="text-xs text-sky-600 dark:text-sky-400 mt-1 italic">💡 {act.tip}</p>}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Meals */}
                      {(day.meals.breakfast || day.meals.lunch || day.meals.dinner) && (
                        <div className="bg-orange-50 dark:bg-orange-500/10 rounded-xl p-3 space-y-1.5">
                          <p className="text-xs font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-2">🍽️ Dónde comer</p>
                          {day.meals.breakfast && <p className="text-xs text-slate-600 dark:text-slate-300"><span className="font-bold">Desayuno:</span> {day.meals.breakfast}</p>}
                          {day.meals.lunch && <p className="text-xs text-slate-600 dark:text-slate-300"><span className="font-bold">Almuerzo:</span> {day.meals.lunch}</p>}
                          {day.meals.dinner && <p className="text-xs text-slate-600 dark:text-slate-300"><span className="font-bold">Cena:</span> {day.meals.dinner}</p>}
                        </div>
                      )}

                      {/* Day tips */}
                      {day.tips?.length > 0 && (
                        <div className="space-y-1">
                          {day.tips.map((tip, i) => (
                            <p key={i} className="text-xs text-slate-500 dark:text-slate-400 flex gap-2"><span>💡</span>{tip}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TIPS TAB */}
          {activeTab === 'tips' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                <h3 className="font-black text-slate-800 dark:text-white mb-3 flex items-center gap-2"><Star size={16} className="text-amber-500" /> Consejos generales</h3>
                <div className="space-y-2">
                  {it.generalTips?.map((tip, i) => (
                    <div key={i} className="flex gap-3 items-start p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl">
                      <span className="text-sky-500 font-black text-sm shrink-0">{i+1}.</span>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
              {it.emergencyInfo && (
                <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-200 dark:border-red-500/20 p-5">
                  <h3 className="font-black text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">🚨 Información de emergencia</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{it.emergencyInfo}</p>
                </div>
              )}
              {it.currency_info && (
                <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 p-5">
                  <h3 className="font-black text-emerald-700 dark:text-emerald-400 mb-2">💳 Moneda y pagos</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{it.currency_info}</p>
                </div>
              )}
            </div>
          )}

          {/* BUDGET TAB */}
          {activeTab === 'budget' && (
            <div className="space-y-3">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
                <h3 className="font-black text-slate-800 dark:text-white mb-4">💰 Desglose por días</h3>
                <div className="space-y-2">
                  {it.days.map(day => {
                    const pct = Math.min((day.estimatedCost / it.estimatedTotal) * 100, 100);
                    return (
                      <div key={day.day} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500 w-10 shrink-0">Día {day.day}</span>
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-200 w-16 text-right shrink-0">{day.estimatedCost}{it.currency}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between">
                  <span className="text-sm font-black text-slate-600 dark:text-slate-300">Total estimado</span>
                  <span className="text-xl font-black text-sky-600">{it.estimatedTotal}{it.currency}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-slate-400">Tu presupuesto</span>
                  <span className={`text-sm font-bold ${selectedPlan.budget >= it.estimatedTotal ? 'text-emerald-600' : 'text-red-500'}`}>
                    {selectedPlan.budget}{it.currency} {selectedPlan.budget >= it.estimatedTotal ? '✅' : '⚠️'}
                  </span>
                </div>
              </div>

              {/* Regenerate button */}
              <button onClick={() => generateItinerary(selectedPlan)} disabled={generating}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-sky-300 dark:border-sky-500/40 rounded-2xl text-sm font-bold text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/5 transition-all disabled:opacity-50">
                {generating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                {generating ? 'Regenerando...' : 'Regenerar itinerario'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TravelPlannerView;
