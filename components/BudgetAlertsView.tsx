import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Bell, Plus, Trash2, TrendingUp, AlertTriangle, Check, Upload, FileText,
  DollarSign, Target, BarChart3, Zap, Settings, BellOff, BellRing, Loader2,
  ArrowUpRight, ArrowDownRight, Lightbulb, ChevronDown, ChevronUp, Eye,
  PieChart as PieChartIcon, Sparkles, RefreshCw, X
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { Expense } from '../types';
import { BudgetAlert, requestNotificationPermission, showLocalNotification, getNotificationPermission } from '../services/notificationService';
import { supabase } from '../services/supabaseClient';
import { callAI } from '../services/aiProxy';

interface BudgetAlertsViewProps { expenses: Expense[]; session?: any; }

const EXPENSE_CATEGORIES = ['Alimentación','Transporte','Vivienda','Ocio','Salud','Ropa','Tecnología','Educación','Restaurantes','Suscripciones','General'];
const CATEGORY_ICONS: Record<string,string> = { 'Alimentación':'🛒','Transporte':'🚗','Vivienda':'🏠','Ocio':'🎬','Salud':'💊','Ropa':'👕','Tecnología':'💻','Educación':'📚','Restaurantes':'🍽️','Suscripciones':'🔄','General':'📦','Nómina':'💰','Transferencia':'🔁','Ahorro':'🏦' };
const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#06b6d4','#84cc16'];

interface ParsedTx { id:string; amount:number; type:'income'|'expense'; category:string; vendor:string; date:string; description:string; }
interface AIAdvice { title:string; description:string; priority:'critical'|'high'|'medium'|'low'; savings?:string; icon:string; }

const BudgetAlertsView: React.FC<BudgetAlertsViewProps> = ({ expenses, session }) => {
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default');
  const [form, setForm] = useState({ category:'Alimentación', limit:200, period:'monthly' as const, notify:true });
  const [tab, setTab] = useState<'overview'|'upload'|'advice'>('overview');
  const [uploading, setUploading] = useState(false);
  const [parsedTx, setParsedTx] = useState<ParsedTx[]>([]);
  const [showTx, setShowTx] = useState(false);
  const [advice, setAdvice] = useState<AIAdvice[]>([]);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [adviceReady, setAdviceReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ─── Cloud Sync helpers ───
  const cloudSave = async (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
    if (session?.user?.id) {
      try {
        await supabase.from('user_data').upsert(
          { user_id: session.user.id, key, value: JSON.stringify(value), updated_at: new Date().toISOString() },
          { onConflict: 'user_id,key' }
        );
      } catch (e) { console.warn('Budget cloud save failed:', e); }
    }
  };

  const cloudLoad = async (key: string): Promise<any | null> => {
    // Try cloud first
    if (session?.user?.id) {
      try {
        const { data } = await supabase.from('user_data').select('value').eq('user_id', session.user.id).eq('key', key).maybeSingle();
        if (data?.value) {
          const parsed = JSON.parse(data.value);
          localStorage.setItem(key, JSON.stringify(parsed)); // sync to local
          return parsed;
        }
      } catch {}
    }
    // Fallback to localStorage
    try { const s = localStorage.getItem(key); if (s) return JSON.parse(s); } catch {}
    return null;
  };

  // ─── Load data on mount ───
  useEffect(() => {
    setNotifPerm(getNotificationPermission());
    (async () => {
      const [a, tx, adv] = await Promise.all([
        cloudLoad('filehub_budget_alerts'),
        cloudLoad('filehub_parsed_tx'),
        cloudLoad('filehub_budget_advice'),
      ]);
      if (a) setAlerts(a);
      if (tx) setParsedTx(tx);
      if (adv) { setAdvice(adv); setAdviceReady(true); }
    })();
  }, [session]);

  const persist = (u: BudgetAlert[]) => { setAlerts(u); cloudSave('filehub_budget_alerts', u); };
  const persistTx = (tx: ParsedTx[]) => { setParsedTx(tx); cloudSave('filehub_parsed_tx', tx); };
  const persistAdvice = (a: AIAdvice[]) => { setAdvice(a); setAdviceReady(true); cloudSave('filehub_budget_advice', a); };
  const addAlert = () => { if(alerts.some(a=>a.category===form.category)) return; persist([...alerts, { id:`alert_${Date.now()}`, ...form }]); setShowForm(false); };
  const deleteAlert = (id:string) => persist(alerts.filter(a=>a.id!==id));

  // ─── Upload ───
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if(!file) return;
    setUploading(true); setTab('upload');
    try {
      let content = '';
      const isText = file.name.match(/\.(csv|txt)$/i);
      if(isText) { content = (await file.text()).slice(0, 8000); }
      else {
        const reader = new FileReader();
        const b64 = await new Promise<string>((res,rej) => { reader.onload=()=>res((reader.result as string).split(',')[1]); reader.onerror=rej; reader.readAsDataURL(file); });
        content = `[Documento ${file.type} en base64, ${(b64.length/1024).toFixed(0)}KB. Analiza el contenido.]`;
      }

      const result = await callAI([{ role:'user', content: `Analiza este extracto bancario/financiero (${file.name}, ${file.type}):\n\n${content.slice(0,6000)}\n\nExtrae TODAS las transacciones.` }], {
        system: `Eres analista financiero. Extrae transacciones de documentos bancarios. RESPONDE SOLO JSON:
{"transactions":[{"amount":45.5,"type":"expense","category":"Alimentación","vendor":"Mercadona","date":"2026-04-01","description":"Compra"}],"summary":{"totalIncome":2100,"totalExpenses":850}}
Categorías: ${EXPENSE_CATEGORIES.join(', ')}, Nómina, Transferencia, Ahorro. Fecha actual: ${new Date().toISOString().split('T')[0]}.`, maxTokens: 3000
      });

      const clean = result.replace(/```json\n?|\n?```/g,'').trim();
      const parsed = JSON.parse(clean);
      const txs: ParsedTx[] = (parsed.transactions||[]).map((t:any,i:number) => ({
        id:`tx-${Date.now()}-${i}`, amount:Math.abs(t.amount||0), type:t.type||'expense',
        category:t.category||'General', vendor:t.vendor||'Desconocido',
        date:t.date||new Date().toISOString().split('T')[0], description:t.description||''
      }));
      const merged = [...parsedTx, ...txs];
      setParsedTx(merged);
      persistTx(merged);
    } catch(err:any) { alert('Error: '+(err.message||'Formato no reconocido')); }
    finally { setUploading(false); if(fileRef.current) fileRef.current.value=''; }
  };

  const clearTx = () => { setParsedTx([]); cloudSave('filehub_parsed_tx', []); };

  // ─── AI Advice ───
  const generateAdvice = async () => {
    setAdviceLoading(true); setTab('advice');
    try {
      const allExp = [...expenses.map(e=>({amount:Math.abs(e.amount),category:e.category,vendor:e.vendor})), ...parsedTx.filter(t=>t.type==='expense').map(t=>({amount:t.amount,category:t.category,vendor:t.vendor}))];
      const cats: Record<string,number> = {}; allExp.forEach(e=>{ cats[e.category]=(cats[e.category]||0)+e.amount; });
      const vendors: Record<string,number> = {}; allExp.forEach(e=>{ vendors[e.vendor]=(vendors[e.vendor]||0)+e.amount; });
      const totalExp = allExp.reduce((s,e)=>s+e.amount,0);
      const totalInc = parsedTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);

      const result = await callAI([{ role:'user', content: `Datos financieros de Carlos (médico residente, ~€1800/mes, se muda a Barcelona sept 2026, deudas pendientes):
- Gasto total: €${totalExp.toFixed(0)}, Ingresos: €${totalInc.toFixed(0)}
- Por categoría: ${Object.entries(cats).sort(([,a],[,b])=>b-a).map(([c,v])=>`${c}: €${v.toFixed(0)}`).join(', ')}
- Top comercios: ${Object.entries(vendors).sort(([,a],[,b])=>b-a).slice(0,8).map(([v,a])=>`${v}: €${a.toFixed(0)}`).join(', ')}
- Límites: ${alerts.map(a=>`${a.category}: €${a.limit}`).join(', ')||'ninguno'}

Genera EXACTAMENTE 5 consejos de MAYOR a MENOR prioridad. Sé MUY concreto con números y acciones específicas.` }], {
        system: `Asesor financiero experto. RESPONDE SOLO JSON array:
[{"title":"Título","description":"Explicación concreta con cifras","priority":"critical","savings":"€50-100/mes","icon":"🔴"}]
Prioridades: critical(🔴), high(🟠), medium(🟡), low(🟢). Solo JSON.`, maxTokens: 1500
      });
      const clean = result.replace(/```json\n?|\n?```/g,'').trim();
      const parsed: AIAdvice[] = JSON.parse(clean);
      setAdvice(parsed); setAdviceReady(true);
      persistAdvice(parsed);
    } catch(e:any) { console.error(e); }
    finally { setAdviceLoading(false); }
  };

  // ─── Computed ───
  const now = new Date();
  const monthSpend = useMemo(() => {
    const m: Record<string,number> = {};
    [...expenses, ...parsedTx.filter(t=>t.type==='expense')].forEach(e => {
      const d = new Date(e.date);
      if(d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear())
        m[e.category] = (m[e.category]||0) + Math.abs(e.amount);
    });
    return m;
  }, [expenses, parsedTx]);

  const alertStatus = useMemo(() => alerts.map(a => {
    const spent = monthSpend[a.category]||0;
    const pct = a.limit>0 ? Math.min((spent/a.limit)*100,100) : 0;
    return { ...a, spent, pct, isOver:spent>=a.limit, isWarning:spent>=a.limit*0.9&&spent<a.limit };
  }), [alerts, monthSpend]);

  const totalSpent = Object.values(monthSpend).reduce((s,v)=>s+v,0);
  const totalIncome = parsedTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const overCount = alertStatus.filter(a=>a.isOver).length;

  const catChart = useMemo(() => Object.entries(monthSpend).map(([name,value])=>({name,value:Math.round(value)})).sort((a,b)=>b.value-a.value).slice(0,8), [monthSpend]);
  const dailyChart = useMemo(() => {
    const d: Record<string,number> = {};
    [...expenses.map(e=>({date:e.date,amount:Math.abs(e.amount)})), ...parsedTx.filter(t=>t.type==='expense').map(t=>({date:t.date,amount:t.amount}))].forEach(t=>{ d[t.date]=(d[t.date]||0)+t.amount; });
    return Object.entries(d).sort(([a],[b])=>a.localeCompare(b)).slice(-30).map(([date,amount])=>({ date:new Date(date).toLocaleDateString('es-ES',{day:'2-digit',month:'short'}), gasto:Math.round(amount) }));
  }, [expenses, parsedTx]);

  const PRI: Record<string,{bg:string;border:string;text:string;badge:string}> = {
    critical:{bg:'bg-red-50 dark:bg-red-500/10',border:'border-red-200 dark:border-red-500/30',text:'text-red-700 dark:text-red-400',badge:'bg-red-500'},
    high:{bg:'bg-orange-50 dark:bg-orange-500/10',border:'border-orange-200 dark:border-orange-500/30',text:'text-orange-700 dark:text-orange-400',badge:'bg-orange-500'},
    medium:{bg:'bg-amber-50 dark:bg-amber-500/10',border:'border-amber-200 dark:border-amber-500/30',text:'text-amber-700 dark:text-amber-400',badge:'bg-amber-500'},
    low:{bg:'bg-emerald-50 dark:bg-emerald-500/10',border:'border-emerald-200 dark:border-emerald-500/30',text:'text-emerald-700 dark:text-emerald-400',badge:'bg-emerald-500'},
  };

  return (
    <div className="space-y-6 pb-20 p-4 md:p-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Target size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Control de Presupuesto</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Alertas · Análisis IA · Extractos</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={()=>fileRef.current?.click()} disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 text-xs disabled:opacity-50">
            {uploading?<Loader2 size={14} className="animate-spin"/>:<Upload size={14}/>} {uploading?'Analizando...':'Subir extracto'}
          </button>
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png" onChange={handleUpload}/>
          <button onClick={()=>setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg text-xs">
            <Plus size={14}/> Límite
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-slate-800 p-1 rounded-2xl border border-slate-100 dark:border-slate-700 gap-1">
        {([['overview','Resumen',BarChart3],['upload',`Extractos${parsedTx.length?` (${parsedTx.length})`:''}`,FileText],['advice',`Consejos${advice.length?` (${advice.length})`:''}`,Lightbulb]] as [typeof tab,string,any][]).map(([id,label,Icon])=>(
          <button key={id} onClick={()=>setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${tab===id?'bg-emerald-600 text-white shadow-md':'text-slate-400 hover:text-slate-600'}`}>
            <Icon size={14}/> {label}
          </button>
        ))}
      </div>

      {/* Notif banner */}
      {notifPerm!=='granted' && (
        <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-200 dark:border-amber-500/20 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BellRing size={18} className="text-amber-500 shrink-0"/>
            <div>
              <p className="font-bold text-sm text-amber-700 dark:text-amber-400">Activa notificaciones push</p>
              <p className="text-xs text-amber-600/70">Alertas al superar el 90% de un límite</p>
            </div>
          </div>
          {notifPerm!=='denied' && <button onClick={async()=>{const ok=await requestNotificationPermission();setNotifPerm(ok?'granted':'denied');}} className="px-4 py-2 bg-amber-500 text-white font-bold text-sm rounded-xl">Activar</button>}
        </div>
      )}

      {/* ═══ OVERVIEW ═══ */}
      {tab==='overview' && (<div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Ingresos</p>
            <p className="text-2xl font-black text-emerald-600">€{totalIncome.toLocaleString()}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1"><ArrowUpRight size={10} className="text-emerald-500"/> detectados</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Gastos</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white">€{totalSpent.toFixed(0)}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1"><ArrowDownRight size={10} className="text-red-400"/> este mes</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Balance</p>
            <p className={`text-2xl font-black ${(totalIncome-totalSpent)>=0?'text-emerald-600':'text-red-500'}`}>€{(totalIncome-totalSpent).toFixed(0)}</p>
            <p className="text-xs text-slate-500">{(totalIncome-totalSpent)>=0?'superávit':'déficit'}</p>
          </div>
          <div className={`rounded-2xl border p-4 ${overCount>0?'bg-red-50 dark:bg-red-500/10 border-red-200':'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200'}`}>
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Alertas</p>
            <p className={`text-2xl font-black ${overCount>0?'text-red-500':'text-emerald-600'}`}>{overCount}</p>
            <p className="text-xs text-slate-500">{overCount>0?'sobre límite':'todo bien'}</p>
          </div>
        </div>

        {/* Charts */}
        {(catChart.length>0||dailyChart.length>0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {catChart.length>0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 h-[300px]">
                <h4 className="text-xs font-black text-slate-500 uppercase mb-3 flex items-center gap-2"><PieChartIcon size={13}/> Por Categoría</h4>
                <ResponsiveContainer width="100%" height="85%">
                  <PieChart><Pie data={catChart} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {catChart.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie><Tooltip contentStyle={{borderRadius:12,border:'none',fontSize:12}} formatter={(v:number)=>[`€${v}`,'Gasto']}/><Legend verticalAlign="bottom" height={30} iconType="circle" iconSize={8}/></PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {dailyChart.length>0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 h-[300px]">
                <h4 className="text-xs font-black text-slate-500 uppercase mb-3 flex items-center gap-2"><TrendingUp size={13}/> Tendencia</h4>
                <ResponsiveContainer width="100%" height="85%">
                  <AreaChart data={dailyChart}>
                    <defs><linearGradient id="gG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/><XAxis dataKey="date" tick={{fontSize:9}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`€${v}`}/>
                    <Tooltip contentStyle={{borderRadius:12,border:'none'}} formatter={(v:number)=>[`€${v}`,'Gasto']}/><Area type="monotone" dataKey="gasto" stroke="#6366f1" strokeWidth={2} fill="url(#gG)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Add alert form */}
        {showForm && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-emerald-400/40 shadow-xl p-6 space-y-4">
            <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2"><Target size={16} className="text-emerald-500"/> Nuevo límite</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Categoría</label>
                <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-bold">
                  {EXPENSE_CATEGORIES.map(c=><option key={c} value={c}>{CATEGORY_ICONS[c]||'📦'} {c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Límite (€)</label>
                <input type="number" value={form.limit} onChange={e=>setForm({...form,limit:+e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-bold"/>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={addAlert} className="flex-1 bg-emerald-600 text-white font-black py-3 rounded-xl shadow-lg">✓ Crear</button>
              <button onClick={()=>setShowForm(false)} className="px-4 bg-slate-100 dark:bg-slate-700 text-slate-500 font-bold rounded-xl">Cancelar</button>
            </div>
          </div>
        )}

        {/* Budget bars */}
        {alertStatus.length>0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-500 uppercase flex items-center gap-2"><Target size={12}/> Límites Activos</h4>
            {alertStatus.sort((a,b)=>b.pct-a.pct).map(a=>(
              <div key={a.id} className={`bg-white dark:bg-slate-800 rounded-2xl border overflow-hidden ${a.isOver?'border-red-300 dark:border-red-500/40':a.isWarning?'border-amber-300':'border-slate-200 dark:border-slate-700'}`}>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700"><div className={`h-full transition-all duration-700 ${a.isOver?'bg-red-500':a.isWarning?'bg-amber-500':'bg-emerald-500'}`} style={{width:`${Math.min(a.pct,100)}%`}}/></div>
                <div className="p-4 flex items-center gap-4">
                  <span className="text-2xl shrink-0">{CATEGORY_ICONS[a.category]||'📦'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1"><p className="font-black text-sm text-slate-800 dark:text-white">{a.category}</p><span className={`text-sm font-black ${a.isOver?'text-red-500':a.isWarning?'text-amber-500':'text-emerald-600'}`}>{Math.round(a.pct)}%</span></div>
                    <p className="text-xs text-slate-500"><span className="font-bold text-slate-700 dark:text-slate-200">€{a.spent.toFixed(0)}</span> de €{a.limit} · {a.isOver?<span className="text-red-500 font-bold">+€{(a.spent-a.limit).toFixed(0)}</span>:<span className="text-emerald-600 font-bold">€{(a.limit-a.spent).toFixed(0)} libre</span>}</p>
                  </div>
                  <button onClick={()=>deleteAlert(a.id)} className="p-2 text-slate-400 hover:text-red-500 rounded-xl"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI CTA */}
        <button onClick={generateAdvice} disabled={adviceLoading}
          className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg shadow-violet-500/20 hover:opacity-90 disabled:opacity-60">
          {adviceLoading?<Loader2 size={18} className="animate-spin"/>:<Sparkles size={18}/>}
          {adviceLoading?'Analizando...':adviceReady?'🔄 Regenerar Consejos IA':'✨ Generar Consejos IA'}
        </button>
      </div>)}

      {/* ═══ UPLOAD ═══ */}
      {tab==='upload' && (<div className="space-y-6">
        <div onClick={()=>fileRef.current?.click()} className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-10 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 transition-all">
          {uploading?(
            <div className="flex flex-col items-center gap-3"><Loader2 size={40} className="text-indigo-500 animate-spin"/><p className="font-black text-slate-700 dark:text-white">Analizando con IA...</p><p className="text-xs text-slate-400">Extrayendo transacciones</p></div>
          ):(
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-500/20 rounded-2xl flex items-center justify-center"><Upload size={28} className="text-indigo-500"/></div>
              <p className="font-black text-slate-700 dark:text-white">Sube un extracto bancario</p>
              <p className="text-xs text-slate-400">PDF, Excel, CSV o imagen (JPG/PNG)</p>
              <div className="flex gap-2 mt-2">{['PDF','XLSX','CSV','JPG'].map(f=><span key={f} className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-lg">{f}</span>)}</div>
            </div>
          )}
        </div>

        {parsedTx.length>0 && (<>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2"><Check size={16} className="text-emerald-500"/> {parsedTx.length} transacciones</h4>
            <div className="flex gap-2">
              <button onClick={()=>setShowTx(!showTx)} className="text-xs font-bold text-indigo-500 flex items-center gap-1"><Eye size={12}/> {showTx?'Ocultar':'Ver'}</button>
              <button onClick={clearTx} className="text-xs font-bold text-red-400 flex items-center gap-1"><Trash2 size={12}/> Limpiar</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 p-4">
              <p className="text-xs font-black text-emerald-600 uppercase">Ingresos</p>
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">€{parsedTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0).toFixed(0)}</p>
              <p className="text-[10px] text-emerald-500">{parsedTx.filter(t=>t.type==='income').length} movimientos</p>
            </div>
            <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-200 dark:border-red-500/20 p-4">
              <p className="text-xs font-black text-red-600 uppercase">Gastos</p>
              <p className="text-2xl font-black text-red-700 dark:text-red-400">€{parsedTx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0).toFixed(0)}</p>
              <p className="text-[10px] text-red-500">{parsedTx.filter(t=>t.type==='expense').length} movimientos</p>
            </div>
          </div>

          {catChart.length>0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 h-[280px]">
              <h4 className="text-xs font-black text-slate-500 uppercase mb-2">Desglose</h4>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={catChart} layout="vertical" margin={{left:10}}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0"/>
                  <XAxis type="number" tick={{fontSize:10}} tickFormatter={v=>`€${v}`}/><YAxis type="category" dataKey="name" tick={{fontSize:10}} width={80}/>
                  <Tooltip contentStyle={{borderRadius:12,border:'none'}} formatter={(v:number)=>[`€${v}`,'Gasto']}/>
                  <Bar dataKey="value" radius={[0,6,6,0]} barSize={18}>{catChart.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {showTx && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                {parsedTx.sort((a,b)=>b.date.localeCompare(a.date)).map(tx=>(
                  <div key={tx.id} className="p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <span className="text-lg shrink-0">{CATEGORY_ICONS[tx.category]||'📦'}</span>
                    <div className="flex-1 min-w-0"><p className="text-xs font-bold text-slate-800 dark:text-white truncate">{tx.vendor}</p><p className="text-[10px] text-slate-400">{tx.date} · {tx.category}</p></div>
                    <span className={`text-sm font-black ${tx.type==='income'?'text-emerald-600':'text-red-500'}`}>{tx.type==='income'?'+':'-'}€{tx.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>)}
      </div>)}

      {/* ═══ ADVICE ═══ */}
      {tab==='advice' && (<div className="space-y-6">
        {!adviceReady && !adviceLoading && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-violet-100 dark:bg-violet-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4"><Lightbulb size={36} className="text-violet-500"/></div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Análisis IA Personalizado</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">La IA analizará tus gastos y extractos para darte consejos concretos por prioridad.</p>
            <button onClick={generateAdvice} className="px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black rounded-2xl shadow-lg flex items-center gap-3 mx-auto"><Sparkles size={18}/> Generar Consejos</button>
          </div>
        )}
        {adviceLoading && (
          <div className="text-center py-16"><Loader2 size={40} className="text-violet-500 animate-spin mx-auto mb-4"/><p className="font-bold text-slate-600 dark:text-slate-300">Analizando finanzas con IA...</p></div>
        )}
        {adviceReady && advice.length>0 && (<>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2"><Sparkles size={16} className="text-violet-500"/> {advice.length} Recomendaciones (Mayor → Menor)</h4>
            <button onClick={generateAdvice} disabled={adviceLoading} className="text-xs font-bold text-violet-500 flex items-center gap-1"><RefreshCw size={12}/> Regenerar</button>
          </div>
          <div className="space-y-3">
            {advice.map((a,i)=>{const s=PRI[a.priority]||PRI.medium; return (
              <div key={i} className={`${s.bg} rounded-2xl border ${s.border} p-5 hover:shadow-md transition-all`}>
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-1 shrink-0"><span className="text-2xl">{a.icon}</span><span className={`text-[9px] font-black uppercase ${s.text}`}>#{i+1}</span></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h5 className={`font-black text-sm ${s.text}`}>{a.title}</h5>
                      <span className={`${s.badge} text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase`}>{a.priority}</span>
                      {a.savings && <span className="text-[10px] font-black bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 px-2 py-0.5 rounded-full">💰 {a.savings}</span>}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{a.description}</p>
                  </div>
                </div>
              </div>
            );})}
          </div>
        </>)}
      </div>)}
    </div>
  );
};

export default BudgetAlertsView;
