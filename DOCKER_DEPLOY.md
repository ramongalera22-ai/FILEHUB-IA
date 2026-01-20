# 🐳 FileHub - Guía de Despliegue Docker

Esta guía te ayudará a desplegar FileHub usando Docker en tu NAS o servidor.

## 📋 Requisitos Previos

- Docker instalado (versión 20.10 o superior)
- Docker Compose instalado (versión 1.29 o superior)
- Al menos 2GB de RAM disponible
- Puerto 8080 disponible (o modifica el puerto en docker-compose.yml)

## 🚀 Despliegue Rápido

### Opción 1: Usando Docker Compose (Recomendado)

```bash
# 1. Navega al directorio del proyecto
cd /ruta/a/FILEHUB-IA

# 2. Construye y levanta el contenedor
docker-compose up -d

# 3. Verifica que esté corriendo
docker-compose ps
```

La aplicación estará disponible en: `http://localhost:8080`

### Opción 2: Usando Docker directamente

```bash
# 1. Construir la imagen
docker build -t filehub:latest .

# 2. Ejecutar el contenedor
docker run -d \
  --name filehub-app \
  -p 8080:80 \
  --restart unless-stopped \
  filehub:latest

# 3. Verifica que esté corriendo
docker ps
```

## 🔧 Configuración Personalizada

### Cambiar el Puerto

Edita `docker-compose.yml` y cambia el puerto:

```yaml
ports:
  - "TU_PUERTO:80"  # Por ejemplo: "3000:80"
```

### Variables de Entorno

Si necesitas configurar variables de entorno, crea un archivo `.env` en el directorio raíz:

```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima
VITE_GEMINI_API_KEY=tu_clave_gemini
```

Luego actualiza `docker-compose.yml`:

```yaml
services:
  filehub:
    env_file:
      - .env
```

## 📊 Comandos Útiles

### Ver logs
```bash
docker-compose logs -f
```

### Detener la aplicación
```bash
docker-compose down
```

### Reiniciar la aplicación
```bash
docker-compose restart
```

### Actualizar la aplicación
```bash
# 1. Detener y eliminar el contenedor actual
docker-compose down

# 2. Reconstruir la imagen
docker-compose build --no-cache

# 3. Levantar de nuevo
docker-compose up -d
```

### Limpiar todo (contenedores, imágenes, volúmenes)
```bash
docker-compose down -v
docker rmi filehub:latest
```

## 🌐 Acceso desde Otros Dispositivos

Para acceder desde otros dispositivos en tu red local:

1. Encuentra la IP de tu servidor/NAS:
   ```bash
   hostname -I
   ```

2. Accede desde cualquier dispositivo en la misma red:
   ```
   http://IP_DE_TU_SERVIDOR:8080
   ```

   Por ejemplo: `http://192.168.1.100:8080`

## 🔒 Configuración con HTTPS (Opcional)

Para usar HTTPS, puedes usar un reverse proxy como Nginx Proxy Manager o Traefik.

### Ejemplo con Nginx Proxy Manager:

1. Instala Nginx Proxy Manager
2. Crea un nuevo Proxy Host
3. Apunta a `filehub-app:80`
4. Habilita SSL con Let's Encrypt

## 🐛 Solución de Problemas

### El contenedor no inicia

```bash
# Ver logs detallados
docker-compose logs

# Verificar que el puerto no esté en uso
sudo lsof -i :8080
```

### La aplicación no carga

```bash
# Verificar que el contenedor esté corriendo
docker ps

# Reiniciar el contenedor
docker-compose restart
```

### Error de permisos

```bash
# Asegúrate de tener permisos para Docker
sudo usermod -aG docker $USER
# Luego cierra sesión y vuelve a iniciar
```

## 📦 Estructura de Archivos Docker

```
FILEHUB-IA/
├── Dockerfile              # Configuración de la imagen Docker
├── docker-compose.yml      # Orquestación de contenedores
├── nginx.conf             # Configuración de Nginx
├── .dockerignore          # Archivos a ignorar en el build
└── DOCKER_DEPLOY.md       # Esta guía
```

## 🔄 Actualización Automática

Para configurar actualizaciones automáticas, puedes usar Watchtower:

```bash
docker run -d \
  --name watchtower \
  -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower \
  filehub-app
```

## 💾 Backup de Datos

Los datos de la aplicación se almacenan en IndexedDB en el navegador del usuario. Para hacer backup:

1. Exporta los datos desde la aplicación (si implementas esta función)
2. O usa las herramientas de desarrollo del navegador para exportar IndexedDB

## 📱 Acceso Móvil

Puedes acceder a FileHub desde tu móvil usando:
- La IP local: `http://192.168.1.X:8080`
- Un dominio personalizado si configuras DNS local
- Tailscale o WireGuard para acceso remoto seguro

## ✅ Verificación de Despliegue

Después de desplegar, verifica que todo funcione:

1. ✅ La página carga correctamente
2. ✅ Puedes iniciar sesión
3. ✅ Los datos se guardan correctamente
4. ✅ Las funciones de IA funcionan (si tienes las API keys configuradas)

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs: `docker-compose logs -f`
2. Verifica la configuración de red
3. Asegúrate de que las variables de entorno estén correctas
4. Comprueba que tienes suficiente espacio en disco

---

**¡Listo!** Tu FileHub debería estar corriendo en Docker. 🎉
