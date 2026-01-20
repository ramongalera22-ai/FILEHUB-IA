import { LocalLlmConfig } from "../types";

export const checkLocalLlmStatus = async (config: LocalLlmConfig): Promise<boolean> => {
    try {
        if (!config.isActive) return false;

        // LM Studio / OpenAI compatible usually have /v1/models
        // Note: LM Studio might be at root or /v1 depending on user config, usually /v1/models is standard for OpenAI compat
        const response = await fetch(`${config.baseUrl}/models`, {
            method: 'GET',
            headers: config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : undefined
        });

        return response.ok;
    } catch (error) {
        console.warn("Local LLM status check failed:", error);
        return false;
    }
};

export const chatWithLocalLlm = async (
    message: string,
    config: LocalLlmConfig,
    systemContext?: any
): Promise<string> => {
    try {
        const headers: any = {
            'Content-Type': 'application/json'
        };
        if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }

        let prompt = message;
        if (systemContext) {
            prompt = `SYSTEM CONTEXT:\n${JSON.stringify(systemContext)}\n\nUSER Q: ${message}`;
        }

        const body = {
            model: config.model || "local-model",
            messages: [
                { role: "user", content: prompt }
            ],
            temperature: 0.7
        };

        const response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Local LLM Error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";

    } catch (error) {
        console.error("Local LLM Chat Error:", error);
        throw error;
    }
};
