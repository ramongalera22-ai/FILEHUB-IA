
import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2, Sparkles, X, Check, Save } from 'lucide-react';
import { transcribeAudio } from '../services/geminiService';

const VoiceAssistant: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [result, setResult] = useState<{ text: string; summary: string; type: string } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setIsTranscribing(true);
          try {
            const transcript = await transcribeAudio(base64Audio);
            setResult(transcript);
          } catch (error) {
            console.error("Transcription failed", error);
          } finally {
            setIsTranscribing(false);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div className="fixed bottom-8 right-8 z-[200]">
      {result ? (
        <div className="bg-white rounded-[2rem] p-6 shadow-2xl border border-slate-100 w-80 mb-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-4">
             <div className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
               result.type === 'expense' ? 'bg-emerald-100 text-emerald-600' :
               result.type === 'task' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
             }`}>
               AI {result.type}
             </div>
             <button onClick={() => setResult(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
          <p className="text-sm font-bold text-slate-800 mb-2">{result.summary}</p>
          <p className="text-xs text-slate-500 italic mb-4">"{result.text}"</p>
          <div className="flex gap-2">
             <button className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all">
               <Save size={14} /> Add to Dashboard
             </button>
          </div>
        </div>
      ) : isTranscribing ? (
        <div className="bg-slate-900 text-white rounded-full px-6 py-4 flex items-center gap-3 shadow-2xl mb-4 animate-pulse">
          <Loader2 size={18} className="animate-spin text-blue-400" />
          <span className="text-xs font-bold uppercase tracking-widest">Processing Note...</span>
        </div>
      ) : null}

      <button 
        onClick={isRecording ? stopRecording : startRecording}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all ${
          isRecording 
          ? 'bg-red-500 scale-110 animate-pulse ring-4 ring-red-100' 
          : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
        } text-white relative group`}
      >
        {isRecording ? <Square size={24} /> : <Mic size={24} />}
        {!isRecording && !result && (
          <div className="absolute right-20 bg-slate-800 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Quick AI Note
          </div>
        )}
      </button>
    </div>
  );
};

export default VoiceAssistant;
