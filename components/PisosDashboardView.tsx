
import React, { useState, useMemo, useCallback } from 'react';
import {
  Home, MapPin, Maximize2, Euro, ArrowUpDown, Star, Filter,
  Briefcase, Mail, Copy, Check, ExternalLink, BarChart3,
  TrendingUp, Building2, Train, Wind, ChevronDown, ChevronUp,
  Search, SlidersHorizontal, Stethoscope, Globe, Phone,
  Sparkles, Eye, Heart, HeartOff, AlertCircle
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════════════════

interface Piso {
  id: number;
  titulo: string;
  precio: number;
  hab: string;
  m2: number;
  planta: string;
  extras: string[];
  zona: string;
  fuente: string;
  url: string;
  destacado: boolean;
  nota?: string;
}

interface Oferta {
  titulo: string;
  url: string;
  ubicacion?: string;
  icon: string;
  tipo: 'medico' | 'consultor';
}

const PISOS: Piso[] = [
  { id:1, titulo:"Ático Milà i Fontanals, Vila de Gràcia", precio:1200, hab:"Estudio", m2:45, planta:"4ª ext", extras:["Ascensor","TERRAZA 50m²","Cerca L3 Fontana"], zona:"Vila de Gràcia", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/gracia/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc", destacado:true, nota:"Terraza grande >30m²" },
  { id:2, titulo:"Piso Dos de Maig 211, Sagrada Família", precio:1275, hab:"2 hab", m2:67, planta:"4ª ext", extras:["Ascensor","Balcón","Cerca L5 Sagrada Familia"], zona:"Sagrada Família", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/eixample/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc", destacado:true },
  { id:3, titulo:"Piso Encarnació, Baix Guinardó", precio:1268, hab:"3 hab", m2:80, planta:"4ª ext", extras:["Ascensor","Balcón","Cerca L5 El Coll/La Teixonera"], zona:"Baix Guinardó", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc", destacado:true },
  { id:4, titulo:"Piso Martí, Camp d'En Grassot", precio:1329, hab:"4 hab", m2:80, planta:"2ª ext", extras:["Ascensor","Sin amueblar","Cerca L5 Camp de l'Arpa"], zona:"Camp d'En Grassot", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/gracia/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc", destacado:true },
  { id:5, titulo:"Piso l'Alba, Vila de Gràcia", precio:1125, hab:"4 hab", m2:68, planta:"1ª ext", extras:["Balcón","Cerca L3 Fontana"], zona:"Vila de Gràcia", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/gracia/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc", destacado:true },
  { id:6, titulo:"Piso Torrent de les Flors, Vila de Gràcia", precio:1250, hab:"1 hab", m2:49, planta:"3ª ext", extras:["Ascensor","Balcón","Cerca L3 Joanic"], zona:"Vila de Gràcia", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/gracia/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc", destacado:true },
  { id:7, titulo:"Piso Rambla del Carmel", precio:1150, hab:"2 hab", m2:70, planta:"2ª ext", extras:["Balcón","Reformado","Cerca L5 El Coll"], zona:"El Carmel", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc", destacado:true },
  { id:8, titulo:"Piso Sant Dalmir, La Teixonera", precio:1195, hab:"2 hab", m2:80, planta:"3ª ext", extras:["Ascensor","Cerca L5 Teixonera"], zona:"La Teixonera", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc", destacado:false },
  { id:9, titulo:"Piso Casanova, Antiga Esquerra Eixample", precio:940, hab:"2 hab", m2:62, planta:"5ª ext", extras:["Balcón","Cerca L5 Hospital Clínic"], zona:"Antiga Esquerra Eixample", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/eixample/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc", destacado:true },
  { id:10, titulo:"Piso Camp d'En Grassot, Gràcia Nova", precio:941, hab:"2 hab", m2:66, planta:"Entreplanta ext", extras:["Ascensor","Cerca L5 Camp de l'Arpa"], zona:"Gràcia Nova", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/gracia/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc", destacado:false },
  { id:11, titulo:"Piso Rosalia de Castro, Baix Guinardó", precio:1150, hab:"1 hab", m2:65, planta:"1ª ext", extras:["Ascensor","Cerca L3/L5 Guinardó"], zona:"Baix Guinardó", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc", destacado:false },
  { id:12, titulo:"Piso Dante Alighieri, El Carmel", precio:950, hab:"2 hab", m2:55, planta:"1ª ext", extras:["Ascensor","Cerca L5 El Carmel"], zona:"El Carmel", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc", destacado:false },
  { id:13, titulo:"Ático Conca de Tremp, El Carmel", precio:973, hab:"2 hab", m2:55, planta:"4ª ext", extras:["Cerca L5 El Carmel"], zona:"El Carmel", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/horta-guinardo/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc", destacado:false },
  { id:14, titulo:"Piso València 54, Nova Esquerra Eixample", precio:1125, hab:"1 hab", m2:45, planta:"6ª ext", extras:["Ascensor","Balcón","Cerca L5 Entença"], zona:"Nova Esquerra Eixample", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/eixample/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc", destacado:true },
  { id:15, titulo:"Piso Paseo Sant Joan, Dreta Eixample", precio:1328, hab:"2 hab", m2:56, planta:"1ª ext", extras:["Ascensor","Cerca L5 Verdaguer"], zona:"Dreta Eixample", fuente:"Idealista", url:"https://www.idealista.com/alquiler-viviendas/barcelona/eixample/con-precio-hasta_1400,precio-desde_850/?ordenado-por=precios-asc", destacado:false },
];

const OFERTAS: Oferta[] = [
  { titulo:"CAMFiC: Médico urgente cobertura MF", url:"https://camfic.cat/detallOferta.aspx?id=2699", ubicacion:"Barcelona", icon:"🏥", tipo:'medico' },
  { titulo:"CatSalut: Bolsa de trabajo MF", url:"https://catsalut.gencat.cat/ca/coneix-catsalut/presentacio/organitzacio/recursos-humans/ofertes-treball/", ubicacion:"Cataluña", icon:"🏛️", tipo:'medico' },
  { titulo:"InfoJobs: Médico de familia", url:"https://www.infojobs.net/ofertas-trabajo/barcelona/medico-de-familia", ubicacion:"Barcelona", icon:"💼", tipo:'medico' },
  { titulo:"SemFYC: Bolsa MFyC", url:"https://www.semfyc.es/secciones-y-grupos/seccion-de-desarrollo-profesional/salida-profesional/bolsa-de-trabajo/", ubicacion:"España", icon:"📋", tipo:'medico' },
  { titulo:"LinkedIn: Empleos telemedicina España", url:"https://es.linkedin.com/jobs/telemedicina-empleos", icon:"🔗", tipo:'consultor' },
  { titulo:"Indeed: Empleos telemedicina", url:"https://es.indeed.com/q-telemedicina-empleos.html", icon:"🔍", tipo:'consultor' },
  { titulo:"Telemedi: Médico General (remoto)", url:"https://apply.workable.com/telemedi/j/1A3F03D40A/", icon:"💻", tipo:'consultor' },
  { titulo:"Jooble: Médico teletrabajo España", url:"https://es.jooble.org/trabajo-m%C3%A9dico-teletrabajo", icon:"🌐", tipo:'consultor' },
];

const MENSAJE_CONTACTO = `Buenas tardes,

Nos ponemos en contacto con usted tras ver el anuncio de su vivienda. Estamos muy interesados en el inmueble, ya que por nuestras circunstancias profesionales buscamos un hogar tranquilo y bien comunicado.

Somos una pareja de médicos con una situación financiera muy sólida:
• Ella: Facultativa en el Hospital Universitario Vall d'Hebron.
• Él: Facultativo especialista (actualmente ejerciendo fuera con traslado próximo a Barcelona).
• Ingresos conjuntos: Superan los 5.000€ netos mensuales, totalmente demostrables mediante nóminas y contratos.

Somos personas responsables, no fumadores y no tenemos mascotas. Al trabajar ambos en el sector sanitario, valoramos especialmente el silencio, el descanso y el buen mantenimiento de la vivienda.

Tenemos disponibilidad inmediata para realizar una visita y aportar toda la documentación necesaria para formalizar el alquiler si el perfil les resulta de interés.

Mi correo es carlosgalera2roman@gmail.com

Un saludo cordial.`;

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const StatCard: React.FC<{ value: string|number; label: string; icon: React.ReactNode; color: string }> = ({ value, label, icon, color }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-lg transition-all hover:-translate-y-0.5`}>
    <div className="flex items-center justify-between mb-2">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        {icon}
      </div>
    </div>
    <div className="text-2xl font-black text-slate-900 dark:text-white">{value}</div>
    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{label}</div>
  </div>
);

const BarChart: React.FC<{ data: {label:string; value:number; max:number}[]; color: string; unit?: string }> = ({ data, color, unit = '' }) => (
  <div className="space-y-2">
    {data.map((d, i) => (
      <div key={i} className="flex items-center gap-3">
        <div className="w-32 sm:w-40 text-right text-xs text-slate-500 dark:text-slate-400 truncate font-medium">{d.label}</div>
        <div className="flex-1 h-7 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden relative">
          <div
            className={`h-full rounded transition-all duration-700 ${color}`}
            style={{ width: `${Math.max((d.value / d.max) * 100, 8)}%` }}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-600 dark:text-slate-300">
            {d.value}{unit}
          </span>
        </div>
      </div>
    ))}
  </div>
);

const PisoCard: React.FC<{ piso: Piso; rank: number; favorites: Set<number>; toggleFav: (id:number)=>void }> = ({ piso, rank, favorites, toggleFav }) => {
  const ratio = (piso.precio / piso.m2).toFixed(1);
  const isFav = favorites.has(piso.id);
  const starLabel = piso.nota?.includes('Terraza grande') ? '⭐⭐' : piso.destacado ? '⭐' : null;

  return (
    <div className={`group relative bg-white dark:bg-slate-800 rounded-xl border transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer overflow-hidden ${
      piso.destacado ? 'border-amber-300/50 dark:border-amber-500/30' : 'border-slate-200 dark:border-slate-700'
    }`}>
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${
        piso.destacado ? 'bg-amber-400' : 'bg-slate-200 dark:bg-slate-700 group-hover:bg-indigo-500'
      }`} />

      <div className="p-4 pl-5">
        <div className="flex items-start justify-between gap-3">
          {/* Left: info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="shrink-0 text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-md">
                #{rank}
              </span>
              <a
                href={piso.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate"
                onClick={e => e.stopPropagation()}
              >
                {piso.titulo}
              </a>
              {starLabel && <span className="text-sm">{starLabel}</span>}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2.5 flex-wrap">
              <span className="flex items-center gap-0.5"><BedDouble size={12}/> {piso.hab}</span>
              <span>·</span>
              <span className="flex items-center gap-0.5"><Maximize2 size={12}/> {piso.m2} m²</span>
              <span>·</span>
              <span>{piso.planta}</span>
              <span>·</span>
              <span className="flex items-center gap-0.5"><MapPin size={12}/> {piso.zona}</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {piso.extras.map((e, j) => {
                const isMetro = /cerca|L3|L5/i.test(e);
                const isFeature = /balc|terraza|reform|ascensor/i.test(e);
                return (
                  <span key={j} className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                    isMetro ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300' :
                    isFeature ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300' :
                    'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    {isMetro && <Train size={10} className="inline mr-0.5 -mt-0.5"/>}
                    {e}
                  </span>
                );
              })}
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-700/50 text-slate-400 border border-slate-200 dark:border-slate-600">
                {piso.fuente}
              </span>
            </div>
          </div>

          {/* Right: price + actions */}
          <div className="text-right shrink-0 flex flex-col items-end gap-1">
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 leading-none">
              {piso.precio}<span className="text-sm font-semibold text-slate-400">€</span>
            </div>
            <div className="text-[10px] font-mono text-slate-400">{ratio} €/m²</div>
            <div className="flex items-center gap-1 mt-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); toggleFav(piso.id); }}
                className={`p-1.5 rounded-lg transition-colors ${
                  isFav ? 'bg-red-50 dark:bg-red-900/30 text-red-500' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-red-400'
                }`}
              >
                {isFav ? <Heart size={14} className="fill-current"/> : <HeartOff size={14}/>}
              </button>
              <a
                href={piso.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink size={14}/>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const PisosDashboardView: React.FC = () => {
  const [tab, setTab] = useState<'pisos'|'analisis'|'ofertas'|'contacto'>('pisos');
  const [sort, setSort] = useState('precio-asc');
  const [filterDest, setFilterDest] = useState(false);
  const [filterBalcon, setFilterBalcon] = useState(false);
  const [filterAscensor, setFilterAscensor] = useState(false);
  const [favorites, setFavorites] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem('filehub_pisos_favs');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const toggleFav = useCallback((id: number) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem('filehub_pisos_favs', JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    let list = [...PISOS];
    if (filterDest) list = list.filter(p => p.destacado);
    if (filterBalcon) list = list.filter(p => p.extras.some(e => /balc|terraza/i.test(e)));
    if (filterAscensor) list = list.filter(p => p.extras.some(e => /ascensor/i.test(e)));
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p => p.titulo.toLowerCase().includes(q) || p.zona.toLowerCase().includes(q));
    }
    switch(sort) {
      case 'precio-asc': list.sort((a,b) => a.precio - b.precio); break;
      case 'precio-desc': list.sort((a,b) => b.precio - a.precio); break;
      case 'm2-desc': list.sort((a,b) => b.m2 - a.m2); break;
      case 'm2-asc': list.sort((a,b) => a.m2 - b.m2); break;
      case 'ratio': list.sort((a,b) => (a.precio/a.m2) - (b.precio/b.m2)); break;
    }
    return list;
  }, [sort, filterDest, filterBalcon, filterAscensor, searchTerm]);

  // Stats
  const precios = PISOS.map(p => p.precio);
  const avg = Math.round(precios.reduce((a,b) => a+b, 0) / precios.length);
  const m2s = PISOS.map(p => p.m2);
  const avgM2 = Math.round(m2s.reduce((a,b) => a+b, 0) / m2s.length);

  // Chart data
  const priceChartData = useMemo(() => {
    const sorted = [...PISOS].sort((a,b) => a.precio - b.precio);
    const max = Math.max(...precios);
    return sorted.map(p => ({ label: p.titulo.length > 20 ? p.titulo.slice(0,18)+'…' : p.titulo, value: p.precio, max }));
  }, []);

  const m2ChartData = useMemo(() => {
    const sorted = [...PISOS].sort((a,b) => b.m2 - a.m2);
    const max = Math.max(...m2s);
    return sorted.map(p => ({ label: p.titulo.length > 20 ? p.titulo.slice(0,18)+'…' : p.titulo, value: p.m2, max }));
  }, []);

  const zonaData = useMemo(() => {
    const zones: Record<string,number> = {};
    PISOS.forEach(p => { zones[p.zona] = (zones[p.zona]||0) + 1; });
    const entries = Object.entries(zones).sort((a,b) => b[1] - a[1]);
    const max = Math.max(...entries.map(z => z[1]));
    return entries.map(([z, c]) => ({ label: z, value: c, max }));
  }, []);

  const ratioData = useMemo(() => {
    const sorted = [...PISOS].sort((a,b) => (a.precio/a.m2) - (b.precio/b.m2));
    const max = Math.max(...PISOS.map(p => p.precio/p.m2));
    return sorted.map(p => ({ label: p.titulo.length > 20 ? p.titulo.slice(0,18)+'…' : p.titulo, value: parseFloat((p.precio/p.m2).toFixed(1)), max }));
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(MENSAJE_CONTACTO);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, []);

  const tabs = [
    { id: 'pisos' as const, label: 'Pisos', icon: <Home size={15}/>, count: PISOS.length },
    { id: 'analisis' as const, label: 'Análisis', icon: <BarChart3 size={15}/> },
    { id: 'ofertas' as const, label: 'Ofertas', icon: <Briefcase size={15}/>, count: OFERTAS.length },
    { id: 'contacto' as const, label: 'Contacto', icon: <Mail size={15}/> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 lg:p-8 custom-scrollbar overflow-y-auto">
      <div className="max-w-5xl mx-auto">

        {/* ═══ HEADER ═══ */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Home size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Pisos Barcelona</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                850–1400€ · L3/L5 · &gt;35m² · No bajos · Sin Raval/La Mina
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </span>
            </div>
          </div>
        </div>

        {/* ═══ STATS ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard value={PISOS.length} label="Pisos totales" icon={<Home size={18} className="text-white"/>} color="bg-indigo-500" />
          <StatCard value={`${avg}€`} label="Precio medio" icon={<Euro size={18} className="text-white"/>} color="bg-amber-500" />
          <StatCard value={`${Math.min(...precios)}€`} label="Mínimo" icon={<TrendingUp size={18} className="text-white"/>} color="bg-emerald-500" />
          <StatCard value={`${Math.max(...precios)}€`} label="Máximo" icon={<TrendingUp size={18} className="text-white rotate-180"/>} color="bg-red-500" />
          <StatCard value={`${avgM2}m²`} label="Media m²" icon={<Maximize2 size={18} className="text-white"/>} color="bg-blue-500" />
          <StatCard value={PISOS.filter(p => p.destacado).length} label="Destacados" icon={<Star size={18} className="text-white fill-white"/>} color="bg-amber-500" />
        </div>

        {/* ═══ TABS ═══ */}
        <div className="flex gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                tab === t.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {t.icon} {t.label}
              {t.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  tab === t.id ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-600'
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ═══ TAB: PISOS ═══ */}
        {tab === 'pisos' && (
          <>
            {/* Controls */}
            <div className="flex flex-wrap gap-2 mb-5 items-center">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input
                  type="text"
                  placeholder="Buscar por nombre o zona..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-600 dark:text-slate-300 font-medium cursor-pointer outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="precio-asc">Precio ↑</option>
                <option value="precio-desc">Precio ↓</option>
                <option value="m2-desc">m² ↓</option>
                <option value="m2-asc">m² ↑</option>
                <option value="ratio">€/m² ↑</option>
              </select>
              {[
                { key: 'dest', active: filterDest, toggle: () => setFilterDest(!filterDest), label: '⭐ Destacados' },
                { key: 'balc', active: filterBalcon, toggle: () => setFilterBalcon(!filterBalcon), label: '🌿 Balcón' },
                { key: 'asc', active: filterAscensor, toggle: () => setFilterAscensor(!filterAscensor), label: '🛗 Ascensor' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={f.toggle}
                  className={`text-xs font-bold px-3 py-2 rounded-lg border transition-all ${
                    f.active
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-300'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <span className="text-[11px] font-mono text-slate-400 ml-auto">{filtered.length} resultado{filtered.length!==1?'s':''}</span>
            </div>

            {/* Cards */}
            <div className="space-y-3">
              {filtered.map((p, i) => (
                <PisoCard key={p.id} piso={p} rank={i + 1} favorites={favorites} toggleFav={toggleFav} />
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-16 text-slate-400">
                  <AlertCircle size={32} className="mx-auto mb-3 opacity-50"/>
                  <p className="font-medium">No se encontraron pisos con estos filtros</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══ TAB: ANÁLISIS ═══ */}
        {tab === 'analisis' && (
          <div className="space-y-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Euro size={16} className="text-amber-500"/> Distribución de precios
              </h3>
              <BarChart data={priceChartData} color="bg-gradient-to-r from-amber-400 to-amber-500" unit="€" />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Maximize2 size={16} className="text-blue-500"/> Superficie (m²)
              </h3>
              <BarChart data={m2ChartData} color="bg-gradient-to-r from-blue-400 to-blue-500" unit="m²" />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <MapPin size={16} className="text-emerald-500"/> Pisos por zona
              </h3>
              <BarChart data={zonaData} color="bg-gradient-to-r from-emerald-400 to-emerald-500" unit=" pisos" />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-violet-500"/> Mejores ratios €/m²
              </h3>
              <BarChart data={ratioData} color="bg-gradient-to-r from-violet-400 to-violet-500" unit="€/m²" />
            </div>
          </div>
        )}

        {/* ═══ TAB: OFERTAS ═══ */}
        {tab === 'ofertas' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Stethoscope size={16} className="text-amber-500"/>
                Ofertas Médico de Familia
                <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                  {OFERTAS.filter(o => o.tipo === 'medico').length}
                </span>
              </h3>
              <div className="space-y-2">
                {OFERTAS.filter(o => o.tipo === 'medico').map((o, i) => (
                  <a key={i} href={o.url} target="_blank" rel="noopener noreferrer"
                    className="group flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <span className="text-xl">{o.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{o.titulo}</div>
                      {o.ubicacion && <div className="text-xs text-slate-400 mt-0.5">{o.ubicacion}</div>}
                    </div>
                    <ExternalLink size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0"/>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Globe size={16} className="text-violet-500"/>
                Consultor / Telemedicina
                <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                  {OFERTAS.filter(o => o.tipo === 'consultor').length}
                </span>
              </h3>
              <div className="space-y-2">
                {OFERTAS.filter(o => o.tipo === 'consultor').map((o, i) => (
                  <a key={i} href={o.url} target="_blank" rel="noopener noreferrer"
                    className="group flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
                  >
                    <span className="text-xl">{o.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{o.titulo}</div>
                    </div>
                    <ExternalLink size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0"/>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB: CONTACTO ═══ */}
        {tab === 'contacto' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Mail size={16} className="text-amber-500"/>
                Mensaje de contacto para caseros
              </h3>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg transition-all ${
                  copied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/25'
                }`}
              >
                {copied ? <><Check size={14}/> Copiado</> : <><Copy size={14}/> Copiar mensaje</>}
              </button>
            </div>
            <div className="p-5">
              <pre className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
                {MENSAJE_CONTACTO}
              </pre>
            </div>
          </div>
        )}

        {/* ═══ FOOTER ═══ */}
        <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
          <p className="text-[10px] text-slate-400">
            ⭐ = Terraza/balcón + ascensor + cerca L3/L5 &nbsp;·&nbsp; ⭐⭐ = Terraza grande (&gt;30m²)
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            FILEHUB · Filtros: 850–1400€ · L3/L5 · &gt;35m² · No bajos · Sin Raval/La Mina
          </p>
        </div>
      </div>
    </div>
  );
};

export default PisosDashboardView;
