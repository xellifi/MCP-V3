import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Bot, Settings, Trash2, Sparkles } from 'lucide-react';

const CustomActionNode: React.FC<NodeProps> = ({ data, selected }) => {
    const handleConfigure = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (data.onConfigure) {
            data.onConfigure();
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (data.onDelete) {
            data.onDelete();
        }
    };

    // Determine color scheme based on action type
    const getColorScheme = () => {
        if (data.actionType === 'message') {
            return {
                gradient: 'from-purple-500 to-purple-600',
                ring: 'ring-purple-400'
            };
        }
        return {
            gradient: 'from-cyan-500 to-teal-600',
            ring: 'ring-cyan-400'
        };
    };

    const colors = getColorScheme();

    return (
        <div className={`relative group ${selected ? `ring-2 ${colors.ring}` : ''}`}>
            {/* Node Container */}
            <div className={`bg-gradient-to-br ${colors.gradient} rounded-2xl p-4 shadow-xl hover:shadow-2xl transition-all min-w-[200px]`}>
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-white font-bold text-sm">{data.label}</h3>
                        {data.subtitle && (
                            <p className="text-white/80 text-xs">{data.subtitle}</p>
                        )}
                    </div>
                </div>

                {/* AI Provider Badge */}
                {data.aiProvider && (
                    <div className="flex items-center gap-2 mt-2 px-2 py-1 bg-white/20 rounded-lg">
                        <Sparkles className="w-3 h-3 text-yellow-300" />
                        <span className="text-xs text-white font-medium">{data.aiProvider}</span>
                    </div>
                )}

                {/* Template Preview */}
                {data.template && (
                    <div className="mt-2 px-2 py-1 bg-black/20 rounded-lg text-xs text-white/70 truncate max-w-[180px]">
                        {data.template}
                    </div>
                )}

                {/* Controls */}
                <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={handleConfigure}
                        className="w-7 h-7 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                        title="Configure"
                    >
                        <Settings className="w-4 h-4 text-gray-700" />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="w-7 h-7 bg-red-500 rounded-full shadow-lg flex items-center justify-center hover:bg-red-600 transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4 text-white" />
                    </button>
                </div>
            </div>

            {/* Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 !bg-cyan-400 !border-2 !border-white"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 !bg-cyan-400 !border-2 !border-white"
            />
        </div>
    );
};

export default CustomActionNode;
