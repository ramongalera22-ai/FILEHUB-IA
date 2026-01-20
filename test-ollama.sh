#!/bin/bash

echo "🔍 Verificando conexión con Ollama..."
echo ""

# Test 1: Verificar que Ollama está corriendo
echo "1️⃣ Verificando que Ollama está activo..."
if curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "✅ Ollama está corriendo en http://localhost:11434"
else
    echo "❌ Ollama NO está corriendo"
    exit 1
fi

echo ""

# Test 2: Listar modelos disponibles
echo "2️⃣ Modelos disponibles:"
curl -s http://localhost:11434/api/tags | python3 -m json.tool | grep '"name"'

echo ""
echo ""

# Test 3: Prueba simple de generación
echo "3️⃣ Probando generación de texto con gemma2:9b..."
echo "Enviando: '¿Qué es FileHub?'"
echo ""

curl -s http://localhost:11434/api/generate -d '{
  "model": "gemma2:9b",
  "prompt": "Responde en una frase corta: ¿Qué es FileHub?",
  "stream": false
}' | python3 -c "import sys, json; print('Respuesta:', json.load(sys.stdin).get('response', 'Sin respuesta'))"

echo ""
echo "✅ Prueba completada!"
