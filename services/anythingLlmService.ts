import { AnythingLLMConfig } from '../types';

export const checkAnythingStatus = async (config: AnythingLLMConfig): Promise<boolean> => {
    try {
        // Correct endpoint for AnythingLLM health/validation
        // 1. Try simple auth validation
        const response = await fetch(`${config.baseUrl}/auth`, { // Some versions use /api/v1/auth, others just base check
            headers: { 'Authorization': `Bearer ${config.apiKey}` }
        });
        if (response.ok) return true;

        // 2. Fallback to /api/v1/ping or system status
        const ping = await fetch(`${config.baseUrl}/system/status`, {
            headers: { 'Authorization': `Bearer ${config.apiKey}` }
        });
        return ping.ok;

    } catch (error) {
        console.warn("AnythingLLM connection failed", error);
        return false;
    }
};

export const chatWithAnything = async (
    message: string,
    config: AnythingLLMConfig,
): Promise<string> => {
    try {
        const slug = config.workspaceSlug || 'default';
        const response = await fetch(`${config.baseUrl}/api/v1/workspace/${slug}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                message: message,
                mode: 'chat'
            })
        });

        if (!response.ok) {
            throw new Error(`AnythingLLM API returned ${response.status}`);
        }

        const data = await response.json();
        // AnythingLLM returns { textResponse: "..." } or similar depending on version
        return data.textResponse || data.response || "No reply from AnythingLLM";

    } catch (error) {
        console.error("Error asking AnythingLLM:", error);
        throw error;
    }
};
