import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, Square, Trash2, X, Loader2, Sparkles, Play, Pause,
  Search, Clock, FileText, ChevronDown, ChevronUp, Volume2,
  Stethoscope, ClipboardList, Send, Copy, Check, RefreshCw, Activity
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { callAI } from '../services/aiProxy';

// ─── Types ───
interface Session {
  id: string;
  user_id?: string;
  title: string;
  transcription: string;
  soap_note?: string;
  summary?: string;
  action_items?: string;
  template?: string;
  duration_seconds: number;
  status: 'recording' | 'transcribed' | 'processed' | 'reviewed';
  created_at: string;
}

const TEMPLATES = [
  { id: 'soap', label: 'SOAP', icon: '🩺', desc: 'Subjetivo, Objetivo, Análisis, Plan' },
  { id: 'summary', label: 'Resumen', icon: '📋', desc: 'Resumen clínico estructurado' },
  { id: 'referral', label: 'Derivación', icon: '📨', desc: 'Carta de derivación a especialista' },
  { id: 'evolution', label: 'Evolución', icon: '📝', desc: 'Nota de evolución clínica' },
  { id: 'freeform', label: 'Libre', icon: '✏️', desc: 'Transcripción sin formato' },
];

const STORAGE_KEY = 'filehub_voice_sessions';

// ─── Component ───
export default function VoiceNotesView({ session, carplayMode = false }: { session: any; carplayMode?: boolean }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('soap');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState('');
  const [view, setView] = useState<'scribe' | 'history'>('scribe');

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const currentSessionRef = useRef<string | null>(null);
  const fullTranscriptRef = useRef('');

  // ─── Load ───
  const load = useCallback(async () => {
    if (session?.user?.id) {
      try {
        const { data } = await supabase.from('voice_notes').select('*')
          .eq('user_id', session.user.id).order('created_at', { ascending: false });
        if (data?.length) {
          const mapped = data.map((n: any) => ({
            id: n.id, user_id: n.user_id, title: n.title, transcription: n.transcription,
            soap_note: n.ai_summary, summary: n.ai_category, action_items: n.ai_action_items,
            template: n.status === 'reviewed' ? 'soap' : 'freeform',
            duration_seconds: n.duration_seconds || 0, status: n.status as any, created_at: n.created_at,
          }));
          setSessions(mapped);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
          return;
        }
      } catch {}
    }
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) setSessions(JSON.parse(s)); } catch {}
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const persist = (updated: Session[]) => {
    setSessions(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const saveToCloud = async (s: Session) => {
    if (!session?.user?.id) return;
    try {
      await supabase.from('voice_notes').upsert({
        id: s.id, user_id: session.user.id, title: s.title,
        transcription: s.transcription, ai_summary: s.soap_note || s.summary,
        ai_category: s.summary, ai_action_items: s.action_items,
        duration_seconds: s.duration_seconds, status: s.status, created_at: s.created_at,
      }, { onConflict: 'id' });
    } catch {}
  };

  // ─── Recording ───
  const startRecording = () => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) { alert('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Safari.'); return; }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-ES';
    recognition.maxAlternatives = 1;

    fullTranscriptRef.current = '';
    setLiveTranscript('');
    setRecordingTime(0);

    const sessionId = `vs_${Date.now()}`;
    currentSessionRef.current = sessionId;

    recognition.onresult = (event: any) => {
      let interim = '', final = '';
      for (let i = 0; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t + ' ';
        else interim += t;
      }
      if (final) fullTranscriptRef.current = final;
      setLiveTranscript(fullTranscriptRef.current + interim);
    };

    recognition.onerror = (e: any) => { if (e.error !== 'no-speech') console.warn('Speech error:', e.error); };
    recognition.onend = () => { if (isRecording) try { recognition.start(); } catch {} };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);

    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
  };

  const stopRecording = () => {
    if (recognitionRef.current) { recognitionRef.current.onend = null; recognitionRef.current.stop(); }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);

    const transcript = fullTranscriptRef.current.trim() || liveTranscript.trim();
    if (!transcript) return;

    const now = new Date();
    const newSession: Session = {
      id: currentSessionRef.current || `vs_${Date.now()}`,
      title: `Consulta ${now.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} ${now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
      transcription: transcript,
      duration_seconds: recordingTime,
      status: 'transcribed',
      template: selectedTemplate,
      created_at: now.toISOString(),
    };

    const updated = [newSession, ...sessions];
    persist(updated);
    saveToCloud(newSession);
    setExpandedId(newSession.id);
    setLiveTranscript('');
    setRecordingTime(0);

    // Auto-generate notes
    generateNotes(newSession.id, transcript, selectedTemplate, updated);
  };

  // ─── AI Note Generation ───
  const generateNotes = async (id: string, transcript: string, template: string, currentSessions?: Session[]) => {
    setProcessing(id);
    const systemPrompts: Record<string, string> = {
      soap: `Eres un escriba médico experto. Genera una nota clínica SOAP completa en español a partir de la transcripción de consulta. Formato:
## SUBJETIVO
(Motivo de consulta, síntomas, antecedentes relevantes)
## OBJETIVO
(Exploración, signos vitales, hallazgos)
## ANÁLISIS
(Diagnóstico diferencial, valoración)
## PLAN
(Tratamiento, pruebas, seguimiento)

Si no hay datos suficientes para alguna sección, indica "Pendiente de exploración/datos". Sé conciso y clínico.`,
      summary: `Genera un resumen clínico estructurado en español con: Motivo de consulta, Antecedentes relevantes, Hallazgos clave, Impresión diagnóstica, Plan. Conciso y profesional.`,
      referral: `Genera una carta de derivación a especialista en español con: Datos del paciente (deducir de la transcripción), Motivo de derivación, Historia clínica relevante, Exploración, Juicio clínico, Solicitud concreta. Formato formal de carta médica.`,
      evolution: `Genera una nota de evolución clínica en español con: Fecha, Motivo, Evolución desde última visita, Exploración actual, Plan actualizado. Conciso.`,
      freeform: `Limpia y estructura la transcripción en español. Corrige errores de transcripción evidentes. Separa en párrafos lógicos. No inventes información.`,
    };

    try {
      const result = await callAI(
        [{ role: 'user', content: `Transcripción de consulta:\n\n${transcript}` }],
        { system: systemPrompts[template] || systemPrompts.soap, maxTokens: 1500 }
      );

      const all = currentSessions || sessions;
      const updated = all.map(s => s.id === id ? { ...s, soap_note: result, status: 'processed' as const } : s);
      persist(updated);
      const target = updated.find(s => s.id === id);
      if (target) saveToCloud(target);
    } catch (e: any) {
      console.warn('AI generation failed:', e);
    }
    setProcessing(null);
  };

  const regenerate = (s: Session) => generateNotes(s.id, s.transcription, s.template || 'soap');

  const deleteSession = (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    persist(updated);
    if (session?.user?.id) supabase.from('voice_notes').delete().eq('id', id).then(() => {});
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const filtered = sessions.filter(s =>
    !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.transcription.toLowerCase().includes(search.toLowerCase())
  );

  // ════════════════════════ CARPLAY MODE ════════════════════════
  if (carplayMode) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col items-center justify-center select-none">
        <div className="text-center mb-12">
          <Stethoscope size={48} className="text-emerald-400 mx-auto mb-4" />
          <h1 className="text-3xl font-black text-white tracking-tight">Scribe Médico</h1>
          <p className="text-slate-500 text-lg mt-2">
            {isRecording ? `Grabando — ${fmt(recordingTime)}` : `${sessions.length} sesiones`}
          </p>
        </div>

        {/* Big Record Button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-40 h-40 rounded-full flex items-center justify-center transition-all active:scale-90 ${
            isRecording
              ? 'bg-red-500 shadow-[0_0_60px_rgba(239,68,68,0.5)] animate-pulse'
              : 'bg-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.3)]'
          }`}
        >
          {isRecording ? <Square size={48} className="text-white" /> : <Mic size={56} className="text-white" />}
        </button>

        {isRecording && liveTranscript && (
          <div className="mt-10 mx-8 max-h-40 overflow-y-auto bg-slate-900/80 rounded-2xl p-6 border border-slate-800">
            <p className="text-slate-300 text-lg leading-relaxed">{liveTranscript.slice(-300)}</p>
          </div>
        )}

        {!isRecording && sessions[0]?.soap_note && (
          <div className="mt-8 mx-8 text-center">
            <p className="text-emerald-400 font-bold text-lg">✅ Última nota generada</p>
            <p className="text-slate-500 text-sm mt-1">{sessions[0].title}</p>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════ FULL UI ════════════════════════
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
            <Stethoscope size={24} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Scribe Médico</h1>
            <p className="text-xs text-slate-500">Transcripción clínica con IA • Estilo Heidi</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView('scribe')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${view === 'scribe' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <Mic size={14} className="inline mr-1" /> Grabar
          </button>
          <button onClick={() => setView('history')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${view === 'history' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <ClipboardList size={14} className="inline mr-1" /> Sesiones ({sessions.length})
          </button>
        </div>
      </div>

      {view === 'scribe' && (
        <>
          {/* Template Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {TEMPLATES.map(t => (
              <button key={t.id} onClick={() => setSelectedTemplate(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedTemplate === t.id
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-white/3 border-white/5 text-slate-500 hover:border-white/15'
                }`}>
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>

          {/* Recording Zone */}
          <div className={`relative rounded-3xl border-2 transition-all overflow-hidden ${
            isRecording
              ? 'border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_40px_rgba(16,185,129,0.1)]'
              : 'border-white/5 bg-white/[0.02]'
          }`}>
            <div className="flex flex-col items-center py-12 md:py-16">
              {/* Status */}
              {isRecording && (
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-400 text-sm font-bold uppercase tracking-widest">Grabando consulta</span>
                  <span className="font-mono text-2xl font-black text-white">{fmt(recordingTime)}</span>
                </div>
              )}

              {!isRecording && !liveTranscript && (
                <div className="mb-6 text-center">
                  <p className="text-slate-400 text-sm">Plantilla: <strong className="text-emerald-400">{TEMPLATES.find(t => t.id === selectedTemplate)?.label}</strong></p>
                  <p className="text-slate-600 text-xs mt-1">{TEMPLATES.find(t => t.id === selectedTemplate)?.desc}</p>
                </div>
              )}

              {/* Big Button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-28 h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_50px_rgba(239,68,68,0.4)]'
                    : 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_0_30px_rgba(16,185,129,0.25)]'
                }`}
              >
                {isRecording ? (
                  <Square size={36} className="text-white" />
                ) : (
                  <Mic size={40} className="text-white" />
                )}
              </button>

              <p className="text-slate-500 text-xs mt-4 font-bold">
                {isRecording ? 'Pulsa para detener y generar nota' : 'Pulsa para iniciar consulta'}
              </p>
            </div>

            {/* Live Transcript */}
            {isRecording && liveTranscript && (
              <div className="mx-6 mb-6 bg-slate-900/60 rounded-2xl p-4 max-h-48 overflow-y-auto border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={12} className="text-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Transcripción en vivo</span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">{liveTranscript}</p>
              </div>
            )}
          </div>

          {/* Last Session Quick View */}
          {sessions[0] && !isRecording && (
            <div className="bg-white/[0.02] rounded-2xl border border-white/5 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-emerald-400" />
                  <span className="text-xs font-bold text-slate-400">{sessions[0].title}</span>
                  {processing === sessions[0].id && <Loader2 size={12} className="animate-spin text-emerald-400" />}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => regenerate(sessions[0])} className="text-[10px] px-2 py-1 rounded-lg bg-white/5 text-slate-500 hover:text-emerald-400">
                    <RefreshCw size={10} className="inline mr-1" />Regenerar
                  </button>
                  <button onClick={() => copyToClipboard(sessions[0].soap_note || sessions[0].transcription, sessions[0].id)}
                    className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                    {copied === sessions[0].id ? <><Check size={10} className="inline mr-1" />Copiado</> : <><Copy size={10} className="inline mr-1" />Copiar nota</>}
                  </button>
                </div>
              </div>
              <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar">
                {processing === sessions[0].id ? (
                  <div className="text-center py-8 text-emerald-400">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                    <p className="text-xs font-bold">Generando nota clínica con IA...</p>
                  </div>
                ) : (
                  sessions[0].soap_note || sessions[0].transcription
                )}
              </div>
            </div>
          )}
        </>
      )}

      {view === 'history' && (
        <>
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/5 rounded-xl text-sm text-slate-300 outline-none focus:border-emerald-500/30"
              placeholder="Buscar sesiones..." />
          </div>

          {/* Sessions List */}
          <div className="space-y-3">
            {filtered.length === 0 && <p className="text-slate-600 text-center py-12">Sin sesiones grabadas</p>}
            {filtered.map(s => (
              <div key={s.id} className="bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden transition-all hover:border-white/10">
                {/* Header */}
                <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.soap_note ? 'bg-emerald-500/10' : 'bg-slate-800'}`}>
                      {s.soap_note ? <FileText size={18} className="text-emerald-400" /> : <Mic size={18} className="text-slate-500" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{s.title}</h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-slate-600"><Clock size={10} className="inline mr-1" />{fmt(s.duration_seconds)}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          s.soap_note ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>{s.soap_note ? '✅ Procesada' : '⏳ Pendiente'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={e => { e.stopPropagation(); copyToClipboard(s.soap_note || s.transcription, s.id); }}
                      className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-emerald-400">
                      {copied === s.id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                    <button onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                    {expandedId === s.id ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedId === s.id && (
                  <div className="px-4 pb-4 space-y-3">
                    {s.soap_note && (
                      <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">🩺 Nota Clínica</span>
                          <button onClick={() => regenerate(s)} className="text-[10px] text-slate-500 hover:text-emerald-400 flex items-center gap-1">
                            <RefreshCw size={10} /> Regenerar
                          </button>
                        </div>
                        <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{s.soap_note}</div>
                      </div>
                    )}
                    {!s.soap_note && (
                      <button onClick={() => generateNotes(s.id, s.transcription, s.template || 'soap')}
                        disabled={processing === s.id}
                        className="w-full py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                        {processing === s.id ? <><Loader2 size={14} className="animate-spin" /> Generando...</> : <><Sparkles size={14} /> Generar nota clínica</>}
                      </button>
                    )}
                    <details className="group">
                      <summary className="text-[10px] text-slate-600 cursor-pointer hover:text-slate-400 font-bold uppercase tracking-widest">
                        📝 Transcripción original
                      </summary>
                      <p className="mt-2 text-xs text-slate-500 leading-relaxed whitespace-pre-wrap">{s.transcription}</p>
                    </details>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
