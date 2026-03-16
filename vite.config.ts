import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '') || {};
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || ''),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || ''),
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || ''),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
      'process.env.VITE_WA_SERVER_URL': JSON.stringify(env.VITE_WA_SERVER_URL || ''),
      'process.env.VITE_WA_WS_URL': JSON.stringify(env.VITE_WA_WS_URL || ''),
      'process.env.VITE_OPENROUTER_KEY': JSON.stringify(env.VITE_OPENROUTER_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve('.'),
      }
    },
    build: {
      // Externalize Node.js-only server packages so they don't get bundled into browser build
      rollupOptions: {
        external: [
          'ws', 'express', 'cors', 'dotenv', 'pino', 'qrcode', 'nodemailer',
          'baileys', '@whiskeysockets/baileys', 'fs', 'path', 'http', 'https',
          'net', 'os', 'crypto', 'stream', 'buffer', 'events', 'util', 'child_process',
        ],
        output: {
          // Provide empty stubs for any accidentally bundled Node modules
          globals: {
            ws: 'WebSocket',
            express: '{}',
            cors: '{}',
            dotenv: '{}',
            pino: '{}',
            qrcode: '{}',
            nodemailer: '{}',
            baileys: '{}',
            '@whiskeysockets/baileys': '{}',
          },
        },
      },
    },
  };
});
