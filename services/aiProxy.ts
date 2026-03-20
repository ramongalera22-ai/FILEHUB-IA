/**
 * FileHub AI Proxy — multi-provider chain
 * Railway → Groq → OpenRouter → Anthropic → Kimi
 */
import { chatWithKimi } from './kimiService';
import { cfg } from './config';

export interface AIMessage { role: 'user' | 'assistant'; content: string; }

export async function callAI(
  messages: AIMessage[],
  options: { system?: string; model?: string; maxTokens?: number } = {}
): Promise<string> {
  const maxTokens = options.maxTokens || 1024;
  const system = options.system;

  // 1. Railway proxy — resuelve CORS iOS/Safari
  try {
    const r = await fetch(`${cfg.waServerUrl()}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, system, max_tokens: maxTokens }),
      signal: AbortSignal.timeout(35000),
    });
    if (r.ok) {
      const d = await r.json();
      const t = d.content?.[0]?.text;
      if (t) return t;
    }
  } catch {}

  // 2. Groq directo (Llama 3.3 70B, gratuito y muy rápido)
  try {
    const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages;
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.groqKey()}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: msgs, max_tokens: maxTokens }),
      signal: AbortSignal.timeout(30000),
    });
    if (r.ok) {
      const d = await r.json();
      const t = d.choices?.[0]?.message?.content;
      if (t) return t;
    }
  } catch {}

  // 3. OpenRouter (Claude, Llama, Mistral...)
  try {
    const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages;
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.openrouterKey()}`,
        'HTTP-Referer': 'https://ramongalera22-ai.github.io',
        'X-Title': 'FileHub IA',
      },
      body: JSON.stringify({ model: 'meta-llama/llama-3.3-70b-instruct', messages: msgs, max_tokens: maxTokens }),
      signal: AbortSignal.timeout(45000),
    });
    if (r.ok) {
      const d = await r.json();
      const t = d.choices?.[0]?.message?.content;
      if (t) return t;
    }
  } catch {}

  // 4. Anthropic directo (Chrome desktop)
  try {
    const body: any = { model: 'claude-haiku-4-5-20251001', max_tokens: maxTokens, messages };
    if (system) body.system = system;
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
      const d = await r.json();
      const t = d.content?.[0]?.text;
      if (t) return t;
    }
  } catch {}

  // 5. Kimi fallback
  try {
    const savedCfg = JSON.parse(localStorage.getItem('filehub_kimi_config') || '{}');
    return await chatWithKimi(
      messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      savedCfg,
      { systemPrompt: system, maxTokens }
    );
  } catch {}

  throw new Error('Sin conexión con la IA. Comprueba tu internet.');
}
