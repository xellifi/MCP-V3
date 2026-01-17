import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Clock, RefreshCw, ChevronDown, ChevronUp, Loader, CheckCircle2, AlertCircle } from 'lucide-react';
import NodeToolbar from '../NodeToolbar';
import NodeInsights from '../NodeInsights';

const CustomFollowupNode: React.FC<NodeProps> = ({ data, selected }) => {
    const [isExpanded, setIsExpanded] = useState(false);

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

    const toggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    // Configuration values from data - read from scheduledFollowups array
    const scheduledFollowups = data.scheduledFollowups || [];
    const firstFollowup = scheduledFollowups[0];
    const secondFollowup = scheduledFollowups[1];

    // Get timing from actual followups or fall back to defaults
    const firstDelay = firstFollowup?.type === 'delay'
        ? firstFollowup.delayMinutes
        : (firstFollowup?.scheduledDays !== undefined ? `D${firstFollowup.scheduledDays}` : 30);
    const interval = secondFollowup?.type === 'delay'
        ? secondFollowup.delayMinutes
        : (secondFollowup?.scheduledDays !== undefined ? `D${secondFollowup.scheduledDays}` : null);

    const maxFollowups = scheduledFollowups.length || 0;
    const firstMessage = firstFollowup?.message || '';
    const isConfigured = scheduledFollowups.length > 0 && firstMessage.length > 0;
    const hasDetails = scheduledFollowups.length > 0;

    // Get border class based on execution status
    const getBorderClass = () => {
        if (isError) return 'border-red-500/70 shadow-[0_0_20px_rgba(239,68,68,0.4)]';
        if (isExecuting) return 'border-blue-500/70 shadow-[0_0_20px_rgba(59,130,246,0.5)]';
        if (isCompleted) return 'border-emerald-500/70 shadow-[0_0_20px_rgba(16,185,129,0.4)]';
        return selected ? 'border-rose-500/50 shadow-2xl shadow-rose-500/20' : 'border-rose-500/30 shadow-xl';
    };

    return (
        <div className="relative group">
            {/* Node Container */}
            <div
                className={`
                    relative px-4 py-3 rounded-2xl
                    bg-rose-500/10 hover:bg-rose-500/20 backdrop-blur-md
                    border ${getBorderClass()}
                    transition-all duration-300
                    w-[200px]
                `}
            >
                {/* Animated orbs when executing */}
                {isExecuting && (
                    <>
                        <div className="absolute w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_15px_#3b82f6,0_0_30px_#3b82f6] z-[100]"
                            style={{ top: '-6px', animation: 'orbTopFollowup 2s linear infinite' }} />
                        <div className="absolute w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_15px_#3b82f6,0_0_30px_#3b82f6] z-[100]"
                            style={{ bottom: '-6px', animation: 'orbBottomFollowup 2s linear infinite' }} />
                        <style>{`
                            @keyframes orbTopFollowup { 0% { left: -6px; } 100% { left: calc(100% - 6px); } }
                            @keyframes orbBottomFollowup { 0% { left: -6px; } 100% { left: calc(100% - 6px); } }
                        `}</style>
                    </>
                )}

                {/* Header - Icon, Label, and Expand Toggle */}
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg backdrop-blur-sm flex-shrink-0 ${isError ? 'bg-red-500' : isExecuting ? 'bg-blue-500' : isCompleted ? 'bg-emerald-500' : 'bg-rose-500/20'}`}>
                        {isError ? (
                            <AlertCircle className="w-5 h-5 text-white" />
                        ) : isExecuting ? (
                            <Loader className="w-5 h-5 text-white animate-spin" />
                        ) : isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-white" />
                        ) : (
                            <RefreshCw className="w-5 h-5 text-rose-400" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-slate-200 font-bold text-sm truncate">
                            {data.label || 'Follow-up'}
                        </div>
                        <div className="text-slate-400 text-xs">
                            {maxFollowups}x Reminders
                        </div>
                    </div>
                    {/* Expand Toggle */}
                    {hasDetails && (
                        <button
                            onClick={toggleExpand}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                            title={isExpanded ? "Collapse" : "Expand"}
                        >
                            {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                        </button>
                    )}
                </div>

                {/* Expandable Content */}
                {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-rose-500/20 space-y-2">
                        {/* Timing Settings */}
                        <div className="flex items-center gap-2 text-xs flex-wrap">
                            <Clock className="w-3.5 h-3.5 text-rose-400" />
                            {firstFollowup && (
                                <>
                                    <span className="text-slate-400">First:</span>
                                    <span className="text-rose-300 font-medium">
                                        {typeof firstDelay === 'number' ? `${firstDelay}m` : firstDelay}
                                    </span>
                                </>
                            )}
                            {secondFollowup && interval !== null && (
                                <>
                                    <span className="text-slate-500">|</span>
                                    <span className="text-slate-400">2nd:</span>
                                    <span className="text-rose-300 font-medium">
                                        {typeof interval === 'number' ? `${interval}m` : interval}
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Message Preview */}
                        {isConfigured ? (
                            <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-2">
                                <div className="text-[10px] text-rose-400 uppercase tracking-wider font-semibold mb-1">
                                    📩 Message
                                </div>
                                <div className="text-slate-600 text-xs line-clamp-2">
                                    {firstMessage.substring(0, 60)}{firstMessage.length > 60 ? '...' : ''}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
                                <div className="text-amber-300 text-xs font-medium text-center">
                                    ⚠️ Configure message
                                </div>
                            </div>
                        )}
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
                    color="rose"
                />
            </div>

            {/* Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 !bg-rose-400 !border-2 !border-white"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 !bg-rose-400 !border-2 !border-white"
            />
        </div>
    );
};

export default CustomFollowupNode;

