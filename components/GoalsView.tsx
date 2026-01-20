
import React, { useState, useMemo } from 'react';
import { ScatterChart, Scatter, BarChart, Bar, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Goal } from '../types';
import {
  Target, Plus, TrendingUp, Calendar, Zap, Flag, MoreVertical, Sparkles,
  AlertCircle, Clock, ArrowRight, ChevronRight, ChevronLeft, CalendarDays,
  ListTodo, BarChart3, CheckCircle2, Info, Trash2, Edit3, X, Type as TypeIcon, UploadCloud, Loader2
} from 'lucide-react';
import { extractGoalsFromText, extractGoalsFromFile } from '../services/geminiService';

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
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  const handleAIGoalGeneration = async () => {
    if (!aiMessage.trim()) return;
    setIsProcessingAI(true);
    try {
      const extractedGoals = await extractGoalsFromText(aiMessage);
      extractedGoals.forEach(g => {
        // Ensure unique IDs
        onAddGoal({ ...g, id: `ai-${Date.now()}-${Math.random()}` });
      });
      setAiMessage('');
      setShowAIChat(false);
      alert(`${extractedGoals.length} meta(s) generada(s) por IA.`);
    } catch (e) {
      console.error(e);
      alert('Error al generar metas con IA. Inténtalo de nuevo.');
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        const mimeType = file.type;

        const extractedGoals = await extractGoalsFromFile(base64Data, mimeType);
        extractedGoals.forEach(g => {
          onAddGoal({ ...g, id: `file-${Date.now()}-${Math.random()}` });
        });
        alert(`${extractedGoals.length} meta(s) extraída(s) del archivo.`);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error("Error analyzing file:", e);
      alert("No se pudo analizar el archivo. Asegúrate de que es un PDF o Imagen válido.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
      if (selectedPeriod === 'monthly') return d.getMonth() === currentMonth;
      if (selectedPeriod === 'quarterly') return Math.floor(d.getMonth() / 3) === currentQuarter;
      if (selectedPeriod === 'weekly') {
        const goalWeek = Math.ceil((d.getTime() - new Date(goalYear, 0, 1).getTime()) / 86400000 / 7);
        return goalWeek === currentWeek;
      }
      return true;
    });
  }, [goals, selectedPeriod, selectedYear]);

  const chartData = useMemo(() => {
    return filteredGoals.map(g => ({
      ...g,
      x: new Date(g.targetDate).getTime(),
      y: g.category === 'financial' ? 0 : g.category === 'career' ? 1 : g.category === 'health' ? 2 : 3,
      z: 1,
      progress: g.targetValue ? Math.min((g.currentValue / g.targetValue) * 100, 100) : 0
    }));
  }, [filteredGoals]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-800/50 backdrop-blur-md min-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2 h-2 rounded-full ${data.category === 'financial' ? 'bg-emerald-400' :
              data.category === 'career' ? 'bg-blue-400' :
                data.category === 'health' ? 'bg-rose-400' : 'bg-amber-400'
              }`} />
            <p className="font-bold text-sm">{data.title}</p>
          </div>
          <p className="text-xs text-slate-400 font-medium mb-3">{new Date(data.targetDate).toLocaleDateString()}</p>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Progreso</span>
              <span>{data.progress.toFixed(0)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-500 ${data.progress >= 100 ? 'bg-emerald-500' :
                  data.category === 'financial' ? 'bg-emerald-500' :
                    data.category === 'career' ? 'bg-blue-500' :
                      data.category === 'health' ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                style={{ width: `${Math.min(data.progress, 100)}%` }}
              />
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Visiómetro & Metas</h2>
          <p className="text-slate-500 font-bold mt-1">Línea de tiempo estratégica y ejecución de objetivos</p>
        </div>
        <div className="flex gap-4">
          {/* AI Generation Button */}
          {!showAIChat ? (
            <button
              onClick={() => setShowAIChat(true)}
              className="bg-white text-indigo-600 border border-indigo-100 p-4 rounded-[1.25rem] hover:bg-indigo-50 transition-all shadow-sm hover:shadow-md"
              title="Generar nueva meta con IA"
            >
              <Sparkles size={20} />
            </button>
          ) : (
            <div className="flex items-center bg-white border border-indigo-100 rounded-[1.25rem] p-1 shadow-lg animate-in fade-in slide-in-from-right-4">
              <input
                type="text"
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                placeholder="Ej: Ahorrar 5000€ para Japón..."
                className="bg-transparent border-none focus:ring-0 text-sm w-64 px-3 text-slate-700 placeholder:text-slate-400 font-medium"
                onKeyDown={(e) => e.key === 'Enter' && handleAIGoalGeneration()}
              />
              <button
                onClick={handleAIGoalGeneration}
                disabled={isProcessingAI}
                className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-colors"
              >
                {isProcessingAI ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              </button>
              <button
                onClick={() => setShowAIChat(false)}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* File Upload Button */}
          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-white text-slate-600 border border-slate-200 p-4 rounded-[1.25rem] hover:bg-slate-50 transition-all shadow-sm hover:shadow-md"
              title="Subir documento para extraer metas"
            >
              {isUploading ? <Loader2 size={20} className="animate-spin text-indigo-600" /> : <UploadCloud size={20} />}
            </button>
          </div>

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

      {/* Visual Timeline (Scatter Chart) */}
      <section className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 mb-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20" />
        <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
          <CalendarDays size={20} className="text-indigo-600" />
          Mapa de Objetivos
        </h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#e2e8f0" opacity={0.5} />
              <XAxis
                type="number"
                dataKey="x"
                name="Fecha"
                domain={['auto', 'auto']}
                tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                stroke="#64748b"
                tick={{ fontSize: 11, fontWeight: 600 }}
                tickMargin={10}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Categoría"
                domain={[-0.5, 3.5]}
                ticks={[0, 1, 2, 3]}
                tickFormatter={(value) => {
                  const labels = ['Finanzas', 'Carrera', 'Salud', 'Personal'];
                  return labels[value] || '';
                }}
                stroke="#64748b"
                tick={{ fontSize: 11, fontWeight: 700 }}
                width={80}
              />
              <ZAxis type="number" dataKey="z" range={[400, 400]} />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#94a3b8' }} />
              <ReferenceLine x={new Date().getTime()} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'HOY', fill: '#ef4444', fontSize: 10, fontWeight: 800 }} />
              <Scatter name="Metas" data={chartData} shape="circle">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={
                    entry.category === 'financial' ? '#10b981' :
                      entry.category === 'career' ? '#3b82f6' :
                        entry.category === 'health' ? '#f43f5e' : '#f59e0b'
                  } strokeWidth={2} stroke="#fff" />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Visual Progress (Bar Chart) */}
      <section className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50 mb-10 overflow-hidden">
        <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
          <TrendingUp size={20} className="text-indigo-600" />
          Progreso Detallado
        </h3>
        <div className="h-[400px] w-full pr-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
              barSize={20}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis
                type="category"
                dataKey="title"
                stroke="#64748b"
                tick={{ fontSize: 11, fontWeight: 600 }}
                width={150}
                tickFormatter={(value) => value.length > 20 ? `${value.substring(0, 20)}...` : value}
              />
              <Tooltip
                cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs">
                        <p className="font-bold mb-1">{data.title}</p>
                        <p className="text-slate-400">Progreso: <span className="text-white font-bold">{data.progress.toFixed(1)}%</span></p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="progress" radius={[0, 10, 10, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={
                    entry.category === 'financial' ? '#10b981' :
                      entry.category === 'career' ? '#3b82f6' :
                        entry.category === 'health' ? '#f43f5e' : '#f59e0b'
                  } />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

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
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${goal.category === 'financial' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
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
      </section >

      {/* Modal Reused */}
      {
        showModal && (
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
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" className="bg-slate-50 rounded-xl p-4 font-bold border border-slate-200" placeholder="Meta" value={formData.targetValue} onChange={e => setFormData({ ...formData, targetValue: e.target.value })} required />
                  <input type="number" className="bg-slate-50 rounded-xl p-4 font-bold border border-slate-200" placeholder="Actual" value={formData.currentValue} onChange={e => setFormData({ ...formData, currentValue: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input className="bg-slate-50 rounded-xl p-4 font-bold border border-slate-200" placeholder="Unidad (€, kg)" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} required />
                  <input type="date" className="bg-slate-50 rounded-xl p-4 font-bold border border-slate-200" value={formData.targetDate} onChange={e => setFormData({ ...formData, targetDate: e.target.value })} required />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700">Guardar</button>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default GoalsView;
