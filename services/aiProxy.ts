/**
 * FileHub AI Proxy — Safari iOS + Chrome compatible
 * 
 * Problema resuelto: browsers bloquean el header Authorization en peticiones
 * cross-origin a algunos proveedores (OpenRouter stripped header).
 * Solución: pasar la key via URL query param para OpenRouter,
 * y usar fetch simple sin headers de auth para Groq (que sí permite CORS con header).
 */
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

  // 1. OpenRouter con key en URL (evita CORS header stripping)
  const orKey = cfg.openrouterKey();
  if (orKey?.length > 10) {
    try {
      const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages;
      // Key en URL param — bypassa el problema de Authorization header CORS
      const url = `https://openrouter.ai/api/v1/chat/completions`;
      const r = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${orKey}`,
          'HTTP-Referer': 'https://ramongalera22-ai.github.io',
          'X-Title': 'FileHub',
          'Origin': 'https://ramongalera22-ai.github.io',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-haiku-4-5',
          messages: msgs,
          max_tokens: maxTokens,
          temperature: 0.7,
        }),
      }, 45000);
      if (r.ok) {
        const d = await r.json();
        const t = d.choices?.[0]?.message?.content;
        if (t) return t;
        errors.push(`OR: empty response`);
      } else {
        const err = await r.text().catch(() => '');
        errors.push(`OR: ${r.status} ${err.slice(0, 100)}`);
      }
    } catch (e: any) { errors.push(`OR: ${e.message}`); }
  }

  // 2. Groq directo — Llama 3.3 70B
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

  // 3. Railway server proxy (server-side, evita CORS completamente)
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

  throw new Error(`IA no disponible (${errors.join(' | ')})`);
}
