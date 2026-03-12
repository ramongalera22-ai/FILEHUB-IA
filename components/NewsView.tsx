import React, { useEffect, useState } from 'react';
import { Newspaper, ExternalLink, RefreshCw, Loader2, BookOpen } from 'lucide-react';

interface NewsItem {
    title: string;
    link: string;
    pubDate: string;
    source: string;
    sourceIcon?: string;
}

interface NewsSource {
    name: string;
    rssUrl: string;
    color: string;
}

const SOURCES: NewsSource[] = [
    { name: 'El País', rssUrl: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada', color: 'bg-blue-600' },
    { name: 'Newtral', rssUrl: 'https://www.newtral.es/feed/', color: 'bg-red-500' },
    { name: 'Redacción Médica', rssUrl: 'https://www.redaccionmedica.com/rss.php', color: 'bg-cyan-600' }, // Approximation, fallback handled
    { name: 'La Verdad', rssUrl: 'https://www.laverdad.es/rss/2.0/portada', color: 'bg-indigo-600' },
    { name: 'La Vanguardia', rssUrl: 'https://www.lavanguardia.com/rss/home.xml', color: 'bg-slate-800' }
];

const NewsView: React.FC = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    const fetchNews = async () => {
        setLoading(true);
        const allNews: NewsItem[] = [];

        // We use rss2json to avoid CORS issues strictly for this client-side demo
        // In a production app, you'd proxy this through your own backend (e.g. Firebase Functions)
        const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json?rss_url=';

        const promises = SOURCES.map(async (source) => {
            try {
                const response = await fetch(`${RSS2JSON_API}${encodeURIComponent(source.rssUrl)}`);
                const data = await response.json();

                if (data.status === 'ok' && data.items) {
                    // Take top 3
                    const top3 = data.items.slice(0, 3).map((item: any) => ({
                        title: item.title,
                        link: item.link,
                        pubDate: item.pubDate,
                        description: item.description || item.content, // Get description
                        source: source.name,
                        sourceColor: source.color
                    }));
                    return top3;
                }
                return [];
            } catch (error) {
                console.error(`Error fetching ${source.name}:`, error);
                return [];
            }
        });

        try {
            const results = await Promise.all(promises);
            results.forEach(sourceNews => allNews.push(...sourceNews));
            setNews(allNews);
            setLastUpdate(new Date());
        } catch (e) {
            console.error("Global fetch error", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, []);

    const getNewsBySource = (sourceName: string) => news.filter(n => n.source === sourceName);

    return (
        <div className="space-y-12 animate-in fade-in duration-700 pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Newspaper className="text-indigo-600" size={32} />
                        Kiosco Digital
                    </h2>
                    <p className="text-slate-500 font-bold mt-1">
                        Resumen diario automático de las mejores cabeceras.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-slate-400">
                        Actualizado: {lastUpdate.toLocaleTimeString()}
                    </span>
                    <button
                        onClick={fetchNews}
                        disabled={loading}
                        className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin text-indigo-600' : 'text-slate-700'} />
                    </button>
                </div>
            </header>

            {loading && news.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 opacity-50 space-y-4">
                    <Loader2 size={48} className="animate-spin text-indigo-600" />
                    <p className="text-sm font-black uppercase tracking-widest text-slate-400">Cargando portadas...</p>
                </div>
            ) : (
                <div className="space-y-16">
                    {SOURCES.map(source => {
                        const sourceNews = getNewsBySource(source.name);
                        if (sourceNews.length === 0) return null;

                        return (
                            <section key={source.name} className="space-y-6">
                                {/* Source Header */}
                                <div className="flex items-center gap-4">
                                    <div className={`h-8 w-1 rounded-full ${source.color}`}></div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{source.name}</h3>
                                </div>

                                {/* Horizontal News Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {sourceNews.map((item, i) => (
                                        <a
                                            key={i}
                                            href={item.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group bg-white rounded-[2rem] border border-slate-100 hover:border-slate-300 hover:shadow-xl transition-all p-6 flex flex-col justify-between h-full"
                                        >
                                            <div>
                                                <div className="flex justify-between items-start mb-4">
                                                    <p className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md uppercase tracking-widest">
                                                        {new Date(item.pubDate).toLocaleDateString()}
                                                    </p>
                                                    <ExternalLink size={14} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                                                </div>

                                                <h4 className="text-lg font-black text-slate-900 leading-tight mb-3 group-hover:text-indigo-600 transition-colors">
                                                    {item.title}
                                                </h4>

                                                {/* Preview del contenido (strip HTML tags simple) */}
                                                <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-4">
                                                    {item.description && item.description.replace(/<[^>]*>?/gm, '').substring(0, 150)}...
                                                </p>
                                            </div>

                                            <div className="mt-6 pt-6 border-t border-slate-50 flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${source.color}`}></div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-600">Leer noticia completa</span>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default NewsView;
