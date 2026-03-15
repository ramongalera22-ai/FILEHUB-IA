
import React, { useState } from 'react';
import { Trip } from '../types';
import {
  Plane,
  MapPin,
  Calendar as CalendarIcon,
  Plus,
  ExternalLink,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Info,
  Globe,
  Loader2,
  FileText,
  Trash2,
  X,
  Edit3
} from 'lucide-react';
import Whiteboard from './Whiteboard';
import { chatWithGemini, generateDetailedItinerary } from '../services/openrouterService';
import { Cloud, Sun, CloudRain, Thermometer, Wind, MapPin as MapPinIcon } from 'lucide-react';

const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_KEY || '';

async function generateItineraryAI(destination: string, startDate: string, endDate: string, budget: string): Promise<string> {
  if (!OPENROUTER_KEY) return 'Configura tu API key de OpenRouter en Settings para usar esta función.';
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'HTTP-Referer': 'https://ramongalera22-ai.github.io/FILEHUB-IA' },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4.5', max_tokens: 1500,
        messages: [{ role: 'user', content: `Crea un itinerario detallado para ${destination} del ${startDate} al ${endDate} con presupuesto de ${budget}€. Incluye: actividades por día y hora, restaurantes recomendados, transporte, consejos prácticos y estimación de costes. Responde en español con emojis.` }]
      })
    });
    const d = await res.json();
    return d.choices?.[0]?.message?.content || 'Error generando itinerario.';
  } catch { return 'Error de conexión con la IA.'; }
}
import { BotPanelViajes } from './BotPanel';

const TRAVEL_NOTEBOOK_URL = "https://notebooklm.google.com/notebook/afe26943-fe4e-4b79-9b7d-8d95a2b247b1";

interface TripsViewProps {
  trips: Trip[];
  onAddTrip: (trip: Trip) => void;
  onDeleteTrip: (id: string) => void;
}

const TripsView: React.FC<TripsViewProps> = ({ trips, onAddTrip, onDeleteTrip }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTripId, setSelectedTripId] = useState<string | null>(trips.length > 0 ? trips[0].id : null);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [isGeneratingBriefing, setIsGeneratingBriefing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // New Trip Form
  const [newTrip, setNewTrip] = useState({ destination: '', startDate: '', endDate: '', budget: '', notebookUrl: '' });
  const [activeSubTab, setActiveSubTab] = useState<'itinerary' | 'economy' | 'documents' | 'notebook' | 'whiteboard'>('itinerary');
  const [isGeneratingItinerary, setIsGeneratingItinerary] = useState(false);
  const [aiItinerary, setAiItinerary] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);

  const handleGenerateAI = async () => {
    if (!selectedTrip) return;
    setGeneratingAI(true);
    const result = await generateItineraryAI(selectedTrip.destination, selectedTrip.startDate, selectedTrip.endDate, String(selectedTrip.budget));
    setAiItinerary(result);
    setGeneratingAI(false);
  };

  const selectedTrip = trips.find(t => t.id === selectedTripId) || (trips.length > 0 ? trips[0] : null);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthName = currentDate.toLocaleString('es-ES', { month: 'long' });

  const getTripOnDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return trips.find(t => dateStr >= t.startDate && dateStr <= t.endDate);
  };

  const getDayStyles = (day: number) => {
    const trip = getTripOnDay(day);
    if (!trip) return 'text-slate-400 hover:bg-slate-50';
    if (selectedTrip && trip.id === selectedTrip.id) return 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 ring-2 ring-indigo-300 ring-offset-1';
    return 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200';
  };

  const handleDayClick = (day: number) => {
    const trip = getTripOnDay(day);
    if (trip) {
      setSelectedTripId(trip.id);
      setBriefing(null);
    }
  };

  const generateBriefing = async () => {
    if (!selectedTrip) return;
    setIsGeneratingBriefing(true);
    try {
      const prompt = `Genera un resumen de viaje (briefing) para ${selectedTrip.destination}. 
      Incluye 3 consejos de seguridad, 2 lugares "ocultos" para visitar y el clima esperado para las fechas ${selectedTrip.startDate} a ${selectedTrip.endDate}. 
      Sé conciso y profesional.`;
      const response = await chatWithGemini(prompt, { trip: selectedTrip }, { useThinking: true });
      setBriefing(response.text);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingBriefing(false);
    }
  };

  const handleGenerateFullItinerary = async () => {
    if (!selectedTrip) return;
    setIsGeneratingItinerary(true);
    try {
      const dates = `${selectedTrip.startDate} al ${selectedTrip.endDate}`;
      const itinerary = await generateDetailedItinerary(selectedTrip.destination, dates, "Intereses variados, cultura, gastronomía y relax");

      // Update the trip with the new itinerary (via onAddTrip or a new onUpdateTrip prop if we had it, for now we re-add/update)
      onAddTrip({
        ...selectedTrip,
        aiItinerary: itinerary
      });
      alert("Itinerario completo generado con éxito.");
    } catch (error) {
      console.error(error);
      alert("Error al generar el itinerario.");
    } finally {
      setIsGeneratingItinerary(false);
    }
  };

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrip.destination || !newTrip.startDate) return;

    onAddTrip({
      id: `trip-${Date.now()}`,
      destination: newTrip.destination,
      startDate: newTrip.startDate,
      endDate: newTrip.endDate || newTrip.startDate,
      budget: parseFloat(newTrip.budget) || 0,
      expenses: [],
      notebookUrl: newTrip.notebookUrl,
      bookings: []
    });
    setNewTrip({ destination: '', startDate: '', endDate: '', budget: '', notebookUrl: '' });
    setShowModal(false);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-700 pb-20">

      <div className="px-4 pb-2 pt-4"><BotPanelViajes /></div>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Expediciones & Viajes</h2>
          <p className="text-slate-500 font-bold mt-1">Gestión logística e inteligencia viajera sincronizada con NotebookLM</p>
        </div>
        <div className="flex gap-3">
          <a
            href={TRAVEL_NOTEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-4 bg-white text-indigo-600 border border-indigo-100 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-50 transition-all flex items-center gap-2"
          >
            <BookOpen size={16} /> Cuaderno Maestro de Viajes
          </a>
          <button
            onClick={() => setShowModal(true)}
            className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 flex items-center gap-3"
          >
            <Plus size={18} /> Nueva Expedición
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Details and Tabs */}
        <div className="lg:col-span-8 space-y-8">
          {selectedTrip ? (
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
              <div className="bg-slate-900 p-8 text-white relative">
                <div className="relative z-10">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-3xl font-black tracking-tight mb-2">{selectedTrip.destination}</h3>
                      <p className="text-indigo-400 font-bold uppercase tracking-[0.2em] text-[10px]">Expedición Activa — 2024</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-indigo-400">${selectedTrip.budget}</div>
                      <p className="text-slate-500 font-bold uppercase text-[9px] tracking-widest leading-none mt-1">Presupuesto</p>
                    </div>
                  </div>
                </div>
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Globe size={120} /></div>
              </div>

              <div className="flex border-b border-slate-100 px-8 bg-slate-50/50">
                <button onClick={() => setActiveSubTab('itinerary')} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeSubTab === 'itinerary' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                  Itinerario
                  {activeSubTab === 'itinerary' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
                </button>
                <button onClick={() => setActiveSubTab('economy')} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeSubTab === 'economy' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                  Economía
                  {activeSubTab === 'economy' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
                </button>
                <button onClick={() => setActiveSubTab('documents')} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeSubTab === 'documents' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                  Documentos
                  {activeSubTab === 'documents' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
                </button>
                <button onClick={() => setActiveSubTab('notebook')} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeSubTab === 'notebook' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                  Cuaderno & IA
                  {activeSubTab === 'notebook' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
                </button>
                <button onClick={() => setActiveSubTab('whiteboard')} className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeSubTab === 'whiteboard' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                  Pizarra
                  {activeSubTab === 'whiteboard' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
                </button>
              </div>

              <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                {activeSubTab === 'itinerary' && (
                  <div className="space-y-4 animate-in slide-in-from-right-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Sparkles size={14} className="text-indigo-500" /> Itinerario IA
                      </h4>
                      <div className="flex gap-2">
                        <button onClick={handleGenerateAI} disabled={generatingAI}
                          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black transition-all flex items-center gap-1.5 disabled:opacity-60">
                          {generatingAI ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                          {generatingAI ? 'Generando...' : 'Generar con IA'}
                        </button>
                        {!selectedTrip.aiItinerary && (
                          <button onClick={handleGenerateFullItinerary} disabled={isGeneratingItinerary}
                            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black transition-all flex items-center gap-1.5 disabled:opacity-60">
                            {isGeneratingItinerary ? <Loader2 size={11} className="animate-spin" /> : <Globe size={11} />}
                            Gemini
                          </button>
                        )}
                      </div>
                    </div>

                    {(aiItinerary || selectedTrip.aiItinerary) ? (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/5 rounded-2xl p-5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto custom-scrollbar">
                        {aiItinerary || selectedTrip.aiItinerary}
                      </div>
                    ) : (
                      <div className="p-16 text-center border-2 border-dashed border-slate-100 dark:border-white/5 rounded-2xl flex flex-col items-center">
                        <MapPin size={32} className="text-slate-200 dark:text-slate-700 mb-3" />
                        <p className="text-slate-400 font-bold text-xs">Genera un itinerario personalizado con IA</p>
                        <p className="text-slate-300 dark:text-slate-600 text-[10px] mt-1">Incluye actividades, restaurantes y consejos</p>
                      </div>
                    )}
                  </div>
                )}

                {activeSubTab === 'economy' && (
                  <div className="space-y-8 animate-in slide-in-from-right-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Presupuesto Total</p>
                        <p className="text-2xl font-black text-slate-900">${selectedTrip.budget}</p>
                      </div>
                      <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Disponible</p>
                        <p className="text-2xl font-black text-emerald-700">${selectedTrip.budget - (selectedTrip.expenses?.reduce((acc, e) => acc + e.amount, 0) || 0)}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-widest">Desglose de Gastos</h4>
                      <div className="text-center py-20 bg-slate-50/30 rounded-3xl border border-dashed border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                        Funcionalidad de gastos próximamente
                      </div>
                    </div>
                  </div>
                )}

                {activeSubTab === 'documents' && (
                  <div className="space-y-6 animate-in slide-in-from-right-4">
                    <div className="flex justify-between items-center bg-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-100">
                      <div>
                        <h4 className="font-black text-sm">Reserva de Transportes & Estancia</h4>
                        <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest">Sincronizado con Filehub Storage</p>
                      </div>
                      <button className="bg-white/20 p-3 rounded-2xl hover:bg-white/30 transition-colors"><Plus size={20} /></button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedTrip.bookings && selectedTrip.bookings.length > 0 ? selectedTrip.bookings.map((booking, i) => (
                        <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group hover:shadow-lg transition-all">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-50 rounded-xl text-indigo-600"><FileText size={18} /></div>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{booking.type}</p>
                              <p className="font-bold text-sm text-slate-800">{booking.ref}</p>
                            </div>
                          </div>
                          <button className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><ExternalLink size={16} /></button>
                        </div>
                      )) : (
                        <div className="col-span-2 p-12 text-center border-2 border-dashed border-slate-50 rounded-3xl">
                          <p className="text-slate-300 text-[10px] font-black uppercase tracking-widest">No hay reservas cargadas</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeSubTab === 'whiteboard' && selectedTrip && (
                  <div className="h-[600px] animate-in slide-in-from-right-4">
                    <Whiteboard
                      initialData={selectedTrip.whiteboardData}
                      onSave={(data) => onAddTrip({ ...selectedTrip, whiteboardData: data })}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-20 rounded-[3rem] border border-slate-100 shadow-sm text-center flex flex-col items-center justify-center min-h-[600px]">
              <Globe size={64} className="text-slate-200 mb-6 animate-pulse" />
              <h3 className="text-xl font-black text-slate-900 mb-2">Comienza tu Aventura</h3>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed">
                Selecciona una expedición activa o crea una nueva para empezar a planificar.
              </p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xl text-slate-900">Nueva Expedición</h3>
              <button onClick={() => setShowModal(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
            </div>
            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Destino</label>
                <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold"
                  value={newTrip.destination}
                  onChange={e => setNewTrip({ ...newTrip, destination: e.target.value })}
                  placeholder="Ej: Kioto, Japón"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Inicio</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold"
                    value={newTrip.startDate}
                    onChange={e => setNewTrip({ ...newTrip, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fin</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold"
                    value={newTrip.endDate}
                    onChange={e => setNewTrip({ ...newTrip, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Presupuesto</label>
                <input
                  type="number"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold"
                  value={newTrip.budget}
                  onChange={e => setNewTrip({ ...newTrip, budget: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL NotebookLM</label>
                <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold"
                  value={newTrip.notebookUrl}
                  onChange={e => setNewTrip({ ...newTrip, notebookUrl: e.target.value })}
                  placeholder="https://notebooklm.google.com/..."
                />
              </div>
              <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg">
                Crear Viaje
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripsView;
