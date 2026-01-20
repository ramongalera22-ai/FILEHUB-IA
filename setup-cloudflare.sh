#!/bin/bash

echo "☁️  Configurando Cloudflare Tunnel para Ollama + FileHub..."
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Verificar si cloudflared está instalado
if ! command -v cloudflared &> /dev/null; then
    echo -e "${YELLOW}📦 cloudflared no está instalado. Instalando...${NC}"
    brew install cloudflare/cloudflare/cloudflared
    echo -e "${GREEN}✅ cloudflared instalado correctamente${NC}"
else
    echo -e "${GREEN}✅ cloudflared ya está instalado${NC}"
    CLOUDFLARED_VERSION=$(cloudflared --version | head -1)
    echo -e "${BLUE}   Versión: ${CLOUDFLARED_VERSION}${NC}"
fi

echo ""

# 2. Verificar que Ollama esté corriendo
echo -e "${BLUE}🧪 Verificando Ollama...${NC}"
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Ollama está corriendo en localhost:11434${NC}"
else
    echo -e "${RED}❌ Ollama no está corriendo${NC}"
    echo -e "${YELLOW}⚠️  Inicia Ollama antes de continuar${NC}"
    exit 1
fi

echo ""

# 3. Preguntar qué tipo de túnel crear
echo -e "${BLUE}🔧 ¿Qué tipo de túnel deseas crear?${NC}"
echo ""
echo "   1) Túnel temporal (rápido, para pruebas)"
echo "   2) Túnel permanente (requiere dominio)"
echo ""
read -p "Selecciona una opción (1 o 2): " TUNNEL_TYPE

echo ""

if [ "$TUNNEL_TYPE" == "1" ]; then
    # TÚNEL TEMPORAL
    echo -e "${BLUE}🚀 Creando túnel temporal...${NC}"
    echo -e "${YELLOW}⚠️  Este túnel se cerrará cuando cierres esta terminal${NC}"
    echo -e "${YELLOW}⚠️  La URL cambiará cada vez que lo reinicies${NC}"
    echo ""
    
    # Iniciar túnel en background y capturar la URL
    echo -e "${BLUE}📡 Iniciando túnel...${NC}"
    cloudflared tunnel --url http://localhost:11434 > /tmp/cloudflare-tunnel.log 2>&1 &
    TUNNEL_PID=$!
    
    # Esperar a que se genere la URL
    echo -e "${BLUE}⏳ Esperando URL del túnel...${NC}"
    sleep 5
    
    # Extraer URL del log
    TUNNEL_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/cloudflare-tunnel.log | head -1)
    
    if [ -z "$TUNNEL_URL" ]; then
        echo -e "${RED}❌ No se pudo obtener la URL del túnel${NC}"
        kill $TUNNEL_PID 2>/dev/null
        exit 1
    fi
    
    echo -e "${GREEN}✅ Túnel creado exitosamente!${NC}"
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎉 Túnel Temporal Activo${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BLUE}📊 Información del Túnel:${NC}"
    echo ""
    echo -e "   ${BLUE}URL Pública:${NC} ${TUNNEL_URL}"
    echo -e "   ${BLUE}Destino:${NC} http://localhost:11434"
    echo -e "   ${BLUE}PID:${NC} ${TUNNEL_PID}"
    echo ""
    echo -e "${YELLOW}📝 Actualiza tu .env con:${NC}"
    echo -e "   ${GREEN}VITE_OLLAMA_URL=${TUNNEL_URL}${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Para detener el túnel:${NC}"
    echo -e "   ${BLUE}kill ${TUNNEL_PID}${NC}"
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Preguntar si actualizar .env
    read -p "¿Actualizar .env automáticamente? (s/n): " UPDATE_ENV
    
    if [ "$UPDATE_ENV" == "s" ] || [ "$UPDATE_ENV" == "S" ]; then
        ENV_FILE=".env"
        BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"
        
        if [ -f "$ENV_FILE" ]; then
            cp "$ENV_FILE" "$BACKUP_FILE"
            sed -i '' "s|VITE_OLLAMA_URL=.*|VITE_OLLAMA_URL=${TUNNEL_URL}|g" "$ENV_FILE"
            echo -e "${GREEN}✅ Archivo .env actualizado${NC}"
            echo -e "${BLUE}   Backup: ${BACKUP_FILE}${NC}"
        fi
    fi
    
    echo ""
    echo -e "${BLUE}🔄 El túnel está corriendo en background...${NC}"
    echo -e "${YELLOW}⚠️  No cierres esta terminal o el túnel se detendrá${NC}"
    echo ""
    
    # Mantener el script corriendo
    echo -e "${BLUE}Presiona Ctrl+C para detener el túnel${NC}"
    wait $TUNNEL_PID

elif [ "$TUNNEL_TYPE" == "2" ]; then
    # TÚNEL PERMANENTE
    echo -e "${BLUE}🔐 Configurando túnel permanente...${NC}"
    echo ""
    
    # Verificar autenticación
    if [ ! -f "$HOME/.cloudflared/cert.pem" ]; then
        echo -e "${YELLOW}⚠️  Necesitas autenticarte con Cloudflare${NC}"
        echo -e "${BLUE}🌐 Abriendo navegador para autenticación...${NC}"
        cloudflared tunnel login
        
        if [ ! -f "$HOME/.cloudflared/cert.pem" ]; then
            echo -e "${RED}❌ Autenticación fallida${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}✅ Autenticación exitosa${NC}"
    else
        echo -e "${GREEN}✅ Ya estás autenticado con Cloudflare${NC}"
    fi
    
    echo ""
    
    # Crear túnel
    TUNNEL_NAME="ollama-filehub"
    echo -e "${BLUE}📡 Creando túnel permanente: ${TUNNEL_NAME}${NC}"
    
    # Verificar si el túnel ya existe
    if cloudflared tunnel list | grep -q "$TUNNEL_NAME"; then
        echo -e "${YELLOW}⚠️  El túnel '${TUNNEL_NAME}' ya existe${NC}"
        TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
    else
        TUNNEL_OUTPUT=$(cloudflared tunnel create "$TUNNEL_NAME" 2>&1)
        TUNNEL_ID=$(echo "$TUNNEL_OUTPUT" | grep -o '[a-f0-9-]\{36\}' | head -1)
        
        if [ -z "$TUNNEL_ID" ]; then
            echo -e "${RED}❌ Error creando túnel${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}✅ Túnel creado: ${TUNNEL_ID}${NC}"
    fi
    
    echo ""
    
    # Pedir dominio
    echo -e "${YELLOW}📝 Necesitas un dominio configurado en Cloudflare${NC}"
    read -p "Ingresa tu dominio (ej: ollama.tudominio.com): " DOMAIN
    
    if [ -z "$DOMAIN" ]; then
        echo -e "${RED}❌ Dominio requerido${NC}"
        exit 1
    fi
    
    echo ""
    
    # Crear archivo de configuración
    CONFIG_FILE="$HOME/.cloudflared/config.yml"
    echo -e "${BLUE}📝 Creando archivo de configuración...${NC}"
    
    cat > "$CONFIG_FILE" << EOF
tunnel: $TUNNEL_ID
credentials-file: $HOME/.cloudflared/$TUNNEL_ID.json

ingress:
  - hostname: $DOMAIN
    service: http://localhost:11434
  - service: http_status:404
EOF
    
    echo -e "${GREEN}✅ Configuración creada: ${CONFIG_FILE}${NC}"
    echo ""
    
    # Configurar DNS
    echo -e "${BLUE}🌐 Configurando DNS...${NC}"
    cloudflared tunnel route dns "$TUNNEL_NAME" "$DOMAIN"
    echo -e "${GREEN}✅ DNS configurado${NC}"
    echo ""
    
    # Iniciar túnel
    echo -e "${BLUE}🚀 Iniciando túnel...${NC}"
    cloudflared tunnel run "$TUNNEL_NAME" > /tmp/cloudflare-tunnel-permanent.log 2>&1 &
    TUNNEL_PID=$!
    
    sleep 3
    
    echo -e "${GREEN}✅ Túnel iniciado (PID: ${TUNNEL_PID})${NC}"
    echo ""
    
    # Instalar como servicio
    read -p "¿Instalar como servicio del sistema? (s/n): " INSTALL_SERVICE
    
    if [ "$INSTALL_SERVICE" == "s" ] || [ "$INSTALL_SERVICE" == "S" ]; then
        echo -e "${BLUE}🔧 Instalando servicio...${NC}"
        sudo cloudflared service install
        sudo launchctl start com.cloudflare.cloudflared
        echo -e "${GREEN}✅ Servicio instalado y iniciado${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎉 Túnel Permanente Configurado${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BLUE}📊 Información del Túnel:${NC}"
    echo ""
    echo -e "   ${BLUE}Nombre:${NC} ${TUNNEL_NAME}"
    echo -e "   ${BLUE}ID:${NC} ${TUNNEL_ID}"
    echo -e "   ${BLUE}Dominio:${NC} https://${DOMAIN}"
    echo -e "   ${BLUE}Destino:${NC} http://localhost:11434"
    echo ""
    echo -e "${YELLOW}📝 Actualiza tu .env con:${NC}"
    echo -e "   ${GREEN}VITE_OLLAMA_URL=https://${DOMAIN}${NC}"
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
else
    echo -e "${RED}❌ Opción inválida${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}📝 Próximos pasos:${NC}"
echo ""
echo -e "   1. Verifica que la configuración sea correcta:"
echo -e "      ${BLUE}cat .env | grep VITE_OLLAMA_URL${NC}"
echo ""
echo -e "   2. Reconstruye la aplicación:"
echo -e "      ${BLUE}npm run build${NC}"
echo ""
echo -e "   3. Despliega a Firebase:"
echo -e "      ${BLUE}firebase deploy --only hosting${NC}"
echo ""
echo -e "   4. Prueba desde Firebase:"
echo -e "      ${BLUE}https://filehub-demo-carlos.web.app${NC}"
echo ""
