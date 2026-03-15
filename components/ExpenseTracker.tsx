
import React, { useState, useRef, useMemo } from 'react';
import { Expense, Debt, Investment } from '../types';
import { extractExpenseFromDocument } from '../services/openrouterService';
import {
  Plus, X, Loader2, Receipt, Trash2, TrendingUp, CreditCard, Target,
  BarChart3, FileText, Zap, BookOpen, ExternalLink, FileUp
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface ExpenseTrackerProps {
  expenses: Expense[];
  debts: Debt[];
  investments: Investment[];
  onAddExpense: (expense: Expense) => void;
  onUpdateExpense?: (expense: Expense) => void;
  onDeleteExpense?: (id: string) => void;
  onAddDebt: (debt: Debt) => void;
  onAddInvestment: (investment: Investment) => void;
}

const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({
  expenses, debts, investments, onAddExpense, onUpdateExpense, onDeleteExpense, onAddDebt, onAddInvestment
}) => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'debts' | 'investments'>('expenses');
  const [isUploading, setIsUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'initial' | 'manual' | 'debt' | 'investment'>('initial');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for forms...
  const [newDebt, setNewDebt] = useState<Partial<Debt>>({ name: '', totalAmount: 0, paidAmount: 0, dueDate: '', category: 'Préstamo' });
  const [newInvestment, setNewInvestment] = useState<Partial<Investment>>({ name: '', amount: 0, status: 'current', category: 'Acciones' });
  const [manualExpense, setManualExpense] = useState({ vendor: '', amount: '', category: 'General' });

  // NotebookLM Link
  const FINANCE_NOTEBOOK_URL = "https://notebooklm.google.com/notebook/83964c22-7707-47bd-a1ea-af0997d5f273";

  // Calculations
  const totalExpenses = useMemo(() => expenses.reduce((acc, e) => acc + e.amount, 0), [expenses]);
  const totalDebtValue = useMemo(() => debts.reduce((acc, d) => acc + (d.totalAmount - d.paidAmount), 0), [debts]);

  const chartData = [
    { name: 'Gastos', value: totalExpenses, color: '#4f46e5' },
    { name: 'Deuda', value: totalDebtValue, color: '#ef4444' }
  ];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const mimeType = file.type;
      const base64 = (reader.result as string).split(',')[1];
      try {
        const extracted = await extractExpenseFromDocument(base64, mimeType);
        onAddExpense({
          id: Date.now().toString(),
          amount: extracted.amount || 0,
          date: extracted.date || new Date().toISOString().split('T')[0],
          category: extracted.category || 'General',
          vendor: extracted.vendor || 'Proveedor Desconocido',
          description: extracted.description || 'Extractado por IA',
          priority: 'medium',
          isRecurring: false
        });
        alert("Documento procesado por IA. Gasto añadido.");
        setShowModal(false);
      } catch (error) { console.error(error); alert("Error leyendo el documento."); }
      finally { setIsUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleManualExpense = () => {
    if (!manualExpense.vendor || !manualExpense.amount) return;
    onAddExpense({
      id: Date.now().toString(),
      vendor: manualExpense.vendor,
      amount: parseFloat(manualExpense.amount),
      date: new Date().toISOString().split('T')[0],
      category: manualExpense.category,
      description: 'Manual',
      priority: 'medium'
    });
    setShowModal(false);
    setManualExpense({ vendor: '', amount: '', category: 'General' });
  };

  const handleDebtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDebt.name) return;
    onAddDebt({
      ...newDebt,
      id: Date.now().toString(),
      totalAmount: Number(newDebt.totalAmount),
      paidAmount: Number(newDebt.paidAmount)
    } as Debt);
    setShowModal(false);
  };

  const handleInvestmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvestment.name) return;
    onAddInvestment({
      ...newInvestment,
      id: Date.now().toString(),
      amount: Number(newInvestment.amount)
    } as Investment);
    setShowModal(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Centro Financiero</h2>
          <p className="text-slate-500 font-bold mt-1">Control integral de liquidez, pasivos y patrimonio.</p>
        </div>
        <div className="flex gap-3">
          <a href={FINANCE_NOTEBOOK_URL} target="_blank" rel="noopener noreferrer" className="bg-white border border-slate-200 text-indigo-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-sm">
            <BookOpen size={16} /> NotebookLM
          </a>
          <button onClick={() => { setModalMode('initial'); setShowModal(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl flex items-center gap-2">
            <Zap size={16} /> Acción Rápida
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'expenses', label: 'Gastos', icon: Receipt },
          { id: 'debts', label: 'Deudas', icon: CreditCard },
          { id: 'investments', label: 'Inversiones', icon: TrendingUp }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-400 hover:text-slate-600'
              }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content based on tab */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          {/* Expense Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <h4 className="text-lg font-black text-slate-800 mb-4">Distribución de Gastos</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenses.reduce((acc: any[], curr) => {
                    const existing = acc.find(x => x.name === curr.category);
                    if (existing) existing.value += curr.amount;
                    else acc.push({ name: curr.category, value: curr.amount });
                    return acc;
                  }, [])}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800">Historial</h3>
                <div className="flex gap-2">
                  <button onClick={() => fileInputRef.current?.click()} className="text-indigo-600 font-bold text-xs flex items-center gap-2 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all">
                    {isUploading ? <Loader2 className="animate-spin" size={14} /> : <FileUp size={14} />} Analizar Ticket
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
                </div>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                {expenses.map(exp => (
                  <div key={exp.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                    <div>
                      <p className="font-black text-slate-800">{exp.vendor}</p>
                      <p className="text-xs text-slate-400">{exp.category} • {exp.date}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-black text-lg">€{exp.amount}</span>
                      {onDeleteExpense && <button onClick={() => onDeleteExpense(exp.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'debts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <h4 className="text-lg font-black text-slate-800 mb-4">Estado de Deuda</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={debts.map(d => ({ name: d.name, paid: d.paidAmount, remaining: d.totalAmount - d.paidAmount }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="paid" stackId="a" fill="#10b981" name="Pagado" />
                    <Bar dataKey="remaining" stackId="a" fill="#ef4444" name="Pendiente" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-center items-center">
              <h4 className="text-lg font-black text-slate-800 mb-2">Deuda Total</h4>
              <p className="text-4xl font-black text-red-500">€{totalDebtValue.toLocaleString()}</p>
              <p className="text-sm text-slate-400 mt-2">Pendiente de amortizar</p>
            </div>
          </div>

          <h3 className="text-xl font-black text-slate-900 mt-4">Desglose de Pasivos</h3>
          <div className="grid gap-4">
            {debts.map(debt => (
              <div key={debt.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <h4 className="font-black text-slate-900">{debt.name}</h4>
                    <span className="text-xs font-bold text-slate-500">{Math.round((debt.paidAmount / debt.totalAmount) * 100)}% Pagado</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000" style={{ width: `${(debt.paidAmount / debt.totalAmount) * 100}%` }}></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{debt.category} • Vence: {debt.dueDate || 'Sin fecha'}</p>
                </div>
                <div className="text-right ml-6">
                  <p className="font-black text-red-600">€{(debt.totalAmount - debt.paidAmount).toLocaleString()}</p>
                  <p className="text-[10px] font-black uppercase text-slate-400">Restante</p>
                </div>
              </div>
            ))}
            {debts.length === 0 && <p className="text-center text-slate-400 py-10 font-bold text-xs uppercase">Sin deudas registradas</p>}
          </div>
        </div>
      )}

      {activeTab === 'investments' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <h4 className="text-lg font-black text-slate-800 mb-4">Portafolio de Inversión</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={investments}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} name="Valor Actual" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {investments.map(inv => (
              <div key={inv.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center hover:shadow-md transition-all">
                <div>
                  <h4 className="font-black text-slate-900">{inv.name}</h4>
                  <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-lg ${inv.status === 'liquidated' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600'}`}>
                    {inv.status === 'liquidated' ? 'Liquidado' : 'Activo'}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-black text-emerald-600">€{inv.amount.toLocaleString()}</p>
                  <p className="text-[10px] font-black uppercase text-slate-400">{inv.category}</p>
                </div>
              </div>
            ))}
          </div>
          {investments.length === 0 && <p className="text-center text-slate-400 py-10 font-bold text-xs uppercase">Sin inversiones registradas</p>}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-[500] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-8 relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"><X /></button>
            <h3 className="text-2xl font-black mb-6 text-slate-900">Nueva Entrada</h3>

            {modalMode === 'initial' && (
              <div className="space-y-4">
                <button onClick={() => setModalMode('manual')} className="w-full py-4 bg-slate-100 rounded-2xl font-bold text-slate-700 hover:bg-slate-200 transition-all flex items-center justify-center gap-2"><Receipt size={18} /> Gasto Manual</button>
                <button onClick={() => setModalMode('debt')} className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"><CreditCard size={18} /> Registrar Deuda</button>
                <button onClick={() => setModalMode('investment')} className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-bold hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"><TrendingUp size={18} /> Registrar Inversión</button>
              </div>
            )}

            {modalMode === 'manual' && (
              <div className="space-y-4">
                <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-100" placeholder="Concepto" value={manualExpense.vendor} onChange={e => setManualExpense({ ...manualExpense, vendor: e.target.value })} />
                <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-100" type="number" placeholder="Monto" value={manualExpense.amount} onChange={e => setManualExpense({ ...manualExpense, amount: e.target.value })} />
                <button onClick={handleManualExpense} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all">Guardar Gasto</button>
              </div>
            )}

            {modalMode === 'debt' && (
              <form onSubmit={handleDebtSubmit} className="space-y-4">
                <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" placeholder="Nombre Deuda" value={newDebt.name} onChange={e => setNewDebt({ ...newDebt, name: e.target.value })} required />
                <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" type="number" placeholder="Monto Total" value={newDebt.totalAmount} onChange={e => setNewDebt({ ...newDebt, totalAmount: parseFloat(e.target.value) })} required />
                <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" type="number" placeholder="Pagado" value={newDebt.paidAmount} onChange={e => setNewDebt({ ...newDebt, paidAmount: parseFloat(e.target.value) })} />
                <button type="submit" className="w-full py-4 bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-red-700 transition-all">Guardar Deuda</button>
              </form>
            )}

            {modalMode === 'investment' && (
              <form onSubmit={handleInvestmentSubmit} className="space-y-4">
                <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" placeholder="Nombre Activo" value={newInvestment.name} onChange={e => setNewInvestment({ ...newInvestment, name: e.target.value })} required />
                <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" type="number" placeholder="Monto Invertido" value={newInvestment.amount} onChange={e => setNewInvestment({ ...newInvestment, amount: parseFloat(e.target.value) })} required />
                <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm" placeholder="Categoría (Crypto, Stocks...)" value={newInvestment.category} onChange={e => setNewInvestment({ ...newInvestment, category: e.target.value })} />
                <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all">Guardar Inversión</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseTracker;
