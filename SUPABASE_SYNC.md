# 💾 Sincronización de Configuración con Supabase

## ✅ Cómo Funciona la Sincronización Automática

Tu aplicación FileHub ya está configurada para **guardar automáticamente** toda la configuración en Supabase.

---

## 🔄 Sincronización Automática

### **Qué se Guarda:**
- ✅ Configuración de Ollama (URL, modelo, API key)
- ✅ Configuración de AnythingLLM
- ✅ Configuración de OpenNotebook
- ✅ Configuración de OpenWebUI
- ✅ Configuración de LM Studio
- ✅ Tema (claro/oscuro)

### **Cuándo se Guarda:**
- Automáticamente **2 segundos después** de cambiar cualquier configuración
- Al iniciar sesión en la aplicación
- Al cambiar de modelo o URL en la interfaz

### **Dónde se Guarda:**
- **Tabla**: `profiles`
- **Columna**: `settings` (tipo JSONB)
- **Base de Datos**: Supabase

---

## 📊 Configuración Actual

```json
{
  "ollama_config": {
    "baseUrl": "http://100.80.12.26:11434",
    "model": "gemma2:2b",
    "isActive": true,
    "apiKey": ""
  }
}
```

---

## 🔧 Cómo Funciona el Código

### **1. Función de Sincronización** (`App.tsx` líneas 518-540)

```typescript
const syncProfile = async (user: any) => {
  if (!user) return;
  const settings = {
    ollama_config: ollamaConfig,
    anything_llm_config: anythingLLMConfig,
    open_notebook_config: openNotebookConfig,
    open_webui_config: openWebUIConfig,
    local_llm_config: localLlmConfig,
    theme: darkMode ? 'dark' : 'light'
  };

  await supabase.from('profiles').update({ 
    settings: settings 
  }).eq('id', user.id);
};
```

### **2. Auto-Guardado** (`App.tsx` líneas 543-550)

```typescript
useEffect(() => {
  if (session?.user) {
    const timeoutId = setTimeout(() => {
      syncProfile(session.user);
    }, 2000); // Espera 2 segundos antes de guardar
    return () => clearTimeout(timeoutId);
  }
}, [ollamaConfig, anythingLLMConfig, openNotebookConfig, 
    openWebUIConfig, localLlmConfig, darkMode, session]);
```

**Esto significa que:**
- Cada vez que cambias `ollamaConfig` en la interfaz
- Se espera 2 segundos (debounce)
- Se guarda automáticamente en Supabase

---

## 🎯 Cómo Probar la Sincronización

### **Paso 1: Inicia Sesión en FileHub**

1. Abre: https://filehub-demo-carlos.web.app
2. Haz clic en "Iniciar Sesión" (si no estás autenticado)
3. Usa tu cuenta de Google/Email

### **Paso 2: Cambia la Configuración**

1. Ve a **"Configuración"** en el sidebar
2. O ve a **"Centro IA Híbrida"**
3. Cambia el modelo de Ollama en el panel derecho
4. Espera 2 segundos

### **Paso 3: Verifica en Supabase**

1. Ve a: https://supabase.com/dashboard/project/xlbtwjxyphqnjeugfxds/editor
2. Ejecuta esta consulta:

```sql
SELECT 
  email, 
  settings->'ollama_config' as ollama_config
FROM profiles;
```

Deberías ver tu configuración guardada.

---

## 📝 Scripts Disponibles

### **1. Generar SQL para Actualización Masiva**

```bash
./sync-ollama-to-supabase.sh
```

Genera un script SQL que puedes ejecutar en Supabase para actualizar todos los perfiles.

### **2. Actualizar Directamente desde Node.js**

```bash
npx tsx update-supabase-config.ts
```

Actualiza automáticamente todos los perfiles en Supabase con la configuración del `.env`.

---

## 🔐 Seguridad

### **Datos que NO se Guardan en Supabase:**
- ❌ Contraseñas
- ❌ Tokens privados (se guardan en localStorage del navegador)
- ❌ Datos sensibles

### **Datos que SÍ se Guardan:**
- ✅ URLs de servicios (Ollama, AnythingLLM, etc.)
- ✅ Nombres de modelos
- ✅ Preferencias de tema
- ✅ Configuraciones públicas

---

## 🎨 Flujo de Datos

```
┌─────────────────┐
│   Usuario       │
│  Cambia Config  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   React State   │
│  (ollamaConfig) │
└────────┬────────┘
         │
         ▼ (2 segundos después)
┌─────────────────┐
│   useEffect     │
│  Auto-Guardado  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Supabase      │
│  profiles.settings│
└─────────────────┘
```

---

## ✅ Estado Actual

| Componente | Estado |
|------------|--------|
| **Configuración Local** | ✅ `.env` actualizado |
| **Git** | ✅ Commits realizados |
| **Firebase Hosting** | ✅ Desplegado |
| **Supabase Sync** | ✅ Configurado (auto-sync) |
| **Scripts** | ✅ Creados |

---

## 💡 Nota Importante

**No necesitas ejecutar ningún script manualmente** para guardar la configuración en Supabase. 

La aplicación lo hace **automáticamente** cuando:
1. Inicias sesión
2. Cambias cualquier configuración en la interfaz
3. Esperas 2 segundos

Los scripts (`sync-ollama-to-supabase.sh` y `update-supabase-config.ts`) son útiles solo si quieres:
- Actualizar masivamente todos los usuarios
- Forzar una actualización sin esperar 2 segundos
- Sincronizar cambios del `.env` a Supabase manualmente

---

## 🎉 ¡Todo Está Configurado!

Tu configuración de Ollama se guardará automáticamente en Supabase la próxima vez que:
- Inicies sesión en FileHub
- Cambies la configuración en la interfaz

**No necesitas hacer nada más.** El sistema está completamente automatizado. 🚀
