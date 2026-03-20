/**
 * FileHub AI Proxy — Safari iOS compatible, Haiku 4.5 via OpenRouter como primario
 */
import { chatWithKimi } from './kimiService';
import { cfg } from './config';

export interface AIMessage { role: 'user' | 'assistant'; content: string; }

// Sin AbortSignal.timeout() — no soportado en Safari iOS < 16.4
function fetchWithTimeout(url: string, options: RequestInit, ms: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(url, options)
      .then(r => { clearTimeout(t); resolve(r); })
      .catch(e => { clearTimeout(t); reject(e); });
  });
}

export async function callAI(
  messages: AIMessage[],
  options: { system?: string; model?: string; maxTokens?: number } = {}
): Promise<string> {
  const maxTokens = options.maxTokens || 1024;
  const system = options.system;
  const errors: string[] = [];

  // 1. OpenRouter → Claude Haiku 4.5 (PRIMARIO)
  const orKey = cfg.openrouterKey();
  if (orKey?.length > 10) {
    try {
      const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages;
      const r = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${orKey}`,
          'HTTP-Referer': 'https://ramongalera22-ai.github.io',
          'X-Title': 'FileHub IA',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-haiku-4-5',
          messages: msgs,
          max_tokens: maxTokens,
        }),
      }, 45000);
      if (r.ok) {
        const d = await r.json();
        const t = d.choices?.[0]?.message?.content;
        if (t) return t;
        errors.push(`OR Haiku: empty`);
      } else {
        const err = await r.text().catch(() => '');
        errors.push(`OR Haiku: ${r.status} ${err.slice(0, 80)}`);
      }
    } catch (e: any) { errors.push(`OR Haiku: ${e.message}`); }
  }

  // 2. Groq → Llama 3.3 70B (fallback rápido y gratuito)
  const groqKey = cfg.groqKey();
  if (groqKey?.length > 10) {
    try {
      const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages;
      const r = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: msgs,
          max_tokens: maxTokens,
        }),
      }, 30000);
      if (r.ok) {
        const d = await r.json();
        const t = d.choices?.[0]?.message?.content;
        if (t) return t;
        errors.push(`Groq: empty`);
      } else {
        const err = await r.text().catch(() => '');
        errors.push(`Groq: ${r.status} ${err.slice(0, 80)}`);
      }
    } catch (e: any) { errors.push(`Groq: ${e.message}`); }
  }

  // 3. Railway proxy (server-side — por si los anteriores fallan en algún browser)
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
      errors.push(`Railway: empty`);
    } else {
      errors.push(`Railway: HTTP ${r.status}`);
    }
  } catch (e: any) { errors.push(`Railway: ${e.message}`); }

  // 4. Kimi/OpenClaw fallback
  try {
    const savedCfg = JSON.parse(localStorage.getItem('filehub_kimi_config') || '{}');
    if (savedCfg.apiKey || savedCfg.baseUrl) {
      return await chatWithKimi(
        messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        savedCfg,
        { systemPrompt: system, maxTokens }
      );
    }
  } catch (e: any) { errors.push(`Kimi: ${e.message}`); }

  throw new Error(`IA no disponible (${errors.join(' | ')})`);
}
