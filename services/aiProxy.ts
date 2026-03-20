/**
 * FileHub AI Proxy — multi-provider, compatible con Safari iOS 14+
 * Sin AbortSignal.timeout() — usa setTimeout manual para compatibilidad
 */
import { chatWithKimi } from './kimiService';
import { cfg } from './config';

export interface AIMessage { role: 'user' | 'assistant'; content: string; }

// Safari-safe timeout wrapper
function fetchWithTimeout(url: string, options: RequestInit, ms: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(url, options)
      .then(r => { clearTimeout(timer); resolve(r); })
      .catch(e => { clearTimeout(timer); reject(e); });
  });
}

export async function callAI(
  messages: AIMessage[],
  options: { system?: string; model?: string; maxTokens?: number } = {}
): Promise<string> {
  const maxTokens = options.maxTokens || 1024;
  const system = options.system;
  const errors: string[] = [];

  // 1. Railway proxy (server-side — resuelve CORS iOS/Safari)
  try {
    const r = await fetchWithTimeout(`${cfg.waServerUrl()}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, system, max_tokens: maxTokens }),
    }, 35000);
    if (r.ok) {
      const d = await r.json();
      const t = d.content?.[0]?.text;
      if (t) return t;
      errors.push(`Railway: no text in response`);
    } else {
      errors.push(`Railway: HTTP ${r.status}`);
    }
  } catch (e: any) { errors.push(`Railway: ${e.message}`); }

  // 2. Groq directo (Llama 3.3 70B — CORS abierto, gratis)
  try {
    const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages;
    const r = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.groqKey()}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: msgs, max_tokens: maxTokens }),
    }, 30000);
    if (r.ok) {
      const d = await r.json();
      const t = d.choices?.[0]?.message?.content;
      if (t) return t;
      errors.push(`Groq: no text`);
    } else {
      const err = await r.text().catch(() => '');
      errors.push(`Groq: HTTP ${r.status} ${err.slice(0, 80)}`);
    }
  } catch (e: any) { errors.push(`Groq: ${e.message}`); }

  // 3. OpenRouter (CORS abierto, múltiples modelos)
  try {
    const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages;
    const r = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.openrouterKey()}`,
        'HTTP-Referer': 'https://ramongalera22-ai.github.io',
        'X-Title': 'FileHub IA',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: msgs,
        max_tokens: maxTokens,
      }),
    }, 45000);
    if (r.ok) {
      const d = await r.json();
      const t = d.choices?.[0]?.message?.content;
      if (t) return t;
      errors.push(`OpenRouter: no text`);
    } else {
      const err = await r.text().catch(() => '');
      errors.push(`OpenRouter: HTTP ${r.status} ${err.slice(0, 80)}`);
    }
  } catch (e: any) { errors.push(`OpenRouter: ${e.message}`); }

  // 4. Anthropic directo (header especial para browser)
  try {
    const body: any = { model: 'claude-haiku-4-5-20251001', max_tokens: maxTokens, messages };
    if (system) body.system = system;
    const r = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    }, 60000);
    if (r.ok) {
      const d = await r.json();
      const t = d.content?.[0]?.text;
      if (t) return t;
      errors.push(`Anthropic: no text`);
    } else {
      errors.push(`Anthropic: HTTP ${r.status}`);
    }
  } catch (e: any) { errors.push(`Anthropic: ${e.message}`); }

  // 5. Kimi fallback
  try {
    const savedCfg = JSON.parse(localStorage.getItem('filehub_kimi_config') || '{}');
    return await chatWithKimi(
      messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      savedCfg,
      { systemPrompt: system, maxTokens }
    );
  } catch (e: any) { errors.push(`Kimi: ${e.message}`); }

  // Show specific errors to help debug
  throw new Error(`IA no disponible. Errores: ${errors.join(' | ')}`);
}
