import React from 'react';
import { ViewType } from '../types';
import {
  LayoutDashboard, Calendar, Monitor, CheckSquare, LibraryBig,
  ShoppingBag, Cpu, LogOut, Heart, X, Lightbulb, Zap, Target,
  Plane, BarChart3, QrCode, Settings, FolderOpen, Dumbbell,
  Utensils, Home, Activity, Edit3, BookOpen, Briefcase, Phone,
  Car, Newspaper, ShoppingCart, MessageSquare, Star, Shield,
  Brain, Flame, Stethoscope, Users
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onLogout: () => void;
  isOpen?: boolean;
  toggleSidebar?: () => void;
  currentUser?: string | null;
  darkMode?: boolean;
  setDarkMode?: (dark: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView, onViewChange, onLogout, isOpen, toggleSidebar, currentUser, darkMode, setDarkMode
}) => {
  const menuItems = [
    { id: 'dashboard',      label: 'Dashboard',            icon: LayoutDashboard },
    { id: 'vip-tasks',      label: '⭐ Tareas VIP',         icon: Star },
    { id: 'work-planner',   label: '🧠 Planificador IA',    icon: Brain },
    { id: 'habits',         label: '🔥 Hábitos',            icon: Flame },
    { id: 'travel-planner', label: '✈️ Viajes IA',           icon: Plane },
    { id: 'travel-notebook', label: '📓 Cuaderno Viaje IA',   icon: BookOpen },
    { id: 'shifts',         label: '🛡️ Guardias',           icon: Shield },
    { id: 'patient-notes',  label: '🩺 Notas Pacientes',    icon: Stethoscope },
    { id: 'hangouts',       label: '🍻 Quedadas',           icon: Users },
    { id: 'budget-alerts',  label: '💰 Alertas Presupuesto',icon: Target },
    { id: 'cron-jobs',      label: '⏰ Cron Jobs Bot',      icon: Activity },
    { id: 'time-block',     label: '🧠 Asesor de Tiempo',   icon: Brain },
    { id: 'whatsapp-inbox', label: '📱 Inbox WhatsApp IA',  icon: MessageSquare },
    { id: 'files',          label: 'Archivos',              icon: FolderOpen },
    { id: 'expenses',       label: 'Gastos y Deuda',        icon: LibraryBig },
    { id: 'shared-hub',     label: 'Dashboard Hub',         icon: Heart },
    { id: 'piso',           label: 'Pisos',                 icon: Home },
    { id: 'pisos-dashboard', label: '🏠 Pisos Dashboard',    icon: Home },
    { id: 'pisos-buscador', label: '🔍 Pisos Buscador',     icon: Home },
    { id: 'courses-sessions', label: '🎓 Cursos y Sesiones', icon: Home },
    { id: 'whatsapp-pisos', label: 'Pisos Bot WA',          icon: Home },
    { id: 'jobs',           label: 'Ofertas Empleo',        icon: Briefcase },
    { id: 'activities',     label: 'Actividades',           icon: Activity },
    { id: 'economy',        label: 'Análisis Mensual',      icon: BarChart3 },
    { id: 'work',           label: 'Work Hub',              icon: Monitor },
    { id: 'notebook',       label: 'Cuaderno Privado',      icon: BookOpen },
    { id: 'tasks',          label: 'Tareas y Brain',        icon: CheckSquare },
    { id: 'whiteboard',     label: 'Pizarra Brainstorm',    icon: Edit3 },
    { id: 'goals',          label: 'Visiómetro Metas',      icon: Target },
    { id: 'fitness',        label: 'Entrenamiento',         icon: Dumbbell },
    { id: 'nutrition',      label: 'Nutrición',             icon: Utensils },
    { id: 'calendar',       label: 'Calendario IA',         icon: Calendar },
    { id: 'news',           label: 'Kiosco Digital',        icon: Newspaper },
    { id: 'trips',          label: 'Expediciones',          icon: Plane },
    { id: 'shopping',       label: 'Compras',               icon: ShoppingBag },
    { id: 'supermarkets',   label: 'Supermercados',         icon: ShoppingCart },
    { id: 'ideas',          label: 'Ideas Lab',             icon: Lightbulb },
    { id: 'ai-hub',         label: 'Centro IA Híbrida',     icon: Cpu },
    { id: 'openwebui',      label: 'Open WebUI',            icon: MessageSquare },
    { id: 'whatsapp-bot',   label: 'WhatsApp Bot',          icon: Phone },
    { id: 'qr',             label: 'Acceso Móvil',          icon: QrCode },
    { id: 'settings',       label: 'Configuración',         icon: Settings },
    { id: 'car-mode',       label: 'Modo Coche',            icon: Car },
  ];

  return (
    <div className="w-72 bg-slate-900 h-screen text-slate-300 flex flex-col shadow-2xl overflow-hidden dark:bg-slate-950 dark:border-r dark:border-slate-800">
      <div className="p-6 flex items-center justify-between border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/50">
            <Zap size={22} className="text-white fill-white" />
          </div>
          <h1 className="text-xl font-black text-white tracking-widest">FILEHUB</h1>
        </div>
        <button onClick={toggleSidebar} className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as ViewType)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${
                isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'} />
              <span className={`text-[13px] font-bold tracking-tight ${isActive ? 'font-black' : ''}`}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5 space-y-3 shrink-0 bg-slate-900 dark:bg-slate-950">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800/30 rounded-xl border border-white/5">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tema Oscuro</span>
          <button
            onClick={() => setDarkMode?.(!darkMode)}
            className={`w-10 h-5 rounded-full relative transition-colors ${darkMode ? 'bg-indigo-600' : 'bg-slate-700'}`}
          >
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${darkMode ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-4 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all group"
        >
          <LogOut size={18} />
          <span className="text-xs font-black uppercase tracking-widest">Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
