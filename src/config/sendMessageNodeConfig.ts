/**
 * Send Message Node Configuration
 * 
 * Handles configuration for send message action nodes.
 */

import { NodeConfigDefinition } from '../utils/nodeConfigRegistry';

interface Button {
    title: string;
    type: 'startFlow' | 'url';
    flowId?: string;
    url?: string;
    webviewType?: 'full' | 'compact' | 'tall';
}

export const sendMessageNodeConfig: NodeConfigDefinition = {
    nodeType: 'messengerReplyNode',

    getDefaultConfig: () => ({
        messageTemplate: '',
        buttons: [] as Button[],
        useAiReply: false,
        aiProvider: 'openai' as 'openai' | 'gemini',
        aiPrompt: ''
    }),

    extractConfig: (nodeData: any) => {
        console.log('[sendMessageNodeConfig] Extracting config from nodeData:', nodeData);

        const config = {
            messageTemplate: nodeData.messageTemplate || '',
            buttons: nodeData.buttons || [],
            useAiReply: nodeData.useAiReply || false,
            aiProvider: (nodeData.aiProvider || 'openai') as 'openai' | 'gemini',
            aiPrompt: nodeData.aiPrompt || ''
        };

        console.log('[sendMessageNodeConfig] Extracted config:', config);
        return config;
    },

    validateConfig: (config: any) => {
        // Either manual template or AI reply must be configured
        if (!config.useAiReply && !config.messageTemplate) {
            return false;
        }
        // If AI is enabled, provider must be valid
        if (config.useAiReply && !['openai', 'gemini'].includes(config.aiProvider)) {
            return false;
        }
        // Validate buttons if present
        if (config.buttons && Array.isArray(config.buttons)) {
            for (const button of config.buttons) {
                if (!button.title) return false;
                if (button.type === 'startFlow' && !button.flowId) return false;
                if (button.type === 'url' && !button.url) return false;
            }
        }
        return true;
    },

    mergeConfig: (nodeData: any, config: any) => ({
        ...nodeData,
        messageTemplate: config.messageTemplate,
        buttons: config.buttons,
        useAiReply: config.useAiReply,
        aiProvider: config.aiProvider,
        aiPrompt: config.aiPrompt
    })
};
