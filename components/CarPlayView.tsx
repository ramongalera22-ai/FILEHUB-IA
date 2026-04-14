import React, { useState, useEffect } from 'react';
import {
    Car, Mic, MapPin, Volume2, Navigation,
    Fuel, Coffee, Home, Phone, X,
    Music, Battery, Gauge, Zap, Calendar, Stethoscope, ArrowLeft
} from 'lucide-react';
import VoiceNotesView from './VoiceNotesView';

interface CarPlayViewProps {
    onClose?: () => void;
    session?: any;
}

const CarPlayView: React.FC<CarPlayViewProps> = ({ onClose, session }) => {
    const [time, setTime] = useState(new Date());
    const [showScribe, setShowScribe] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // ─── Scribe Mode ───
    if (showScribe) {
        return (
            <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col">
                <div className="h-16 flex items-center justify-between px-6 bg-slate-900/50 border-b border-slate-800">
                    <button onClick={() => setShowScribe(false)} className="flex items-center gap-2 text-slate-400 hover:text-white">
                        <ArrowLeft size={20} /> <span className="font-bold text-sm">Volver</span>
                    </button>
                    <span className="font-black text-sm text-emerald-400 tracking-widest uppercase">Scribe Médico</span>
                    <Stethoscope size={20} className="text-emerald-400" />
                </div>
                <div className="flex-1">
                    <VoiceNotesView session={session} carplayMode={true} />
                </div>
            </div>
        );
    }

    // ─── Main CarPlay ───
    return (
        <div className="fixed inset-0 bg-slate-950 text-slate-100 z-[100] flex flex-col font-sans select-none overflow-hidden">
            {/* Top Bar */}
            <div className="h-16 flex items-center justify-between px-8 bg-slate-900/50 backdrop-blur-md border-b border-slate-800">
                <div className="flex items-center gap-4">
                    <Car className="text-blue-500" size={24} />
                    <span className="font-black text-lg tracking-widest uppercase text-slate-400">FileHub Auto</span>
                </div>
                <div className="text-2xl font-black tracking-tight">
                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="flex items-center gap-4">
                    <Battery size={24} className="text-green-500" />
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 p-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Navigation */}
                <div className="col-span-2 row-span-2 bg-slate-900 rounded-[2rem] border border-slate-800 p-6 relative overflow-hidden group active:scale-[0.98] transition-all">
                    <div className="absolute inset-0 bg-indigo-900/20" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-30">
                        <Navigation size={120} className="text-blue-500" />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex justify-between items-start">
                            <div className="bg-blue-600 p-3 rounded-2xl inline-flex"><MapPin className="text-white" size={32} /></div>
                            <span className="bg-slate-950/50 px-4 py-2 rounded-full text-xs font-bold border border-slate-700">A 12 min de Casa</span>
                        </div>
                        <div>
                            <h3 className="text-3xl font-black leading-tight text-white mb-1">Ir a Casa</h3>
                            <p className="text-blue-200 font-medium">Tráfico Fluido</p>
                        </div>
                    </div>
                </div>

                {/* Media */}
                <div className="col-span-2 bg-slate-900 rounded-[2rem] border border-slate-800 p-6 flex items-center gap-6 active:scale-[0.98] transition-all">
                    <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl shadow-lg flex items-center justify-center shrink-0">
                        <Music size={32} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-xl font-bold truncate">Daily Mix 1</h4>
                        <p className="text-slate-400 font-medium truncate">Spotify</p>
                    </div>
                </div>

                {/* 🩺 SCRIBE MÉDICO — Big button */}
                <button onClick={() => setShowScribe(true)}
                    className="col-span-2 bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 rounded-[2rem] p-6 flex items-center gap-6 active:scale-[0.95] transition-all border border-emerald-700/30 group hover:border-emerald-500/50">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/15 group-active:bg-emerald-500/25 flex items-center justify-center transition-colors">
                        <Stethoscope size={36} className="text-emerald-400" />
                    </div>
                    <div className="text-left">
                        <h4 className="text-2xl font-black text-emerald-300">Scribe Médico</h4>
                        <p className="text-emerald-500/70 font-bold text-sm">Grabar consulta • Nota SOAP con IA</p>
                    </div>
                </button>

                {/* Quick actions */}
                <button onClick={onClose}
                    className="bg-slate-800 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-4 active:scale-[0.95] transition-all border border-slate-700">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center"><Home size={32} className="text-amber-500" /></div>
                    <span className="font-bold text-lg">Salir</span>
                </button>

                <button className="bg-slate-800 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-4 active:scale-[0.95] transition-all border border-slate-700">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center"><Phone size={32} className="text-green-500" /></div>
                    <span className="font-bold text-lg">Llamar</span>
                </button>
            </div>
        </div>
    );
};

export default CarPlayView;
