# 🤖 Guía de Configuración: Ollama + AnythingLLM

## ✅ Estado Actual

### Ollama (Configurado y Funcionando)
- ✅ **Estado**: Corriendo en `http://localhost:11434`
- ✅ **Modelos instalados**:
  - `gemma3:1b` (999.89M)
  - `gemma3:4b` (4.3B) ← **Configurado por defecto**
  - `mxbai-embed-large` (334M) - Para embeddings

## 📋 Configuración de AnythingLLM

### Paso 1: Instalar AnythingLLM

```bash
# Opción 1: Usando Docker (Recomendado)
docker run -d \
  --name anythingllm \
  -p 3001:3001 \
  -v anythingllm-storage:/app/server/storage \
  -e STORAGE_DIR="/app/server/storage" \
  mintplexlabs/anythingllm:latest

# Opción 2: Descarga la aplicación de escritorio
# https://anythingllm.com/download
```

### Paso 2: Configurar AnythingLLM

1. **Abre AnythingLLM**: http://localhost:3001
2. **Configuración Inicial**:
   - Crea una cuenta (local, no requiere internet)
   - Configura el LLM Provider:
     - Selecciona "Ollama"
     - URL: `http://host.docker.internal:11434` (si usas Docker)
     - O: `http://localhost:11434` (si usas la app de escritorio)
     - Modelo: `gemma3:4b`

3. **Crear Workspace**:
   - Nombre: `filehub-ia`
   - Configuración: Usa Ollama como LLM

4. **Obtener API Key**:
   - Ve a Settings → API Keys
   - Crea una nueva API Key
   - Copia la clave

### Paso 3: Configurar FileHub

Edita el archivo `.env` en el proyecto:

```env
# AnythingLLM Configuration
VITE_ANYTHING_LLM_URL=http://localhost:3001/api/v1
VITE_ANYTHING_LLM_API_KEY=TU_API_KEY_AQUI
VITE_ANYTHING_LLM_WORKSPACE=filehub-ia
```

### Paso 4: Reconstruir FileHub

```bash
cd "/Users/carlos/Downloads/copy-of-filehub---auditoría-inteligente-2 (1)/FILEHUB-IA"
docker-compose down
docker-compose up -d --build
```

## 🔧 Comandos Útiles de Ollama

```bash
# Ver modelos instalados
ollama list

# Descargar un nuevo modelo
ollama pull llama3

# Probar un modelo
ollama run gemma3:4b "Hola, ¿cómo estás?"

# Ver información del sistema
curl http://localhost:11434/api/tags

# Detener Ollama
# En Mac: Cierra la app desde la barra de menú
```

## 🧪 Probar la Integración

### Probar Ollama directamente:

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "gemma3:4b",
  "prompt": "¿Qué es FileHub?",
  "stream": false
}'
```

### Probar AnythingLLM (después de configurar):

```bash
curl http://localhost:3001/api/v1/workspace/filehub-ia/chat \
  -H "Authorization: Bearer TU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hola, ¿cómo funciona esto?",
    "mode": "chat"
  }'
```

## 📊 Uso en FileHub

Una vez configurado, podrás usar Ollama y AnythingLLM en:

1. **Centro IA Híbrida** (`/ai-hub`):
   - Chat con documentos usando Ollama
   - Gestión de workspaces de AnythingLLM

2. **Work Hub** (`/work`):
   - Chat con documentos de trabajo
   - Generación de presentaciones con Ollama

3. **Configuración** (`/settings`):
   - Cambiar modelo de Ollama
   - Configurar URL de AnythingLLM
   - Actualizar API keys

## 🔒 Seguridad

- ✅ Ollama corre localmente, tus datos no salen de tu máquina
- ✅ AnythingLLM también es local y privado
- ✅ No se envían datos a servicios externos
- ⚠️ Guarda tu API key de AnythingLLM de forma segura

## 🐛 Solución de Problemas

### Ollama no responde:
```bash
# Verifica que esté corriendo
curl http://localhost:11434/api/tags

# Si no responde, reinicia Ollama
# Mac: Cierra y abre la app desde Aplicaciones
```

### AnythingLLM no conecta con Ollama:
- Si usas Docker para AnythingLLM, usa: `http://host.docker.internal:11434`
- Si usas la app de escritorio, usa: `http://localhost:11434`

### FileHub no detecta los servicios:
```bash
# Reconstruye con las nuevas variables de entorno
docker-compose down
docker-compose up -d --build
```

## 📱 Acceso Remoto (Opcional)

Para acceder a Ollama desde otros dispositivos:

```bash
# Edita la configuración de Ollama para permitir conexiones externas
# Mac: Ollama → Settings → Allow connections from network
```

---

**¡Listo!** Con esta configuración tendrás IA local completamente privada en FileHub. 🚀
