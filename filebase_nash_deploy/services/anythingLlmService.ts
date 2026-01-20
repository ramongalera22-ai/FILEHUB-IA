import { AnythingLLMConfig } from '../types';

export const checkAnythingStatus = async (config: AnythingLLMConfig): Promise<boolean> => {
    try {
        const response = await fetch(`${config.baseUrl}/api/v1/auth`, {
            headers: { 'Authorization': `Bearer ${config.apiKey}` }
        });
        // 403 implies reachable but maybe auth header issue (or just a restricted endpoint), which means server is UP.
        // However, usually we want 200.
        return response.ok || response.status === 403;
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
