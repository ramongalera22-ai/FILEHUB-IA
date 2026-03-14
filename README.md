# ⚡ FILEHUB IA

> Tu centro de control personal con IA — Gastos, Tareas, Guardias, Hábitos, WhatsApp Bot

[![Deploy → Vercel](https://img.shields.io/badge/Vercel-Live-black?logo=vercel)](https://filehub-ia-pi.vercel.app)
[![Deploy → GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-blue?logo=github)](https://ramongalera22-ai.github.io/FILEHUB-IA/)
[![GitHub Actions](https://github.com/ramongalera22-ai/FILEHUB-IA/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ramongalera22-ai/FILEHUB-IA/actions)

## 🔗 URLs

| Plataforma | URL | Estado |
|---|---|---|
| **Vercel** (principal) | https://filehub-ia-pi.vercel.app | Auto-deploy en cada push |
| **GitHub Pages** | https://ramongalera22-ai.github.io/FILEHUB-IA/ | Auto-deploy via Actions |

## 🚀 Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + Baileys (WhatsApp)
- **DB**: Supabase (PostgreSQL)
- **Deploy**: Vercel + GitHub Pages
- **Bot server**: Railway

## 📦 Desarrollo local

```bash
npm install
npm run dev        # http://localhost:3000
```

## 🔧 Variables de entorno

```env
VITE_SUPABASE_URL=https://xlbtwjxyphqnjeugfxds.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_GEMINI_API_KEY=...
VITE_WA_SERVER_URL=https://whatsapp-filehub-production.up.railway.app
VITE_WA_WS_URL=wss://whatsapp-filehub-production.up.railway.app/ws
```

## 🗄️ Secrets para GitHub Actions

Ve a **Settings → Secrets → Actions** y añade:

| Secret | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL de Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave anon de Supabase |
| `VITE_GEMINI_API_KEY` | API Key de Gemini |
| `VITE_WA_SERVER_URL` | URL del servidor WhatsApp |
| `VITE_WA_WS_URL` | WebSocket URL del bot |
| `VERCEL_TOKEN` | Token de Vercel (opcional) |
| `VERCEL_ORG_ID` | Org ID de Vercel (opcional) |
| `VERCEL_PROJECT_ID` | `prj_HdDTr8hORxdhoAzkGAPNvsJgxFDP` |

## 📅 Calendarios sincronizados

- `carlosgalera2roman@gmail.com` — Calendario principal Carlos
- `ramongalera22@gmail.com` — Calendario Ramon Galera
- Filtro automático: eventos "Guardia Montse" ignorados

## 🛠️ Funcionalidades principales

- ⭐ **Tareas VIP** — Prioridades críticas con Supabase sync
- 🧠 **Planificador IA** — Organización automática + Pomodoro
- 🔥 **Hábitos** — Streak tracker 21 días
- 🛡️ **Guardias** — Calendario de turnos + exportar iCal + retribución
- 💰 **Alertas presupuesto** — Límites por categoría + notificaciones push
- 🤖 **Bot WhatsApp** — Scraping pisos/empleo + respuesta automática
- 📅 **Calendario** — Sync Google Calendar bidireccional
