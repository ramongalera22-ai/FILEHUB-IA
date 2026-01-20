# 🚀 FileHub - Acceso Remoto a Ollama

## ✅ ¡Todo Configurado y Guardado!

Todos los cambios han sido guardados en Git:
- ✅ Integración de Open WebUI con detección de entorno
- ✅ Scripts de configuración para Tailscale y Cloudflare Tunnel
- ✅ Documentación completa
- ✅ Configuración de Ollama local

---

## 🎯 ¿Qué Sigue?

Tienes **3 opciones** para acceder a tu Ollama local desde Firebase:

### **Opción 1: Tailscale (⭐ RECOMENDADO)**

**Por qué elegir Tailscale:**
- ✅ Más fácil de configurar (solo 3 comandos)
- ✅ Más rápido (conexión peer-to-peer)
- ✅ Más seguro (VPN privada)
- ✅ No requiere dominio
- ✅ Gratis para uso personal

**Instalación:**
```bash
# Ejecutar script automatizado
./setup-tailscale.sh

# Seguir las instrucciones en pantalla
# El script hará:
# 1. Instalar Tailscale
# 2. Obtener tu IP de Tailscale
# 3. Actualizar tu .env automáticamente
# 4. Verificar que Ollama sea accesible
```

---

### **Opción 2: Cloudflare Tunnel Permanente**

**Por qué elegir Cloudflare Tunnel Permanente:**
- ✅ URL pública estable
- ✅ No requiere VPN
- ✅ Protección DDoS incluida
- ⚠️ Requiere dominio propio
- ⚠️ Configuración más compleja

**Instalación:**
```bash
# Ejecutar script interactivo
./setup-cloudflare.sh

# Seleccionar opción 2 (Túnel permanente)
# Necesitarás:
# - Cuenta de Cloudflare
# - Dominio configurado en Cloudflare
```

---

### **Opción 3: Cloudflare Tunnel Temporal**

**Por qué elegir Cloudflare Tunnel Temporal:**
- ✅ Configuración en 1 comando
- ✅ Perfecto para pruebas rápidas
- ⚠️ URL cambia cada vez que reinicias
- ⚠️ No es permanente

**Instalación:**
```bash
# Opción A: Usar script
./setup-cloudflare.sh
# Seleccionar opción 1 (Túnel temporal)

# Opción B: Comando directo
cloudflared tunnel --url http://localhost:11434
# Copiar la URL que te da y actualizar .env
```

---

## 📋 Después de Configurar

Una vez que hayas elegido y configurado tu opción:

```bash
# 1. Verificar configuración
cat .env | grep VITE_OLLAMA_URL

# 2. Reconstruir aplicación
npm run build

# 3. Desplegar a Firebase
firebase deploy --only hosting

# 4. Probar desde Firebase
open https://filehub-demo-carlos.web.app
```

---

## 📚 Documentación Disponible

| Archivo | Descripción |
|---------|-------------|
| **`REMOTE_ACCESS_GUIDE.md`** | Guía completa de acceso remoto |
| **`OPENWEBUI_INTEGRATION.md`** | Integración de Open WebUI |
| **`CONEXION_OLLAMA.md`** | Configuración de Ollama |
| **`setup-tailscale.sh`** | Script automatizado de Tailscale |
| **`setup-cloudflare.sh`** | Script interactivo de Cloudflare |
| **`test-ollama.sh`** | Script de prueba de Ollama |

---

## 🎨 Interfaz Actual

### **En Localhost (`http://localhost:3000`):**
- ✅ Verás Open WebUI integrado en un iframe
- ✅ Podrás chatear con tu modelo `gemma2:9b`
- ✅ Interfaz completa de Open WebUI

### **En Firebase (`https://filehub-demo-carlos.web.app`):**
- ℹ️ Verás un mensaje elegante explicando las opciones
- ℹ️ 3 opciones numeradas con tarjetas
- ℹ️ Botón para cambiar al modo "Ollama" directo

---

## 🔧 Comandos Útiles

```bash
# Ver estado de Tailscale
tailscale status

# Ver IP de Tailscale
tailscale ip -4

# Probar Ollama local
./test-ollama.sh

# Ver logs de Cloudflare Tunnel
tail -f /tmp/cloudflare-tunnel.log

# Verificar modelos de Ollama
ollama list

# Probar conexión a Ollama
curl http://localhost:11434/api/tags
```

---

## 🐛 Solución de Problemas

### **"No puedo conectarme a Ollama desde Firebase"**

1. Verifica que el túnel esté corriendo:
   ```bash
   # Para Tailscale:
   tailscale status
   
   # Para Cloudflare:
   ps aux | grep cloudflared
   ```

2. Verifica que la URL en `.env` sea correcta:
   ```bash
   cat .env | grep VITE_OLLAMA_URL
   ```

3. Verifica que Ollama esté corriendo:
   ```bash
   curl http://localhost:11434/api/tags
   ```

### **"CORS Error"**

Ollama necesita permitir CORS desde tu dominio de Firebase. Ver `REMOTE_ACCESS_GUIDE.md` sección "Solución de Problemas".

---

## 📊 Estado Actual

| Componente | Estado | URL/Configuración |
|------------|--------|-------------------|
| **Ollama** | ✅ Configurado | `http://localhost:11434` |
| **Modelo** | ✅ Instalado | `gemma2:9b` |
| **FileHub Local** | ✅ Running | `http://localhost:3000` |
| **FileHub Firebase** | ✅ Deployed | `https://filehub-demo-carlos.web.app` |
| **Git** | ✅ Committed | 2 commits realizados |
| **Acceso Remoto** | ⏳ Pendiente | Elige tu opción arriba |

---

## 🎉 ¡Siguiente Paso!

**Elige tu opción favorita y ejecuta el script correspondiente:**

```bash
# Opción 1 (Recomendado):
./setup-tailscale.sh

# Opción 2:
./setup-cloudflare.sh
```

**Luego reconstruye y despliega:**

```bash
npm run build && firebase deploy --only hosting
```

---

## 💡 Recomendación

Para uso personal, **Tailscale es la mejor opción**:
- Configuración en 3 minutos
- Más rápido y seguro
- No necesita dominio
- Gratis para siempre

---

**¿Necesitas ayuda?** Revisa `REMOTE_ACCESS_GUIDE.md` para instrucciones detalladas.

**¿Todo listo?** ¡Ejecuta `./setup-tailscale.sh` y en 3 minutos estarás conectado! 🚀
