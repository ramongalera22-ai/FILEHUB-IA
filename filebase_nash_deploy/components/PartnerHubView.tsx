
import React, { useState, useEffect, useMemo } from 'react';
import { Partnership, SharedHubActivity, SharedExpense, Task, CalendarEvent } from '../types';
import {
    Users,
    Heart,
    Plus,
    Send,
    Calendar,
    CheckSquare,
    Receipt,
    Plane,
    Sparkles,
    Loader2,
    Trash2,
    Link2,
    Zap,
    Clock,
    LayoutDashboard
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface PartnerHubViewProps {
    partnership: Partnership | null;
    sharedExpenses: SharedExpense[];
    currentUser: string | null;
    onInvitePartner: (email: string) => void;
    onAddSharedTask: (title: string) => void;
}

const PartnerHubView: React.FC<PartnerHubViewProps> = ({
    partnership,
    sharedExpenses,
    currentUser,
    onInvitePartner,
    onAddSharedTask
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'calendar' | 'finance'>('dashboard');
    const [inviteEmail, setInviteEmail] = useState('');
    const [activities, setActivities] = useState<SharedHubActivity[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sharedTasks, setSharedTasks] = useState<Task[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');

    // Fetch initial data and setup subscriptions
    useEffect(() => {
        if (!partnership) return;

        const fetchData = async () => {
            setIsLoading(true);
            const [actData, taskData] = await Promise.all([
                supabase.from('shared_hub_activities').select('*').eq('partnership_id', partnership.id).order('created_at', { ascending: false }).limit(20),
                supabase.from('tasks').select('*').eq('partnership_id', partnership.id) // Assuming tasks can have partnership_id
            ]);

            if (actData.data) setActivities(actData.data);
            if (taskData.data) setSharedTasks(taskData.data);
            setIsLoading(false);
        };

        fetchData();

        // Realtime Subscriptions
        const sub = supabase.channel('shared-hub')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_hub_activities', filter: `partnership_id=eq.${partnership.id}` },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setActivities(prev => [payload.new as SharedHubActivity, ...prev]);
                    }
                })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `partnership_id=eq.${partnership.id}` },
                (payload) => {
                    // Handle task updates
                })
            .subscribe();

        return () => { sub.unsubscribe(); };
    }, [partnership]);

    const handleAddTask = async () => {
        if (!newTaskTitle || !partnership) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const newTask = {
            id: crypto.randomUUID(),
            title: newTaskTitle,
            completed: false,
            category: 'personal',
            priority: 'medium',
            partnership_id: partnership.id,
            user_id: user.id
        };

        const { error } = await supabase.from('tasks').insert(newTask);
        if (!error) {
            setSharedTasks([newTask as any, ...sharedTasks]);
            setNewTaskTitle('');

            // Log activity
            await supabase.from('shared_hub_activities').insert({
                partnership_id: partnership.id,
                user_id: user.id,
                type: 'task',
                action: 'created',
                content: { title: newTaskTitle }
            });
        }
    };

    const toggleTask = async (id: string) => {
        const task = sharedTasks.find(t => t.id === id);
        if (!task) return;
        const newStatus = !task.completed;

        setSharedTasks(sharedTasks.map(t => t.id === id ? { ...t, completed: newStatus } : t));
        await supabase.from('tasks').update({ completed: newStatus }).eq('id', id);
    };

    const netBalance = useMemo(() => {
        let balance = 0;
        sharedExpenses.forEach(exp => {
            const perPerson = exp.amount / 2;
            if (exp.paidBy === 'me') balance += perPerson;
            else balance -= perPerson;
        });
        return balance;
    }, [sharedExpenses]);

    if (!partnership) {
        return (
            <div className="max-w-2xl mx-auto py-20 text-center space-y-8 animate-in fade-in duration-700">
                <div className="w-24 h-24 bg-pink-100 dark:bg-pink-900/30 text-pink-500 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-xl shadow-pink-100 dark:shadow-none">
                    <Heart size={48} className="fill-current" />
                </div>
                <div>
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Tu Dashboard Conjunto</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-bold mt-4 px-10">
                        Crea un hub compartido para gestionar vuestras finanzas, tareas de casa y próximos viajes juntos.
                        Sincronización total en tiempo real.
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-left ml-2">Email de tu Pareja</label>
                        <div className="relative group">
                            <Users className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-pink-500 transition-colors" size={20} />
                            <input
                                type="email"
                                placeholder="amor@gmail.com"
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl pl-16 pr-8 py-5 focus:outline-none focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 font-bold"
                                value={inviteEmail}
                                onChange={e => setInviteEmail(e.target.value)}
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => onInvitePartner(inviteEmail)}
                        className="w-full py-5 bg-pink-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-pink-500/30 hover:bg-pink-600 transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                        <Send size={18} /> Enviar Invitación
                    </button>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asegúrate de que tu pareja tenga una cuenta creada</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-indigo-200 dark:shadow-none">
                        <Heart size={32} className="fill-current" />
                    </div>
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Dashboard Hub</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-tight">Sincronización en vivo activada</span>
                        </div>
                    </div>
                </div>

                <nav className="flex p-2 bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm border border-slate-100 dark:border-slate-800 gap-1 overflow-x-auto w-full md:w-auto">
                    {[
                        { id: 'dashboard', label: 'Feed', icon: LayoutDashboard },
                        { id: 'tasks', label: 'WorkHub', icon: CheckSquare },
                        { id: 'calendar', label: 'Viajes', icon: Plane },
                        { id: 'finance', label: 'Gastos', icon: Receipt }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                                ? 'bg-gradient-to-r from-pink-500 to-indigo-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </header>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10">

                {/* Left Column / Feed (Desktop) */}
                <div className={`col-span-12 lg:col-span-8 space-y-8 ${activeTab !== 'dashboard' ? 'hidden lg:block' : ''}`}>
                    {activeTab === 'dashboard' && (
                        <section className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                    <Clock size={24} className="text-indigo-500" /> Actividad Reciente
                                </h3>
                                <span className="text-[10px] font-black p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 uppercase tracking-widest">Realtime Feed</span>
                            </div>
                            <div className="divide-y divide-slate-50 dark:divide-slate-800 p-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                                {isLoading ? (
                                    <div className="p-20 text-center"><Loader2 size={32} className="animate-spin text-indigo-500 mx-auto" /></div>
                                ) : activities.length > 0 ? (
                                    activities.map(activity => (
                                        <div key={activity.id} className="p-8 flex items-start gap-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all rounded-[2rem]">
                                            <div className={`p-4 rounded-2xl shrink-0 ${activity.type === 'expense' ? 'bg-emerald-100 text-emerald-600' :
                                                activity.type === 'task' ? 'bg-blue-100 text-blue-600' :
                                                    activity.type === 'calendar' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {activity.type === 'expense' ? <Receipt size={20} /> :
                                                    activity.type === 'task' ? <CheckSquare size={20} /> :
                                                        activity.type === 'calendar' ? <Calendar size={20} /> : <Zap size={20} />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-widest">
                                                    {activity.user_id === currentUser ? 'Tú ' : 'Tu pareja '}
                                                    {activity.action === 'created' ? 'creó' : activity.action === 'updated' ? 'actualizó' : 'eliminó'} un {activity.type}
                                                </p>
                                                <h4 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                                                    {activity.content.title || activity.content.vendor || 'Elemento sin nombre'}
                                                </h4>
                                                <div className="mt-3 flex items-center gap-2 text-slate-400">
                                                    <Clock size={12} />
                                                    <span className="text-[10px] font-bold">{new Date(activity.created_at).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No hay actividad reciente</div>
                                )}
                            </div>
                        </section>
                    )}

                    {activeTab === 'tasks' && (
                        <section className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                            <div className="p-10 border-b border-slate-100 dark:border-slate-800 bg-slate-50/20">
                                <div className="flex gap-4">
                                    <input
                                        type="text"
                                        placeholder="Nueva tarea compartida..."
                                        className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-8 py-5 focus:outline-none focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 font-bold"
                                        value={newTaskTitle}
                                        onChange={e => setNewTaskTitle(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                                    />
                                    <button
                                        onClick={handleAddTask}
                                        className="bg-indigo-600 text-white px-10 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all active:scale-95"
                                    >
                                        <Plus size={28} />
                                    </button>
                                </div>
                            </div>
                            <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                {sharedTasks.map(task => (
                                    <div key={task.id} className="p-8 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                                        <div className="flex items-center gap-6">
                                            <button onClick={() => toggleTask(task.id)} className={`transition-all ${task.completed ? 'text-emerald-500' : 'text-slate-200 dark:text-slate-600'}`}>
                                                {task.completed ? <CheckSquare size={32} /> : <div className="w-8 h-8 rounded-xl border-4 border-current"></div>}
                                            </button>
                                            <h4 className={`text-xl font-black text-slate-900 dark:text-white ${task.completed ? 'line-through opacity-40' : ''}`}>{task.title}</h4>
                                        </div>
                                        <button className="text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={20} /></button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {activeTab === 'calendar' && (
                        <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm text-center py-32">
                            <Plane size={64} className="text-pink-100 mx-auto mb-6" />
                            <h3 className="text-2xl font-black mb-2">Viajes en Pareja</h3>
                            <p className="text-slate-500 dark:text-slate-400 font-bold max-w-sm mx-auto">Vuestro próximo destino os espera. Planificad escapadas y guardad vuestros recuerdos.</p>
                            <button className="mt-8 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all">Crear Expedición Conjunta</button>
                        </div>
                    )}

                    {activeTab === 'finance' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tu Balance</p>
                                    <p className={`text-3xl font-black ${netBalance > 0 ? 'text-emerald-500' : netBalance < 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                                        {netBalance === 0 ? 'Saldado' : `€${Math.abs(netBalance).toFixed(2)}`}
                                    </p>
                                    <span className="text-[10px] font-bold text-slate-400">{netBalance > 0 ? 'Te deben' : netBalance < 0 ? 'Debes' : 'Todo OK'}</span>
                                </div>
                                <div className="bg-slate-900 dark:bg-slate-950 p-8 rounded-[2.5rem] border border-white/5 shadow-xl">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Gasto Mensual</p>
                                    <p className="text-3xl font-black text-white">€1.450</p>
                                    <span className="text-[10px] font-bold text-slate-500">Acumulado compartido</span>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm text-center">
                                <p className="text-slate-400 font-bold">Resumen de gastos en tiempo real integrado de Cuentas Compartidas</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column / Quick Stats (Desktop) */}
                <div className="col-span-12 lg:col-span-4 space-y-8">
                    <section className="bg-gradient-to-br from-pink-500 to-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden">
                        <Sparkles className="absolute top-0 right-0 p-4 opacity-30 animate-pulse" size={60} />
                        <h4 className="text-lg font-black mb-6 uppercase tracking-tight">Status Pareja</h4>
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0"><CheckSquare size={20} /></div>
                                <div>
                                    <p className="text-3xl font-black">12</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Tareas Completadas</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0"><Plane size={20} /></div>
                                <div>
                                    <p className="text-3xl font-black">1</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Viaje Planeado</p>
                                </div>
                            </div>
                        </div>
                        <button className="mt-8 w-full py-4 bg-white text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">Chat IA de Pareja</button>
                    </section>

                    <section className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 px-2">Info Partners</h4>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-indigo-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-indigo-600 font-black">T</div>
                                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Tú</span>
                                </div>
                                <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black uppercase">Online</div>
                            </div>
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-pink-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-pink-600 font-black">P</div>
                                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Pareja</span>
                                </div>
                                <div className="px-3 py-1 bg-slate-50 text-slate-400 rounded-full text-[8px] font-black uppercase italic">Invited</div>
                            </div>
                            <div className="pt-4 border-t border-slate-50 dark:border-slate-800">
                                <button className="w-full py-3 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all">Disolver Partnership</button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PartnerHubView;
