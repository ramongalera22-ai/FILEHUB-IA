
import React, { useState } from 'react';
import { Idea } from '../types';
import { 
  Lightbulb, 
  Plus, 
  Trash2, 
  Search, 
  Brain, 
  Sparkles,
  X,
  Loader2,
  Zap,
  Edit3
} from 'lucide-react';
import { getIdeaInspiration } from '../services/openrouterService';
import { BotPanelIdeas } from './BotPanel';

interface IdeasViewProps {
  ideas: Idea[];
  onAddIdea: (idea: Idea) => void;
  onDeleteIdea: (id: string) => void;
  onUpdateIdea: (idea: Idea) => void;
}

const IdeasView: React.FC<IdeasViewProps> = ({ ideas, onAddIdea, onDeleteIdea, onUpdateIdea }) => {
  const [quickTitle, setQuickTitle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    const newIdea: Idea = {
      id: Date.now().toString(),
      title: quickTitle,
      description: '',
      category: 'General',
      priority: 'medium',
      status: 'draft',
      createdAt: new Date().toISOString().split('T')[0]
    };
    onAddIdea(newIdea);
    setQuickTitle('');
  };

  const handleGetInspiration = async () => {
    if (ideas.length === 0) return;
    setIsGenerating(true);
    try {
      const res = await getIdeaInspiration(ideas[0], ideas);
      setAiResponse(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredIdeas = ideas.filter(idea => {
    const matchesSearch = idea.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || idea.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">

      <div className="px-4 pb-2 pt-4"><BotPanelIdeas /></div>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Laboratorio de Ideas</h2>
          <p className="text-slate-500 font-bold mt-1">Captura y evoluciona tus proyectos antes de ejecutarlos.</p>
        </div>
        <div className="bg-indigo-50 px-6 py-3 rounded-2xl flex items-center gap-3 border border-indigo-100">
           <Brain className="text-indigo-600" size={20} />
           <span className="text-sm font-black text-indigo-900">{ideas.length} Ideas Guardadas</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">
          {/* Input Section */}
          <section className="bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-2">
             <div className="p-4 bg-slate-50 rounded-2xl">
                <Lightbulb className="text-amber-500" size={24} />
             </div>
             <form onSubmit={handleQuickAdd} className="flex-1 flex gap-2 mr-2">
                <input 
                  type="text" 
                  placeholder="Tengo una idea para..." 
                  value={quickTitle} 
                  onChange={(e) => setQuickTitle(e.target.value)} 
                  className="flex-1 bg-transparent border-none outline-none font-bold text-slate-700 placeholder-slate-300 text-lg px-2" 
                />
                <button type="submit" className="bg-slate-900 text-white p-4 rounded-xl font-black hover:bg-slate-700 transition-all shadow-lg">
                  <Plus size={20} />
                </button>
             </form>
          </section>

          {/* List Section */}
          <section className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
            <div className="p-8 border-b border-slate-50 bg-slate-50/20 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="relative w-full md:w-auto group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-2 text-sm font-bold outline-none" />
              </div>
              <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-full">
                {['all', 'draft', 'brainstorming', 'approved'].map(f => (
                  <button key={f} onClick={() => setSelectedFilter(f)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${selectedFilter === f ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-400 hover:text-slate-600'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
               {filteredIdeas.map(idea => (
                 <div key={idea.id} className="p-6 bg-white border border-slate-100 rounded-[2rem] hover:border-indigo-200 hover:shadow-md transition-all group relative">
                    <div className="flex justify-between items-start mb-4">
                       <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                         idea.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                       }`}>
                         {idea.status}
                       </span>
                       <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="text-slate-300 hover:text-indigo-600"><Edit3 size={16}/></button>
                          <button onClick={() => onDeleteIdea(idea.id)} className="text-slate-300 hover:text-red-600"><Trash2 size={16}/></button>
                       </div>
                    </div>
                    <h4 className="font-bold text-slate-800 text-lg mb-2">{idea.title}</h4>
                    <p className="text-xs text-slate-400 font-medium">{idea.createdAt}</p>
                 </div>
               ))}
               {filteredIdeas.length === 0 && <p className="col-span-full text-center py-20 text-slate-300 font-bold uppercase text-xs">Sin resultados</p>}
            </div>
          </section>
        </div>

        <div className="lg:col-span-4 space-y-8">
           <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white shadow-2xl border border-indigo-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-5"><Sparkles size={150} /></div>
              <div className="relative z-10">
                 <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl mb-8">
                    <Brain size={40} />
                 </div>
                 <h3 className="text-2xl font-black mb-4">AI Inspiration Hub</h3>
                 <p className="text-indigo-100 font-medium text-xs leading-relaxed mb-10">
                    ¿Bloqueado? Gemini puede expandir tus ideas y evaluar su viabilidad.
                 </p>
                 <button 
                  onClick={handleGetInspiration}
                  disabled={isGenerating || ideas.length === 0}
                  className="w-full py-5 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                    {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                    Generar Inspiración IA
                 </button>
              </div>
           </div>

           {aiResponse && (
             <div className="bg-white p-10 rounded-[3rem] border border-indigo-100 shadow-sm animate-in slide-in-from-right relative">
                <button onClick={() => setAiResponse(null)} className="absolute top-6 right-6 text-slate-400"><X size={18}/></button>
                <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-6">Propuesta IA</h4>
                <div className="prose prose-sm text-slate-600 max-h-[300px] overflow-y-auto custom-scrollbar italic font-medium leading-relaxed">
                   {aiResponse.split('\n').map((l,i) => <p key={i} className="mb-2">{l}</p>)}
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default IdeasView;
