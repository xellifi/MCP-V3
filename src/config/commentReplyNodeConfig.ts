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
        useAI: false,
        aiProvider: 'openai',
        aiPrompt: 'Generate a friendly and helpful reply to this comment'
    }),

    extractConfig: (nodeData: any) => {
        console.log('[commentReplyNodeConfig] Extracting config from nodeData:', nodeData);

        const config = {
            replyTemplate: nodeData.replyTemplate || nodeData.template || '',
            useAI: nodeData.useAI ?? false,
            aiProvider: nodeData.aiProvider || 'openai',
            aiPrompt: nodeData.aiPrompt || 'Generate a friendly and helpful reply to this comment'
        };

        console.log('[commentReplyNodeConfig] Extracted config:', config);
        return config;
    },

    validateConfig: (config: any) => {
        // Either template or AI must be configured
        if (!config.replyTemplate && !config.useAI) {
            return false;
        }
        return true;
    },

    mergeConfig: (nodeData: any, config: any) => ({
        ...nodeData,
        replyTemplate: config.replyTemplate,
        template: config.replyTemplate, // Keep both for backward compatibility
        useAI: config.useAI,
        aiProvider: config.aiProvider,
        aiPrompt: config.aiPrompt
    })
};
