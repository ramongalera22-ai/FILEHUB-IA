import React, { useEffect, useState, useCallback } from 'react';
import { Newspaper, ExternalLink, RefreshCw, Loader2, Search, Filter, Stethoscope, Globe2, Landmark, FlaskConical, Zap } from 'lucide-react';
import { BotPanelNoticias } from './BotPanel';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  color: string;
  category: string;
  thumbnail?: string;
}

const SOURCES = [
  { name: 'Redacción Médica', rssUrl: 'https://www.redaccionmedica.com/rss.php', color: '#06b6d4', category: 'medicina' },
  { name: 'Medscape España', rssUrl: 'https://www.medscape.com/rss/getAllNews.xml', color: '#3b82f6', category: 'medicina' },
  { name: 'El País Salud', rssUrl: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/sociedad/subsection/salud/portada', color: '#6366f1', category: 'salud' },
  { name: 'La Vanguardia', rssUrl: 'https://www.lavanguardia.com/rss/home.xml', color: '#1e293b', category: 'general' },
  { name: 'La Verdad', rssUrl: 'https://www.laverdad.es/rss/2.0/portada', color: '#7c3aed', category: 'local' },
  { name: 'MIT Tech Review', rssUrl: 'https://www.technologyreview.com/feed/', color: '#dc2626', category: 'tecnologia' },
  { name: 'El País', rssUrl: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada', color: '#0ea5e9', category: 'general' },
];

const CATEGORY_ICONS: Record<string, React.FC<any>> = {
  medicina: Stethoscope,
  salud: FlaskConical,
  general: Globe2,
  local: Landmark,
  tecnologia: Zap,
};

const RSS2JSON = 'https://api.rss2json.com/v1/api.json?rss_url=';

const NewsView: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeSources, setActiveSources] = useState<string[]>(SOURCES.map(s => s.name));

  const fetchNews = useCallback(async () => {
    setLoading(true);
    const allNews: NewsItem[] = [];
    await Promise.allSettled(
      SOURCES.filter(s => activeSources.includes(s.name)).map(async (source) => {
        try {
          const res = await fetch(`${RSS2JSON}${encodeURIComponent(source.rssUrl)}&count=5`);
          const data = await res.json();
          if (data.status === 'ok' && data.items) {
            data.items.slice(0, 5).forEach((item: any) => {
              allNews.push({
                title: item.title?.replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim() || '',
                link: item.link || '',
                pubDate: item.pubDate || '',
                source: source.name,
                color: source.color,
                category: source.category,
                thumbnail: item.thumbnail || item.enclosure?.link || '',
              });
            });
          }
        } catch {}
      })
    );
    allNews.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    setNews(allNews);
    setLastUpdate(new Date());
    setLoading(false);
  }, [activeSources]);

  useEffect(() => { fetchNews(); }, []);

  const categories = ['all', ...Array.from(new Set(SOURCES.map(s => s.category)))];

  const filtered = news.filter(item => {
    const matchCat = activeCategory === 'all' || item.category === activeCategory;
    const matchSearch = !search || item.title.toLowerCase().includes(search.toLowerCase()) || item.source.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return d; }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8fafc] dark:bg-slate-950 p-4 md:p-6 space-y-5">
      <BotPanelNoticias />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Newspaper size={22} className="text-indigo-500" /> Kiosco Digital
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Actualizado: {lastUpdate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="pl-8 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/5 rounded-xl text-slate-700 dark:text-white focus:outline-none focus:border-indigo-500 w-44"
              placeholder="Buscar noticias..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={fetchNews} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-60">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Actualizar
          </button>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => {
          const Icon = CATEGORY_ICONS[cat] || Globe2;
          return (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${activeCategory === cat ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200/60 dark:border-white/5 hover:border-indigo-500/40'}`}>
              <Icon size={11} />
              {cat === 'all' ? 'Todas' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          );
        })}
      </div>

      {/* Source toggles */}
      <div className="flex gap-2 flex-wrap">
        {SOURCES.map(s => (
          <button key={s.name} onClick={() => setActiveSources(prev => prev.includes(s.name) ? prev.filter(x => x !== s.name) : [...prev, s.name])}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${activeSources.includes(s.name) ? 'text-white border-transparent' : 'text-slate-400 border-slate-200/60 dark:border-white/5 bg-white dark:bg-slate-900'}`}
            style={activeSources.includes(s.name) ? { backgroundColor: s.color } : {}}>
            {s.name}
          </button>
        ))}
      </div>

      {/* News grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/60 dark:border-white/5 animate-pulse">
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-3" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full mb-2" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Newspaper size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-semibold">No hay noticias</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item, i) => {
            const CatIcon = CATEGORY_ICONS[item.category] || Globe2;
            return (
              <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
                className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-white/5 hover:border-indigo-500/40 hover:shadow-lg transition-all overflow-hidden flex flex-col">
                {item.thumbnail && (
                  <div className="h-36 overflow-hidden">
                    <img src={item.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: item.color }}>{item.source}</span>
                    <CatIcon size={11} className="text-slate-400" />
                    <span className="text-[10px] text-slate-400 ml-auto">{formatDate(item.pubDate)}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-snug flex-1 group-hover:text-indigo-500 transition-colors line-clamp-3">{item.title}</p>
                  <div className="flex items-center gap-1 mt-3 text-[10px] text-indigo-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    Leer más <ExternalLink size={10} />
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NewsView;
