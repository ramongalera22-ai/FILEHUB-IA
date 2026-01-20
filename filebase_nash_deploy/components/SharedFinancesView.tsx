
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SharedExpense, SharedDebt } from '../types';
import {
  Users, Plus, Receipt, DollarSign, CheckCircle2, X, Sparkles, History, Loader2, RefreshCw, FileUp, Trash2
} from 'lucide-react';
import { getSharedFinancesInsight, extractExpenseFromDocument } from '../services/geminiService';

interface SharedFinancesViewProps {
  sharedExpenses: SharedExpense[];
  sharedDebts: SharedDebt[];
  onAddExpense: (expense: SharedExpense) => void;
  onAddDebt: (debt: SharedDebt) => void;
  onSettleDebt: (id: string) => void;
  onDeleteExpense: (id: string) => void;
  onDeleteDebt: (id: string) => void;
}

const SharedFinancesView: React.FC<SharedFinancesViewProps> = ({
  sharedExpenses, sharedDebts, onAddExpense, onAddDebt, onSettleDebt, onDeleteExpense, onDeleteDebt
}) => {
  const [showModal, setShowModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [aiInsight, setAiInsight] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Participants
  const me = { id: 'me', name: 'Yo', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' };
  const partner = { id: 'partner', name: 'Pareja/Socio', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Socio' };

  const [expenseForm, setExpenseForm] = useState({ amount: '', vendor: '', category: 'Comida', paidBy: 'me' });

  const totalJointSpent = useMemo(() => sharedExpenses.reduce((acc, e) => acc + e.amount, 0), [sharedExpenses]);

  const netBalance = useMemo(() => {
    let balance = 0;
    sharedExpenses.forEach(exp => {
      const perPerson = exp.amount / 2;
      if (exp.paidBy === 'me') balance += perPerson;
      else balance -= perPerson;
    });
    return balance;
  }, [sharedExpenses]);

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
          id: `shared-ai-${Date.now()}`,
          amount: extracted.amount || 0,
          date: extracted.date || new Date().toISOString().split('T')[0],
          vendor: extracted.vendor || 'Detectado por IA',
          category: extracted.category || 'General',
          description: 'Importado de PDF/Img',
          priority: 'medium',
          paidBy: 'me',
          splitBetween: ['me', 'partner']
        });
        alert("Gasto compartido detectado y añadido.");
      } catch (error) { console.error(error); alert("Error leyendo archivo."); }
      finally { setIsUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amount || !expenseForm.vendor) return;
    onAddExpense({
      id: `shared-${Date.now()}`,
      amount: parseFloat(expenseForm.amount),
      date: new Date().toISOString().split('T')[0],
      vendor: expenseForm.vendor,
      category: expenseForm.category,
      description: 'Gasto conjunto',
      priority: 'medium',
      paidBy: expenseForm.paidBy,
      splitBetween: ['me', 'partner']
    });
    setShowModal(false);
    setExpenseForm({ amount: '', vendor: '', category: 'Comida', paidBy: 'me' });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <header className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Users className="text-indigo-600" /> Finanzas Compartidas
          </h2>
        </div>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-100 transition-all">
            {isUploading ? <Loader2 className="animate-spin" size={16} /> : <FileUp size={16} />} Subir Ticket
          </button>
          <button onClick={() => setShowModal(true)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all shadow-lg">
            <Plus size={16} /> Nuevo
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="font-black text-slate-400 text-xs uppercase tracking-widest mb-4">Balance Neto</h3>
          <div className="text-4xl font-black text-slate-900 mb-2">
            {netBalance === 0 ? 'Cuentas Saldadas' : `€${Math.abs(netBalance).toFixed(2)}`}
          </div>
          <p className={`text-xs font-bold ${netBalance > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {netBalance > 0 ? 'Te deben dinero' : netBalance < 0 ? 'Debes dinero' : 'Todo en orden'}
          </p>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl">
          <h3 className="font-black text-indigo-400 text-xs uppercase tracking-widest mb-4">Gasto Total</h3>
          <div className="text-4xl font-black">€{totalJointSpent.toLocaleString()}</div>
          <p className="text-xs text-slate-400 mt-2">{sharedExpenses.length} movimientos registrados</p>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50">
          <h3 className="font-black text-lg">Historial de Gastos</h3>
        </div>
        <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto custom-scrollbar">
          {sharedExpenses.map(exp => (
            <div key={exp.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-all group">
              <div className="flex items-center gap-4">
                <img src={exp.paidBy === 'me' ? me.avatar : partner.avatar} className="w-10 h-10 rounded-full bg-slate-100" />
                <div>
                  <p className="font-black text-slate-800">{exp.vendor}</p>
                  <p className="text-xs text-slate-400">{exp.date} • {exp.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-black text-lg">€{exp.amount}</span>
                <button
                  onClick={() => { if (confirm("¿Eliminar este gasto?")) onDeleteExpense(exp.id); }}
                  className="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-md">
            <h3 className="text-xl font-black mb-6">Añadir Gasto Compartido</h3>
            <div className="space-y-4">
              <input className="w-full p-4 bg-slate-50 rounded-xl" placeholder="Concepto" value={expenseForm.vendor} onChange={e => setExpenseForm({ ...expenseForm, vendor: e.target.value })} />
              <input className="w-full p-4 bg-slate-50 rounded-xl" type="number" placeholder="Monto" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
              <select className="w-full p-4 bg-slate-50 rounded-xl" value={expenseForm.paidBy} onChange={e => setExpenseForm({ ...expenseForm, paidBy: e.target.value })}>
                <option value="me">Pagado por Mí</option>
                <option value="partner">Pagado por Socio</option>
              </select>
              <button onClick={handleAddExpense} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg">Guardar</button>
              <button onClick={() => setShowModal(false)} className="w-full py-2 text-slate-400 font-bold">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedFinancesView;
