import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Image as ImageIcon, ExternalLink, Cpu, Loader2, FileCode, File, Send, MessageSquare, Sparkles } from 'lucide-react';
import { StoredFile } from '../types';
import { chatWithGemini } from '../services/openrouterService';

interface FilePreviewModalProps {
  file: StoredFile;
  onClose: () => void;
  onProcess: () => void;
  isProcessing: boolean;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose, onProcess, isProcessing }) => {
  const [content, setContent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'chat'>('preview');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!file || !file.url) return;

    // Try to read text-based files for preview
    if (file.type.startsWith('text/') || file.name.match(/\.(json|md|xml|js|ts|csv|txt)$/i)) {
      fetch(file.url)
        .then(res => res.text())
        .then(text => {
          if (text.length < 50000) { // Limit text preview size
            setContent(text);
          } else {
            setContent("El archivo es demasiado grande para previsualizar el texto completo.");
          }
        })
        .catch(err => console.error("Error fetching file content for preview", err));
    }
  }, [file]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    setIsChatting(true);

    try {
      const response = await chatWithGemini(userMsg, {
        fileName: file.name,
        fileType: file.type,
        context: file.aiAnalysis?.summary || "No summary available"
      });
      setChatMessages(prev => [...prev, { role: 'ai', content: response.text }]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages(prev => [...prev, { role: 'ai', content: "Error procesando tu consulta." }]);
    } finally {
      setIsChatting(false);
    }
  };

  const renderPreview = () => {
    if (!file.url) return null;

    if (file.type.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <img src={file.url} alt="Preview" className="max-w-full max-h-[60vh] object-contain shadow-sm rounded-lg" />
        </div>
      );
    }

    if (file.type === 'application/pdf') {
      return (
        <iframe
          src={file.url}
          title="PDF Preview"
          className="w-full h-[60vh] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
        />
      );
    }

    if (content) {
      return (
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 h-[60vh] overflow-auto custom-scrollbar shadow-inner">
          <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap break-all">{content}</pre>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
        <div className="p-6 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-4">
          <File size={48} className="text-indigo-200" />
        </div>
        <p className="text-sm font-black uppercase tracking-widest text-slate-500">Vista previa no disponible</p>
        <p className="text-xs mt-2 font-medium">Este tipo de archivo se abrirá en su aplicación predeterminada.</p>
      </div>
    );
  };

  const getIcon = () => {
    if (file.type.startsWith('image/')) return <ImageIcon size={20} />;
    if (file.name.match(/\.(json|js|ts)$/i)) return <FileCode size={20} />;
    return <FileText size={20} />;
  };

  return (
    <div className="fixed inset-0 z-[600] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-5xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/30">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-800 shadow-sm">
              {getIcon()}
            </div>
            <div className="overflow-hidden">
              <h3 className="font-black text-slate-800 dark:text-white text-xl truncate max-w-md">{file.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {(file.size / 1024).toFixed(1)} KB • {file.type || 'Desconocido'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 mr-4">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'preview' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Vista Previa
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'chat' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Chatear con IA
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-4 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 md:p-8 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
          {activeTab === 'preview' ? (
            <div className="flex-1 overflow-auto custom-scrollbar">
              {renderPreview()}
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full">
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 mb-4 pr-2">
                {chatMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 space-y-4">
                    <MessageSquare size={48} />
                    <p className="text-sm font-bold uppercase tracking-widest">Pregunta lo que quieras sobre este archivo</p>
                    <div className="flex flex-wrap justify-center gap-2 max-w-md">
                      {['Hazme un resumen', 'Extrae los puntos clave', '¿Qué acciones debo tomar?'].map((q, i) => (
                        <button key={i} onClick={() => { setChatInput(q); }} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-3xl ${m.role === 'user' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'}`}>
                      <p className="text-sm font-medium leading-relaxed">{m.content}</p>
                    </div>
                  </div>
                ))}
                {isChatting && (
                  <div className="flex items-center gap-3 text-indigo-500 text-xs font-bold animate-pulse">
                    <Loader2 size={16} className="animate-spin" /> Procesando inteligencia...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="flex gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                  placeholder="Escribe tu pregunta aquí..."
                  className="flex-1 bg-transparent px-4 py-3 text-sm font-bold focus:outline-none dark:text-white"
                />
                <button
                  onClick={handleSendChat}
                  disabled={isChatting || !chatInput.trim()}
                  className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-200 dark:shadow-none"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 md:p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 flex flex-col md:flex-row justify-between items-center gap-4">
          <a
            href={file.url || '#'}
            download={file.name}
            target="_blank"
            rel="noreferrer"
            className="w-full md:w-auto px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest text-slate-500 hover:bg-white dark:hover:bg-slate-700 hover:text-indigo-600 hover:shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all flex items-center justify-center gap-2"
          >
            <ExternalLink size={16} /> Abrir Externamente
          </a>
          <button
            onClick={onProcess}
            disabled={isProcessing}
            className="w-full md:w-auto flex-1 max-w-md bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group"
          >
            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="group-hover:text-indigo-200 transition-colors" />}
            {isProcessing ? 'Analizando Documento...' : 'Análisis Profundo con IA'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
