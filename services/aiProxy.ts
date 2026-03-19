/**
 * FileHub AI Proxy Service
 * 
 * Soluciona el bloqueo CORS en Safari/iOS:
 * 1. Intenta llamar a la API de Anthropic vía el proxy del servidor Railway
 * 2. Fallback: llamada directa (funciona en Chrome desktop)
 * 3. Fallback final: Kimi vía Open WebUI
 */

import { chatWithKimi } from './kimiService';

const RAILWAY_URL = import.meta.env.VITE_WA_SERVER_URL || 'https://whatsapp-filehub-production.up.railway.app';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function callAI(
  messages: AIMessage[],
  options: {
    system?: string;
    model?: string;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const model = options.model || 'claude-haiku-4-5-20251001';
  const max_tokens = options.maxTokens || 1024;
  const system = options.system;

  const body: any = { model, max_tokens, messages };
  if (system) body.system = system;

  // ── 1. Railway proxy (funciona en iOS/Safari sin CORS) ──────────
  try {
    const r = await fetch(`${RAILWAY_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    if (r.ok) {
      const data = await r.json();
      const text = data.content?.[0]?.text;
      if (text) return text;
    }
  } catch {}

  // ── 2. Anthropic directa (Chrome desktop, no iOS) ───────────────
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    if (r.ok) {
      const data = await r.json();
      const text = data.content?.[0]?.text;
      if (text) return text;
    }
  } catch {}

  // ── 3. Kimi fallback ────────────────────────────────────────────
  try {
    const savedConfig = localStorage.getItem('filehub_kimi_config');
    const cfg = savedConfig ? JSON.parse(savedConfig) : {};
    return await chatWithKimi(
      messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      cfg,
      { systemPrompt: system, maxTokens: max_tokens }
    );
  } catch (e: any) {
    throw new Error('Sin conexión con la IA. Revisa tu conexión a internet.');
  }
}
