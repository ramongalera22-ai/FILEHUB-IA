
import React, { useState } from 'react';
import { ShieldCheck, User, Lock, ArrowRight, Sparkles, Fingerprint, Zap, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface AuthViewProps {
  onLogin: (user: any) => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        // Improved registration handling
        if (data?.session) {
          // User is logged in automatically (e.g., email confirmation disabled)
          onLogin(data?.user);
        } else if (data?.user) {
          // User created but needs confirmation
          alert('Registro exitoso. Por favor revisa tu bandeja de entrada para confirmar tu cuenta.');
          setMode('login');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data?.user) {
          onLogin(data?.user);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Visual Side */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative items-center justify-center p-20 overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-600/20 rounded-full -mr-96 -mt-96 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full -ml-48 -mb-48 blur-[80px]"></div>
        
        <div className="relative z-10 space-y-12 max-w-xl">
           <div className="inline-flex items-center gap-4 px-6 py-3 bg-white/5 border border-white/10 rounded-full backdrop-blur-xl">
             <Zap className="text-indigo-400 fill-indigo-400" size={20} />
             <span className="text-xs font-black text-indigo-100 uppercase tracking-[0.2em]">Next-Gen Productivity</span>
           </div>
           
           <div className="space-y-6">
             <h1 className="text-7xl font-black text-white tracking-tighter leading-none">
               Domina tu <span className="text-indigo-500">Mundo</span> Digital.
             </h1>
             <p className="text-slate-400 text-xl font-medium leading-relaxed">
               Gestiona finanzas, proyectos y tareas con el poder de la Inteligencia Artificial híbrida. Todo en un solo lugar, sincronizado en la nube.
             </p>
           </div>

           <div className="grid grid-cols-2 gap-8 pt-10">
              <div className="space-y-4">
                 <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                    <ShieldCheck className="text-indigo-400" size={28} />
                 </div>
                 <h4 className="text-white font-bold">Seguridad Supabase</h4>
                 <p className="text-slate-500 text-sm">Tus datos están encriptados y sincronizados en tiempo real.</p>
              </div>
              <div className="space-y-4">
                 <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                    <Fingerprint className="text-indigo-400" size={28} />
                 </div>
                 <h4 className="text-white font-bold">Multi-Dispositivo</h4>
                 <p className="text-slate-500 text-sm">Acceso instantáneo desde cualquier lugar.</p>
              </div>
           </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-20 relative">
        <div className="w-full max-w-md space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
           <div className="text-center space-y-4">
             <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200 mb-8">
                <Zap className="text-white fill-white" size={40} />
             </div>
             <h2 className="text-4xl font-black text-slate-900 tracking-tight">Bienvenido a <span className="text-indigo-600">FILEHUB</span></h2>
             <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Portal de Acceso Cloud</p>
           </div>

           <div className="bg-white p-2 rounded-2xl border border-slate-100 flex gap-2 shadow-sm">
              <button onClick={() => setMode('login')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'login' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Acceder</button>
              <button onClick={() => setMode('register')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'register' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Registrarse</button>
           </div>

           {error && (
             <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100">
               {error}
             </div>
           )}

           <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                <div className="relative group">
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
                  <input 
                    type="email" 
                    className="w-full bg-white border border-slate-200 rounded-2xl py-5 pl-16 pr-8 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 transition-all font-bold text-slate-700 outline-none"
                    placeholder="usuario@ejemplo.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
                <div className="relative group">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
                  <input 
                    type="password" 
                    className="w-full bg-white border border-slate-200 rounded-2xl py-5 pl-16 pr-8 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 transition-all font-bold text-slate-700 outline-none"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-6 bg-indigo-600 text-white font-black rounded-2xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 disabled:opacity-70"
              >
                {loading ? <Loader2 className="animate-spin" /> : (mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta')} 
                {!loading && <ArrowRight size={18} />}
              </button>
           </form>

           <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest pt-10">
              Powered by Supabase • Secure Cloud Storage
           </p>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
