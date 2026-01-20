#!/bin/bash

echo "📊 Actualizando configuración de Ollama en Supabase..."
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Leer configuración actual del .env
OLLAMA_URL=$(grep VITE_OLLAMA_URL .env | cut -d '=' -f2)
OLLAMA_MODEL=$(grep VITE_OLLAMA_MODEL .env | cut -d '=' -f2)

echo -e "${BLUE}📝 Configuración actual:${NC}"
echo -e "   URL: ${OLLAMA_URL}"
echo -e "   Modelo: ${OLLAMA_MODEL}"
echo ""

# Crear script SQL para actualizar Supabase
SQL_SCRIPT="
-- Actualizar configuración de Ollama para todos los usuarios
UPDATE profiles
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{ollama_config}',
  jsonb_build_object(
    'baseUrl', '${OLLAMA_URL}',
    'model', '${OLLAMA_MODEL}',
    'isActive', true,
    'apiKey', ''
  )
)
WHERE id IS NOT NULL;
"

echo -e "${YELLOW}📋 Script SQL generado:${NC}"
echo "$SQL_SCRIPT"
echo ""

# Guardar script en archivo temporal
echo "$SQL_SCRIPT" > /tmp/update_ollama_config.sql

echo -e "${GREEN}✅ Script SQL guardado en: /tmp/update_ollama_config.sql${NC}"
echo ""

echo -e "${BLUE}🔧 Para ejecutar este script en Supabase:${NC}"
echo ""
echo "   1. Ve a: https://supabase.com/dashboard/project/xlbtwjxyphqnjeugfxds/editor"
echo "   2. Haz clic en 'SQL Editor'"
echo "   3. Copia y pega el contenido de: /tmp/update_ollama_config.sql"
echo "   4. Haz clic en 'Run'"
echo ""

echo -e "${YELLOW}💡 Alternativa: Usar la CLI de Supabase${NC}"
echo ""
echo "   Si tienes la CLI de Supabase instalada:"
echo "   supabase db execute --file /tmp/update_ollama_config.sql"
echo ""

# Mostrar el contenido del script
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📄 Contenido del Script SQL:${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
cat /tmp/update_ollama_config.sql
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${BLUE}✨ Nota:${NC} La configuración de Ollama se guarda automáticamente en Supabase"
echo "cuando cambias los ajustes en la interfaz de FileHub."
echo ""
echo "Este script es útil para actualizar la configuración de forma masiva"
echo "para todos los usuarios existentes."
echo ""
