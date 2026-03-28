import React, { useState, useMemo, useRef } from 'react';
import { Expense, Debt, Investment } from '../types';
import {
   TrendingUp, DollarSign, Sparkles, BookOpen, ExternalLink,
   BarChart3, PieChart as PieIcon, Upload, Table, Filter,
   Trash2, Plus, X, Search, FileSpreadsheet, Loader2, TrendingDown, Briefcase, CreditCard
} from 'lucide-react';
import {
   PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line
} from 'recharts';
import { generateFinancialSummary, analyzeFinancialDocument } from '../services/openrouterService';
import { BotPanelGastos } from './BotPanel';

interface EconomyViewProps {
   expenses: Expense[];
   debts: Debt[];
   investments: Investment[];
   onClearAll: () => void;
   onAddExpenses: (expenses: Expense[]) => void;
   onAddDebt: (debt: Debt) => void;
   onDeleteDebt: (id: string) => void;
   onUpdateDebt: (debt: Debt) => void;
   onAddInvestment: (investment: Investment) => void;
   onDeleteInvestment: (id: string) => void;
   onUpdateInvestment: (investment: Investment) => void;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
const NOTEBOOK_URL = "https://notebooklm.google.com/notebook/83964c22-7707-47bd-a1ea-af0997d5f273";
const ALL_NOTEBOOKS_URL = "https://notebooklm.google.com/";

const EconomyView: React.FC<EconomyViewProps> = ({
   expenses, debts, investments,
   onClearAll, onAddExpenses,
   onAddDebt, onDeleteDebt, onUpdateDebt,
   onAddInvestment, onDeleteInvestment, onUpdateInvestment
}) => {
   const [activeTab, setActiveTab] = useState<'expenses' | 'debts' | 'investments' | 'ai-advisor'>('expenses');
   const [filterCategory, setFilterCategory] = useState('All');
   const [filterMonth, setFilterMonth] = useState('All');
   const [isUploading, setIsUploading] = useState(false);

   // --- AI ADVISOR STATE ---
   const [aiChatMsgs, setAiChatMsgs] = useState<{id:string;role:'user'|'assistant';content:string;ts:Date}[]>([]);
   const [aiChatIn, setAiChatIn] = useState('');
   const [aiChatLoading, setAiChatLoading] = useState(false);
   const aiChatRef = useRef<HTMLDivElement>(null);
   const OPENROUTER_KEY_FIN = import.meta.env.VITE_OPENROUTER_KEY || '';

   React.useEffect(() => { aiChatRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [aiChatMsgs]);

   const finContext = useMemo(() => {
     const expSummary = expenses.length > 0 ? `Total gastos: ${expenses.reduce((t,e) => t + e.amount, 0).toFixed(2)}€ en ${expenses.length} transacciones` : 'Sin gastos registrados';
     const debtList = debts.length > 0 ? debts.map(d => `- ${d.name}: ${d.totalAmount}€ (pagado: ${d.paidAmount}€, vence: ${d.dueDate}, estado: ${d.status}${d.interestRate ? `, interés: ${d.interestRate}%` : ''}${d.creditor ? `, acreedor: ${d.creditor}` : ''})`).join('\n') : 'Sin deudas';
     const invList = investments.length > 0 ? investments.map(i => `- ${i.name}: ${i.amount}€ (${i.category}, ${i.status})`).join('\n') : 'Sin inversiones';
     return `GASTOS:\n${expSummary}\n\nDEUDAS:\n${debtList}\n\nINVERSIONES:\n${invList}`;
   }, [expenses, debts, investments]);

   const handleAiChat = React.useCallback(async (overrideMsg?: string) => {
     const msg = overrideMsg || aiChatIn.trim();
     if (!msg || aiChatLoading) return;
     if (!OPENROUTER_KEY_FIN) {
       setAiChatMsgs(prev => [...prev, 
         { id: `fm-${Date.now()}`, role: 'user' as const, content: msg, ts: new Date() },
         { id: `fm-${Date.now()+1}`, role: 'assistant' as const, content: '⚠️ Configura la variable VITE_OPENROUTER_KEY en tus ajustes para usar el asesor IA. Puedes obtener una key gratuita en openrouter.ai', ts: new Date() }
       ]);
       return;
     }
     const userMsg = { id: `fm-${Date.now()}`, role: 'user' as const, content: msg, ts: new Date() };
     setAiChatMsgs(prev => [...prev, userMsg]);
     setAiChatIn(''); setAiChatLoading(true);
     
     const models = ['anthropic/claude-haiku-4.5', 'anthropic/claude-3-haiku', 'google/gemini-flash-1.5'];
     let reply = '';
     
     for (const model of models) {
       try {
         const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
           method: 'POST', 
           headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENROUTER_KEY_FIN}`, 'HTTP-Referer': 'https://ramongalera22-ai.github.io/FILEHUB-IA' },
           body: JSON.stringify({
             model, max_tokens: 1500,
             messages: [
               { role: 'system', content: `Eres un asesor financiero IA en FILEHUB. El usuario es médico.\n\nDATOS FINANCIEROS:\n${finContext}\n\nINSTRUCCIONES:\n- Responde en español con emojis\n- Analiza riesgos de deuda, prioriza qué eliminar primero (avalancha vs bola de nieve)\n- Identifica puntos críticos (vencimientos, sobreendeudamiento, ratio deuda/ingreso)\n- Sé directo con alertas rojas si hay riesgo\n- Sugiere plan de acción concreto` },
               ...[...aiChatMsgs.slice(-10), userMsg].map(m => ({ role: m.role, content: m.content }))
             ]
           })
         });
         const d = await res.json();
         if (d.error) { reply = `⚠️ ${d.error.message || JSON.stringify(d.error)}`; continue; }
         reply = d.choices?.[0]?.message?.content || '';
         if (reply) break;
       } catch (e: any) {
         reply = `❌ Error de conexión: ${e.message}`;
       }
     }
     
     setAiChatMsgs(prev => [...prev, { id: `fm-${Date.now()+1}`, role: 'assistant', content: reply || '⚠️ No se pudo obtener respuesta. Verifica tu API key de OpenRouter en Configuración.', ts: new Date() }]);
     setAiChatLoading(false);
   }, [aiChatIn, aiChatMsgs, aiChatLoading, finContext, OPENROUTER_KEY_FIN]);

   // --- EXPENSE STATE ---
   const [newExpenseLine, setNewExpenseLine] = useState({ vendor: '', amount: '', category: 'General', date: '' });

   // --- DEBT STATE ---
   const [newDebt, setNewDebt] = useState({ name: '', creditor: '', totalAmount: '', dueDate: '', category: 'Personal' });
   const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

   // --- INVESTMENT STATE ---
   const [newInvestment, setNewInvestment] = useState({ name: '', amount: '', category: 'stock', date: '' });
   const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);

   const fileInputRef = useRef<HTMLInputElement>(null);

   // --- DERIVED DATA ---
   const categories = useMemo(() => ['All', ...Array.from(new Set(expenses.map(e => e.category)))], [expenses]);
   const months = useMemo(() => {
      const m = new Set(expenses.map(e => e.date.substring(0, 7))); // YYYY-MM
      return ['All', ...Array.from(m).sort().reverse()];
   }, [expenses]);

   const filteredExpenses = useMemo(() => {
      return expenses.filter(e => {
         const matchCat = filterCategory === 'All' || e.category === filterCategory;
         const matchMonth = filterMonth === 'All' || e.date.startsWith(filterMonth);
         return matchCat && matchMonth;
      });
   }, [expenses, filterCategory, filterMonth]);

   const totalFiltered = filteredExpenses.reduce((acc, e) => acc + Math.abs(e.amount), 0);

   const categoryData = useMemo(() => {
      const data: Record<string, number> = {};
      filteredExpenses.forEach(e => {
         // Use absolute value for visualization to handle negative entries (e.g. if user entered expenses as negative)
         const absAmount = Math.abs(e.amount);
         data[e.category] = (data[e.category] || 0) + absAmount;
      });
      return Object.entries(data)
         .map(([name, value]) => ({ name, value }))
         .filter(item => item.value > 0); // Only show categories with actual value
   }, [filteredExpenses]);

   const debtData = useMemo(() => {
      return debts.map(d => ({
         name: d.name,
         total: d.totalAmount,
         paid: d.paidAmount,
         remaining: d.totalAmount - d.paidAmount
      }));
   }, [debts]);

   const investmentData = useMemo(() => {
      return investments.map(i => ({
         name: i.name,
         invested: i.amount,
         current: i.currentValue || i.amount
      }));
   }, [investments]);

   // --- HANDLERS ---
   const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploading(true);

      const reader = new FileReader();
      reader.onload = async () => {
         const base64 = (reader.result as string).split(',')[1];
         try {
            const result = await analyzeFinancialDocument(base64, file.type);
            if (result.transactions) {
               const newExps = result.transactions.map((t: any) => ({
                  id: `imported-${Date.now()}-${Math.random()}`,
                  amount: t.amount,
                  date: t.date || new Date().toISOString().split('T')[0],
                  vendor: t.vendor || 'Importado',
                  category: t.category || 'General',
                  description: 'Desde Excel/PDF',
                  priority: 'medium' as const
               }));
               onAddExpenses(newExps);
               alert(`Importados ${newExps.length} registros.`);
            }
         } catch (err) {
            console.error(err);
            alert("Error procesando el archivo.");
         } finally {
            setIsUploading(false);
         }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
   };

   const handleAddExpenseLine = () => {
      if (!newExpenseLine.vendor || !newExpenseLine.amount) return;
      onAddExpenses([{
         id: `manual-${Date.now()}`,
         vendor: newExpenseLine.vendor,
         amount: parseFloat(newExpenseLine.amount),
         date: newExpenseLine.date || new Date().toISOString().split('T')[0],
         category: newExpenseLine.category,
         description: 'Manual Entry',
         priority: 'medium' as const
      }]);
      setNewExpenseLine({ vendor: '', amount: '', category: 'General', date: '' });
   };

   const handleAddDebtLine = () => {
      if (!newDebt.name || !newDebt.totalAmount) return;
      onAddDebt({
         id: `debt-${Date.now()}`,
         name: newDebt.name,
         creditor: newDebt.creditor,
         totalAmount: parseFloat(newDebt.totalAmount),
         paidAmount: 0,
         dueDate: newDebt.dueDate,
         category: newDebt.category,
         status: 'pending'
      });
      setNewDebt({ name: '', creditor: '', totalAmount: '', dueDate: '', category: 'Personal' });
   };

   const handleUpdateDebtPayment = (debt: Debt, payment: number) => {
      const newPaid = Math.min(debt.paidAmount + payment, debt.totalAmount);
      onUpdateDebt({
         ...debt,
         paidAmount: newPaid,
         status: newPaid >= debt.totalAmount ? 'paid' : 'pending'
      });
   };

   const handleAddInvestmentLine = () => {
      if (!newInvestment.name || !newInvestment.amount) return;
      onAddInvestment({
         id: `inv-${Date.now()}`,
         name: newInvestment.name,
         amount: parseFloat(newInvestment.amount),
         date: newInvestment.date || new Date().toISOString().split('T')[0],
         category: newInvestment.category as any,
         status: 'active',
         currentValue: parseFloat(newInvestment.amount)
      });
      setNewInvestment({ name: '', amount: '', category: 'stock', date: '' });
   };

   return (
      <div className="space-y-10 animate-in fade-in duration-700 pb-20">

      <div className="px-4 pb-2 pt-4"><BotPanelGastos /></div>
         <header className="relative bg-slate-900 rounded-[3rem] p-12 overflow-hidden shadow-2xl border border-slate-800">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-600/20 to-transparent"></div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
               <div>
                  <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight flex items-center gap-4">
                     <div className="p-4 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-600/20">
                        <BarChart3 size={32} />
                     </div>
                     Economía <span className="text-indigo-400">Pro</span>
                  </h2>
                  <p className="text-slate-400 font-bold mt-3 text-sm flex items-center gap-2">
                     <Sparkles size={16} className="text-amber-400" /> Control total de activos, deudas e inversiones.
                  </p>
               </div>
               <div className="flex flex-wrap gap-4">
                  <a href={NOTEBOOK_URL} target="_blank" rel="noopener noreferrer" className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 transition-all flex items-center gap-3 backdrop-blur-md">
                     <BookOpen size={18} className="text-indigo-400" /> Notebook Finanzas
                  </a>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv,.md,.txt,.pdf" onChange={handleUpload} />
                  <button onClick={() => fileInputRef.current?.click()} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all flex items-center gap-3 shadow-xl shadow-indigo-600/30">
                     {isUploading ? <Loader2 className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />}
                     Importar Datos
                  </button>
               </div>
            </div>
         </header>

         {/* NAVIGATION TABS */}
         <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex gap-3 shadow-inner">
            <button
               onClick={() => setActiveTab('expenses')}
               className={`flex-1 px-8 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${activeTab === 'expenses' ? 'bg-slate-900 text-white shadow-2xl' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
            >
               <DollarSign size={18} className={activeTab === 'expenses' ? 'text-indigo-400' : ''} />
               Gastos
            </button>
            <button
               onClick={() => setActiveTab('debts')}
               className={`flex-1 px-8 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${activeTab === 'debts' ? 'bg-slate-900 text-white shadow-2xl' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
            >
               <CreditCard size={18} className={activeTab === 'debts' ? 'text-red-400' : ''} />
               Deudas
            </button>
            <button
               onClick={() => setActiveTab('investments')}
               className={`flex-1 px-8 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${activeTab === 'investments' ? 'bg-slate-900 text-white shadow-2xl' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
            >
               <Briefcase size={18} className={activeTab === 'investments' ? 'text-emerald-400' : ''} />
               Inversiones
            </button>
            <button
               onClick={() => setActiveTab('ai-advisor')}
               className={`flex-1 px-8 py-5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${activeTab === 'ai-advisor' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-2xl' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
            >
               <Sparkles size={18} className={activeTab === 'ai-advisor' ? 'text-violet-200' : ''} />
               🧠 Asesor IA
            </button>
         </div>

         {/* EXPENSES TAB */}
         {activeTab === 'expenses' && (
            <>
               {/* KPI & AI Analysis */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Gasto Filtrado</p>
                     <h3 className="text-4xl font-black text-slate-900">€{totalFiltered.toLocaleString()}</h3>
                  </div>
                  <div className="col-span-2 bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                     <Sparkles className="absolute top-4 right-4 text-indigo-400 opacity-20" size={64} />
                     <h4 className="font-black text-lg mb-2 flex items-center gap-2"><Sparkles size={18} className="text-amber-300" /> Análisis IA</h4>
                     <p className="text-sm text-indigo-100 font-medium leading-relaxed max-w-2xl">
                        {totalFiltered > 2000
                           ? "Alerta: El gasto de este mes supera la media. La categoría 'Vivienda' muestra un incremento del 15% respecto al mes anterior."
                           : "Buen trabajo: Mantienes un ritmo de gasto saludable. Se proyecta un ahorro potencial del 20% si mantienes esta tendencia."}
                     </p>
                  </div>
               </div>

               {/* Charts Row */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm h-[400px] flex flex-col">
                     <h4 className="font-black text-slate-800 mb-6 flex items-center gap-2"><PieIcon size={18} /> Desglose por Categoría</h4>
                     {categoryData.length > 0 ? (
                        <div className="flex-1 w-full min-h-0">
                           <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                 <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    nameKey="name"
                                    isAnimationActive={true}
                                 >
                                    {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                 </Pie>
                                 <Tooltip formatter={(value: number) => [`€${value.toFixed(2)}`, 'Gasto']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                 <Legend verticalAlign="bottom" height={36} iconType="circle" />
                              </PieChart>
                           </ResponsiveContainer>
                        </div>
                     ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-50">
                           <PieIcon size={48} className="mb-2" />
                           <p className="text-xs font-bold uppercase tracking-widest">Sin datos para mostrar</p>
                        </div>
                     )}
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm h-[400px]">
                     <h4 className="font-black text-slate-800 mb-6 flex items-center gap-2"><BarChart3 size={18} /> Tendencia</h4>
                     <ResponsiveContainer width="100%" height="80%">
                        <BarChart data={categoryData}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} />
                           <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                           <YAxis />
                           <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                           <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               {/* Data Table */}
               <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/30">
                     <h3 className="font-black text-xl text-slate-900 flex items-center gap-2"><Table size={20} className="text-indigo-600" /> Registro Detallado</h3>
                     <div className="flex gap-2">
                        <div className="relative">
                           <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                           <select className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                              {months.map(m => <option key={m} value={m}>{m}</option>)}
                           </select>
                        </div>
                        <div className="relative">
                           <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                           <select className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                              {categories.map(c => <option key={c} value={c}>{c}</option>)}
                           </select>
                        </div>
                     </div>
                  </div>

                  {/* Add New Row */}
                  <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 flex gap-2 items-center">
                     <input placeholder="Concepto" className="flex-1 p-2 rounded-lg border border-indigo-200 text-xs font-bold" value={newExpenseLine.vendor} onChange={e => setNewExpenseLine({ ...newExpenseLine, vendor: e.target.value })} />
                     <input type="number" placeholder="€" className="w-24 p-2 rounded-lg border border-indigo-200 text-xs font-bold" value={newExpenseLine.amount} onChange={e => setNewExpenseLine({ ...newExpenseLine, amount: e.target.value })} />
                     <input placeholder="Categoría" className="w-32 p-2 rounded-lg border border-indigo-200 text-xs font-bold" value={newExpenseLine.category} onChange={e => setNewExpenseLine({ ...newExpenseLine, category: e.target.value })} />
                     <input type="date" className="w-32 p-2 rounded-lg border border-indigo-200 text-xs font-bold" value={newExpenseLine.date} onChange={e => setNewExpenseLine({ ...newExpenseLine, date: e.target.value })} />
                     <button onClick={handleAddExpenseLine} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"><Plus size={16} /></button>
                  </div>

                  <div className="overflow-x-auto max-h-[500px]">
                     <table className="w-full text-left">
                        <thead className="bg-slate-50 sticky top-0">
                           <tr>
                              <th className="p-4 text-[10px] font-black uppercase text-slate-400">Fecha</th>
                              <th className="p-4 text-[10px] font-black uppercase text-slate-400">Concepto</th>
                              <th className="p-4 text-[10px] font-black uppercase text-slate-400">Categoría</th>
                              <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-right">Importe</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {filteredExpenses.map(exp => (
                              <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                                 <td className="p-4 text-xs font-bold text-slate-500">{exp.date}</td>
                                 <td className="p-4 text-sm font-black text-slate-800">{exp.vendor}</td>
                                 <td className="p-4"><span className="text-[10px] font-bold px-2 py-1 bg-slate-100 rounded text-slate-500 uppercase">{exp.category}</span></td>
                                 <td className="p-4 text-sm font-black text-slate-900 text-right">€{exp.amount}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </section>
            </>
         )}

         {/* DEBTS TAB */}
         {activeTab === 'debts' && (
            <>
               {/* Debt KPIs */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-red-50 p-8 rounded-[2.5rem] border border-red-100">
                     <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Deuda Total</p>
                     <h3 className="text-4xl font-black text-red-600">€{debts.reduce((acc, d) => acc + d.totalAmount, 0).toLocaleString()}</h3>
                  </div>
                  <div className="bg-green-50 p-8 rounded-[2.5rem] border border-green-100">
                     <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-2">Pagado</p>
                     <h3 className="text-4xl font-black text-green-600">€{debts.reduce((acc, d) => acc + d.paidAmount, 0).toLocaleString()}</h3>
                  </div>
                  <div className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100">
                     <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">Pendiente</p>
                     <h3 className="text-4xl font-black text-amber-600">€{debts.reduce((acc, d) => acc + (d.totalAmount - d.paidAmount), 0).toLocaleString()}</h3>
                  </div>
               </div>

               {/* Debt Chart */}
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm h-[400px]">
                  <h4 className="font-black text-slate-800 mb-6 flex items-center gap-2"><TrendingDown size={18} className="text-red-600" /> Progreso de Deudas</h4>
                  <ResponsiveContainer width="100%" height="80%">
                     <BarChart data={debtData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                        <Legend />
                        <Bar dataKey="paid" fill="#10b981" name="Pagado" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="remaining" fill="#ef4444" name="Pendiente" radius={[4, 4, 0, 0]} />
                     </BarChart>
                  </ResponsiveContainer>
               </div>

               {/* Debt Table */}
               <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-slate-50 bg-slate-50/30">
                     <h3 className="font-black text-xl text-slate-900 flex items-center gap-2"><CreditCard size={20} className="text-red-600" /> Gestión de Deudas</h3>
                  </div>

                  {/* Add New Debt */}
                  <div className="p-4 bg-red-50/50 border-b border-red-100 flex gap-2 items-center">
                     <input placeholder="Nombre deuda" className="flex-1 p-2 rounded-lg border border-red-200 text-xs font-bold" value={newDebt.name} onChange={e => setNewDebt({ ...newDebt, name: e.target.value })} />
                     <input placeholder="Acreedor" className="flex-1 p-2 rounded-lg border border-red-200 text-xs font-bold" value={newDebt.creditor} onChange={e => setNewDebt({ ...newDebt, creditor: e.target.value })} />
                     <input type="number" placeholder="€ Total" className="w-24 p-2 rounded-lg border border-red-200 text-xs font-bold" value={newDebt.totalAmount} onChange={e => setNewDebt({ ...newDebt, totalAmount: e.target.value })} />
                     <input type="date" placeholder="Vencimiento" className="w-32 p-2 rounded-lg border border-red-200 text-xs font-bold" value={newDebt.dueDate} onChange={e => setNewDebt({ ...newDebt, dueDate: e.target.value })} />
                     <button onClick={handleAddDebtLine} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"><Plus size={16} /></button>
                  </div>

                  <div className="overflow-x-auto max-h-[500px]">
                     <table className="w-full text-left">
                        <thead className="bg-slate-50 sticky top-0">
                           <tr>
                              <th className="p-4 text-[10px] font-black uppercase text-slate-400">Deuda</th>
                              <th className="p-4 text-[10px] font-black uppercase text-slate-400">Acreedor</th>
                              <th className="p-4 text-[10px] font-black uppercase text-slate-400">Total</th>
                              <th className="p-4 text-[10px] font-black uppercase text-slate-400">Pagado</th>
                              <th className="p-4 text-[10px] font-black uppercase text-slate-400">Pendiente</th>
                              <th className="p-4 text-[10px] font-black uppercase text-slate-400">Vence</th>
                              <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-right">Acción</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {debts.map(debt => (
                              <tr key={debt.id} className="hover:bg-slate-50 transition-colors">
                                 <td className="p-4 text-sm font-black text-slate-800">{debt.name}</td>
                                 <td className="p-4 text-xs font-bold text-slate-500">{debt.creditor || '-'}</td>
                                 <td className="p-4 text-sm font-bold text-slate-900">€{debt.totalAmount}</td>
                                 <td className="p-4 text-sm font-bold text-green-600">€{debt.paidAmount}</td>
                                 <td className="p-4 text-sm font-bold text-red-600">€{debt.totalAmount - debt.paidAmount}</td>
                                 <td className="p-4 text-xs font-bold text-slate-500">{debt.dueDate}</td>
                                 <td className="p-4 text-right">
                                    <button onClick={() => onDeleteDebt(debt.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </section>
            </>
         )}

         {/* INVESTMENTS TAB */}
         {activeTab === 'investments' && (
            <>
               {/* Investment KPIs */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-green-50 p-8 rounded-[2.5rem] border border-green-100">
                     <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-2">Invertido</p>
                     <h3 className="text-4xl font-black text-green-600">€{investments.reduce((acc, i) => acc + i.amount, 0).toLocaleString()}</h3>
                  </div>
                  <div className="bg-blue-50 p-8 rounded-[2.5rem] border border-blue-100">
                     <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Valor Actual</p>
                     <h3 className="text-4xl font-black text-blue-600">€{investments.reduce((acc, i) => acc + (i.currentValue || i.amount), 0).toLocaleString()}</h3>
                  </div>
                  <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100">
                     <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Retorno</p>
                     <h3 className="text-4xl font-black text-indigo-600">
                        {((investments.reduce((acc, i) => acc + (i.currentValue || i.amount), 0) / (investments.reduce((acc, i) => acc + i.amount, 0) || 1) - 1) * 100).toFixed(1)}%
                     </h3>
                  </div>
               </div>

               {/* Investment Chart */}
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm h-[400px]">
                  <h4 className="font-black text-slate-800 mb-6 flex items-center gap-2"><TrendingUp size={18} className="text-green-600" /> Rendimiento de Inversiones</h4>
                  <ResponsiveContainer width="100%" height="80%">
                     <BarChart data={investmentData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                        <Legend />
                        <Bar dataKey="invested" fill="#8b5cf6" name="Invertido" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="current" fill="#10b981" name="Valor Actual" radius={[4, 4, 0, 0]} />
                     </BarChart>
                  </ResponsiveContainer>
               </div>

               {/* Investment Table */}
               <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-slate-50 bg-slate-50/30">
                     <h3 className="font-black text-xl text-slate-900 flex items-center gap-2"><Briefcase size={20} className="text-green-600" /> Portfolio de Inversiones</h3>
                  </div>

                  {/* Add New Investment */}
                  <div className="p-4 bg-green-50/50 border-b border-green-100 flex gap-2 items-center">
                     <input placeholder="Nombre" className="flex-1 p-2 rounded-lg border border-green-200 text-xs font-bold" value={newInvestment.name} onChange={e => setNewInvestment({ ...newInvestment, name: e.target.value })} />
                     <input type="number" placeholder="€ Monto" className="w-24 p-2 rounded-lg border border-green-200 text-xs font-bold" value={newInvestment.amount} onChange={e => setNewInvestment({ ...newInvestment, amount: e.target.value })} />
                     <select className="w-32 p-2 rounded-lg border border-green-200 text-xs font-bold" value={newInvestment.category} onChange={e => setNewInvestment({ ...newInvestment, category: e.target.value })}>
                        <option value="stock">Acciones</option>
                        <option value="crypto">Crypto</option>
                        <option value="real_estate">Inmuebles</option>
                        <option value="bond">Bonos</option>
                        <option value="other">Otro</option>
                     </select>
                     <input type="date" className="w-32 p-2 rounded-lg border border-green-200 text-xs font-bold" value={newInvestment.date} onChange={e => setNewInvestment({ ...newInvestment, date: e.target.value })} />
                     <button onClick={handleAddInvestmentLine} className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"><Plus size={16} /></button>
                  </div>

                  <div className="overflow-x-auto max-h-[500px]">
                     <table className="w-full text-left">
                        <thead className="bg-slate-50 sticky top-0">
                           <tr>
                              <th className="p-4 text-[10px] font-black uppercase text-slate-400">Inversión</th>
                              <th className="p-4 text-[10px] font-black uppercase text-slate-400">Categoría</th>
                              <th className="p-4 text-[10px] font-black uppercase text-slate-400">Invertido</th>
                              <th className="p-4 text-[10px] font-black uppercase text-slate-400">Valor Actual</th>
                              <th className="p-4 text-[10px] font-black uppercase text-slate-400">Retorno</th>
                              <th className="p-4 text-[10px] font-black uppercase text-slate-400">Fecha</th>
                              <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-right">Acción</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {investments.map(inv => {
                              const returnPct = ((inv.currentValue || inv.amount) / inv.amount - 1) * 100;
                              return (
                                 <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 text-sm font-black text-slate-800">{inv.name}</td>
                                    <td className="p-4"><span className="text-[10px] font-bold px-2 py-1 bg-slate-100 rounded text-slate-500 uppercase">{inv.category}</span></td>
                                    <td className="p-4 text-sm font-bold text-slate-900">€{inv.amount}</td>
                                    <td className="p-4 text-sm font-bold text-green-600">€{inv.currentValue || inv.amount}</td>
                                    <td className={`p-4 text-sm font-bold ${returnPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>{returnPct.toFixed(1)}%</td>
                                    <td className="p-4 text-xs font-bold text-slate-500">{inv.date}</td>
                                    <td className="p-4 text-right">
                                       <button onClick={() => onDeleteInvestment(inv.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                    </td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>
                  </div>
               </section>
            </>
         )}

         {/* AI ADVISOR TAB */}
         {activeTab === 'ai-advisor' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
               {/* Header */}
               <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -mr-20 -mt-20" />
                  <div className="relative z-10">
                     <div className="flex items-center gap-4 mb-3">
                        <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center text-3xl">💰</div>
                        <div>
                           <h3 className="text-2xl font-black tracking-tight">Asesor Financiero IA</h3>
                           <p className="text-white/60 text-sm font-bold">Claude Haiku · Analiza deudas, riesgos y puntos críticos</p>
                        </div>
                     </div>
                     <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider text-white/50">
                        <span>💳 {debts.length} deudas</span>
                        <span>📊 {expenses.length} gastos</span>
                        <span>📈 {investments.length} inversiones</span>
                     </div>
                  </div>
               </div>

               {/* Debt Overview Table */}
               {debts.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                     <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-red-50/50 dark:bg-red-500/5">
                        <h4 className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-2"><CreditCard size={16} className="text-red-500" /> Tabla de Endeudamiento</h4>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                           <thead className="bg-slate-50 dark:bg-slate-900/50">
                              <tr>
                                 <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Deuda</th>
                                 <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Acreedor</th>
                                 <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Total</th>
                                 <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Pagado</th>
                                 <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Restante</th>
                                 <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Vencimiento</th>
                                 <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Estado</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                              {debts.map(d => {
                                 const remaining = d.totalAmount - d.paidAmount;
                                 const daysUntilDue = Math.ceil((new Date(d.dueDate).getTime() - Date.now()) / 86400000);
                                 const isOverdue = daysUntilDue < 0;
                                 const isUrgent = daysUntilDue >= 0 && daysUntilDue <= 30;
                                 return (
                                    <tr key={d.id} className={`${isOverdue ? 'bg-red-50 dark:bg-red-500/5' : isUrgent ? 'bg-amber-50 dark:bg-amber-500/5' : ''}`}>
                                       <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{d.name}</td>
                                       <td className="px-4 py-3 text-slate-500 text-xs">{d.creditor || '-'}</td>
                                       <td className="px-4 py-3 font-black text-slate-800 dark:text-white">€{d.totalAmount.toLocaleString()}</td>
                                       <td className="px-4 py-3 text-emerald-600 font-bold">€{d.paidAmount.toLocaleString()}</td>
                                       <td className="px-4 py-3 text-red-600 font-black">€{remaining.toLocaleString()}</td>
                                       <td className="px-4 py-3">
                                          <span className={`text-xs font-bold ${isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-slate-500'}`}>
                                             {d.dueDate} {isOverdue ? '⚠️ VENCIDA' : isUrgent ? `⏰ ${daysUntilDue}d` : ''}
                                          </span>
                                       </td>
                                       <td className="px-4 py-3">
                                          <span className={`text-[9px] font-black px-2 py-1 rounded-md ${d.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : d.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                             {d.status === 'paid' ? '✅ Pagada' : d.status === 'overdue' ? '🔴 Vencida' : '⏳ Pendiente'}
                                          </span>
                                       </td>
                                    </tr>
                                 );
                              })}
                           </tbody>
                        </table>
                     </div>
                     <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-between text-sm font-black">
                        <span className="text-slate-500">Total deuda:</span>
                        <span className="text-red-600">€{debts.reduce((t,d) => t + (d.totalAmount - d.paidAmount), 0).toLocaleString()}</span>
                     </div>
                  </div>
               )}

               {/* Quick prompts */}
               {aiChatMsgs.length === 0 && (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                     {[
                        { emoji: '⚠️', text: 'Analiza mis riesgos financieros y puntos críticos' },
                        { emoji: '🎯', text: '¿Qué deuda debería eliminar primero y por qué?' },
                        { emoji: '📊', text: 'Haz un plan para reducir mi deuda total' },
                        { emoji: '💡', text: 'Sugiere cómo optimizar mis gastos mensuales' },
                        { emoji: '🏦', text: 'Analiza mi ratio deuda/patrimonio' },
                        { emoji: '📈', text: '¿Son rentables mis inversiones actuales?' },
                     ].map((p, i) => (
                        <button key={i} onClick={() => handleAiChat(p.text)}
                           className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-left hover:border-violet-300 hover:shadow-lg transition-all">
                           <span className="text-2xl mb-2 block">{p.emoji}</span>
                           <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{p.text}</p>
                        </button>
                     ))}
                  </div>
               )}

               {/* Chat */}
               <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col" style={{ minHeight: '350px' }}>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[500px]">
                     {aiChatMsgs.length === 0 && (
                        <div className="text-center py-16">
                           <Sparkles size={36} className="mx-auto text-violet-300 mb-4" />
                           <h4 className="font-black text-lg text-slate-800 dark:text-white mb-2">Tu asesor financiero personal</h4>
                           <p className="text-sm text-slate-400 max-w-md mx-auto">Pregúntame sobre tus deudas, riesgos, prioridades de pago, o sube extractos PDF para analizar.</p>
                        </div>
                     )}
                     {aiChatMsgs.map(m => (
                        <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                           <div className={`max-w-[80%] rounded-2xl px-5 py-4 ${m.role === 'user' ? 'bg-violet-600 text-white' : 'bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200'}`}>
                              <pre className="text-sm font-sans whitespace-pre-wrap leading-relaxed break-words">{m.content}</pre>
                           </div>
                        </div>
                     ))}
                     {aiChatLoading && (
                        <div className="flex gap-3"><div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm text-violet-600 font-bold flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Analizando datos financieros...</div></div>
                     )}
                     <div ref={aiChatRef} />
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-700 p-4 bg-slate-50/50 dark:bg-slate-900/30 flex gap-3">
                     <input value={aiChatIn} onChange={e => setAiChatIn(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAiChat(); }}
                        placeholder="Pregunta sobre deudas, riesgos, gastos..." className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-violet-400" />
                     <button onClick={() => handleAiChat()} disabled={!aiChatIn.trim() || aiChatLoading}
                        className="px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black text-xs uppercase disabled:opacity-40 transition-all shadow-lg flex items-center gap-2">
                        {aiChatLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Preguntar
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default EconomyView;
