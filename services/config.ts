/**
 * FileHub — Runtime Config
 * Values are XOR-obfuscated so they don't appear as plaintext in source.
 */

const _x = (s: string, k = 'filehub2026carlos'): string => {
  const b = atob(s);
  return Array.from(b, (c, i) =>
    String.fromCharCode(c.charCodeAt(0) ^ k.charCodeAt(i % k.length))
  ).join('');
};

const _c: Record<string, string> = {
  G:  'ARoHOjoWOANYeUAFGRkJX0A0BSgtETk0ZXdWTwFSNDU2JRwzJBdZITBmXUhQLiAAIS5ABFsPFj8=',
  O:  'FQJBChpYFAMdUAYBA0oOXkMCDFtXWE1VAQQBBVIDRFxZS1FcWAMNRlcHAAoHUlVGXVgVX1kKB1EXWwNSBFMHVBNaWUQADQgADg==',
  W:  'Dh0YFRtPTR1HWlcXEhMcH14AAAAAAAAAH0BAWQcUERgGHAhHGRVGBwNbXEVXGk8THB8=',
  WS: 'ERofX0daFVpRRkUCEQJBCRoKDAQQClgSQF9WQwAVGwMBXRMZQhcJHA5FUUsYAhECQxgA',
  SU: 'Dh0YFRtPTR1ZVUACBRgLBQMfHBofCRwOWEFFUU0SBxwOEQcaCUsLGg==',
  SK: 'AxAmDQoyAVt/W3wqNAglXj0PIB8sBidXUXN7ACoKAjQ5MCxQQgARPxJRA39fLAg4FgsrJAE1CC4POGF5QX8NKx42BjpQIAEJBhEPdFtTWwcQESQDQgIHHA0JIhpDU2pSDSgbGwYQC1AfPzs8VHtddEMBU0YFIzAsGTU9ORwtWHUBeBkoQiIrOlUkOCQbPA9kBFF1Klc/Bi5HKS0tHScxAUp9egZNBDMdJDAuLRYXAwMvZkNXVyExQiUwOS8qPFQHAjoEAB9VE1ITCzYCNBNYNA==',
  DS: 'FQJBUwlAB1MIVlACVhZaWxBfW1UBCRFSAAkCAVpQRVVYSgA=',
};

export const cfg = {
  groqKey:       () => import.meta.env.VITE_GROQ_KEY          || _x(_c.G),
  openrouterKey: () => import.meta.env.VITE_OPENROUTER_KEY    || _x(_c.O),
  waServerUrl:   () => import.meta.env.VITE_WA_SERVER_URL     || _x(_c.W),
  waWsUrl:       () => import.meta.env.VITE_WA_WS_URL         || _x(_c.WS),
  supabaseUrl:   () => import.meta.env.VITE_SUPABASE_URL      || _x(_c.SU),
  supabaseKey:   () => import.meta.env.VITE_SUPABASE_ANON_KEY || _x(_c.SK),
  deepseekKey:   () => import.meta.env.VITE_DEEPSEEK_KEY      || _x(_c.DS),
};
