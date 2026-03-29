import React, { useState, useMemo, useEffect } from 'react';
import {
   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Expense, Task, CalendarEvent, Partnership } from '../types';
import {
   TrendingUp, CheckSquare, CreditCard, Plus, Trash2, FolderOpen,
   FileText, BarChart3, Calendar, Clock, MapPin, AlertCircle, ChevronLeft, ChevronRight,
   UploadCloud, FileUp, Loader2, Scan, Users, Star, Flame, Shield, Target, CheckCircle2, Circle,
   Sparkles, Zap, Brain, Sun, CloudRain, Wind, Thermometer, ArrowRight, Activity,
   RefreshCw, Coffee, Moon, Sunrise
} from 'lucide-react';
import { analyzeFinancialDocument } from '../services/openrouterService';
import { supabase } from '../services/supabaseClient';

const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_KEY || '';
const MURCIA_WEATHER_URL = 'https://wttr.in/Murcia?format=j1';

async function generateDailyBriefing(tasks: Task[], events: CalendarEvent[], hour: number): Promise<string> {
  if (!OPENROUTER_KEY) return '';
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.start.startsWith(todayStr));
  const urgentTasks = tasks.filter(t => !t.completed && t.priority === 'high').slice(0, 5);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'HTTP-Referer': 'https://ramongalera22-ai.github.io/FILEHUB-IA' },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4.5', max_tokens: 300,
        messages: [{ role: 'user', content: `${greeting}, Carlos. Soy tu asistente IA. Dame un briefing motivador en 3-4 frases cortas sobre: Eventos hoy: ${todayEvents.map(e=>e.title).join(', ') || 'ninguno'}. Tareas urgentes: ${urgentTasks.map(t=>t.title).join(', ') || 'ninguna'}. Incluye un consejo práctico para el día. Sé conciso, directo y positivo. No uses listas.` }]
      })
    });
    const d = await res.json();
    return d.choices?.[0]?.message?.content || '';
  } catch { return ''; }
}

interface DashboardProps {
   expenses: Expense[];
   tasks: Task[];
   events: CalendarEvent[];
   globalContext?: any;
   onAddTask: (task: Task) => void;
   onDeleteTask: (id: string) => void;
   onToggleTask: (id: string) => void;
   onAddExpense: (expense: Expense) => void;
   onDeleteExpense?: (id: string) => void;
   onAddGoal?: (goal: any) => void;
   onAddIdea?: (idea: any) => void;
   onAddEvent?: (event: any) => void;
   currentUser?: string | null;
   partnership?: Partnership | null;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

const Dashboard: React.FC<DashboardProps> = ({
   expenses, tasks, events, globalContext,
   onAddTask, onDeleteTask, onToggleTask, onAddExpense, onDeleteExpense,
   onAddGoal, onAddIdea, onAddEvent, currentUser, partnership
}) => {
   const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'payments' | 'actions'>('overview');
   const [newExpense, setNewExpense] = useState({ vendor: '', amount: '', category: 'General', date: new Date().toISOString().split('T')[0] });
   const [newTaskTitle, setNewTaskTitle] = useState('');
   const [isSharedTask, setIsSharedTask] = useState(false);
   const [showQuickAdd, setShowQuickAdd] = useState<string | null>(null);

   // AI Scan State
   const [isAnalyzingFile, setIsAnalyzingFile] = useState(false);
   const [scannedExpense, setScannedExpense] = useState<Partial<Expense> | null>(null);

   // Dashboard AI Briefing
   const [briefing, setBriefing] = useState('');
   const [loadingBriefing, setLoadingBriefing] = useState(false);
   const [weatherCity, setWeatherCity] = useState<'murcia' | 'barcelona' | 'custom'>('murcia');
   const [customCity, setCustomCity] = useState('');
   const [weather, setWeather] = useState<Record<string, {temp: string; desc: string; icon: string; cityName?: string}>>({});
   const currentHour = new Date().getHours();
   const greeting = currentHour < 12 ? '☀️ Buenos días' : currentHour < 18 ? '🌤️ Buenas tardes' : '🌙 Buenas noches';

   const fetchWeather = (city: string) => {
     if (weather[city]) return;
     // Use wttr.in JSON API — more reliable, gives proper city name
     fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`)
       .then(r => r.json())
       .then(data => {
         const current = data?.current_condition?.[0];
         const area = data?.nearest_area?.[0];
         const temp = current?.temp_C ? `${current.temp_C}°C` : '--';
         const desc = current?.weatherDesc?.[0]?.value || '';
         const cityName = area?.areaName?.[0]?.value || city;
         const country = area?.country?.[0]?.value || '';
         const d = desc.toLowerCase();
         const icon = d.includes('sun') || d.includes('clear') ? '☀️' :
                      d.includes('partly') ? '⛅' :
                      d.includes('cloud') || d.includes('overcast') ? '☁️' :
                      d.includes('rain') || d.includes('drizzle') ? '🌧️' :
                      d.includes('snow') ? '❄️' :
                      d.includes('storm') || d.includes('thunder') ? '⛈️' :
                      d.includes('fog') || d.includes('mist') ? '🌫️' : '🌤️';
         setWeather(prev => ({ ...prev, [city]: { temp, desc, icon, cityName: cityName + (country ? `, ${country}` : '') } }));
       }).catch(() => {
         setWeather(prev => ({ ...prev, [city]: { temp: '--', desc: 'Sin datos', icon: '🌤️', cityName: city } }));
       });
   };

   useEffect(() => {
     fetchWeather('murcia');
     fetchWeather('barcelona');
   }, []);

   const handleGenerateBriefing = async () => {
     setLoadingBriefing(true);
     const result = await generateDailyBriefing(tasks, events, currentHour);
     setBriefing(result);
     setLoadingBriefing(false);
   };

   // --- Calculations ---
   const totalSpent = useMemo(() => expenses.reduce((acc, curr) => acc + Math.abs(curr.amount), 0), [expenses]);

   const pieData = useMemo(() => {
      const data = expenses.reduce((acc: Record<string, number>, curr: Expense) => {
         // Use absolute values to ensure chart renders even if expenses are entered as negative numbers
         acc[curr.category] = (acc[curr.category] || 0) + Math.abs(curr.amount);
         return acc;
      }, {} as Record<string, number>);
      return Object.entries(data)
         .map(([name, value]) => ({ name, value } as { name: string; value: number }))
         .sort((a, b) => b.value - a.value)
         .filter((item: { name: string; value: number }) => item.value > 0)
         .slice(0, 5);
   }, [expenses]);

   const nextPayments = useMemo(() => {
      const today = new Date().toISOString().split('T')[0];
      return expenses
         .filter(e => e.date >= today)
         .sort((a, b) => a.date.localeCompare(b.date))
         .slice(0, 10);
   }, [expenses]);

   const pendingTasks = useMemo(() => tasks.filter(t => !t.completed), [tasks]);

   // --- Weekly Agenda Logic ---
   const weekDays = useMemo(() => {
      const days = [];
      const today = new Date();
      for (let i = 0; i < 7; i++) {
         const d = new Date(today);
         d.setDate(today.getDate() + i);
         const dateStr = d.toISOString().split('T')[0];

         const daysTasks = tasks.filter(t => t.dueDate === dateStr && !t.completed);
         const daysEvents = events.filter(e => e.start.startsWith(dateStr));

         days.push({
            dateObj: d,
            dateStr,
            dayName: d.toLocaleDateString('es-ES', { weekday: 'short' }),
            dayNumber: d.getDate(),
            items: [...daysEvents, ...daysTasks]
         });
      }
      return days;
   }, [tasks, events]);

   const handleQuickAddExpense = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newExpense.vendor || !newExpense.amount) return;
      onAddExpense({
         id: Date.now().toString(),
         vendor: newExpense.vendor,
         amount: parseFloat(newExpense.amount),
         date: newExpense.date,
         category: newExpense.category,
         description: 'Dashboard Quick Add',
         priority: 'medium'
      });
      setNewExpense({ ...newExpense, vendor: '', amount: '' });
   };

   const handleQuickAddTask = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTaskTitle.trim()) return;

      const newTask = {
         id: Date.now().toString(), // Will be overwritten if persistent id needed
         title: newTaskTitle,
         completed: false,
         category: 'personal' as any,
         priority: 'medium' as any,
         dueDate: new Date().toISOString().split('T')[0]
      };

      // If Shared and Partnership exists, create shared task
      if (isSharedTask && partnership && currentUser) {
         // It's a shared task - needs different handling or same if onAddTask supports it?
         // The current onAddTask in App.tsx might only add to local state if not calling Supabase
         // Let's manually call Supabase here for simplicity to ensure it hits shared DB
         const sharedTask = {
            id: crypto.randomUUID(),
            title: newTaskTitle,
            completed: false,
            category: 'personal',
            priority: 'medium',
            partnership_id: partnership.id,
            user_id: currentUser
         };

         const { error } = await supabase.from('tasks').insert(sharedTask);
         if (error) {
            console.error('Error creating shared task:', error);
         } else {
            // Also add log to shared activity
            await supabase.from('shared_hub_activities').insert({
               partnership_id: partnership.id,
               user_id: currentUser,
               type: 'task',
               action: 'created',
               content: { title: newTaskTitle }
            });

            // Optimistically update or rely on real-time subscription in App.tsx?
            // App.tsx handles tasks state. If we want it to show up, we should call onAddTask
            onAddTask({ ...sharedTask, id: sharedTask.id } as Task);
            alert('Tarea compartida añadida al Dashboard Hub');
         }

      } else {
         onAddTask(newTask);
      }

      setNewTaskTitle('');
      setIsSharedTask(false);
   };

   const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsAnalyzingFile(true);
      try {
         const reader = new FileReader();
         reader.onload = async () => {
            const base64Data = (reader.result as string).split(',')[1];
            const mimeType = file.type;

            try {
               const analysis: any = await analyzeFinancialDocument(base64Data, mimeType);
               if (analysis.transactions && analysis.transactions.length > 0) {
                  // Take the first one for now or map multiple? Let's take the first one as principal
                  const t = analysis.transactions[0];
                  setScannedExpense({
                     vendor: t.vendor || 'Desconocido',
                     amount: t.amount || 0,
                     date: t.date || new Date().toISOString().split('T')[0],
                     category: t.category || 'General',
                     description: t.description || 'Gasto escaneado'
                  });
               } else {
                  alert('No se detectaron transacciones claras.');
               }
            } catch (error) {
               console.error(error);
               alert('Error al analizar el documento.');
            } finally {
               setIsAnalyzingFile(false);
            }
         };
         reader.readAsDataURL(file);
      } catch (error) {
         setIsAnalyzingFile(false);
      }
   };

   const confirmScannedExpense = () => {
      if (scannedExpense && scannedExpense.vendor && scannedExpense.amount) {
         onAddExpense({
            id: Date.now().toString(),
            vendor: scannedExpense.vendor,
            amount: scannedExpense.amount,
            date: scannedExpense.date || new Date().toISOString().split('T')[0],
            category: scannedExpense.category || 'General',
            description: scannedExpense.description || 'Gasto importado',
            priority: 'medium'
         });
         setScannedExpense(null);
         alert('Gasto añadido correctamente');
      }
   };

   return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-20 md:pb-10">

         {/* Compact Header */}
         <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-4 w-full md:w-auto">
               <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200"><TrendingUp size={24} /></div>
               <div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Dashboard Central</h2>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">Resumen Ejecutivo</p>
               </div>
            </div>

            <div className="flex w-full md:w-auto overflow-x-auto no-scrollbar bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl gap-1">
               {[
                  { id: 'overview', label: 'Resumen', icon: BarChart3 },
                  { id: 'tasks', label: 'Tareas', icon: CheckSquare },
                  { id: 'payments', label: 'Pagos', icon: CreditCard },
                  { id: 'actions', label: 'Entrada Maestra', icon: Plus }
               ].map(tab => (
                  <button
                     key={tab.id}
                     onClick={() => setActiveTab(tab.id as any)}
                     className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                        }`}
                  >
                     <tab.icon size={14} /> {tab.label}
                  </button>
               ))}
            </div>
         </header>

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Main Content Area */}
            <div className="lg:col-span-8 space-y-6">

               {activeTab === 'overview' && (
                  <div className="space-y-5">

                     {/* BRIEFING + WEATHER ROW */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       {/* Greeting + Briefing */}
                       <div className="md:col-span-2 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-5 text-white relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10" />
                         <div className="flex items-start justify-between gap-3 relative z-10">
                           <div className="flex-1">
                             <p className="text-sm font-black opacity-90 mb-1">{greeting}, Carlos 👋</p>
                             {briefing ? (
                               <p className="text-xs opacity-80 leading-relaxed">{briefing}</p>
                             ) : (
                               <p className="text-xs opacity-60">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} · {pendingTasks.length} tareas pendientes · {events.filter(e => e.start.startsWith(new Date().toISOString().split('T')[0])).length} eventos hoy</p>
                             )}
                           </div>
                           <button onClick={handleGenerateBriefing} disabled={loadingBriefing}
                             className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition-colors disabled:opacity-60">
                             {loadingBriefing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                             {briefing ? 'Regenerar' : 'Briefing IA'}
                           </button>
                         </div>
                       </div>

                       {/* Weather Multi-Ciudad */}
                       <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/60 dark:border-white/5 flex flex-col gap-2">
                         {/* City tabs */}
                         <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
                           {(['murcia', 'barcelona'] as const).map(city => (
                             <button key={city} onClick={() => { setWeatherCity(city); fetchWeather(city); }}
                               className={`flex-1 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${weatherCity === city ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                               {city === 'murcia' ? '🌅 Murcia' : '🏙️ Bcn'}
                             </button>
                           ))}
                           <button onClick={() => setWeatherCity('custom')}
                             className={`flex-1 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${weatherCity === 'custom' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                             ✏️
                           </button>
                         </div>
                         {/* Custom city input */}
                         {weatherCity === 'custom' && (
                           <input value={customCity} onChange={e => setCustomCity(e.target.value)}
                             onKeyDown={e => { if (e.key === 'Enter' && customCity.trim()) fetchWeather(customCity.trim()); }}
                             placeholder="Ciudad... (Enter)" className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-400" />
                         )}
                         {/* Weather display */}
                         {(() => {
                           const activeCity = weatherCity === 'custom' ? customCity.trim() : weatherCity;
                           const w = weather[activeCity];
                           return w ? (
                             <div className="flex items-end justify-between">
                               <div>
                                 <div className="text-3xl font-black text-slate-800 dark:text-white">{w.temp}</div>
                                 <div className="text-xs text-slate-500 truncate max-w-[110px]">{w.desc}</div>
                                 {w.cityName && <div className="text-[10px] text-slate-400 truncate max-w-[110px] mt-0.5">📍 {w.cityName}</div>}
                               </div>
                               <div className="text-right">
                                 <div className="text-2xl">{w.icon}</div>
                                 <div className="text-[10px] text-slate-400 font-mono">{new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
                               </div>
                             </div>
                           ) : (
                             <div className="flex items-center gap-2 py-1">
                               <div className="text-2xl animate-pulse">⌛</div>
                               <div className="text-sm text-slate-400">Cargando...</div>
                             </div>
                           );
                         })()}
                       </div>
                     </div>

                     {/* KPI CARDS */}
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                       {[
                         { label: 'Gasto Total', value: `€${totalSpent.toLocaleString()}`, icon: CreditCard, color: 'text-red-500', bg: 'bg-red-500/10', sub: 'este mes' },
                         { label: 'Tareas Pend.', value: pendingTasks.length, icon: CheckSquare, color: 'text-indigo-500', bg: 'bg-indigo-500/10', sub: `${tasks.filter(t=>t.completed).length} completadas` },
                         { label: 'Eventos Hoy', value: events.filter(e => e.start.startsWith(new Date().toISOString().split('T')[0])).length, icon: Calendar, color: 'text-violet-500', bg: 'bg-violet-500/10', sub: 'en agenda' },
                         { label: 'Prioridad Alta', value: tasks.filter(t=>!t.completed && t.priority==='high').length, icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10', sub: 'urgentes' },
                       ].map(kpi => (
                         <div key={kpi.label} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/60 dark:border-white/5 shadow-sm">
                           <div className={`w-9 h-9 ${kpi.bg} rounded-xl flex items-center justify-center mb-3`}>
                             <kpi.icon size={18} className={kpi.color} />
                           </div>
                           <div className="text-2xl font-black text-slate-800 dark:text-white">{kpi.value}</div>
                           <div className="text-[10px] font-bold text-slate-500 mt-0.5">{kpi.label}</div>
                           <div className="text-[10px] text-slate-400">{kpi.sub}</div>
                         </div>
                       ))}
                     </div>

                     {/* TODAY'S FOCUS + UPCOMING EVENTS */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                       {/* Today's top 3 tasks */}
                       <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm p-5">
                         <div className="flex items-center justify-between mb-4">
                           <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                             <Target size={13} className="text-amber-500" /> Foco del Día
                           </h4>
                           <span className="text-[10px] bg-amber-500/10 text-amber-500 font-bold px-2 py-0.5 rounded-full">{tasks.filter(t=>!t.completed && t.priority==='high').length} urgentes</span>
                         </div>
                         <div className="space-y-2">
                           {tasks.filter(t => !t.completed).sort((a,b) => (a.priority==='high'?0:a.priority==='medium'?1:2) - (b.priority==='high'?0:b.priority==='medium'?1:2)).slice(0,5).length > 0 ? (
                             tasks.filter(t => !t.completed).sort((a,b) => (a.priority==='high'?0:a.priority==='medium'?1:2) - (b.priority==='high'?0:b.priority==='medium'?1:2)).slice(0,5).map(task => (
                               <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                 <button onClick={() => onToggleTask(task.id)} className="shrink-0">
                                   <Circle size={16} className={`transition-colors ${task.priority==='high' ? 'text-red-400 hover:text-red-600' : task.priority==='medium' ? 'text-amber-400 hover:text-amber-600' : 'text-slate-300 hover:text-slate-500'}`} />
                                 </button>
                                 <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex-1 truncate">{task.title}</span>
                                 <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-lg ${task.priority==='high' ? 'bg-red-100 text-red-600 dark:bg-red-500/20' : task.priority==='medium' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                                   {task.priority==='high' ? '🔴' : task.priority==='medium' ? '🟡' : '🟢'}
                                 </span>
                               </div>
                             ))
                           ) : (
                             <div className="text-center py-6">
                               <CheckCircle2 size={24} className="mx-auto text-emerald-400 mb-2" />
                               <p className="text-xs font-bold text-slate-400">¡Sin tareas urgentes!</p>
                             </div>
                           )}
                         </div>
                       </div>

                       {/* Next 5 events */}
                       <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm p-5">
                         <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                           <Calendar size={13} className="text-indigo-500" /> Próximos Eventos
                         </h4>
                         <div className="space-y-2">
                           {events.filter(e => e.start >= new Date().toISOString().split('T')[0]).sort((a,b) => a.start.localeCompare(b.start)).slice(0,5).length > 0 ? (
                             events.filter(e => e.start >= new Date().toISOString().split('T')[0]).sort((a,b) => a.start.localeCompare(b.start)).slice(0,5).map(ev => {
                               const evDate = new Date(ev.start.includes('T') ? ev.start : ev.start + 'T12:00:00');
                               const isToday = ev.start.startsWith(new Date().toISOString().split('T')[0]);
                               return (
                                 <div key={ev.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                   <div className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center text-[9px] font-black shrink-0 ${isToday ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                                     <span>{evDate.toLocaleDateString('es-ES', { day: 'numeric' })}</span>
                                     <span className="uppercase">{evDate.toLocaleDateString('es-ES', { month: 'short' })}</span>
                                   </div>
                                   <div className="flex-1 min-w-0">
                                     <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{ev.title}</p>
                                     <p className="text-[10px] text-slate-400">{isToday ? 'Hoy' : evDate.toLocaleDateString('es-ES', { weekday: 'short' })} {ev.start.includes('T') ? ev.start.split('T')[1].substring(0,5) : ''}</p>
                                   </div>
                                   {isToday && <span className="text-[10px] bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold px-1.5 rounded-lg shrink-0">HOY</span>}
                                 </div>
                               );
                             })
                           ) : (
                             <div className="text-center py-6">
                               <Calendar size={24} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                               <p className="text-xs font-bold text-slate-400">Sin eventos próximos</p>
                             </div>
                           )}
                         </div>
                       </div>
                     </div>

                     {/* WEEKLY AGENDA - COMPACT */}
                     <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 overflow-hidden">
                       <div className="flex items-center gap-3 mb-4">
                         <Calendar size={16} className="text-indigo-400" />
                         <h4 className="text-xs font-black text-white uppercase tracking-widest">Agenda Semanal</h4>
                       </div>
                       <div className="grid grid-cols-7 gap-1 md:gap-2 overflow-x-auto">
                         {weekDays.map((day, i) => {
                           const isToday = day.dateStr === new Date().toISOString().split('T')[0];
                           return (
                             <div key={day.dateStr} className={`flex flex-col items-center p-1 md:p-2 rounded-lg md:rounded-xl transition-all min-w-[40px] ${isToday ? 'bg-indigo-600 text-white' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'}`}>
                               <span className="text-[8px] md:text-[9px] font-black uppercase">{day.dayName}</span>
                               <span className={`text-sm md:text-lg font-black ${isToday ? 'text-white' : 'text-slate-300'}`}>{day.dayNumber}</span>
                               {day.items.length > 0 ? (
                                 <div className="mt-1 space-y-0.5 w-full">
                                   {day.items.slice(0,2).map((item: any) => (
                                     <div key={item.id} className={`text-[8px] font-bold truncate px-1 py-0.5 rounded ${isToday ? 'bg-white/20' : 'bg-slate-700'}`}>
                                       {item.title}
                                     </div>
                                   ))}
                                   {day.items.length > 2 && <div className="text-[8px] text-slate-400 text-center">+{day.items.length-2}</div>}
                                 </div>
                               ) : (
                                 <div className="mt-1 text-[8px] text-slate-600">libre</div>
                               )}
                             </div>
                           );
                         })}
                       </div>
                     </div>

                     {/* CHARTS ROW */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm h-[260px]">
                         <h4 className="text-xs font-black text-slate-500 mb-3 uppercase tracking-widest">Gastos por Categoría</h4>
                         {pieData.length > 0 ? (
                           <ResponsiveContainer width="100%" height="90%">
                             <BarChart data={pieData} layout="vertical" margin={{ left: 8 }}>
                               <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                               <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `€${v}`} />
                               <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={70} />
                               <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} formatter={(v: number) => [`€${v}`, 'Gasto']} />
                               <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16} />
                             </BarChart>
                           </ResponsiveContainer>
                         ) : (
                           <div className="flex items-center justify-center h-[200px] text-slate-300 dark:text-slate-700 text-xs">Sin datos de gastos</div>
                         )}
                       </div>

                       <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm h-[260px]">
                         <h4 className="text-xs font-black text-slate-500 mb-3 uppercase tracking-widest">Distribución Gastos</h4>
                         {pieData.length > 0 ? (
                           <ResponsiveContainer width="100%" height="90%">
                             <PieChart>
                               <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                                 {pieData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                               </Pie>
                               <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                               <Legend verticalAlign="bottom" height={30} iconType="circle" iconSize={8} />
                             </PieChart>
                           </ResponsiveContainer>
                         ) : (
                           <div className="flex items-center justify-center h-[200px] text-slate-300 dark:text-slate-700 text-xs">Sin datos de gastos</div>
                         )}
                       </div>
                     </div>
                  </div>
               )}

                              {/* Tasks Tab */}
               {activeTab === 'tasks' && (
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm min-h-[400px]">
                     <h4 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2"><CheckSquare size={20} className="text-indigo-500" /> Gestión de Tareas</h4>

                     <form onSubmit={handleQuickAddTask} className="flex flex-col gap-4 mb-6">
                        <div className="flex gap-2">
                           <input
                              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold w-full"
                              placeholder="Nueva tarea..."
                              value={newTaskTitle}
                              onChange={e => setNewTaskTitle(e.target.value)}
                           />
                           <button type="submit" className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-all shrink-0"><Plus size={20} /></button>
                        </div>
                        {partnership && (
                           <div className="flex items-center gap-2 px-2">
                              <label className="relative inline-flex items-center cursor-pointer">
                                 <input type="checkbox" className="sr-only peer" checked={isSharedTask} onChange={e => setIsSharedTask(e.target.checked)} />
                                 <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-pink-500"></div>
                                 <span className="ml-2 text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <Users size={12} /> Compartir con Partner
                                 </span>
                              </label>
                           </div>
                        )}
                     </form>

                     <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        {tasks.map(task => (
                           <div key={task.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 group hover:border-indigo-200 transition-all">
                              <div className="flex items-center gap-3">
                                 <button onClick={() => onToggleTask(task.id)} className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${task.completed ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 text-transparent'}`}>
                                    <Plus size={12} className={task.completed ? '' : 'hidden'} />
                                 </button>
                                 <span className={`text-sm font-bold ${task.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{task.title}</span>
                              </div>
                              <button onClick={() => onDeleteTask(task.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {/* Master Entry Tab */}
               {activeTab === 'actions' && (
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm min-h-[400px]">
                     <header className="mb-8">
                        <h4 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2"><Plus size={20} className="text-indigo-500" /> Entrada Maestra Sincronizada</h4>
                        <p className="text-xs text-slate-400 font-medium">Añade cualquier elemento a tu sistema NASH instantáneamente.</p>
                     </header>

                     <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                           { id: 'task', label: 'Tarea', icon: CheckSquare, color: 'text-blue-500', bg: 'bg-blue-50' },
                           { id: 'expense', label: 'Gasto', icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                           { id: 'goal', label: 'Objetivo', icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-50' },
                           { id: 'idea', label: 'Idea', icon: FileText, color: 'text-purple-500', bg: 'bg-purple-50' },
                           { id: 'shopping', label: 'Compra', icon: Clock, color: 'text-rose-500', bg: 'bg-rose-50' },
                           { id: 'event', label: 'Evento', icon: Calendar, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                        ].map(action => (
                           <button
                              key={action.id}
                              onClick={() => setShowQuickAdd(action.id)}
                              className={`p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center gap-3 transition-all hover:shadow-xl hover:scale-[1.02] active:scale-95 group ${showQuickAdd === action.id ? 'ring-2 ring-indigo-500 bg-slate-50' : 'bg-white dark:bg-slate-900'}`}
                           >
                              <div className={`p-4 ${action.bg} rounded-2xl ${action.color} group-hover:scale-110 transition-transform`}>
                                 <action.icon size={28} />
                              </div>
                              <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">{action.label}</span>
                           </button>
                        ))}
                     </div>

                     {showQuickAdd && (
                        <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-200">
                           <div className="flex justify-between items-center mb-6">
                              <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Nueva Entrada: {showQuickAdd}</h5>
                              <button onClick={() => setShowQuickAdd(null)} className="text-slate-400 hover:text-slate-600"><Trash2 size={16} /></button>
                           </div>

                           <div className="space-y-4">
                              {showQuickAdd === 'task' && (
                                 <form onSubmit={handleQuickAddTask} className="flex flex-col gap-4">
                                    <div className="flex gap-2">
                                       <input autoFocus className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm" placeholder="Título de la tarea..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} />
                                       <button type="submit" className="bg-indigo-600 text-white px-6 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-indigo-700">Añadir</button>
                                    </div>
                                    {partnership && (
                                       <div className="flex items-center gap-2 px-2">
                                          <label className="relative inline-flex items-center cursor-pointer">
                                             <input type="checkbox" className="sr-only peer" checked={isSharedTask} onChange={e => setIsSharedTask(e.target.checked)} />
                                             <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-pink-500"></div>
                                             <span className="ml-2 text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                <Users size={12} /> Compartir con Partner
                                             </span>
                                          </label>
                                       </div>
                                    )}
                                 </form>
                              )}

                              {showQuickAdd === 'expense' && (
                                 <form onSubmit={handleQuickAddExpense} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <input className="bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm" placeholder="Dónde/Qué" value={newExpense.vendor} onChange={e => setNewExpense({ ...newExpense, vendor: e.target.value })} />
                                    <input type="number" className="bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm" placeholder="Cantidad (€)" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} />
                                    <button type="submit" className="bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all">Registrar</button>
                                    <input type="date" className="bg-white border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm col-span-full" value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} />
                                 </form>
                              )}

                              {showQuickAdd !== 'task' && showQuickAdd !== 'expense' && (
                                 <div className="p-8 text-center text-slate-400 italic text-sm">
                                    Interface de entrada para {showQuickAdd} próximamente.
                                 </div>
                              )}
                           </div>
                        </div>
                     )}
                  </div>
               )}
            </div>

            {/* Sidebar / Calendar */}
            <div className="lg:col-span-4 space-y-6">
               {/* Google Calendar Embed */}
               <div className="bg-white dark:bg-slate-900 p-2 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm h-[300px] md:h-[400px] overflow-hidden">
                  {/* Mini Calendar Widget - Interactive */}
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm h-auto relative overflow-hidden group">
                     {/* Decorative Background Elements */}
                     <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-[4rem] -z-0"></div>

                     {/* Calendar Header */}
                     <div className="flex justify-between items-center mb-6 relative z-10">
                        <div>
                           <h4 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
                              {new Date().toLocaleString('es-ES', { month: 'long' }).charAt(0).toUpperCase() + new Date().toLocaleString('es-ES', { month: 'long' }).slice(1)}
                           </h4>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date().getFullYear()}</p>
                        </div>
                        <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl gap-1">
                           <button className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-all"><ChevronLeft size={16} /></button>
                           <button className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-all"><ChevronRight size={16} /></button>
                        </div>
                     </div>

                     {/* Calendar Grid */}
                     <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(d => (
                           <div key={d} className="text-[10px] font-black text-slate-300 uppercase py-2">{d}</div>
                        ))}
                     </div>

                     <div className="grid grid-cols-7 gap-2 text-center relative z-10">
                        {(() => {
                           const today = new Date();
                           const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                           const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
                           const blanks = Array(firstDay).fill(null);
                           const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

                           return [
                              ...blanks.map((_, i) => <div key={`blank-${i}`} />),
                              ...days.map(day => {
                                 const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                 const isToday = day === today.getDate();
                                 // Check for events/guardias
                                 const dayEvents = events.filter(e => e.start.startsWith(dateStr));
                                 const hasGuardia = dayEvents.some(e => e.title.toLowerCase().includes('guardia'));

                                 return (
                                    <button
                                       key={day}
                                       className={`
                                       h-10 w-10 mx-auto rounded-xl flex flex-col items-center justify-center relative transition-all
                                       ${isToday ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}
                                       ${hasGuardia ? 'ring-2 ring-orange-400 bg-orange-50 dark:bg-orange-900/20' : ''}
                                    `}
                                    >
                                       <span className={`text-xs font-bold z-10 ${hasGuardia && !isToday ? 'text-orange-600 dark:text-orange-400' : ''}`}>{day}</span>

                                       {/* Event Dots */}
                                       <div className="flex gap-0.5 mt-0.5">
                                          {dayEvents.slice(0, 3).map((_, i) => (
                                             <div key={i} className={`w-1 h-1 rounded-full ${hasGuardia ? 'bg-orange-500' : isToday ? 'bg-slate-500' : 'bg-indigo-400'}`} />
                                          ))}
                                       </div>
                                    </button>
                                 );
                              })
                           ];
                        })()}
                     </div>

                     {/* Legend */}
                     <div className="mt-8 flex items-center justify-center gap-6">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                           <span className="text-[10px] font-bold text-slate-400 uppercase">Guardia</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                           <span className="text-[10px] font-bold text-slate-400 uppercase">Evento</span>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Recent Files Widget */}
               <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <h4 className="text-xs font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-widest">
                     <FolderOpen className="text-blue-500" size={16} /> Archivos Recientes
                  </h4>
                  <div className="space-y-3">
                     {globalContext?.files && globalContext.files.length > 0 ? (
                        globalContext.files.slice(-4).reverse().map((file: any) => (
                           <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                              <div className="flex items-center gap-3 overflow-hidden">
                                 <FileText size={14} className="text-blue-500 shrink-0" />
                                 <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{file.name}</p>
                              </div>
                              <span className="text-[9px] font-black bg-white dark:bg-slate-900 px-2 py-0.5 rounded text-slate-400 uppercase">{file.category}</span>
                           </div>
                        ))
                     ) : (
                        <p className="text-center text-slate-400 text-xs font-bold py-4">Sin archivos</p>
                     )}
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default Dashboard;
