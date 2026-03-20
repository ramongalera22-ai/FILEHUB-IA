// Cloudflare Worker — FileHub AI Proxy
// Deploy: wrangler deploy
// Secrets: wrangler secret put GROQ_KEY && wrangler secret put OR_KEY

export default {
  async fetch(request, env) {
    // CORS headers for GitHub Pages
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://ramongalera22-ai.github.io',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { messages, system, max_tokens = 1024 } = await request.json();

    // Try Groq first
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: system ? [{ role: 'system', content: system }, ...messages] : messages,
        max_tokens,
      }),
    });

    if (groqRes.ok) {
      const data = await groqRes.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) {
        return new Response(
          JSON.stringify({ content: [{ type: 'text', text }] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fallback: OpenRouter
    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OR_KEY}`,
        'HTTP-Referer': 'https://ramongalera22-ai.github.io',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4-5',
        messages: system ? [{ role: 'system', content: system }, ...messages] : messages,
        max_tokens,
      }),
    });

    if (orRes.ok) {
      const data = await orRes.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) {
        return new Response(
          JSON.stringify({ content: [{ type: 'text', text }] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'All providers failed' }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  },
};
