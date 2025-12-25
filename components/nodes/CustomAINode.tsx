import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Sparkles, Settings, Trash2 } from 'lucide-react';

const CustomAINode: React.FC<NodeProps> = ({ data, selected }) => {
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

    return (
        <div className="relative group">
            {/* Node Container */}
            <div className="bg-indigo-500/10 hover:bg-indigo-500/20 backdrop-blur-md rounded-2xl p-4 shadow-xl transition-all min-w-[180px] border border-indigo-500/30 hover:border-indigo-500/50">
                {/* Icon */}
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-slate-200 font-bold text-sm">{data.label}</h3>
                        {data.subtitle && (
                            <p className="text-slate-400 text-xs">{data.subtitle}</p>
                        )}
                    </div>
                </div>

                {/* Model Badge */}
                {data.model && (
                    <div className="mt-2 px-2 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-lg text-xs text-indigo-300 font-medium inline-block">
                        {data.model}
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
                className="w-3 h-3 !bg-indigo-400 !border-2 !border-white"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 !bg-indigo-400 !border-2 !border-white"
            />
        </div>
    );
};

export default CustomAINode;
