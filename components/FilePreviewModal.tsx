
import React, { useState, useEffect } from 'react';
import { X, FileText, Image as ImageIcon, ExternalLink, Cpu, Loader2, FileCode, File } from 'lucide-react';

interface FilePreviewModalProps {
  file: File;
  onClose: () => void;
  onProcess: () => void;
  isProcessing: boolean;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose, onProcess, isProcessing }) => {
  const [content, setContent] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setObjectUrl(url);

    // Try to read text-based files for preview
    if (file.type.startsWith('text/') || file.name.match(/\.(json|md|xml|js|ts|csv|txt)$/i)) {
      if (file.size < 1024 * 1024) { // Only read if < 1MB
        const reader = new FileReader();
        reader.onload = (e) => setContent(e.target?.result as string);
        reader.readAsText(file);
      } else {
        setContent("El archivo es demasiado grande para previsualizar el texto completo.");
      }
    }

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const renderPreview = () => {
    if (!objectUrl) return null;

    if (file.type.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center h-full bg-slate-50 rounded-xl border border-slate-200 p-4">
          <img src={objectUrl} alt="Preview" className="max-w-full max-h-[60vh] object-contain shadow-sm rounded-lg" />
        </div>
      );
    }

    if (file.type === 'application/pdf') {
      return (
        <iframe 
          src={objectUrl} 
          title="PDF Preview"
          className="w-full h-[60vh] rounded-xl border border-slate-200 bg-slate-50" 
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
      <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
        <div className="p-6 bg-white rounded-full shadow-sm mb-4">
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
      <div className="bg-white rounded-[2.5rem] w-full max-w-5xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-sm">
              {getIcon()}
            </div>
            <div className="overflow-hidden">
              <h3 className="font-black text-slate-800 text-xl truncate max-w-md">{file.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {(file.size / 1024).toFixed(1)} KB • {file.type || 'Desconocido'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-4 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Preview Body */}
        <div className="flex-1 p-6 md:p-8 bg-white overflow-auto custom-scrollbar">
          {renderPreview()}
        </div>

        {/* Footer Actions */}
        <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50/30 flex flex-col md:flex-row justify-between items-center gap-4">
          <a 
            href={objectUrl || '#'} 
            download={file.name}
            target="_blank"
            rel="noreferrer"
            className="w-full md:w-auto px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <ExternalLink size={16} /> Abrir Externamente
          </a>
          <button 
            onClick={onProcess}
            disabled={isProcessing}
            className="w-full md:w-auto flex-1 max-w-md bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed group"
          >
            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Cpu size={18} className="group-hover:text-indigo-200 transition-colors" />}
            {isProcessing ? 'Analizando Documento...' : 'Procesar con Inteligencia IA'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
