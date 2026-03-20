# FileHub AI Proxy — Cloudflare Worker

## Deploy (2 minutos)

```bash
# 1. Instala wrangler
npm install -g wrangler

# 2. Login en Cloudflare
wrangler login

# 3. Entra en esta carpeta
cd cloudflare-worker

# 4. Añade las API keys como secrets (no van al código)
wrangler secret put GROQ_KEY
# Pega: TU_GROQ_KEY_AQUI

wrangler secret put OR_KEY  
# Pega: TU_OR_KEY_AQUI

# 5. Despliega
wrangler deploy
```

## Tras el deploy
Wrangler te dará una URL como:
`https://filehub-ai-proxy.TU-USUARIO.workers.dev`

Dásela al asistente y la configurará en la app.
