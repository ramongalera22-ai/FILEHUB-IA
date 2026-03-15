import React, { useState, useEffect } from 'react';
import { Bot, Copy, Check, Send, ChevronDown, ChevronUp, Zap, Clock, RefreshCw, ExternalLink } from 'lucide-react';

interface BotPrompt {
  label: string;
  prompt: string;
  icon?: string;
}

interface BotPanelProps {
  module: string;
  prompts: BotPrompt[];
  color?: 'indigo' | 'emerald' | 'violet' | 'amber' | 'blue' | 'rose';
  defaultCollapsed?: boolean;
}

const COLOR_MAP = {
  indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', btn: 'bg-indigo-600 hover:bg-indigo-700', dot: 'bg-indigo-400' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', btn: 'bg-emerald-600 hover:bg-emerald-700', dot: 'bg-emerald-400' },
  violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', btn: 'bg-violet-600 hover:bg-violet-700', dot: 'bg-violet-400' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', btn: 'bg-amber-600 hover:bg-amber-700', dot: 'bg-amber-400' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', btn: 'bg-blue-600 hover:bg-blue-700', dot: 'bg-blue-400' },
  rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', btn: 'bg-rose-600 hover:bg-rose-700', dot: 'bg-rose-400' },
};

const NUCBOX_URL = import.meta.env.VITE_WA_SERVER_URL || '';

export const BotPanel: React.FC<BotPanelProps> = ({
  module,
  prompts,
  color = 'indigo',
  defaultCollapsed = true,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [sending, setSending] = useState<number | null>(null);
  const [lastSent, setLastSent] = useState<string | null>(() =>
    localStorage.getItem(`botpanel_last_${module}`)
  );
  const [botOnline, setBotOnline] = useState<boolean | null>(null);
  const c = COLOR_MAP[color];

  useEffect(() => {
    if (!NUCBOX_URL) return;
    fetch(`${NUCBOX_URL}/health`, { signal: AbortSignal.timeout(3000) })
      .then(r => setBotOnline(r.ok))
      .catch(() => setBotOnline(false));
  }, []);

  const copyPrompt = (prompt: string, idx: number) => {
    navigator.clipboard.writeText(prompt);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const sendToBot = async (prompt: string, idx: number) => {
    setSending(idx);
    try {
      if (NUCBOX_URL) {
        await fetch(`${NUCBOX_URL}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: prompt }),
        });
      }
      const now = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      setLastSent(now);
      localStorage.setItem(`botpanel_last_${module}`, now);
    } catch {
      // fallback: just copy
      navigator.clipboard.writeText(prompt);
    } finally {
      setSending(null);
    }
  };

  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Bot size={18} className={c.text} />
            {botOnline !== null && (
              <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${botOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
            )}
          </div>
          <span className={`text-xs font-black uppercase tracking-widest ${c.text}`}>
            Bot OpenClaw — {module}
          </span>
          {lastSent && (
            <span className="text-[10px] text-slate-400 font-medium">último: {lastSent}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {botOnline === true && <span className="text-[10px] text-emerald-400 font-bold">● online</span>}
          {botOnline === false && <span className="text-[10px] text-red-400 font-bold">● offline</span>}
          {collapsed ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronUp size={14} className="text-slate-400" />}
        </div>
      </button>

      {/* Content */}
      {!collapsed && (
        <div className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
            Pulsa <strong className="text-slate-600 dark:text-slate-300">Enviar</strong> para mandar al bot directamente, o <strong className="text-slate-600 dark:text-slate-300">Copiar</strong> para pegarlo en WhatsApp/Telegram.
          </p>
          {prompts.map((p, i) => (
            <div key={i} className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-3 border border-white/20 dark:border-white/5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{p.icon || '🤖'}</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{p.label}</span>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => copyPrompt(p.prompt, i)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                  >
                    {copiedIdx === i ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                    {copiedIdx === i ? 'Copiado' : 'Copiar'}
                  </button>
                  <button
                    onClick={() => sendToBot(p.prompt, i)}
                    disabled={sending === i}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-white text-[10px] font-bold transition-colors ${c.btn} disabled:opacity-60`}
                  >
                    {sending === i ? <RefreshCw size={10} className="animate-spin" /> : <Send size={10} />}
                    {sending === i ? '...' : 'Enviar'}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-mono bg-slate-100/50 dark:bg-slate-900/50 rounded-lg px-2 py-1.5">
                {p.prompt}
              </p>
            </div>
          ))}

          {/* Cron shortcut */}
          <div className="flex items-center gap-2 pt-1">
            <Zap size={12} className="text-slate-400" />
            <span className="text-[10px] text-slate-400">
              Para automatizar, añade un cron en{' '}
              <a href="#" className={`${c.text} font-bold hover:underline`}>
                ⏰ Cron Jobs Bot
              </a>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Pre-built panels for each module — import directly
// ============================================================

export const BotPanelPisos: React.FC = () => (
  <BotPanel module="Pisos" color="indigo" prompts={[
    { label: 'Buscar pisos ahora', icon: '🏠', prompt: 'Abre idealista.com/alquiler-viviendas/murcia-murcia/con-precio-hasta_800/ y fotocasa.es/alquiler/murcia/ con el browser, extrae todos los pisos disponibles (precio, m², dirección, link) y guárdalos en pisos.md. Avísame de novedades.' },
    { label: 'Pisos nuevos hoy', icon: '🆕', prompt: 'Lee pisos.md y dime qué pisos nuevos han aparecido hoy en Idealista y Fotocasa comparado con ayer. Lista solo los nuevos con precio y link.' },
    { label: 'Alerta precio bajado', icon: '📉', prompt: 'Revisa pisos.md y dime qué pisos han bajado de precio esta semana. Muéstrame precio anterior vs actual y el link.' },
  ]} />
);

export const BotPanelEmpleoMedico: React.FC = () => (
  <BotPanel module="Empleo Médico" color="emerald" prompts={[
    { label: 'Buscar ofertas ahora', icon: '💼', prompt: 'Busca ofertas de médico de familia en Barcelona en camfic.cat, portaldelmec.cat, infojobs.net y linkedin.com/jobs. Extrae título, empresa, ubicación y link. Guarda en trabajos-medico.md y avísame de las nuevas.' },
    { label: 'Resumen ofertas semana', icon: '📋', prompt: 'Lee trabajos-medico.md, trabajos-consultoria.md, trabajos-healthtech.md y trabajos-remoto.md. Dame un resumen de las 5 mejores ofertas nuevas de esta semana ordenadas por relevancia.' },
    { label: 'Startups salud digital', icon: '🏥', prompt: 'Busca ofertas para médico en Doctolib, Alan, Teladoc, Doctoralia y Livi. También busca en linkedin.com/jobs "médico salud digital Barcelona" y "physician remote Spain". Guarda en trabajos-healthtech.md.' },
  ]} />
);

export const BotPanelTareas: React.FC = () => (
  <BotPanel module="Tareas" color="violet" prompts={[
    { label: 'Priorizar tareas hoy', icon: '🎯', prompt: 'Lee mis tareas pendientes del archivo tareas.md y mi calendario de hoy. Prioriza las 5 tareas más importantes para hoy considerando urgencia e impacto. Dame un plan horario concreto.' },
    { label: 'Resumen tareas semana', icon: '📊', prompt: 'Analiza mis tareas completadas e incompletas de esta semana. Dame un resumen de productividad: % completado, áreas rezagadas y recomendaciones para la próxima semana.' },
    { label: 'Crear tarea por voz', icon: '🎤', prompt: 'Añade esta tarea a mi lista: ' },
  ]} />
);

export const BotPanelCalendario: React.FC = () => (
  <BotPanel module="Calendario" color="blue" prompts={[
    { label: 'Eventos esta semana', icon: '📅', prompt: `Lee mi calendario iCal de https://calendar.google.com/calendar/ical/carlosgalera2roman%40gmail.com/public/basic.ics y lista todos los eventos de esta semana ordenados por día y hora.` },
    { label: 'Próximas guardias', icon: '🛡️', prompt: 'Lee mi calendario iCal y dime todas mis próximas guardias médicas del mes. Calcula cuántas horas de guardia tengo y qué días quedan libres.' },
    { label: 'Añadir evento', icon: '➕', prompt: 'Añade a mi calendario el siguiente evento: ' },
  ]} />
);

export const BotPanelNutricion: React.FC = () => (
  <BotPanel module="Nutrición" color="emerald" prompts={[
    { label: 'Plan semanal comidas', icon: '🥗', prompt: 'Crea un plan de comidas para esta semana. Soy médico, hago guardias de 24h, necesito comidas rápidas y nutritivas. Incluye desayuno, comida y cena para 7 días. Guarda en nutricion.md.' },
    { label: 'Lista compra semana', icon: '🛒', prompt: 'Basándote en el plan de nutricion.md, genera la lista de la compra para esta semana organizada por secciones del supermercado (frutas, verduras, proteínas, lácteos, etc.).' },
    { label: 'Análisis nutricional', icon: '📊', prompt: 'Analiza mi plan de nutrición de nutricion.md. Dame un resumen de calorías estimadas, distribución de macronutrientes y sugerencias de mejora.' },
  ]} />
);

export const BotPanelFitness: React.FC = () => (
  <BotPanel module="Entrenamiento" color="rose" prompts={[
    { label: 'Plan entrenamiento semana', icon: '💪', prompt: 'Crea un plan de entrenamiento semanal adaptado a mi horario de médico con guardias. Necesito rutinas de 30-45 min máximo. Alterna cardio y fuerza. Guarda en entrenamiento.md.' },
    { label: 'Registrar entreno hoy', icon: '📝', prompt: 'Registra el siguiente entrenamiento de hoy en entrenamiento.md: ' },
    { label: 'Progreso mensual', icon: '📈', prompt: 'Lee entrenamiento.md y dame un resumen del progreso de este mes: días entrenados, tipos de ejercicio, tendencias y motivación para seguir.' },
  ]} />
);

export const BotPanelGastos: React.FC = () => (
  <BotPanel module="Gastos" color="amber" prompts={[
    { label: 'Resumen gastos mes', icon: '💰', prompt: 'Analiza mis gastos de este mes de gastos.md. Dame el total por categoría, compáralo con el mes anterior y dime dónde puedo ahorrar.' },
    { label: 'Añadir gasto', icon: '➕', prompt: 'Registra este gasto en gastos.md: ' },
    { label: 'Alerta presupuesto', icon: '⚠️', prompt: 'Revisa mis gastos de este mes y avísame si alguna categoría ha superado el presupuesto mensual definido. Muestra % de uso de cada categoría.' },
  ]} />
);

export const BotPanelMetas: React.FC = () => (
  <BotPanel module="Metas" color="violet" prompts={[
    { label: 'Revisar metas activas', icon: '🎯', prompt: 'Lee mis metas de metas.md. Para cada meta activa dime: % de progreso, días restantes, si voy bien o mal de tiempo, y una acción concreta para avanzar esta semana.' },
    { label: 'Actualizar progreso', icon: '📊', prompt: 'Actualiza el progreso de esta meta en metas.md: ' },
    { label: 'Nueva meta', icon: '✨', prompt: 'Añade esta nueva meta a metas.md con fecha límite, métricas de éxito y primeros pasos: ' },
  ]} />
);

export const BotPanelViajes: React.FC = () => (
  <BotPanel module="Viajes" color="blue" prompts={[
    { label: 'Planificar viaje', icon: '✈️', prompt: 'Planifica un viaje a: [destino]. Busca vuelos baratos desde Murcia/Barcelona, hoteles 3-4 estrellas y actividades imprescindibles. Presupuesto: [€]. Crea itinerario completo en viajes.md.' },
    { label: 'Vuelos baratos', icon: '🛫', prompt: 'Busca en Skyscanner y Google Flights los vuelos más baratos desde Murcia o Barcelona a [destino] para el fin de semana de [fecha]. Dame las 3 mejores opciones.' },
    { label: 'Checklist viaje', icon: '📋', prompt: 'Crea un checklist completo para mi próximo viaje a [destino]. Incluye documentos, equipaje, reservas pendientes y cosas que no debo olvidar.' },
  ]} />
);

export const BotPanelCompras: React.FC = () => (
  <BotPanel module="Compras" color="emerald" prompts={[
    { label: 'Lista compra inteligente', icon: '🛒', prompt: 'Revisa mi lista de compras de compras.md y sugiere el mejor orden para hacer la compra en el supermercado, agrupando por secciones. También indica precio estimado total.' },
    { label: 'Comparar precios', icon: '💶', prompt: 'Compara precios de estos productos en Mercadona, Lidl y Carrefour online: [productos]. Dime dónde sale más barato.' },
    { label: 'Añadir a lista', icon: '➕', prompt: 'Añade estos productos a mi lista de compras en compras.md: ' },
  ]} />
);

export const BotPanelIdeas: React.FC = () => (
  <BotPanel module="Ideas Lab" color="amber" prompts={[
    { label: 'Desarrollar idea', icon: '💡', prompt: 'Desarrolla esta idea de forma estructurada: [idea]. Dame: análisis de viabilidad, pasos para implementarla, recursos necesarios, riesgos y oportunidades. Guarda en ideas.md.' },
    { label: 'Brainstorming', icon: '🧠', prompt: 'Genera 10 ideas creativas sobre: [tema]. Sé original y piensa fuera de lo convencional. Para cada idea dame título, descripción en 2 líneas y potencial impacto.' },
    { label: 'Priorizar ideas', icon: '📊', prompt: 'Lee ideas.md y prioriza todas las ideas pendientes usando la matriz impacto/esfuerzo. Dame el ranking ordenado con justificación.' },
  ]} />
);

export const BotPanelNoticias: React.FC = () => (
  <BotPanel module="Noticias" color="blue" prompts={[
    { label: 'Resumen noticias médicas', icon: '🏥', prompt: 'Busca las 5 noticias más importantes de medicina y salud de hoy. Incluye avances científicos, cambios en protocolos clínicos y noticias relevantes para médicos de familia. Resume cada una en 2 líneas.' },
    { label: 'Noticias salud digital', icon: '💻', prompt: 'Busca noticias de hoy sobre salud digital, telemedicina, IA en medicina y startups healthtech. Dame las 5 más relevantes con link.' },
    { label: 'Briefing matutino', icon: '☀️', prompt: 'Dame el briefing del día: tiempo en Murcia y Barcelona, 3 noticias médicas importantes, 1 noticia de salud digital y algo positivo para empezar bien el día.' },
  ]} />
);

export const BotPanelSupermercados: React.FC = () => (
  <BotPanel module="Supermercados" color="emerald" prompts={[
    { label: 'Ofertas semana', icon: '🏷️', prompt: 'Busca las mejores ofertas de esta semana en Mercadona, Lidl y Carrefour online. Dame las 10 mejores ofertas en productos básicos: carne, fruta, verdura y lácteos.' },
    { label: 'Mejor precio', icon: '💶', prompt: 'Compara el precio de la cesta básica semanal (leche, pan, huevos, pollo, fruta y verdura) en Mercadona vs Lidl vs Carrefour. ¿Cuál sale más barato este mes?' },
    { label: 'Recetas con oferta', icon: '👨‍🍳', prompt: 'Mira las ofertas actuales de supermercados y sugiere 3 recetas económicas y saludables que aprovechen los productos en oferta esta semana.' },
  ]} />
);

export const BotPanelWorkHub: React.FC = () => (
  <BotPanel module="Work Hub" color="indigo" prompts={[
    { label: 'Resumen trabajo semana', icon: '📊', prompt: 'Dame un resumen de mi semana laboral: guardias realizadas, tareas completadas de trabajo, pendientes urgentes y objetivos para la próxima semana. Lee guardias.md y tareas.md.' },
    { label: 'Preparar guardia', icon: '🛡️', prompt: 'Tengo guardia mañana. Dame: checklist de preparación, recordatorios importantes, protocolos de emergencia a repasar y consejo para una guardia productiva.' },
    { label: 'Nota clínica rápida', icon: '📝', prompt: 'Ayúdame a redactar una nota clínica para: [caso]. Formato SOAP. Sé conciso y profesional.' },
  ]} />
);

export const BotPanelArchivos: React.FC = () => (
  <BotPanel module="Archivos" color="indigo" prompts={[
    { label: 'Organizar archivos', icon: '📁', prompt: 'Revisa mis archivos recientes y sugiere cómo organizarlos mejor por categorías. Identifica duplicados o archivos que debería archivar o eliminar.' },
    { label: 'Resumir documento', icon: '📄', prompt: 'Resume el siguiente documento en 5 puntos clave: [pega el texto o nombre del archivo]' },
    { label: 'Buscar documento', icon: '🔍', prompt: 'Busca en mis archivos documentos relacionados con: [tema]. Dame los más relevantes con descripción breve.' },
  ]} />
);

export default BotPanel;
