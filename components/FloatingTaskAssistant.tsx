/**
 * FloatingTaskAssistant — Asistente IA para priorizar y organizar tareas
 * Analiza tareas pendientes, guardias y calendario para dar recomendaciones
 * Usa la cadena de IA de FileHub (aiProxy)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CalendarEvent, Task } from '../types';
import { callAI, AIMessage } from '../services/aiProxy';

interface Props {
  calendarEvents: CalendarEvent[];
  tasks: Task[];
  onReorderTasks?: (tasks: Task[]) => void;
}

interface Suggestion {
  taskId?: string;
  title: string;
  when: string;
  why: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
}

const PRIORITY_STYLE: Record<string, { color: string; bg: string; icon: string }> = {
  urgent: { color: '#ef4444', bg: 'rgba(239,68,68,.12)', icon: '🔴' },
  high:   { color: '#f59e0b', bg: 'rgba(245,158,11,.12)', icon: '🟠' },
  medium: { color: '#3b82f6', bg: 'rgba(59,130,246,.12)', icon: '🔵' },
  low:    { color: '#10b981', bg: 'rgba(16,185,129,.12)', icon: '🟢' },
};

const FloatingTaskAssistant: React.FC<Props> = ({ calendarEvents, tasks, onReorderTasks }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dailyPlan, setDailyPlan] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [view, setView] = useState<'plan' | 'chat'>('plan');
  const [error, setError] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  // Build context for AI
  const buildContext = useCallback(() => {
    const pendingTasks = tasks.filter(t => !t.completed);
    const upcomingEvents = calendarEvents
      .filter(e => e.start >= todayStr && e.start <= weekEndStr)
      .sort((a, b) => a.start.localeCompare(b.start));

    const todayEvents = calendarEvents
      .filter(e => e.start?.startsWith(todayStr))
      .sort((a, b) => (a.start || '').localeCompare(b.start || ''));

    const guardias = calendarEvents
      .filter(e => e.title.toLowerCase().includes('guardia') && e.start >= todayStr)
      .sort((a, b) => a.start.localeCompare(b.start));

    return {
      fecha: today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      tareasPendientes: pendingTasks.map(t => ({
        id: t.id,
        titulo: t.title,
        prioridad: t.priority,
        categoria: t.category,
        fechaLimite: t.dueDate || 'sin fecha',
      })),
      eventosHoy: todayEvents.map(e => ({
        titulo: e.title,
        hora: e.start?.slice(11, 16) || 'todo el día',
        tipo: e.type,
      })),
      eventosSemana: upcomingEvents.map(e => ({
        titulo: e.title,
        fecha: e.start?.slice(0, 10),
        hora: e.start?.slice(11, 16) || '',
        tipo: e.type,
      })),
      proximasGuardias: guardias.slice(0, 5).map(g => ({
        titulo: g.title,
        fecha: g.start?.slice(0, 10),
      })),
      contexto: 'Carlos es residente de medicina familiar en Cartagena, termina residencia junio 2026. Se muda a Barcelona en septiembre. Trabaja en plataforma Cartagenaeste (pitch al hospital pendiente) y FILEHUB-IA. Pareja: Montse en Barcelona.',
    };
  }, [tasks, calendarEvents, todayStr, weekEndStr]);

  // Generate daily plan
  const generatePlan = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const ctx = buildContext();
      const systemPrompt = `Eres el asistente personal de productividad de Carlos. Hablas en español, eres directo y práctico.
Conoces su contexto: ${ctx.contexto}
Fecha actual: ${ctx.fecha}

Tu trabajo es:
1. Analizar las tareas pendientes y eventos del día/semana
2. Sugerir un orden óptimo para las tareas de HOY considerando guardias, energía y urgencia
3. Identificar tareas que se pueden hacer entre guardias o en tiempos muertos
4. Avisar de deadlines próximos

Responde en formato JSON con esta estructura EXACTA (sin markdown, sin backticks):
{
  "saludo": "frase motivacional corta personalizada",
  "planDia": "resumen de 2-3 frases de cómo organizar hoy",
  "sugerencias": [
    {
      "title": "nombre tarea",
      "when": "cuándo hacerla (ej: 'Ahora mismo', 'Después de la guardia', 'Esta tarde')",
      "why": "por qué ahora (1 frase)",
      "priority": "urgent|high|medium|low"
    }
  ]
}`;

      const userMsg = `Aquí está mi situación actual:

TAREAS PENDIENTES (${ctx.tareasPendientes.length}):
${ctx.tareasPendientes.map(t => `- [${t.prioridad}] ${t.titulo} (límite: ${t.fechaLimite})`).join('\n')}

EVENTOS HOY:
${ctx.eventosHoy.length > 0 ? ctx.eventosHoy.map(e => `- ${e.hora}: ${e.titulo}`).join('\n') : 'Ninguno específico'}

EVENTOS ESTA SEMANA:
${ctx.eventosSemana.map(e => `- ${e.fecha} ${e.hora}: ${e.titulo}`).join('\n')}

PRÓXIMAS GUARDIAS:
${ctx.proximasGuardias.map(g => `- ${g.fecha}: ${g.titulo}`).join('\n')}

Dame el plan para hoy y ordena mis tareas por prioridad real.`;

      const response = await callAI(
        [{ role: 'user', content: userMsg }],
        { system: systemPrompt, maxTokens: 1200 }
      );

      // Parse JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setDailyPlan(parsed.saludo + '\n\n' + parsed.planDia);
        setSuggestions(parsed.sugerencias || []);
      } else {
        // Fallback: show raw text
        setDailyPlan(response);
        setSuggestions([]);
      }
    } catch (e: any) {
      setError(e.message || 'No se pudo conectar con la IA');
    } finally {
      setLoading(false);
    }
  }, [buildContext]);

  // Chat with assistant
  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const userText = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userText }]);

    try {
      const ctx = buildContext();
      const systemPrompt = `Eres el asistente personal de productividad de Carlos. Español, directo, práctico.
Contexto: ${ctx.contexto}
Fecha: ${ctx.fecha}
Tareas pendientes: ${ctx.tareasPendientes.map(t => `${t.titulo} [${t.prioridad}, límite: ${t.fechaLimite}]`).join('; ')}
Eventos hoy: ${ctx.eventosHoy.map(e => `${e.hora}: ${e.titulo}`).join('; ') || 'ninguno'}
Próximas guardias: ${ctx.proximasGuardias.map(g => `${g.fecha}: ${g.titulo}`).join('; ')}

Responde de forma concisa. Si te pide reorganizar tareas, da una lista ordenada. Si pregunta cuándo hacer algo, considera guardias y disponibilidad.`;

      const messages: AIMessage[] = [
        ...chatHistory.map(m => ({ role: m.role, content: m.text })),
        { role: 'user' as const, content: userText },
      ];

      const response = await callAI(messages, { system: systemPrompt, maxTokens: 800 });
      setChatHistory(prev => [...prev, { role: 'assistant', text: response }]);
    } catch (e: any) {
      setChatHistory(prev => [...prev, { role: 'assistant', text: `❌ Error: ${e.message}` }]);
    }
  };

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Auto-generate plan on open
  useEffect(() => {
    if (open && suggestions.length === 0 && !dailyPlan && !loading) {
      generatePlan();
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) && !(e.target as HTMLElement).closest('#fta-fab')) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const pendingCount = tasks.filter(t => !t.completed && t.priority === 'high').length;

  return (
    <>
      <style>{`
        .fta-fab{position:fixed;bottom:92px;left:24px;z-index:99999;width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);border:none;cursor:pointer;box-shadow:0 4px 18px rgba(245,158,11,.4);display:flex;align-items:center;justify-content:center;transition:all .3s cubic-bezier(.34,1.56,.64,1);animation:fta-glow 4s ease-in-out infinite}
        .fta-fab:hover{transform:scale(1.12)}
        .fta-fab:active{transform:scale(.93)}
        .fta-fab.open{background:#ef4444;animation:none;transform:rotate(45deg)}
        @keyframes fta-glow{0%,100%{box-shadow:0 4px 18px rgba(245,158,11,.4)}50%{box-shadow:0 4px 24px rgba(245,158,11,.65),0 0 0 5px rgba(245,158,11,.08)}}
        .fta-badge{position:absolute;top:-2px;right:-2px;min-width:18px;height:18px;border-radius:9px;background:#ef4444;color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 3px;border:2px solid #fff;font-family:monospace}

        .fta-panel{position:fixed;bottom:152px;left:14px;z-index:99998;width:min(390px,calc(100vw - 28px));max-height:min(500px,calc(100vh - 180px));background:#111118;border:1px solid rgba(255,255,255,.07);border-radius:18px;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,.6);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;animation:fta-in .3s cubic-bezier(.34,1.56,.64,1);display:flex;flex-direction:column}
        @keyframes fta-in{from{opacity:0;transform:scale(.85) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}

        .fta-hdr{padding:12px 16px 8px;background:linear-gradient(135deg,rgba(245,158,11,.12),rgba(217,119,6,.08));border-bottom:1px solid rgba(255,255,255,.05);display:flex;align-items:center;justify-content:space-between}
        .fta-hdr h3{color:#fbbf24;font-size:14px;font-weight:700;margin:0}
        .fta-refresh{background:none;border:1px solid rgba(255,255,255,.1);color:#fbbf24;padding:3px 10px;border-radius:7px;font-size:10px;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:4px}
        .fta-refresh:hover{background:rgba(245,158,11,.15)}
        .fta-refresh:disabled{opacity:.4;pointer-events:none}

        .fta-tabs{display:flex;gap:3px;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,.05)}
        .fta-tab{padding:5px 12px;border-radius:7px;border:none;background:transparent;color:#64748b;font-size:11px;font-weight:600;cursor:pointer;transition:all .15s}
        .fta-tab:hover{color:#94a3b8;background:rgba(255,255,255,.04)}
        .fta-tab.act{background:rgba(245,158,11,.18);color:#fbbf24}

        .fta-body{flex:1;overflow-y:auto;padding:8px 10px 10px}
        .fta-body::-webkit-scrollbar{width:3px}
        .fta-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px}

        .fta-plan{color:#cbd5e1;font-size:13px;line-height:1.5;padding:8px 6px;white-space:pre-wrap}
        .fta-plan-greeting{color:#fbbf24;font-weight:600;font-size:14px;margin-bottom:8px;display:block}

        .fta-scard{padding:10px 12px;border-radius:10px;margin-bottom:5px;border:1px solid rgba(255,255,255,.05);transition:all .15s}
        .fta-scard:hover{border-color:rgba(255,255,255,.1)}
        .fta-scard-top{display:flex;align-items:flex-start;gap:8px}
        .fta-scard-icon{font-size:14px;margin-top:1px}
        .fta-scard-info{flex:1;min-width:0}
        .fta-scard-title{color:#e2e8f0;font-size:12px;font-weight:600;line-height:1.3}
        .fta-scard-when{display:inline-block;padding:2px 8px;border-radius:4px;font-size:9px;font-weight:700;margin-top:4px;background:rgba(245,158,11,.1);color:#fbbf24;text-transform:uppercase;letter-spacing:.3px}
        .fta-scard-why{color:#64748b;font-size:11px;margin-top:4px;line-height:1.3;font-style:italic}

        .fta-loading{text-align:center;padding:32px 16px;color:#fbbf24}
        .fta-loading-spinner{width:32px;height:32px;border:3px solid rgba(245,158,11,.15);border-top-color:#fbbf24;border-radius:50%;animation:fta-spin .7s linear infinite;margin:0 auto 12px}
        @keyframes fta-spin{to{transform:rotate(360deg)}}
        .fta-loading-text{font-size:12px;color:#94a3b8}

        .fta-error{color:#ef4444;font-size:12px;text-align:center;padding:16px;background:rgba(239,68,68,.05);border-radius:8px;margin:8px}

        /* Chat */
        .fta-chat{flex:1;overflow-y:auto;padding:8px 10px;display:flex;flex-direction:column;gap:6px}
        .fta-msg{max-width:85%;padding:8px 12px;border-radius:12px;font-size:12px;line-height:1.4;white-space:pre-wrap;word-break:break-word}
        .fta-msg.user{align-self:flex-end;background:rgba(99,102,241,.2);color:#c7d2fe;border-bottom-right-radius:4px}
        .fta-msg.assistant{align-self:flex-start;background:rgba(255,255,255,.05);color:#cbd5e1;border-bottom-left-radius:4px}

        .fta-chat-input{display:flex;gap:6px;padding:8px 10px;border-top:1px solid rgba(255,255,255,.05)}
        .fta-cinput{flex:1;padding:8px 10px;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:#e2e8f0;font-size:12px;font-family:inherit;outline:none}
        .fta-cinput:focus{border-color:#f59e0b}
        .fta-cinput::placeholder{color:#334155}
        .fta-csend{padding:8px 12px;border-radius:8px;border:none;background:#f59e0b;color:#fff;font-size:11px;font-weight:600;cursor:pointer;transition:all .15s}
        .fta-csend:hover{background:#d97706}
        .fta-csend:disabled{opacity:.4;pointer-events:none}

        .fta-quick{display:flex;gap:4px;padding:4px 10px;flex-wrap:wrap}
        .fta-qbtn{padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.08);background:transparent;color:#94a3b8;font-size:10px;cursor:pointer;transition:all .15s}
        .fta-qbtn:hover{border-color:#f59e0b;color:#fbbf24;background:rgba(245,158,11,.05)}

        .fta-empty{color:#475569;font-size:12px;text-align:center;padding:20px}
      `}</style>

      {/* FAB */}
      <button id="fta-fab" className={`fta-fab ${open ? 'open' : ''}`} onClick={() => setOpen(!open)}>
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2a3 3 0 00-3 3v1H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-3V5a3 3 0 00-3-3z" stroke="#fff" strokeWidth="1.6" fill="none"/>
            <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="18" cy="5" r="3" fill="#fbbf24" stroke="#fff" strokeWidth="1"/>
            <text x="18" y="7" textAnchor="middle" fill="#000" fontSize="5" fontWeight="bold">AI</text>
          </svg>
        )}
        {!open && pendingCount > 0 && <span className="fta-badge">{pendingCount}</span>}
      </button>

      {/* Panel */}
      {open && (
        <div className="fta-panel" ref={panelRef}>
          <div className="fta-hdr">
            <h3>🤖 Asistente de tareas</h3>
            <button className="fta-refresh" disabled={loading} onClick={generatePlan}>
              <span style={loading ? { animation: 'fta-spin .7s linear infinite', display: 'inline-block' } : {}}>↻</span>
              {loading ? 'Analizando...' : 'Actualizar'}
            </button>
          </div>

          <div className="fta-tabs">
            <button className={`fta-tab ${view === 'plan' ? 'act' : ''}`} onClick={() => setView('plan')}>
              📋 Plan del día
            </button>
            <button className={`fta-tab ${view === 'chat' ? 'act' : ''}`} onClick={() => { setView('chat'); setTimeout(() => inputRef.current?.focus(), 100); }}>
              💬 Pregúntame
            </button>
          </div>

          {view === 'plan' && (
            <div className="fta-body">
              {loading && (
                <div className="fta-loading">
                  <div className="fta-loading-spinner" />
                  <div className="fta-loading-text">Analizando tus tareas y guardias...</div>
                </div>
              )}

              {error && <div className="fta-error">⚠️ {error}</div>}

              {!loading && dailyPlan && (
                <>
                  <div className="fta-plan">
                    {(() => {
                      const lines = dailyPlan.split('\n\n');
                      return (
                        <>
                          <span className="fta-plan-greeting">{lines[0]}</span>
                          {lines.slice(1).join('\n\n')}
                        </>
                      );
                    })()}
                  </div>

                  {suggestions.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {suggestions.map((s, i) => {
                        const ps = PRIORITY_STYLE[s.priority] || PRIORITY_STYLE.medium;
                        return (
                          <div key={i} className="fta-scard" style={{ background: ps.bg }}>
                            <div className="fta-scard-top">
                              <span className="fta-scard-icon">{ps.icon}</span>
                              <div className="fta-scard-info">
                                <div className="fta-scard-title">{s.title}</div>
                                <span className="fta-scard-when">⏰ {s.when}</span>
                                <div className="fta-scard-why">{s.why}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {!loading && !dailyPlan && !error && (
                <div className="fta-empty">Pulsa "Actualizar" para generar tu plan</div>
              )}
            </div>
          )}

          {view === 'chat' && (
            <>
              <div className="fta-chat">
                {chatHistory.length === 0 && (
                  <>
                    <div className="fta-empty">Pregúntame sobre tus tareas, horarios o cómo organizarte</div>
                    <div className="fta-quick">
                      <button className="fta-qbtn" onClick={() => { setChatInput('¿Qué debería hacer primero hoy?'); }}>🎯 ¿Qué hago primero?</button>
                      <button className="fta-qbtn" onClick={() => { setChatInput('¿Cuándo tengo huecos libres esta semana?'); }}>📅 Huecos libres</button>
                      <button className="fta-qbtn" onClick={() => { setChatInput('Ordena todas mis tareas por urgencia real'); }}>🔥 Ordenar por urgencia</button>
                      <button className="fta-qbtn" onClick={() => { setChatInput('¿Qué puedo hacer entre guardias?'); }}>🏥 Entre guardias</button>
                    </div>
                  </>
                )}
                {chatHistory.map((m, i) => (
                  <div key={i} className={`fta-msg ${m.role}`}>{m.text}</div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="fta-chat-input">
                <input
                  ref={inputRef}
                  className="fta-cinput"
                  placeholder="Ej: ¿Cuándo preparo la sesión?"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChat()}
                />
                <button className="fta-csend" disabled={!chatInput.trim()} onClick={sendChat}>Enviar</button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default FloatingTaskAssistant;
