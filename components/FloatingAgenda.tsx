/**
 * FloatingAgenda – Burbuja flotante de agenda diaria con checklist
 * Muestra tareas del día, eventos de hoy, y items personalizados
 * Persistencia en localStorage para items propios del día
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CalendarEvent, Task } from '../types';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const WEEKDAYS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

interface AgendaItem {
  id: string;
  title: string;
  time?: string;
  done: boolean;
  type: 'task' | 'event' | 'custom' | 'guardia';
  source?: string; // 'filehub' | 'gcal' | 'manual'
}

const TYPE_STYLE: Record<string, { icon: string; color: string; bg: string }> = {
  task:    { icon: '📋', color: '#3b82f6', bg: 'rgba(59,130,246,.1)' },
  event:   { icon: '📅', color: '#8b5cf6', bg: 'rgba(139,92,246,.1)' },
  custom:  { icon: '✏️', color: '#10b981', bg: 'rgba(16,185,129,.1)' },
  guardia: { icon: '🏥', color: '#f59e0b', bg: 'rgba(245,158,11,.1)' },
};

interface FloatingAgendaProps {
  calendarEvents: CalendarEvent[];
  tasks: Task[];
  onToggleTask?: (id: string, done: boolean) => void;
}

const FloatingAgenda: React.FC<FloatingAgendaProps> = ({ calendarEvents, tasks, onToggleTask }) => {
  const [open, setOpen] = useState(false);
  const [customItems, setCustomItems] = useState<AgendaItem[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [date, setDate] = useState(new Date());
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const storageKey = `filehub_agenda_${dateStr}`;
  const checksKey = `filehub_agenda_checks_${dateStr}`;

  const today = new Date();
  const isToday = dateStr === `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  // Load custom items & checks from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setCustomItems(JSON.parse(stored));
      else setCustomItems([]);
      const checks = localStorage.getItem(checksKey);
      if (checks) setCheckedIds(new Set(JSON.parse(checks)));
      else setCheckedIds(new Set());
    } catch { setCustomItems([]); setCheckedIds(new Set()); }
  }, [storageKey, checksKey]);

  // Save
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(customItems));
  }, [customItems, storageKey]);

  useEffect(() => {
    localStorage.setItem(checksKey, JSON.stringify([...checkedIds]));
  }, [checkedIds, checksKey]);

  // Build agenda from all sources
  const buildAgenda = useCallback((): AgendaItem[] => {
    const items: AgendaItem[] = [];

    // Tasks with dueDate matching
    tasks.forEach(t => {
      if (t.dueDate?.startsWith(dateStr)) {
        items.push({
          id: `task_${t.id}`,
          title: t.title,
          done: t.completed,
          type: 'task',
          source: 'filehub',
        });
      }
    });

    // Calendar events for this day
    calendarEvents.forEach(ev => {
      if (ev.start?.startsWith(dateStr)) {
        const isGuardia = ev.title.toLowerCase().includes('guardia');
        items.push({
          id: `ev_${ev.id}`,
          title: ev.title,
          time: ev.start?.slice(11, 16) || undefined,
          done: false,
          type: isGuardia ? 'guardia' : 'event',
          source: ev.source === 'google' ? 'gcal' : 'filehub',
        });
      }
    });

    // Custom items
    customItems.forEach(ci => items.push(ci));

    // Sort: by time if available, then events/guardias first, then tasks
    return items.sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time && !b.time) return -1;
      if (!a.time && b.time) return 1;
      const order = { guardia: 0, event: 1, task: 2, custom: 3 };
      return (order[a.type] || 3) - (order[b.type] || 3);
    });
  }, [tasks, calendarEvents, customItems, dateStr]);

  const agenda = buildAgenda();

  const isChecked = (id: string) => checkedIds.has(id);
  const toggleCheck = (item: AgendaItem) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
    // If it's a filehub task, propagate toggle
    if (item.source === 'filehub' && item.id.startsWith('task_') && onToggleTask) {
      const realId = item.id.replace('task_', '');
      onToggleTask(realId, !isChecked(item.id));
    }
  };

  const addItem = () => {
    if (!newTitle.trim()) return;
    const item: AgendaItem = {
      id: `custom_${Date.now()}`,
      title: newTitle.trim(),
      time: newTime || undefined,
      done: false,
      type: 'custom',
      source: 'manual',
    };
    setCustomItems(prev => [...prev, item]);
    setNewTitle('');
    setNewTime('');
    setShowAdd(false);
  };

  const removeCustom = (id: string) => {
    setCustomItems(prev => prev.filter(i => i.id !== id));
    setCheckedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const doneCount = agenda.filter(i => isChecked(i.id) || i.done).length;
  const totalCount = agenda.length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const prevDay = () => setDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; });
  const nextDay = () => setDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; });
  const goToday = () => setDate(new Date());

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) && !(e.target as HTMLElement).closest('#fa-fab')) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus input when adding
  useEffect(() => {
    if (showAdd && inputRef.current) inputRef.current.focus();
  }, [showAdd]);

  return (
    <>
      <style>{`
        .fa-fab{position:fixed;bottom:calc(24px + env(safe-area-inset-bottom,0px));left:24px;z-index:99999;width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);border:none;cursor:pointer;box-shadow:0 4px 20px rgba(16,185,129,.45);display:flex;align-items:center;justify-content:center;transition:all .3s cubic-bezier(.34,1.56,.64,1);animation:fa-glow 3s ease-in-out infinite}
        .fa-fab:hover{transform:scale(1.1)}
        .fa-fab:active{transform:scale(.95)}
        .fa-fab.open{background:#ef4444;animation:none;transform:rotate(45deg)}
        @keyframes fa-glow{0%,100%{box-shadow:0 4px 20px rgba(16,185,129,.45)}50%{box-shadow:0 4px 28px rgba(16,185,129,.7),0 0 0 6px rgba(16,185,129,.1)}}
        .fa-badge{position:absolute;top:-3px;right:-3px;min-width:20px;height:20px;border-radius:10px;background:#6366f1;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px;border:2px solid #fff;font-family:monospace}
        .fa-ring{position:absolute;inset:-4px;border-radius:50%;border:3px solid transparent;border-top-color:#10b981;transition:all .3s}

        .fa-panel{position:fixed;bottom:92px;left:14px;z-index:99998;width:min(370px,calc(100vw - 28px));max-height:min(580px,calc(100vh - 120px));background:#111118;border:1px solid rgba(255,255,255,.07);border-radius:18px;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,.6);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;animation:fa-in .3s cubic-bezier(.34,1.56,.64,1);display:flex;flex-direction:column}
        @keyframes fa-in{from{opacity:0;transform:scale(.85) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}

        .fa-hdr{padding:14px 16px 8px;background:linear-gradient(135deg,rgba(16,185,129,.12),rgba(5,150,105,.08));border-bottom:1px solid rgba(255,255,255,.05)}
        .fa-hdr-top{display:flex;align-items:center;justify-content:space-between}
        .fa-hdr h3{color:#e2e8f0;font-size:14px;font-weight:700;margin:0}
        .fa-today-btn{background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.3);color:#6ee7b7;padding:3px 10px;border-radius:6px;font-size:10px;font-weight:600;cursor:pointer;transition:all .15s}
        .fa-today-btn:hover{background:rgba(16,185,129,.25)}

        .fa-nav{display:flex;align-items:center;justify-content:space-between;padding:8px 16px 6px}
        .fa-nav span{color:#cbd5e1;font-size:13px;font-weight:600}
        .fa-nav button{background:rgba(255,255,255,.05);border:none;color:#94a3b8;width:28px;height:28px;border-radius:7px;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center}
        .fa-nav button:hover{background:rgba(16,185,129,.2);color:#6ee7b7}

        .fa-progress{padding:4px 16px 10px;display:flex;align-items:center;gap:10px}
        .fa-pbar{flex:1;height:6px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden}
        .fa-pfill{height:100%;border-radius:3px;transition:width .4s cubic-bezier(.34,1.56,.64,1)}
        .fa-ptext{color:#64748b;font-size:10px;font-family:monospace;font-weight:700;min-width:36px;text-align:right}

        .fa-body{flex:1;overflow-y:auto;padding:4px 10px 10px}
        .fa-body::-webkit-scrollbar{width:3px}
        .fa-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px}

        .fa-item{display:flex;align-items:flex-start;gap:10px;padding:10px 10px;border-radius:10px;margin-bottom:4px;transition:all .15s;cursor:pointer;border:1px solid transparent}
        .fa-item:hover{background:rgba(255,255,255,.03);border-color:rgba(255,255,255,.05)}
        .fa-item.done{opacity:.45}
        .fa-item.done .fa-ititle{text-decoration:line-through}

        .fa-check{width:22px;height:22px;border-radius:7px;border:2px solid rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;margin-top:1px}
        .fa-check.checked{border-color:#10b981;background:#10b981}
        .fa-check svg{opacity:0;transition:opacity .15s}
        .fa-check.checked svg{opacity:1}

        .fa-icontent{flex:1;min-width:0}
        .fa-ititle{color:#e2e8f0;font-size:13px;font-weight:500;line-height:1.35}
        .fa-irow{display:flex;align-items:center;gap:6px;margin-top:3px;flex-wrap:wrap}
        .fa-itime{color:#475569;font-size:10px;font-family:monospace}
        .fa-itag{display:inline-flex;align-items:center;gap:3px;padding:1px 7px;border-radius:4px;font-size:9px;font-weight:700;letter-spacing:.3px}
        .fa-isrc{color:#334155;font-size:9px;font-style:italic}

        .fa-del{background:none;border:none;color:#334155;cursor:pointer;padding:4px;border-radius:4px;font-size:13px;flex-shrink:0;transition:all .12s;opacity:0}
        .fa-item:hover .fa-del{opacity:1}
        .fa-del:hover{color:#ef4444;background:rgba(239,68,68,.1)}

        .fa-add-area{border-top:1px solid rgba(255,255,255,.05);padding:8px 12px}
        .fa-add-toggle{width:100%;padding:8px;border-radius:8px;border:1px dashed rgba(255,255,255,.1);background:transparent;color:#64748b;font-size:12px;cursor:pointer;transition:all .15s;font-family:inherit}
        .fa-add-toggle:hover{border-color:rgba(16,185,129,.3);color:#6ee7b7;background:rgba(16,185,129,.05)}
        .fa-add-form{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
        .fa-input{flex:1;min-width:100px;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:#e2e8f0;font-size:12px;font-family:inherit;outline:none;transition:border .15s}
        .fa-input:focus{border-color:#10b981}
        .fa-input::placeholder{color:#334155}
        .fa-time-input{width:80px;min-width:80px;flex:none}
        .fa-add-btn{padding:8px 14px;border-radius:8px;border:none;background:#10b981;color:#fff;font-size:11px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap}
        .fa-add-btn:hover{background:#059669}
        .fa-add-btn:disabled{opacity:.4;pointer-events:none}
        .fa-cancel{background:none;border:none;color:#475569;cursor:pointer;font-size:16px;padding:4px}

        .fa-empty{color:#475569;font-size:12px;text-align:center;padding:28px 16px}
        .fa-complete{text-align:center;padding:24px 16px}
        .fa-complete-emoji{font-size:36px;margin-bottom:8px}
        .fa-complete-text{color:#6ee7b7;font-size:13px;font-weight:600}
      `}</style>

      {/* FAB */}
      <button id="fa-fab" className={`fa-fab ${open ? 'open' : ''}`} onClick={() => setOpen(!open)}>
        {/* Progress ring */}
        {!open && totalCount > 0 && (
          <svg style={{ position: 'absolute', inset: -4, width: 66, height: 66, transform: 'rotate(-90deg)' }}>
            <circle cx="33" cy="33" r="30" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="3" />
            <circle cx="33" cy="33" r="30" fill="none" stroke="#6ee7b7" strokeWidth="3" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 30}`}
              strokeDashoffset={`${2 * Math.PI * 30 * (1 - progress / 100)}`}
              style={{ transition: 'stroke-dashoffset .5s ease' }}
            />
          </svg>
        )}
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
            <rect x="9" y="3" width="6" height="4" rx="1" stroke="#fff" strokeWidth="1.8"/>
            <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".8"/>
          </svg>
        )}
        {!open && totalCount > 0 && (
          <span className="fa-badge">{totalCount - doneCount}</span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fa-panel" ref={panelRef}>
          <div className="fa-hdr">
            <div className="fa-hdr-top">
              <h3>📝 Agenda del día</h3>
              {!isToday && <button className="fa-today-btn" onClick={goToday}>Hoy</button>}
            </div>
          </div>

          <div className="fa-nav">
            <button onClick={prevDay}>‹</button>
            <span>
              {isToday ? 'Hoy — ' : ''}{WEEKDAYS[date.getDay()]} {date.getDate()} {MONTHS[date.getMonth()]}
            </span>
            <button onClick={nextDay}>›</button>
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="fa-progress">
              <div className="fa-pbar">
                <div className="fa-pfill" style={{
                  width: `${progress}%`,
                  background: progress === 100 ? '#10b981' : progress > 50 ? '#6ee7b7' : '#f59e0b'
                }} />
              </div>
              <span className="fa-ptext">{doneCount}/{totalCount}</span>
            </div>
          )}

          {/* Items */}
          <div className="fa-body">
            {agenda.length === 0 && !showAdd && (
              <div className="fa-empty">Nada programado para este día.<br/>Añade tareas con el botón de abajo ↓</div>
            )}
            {progress === 100 && totalCount > 0 && (
              <div className="fa-complete">
                <div className="fa-complete-emoji">🎉</div>
                <div className="fa-complete-text">¡Todo completado!</div>
              </div>
            )}
            {agenda.map(item => {
              const checked = isChecked(item.id) || item.done;
              const st = TYPE_STYLE[item.type] || TYPE_STYLE.custom;
              return (
                <div key={item.id} className={`fa-item ${checked ? 'done' : ''}`} onClick={() => toggleCheck(item)}>
                  <div className={`fa-check ${checked ? 'checked' : ''}`}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="fa-icontent">
                    <div className="fa-ititle">{item.title}</div>
                    <div className="fa-irow">
                      {item.time && <span className="fa-itime">{item.time}h</span>}
                      <span className="fa-itag" style={{ background: st.bg, color: st.color }}>
                        {st.icon} {item.type === 'guardia' ? 'Guardia' : item.type === 'event' ? 'Evento' : item.type === 'task' ? 'Tarea' : 'Personal'}
                      </span>
                      {item.source === 'gcal' && <span className="fa-isrc">Google</span>}
                    </div>
                  </div>
                  {item.id.startsWith('custom_') && (
                    <button className="fa-del" onClick={(e) => { e.stopPropagation(); removeCustom(item.id); }}>✕</button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add area */}
          <div className="fa-add-area">
            {!showAdd ? (
              <button className="fa-add-toggle" onClick={() => setShowAdd(true)}>+ Añadir tarea al día</button>
            ) : (
              <div className="fa-add-form">
                <input
                  ref={inputRef}
                  className="fa-input"
                  placeholder="Nueva tarea..."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addItem()}
                />
                <input
                  className="fa-input fa-time-input"
                  type="time"
                  value={newTime}
                  onChange={e => setNewTime(e.target.value)}
                />
                <button className="fa-add-btn" disabled={!newTitle.trim()} onClick={addItem}>Añadir</button>
                <button className="fa-cancel" onClick={() => { setShowAdd(false); setNewTitle(''); setNewTime(''); }}>✕</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingAgenda;
