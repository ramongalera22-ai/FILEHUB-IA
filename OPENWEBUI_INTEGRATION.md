# 🎯 Guía Completa: Open WebUI + Ollama en FileHub

## ✅ ¡Implementación Completada!

He integrado Open WebUI en tu aplicación FileHub con detección inteligente de entorno.

---

## 🌐 Cómo Funciona

### **Cuando accedes desde `localhost:3000`:**
- ✅ Verás Open WebUI integrado en un iframe
- ✅ Podrás chatear con tu Ollama local directamente
- ✅ Interfaz completa de Open WebUI dentro de FileHub

### **Cuando accedes desde `https://filehub-demo-carlos.web.app`:**
- ℹ️ Verás un mensaje explicativo elegante
- ℹ️ Te mostrará 3 opciones para chatear con tu IA
- ℹ️ Incluye un botón para cambiar al modo "Ollama" integrado

---

## 🚀 Cómo Usar

### **Opción 1: Acceso Local (Recomendado)**

1. **Abre FileHub localmente:**
   ```
   http://localhost:3000
   ```

2. **Ve a "IA Hub"** (icono de cerebro en el sidebar)

3. **Selecciona el botón "OpenWebUI"** en la parte superior

4. **¡Listo!** Verás la interfaz completa de Open WebUI integrada

### **Opción 2: Modo Ollama Directo**

Si prefieres no usar iframe:

1. **Ve a "IA Hub"**
2. **Selecciona el botón "Ollama"**
3. **Chatea directamente** con tu modelo `gemma2:9b`

### **Opción 3: Desde Firebase (Acceso Remoto)**

Para acceder a tu Ollama local desde internet:

#### **Usando Cloudflare Tunnel (Recomendado):**

```bash
# 1. Instalar cloudflared
brew install cloudflare/cloudflare/cloudflared

# 2. Crear un túnel para Ollama
cloudflared tunnel --url http://localhost:11434

# 3. Copiar la URL pública que te da (ej: https://abc123.trycloudflare.com)

# 4. Actualizar tu .env:
VITE_OLLAMA_URL=https://abc123.trycloudflare.com
```

#### **Usando ngrok:**

```bash
# 1. Instalar ngrok
brew install ngrok

# 2. Crear un túnel
ngrok http 11434

# 3. Copiar la URL pública (ej: https://abc123.ngrok.io)

# 4. Actualizar tu .env:
VITE_OLLAMA_URL=https://abc123.ngrok.io
```

---

## 📊 Estado Actual de tu Configuración

### **Servicios Activos:**
- ✅ **Ollama**: `http://localhost:11434` (Modelo: `gemma2:9b`)
- ✅ **FileHub Local**: `http://localhost:3000`
- ✅ **FileHub Firebase**: `https://filehub-demo-carlos.web.app`
- ✅ **AnythingLLM**: `http://localhost:3001/api/v1`

### **Configuración Actual (.env):**
```env
# Ollama Local
VITE_OLLAMA_URL=http://localhost:11434
VITE_OLLAMA_MODEL=gemma2:9b
VITE_OLLAMA_API_KEY=

# AnythingLLM
VITE_ANYTHING_LLM_URL=http://localhost:3001/api/v1
VITE_ANYTHING_LLM_API_KEY=02NC02W-P4Z45JV-MMNPM95-2N5GD35
VITE_ANYTHING_LLM_WORKSPACE=filehub-ia
```

---

## 🎨 Interfaz de IA Hub

Tu centro de IA ahora tiene **6 modos diferentes**:

| Modo | Descripción | Estado |
|------|-------------|--------|
| **Cloud** | Gemini Cloud (Google) | ✅ Siempre disponible |
| **Ollama** | Chat directo con Ollama | ✅ Local |
| **Knowledge** | Open Notebook LM | ⚠️ Requiere configuración |
| **AnythingLLM** | Gestión de documentos con IA | ✅ Configurado |
| **OpenWebUI** | Interfaz completa de Open WebUI | ✅ Solo local |
| **LM Studio** | Servidor LLM local alternativo | ⚠️ Requiere LM Studio |

---

## 🔧 Configuración de Open WebUI

### **URL por Defecto:**
```
http://localhost:3000
```

⚠️ **Nota**: Si Open WebUI está en otro puerto, actualízalo en:
- **IA Hub** → Sección "OpenWebUI Config" → Base URL

### **Para Cambiar el Puerto de Open WebUI:**

Si Open WebUI y FileHub están en conflicto (ambos en puerto 3000):

```bash
# Opción 1: Cambiar puerto de FileHub
# Edita vite.config.ts y agrega:
server: {
  port: 3001
}

# Opción 2: Cambiar puerto de Open WebUI
# Al iniciar Open WebUI, usa:
docker run -p 8080:8080 ghcr.io/open-webui/open-webui:main
```

---

## 🎯 Prueba Ahora Mismo

### **1. Prueba Local:**
```bash
# Asegúrate de que Ollama esté corriendo
ollama list

# Abre FileHub local
open http://localhost:3000

# Ve a IA Hub → Selecciona "OpenWebUI"
```

### **2. Prueba en Firebase:**
```bash
# Abre tu app en Firebase
open https://filehub-demo-carlos.web.app

# Ve a IA Hub → Selecciona "OpenWebUI"
# Verás el mensaje informativo elegante
```

---

## 📸 Capturas de Pantalla Esperadas

### **En Localhost:**
- Verás la interfaz completa de Open WebUI integrada
- Podrás chatear con `gemma3:4b` o cualquier modelo que tengas
- Historial de conversaciones en el sidebar

### **En Firebase:**
- Verás un mensaje elegante con:
  - Icono grande de Layout
  - Título "🔒 Conexión Local Requerida"
  - 3 opciones numeradas con tarjetas
  - Botón "Cambiar a Modo Ollama"

---

## 🐛 Solución de Problemas

### **"No veo Open WebUI en localhost"**

1. Verifica que Open WebUI esté corriendo:
   ```bash
   # Si usas Docker:
   docker ps | grep webui
   
   # Si no está corriendo:
   docker run -d -p 3000:8080 ghcr.io/open-webui/open-webui:main
   ```

2. Verifica la URL en FileHub:
   - Ve a IA Hub → OpenWebUI Config
   - Asegúrate de que la URL sea correcta

### **"El iframe está en blanco"**

Esto puede ser por CORS. Solución:

```bash
# Reinicia Open WebUI con headers CORS:
docker run -d -p 3000:8080 \
  -e WEBUI_AUTH=false \
  ghcr.io/open-webui/open-webui:main
```

### **"Quiero usar Open WebUI en un puerto diferente"**

```bash
# Cambia el puerto en la configuración de FileHub:
# IA Hub → OpenWebUI Config → Base URL
# Ejemplo: http://localhost:8080
```

---

## 🔐 Seguridad y Privacidad

### **¿Por qué no funciona desde Firebase?**

Por razones de seguridad, los navegadores **bloquean** las conexiones desde sitios HTTPS (como Firebase) a servicios HTTP locales (como `localhost:11434`). Esto se llama **Mixed Content Blocking**.

### **Soluciones:**

1. **Usa localhost** (más seguro, sin exposición a internet)
2. **Usa Cloudflare Tunnel** (seguro, con autenticación)
3. **Usa ngrok** (temporal, para pruebas)

---

## 📚 Recursos Adicionales

- **Open WebUI Docs**: https://docs.openwebui.com
- **Ollama Models**: https://ollama.com/library
- **Cloudflare Tunnel**: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- **ngrok**: https://ngrok.com/docs

---

## ✨ Próximos Pasos Sugeridos

1. **Instala más modelos de Ollama:**
   ```bash
   ollama pull llama3
   ollama pull mistral
   ollama pull codellama
   ```

2. **Configura Cloudflare Tunnel** para acceso remoto seguro

3. **Explora AnythingLLM** para gestión de documentos con RAG

4. **Personaliza Open WebUI** con tus propios prompts y configuraciones

---

**¿Necesitas ayuda?** Abre el archivo `CONEXION_OLLAMA.md` para más detalles sobre la configuración de Ollama.

---

## 🎉 ¡Disfruta de tu IA Local!

Ahora tienes una interfaz completa de chat con IA integrada en FileHub, con detección inteligente de entorno y múltiples opciones de conexión.

**Desplegado en**: https://filehub-demo-carlos.web.app ✅
