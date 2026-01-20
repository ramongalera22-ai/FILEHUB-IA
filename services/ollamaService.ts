import { OllamaConfig } from '../types';

export interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
}

export const checkOllamaStatus = async (config: OllamaConfig): Promise<boolean> => {
    try {
        const isCloud = config.baseUrl.includes('ollama.com') || config.baseUrl.includes('anthropic');
        const headers: any = {};

        if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
            // For Cloud specific headers if needed
            if (isCloud) {
                headers['x-api-key'] = config.apiKey;
                delete headers['Authorization']; // Swap to x-api-key if strictly Anthropic
            }
        }

        // Native Ollama Check
        if (!isCloud) {
            const response = await fetch(`${config.baseUrl}/api/tags`, { headers });
            return response.ok;
        }

        // Cloud/Anthropic Check (Simulated via models list if available, or just heuristic)
        // Since /v1/messages is POST only usually, we check /v1/models or just assume OK if pingable
        try {
            // Try a lightweight request or just a HEAD/GET to root if API doesn't support tags
            // Standard OpenAI/Anthropic often have /v1/models
            const response = await fetch(`${config.baseUrl}/v1/models`, {
                headers: { ...headers, 'x-api-key': config.apiKey }
            });
            if (response.ok) return true;

            // Fallback: If 401/403, it means we connected but auth failed (so it is "online" but auth error)
            // If 404, might be wrong endpoint.
            if (response.status === 401 || response.status === 403) return true;

            return false;
        } catch (e) {
            // Fallback for strict connection check
            return false;
        }

    } catch (error) {
        console.warn("Ollama connection failed", error);
        return false;
    }
};

export const chatWithOllama = async (
    message: string,
    config: OllamaConfig,
    systemContext?: any
): Promise<string> => {
    try {
        const isCloud = config.baseUrl.includes('ollama.com') || config.baseUrl.includes('anthropic');
        const headers: any = { 'Content-Type': 'application/json' };

        if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
            if (isCloud) {
                headers['x-api-key'] = config.apiKey;
                headers['anthropic-version'] = '2023-06-01'; // Standard header likely required
                delete headers['Authorization'];
            }
        }

        // Prepare prompt with context if available
        let prompt = message;
        if (systemContext) {
            prompt = `CONTEXTO DEL SISTEMA:\n${JSON.stringify(systemContext)}\n\nUSUARIO: ${message}\n\nASISTENTE:`;
        }

        let response;
        if (!isCloud) {
            // Check if it's Open WebUI or Native Ollama
            const isOpenWebUI = config.baseUrl.includes(':3000') || config.baseUrl.includes(':8080');

            if (isOpenWebUI) {
                // OpenAI format for Open WebUI
                response = await fetch(`${config.baseUrl}/api/v1/chat/completions`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        model: config.model || 'gemma2:2b',
                        messages: [{ role: 'user', content: prompt }],
                        stream: false
                    })
                });
            } else {
                // Native Ollama
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
            // Handle both Native Ollama and Open WebUI (OpenAI compatible) responses
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
        console.error("Error asking AI:", error);
        throw error;
    }
};
