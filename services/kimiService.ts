/**
 * FileHub — OpenClaw / Kimi AI Service
 * Conecta con el bot OpenClaw usando modelo moonshot/kimi-k2-0711-preview (Kimi 2.5)
 * API compatible con OpenAI — funciona vía Open WebUI o directo a Moonshot API
 */

export interface KimiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | KimiContentPart[];
}

export interface KimiContentPart {
  type: 'text' | 'image_url' | 'file';
  text?: string;
  image_url?: { url: string };
  file?: { file_id: string };
}

export interface KimiConfig {
  baseUrl: string;       // Open WebUI URL o https://api.moonshot.cn/v1
  apiKey: string;        // Open WebUI key o Moonshot API key
  model: string;         // 'moonshot-v1-8k' | 'moonshot-v1-32k' | 'moonshot-v1-128k' | 'kimi-k2-0711-preview'
  isActive: boolean;
}

// Defaults — cambia en Settings si necesitas otro endpoint
export const DEFAULT_KIMI_CONFIG: KimiConfig = {
  baseUrl: import.meta.env.VITE_OPEN_WEBUI_URL || import.meta.env.VITE_KIMI_BASE_URL || 'https://api.moonshot.cn/v1',
  apiKey: import.meta.env.VITE_OPEN_WEBUI_API_KEY || import.meta.env.VITE_KIMI_API_KEY || '',
  model: import.meta.env.VITE_KIMI_MODEL || 'kimi-k2-0711-preview',
  isActive: true,
};

// Kimi system persona for FileHub
export const FILEHUB_SYSTEM_PROMPT = `Eres el asistente IA de FileHub, una plataforma personal de gestión inteligente para Carlos.
Nombre: Kimi (modelo kimi-k2 de Moonshot AI, integrado vía OpenClaw)
Idioma: SIEMPRE responde en español.
Tono: Profesional pero cercano, directo y útil.
Especialidades: Gestión de gastos y finanzas, planificación personal, búsqueda de pisos y empleo, 
                organización de tareas, calendario y guardias médicas, análisis de documentos.
Formato: Usa markdown cuando ayude (negrita, listas, tablas). Sé conciso a menos que se pida detalle.
Contexto del usuario: Carlos es enfermero con guardias de 24h. Vive en España. Busca piso de alquiler. 
                      Gestiona gastos, tareas y objetivos con esta app.`;

// ─── CHAT ────────────────────────────────────────────────────────
export async function chatWithKimi(
  messages: KimiMessage[],
  config: Partial<KimiConfig> = {},
  options: {
    stream?: boolean;
    maxTokens?: number;
    temperature?: number;
    onChunk?: (chunk: string) => void;
    systemPrompt?: string;
  } = {}
): Promise<string> {
  const cfg = { ...DEFAULT_KIMI_CONFIG, ...config };

  const baseUrl = cfg.baseUrl.endsWith('/v1')
    ? cfg.baseUrl
    : cfg.baseUrl.replace(/\/$/, '') + '/v1';

  const systemMsg: KimiMessage = {
    role: 'system',
    content: options.systemPrompt || FILEHUB_SYSTEM_PROMPT,
  };

  const allMessages = [systemMsg, ...messages];

  const body: any = {
    model: cfg.model,
    messages: allMessages,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature ?? 0.6,
    stream: options.stream || false,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (cfg.apiKey) headers['Authorization'] = `Bearer ${cfg.apiKey}`;

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`Kimi API error ${res.status}: ${err.substring(0, 200)}`);
    }

    if (options.stream && options.onChunk) {
      // Streaming mode
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const json = line.replace('data: ', '').trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullText += delta;
              options.onChunk(delta);
            }
          } catch {}
        }
      }
      return fullText;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (err: any) {
    if (err.message?.includes('Failed to fetch') || err.message?.includes('CORS')) {
      throw new Error('No se pudo conectar con el servidor IA. Comprueba la URL y la API key en Configuración.');
    }
    throw err;
  }
}

// ─── CHECK STATUS ────────────────────────────────────────────────
export async function checkKimiStatus(config: Partial<KimiConfig> = {}): Promise<{
  ok: boolean;
  models?: string[];
  error?: string;
}> {
  const cfg = { ...DEFAULT_KIMI_CONFIG, ...config };
  const baseUrl = cfg.baseUrl.endsWith('/v1') ? cfg.baseUrl : cfg.baseUrl.replace(/\/$/, '') + '/v1';

  try {
    const headers: Record<string, string> = {};
    if (cfg.apiKey) headers['Authorization'] = `Bearer ${cfg.apiKey}`;

    const res = await fetch(`${baseUrl}/models`, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };

    const data = await res.json();
    const models = (data.data || []).map((m: any) => m.id).filter(Boolean);
    return { ok: true, models };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

// ─── DOCUMENT ANALYSIS ───────────────────────────────────────────
export async function analyzeDocumentWithKimi(
  content: string,
  question: string,
  config: Partial<KimiConfig> = {}
): Promise<string> {
  const messages: KimiMessage[] = [
    {
      role: 'user',
      content: `Analiza el siguiente documento y responde la pregunta.\n\n**DOCUMENTO:**\n${content.substring(0, 50000)}\n\n**PREGUNTA:** ${question}`,
    },
  ];
  return chatWithKimi(messages, config);
}

// ─── NOTEBOOK RAG (multi-source) ─────────────────────────────────
export async function notebookChatWithKimi(
  question: string,
  sources: { name: string; content: string }[],
  chatHistory: KimiMessage[],
  config: Partial<KimiConfig> = {}
): Promise<string> {
  const sourcesText = sources.length > 0
    ? sources.map(s => `### ${s.name}\n${s.content.substring(0, 15000)}`).join('\n\n---\n\n')
    : 'Sin fuentes disponibles.';

  const systemPrompt = `${FILEHUB_SYSTEM_PROMPT}

## FUENTES DEL CUADERNO (responde SOLO basándote en estas):
${sourcesText}

Instrucciones:
- Responde SOLO con información de las fuentes
- Si no está en las fuentes, dilo claramente
- Cita la fuente cuando sea relevante (ej: "Según [Nombre del documento]...")
- Sé preciso y útil`;

  const messages: KimiMessage[] = [
    ...chatHistory.slice(-10), // últimos 10 turnos para contexto
    { role: 'user', content: question },
  ];

  return chatWithKimi(messages, config, { systemPrompt, maxTokens: 2048 });
}

// ─── SMART SUGGESTIONS ───────────────────────────────────────────
export async function getKimiSuggestions(
  context: {
    tasks?: any[];
    expenses?: any[];
    events?: any[];
    goals?: any[];
  },
  config: Partial<KimiConfig> = {}
): Promise<string> {
  const messages: KimiMessage[] = [
    {
      role: 'user',
      content: `Basándote en mi situación actual, dame 3-5 sugerencias concretas y accionables.

**Tareas pendientes:** ${context.tasks?.filter((t: any) => !t.completed).length || 0}
${context.tasks?.filter((t: any) => !t.completed).slice(0, 5).map((t: any) => `- [${t.priority}] ${t.title}`).join('\n') || ''}

**Gastos este mes:** ${context.expenses?.length || 0} registros
**Próximos eventos:** ${context.events?.filter((e: any) => e.start >= new Date().toISOString().split('T')[0]).slice(0, 3).map((e: any) => e.title).join(', ') || 'ninguno'}
**Objetivos activos:** ${context.goals?.filter((g: any) => g.status === 'active').slice(0, 3).map((g: any) => g.title).join(', ') || 'ninguno'}

Dame sugerencias cortas y directas en formato de lista.`,
    },
  ];
  return chatWithKimi(messages, config, { maxTokens: 512, temperature: 0.7 });
}

// ─── EXPENSE ANALYSIS ────────────────────────────────────────────
export async function analyzeExpensesWithKimi(
  expenses: any[],
  config: Partial<KimiConfig> = {}
): Promise<string> {
  const total = expenses.reduce((s: number, e: any) => s + Math.abs(e.amount || 0), 0);
  const byCat = expenses.reduce((acc: Record<string, number>, e: any) => {
    acc[e.category] = (acc[e.category] || 0) + Math.abs(e.amount || 0);
    return acc;
  }, {});

  const messages: KimiMessage[] = [
    {
      role: 'user',
      content: `Analiza mis gastos del mes y dame recomendaciones de ahorro.

**Total gastado:** €${total.toFixed(2)}
**Por categoría:**
${Object.entries(byCat).map(([cat, amt]) => `- ${cat}: €${(amt as number).toFixed(2)}`).join('\n')}
**Número de transacciones:** ${expenses.length}

Dame: 1) Análisis del patrón de gastos 2) 3 recomendaciones concretas de ahorro 3) Proyección del mes`,
    },
  ];
  return chatWithKimi(messages, config, { maxTokens: 800 });
}
