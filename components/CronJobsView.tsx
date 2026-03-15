import React, { useState, useEffect } from 'react';
import {
  Clock, Play, Pause, Trash2, Plus, RefreshCw, CheckCircle2,
  AlertCircle, Home, Briefcase, Building2, Globe, Calendar,
  ChevronRight, Activity, Zap, Edit3, X, Save
} from 'lucide-react';

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  scheduleLabel: string;
  description: string;
  category: 'pisos' | 'empleo' | 'healthtech' | 'resumen';
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  status: 'active' | 'paused' | 'error' | 'running';
  runCount: number;
}

const DEFAULT_CRONS: CronJob[] = [
  {
    id: '1',
    name: 'Monitor Pisos',
    schedule: '0 8,19 * * *',
    scheduleLabel: 'Cada día 8h y 19h',
    description: 'Idealista y Fotocasa – alquileres Murcia ≤800€. Alerta si baja precio o hay piso nuevo.',
    category: 'pisos',
    enabled: true,
    lastRun: new Date(Date.now() - 3600000).toISOString(),
    nextRun: new Date(Date.now() + 3600000 * 5).toISOString(),
    status: 'active',
    runCount: 14,
  },
  {
    id: '2',
    name: 'Ofertas Médico Familia',
    schedule: '0 8,19 * * *',
    scheduleLabel: 'Cada día 8h y 19h',
    description: 'Búsqueda en camfic.cat, portaldelmec.cat, infojobs.net y LinkedIn. Barcelona y alrededores.',
    category: 'empleo',
    enabled: true,
    lastRun: new Date(Date.now() - 3600000).toISOString(),
    nextRun: new Date(Date.now() + 3600000 * 5).toISOString(),
    status: 'active',
    runCount: 14,
  },
  {
    id: '3',
    name: 'Consultoría Digital Médico',
    schedule: '0 8,19 * * *',
    scheduleLabel: 'Cada día 8h y 19h',
    description: 'Medical advisor, clinical consultant en LinkedIn, Indeed y Glassdoor.',
    category: 'empleo',
    enabled: true,
    lastRun: new Date(Date.now() - 3600000).toISOString(),
    nextRun: new Date(Date.now() + 3600000 * 5).toISOString(),
    status: 'active',
    runCount: 14,
  },
  {
    id: '4',
    name: 'Startups HealthTech España',
    schedule: '0 8,19 * * *',
    scheduleLabel: 'Cada día 8h y 19h',
    description: 'Doctolib, Alan, Teladoc, Doctoralia, Livi. Guarda en trabajos-healthtech.md.',
    category: 'healthtech',
    enabled: true,
    lastRun: new Date(Date.now() - 3600000).toISOString(),
    nextRun: new Date(Date.now() + 3600000 * 5).toISOString(),
    status: 'active',
    runCount: 14,
  },
  {
    id: '5',
    name: 'Médico Remoto Internacional',
    schedule: '0 8,19 * * *',
    scheduleLabel: 'Cada día 8h y 19h',
    description: 'Noom, Babylon Health, K Health. Busca "physician remote Spain" en LinkedIn.',
    category: 'healthtech',
    enabled: true,
    lastRun: new Date(Date.now() - 3600000).toISOString(),
    nextRun: new Date(Date.now() + 3600000 * 5).toISOString(),
    status: 'active',
    runCount: 14,
  },
  {
    id: '6',
    name: 'Resumen Semanal Lunes',
    schedule: '0 8 * * 1',
    scheduleLabel: 'Lunes a las 8h',
    description: 'Calendario iCal + tiempo Murcia/Barcelona + pisos + trabajos + tareas FILEHUB. Todo por WhatsApp.',
    category: 'resumen',
    enabled: true,
    lastRun: new Date(Date.now() - 86400000 * 3).toISOString(),
    nextRun: new Date(Date.now() + 86400000 * 4).toISOString(),
    status: 'active',
    runCount: 4,
  },
];

const CATEGORY_CONFIG = {
  pisos: { label: 'Pisos', icon: Home, color: 'indigo', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  empleo: { label: 'Empleo', icon: Briefcase, color: 'emerald', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  healthtech: { label: 'HealthTech', icon: Building2, color: 'violet', bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  resumen: { label: 'Resumen', icon: Globe, color: 'amber', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
};

const STATUS_CONFIG = {
  active: { label: 'Activo', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  paused: { label: 'Pausado', color: 'text-slate-400', dot: 'bg-slate-500' },
  error: { label: 'Error', color: 'text-red-400', dot: 'bg-red-400' },
  running: { label: 'Ejecutando...', color: 'text-blue-400', dot: 'bg-blue-400 animate-pulse' },
};

function formatRelative(isoDate?: string): string {
  if (!isoDate) return '—';
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

function formatNext(isoDate?: string): string {
  if (!isoDate) return '—';
  const diff = new Date(isoDate).getTime() - Date.now();
  if (diff < 0) return 'pendiente';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `en ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `en ${hrs}h`;
  return `en ${Math.floor(hrs / 24)}d`;
}

const CronJobsView: React.FC = () => {
  const STORAGE_KEY = 'filehub_cronjobs';
  const [jobs, setJobs] = useState<CronJob[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_CRONS;
    } catch { return DEFAULT_CRONS; }
  });

  const [filter, setFilter] = useState<'all' | CronJob['category']>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CronJob>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newJob, setNewJob] = useState<Partial<CronJob>>({
    name: '', schedule: '', scheduleLabel: '', description: '', category: 'pisos', enabled: true, status: 'active', runCount: 0
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  }, [jobs]);

  const toggleJob = (id: string) => {
    setJobs(prev => prev.map(j => j.id === id
      ? { ...j, enabled: !j.enabled, status: j.enabled ? 'paused' : 'active' }
      : j
    ));
  };

  const deleteJob = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
  };

  const simulateRun = (id: string) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'running' } : j));
    setTimeout(() => {
      setJobs(prev => prev.map(j => j.id === id
        ? { ...j, status: 'active', lastRun: new Date().toISOString(), runCount: j.runCount + 1 }
        : j
      ));
    }, 2000);
  };

  const saveEdit = () => {
    if (!editingId) return;
    setJobs(prev => prev.map(j => j.id === editingId ? { ...j, ...editForm } : j));
    setEditingId(null);
    setEditForm({});
  };

  const addJob = () => {
    if (!newJob.name || !newJob.schedule) return;
    const job: CronJob = {
      id: Date.now().toString(),
      name: newJob.name || '',
      schedule: newJob.schedule || '',
      scheduleLabel: newJob.scheduleLabel || newJob.schedule || '',
      description: newJob.description || '',
      category: newJob.category as CronJob['category'] || 'empleo',
      enabled: true,
      status: 'active',
      runCount: 0,
    };
    setJobs(prev => [...prev, job]);
    setShowAdd(false);
    setNewJob({ name: '', schedule: '', scheduleLabel: '', description: '', category: 'pisos', enabled: true, status: 'active', runCount: 0 });
  };

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.category === filter);
  const activeCount = jobs.filter(j => j.enabled).length;
  const totalRuns = jobs.reduce((sum, j) => sum + j.runCount, 0);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8fafc] dark:bg-slate-950 p-4 md:p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <Clock size={24} className="text-indigo-500" />
            Cron Jobs Bot
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Automatizaciones activas del bot OpenClaw</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-indigo-900/20"
        >
          <Plus size={16} />
          Nuevo Cron
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Jobs', value: jobs.length, icon: Zap, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Activos', value: activeCount, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Pausados', value: jobs.length - activeCount, icon: Pause, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Ejecuciones', value: totalRuns, icon: RefreshCw, color: 'text-violet-400', bg: 'bg-violet-500/10' },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/60 dark:border-white/5 shadow-sm">
            <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon size={18} className={stat.color} />
            </div>
            <div className="text-2xl font-black text-slate-800 dark:text-white">{stat.value}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pisos', 'empleo', 'healthtech', 'resumen'] as const).map(cat => {
          const cfg = cat === 'all' ? null : CATEGORY_CONFIG[cat];
          const isActive = filter === cat;
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-900/20'
                  : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200/60 dark:border-white/5 hover:border-indigo-500/40'
              }`}
            >
              {cat === 'all' ? 'Todos' : cfg?.label}
            </button>
          );
        })}
      </div>

      {/* Job Cards */}
      <div className="space-y-3">
        {filtered.map(job => {
          const cat = CATEGORY_CONFIG[job.category];
          const CatIcon = cat.icon;
          const status = STATUS_CONFIG[job.status];
          const isEditing = editingId === job.id;

          return (
            <div
              key={job.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm transition-all ${
                job.enabled
                  ? 'border-slate-200/60 dark:border-white/5'
                  : 'border-slate-200/30 dark:border-white/3 opacity-60'
              }`}
            >
              {isEditing ? (
                <div className="p-4 space-y-3">
                  <input
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white font-bold border border-slate-200 dark:border-white/10 focus:outline-none focus:border-indigo-500"
                    value={editForm.name || ''}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nombre"
                  />
                  <input
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 focus:outline-none focus:border-indigo-500 font-mono"
                    value={editForm.schedule || ''}
                    onChange={e => setEditForm(f => ({ ...f, schedule: e.target.value }))}
                    placeholder="Cron expression (ej: 0 8,19 * * *)"
                  />
                  <input
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 focus:outline-none focus:border-indigo-500"
                    value={editForm.scheduleLabel || ''}
                    onChange={e => setEditForm(f => ({ ...f, scheduleLabel: e.target.value }))}
                    placeholder="Descripción del horario"
                  />
                  <textarea
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 focus:outline-none focus:border-indigo-500 resize-none"
                    rows={2}
                    value={editForm.description || ''}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Descripción"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors">
                      <Save size={13} /> Guardar
                    </button>
                    <button onClick={() => { setEditingId(null); setEditForm({}); }} className="flex items-center gap-1.5 px-3 py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                      <X size={13} /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Category icon */}
                    <div className={`w-10 h-10 ${cat.bg} rounded-xl flex items-center justify-center shrink-0 border ${cat.border}`}>
                      <CatIcon size={18} className={cat.text} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-800 dark:text-white text-sm">{job.name}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${cat.text} ${cat.bg} px-2 py-0.5 rounded-full border ${cat.border}`}>
                          {cat.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{job.description}</p>

                      {/* Schedule + status row */}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Clock size={11} className="text-slate-400" />
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{job.scheduleLabel}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          <span className={`text-[11px] font-bold ${status.color}`}>{status.label}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">{job.schedule}</span>
                      </div>

                      {/* Last/next run */}
                      <div className="flex gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <CheckCircle2 size={11} className="text-slate-400" />
                          <span className="text-[11px] text-slate-400">Último: <span className="text-slate-600 dark:text-slate-300 font-semibold">{formatRelative(job.lastRun)}</span></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ChevronRight size={11} className="text-slate-400" />
                          <span className="text-[11px] text-slate-400">Próximo: <span className="text-slate-600 dark:text-slate-300 font-semibold">{formatNext(job.nextRun)}</span></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <RefreshCw size={11} className="text-slate-400" />
                          <span className="text-[11px] text-slate-400"><span className="text-slate-600 dark:text-slate-300 font-semibold">{job.runCount}</span> ejecuciones</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={() => simulateRun(job.id)}
                        disabled={job.status === 'running' || !job.enabled}
                        title="Ejecutar ahora"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors disabled:opacity-30"
                      >
                        <Play size={14} />
                      </button>
                      <button
                        onClick={() => toggleJob(job.id)}
                        title={job.enabled ? 'Pausar' : 'Activar'}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                          job.enabled
                            ? 'text-amber-400 hover:bg-amber-500/10'
                            : 'text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                      >
                        {job.enabled ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                      <button
                        onClick={() => { setEditingId(job.id); setEditForm({ name: job.name, schedule: job.schedule, scheduleLabel: job.scheduleLabel, description: job.description }); }}
                        title="Editar"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => deleteJob(job.id)}
                        title="Eliminar"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 dark:text-slate-600">
            <AlertCircle size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold">No hay cron jobs en esta categoría</p>
          </div>
        )}
      </div>

      {/* Add new job modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-800 dark:text-white">Nuevo Cron Job</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={20} /></button>
            </div>
            <input
              className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-white font-bold border border-slate-200 dark:border-white/10 focus:outline-none focus:border-indigo-500"
              value={newJob.name || ''}
              onChange={e => setNewJob(f => ({ ...f, name: e.target.value }))}
              placeholder="Nombre del job *"
            />
            <input
              className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 focus:outline-none focus:border-indigo-500 font-mono"
              value={newJob.schedule || ''}
              onChange={e => setNewJob(f => ({ ...f, schedule: e.target.value }))}
              placeholder="Cron expression * (ej: 0 8 * * 1)"
            />
            <input
              className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 focus:outline-none focus:border-indigo-500"
              value={newJob.scheduleLabel || ''}
              onChange={e => setNewJob(f => ({ ...f, scheduleLabel: e.target.value }))}
              placeholder="Descripción horario (ej: Lunes 8h)"
            />
            <textarea
              className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 focus:outline-none focus:border-indigo-500 resize-none"
              rows={2}
              value={newJob.description || ''}
              onChange={e => setNewJob(f => ({ ...f, description: e.target.value }))}
              placeholder="Descripción de lo que hace"
            />
            <select
              className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 focus:outline-none focus:border-indigo-500"
              value={newJob.category}
              onChange={e => setNewJob(f => ({ ...f, category: e.target.value as CronJob['category'] }))}
            >
              <option value="pisos">🏠 Pisos</option>
              <option value="empleo">💼 Empleo</option>
              <option value="healthtech">🏥 HealthTech</option>
              <option value="resumen">🌐 Resumen</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={addJob}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black transition-colors shadow-md shadow-indigo-900/20"
              >
                Crear Job
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4 flex gap-3">
        <Calendar size={18} className="text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Gestión real desde Ubuntu</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Para gestionar los crons reales en OpenClaw usa: <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-700 dark:text-slate-300">openclaw cron list</code> y <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-700 dark:text-slate-300">openclaw cron pause &lt;nombre&gt;</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CronJobsView;
