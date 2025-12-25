/**
 * Comment Reply Node Configuration
 * 
 * Handles configuration for comment reply action nodes.
 */

import { NodeConfigDefinition } from '../utils/nodeConfigRegistry';

export const commentReplyNodeConfig: NodeConfigDefinition = {
    nodeType: 'commentReplyNode',

    getDefaultConfig: () => ({
        replyTemplate: '',
        useAiReply: false,
        aiProvider: 'openai' as 'openai' | 'gemini',
        aiPrompt: ''
    }),

    extractConfig: (nodeData: any) => {
        console.log('[commentReplyNodeConfig] Extracting config from nodeData:', nodeData);

        const config = {
            replyTemplate: nodeData.replyTemplate || '',
            useAiReply: nodeData.useAiReply || false,
            aiProvider: (nodeData.aiProvider || 'openai') as 'openai' | 'gemini',
            aiPrompt: nodeData.aiPrompt || ''
        };

        console.log('[commentReplyNodeConfig] Extracted config:', config);
        return config;
    },

    validateConfig: (config: any) => {
        // Either manual template or AI reply must be configured
        if (!config.useAiReply && !config.replyTemplate) {
            return false;
        }
        // If AI is enabled, provider must be valid
        if (config.useAiReply && !['openai', 'gemini'].includes(config.aiProvider)) {
            return false;
        }
        return true;
    },

    mergeConfig: (nodeData: any, config: any) => ({
        ...nodeData,
        replyTemplate: config.replyTemplate,
        useAiReply: config.useAiReply,
        aiProvider: config.aiProvider,
        aiPrompt: config.aiPrompt
    })
};
