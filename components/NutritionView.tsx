
import React, { useState, useMemo, useRef } from 'react';
import { ShoppingItem, DayPlan, Meal, WeightEntry, NutritionPlan } from '../types';
import { 
  ShoppingBasket, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Utensils, 
  Trash2, 
  Calendar, 
  Sparkles,
  Search,
  X,
  Zap,
  TrendingUp,
  Loader2,
  Scale,
  FileUp,
  Eye,
  FileSpreadsheet,
  Camera,
  FileText
} from 'lucide-react';
import { analyzeNutritionScreenshot } from '../services/geminiService';
import { 
  LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

interface NutritionViewProps {
  weightEntries: WeightEntry[];
  nutritionPlans: NutritionPlan[];
  onAddWeightEntry: (entry: WeightEntry) => void;
  onAddPlan: (plan: NutritionPlan) => void;
  onDeletePlan: (id: string) => void;
}

const NutritionView: React.FC<NutritionViewProps> = ({ 
  weightEntries, 
  nutritionPlans, 
  onAddWeightEntry, 
  onAddPlan, 
  onDeletePlan 
}) => {
  const [activeTab, setActiveTab] = useState<'planner' | 'weight' | 'files'>('planner');
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  
  // Weekly Plan State
  const [weeklyPlan, setWeeklyPlan] = useState<DayPlan[]>([
    { day: 'Lunes', meals: [] },
    { day: 'Martes', meals: [] },
    { day: 'Miércoles', meals: [] },
    { day: 'Jueves', meals: [] },
    { day: 'Viernes', meals: [] },
    { day: 'Sábado', meals: [] },
    { day: 'Domingo', meals: [] },
  ]);

  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  
  // Weight Tracker State
  const [newWeight, setNewWeight] = useState('');
  const [weightDate, setWeightDate] = useState(new Date().toISOString().split('T')[0]);

  // File Upload State
  const planInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  const handleAddWeight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeight) return;
    onAddWeightEntry({
      id: Date.now().toString(),
      date: weightDate,
      weight: parseFloat(newWeight)
    });
    setNewWeight('');
  };

  const handlePlanUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onAddPlan({
        id: Date.now().toString(),
        name: file.name,
        uploadDate: new Date().toISOString().split('T')[0],
        type: file.type.includes('pdf') ? 'pdf' : 'image',
        url: url,
      });
    }
    event.target.value = '';
  };

  const handleScreenshotAnalysis = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingImg(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const extractedMeals = await analyzeNutritionScreenshot(base64, file.type);
        // Simple logic: add extracted meals to "Lunes" or selected day for now as demo
        const targetDay = selectedDayIndex !== null ? selectedDayIndex : 0;
        const newPlan = [...weeklyPlan];
        newPlan[targetDay].meals = [...newPlan[targetDay].meals, ...extractedMeals];
        setWeeklyPlan(newPlan);
        alert(`Se han extraído ${extractedMeals.length} comidas de la captura.`);
      } catch (error) {
        console.error(error);
        alert("Error analizando la captura.");
      } finally {
        setIsProcessingImg(false);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  // Sort weight entries for chart
  const sortedWeightData = useMemo(() => {
    return [...weightEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [weightEntries]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Nutrición & Salud</h2>
          <p className="text-slate-500 font-bold mt-1">Gestión integral de dietas y evolución física.</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
           <button onClick={() => setActiveTab('planner')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'planner' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
             Planificador
           </button>
           <button onClick={() => setActiveTab('weight')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'weight' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
             Control Peso
           </button>
           <button onClick={() => setActiveTab('files')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'files' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
             Mis Planes
           </button>
        </div>
      </header>

      {/* ... Planner and Weight Tabs Code (Unchanged) ... */}
      {activeTab === 'planner' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <section className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex justify-between items-center mb-6 px-2">
              <div className="flex items-center gap-2">
                <Calendar className="text-indigo-600" size={24} />
                <h3 className="text-xl font-bold text-slate-800">Menú Semanal</h3>
              </div>
              <div className="flex gap-2">
                 <input type="file" ref={screenshotInputRef} accept="image/*" className="hidden" onChange={handleScreenshotAnalysis} />
                 <button onClick={() => screenshotInputRef.current?.click()} className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors">
                   {isProcessingImg ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} 
                   {isProcessingImg ? 'Analizando...' : 'Escanear Menú'}
                 </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {weeklyPlan.map((plan, idx) => (
                <button 
                  key={plan.day}
                  onClick={() => setSelectedDayIndex(idx)}
                  className={`p-4 rounded-2xl border transition-all text-left group h-full flex flex-col ${
                    selectedDayIndex === idx 
                    ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/10' 
                    : 'border-slate-100 bg-slate-50/30 hover:bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{plan.day.substring(0, 3)}</p>
                  <h4 className="font-bold text-slate-800 mb-3">{plan.day}</h4>
                  
                  <div className="space-y-2 flex-1">
                    {plan.meals.length > 0 ? (
                      plan.meals.slice(0, 3).map((m, mIdx) => (
                        <div key={mIdx} className="text-[9px] bg-white px-2 py-1 rounded-md border border-slate-100 text-slate-600 font-bold truncate shadow-sm">
                          {m.title}
                        </div>
                      ))
                    ) : (
                      <div className="text-[9px] text-slate-300 italic font-medium">Sin plan</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl h-fit">
             <h3 className="text-xl font-black mb-6">Detalle del Día</h3>
             {selectedDayIndex !== null ? (
               <div className="space-y-4">
                  <h4 className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-4">{weeklyPlan[selectedDayIndex].day}</h4>
                  {weeklyPlan[selectedDayIndex].meals.length > 0 ? weeklyPlan[selectedDayIndex].meals.map((meal, i) => (
                    <div key={i} className="bg-white/10 p-4 rounded-2xl border border-white/5">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{meal.type}</p>
                       <p className="font-bold">{meal.title}</p>
                       {meal.ingredients.length > 0 && <p className="text-[10px] text-slate-400 mt-1">{meal.ingredients.join(', ')}</p>}
                    </div>
                  )) : <p className="text-slate-500 text-sm italic">No hay comidas planificadas.</p>}
               </div>
             ) : (
               <p className="text-slate-500 text-sm font-medium">Selecciona un día para ver el menú detallado.</p>
             )}
          </div>
        </div>
      )}

      {activeTab === 'weight' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4">
           <div className="lg:col-span-8 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
              <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
                 <TrendingUp className="text-emerald-600" size={24} /> Evolución de Peso
              </h3>
              <div className="h-[400px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={sortedWeightData}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} dy={10} />
                       <YAxis axisLine={false} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                       <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold'}} />
                       <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={4} dot={{r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                    </RechartsLineChart>
                 </ResponsiveContainer>
              </div>
           </div>

           <div className="lg:col-span-4 space-y-8">
              <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-200">
                 <h4 className="font-black text-lg mb-6 flex items-center gap-2"><Scale size={20} /> Nuevo Registro</h4>
                 <form onSubmit={handleAddWeight} className="space-y-4">
                    <div>
                       <label className="text-[10px] font-black text-emerald-200 uppercase tracking-widest ml-1">Fecha</label>
                       <input type="date" value={weightDate} onChange={(e) => setWeightDate(e.target.value)} className="w-full bg-white/20 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:bg-white/30 transition-all" />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-emerald-200 uppercase tracking-widest ml-1">Peso (kg)</label>
                       <input type="number" step="0.1" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} placeholder="0.0" className="w-full bg-white/20 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:bg-white/30 transition-all placeholder-emerald-200/50" />
                    </div>
                    <button type="submit" className="w-full bg-white text-emerald-700 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-lg">
                       Registrar Peso
                    </button>
                 </form>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm max-h-[300px] overflow-y-auto custom-scrollbar">
                 <h4 className="font-black text-sm text-slate-800 mb-4 uppercase tracking-widest">Historial</h4>
                 <div className="space-y-3">
                    {sortedWeightData.slice().reverse().map((entry, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                         <span className="text-xs font-bold text-slate-500">{entry.date}</span>
                         <span className="text-sm font-black text-slate-900">{entry.weight} kg</span>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'files' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-10">
                 <div>
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                       <FileText className="text-indigo-600" size={24} /> Planes Nutricionales
                    </h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Sube tus dietas en PDF o Imagen</p>
                 </div>
                 <div className="flex gap-3">
                    <input 
                      type="file" 
                      ref={planInputRef} 
                      accept=".pdf, .png, .jpg, .jpeg" 
                      className="hidden" 
                      onChange={handlePlanUpload} 
                    />
                    <button onClick={() => planInputRef.current?.click()} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200">
                       <FileUp size={16} /> Subir Plan
                    </button>
                 </div>
              </div>

              {nutritionPlans.length === 0 ? (
                <div className="p-20 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                   <p className="text-slate-300 font-black uppercase text-xs tracking-widest">No hay planes subidos</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   {nutritionPlans.map(plan => (
                     <div key={plan.id} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 group hover:bg-white hover:shadow-lg hover:border-indigo-100 transition-all relative">
                        <div className="flex justify-between items-start mb-4">
                           <div className={`p-3 rounded-xl ${plan.type === 'pdf' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                              {plan.type === 'pdf' ? <FileText size={20} /> : <FileSpreadsheet size={20} />}
                           </div>
                           <button onClick={() => onDeletePlan(plan.id)} className="text-slate-300 hover:text-red-500 transition-colors"><X size={16} /></button>
                        </div>
                        <h4 className="font-black text-slate-800 text-sm mb-1 truncate">{plan.name}</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-6">{plan.uploadDate}</p>
                        <a href={plan.url} target="_blank" rel="noopener noreferrer" className="w-full py-3 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all flex items-center justify-center gap-2">
                           <Eye size={14} /> Ver Plan
                        </a>
                     </div>
                   ))}
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default NutritionView;
