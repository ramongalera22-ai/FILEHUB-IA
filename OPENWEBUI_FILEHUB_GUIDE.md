# 🎨 Guía: Open WebUI en FileHub (Firebase)

## 🎯 Objetivo

Hacer que Open WebUI aparezca como un chat en FileHub cuando accedes desde `https://filehub-demo-carlos.web.app`.

---

## ⚠️ Problema Actual

Open WebUI está corriendo en `http://localhost:8081`, que **solo es accesible desde tu Mac local**. Cuando accedes a FileHub desde Firebase, no puede conectarse a `localhost`.

---

## ✅ Soluciones Disponibles

### **Opción 1: Usar Modo "Ollama" (Recomendado) ⭐**

**Ya está configurado y funcionando:**

1. Abre: `https://filehub-demo-carlos.web.app`
2. Ve a: "Centro IA Híbrida"
3. El modo "OLLAMA" ya está seleccionado por defecto
4. Escribe tu pregunta y chatea

**Ventajas:**
- ✅ Ya funciona con Tailscale
- ✅ Más rápido
- ✅ Más simple
- ✅ No requiere configuración adicional

---

### **Opción 2: Exponer Open WebUI con Tailscale**

Para que Open WebUI sea accesible desde Firebase:

#### **Paso 1: Verificar que Open WebUI esté corriendo**

```bash
# Ver estado
docker ps | grep open-webui

# Ver logs
docker logs open-webui --tail 20

# Probar acceso local
open http://localhost:8081
```

#### **Paso 2: La URL ya está configurada**

Open WebUI ya está configurado para usar Tailscale:
```
http://100.80.12.26:8081
```

#### **Paso 3: Acceder desde FileHub**

1. Abre: `https://filehub-demo-carlos.web.app`
2. Presiona: `Cmd + Shift + R` (forzar recarga)
3. Ve a: "Centro IA Híbrida"
4. Haz clic en: Botón "OPENWEBUI" (verde)
5. Deberías ver: Open WebUI en un iframe

**Si ves el mensaje "Conexión Local Requerida":**
- Haz clic en los botones de navegación en la parte superior
- Selecciona "OLLAMA" para chatear directamente

---

### **Opción 3: Exponer Open WebUI con Cloudflare Tunnel**

Si Tailscale no funciona, usa Cloudflare Tunnel:

```bash
# Crear túnel temporal
cloudflared tunnel --url http://localhost:8081

# Copiar la URL que te da (ej: https://abc-123.trycloudflare.com)

# Actualizar .env
VITE_OPEN_WEBUI_URL=https://abc-123.trycloudflare.com

# Reconstruir y desplegar
npm run build && firebase deploy --only hosting
```

---

## 🎨 Cómo Se Verá

### **Modo "OLLAMA" (Actual):**
```
┌─────────────────────────────────────┐
│  Centro de Inteligencia Híbrida     │
├─────────────────────────────────────┤
│  [Cloud] [OLLAMA] [Knowledge] ...   │ ← Botones de modo
├─────────────────────────────────────┤
│                                     │
│  💬 Chat Interface                  │
│                                     │
│  User: Hola                         │
│  AI: ¡Hola! ¿En qué puedo ayudarte? │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Escribe tu mensaje...       │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### **Modo "OPENWEBUI" (Con iframe):**
```
┌─────────────────────────────────────┐
│  Centro de Inteligencia Híbrida     │
├─────────────────────────────────────┤
│  [Cloud] [Ollama] [OPENWEBUI] ...   │ ← Botones de modo
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │   Open WebUI (iframe)       │   │
│  │                             │   │
│  │   [Interfaz completa de     │   │
│  │    Open WebUI integrada]    │   │
│  │                             │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## 🐛 Solución de Problemas

### **"No veo Open WebUI en el iframe"**

1. Verifica que Open WebUI esté corriendo:
   ```bash
   docker ps | grep open-webui
   ```

2. Verifica que sea accesible:
   ```bash
   curl http://localhost:8081
   ```

3. Limpia la caché del navegador:
   - Presiona `Cmd + Shift + R`

### **"Veo el mensaje de Conexión Local Requerida"**

Esto es normal cuando accedes desde Firebase. Opciones:

1. **Usa el modo "OLLAMA"** (haz clic en el botón OLLAMA en la parte superior)
2. **Accede desde localhost**: `http://localhost:3000`
3. **Configura Cloudflare Tunnel** (ver Opción 3 arriba)

---

## 📊 Estado Actual

| Componente | Estado | URL |
|------------|--------|-----|
| **Open WebUI** | ⏳ Iniciando | `http://localhost:8081` |
| **Ollama** | ✅ Funcionando | `http://100.80.12.26:11434` |
| **FileHub Local** | ✅ Running | `http://localhost:3000` |
| **FileHub Firebase** | ✅ Deployed | `https://filehub-demo-carlos.web.app` |
| **Tailscale** | ✅ Activo | IP: `100.80.12.26` |

---

## 🎉 Próximos Pasos

1. **Espera a que Open WebUI termine de iniciar** (2-3 minutos)
2. **Verifica que funciona localmente**: `http://localhost:8081`
3. **Accede a FileHub**: `https://filehub-demo-carlos.web.app`
4. **Usa el modo "OLLAMA"** para chatear (ya funciona)
5. **O prueba el modo "OPENWEBUI"** si quieres el iframe

---

**Recomendación Final:** Usa el modo "OLLAMA" directamente. Es más simple, más rápido, y ya está funcionando perfectamente con Tailscale. 🚀
