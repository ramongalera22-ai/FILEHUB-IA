import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://xlbtwjxyphqnjeugfxds.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  try {
    _client = createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (e) {
    console.warn('⚠️ Supabase init failed — using offline mock:', e);
    // Return silent mock so app doesn't crash
    const noop = async () => ({ data: null, error: null });
    const q: any = { select: () => q, insert: () => q, update: () => q, upsert: () => q, delete: () => q, eq: () => q, neq: () => q, order: () => q, limit: () => q, single: noop, then: (r: any) => Promise.resolve({ data: [], error: null }).then(r) };
    _client = {
      from: () => q,
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: (_e: any, cb: any) => { setTimeout(() => cb('SIGNED_OUT', null), 0); return { data: { subscription: { unsubscribe: () => {} } } }; },
        signInWithPassword: noop,
        signUp: noop,
        signOut: noop,
      },
      storage: { from: () => ({ upload: noop, getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
      channel: () => ({ on: () => ({ subscribe: () => {} }) }),
      removeChannel: () => {},
    } as any;
  }
  return _client!;
}

export const supabase = getClient();
