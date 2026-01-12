
import React from 'react';
import { ViewType } from '../types';
import { 
  LayoutDashboard, 
  Calendar, 
  Briefcase, 
  Sparkles,
  Camera,
  Monitor,
  CheckSquare,
  LibraryBig,
  ShoppingBag,
  Cpu,
  LogOut,
  Users,
  X,
  Lightbulb,
  Smartphone,
  Zap,
  TrendingUp,
  Target,
  Plane,
  BarChart3,
  QrCode,
  Settings,
  FolderOpen,
  Dumbbell,
  Utensils
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onScanClick: () => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, onScanClick, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, type: 'nav' },
    { id: 'files', label: 'Archivos', icon: FolderOpen, type: 'nav' },
    { id: 'expenses', label: 'Gastos y Deuda', icon: LibraryBig, type: 'nav' },
    { id: 'shared-finances', label: 'Cuentas Compartidas', icon: Users, type: 'nav' },
    { id: 'economy', label: 'Análisis Mensual', icon: BarChart3, type: 'nav' },
    { id: 'work', label: 'Work Hub', icon: Monitor, type: 'nav' },
    { id: 'tasks', label: 'Tareas y Brain', icon: CheckSquare, type: 'nav' },
    { id: 'goals', label: 'Visiómetro Metas', icon: Target, type: 'nav' },
    { id: 'fitness', label: 'Entrenamiento', icon: Dumbbell, type: 'nav' },
    { id: 'nutrition', label: 'Nutrición', icon: Utensils, type: 'nav' },
    { id: 'calendar', label: 'Calendario IA', icon: Calendar, type: 'nav' },
    { id: 'trips', label: 'Expediciones', icon: Plane, type: 'nav' },
    { id: 'shopping', label: 'Compras', icon: ShoppingBag, type: 'nav' },
    { id: 'ideas', label: 'Ideas Lab', icon: Lightbulb, type: 'nav' },
    { id: 'ai-hub', label: 'Centro IA Híbrida', icon: Cpu, type: 'nav' },
    { id: 'qr', label: 'Acceso Móvil', icon: QrCode, type: 'nav' },
    { id: 'settings', label: 'Configuración', icon: Settings, type: 'nav' },
    { id: 'scan', label: 'Escanear Documento', icon: Camera, type: 'action' },
  ];

  return (
    <div className="w-72 bg-slate-900 h-screen text-slate-300 flex flex-col shadow-2xl overflow-hidden dark:bg-slate-950 dark:border-r dark:border-slate-800">
      <div className="p-8 flex items-center justify-between border-b border-white/5 shrink-0">
        <h1 className="text-2xl font-black text-white flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/50">
            <Zap size={22} className="text-white fill-white" />
          </div>
          FILEHUB
        </h1>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id && item.type === 'nav';
          
          return (
            <button
              key={item.id}
              onClick={() => item.type === 'action' ? onScanClick() : onViewChange(item.id as ViewType)}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all group ${
                isActive 
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/20' 
                : 'hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'} />
              <span className={`text-[13px] font-bold tracking-tight ${isActive ? 'font-black' : ''}`}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-6 border-t border-white/5 space-y-4 shrink-0 bg-slate-900 dark:bg-slate-950">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-4 px-5 py-4 text-red-400 hover:bg-red-500/10 rounded-2xl transition-all group"
        >
          <LogOut size={20} />
          <span className="text-sm font-black uppercase tracking-widest">Cerrar Sesión</span>
        </button>
        
        <div className="bg-slate-800/40 rounded-2xl p-4 border border-white/5">
           <div className="flex items-center gap-3 mb-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[9px] font-black uppercase text-slate-500">Nodo Seguro Activo</span>
           </div>
           <p className="text-[9px] text-slate-500 font-medium leading-tight">FILEHUB Protocol v2.0.4 • Datos Encriptados</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;