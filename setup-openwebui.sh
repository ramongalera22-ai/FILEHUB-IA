#!/bin/bash

echo "🎨 Configurando Open WebUI con Tailscale..."
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Obtener IP de Tailscale
TAILSCALE_IP=$(tailscale ip -4 2>/dev/null)

if [ -z "$TAILSCALE_IP" ]; then
    echo -e "${RED}❌ Tailscale no está corriendo${NC}"
    echo -e "${YELLOW}⚠️  Ejecuta primero: ./setup-tailscale.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Tailscale IP: ${TAILSCALE_IP}${NC}"
echo ""

# Preguntar en qué puerto está corriendo Open WebUI
echo -e "${BLUE}📝 ¿En qué puerto está corriendo Open WebUI?${NC}"
echo "   (Común: 3000, 8080, 3001)"
read -p "Puerto: " OPENWEBUI_PORT

if [ -z "$OPENWEBUI_PORT" ]; then
    OPENWEBUI_PORT=3000
    echo -e "${YELLOW}⚠️  Usando puerto por defecto: 3000${NC}"
fi

echo ""

# Probar conexión
echo -e "${BLUE}🧪 Probando conexión a Open WebUI...${NC}"
if curl -s "http://localhost:${OPENWEBUI_PORT}" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Open WebUI está corriendo en localhost:${OPENWEBUI_PORT}${NC}"
else
    echo -e "${RED}❌ Open WebUI no responde en localhost:${OPENWEBUI_PORT}${NC}"
    echo -e "${YELLOW}⚠️  Asegúrate de que Open WebUI esté corriendo${NC}"
    exit 1
fi

echo ""

# Actualizar .env
OPENWEBUI_URL="http://${TAILSCALE_IP}:${OPENWEBUI_PORT}"

echo -e "${BLUE}📝 Actualizando archivo .env...${NC}"

# Hacer backup
BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"
cp .env "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup creado: ${BACKUP_FILE}${NC}"

# Verificar si existe la línea VITE_OPEN_WEBUI_URL
if grep -q "VITE_OPEN_WEBUI_URL" .env; then
    # Actualizar línea existente
    sed -i '' "s|VITE_OPEN_WEBUI_URL=.*|VITE_OPEN_WEBUI_URL=${OPENWEBUI_URL}|g" .env
else
    # Agregar nueva línea
    echo "" >> .env
    echo "# Open WebUI Configuration" >> .env
    echo "VITE_OPEN_WEBUI_URL=${OPENWEBUI_URL}" >> .env
fi

echo -e "${GREEN}✅ Archivo .env actualizado${NC}"
echo ""

# Mostrar resumen
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 ¡Configuración de Open WebUI completada!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 Resumen:${NC}"
echo ""
echo -e "   ${BLUE}Tailscale IP:${NC} ${TAILSCALE_IP}"
echo -e "   ${BLUE}Puerto:${NC} ${OPENWEBUI_PORT}"
echo -e "   ${BLUE}Open WebUI URL:${NC} ${OPENWEBUI_URL}"
echo ""
echo -e "${BLUE}🔧 Configuración en .env:${NC}"
echo -e "   ${GREEN}VITE_OPEN_WEBUI_URL=${OPENWEBUI_URL}${NC}"
echo ""
echo -e "${YELLOW}📝 Próximos pasos:${NC}"
echo ""
echo "   1. Reconstruir la aplicación:"
echo -e "      ${BLUE}npm run build${NC}"
echo ""
echo "   2. Desplegar a Firebase:"
echo -e "      ${BLUE}firebase deploy --only hosting${NC}"
echo ""
echo "   3. Abrir FileHub:"
echo -e "      ${BLUE}https://filehub-demo-carlos.web.app${NC}"
echo ""
echo "   4. Ir a 'Centro IA Híbrida' y seleccionar 'OpenWebUI'"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
