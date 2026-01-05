import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { SquareMousePointer, Settings, Trash2, Copy } from 'lucide-react';
import NodeInsights from '../NodeInsights';

const CustomButtonsOnlyNode: React.FC<NodeProps> = ({ data, selected }) => {
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

    const handleClone = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (data.onClone) {
            data.onClone();
        }
    };

    const buttonCount = data.buttons?.length || 0;

    return (
        <div className="relative group">
            {/* Node Container */}
            <div
                className={`
                    relative px-6 py-4 rounded-2xl
                    bg-gradient-to-br from-indigo-500 to-purple-600
                    border-2 ${selected ? 'border-indigo-300 shadow-2xl shadow-indigo-500/50' : 'border-indigo-400/50 shadow-xl'}
                    transition-all duration-300
                    min-w-[180px]
                `}
            >
                {/* Icon and Label */}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <SquareMousePointer className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                        <div className="text-white font-bold text-sm">
                            {data.label || 'Buttons'}
                        </div>
                        {buttonCount > 0 && (
                            <div className="text-indigo-100 text-xs mt-0.5">
                                {buttonCount} button{buttonCount !== 1 ? 's' : ''}
                            </div>
                        )}
                    </div>
                </div>
                {/* Node Insights */}
                <NodeInsights
                    sent={data.analytics?.sent}
                    delivered={data.analytics?.delivered}
                    subscribers={data.analytics?.subscribers}
                    errors={data.analytics?.errors}
                />



                {/* Action Buttons */}
                <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                        onClick={handleClone}
                        className="w-7 h-7 bg-slate-600 rounded-full shadow-lg flex items-center justify-center hover:bg-slate-500 transition-colors"
                        title="Clone node"
                    >
                        <Copy className="w-4 h-4 text-white" />
                    </button>
                    <button
                        onClick={handleConfigure}
                        className="w-7 h-7 bg-indigo-500 rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-600 transition-colors"
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

export default CustomButtonsOnlyNode;
