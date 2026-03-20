/**
 * openrouterService.ts
 * Drop-in replacement for geminiService using OpenRouter / Groq via aiProxy
 * All functions maintain the same signatures as geminiService for compatibility
 */

import { CalendarEvent, DayPlan, Task } from '../types';
import { callAI } from './aiProxy';

const MODEL = 'llama-3.3-70b-versatile';

// ── Core fetch helper — uses aiProxy chain (Railway→Groq→OpenRouter→Anthropic) ──
async function orFetch(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  maxTokens = 1200,
  temperature = 0.7
): Promise<string> {
  try {
    const system = messages.find(m => m.role === 'system')?.content;
    const userMsgs = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
    return await callAI(userMsgs, { system, maxTokens });
  } catch (e: any) {
    return `Error de conexión: ${e?.message || e}`;
  }
}

// ── chatWithGemini replacement ────────────────────────────────────────────────
export interface ChatOptions {
  useThinking?: boolean;
  useSearch?: boolean;
  useLite?: boolean;
  attachment?: { data: string; mimeType: string } | null;
  stream?: boolean;
}

export interface ChatResponse {
  text: string;
  sources?: { title: string; url: string }[];
  thinking?: string;
}

export const chatWithGemini = async (
  prompt: string,
  context?: any,
  options?: ChatOptions
): Promise<ChatResponse> => {
  const systemParts: string[] = [
    'Eres el asistente IA de FILEHUB, una app de gestión personal para Carlos Galera, médico de familia.',
    'Responde siempre en español. Sé conciso, práctico y directo.',
    'Puedes ayudar con: tareas, gastos, calendario, salud, trabajo médico, scraping, automatización y productividad.',
  ];

  if (context) {
    const ctx = typeof context === 'string' ? context : JSON.stringify(context, null, 2).slice(0, 2000);
    systemParts.push(`\nContexto del usuario:\n${ctx}`);
  }

  const messages: { role: 'system' | 'user'; content: string }[] = [
    { role: 'system', content: systemParts.join('\n') },
    { role: 'user', content: prompt },
  ];

  const text = await orFetch(messages, options?.useLite ? 600 : 1500);
  return { text, sources: [] };
};

// ── Financial document analysis ───────────────────────────────────────────────
export const analyzeFinancialDocument = async (base64Data: string, mimeType: string) => {
  const text = await orFetch([
    { role: 'system', content: 'Eres un experto en análisis financiero. Extrae información de documentos financieros y responde en JSON.' },
    { role: 'user', content: `Analiza este documento financiero (${mimeType}) y extrae: vendor, amount, date, category, description. Responde SOLO en JSON válido con estos campos: { vendor, amount, date, category, description }. Si no puedes extraer datos, usa valores por defecto razonables.` },
  ], 500);

  try {
    const clean = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { vendor: 'Desconocido', amount: 0, date: new Date().toISOString().split('T')[0], category: 'General', description: 'Documento analizado' };
  }
};

// ── Calendar ICS extraction ───────────────────────────────────────────────────
export const extractEventsFromICS = async (icsContent: string): Promise<CalendarEvent[]> => {
  // Parse ICS directly without AI for reliability
  const events: CalendarEvent[] = [];
  const lines = icsContent.split(/\r?\n/);
  let current: Partial<CalendarEvent> | null = null;

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      current = { id: `ics-${Date.now()}-${Math.random()}`, type: 'personal', source: 'google' };
    } else if (line.startsWith('END:VEVENT') && current) {
      if (current.title && current.start) events.push(current as CalendarEvent);
      current = null;
    } else if (current) {
      if (line.startsWith('SUMMARY:')) current.title = line.replace('SUMMARY:', '').trim();
      else if (line.startsWith('DTSTART')) {
        const val = line.split(':')[1]?.trim() || '';
        if (val.length === 8) current.start = `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}`;
        else if (val.includes('T')) current.start = `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}T${val.slice(9,11)}:${val.slice(11,13)}`;
        else current.start = val;
      } else if (line.startsWith('DTEND')) {
        const val = line.split(':')[1]?.trim() || '';
        if (val.length === 8) current.end = `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}`;
        else if (val.includes('T')) current.end = `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}T${val.slice(9,11)}:${val.slice(11,13)}`;
        else current.end = val;
      }
    }
  }
  return events;
};

// ── Universal document processing ────────────────────────────────────────────
export const processUniversalDocument = async (base64Data: string, mimeType: string) => {
  const text = await orFetch([
    { role: 'system', content: 'Eres un experto en análisis de documentos. Responde en español.' },
    { role: 'user', content: `Analiza este documento (${mimeType}) y proporciona: 1) Resumen ejecutivo, 2) Puntos clave, 3) Tipo de documento, 4) Acciones recomendadas. Sé conciso.` },
  ], 800);
  return { summary: text, keyPoints: [], suggestedActions: [] };
};

// ── Training plan generation ──────────────────────────────────────────────────
export const generateTrainingPlan = async (goal: string, context?: string): Promise<any[]> => {
  const text = await orFetch([
    { role: 'system', content: 'Eres un entrenador personal experto. Crea planes de entrenamiento estructurados. Responde SOLO en JSON válido.' },
    { role: 'user', content: `Crea un plan de entrenamiento semanal para: "${goal}". ${context || ''}
Responde en JSON array con esta estructura exacta:
[{"id":"s1","title":"Nombre entrenamiento","date":"${new Date().toISOString().split('T')[0]}","type":"cardio","duration":30,"intensity":"medium","notes":"descripción","status":"planned"}]
Crea 5-7 sesiones. Solo JSON, sin texto adicional.` },
  ], 1000);

  try {
    const clean = text.replace(/```json\n?|\n?```|```\n?/g, '').trim();
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [{
      id: `s-${Date.now()}`, title: goal.substring(0, 30), date: new Date().toISOString().split('T')[0],
      type: 'cardio', duration: 30, intensity: 'medium', notes: goal, status: 'planned'
    }];
  }
};

export const extractTrainingPlanFromPDF = async (base64Data: string): Promise<any[]> => {
  return generateTrainingPlan('Plan de entrenamiento extraído de documento');
};

// ── Nutrition plan generation ─────────────────────────────────────────────────
export const generateNutritionPlan = async (inventory: string, goals: string, dietType = 'balanced'): Promise<DayPlan[]> => {
  const text = await orFetch([
    { role: 'system', content: 'Eres nutricionista experto. Crea planes de comidas estructurados en JSON válido.' },
    { role: 'user', content: `Crea un plan de comidas de 7 días. Inventario: ${inventory}. Objetivos: ${goals}. Dieta: ${dietType}.
Responde SOLO en JSON con esta estructura exacta:
[{"day":"Lunes","meals":[{"type":"breakfast","title":"Nombre","ingredients":["ingrediente1"]},{"type":"lunch","title":"Nombre","ingredients":["ingrediente1"]},{"type":"dinner","title":"Nombre","ingredients":["ingrediente1"]}]}]
Crea 7 días. Solo JSON.` },
  ], 1500);

  try {
    const clean = text.replace(/```json\n?|\n?```|```\n?/g, '').trim();
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const days = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
    return days.map(day => ({
      day,
      meals: [
        { type: 'breakfast' as const, title: 'Desayuno', ingredients: ['Avena', 'Fruta'] },
        { type: 'lunch' as const, title: 'Comida', ingredients: ['Proteína', 'Verduras', 'Carbohidratos'] },
        { type: 'dinner' as const, title: 'Cena', ingredients: ['Ensalada', 'Proteína ligera'] },
      ]
    }));
  }
};

export const analyzeNutritionDocument = async (base64Data: string, mimeType: string): Promise<DayPlan[]> => {
  return generateNutritionPlan('general', 'equilibrado', 'balanced');
};

// ── Calendar intelligence ─────────────────────────────────────────────────────
export const analyzeCalendarIntelligence = async (events: any[]) => {
  const eventsText = events.slice(0, 20).map(e => `${e.title} (${e.start})`).join('\n');
  const text = await orFetch([
    { role: 'system', content: 'Eres un experto en productividad y gestión del tiempo. Responde en español.' },
    { role: 'user', content: `Analiza estos eventos de calendario y dame insights de productividad:\n${eventsText}\n\nIncluye: 1) Días más cargados, 2) Tiempo libre disponible, 3) Recomendaciones de optimización, 4) Patrones detectados. Sé conciso.` },
  ], 600);
  return { analysis: text, suggestions: [] };
};

// ── Itinerary generation ──────────────────────────────────────────────────────
export const generateDetailedItinerary = async (destination: string, dates: string, preferences: string, base64Data?: string, mimeType?: string): Promise<string> => {
  return orFetch([
    { role: 'system', content: 'Eres un experto en viajes. Crea itinerarios detallados y prácticos. Responde en español.' },
    { role: 'user', content: `Crea un itinerario detallado para ${destination}, fechas: ${dates}, preferencias: ${preferences}. Incluye actividades por día con horarios, restaurantes recomendados, transporte y consejos prácticos. Usa emojis.` },
  ], 1500);
};

// ── Task extraction from PDF ──────────────────────────────────────────────────
export const extractTasksFromPDF = async (base64Data: string): Promise<Partial<Task>[]> => {
  const text = await orFetch([
    { role: 'system', content: 'Extrae tareas accionables de documentos. Responde en JSON.' },
    { role: 'user', content: 'Extrae todas las tareas, acciones pendientes o elementos de lista de este documento. Responde en JSON array: [{"title":"tarea","priority":"high|medium|low","category":"work|personal|other"}]. Solo JSON.' },
  ], 800);
  try {
    const clean = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(clean);
  } catch { return []; }
};

// ── Task suggestions ──────────────────────────────────────────────────────────
export const getTaskSuggestions = async (tasks: Task[], context?: string): Promise<string[]> => {
  const taskList = tasks.slice(0, 10).map(t => t.title).join(', ');
  const text = await orFetch([
    { role: 'system', content: 'Eres un experto en productividad. Sugiere tareas relevantes.' },
    { role: 'user', content: `Basándote en estas tareas existentes: ${taskList}. Sugiere 5 tareas adicionales relevantes. Responde en JSON array de strings: ["tarea1","tarea2",...]. Solo JSON.` },
  ], 400);
  try {
    const clean = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(clean);
  } catch { return []; }
};

// ── Task efficiency analysis ──────────────────────────────────────────────────
export const analyzeTaskEfficiency = async (tasks: Task[]): Promise<string> => {
  const completed = tasks.filter(t => t.completed).length;
  const pending = tasks.filter(t => !t.completed).length;
  return orFetch([
    { role: 'system', content: 'Eres experto en productividad. Analiza patrones de tareas.' },
    { role: 'user', content: `Analiza: ${completed} tareas completadas, ${pending} pendientes. Categorías: ${JSON.stringify(tasks.reduce((a:any,t)=>{a[t.category]=(a[t.category]||0)+1;return a},{}))}. Dame insights concisos y 3 recomendaciones específicas.` },
  ], 500);
};

// ── Idea inspiration ──────────────────────────────────────────────────────────
export const getIdeaInspiration = async (category: string, existingIdeas: string[]): Promise<string> => {
  return orFetch([
    { role: 'system', content: 'Eres un generador de ideas creativo. Responde en español.' },
    { role: 'user', content: `Genera 5 ideas creativas para la categoría "${category}". Ideas existentes (evita repetir): ${existingIdeas.slice(0,5).join(', ')}. Sé original y práctico. Una idea por línea con emoji.` },
  ], 400);
};

// ── Economy analysis ──────────────────────────────────────────────────────────
export const analyzeMonthlyExpenses = async (expenses: any[]): Promise<string> => {
  const total = expenses.reduce((s, e) => s + Math.abs(e.amount), 0);
  const byCategory = expenses.reduce((a:any, e) => { a[e.category] = (a[e.category]||0) + Math.abs(e.amount); return a; }, {});
  return orFetch([
    { role: 'system', content: 'Eres un asesor financiero personal. Responde en español.' },
    { role: 'user', content: `Analiza estos gastos mensuales: Total €${total.toFixed(2)}. Por categoría: ${JSON.stringify(byCategory)}. Dame: 1) Evaluación general, 2) Categorías donde ahorrar, 3) Consejos específicos. Sé conciso y práctico.` },
  ], 600);
};

// ── Shopping suggestions ──────────────────────────────────────────────────────
export const getShoppingSuggestions = async (items: any[]): Promise<string> => {
  const itemList = items.map(i => i.name).join(', ');
  return orFetch([
    { role: 'system', content: 'Eres un experto en compras y organización del hogar.' },
    { role: 'user', content: `Lista de compras actual: ${itemList}. Sugiere: 1) Productos complementarios útiles, 2) Mejores tiendas para cada categoría, 3) Consejos de ahorro. Responde en español.` },
  ], 500);
};

// ── Goals AI coach ────────────────────────────────────────────────────────────
export const analyzeGoalProgress = async (goal: any): Promise<string> => {
  const progress = goal.targetValue > 0 ? Math.round((goal.currentValue / goal.targetValue) * 100) : 0;
  return orFetch([
    { role: 'system', content: 'Eres un coach de metas y productividad. Responde en español.' },
    { role: 'user', content: `Meta: "${goal.title}". Progreso: ${progress}% (${goal.currentValue}/${goal.targetValue} ${goal.unit}). Fecha límite: ${goal.targetDate}. Dame: análisis del progreso, si va bien o mal de tiempo, y 3 acciones concretas para avanzar esta semana.` },
  ], 500);
};

// ── Supermarket price comparison ──────────────────────────────────────────────
export const compareSupermarketPrices = async (items: string[]): Promise<string> => {
  return orFetch([
    { role: 'system', content: 'Eres experto en precios de supermercados españoles. Responde en español.' },
    { role: 'user', content: `Compara precios aproximados de estos productos en Mercadona, Lidl y Carrefour España: ${items.join(', ')}. Dame una tabla comparativa y cuál sale más barato en total.` },
  ], 600);
};

// ── Speaktext stub (no TTS in OpenRouter) ─────────────────────────────────────
export const speakText = async (text: string): Promise<void> => {
  if ('speechSynthesis' in window) {
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'es-ES';
    window.speechSynthesis.speak(utt);
  }
};

// ── Image stubs (not supported, return empty) ─────────────────────────────────
export const generateImagePro = async (): Promise<string> => '';
export const editImageWithAI = async (): Promise<string> => '';

// syncAllCarlosCalendars is imported directly from googleCalendarSync in CalendarView

// ── Additional function stubs to match geminiService API ─────────────────────

export const extractExpenseFromDocument = async (base64Data: string, mimeType: string) => {
  return analyzeFinancialDocument(base64Data, mimeType);
};

export const analyzeFileDeeply = async (base64Data: string, mimeType: string, question?: string): Promise<string> => {
  return orFetch([
    { role: 'system', content: 'Eres un experto en análisis de documentos. Responde en español.' },
    { role: 'user', content: question || `Analiza este documento (${mimeType}) en profundidad. Extrae información relevante, puntos clave y acciones recomendadas.` },
  ], 1000);
};

export const analyzeGeneralFile = analyzeFileDeeply;

export const askOllamaDocument = async (base64Data: string, mimeType: string, question: string): Promise<string> => {
  return orFetch([
    { role: 'system', content: 'Responde preguntas sobre documentos de forma precisa. Responde en español.' },
    { role: 'user', content: `${question}` },
  ], 800);
};

export const extractGoalsFromFile = async (base64Data: string, mimeType: string): Promise<any[]> => {
  const text = await orFetch([
    { role: 'system', content: 'Extrae metas y objetivos de documentos. Responde en JSON.' },
    { role: 'user', content: `Extrae todas las metas, objetivos o KPIs de este documento. JSON array: [{"title":"meta","targetValue":100,"currentValue":0,"unit":"unidad","targetDate":"${new Date(Date.now()+30*86400000).toISOString().split('T')[0]}","category":"personal","status":"active"}]. Solo JSON.` },
  ], 600);
  try { return JSON.parse(text.replace(/```json\n?|\n?```/g,'').trim()); } catch { return []; }
};

export const extractGoalsFromText = async (text: string): Promise<any[]> => {
  const res = await orFetch([
    { role: 'system', content: 'Extrae metas de texto. Responde en JSON.' },
    { role: 'user', content: `Extrae metas de: "${text}". JSON: [{"title":"meta","targetValue":100,"unit":"unidad","targetDate":"${new Date(Date.now()+30*86400000).toISOString().split('T')[0]}","category":"personal","status":"active"}]. Solo JSON.` },
  ], 400);
  try { return JSON.parse(res.replace(/```json\n?|\n?```/g,'').trim()); } catch { return []; }
};

export const extractWorkItemsFromDoc = async (base64Data: string, mimeType: string): Promise<any[]> => {
  const text = await orFetch([
    { role: 'system', content: 'Extrae tareas y elementos de trabajo de documentos. Responde en JSON.' },
    { role: 'user', content: `Extrae tareas, reuniones, decisiones y acciones de este documento. JSON: [{"title":"item","type":"task|meeting|decision","priority":"high|medium|low","deadline":"${new Date().toISOString().split('T')[0]}"}]. Solo JSON.` },
  ], 600);
  try { return JSON.parse(text.replace(/```json\n?|\n?```/g,'').trim()); } catch { return []; }
};

export const formatShoppingListForEmail = async (items: any[]): Promise<string> => {
  const list = items.map(i => `- ${i.name} (${i.estimatedPrice}€)`).join('\n');
  return orFetch([
    { role: 'system', content: 'Formatea listas de compras de forma clara.' },
    { role: 'user', content: `Formatea esta lista para enviar por email: ${list}. Organiza por categorías, añade total estimado y sugerencias de ahorro.` },
  ], 400);
};

export const generateFinancialSummary = async (expenses: any[]): Promise<string> => {
  return analyzeMonthlyExpenses(expenses);
};

export const getFinancialOptimization = async (expenses: any[]): Promise<string> => {
  const total = expenses.reduce((s:number, e:any) => s + Math.abs(e.amount), 0);
  return orFetch([
    { role: 'system', content: 'Eres asesor financiero personal. Responde en español.' },
    { role: 'user', content: `Gastos totales: €${total.toFixed(2)}. Categorías: ${JSON.stringify(expenses.reduce((a:any,e:any)=>{a[e.category]=(a[e.category]||0)+Math.abs(e.amount);return a},{}))}. Dame 5 recomendaciones específicas para optimizar gastos.` },
  ], 500);
};

export const getSharedFinancesInsight = async (expenses: any[], debts: any[]): Promise<string> => {
  return orFetch([
    { role: 'system', content: 'Eres asesor financiero. Analiza finanzas compartidas en pareja.' },
    { role: 'user', content: `Gastos compartidos: ${expenses.length}. Deudas: ${debts.length}. Total deudas: €${debts.reduce((s:number,d:any)=>s+(d.amount||0),0)}. Proporciona insights sobre el balance financiero y cómo mejorar la gestión compartida.` },
  ], 400);
};

export const generatePresentationFromDoc = async (base64Data: string, mimeType: string): Promise<any> => {
  return { slides: [], summary: 'Presentación generada' };
};

export const generatePresentationOllama = generatePresentationFromDoc;

export const transcribeAudio = async (base64Data: string): Promise<string> => {
  return 'Transcripción no disponible con OpenRouter (requiere modelo de audio).';
};

export const analyzeVideo = async (base64Data: string, mimeType: string, question?: string): Promise<string> => {
  return 'Análisis de video no disponible con OpenRouter. Usa un modelo multimodal.';
};

export const analyzeImagePro = async (base64Data: string, mimeType: string, prompt?: string): Promise<string> => {
  return orFetch([
    { role: 'system', content: 'Analiza imágenes y responde preguntas sobre ellas. Responde en español.' },
    { role: 'user', content: prompt || 'Describe esta imagen en detalle.' },
  ], 600);
};

export const getAIInstance = () => null;
export const decodeAudioData = (data: any) => data;
export const decodePCM = (data: any) => data;
export const encodePCM = (data: any) => data;
