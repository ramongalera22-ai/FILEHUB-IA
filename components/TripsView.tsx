
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
  X
} from 'lucide-react';
import { chatWithGemini } from '../services/geminiService';

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

  const selectedTrip = trips.find(t => t.id === selectedTripId) || trips[0];

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
    if (trip.id === selectedTripId) return 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 ring-2 ring-indigo-300 ring-offset-1';
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
      // Usando el modelo pro con pensamiento profundo para un briefing de alta calidad
      const response = await chatWithGemini(prompt, { trip: selectedTrip }, { useThinking: true });
      setBriefing(response.text);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingBriefing(false);
    }
  };

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if(!newTrip.destination || !newTrip.startDate) return;
    
    onAddTrip({
      id: `trip-${Date.now()}`,
      destination: newTrip.destination,
      startDate: newTrip.startDate,
      endDate: newTrip.endDate || newTrip.startDate,
      budget: parseFloat(newTrip.budget) || 0,
      expenses: [],
      notebookUrl: newTrip.notebookUrl
    });
    setNewTrip({ destination: '', startDate: '', endDate: '', budget: '', notebookUrl: '' });
    setShowModal(false);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
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
        
        {/* Scheduled Trips List */}
        <div className="lg:col-span-4 space-y-6">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <Plane size={14} className="text-indigo-500" /> Próximas Salidas
          </h3>
          <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            {trips.length === 0 ? (
              <p className="text-center py-10 text-slate-400 text-xs font-bold uppercase">No hay viajes programados</p>
            ) : (
              trips.map(trip => (
                <div key={trip.id} className="relative group">
                  <button
                    onClick={() => { setSelectedTripId(trip.id); setBriefing(null); }}
                    className={`w-full p-6 rounded-[2rem] border transition-all text-left flex items-center justify-between ${
                      selectedTripId === trip.id 
                      ? 'bg-white border-indigo-200 shadow-xl shadow-indigo-500/5' 
                      : 'bg-white/50 border-slate-100 hover:border-indigo-100 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                        selectedTripId === trip.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <Globe size={24} />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 text-sm">{trip.destination}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{trip.startDate} — {trip.endDate}</p>
                      </div>
                    </div>
                    <ArrowRight size={18} className={`transition-transform ${selectedTripId === trip.id ? 'text-indigo-600 translate-x-1' : 'text-slate-200 group-hover:text-slate-400'}`} />
                  </button>
                  <button onClick={() => onDeleteTrip(trip.id)} className="absolute top-2 right-2 p-2 bg-white rounded-full text-slate-300 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {selectedTrip && (
            <div className="bg-indigo-50 p-8 rounded-[2rem] border border-indigo-100 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 text-indigo-200 group-hover:scale-110 transition-transform"><Sparkles size={48} /></div>
               <div className="flex items-center gap-3 mb-4">
                 <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-lg"><Sparkles size={16} /></div>
                 <h4 className="font-black text-xs text-indigo-900 uppercase tracking-tight">AI Travel Briefing</h4>
               </div>
               {briefing ? (
                 <div className="text-[11px] text-indigo-800 leading-relaxed font-medium space-y-2 animate-in fade-in slide-in-from-top-2">
                   {briefing.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                   <button onClick={() => setBriefing(null)} className="text-[9px] font-black uppercase text-indigo-400 mt-2 hover:text-indigo-600 transition-colors">Cerrar Briefing</button>
                 </div>
               ) : (
                 <>
                   <p className="text-[11px] text-indigo-700 leading-relaxed font-medium mb-4">
                     Genera un resumen inteligente de seguridad, clima y lugares secretos para tu estancia en {selectedTrip.destination}.
                   </p>
                   <button 
                    onClick={generateBriefing}
                    disabled={isGeneratingBriefing}
                    className="w-full bg-indigo-600 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50"
                   >
                     {isGeneratingBriefing ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                     {isGeneratingBriefing ? 'Consultando a Gemini...' : 'Generar Briefing Pro'}
                   </button>
                 </>
               )}
            </div>
          )}
        </div>

        {/* Small Interactive Calendar Widget */}
        <div className="lg:col-span-4 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm h-fit">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest">
              <CalendarIcon className="text-indigo-600" size={18} />
              {monthName} {currentDate.getFullYear()}
            </h3>
            <div className="flex gap-1">
              <button 
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(d => (
              <div key={d} className="text-center text-[9px] font-black text-slate-300 uppercase tracking-widest py-2">{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const styles = getDayStyles(day);
              
              return (
                <button 
                  key={day} 
                  onClick={() => handleDayClick(day)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center text-[11px] font-bold transition-all ${styles}`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-50 space-y-3">
             <div className="flex items-center gap-3">
               <div className="w-3 h-3 bg-indigo-600 rounded-full shadow-lg shadow-indigo-200 ring-2 ring-indigo-300"></div>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Viaje Seleccionado</span>
             </div>
             <div className="flex items-center gap-3">
               <div className="w-3 h-3 bg-indigo-100 rounded-full"></div>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Otras Expediciones</span>
             </div>
          </div>
        </div>

        {/* NotebookLM Context & Details */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {selectedTrip ? (
            <>
              <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden flex-1 flex flex-col justify-between border border-indigo-500/20">
                <div className="absolute top-0 right-0 p-8 opacity-10"><BookOpen size={100} /></div>
                
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-3 px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 rounded-full mb-6">
                    <Sparkles size={14} className="text-indigo-400" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-300">Bridge: NotebookLM</span>
                  </div>
                  <h3 className="text-3xl font-black mb-2 tracking-tight">{selectedTrip.destination}</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">Cuaderno de Investigación Activo</p>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-5 bg-white/5 rounded-2xl border border-white/10 group hover:bg-white/10 transition-colors">
                      <div className="p-2 bg-white/10 rounded-lg text-indigo-400"><Info size={16} /></div>
                      <p className="text-[11px] text-slate-300 leading-relaxed italic">
                        "Toda tu investigación sobre museos, rutas gastronómicas y reservas en {selectedTrip.destination} están centralizadas aquí."
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-10 relative z-10">
                  {selectedTrip.notebookUrl ? (
                    <a 
                      href={selectedTrip.notebookUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full bg-white text-slate-900 py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-indigo-50 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-slate-950/50"
                    >
                      Conectar a NotebookLM <ExternalLink size={16} />
                    </a>
                  ) : (
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Sin cuaderno vinculado
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                 <div className="flex justify-between items-center mb-6">
                   <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Presupuesto Estimado</h4>
                   <span className="text-xs font-black text-indigo-600 font-black">${selectedTrip.budget}</span>
                 </div>
                 <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 rounded-full transition-all duration-1000" 
                      style={{ width: '38%' }}
                    ></div>
                 </div>
                 <div className="flex justify-between mt-3 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                    <span>Gastado: $0</span>
                    <span>Margen: ${selectedTrip.budget}</span>
                 </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm text-center flex flex-col items-center justify-center h-full">
               <Globe size={48} className="text-slate-200 mb-4" />
               <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Selecciona o crea un viaje</p>
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
                      onChange={e => setNewTrip({...newTrip, destination: e.target.value})}
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
                         onChange={e => setNewTrip({...newTrip, startDate: e.target.value})}
                         required
                       />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fin</label>
                       <input 
                         type="date"
                         className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold"
                         value={newTrip.endDate}
                         onChange={e => setNewTrip({...newTrip, endDate: e.target.value})}
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
                      onChange={e => setNewTrip({...newTrip, budget: e.target.value})}
                      placeholder="0.00"
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL NotebookLM</label>
                    <input 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold"
                      value={newTrip.notebookUrl}
                      onChange={e => setNewTrip({...newTrip, notebookUrl: e.target.value})}
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
