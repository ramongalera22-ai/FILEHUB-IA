
import React, { useState, useMemo, useRef } from 'react';
import { Expense, Project, CalendarEvent, Task, Goal, CalendarSource } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Briefcase, 
  Loader2, 
  Clock, 
  Zap, 
  FileUp, 
  List, 
  CalendarDays, 
  AlertTriangle, 
  BrainCircuit, 
  MessageSquarePlus, 
  Link2, 
  Trash2, 
  Plus, 
  X, 
  LayoutGrid
} from 'lucide-react';
import { analyzeCalendarIntelligence, extractEventsFromICS } from '../services/geminiService';

interface CalendarViewProps {
  expenses: Expense[];
  projects: Project[];
  calendarEvents: CalendarEvent[];
  tasks?: Task[];
  goals?: Goal[];
  onAddEvent: (event: CalendarEvent) => void;
  onUpdateAllEvents?: (events: CalendarEvent[]) => void;
  onDeleteEvent?: (id: string) => void;
}

type SubView = 'month' | 'week' | 'daily' | 'quick' | 'sources';

export default function CalendarView({ 
  calendarEvents, 
  onAddEvent,
  onDeleteEvent
}: CalendarViewProps) {
  const [activeSubView, setActiveSubView] = useState<SubView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  
  // Sources State
  const [sources, setSources] = useState<CalendarSource[]>([
    { id: '1', name: 'Google Calendar', type: 'google', url: '', color: '#4f46e5', active: true },
    { id: '2', name: 'Outlook Work', type: 'outlook', url: '', color: '#0ea5e9', active: false }
  ]);
  const [newSourceUrl, setNewSourceUrl] = useState('');
  
  // AI Analysis States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  
  // Quick Add State
  const [quickEvent, setQuickEvent] = useState({ title: '', date: new Date().toISOString().split('T')[0], type: 'personal' as any });

  const icsInputRef = useRef<HTMLInputElement>(null);

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const monthName = currentDate.toLocaleString('es-ES', { month: 'long' });
  const year = currentDate.getFullYear();

  const handlePrev = () => {
    if (activeSubView === 'week') {
       const d = new Date(currentDate);
       d.setDate(d.getDate() - 7);
       setCurrentDate(d);
    } else {
       setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    }
  };

  const handleNext = () => {
    if (activeSubView === 'week') {
       const d = new Date(currentDate);
       d.setDate(d.getDate() + 7);
       setCurrentDate(d);
    } else {
       setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    }
  };

  const runAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeCalendarIntelligence(calendarEvents);
      setAnalysisResult(analysis);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleICSImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const content = reader.result as string;
      try {
        const events = await extractEventsFromICS(content);
        events.forEach(ev => onAddEvent(ev));
        alert(`Se han importado ${events.length} eventos del archivo ICS.`);
      } catch (error) {
        console.error("Fallo al importar ICS:", error);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEvent.title) return;
    onAddEvent({
      id: `quick-${Date.now()}`,
      title: quickEvent.title,
      start: quickEvent.date,
      end: quickEvent.date,
      type: quickEvent.type,
      source: 'manual'
    });
    setQuickEvent({ title: '', date: new Date().toISOString().split('T')[0], type: 'personal' });
    alert("Evento añadido con éxito");
    setActiveSubView('month');
  };

  const handleAddSource = () => {
    if(!newSourceUrl) return;
    setSources([...sources, {
      id: `src-${Date.now()}`,
      name: 'Nuevo Calendario',
      type: 'ical',
      url: newSourceUrl,
      color: '#10b981',
      active: true
    }]);
    setNewSourceUrl('');
  };

  const handleDeleteSource = (id: string) => {
    setSources(sources.filter(s => s.id !== id));
  };

  const eventsForSelectedDay = useMemo(() => {
    return calendarEvents.filter(ev => {
      const d = new Date(ev.start);
      return d.getDate() === selectedDay && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
    });
  }, [calendarEvents, selectedDay, currentDate]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    calendarEvents.forEach(event => {
      const d = new Date(event.start);
      if (d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear()) {
        const key = `${d.getDate()}`;
        if (!map[key]) map[key] = [];
        map[key].push(event);
      }
    });
    return map;
  }, [calendarEvents, currentDate]);

  // Logic for Weekly View
  const weekDates = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
    startOfWeek.setDate(diff);
    
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  }, [currentDate]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500 pb-16">
      
      {/* Main Content Column */}
      <div className="lg:col-span-9 space-y-8">
        
        {/* Navigation */}
        <div className="bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
           <div className="flex gap-1 overflow-x-auto no-scrollbar w-full md:w-auto">
              {[
                { id: 'month', label: 'Mes', icon: CalendarIcon },
                { id: 'week', label: 'Semana', icon: LayoutGrid },
                { id: 'daily', label: 'Día', icon: List },
                { id: 'quick', label: 'Añadir', icon: MessageSquarePlus },
                { id: 'sources', label: 'Fuentes', icon: Link2 }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubView(tab.id as SubView)}
                  className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    activeSubView === tab.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : 'text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <tab.icon size={16} /> {tab.label}
                </button>
              ))}
           </div>
           
           <div className="flex items-center gap-3 w-full md:w-auto justify-end pr-4">
              <button 
                onClick={runAIAnalysis}
                disabled={isAnalyzing}
                className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-[0.15em] flex items-center gap-2 hover:bg-indigo-600 transition-all disabled:opacity-50 shadow-lg shadow-slate-200"
              >
                {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
                Analizar Agenda
              </button>
           </div>
        </div>

        {/* Dynamic Views Area */}
        <div className="min-h-[600px]">
          
          {/* MONTH VIEW */}
          {activeSubView === 'month' && (
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col animate-in slide-in-from-bottom-2">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-4xl font-black text-slate-800 flex items-center gap-3">
                  <CalendarDays className="text-indigo-600" size={36} />
                  <span className="capitalize">{monthName}</span> <span className="text-slate-300 font-medium">{year}</span>
                </h2>
                <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                  <button onClick={handlePrev} className="p-3 hover:bg-white rounded-xl text-slate-400 hover:text-slate-800 transition-all"><ChevronLeft size={20} /></button>
                  <button onClick={handleNext} className="p-3 hover:bg-white rounded-xl text-slate-400 hover:text-slate-800 transition-all"><ChevronRight size={20} /></button>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-[2.5rem] overflow-hidden">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                  <div key={day} className="bg-slate-50/50 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</div>
                ))}
                
                {Array.from({ length: firstDayOfMonth(currentDate) }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-slate-50/20" />
                ))}

                {Array.from({ length: daysInMonth(currentDate) }).map((_, i) => {
                  const day = i + 1;
                  const dayEvents = eventsByDay[day] || [];
                  const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();
                  const isSelected = day === selectedDay;
                  
                  return (
                    <button 
                      key={day} 
                      onClick={() => setSelectedDay(day)}
                      className={`bg-white p-3 min-h-[100px] text-left group transition-all hover:bg-slate-50/50 border-b border-r border-slate-50 relative ${
                        isSelected ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-50/10' : ''
                      }`}
                    >
                      <span className={`text-sm font-black ${
                        isToday ? 'bg-indigo-600 text-white w-7 h-7 flex items-center justify-center rounded-xl' : isSelected ? 'text-indigo-600' : 'text-slate-400'
                      }`}>
                        {day}
                      </span>
                      <div className="mt-2 space-y-1">
                        {dayEvents.slice(0, 3).map((event, idx) => (
                          <div key={idx} className={`h-1 rounded-full ${
                            event.type === 'expense' ? 'bg-emerald-400' : 
                            event.type === 'project' ? 'bg-amber-400' : 'bg-indigo-400'
                          }`} title={event.title} />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* WEEKLY VIEW */}
          {activeSubView === 'week' && (
            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col animate-in slide-in-from-bottom-2 h-[800px]">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-slate-800">Semana del {weekDates[0].getDate()}</h2>
                  <div className="flex bg-slate-50 p-1 rounded-xl">
                     <button onClick={handlePrev} className="p-2 hover:bg-white rounded-lg"><ChevronLeft size={16}/></button>
                     <button onClick={handleNext} className="p-2 hover:bg-white rounded-lg"><ChevronRight size={16}/></button>
                  </div>
               </div>
               <div className="flex-1 grid grid-cols-7 gap-2 h-full overflow-y-auto">
                  {weekDates.map(day => {
                     const dateStr = day.toISOString().split('T')[0];
                     // Simple filter for demo: find events on this day
                     const dayEvents = calendarEvents.filter(e => e.start.startsWith(dateStr));
                     
                     return (
                       <div key={dateStr} className="flex flex-col bg-slate-50 rounded-2xl p-2 border border-slate-100">
                          <div className="text-center p-2 border-b border-slate-200 mb-2">
                             <p className="text-[10px] font-black uppercase text-slate-400">{day.toLocaleDateString('es-ES', { weekday: 'short' })}</p>
                             <p className="font-black text-slate-700">{day.getDate()}</p>
                          </div>
                          <div className="flex-1 space-y-2">
                             {dayEvents.map(ev => (
                               <div key={ev.id} className="bg-white p-2 rounded-lg text-[9px] font-bold shadow-sm border-l-4 border-indigo-500">
                                  {ev.title}
                               </div>
                             ))}
                          </div>
                       </div>
                     )
                  })}
               </div>
            </div>
          )}

          {/* DAILY VIEW */}
          {activeSubView === 'daily' && (
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm min-h-[600px] animate-in zoom-in-95">
               <div className="flex justify-between items-center mb-12">
                  <div>
                     <h3 className="text-3xl font-black text-slate-900 tracking-tight">Agenda del {selectedDay} de {monthName}</h3>
                     <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Inspección de eventos diaria</p>
                  </div>
                  <button onClick={() => setActiveSubView('month')} className="p-4 bg-slate-50 hover:bg-indigo-50 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all">
                     <ChevronLeft size={24} />
                  </button>
               </div>

               <div className="space-y-6">
                  {eventsForSelectedDay.length === 0 ? (
                    <div className="py-32 text-center flex flex-col items-center">
                       <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 text-slate-200"><CalendarIcon size={40} /></div>
                       <p className="text-slate-400 font-black uppercase text-xs tracking-widest">No hay eventos para este día</p>
                    </div>
                  ) : (
                    eventsForSelectedDay.map((ev, i) => (
                      <div key={i} className="flex gap-8 group">
                         <div className="w-20 pt-2 text-right">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TODO EL DÍA</span>
                         </div>
                         <div className={`flex-1 p-8 rounded-[2rem] border transition-all flex items-center justify-between ${
                           ev.type === 'project' ? 'bg-amber-50 border-amber-100 text-amber-900' :
                           ev.type === 'expense' ? 'bg-emerald-50 border-emerald-100 text-emerald-900' :
                           'bg-indigo-50 border-indigo-100 text-indigo-900'
                         }`}>
                            <div className="flex items-center gap-5">
                               <div className="p-4 rounded-2xl bg-white shadow-sm">
                                  {ev.type === 'project' ? <Briefcase size={20} /> : <Zap size={20} />}
                                </div>
                               <div>
                                  <h4 className="font-black text-lg">{ev.title}</h4>
                                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{ev.type}</span>
                               </div>
                            </div>
                            {onDeleteEvent && (
                              <button onClick={() => onDeleteEvent(ev.id)} className="p-3 bg-white hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-xl transition-all shadow-sm opacity-0 group-hover:opacity-100">
                                <Trash2 size={18} />
                              </button>
                            )}
                         </div>
                      </div>
                    ))
                  )}
               </div>
            </div>
          )}

          {/* QUICK ADD */}
          {activeSubView === 'quick' && (
            <div className="bg-slate-900 p-12 rounded-[4rem] text-white shadow-2xl min-h-[500px] flex flex-col items-center justify-center animate-in slide-in-from-top-4">
               <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center mb-10 shadow-2xl shadow-indigo-900/50">
                  <MessageSquarePlus size={36} />
               </div>
               <h3 className="text-4xl font-black tracking-tight mb-4">Inyección Rápida</h3>
               <p className="text-slate-400 font-medium mb-12 text-center max-w-md">Registra nuevos hitos o recordatorios sin fricción.</p>
               
               <form onSubmit={handleQuickAddSubmit} className="w-full max-w-xl space-y-6">
                  <div className="relative group">
                     <Zap className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400" size={24} />
                     <input placeholder="¿Qué quieres agendar?" className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-6 pl-16 pr-8 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-xl font-bold transition-all" value={quickEvent.title} onChange={e => setQuickEvent({...quickEvent, title: e.target.value})} autoFocus />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <input type="date" className="bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold outline-none" value={quickEvent.date} onChange={e => setQuickEvent({...quickEvent, date: e.target.value})} />
                     <select className="bg-white/5 border border-white/10 rounded-2xl p-5 text-[10px] font-black uppercase" value={quickEvent.type} onChange={e => setQuickEvent({...quickEvent, type: e.target.value as any})} >
                        <option value="personal">Recordatorio</option>
                        <option value="work">Laboral</option>
                        <option value="project">Proyecto</option>
                        <option value="fitness">Fitness</option>
                     </select>
                  </div>
                  <button type="submit" className="w-full py-6 bg-indigo-600 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-500 transition-all">Confirmar e Inyectar</button>
               </form>
            </div>
          )}

          {/* SOURCES MANAGEMENT */}
          {activeSubView === 'sources' && (
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm animate-in slide-in-from-bottom-2">
               <h3 className="text-xl font-black text-slate-900 mb-8">Fuentes de Calendario</h3>
               
               <div className="space-y-4 mb-8">
                  {sources.map(src => (
                    <div key={src.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <div className="flex items-center gap-4">
                          <div className="w-4 h-4 rounded-full" style={{backgroundColor: src.color}}></div>
                          <div>
                             <p className="font-bold text-sm text-slate-800">{src.name}</p>
                             <p className="text-[10px] text-slate-400 uppercase tracking-widest">{src.type}</p>
                          </div>
                       </div>
                       <button onClick={() => handleDeleteSource(src.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                  ))}
               </div>

               <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                  <h4 className="font-bold text-slate-700 text-sm mb-4">Añadir Nueva Fuente</h4>
                  <div className="flex gap-2 mb-4">
                     <input 
                       className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold"
                       placeholder="URL de calendario (iCal/Public)..."
                       value={newSourceUrl}
                       onChange={e => setNewSourceUrl(e.target.value)}
                     />
                     <button onClick={handleAddSource} className="bg-slate-900 text-white px-4 rounded-xl font-bold text-xs"><Plus size={16}/></button>
                  </div>
                  
                  <div className="border-t border-slate-200 pt-4">
                     <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Importar Archivo</p>
                     <input type="file" ref={icsInputRef} className="hidden" accept=".ics" onChange={handleICSImport} />
                     <button onClick={() => icsInputRef.current?.click()} className="w-full bg-white border border-indigo-200 text-indigo-600 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all">
                        {isImporting ? <Loader2 className="animate-spin" size={14}/> : <FileUp size={14}/>}
                        Subir .ICS
                     </button>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Intelligence Sidebar */}
        <div className="lg:col-span-3 space-y-8">
           <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden border border-indigo-500/20">
              <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                <BrainCircuit className="text-indigo-400" size={20} /> AI Advisor
              </h3>
              
              {analysisResult ? (
                <div className="space-y-4 animate-in fade-in">
                   <p className="text-xs text-slate-300 leading-relaxed italic">"{analysisResult.summary}"</p>
                   
                   {analysisResult.conflicts && analysisResult.conflicts.length > 0 && (
                     <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30">
                        <p className="text-[9px] font-black uppercase text-red-300 mb-2 flex items-center gap-1"><AlertTriangle size={10} /> Conflictos</p>
                        <ul className="text-[10px] space-y-1 text-red-200">
                           {analysisResult.conflicts.map((c: string, i: number) => <li key={i}>• {c}</li>)}
                        </ul>
                     </div>
                   )}
                   
                   {analysisResult.suggestions && (
                     <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                        <p className="text-[9px] font-black uppercase text-emerald-300 mb-2">Sugerencias</p>
                        <ul className="text-[10px] space-y-1 text-emerald-200">
                           {analysisResult.suggestions.map((s: string, i: number) => <li key={i}>• {s}</li>)}
                        </ul>
                     </div>
                   )}
                   
                   <button onClick={() => setAnalysisResult(null)} className="text-[9px] font-black uppercase text-indigo-400 hover:text-white w-full text-center mt-2">Limpiar</button>
                </div>
              ) : (
                <div className="text-center py-8 opacity-50">
                   <p className="text-xs font-medium">Ejecuta el análisis para detectar conflictos y optimizar tu tiempo.</p>
                </div>
              )}
           </div>
        </div>
    </div>
  );
}
