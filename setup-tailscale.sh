#!/bin/bash

echo "🚀 Configurando Tailscale para Ollama + FileHub..."
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Verificar si Tailscale está instalado
if ! command -v tailscale &> /dev/null; then
    echo -e "${YELLOW}📦 Tailscale no está instalado. Instalando...${NC}"
    brew install tailscale
    
    echo -e "${BLUE}🔧 Instalando daemon del sistema...${NC}"
    sudo tailscaled install-system-daemon
    
    echo -e "${GREEN}✅ Tailscale instalado correctamente${NC}"
else
    echo -e "${GREEN}✅ Tailscale ya está instalado${NC}"
fi

echo ""

# 2. Verificar si Tailscale está corriendo
if ! tailscale status &> /dev/null; then
    echo -e "${BLUE}🔐 Iniciando Tailscale...${NC}"
    echo -e "${YELLOW}⚠️  Esto abrirá tu navegador para autenticación${NC}"
    tailscale up
else
    echo -e "${GREEN}✅ Tailscale ya está corriendo${NC}"
fi

echo ""

# 3. Obtener IP de Tailscale
echo -e "${BLUE}📡 Obteniendo información de Tailscale...${NC}"
TAILSCALE_IP=$(tailscale ip -4 2>/dev/null)

if [ -z "$TAILSCALE_IP" ]; then
    echo -e "${RED}❌ No se pudo obtener la IP de Tailscale${NC}"
    echo -e "${YELLOW}⚠️  Asegúrate de haber completado la autenticación${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Tu IP de Tailscale es: ${TAILSCALE_IP}${NC}"

# 4. Obtener hostname
TAILSCALE_HOSTNAME=$(hostname -s)
echo -e "${GREEN}✅ Tu hostname es: ${TAILSCALE_HOSTNAME}${NC}"

echo ""

# 5. Verificar que Ollama esté corriendo
echo -e "${BLUE}🧪 Verificando Ollama...${NC}"
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Ollama está corriendo en localhost:11434${NC}"
    
    # Obtener modelos instalados
    MODELS=$(curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | head -3)
    echo -e "${BLUE}📦 Modelos disponibles:${NC}"
    echo "$MODELS" | while read -r model; do
        echo -e "   - ${model}"
    done
else
    echo -e "${RED}❌ Ollama no está corriendo${NC}"
    echo -e "${YELLOW}⚠️  Inicia Ollama antes de continuar${NC}"
    exit 1
fi

echo ""

# 6. Probar conexión desde Tailscale
echo -e "${BLUE}🧪 Probando conexión desde Tailscale...${NC}"
if curl -s "http://${TAILSCALE_IP}:11434/api/tags" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Ollama es accesible desde Tailscale${NC}"
else
    echo -e "${YELLOW}⚠️  Ollama no es accesible desde Tailscale${NC}"
    echo -e "${YELLOW}   Esto puede ser normal si tienes firewall activo${NC}"
fi

echo ""

# 7. Actualizar archivo .env
echo -e "${BLUE}📝 Actualizando archivo .env...${NC}"

ENV_FILE=".env"
BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"

# Hacer backup del .env actual
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$BACKUP_FILE"
    echo -e "${GREEN}✅ Backup creado: ${BACKUP_FILE}${NC}"
fi

# Actualizar VITE_OLLAMA_URL
if [ -f "$ENV_FILE" ]; then
    # Usar IP de Tailscale
    sed -i '' "s|VITE_OLLAMA_URL=.*|VITE_OLLAMA_URL=http://${TAILSCALE_IP}:11434|g" "$ENV_FILE"
    echo -e "${GREEN}✅ Archivo .env actualizado${NC}"
else
    echo -e "${RED}❌ Archivo .env no encontrado${NC}"
fi

echo ""

# 8. Mostrar resumen
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 ¡Configuración completada!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📊 Resumen de Configuración:${NC}"
echo ""
echo -e "   ${BLUE}Tailscale IP:${NC} ${TAILSCALE_IP}"
echo -e "   ${BLUE}Hostname:${NC} ${TAILSCALE_HOSTNAME}"
echo -e "   ${BLUE}Ollama URL:${NC} http://${TAILSCALE_IP}:11434"
echo ""
echo -e "${BLUE}🔧 Configuración en .env:${NC}"
echo -e "   ${GREEN}VITE_OLLAMA_URL=http://${TAILSCALE_IP}:11434${NC}"
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
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}💡 Tip: Para acceder desde otros dispositivos:${NC}"
echo -e "   1. Instala Tailscale en esos dispositivos"
echo -e "   2. Inicia sesión con la misma cuenta"
echo -e "   3. ¡Listo! Podrás acceder a Ollama desde cualquier lugar"
echo ""
