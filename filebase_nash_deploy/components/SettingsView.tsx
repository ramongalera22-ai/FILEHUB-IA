
import React, { useState } from 'react';
import {
   User,
   ShieldCheck,
   Bell,
   Cloud,
   Database,
   Trash2,
   Smartphone,
   Globe,
   Key,
   Lock,
   Zap,
   ChevronRight,
   Monitor,
   Moon,
   Info,
   ExternalLink,
   Mail,
   Fingerprint,
   RefreshCw,
   Server,
   Sparkles,
   Clock
} from 'lucide-react';
import { OllamaConfig, ViewType } from '../types';

interface SettingsViewProps {
   currentUser: string;
   ollamaConfig: OllamaConfig;
   isDarkMode?: boolean;
   toggleDarkMode?: () => void;
   onNavigate?: (view: ViewType) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, ollamaConfig, isDarkMode, toggleDarkMode, onNavigate }) => {
   const [notifications, setNotifications] = useState(true);
   const [dataSaver, setDataSaver] = useState(false);
   const [autoSummaries, setAutoSummaries] = useState(true);
   const [email, setEmail] = useState('usuario@filehub.pro');
   const [isClearing, setIsClearing] = useState(false);

   const handleClearData = async () => {
      if (confirm('¿Estás seguro? Se borrarán todos los datos locales de FILEHUB (gastos, tareas, proyectos). Esta acción no se puede deshacer.')) {
         setIsClearing(true);
         setTimeout(() => {
            localStorage.clear();
            window.location.reload();
         }, 1500);
      }
   };

   return (
      <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
         <header>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Centro de Control</h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold mt-1">Personaliza tu entorno de inteligencia y gestiona tu privacidad.</p>
         </header>

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

            {/* Main Settings Column */}
            <div className="lg:col-span-8 space-y-10">

               {/* Profile Section */}
               <section className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                     <User size={18} className="text-indigo-600" /> Perfil de Usuario
                  </h3>
                  <div className="flex flex-col md:flex-row items-center gap-10">
                     <div className="relative group">
                        <div className="w-32 h-32 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl group-hover:scale-105 transition-transform duration-500">
                           <User size={50} />
                        </div>
                     </div>
                     <div className="flex-1 space-y-6 w-full">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alias del Nodo</label>
                              <input
                                 className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-black text-slate-700 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                 defaultValue={currentUser}
                              />
                           </div>
                           <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email de Reportes</label>
                              <input
                                 type="email"
                                 className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 font-black text-slate-700 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                 value={email}
                                 onChange={(e) => setEmail(e.target.value)}
                              />
                           </div>
                        </div>
                        <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50 p-4 rounded-2xl">
                           <Zap size={18} className="text-emerald-500" />
                           <span className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest">Suscripción Premium Activa • Renovación en 2026</span>
                        </div>
                     </div>
                  </div>
               </section>

               {/* Preferences Section (Dark Mode) */}
               <section className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                     <Monitor size={18} className="text-indigo-600" /> Preferencias de Interfaz
                  </h3>
                  <div className="space-y-6">
                     {toggleDarkMode && (
                        <div className="flex items-center justify-between p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-700">
                           <div className="flex items-start gap-5">
                              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-indigo-600 dark:text-indigo-400"><Moon size={24} /></div>
                              <div>
                                 <p className="font-black text-slate-800 dark:text-white text-lg tracking-tight">Modo Oscuro</p>
                                 <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed max-w-md">
                                    Interfaz optimizada para entornos de baja luminosidad y reducción de fatiga visual.
                                 </p>
                              </div>
                           </div>
                           <button
                              onClick={toggleDarkMode}
                              className={`w-16 h-9 rounded-full p-1 transition-all ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
                           >
                              <div className={`w-7 h-7 bg-white rounded-full shadow-lg transition-transform ${isDarkMode ? 'translate-x-7' : 'translate-x-0'}`}></div>
                           </button>
                        </div>
                     )}
                  </div>
               </section>

               {/* AI Automation Section */}
               <section className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                     <Sparkles size={18} className="text-indigo-600" /> Automatizaciones de Inteligencia
                  </h3>
                  <div className="space-y-6">
                     <div className="flex items-center justify-between p-8 bg-indigo-50/30 dark:bg-indigo-900/20 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/30">
                        <div className="flex items-start gap-5">
                           <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-indigo-600 dark:text-indigo-400"><Clock size={24} /></div>
                           <div>
                              <p className="font-black text-slate-800 dark:text-white text-lg tracking-tight">Briefings Diarios (8:00 & 23:00)</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed max-w-md">
                                 Recibe un resumen automático de tus tareas y calendario para planificar tu mañana o cerrar tu jornada con éxito.
                              </p>
                           </div>
                        </div>
                        <button
                           onClick={() => setAutoSummaries(!autoSummaries)}
                           className={`w-16 h-9 rounded-full p-1 transition-all ${autoSummaries ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        >
                           <div className={`w-7 h-7 bg-white rounded-full shadow-lg transition-transform ${autoSummaries ? 'translate-x-7' : 'translate-x-0'}`}></div>
                        </button>
                     </div>
                  </div>
               </section>

               {/* Resto de secciones (Cloud Integrations, Preferences) ... */}
               <section className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="p-10 border-b border-slate-50 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/20">
                     <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                        <Cloud size={18} className="text-indigo-600" /> Ecosistema Conectado
                     </h3>
                  </div>
                  <div className="divide-y divide-slate-50 dark:divide-slate-800">
                     {[
                        { name: 'Google Calendar', icon: Globe, status: 'Conectado', color: 'text-blue-500', action: () => onNavigate && onNavigate('calendar') },
                        { name: 'Ollama Node (Local)', icon: Server, status: ollamaConfig.isActive ? 'Activo' : 'Offline', color: 'text-cyan-500', action: () => onNavigate && onNavigate('ai-hub') }
                     ].map((app, i) => (
                        <div key={i} className="p-8 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all group">
                           <div className="flex items-center gap-6">
                              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 dark:text-slate-400 group-hover:bg-white dark:group-hover:bg-slate-700 group-hover:shadow-md transition-all">
                                 <app.icon size={20} />
                              </div>
                              <div>
                                 <h4 className="font-black text-slate-800 dark:text-white">{app.name}</h4>
                                 <p className={`text-[10px] font-black uppercase tracking-widest ${app.color}`}>{app.status}</p>
                              </div>
                           </div>
                           <button
                              onClick={app.action}
                              className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:border-indigo-600 transition-all"
                           >
                              Gestionar
                           </button>
                        </div>
                     ))}
                  </div>
               </section>
            </div>

            {/* Sidebar: Privacy & System */}
            <div className="lg:col-span-4 space-y-10">
               <section className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl border border-indigo-500/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12"><ShieldCheck size={100} /></div>
                  <h4 className="text-lg font-black mb-8 flex items-center gap-3">
                     <Lock className="text-indigo-400" size={24} /> Bóveda de Seguridad
                  </h4>
                  <div className="space-y-6 relative z-10">
                     <div className="flex items-start gap-4">
                        <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg shrink-0"><Fingerprint size={20} /></div>
                        <div>
                           <p className="text-xs font-black uppercase text-white tracking-widest">Cifrado AES-256</p>
                           <p className="text-[10px] text-slate-400 mt-1">Tus briefings locales están protegidos.</p>
                        </div>
                     </div>
                  </div>
               </section>

               <section className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                     <Database className="text-indigo-600" size={18} /> Mantenimiento
                  </h4>
                  <button
                     onClick={handleClearData}
                     disabled={isClearing}
                     className="w-full py-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 transition-all flex items-center justify-center gap-3 border border-red-100 dark:border-red-900/30"
                  >
                     {isClearing ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                     {isClearing ? 'Borrando...' : 'Restablecer App'}
                  </button>
               </section>
            </div>
         </div>
      </div>
   );
};

export default SettingsView;
