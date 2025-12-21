/**
 * Messenger Reply Node Configuration
 * 
 * Handles configuration for messenger reply (DM) action nodes.
 */

import { NodeConfigDefinition } from '../utils/nodeConfigRegistry';

export const messengerReplyNodeConfig: NodeConfigDefinition = {
    nodeType: 'messengerReplyNode',

    getDefaultConfig: () => ({
        messageTemplate: '',
        useAI: false,
        aiProvider: 'openai',
        aiPrompt: 'Generate a friendly direct message to send to the commenter'
    }),

    extractConfig: (nodeData: any) => {
        console.log('[messengerReplyNodeConfig] Extracting config from nodeData:', nodeData);

        const config = {
            messageTemplate: nodeData.messageTemplate || nodeData.template || '',
            useAI: nodeData.useAI ?? false,
            aiProvider: nodeData.aiProvider || 'openai',
            aiPrompt: nodeData.aiPrompt || 'Generate a friendly direct message to send to the commenter'
        };

        console.log('[messengerReplyNodeConfig] Extracted config:', config);
        return config;
    },

    validateConfig: (config: any) => {
        // Either template or AI must be configured
        if (!config.messageTemplate && !config.useAI) {
            return false;
        }
        return true;
    },

    mergeConfig: (nodeData: any, config: any) => ({
        ...nodeData,
        messageTemplate: config.messageTemplate,
        template: config.messageTemplate, // Keep both for backward compatibility
        useAI: config.useAI,
        aiProvider: config.aiProvider,
        aiPrompt: config.aiPrompt
    })
};
