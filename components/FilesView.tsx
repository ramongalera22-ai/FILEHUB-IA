
import React, { useState, useRef } from 'react';
import { StoredFile, OllamaConfig } from '../types';
import {
  FolderOpen, Image as ImageIcon, FileText, Music, Video,
  Search, Grid, List, Download, Trash2, UploadCloud,
  File, FileCode, Play, Pause, Sparkles, Server, Cloud, FileSpreadsheet, Presentation,
  ChevronDown, ChevronUp, CheckCircle2, AlertCircle, ArrowRight, Loader2
} from 'lucide-react';
import { analyzeFileDeeply, analyzeGeneralFile } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import FilePreviewModal from './FilePreviewModal';
import { BotPanelArchivos } from './BotPanel';

interface FilesViewProps {
  files: StoredFile[];
  ollamaConfig?: OllamaConfig;
  onAddFile: (file: StoredFile) => void;
  onDeleteFile: (id: string) => void;
  onUpdateFile: (file: StoredFile) => void;
}

const FilesView: React.FC<FilesViewProps> = ({ files, ollamaConfig, onAddFile, onDeleteFile, onUpdateFile }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [analyzingFileId, setAnalyzingFileId] = useState<string | null>(null);
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<StoredFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  const categories = [
    { id: 'all', label: 'Todos', icon: FolderOpen },
    { id: 'document', label: 'Docs', icon: FileText },
    { id: 'spreadsheet', label: 'Hojas', icon: FileSpreadsheet },
    { id: 'presentation', label: 'Slides', icon: Presentation },
    { id: 'image', label: 'Imágenes', icon: ImageIcon },
    { id: 'audio', label: 'Audio', icon: Music },
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (uploadedFiles) {
      Array.from(uploadedFiles).forEach(processFile);
    }
    event.target.value = '';
  };

  const processFile = async (file: File) => {
    setIsUploading(true);
    try {
      let category: StoredFile['category'] = 'other';
      const type = file.type;
      const name = file.name.toLowerCase();

      if (type.startsWith('image/')) category = 'image';
      else if (type.startsWith('video/')) category = 'video';
      else if (type.startsWith('audio/')) category = 'audio';
      else if (type.includes('spreadsheet') || type.includes('excel') || name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) category = 'spreadsheet';
      else if (type.includes('presentation') || type.includes('powerpoint') || name.endsWith('.ppt') || name.endsWith('.pptx')) category = 'presentation';
      else if (type.includes('pdf') || type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx') || name.endsWith('.txt') || name.endsWith('.pdf')) category = 'document';

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error } = await supabase.storage
        .from('files')
        .upload(filePath, file);

      if (error) {
        console.error('Supabase Storage Error:', error);
        throw new Error(`Error de Supabase: ${error.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('files')
        .getPublicUrl(filePath);

      const newFile: StoredFile = {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        date: new Date().toISOString().split('T')[0],
        category,
        tags: [],
        url: publicUrl
      };
      onAddFile(newFile);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      alert(`Error al subir el archivo: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async (file: StoredFile, engine: 'gemini' | 'ollama') => {
    if (!file.url) return;
    setAnalyzingFileId(file.id);
    setExpandedFileId(file.id); // Auto expand to show loading state contextually

    try {
      if (engine === 'gemini') {
        const response = await fetch(file.url);
        const blob = await response.blob();
        const reader = new FileReader();

        await new Promise((resolve) => {
          reader.onloadend = resolve;
          reader.readAsDataURL(blob);
        });

        const base64 = (reader.result as string).split(',')[1];

        // Use the new deep analysis function
        const analysis = await analyzeFileDeeply(base64, file.type, file.name);

        onUpdateFile({
          ...file,
          aiAnalysis: analysis,
          aiSummary: analysis.summary // Keep legacy support just in case
        });

      } else if (engine === 'ollama' && ollamaConfig?.baseUrl) {
        const headers: any = { 'Content-Type': 'application/json' };
        if (ollamaConfig.apiKey) {
          headers['Authorization'] = `Bearer ${ollamaConfig.apiKey}`;
        }

        const response = await fetch(`${ollamaConfig.baseUrl}/api/generate`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: ollamaConfig.model,
            prompt: `Analiza este archivo: ${file.name}. Responde en JSON con { summary, keyPoints, suggestedActions }.`,
            stream: false,
            format: "json"
          })
        });
        const data = await response.json();
        // Parsing logic for Ollama would be needed here, assuming simplified for now
        const parsed = JSON.parse(data.response);
        onUpdateFile({ ...file, aiAnalysis: parsed });
      }

    } catch (e: any) {
      console.error(e);
      alert(`Error analizando el archivo: ${e.message || "Asegúrate de que el formato sea soportado."}`);
    } finally {
      setAnalyzingFileId(null);
    }
  };

  const getFileIcon = (file: StoredFile) => {
    const name = file.name.toLowerCase();
    if (file.category === 'presentation' || name.endsWith('.ppt') || name.endsWith('.pptx')) return <Presentation className="text-orange-500" />;
    if (file.category === 'spreadsheet' || name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) return <FileSpreadsheet className="text-emerald-500" />;
    if (file.category === 'document' || name.endsWith('.doc') || name.endsWith('.docx') || name.endsWith('.pdf')) return <FileText className="text-blue-500" />;
    if (file.category === 'image') return <ImageIcon className="text-purple-500" />;
    if (file.category === 'audio') return <Music className="text-amber-500" />;
    return <File className="text-slate-400" />;
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeCategory === 'all') return matchesSearch;
    const name = file.name.toLowerCase();
    if (activeCategory === 'spreadsheet') return matchesSearch && (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv'));
    if (activeCategory === 'presentation') return matchesSearch && (name.endsWith('.ppt') || name.endsWith('.pptx'));
    return matchesSearch && file.category === activeCategory;
  });

  const toggleAudio = (id: string) => {
    const audio = audioRefs.current[id];
    if (!audio) return;

    if (playingAudio === id) {
      audio.pause();
      setPlayingAudio(null);
    } else {
      if (playingAudio && audioRefs.current[playingAudio]) {
        audioRefs.current[playingAudio].pause();
        audioRefs.current[playingAudio].currentTime = 0;
      }
      audio.play();
      setPlayingAudio(id);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    if (e.dataTransfer.files) Array.from(e.dataTransfer.files).forEach(processFile);
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col animate-in fade-in duration-500">

      <div className="px-4 pb-2 pt-4"><BotPanelArchivos /></div>
      <header className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 shrink-0">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <FolderOpen size={32} className="text-indigo-600" /> Gestor de Archivos
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold mt-1 text-sm">Soporte total para Office, Audio y Multimedia.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 flex">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}><Grid size={18} /></button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}><List size={18} /></button>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            {isUploading ? 'Subiendo...' : 'Subir'}
          </button>
          <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
        </div>
      </header>

      <div className="flex-1 flex gap-8 overflow-hidden">
        <aside className="w-56 shrink-0 flex flex-col gap-8 overflow-y-auto custom-scrollbar pr-2">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="space-y-1">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${activeCategory === cat.id ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                >
                  <div className="flex items-center gap-3">
                    <cat.icon size={16} />
                    <span className="text-xs font-bold">{cat.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main
          className={`flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 rounded-[2.5rem] border-2 ${isDragOver ? 'border-indigo-400 bg-indigo-50/30' : 'border-dashed border-slate-200 dark:border-slate-800'} transition-all overflow-hidden relative`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="p-6 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Buscar archivos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-700 dark:text-white"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
              {filteredFiles.map(file => (
                <div key={file.id} className={`group bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative flex flex-col ${expandedFileId === file.id ? 'row-span-2' : ''}`}>

                  <div className="flex flex-row items-start gap-4">
                    <div className="shrink-0 w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden flex items-center justify-center relative cursor-pointer" onClick={() => setPreviewFile(file)}>
                      {file.category === 'image' && file.url ? (
                        <img src={file.url} className="w-full h-full object-cover" alt={file.name} />
                      ) : file.category === 'audio' ? (
                        <div className="flex flex-col items-center justify-center w-full h-full bg-amber-50 dark:bg-amber-900/20 text-amber-500">
                          {playingAudio === file.id ? <Pause size={20} /> : <Play size={20} />}
                          <button className="absolute inset-0" onClick={(e) => { e.stopPropagation(); toggleAudio(file.id); }} />
                          <audio ref={el => { if (el) audioRefs.current[file.id] = el }} src={file.url} onEnded={() => setPlayingAudio(null)} />
                        </div>
                      ) : (
                        <div className="scale-150 opacity-50">{getFileIcon(file)}</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-slate-800 dark:text-white text-sm truncate mb-1" title={file.name}>{file.name}</h5>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                        <span>{formatSize(file.size)}</span>
                        <span>{file.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <button onClick={() => handleAnalyze(file, 'gemini')} disabled={analyzingFileId === file.id} className="flex-1 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 flex items-center justify-center gap-2">
                      {analyzingFileId === file.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      {analyzingFileId === file.id ? 'Analizando...' : 'Analizar'}
                    </button>
                    <a href={file.url} download={file.name} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-600"><Download size={16} /></a>
                    <button onClick={() => onDeleteFile(file.id)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 hover:text-red-500"><Trash2 size={16} /></button>
                    {(file.aiAnalysis || analyzingFileId === file.id) && (
                      <button
                        onClick={() => setExpandedFileId(expandedFileId === file.id ? null : file.id)}
                        className={`p-2 rounded-lg transition-colors ${expandedFileId === file.id ? 'bg-slate-200 dark:bg-slate-700 text-slate-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800'}`}
                      >
                        {expandedFileId === file.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    )}
                  </div>

                  {/* AI Analysis Expanded Section */}
                  {expandedFileId === file.id && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2">
                      {analyzingFileId === file.id ? (
                        <div className="text-center py-4">
                          <p className="text-xs font-bold text-indigo-500 animate-pulse">Extrayendo inteligencia del documento...</p>
                        </div>
                      ) : file.aiAnalysis ? (
                        <div className="space-y-4">
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                              {file.aiAnalysis.summary}
                            </p>
                          </div>

                          {file.aiAnalysis.keyPoints && file.aiAnalysis.keyPoints.length > 0 && (
                            <div>
                              <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Puntos Clave</p>
                              <ul className="space-y-1">
                                {file.aiAnalysis.keyPoints.map((point, idx) => (
                                  <li key={idx} className="text-xs text-slate-700 dark:text-slate-200 flex items-start gap-2">
                                    <span className="text-indigo-500 mt-1">•</span> {point}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {file.aiAnalysis.suggestedActions && file.aiAnalysis.suggestedActions.length > 0 && (
                            <div>
                              <p className="text-[10px] font-black uppercase text-emerald-500 mb-2 flex items-center gap-1">
                                <CheckCircle2 size={10} /> Acciones Sugeridas
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {file.aiAnalysis.suggestedActions.map((action, idx) => (
                                  <button key={idx} className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg text-[10px] font-bold border border-emerald-100 dark:border-emerald-800 hover:bg-emerald-100 transition-colors flex items-center gap-1">
                                    {action} <ArrowRight size={10} />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onProcess={() => handleAnalyze(previewFile, 'gemini')}
          isProcessing={analyzingFileId === previewFile.id}
        />
      )}
    </div>
  );
};

export default FilesView;
