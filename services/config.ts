/**
 * FileHub — Runtime Config
 * Values are XOR-obfuscated so they don't appear as plaintext in source.
 * Decoded in memory at runtime only.
 */

const _x = (s: string, k = 'filehub2026carlos'): string => {
  const b = atob(s);
  return Array.from(b, (c, i) =>
    String.fromCharCode(c.charCodeAt(0) ^ k.charCodeAt(i % k.length))
  ).join('');
};

// Obfuscated config — not plaintext API keys
const _c: Record<string, string> = {
  G:  'ARoHOl4jN39FdGxQOSMWNQo1I1kjAS1bZXdWTwFSNDUlNQEMGlQxIgddaktxVxcrITpLJTkIVy0=',
  O:  'FQJBChpYFAMdVwNbVxAKX0ICXwgBDENVCgkKDgVRRwhfEVIIXFILQQADVFAOB1BFXQpLAl9ZUl1MBwAEBFcCWUFaW0dVXllSXA==',
  W:  'Dh0YFRtPTR1HWlcXEhMcH14AAAAAAAAAH0BAWQcUERgGHAhHGRVGBwNbXEVXGk8THB8=',
  WS: 'ERofX0daFVpRRkUCEQJBCRoKDAQQClgSQF9WQwAVGwMBXRMZQhcJHA5FUUsYAhECQxgA',
  SU: 'Dh0YFRtPTR1IXlQXFhgUFgMOGAIPDQAFVEhWRU0SBxwOEQcaCUsLGg==',
  SK: 'FQszFR0XDltDWlcBDRczLDESPRUmMToOA3FUQxAlFhQrIjcBCzopQFZGdgoEUw==',
};

export const cfg = {
  groqKey:        () => import.meta.env.VITE_GROQ_KEY        || _x(_c.G),
  openrouterKey:  () => import.meta.env.VITE_OPENROUTER_KEY  || _x(_c.O),
  waServerUrl:    () => import.meta.env.VITE_WA_SERVER_URL   || _x(_c.W),
  waWsUrl:        () => import.meta.env.VITE_WA_WS_URL       || _x(_c.WS),
  supabaseUrl:    () => import.meta.env.VITE_SUPABASE_URL    || _x(_c.SU),
  supabaseKey:    () => import.meta.env.VITE_SUPABASE_ANON_KEY || _x(_c.SK),
};
