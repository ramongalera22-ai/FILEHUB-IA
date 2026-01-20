interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly GEMINI_API_KEY: string
  readonly VITE_OLLAMA_URL: string
  readonly VITE_OLLAMA_MODEL: string
  readonly VITE_ANYTHING_LLM_URL: string
  readonly VITE_OLLAMA_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}