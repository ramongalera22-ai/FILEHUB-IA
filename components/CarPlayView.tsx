import React, { useState, useEffect } from 'react';
import {
    Car, Mic, MapPin, Volume2, Navigation,
    Fuel, Coffee, Home, Phone, X,
    Music, Battery, Gauge, Zap, Calendar
} from 'lucide-react';

interface CarPlayViewProps {
    onClose?: () => void;
    onVoiceCommand?: () => void;
}

const CarPlayView: React.FC<CarPlayViewProps> = ({ onClose, onVoiceCommand }) => {
    const [time, setTime] = useState(new Date());
    const [drivingMode, setDrivingMode] = useState(false);
    const [speed, setSpeed] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="fixed inset-0 bg-slate-950 text-slate-100 z-[100] flex flex-col font-sans select-none overflow-hidden">
            {/* Top Status Bar */}
            <div className="h-16 flex items-center justify-between px-8 bg-slate-900/50 backdrop-blur-md border-b border-slate-800">
                <div className="flex items-center gap-4">
                    <Car className="text-blue-500" size={24} />
                    <span className="font-black text-lg tracking-widest uppercase text-slate-400">FileHub Auto</span>
                </div>
                <div className="text-2xl font-black tracking-tight">
                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">5G</span>
                        <div className="flex gap-0.5">
                            <div className="w-1 h-3 bg-slate-600 rounded-full"></div>
                            <div className="w-1 h-3 bg-slate-600 rounded-full"></div>
                            <div className="w-1 h-3 bg-white rounded-full"></div>
                            <div className="w-1 h-3 bg-white rounded-full"></div>
                        </div>
                    </div>
                    <Battery size={24} className="text-green-500" />
                </div>
            </div>

            {/* Main Grid */}
            <div className="flex-1 p-6 grid grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Navigation Card */}
                <div className="col-span-2 row-span-2 bg-slate-900 rounded-[2rem] border border-slate-800 p-6 relative overflow-hidden group active:scale-[0.98] transition-all">
                    <div className="absolute inset-0 bg-indigo-900/20 group-active:bg-indigo-900/30 transition-colors"></div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-30">
                        <Navigation size={120} className="text-blue-500" />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex justify-between items-start">
                            <div className="bg-blue-600 p-3 rounded-2xl inline-flex">
                                <MapPin className="text-white" size={32} />
                            </div>
                            <span className="bg-slate-950/50 px-4 py-2 rounded-full text-xs font-bold border border-slate-700">
                                A 12 min de Casa
                            </span>
                        </div>
                        <div>
                            <h3 className="text-3xl font-black leading-tight text-white mb-1">Ir a Casa</h3>
                            <p className="text-blue-200 font-medium">Tráfico Fluido • C/ Ejemplo 123</p>
                        </div>
                    </div>
                </div>

                {/* Media Control */}
                <div className="col-span-2 bg-slate-900 rounded-[2rem] border border-slate-800 p-6 flex items-center gap-6 active:scale-[0.98] transition-all relative overflow-hidden">
                    <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl shadow-lg flex items-center justify-center shrink-0">
                        <Music size={32} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-xl font-bold truncate">Daily Mix 1</h4>
                        <p className="text-slate-400 font-medium truncate">Spotify • Reproduciendo</p>
                    </div>
                    <div className="flex gap-4">
                        <button className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-white hover:bg-slate-700">
                            <Zap size={20} fill="currentColor" />
                        </button>
                    </div>
                </div>

                {/* Quick Actions Actions */}
                <button
                    className="bg-slate-800 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-4 hover:bg-slate-750 active:scale-[0.95] transition-all border border-slate-700 group"
                    onClick={onVoiceCommand}
                >
                    <div className="w-16 h-16 rounded-full bg-red-500/10 group-active:bg-red-500/20 flex items-center justify-center transition-colors">
                        <Mic size={32} className="text-red-500" />
                    </div>
                    <span className="font-bold text-lg">Voz</span>
                </button>

                <button className="bg-slate-800 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-4 hover:bg-slate-750 active:scale-[0.95] transition-all border border-slate-700 group">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 group-active:bg-amber-500/20 flex items-center justify-center transition-colors">
                        <Fuel size={32} className="text-amber-500" />
                    </div>
                    <span className="font-bold text-lg">Repostar</span>
                </button>

                <button className="bg-slate-800 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-4 hover:bg-slate-750 active:scale-[0.95] transition-all border border-slate-700 group">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 group-active:bg-green-500/20 flex items-center justify-center transition-colors">
                        <Phone size={32} className="text-green-500" />
                    </div>
                    <span className="font-bold text-lg">Llamar</span>
                </button>

                <button className="bg-slate-800 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-4 hover:bg-slate-750 active:scale-[0.95] transition-all border border-slate-700 group">
                    <div className="w-16 h-16 rounded-full bg-purple-500/10 group-active:bg-purple-500/20 flex items-center justify-center transition-colors">
                        <Calendar size={32} className="text-purple-500" />
                    </div>
                    <span className="font-bold text-lg">Agenda</span>
                </button>

            </div>

            {/* Bottom Bar Controls */}
            <div className="h-24 bg-slate-900 border-t border-slate-800 px-8 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <button className="p-4 rounded-2xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all" onClick={onClose}>
                        <Home size={28} />
                    </button>
                    <button className="p-4 rounded-2xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
                        <GridIcon active />
                    </button>
                </div>

                <div className="flex items-center gap-6">
                    <div className="bg-slate-800 px-6 py-3 rounded-xl flex items-center gap-3 border border-slate-700">
                        <Gauge size={20} className="text-slate-400" />
                        <span className="text-xl font-black font-mono text-white">0 <span className="text-sm text-slate-500 font-sans font-bold">km/h</span></span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const GridIcon = ({ active }: { active?: boolean }) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={active ? "text-white" : "text-slate-400"}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
);

export default CarPlayView;
