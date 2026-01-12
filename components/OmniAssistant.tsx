
import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Send, Mic, Image as ImageIcon, Wand2, X, Maximize2, 
  Minimize2, Search, Volume2, Loader2, Globe, History, Layers,
  Camera, Settings, Ghost, MicOff, MessageSquare, Headphones,
  Brain, Zap, Trash2, Sliders, ScanSearch, FileEdit, FileText, CheckCircle2,
  Video
} from 'lucide-react';
import { 
  chatWithGemini, generateImagePro, editImageWithAI, speakText, 
  getAIInstance, decodeAudioData, decodePCM, encodePCM, analyzeImagePro, analyzeVideo 
} from '../services/geminiService';
import { Modality, LiveServerMessage } from '@google/genai';
import { Expense } from '../types';

interface OmniAssistantProps {
  globalContext: any;
  onAddExpenses?: (expenses: Expense[]) => void;
}

const OmniAssistant: React.FC<OmniAssistantProps> = ({ globalContext, onAddExpenses }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mode, setMode] = useState<'chat' | 'image' | 'voice' | 'analyze' | 'edit'>('chat');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Image/File Config
  const [imageConfig, setImageConfig] = useState({ ratio: '1:1', size: '1K' });
  const [selectedFileBase64, setSelectedFileBase64] = useState<string | null>(null);
  const [selectedFileType, setSelectedFileType] = useState<string | null>(null);
  
  // Chat Options
  const [useThinking, setUseThinking] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [useLite, setUseLite] = useState(false);

  // Live Voice State
  const [isLiveActive, setIsLiveActive] = useState(false);
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() && !selectedFileBase64) return;
    
    // Add User Message
    const userMsg = { 
      role: 'user', 
      content: input, 
      image: selectedFileType?.startsWith('image') ? selectedFileBase64 : null,
      fileType: selectedFileType 
    };
    setMessages(prev => [...prev, userMsg]);
    
    // Reset inputs
    const prompt = input;
    const attachment = selectedFileBase64 && selectedFileType ? { mimeType: selectedFileType, data: selectedFileBase64 } : undefined;
    
    setInput('');
    setSelectedFileBase64(null);
    setSelectedFileType(null);
    setIsLoading(true);

    try {
      if (mode === 'chat') {
        // Automatically ask for JSON extraction if a file is attached
        let finalPrompt = prompt;
        if (attachment && (attachment.mimeType === 'application/pdf' || attachment.mimeType.startsWith('image'))) {
           finalPrompt += "\n\n[SYSTEM: Si este documento contiene transacciones financieras (gastos/ingresos), extráelas en un bloque de código JSON con la clave 'expenses' array compatible con la interfaz Expense. Incluye vendor, amount, date, category y description.]";
        }

        const res = await chatWithGemini(finalPrompt, globalContext, { useThinking, useSearch, useLite, attachment });
        
        // Detect financial data injection
        let content = res.text;
        const jsonMatch = res.text.match(/```json\n([\s\S]*?)\n```/);
        let dataInjected = false;

        if (jsonMatch && onAddExpenses) {
           try {
             const data = JSON.parse(jsonMatch[1]);
             if (data.expenses && Array.isArray(data.expenses)) {
                // Ensure IDs are unique
                const newExpenses = data.expenses.map((e: any) => ({
                  ...e,
                  id: `chat-gen-${Date.now()}-${Math.random()}`,
                  priority: e.priority || 'medium'
                }));
                onAddExpenses(newExpenses);
                dataInjected = true;
                content += "\n\n✅ **Datos Financieros Inyectados en el Sistema.**";
             }
           } catch (e) {
             console.error("Error parsing JSON from chat", e);
           }
        }

        setMessages(prev => [...prev, { 
          role: 'ai', 
          content: content, 
          urls: res.urls,
          isThinking: useThinking,
          dataInjected
        }]);

      } else if (mode === 'image') {
        const url = await generateImagePro(prompt, imageConfig.ratio, imageConfig.size);
        if (url) {
          setMessages(prev => [...prev, { role: 'ai', content: 'Aquí tienes la imagen generada:', image: url }]);
        }
      } else if (mode === 'analyze' && attachment) {
        let res;
        if (attachment.mimeType.startsWith('video/')) {
           res = await analyzeVideo(attachment.data, attachment.mimeType, prompt);
        } else {
           res = await analyzeImagePro(attachment.data, prompt);
        }
        setMessages(prev => [...prev, { role: 'ai', content: res }]);
      } else if (mode === 'edit' && attachment) {
        const url = await editImageWithAI(attachment.data, prompt);
        if (url) {
          setMessages(prev => [...prev, { role: 'ai', content: 'Imagen editada exitosamente:', image: url }]);
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'error', content: 'Ocurrió un error procesando tu solicitud.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFileBase64((reader.result as string).split(',')[1]);
        setSelectedFileType(file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  // Live Voice Conversation Logic
  const startLiveConversation = async () => {
    try {
      setIsLiveActive(true);
      const ai = getAIInstance();
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const base64 = encodePCM(new Uint8Array(int16.buffer));
              sessionPromise.then(session => session.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
              const buffer = await decodeAudioData(decodePCM(audioData), audioContextRef.current, 24000, 1);
              const source = audioContextRef.current.createBufferSource();
              source.buffer = buffer;
              source.connect(audioContextRef.current.destination);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextRef.current.currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: 'Eres un asistente financiero de élite. Responde de forma breve, útil y natural.'
        }
      });
      liveSessionRef.current = sessionPromise;
    } catch (err) {
      console.error("Live Voice Failed", err);
      setIsLiveActive(false);
    }
  };

  const stopLiveConversation = () => {
    setIsLiveActive(false);
    liveSessionRef.current?.then((s: any) => s.close());
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
  };

  return (
    <div className={`fixed bottom-8 right-8 z-[300] transition-all duration-500 ${isOpen ? 'w-[400px] md:w-[600px]' : 'w-16 h-16'}`}>
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-transform group relative"
        >
          <Sparkles className="group-hover:rotate-12 transition-transform" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white animate-pulse"></div>
        </button>
      ) : (
        <div className={`bg-white rounded-[3rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] border border-slate-100 flex flex-col overflow-hidden transition-all ${isExpanded ? 'h-[85vh]' : 'h-[650px]'}`}>
          {/* Header */}
          <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/40">
                <Ghost size={24} className="text-white" />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                  Omni Intelligence
                  {useThinking && <div className="p-1 bg-amber-500 rounded-md"><Brain size={12} /></div>}
                </h3>
                <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 ${isLiveActive ? 'bg-red-400 animate-ping' : 'bg-emerald-400'} rounded-full`}></div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                     {isLiveActive ? 'Conversación Live' : (useLite ? 'Flash Lite Active' : 'Gemini 3 Pro Ready')}
                   </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsExpanded(!isExpanded)} className="p-3 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
                {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
              <button onClick={() => setIsOpen(false)} className="p-3 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="flex overflow-x-auto p-3 bg-slate-50 border-b border-slate-100 gap-2 custom-scrollbar no-scrollbar">
             {[
               { id: 'chat', icon: MessageSquare, label: 'Chat' },
               { id: 'image', icon: ImageIcon, label: 'Imagen' },
               { id: 'analyze', icon: ScanSearch, label: 'Analizar' },
               { id: 'edit', icon: FileEdit, label: 'Editar' },
               { id: 'voice', icon: Headphones, label: 'Voz Live' }
             ].map(m => (
               <button 
                key={m.id}
                onClick={() => {
                   setMode(m.id as any);
                   if (m.id === 'voice' && !isLiveActive) startLiveConversation();
                   else if (m.id !== 'voice' && isLiveActive) stopLiveConversation();
                }}
                className={`flex-shrink-0 flex items-center gap-3 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  mode === m.id ? 'bg-white shadow-md text-indigo-600 border border-indigo-100' : 'text-slate-400 hover:bg-white/50'
                }`}
               >
                 <m.icon size={16} /> {m.label}
               </button>
             ))}
          </div>

          {/* Main Chat/Control View */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-slate-50/30">
             {messages.length === 0 && mode !== 'voice' && (
               <div className="text-center py-24 space-y-6">
                  <div className="w-24 h-24 bg-white border border-slate-100 text-indigo-500 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-sm">
                    <Sparkles size={48} />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-900 tracking-tight">Potencia tu FILEHUB con IA</h4>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto mt-3 font-medium">Desde análisis de facturas con Pro hasta generación de visuales 4K e imágenes editadas al instante.</p>
                  </div>
                  {mode === 'edit' || mode === 'analyze' || mode === 'chat' ? (
                    <div className="flex flex-col items-center gap-4">
                      {mode !== 'chat' && (
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-3 shadow-xl"
                        >
                          {mode === 'analyze' ? <Video size={20} /> : <ImageIcon size={20} />} 
                          {mode === 'edit' ? 'Seleccionar Imagen para Editar' : 'Subir Archivo (Img/Video/PDF)'}
                        </button>
                      )}
                      
                      {selectedFileBase64 && (
                        <div className="relative w-48 h-48 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-slate-100 flex items-center justify-center">
                          {selectedFileType?.startsWith('image') ? (
                            <img src={`data:${selectedFileType};base64,${selectedFileBase64}`} className="w-full h-full object-cover" />
                          ) : selectedFileType?.startsWith('video') ? (
                            <Video size={48} className="text-blue-500" />
                          ) : (
                            <FileText size={48} className="text-red-500" />
                          )}
                          <button onClick={() => { setSelectedFileBase64(null); setSelectedFileType(null); }} className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full"><X size={14} /></button>
                        </div>
                      )}
                    </div>
                  ) : null}
               </div>
             )}

             {messages.map((m, i) => (
               <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[90%] rounded-[2rem] p-6 shadow-sm relative group transition-all ${
                    m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-100 text-slate-800'
                  }`}>
                    {m.isThinking && <div className="flex items-center gap-2 mb-3 text-[9px] font-black uppercase text-amber-500 bg-amber-50 px-2 py-1 rounded-md w-fit"><Brain size={12} /> Pensamiento Profundo Aplicado</div>}
                    
                    {/* Render User Attachments */}
                    {m.image && <img src={`data:image/jpeg;base64,${m.image}`} className="mb-4 rounded-2xl shadow-lg border border-slate-100 max-w-[200px]" />}
                    {m.fileType === 'application/pdf' && (
                      <div className="mb-4 p-4 bg-white/10 rounded-2xl flex items-center gap-3 border border-white/20">
                        <FileText size={24} className="text-white" />
                        <span className="text-xs font-bold uppercase">Documento PDF Adjunto</span>
                      </div>
                    )}
                    {m.fileType && m.fileType.startsWith('video') && (
                      <div className="mb-4 p-4 bg-white/10 rounded-2xl flex items-center gap-3 border border-white/20">
                        <Video size={24} className="text-white" />
                        <span className="text-xs font-bold uppercase">Video Adjunto</span>
                      </div>
                    )}

                    {/* AI Images */}
                    {m.role === 'ai' && m.image && <img src={m.image} className="mb-4 rounded-2xl shadow-lg border border-slate-100" />}

                    <p className="text-sm leading-relaxed font-medium whitespace-pre-wrap">{m.content}</p>
                    
                    {m.dataInjected && (
                      <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2 text-emerald-700 text-xs font-bold">
                        <CheckCircle2 size={16} /> Datos añadidos a tu Economía
                      </div>
                    )}

                    {m.urls && m.urls.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                        <p className="text-[10px] font-black uppercase text-indigo-500">Fuentes Verificadas:</p>
                        {m.urls.map((url: string, idx: number) => (
                          <a key={idx} href={url} target="_blank" className="block text-[10px] text-indigo-400 hover:underline truncate bg-indigo-50/50 p-2 rounded-lg">{url}</a>
                        ))}
                      </div>
                    )}
                    <button 
                      onClick={() => speakText(m.content)}
                      className="absolute bottom-4 right-4 p-2 bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>
               </div>
             ))}

             {isLoading && (
               <div className="flex justify-start">
                 <div className="bg-white border border-slate-100 rounded-[1.5rem] p-6 shadow-sm flex items-center gap-4">
                    <Loader2 size={20} className="animate-spin text-indigo-500" />
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">
                      {useThinking ? 'Procesando con Razonamiento...' : 'Pensando...'}
                    </span>
                 </div>
               </div>
             )}
             <div ref={chatEndRef} />
          </div>

          {/* Mode-Specific Controls */}
          {mode === 'image' && (
            <div className="px-8 py-4 bg-slate-900 border-t border-white/10 flex flex-wrap gap-4 text-white">
              <div className="flex items-center gap-3">
                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Ratio:</span>
                 {['1:1', '16:9', '9:16', '21:9', '4:3', '3:4', '2:3', '3:2'].map(r => (
                   <button 
                    key={r}
                    onClick={() => setImageConfig({...imageConfig, ratio: r})}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${imageConfig.ratio === r ? 'bg-indigo-600' : 'bg-white/5 hover:bg-white/10'}`}
                   >
                     {r}
                   </button>
                 ))}
              </div>
              <div className="flex items-center gap-3">
                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Calidad:</span>
                 {['1K', '2K', '4K'].map(s => (
                   <button 
                    key={s}
                    onClick={() => setImageConfig({...imageConfig, size: s})}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${imageConfig.size === s ? 'bg-indigo-600' : 'bg-white/5 hover:bg-white/10'}`}
                   >
                     {s}
                   </button>
                 ))}
              </div>
            </div>
          )}

          {mode === 'chat' && (
             <div className="px-8 py-3 bg-slate-50 border-t border-slate-100 flex gap-4 overflow-x-auto no-scrollbar">
                <button 
                  onClick={() => { setUseThinking(!useThinking); if (!useThinking) setUseLite(false); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${useThinking ? 'bg-amber-100 text-amber-700 border border-amber-200 shadow-sm' : 'text-slate-400 bg-white border border-slate-100'}`}
                >
                  <Brain size={14} /> Modo Thinking
                </button>
                <button 
                  onClick={() => setUseSearch(!useSearch)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${useSearch ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm' : 'text-slate-400 bg-white border border-slate-100'}`}
                >
                  <Globe size={14} /> Google Search
                </button>
                <button 
                  onClick={() => { setUseLite(!useLite); if (!useLite) setUseThinking(false); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${useLite ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm' : 'text-slate-400 bg-white border border-slate-100'}`}
                >
                  <Zap size={14} /> Flash Lite
                </button>
             </div>
          )}

          {/* Input Area */}
          <div className="p-8 bg-white border-t border-slate-100">
             <div className="flex items-center gap-4 bg-slate-50 rounded-[2rem] p-3 border border-slate-200 shadow-inner focus-within:ring-4 focus-within:ring-indigo-500/5 focus-within:border-indigo-200 transition-all relative">
                {selectedFileBase64 && (
                  <div className="absolute -top-16 left-4 bg-white p-2 rounded-xl shadow-lg border border-slate-100 flex items-center gap-3 animate-in slide-in-from-bottom-2">
                     {selectedFileType?.startsWith('image') ? (
                       <img src={`data:${selectedFileType};base64,${selectedFileBase64}`} className="w-8 h-8 rounded-lg object-cover" />
                     ) : selectedFileType?.startsWith('video') ? (
                       <Video size={24} className="text-blue-500" />
                     ) : (
                       <FileText size={24} className="text-red-500" />
                     )}
                     <span className="text-[10px] font-bold text-slate-500 max-w-[100px] truncate">Archivo Adjunto</span>
                     <button onClick={() => { setSelectedFileBase64(null); setSelectedFileType(null); }} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                  </div>
                )}

                <button 
                  className="p-4 text-slate-400 hover:text-indigo-600 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  title="Adjuntar Imagen, Video o PDF"
                >
                  {mode === 'analyze' ? <Video size={24} /> : <ImageIcon size={24} />}
                </button>
                {/* Accepts images, videos and PDFs */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept={mode === 'analyze' ? "image/*,application/pdf,video/*" : "image/*,application/pdf"} 
                  onChange={handleFileUpload} 
                />
                
                <input 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder={mode === 'image' ? "Describe la imagen pro que deseas..." : (mode === 'edit' ? "Indica qué editar..." : "Escribe o sube un archivo para analizar...")}
                  className="flex-1 bg-transparent border-none outline-none text-md font-bold text-slate-800 px-2"
                />
                <button 
                  onClick={handleSend}
                  disabled={isLoading || (!input.trim() && !selectedFileBase64)}
                  className="p-5 bg-slate-900 text-white rounded-2xl hover:bg-indigo-600 disabled:opacity-50 transition-all shadow-xl shadow-slate-900/20"
                >
                  <Send size={24} />
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OmniAssistant;
