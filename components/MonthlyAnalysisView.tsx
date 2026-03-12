import React, { useState, useMemo } from 'react';
import {
    PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import {
    Wallet, Banknote, Calendar, Info, TrendingDown,
    Fuel, Car, Landmark, ShoppingBag, Sparkles, BrainCircuit,
    Volume2, Loader2, MessageSquareText, CheckCircle2,
    PieChart as PieChartIcon, ArrowRight, AlertTriangle, Lightbulb,
    ShieldAlert, Activity, TrendingUp, Receipt, Coins, Plus, Trash2, Layout,
    CalendarDays, CreditCard, RefreshCw
} from 'lucide-react';

const MonthlyAnalysisView = () => {
    // --- FUENTE DE DATOS ESTATICA (Extraída de tus documentos PDF/Capturas) ---
    const liquidityData = {
        caixa: 1247.06,
        n26: 325.91,
        revolut: 5.12,
        otros: 100.00,
    };

    const totalLiquidity = useMemo(() =>
        Object.values(liquidityData).reduce((a, b) => a + b, 0),
        []);

    const monthlySalary = 2800.00;

    // 1. Suscripciones Activas (Detectadas en tus extractos de Caixa y Revolut)
    const activeSubscriptions = [
        { name: 'Google One', amount: 3.99, date: 'Día 15/26', icon: 'cloud' },
        { name: 'Amazon Prime', amount: 4.99, date: 'Día 11/17', icon: 'shopping' },
        { name: 'Apple Services', amount: 9.99, date: 'Día 17/22', icon: 'apple' },
        { name: 'OpenAI (ChatGPT)', amount: 20.81, date: 'Día 21/22', icon: 'cpu' },
        { name: 'Nabu Casa (HA)', amount: 7.50, date: 'Día 16/17', icon: 'home' },
        { name: 'Microsoft (Paypal)', amount: 2.00, date: 'Día 14/17', icon: 'laptop' },
        { name: 'Prime Video (Ad Free)', amount: 1.99, date: 'Día 07/08', icon: 'film' },
        { name: 'Obsidian App', amount: 4.25, date: 'Día 13', icon: 'edit' },
    ];

    const totalSubsMonthly = activeSubscriptions.reduce((a, b) => a + b.amount, 0);

    // 2. Gastos Base Operativos (Hasta 15 Feb)
    const baseExpenses = [
        { name: 'VW T-Cross', amount: 229.79, category: 'Vehículo', account: 'caixa', date: '28 ene', priority: 'Crítica' },
        { name: 'Préstamo PRS...627', amount: 380.28, category: 'Préstamos', account: 'caixa', date: '01 feb', priority: 'Alta' },
        { name: 'Préstamo PRS...957', amount: 411.54, category: 'Préstamos', account: 'caixa', date: '01 feb', priority: 'Alta' },
        { name: 'Préstamo PRS...004', amount: 57.95, category: 'Préstamos', account: 'caixa', date: '01 feb', priority: 'Media' },
        { name: 'Préstamo PRS...463', amount: 33.72, category: 'Préstamos', account: 'caixa', date: '01 feb', priority: 'Media' },
        { name: 'Gasolina (Previsión)', amount: 120.00, category: 'Gasolina', account: 'n26', date: 'Varias', priority: 'Baja' },
        { name: 'Klarna/Paypal Plazos', amount: 111.23, category: 'Aplazados', account: 'n26', date: 'Hasta 15 feb', priority: 'Media' },
        { name: 'Comida/Super (Previsión)', amount: 100.00, category: 'Suministros', account: 'n26', date: 'Varias', priority: 'Alta' },
    ];

    // 3. Gastos Recurrentes de Facturas (Detección en extractos)
    const recurringExpenses = [
        { name: 'Recibo Agua EMUASA', amount: 61.65, category: 'Suministros', account: 'caixa' },
        { name: 'O2 Fibra/Móvil', amount: 38.00, category: 'Suministros', account: 'caixa' },
        { name: 'PayPal Cuotas (Promedio)', amount: 150.00, category: 'Aplazados', account: 'caixa' },
        { name: 'Colegio Médicos', amount: 95.24, category: 'Profesional', account: 'caixa' },
        { name: 'Sindicato CCOO', amount: 15.70, category: 'Profesional', account: 'caixa' },
        { name: 'Cofidis Recibo', amount: 77.36, category: 'Préstamos', account: 'caixa' },
        { name: 'Seguro MyBox/Seviam', amount: 73.07, category: 'Seguros', account: 'caixa' },
    ];

    // 4. Pagos Fallidos
    const failedPayments = [
        { name: 'Deuda Unir (Klarna)', amount: 272.84, category: 'Deuda' },
        { name: 'Deuda Octopus (Acumulada)', amount: 269.77, category: 'Suministros' },
    ];

    // --- ESTADO GASTOS DINÁMICOS ---
    const [customExpenses, setCustomExpenses] = useState<{ id: number; name: string; amount: number; category: string }[]>([]);
    const [newExp, setNewExp] = useState({ name: '', amount: '', category: 'Ocio' });

    // --- CÁLCULOS INTEGRALES ---
    const totals = useMemo(() => {
        const base = baseExpenses.reduce((a, b) => a + b.amount, 0);
        const recurring = recurringExpenses.reduce((a, b) => a + b.amount, 0);
        const debt = failedPayments.reduce((a, b) => a + b.amount, 0);
        const subs = totalSubsMonthly;
        const custom = customExpenses.reduce((a, b) => a + b.amount, 0);

        // Gasto mensual real incluyendo todo (Base + Recurrentes + Suscripciones)
        const fullMonthlyOut = base + recurring + subs;

        // Total out for February specifically (approximated for example)
        const totalOutFeb = base + recurring + subs + debt + custom;

        const opRemainder = totalLiquidity - base;
        const sanRemainderToday = opRemainder - debt;

        // Disponible Real Estimado (Nómina + Liquidez - Todos los gastos y deudas)
        const finRemainder = (totalLiquidity + monthlySalary) - (fullMonthlyOut + debt + custom);

        return { base, recurring, debt, subs, custom, fullMonthlyOut, opRemainder, sanRemainderToday, finRemainder, totalOutFeb };
    }, [totalLiquidity, customExpenses, totalSubsMonthly]);

    const addCustomExpense = () => {
        if (!newExp.name || !newExp.amount) return;
        setCustomExpenses([...customExpenses, { ...newExp, amount: parseFloat(newExp.amount), id: Date.now() }]);
        setNewExp({ name: '', amount: '', category: 'Ocio' });
    };

    const removeCustomExpense = (id: number) => {
        setCustomExpenses(customExpenses.filter(e => e.id !== id));
    };

    const catColors: Record<string, string> = {
        'Préstamos': '#6366f1', 'Vehículo': '#f59e0b', 'Gasolina': '#ec4899', 'Aplazados': '#8b5cf6',
        'Suministros': '#06b6d4', 'Profesional': '#64748b', 'Seguros': '#4ade80', 'Deuda': '#f43f5e',
        'Ocio': '#f97316', 'Suscripciones': '#f472b6', 'Ingresos': '#10b981', 'Gastos': '#ef4444'
    };

    const formatCurrency = (val: number) => val.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

    return (
        <div className="bg-slate-50 p-4 md:p-8 font-sans text-slate-900 pb-24 tracking-tight rounded-[2.5rem]">
            <div className="max-w-6xl mx-auto space-y-12">

                {/* Header Principal */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div>
                        <h1 className="text-4xl font-black text-slate-800 flex items-center gap-3">
                            <Activity className="text-blue-600" size={36} /> Monitor de Salud Financiera ✨
                        </h1>
                        <p className="text-slate-500 mt-1 font-medium">Análisis consolidado con deudas, nómina y suscripciones</p>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Liquidez Total Bancaria</span>
                        <span className="text-3xl font-black text-blue-600 tracking-tighter">{formatCurrency(totalLiquidity)}</span>
                    </div>
                </header>

                {/* NIVEL 1: OPERATIVA AL 15 DE FEBRERO (GASTOS BASE) */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3"><div className="h-8 w-1 bg-blue-500 rounded-full"></div>
                        <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Operativa Regular al 15 de Febrero</h2></div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col items-center">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Balance Operativo</h3>
                            <div className="w-full h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPieChart>
                                        <Pie data={[{ name: 'Gastos Base', value: totals.base }, { name: 'Libre', value: Math.max(0, totals.opRemainder) }]} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={10} dataKey="value">
                                            <Cell fill="#ef4444" stroke="none" /><Cell fill="#10b981" stroke="none" />
                                        </Pie>
                                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-2xl font-black text-emerald-600 mt-2">{formatCurrency(totals.opRemainder)}</p>
                        </div>
                        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            <div className="w-full h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPieChart>
                                        <Pie data={[...baseExpenses.map(e => ({ name: e.name, value: e.amount })), { name: 'Disponible', value: Math.max(0, totals.opRemainder) }]} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value">
                                            {baseExpenses.map((e, i) => <Cell key={i} fill={catColors[e.category] || '#94a3b8'} stroke="none" />)}
                                            <Cell fill="#10b981" stroke="none" />
                                        </Pie>
                                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="border border-slate-50 rounded-2xl overflow-hidden text-[10px] font-bold text-slate-600">
                                <div className="bg-slate-50 p-2 text-[9px] uppercase tracking-widest text-slate-400 font-black tracking-widest text-center">Detalle de Cargos Inminentes</div>
                                {baseExpenses.slice(0, 5).map((e, i) => (
                                    <div key={i} className="px-4 py-2 border-b border-slate-50 flex justify-between uppercase">
                                        <span>{e.name}</span><span style={{ color: catColors[e.category] }}>{formatCurrency(e.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* NIVEL 2: SANEAMIENTO (EL GRÁFICO OSCURO) */}
                <section className="space-y-6 pt-4">
                    <div className="flex items-center gap-3"><div className="h-8 w-1 bg-red-500 rounded-full"></div>
                        <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Saneamiento de Deudas (Hoy sin Nómina)</h2></div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl border border-slate-800 flex flex-col md:flex-row items-center gap-10">
                            <div className="w-full md:w-1/2 h-56">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPieChart>
                                        <Pie
                                            data={[
                                                { name: 'Gastos Reg.', value: totals.base },
                                                { name: 'Impagos Octopus/Unir', value: totals.debt },
                                                { name: 'Sobrante', value: Math.max(0, totals.sanRemainderToday) }
                                            ]}
                                            cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={6} dataKey="value"
                                        >
                                            <Cell fill="#475569" stroke="none" />
                                            <Cell fill="#f43f5e" stroke="none" />
                                            <Cell fill={totals.sanRemainderToday > 0 ? "#10b981" : "#1e293b"} stroke="none" />
                                        </Pie>
                                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="w-full md:w-1/2 text-center md:text-left space-y-3">
                                <p className="text-[10px] font-black text-slate-500 uppercase">Déficit Real Hoy</p>
                                <p className={`text-4xl font-black ${totals.sanRemainderToday < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {formatCurrency(totals.sanRemainderToday)}
                                </p>
                                <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                                    <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest">Pendiente de sanear: {formatCurrency(Math.abs(Math.min(0, totals.sanRemainderToday)))}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden flex flex-col shadow-sm">
                            <div className="p-6 bg-red-50/50 border-b border-slate-100 flex items-center justify-between font-black text-[11px] text-red-600 uppercase tracking-widest">
                                <span>Facturas Fallidas Detectadas</span><span>{formatCurrency(totals.debt)}</span>
                            </div>
                            <table className="w-full text-left text-[11px] uppercase">
                                <tbody className="divide-y divide-slate-50 font-bold">
                                    {failedPayments.map((fail, i) => (
                                        <tr key={i}><td className="px-8 py-3 text-slate-700">{fail.name}</td><td className="px-8 py-3 text-right text-red-600 font-black">{formatCurrency(fail.amount)}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* --- NIVEL 3: PLANIFICACIÓN TRIMESTRAL (CON NÓMINA) --- */}
                <section className="space-y-6 pt-4">
                    <div className="flex items-center gap-3"><div className="h-8 w-1 bg-indigo-500 rounded-full"></div>
                        <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Planificación Trimestral (Ingresos: 2.800€/mes)</h2></div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] shadow-xl border border-slate-200 h-[400px]">
                            <div className="mb-6 flex justify-between items-center"><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Previsión Flujo de Caja Mensual</h3></div>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { month: 'Febrero', ingresos: 2800, gastos: totals.totalOutFeb },
                                    { month: 'Marzo', ingresos: 2800, gastos: totals.fullMonthlyOut },
                                    { month: 'Abril', ingresos: 2800, gastos: totals.fullMonthlyOut - 111 }
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 800, fill: '#64748b' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                                    <Bar dataKey="ingresos" name="Nómina" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
                                    <Bar dataKey="gastos" name="Gastos+Deudas" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-4 flex flex-col justify-between uppercase font-black tracking-tighter">
                            {['Febrero', 'Marzo', 'Abril'].map((m, i) => {
                                const monthlyRemainder = 2800 - (i === 0 ? totals.totalOutFeb : totals.fullMonthlyOut);
                                return (
                                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative group">
                                        <span className="text-[10px] font-black text-slate-300 uppercase block mb-1">{m}</span>
                                        <p className="text-[9px] text-slate-400 uppercase mb-1 tracking-widest">Disponible Real Estimado</p>
                                        <p className="text-2xl font-black text-slate-800 tracking-tighter">{formatCurrency(monthlyRemainder)}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* --- NUEVO APARTADO: SUSCRIPCIONES ACTIVAS (DETECCIÓN EXTRACTOS) --- */}
                <section className="space-y-6 pt-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3"><div className="h-8 w-1 bg-pink-500 rounded-full"></div>
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Suscripciones Activas Detectadas</h2></div>
                        <span className="px-4 py-1 bg-pink-100 text-pink-600 rounded-full text-[10px] font-black uppercase">Gasto Hormiga Mensual</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {activeSubscriptions.map((sub, i) => (
                            <div key={i} className="bg-white p-5 rounded-[2rem] border border-slate-200 hover:border-pink-300 transition-all flex justify-between items-center group shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-pink-50 rounded-xl text-pink-500 group-hover:rotate-12 transition-all">
                                        <RefreshCw size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter">{sub.name}</span>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{sub.date}</span>
                                    </div>
                                </div>
                                <span className="text-sm font-black text-pink-600 tracking-tighter">{formatCurrency(sub.amount)}</span>
                            </div>
                        ))}
                        <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-6 rounded-[2rem] text-white flex flex-col justify-center shadow-lg shadow-pink-100">
                            <span className="text-[9px] font-black uppercase opacity-70 tracking-widest mb-1">Total Suscripciones</span>
                            <span className="text-3xl font-black tracking-tighter">{formatCurrency(totalSubsMonthly)}</span>
                        </div>
                    </div>
                </section>

                {/* SIMULADOR DINÁMICO */}
                <section className="space-y-6 pt-10 bg-slate-100/40 p-10 rounded-[4rem] border border-dashed border-slate-300">
                    <div className="flex items-center gap-3"><Layout className="text-indigo-600" size={24} />
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Simulador de Imprevistos</h2></div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm flex flex-wrap gap-4 items-end border border-slate-100">
                                <div className="flex-1 min-w-[150px]">
                                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-3 tracking-widest">Nombre Gasto Extra</label>
                                    <input value={newExp.name} onChange={e => setNewExp({ ...newExp, name: e.target.value })} placeholder="Ej. Taller" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-bold uppercase tracking-tight focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div className="w-32">
                                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-3 tracking-widest">Importe (€)</label>
                                    <input type="number" value={newExp.amount} onChange={e => setNewExp({ ...newExp, amount: e.target.value })} placeholder="0.00" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <button onClick={addCustomExpense} className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all"><Plus size={24} /></button>
                            </div>
                            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden min-h-[150px] shadow-sm">
                                {customExpenses.length > 0 ? (
                                    <table className="w-full text-left text-xs uppercase font-bold tracking-tight">
                                        <tbody className="divide-y divide-slate-50">
                                            {customExpenses.map(e => (
                                                <tr key={e.id} className="hover:bg-slate-50 group transition-colors">
                                                    <td className="px-8 py-4 text-slate-700">{e.name}</td>
                                                    <td className="px-8 py-4 font-black text-indigo-600 text-right">{formatCurrency(e.amount)}</td>
                                                    <td className="px-4 text-right"><button onClick={() => removeCustomExpense(e.id)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-12 text-slate-300 opacity-30 font-black uppercase text-[10px] tracking-widest"><ShoppingBag size={40} /><p className="mt-3">Simulación Vacía</p></div>
                                )}
                            </div>
                        </div>
                        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col justify-center text-center space-y-6">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Remainder Final Real Proyectado</h3>
                            <div>
                                <p className={`text-7xl font-black tracking-tighter ${totals.finRemainder < 0 ? 'text-red-500' : 'text-indigo-600'}`}>{formatCurrency(totals.finRemainder)}</p>
                                <p className="text-xs font-bold text-slate-400 mt-4 leading-relaxed italic max-w-xs mx-auto">Saldo disponible estimado al cierre de mes incluyendo imprevistos, deudas recurrentes y todas tus suscripciones.</p>
                            </div>
                            <div className="pt-8 grid grid-cols-2 gap-6 uppercase font-black text-[9px] tracking-widest border-t border-slate-50">
                                <div className="p-5 bg-slate-50 rounded-3xl"><p className="text-slate-400 mb-2">Cargos Totales</p><p className="text-sm text-red-500">{formatCurrency(totals.fullMonthlyOut + totals.debt + totals.custom)}</p></div>
                                <div className="p-5 bg-emerald-50 rounded-3xl"><p className="text-emerald-400 mb-2">Efectividad</p><p className="text-sm text-emerald-600">{((totals.finRemainder / (totalLiquidity + monthlySalary)) * 100).toFixed(1)}%</p></div>
                            </div>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
};

export default MonthlyAnalysisView;
