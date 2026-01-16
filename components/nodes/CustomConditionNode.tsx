import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GitBranch, Loader, CheckCircle, XCircle } from 'lucide-react';
import NodeToolbar from '../NodeToolbar';
import NodeInsights from '../NodeInsights';

const CustomConditionNode: React.FC<NodeProps> = ({ data, selected }) => {
    // Execution status for validation animation
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

    const conditionName = data.conditionName || data.label || 'Condition';
    const conditionSummary = data.conditionSummary || '';
    const matchType = data.matchType || 'all';
    const hasConditions = data.conditions && data.conditions.length > 0;

    // Get border class based on execution status
    const getBorderClass = () => {
        if (isError) return 'border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.6)]';
        if (isExecuting) return 'border-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.6)]';
        if (isCompleted) return 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]';
        return selected ? 'border-amber-500/50 shadow-2xl shadow-amber-500/20' : 'border-amber-500/30 shadow-xl';
    };

    return (
        <div className="relative group">
            {/* Node Container */}
            <div
                className={`
                    relative px-4 py-3 rounded-2xl
                    bg-amber-500/10 hover:bg-amber-500/20 backdrop-blur-md
                    border ${getBorderClass()}
                    transition-all duration-300
                    min-w-[180px] max-w-[220px]
                `}
            >
                {/* Animated border orbs when executing */}
                {isExecuting && (
                    <>
                        <div className="absolute w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_15px_#3b82f6,0_0_30px_#3b82f6] z-[100]"
                            style={{ top: '-6px', animation: 'orbTopCond 2s linear infinite' }} />
                        <div className="absolute w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_15px_#3b82f6,0_0_30px_#3b82f6] z-[100]"
                            style={{ bottom: '-6px', animation: 'orbBottomCond 2s linear infinite' }} />
                        <style>{`
                            @keyframes orbTopCond { 0% { left: -6px; } 100% { left: calc(100% - 6px); } }
                            @keyframes orbBottomCond { 0% { left: -6px; } 100% { left: calc(100% - 6px); } }
                        `}</style>
                    </>
                )}

                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg backdrop-blur-sm flex-shrink-0 ${isError ? 'bg-red-500' : isExecuting ? 'bg-blue-500' : isCompleted ? 'bg-emerald-500' : 'bg-amber-500/20'}`}>
                        {isError ? (
                            <XCircle className="w-5 h-5 text-white" />
                        ) : isExecuting ? (
                            <Loader className="w-5 h-5 text-white animate-spin" />
                        ) : isCompleted ? (
                            <CheckCircle className="w-5 h-5 text-white" />
                        ) : (
                            <GitBranch className="w-5 h-5 text-amber-400" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-slate-200 font-bold text-sm truncate">
                            {conditionName}
                        </div>
                        <div className="text-slate-500 text-[10px]">
                            {hasConditions ? `${matchType === 'all' ? 'Match ALL' : 'Match ANY'}` : 'Not configured'}
                        </div>
                    </div>
                </div>

                {/* Condition Preview */}
                {conditionSummary && conditionSummary !== 'No conditions set' && (
                    <div className="mt-2 pt-2 border-t border-amber-500/20">
                        <div className="px-2 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <p className="text-[10px] text-amber-300 leading-relaxed line-clamp-2">
                                {conditionSummary}
                            </p>
                        </div>
                    </div>
                )}
                {/* Node Insights */}
                <NodeInsights
                    sent={data.analytics?.sent}
                    delivered={data.analytics?.delivered}
                    subscribers={data.analytics?.subscribers}
                    errors={data.analytics?.errors}
                />

                <NodeToolbar
                    onClone={handleClone}
                    onConfigure={handleConfigure}
                    onDelete={handleDelete}
                    color="amber"
                />
            </div>

            {/* Input Handle */}
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 !bg-amber-400 !border-2 !border-white"
            />

            {/* TRUE Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                id="true"
                style={{ top: '30%' }}
                className="w-3 h-3 !bg-green-500 !border-2 !border-white"
            />

            {/* FALSE Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                id="false"
                style={{ top: '70%' }}
                className="w-3 h-3 !bg-red-500 !border-2 !border-white"
            />

            {/* Labels for handles */}
            <div className="absolute right-[-38px] top-[25%] text-[9px] text-green-400 font-medium">TRUE</div>
            <div className="absolute right-[-42px] top-[65%] text-[9px] text-red-400 font-medium">FALSE</div>
        </div>
    );
};

export default CustomConditionNode;
