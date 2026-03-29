import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Real credentials — fallback hardcoded for GitHub Pages (no env vars available)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://igvadjgjpyuvzailjqwg.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlndmFkamdqcHl1dnphaWxqcXdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NDI3MTAsImV4cCI6MjA4ODAxODcxMH0.eAqKCHDzrkvMTseaBP0I_JICP1owX60-cp3agYqRz4Q';

let _client: SupabaseClient | null = null;
let _isOffline = false;

/** Check if we're running on GitHub Pages (no real Supabase needed) */
const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');

function createOfflineMock(): SupabaseClient {
  const noop = async () => ({ data: null, error: null });
  const q: any = {
    select: () => q, insert: () => q, update: () => q, upsert: () => q,
    delete: () => q, eq: () => q, neq: () => q, or: () => q,
    order: () => q, limit: () => q, range: () => q,
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (r: any) => Promise.resolve({ data: [], error: null }).then(r)
  };
  return {
    from: () => q,
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      onAuthStateChange: (_e: any, cb: any) => {
        setTimeout(() => cb('SIGNED_OUT', null), 0);
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      signInWithPassword: noop,
      signUp: noop,
      signOut: noop,
    },
    storage: { from: () => ({ upload: noop, getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
    channel: () => ({ on: () => ({ subscribe: () => {} }) }),
    removeChannel: () => {},
  } as any;
}

function getClient(): SupabaseClient {
  if (_client) return _client;

  // On GitHub Pages, use offline mock to avoid Supabase errors in console
  if (isGitHubPages) {
    console.info('📡 FILEHUB running on GitHub Pages — Supabase offline mode (data from local JSON)');
    _isOffline = true;
    _client = createOfflineMock();
    return _client;
  }

  try {
    _client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
      global: {
        fetch: (...args: Parameters<typeof fetch>) => {
          return fetch(...args).catch(err => {
            // Suppress DNS/network errors silently
            if (!_isOffline) {
              _isOffline = true;
              console.warn('⚠️ Supabase unreachable — switching to offline mode');
            }
            return new Response(JSON.stringify([]), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        }
      }
    });
  } catch (e) {
    console.warn('⚠️ Supabase init failed — using offline mock');
    _isOffline = true;
    _client = createOfflineMock();
  }
  return _client!;
}

export const supabase = getClient();
export const isSupabaseOffline = () => _isOffline;
