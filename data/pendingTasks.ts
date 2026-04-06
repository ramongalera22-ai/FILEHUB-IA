/**
 * Tareas pendientes y urgentes de Carlos — Abril-Junio 2026
 * Basado en contexto: fin residencia, mudanza BCN, Cartagenaeste, FILEHUB
 */

import { Task } from '../types';

export const PENDING_TASKS: Task[] = [
  // ══════ URGENTE — Esta semana ══════
  {
    id: 'task_guardia_hoy',
    title: '🔴 Preparar guardia de hoy (revisar protocolo centro)',
    completed: false,
    category: 'work',
    priority: 'high',
    dueDate: '2026-04-06',
    isRecurring: false,
  },
  {
    id: 'task_sesion_carlos_9abr',
    title: '🔴 Preparar sesión clínica del 9 abril',
    completed: false,
    category: 'work',
    priority: 'high',
    dueDate: '2026-04-08',
    isRecurring: false,
  },

  // ══════ RESIDENCIA — Fin Junio 2026 ══════
  {
    id: 'task_memoria_residencia',
    title: '📕 Redactar memoria final de residencia',
    completed: false,
    category: 'work',
    priority: 'high',
    dueDate: '2026-05-31',
    isRecurring: false,
  },
  {
    id: 'task_portfolio_residencia',
    title: '📂 Completar portfolio docente MIR',
    completed: false,
    category: 'work',
    priority: 'high',
    dueDate: '2026-06-15',
    isRecurring: false,
  },
  {
    id: 'task_evaluar_rotaciones',
    title: '📝 Evaluaciones pendientes de rotaciones',
    completed: false,
    category: 'work',
    priority: 'medium',
    dueDate: '2026-05-15',
    isRecurring: false,
  },
  {
    id: 'task_certificados_formacion',
    title: '📜 Recopilar certificados de formación/cursos',
    completed: false,
    category: 'work',
    priority: 'medium',
    dueDate: '2026-06-01',
    isRecurring: false,
  },

  // ══════ CARTAGENAESTE — Pitch Hospital ══════
  {
    id: 'task_dossier_pitch',
    title: '📊 Finalizar dossier/PPTX para pitch a dirección hospital',
    completed: false,
    category: 'work',
    priority: 'high',
    dueDate: '2026-05-01',
    isRecurring: false,
  },
  {
    id: 'task_landing_cartagenaeste',
    title: '🌐 Crear landing page Cartagenaeste para presentación',
    completed: false,
    category: 'work',
    priority: 'medium',
    dueDate: '2026-05-15',
    isRecurring: false,
  },
  {
    id: 'task_demo_mode',
    title: '🎬 Implementar modo demo guiado en Cartagenaeste',
    completed: false,
    category: 'work',
    priority: 'medium',
    dueDate: '2026-05-20',
    isRecurring: false,
  },
  {
    id: 'task_seguridad_audit',
    title: '🔒 Auditoría de seguridad final (API keys, NAS proxy)',
    completed: false,
    category: 'work',
    priority: 'high',
    dueDate: '2026-04-20',
    isRecurring: false,
  },

  // ══════ MUDANZA BARCELONA — Sept 2026 ══════
  {
    id: 'task_registro_ics',
    title: '🏥 Registrarse en bolsa empleo ICS Catalunya (se puede remoto)',
    completed: false,
    category: 'work',
    priority: 'high',
    dueDate: '2026-07-15',
    isRecurring: false,
  },
  {
    id: 'task_colegiacion_bcn',
    title: '🏛️ Iniciar trámite colegiación Colegio Médicos Barcelona',
    completed: false,
    category: 'work',
    priority: 'medium',
    dueDate: '2026-07-01',
    isRecurring: false,
  },
  {
    id: 'task_alquiler_murcia',
    title: '🏠 Preparar piso Murcia para alquilar (fotos, anuncio)',
    completed: false,
    category: 'finance',
    priority: 'high',
    dueDate: '2026-06-30',
    isRecurring: false,
  },
  {
    id: 'task_buscar_piso_bcn',
    title: '🔍 Buscar piso Barcelona zona Montse (Idealista, Fotocasa)',
    completed: false,
    category: 'personal',
    priority: 'medium',
    dueDate: '2026-07-31',
    isRecurring: false,
  },
  {
    id: 'task_deudas_limpiar',
    title: '💰 Liquidar deudas pendientes antes de mudanza',
    completed: false,
    category: 'finance',
    priority: 'high',
    dueDate: '2026-08-31',
    isRecurring: false,
  },

  // ══════ VUELOS / VIAJES ══════
  {
    id: 'task_vuelo_17abr',
    title: '✈️ Check-in vuelo Barcelona 17 abril (16:55)',
    completed: false,
    category: 'personal',
    priority: 'high',
    dueDate: '2026-04-16',
    isRecurring: false,
  },
  {
    id: 'task_vuelo_vuelta_19abr',
    title: '✈️ Check-in vuelta Vueling 19 abril (19:20)',
    completed: false,
    category: 'personal',
    priority: 'high',
    dueDate: '2026-04-18',
    isRecurring: false,
  },
  {
    id: 'task_vuelo_1may_sinvuelta',
    title: '✈️ Buscar vuelo vuelta Barcelona 1 mayo (sin vuelta aún)',
    completed: false,
    category: 'personal',
    priority: 'high',
    dueDate: '2026-04-20',
    isRecurring: false,
  },

  // ══════ ADMIN / RECURRENTES ══════
  {
    id: 'task_tarjeta_sanitaria',
    title: '💳 Curso tarjeta sanitaria — 23 abril 9:15',
    completed: false,
    category: 'work',
    priority: 'medium',
    dueDate: '2026-04-23',
    isRecurring: false,
  },
  {
    id: 'task_dia_libre',
    title: '📋 Solicitar día libre disposición 24 abril',
    completed: false,
    category: 'work',
    priority: 'medium',
    dueDate: '2026-04-15',
    isRecurring: false,
  },

  // ══════ FILEHUB-IA ══════
  {
    id: 'task_filehub_calendar_test',
    title: '🛠️ Testear calendario flotante + agenda FILEHUB',
    completed: false,
    category: 'work',
    priority: 'medium',
    dueDate: '2026-04-07',
    isRecurring: false,
  },
  {
    id: 'task_filehub_supabase_sync',
    title: '☁️ Verificar Supabase sync funciona con nuevos eventos',
    completed: false,
    category: 'work',
    priority: 'medium',
    dueDate: '2026-04-10',
    isRecurring: false,
  },
];
