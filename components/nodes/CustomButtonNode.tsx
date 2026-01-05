import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { RectangleEllipsis, Settings, Trash2, Copy } from 'lucide-react';
import NodeInsights from '../NodeInsights';

const CustomButtonNode: React.FC<NodeProps> = ({ data, selected }) => {
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
                    bg-blue-500/10 hover:bg-blue-500/20 backdrop-blur-md
                    border ${selected ? 'border-blue-500/50 shadow-2xl shadow-blue-500/20' : 'border-blue-500/30 shadow-xl'}
                    transition-all duration-300
                    min-w-[180px]
                `}
            >
                {/* Icon and Label */}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg backdrop-blur-sm">
                        <RectangleEllipsis className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                        <div className="text-slate-200 font-bold text-sm">
                            {data.label || 'Text with Buttons'}
                        </div>
                        {buttonCount > 0 && (
                            <div className="text-blue-300 text-xs mt-0.5">
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
                className="w-3 h-3 !bg-blue-400 !border-2 !border-white"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 !bg-blue-400 !border-2 !border-white"
            />
        </div>
    );
};

export default CustomButtonNode;
