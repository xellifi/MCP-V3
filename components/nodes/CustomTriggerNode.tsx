import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MessageCircle, ChevronDown, ChevronUp, CheckCircle2, Send, Loader, XCircle } from 'lucide-react';
import NodeToolbar from '../NodeToolbar';
import NodeInsights from '../NodeInsights';

const CustomTriggerNode: React.FC<NodeProps> = ({ data, selected }) => {
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

    // Check what settings are enabled
    const enableCommentReply = data.enableCommentReply !== false;
    const enableSendMessage = data.enableSendMessage !== false;
    const hasSettings = enableCommentReply || enableSendMessage || data.pageName;

    // Get border class based on execution status
    const getBorderClass = () => {
        if (isError) return 'border-red-500/70 shadow-[0_0_20px_rgba(239,68,68,0.4)]';
        if (isExecuting) return 'border-blue-500/70 shadow-[0_0_20px_rgba(59,130,246,0.5)]';
        if (isCompleted) return 'border-emerald-500/70 shadow-[0_0_20px_rgba(16,185,129,0.4)]';
        return selected ? 'border-blue-500/50 shadow-2xl shadow-blue-500/20' : 'border-blue-500/30 shadow-xl';
    };

    return (
        <div className="relative group">
            {/* FB Page Logo - Top Left */}
            {data.pageImageUrl && (
                <img
                    src={data.pageImageUrl}
                    alt={data.pageName || 'Page'}
                    className="absolute -top-2 -left-2 w-8 h-8 rounded-full border-2 border-white shadow-lg z-10 object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.pageName || 'Page')}&background=1877F2&color=fff&size=32`;
                    }}
                />
            )}
            {/* Node Container - Fixed width */}
            <div
                className={`
                    relative px-4 py-3 rounded-2xl
                    bg-blue-500/10 hover:bg-blue-500/20 backdrop-blur-md
                    border ${getBorderClass()}
                    transition-all duration-300
                    w-[200px]
                `}
            >
                {/* Animated orbs when executing */}
                {isExecuting && (
                    <>
                        <div className="absolute w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_15px_#3b82f6,0_0_30px_#3b82f6] z-[100]"
                            style={{ top: '-6px', animation: 'orbTopTrigger 2s linear infinite' }} />
                        <div className="absolute w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_15px_#3b82f6,0_0_30px_#3b82f6] z-[100]"
                            style={{ bottom: '-6px', animation: 'orbBottomTrigger 2s linear infinite' }} />
                        <style>{`
                            @keyframes orbTopTrigger { 0% { left: -6px; } 100% { left: calc(100% - 6px); } }
                            @keyframes orbBottomTrigger { 0% { left: -6px; } 100% { left: calc(100% - 6px); } }
                        `}</style>
                    </>
                )}

                {/* Header - Icon, Label, and Expand Toggle */}
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg backdrop-blur-sm flex-shrink-0 ${isError ? 'bg-red-500' : isExecuting ? 'bg-blue-500' : isCompleted ? 'bg-emerald-500' : 'bg-blue-500/20'}`}>
                        {isError ? (
                            <XCircle className="w-5 h-5 text-white" />
                        ) : isExecuting ? (
                            <Loader className="w-5 h-5 text-white animate-spin" />
                        ) : isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-white" />
                        ) : (
                            <MessageCircle className="w-5 h-5 text-blue-400" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-slate-200 font-bold text-sm truncate">
                            {data.label || 'New Comment'}
                        </div>
                        {/* Collapsed preview */}
                        {!isExpanded && data.pageName && (
                            <div className="text-blue-300 text-xs mt-0.5 truncate">
                                {data.pageName}
                            </div>
                        )}
                    </div>
                    {/* Expand/Collapse Toggle */}
                    {hasSettings && (
                        <button
                            onClick={toggleExpand}
                            className="p-1 hover:bg-blue-500/30 rounded-lg transition-colors flex-shrink-0"
                            title={isExpanded ? 'Collapse' : 'Expand details'}
                        >
                            {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-blue-400" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-blue-400" />
                            )}
                        </button>
                    )}
                </div>

                {/* Expanded Content */}
                {isExpanded && hasSettings && (
                    <div className="mt-3 pt-3 border-t border-blue-500/20 space-y-2">
                        {/* Page Name */}
                        {data.pageName && (
                            <div className="flex items-center gap-2 text-xs text-slate-300">
                                <span className="text-slate-500">Page:</span>
                                <span className="font-medium truncate">{data.pageName}</span>
                            </div>
                        )}
                        {/* Settings */}
                        <div className="space-y-1">
                            <div className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs ${enableCommentReply ? 'bg-green-500/20 text-green-300' : 'bg-slate-700/50 text-slate-500'}`}>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Auto-Reply Comments</span>
                            </div>
                            <div className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs ${enableSendMessage ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-700/50 text-slate-500'}`}>
                                <Send className="w-3 h-3" />
                                <span>Send Direct Message</span>
                            </div>
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
                    color="blue"
                />
            </div>

            {/* Handles */}
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 !bg-blue-400 !border-2 !border-white"
            />
        </div>
    );
};

export default CustomTriggerNode;
