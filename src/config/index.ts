/**
 * Node Configuration Initialization
 * 
 * Registers all node type configurations.
 * Import this file early in your app to ensure all configs are registered.
 */

import { nodeConfigRegistry } from '../utils/nodeConfigRegistry';
import { triggerNodeConfig } from './triggerNodeConfig';
import { commentReplyNodeConfig } from './commentReplyNodeConfig';
import { sendMessageNodeConfig } from './sendMessageNodeConfig';
import { textNodeConfig } from './textNodeConfig';

// Register all node configurations
export function initializeNodeConfigs() {
    nodeConfigRegistry.register(triggerNodeConfig);
    nodeConfigRegistry.register(commentReplyNodeConfig);
    nodeConfigRegistry.register(sendMessageNodeConfig);
    nodeConfigRegistry.register(textNodeConfig);

    console.log('[NodeConfig] Registered node configurations:', {
        trigger: triggerNodeConfig.nodeType,
        commentReply: commentReplyNodeConfig.nodeType,
        sendMessage: sendMessageNodeConfig.nodeType,
        text: textNodeConfig.nodeType
    });
}

// Auto-initialize when this module is imported
initializeNodeConfigs();
