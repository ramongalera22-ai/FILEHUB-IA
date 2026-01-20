# 🌐 Guía de Acceso Remoto: Tailscale vs Cloudflare Tunnel

## 🎯 Objetivo

Permitir que tu aplicación FileHub en Firebase (`https://filehub-demo-carlos.web.app`) se conecte a tu Ollama local.

---

## ✅ **Opción 1: Tailscale (Recomendado)**

### **¿Por qué Tailscale?**
- ✅ Más fácil de configurar (3 pasos)
- ✅ Conexión peer-to-peer (más rápida)
- ✅ No necesita configuración de DNS
- ✅ Gratis para uso personal (hasta 100 dispositivos)
- ✅ Más seguro (VPN privada)
- ✅ Funciona en cualquier red (incluso detrás de NAT)

### **Instalación y Configuración:**

#### **Paso 1: Instalar Tailscale**

```bash
# Instalar Tailscale en Mac
brew install tailscale

# Iniciar el servicio
sudo tailscaled install-system-daemon

# Iniciar Tailscale
tailscale up
```

Esto abrirá tu navegador para que inicies sesión con tu cuenta de Tailscale (Google, Microsoft, etc.).

#### **Paso 2: Obtener tu IP de Tailscale**

```bash
# Ver tu IP de Tailscale
tailscale ip -4

# Ejemplo de salida: 100.80.12.26
```

Copia esta IP, la necesitarás en el siguiente paso.

#### **Paso 3: Configurar MagicDNS (Opcional pero Recomendado)**

```bash
# Habilitar MagicDNS en Tailscale Admin Console
# Ve a: https://login.tailscale.com/admin/dns

# Activa "MagicDNS"
# Ahora puedes usar: http://nombre-de-tu-mac.tail-scale.ts.net
```

#### **Paso 4: Actualizar FileHub**

Edita tu archivo `.env`:

```env
# Opción A: Usando IP de Tailscale
VITE_OLLAMA_URL=http://100.80.12.26:11434

# Opción B: Usando MagicDNS (recomendado)
VITE_OLLAMA_URL=http://carlos-macbook.tail-scale.ts.net:11434
```

**Nota**: Reemplaza `100.80.12.26` con tu IP de Tailscale y `carlos-macbook` con el nombre de tu Mac en Tailscale.

#### **Paso 5: Verificar la Conexión**

```bash
# Desde otro dispositivo conectado a Tailscale:
curl http://100.80.12.26:11434/api/tags

# O usando MagicDNS:
curl http://carlos-macbook.tail-scale.ts.net:11434/api/tags
```

#### **Paso 6: Reconstruir y Desplegar**

```bash
# Reconstruir con la nueva configuración
npm run build

# Desplegar a Firebase
firebase deploy --only hosting
```

---

## 🔧 **Opción 2: Cloudflare Tunnel**

### **¿Por qué Cloudflare Tunnel?**
- ✅ No necesita VPN
- ✅ URL pública accesible desde cualquier lugar
- ✅ Gratis
- ⚠️ Más complejo de configurar
- ⚠️ Requiere cuenta de Cloudflare

### **Instalación y Configuración:**

#### **Paso 1: Instalar Cloudflared**

```bash
# Instalar cloudflared
brew install cloudflare/cloudflare/cloudflared

# Verificar instalación
cloudflared --version
```

#### **Paso 2: Autenticarse con Cloudflare**

```bash
# Iniciar sesión (abrirá tu navegador)
cloudflared tunnel login
```

#### **Paso 3: Crear un Túnel Permanente**

```bash
# Crear túnel con nombre
cloudflared tunnel create ollama-tunnel

# Esto creará un archivo de credenciales en:
# ~/.cloudflared/<TUNNEL-ID>.json
```

#### **Paso 4: Configurar el Túnel**

Crea un archivo de configuración:

```bash
# Crear directorio de configuración
mkdir -p ~/.cloudflared

# Crear archivo de configuración
cat > ~/.cloudflared/config.yml << EOF
tunnel: ollama-tunnel
credentials-file: /Users/carlos/.cloudflared/<TUNNEL-ID>.json

ingress:
  - hostname: ollama.tudominio.com
    service: http://localhost:11434
  - service: http_status:404
EOF
```

**Nota**: Reemplaza `<TUNNEL-ID>` con el ID que te dio el comando anterior y `tudominio.com` con tu dominio.

#### **Paso 5: Configurar DNS**

```bash
# Crear registro DNS
cloudflared tunnel route dns ollama-tunnel ollama.tudominio.com
```

#### **Paso 6: Iniciar el Túnel**

```bash
# Iniciar túnel en primer plano (para pruebas)
cloudflared tunnel run ollama-tunnel

# O como servicio (permanente)
cloudflared service install
sudo launchctl start com.cloudflare.cloudflared
```

#### **Paso 7: Actualizar FileHub**

```env
# En tu .env
VITE_OLLAMA_URL=https://ollama.tudominio.com
```

---

## 🚀 **Opción 3: Túnel Temporal de Cloudflare (Más Fácil)**

Si solo quieres probar rápidamente sin configurar dominio:

```bash
# Crear túnel temporal
cloudflared tunnel --url http://localhost:11434
```

Esto te dará una URL temporal como:
```
https://abc-123-def.trycloudflare.com
```

**Actualiza tu `.env`:**
```env
VITE_OLLAMA_URL=https://abc-123-def.trycloudflare.com
```

⚠️ **Importante**: Esta URL cambia cada vez que reinicias el túnel.

---

## 📊 **Comparación de Opciones**

| Característica | Tailscale | Cloudflare Tunnel (Permanente) | Cloudflare Tunnel (Temporal) |
|----------------|-----------|-------------------------------|------------------------------|
| **Facilidad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Velocidad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Seguridad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Permanente** | ✅ | ✅ | ❌ |
| **Requiere VPN** | ✅ | ❌ | ❌ |
| **Requiere Dominio** | ❌ | ✅ | ❌ |
| **Costo** | Gratis | Gratis | Gratis |

---

## 🎯 **Recomendación**

### **Para Uso Personal:**
👉 **Usa Tailscale**
- Más fácil de configurar
- Más rápido (conexión directa)
- Más seguro (VPN privada)
- No necesita dominio

### **Para Compartir con Otros:**
👉 **Usa Cloudflare Tunnel Permanente**
- Accesible desde cualquier lugar sin VPN
- URL pública estable
- Ideal si quieres que otros accedan

### **Para Pruebas Rápidas:**
👉 **Usa Cloudflare Tunnel Temporal**
- Configuración en 1 comando
- Perfecto para demos

---

## 🔒 **Consideraciones de Seguridad**

### **Tailscale:**
- ✅ Solo tú y dispositivos autorizados pueden acceder
- ✅ Encriptación end-to-end
- ✅ No expone tu IP pública

### **Cloudflare Tunnel:**
- ⚠️ URL pública accesible desde internet
- ⚠️ Debes implementar autenticación en Ollama
- ✅ Cloudflare proporciona protección DDoS

---

## 📝 **Script de Instalación Rápida (Tailscale)**

He creado un script para automatizar la configuración de Tailscale:

```bash
#!/bin/bash

echo "🚀 Configurando Tailscale para Ollama..."

# 1. Instalar Tailscale
if ! command -v tailscale &> /dev/null; then
    echo "📦 Instalando Tailscale..."
    brew install tailscale
    sudo tailscaled install-system-daemon
fi

# 2. Iniciar Tailscale
echo "🔐 Iniciando Tailscale..."
tailscale up

# 3. Obtener IP
TAILSCALE_IP=$(tailscale ip -4)
echo "✅ Tu IP de Tailscale es: $TAILSCALE_IP"

# 4. Obtener hostname
TAILSCALE_HOSTNAME=$(tailscale status --json | grep -o '"HostName":"[^"]*"' | cut -d'"' -f4)
echo "✅ Tu hostname de Tailscale es: $TAILSCALE_HOSTNAME"

# 5. Actualizar .env
echo ""
echo "📝 Actualiza tu archivo .env con:"
echo "VITE_OLLAMA_URL=http://$TAILSCALE_IP:11434"
echo ""
echo "O usando MagicDNS:"
echo "VITE_OLLAMA_URL=http://$TAILSCALE_HOSTNAME.tail-scale.ts.net:11434"

# 6. Verificar Ollama
echo ""
echo "🧪 Verificando Ollama..."
curl -s http://localhost:11434/api/tags > /dev/null && echo "✅ Ollama está corriendo" || echo "❌ Ollama no está corriendo"

echo ""
echo "🎉 ¡Configuración completada!"
echo "Ahora ejecuta: npm run build && firebase deploy --only hosting"
```

Guarda esto como `setup-tailscale.sh` y ejecútalo:

```bash
chmod +x setup-tailscale.sh
./setup-tailscale.sh
```

---

## 🐛 **Solución de Problemas**

### **Tailscale: "No puedo conectarme"**

```bash
# Verificar estado de Tailscale
tailscale status

# Reiniciar Tailscale
tailscale down
tailscale up

# Verificar que Ollama esté escuchando en todas las interfaces
# Edita la configuración de Ollama para permitir conexiones externas
```

### **Cloudflare: "Túnel no funciona"**

```bash
# Verificar logs del túnel
cloudflared tunnel info ollama-tunnel

# Reiniciar el túnel
sudo launchctl stop com.cloudflare.cloudflared
sudo launchctl start com.cloudflare.cloudflared
```

### **"CORS Error" al conectar**

Ollama necesita permitir CORS desde tu dominio de Firebase:

```bash
# Configurar Ollama para permitir CORS
# Edita: ~/Library/Application Support/Ollama/config.json
{
  "origins": [
    "https://filehub-demo-carlos.web.app",
    "http://localhost:3000"
  ]
}

# Reinicia Ollama
```

---

## 📚 **Recursos Adicionales**

- **Tailscale Docs**: https://tailscale.com/kb/
- **Cloudflare Tunnel Docs**: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- **Ollama CORS Config**: https://github.com/ollama/ollama/blob/main/docs/faq.md#how-do-i-configure-ollama-server

---

## ✅ **Próximos Pasos**

1. **Elige tu opción** (recomiendo Tailscale)
2. **Sigue la guía de instalación**
3. **Actualiza tu `.env`**
4. **Reconstruye y despliega**: `npm run build && firebase deploy`
5. **Prueba desde Firebase**: `https://filehub-demo-carlos.web.app`

---

**¿Necesitas ayuda con la configuración?** ¡Solo dime qué opción prefieres y te guío paso a paso! 🚀
