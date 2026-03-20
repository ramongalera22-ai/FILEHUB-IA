/**
 * FileHub AI Proxy — Safari iOS compatible
 * fetchWithTimeout: sin AbortSignal.timeout() (no soportado iOS<16.4)
 */
import { chatWithKimi } from './kimiService';
import { cfg } from './config';

export interface AIMessage { role: 'user' | 'assistant'; content: string; }

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

  // 1. Railway proxy (server-side — no CORS, usa Groq/OpenRouter server-side)
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
      errors.push(`Railway: empty response`);
    } else {
      errors.push(`Railway: HTTP ${r.status}`);
    }
  } catch (e: any) { errors.push(`Railway: ${e.message}`); }

  // 2. Groq directo — NUEVO KEY (ver console.groq.com)
  const groqKey = cfg.groqKey();
  if (groqKey && groqKey.length > 10) {
    try {
      const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages;
      const r = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: msgs, max_tokens: maxTokens }),
      }, 30000);
      if (r.ok) {
        const d = await r.json();
        const t = d.choices?.[0]?.message?.content;
        if (t) return t;
      } else {
        const err = await r.text().catch(() => '');
        errors.push(`Groq: ${r.status} ${err.slice(0, 60)}`);
      }
    } catch (e: any) { errors.push(`Groq: ${e.message}`); }
  }

  // 3. OpenRouter — con x-api-key header (evita que el browser lo strip)
  const orKey = cfg.openrouterKey();
  if (orKey && orKey.length > 10) {
    try {
      const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages;
      const r = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${orKey}`,
          'x-api-key': orKey,
          'HTTP-Referer': 'https://ramongalera22-ai.github.io',
          'X-Title': 'FileHub',
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
      } else {
        const err = await r.text().catch(() => '');
        errors.push(`OpenRouter: ${r.status} ${err.slice(0, 60)}`);
      }
    } catch (e: any) { errors.push(`OpenRouter: ${e.message}`); }
  }

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
    errors.push('Kimi: no config');
  } catch (e: any) { errors.push(`Kimi: ${e.message}`); }

  throw new Error(`IA no disponible (${errors.join(' | ')})`);
}
