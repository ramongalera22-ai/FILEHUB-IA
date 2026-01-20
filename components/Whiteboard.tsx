
import React, { useState, useEffect } from 'react';
import { Pencil, Eraser, Trash2, Download } from 'lucide-react';

interface WhiteboardProps {
    initialData?: string;
    onSave: (data: string) => void;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ initialData, onSave }) => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#6366f1');
    const [size, setSize] = useState(3);
    const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                const tempImage = canvas.toDataURL();
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
                const img = new Image();
                img.src = tempImage || initialData || '';
                img.onload = () => ctx.drawImage(img, 0, 0);
            }
        };

        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [initialData]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsDrawing(true);
        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
        const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
        const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

        ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
        if (tool === 'eraser') {
            ctx.lineWidth = 20;
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.lineWidth = size;
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            onSave(canvas.toDataURL());
        }
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            onSave('');
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/30 rounded-[2.5rem] overflow-hidden relative border border-slate-100 dark:border-slate-800">
            {/* Toolbar */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-3 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-20">
                <button
                    onClick={() => setTool('pencil')}
                    className={`p-3 rounded-xl transition-all ${tool === 'pencil' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                    <Pencil size={18} />
                </button>
                <button
                    onClick={() => setTool('eraser')}
                    className={`p-3 rounded-xl transition-all ${tool === 'eraser' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                    <Eraser size={18} />
                </button>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2"></div>
                {['#000000', '#6366f1', '#10b981', '#f59e0b', '#ef4444'].map(c => (
                    <button
                        key={c}
                        onClick={() => { setColor(c); setTool('pencil'); }}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${color === c && tool === 'pencil' ? 'border-slate-400 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                    />
                ))}
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-2"></div>
                <button
                    onClick={clearCanvas}
                    className="p-3 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all font-black"
                    title="Limpiar pizarra"
                >
                    <Trash2 size={18} />
                </button>
                <button
                    onClick={() => {
                        const canvas = canvasRef.current;
                        if (canvas) {
                            const link = document.createElement('a');
                            link.download = `whiteboard-${new Date().getTime()}.png`;
                            link.href = canvas.toDataURL();
                            link.click();
                        }
                    }}
                    className="p-3 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                    title="Descargar imagen"
                >
                    <Download size={18} />
                </button>
            </div>

            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="flex-1 cursor-crosshair touch-none"
            />
        </div>
    );
};

export default Whiteboard;
