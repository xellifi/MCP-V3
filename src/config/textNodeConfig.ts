/**
 * Text Node Configuration
 * 
 * Handles configuration for text/delay nodes.
 */

import { NodeConfigDefinition } from '../utils/nodeConfigRegistry';

interface UrlButton {
    title: string;
    url: string;
    webviewHeight: 'compact' | 'tall' | 'full';
}

export const textNodeConfig: NodeConfigDefinition = {
    nodeType: 'textNode',

    getDefaultConfig: () => ({
        textContent: '',
        delaySeconds: 0,
        buttons: [] as UrlButton[]
    }),

    extractConfig: (nodeData: any) => {
        console.log('[textNodeConfig] Extracting config from nodeData:', nodeData);

        const config = {
            textContent: nodeData.textContent || '',
            delaySeconds: nodeData.delaySeconds || 0,
            buttons: nodeData.buttons || []
        };

        console.log('[textNodeConfig] Extracted config:', config);
        return config;
    },

    validateConfig: (config: any) => {
        // Text content is required
        if (!config.textContent || typeof config.textContent !== 'string') {
            return false;
        }
        // Delay must be a valid number
        if (typeof config.delaySeconds !== 'number' || config.delaySeconds < 0) {
            return false;
        }
        // Validate buttons if present
        if (config.buttons && Array.isArray(config.buttons)) {
            for (const button of config.buttons) {
                if (!button.title || !button.url) return false;
                if (!['compact', 'tall', 'full'].includes(button.webviewHeight)) return false;
            }
        }
        return true;
    },

    mergeConfig: (nodeData: any, config: any) => ({
        ...nodeData,
        textContent: config.textContent,
        delaySeconds: config.delaySeconds,
        buttons: config.buttons
    })
};
