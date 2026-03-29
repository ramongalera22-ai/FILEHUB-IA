import React, { useState, useEffect, useRef } from 'react';

const NUCBOX_API = 'https://nucboxg10.tail3a7cac.ts.net';

interface PisoData {
  titulo: string;
  zona: string;
  precio: number;
  m2: number;
  url: string;
  portal: string;
  contactado: boolean;
}

interface ApiStatus {
  ok: boolean;
  historial: number;
  timestamp: string;
}

export default function PisosBuscadorView() {
  const [pisos, setPisos] = useState<PisoData[]>([]);
  const [status, setStatus] = useState<'loading' | 'online' | 'offline'>('loading');
  const [historial, setHistorial] = useState(0);
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<'precio' | 'm2' | 'ratio'>('precio');
  const [portalFilter, setPortalFilter] = useState<'todos' | 'idealista' | 'fotocasa' | 'habitaclia'>('todos');
  const [contactando, setContactando] = useState<Record<string, 'idle' | 'loading' | 'ok' | 'error'>>({});
  const [buscando, setBuscando] = useState(false);
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [maxPrice, setMaxPrice] = useState(1400);
  const [minM2, setMinM2] = useState(0);

  // Load pisos from NucBox API or fallback to static JSON
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${NUCBOX_API}/pisos`, { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        if (data?.pisos?.length) {
          setPisos(data.pisos);
          setStatus('online');
        }
        // Also get status
        const sRes = await fetch(`${NUCBOX_API}/status`, { signal: AbortSignal.timeout(3000) });
        const sData = await sRes.json();
        if (sData.ok) setHistorial(sData.historial || 0);
      } catch {
        // Fallback: load from static JSON in repo
        try {
          const base = window.location.pathname.includes('FILEHUB-IA') ? '/FILEHUB-IA' : '';
          const res = await fetch(`${base}/data/data-pisos.json`);
          const data = await res.json();
          if (data?.pisos?.length) setPisos(data.pisos);
        } catch { /* no data available */ }
        setStatus('offline');
      }
    };
    load();
  }, []);

  // Contact a landlord
  const contactar = async (url: string) => {
    setContactando(prev => ({ ...prev, [url]: 'loading' }));
    try {
      const res = await fetch(`${NUCBOX_API}/contactar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      setContactando(prev => ({ ...prev, [url]: data.ok ? 'ok' : 'error' }));
      if (data.ok) setHistorial(h => h + 1);
    } catch {
      setContactando(prev => ({ ...prev, [url]: 'error' }));
    }
    setTimeout(() => setContactando(prev => ({ ...prev, [url]: 'idle' })), 10000);
  };

  // Contact all
  const contactarTodos = async () => {
    if (!confirm(`¿Contactar ${filtered.length} pisos via NucBox?\nEl bot rellenará formularios automáticamente.\nTardará unos minutos.`)) return;
    for (const p of filtered) {
      if (contactando[p.url] !== 'ok') {
        await contactar(p.url);
        await new Promise(r => setTimeout(r, 15000));
      }
    }
  };

  // Launch search
  const buscarPisos = async () => {
    if (!confirm('¿Lanzar búsqueda de pisos en NucBox?\nTardará ~25 min.')) return;
    setBuscando(true);
    try {
      await fetch(`${NUCBOX_API}/buscar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    } catch { /* ignore */ }
    setTimeout(() => setBuscando(false), 1500000); // 25 min
  };

  // Filter & sort
  const filtered = pisos
    .filter(p => portalFilter === 'todos' || p.portal === portalFilter)
    .filter(p => p.precio <= maxPrice)
    .filter(p => p.m2 >= minM2)
    .filter(p => !showOnlyNew || !p.contactado)
    .filter(p => !filter || p.titulo.toLowerCase().includes(filter.toLowerCase()) || p.zona.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'precio') return a.precio - b.precio;
      if (sortBy === 'm2') return b.m2 - a.m2;
      return (a.precio / a.m2) - (b.precio / b.m2);
    });

  const stats = {
    total: pisos.length,
    avg: pisos.length ? Math.round(pisos.reduce((s, p) => s + p.precio, 0) / pisos.length) : 0,
    min: pisos.length ? Math.min(...pisos.map(p => p.precio)) : 0,
    max: pisos.length ? Math.max(...pisos.map(p => p.precio)) : 0,
    contactados: pisos.filter(p => p.contactado).length,
    portales: [...new Set(pisos.map(p => p.portal))],
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur border-b border-slate-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔍</span>
            <div>
              <h1 className="text-xl font-bold">Pisos Buscador</h1>
              <p className="text-xs text-slate-500">Búsqueda + contacto automático BCN</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${status === 'online' ? 'bg-green-500/20 text-green-400' : status === 'offline' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
              {status === 'online' ? '🟢 NucBox' : status === 'offline' ? '🔴 Offline' : '⏳ Cargando'}
            </span>
            {historial > 0 && (
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-400">
                📬 {historial} contactados
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={buscarPisos}
            disabled={buscando || status === 'offline'}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm font-semibold transition-all"
          >
            {buscando ? '⏳ Buscando...' : '🔍 Buscar pisos ahora'}
          </button>
          <button
            onClick={contactarTodos}
            disabled={status === 'offline' || filtered.length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg text-sm font-semibold transition-all"
          >
            🤖 Auto-contactar ({filtered.length})
          </button>
          <a
            href={`${window.location.pathname.replace(/\/$/, '')}/pisos.html`}
            target="_blank"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-semibold transition-all"
          >
            📊 Dashboard completo ↗
          </a>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Buscar por zona, título..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
          />
          <select value={portalFilter} onChange={e => setPortalFilter(e.target.value as any)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm">
            <option value="todos">Todos portales</option>
            <option value="idealista">Idealista</option>
            <option value="fotocasa">Fotocasa</option>
            <option value="habitaclia">Habitaclia</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm">
            <option value="precio">Precio ↑</option>
            <option value="m2">m² ↓</option>
            <option value="ratio">€/m²</option>
          </select>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm">
            <span>Max:</span>
            <input type="number" value={maxPrice} onChange={e => setMaxPrice(+e.target.value)} className="w-16 bg-transparent text-right" />
            <span>€</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm">
            <span>Min:</span>
            <input type="number" value={minM2} onChange={e => setMinM2(+e.target.value)} className="w-12 bg-transparent text-right" />
            <span>m²</span>
          </div>
          <label className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm cursor-pointer">
            <input type="checkbox" checked={showOnlyNew} onChange={e => setShowOnlyNew(e.target.checked)} className="accent-green-500" />
            Solo nuevos
          </label>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 p-4">
        {[
          { v: stats.total, l: 'Pisos', c: 'text-amber-400' },
          { v: `${stats.avg}€`, l: 'Precio medio', c: 'text-blue-400' },
          { v: `${stats.min}€`, l: 'Mínimo', c: 'text-green-400' },
          { v: `${stats.max}€`, l: 'Máximo', c: 'text-purple-400' },
          { v: stats.contactados, l: 'Contactados', c: 'text-emerald-400' },
          { v: filtered.length, l: 'Filtrados', c: 'text-cyan-400' },
        ].map((s, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
            <div className={`text-xl font-bold ${s.c}`}>{s.v}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Pisos list */}
      <div className="px-4 pb-8 space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            {pisos.length === 0 ? '⏳ Cargando pisos...' : '🔍 No hay pisos con estos filtros'}
          </div>
        )}
        {filtered.map((p, i) => {
          const ratio = (p.precio / (p.m2 || 1)).toFixed(1);
          const cState = contactando[p.url] || 'idle';
          return (
            <div
              key={p.url + i}
              className={`group flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer hover:border-indigo-500/50 hover:bg-slate-900/80 ${
                p.contactado ? 'border-green-500/30 bg-green-500/5' : 'border-slate-800 bg-slate-900/50'
              }`}
              onClick={() => window.open(p.url, '_blank')}
            >
              {/* Rank */}
              <span className="text-xs font-mono text-slate-600 w-6 text-right shrink-0">#{i + 1}</span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-200 truncate">{p.titulo}</span>
                  {p.contactado && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 shrink-0">✅ Contactado</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-slate-500">{p.m2} m²</span>
                  <span className="text-[11px] text-slate-600">·</span>
                  <span className="text-[11px] text-slate-500">{ratio} €/m²</span>
                  <span className="text-[11px] text-slate-600">·</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    p.portal === 'idealista' ? 'bg-green-500/10 text-green-500' :
                    p.portal === 'fotocasa' ? 'bg-orange-500/10 text-orange-500' :
                    'bg-blue-500/10 text-blue-500'
                  }`}>{p.portal}</span>
                </div>
              </div>

              {/* Price */}
              <div className="text-right shrink-0">
                <div className="text-lg font-bold text-amber-400">{p.precio}€</div>
              </div>

              {/* Contact button */}
              <button
                onClick={e => { e.stopPropagation(); contactar(p.url); }}
                disabled={cState === 'loading' || cState === 'ok' || status === 'offline'}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  cState === 'ok' ? 'bg-green-600 text-white' :
                  cState === 'loading' ? 'bg-yellow-600 text-white animate-pulse' :
                  cState === 'error' ? 'bg-red-600 text-white' :
                  'bg-green-600 hover:bg-green-500 text-white'
                }`}
              >
                {cState === 'loading' ? '⏳' : cState === 'ok' ? '✅' : cState === 'error' ? '❌' : '📞'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
