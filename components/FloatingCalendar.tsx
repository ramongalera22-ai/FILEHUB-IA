/**
 * FloatingCalendar – Botón flotante + panel desplegable
 * Lee CalendarEvent[] y Task[] del state de App (filehub_state en localStorage)
 * Sincroniza con Google Calendar via ICS (reutiliza googleCalendarSync)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CalendarEvent, Task } from '../types';
import { syncAllCarlosCalendars } from '../services/googleCalendarSync';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS = ['L','M','X','J','V','S','D'];

const TYPE_COLORS: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  work:     { dot: '#f59e0b', bg: '#fef3c7', text: '#92400e', label: 'Trabajo' },
  personal: { dot: '#8b5cf6', bg: '#ede9fe', text: '#4c1d95', label: 'Personal' },
  fitness:  { dot: '#10b981', bg: '#d1fae5', text: '#065f46', label: 'Fitness' },
  trip:     { dot: '#06b6d4', bg: '#cffafe', text: '#155e75', label: 'Viaje' },
  expense:  { dot: '#ef4444', bg: '#fee2e2', text: '#7f1d1d', label: 'Gasto' },
  project:  { dot: '#6366f1', bg: '#e0e7ff', text: '#312e81', label: 'Proyecto' },
  task:     { dot: '#3b82f6', bg: '#dbeafe', text: '#1e3a5f', label: 'Tarea' },
  google:   { dot: '#4f46e5', bg: '#eef2ff', text: '#312e81', label: 'Google' },
};

interface FloatingCalendarProps {
  calendarEvents: CalendarEvent[];
  tasks: Task[];
  onSyncEvents?: (events: CalendarEvent[]) => void;
}

const FloatingCalendar: React.FC<FloatingCalendarProps> = ({ calendarEvents, tasks, onSyncEvents }) => {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [view, setView] = useState<'calendar' | 'pending'>('calendar');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startIdx = firstDay === 0 ? 6 : firstDay - 1;
  const cells: (number | null)[] = [];
  for (let i = 0; i < startIdx; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dateKey = (d: number) => `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  // Map events by date
  const eventsByDate = useCallback(() => {
    const map: Record<string, { title: string; time?: string; type: string; source?: string; id: string }[]> = {};
    calendarEvents.forEach(ev => {
      const d = ev.start?.slice(0, 10);
      if (!d) return;
      if (!map[d]) map[d] = [];
      map[d].push({ title: ev.title, time: ev.start?.slice(11, 16), type: ev.type, source: ev.source, id: ev.id });
    });
    // Add tasks with dueDate
    tasks.forEach(t => {
      if (!t.dueDate || t.completed) return;
      const d = t.dueDate.slice(0, 10);
      if (!map[d]) map[d] = [];
      map[d].push({ title: t.title, type: 'task', id: t.id });
    });
    return map;
  }, [calendarEvents, tasks]);

  const evMap = eventsByDate();

  const dayItems = (d: number) => evMap[dateKey(d)] || [];

  // Pending items (today + future)
  const getPending = useCallback(() => {
    const items: { title: string; date: string; time?: string; type: string; id: string }[] = [];
    Object.entries(evMap).forEach(([date, evts]) => {
      if (date >= todayKey) {
        evts.forEach(e => items.push({ ...e, date }));
      }
    });
    return items.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
  }, [evMap, todayKey]);

  const pendingCount = getPending().length;

  // Sync Google Calendar
  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const { allEvents, results } = await syncAllCarlosCalendars(calendarEvents);
      const totalNew = results.reduce((s, r) => s + r.newCount, 0);
      const errors = results.filter(r => r.error);
      if (onSyncEvents) onSyncEvents(allEvents);
      setSyncMsg(errors.length > 0 ? `⚠️ ${errors[0].error}` : `✅ ${totalNew} nuevos`);
    } catch (e: any) {
      setSyncMsg(`❌ ${e.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 4000);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) && !(e.target as HTMLElement).closest('#fc-fab')) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const col = (type: string) => TYPE_COLORS[type] || TYPE_COLORS.personal;

  return (
    <>
      <style>{`
        .fc-fab{position:fixed;bottom:24px;right:24px;z-index:99999;width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;cursor:pointer;box-shadow:0 4px 20px rgba(99,102,241,.45);display:flex;align-items:center;justify-content:center;transition:all .3s cubic-bezier(.34,1.56,.64,1);animation:fc-glow 3s ease-in-out infinite}
        .fc-fab:hover{transform:scale(1.1)}
        .fc-fab:active{transform:scale(.95)}
        .fc-fab.open{background:#ef4444;animation:none;transform:rotate(45deg)}
        @keyframes fc-glow{0%,100%{box-shadow:0 4px 20px rgba(99,102,241,.45)}50%{box-shadow:0 4px 28px rgba(99,102,241,.7),0 0 0 6px rgba(99,102,241,.1)}}
        .fc-badge{position:absolute;top:-3px;right:-3px;min-width:20px;height:20px;border-radius:10px;background:#ef4444;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px;border:2px solid #fff;font-family:monospace}
        .fc-panel{position:fixed;bottom:92px;right:14px;z-index:99998;width:min(380px,calc(100vw - 28px));max-height:min(560px,calc(100vh - 120px));background:#111118;border:1px solid rgba(255,255,255,.07);border-radius:18px;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,.6);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;animation:fc-in .3s cubic-bezier(.34,1.56,.64,1);display:flex;flex-direction:column}
        @keyframes fc-in{from{opacity:0;transform:scale(.85) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .fc-hdr{padding:14px 16px 10px;background:linear-gradient(135deg,rgba(99,102,241,.12),rgba(139,92,246,.08));border-bottom:1px solid rgba(255,255,255,.05);display:flex;align-items:center;justify-content:space-between}
        .fc-hdr h3{color:#e2e8f0;font-size:14px;font-weight:700;margin:0}
        .fc-sync{background:none;border:1px solid rgba(255,255,255,.1);color:#a5b4fc;padding:4px 10px;border-radius:7px;font-size:10px;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:4px}
        .fc-sync:hover{background:rgba(99,102,241,.15);border-color:#6366f1}
        .fc-sync:disabled{opacity:.5;pointer-events:none}
        .fc-tabs{display:flex;gap:3px;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,.05)}
        .fc-tab{padding:5px 12px;border-radius:7px;border:none;background:transparent;color:#64748b;font-size:11px;font-weight:600;cursor:pointer;transition:all .15s}
        .fc-tab:hover{color:#94a3b8;background:rgba(255,255,255,.04)}
        .fc-tab.act{background:rgba(99,102,241,.18);color:#a5b4fc}
        .fc-nav{display:flex;align-items:center;justify-content:space-between;padding:8px 14px}
        .fc-nav span{color:#e2e8f0;font-size:13px;font-weight:700}
        .fc-nav button{background:rgba(255,255,255,.05);border:none;color:#94a3b8;width:28px;height:28px;border-radius:7px;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center}
        .fc-nav button:hover{background:rgba(99,102,241,.2);color:#a5b4fc}
        .fc-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:1px;padding:0 10px 6px}
        .fc-dl{text-align:center;font-size:9px;color:#475569;font-weight:700;padding:3px 0;text-transform:uppercase}
        .fc-c{aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:8px;cursor:pointer;position:relative;font-size:12px;color:#94a3b8;font-weight:500;transition:all .12s}
        .fc-c:hover{background:rgba(255,255,255,.05)}
        .fc-c.today{background:rgba(99,102,241,.18);color:#a5b4fc;font-weight:700}
        .fc-c.sel{background:rgba(99,102,241,.3);color:#fff;box-shadow:0 0 0 1.5px #6366f1}
        .fc-dots{position:absolute;bottom:2px;display:flex;gap:1.5px}
        .fc-dot{width:4px;height:4px;border-radius:50%}
        .fc-body{flex:1;overflow-y:auto;padding:6px 10px 10px}
        .fc-body::-webkit-scrollbar{width:3px}
        .fc-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px}
        .fc-card{display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);margin-bottom:4px;transition:all .12s}
        .fc-card:hover{background:rgba(255,255,255,.05)}
        .fc-bar{width:3px;min-height:28px;border-radius:2px;flex-shrink:0;margin-top:1px}
        .fc-info{flex:1;min-width:0}
        .fc-title{color:#e2e8f0;font-size:12px;font-weight:500;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .fc-meta{color:#475569;font-size:10px;margin-top:2px;font-family:monospace}
        .fc-tag{display:inline-block;padding:1px 6px;border-radius:3px;font-size:9px;font-weight:700;margin-top:3px;text-transform:uppercase;letter-spacing:.3px}
        .fc-empty{color:#475569;font-size:12px;text-align:center;padding:20px 14px}
        .fc-dlbl{color:#64748b;font-size:10px;font-weight:700;font-family:monospace;padding:6px 2px 3px;text-transform:uppercase;letter-spacing:.4px}
        .fc-smsg{font-size:10px;padding:0 14px 4px;transition:opacity .3s}
        @keyframes fc-spin{to{transform:rotate(360deg)}}
        .fc-spinning{animation:fc-spin .8s linear infinite;display:inline-block}
      `}</style>

      {/* FAB */}
      <button id="fc-fab" className={`fc-fab ${open ? 'open' : ''}`} onClick={() => setOpen(!open)}>
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M8 2v3M16 2v3M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/><rect x="7" y="11" width="3" height="3" rx=".5" fill="#fff" opacity=".7"/><rect x="14" y="11" width="3" height="3" rx=".5" fill="#fff" opacity=".5"/><rect x="7" y="16" width="3" height="3" rx=".5" fill="#fff" opacity=".4"/></svg>
        )}
        {!open && pendingCount > 0 && <span className="fc-badge">{Math.min(pendingCount, 99)}</span>}
      </button>

      {/* Panel */}
      {open && (
        <div className="fc-panel" ref={panelRef}>
          <div className="fc-hdr">
            <h3>📅 Calendario</h3>
            <button className="fc-sync" disabled={syncing} onClick={handleSync}>
              <span className={syncing ? 'fc-spinning' : ''}>↻</span>
              {syncing ? 'Sync...' : 'Sync Google'}
            </button>
          </div>
          {syncMsg && <div className="fc-smsg" style={{ color: syncMsg.startsWith('✅') ? '#10b981' : syncMsg.startsWith('⚠') ? '#f59e0b' : '#ef4444' }}>{syncMsg}</div>}

          <div className="fc-tabs">
            <button className={`fc-tab ${view === 'calendar' ? 'act' : ''}`} onClick={() => setView('calendar')}>Mes</button>
            <button className={`fc-tab ${view === 'pending' ? 'act' : ''}`} onClick={() => setView('pending')}>
              Pendientes{pendingCount > 0 ? ` (${pendingCount})` : ''}
            </button>
          </div>

          {view === 'calendar' && (
            <>
              <div className="fc-nav">
                <button onClick={prevMonth}>‹</button>
                <span>{MONTHS[month]} {year}</span>
                <button onClick={nextMonth}>›</button>
              </div>
              <div className="fc-grid">
                {DAYS.map(d => <div key={d} className="fc-dl">{d}</div>)}
                {cells.map((d, i) => {
                  if (d === null) return <div key={`e${i}`} />;
                  const k = dateKey(d);
                  const items = dayItems(d);
                  const isToday = k === todayKey;
                  const isSel = selectedDay === d;
                  const types = [...new Set(items.map(e => e.type))];
                  return (
                    <div key={k} className={`fc-c ${isToday ? 'today' : ''} ${isSel ? 'sel' : ''}`} onClick={() => setSelectedDay(d)}>
                      {d}
                      {types.length > 0 && (
                        <div className="fc-dots">
                          {types.slice(0, 3).map(t => <div key={t} className="fc-dot" style={{ background: col(t).dot }} />)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="fc-body">
                {selectedDay ? (
                  <>
                    <div className="fc-dlbl">{selectedDay} {MONTHS[month]}</div>
                    {dayItems(selectedDay).length === 0 && <div className="fc-empty">Sin eventos</div>}
                    {dayItems(selectedDay).map(ev => {
                      const c = col(ev.type);
                      return (
                        <div className="fc-card" key={ev.id}>
                          <div className="fc-bar" style={{ background: c.dot }} />
                          <div className="fc-info">
                            <div className="fc-title">{ev.title}</div>
                            {ev.time && <div className="fc-meta">{ev.time}h</div>}
                            <span className="fc-tag" style={{ background: c.bg, color: c.text }}>{c.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="fc-empty">Toca un día para ver eventos</div>
                )}
              </div>
            </>
          )}

          {view === 'pending' && (
            <div className="fc-body">
              {getPending().length === 0 ? (
                <div className="fc-empty">🎉 Sin pendientes</div>
              ) : (() => {
                let lastDate = '';
                return getPending().map((ev, i) => {
                  const c = col(ev.type);
                  const showDate = ev.date !== lastDate;
                  lastDate = ev.date;
                  const [y, m, d] = ev.date.split('-').map(Number);
                  return (
                    <React.Fragment key={`${ev.id}_${i}`}>
                      {showDate && <div className="fc-dlbl">{d} {MONTHS[m-1]} {y}</div>}
                      <div className="fc-card">
                        <div className="fc-bar" style={{ background: c.dot }} />
                        <div className="fc-info">
                          <div className="fc-title">{ev.title}</div>
                          {ev.time && <div className="fc-meta">{ev.time}h</div>}
                          <span className="fc-tag" style={{ background: c.bg, color: c.text }}>{c.label}</span>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default FloatingCalendar;
