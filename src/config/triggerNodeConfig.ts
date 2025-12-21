/**
 * Trigger Node Configuration
 * 
 * Handles configuration for comment trigger nodes.
 */

import { NodeConfigDefinition } from '../utils/nodeConfigRegistry';

export const triggerNodeConfig: NodeConfigDefinition = {
    nodeType: 'triggerNode',

    getDefaultConfig: () => ({
        pageId: '',
        enableCommentReply: true,
        enableSendMessage: true
    }),

    extractConfig: (nodeData: any) => {
        console.log('[triggerNodeConfig] Extracting config from nodeData:', nodeData);

        const config = {
            pageId: nodeData.pageId || '',
            // CRITICAL: Explicitly check for undefined to preserve false values
            // Using !== undefined instead of ?? to handle false correctly
            enableCommentReply: nodeData.enableCommentReply !== undefined
                ? nodeData.enableCommentReply
                : true,
            enableSendMessage: nodeData.enableSendMessage !== undefined
                ? nodeData.enableSendMessage
                : true
        };

        console.log('[triggerNodeConfig] Extracted config:', config);
        return config;
    },

    validateConfig: (config: any) => {
        // Page ID is required
        if (!config.pageId || typeof config.pageId !== 'string') {
            return false;
        }
        // Toggles must be boolean
        if (typeof config.enableCommentReply !== 'boolean') {
            return false;
        }
        if (typeof config.enableSendMessage !== 'boolean') {
            return false;
        }
        return true;
    },

    mergeConfig: (nodeData: any, config: any) => ({
        ...nodeData,
        pageId: config.pageId,
        enableCommentReply: config.enableCommentReply,
        enableSendMessage: config.enableSendMessage
    })
};
