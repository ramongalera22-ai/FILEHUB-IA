import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell, Plus, Trash2, TrendingUp, AlertTriangle, Check,
  DollarSign, Target, BarChart3, Zap, Settings, BellOff, BellRing
} from 'lucide-react';
import { Expense } from '../types';
import { BudgetAlert, checkBudgetAlerts, requestNotificationPermission, showLocalNotification, getNotificationPermission } from '../services/notificationService';
import { supabase } from '../services/supabaseClient';

interface BudgetAlertsViewProps {
  expenses: Expense[];
  session?: any;
}

const EXPENSE_CATEGORIES = [
  'Alimentación', 'Transporte', 'Vivienda', 'Ocio', 'Salud',
  'Ropa', 'Tecnología', 'Educación', 'Restaurantes', 'General'
];

const CATEGORY_ICONS: Record<string, string> = {
  'Alimentación': '🛒', 'Transporte': '🚗', 'Vivienda': '🏠', 'Ocio': '🎬',
  'Salud': '💊', 'Ropa': '👕', 'Tecnología': '💻', 'Educación': '📚',
  'Restaurantes': '🍽️', 'General': '📦'
};

const BudgetAlertsView: React.FC<BudgetAlertsViewProps> = ({ expenses, session }) => {
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default');
  const [form, setForm] = useState({ category: 'Alimentación', limit: 200, period: 'monthly' as const, notify: true });

  useEffect(() => {
    setNotifPerm(getNotificationPermission());
    const saved = localStorage.getItem('filehub_budget_alerts');
    if (saved) setAlerts(JSON.parse(saved));
  }, []);

  const persist = (updated: BudgetAlert[]) => {
    setAlerts(updated);
    localStorage.setItem('filehub_budget_alerts', JSON.stringify(updated));
  };

  const enableNotifications = async () => {
    const ok = await requestNotificationPermission();
    setNotifPerm(ok ? 'granted' : 'denied');
    if (ok) showLocalNotification('✅ Notificaciones activas', 'FileHub te avisará cuando superes un límite de presupuesto.', { tag: 'test' });
  };

  const addAlert = () => {
    if (alerts.some(a => a.category === form.category)) return;
    const a: BudgetAlert = { id: `alert_${Date.now()}`, ...form };
    persist([...alerts, a]);
    setForm({ category: 'Alimentación', limit: 200, period: 'monthly', notify: true });
    setShowForm(false);
  };

  const deleteAlert = (id: string) => persist(alerts.filter(a => a.id !== id));

  const toggleAlert = (id: string) => persist(alerts.map(a => a.id === id ? { ...a, notify: !a.notify } : a));

  // Compute spending per category this month
  const now = new Date();
  const monthSpending = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      const d = new Date(e.date);
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        map[e.category] = (map[e.category] || 0) + Math.abs(e.amount);
      }
    });
    return map;
  }, [expenses]);

  // Check alerts and show in-app warnings
  const alertStatus = useMemo(() => {
    return alerts.map(a => {
      const spent = monthSpending[a.category] || 0;
      const pct = Math.min((spent / a.limit) * 100, 100);
      return { ...a, spent, pct, isOver: spent >= a.limit, isWarning: spent >= a.limit * 0.9 && spent < a.limit };
    });
  }, [alerts, monthSpending]);

  const totalBudget = alerts.reduce((s, a) => s + a.limit, 0);
  const totalSpent = alerts.reduce((s, a) => s + (monthSpending[a.category] || 0), 0);
  const overBudgetCount = alertStatus.filter(a => a.isOver).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Target size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Control de Presupuesto
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Alertas automáticas · Límites por categoría</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/25 hover:scale-105 transition-all">
          <Plus size={18} /> Nuevo límite
        </button>
      </div>

      {/* Notification permission banner */}
      {notifPerm !== 'granted' && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/5 rounded-2xl border border-amber-200 dark:border-amber-500/20 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BellRing size={20} className="text-amber-500 shrink-0" />
            <div>
              <p className="font-bold text-sm text-amber-700 dark:text-amber-400">Activa las notificaciones push</p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70">
                {notifPerm === 'denied' ? 'Bloqueadas en el navegador. Permite notificaciones en la configuración.' : 'Recibe alertas cuando superes el 90% de un límite'}
              </p>
            </div>
          </div>
          {notifPerm !== 'denied' && (
            <button onClick={enableNotifications}
              className="shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-all">
              Activar
            </button>
          )}
        </div>
      )}
      {notifPerm === 'granted' && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
          <Check size={14} className="text-emerald-500" />
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Notificaciones push activas</p>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Presupuesto total</p>
          <p className="text-2xl font-black text-slate-800 dark:text-white">€{totalBudget.toLocaleString()}</p>
          <p className="text-xs text-slate-500">este mes</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Gastado</p>
          <p className={`text-2xl font-black ${totalSpent > totalBudget ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
            €{totalSpent.toFixed(0)}
          </p>
          <p className="text-xs text-slate-500">{totalBudget > 0 ? Math.round(totalSpent / totalBudget * 100) : 0}% usado</p>
        </div>
        <div className={`rounded-2xl border p-4 ${overBudgetCount > 0 ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'}`}>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Alertas activas</p>
          <p className={`text-2xl font-black ${overBudgetCount > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{overBudgetCount}</p>
          <p className="text-xs text-slate-500">{overBudgetCount > 0 ? 'sobre límite' : 'todo bien'}</p>
        </div>
      </div>

      {/* Add alert form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-emerald-400/40 shadow-xl p-6 space-y-4">
          <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Target size={16} className="text-emerald-500" /> Nuevo límite de presupuesto
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Categoría</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20">
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_ICONS[c] || '📦'} {c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Límite (€)</label>
              <input type="number" value={form.limit} onChange={e => setForm({ ...form, limit: +e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Periodo</label>
              <select value={form.period} onChange={e => setForm({ ...form, period: e.target.value as any })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20">
                <option value="monthly">Mensual</option>
                <option value="weekly">Semanal</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setForm({ ...form, notify: !form.notify })}
                  className={`w-10 h-5 rounded-full relative transition-colors ${form.notify ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.notify ? 'left-5' : 'left-0.5'}`} />
                </div>
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Notificar al 90%</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={addAlert}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black py-3 rounded-xl hover:opacity-90 transition-all shadow-lg">
              ✓ Crear límite
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 bg-slate-100 dark:bg-slate-700 text-slate-500 font-bold rounded-xl">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Budget bars */}
      {alertStatus.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="text-5xl mb-4">🎯</div>
          <p className="font-bold text-slate-600 dark:text-slate-300">Sin límites configurados</p>
          <p className="text-xs text-slate-400 mt-1">Añade límites por categoría para controlar tus gastos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertStatus.sort((a, b) => b.pct - a.pct).map(a => (
            <div key={a.id} className={`bg-white dark:bg-slate-800 rounded-2xl border overflow-hidden transition-all ${
              a.isOver ? 'border-red-300 dark:border-red-500/40 shadow-md shadow-red-500/5' :
              a.isWarning ? 'border-amber-300 dark:border-amber-500/40 shadow-md shadow-amber-500/5' :
              'border-slate-200 dark:border-slate-700'
            }`}>
              {/* Progress bar */}
              <div className="h-1.5 bg-slate-100 dark:bg-slate-700">
                <div
                  className={`h-full transition-all duration-700 ${a.isOver ? 'bg-red-500' : a.isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(a.pct, 100)}%` }}
                />
              </div>

              <div className="p-4 flex items-center gap-4">
                <div className="text-2xl shrink-0">{CATEGORY_ICONS[a.category] || '📦'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-black text-sm text-slate-800 dark:text-white">{a.category}</p>
                    <div className="flex items-center gap-2">
                      {a.isOver && <span className="text-[10px] font-black bg-red-100 dark:bg-red-500/20 text-red-600 px-2 py-0.5 rounded-lg flex items-center gap-1"><AlertTriangle size={9} /> Superado</span>}
                      {a.isWarning && !a.isOver && <span className="text-[10px] font-black bg-amber-100 dark:bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded-lg">⚠️ Atención</span>}
                      <span className={`text-sm font-black ${a.isOver ? 'text-red-500' : a.isWarning ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {Math.round(a.pct)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-bold text-slate-700 dark:text-slate-200">€{a.spent.toFixed(0)}</span>
                      {' '}de €{a.limit} · {a.period === 'monthly' ? 'mensual' : 'semanal'}
                    </p>
                    <p className={`text-xs font-bold ${a.isOver ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {a.isOver ? `+€${(a.spent - a.limit).toFixed(0)} pasado` : `€${(a.limit - a.spent).toFixed(0)} restante`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleAlert(a.id)} title={a.notify ? 'Desactivar alerta' : 'Activar alerta'}
                    className={`p-2 rounded-xl transition-all ${a.notify ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'text-slate-400 bg-slate-50 dark:bg-slate-700'}`}>
                    {a.notify ? <BellRing size={16} /> : <BellOff size={16} />}
                  </button>
                  <button onClick={() => deleteAlert(a.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Monthly overview - categories without alert */}
      {Object.keys(monthSpending).filter(c => !alerts.some(a => a.category === c) && monthSpending[c] > 0).length > 0 && (
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
            <BarChart3 size={12} /> Categorías sin límite (este mes)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(monthSpending).filter(([c]) => !alerts.some(a => a.category === c) && monthSpending[c] > 0)
              .sort(([,a],[,b]) => (b as number) - (a as number)).slice(0, 6).map(([cat, amount]) => (
              <div key={cat} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-2">
                <span className="text-lg">{CATEGORY_ICONS[cat] || '📦'}</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">{cat}</p>
                  <p className="text-sm font-black text-slate-800 dark:text-white">€{(amount as number).toFixed(0)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetAlertsView;
