import React, { useState, useMemo } from 'react';
import {
   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Expense, Task, CalendarEvent, Partnership } from '../types';
import {
   TrendingUp, CheckSquare, CreditCard, Plus, Trash2, FolderOpen,
   FileText, BarChart3, Calendar, Clock, MapPin, AlertCircle, ChevronLeft, ChevronRight,
   UploadCloud, FileUp, Loader2, Scan, Users, Star, Flame, Shield, Target, CheckCircle2, Circle
} from 'lucide-react';
import { analyzeFinancialDocument } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';

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
                  <>
                     {/* KPI Cards */}
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Gasto Total</p>
                           <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">€{totalSpent.toLocaleString()}</h3>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tareas Pendientes</p>
                           <h3 className="text-2xl md:text-3xl font-black text-indigo-600">{pendingTasks.length}</h3>
                        </div>
                     </div>

                     {/* Weekly Agenda View */}
                     {/* Weekly Agenda View - Redesigned */}
                     <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-800 relative">
                        {/* Header */}
                        <div className="flex items-center gap-4 mb-8 relative z-10">
                           <Calendar size={24} className="text-indigo-400" />
                           <h4 className="text-lg font-black text-white uppercase tracking-widest">
                              Agenda Semanal Sincronizada
                           </h4>
                        </div>

                        {/* Columns Container */}
                        <div className="grid grid-cols-5 gap-4 h-[450px]">
                           {weekDays.slice(0, 5).map((day, i) => {
                              const isToday = i === 0; // Assumption based on logic
                              const hasItems = day.items.length > 0;

                              return (
                                 <div
                                    key={day.dateStr}
                                    className={`relative flex flex-col items-center py-6 px-2 rounded-[2.5rem] transition-all duration-300 group
                                       ${isToday
                                          ? 'bg-gradient-to-b from-indigo-900/40 to-slate-900 border border-indigo-500/50 shadow-lg shadow-indigo-900/20'
                                          : 'bg-slate-800/30 border border-slate-800 hover:bg-slate-800/50'
                                       }
                                    `}
                                 >
                                    {/* Date Header */}
                                    <div className="text-center mb-6 z-10">
                                       <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${isToday ? 'text-indigo-300' : 'text-slate-500'}`}>
                                          {day.dayName.toUpperCase()}
                                       </span>
                                       <span className={`text-2xl font-black ${isToday ? 'text-white scale-110 inline-block' : 'text-slate-400'}`}>
                                          {day.dayNumber}
                                       </span>
                                    </div>

                                    {/* Items Container (Vertical Stack) */}
                                    <div className="flex-1 w-full flex flex-col items-center gap-2 overflow-y-auto no-scrollbar pb-8 px-2">
                                       {hasItems ? (
                                          day.items.map((item: any) => {
                                             const isEvent = !!item.start;
                                             // Determine Icon
                                             let Icon = isEvent ? Clock : CheckSquare;
                                             if (isEvent && (item.title.toLowerCase().includes('vuelo') || item.title.toLowerCase().includes('viaje'))) Icon = TrendingUp;

                                             return (
                                                <div
                                                   key={item.id}
                                                   className={`w-full p-2 rounded-xl flex items-center gap-2 border transition-all cursor-pointer group/item
                                                      ${isEvent
                                                         ? 'bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-600 hover:border-indigo-600'
                                                         : 'bg-slate-700/30 border-slate-700 hover:bg-emerald-600 hover:border-emerald-600'
                                                      }
                                                   `}
                                                   title={item.title}
                                                >
                                                   <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isEvent ? 'bg-indigo-500/20 text-indigo-300 group-hover/item:bg-white/20 group-hover/item:text-white' : 'bg-slate-600/30 text-slate-400 group-hover/item:bg-white/20 group-hover/item:text-white'}`}>
                                                      <Icon size={14} strokeWidth={2.5} />
                                                   </div>
                                                   <div className="flex-1 overflow-hidden">
                                                      <p className={`text-[10px] font-black uppercase tracking-wider truncate transition-colors ${isEvent ? 'text-indigo-200 group-hover/item:text-white' : 'text-slate-300 group-hover/item:text-white'}`}>
                                                         {item.title}
                                                      </p>
                                                      {isEvent && item.start.includes('T') && (
                                                         <p className="text-[9px] font-bold text-slate-500 group-hover/item:text-indigo-100 flex items-center gap-1">
                                                            <span>{item.start.split('T')[1].substring(0, 5)}</span>
                                                         </p>
                                                      )}
                                                   </div>
                                                </div>
                                             );
                                          })
                                       ) : (
                                          <div className="flex-1 flex flex-col justify-end pb-4 opacity-30">
                                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest -rotate-90 whitespace-nowrap">
                                                Libre
                                             </span>
                                          </div>
                                       )}
                                    </div>

                                    {/* Scroll Indicator (if many items, simplified visual cue) */}
                                    {day.items.length > 5 && (
                                       <div className="absolute bottom-2 w-1 h-1 bg-slate-600 rounded-full animate-pulse" />
                                    )}
                                 </div>
                              );
                           })}
                        </div>
                     </div>

                     {/* VIP Tasks Quick Panel */}
                     <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/5 rounded-[2rem] border border-amber-200 dark:border-amber-500/20 p-6">
                        <div className="flex items-center justify-between mb-4">
                           <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-amber-500/25">
                                 <Star size={16} className="text-white fill-white" />
                              </div>
                              <div>
                                 <h4 className="text-sm font-black text-slate-800 dark:text-white">Tareas VIP del día</h4>
                                 <p className="text-[10px] text-slate-500 dark:text-slate-400">Prioridades críticas</p>
                              </div>
                           </div>
                           <span className="bg-amber-500 text-white text-xs font-black px-2.5 py-1 rounded-xl shadow-sm">
                              {tasks.filter(t => t.priority === 'high' && !t.completed).length} pendientes
                           </span>
                        </div>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                           {tasks.filter(t => !t.completed && (t.priority === 'high' || t.priority === 'medium')).slice(0, 5).length > 0 ? (
                              tasks.filter(t => !t.completed && (t.priority === 'high' || t.priority === 'medium')).slice(0, 5).map(task => (
                                 <div key={task.id} className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl p-3 border border-amber-100 dark:border-amber-500/10">
                                    <button onClick={() => onToggleTask(task.id)} className="shrink-0">
                                       <Circle size={18} className="text-amber-400 hover:text-amber-600 transition-colors" />
                                    </button>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 flex-1 truncate">{task.title}</span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${task.priority === 'high' ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20' : 'bg-amber-100 text-amber-600 dark:bg-amber-500/20'}`}>
                                       {task.priority === 'high' ? 'Alta' : 'Media'}
                                    </span>
                                 </div>
                              ))
                           ) : (
                              <div className="flex items-center justify-center py-6 gap-2 text-amber-400">
                                 <CheckCircle2 size={20} />
                                 <span className="text-sm font-bold">¡Todo al día! Sin tareas urgentes</span>
                              </div>
                           )}
                        </div>
                        {/* Próximas guardias */}
                        {events.filter(e => e.type === 'work' && e.start >= new Date().toISOString().split('T')[0]).slice(0, 3).length > 0 && (
                           <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-500/20">
                              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2 flex items-center gap-1">
                                 <Shield size={10} /> Próximas guardias
                              </p>
                              <div className="flex gap-2 flex-wrap">
                                 {events.filter(e => e.type === 'work' && e.start >= new Date().toISOString().split('T')[0]).slice(0, 3).map(ev => (
                                    <span key={ev.id} className="text-xs font-bold bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-3 py-1 rounded-xl">
                                       🔴 {new Date(ev.start + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} — {ev.title}
                                    </span>
                                 ))}
                              </div>
                           </div>
                        )}
                     </div>

                     {/* Charts */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm h-[300px]">
                           <h4 className="text-xs font-black text-slate-800 dark:text-white mb-4 uppercase tracking-widest">Distribución (Pie)</h4>
                           <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                 <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    isAnimationActive={true}
                                    animationBegin={0}
                                    animationDuration={1500}
                                    animationEasing="ease-out"
                                 >
                                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                 </Pie>
                                 <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                 <Legend verticalAlign="bottom" height={36} iconType="circle" />
                              </PieChart>
                           </ResponsiveContainer>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm h-[300px]">
                           <h4 className="text-xs font-black text-slate-800 dark:text-white mb-4 uppercase tracking-widest">Gastos por Categoría</h4>
                           <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={pieData}>
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                 <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} />
                                 <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(value) => `€${value}`} />
                                 <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                    formatter={(value: number) => [`€${value}`, 'Gasto']}
                                 />
                                 <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={30} />
                              </BarChart>
                           </ResponsiveContainer>
                        </div>
                     </div>
                  </>
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
