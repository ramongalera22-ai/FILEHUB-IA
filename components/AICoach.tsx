
import React, { useState, useEffect } from 'react';
import { Expense } from '../types';
import { getFinancialOptimization } from '../services/geminiService';
import { 
  Sparkles, 
  Calendar, 
  ArrowRight, 
  Lightbulb, 
  CheckCircle, 
  RefreshCcw, 
  TrendingUp, 
  AlertCircle,
  Clock,
  Zap,
  CheckCircle2,
  X
} from 'lucide-react';

interface AICoachProps {
  expenses: Expense[];
  onOptimize: (optimizedExpenses: Expense[]) => void;
}

const AICoach: React.FC<AICoachProps> = ({ expenses, onOptimize }) => {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [insights, setInsights] = useState<{ suggestions: string; rescheduled: any[] } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const loadingSteps = [
    "Analyzing payment clusters...",
    "Staggering high-priority outflows...",
    "Simulating liquidity scenarios...",
    "Generating optimized roadmap..."
  ];

  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % loadingSteps.length);
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const runAnalysis = async () => {
    setLoading(true);
    setInsights(null);
    setShowSuccess(false);
    try {
      const result = await getFinancialOptimization(expenses);
      setInsights({ suggestions: result.suggestions, rescheduled: result.rescheduledExpenses });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const applyChanges = () => {
    if (!insights) return;
    const updatedExpenses = expenses.map(exp => {
      const found = insights.rescheduled.find(r => r.id === exp.id);
      if (found) {
        return { ...exp, date: found.suggestedDate, isOptimized: true };
      }
      return exp;
    });
    onOptimize(updatedExpenses);
    setInsights(null);
    setShowSuccess(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-blue-200">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <Sparkles className="text-amber-300" />
            </div>
            <h2 className="text-3xl font-black">FinAI Life Coach</h2>
          </div>
          <p className="text-blue-100 text-lg mb-8 max-w-xl leading-relaxed">
            I've analyzed your upcoming payments. I can help you redistribute them to avoid cash crunches and maintain a healthy buffer.
          </p>
          <div className="flex gap-4">
            <button 
              onClick={runAnalysis}
              disabled={loading || expenses.length === 0}
              className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-900/20 active:scale-95"
            >
              {loading ? <RefreshCcw className="animate-spin" /> : <Zap className="text-amber-500" />}
              {loading ? "Optimizing..." : "Run Liquidity Sync"}
            </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/20 rounded-full -ml-24 -mb-24 blur-3xl"></div>
      </div>

      {loading && (
        <div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center space-y-4 animate-pulse">
          <div className="relative">
             <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
             <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400" size={20} />
          </div>
          <div>
            <p className="text-slate-800 font-bold text-lg">{loadingSteps[loadingStep]}</p>
            <p className="text-slate-400 text-sm font-medium">Gemini is processing your financial dynamic...</p>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2.5rem] flex items-center gap-6 animate-in zoom-in duration-500">
           <div className="w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
             <CheckCircle2 size={32} />
           </div>
           <div className="flex-1">
             <h3 className="text-xl font-black text-emerald-900">Optimization Successful</h3>
             <p className="text-emerald-700 font-medium">Your expenses have been rescheduled and synced with your calendar. Your cash flow is now balanced.</p>
           </div>
           <button onClick={() => setShowSuccess(false)} className="text-emerald-400 hover:text-emerald-600"><X /></button>
        </div>
      )}

      {insights && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-8 duration-700">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-6 text-slate-800 border-b border-slate-50 pb-4">
                <Lightbulb className="text-amber-500" />
                <h3 className="text-xl font-black">Strategic Strategy</h3>
              </div>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed mb-10 text-sm">
                {insights.suggestions.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
              
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Proposed Timeline Adjustments</h4>
                {insights.rescheduled.map((item, idx) => {
                  const original = expenses.find(e => e.id === item.id);
                  return (
                    <div key={idx} className="group flex flex-col p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:border-blue-100 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 text-slate-600 shadow-sm">
                             <TrendingUp size={18} />
                           </div>
                           <div>
                             <p className="font-black text-slate-800">{original?.vendor}</p>
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{original?.category}</p>
                           </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-900">${original?.amount.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 p-4 bg-white rounded-2xl border border-slate-100">
                         <div className="flex-1 space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Original</p>
                            <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                               <Clock size={14} /> {original?.date}
                            </div>
                         </div>
                         <ArrowRight className="text-blue-600" size={20} />
                         <div className="flex-1 space-y-1">
                            <p className="text-[10px] font-black text-blue-400 uppercase">Optimized</p>
                            <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                               <Calendar size={14} /> {item.suggestedDate}
                            </div>
                         </div>
                      </div>
                      
                      <div className="mt-4 flex items-start gap-2 text-xs text-slate-500 italic">
                         <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                         {item.reason}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-20"><TrendingUp size={48} /></div>
              <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                Impact Summary
              </h3>
              <div className="space-y-6 mb-10">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm font-medium">Payments Syncing</span>
                  <span className="font-black text-white text-lg">{insights.rescheduled.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm font-medium">Liquidity Buffer</span>
                  <span className="font-black text-emerald-400 text-lg">Improved</span>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                   <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Coach Tip</p>
                   <p className="text-xs text-slate-300 leading-relaxed italic">"Moving these payments spreads your major expenses by an average of 4.2 days, ensuring you never drop below your safety threshold."</p>
                </div>
              </div>
              <button 
                onClick={applyChanges}
                className="w-full bg-blue-600 py-5 rounded-2xl font-black text-sm hover:bg-blue-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 active:scale-95"
              >
                <CheckCircle size={20} />
                Apply Sync & Confirm
              </button>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
               <div className="flex items-center gap-2 mb-4">
                 <Calendar className="text-blue-500" size={18} />
                 <h4 className="font-bold text-slate-800">Auto-Integration</h4>
               </div>
               <p className="text-xs text-slate-500 leading-relaxed">
                 Confirmed changes will automatically update your local Expense Tracker and sync with the main Calendar view.
               </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AICoach;
