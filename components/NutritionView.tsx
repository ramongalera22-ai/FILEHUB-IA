
import { callAI } from '../services/aiProxy';
import { cfg } from '../services/config';
const OPENROUTER_KEY = cfg.openrouterKey();

import React, { useState, useMemo, useRef } from 'react';
import { ShoppingItem, DayPlan, Meal, WeightEntry, NutritionPlan, WorkDocument } from '../types';
import {
  ShoppingBasket, Plus, CheckCircle2, Circle, Utensils, Trash2, Calendar,
  Sparkles, Search, X, Zap, TrendingUp, Loader2, Scale, FileUp, Eye,
  FileSpreadsheet, Camera, FileText, BrainCircuit, Settings, ChefHat,
  Brain, Share2, ArrowUpRight, Edit3, Send, MessageCircle, Bot, RefreshCw
} from 'lucide-react';
import { analyzeNutritionDocument, generateNutritionPlan } from '../services/openrouterService';


async function generateMealPlanAI(preferences: string, days: number): Promise<string> {
  if (!OPENROUTER_KEY) return '⚠️ Configura tu API key de OpenRouter en Configuración.';
  const models = ['anthropic/claude-haiku-4.5', 'anthropic/claude-3-haiku', 'google/gemini-flash-1.5'];
  for (const model of models) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'HTTP-Referer': 'https://ramongalera22-ai.github.io/FILEHUB-IA' },
        body: JSON.stringify({
          model, max_tokens: 1500,
          messages: [{ role: 'user', content: `Crea un plan de comidas de ${days} días para un médico con estas preferencias: ${preferences}. Incluye: desayuno, comida y cena para cada día, con tiempo de preparación máximo 20 min por comida. También incluye lista de la compra al final. Responde en español con emojis.` }]
        })
      });
      const d = await res.json();
      if (d.error) continue;
      const reply = d.choices?.[0]?.message?.content;
      if (reply) return reply;
    } catch { continue; }
  }
  return '⚠️ No se pudo generar el plan. Verifica tu API key.';
}

async function chatNutritionAI(messages: {role:string;content:string}[], context: string): Promise<string> {
  if (!OPENROUTER_KEY) return '⚠️ Configura VITE_OPENROUTER_KEY para usar el cuaderno IA.';
  const models = ['anthropic/claude-haiku-4.5', 'anthropic/claude-3-haiku', 'google/gemini-flash-1.5'];
  for (const model of models) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'HTTP-Referer': 'https://ramongalera22-ai.github.io/FILEHUB-IA' },
        body: JSON.stringify({
          model, max_tokens: 1500,
          messages: [
            { role: 'system', content: `Eres un nutricionista IA en FILEHUB. El usuario es médico con guardias de 24h, necesita comidas rápidas (max 20min prep).

DATOS DEL USUARIO:
${context}

INSTRUCCIONES:
- Responde en español con emojis
- Sugiere comidas prácticas y nutritivas para médicos con poco tiempo
- Ten en cuenta las guardias: post-guardia = comidas reconfortantes y energéticas
- Puedes crear menús semanales, listas de compra, analizar macros
- Si preguntan por un plato, da receta rápida con ingredientes y pasos
- Sé conciso y práctico` },
            ...messages
          ]
        })
      });
      const d = await res.json();
      if (d.error) continue;
      const reply = d.choices?.[0]?.message?.content;
      if (reply) return reply;
    } catch { continue; }
  }
  return '⚠️ No se pudo conectar. Verifica tu API key.';
}
import { supabase } from '../services/supabaseClient';
import {
  LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { BotPanelNutricion } from './BotPanel';

interface NutritionViewProps {
  weightEntries: WeightEntry[];
  nutritionPlans: NutritionPlan[];
  onAddWeightEntry: (entry: WeightEntry) => void;
  onAddPlan: (plan: NutritionPlan) => void;
  onDeletePlan: (id: string) => void;
  onUpdatePlan?: (plan: NutritionPlan) => void;
}

const NutritionView: React.FC<NutritionViewProps> = ({
  weightEntries,
  nutritionPlans,
  onAddWeightEntry,
  onAddPlan,
  onDeletePlan,
  onUpdatePlan
}) => {
  const [activeTab, setActiveTab] = useState<'planner' | 'weight' | 'files' | 'notebook'>('planner');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isUploadingPlan, setIsUploadingPlan] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [documents, setDocuments] = useState<WorkDocument[]>([]);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // AI Notebook Chat
  const [chatMsgs, setChatMsgs] = useState<{id:string;role:'user'|'assistant';content:string;ts:Date}[]>([]);
  const [chatIn, setChatIn] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => { chatRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs]);

  const nutritionContext = useMemo(() => {
    const plans = weeklyPlan.filter(d => d.meals.length > 0).map(d => `${d.day}: ${d.meals.map(m => `${m.type}=${m.title}`).join(', ')}`).join('\n');
    const weights = weightEntries.slice(-10).map(w => `${w.date}: ${w.weight}kg`).join(', ');
    return `PLAN SEMANAL:\n${plans || 'Sin plan'}\n\nPESO RECIENTE: ${weights || 'Sin datos'}\n\nOBJETIVO: ${dietGoal}\nINVENTARIO: ${inventory}`;
  }, [weeklyPlan, weightEntries, dietGoal, inventory]);

  const handleChatSend = React.useCallback(async (overrideMsg?: string) => {
    const msg = overrideMsg || chatIn.trim();
    if (!msg || chatLoading) return;
    const userMsg = { id: `nm-${Date.now()}`, role: 'user' as const, content: msg, ts: new Date() };
    setChatMsgs(prev => [...prev, userMsg]);
    setChatIn(''); setChatLoading(true);
    const history = [...chatMsgs.slice(-10), userMsg].map(m => ({ role: m.role, content: m.content }));
    const reply = await chatNutritionAI(history, nutritionContext);
    setChatMsgs(prev => [...prev, { id: `nm-${Date.now()+1}`, role: 'assistant', content: reply, ts: new Date() }]);
    setChatLoading(false);
  }, [chatIn, chatMsgs, chatLoading, nutritionContext]);

  const saveNotesAsDocument = () => {
    if (!notes.trim()) return;
    const newDoc: WorkDocument = {
      id: `nut-doc-${Date.now()}`,
      name: `Nota Nutrición ${new Date().toLocaleDateString('es-ES')}`,
      type: 'text',
      uploadDate: new Date().toISOString().split('T')[0],
      content: notes
    };
    setDocuments([...documents, newDoc]);
    setNotes('');
    setActiveTab('files'); // Switch to documents tab (Mis Planes/Documentos)
    alert('Nota guardada en Documentos');
  };

  // AI Input State
  const [inventory, setInventory] = useState('Pollo, arroz, huevos, espinacas, avena, yogur griego, manzana, nueces');
  const [dietGoal, setDietGoal] = useState('Perder grasa y ganar masa muscular magra');

  // Weekly Plan State (Currently active plan)
  const [weeklyPlan, setWeeklyPlan] = useState<DayPlan[]>([
    { day: 'Lunes', meals: [] },
    { day: 'Martes', meals: [] },
    { day: 'Miércoles', meals: [] },
    { day: 'Jueves', meals: [] },
    { day: 'Viernes', meals: [] },
    { day: 'Sábado', meals: [] },
    { day: 'Domingo', meals: [] },
  ]);

  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [isAddingMeal, setIsAddingMeal] = useState(false);
  const [newMeal, setNewMeal] = useState<Meal>({ type: 'lunch', title: '', ingredients: [] });

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

  const handleManualAddMeal = () => {
    if (selectedDayIndex === null || !newMeal.title) return;
    const updatedPlan = [...weeklyPlan];
    updatedPlan[selectedDayIndex].meals.push({ ...newMeal });
    setWeeklyPlan(updatedPlan);
    setNewMeal({ type: 'lunch', title: '', ingredients: [] });
    setIsAddingMeal(false);
  };

  const handleDeleteMeal = (dayIdx: number, mealIdx: number) => {
    const updatedPlan = [...weeklyPlan];
    updatedPlan[dayIdx].meals.splice(mealIdx, 1);
    setWeeklyPlan(updatedPlan);
  };

  const handlePlanUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploadingPlan(true);
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        let publicUrl = '';
        try {
          const { error: uploadError } = await supabase.storage
            .from('nutrition_plans')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl: url } } = supabase.storage
            .from('nutrition_plans')
            .getPublicUrl(filePath);
          publicUrl = url;
        } catch (sErr) {
          publicUrl = URL.createObjectURL(file);
        }

        onAddPlan({
          id: Date.now().toString(),
          name: file.name,
          uploadDate: new Date().toISOString().split('T')[0],
          type: file.type.includes('pdf') ? 'pdf' : 'image',
          url: publicUrl,
        });

        if (confirm("¿Quieres que la IA extraiga el menú de este archivo automáticamente?")) {
          handleFileAnalysis(file);
        }
      } catch (error: any) {
        console.error('Error uploading nutrition plan:', error);
      } finally {
        setIsUploadingPlan(false);
      }
    }
    event.target.value = '';
  };

  const handleFileAnalysis = async (file: File) => {
    setIsProcessingAI(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const extractedPlan = await analyzeNutritionDocument(base64, file.type);
        setWeeklyPlan(extractedPlan);
        alert(`Plan semanal extraído correctamente.`);
      } catch (error) {
        console.error(error);
        alert("Error analizando el documento.");
      } finally {
        setIsProcessingAI(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAIPlan = async () => {
    setIsProcessingAI(true);
    try {
      const generated = await generateNutritionPlan(inventory, dietGoal);
      setWeeklyPlan(generated);
      setShowAIModal(false);
    } catch (error) {
      console.error(error);
      alert("Error generando el plan con IA.");
    } finally {
      setIsProcessingAI(false);
    }
  };

  const sortedWeightData = useMemo(() => {
    return [...weightEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [weightEntries]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">

      <div className="px-4 pb-2 pt-4"><BotPanelNutricion /></div>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Nutrición & Salud</h2>
          <p className="text-slate-500 font-bold mt-1">Gestión inteligente de dietas y evolución física.</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
          <button onClick={() => setActiveTab('planner')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'planner' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
            Planificador
          </button>
          <button onClick={() => setActiveTab('weight')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'weight' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
            Control Peso
          </button>
          <button onClick={() => setActiveTab('files')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'files' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
            Documentos
          </button>
          <button onClick={() => setActiveTab('notebook')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'notebook' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
            Cuaderno
          </button>
        </div>
      </header>

      {activeTab === 'notebook' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          {/* AI Notebook Header */}
          <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -mr-20 -mt-20" />
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center text-3xl">🥗</div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">Cuaderno IA de Nutrición</h3>
                  <p className="text-white/60 text-sm font-bold">Claude Haiku · Conoce tu plan, peso y objetivos</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick prompts */}
          {chatMsgs.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { emoji: '📋', text: 'Créame un menú semanal saludable para esta semana' },
                { emoji: '🛒', text: 'Genera una lista de la compra basada en mi plan' },
                { emoji: '⚡', text: 'Comidas rápidas para después de una guardia de 24h' },
                { emoji: '📊', text: 'Analiza mis macros y calorías del plan actual' },
                { emoji: '🥑', text: 'Sugiéreme snacks saludables para el hospital' },
                { emoji: '🍳', text: 'Recetas batch cooking para preparar el domingo' },
              ].map((p, i) => (
                <button key={i} onClick={() => handleChatSend(p.text)}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-left hover:border-emerald-300 hover:shadow-lg transition-all group">
                  <span className="text-2xl mb-2 block">{p.emoji}</span>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 transition-colors">{p.text}</p>
                </button>
              ))}
            </div>
          )}

          {/* Chat */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col" style={{ minHeight: chatMsgs.length > 0 ? '450px' : '200px' }}>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[500px]">
              {chatMsgs.length === 0 && (
                <div className="text-center py-16">
                  <ChefHat size={36} className="mx-auto text-emerald-300 mb-4" />
                  <h4 className="font-black text-lg text-slate-800 dark:text-white mb-2">Tu nutricionista IA personal</h4>
                  <p className="text-sm text-slate-400 max-w-md mx-auto">Pregúntame sobre menús, recetas rápidas, listas de la compra o analiza tu plan nutricional.</p>
                </div>
              )}
              {chatMsgs.map(m => (
                <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-lg"><ChefHat size={14} className="text-white" /></div>}
                  <div className={`max-w-[80%] rounded-2xl px-5 py-4 ${m.role === 'user' ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200'}`}>
                    <pre className="text-sm font-sans whitespace-pre-wrap leading-relaxed break-words">{m.content}</pre>
                  </div>
                  {m.role === 'user' && <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center flex-shrink-0 mt-1"><Utensils size={14} className="text-slate-500" /></div>}
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-3"><div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-lg"><ChefHat size={14} className="text-white" /></div><div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm text-emerald-600 font-bold flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Preparando...</div></div>
              )}
              <div ref={chatRef} />
            </div>
            <div className="border-t border-slate-100 dark:border-slate-700 p-4 bg-slate-50/50 dark:bg-slate-900/30 flex gap-3">
              <textarea value={chatIn} onChange={e => setChatIn(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                placeholder="Pregunta sobre nutrición, recetas, listas de compra..."
                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none min-h-[48px] max-h-[100px]" rows={1} />
              <button onClick={() => handleChatSend()} disabled={!chatIn.trim() || chatLoading}
                className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-2xl flex items-center justify-center disabled:opacity-40 shadow-lg flex-shrink-0">
                {chatLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>

          {/* Notes section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Notas de Nutrición</h3>
              <button onClick={saveNotesAsDocument} disabled={!notes.trim()} className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all flex items-center gap-1.5 disabled:opacity-40"><FileText size={12} /> Guardar</button>
            </div>
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl focus-within:ring-4 focus-within:ring-emerald-500/10">
              <textarea className="w-full bg-transparent border-none focus:outline-none resize-none text-base font-medium leading-relaxed text-slate-100 placeholder:text-slate-600 font-serif" placeholder="Anota comidas, suplementos, sensaciones..." value={notes}
                onChange={(e) => { setNotes(e.target.value); setIsSaving(true); if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); saveTimeoutRef.current = setTimeout(() => setIsSaving(false), 1000); }} rows={6} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'planner' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-8 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                <ChefHat size={120} className="text-slate-900" />
              </div>

              <div className="flex justify-between items-center mb-6 px-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 rounded-lg"><Calendar className="text-indigo-600" size={20} /></div>
                  <h3 className="text-xl font-bold text-slate-800">Menú Semanal</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAIModal(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all shadow-lg shadow-indigo-200"
                  >
                    <Sparkles size={14} /> Generar con IA
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {weeklyPlan.map((plan, idx) => (
                  <button
                    key={plan.day}
                    onClick={() => setSelectedDayIndex(idx)}
                    className={`p-3 rounded-2xl border transition-all text-left flex flex-col h-32 relative group ${selectedDayIndex === idx
                      ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/10'
                      : 'border-slate-100 bg-slate-50/30 hover:bg-white hover:border-indigo-200 hover:shadow-md'
                      }`}
                  >
                    <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${selectedDayIndex === idx ? 'text-indigo-600' : 'text-slate-400'}`}>{plan.day.substring(0, 3)}</p>
                    <h4 className="font-bold text-slate-800 text-sm">{plan.day}</h4>

                    <div className="mt-2 space-y-1 overflow-hidden">
                      {plan.meals.slice(0, 2).map((m, mIdx) => (
                        <div key={mIdx} className="text-[8px] bg-white/70 px-1.5 py-0.5 rounded border border-slate-100 text-slate-600 font-bold truncate">
                          {m.title}
                        </div>
                      ))}
                      {plan.meals.length > 2 && <div className="text-[7px] text-slate-400 font-bold pl-1">+{plan.meals.length - 2} más</div>}
                    </div>
                    {plan.meals.length === 0 && <Utensils size={14} className="absolute bottom-3 right-3 text-slate-200" />}
                  </button>
                ))}
              </div>
            </section>

            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl flex-1 relative overflow-hidden">
                <div className="absolute -bottom-4 -right-4 text-white/5 rotate-12"><Zap size={140} /></div>

                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black">Detalle del Día</h3>
                  <button
                    onClick={() => setIsAddingMeal(true)}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-emerald-400"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                {selectedDayIndex !== null ? (
                  <div className="space-y-4 relative z-10">
                    <div className="flex items-center justify-between">
                      <h4 className="text-emerald-400 font-black uppercase tracking-widest text-[10px]">{weeklyPlan[selectedDayIndex].day}</h4>
                      <span className="text-[9px] font-bold text-slate-500">{weeklyPlan[selectedDayIndex].meals.length} comidas</span>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {weeklyPlan[selectedDayIndex].meals.length > 0 ? weeklyPlan[selectedDayIndex].meals.map((meal, i) => (
                        <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5 group relative hover:bg-white/10 transition-all">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{meal.type}</p>
                              <p className="font-bold text-sm">{meal.title}</p>
                            </div>
                            <button
                              onClick={() => handleDeleteMeal(selectedDayIndex, i)}
                              className="text-white/20 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          {meal.ingredients.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {meal.ingredients.map((ing, ingIdx) => (
                                <span key={ingIdx} className="text-[8px] bg-white/5 px-1.5 py-0.5 rounded text-slate-400 border border-white/5">{ing}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )) : (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                          <ChefHat size={40} className="mb-2 opacity-20" />
                          <p className="text-xs italic">Nada planeado hoy</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm font-medium">Selecciona un día para gestionar su menú.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'weight' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4">
          <div className="lg:col-span-8 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative">
            <div className="absolute top-6 right-10 text-[10px] font-black italic text-slate-200">HISTORIAL DE PESO</div>
            <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
              <TrendingUp className="text-emerald-600" size={24} /> Evolución Física
            </h3>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={sortedWeightData}>
                  <defs>
                    <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} domain={['dataMin - 2', 'dataMax + 2']} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'black', padding: '12px' }}
                    itemStyle={{ color: '#10b981' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#10b981"
                    strokeWidth={5}
                    dot={{ r: 5, fill: '#10b981', strokeWidth: 3, stroke: '#fff' }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100">
              <h4 className="font-black text-lg mb-6 flex items-center gap-2"><Scale size={20} /> Nuevo Registro</h4>
              <form onSubmit={handleAddWeight} className="space-y-4">
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                  <label className="text-[10px] font-black text-emerald-100 uppercase tracking-widest ml-1 mb-1 block">Fecha</label>
                  <input type="date" value={weightDate} onChange={(e) => setWeightDate(e.target.value)} className="w-full bg-transparent border-none text-white font-black outline-none [color-scheme:dark]" />
                </div>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                  <label className="text-[10px] font-black text-emerald-100 uppercase tracking-widest ml-1 mb-1 block">Peso Actual (kg)</label>
                  <input type="number" step="0.1" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} placeholder="Ej: 75.4" className="w-full bg-transparent border-none text-white font-black placeholder-white/30 outline-none" />
                </div>
                <button type="submit" className="w-full bg-white text-emerald-700 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl active:scale-95">
                  Confirmar Registro
                </button>
              </form>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h4 className="font-black text-[10px] text-slate-400 mb-6 uppercase tracking-widest">Últimos Registros</h4>
              <div className="space-y-3">
                {sortedWeightData.slice().reverse().slice(0, 5).map((entry, i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:border-emerald-200">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{entry.date}</span>
                    <span className="text-sm font-black text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-100">{entry.weight} kg</span>
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
                  <FileText className="text-indigo-600" size={24} /> Biblioteca de Dietas
                </h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Sube tus archivos PDF o capturas</p>
              </div>
              <div className="flex gap-3">
                <input
                  type="file"
                  ref={planInputRef}
                  accept=".pdf, .png, .jpg, .jpeg"
                  className="hidden"
                  onChange={handlePlanUpload}
                />
                <button
                  onClick={() => planInputRef.current?.click()}
                  disabled={isUploadingPlan}
                  className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all shadow-2xl disabled:opacity-50"
                >
                  {isUploadingPlan ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
                  {isUploadingPlan ? 'Analizando...' : 'Añadir Archivo'}
                </button>
              </div>
            </div>

            {nutritionPlans.length === 0 && documents.length === 0 ? (
              <div className="p-24 text-center border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50">
                <FileText size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">No hay documentos cargados</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Saved Notes */}
                {documents.map(doc => (
                  <div key={doc.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 group hover:shadow-xl hover:border-indigo-200 transition-all relative">
                    <div className="flex flex-col h-full">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
                        <FileText size={24} />
                      </div>
                      <h4 className="font-black text-slate-800 text-sm mb-1 truncate pr-8">{doc.name}</h4>
                      <div className="flex items-center gap-2 mb-8">
                        <span className="text-[8px] font-black uppercase tracking-tighter bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded italic">TEXTO</span>
                        <span className="text-[9px] font-bold text-slate-400">{doc.uploadDate}</span>
                      </div>
                      <div className="mt-auto">
                        <p className="text-[10px] text-slate-500 line-clamp-3 mb-4">{doc.content}</p>
                        <button
                          onClick={() => {
                            setNotes(doc.content || '');
                            setActiveTab('notebook');
                          }}
                          className="w-full py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-900 hover:text-white transition-all"
                        >
                          <Edit3 size={16} /> Editar en Cuaderno
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Uploaded Plans */}
                {nutritionPlans.map(plan => (
                  <div key={plan.id} className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 group hover:shadow-xl hover:border-indigo-200 transition-all relative">
                    <button
                      onClick={() => onDeletePlan(plan.id)}
                      className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"
                    >
                      <X size={16} />
                    </button>

                    <div className="flex flex-col h-full">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-sm ${plan.type === 'pdf' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {plan.type === 'pdf' ? <FileText size={24} /> : <Camera size={24} />}
                      </div>
                      <h4 className="font-black text-slate-800 text-sm mb-1 truncate pr-8">{plan.name}</h4>
                      <div className="flex items-center gap-2 mb-8">
                        <span className="text-[8px] font-black uppercase tracking-tighter bg-slate-200 text-slate-600 px-2 py-0.5 rounded italic">{plan.type}</span>
                        <span className="text-[9px] font-bold text-slate-400">{plan.uploadDate}</span>
                      </div>

                      <a href={plan.url} target="_blank" rel="noopener noreferrer" className="mt-auto group-hover:scale-[1.02] transition-transform">
                        <div className="w-full py-3.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-700 flex items-center justify-center gap-2 shadow-sm group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600">
                          <Eye size={16} /> Visualizar
                        </div>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL GENERACIÓN IA */}
      {showAIModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-8 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowAIModal(false)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-xl text-slate-400">
              <X size={20} />
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><BrainCircuit size={24} /></div>
              <div>
                <h3 className="text-xl font-black text-slate-900">IA Nutrition Engine</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Generación basada en datos</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Mi Despensa / Inventario</label>
                <textarea
                  value={inventory}
                  onChange={(e) => setInventory(e.target.value)}
                  placeholder="Ej: Pollo, huevos, arroz, brocoli, aguacate..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all h-32 resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Objetivo y Preferencias</label>
                <input
                  type="text"
                  value={dietGoal}
                  onChange={(e) => setDietGoal(e.target.value)}
                  placeholder="Ej: Bajada de peso, dieta keto, 2000 kcal..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                <p className="text-[10px] text-indigo-700 font-bold flex items-center gap-2">
                  <Sparkles size={12} /> La IA optimizará las recetas priorizando tus ingredientes actuales.
                </p>
              </div>

              <button
                onClick={handleGenerateAIPlan}
                disabled={isProcessingAI}
                className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-3 transition-all"
              >
                {isProcessingAI ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {isProcessingAI ? 'Generando Menú Semanal...' : 'Iniciar Generación IA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AÑADIR COMIDA MANUAL */}
      {isAddingMeal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative">
            <h3 className="text-xl font-black mb-6">Añadir Comida</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 mb-2 block tracking-widest">TIPO</label>
                <select
                  value={newMeal.type}
                  onChange={(e) => setNewMeal({ ...newMeal, type: e.target.value as Meal['type'] })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-bold outline-none"
                >
                  <option value="breakfast">Desayuno</option>
                  <option value="snack">Snack / Media Mañana</option>
                  <option value="lunch">Almuerzo / Comida</option>
                  <option value="snack">Merienda</option>
                  <option value="dinner">Cena</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 mb-2 block tracking-widest">PLATO</label>
                <input
                  type="text"
                  value={newMeal.title}
                  onChange={(e) => setNewMeal({ ...newMeal, title: e.target.value })}
                  placeholder="Ej: Pechuga con arroz"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 mb-2 block tracking-widest">INGREDIENTES (separados por coma)</label>
                <input
                  type="text"
                  onChange={(e) => setNewMeal({ ...newMeal, ingredients: e.target.value.split(',').map(i => i.trim()) })}
                  placeholder="Ej: Pollo, arroz, aceite de oliva"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm font-bold outline-none"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button onClick={() => setIsAddingMeal(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold text-xs">Cancelar</button>
                <button onClick={handleManualAddMeal} className="flex-2 bg-indigo-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest">Añadir</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NutritionView;
