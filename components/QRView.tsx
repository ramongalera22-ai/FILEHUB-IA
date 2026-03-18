
import React from 'react';
import { QrCode, Smartphone, Download, Share2, Info, CheckCircle2, Zap } from 'lucide-react';

const QRView: React.FC = () => {
   const githubPagesUrl = 'https://ramongalera22-ai.github.io/FILEHUB-IA/';
   const currentUrl = window.location.hostname === 'localhost' ? githubPagesUrl : window.location.href.split('?')[0];
   const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(currentUrl)}&margin=20&bgcolor=ffffff&color=0f172a&ecc=H`;

   return (
      <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
         <header className="text-center space-y-4">
            <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 mb-2">
               <Zap size={18} />
               <span className="text-xs font-black uppercase tracking-[0.2em]">Acceso Multi-Dispositivo</span>
            </div>
            <h2 className="text-5xl font-black text-slate-900 tracking-tight">Lleva FILEHUB en tu bolsillo</h2>
            <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto leading-relaxed">
               Escanea el código QR para abrir la aplicación instantáneamente en cualquier smartphone o tablet y disfrutar de la experiencia PWA completa.
            </p>
         </header>

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            {/* QR Card */}
            <div className="lg:col-span-5">
               <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-2xl shadow-indigo-100/50 flex flex-col items-center group relative overflow-hidden h-full">
                  <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>

                  <div className="relative mb-10 p-6 bg-slate-50 rounded-[3rem] border border-slate-100 group-hover:scale-[1.02] transition-transform">
                     <img
                        src={qrApiUrl}
                        alt="App QR Code"
                        className="w-[280px] h-[280px] object-contain rounded-2xl mix-blend-multiply"
                     />
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-3 rounded-[1.5rem] shadow-xl border border-slate-50">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-[9px] shadow-lg shadow-indigo-600/20">FH</div>
                     </div>
                  </div>

                  <div className="text-center space-y-2">
                     <p className="text-slate-900 font-black text-lg tracking-tight">Escanear Código</p>
                     <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{currentUrl.replace(/(^\w+:|^)\/\//, '')}</p>
                  </div>

                  <div className="mt-10 flex gap-3 w-full">
                     <button
                        onClick={() => navigator.share?.({ title: 'FILEHUB', url: currentUrl })}
                        className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
                     >
                        <Share2 size={16} /> Compartir Link
                     </button>
                  </div>
               </div>
            </div>

            {/* Instructions Card */}
            <div className="lg:col-span-7 space-y-6">
               <div className="bg-slate-900 rounded-[4rem] p-12 text-white h-full relative overflow-hidden border border-indigo-500/20">
                  <div className="absolute top-0 right-0 p-12 opacity-10"><Smartphone size={150} /></div>

                  <h3 className="text-3xl font-black mb-8 tracking-tight">Cómo instalar la App</h3>

                  <div className="space-y-10 relative z-10">
                     <div className="flex gap-6">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 font-black text-indigo-400">1</div>
                        <div className="space-y-2">
                           <h4 className="text-xl font-bold">Escanea el QR</h4>
                           <p className="text-slate-400 text-sm leading-relaxed">Usa la cámara de tu móvil para detectar el código. Se abrirá FILEHUB automáticamente en tu navegador.</p>
                        </div>
                     </div>

                     <div className="flex gap-6">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 font-black text-indigo-400">2</div>
                        <div className="space-y-4">
                           <h4 className="text-xl font-bold">Instalar en la Pantalla</h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="p-5 bg-white/5 rounded-3xl border border-white/10">
                                 <div className="flex items-center gap-2 mb-2">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" className="w-4 h-4 invert" alt="iOS" />
                                    <span className="text-[10px] font-black uppercase text-slate-300">iOS (iPhone/iPad)</span>
                                 </div>
                                 <p className="text-xs text-slate-400">Pulsa el botón "Compartir" y selecciona <b>"Añadir a la pantalla de inicio"</b>.</p>
                              </div>
                              <div className="p-5 bg-white/5 rounded-3xl border border-white/10">
                                 <div className="flex items-center gap-2 mb-2">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/d/d7/Android_robot.svg" className="w-4 h-4" alt="Android" />
                                    <span className="text-[10px] font-black uppercase text-slate-300">Android</span>
                                 </div>
                                 <p className="text-xs text-slate-400">Pulsa los tres puntos del navegador y selecciona <b>"Instalar aplicación"</b>.</p>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="flex gap-6">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 font-black text-indigo-400">3</div>
                        <div className="space-y-2">
                           <h4 className="text-xl font-bold">Experiencia Full Screen</h4>
                           <p className="text-slate-400 text-sm leading-relaxed">Ahora puedes abrir FILEHUB como una app nativa, sin barras de navegación y con acceso offline.</p>
                        </div>
                     </div>
                  </div>

                  <div className="mt-12 p-6 bg-indigo-600 rounded-[2.5rem] flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-xl text-white"><CheckCircle2 size={24} /></div>
                        <p className="font-bold text-sm">App optimizada para alta movilidad.</p>
                     </div>
                     <div className="hidden md:block w-px h-10 bg-white/20"></div>
                     <div className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                        Sincronización Cloud <Zap size={14} className="text-amber-300" />
                     </div>
                  </div>
               </div>
            </div>
         </div>

         <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-10 shadow-sm">
            <div className="flex items-center gap-8">
               <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-indigo-600 border border-slate-100">
                  <Info size={32} />
               </div>
               <div>
                  <h3 className="text-2xl font-black text-slate-900">¿Por qué usar la PWA?</h3>
                  <p className="text-slate-500 font-medium max-w-xl mt-2 leading-relaxed">
                     FILEHUB es una Aplicación Web Progresiva. Ofrece notificaciones, carga ultra rápida y ocupa muy poco espacio en tu dispositivo, manteniendo tus datos siempre seguros.
                  </p>
               </div>
            </div>
            <button className="px-10 py-5 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100">
               Ver Documentación
            </button>
         </div>
      </div>
   );
};

export default QRView;
