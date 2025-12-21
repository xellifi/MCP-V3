/**
 * Node Configuration Registry
 * 
 * Central registry for managing node type configurations.
 * Each node type registers its configuration handler here.
 */

export interface NodeConfigDefinition {
    /** Unique identifier for the node type */
    nodeType: string;

    /** Get default configuration for new nodes */
    getDefaultConfig: () => any;

    /** Extract configuration from node data */
    extractConfig: (nodeData: any) => any;

    /** Validate configuration object */
    validateConfig?: (config: any) => boolean;

    /** Merge configuration into node data */
    mergeConfig?: (nodeData: any, config: any) => any;
}

class NodeConfigRegistry {
    private configs: Map<string, NodeConfigDefinition> = new Map();

    /**
     * Register a node configuration
     */
    register(config: NodeConfigDefinition) {
        this.configs.set(config.nodeType, config);
    }

    /**
     * Get configuration handler for a node type
     */
    get(nodeType: string): NodeConfigDefinition | undefined {
        return this.configs.get(nodeType);
    }

    /**
     * Get default config for a node type
     */
    getDefaultConfig(nodeType: string): any {
        const config = this.configs.get(nodeType);
        return config ? config.getDefaultConfig() : {};
    }

    /**
     * Extract config from node data based on node type
     */
    extractConfig(nodeType: string, nodeData: any): any {
        const config = this.configs.get(nodeType);
        return config ? config.extractConfig(nodeData) : {};
    }

    /**
     * Validate config for a node type
     */
    validateConfig(nodeType: string, configData: any): boolean {
        const config = this.configs.get(nodeType);
        if (!config || !config.validateConfig) return true;
        return config.validateConfig(configData);
    }

    /**
     * Merge config into node data
     */
    mergeConfig(nodeType: string, nodeData: any, configData: any): any {
        const config = this.configs.get(nodeType);
        if (config && config.mergeConfig) {
            return config.mergeConfig(nodeData, configData);
        }
        // Default merge: spread config into node data
        return { ...nodeData, ...configData };
    }
}

// Export singleton instance
export const nodeConfigRegistry = new NodeConfigRegistry();
