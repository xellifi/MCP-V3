import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Sparkles, Settings, Trash2, Loader, CheckCircle, XCircle } from 'lucide-react';
import NodeToolbar from '../NodeToolbar';
import NodeInsights from '../NodeInsights';

const CustomAINode: React.FC<NodeProps> = ({ data, selected }) => {
    // Execution status for save animation
    const executionStatus = data.executionStatus as 'idle' | 'executing' | 'completed' | 'error' | undefined;
    const isExecuting = executionStatus === 'executing';
    const isCompleted = executionStatus === 'completed';
    const isError = executionStatus === 'error';

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

    // Get border class based on execution status
    const getBorderClass = () => {
        if (isError) return 'border-red-500/70 shadow-[0_0_20px_rgba(239,68,68,0.4)]';
        if (isExecuting) return 'border-blue-500/70 shadow-[0_0_20px_rgba(59,130,246,0.5)]';
        if (isCompleted) return 'border-emerald-500/70 shadow-[0_0_20px_rgba(16,185,129,0.4)]';
        return selected ? 'border-indigo-500/50 shadow-2xl shadow-indigo-500/20' : 'border-indigo-500/30 shadow-xl';
    };

    return (
        <div className="relative group">
            {/* Node Container */}
            <div className={`relative bg-indigo-500/10 hover:bg-indigo-500/20 backdrop-blur-md rounded-2xl p-4 transition-all min-w-[180px] border ${getBorderClass()}`}>
                {/* Animated orbs when executing */}
                {isExecuting && (
                    <>
                        <div className="absolute w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_15px_#3b82f6,0_0_30px_#3b82f6] z-[100]"
                            style={{ top: '-6px', animation: 'orbTopAI 2s linear infinite' }} />
                        <div className="absolute w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_15px_#3b82f6,0_0_30px_#3b82f6] z-[100]"
                            style={{ bottom: '-6px', animation: 'orbBottomAI 2s linear infinite' }} />
                        <style>{`
                            @keyframes orbTopAI { 0% { left: -6px; } 100% { left: calc(100% - 6px); } }
                            @keyframes orbBottomAI { 0% { left: -6px; } 100% { left: calc(100% - 6px); } }
                        `}</style>
                    </>
                )}

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

                {/* Node Insights */}
                <NodeInsights
                    sent={data.analytics?.sent}
                    delivered={data.analytics?.delivered}
                    subscribers={data.analytics?.subscribers}
                    errors={data.analytics?.errors}
                />

                {/* Controls */}
                <NodeToolbar
                    onClone={handleClone}
                    onConfigure={handleConfigure}
                    onDelete={handleDelete}
                    color="white"
                />
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
