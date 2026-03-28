import React, { useState, useEffect, useMemo } from 'react';
import { Users, Plus, Trash2, Calendar, MapPin, Clock, ChevronLeft, ChevronRight, X, Edit3, Save, CheckCircle2, Star, UserPlus, MessageCircle, Phone } from 'lucide-react';

interface Hangout {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  friends: string[];
  status: 'planned' | 'confirmed' | 'done' | 'cancelled';
  notes?: string;
  emoji: string;
}

interface Friend {
  id: string;
  name: string;
  emoji: string;
  phone?: string;
  lastSeen?: string;
}

const HANGOUT_TYPES = [
  { emoji: '🍻', label: 'Cañas' },
  { emoji: '☕', label: 'Café' },
  { emoji: '🍽️', label: 'Cena' },
  { emoji: '🎬', label: 'Cine/Series' },
  { emoji: '🏃', label: 'Deporte' },
  { emoji: '🎮', label: 'Gaming' },
  { emoji: '🏖️', label: 'Plan al aire libre' },
  { emoji: '🎉', label: 'Fiesta/Evento' },
  { emoji: '🏠', label: 'En casa' },
  { emoji: '📍', label: 'Otro' },
];

const STATUS_CONFIG = {
  planned: { label: 'Pendiente', color: 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' },
  confirmed: { label: 'Confirmada', color: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' },
  done: { label: 'Realizada', color: 'bg-slate-100 dark:bg-slate-500/10 text-slate-500 border-slate-200 dark:border-slate-700', dot: 'bg-slate-400' },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800', dot: 'bg-red-500' },
};

const HangoutsView: React.FC = () => {
  const [hangouts, setHangouts] = useState<Hangout[]>(() => {
    try { return JSON.parse(localStorage.getItem('filehub_hangouts') || '[]'); } catch { return []; }
  });
  const [friends, setFriends] = useState<Friend[]>(() => {
    try { return JSON.parse(localStorage.getItem('filehub_friends') || '[]'); } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [showFriendForm, setShowFriendForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'calendar' | 'friends'>('upcoming');
  const [calMonth, setCalMonth] = useState(new Date());

  const [form, setForm] = useState({ title: '', date: new Date().toISOString().split('T')[0], time: '20:00', location: '', friends: [] as string[], notes: '', emoji: '🍻', status: 'planned' as Hangout['status'] });
  const [friendForm, setFriendForm] = useState({ name: '', emoji: '😊', phone: '' });

  useEffect(() => { localStorage.setItem('filehub_hangouts', JSON.stringify(hangouts)); }, [hangouts]);
  useEffect(() => { localStorage.setItem('filehub_friends', JSON.stringify(friends)); }, [friends]);

  const handleSave = () => {
    if (!form.title.trim() || !form.date) return;
    if (editingId) {
      setHangouts(prev => prev.map(h => h.id === editingId ? { ...h, ...form } : h));
      setEditingId(null);
    } else {
      setHangouts(prev => [{ id: `hang-${Date.now()}`, ...form }, ...prev]);
    }
    setForm({ title: '', date: new Date().toISOString().split('T')[0], time: '20:00', location: '', friends: [], notes: '', emoji: '🍻', status: 'planned' });
    setShowForm(false);
  };

  const addFriend = () => {
    if (!friendForm.name.trim()) return;
    setFriends(prev => [...prev, { id: `fr-${Date.now()}`, ...friendForm }]);
    setFriendForm({ name: '', emoji: '😊', phone: '' });
    setShowFriendForm(false);
  };

  const toggleFriendInForm = (name: string) => {
    setForm(prev => ({ ...prev, friends: prev.friends.includes(name) ? prev.friends.filter(f => f !== name) : [...prev.friends, name] }));
  };

  const startEdit = (h: Hangout) => {
    setForm({ title: h.title, date: h.date, time: h.time, location: h.location, friends: h.friends, notes: h.notes || '', emoji: h.emoji, status: h.status });
    setEditingId(h.id);
    setShowForm(true);
  };

  const upcoming = hangouts.filter(h => h.status !== 'done' && h.status !== 'cancelled').sort((a, b) => a.date.localeCompare(b.date));
  const past = hangouts.filter(h => h.status === 'done' || h.status === 'cancelled').sort((a, b) => b.date.localeCompare(a.date));

  // Calendar logic
  const calYear = calMonth.getFullYear();
  const calMo = calMonth.getMonth();
  const daysInMonth = new Date(calYear, calMo + 1, 0).getDate();
  const firstDay = (new Date(calYear, calMo, 1).getDay() + 6) % 7; // Monday first
  const calDays: (null | number)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const hangoutsByDate = useMemo(() => {
    const map: Record<string, Hangout[]> = {};
    hangouts.forEach(h => { if (!map[h.date]) map[h.date] = []; map[h.date].push(h); });
    return map;
  }, [hangouts]);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/20 text-3xl">🍻</div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Quedadas</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold mt-0.5">Organiza planes con amigos y gente</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-800 rounded-xl text-xs font-black text-pink-600 dark:text-pink-400">{upcoming.length} próximas</div>
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ title: '', date: new Date().toISOString().split('T')[0], time: '20:00', location: '', friends: [], notes: '', emoji: '🍻', status: 'planned' }); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-pink-600/20">
            <Plus size={16} /> Nueva Quedada
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm gap-1 w-fit">
        {[
          { id: 'upcoming', label: '📅 Próximas', icon: Calendar },
          { id: 'calendar', label: '🗓️ Calendario', icon: Calendar },
          { id: 'friends', label: '👥 Amigos', icon: Users },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === tab.id ? 'bg-pink-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-pink-200 dark:border-pink-700 p-6 shadow-lg animate-in slide-in-from-top-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-lg text-slate-800 dark:text-white">{editingId ? 'Editar Quedada' : 'Nueva Quedada'}</h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"><X size={18} className="text-slate-400" /></button>
          </div>
          {/* Emoji picker */}
          <div className="flex flex-wrap gap-2">
            {HANGOUT_TYPES.map(t => (
              <button key={t.emoji} onClick={() => setForm({ ...form, emoji: t.emoji })}
                className={`px-3 py-2 rounded-xl text-sm border transition-all ${form.emoji === t.emoji ? 'bg-pink-600 text-white border-pink-600 shadow-md' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-pink-300'}`}>
                {t.emoji} <span className="text-[10px] font-bold">{t.label}</span>
              </button>
            ))}
          </div>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Nombre del plan..."
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-pink-400" />
          <div className="grid grid-cols-3 gap-3">
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-pink-400" />
            <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-pink-400" />
            <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="📍 Lugar..."
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-pink-400" />
          </div>
          {/* Friend selector */}
          {friends.length > 0 && (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 block">¿Con quién?</label>
              <div className="flex flex-wrap gap-2">
                {friends.map(f => (
                  <button key={f.id} onClick={() => toggleFriendInForm(f.name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${form.friends.includes(f.name) ? 'bg-pink-600 text-white border-pink-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-pink-300'}`}>
                    {f.emoji} {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notas (opcional)..."
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-pink-400 resize-none h-20" />
          <button onClick={handleSave} disabled={!form.title.trim()}
            className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-black text-xs uppercase tracking-wider disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg">
            <Save size={14} /> {editingId ? 'Actualizar' : 'Guardar Quedada'}
          </button>
        </div>
      )}

      {/* ═══ UPCOMING ═══ */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4 animate-in slide-in-from-bottom-2">
          {upcoming.length === 0 && past.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <span className="text-5xl block mb-4">🍻</span>
              <p className="text-lg font-black text-slate-800 dark:text-white mb-1">¡Hora de quedar!</p>
              <p className="text-sm text-slate-400">Crea tu primera quedada y organiza planes</p>
            </div>
          ) : (
            <>
              {upcoming.length > 0 && <h3 className="font-black text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider">Próximas</h3>}
              {upcoming.map(h => {
                const st = STATUS_CONFIG[h.status];
                const isToday = h.date === todayStr;
                const isPast = h.date < todayStr;
                return (
                  <div key={h.id} className={`bg-white dark:bg-slate-800 rounded-2xl border p-5 group hover:shadow-lg transition-all ${isToday ? 'border-pink-300 dark:border-pink-700 ring-2 ring-pink-200 dark:ring-pink-700/30' : 'border-slate-200 dark:border-slate-700'}`}>
                    <div className="flex items-start gap-4">
                      <div className="text-3xl flex-shrink-0">{h.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-black text-lg text-slate-800 dark:text-white">{h.title}</h4>
                          {isToday && <span className="text-[9px] font-black bg-pink-600 text-white px-2 py-0.5 rounded-md uppercase">¡Hoy!</span>}
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${st.color}`}>{st.label}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-bold">
                          <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(h.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                          <span className="flex items-center gap-1"><Clock size={12} /> {h.time}</span>
                          {h.location && <span className="flex items-center gap-1"><MapPin size={12} /> {h.location}</span>}
                        </div>
                        {h.friends.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {h.friends.map((f, i) => {
                              const friend = friends.find(fr => fr.name === f);
                              return <span key={i} className="text-[10px] font-bold bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 px-2 py-0.5 rounded-lg">{friend?.emoji || '👤'} {f}</span>;
                            })}
                          </div>
                        )}
                        {h.notes && <p className="text-xs text-slate-400 mt-2 italic">{h.notes}</p>}
                      </div>
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                        <button onClick={() => setHangouts(prev => prev.map(x => x.id === h.id ? { ...x, status: 'confirmed' } : x))} className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg text-slate-400 hover:text-emerald-500" title="Confirmar"><CheckCircle2 size={14} /></button>
                        <button onClick={() => startEdit(h)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-pink-500"><Edit3 size={14} /></button>
                        <button onClick={() => setHangouts(prev => prev.map(x => x.id === h.id ? { ...x, status: 'done' } : x))} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600" title="Marcar como hecha"><Star size={14} /></button>
                        <button onClick={() => setHangouts(prev => prev.filter(x => x.id !== h.id))} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {past.length > 0 && (
                <>
                  <h3 className="font-black text-sm text-slate-400 uppercase tracking-wider mt-8">Pasadas</h3>
                  {past.slice(0, 5).map(h => {
                    const st = STATUS_CONFIG[h.status];
                    return (
                      <div key={h.id} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 p-4 opacity-70 group hover:opacity-100 transition-all">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{h.emoji}</span>
                          <div className="flex-1">
                            <p className="font-bold text-sm text-slate-600 dark:text-slate-300">{h.title}</p>
                            <p className="text-[10px] text-slate-400">{new Date(h.date + 'T12:00:00').toLocaleDateString('es-ES')} · {h.friends.join(', ') || 'Solo'}</p>
                          </div>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${st.color}`}>{st.label}</span>
                          <button onClick={() => setHangouts(prev => prev.filter(x => x.id !== h.id))} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ CALENDAR ═══ */}
      {activeTab === 'calendar' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-pink-50/50 dark:bg-pink-500/5">
            <button onClick={() => setCalMonth(new Date(calYear, calMo - 1))} className="p-2 rounded-xl hover:bg-pink-100 dark:hover:bg-pink-500/10"><ChevronLeft size={18} className="text-slate-500" /></button>
            <h3 className="text-lg font-black text-slate-800 dark:text-white capitalize">{calMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h3>
            <button onClick={() => setCalMonth(new Date(calYear, calMo + 1))} className="p-2 rounded-xl hover:bg-pink-100 dark:hover:bg-pink-500/10"><ChevronRight size={18} className="text-slate-500" /></button>
          </div>
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700">
            {['L','M','X','J','V','S','D'].map(d => <div key={d} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {calDays.map((day, i) => {
              if (!day) return <div key={`e-${i}`} className="min-h-[80px] border-r border-b border-slate-50 dark:border-slate-700/50" />;
              const dateStr = `${calYear}-${String(calMo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayHangouts = hangoutsByDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              return (
                <div key={dateStr} className={`min-h-[80px] border-r border-b border-slate-50 dark:border-slate-700/50 p-1.5 ${isToday ? 'bg-pink-50 dark:bg-pink-500/5' : ''}`}>
                  <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-black mb-1 ${isToday ? 'bg-pink-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300'}`}>{day}</div>
                  {dayHangouts.map(h => (
                    <div key={h.id} onClick={() => startEdit(h)} className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-400 truncate cursor-pointer hover:bg-pink-200 transition-all mb-0.5">
                      {h.emoji} {h.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ FRIENDS ═══ */}
      {activeTab === 'friends' && (
        <div className="space-y-4 animate-in slide-in-from-bottom-2">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-lg text-slate-800 dark:text-white">{friends.length} amigos</h3>
            <button onClick={() => setShowFriendForm(true)} className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-black transition-all"><UserPlus size={14} /> Añadir</button>
          </div>
          {showFriendForm && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-pink-200 dark:border-pink-700 p-4 flex flex-wrap gap-3 items-end animate-in slide-in-from-top-1">
              <input value={friendForm.name} onChange={e => setFriendForm({ ...friendForm, name: e.target.value })} placeholder="Nombre..." className="flex-1 min-w-[150px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" />
              <div className="flex gap-1">
                {['😊','😎','🤓','👩','👨','🧑','💃','🕺','🤠','🎸'].map(e => (
                  <button key={e} onClick={() => setFriendForm({ ...friendForm, emoji: e })} className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center ${friendForm.emoji === e ? 'bg-pink-600 shadow-md' : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200'}`}>{e}</button>
                ))}
              </div>
              <input value={friendForm.phone} onChange={e => setFriendForm({ ...friendForm, phone: e.target.value })} placeholder="Teléfono (opt)" className="w-36 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none" />
              <button onClick={addFriend} disabled={!friendForm.name.trim()} className="px-5 py-2.5 bg-pink-600 text-white rounded-xl text-xs font-black disabled:opacity-40">Guardar</button>
              <button onClick={() => setShowFriendForm(false)} className="px-3 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded-xl text-xs font-bold">Cancelar</button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {friends.map(f => {
              const hangoutsCount = hangouts.filter(h => h.friends.includes(f.name)).length;
              return (
                <div key={f.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-4 group hover:shadow-md transition-all">
                  <div className="w-12 h-12 bg-pink-100 dark:bg-pink-500/10 rounded-xl flex items-center justify-center text-2xl">{f.emoji}</div>
                  <div className="flex-1">
                    <p className="font-black text-sm text-slate-800 dark:text-white">{f.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{hangoutsCount} quedada{hangoutsCount !== 1 ? 's' : ''}</p>
                  </div>
                  {f.phone && (
                    <a href={`tel:${f.phone}`} className="p-2 text-slate-400 hover:text-pink-500 transition-all"><Phone size={14} /></a>
                  )}
                  <button onClick={() => setFriends(prev => prev.filter(x => x.id !== f.id))} className="p-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                </div>
              );
            })}
          </div>
          {friends.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <Users size={40} className="mx-auto text-slate-200 dark:text-slate-600 mb-4" />
              <p className="text-sm font-bold text-slate-400">Añade amigos para organizar quedadas</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HangoutsView;
