/**
 * Eventos extraídos del calendario Shifter - Abril/Mayo 2026
 * Guardias, charlas, viajes y eventos personales de Carlos
 */

import { CalendarEvent } from '../types';

export const SHIFTER_EVENTS: CalendarEvent[] = [
  // ════════ MARZO (últimos días visibles) ════════
  {
    id: 'shift_mar31_guardia',
    title: 'Guardia SUAP Los Dolores',
    start: '2026-03-31T08:00:00',
    end: '2026-03-31T20:00:00',
    type: 'work',
    source: 'manual',
  },
  {
    id: 'shift_mar31_charla',
    title: 'Charla INCOVA',
    start: '2026-03-31T09:00:00',
    end: '2026-03-31T10:00:00',
    type: 'work',
    source: 'manual',
  },

  // ════════ ABRIL 2026 ════════

  // Jueves 2
  {
    id: 'shift_apr02_guardia',
    title: 'Guardia HSL (Jueves Santo) — NOCHE',
    start: '2026-04-02T20:00:00',
    end: '2026-04-03T08:00:00',
    type: 'work',
    source: 'manual',
  },

  // Viernes 3
  {
    id: 'shift_apr03_vsan',
    title: 'Viernes Santo — No voy, no viene Montse (tiene guardia)',
    start: '2026-04-03',
    end: '2026-04-03',
    type: 'personal',
    source: 'manual',
  },

  // Sábado 4
  {
    id: 'shift_apr04_montse',
    title: 'Guardia Montse — M/T',
    start: '2026-04-04T08:00:00',
    end: '2026-04-04T20:00:00',
    type: 'work',
    source: 'manual',
  },

  // Domingo 5
  {
    id: 'shift_apr05',
    title: 'No voy ni viene Montse (tiene guardia)',
    start: '2026-04-05',
    end: '2026-04-05',
    type: 'personal',
    source: 'manual',
  },

  // Lunes 6
  {
    id: 'shift_apr06_guardia',
    title: 'Guardia — Estar a las 8:00-15:00 en el centro',
    start: '2026-04-06T08:00:00',
    end: '2026-04-06T15:00:00',
    type: 'work',
    source: 'manual',
  },

  // Martes 7
  {
    id: 'shift_apr07_guardia',
    title: 'Guardia HSL (turno 7 marzo)',
    start: '2026-04-07T08:00:00',
    end: '2026-04-07T20:00:00',
    type: 'work',
    source: 'manual',
  },

  // Jueves 9
  {
    id: 'shift_apr09_cena',
    title: 'Cena con la tía Maripaz',
    start: '2026-04-09T21:00:00',
    end: '2026-04-09T23:00:00',
    type: 'personal',
    source: 'manual',
  },
  {
    id: 'shift_apr09_sesion',
    title: 'Sesión Carlos',
    start: '2026-04-09T09:00:00',
    end: '2026-04-09T10:00:00',
    type: 'work',
    source: 'manual',
  },

  // Viernes 10
  {
    id: 'shift_apr10_ume',
    title: 'UME 15 — NOCHE',
    start: '2026-04-10T20:00:00',
    end: '2026-04-11T08:00:00',
    type: 'work',
    source: 'manual',
  },

  // Sábado 11
  {
    id: 'shift_apr11_viaje',
    title: 'Posible viaje a Murcia',
    start: '2026-04-11',
    end: '2026-04-11',
    type: 'trip',
    source: 'manual',
  },
  {
    id: 'shift_apr11_entierro',
    title: 'Entierro de la Sardina',
    start: '2026-04-11T18:00:00',
    end: '2026-04-11T23:00:00',
    type: 'personal',
    source: 'manual',
  },

  // Domingo 12
  {
    id: 'shift_apr12_montse',
    title: 'Viene Montse — M',
    start: '2026-04-12',
    end: '2026-04-12',
    type: 'personal',
    source: 'manual',
  },

  // Martes 14
  {
    id: 'shift_apr14_charla',
    title: 'Charla INCOVA',
    start: '2026-04-14T09:00:00',
    end: '2026-04-14T10:00:00',
    type: 'work',
    source: 'manual',
  },

  // Miércoles 15
  {
    id: 'shift_apr15_guardia',
    title: 'Guardia SUAP Los Dolores',
    start: '2026-04-15T08:00:00',
    end: '2026-04-15T20:00:00',
    type: 'work',
    source: 'manual',
  },
  {
    id: 'shift_apr15_sesion',
    title: 'Sesión Carlos',
    start: '2026-04-15T09:00:00',
    end: '2026-04-15T10:00:00',
    type: 'work',
    source: 'manual',
  },

  // Jueves 16
  {
    id: 'shift_apr16_charla',
    title: 'Charla INCOVA',
    start: '2026-04-16T09:00:00',
    end: '2026-04-16T10:00:00',
    type: 'work',
    source: 'manual',
  },

  // Viernes 17
  {
    id: 'shift_apr17_bcn',
    title: 'Viaje a Barcelona — Vuelo 16:55 desde Murcia',
    start: '2026-04-17T16:55:00',
    end: '2026-04-17T18:30:00',
    type: 'trip',
    source: 'manual',
  },

  // Sábado 18
  {
    id: 'shift_apr18_bcn',
    title: 'En Barcelona con Montse — M',
    start: '2026-04-18',
    end: '2026-04-18',
    type: 'personal',
    source: 'manual',
  },

  // Domingo 19
  {
    id: 'shift_apr19_vuelta',
    title: 'VUELTA — Vueling 19:20 (Budgetair)',
    start: '2026-04-19T19:20:00',
    end: '2026-04-19T20:50:00',
    type: 'trip',
    source: 'manual',
  },

  // Martes 21
  {
    id: 'shift_apr21_charla',
    title: 'Charla INCOVA',
    start: '2026-04-21T09:00:00',
    end: '2026-04-21T10:00:00',
    type: 'work',
    source: 'manual',
  },

  // Miércoles 22
  {
    id: 'shift_apr22_sesion',
    title: 'Sesión Carlos — Centro de Salud',
    start: '2026-04-22T09:00:00',
    end: '2026-04-22T10:00:00',
    type: 'work',
    source: 'manual',
  },

  // Jueves 23
  {
    id: 'shift_apr23_curso',
    title: 'Curso Tarjeta Sanitaria — 9:15 realojamos',
    start: '2026-04-23T09:15:00',
    end: '2026-04-23T12:00:00',
    type: 'work',
    source: 'manual',
  },

  // Viernes 24
  {
    id: 'shift_apr24_libre',
    title: 'Día libre disposición — M',
    start: '2026-04-24',
    end: '2026-04-24',
    type: 'personal',
    source: 'manual',
  },

  // Martes 28
  {
    id: 'shift_apr28_charla',
    title: 'Charla INCOVA',
    start: '2026-04-28T09:00:00',
    end: '2026-04-28T10:00:00',
    type: 'work',
    source: 'manual',
  },

  // Jueves 30
  {
    id: 'shift_apr30_guardia',
    title: 'Guardia SUAP Los Dolores',
    start: '2026-04-30T08:00:00',
    end: '2026-04-30T20:00:00',
    type: 'work',
    source: 'manual',
  },

  // ════════ MAYO 2026 ════════

  // Viernes 1
  {
    id: 'shift_may01_bcn',
    title: 'Viaje a Barcelona — Vueling (sin vuelta)',
    start: '2026-05-01',
    end: '2026-05-01',
    type: 'trip',
    source: 'manual',
  },

  // Sábado 2
  {
    id: 'shift_may02',
    title: 'En Barcelona — M',
    start: '2026-05-02',
    end: '2026-05-02',
    type: 'personal',
    source: 'manual',
  },

  // Domingo 3
  {
    id: 'shift_may03',
    title: 'En Barcelona — M',
    start: '2026-05-03',
    end: '2026-05-03',
    type: 'personal',
    source: 'manual',
  },

  // Lunes 4
  {
    id: 'shift_may04_guardia',
    title: 'Guardia UME 4 — NOCHE',
    start: '2026-05-04T20:00:00',
    end: '2026-05-05T08:00:00',
    type: 'work',
    source: 'manual',
  },

  // Martes 5
  {
    id: 'shift_may05_charla',
    title: 'Charla INCOVA — M',
    start: '2026-05-05T09:00:00',
    end: '2026-05-05T10:00:00',
    type: 'work',
    source: 'manual',
  },

  // Jueves 7
  {
    id: 'shift_may07_guardia',
    title: 'Guardia Santa Lucía',
    start: '2026-05-07T08:00:00',
    end: '2026-05-07T20:00:00',
    type: 'work',
    source: 'manual',
  },

  // Viernes 8
  {
    id: 'shift_may08_bcn',
    title: 'Voy a Barcelona — M',
    start: '2026-05-08',
    end: '2026-05-08',
    type: 'trip',
    source: 'manual',
  },

  // Sábado 9
  {
    id: 'shift_may09',
    title: 'En Barcelona — M',
    start: '2026-05-09',
    end: '2026-05-09',
    type: 'personal',
    source: 'manual',
  },

  // Domingo 10
  {
    id: 'shift_may10_vuelta',
    title: 'Vuelta de Barcelona — Vueling 7:10 desde Alicante',
    start: '2026-05-10T07:10:00',
    end: '2026-05-10T08:30:00',
    type: 'trip',
    source: 'manual',
  },
];
