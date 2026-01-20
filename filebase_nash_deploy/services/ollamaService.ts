import { OllamaConfig } from '../types';

export interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
}

export const checkOllamaStatus = async (config: OllamaConfig): Promise<boolean> => {
    try {
        const headers: any = {};
        if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }
        const response = await fetch(`${config.baseUrl}/api/tags`, { headers });
        return response.ok;
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
        const headers: any = { 'Content-Type': 'application/json' };
        if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }

        // Prepare prompt with context if available
        let prompt = message;
        if (systemContext) {
            prompt = `CONTEXTO DEL SISTEMA:\n${JSON.stringify(systemContext)}\n\nUSUARIO: ${message}\n\nASISTENTE:`;
        }

        const response = await fetch(`${config.baseUrl}/api/generate`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: config.model,
                prompt: prompt,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API returned ${response.status}`);
        }

        const data: OllamaResponse = await response.json();
        return data.response;

    } catch (error) {
        console.error("Error asking Ollama:", error);
        throw error;
    }
};
