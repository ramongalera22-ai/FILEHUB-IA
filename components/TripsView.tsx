import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Trip, Expense } from '../types';
import {
  Plane, MapPin, Calendar as CalendarIcon, Plus, ExternalLink,
  BookOpen, ChevronLeft, ChevronRight, Sparkles, ArrowRight, Globe,
  Loader2, FileText, Trash2, X, Edit3, Upload, Clock, Euro,
  Hotel, Train, Car, Ship, Coffee, Utensils, Camera, Star,
  MessageSquare, Send, Copy, Check, PenLine, Hash, AlignLeft,
  HelpCircle, ChevronDown, ChevronUp, Map, Ticket, Bed, Download,
  RefreshCw, AlertTriangle, Bus, Bike
} from 'lucide-react';
import { BotPanelViajes } from './BotPanel';

// ── Types ──────────────────────────────────────────────────────────────────────
interface TripDoc {
  id: string;
  name: string;
  type: 'flight' | 'train' | 'hotel' | 'car' | 'boat' | 'other';
  content: string;
  addedAt: string;
  size?: number;
}

interface ItineraryDay {
  date: string;
  items: ItineraryItem[];
}

interface ItineraryItem {
  id: string;
  time: string;
  title: string;
  type: 'transport' | 'hotel' | 'activity' | 'food' | 'rest';
  description?: string;
  cost?: number;
  confirmed: boolean;
  fromDoc?: string;
}

interface TripNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  pinned: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ExtendedTrip extends Trip {
  docs?: TripDoc[];
  itineraryDays?: ItineraryDay[];
  tripNotes?: TripNote[];
  chatHistory?: ChatMessage[];
}

// ── Constants ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'filehub_trips_v2';
const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_KEY || '';

const TYPE_CONFIG: Record<string, { icon: React.FC<any>; color: string; bg: string; label: string }> = {
  transport: { icon: Plane, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Transporte' },
  hotel:     { icon: Bed, color: 'text-violet-500', bg: 'bg-violet-500/10', label: 'Alojamiento' },
  activity:  { icon: Camera, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Actividad' },
  food:      { icon: Utensils, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Comida' },
  rest:      { icon: Coffee, color: 'text-slate-500', bg: 'bg-slate-500/10', label: 'Descanso' },
};

const DOC_TYPE_CONFIG: Record<string, { icon: React.FC<any>; color: string; label: string }> = {
  flight:  { icon: Plane,   color: 'text-blue-400',   label: 'Vuelo' },
  train:   { icon: Train,   color: 'text-emerald-400', label: 'Tren' },
  hotel:   { icon: Hotel,   color: 'text-violet-400',  label: 'Hotel' },
  car:     { icon: Car,     color: 'text-amber-400',   label: 'Coche' },
  boat:    { icon: Ship,    color: 'text-cyan-400',    label: 'Barco' },
  other:   { icon: Ticket,  color: 'text-slate-400',   label: 'Otro' },
};

// ── AI Helper ──────────────────────────────────────────────────────────────────
async function callAI(system: string, user: string, maxTokens = 1500): Promise<string> {
  if (!OPENROUTER_KEY) return 'Configura tu API key de OpenRouter en Settings.';
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'HTTP-Referer': 'https://ramongalera22-ai.github.io/FILEHUB-IA', 'X-Title': 'FILEHUB Trips' },
      body: JSON.stringify({ model: 'anthropic/claude-haiku-4.5', max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] })
    });
    const d = await res.json();
    return d.choices?.[0]?.message?.content?.trim() || 'Sin respuesta.';
  } catch (e: any) { return `Error: ${e?.message}`; }
}

async function parseDocumentAI(content: string, docType: string): Promise<Partial<ItineraryItem>[]> {
  const text = await callAI(
    'Eres un experto en análisis de documentos de viaje. Extrae información estructurada. Responde SOLO en JSON válido.',
    `Extrae los eventos clave de este documento de ${docType}: "${content.slice(0, 3000)}". 
    Responde en JSON array: [{"time":"HH:MM","title":"título","type":"transport|hotel|activity|food","description":"detalles","cost":0,"confirmed":true}]. 
    Incluye check-in/check-out, vuelos/trenes con horarios, etc. Solo JSON.`,
    800
  );
  try {
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
  } catch { return []; }
}

// ── PDF Text Extractor ─────────────────────────────────────────────────────────
async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') {
    try {
      await new Promise<void>((resolve, reject) => {
        if ((window as any).pdfjsLib) { resolve(); return; }
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        s.onload = () => resolve(); s.onerror = reject;
        document.head.appendChild(s);
      });
      const lib = (window as any).pdfjsLib;
      lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const buf = await file.arrayBuffer();
      const pdf = await lib.getDocument({ data: buf }).promise;
      const pages: string[] = [];
      for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
        const page = await pdf.getPage(i);
        const tc = await page.getTextContent();
        pages.push((tc.items as any[]).map((x: any) => x.str).join(' ').replace(/\s+/g, ' ').trim());
      }
      return pages.join('\n\n');
    } catch (e: any) { return `Error PDF: ${e?.message}`; }
  }
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = e => resolve(e.target?.result as string || '');
    r.readAsText(file);
  });
}

// ── Main Component ─────────────────────────────────────────────────────────────
interface TripsViewProps {
  trips: Trip[];
  onAddTrip: (trip: Trip) => void;
  onDeleteTrip: (id: string) => void;
}

const TripsView: React.FC<TripsViewProps> = ({ trips: propTrips, onAddTrip, onDeleteTrip }) => {
  // Local extended trips state
  const [extTrips, setExtTrips] = useState<ExtendedTrip[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });

  const [selectedId, setSelectedId] = useState<string | null>(extTrips[0]?.id || propTrips[0]?.id || null);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'notebook' | 'docs' | 'economy'>('itinerary');
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [newTrip, setNewTrip] = useState({ destination: '', startDate: '', endDate: '', budget: '' });
  const [generatingItinerary, setGeneratingItinerary] = useState(false);
  const [addingDoc, setAddingDoc] = useState(false);
  const [docType, setDocType] = useState<TripDoc['type']>('flight');
  const [docContent, setDocContent] = useState('');
  const [docName, setDocName] = useState('');
  const [processingDoc, setProcessingDoc] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState<string | null>(null); // dateStr
  const [newItem, setNewItem] = useState<Partial<ItineraryItem>>({ type: 'activity', time: '10:00', title: '', confirmed: true });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(extTrips)); }, [extTrips]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [extTrips, selectedId, activeTab]);

  // Sync propTrips into extTrips
  useEffect(() => {
    const extIds = new Set(extTrips.map(t => t.id));
    const newOnes = propTrips.filter(t => !extIds.has(t.id));
    if (newOnes.length > 0) setExtTrips(prev => [...prev, ...newOnes.map(t => ({ ...t, docs: [], itineraryDays: [], tripNotes: [], chatHistory: [] }))]);
  }, [propTrips]);

  const trip = extTrips.find(t => t.id === selectedId) || null;

  const updateTrip = (id: string, updates: Partial<ExtendedTrip>) => {
    setExtTrips(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  // ── Create trip ───────────────────────────────────────────────────────────────
  const handleCreateTrip = () => {
    if (!newTrip.destination || !newTrip.startDate) return;
    const id = `trip-${Date.now()}`;
    const t: ExtendedTrip = {
      id, destination: newTrip.destination, startDate: newTrip.startDate,
      endDate: newTrip.endDate || newTrip.startDate, budget: parseFloat(newTrip.budget) || 0,
      expenses: [], docs: [], itineraryDays: [], tripNotes: [], chatHistory: [],
    };
    setExtTrips(prev => [t, ...prev]);
    onAddTrip(t as Trip);
    setSelectedId(id);
    setShowNewTrip(false);
    setNewTrip({ destination: '', startDate: '', endDate: '', budget: '' });
  };

  // ── Generate itinerary days skeleton ─────────────────────────────────────────
  const generateDays = (start: string, end: string): ItineraryDay[] => {
    const days: ItineraryDay[] = [];
    const s = new Date(start), e = new Date(end);
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      days.push({ date: d.toISOString().split('T')[0], items: [] });
    }
    return days;
  };

  // ── AI Itinerary generation ───────────────────────────────────────────────────
  const handleGenerateAIItinerary = async () => {
    if (!trip) return;
    setGeneratingItinerary(true);
    const docsContext = (trip.docs || []).map(d => `[${d.type.toUpperCase()}] ${d.name}: ${d.content.slice(0, 500)}`).join('\n\n');
    const days = generateDays(trip.startDate, trip.endDate);
    const datesList = days.map(d => d.date).join(', ');

    const result = await callAI(
      'Eres un experto planificador de viajes. Crea itinerarios detallados y realistas. Responde SOLO en JSON válido.',
      `Crea un itinerario para viaje a ${trip.destination} del ${trip.startDate} al ${trip.endDate}. Presupuesto: €${trip.budget}.
${docsContext ? `\nDocumentos del viaje:\n${docsContext}` : ''}
\nDías: ${datesList}
Responde en JSON array por día:
[{"date":"YYYY-MM-DD","items":[{"id":"item1","time":"HH:MM","title":"título","type":"transport|hotel|activity|food|rest","description":"detalles","cost":0,"confirmed":true}]}]
Incluye mañana, tarde y noche para cada día. Usa los documentos si existen. Solo JSON.`,
      2000
    );

    try {
      const parsed: ItineraryDay[] = JSON.parse(result.replace(/```json\n?|\n?```/g, '').trim());
      updateTrip(trip.id, { itineraryDays: parsed });
    } catch {
      // Fallback: create empty days
      updateTrip(trip.id, { itineraryDays: days });
    }
    setGeneratingItinerary(false);
  };

  // ── Add document ──────────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessingDoc(true);
    const content = await extractTextFromFile(file);
    setDocContent(content);
    setDocName(file.name.replace(/\.[^.]+$/, ''));
    // Auto-detect type
    const lower = file.name.toLowerCase();
    if (lower.includes('vuelo') || lower.includes('flight') || lower.includes('boarding')) setDocType('flight');
    else if (lower.includes('hotel') || lower.includes('booking') || lower.includes('reserva')) setDocType('hotel');
    else if (lower.includes('tren') || lower.includes('renfe') || lower.includes('train')) setDocType('train');
    setProcessingDoc(false);
    e.target.value = '';
  };

  const handleAddDoc = async () => {
    if (!trip || !docContent.trim()) return;
    setProcessingDoc(true);
    const doc: TripDoc = { id: `doc-${Date.now()}`, name: docName || `${docType} ${new Date().toLocaleDateString('es-ES')}`, type: docType, content: docContent, addedAt: new Date().toISOString() };
    const updatedDocs = [...(trip.docs || []), doc];

    // Parse document into itinerary items
    const parsedItems = await parseDocumentAI(docContent, docType);
    let updatedDays = trip.itineraryDays ? [...trip.itineraryDays] : generateDays(trip.startDate, trip.endDate);

    if (parsedItems.length > 0) {
      // Add to first/matching day
      const firstDay = updatedDays[0];
      if (firstDay) {
        firstDay.items = [...firstDay.items, ...parsedItems.map((item, i) => ({ id: `${doc.id}-${i}`, time: item.time || '00:00', title: item.title || '', type: (item.type as any) || 'transport', description: item.description, cost: item.cost || 0, confirmed: true, fromDoc: doc.id }))];
      }
    }

    updateTrip(trip.id, { docs: updatedDocs, itineraryDays: updatedDays });
    setDocContent(''); setDocName(''); setAddingDoc(false);
    setProcessingDoc(false);
  };

  // ── Add manual itinerary item ─────────────────────────────────────────────────
  const handleAddItem = (dateStr: string) => {
    if (!trip || !newItem.title) return;
    const item: ItineraryItem = { id: `item-${Date.now()}`, time: newItem.time || '10:00', title: newItem.title || '', type: newItem.type as any || 'activity', description: newItem.description, cost: newItem.cost || 0, confirmed: newItem.confirmed ?? true };
    const updatedDays = (trip.itineraryDays || []).map(day => day.date === dateStr ? { ...day, items: [...day.items, item].sort((a, b) => a.time.localeCompare(b.time)) } : day);
    updateTrip(trip.id, { itineraryDays: updatedDays });
    setNewItem({ type: 'activity', time: '10:00', title: '', confirmed: true });
    setAddingItem(null);
  };

  const deleteItem = (dateStr: string, itemId: string) => {
    if (!trip) return;
    updateTrip(trip.id, { itineraryDays: (trip.itineraryDays || []).map(d => d.date === dateStr ? { ...d, items: d.items.filter(i => i.id !== itemId) } : d) });
  };

  // ── Chat with trip context ────────────────────────────────────────────────────
  const handleChat = async () => {
    if (!trip || !chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim(); setChatInput('');
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: msg, timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) };
    updateTrip(trip.id, { chatHistory: [...(trip.chatHistory || []), userMsg] });
    setChatLoading(true);

    const context = [
      `Viaje a ${trip.destination} del ${trip.startDate} al ${trip.endDate}. Presupuesto: €${trip.budget}.`,
      (trip.docs || []).length > 0 ? `Documentos: ${(trip.docs || []).map(d => `${d.type}: ${d.content.slice(0, 300)}`).join(' | ')}` : '',
      (trip.tripNotes || []).length > 0 ? `Notas: ${(trip.tripNotes || []).map(n => n.content.slice(0, 200)).join(' | ')}` : '',
    ].filter(Boolean).join('\n');

    const reply = await callAI(`Eres el asistente de viaje para un viaje a ${trip.destination}. Usa SOLO la información del contexto. Responde en español.\n\nContexto:\n${context}`, msg, 1000);
    const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: reply, timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) };
    updateTrip(trip.id, { chatHistory: [...(trip.chatHistory || []), userMsg, aiMsg] });
    setChatLoading(false);
  };

  // ── Notes ─────────────────────────────────────────────────────────────────────
  const createNote = () => {
    if (!trip) return;
    const note: TripNote = { id: `note-${Date.now()}`, title: 'Nueva nota', content: '', createdAt: new Date().toLocaleString('es-ES'), pinned: false };
    updateTrip(trip.id, { tripNotes: [note, ...(trip.tripNotes || [])] });
    setActiveNote(note.id);
  };

  const activeNoteObj = trip?.tripNotes?.find(n => n.id === activeNote);

  const copyText = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000); };

  // ── Generate studio content ───────────────────────────────────────────────────
  const generateStudio = async (type: string) => {
    if (!trip) return;
    const docsText = (trip.docs || []).map(d => `[${d.type}] ${d.content.slice(0, 800)}`).join('\n\n');
    const notesText = (trip.tripNotes || []).map(n => n.content).join('\n\n');
    const context = `Viaje a ${trip.destination} del ${trip.startDate} al ${trip.endDate}.\n${docsText}\n${notesText}`;

    const prompts: Record<string, string> = {
      packing: `Crea una lista de equipaje completa para ${trip.destination} del ${trip.startDate} al ${trip.endDate}. Organiza por categorías (ropa, documentos, electrónica, salud, otros). Adapta al clima y actividades.`,
      tips: `Dame 10 consejos prácticos imprescindibles para viajar a ${trip.destination}. Incluye cultura local, transporte, seguridad y gastronomía.`,
      budget: `Crea un presupuesto detallado para ${trip.destination} con presupuesto total de €${trip.budget}. Desglose por: alojamiento, transporte, comidas, actividades y extras.`,
      phrases: `Dame las 20 frases más útiles en el idioma local de ${trip.destination} para viajeros. Incluye transliteración y pronunciación aproximada.`,
    };

    const note: TripNote = { id: `gen-${Date.now()}`, title: { packing: '🧳 Lista de equipaje', tips: '💡 Consejos esenciales', budget: '💶 Presupuesto detallado', phrases: '🗣️ Frases útiles' }[type] || 'Generado', content: '', createdAt: new Date().toLocaleString('es-ES'), pinned: false };
    updateTrip(trip.id, { tripNotes: [note, ...(trip.tripNotes || [])] });
    setActiveNote(note.id);
    setActiveTab('notebook');

    const result = await callAI('Eres un experto en viajes. Responde en español con formato claro.', prompts[type], 1200);
    updateTrip(trip.id, { tripNotes: [{ ...note, content: result }, ...(trip.tripNotes || []).filter(n => n.id !== note.id)] });
  };

  // ── Trip stats ────────────────────────────────────────────────────────────────
  const totalItems = (trip?.itineraryDays || []).reduce((s, d) => s + d.items.length, 0);
  const totalCost = (trip?.itineraryDays || []).reduce((s, d) => s + d.items.reduce((ss, i) => ss + (i.cost || 0), 0), 0);
  const daysCount = trip ? Math.max(1, Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86400000) + 1) : 0;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8fafc] dark:bg-slate-950 p-4 md:p-6 space-y-5">
      <BotPanelViajes />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
          <Plane size={22} className="text-indigo-500" /> Expediciones
        </h1>
        <button onClick={() => setShowNewTrip(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-indigo-900/20">
          <Plus size={15} /> Nuevo Viaje
        </button>
      </div>

      {/* Trip selector */}
      {extTrips.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {extTrips.map(t => (
            <button key={t.id} onClick={() => setSelectedId(t.id)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-sm font-bold transition-all ${selectedId === t.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-indigo-500/40'}`}>
              <MapPin size={13} /> {t.destination}
              <span className="text-[10px] opacity-70 ml-1">{t.startDate}</span>
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {extTrips.length === 0 && (
        <div className="text-center py-20">
          <Globe size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <h3 className="text-lg font-black text-slate-600 dark:text-slate-400 mb-2">Sin viajes planificados</h3>
          <p className="text-sm text-slate-400 mb-6">Crea tu primer viaje para empezar a planificar</p>
          <button onClick={() => setShowNewTrip(true)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-colors">
            + Crear primer viaje
          </button>
        </div>
      )}

      {/* Trip detail */}
      {trip && (
        <div className="space-y-4">
          {/* Trip header card */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-700 rounded-2xl p-5 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-20 -mt-20" />
            <div className="flex items-start justify-between relative z-10">
              <div>
                <h2 className="text-2xl font-black mb-1">✈️ {trip.destination}</h2>
                <div className="flex items-center gap-3 text-sm opacity-80">
                  <span>📅 {trip.startDate} → {trip.endDate}</span>
                  <span>🌙 {daysCount} días</span>
                  <span>💶 €{trip.budget}</span>
                </div>
                <div className="flex gap-3 mt-3 text-xs opacity-70">
                  <span>📋 {totalItems} actividades</span>
                  <span>📄 {(trip.docs || []).length} docs</span>
                  <span>📝 {(trip.tripNotes || []).length} notas</span>
                  {totalCost > 0 && <span>💰 €{totalCost} planificado</span>}
                </div>
              </div>
              <button onClick={() => { onDeleteTrip(trip.id); setExtTrips(p => p.filter(t => t.id !== trip.id)); setSelectedId(extTrips.filter(t => t.id !== trip.id)[0]?.id || null); }}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-white dark:bg-slate-900 rounded-2xl p-1.5 border border-slate-200/60 dark:border-white/5 overflow-x-auto">
            {[
              { id: 'itinerary', label: '🗺️ Itinerario', },
              { id: 'docs', label: `📄 Documentos ${(trip.docs || []).length > 0 ? `(${(trip.docs || []).length})` : ''}` },
              { id: 'notebook', label: `📓 Cuaderno ${(trip.tripNotes || []).length > 0 ? `(${(trip.tripNotes || []).length})` : ''}` },
              { id: 'economy', label: '💶 Presupuesto' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── ITINERARY TAB ── */}
          {activeTab === 'itinerary' && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <button onClick={handleGenerateAIItinerary} disabled={generatingItinerary}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-colors">
                  {generatingItinerary ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {generatingItinerary ? 'Generando...' : 'Generar itinerario con IA'}
                </button>
                {(trip.docs || []).length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-emerald-500 font-bold bg-emerald-500/10 px-3 py-2 rounded-xl">
                    ✓ Usando {(trip.docs || []).length} documento(s) del viaje
                  </span>
                )}
                <button onClick={() => setAddingDoc(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold hover:border-indigo-500/40 transition-colors">
                  <Upload size={14} /> Añadir doc al itinerario
                </button>
              </div>

              {/* No days yet */}
              {(!trip.itineraryDays || trip.itineraryDays.length === 0) && !generatingItinerary && (
                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-white/5">
                  <Map size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                  <p className="text-sm font-bold text-slate-500 mb-1">Sin itinerario todavía</p>
                  <p className="text-xs text-slate-400">Genera con IA o añade documentos de vuelos y hotel</p>
                </div>
              )}

              {/* Days */}
              {(trip.itineraryDays || []).map((day) => {
                const date = new Date(day.date + 'T12:00:00');
                const isToday = day.date === new Date().toISOString().split('T')[0];
                const dayCost = day.items.reduce((s, i) => s + (i.cost || 0), 0);
                return (
                  <div key={day.date} className={`bg-white dark:bg-slate-900 rounded-2xl border overflow-hidden ${isToday ? 'border-indigo-500/40' : 'border-slate-200/60 dark:border-white/5'}`}>
                    {/* Day header */}
                    <div className={`flex items-center justify-between px-5 py-3 ${isToday ? 'bg-indigo-500/5' : 'bg-slate-50/50 dark:bg-slate-800/30'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-[9px] font-black ${isToday ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                          <span className="text-sm font-black leading-none">{date.getDate()}</span>
                          <span className="uppercase">{date.toLocaleDateString('es-ES', { month: 'short' })}</span>
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-white capitalize">
                            {date.toLocaleDateString('es-ES', { weekday: 'long' })}
                            {isToday && <span className="ml-2 text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full">HOY</span>}
                          </p>
                          <p className="text-[10px] text-slate-400">{day.items.length} actividades {dayCost > 0 ? `· €${dayCost}` : ''}</p>
                        </div>
                      </div>
                      <button onClick={() => setAddingItem(addingItem === day.date ? null : day.date)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 rounded-xl text-[10px] font-bold transition-colors">
                        <Plus size={11} /> Añadir
                      </button>
                    </div>

                    {/* Add item form */}
                    {addingItem === day.date && (
                      <div className="px-5 py-3 border-b border-slate-200/60 dark:border-white/5 bg-indigo-500/3">
                        <div className="flex gap-2 flex-wrap items-end">
                          <input type="time" value={newItem.time} onChange={e => setNewItem(p => ({ ...p, time: e.target.value }))}
                            className="w-24 px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500" />
                          <input value={newItem.title} onChange={e => setNewItem(p => ({ ...p, title: e.target.value }))} placeholder="Título de la actividad..."
                            className="flex-1 min-w-32 px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                            onKeyDown={e => e.key === 'Enter' && handleAddItem(day.date)} />
                          <select value={newItem.type} onChange={e => setNewItem(p => ({ ...p, type: e.target.value as any }))}
                            className="px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-white focus:outline-none">
                            {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                          <input type="number" value={newItem.cost || ''} onChange={e => setNewItem(p => ({ ...p, cost: parseFloat(e.target.value) || 0 }))} placeholder="€"
                            className="w-16 px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-white focus:outline-none" />
                          <button onClick={() => handleAddItem(day.date)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold">+</button>
                          <button onClick={() => setAddingItem(null)} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-500 rounded-lg text-xs font-bold">✕</button>
                        </div>
                      </div>
                    )}

                    {/* Items */}
                    <div className="p-4 space-y-2">
                      {day.items.length === 0 ? (
                        <p className="text-xs text-slate-300 dark:text-slate-700 text-center py-3">Día libre — añade actividades</p>
                      ) : (
                        day.items.sort((a, b) => a.time.localeCompare(b.time)).map(item => {
                          const tc = TYPE_CONFIG[item.type] || TYPE_CONFIG.activity;
                          const Icon = tc.icon;
                          return (
                            <div key={item.id} className={`group flex items-start gap-3 p-3 rounded-xl border transition-all ${item.confirmed ? 'border-slate-100 dark:border-white/5 hover:border-indigo-500/20' : 'border-dashed border-slate-200 dark:border-white/5 opacity-60'}`}>
                              <div className={`w-8 h-8 ${tc.bg} rounded-lg flex items-center justify-center shrink-0`}>
                                <Icon size={14} className={tc.color} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-slate-400 font-mono">{item.time}</span>
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{item.title}</span>
                                  {item.fromDoc && <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-full font-bold shrink-0">📄 doc</span>}
                                  {!item.confirmed && <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1.5 rounded-full font-bold">tentativo</span>}
                                </div>
                                {item.description && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{item.description}</p>}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {item.cost && item.cost > 0 && <span className="text-[10px] font-bold text-slate-500">€{item.cost}</span>}
                                <button onClick={() => deleteItem(day.date, item.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-slate-400 transition-all">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── DOCS TAB ── */}
          {activeTab === 'docs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">Los documentos se parsean automáticamente al itinerario</p>
                <button onClick={() => setAddingDoc(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors">
                  <Plus size={14} /> Añadir documento
                </button>
              </div>

              {(trip.docs || []).length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-white/5">
                  <Ticket size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                  <h3 className="text-sm font-black text-slate-500 mb-1">Sin documentos</h3>
                  <p className="text-xs text-slate-400 mb-4">Añade vuelos, hoteles, trenes... se añaden al itinerario automáticamente</p>
                  <button onClick={() => setAddingDoc(true)} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold">
                    + Añadir primer documento
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(trip.docs || []).map(doc => {
                    const dc = DOC_TYPE_CONFIG[doc.type];
                    const Icon = dc.icon;
                    return (
                      <div key={doc.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-white/5 p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center shrink-0">
                            <Icon size={18} className={dc.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{doc.name}</p>
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 ${dc.color}`}>{dc.label}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{doc.content.slice(0, 100)}...</p>
                            <p className="text-[9px] text-slate-300 dark:text-slate-600 mt-1">{new Date(doc.addedAt).toLocaleDateString('es-ES')}</p>
                          </div>
                          <button onClick={() => updateTrip(trip.id, { docs: (trip.docs || []).filter(d => d.id !== doc.id) })}
                            className="p-1 text-slate-400 hover:text-red-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── NOTEBOOK TAB ── */}
          {activeTab === 'notebook' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[500px]">
              {/* Left: tools + notes list */}
              <div className="space-y-3">
                {/* Quick generators */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-white/5 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Generar con IA</p>
                  <div className="space-y-1.5">
                    {[
                      { type: 'packing', label: '🧳 Lista de equipaje' },
                      { type: 'tips', label: '💡 Consejos esenciales' },
                      { type: 'budget', label: '💶 Presupuesto detallado' },
                      { type: 'phrases', label: '🗣️ Frases útiles' },
                    ].map(g => (
                      <button key={g.type} onClick={() => generateStudio(g.type)}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-500 transition-colors">
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes list */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-white/5 overflow-hidden">
                  <div className="flex items-center justify-between p-3 border-b border-slate-200/60 dark:border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notas</p>
                    <button onClick={createNote} className="flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold"><Plus size={10} /> Nueva</button>
                  </div>
                  <div className="p-2 space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                    {(trip.tripNotes || []).length === 0 ? (
                      <p className="text-[10px] text-slate-400 text-center py-4">Sin notas</p>
                    ) : (trip.tripNotes || []).map(note => (
                      <button key={note.id} onClick={() => setActiveNote(note.id)}
                        className={`w-full text-left p-2.5 rounded-xl transition-all ${activeNote === note.id ? 'bg-indigo-500/10 border border-indigo-500/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{note.title}</p>
                        <p className="text-[9px] text-slate-400 truncate">{note.content.slice(0, 40) || '...'}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat with trip */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-white/5 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Chat del viaje</p>
                  <div className="h-32 overflow-y-auto space-y-2 mb-2 custom-scrollbar">
                    {(trip.chatHistory || []).length === 0 && <p className="text-[10px] text-slate-300 dark:text-slate-700 text-center py-4">Pregunta sobre tu viaje...</p>}
                    {(trip.chatHistory || []).map(msg => (
                      <div key={msg.id} className={`text-[10px] rounded-lg px-2 py-1.5 ${msg.role === 'user' ? 'bg-indigo-600 text-white ml-4' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mr-4'}`}>
                        {msg.content}
                      </div>
                    ))}
                    {chatLoading && <div className="text-[10px] text-slate-400 text-center">💭 Pensando...</div>}
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="flex gap-1">
                    <input className="flex-1 px-2 py-1.5 text-[10px] bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-white/5 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                      placeholder="¿Qué hoteles tengo reservados?" value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleChat()} />
                    <button onClick={handleChat} disabled={chatLoading} className="p-1.5 bg-indigo-600 text-white rounded-lg disabled:opacity-60">
                      {chatLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: note editor */}
              <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-white/5 overflow-hidden flex flex-col">
                {activeNoteObj ? (
                  <>
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200/60 dark:border-white/5">
                      <input className="flex-1 text-sm font-black text-slate-800 dark:text-white bg-transparent focus:outline-none"
                        value={activeNoteObj.title}
                        onChange={e => updateTrip(trip.id, { tripNotes: (trip.tripNotes || []).map(n => n.id === activeNoteObj.id ? { ...n, title: e.target.value } : n) })} />
                      <button onClick={() => copyText(activeNoteObj.content, activeNoteObj.id)} className="p-1.5 text-slate-400 hover:text-indigo-400 transition-colors">
                        {copied === activeNoteObj.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                      <button onClick={() => { updateTrip(trip.id, { tripNotes: (trip.tripNotes || []).filter(n => n.id !== activeNoteObj.id) }); setActiveNote(null); }} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <textarea className="flex-1 min-h-[400px] p-4 text-sm text-slate-700 dark:text-slate-300 bg-transparent focus:outline-none resize-none leading-relaxed placeholder:text-slate-300 dark:placeholder:text-slate-600"
                      value={activeNoteObj.content}
                      onChange={e => updateTrip(trip.id, { tripNotes: (trip.tripNotes || []).map(n => n.id === activeNoteObj.id ? { ...n, content: e.target.value } : n) })}
                      placeholder="Escribe tus notas sobre el viaje..." />
                    <div className="px-4 py-2 border-t border-slate-200/60 dark:border-white/5">
                      <p className="text-[10px] text-slate-400">{activeNoteObj.content.split(/\s+/).filter(Boolean).length} palabras</p>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-center p-8">
                    <div>
                      <PenLine size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                      <p className="text-sm font-bold text-slate-400 mb-1">Selecciona una nota</p>
                      <p className="text-xs text-slate-300 dark:text-slate-600">O genera contenido con IA usando los botones de la izquierda</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ECONOMY TAB ── */}
          {activeTab === 'economy' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Presupuesto', value: `€${trip.budget}`, icon: Euro, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                  { label: 'Planificado', value: `€${totalCost}`, icon: CalendarIcon, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                  { label: 'Disponible', value: `€${Math.max(0, trip.budget - totalCost)}`, icon: Star, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                  { label: 'Por día', value: `€${Math.round(trip.budget / Math.max(1, daysCount))}`, icon: Clock, color: 'text-violet-500', bg: 'bg-violet-500/10' },
                ].map(kpi => (
                  <div key={kpi.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-white/5 p-4">
                    <div className={`w-9 h-9 ${kpi.bg} rounded-xl flex items-center justify-center mb-3`}><kpi.icon size={18} className={kpi.color} /></div>
                    <div className="text-2xl font-black text-slate-800 dark:text-white">{kpi.value}</div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">{kpi.label}</div>
                  </div>
                ))}
              </div>

              {totalCost > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-white/5 p-5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Desglose por tipo</h3>
                  <div className="space-y-2">
                    {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
                      const cost = (trip.itineraryDays || []).reduce((s, d) => s + d.items.filter(i => i.type === type).reduce((ss, i) => ss + (i.cost || 0), 0), 0);
                      if (!cost) return null;
                      const pct = Math.round((cost / totalCost) * 100);
                      const Icon = cfg.icon;
                      return (
                        <div key={type} className="flex items-center gap-3">
                          <div className={`w-7 h-7 ${cfg.bg} rounded-lg flex items-center justify-center shrink-0`}><Icon size={13} className={cfg.color} /></div>
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-semibold text-slate-600 dark:text-slate-400">{cfg.label}</span>
                              <span className="font-bold text-slate-800 dark:text-white">€{cost} ({pct}%)</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── NEW TRIP MODAL ── */}
      {showNewTrip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-800 dark:text-white">✈️ Nuevo Viaje</h2>
              <button onClick={() => setShowNewTrip(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            {[
              { key: 'destination', placeholder: 'Destino (ej: París, Japón...)', label: 'Destino *' },
              { key: 'startDate', placeholder: '', label: 'Fecha inicio *', type: 'date' },
              { key: 'endDate', placeholder: '', label: 'Fecha fin', type: 'date' },
              { key: 'budget', placeholder: '1500', label: 'Presupuesto (€)', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">{f.label}</label>
                <input type={f.type || 'text'} placeholder={f.placeholder}
                  value={(newTrip as any)[f.key]}
                  onChange={e => setNewTrip(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 focus:outline-none focus:border-indigo-500" />
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={handleCreateTrip} disabled={!newTrip.destination || !newTrip.startDate}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-sm font-black transition-colors">
                Crear Viaje ✈️
              </button>
              <button onClick={() => setShowNewTrip(false)} className="px-5 py-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD DOC MODAL ── */}
      {addingDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-800 dark:text-white">📄 Añadir Documento</h2>
              <button onClick={() => setAddingDoc(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {Object.entries(DOC_TYPE_CONFIG).map(([type, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button key={type} onClick={() => setDocType(type as TripDoc['type'])}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-bold transition-all ${docType === type ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-indigo-500/40'}`}>
                    <Icon size={16} className={docType === type ? 'text-white' : cfg.color} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            <input value={docName} onChange={e => setDocName(e.target.value)} placeholder="Nombre del documento"
              className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 focus:outline-none focus:border-indigo-500" />

            <label className={`flex items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${processingDoc ? 'opacity-60' : ''}`}>
              {processingDoc ? <Loader2 size={14} className="animate-spin text-indigo-500" /> : <Upload size={14} className="text-slate-500" />}
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                {processingDoc ? 'Procesando...' : 'Subir PDF / TXT / imagen de reserva'}
              </span>
              <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,.png,.jpg,.jpeg" className="hidden" onChange={handleFileUpload} />
            </label>

            {docContent && !processingDoc && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                <p className="text-xs text-emerald-500 font-bold">✓ Texto extraído: {docContent.split(/\s+/).length} palabras</p>
                <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{docContent.slice(0, 100)}...</p>
              </div>
            )}

            <textarea value={docContent} onChange={e => setDocContent(e.target.value)}
              placeholder="O pega aquí el texto del documento (confirmación de reserva, billete, etc.)"
              rows={4} className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 focus:outline-none focus:border-indigo-500 resize-none" />

            <div className="flex gap-2">
              <button onClick={handleAddDoc} disabled={!docContent.trim() || processingDoc}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-sm font-black transition-colors flex items-center justify-center gap-2">
                {processingDoc ? <><Loader2 size={14} className="animate-spin" /> Procesando...</> : '📄 Añadir y parsear con IA'}
              </button>
              <button onClick={() => setAddingDoc(false)} className="px-5 py-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripsView;
