import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GitBranch, Settings, Trash2, Copy } from 'lucide-react';
import NodeInsights from '../NodeInsights';

const CustomConditionNode: React.FC<NodeProps> = ({ data, selected }) => {
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

    return (
        <div className="relative group">
            {/* Node Container */}
            <div
                className={`
                    relative px-4 py-3 rounded-2xl
                    bg-amber-500/10 hover:bg-amber-500/20 backdrop-blur-md
                    border ${selected ? 'border-amber-500/50 shadow-2xl shadow-amber-500/20' : 'border-amber-500/30 shadow-xl'}
                    transition-all duration-300
                    min-w-[180px] max-w-[220px]
                `}
            >
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                        <GitBranch className="w-5 h-5 text-amber-400" />
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
