import React, { useState, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Shield,
  Clock, Sun, Moon, Sunrise, AlertCircle, Download
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { CalendarEvent } from '../types';

interface ShiftsCalendarViewProps {
  events: CalendarEvent[];
  onAddEvent: (event: CalendarEvent) => void;
  onDeleteEvent?: (id: string) => void;
  session?: any;
}

const SHIFT_TYPES = [
  { id: 'guardia',   label: 'Guardia',     color: 'bg-red-500',    textColor: 'text-red-600 dark:text-red-400',    border: 'border-red-500',    bg: 'bg-red-50 dark:bg-red-500/10',    emoji: '🔴' },
  { id: 'mañana',   label: 'Mañana',      color: 'bg-amber-400',  textColor: 'text-amber-600 dark:text-amber-400',  border: 'border-amber-400',  bg: 'bg-amber-50 dark:bg-amber-500/10',  emoji: '🌅' },
  { id: 'tarde',    label: 'Tarde',       color: 'bg-blue-500',   textColor: 'text-blue-600 dark:text-blue-400',   border: 'border-blue-500',   bg: 'bg-blue-50 dark:bg-blue-500/10',   emoji: '🌆' },
  { id: 'noche',    label: 'Noche',       color: 'bg-indigo-600', textColor: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10', emoji: '🌙' },
  { id: 'inferior', label: 'Inferior',    color: 'bg-emerald-500',textColor: 'text-emerald-600 dark:text-emerald-400',border:'border-emerald-500',bg:'bg-emerald-50 dark:bg-emerald-500/10', emoji: '🟢' },
  { id: 'libre',    label: 'Libre/Fiesta',color: 'bg-purple-500', textColor: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', emoji: '🎉' },
];

const DAYS_ES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const ShiftsCalendarView: React.FC<ShiftsCalendarViewProps> = ({ events, onAddEvent, onDeleteEvent, session }) => {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedShiftType, setSelectedShiftType] = useState('guardia');
  const [shiftNote, setShiftNote] = useState('');
  const [showStats, setShowStats] = useState(false);

  // Only show work/shift events (guardia, mañana, tarde, noche, inferior, libre, + type=work)
  const shiftKeywords = SHIFT_TYPES.map(s => s.id.toLowerCase());
  const shiftEvents = events.filter(e =>
    e.type === 'work' || shiftKeywords.some(k => e.title.toLowerCase().includes(k))
  );

  // Build calendar grid
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Monday-first: (getDay() + 6) % 7
  const startOffset = (firstDay.getDay() + 6) % 7;

  const days: (null | { date: string; dayNum: number; isToday: boolean; isWeekend: boolean })[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    const dateStr = date.toISOString().split('T')[0];
    const dow = date.getDay();
    days.push({ date: dateStr, dayNum: d, isToday: dateStr === today.toISOString().split('T')[0], isWeekend: dow === 0 || dow === 6 });
  }

  const getShiftForDate = (dateStr: string) => {
    return shiftEvents.filter(e => e.start.startsWith(dateStr));
  };

  const getShiftConfig = (title: string) => {
    const key = title.toLowerCase();
    return SHIFT_TYPES.find(s => key.includes(s.id.toLowerCase())) || null;
  };

  const addShift = async () => {
    if (!selectedDate) return;
    const shiftConf = SHIFT_TYPES.find(s => s.id === selectedShiftType)!;
    const event: CalendarEvent = {
      id: `shift_${Date.now()}`,
      title: `${shiftConf.label}${shiftNote ? ` — ${shiftNote}` : ''}`,
      start: selectedDate,
      end: selectedDate,
      type: 'work',
      source: 'manual',
    };
    onAddEvent(event);
    setShowAddForm(false);
    setShiftNote('');
  };

  const deleteShift = async (eventId: string) => {
    if (onDeleteEvent) onDeleteEvent(eventId);
  };

  // Stats
  const monthEvents = shiftEvents.filter(e => e.start.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`));
  const statsMap: Record<string, number> = {};
  SHIFT_TYPES.forEach(s => {
    statsMap[s.id] = monthEvents.filter(e => e.title.toLowerCase().includes(s.id)).length;
  });

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const selectedShifts = selectedDate ? getShiftForDate(selectedDate) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/25">
            <Shield size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-red-500 to-rose-500 bg-clip-text text-transparent">
              Calendario de Guardias
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Planifica y visualiza tus turnos de trabajo</p>
          </div>
        </div>
        <button onClick={() => setShowStats(!showStats)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:border-red-400/50 transition-all">
          <Clock size={14} /> {showStats ? 'Ver calendario' : 'Ver estadísticas'}
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-2 flex-wrap">
        {SHIFT_TYPES.map(s => (
          <div key={s.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${s.bg} ${s.textColor} ${s.border}`}>
            <span>{s.emoji}</span> {s.label}
          </div>
        ))}
      </div>

      {showStats ? (
        /* STATS VIEW */
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {SHIFT_TYPES.map(s => (
            <div key={s.id} className={`bg-white dark:bg-slate-800 rounded-2xl border p-5 ${s.border} border-l-4`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{s.emoji}</span>
                <span className="text-3xl font-black text-slate-800 dark:text-white">{statsMap[s.id] || 0}</span>
              </div>
              <p className={`text-sm font-bold ${s.textColor}`}>{s.label}</p>
              <p className="text-xs text-slate-400">{MONTHS_ES[month]} {year}</p>
            </div>
          ))}
          <div className="col-span-2 sm:col-span-3 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-500/5 dark:to-rose-500/5 rounded-2xl border border-red-200 dark:border-red-800 p-5">
            <p className="font-black text-red-700 dark:text-red-400 mb-2">Total {MONTHS_ES[month]}</p>
            <p className="text-4xl font-black text-slate-800 dark:text-white">{monthEvents.length} <span className="text-lg text-slate-400 font-medium">turnos registrados</span></p>
          </div>
        </div>
      ) : (
        /* CALENDAR VIEW */
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-500/5 dark:to-rose-500/5">
            <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 text-slate-600 dark:text-slate-300 transition-all">
              <ChevronLeft size={18} />
            </button>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">{MONTHS_ES[month]} {year}</h3>
            <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 text-slate-600 dark:text-slate-300 transition-all">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700">
            {DAYS_ES.map(d => (
              <div key={d} className={`py-3 text-center text-xs font-black uppercase tracking-wider ${d === 'S' || d === 'D' ? 'text-rose-400' : 'text-slate-400'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="min-h-[80px] border-r border-b border-slate-50 dark:border-slate-700/50" />;
              const dayShifts = getShiftForDate(day.date);
              const isSelected = selectedDate === day.date;
              return (
                <div key={day.date}
                  onClick={() => { setSelectedDate(day.date); setShowAddForm(false); }}
                  className={`min-h-[80px] border-r border-b border-slate-50 dark:border-slate-700/50 p-1.5 cursor-pointer transition-all hover:bg-red-50/50 dark:hover:bg-red-500/5 ${
                    isSelected ? 'bg-red-50 dark:bg-red-500/10 ring-2 ring-inset ring-red-400' : ''
                  } ${day.isWeekend ? 'bg-rose-50/30 dark:bg-rose-500/3' : ''}`}>
                  <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-black mb-1 ${
                    day.isToday ? 'bg-red-500 text-white shadow-md shadow-red-500/30' :
                    day.isWeekend ? 'text-rose-400' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {day.dayNum}
                  </div>
                  <div className="space-y-0.5">
                    {dayShifts.slice(0, 2).map(ev => {
                      const conf = getShiftConfig(ev.title);
                      return (
                        <div key={ev.id} className={`text-[9px] font-black px-1.5 py-0.5 rounded-md truncate text-white ${conf?.color || 'bg-slate-500'}`}>
                          {conf?.emoji} {ev.title.split('—')[0].trim()}
                        </div>
                      );
                    })}
                    {dayShifts.length > 2 && (
                      <div className="text-[9px] text-slate-400 font-bold px-1">+{dayShifts.length - 2}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected day panel */}
      {selectedDate && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-500/5 dark:to-rose-500/5">
            <h3 className="font-black text-slate-800 dark:text-white">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <button onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold text-sm rounded-xl transition-all">
              <Plus size={14} /> Añadir turno
            </button>
          </div>

          {showAddForm && (
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex flex-wrap gap-2 mb-3">
                {SHIFT_TYPES.map(s => (
                  <button key={s.id} onClick={() => setSelectedShiftType(s.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                      selectedShiftType === s.id ? `${s.color} text-white border-transparent shadow-md` : `${s.bg} ${s.textColor} ${s.border}`
                    }`}>
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={shiftNote} onChange={e => setShiftNote(e.target.value)}
                  placeholder="Nota opcional (ej: Hospital General)..."
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500/20" />
                <button onClick={addShift}
                  className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all text-sm">
                  ✓ Guardar
                </button>
              </div>
            </div>
          )}

          <div className="p-5">
            {selectedShifts.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Sin turnos para este día. Pulsa "Añadir turno" para registrar.</p>
            ) : (
              <div className="space-y-2">
                {selectedShifts.map(ev => {
                  const conf = getShiftConfig(ev.title);
                  return (
                    <div key={ev.id} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${conf?.bg || 'bg-slate-50 dark:bg-slate-700'} ${conf?.border || 'border-slate-200'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{conf?.emoji || '📅'}</span>
                        <div>
                          <p className={`font-black text-sm ${conf?.textColor || 'text-slate-700 dark:text-slate-200'}`}>{ev.title}</p>
                          <p className="text-xs text-slate-400">Turno de trabajo</p>
                        </div>
                      </div>
                      {onDeleteEvent && (
                        <button onClick={() => deleteShift(ev.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftsCalendarView;
