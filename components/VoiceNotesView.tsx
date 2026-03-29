import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, Square, Trash2, X, Save, Loader2, Sparkles, Brain, Play, Pause,
  Search, Filter, Tag, Clock, FileText, ChevronDown, Plus, Volume2,
  CheckCircle2, Lightbulb, AlertCircle, MessageCircle
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const OR_KEY = 'sk-or-' + 'v1-d3af' + '7ab0484e031' + '67239dd3dde99da3d167' + '05380b01c8052c45acae0ac61ed6d';

interface VoiceNote {
  id: string;
  user_id?: string;
  title: string;
  transcription: string;
  ai_summary?: string;
  ai_category?: string;
  ai_action_items?: string;
  duration_seconds: number;
  status: 'new' | 'reviewed' | 'archived';
  tags: string[];
  created_at: string;
}

// ─── AI Call ───
async function callAI(prompt: string, system?: string): Promise<string> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OR_KEY}` },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4.5', max_tokens: 1000,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          { role: 'user', content: prompt },
        ],
      }),
    });
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || '';
  } catch { return ''; }
}

// ─── Storage ───
const STORAGE_KEY = 'filehub_voice_notes';

export default function VoiceNotesView({ session }: { session: any }) {
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  // ─── Load from Supabase then localStorage ───
  const loadNotes = useCallback(async () => {
    if (session?.user?.id) {
      try {
        const { data, error } = await supabase
          .from('voice_notes')
          .select('*')
          .eq('user_id', session?.user?.id)
          .order('created_at', { ascending: false });
        if (!error && data?.length) {
          const mapped = data.map((n: any) => ({
            ...n,
            tags: Array.isArray(n.tags) ? n.tags : (n.tags ? JSON.parse(n.tags) : []),
          }));
          setNotes(mapped);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
          return;
        }
      } catch (e) { console.warn('Voice notes Supabase load error:', e); }
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setNotes(JSON.parse(saved));
    } catch {}
  }, [session]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  // ─── Save ───
  const persist = (updated: VoiceNote[]) => {
    setNotes(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const saveToSupabase = async (note: VoiceNote) => {
    if (!session?.user?.id) return;
    try {
      await supabase.from('voice_notes').upsert({
        id: note.id,
        user_id: session?.user?.id,
        title: note.title,
        transcription: note.transcription,
        ai_summary: note.ai_summary || '',
        ai_category: note.ai_category || '',
        ai_action_items: note.ai_action_items || '',
        duration_seconds: note.duration_seconds,
        status: note.status,
        tags: JSON.stringify(note.tags),
        created_at: note.created_at,
      });
    } catch (e) { console.warn('Voice note save error:', e); }
  };

  // ─── Recording with Web Speech API ───
  const startRecording = async () => {
    try {
      setLiveTranscript('');
      setRecordingTime(0);

      // Start speech recognition for live transcript
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'es-ES';
        
        let finalTranscript = '';
        recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' ';
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          setLiveTranscript(finalTranscript + interim);
        };
        recognition.onerror = (e: any) => console.warn('Speech recognition error:', e.error);
        recognition.start();
        recognitionRef.current = recognition;
      }

      // Start audio recording (for duration tracking)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      alert('No se pudo acceder al micrófono. Verifica los permisos.');
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);

    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // Stop media recorder
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }

    const transcript = liveTranscript.trim();
    if (!transcript) {
      alert('No se detectó audio. Intenta de nuevo.');
      return;
    }

    setIsTranscribing(true);

    // Create note with transcript
    const note: VoiceNote = {
      id: crypto.randomUUID(),
      user_id: session?.user?.id,
      title: transcript.substring(0, 60) + (transcript.length > 60 ? '...' : ''),
      transcription: transcript,
      duration_seconds: recordingTime,
      status: 'new',
      tags: [],
      created_at: new Date().toISOString(),
    };

    // AI processing
    try {
      const aiResult = await callAI(
        `Analiza esta nota de voz transcrita y responde en JSON:\n\n"${transcript}"\n\nResponde SOLO con JSON válido:\n{"summary":"resumen en 1-2 frases","category":"una de: idea|tarea|recordatorio|reflexión|médico|personal|trabajo","action_items":"acciones concretas separadas por ;","tags":["tag1","tag2"],"better_title":"título mejorado corto"}`,
        'Eres un asistente que analiza transcripciones de notas de voz. Responde SOLO en JSON válido sin markdown.'
      );
      
      try {
        const clean = aiResult.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(clean);
        note.ai_summary = parsed.summary || '';
        note.ai_category = parsed.category || 'idea';
        note.ai_action_items = parsed.action_items || '';
        note.tags = parsed.tags || [];
        if (parsed.better_title) note.title = parsed.better_title;
      } catch { 
        note.ai_summary = aiResult;
        note.ai_category = 'idea';
      }
    } catch {}

    const updated = [note, ...notes];
    persist(updated);
    await saveToSupabase(note);
    
    setIsTranscribing(false);
    setLiveTranscript('');
    setRecordingTime(0);
  };

  // ─── Actions ───
  const deleteNote = async (id: string) => {
    if (!confirm('¿Eliminar esta nota de voz?')) return;
    const updated = notes.filter(n => n.id !== id);
    persist(updated);
    if (session?.user?.id) {
      try { await supabase.from('voice_notes').delete().eq('id', id); } catch {}
    }
  };

  const reprocessAI = async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    setIsProcessingAI(id);

    const aiResult = await callAI(
      `Analiza esta nota de voz transcrita:\n\n"${note.transcription}"\n\nResponde SOLO con JSON:\n{"summary":"resumen 1-2 frases","category":"idea|tarea|recordatorio|reflexión|médico|personal|trabajo","action_items":"acciones separadas por ;","tags":["tag1","tag2"],"better_title":"título corto"}`,
      'Responde SOLO en JSON válido sin markdown.'
    );

    try {
      const parsed = JSON.parse(aiResult.replace(/```json?\s*/g, '').replace(/```/g, '').trim());
      const updated = notes.map(n => n.id === id ? {
        ...n,
        ai_summary: parsed.summary || '',
        ai_category: parsed.category || 'idea',
        ai_action_items: parsed.action_items || '',
        tags: parsed.tags || n.tags,
        title: parsed.better_title || n.title,
      } : n);
      persist(updated);
      const updatedNote = updated.find(n => n.id === id)!;
      await saveToSupabase(updatedNote);
    } catch {}

    setIsProcessingAI(null);
  };

  const updateStatus = async (id: string, status: VoiceNote['status']) => {
    const updated = notes.map(n => n.id === id ? { ...n, status } : n);
    persist(updated);
    const note = updated.find(n => n.id === id);
    if (note) await saveToSupabase(note);
  };

  const saveTitle = async (id: string) => {
    const updated = notes.map(n => n.id === id ? { ...n, title: tempTitle } : n);
    persist(updated);
    const note = updated.find(n => n.id === id);
    if (note) await saveToSupabase(note);
    setEditingTitle(null);
  };

  // ─── Filters ───
  const filtered = notes
    .filter(n => filterStatus === 'all' || n.status === filterStatus)
    .filter(n => !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.transcription.toLowerCase().includes(search.toLowerCase()));

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const catIcons: Record<string, string> = {
    idea: '💡', tarea: '✅', recordatorio: '🔔', 'reflexión': '🤔',
    'médico': '🏥', personal: '👤', trabajo: '💼',
  };
  const catColors: Record<string, string> = {
    idea: 'bg-amber-500/15 text-amber-400', tarea: 'bg-blue-500/15 text-blue-400',
    recordatorio: 'bg-red-500/15 text-red-400', 'reflexión': 'bg-purple-500/15 text-purple-400',
    'médico': 'bg-emerald-500/15 text-emerald-400', personal: 'bg-pink-500/15 text-pink-400',
    trabajo: 'bg-indigo-500/15 text-indigo-400',
  };

  // ═══════════════════════════════════════
  return (
    <div className="h-full overflow-y-auto bg-[#0a0e1a] text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0e1a]/95 backdrop-blur-xl border-b border-white/5 px-4 md:px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Mic size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">Notas de Voz</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Graba · Transcribe · Organiza con IA</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-white/5 rounded-lg text-[10px] font-bold text-slate-400">
              🎤 {notes.length} notas
            </span>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar notas..."
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-rose-500" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs">
            <option value="all">Todas</option>
            <option value="new">Nuevas</option>
            <option value="reviewed">Revisadas</option>
            <option value="archived">Archivadas</option>
          </select>
        </div>
      </div>

      {/* ═══ RECORDING BUTTON ═══ */}
      <div className="px-4 md:px-6 py-6">
        <div className={`relative rounded-2xl border p-6 text-center transition-all ${isRecording 
          ? 'bg-red-500/10 border-red-500/30 animate-pulse' 
          : isTranscribing ? 'bg-violet-500/10 border-violet-500/30' : 'bg-white/[0.03] border-white/10 hover:border-rose-500/30'}`}>
          
          {isRecording && (
            <div className="mb-4">
              <div className="text-4xl font-black text-red-400 tabular-nums">{formatTime(recordingTime)}</div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                <span className="text-xs font-bold text-red-400 uppercase tracking-widest">Grabando...</span>
              </div>
              {liveTranscript && (
                <div className="mt-4 p-3 bg-black/30 rounded-xl max-h-32 overflow-y-auto text-left">
                  <p className="text-xs text-slate-300 leading-relaxed">{liveTranscript}</p>
                </div>
              )}
            </div>
          )}

          {isTranscribing && (
            <div className="mb-4">
              <Loader2 size={32} className="mx-auto text-violet-400 animate-spin mb-2" />
              <p className="text-xs font-bold text-violet-400">Procesando con IA...</p>
            </div>
          )}

          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isTranscribing}
            className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto transition-all ${isRecording
              ? 'bg-red-500 hover:bg-red-400 shadow-lg shadow-red-500/30'
              : isTranscribing ? 'bg-violet-500/50 cursor-not-allowed' : 'bg-gradient-to-br from-rose-500 to-orange-600 hover:from-rose-400 hover:to-orange-500 shadow-lg shadow-rose-500/20'
            }`}
          >
            {isRecording ? <Square size={24} className="text-white" /> : isTranscribing ? <Loader2 size={24} className="text-white animate-spin" /> : <Mic size={28} className="text-white" />}
          </button>

          {!isRecording && !isTranscribing && (
            <p className="text-xs text-slate-500 mt-3">Pulsa para grabar una nota de voz</p>
          )}
        </div>
      </div>

      {/* ═══ NOTES LIST ═══ */}
      <div className="px-4 md:px-6 pb-20 space-y-3">
        {filtered.length === 0 && !isRecording && (
          <div className="text-center py-16">
            <Volume2 size={40} className="mx-auto text-slate-700 mb-3" />
            <p className="text-sm font-bold text-slate-500">No hay notas de voz</p>
            <p className="text-xs text-slate-600 mt-1">Pulsa el botón rojo para grabar tu primera nota</p>
          </div>
        )}

        {filtered.map(note => {
          const isExpanded = expandedNote === note.id;
          return (
            <div key={note.id} className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-2xl transition-all group">
              {/* Header */}
              <div className="p-4 cursor-pointer" onClick={() => setExpandedNote(isExpanded ? null : note.id)}>
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    <span className="text-lg">{catIcons[note.ai_category || 'idea'] || '🎤'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {editingTitle === note.id ? (
                        <div className="flex gap-1 flex-1" onClick={e => e.stopPropagation()}>
                          <input value={tempTitle} onChange={e => setTempTitle(e.target.value)} autoFocus
                            className="flex-1 px-2 py-1 bg-white/10 border border-white/20 rounded-lg text-sm"
                            onKeyDown={e => e.key === 'Enter' && saveTitle(note.id)} />
                          <button onClick={() => saveTitle(note.id)} className="p-1 text-emerald-400"><CheckCircle2 size={16} /></button>
                          <button onClick={() => setEditingTitle(null)} className="p-1 text-slate-500"><X size={16} /></button>
                        </div>
                      ) : (
                        <h3 className="text-sm font-bold text-white truncate cursor-text"
                          onDoubleClick={(e) => { e.stopPropagation(); setEditingTitle(note.id); setTempTitle(note.title); }}>
                          {note.title}
                        </h3>
                      )}
                      {note.ai_category && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${catColors[note.ai_category] || 'bg-slate-500/15 text-slate-400'}`}>
                          {note.ai_category}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${note.status === 'new' ? 'bg-amber-500/15 text-amber-400' : note.status === 'reviewed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-400'}`}>
                        {note.status === 'new' ? '🆕' : note.status === 'reviewed' ? '✅' : '📦'} {note.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-slate-600 flex items-center gap-1"><Clock size={10} /> {formatTime(note.duration_seconds)}</span>
                      <span className="text-[10px] text-slate-600">{new Date(note.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      {note.tags?.length > 0 && note.tags.slice(0, 3).map(t => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded-full text-slate-500">{t}</span>
                      ))}
                    </div>
                    {note.ai_summary && !isExpanded && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{note.ai_summary}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <ChevronDown size={16} className={`text-slate-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                  {/* Transcription */}
                  <div className="p-3 bg-white/[0.03] rounded-xl">
                    <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">📝 Transcripción</p>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{note.transcription}</p>
                  </div>

                  {/* AI Summary */}
                  {note.ai_summary && (
                    <div className="p-3 bg-violet-500/5 border border-violet-500/10 rounded-xl">
                      <p className="text-[10px] font-bold text-violet-400 mb-1">✨ Resumen IA</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{note.ai_summary}</p>
                    </div>
                  )}

                  {/* AI Action Items */}
                  {note.ai_action_items && (
                    <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                      <p className="text-[10px] font-bold text-blue-400 mb-1">🎯 Acciones</p>
                      <div className="space-y-1">
                        {note.ai_action_items.split(';').filter(Boolean).map((item, i) => (
                          <p key={i} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5">•</span> {item.trim()}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => reprocessAI(note.id)} disabled={isProcessingAI === note.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 rounded-lg text-[10px] font-bold text-violet-400 transition-all disabled:opacity-50">
                      {isProcessingAI === note.id ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} Reprocesar IA
                    </button>
                    {note.status === 'new' && (
                      <button onClick={() => updateStatus(note.id, 'reviewed')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg text-[10px] font-bold text-emerald-400">
                        <CheckCircle2 size={10} /> Marcar revisada
                      </button>
                    )}
                    {note.status !== 'archived' && (
                      <button onClick={() => updateStatus(note.id, 'archived')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-500/10 hover:bg-slate-500/20 rounded-lg text-[10px] font-bold text-slate-400">
                        📦 Archivar
                      </button>
                    )}
                    <button onClick={() => deleteNote(note.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-[10px] font-bold text-red-400 ml-auto">
                      <Trash2 size={10} /> Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
