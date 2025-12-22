/**
 * Node Configuration Initialization
 * 
 * Registers all node type configurations.
 * Import this file early in your app to ensure all configs are registered.
 */

import { nodeConfigRegistry } from '../utils/nodeConfigRegistry';
import { triggerNodeConfig } from './triggerNodeConfig';

// Register all node configurations
export function initializeNodeConfigs() {
    nodeConfigRegistry.register(triggerNodeConfig);

    console.log('[NodeConfig] Registered node configurations:', {
        trigger: triggerNodeConfig.nodeType
    });
}

// Auto-initialize when this module is imported
initializeNodeConfigs();
