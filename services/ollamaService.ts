export interface OllamaConfig {
    baseUrl: string;
    model: string;
    isActive: boolean;
    apiKey?: string;
}

export interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
    context?: number[];
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    eval_count?: number;
    eval_duration?: number;
}

export const checkOllamaStatus = async (config: OllamaConfig): Promise<boolean> => {
    try {
        // Intentamos conectar con timeout de 3 segundos
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const isOpenWebUI = config.baseUrl.includes(':3000') ||
            config.baseUrl.includes(':8080') ||
            config.baseUrl.includes('trycloudflare') ||
            config.baseUrl.includes('open-webui');

        let url = isOpenWebUI ? config.baseUrl : `${config.baseUrl}/api/tags`;
        // OpenWebUI health check often just root or specific health endpoint
        if (isOpenWebUI) url = config.baseUrl;

        const headers: any = {};
        if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

        const response = await fetch(url, {
            method: 'GET',
            headers,
            signal: controller.signal,
            mode: 'cors'
        });

        clearTimeout(timeoutId);
        return response.ok;
    } catch (error) {
        //   console.error("Error checking Ollama status:", error);
        return false;
    }
};

export const chatWithOllama = async (
    message: string,
    config: OllamaConfig,
    systemContext?: any
): Promise<string> => {
    if (!config.isActive) throw new Error("Ollama node is inactive");

    // Detectar si usamos la API de Cloud (Anthropic/Gemini Proxy) o Local/OpenWebUI
    const isCloud = config.baseUrl.includes('googleapis.com') || config.baseUrl.includes('anthropic.com');

    try {
        const headers: any = {
            'Content-Type': 'application/json',
        };

        if (isCloud) {
            headers['x-api-key'] = config.apiKey;
            headers['anthropic-version'] = '2023-06-01';
        } else if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }

        let prompt = message;
        if (systemContext) {
            prompt = `CONTEXTO DEL SISTEMA:\n${JSON.stringify(systemContext)}\n\nUSUARIO: ${message}\n\nASISTENTE:`;
        }

        let response;
        if (!isCloud) {
            // DETECCIÓN INTELIGENTE DE OPEN WEBUI / CLOUDFLARE
            // Si es puerto 3000, 8080 o usa un túnel de Cloudflare, asumimos que es OpenWebUI
            const isOpenWebUI = config.baseUrl.includes(':3000') ||
                config.baseUrl.includes(':8080') ||
                config.baseUrl.includes('trycloudflare.com') ||
                config.baseUrl.includes('open-webui'); // Keyword check

            if (isOpenWebUI) {
                // OPEN WEBUI usa formatos compatibles con OpenAI
                console.log("Routing via OpenWebUI/OpenAI API (Cloudflare/Local)...");
                response = await fetch(`${config.baseUrl}/api/v1/chat/completions`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        model: config.model || 'gemma2:2b', // Model por defecto si falla
                        messages: [{ role: 'user', content: prompt }],
                        stream: false
                    })
                });
            } else {
                // OLLAMA NATIVO (Puerto 11434 por defecto)
                console.log("Routing via Native Ollama API...");
                response = await fetch(`${config.baseUrl}/api/generate`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        model: config.model,
                        prompt: prompt,
                        stream: false
                    })
                });
            }
        } else {
            // CLOUD / ANTHROPIC PROTOCOL
            // Uses /v1/messages
            response = await fetch(`${config.baseUrl}/v1/messages`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model: config.model || 'claude-3-haiku-20240307', // Fallback defaults if model name is weird
                    max_tokens: 4096,
                    messages: [
                        { role: 'user', content: prompt }
                    ]
                })
            });
        }

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API returned ${response.status}: ${errText}`);
        }

        const data = await response.json();

        if (!isCloud) {
            // Manejar respuestas tanto de OpenWebUI (OpenAI style) como de Ollama nativo
            if (data.choices && data.choices[0] && data.choices[0].message) {
                return data.choices[0].message.content;
            }
            return (data as OllamaResponse).response || "";
        } else {
            // Handle Anthropic/Cloud Response format
            if (data.content && Array.isArray(data.content)) {
                return data.content[0]?.text || "";
            }
            return "";
        }

    } catch (error) {
        console.error("Ollama Service Error:", error);
        throw error;
    }
};
