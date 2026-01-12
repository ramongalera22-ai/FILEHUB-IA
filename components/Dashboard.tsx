
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Expense, Task, CalendarEvent } from '../types';
import { 
  TrendingUp, CheckSquare, CreditCard, Plus, Trash2, FolderOpen, 
  FileText, BarChart3, Calendar, Clock, MapPin, AlertCircle
} from 'lucide-react';

interface DashboardProps {
  expenses: Expense[];
  tasks: Task[];
  events: CalendarEvent[];
  globalContext?: any;
  onAddTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onToggleTask: (id: string) => void;
  onAddExpense?: (expense: Expense) => void;
  onDeleteExpense?: (id: string) => void;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

const Dashboard: React.FC<DashboardProps> = ({ 
  expenses, tasks, events, globalContext, onAddTask, onDeleteTask, onToggleTask, onAddExpense, onDeleteExpense
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'payments'>('overview');
  const [newExpense, setNewExpense] = useState({ vendor: '', amount: '', category: 'General', date: new Date().toISOString().split('T')[0] });
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // --- Calculations ---
  const totalSpent = useMemo(() => expenses.reduce((acc, curr) => acc + curr.amount, 0), [expenses]);

  const pieData = useMemo(() => {
    const data = expenses.reduce((acc: Record<string, number>, curr: Expense) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => Number(b.value) - Number(a.value))
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
    if (onAddExpense) {
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
    }
  };

  const handleQuickAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if(!newTaskTitle.trim()) return;
    onAddTask({
        id: Date.now().toString(),
        title: newTaskTitle,
        completed: false,
        category: 'personal',
        priority: 'medium',
        dueDate: new Date().toISOString().split('T')[0]
    });
    setNewTaskTitle('');
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
             { id: 'payments', label: 'Pagos', icon: CreditCard }
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                 activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
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
                <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                   <h4 className="text-sm font-black text-slate-800 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-widest">
                      <Calendar size={16} className="text-indigo-500" /> Agenda Semanal Sincronizada
                   </h4>
                   <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                      {weekDays.map((day, i) => {
                        const isToday = i === 0; // Assumption: weekDays starts from today based on logic
                        return (
                          <div key={day.dateStr} className={`p-4 rounded-2xl border transition-all min-h-[100px] md:min-h-[180px] flex flex-col ${isToday ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-100 dark:ring-indigo-900' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'}`}>
                             <div className="text-center mb-3 pb-2 border-b border-slate-200 dark:border-slate-700 flex justify-between md:block items-center">
                                <span className="text-[10px] font-black uppercase text-slate-400">{day.dayName}</span>
                                <span className={`text-lg font-black ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>{day.dayNumber}</span>
                             </div>
                             
                             <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[200px]">
                                {day.items.length === 0 && (
                                  <div className="h-full flex items-center justify-center md:py-4">
                                    <span className="text-[9px] text-slate-300 dark:text-slate-600 font-bold uppercase">Libre</span>
                                  </div>
                                )}
                                {day.items.map((item: any) => {
                                  const isEvent = !!item.start; // Distinguish between Task and Event
                                  return (
                                    <div key={item.id} className={`p-2 rounded-xl text-[9px] font-bold border shadow-sm ${
                                      isEvent 
                                        ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-800' 
                                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 border-slate-100 dark:border-slate-600'
                                    }`}>
                                       <div className="flex items-start gap-1">
                                          {isEvent ? <Clock size={10} className="mt-0.5 shrink-0" /> : <button onClick={() => onToggleTask(item.id)} className="hover:text-emerald-500"><div className="w-2.5 h-2.5 rounded border border-slate-300 mt-0.5 shrink-0" /></button>}
                                          <span className="truncate leading-tight">{item.title}</span>
                                       </div>
                                    </div>
                                  );
                                })}
                             </div>
                          </div>
                        );
                      })}
                   </div>
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
                           <XAxis dataKey="name" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} interval={0} />
                           <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={(value) => `€${value}`} />
                           <Tooltip 
                              cursor={{fill: 'transparent'}} 
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
                  <h4 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2"><CheckSquare size={20} className="text-indigo-500"/> Gestión de Tareas</h4>
                  
                  <form onSubmit={handleQuickAddTask} className="flex gap-2 mb-6">
                     <input 
                       className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold w-full"
                       placeholder="Nueva tarea..."
                       value={newTaskTitle}
                       onChange={e => setNewTaskTitle(e.target.value)}
                     />
                     <button type="submit" className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-all shrink-0"><Plus size={20}/></button>
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
                          <button onClick={() => onDeleteTask(task.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                       </div>
                     ))}
                  </div>
               </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
               <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm min-h-[400px]">
                  <h4 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2"><CreditCard size={20} className="text-indigo-500"/> Próximos Pagos</h4>
                  
                  <form onSubmit={handleQuickAddExpense} className="flex flex-col md:flex-row gap-2 mb-6 items-end">
                     <div className="flex-1 w-full">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Concepto</label>
                        <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold" value={newExpense.vendor} onChange={e => setNewExpense({...newExpense, vendor: e.target.value})} placeholder="Ej: Luz" />
                     </div>
                     <div className="w-full md:w-24">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">€</label>
                        <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} placeholder="0.00" />
                     </div>
                     <div className="w-full md:w-32">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Fecha</label>
                        <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} />
                     </div>
                     <button type="submit" className="w-full md:w-auto bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 transition-all h-[38px] flex items-center justify-center"><Plus size={18}/></button>
                  </form>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                     {nextPayments.map(exp => (
                       <div key={exp.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 group">
                          <div className="flex items-center gap-3">
                             <div className="p-2 bg-white dark:bg-slate-900 rounded-lg text-indigo-500 shadow-sm"><CreditCard size={14} /></div>
                             <div>
                                <p className="text-xs font-black text-slate-800 dark:text-white">{exp.vendor}</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase">{exp.date}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <span className="font-black text-slate-900 dark:text-white text-sm">€{exp.amount.toFixed(2)}</span>
                             {onDeleteExpense && (
                               <button onClick={() => onDeleteExpense(exp.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                             )}
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            )}
         </div>

         {/* Sidebar / Calendar */}
         <div className="lg:col-span-4 space-y-6">
            {/* Google Calendar Embed */}
            <div className="bg-white dark:bg-slate-900 p-2 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm h-[300px] md:h-[400px] overflow-hidden">
               <iframe 
                  src="https://calendar.google.com/calendar/embed?src=ramongalera22%40gmail.com&ctz=Europe%2FMadrid&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0" 
                  style={{border: 0}} 
                  width="100%" 
                  height="100%" 
                  title="Google Calendar"
                  className="rounded-[1.5rem]"
               ></iframe>
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
