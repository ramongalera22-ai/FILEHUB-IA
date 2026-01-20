# 🔗 FileHub + Ollama - Guía de Conexión

## ✅ Estado Actual de la Configuración

### Servicios Activos:
- ✅ **Ollama**: `http://localhost:11434` (Modelo: `gemma2:9b`)
- ✅ **Open WebUI**: `http://localhost:3000` (Interfaz web para Ollama)
- ✅ **FileHub**: `http://localhost:3000` (Tu aplicación)
- ✅ **AnythingLLM**: `http://localhost:3001/api/v1` (Configurado)

## 🎯 Configuración Aplicada

Tu archivo `.env` ahora está configurado para usar **Ollama local**:

```env
# Ollama Configuration (Local)
VITE_OLLAMA_URL=http://localhost:11434
VITE_OLLAMA_MODEL=gemma2:9b
VITE_OLLAMA_API_KEY=
```

## 🚀 Cómo Usar Ollama en FileHub

### Opción 1: Usar Ollama directamente desde FileHub

1. **Abre FileHub**: http://localhost:3000
2. **Ve a Configuración** (⚙️ Settings)
3. **Selecciona "Ollama"** como proveedor de IA
4. **Verifica la conexión**: Debería mostrar ✅ conectado

### Opción 2: Usar Open WebUI (Interfaz dedicada)

1. **Abre Open WebUI**: http://localhost:3000 (la que mostraste en la imagen)
2. **Chatea directamente** con el modelo `gemma3:4b`
3. Esta es una interfaz separada de FileHub, solo para Ollama

### Opción 3: Usar AnythingLLM

1. **Abre AnythingLLM**: http://localhost:3001
2. **Configura el workspace** `filehub-ia`
3. **Usa la API Key**: `02NC02W-P4Z45JV-MMNPM95-2N5GD35`

## 🔧 Verificar la Conexión

### Desde la terminal:

```bash
# Ver modelos instalados
ollama list

# Probar Ollama directamente
curl http://localhost:11434/api/generate -d '{
  "model": "gemma2:9b",
  "prompt": "Hola, ¿cómo estás?",
  "stream": false
}'

# Ejecutar el script de prueba
./test-ollama.sh
```

### Desde FileHub:

1. Abre el **Centro IA Híbrida** o **Work Hub**
2. Intenta hacer una pregunta al asistente
3. Debería usar Ollama automáticamente

## 📊 Modelos Disponibles

Actualmente tienes instalados:

| Modelo | Tamaño | Uso |
|--------|--------|-----|
| `gemma2:9b` | 5.4 GB | Generación de texto (principal) |
| `mxbai-embed-large` | 669 MB | Embeddings para búsqueda semántica |

## 🆕 Instalar Más Modelos

Si quieres instalar el modelo `gemma3:4b` que aparece en Open WebUI:

```bash
# Descargar gemma3:4b
ollama pull gemma3:4b

# Actualizar .env para usar el nuevo modelo
# Cambiar: VITE_OLLAMA_MODEL=gemma3:4b

# Reiniciar FileHub
npm run dev
```

## 🔄 Reiniciar Servicios

Si algo no funciona:

```bash
# Reiniciar Ollama (Mac)
# Cierra la app desde la barra de menú y ábrela de nuevo

# Reiniciar FileHub
pkill -f "vite"
npm run dev

# Reiniciar AnythingLLM (si usas Docker)
docker restart anythingllm
```

## 🎨 Diferencias entre las Interfaces

### Open WebUI (localhost:3000 - la de tu imagen)
- Interfaz web moderna para chatear con Ollama
- Similar a ChatGPT pero local
- Ideal para conversaciones generales

### FileHub (localhost:3000 - tu app)
- Tu aplicación personalizada
- Integra Ollama para análisis de documentos
- Gestión de archivos + IA

### AnythingLLM (localhost:3001)
- Plataforma de gestión de documentos con IA
- Workspaces separados
- RAG (Retrieval Augmented Generation)

## 🐛 Solución de Problemas

### FileHub no detecta Ollama:
```bash
# Verifica que Ollama esté corriendo
curl http://localhost:11434/api/tags

# Si no responde, reinicia Ollama
```

### Modelo muy lento:
- `gemma2:9b` es un modelo grande (5.4 GB)
- Considera usar `gemma3:1b` para respuestas más rápidas:
  ```bash
  ollama pull gemma3:1b
  ```

### Conflicto de puertos:
- Open WebUI y FileHub están en el mismo puerto (3000)
- Necesitas elegir uno u otro, o cambiar el puerto de uno

## 📝 Notas Importantes

⚠️ **Conflicto de Puerto**: Open WebUI y FileHub están ambos en `localhost:3000`. Necesitas:
- **Opción A**: Usar solo FileHub (cierra Open WebUI)
- **Opción B**: Cambiar el puerto de FileHub en `vite.config.ts`
- **Opción C**: Cambiar el puerto de Open WebUI

## ✅ Próximos Pasos

1. ✅ Ollama configurado y corriendo
2. ✅ FileHub actualizado para usar Ollama local
3. ⏳ Probar la integración en FileHub
4. 🔜 Decidir qué interfaz usar (Open WebUI vs FileHub)

---

**¿Necesitas ayuda?** Ejecuta `./test-ollama.sh` para verificar que todo funciona correctamente.
