import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Clock, Settings, Trash2 } from 'lucide-react';

const CustomTextNode: React.FC<NodeProps> = ({ data, selected }) => {
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
            <div
                className={`
                    relative px-6 py-4 rounded-2xl
                    bg-gradient-to-br from-amber-500 to-orange-600
                    border-2 ${selected ? 'border-amber-300 shadow-2xl shadow-amber-500/50' : 'border-amber-400/50 shadow-xl'}
                    transition-all duration-300
                    min-w-[180px]
                `}
            >
                {/* Icon and Label */}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                        <div className="text-white font-bold text-sm">
                            {data.label || 'Text/Delay'}
                        </div>
                        {data.textContent && (
                            <div className="text-amber-100 text-xs mt-0.5 line-clamp-2">
                                {data.textContent}
                            </div>
                        )}
                        {data.delaySeconds > 0 && (
                            <div className="text-amber-200 text-xs mt-0.5 font-semibold">
                                ⏱️ Wait {data.delaySeconds}s
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                        onClick={handleConfigure}
                        className="w-7 h-7 bg-blue-500 rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
                        title="Configure"
                    >
                        <Settings className="w-4 h-4 text-white" />
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
                className="w-3 h-3 !bg-amber-400 !border-2 !border-white"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 !bg-amber-400 !border-2 !border-white"
            />
        </div>
    );
};

export default CustomTextNode;
