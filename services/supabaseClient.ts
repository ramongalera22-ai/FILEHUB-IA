
import { createClient } from '@supabase/supabase-js';

// URL y Key del proyecto basadas en la información proporcionada
const PROJECT_URL = 'https://xlbtwjxyphqnjeugfxds.supabase.co';
// Fallback key provided by user (usually anon key starts with ey..., but using provided value)
const PROJECT_ANON_KEY = 'sb_publishable_CBtTyCYOl1AfusDdxDQQhg_A54tF820';

// Helper function to safely get environment variables
const getEnvVar = (key: string): string | undefined => {
  // 1. Try import.meta.env (Vite standard)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {}

  // 2. Try process.env (Node/System/Vite Define replacement)
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {}

  return undefined;
};

// Prioridad: Variable VITE -> Variable NEXT_PUBLIC -> Valor Hardcoded
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('NEXT_PUBLIC_SUPABASE_URL') || PROJECT_URL;
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY') || PROJECT_ANON_KEY;

if (!supabaseAnonKey || supabaseAnonKey === 'anon-key-placeholder') {
  console.warn('⚠️ Supabase Key no detectada correctamente. Verifica tu configuración.');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
