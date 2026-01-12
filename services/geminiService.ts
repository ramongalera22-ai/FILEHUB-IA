
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Expense, Project, Task, CalendarEvent, ShoppingItem, Goal, Presentation, Slide, SharedExpense, SharedDebt, Idea, Meal, AIAnalysisResult } from "../types";

/**
 * Crea una nueva instancia de GoogleGenAI asegurando que se usa la API KEY del entorno.
 */
export const getAIInstance = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Funciones de utilidad para audio PCM
export function encodePCM(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decodePCM(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Analiza un documento financiero (PDF/Imagen) y extrae transacciones detalladas.
 */
export const analyzeFinancialDocument = async (base64Data: string, mimeType: string) => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Data } },
        { text: `Analiza este documento financiero. Extrae todas las transacciones y clasifícalas.
        Debes devolver un JSON con esta estructura exacta:
        {
          "transactions": [
            {
              "amount": number,
              "type": "income" | "expense",
              "category": "string (ej: Nómina, Alquiler, Comida, Ocio, Salud, etc)",
              "vendor": "string (nombre del pagador o establecimiento)",
              "date": "YYYY-MM-DD",
              "description": "string"
            }
          ],
          "summary": {
            "totalIncome": number,
            "totalExpenses": number,
            "mainCategory": "string"
          }
        }
        Si hay múltiples transacciones en una lista o extracto, extráelas todas.` }
      ]
    },
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text);
};

export const extractEventsFromICS = async (icsContent: string): Promise<CalendarEvent[]> => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analiza este archivo ICS y extrae todos los eventos importantes (VEVENT). 
    Convierte cada evento estrictamente al formato JSON de la interfaz CalendarEvent: 
    { 
      "id": "generar un id único", 
      "title": "título del evento", 
      "start": "ISO8601 UTC string", 
      "end": "ISO8601 UTC string", 
      "type": "personal|work|project|expense|trip|fitness" 
    }.
    Contenido ICS: ${icsContent}`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text);
};

export const processUniversalDocument = async (base64Data: string, mimeType: string) => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Data } },
        { text: "Analiza este documento y extrae tareas, proyectos o gastos que detectes. Devuelve JSON estructurado con arrays: 'tasks', 'projects', 'expenses'." }
      ]
    },
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text);
};

// Updated chatWithGemini to properly extract search grounding URLs from groundingMetadata
// Updated to support file attachments (images/PDFs) and specific models
export const chatWithGemini = async (
  message: string, 
  context: any, 
  options: { useThinking?: boolean, useSearch?: boolean, useLite?: boolean, attachment?: { mimeType: string, data: string } } = {}
) => {
  const ai = getAIInstance();
  // gemini lite or flash lite: 'gemini-flash-lite-latest'
  // gemini pro (thinking): 'gemini-3-pro-preview'
  // basic text: 'gemini-3-flash-preview'
  const model = options.useLite ? 'gemini-flash-lite-latest' : (options.useThinking ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview');
  
  const config: any = {};
  if (options.useThinking && model === 'gemini-3-pro-preview') {
    config.thinkingConfig = { thinkingBudget: 32768 };
  }
  if (options.useSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  const parts: any[] = [];
  
  if (options.attachment) {
    parts.push({ inlineData: { mimeType: options.attachment.mimeType, data: options.attachment.data } });
  }

  parts.push({ text: `CONTEXTO: ${JSON.stringify(context)}\n\nCONSULTA: ${message}` });

  const response = await ai.models.generateContent({
    model: model,
    contents: [{ role: 'user', parts: parts }],
    config: config,
  });
  
  const urls = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.filter((chunk: any) => chunk.web)
    ?.map((chunk: any) => chunk.web.uri) || [];

  return { text: response.text, urls };
};

export const generateImagePro = async (prompt: string, aspectRatio: string = "1:1", size: string = "1K") => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: prompt }] },
    config: { imageConfig: { aspectRatio: aspectRatio as any, imageSize: size as any } },
  });
  const imagePart = response.candidates[0].content.parts.find(p => p.inlineData);
  return imagePart ? `data:image/png;base64,${imagePart.inlineData.data}` : null;
};

// Support image editing features using gemini-2.5-flash-image
export const editImageWithAI = async (base64Image: string, prompt: string) => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { text: prompt }
      ]
    }
  });
  const imagePart = response.candidates[0].content.parts.find(p => p.inlineData);
  return imagePart ? `data:image/png;base64,${imagePart.inlineData.data}` : null;
};

// Text-to-speech using gemini-2.5-flash-preview-tts
export const speakText = async (text: string) => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Di esto con claridad: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const buffer = await decodeAudioData(decodePCM(base64Audio), audioCtx, 24000, 1);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start();
  }
};

export const analyzeImagePro = async (base64Image: string, prompt: string = "Análisis") => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image } }, { text: prompt }] }
  });
  return response.text;
};

// New feature: Video Understanding using Gemini 3 Pro
export const analyzeVideo = async (base64Data: string, mimeType: string, prompt: string) => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Data } },
        { text: prompt }
      ]
    }
  });
  return response.text;
};

// Generic File Analysis for Files View (Deprecated in favor of analyzeFileDeeply for structured data)
export const analyzeGeneralFile = async (base64Data: string, mimeType: string, fileName: string) => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Data } },
        { text: `Analiza este archivo (${fileName}). Dame un resumen conciso de su contenido, puntos clave y cualquier dato relevante que extraigas. Si es una imagen, descríbela detalladamente. Si es un PDF, resume el texto principal. Formato breve y directo.` }
      ]
    }
  });
  return response.text;
};

export const analyzeFileDeeply = async (base64Data: string, mimeType: string, fileName: string): Promise<AIAnalysisResult> => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Data } },
        { text: `Analiza profundamente este archivo (${fileName}).
        
        Devuelve un objeto JSON con la siguiente estructura:
        {
          "summary": "Resumen ejecutivo conciso del contenido (máx 3 frases).",
          "keyPoints": ["Punto clave 1", "Punto clave 2", ...],
          "suggestedActions": ["Acción sugerida 1 (ej: Pagar factura, Responder email, Archivar)", "Acción 2", ...],
          "category": "Categoría sugerida (Finanzas, Legal, Personal, Trabajo, Salud)"
        }
        
        Sé directo y accionable.` }
      ]
    },
    config: { responseMimeType: "application/json" }
  });
  
  return JSON.parse(response.text);
};

export const getFinancialOptimization = async (expenses: Expense[]) => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Optimiza estos gastos para mejorar el flujo de caja: ${JSON.stringify(expenses)}. Devuelve JSON con 'suggestions' y 'rescheduledExpenses'.`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text);
};

export const generateFinancialSummary = async (context: any) => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analiza estos datos financieros y genera un resumen ejecutivo breve pero perspicaz.
    Datos: ${JSON.stringify(context)}
    
    El resumen debe incluir:
    1. Balance general (Ingresos vs Gastos).
    2. Desglose de las categorías donde más se gasta.
    3. Una recomendación de ahorro específica basada en los patrones de gasto.
    
    Usa formato Markdown para resaltar cifras importantes. Sé directo y profesional.`,
  });
  return response.text;
};

export const processFinancialNote = async (note: string) => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analiza esta nota de texto y extrae una transacción financiera (gasto).
    Nota: "${note}"
    
    Devuelve un JSON con:
    {
      "amount": number,
      "vendor": string (quién recibe el dinero),
      "category": "string (clasifícalo),
      "description": string (detalle),
      "date": string (YYYY-MM-DD, usa hoy si no se especifica)
    }`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text);
};

export const extractExpenseFromDocument = async (base64Data: string, mimeType: string) => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ inlineData: { mimeType, data: base64Data } }, { text: "Extrae datos de este ticket en JSON: amount, date, vendor, category, description." }] },
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text);
};

export const extractTasksFromPDF = async (base64Data: string) => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ inlineData: { mimeType: 'application/pdf', data: base64Data } }, { text: "Extrae una lista de tareas de este documento en formato JSON array." }] },
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text);
};

export const extractTrainingPlanFromPDF = async (base64Data: string): Promise<any[]> => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { 
      parts: [
        { inlineData: { mimeType: 'application/pdf', data: base64Data } }, 
        { text: "Extrae el plan de entrenamiento de este documento. Devuelve un JSON ARRAY de objetos con este formato exacto: { id: string, title: string (nombre del entreno), date: string (YYYY-MM-DD), type: 'cardio'|'strength'|'flexibility'|'sport', duration: number (minutos), intensity: 'low'|'medium'|'high' }. Si no hay fecha explicita, infiere las próximas fechas." }
      ] 
    },
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text);
};

export const generateTrainingPlan = async (goal: string): Promise<any[]> => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Genera un plan de entrenamiento semanal para el objetivo: "${goal}".
    Devuelve un JSON ARRAY de objetos con este formato: { id: string, title: string, date: string (empieza mañana), type: 'cardio'|'strength'|'flexibility'|'sport', duration: number, intensity: 'low'|'medium'|'high', notes: string }.`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text);
};

export const extractShoppingListFromPDF = async (base64Data: string): Promise<any[]> => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ inlineData: { mimeType: 'application/pdf', data: base64Data } }, { text: "Extrae la lista de la compra de este documento en formato JSON. Incluye 'name', 'estimatedPrice' y 'category' para cada item." }] },
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text);
};

export const transcribeAudio = async (base64Audio: string) => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ inlineData: { mimeType: 'audio/wav', data: base64Audio } }, { text: "Transcribe este audio y genera un resumen corto y clasifica el tipo de contenido (expense, task, or note). Devuelve JSON: { text, summary, type }." }] },
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text);
};

export const generateReport = async (context: any) => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Genera un reporte financiero detallado basado en estos datos: ${JSON.stringify(context)}. Incluye análisis de gastos, ahorros y recomendaciones.`,
  });
  return response.text;
};

export const generateDailyBriefing = async (data: any, type: 'morning' | 'night') => {
  const ai = getAIInstance();
  const prompt = type === 'morning'
    ? `Genera un briefing matutino motivador y estratégico para hoy basado en: ${JSON.stringify(data)}.`
    : `Genera un resumen nocturno reflexivo y preparativo para mañana basado en: ${JSON.stringify(data)}.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });
  return response.text;
};

export const extractWorkItemsFromDoc = async (base64Data: string, mimeType: string) => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Data } },
        { text: `Analiza exhaustivamente este documento profesional. 
        Tu objetivo es extraer elementos accionables y relevantes para un sistema de gestión.
        
        Devuelve UNICAMENTE un objeto JSON con las siguientes claves:
        1. 'suggestedProjects': Array de objetos { name, budget (number, estimar si es posible, sino 0), deadline (string YYYY-MM-DD, estimar si es posible), description }. Identifica iniciativas grandes, campañas o fases.
        2. 'suggestedTasks': Array de objetos { title, priority ('high'|'medium'|'low'), dueDate (string YYYY-MM-DD), reason (por qué se sugiere) }. Extrae acciones concretas, pasos a seguir o pendientes.
        3. 'suggestedPresentations': Array de objetos { title, client, dueDate }. Solo si el documento implica la creación de diapositivas, reportes visuales o charlas.
        
        Si no encuentras nada para una categoría, devuelve un array vacío.` }
      ]
    },
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text);
};

export const generatePresentationFromDoc = async (base64Data: string, mimeType: string) => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Data } },
        { text: "Genera una estructura de presentación (array de slides con title y content) basada en este documento. JSON format." }
      ]
    },
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text);
};

export const generatePresentationOllama = async (docContent: string, baseUrl: string, model: string, apiKey?: string) => {
  // Simulating Ollama API call
  const headers: any = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model,
      prompt: `Act as a presentation expert. Based on the following document content, create a structured presentation.
      Return strictly a JSON Array of objects with 'title' (string) and 'content' (array of strings).
      
      Document Content: ${docContent.substring(0, 4000)}... (truncated for context)`,
      stream: false,
      format: "json"
    })
  });
  const data = await response.json();
  // Ollama might return raw text even with format json if the model isn't fine-tuned, robust parsing needed
  try {
    return JSON.parse(data.response);
  } catch (e) {
    console.error("Ollama JSON Parse Error", e);
    return [];
  }
};

export const askOllamaDocument = async (question: string, docContent: string, baseUrl: string, model: string, apiKey?: string) => {
  const headers: any = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model,
      prompt: `Context: ${docContent.substring(0, 6000)}\n\nQuestion: ${question}\n\nAnswer:`,
      stream: false
    })
  });
  const data = await response.json();
  return data.response;
};

export const getTaskSuggestions = async (context: any) => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Basado en este contexto (tareas actuales, historial, calendario, gastos): ${JSON.stringify(context)}, sugiere 3 tareas nuevas importantes. Devuelve JSON array con { title, category, priority, reason, isInsight: boolean }.`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text);
};

// Nueva función de análisis profundo de tareas
export const analyzeTaskEfficiency = async (tasks: Task[]) => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Actúa como un consultor de productividad de élite. Analiza la siguiente lista de tareas: ${JSON.stringify(tasks)}.
    
    Proporciona un reporte estructurado en JSON con:
    1. 'score': número del 0 al 100 indicando eficiencia de la lista (claridad, prioridad, carga).
    2. 'bottlenecks': array de strings identificando posibles bloqueos o sobrecarga.
    3. 'recommendations': array de strings con acciones concretas para mejorar el flujo.
    4. 'priorities': identifica las 3 tareas que deberían hacerse YA basado en urgencia/impacto.
    5. 'summary': Un párrafo breve y motivador sobre el estado actual.`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text);
};

export const analyzeWeeklyConflicts = async (events: any[], weekStart: string) => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analiza estos eventos para la semana que empieza en ${weekStart}: ${JSON.stringify(events)}. Identifica conflictos de horario y carga de trabajo. Devuelve JSON: { loadStatus: 'high'|'low', weeklySummary: string, conflicts: string[] }.`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text);
};

export const formatShoppingListForEmail = async (items: any[]) => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Formatea esta lista de compras para un email limpio y organizado: ${JSON.stringify(items)}.`,
  });
  return response.text;
};

export const getIdeaInspiration = async (idea: any, allIdeas: any[]) => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Expande esta idea: "${idea.title}". Contexto de otras ideas: ${JSON.stringify(allIdeas.map(i=>i.title))}. Dame sugerencias, viabilidad y siguientes pasos.`,
  });
  return response.text;
};

export const getSharedFinancesInsight = async (expenses: any[], debts: any[]) => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analiza estas finanzas compartidas: Gastos: ${JSON.stringify(expenses)}, Deudas: ${JSON.stringify(debts)}. Devuelve JSON: { summary: string, recommendations: string[], healthScore: number (0-100) }.`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text);
};

export const smartScheduleTasks = async (tasks: Task[], existingEvents: CalendarEvent[]): Promise<CalendarEvent[]> => {
  const ai = getAIInstance();
  const today = new Date().toISOString();
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Eres un asistente de planificación inteligente.
    Fecha actual: ${today}.
    
    Tienes estas tareas pendientes: ${JSON.stringify(tasks.map(t => ({ title: t.title, priority: t.priority, due: t.dueDate })))}.
    Y estos eventos ya agendados en el calendario: ${JSON.stringify(existingEvents.map(e => ({ title: e.title, start: e.start, end: e.end })))}.
    
    Tu objetivo es crear eventos de calendario para realizar estas tareas.
    Reglas:
    1. Si la tarea tiene fecha de vencimiento (dueDate), agenda el bloque de trabajo antes o en esa fecha.
    2. Si no tiene fecha, agenda en los próximos 3 días basándote en la prioridad (High = hoy/mañana).
    3. NO te solapes con eventos existentes. Busca huecos libres.
    4. Duración estimada por defecto: 1 hora, a menos que el título sugiera algo rápido o largo.
    5. Devuelve un ARRAY JSON de objetos CalendarEvent con formato: 
       { "id": "generated-uuid", "title": "Trabajar en: [Nombre Tarea]", "start": "ISO String", "end": "ISO String", "type": "work" }.
    `,
    config: { responseMimeType: "application/json" }
  });
  
  return JSON.parse(response.text);
};

export const analyzeNutritionScreenshot = async (base64Data: string, mimeType: string): Promise<Meal[]> => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Data } },
        { text: "Analiza esta imagen/captura de un plan nutricional o menú. Extrae las comidas y devuélvelas en un formato JSON array de objetos Meal: [{ type: 'breakfast'|'lunch'|'dinner'|'snack', title: string, ingredients: string[] }]." }
      ]
    },
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text);
};

export const analyzeCalendarIntelligence = async (events: any[]) => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Analiza este calendario: ${JSON.stringify(events)}.
    Identifica conflictos horarios, sugiere reagendamientos para optimizar bloques de concentración y detecta días sobrecargados.
    Devuelve JSON: { conflicts: string[], suggestions: string[], summary: string }.`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text);
};

export const getSmartCalendarSuggestions = async (context: any) => {
   return []; 
};

export const restructureSchedule = async (events: any[]) => {
   return events;
};
