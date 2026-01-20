
import React, { useState, useMemo } from 'react';
import { Goal } from '../types';
import { 
  Target, Plus, TrendingUp, Calendar, Zap, Flag, MoreVertical, Sparkles, 
  AlertCircle, Clock, ArrowRight, ChevronRight, ChevronLeft, CalendarDays, 
  ListTodo, BarChart3, CheckCircle2, Info, Trash2, Edit3, X, Type as TypeIcon
} from 'lucide-react';

interface GoalsViewProps {
  goals: Goal[];
  onAddGoal: (goal: Goal) => void;
  onUpdateGoal: (goal: Goal) => void;
  onDeleteGoal: (id: string) => void;
}

const GoalsView: React.FC<GoalsViewProps> = ({ goals, onAddGoal, onUpdateGoal, onDeleteGoal }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'weekly' | 'monthly' | 'quarterly' | 'yearly'>('yearly');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    targetDate: '',
    targetValue: '',
    currentValue: '',
    unit: '€',
    category: 'financial' as Goal['category']
  });

  const openModal = (goal?: Goal) => {
    if (goal) {
      setEditingGoal(goal);
      setFormData({
        title: goal.title,
        targetDate: goal.targetDate,
        targetValue: goal.targetValue.toString(),
        currentValue: goal.currentValue.toString(),
        unit: goal.unit,
        category: goal.category
      });
    } else {
      setEditingGoal(null);
      setFormData({
        title: '',
        targetDate: new Date().toISOString().split('T')[0],
        targetValue: '',
        currentValue: '0',
        unit: '€',
        category: 'financial'
      });
    }
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const goalData: Goal = {
      id: editingGoal ? editingGoal.id : Date.now().toString(),
      title: formData.title,
      targetDate: formData.targetDate,
      targetValue: parseFloat(formData.targetValue) || 0,
      currentValue: parseFloat(formData.currentValue) || 0,
      unit: formData.unit,
      category: formData.category,
      status: 'active'
    };

    if (editingGoal) {
      onUpdateGoal(goalData);
    } else {
      onAddGoal(goalData);
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este objetivo?')) {
      onDeleteGoal(id);
    }
  };

  // Logic to filter goals based on period
  const filteredGoals = useMemo(() => {
    const now = new Date();
    const currentWeek = Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 / 7);
    const currentMonth = now.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3);

    return goals.filter(g => {
      const d = new Date(g.targetDate);
      const goalYear = d.getFullYear();
      if (goalYear !== selectedYear) return false;

      if (selectedPeriod === 'yearly') return true;
      if (selectedPeriod === 'monthly') return d.getMonth() === currentMonth; // Simplified: Showing current month
      if (selectedPeriod === 'quarterly') return Math.floor(d.getMonth() / 3) === currentQuarter;
      if (selectedPeriod === 'weekly') {
         const goalWeek = Math.ceil((d.getTime() - new Date(goalYear, 0, 1).getTime()) / 86400000 / 7);
         return goalWeek === currentWeek;
      }
      return true;
    });
  }, [goals, selectedPeriod, selectedYear]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Visiómetro & Metas</h2>
          <p className="text-slate-500 font-bold mt-1">Línea de tiempo estratégica y ejecución de objetivos</p>
        </div>
        <div className="flex gap-4">
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar gap-1">
            {[
              { id: 'weekly', label: 'Semanal' },
              { id: 'monthly', label: 'Mensual' },
              { id: 'quarterly', label: 'Trimestral' },
              { id: 'yearly', label: 'Anual' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPeriod(p.id as any)}
                className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${selectedPeriod === p.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button 
            onClick={() => openModal()}
            className="bg-indigo-600 text-white px-8 py-4 rounded-[1.25rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-3"
          >
            <Plus size={18} /> Nueva Meta
          </button>
        </div>
      </header>

      {/* Tabla Dinámica por Periodo */}
      <section className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
           <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tight">
             <BarChart3 className="text-indigo-600" size={24} /> 
             Objetivos: {selectedPeriod === 'yearly' ? selectedYear : selectedPeriod === 'monthly' ? new Date().toLocaleString('es-ES', { month: 'long' }) : selectedPeriod}
           </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/30">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Objetivo</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Deadline</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Progreso</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredGoals.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No hay metas para este periodo</td></tr>
              ) : (
                filteredGoals.map(goal => {
                  const progress = (goal.currentValue / goal.targetValue) * 100;
                  return (
                    <tr key={goal.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-10 py-6">
                         <h4 className="font-black text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{goal.title}</h4>
                      </td>
                      <td className="px-10 py-6">
                         <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                           goal.category === 'financial' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                           goal.category === 'career' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                           'bg-amber-50 text-amber-600 border-amber-100'
                         }`}>
                           {goal.category}
                         </span>
                      </td>
                      <td className="px-10 py-6">
                         <div className="flex items-center gap-2 text-slate-500 font-bold text-xs">
                           <CalendarDays size={14} className="text-indigo-400" /> {goal.targetDate}
                         </div>
                      </td>
                      <td className="px-10 py-6">
                         <div className="flex flex-col items-center gap-1">
                           <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-1000 ${progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`} 
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              ></div>
                           </div>
                           <span className="text-[9px] font-black text-slate-400">{progress.toFixed(0)}%</span>
                         </div>
                      </td>
                      <td className="px-10 py-6 text-right">
                         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => openModal(goal)} className="p-2 bg-slate-100 hover:bg-indigo-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-all"><Edit3 size={16} /></button>
                           <button onClick={() => handleDelete(goal.id)} className="p-2 bg-slate-100 hover:bg-red-100 rounded-lg text-slate-400 hover:text-red-600 transition-all"><Trash2 size={16} /></button>
                         </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Reused */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[500] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-900">{editingGoal ? 'Editar Objetivo' : 'Nueva Meta'}</h3>
              <button onClick={() => setShowModal(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <input 
                className="w-full bg-slate-50 rounded-xl p-4 font-bold border border-slate-200" 
                placeholder="Título" 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                required 
              />
              <div className="grid grid-cols-2 gap-4">
                 <input type="number" className="bg-slate-50 rounded-xl p-4 font-bold border border-slate-200" placeholder="Meta" value={formData.targetValue} onChange={e => setFormData({...formData, targetValue: e.target.value})} required />
                 <input type="number" className="bg-slate-50 rounded-xl p-4 font-bold border border-slate-200" placeholder="Actual" value={formData.currentValue} onChange={e => setFormData({...formData, currentValue: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <input className="bg-slate-50 rounded-xl p-4 font-bold border border-slate-200" placeholder="Unidad (€, kg)" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} required />
                 <input type="date" className="bg-slate-50 rounded-xl p-4 font-bold border border-slate-200" value={formData.targetDate} onChange={e => setFormData({...formData, targetDate: e.target.value})} required />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700">Guardar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalsView;
