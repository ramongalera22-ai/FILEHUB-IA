/**
 * FileHub AI Proxy
 * Prioridad: Cloudflare Worker (si configurado) → OpenRouter → Groq → Railway
 * 
 * Configura tu Worker URL en: Cuaderno → ⚙️ → "URL Proxy IA"
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

// Get user-configured proxy URL (from localStorage)
function getProxyUrl(): string {
  try {
    const saved = JSON.parse(localStorage.getItem('filehub_ai_proxy') || '{}');
    return saved.url || '';
  } catch { return ''; }
}

export async function callAI(
  messages: AIMessage[],
  options: { system?: string; maxTokens?: number } = {}
): Promise<string> {
  const maxTokens = options.maxTokens || 1024;
  const system = options.system;
  const errors: string[] = [];

  const body = JSON.stringify({ messages, system, max_tokens: maxTokens });
  const jsonHeaders = { 'Content-Type': 'application/json' };

  // 0. DeepSeek (prioridad máxima)
  const dsKey = cfg.deepseekKey();
  console.log('🤖 AI chain starting, DS key length:', dsKey?.length);
  if (dsKey && dsKey.length > 5) {
    try {
      const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages;
      const r = await fetchWithTimeout('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { ...jsonHeaders, 'Authorization': `Bearer ${dsKey}` },
        body: JSON.stringify({ model: 'deepseek-chat', messages: msgs, max_tokens: maxTokens }),
      }, 30000);
      console.log('🤖 DeepSeek response:', r.status);
      if (r.ok) {
        const d = await r.json();
        const t = d.choices?.[0]?.message?.content;
        if (t) return t;
      }
      const err = await r?.text().catch(() => '');
      errors.push(`DS: ${r?.status} ${err?.slice(0, 80)}`);
    } catch (e: any) { errors.push(`DS: ${e.message}`); }
  } else {
    errors.push(`DS: key not found (len=${dsKey?.length})`);
  }

  // 1. Cloudflare Worker del usuario (configurado en Settings)
  const proxyUrl = getProxyUrl();
  if (proxyUrl) {
    try {
      const r = await fetchWithTimeout(proxyUrl, { method: 'POST', headers: jsonHeaders, body }, 30000);
      if (r.ok) {
        const d = await r.json();
        const t = d.content?.[0]?.text || d.choices?.[0]?.message?.content;
        if (t) return t;
      }
      errors.push(`Worker: HTTP ${r.status}`);
    } catch (e: any) { errors.push(`Worker: ${e.message}`); }
  }

  // 2. Railway server proxy
  try {
    const r = await fetchWithTimeout(`${cfg.waServerUrl()}/ai/chat`, {
      method: 'POST', headers: jsonHeaders, body,
    }, 35000);
    if (r.ok) {
      const d = await r.json();
      const t = d.content?.[0]?.text;
      if (t) return t;
    }
    errors.push(`Railway: HTTP ${r?.status ?? 'failed'}`);
  } catch (e: any) { errors.push(`Railway: ${e.message}`); }

  // 3. OpenRouter directo
  const orKey = cfg.openrouterKey();
  if (orKey?.length > 10) {
    try {
      const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages;
      const r = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { ...jsonHeaders, 'Authorization': `Bearer ${orKey}`, 'HTTP-Referer': 'https://ramongalera22-ai.github.io', 'X-Title': 'FileHub' },
        body: JSON.stringify({ model: 'anthropic/claude-haiku-4.5', messages: msgs, max_tokens: maxTokens }),
      }, 45000);
      if (r.ok) {
        const d = await r.json();
        const t = d.choices?.[0]?.message?.content;
        if (t) return t;
      }
      const err = await r?.text().catch(() => '');
      errors.push(`OR: ${r?.status} ${err?.slice(0, 60)}`);
    } catch (e: any) { errors.push(`OR: ${e.message}`); }
  }

  // 4. Groq directo
  const groqKey = cfg.groqKey();
  if (groqKey?.length > 10) {
    try {
      const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages;
      const r = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { ...jsonHeaders, 'Authorization': `Bearer ${groqKey}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: msgs, max_tokens: maxTokens }),
      }, 30000);
      if (r.ok) {
        const d = await r.json();
        const t = d.choices?.[0]?.message?.content;
        if (t) return t;
      }
      const err = await r?.text().catch(() => '');
      errors.push(`Groq: ${r?.status} ${err?.slice(0, 60)}`);
    } catch (e: any) { errors.push(`Groq: ${e.message}`); }
  }

  throw new Error(`IA sin respuesta (${errors.join(' | ')})`);
}
