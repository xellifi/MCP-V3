import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MessageSquare, Send, ChevronDown, ChevronUp, Sparkles, Loader, CheckCircle, XCircle } from 'lucide-react';
import NodeToolbar from '../NodeToolbar';
import NodeInsights from '../NodeInsights';

const CustomActionNode: React.FC<NodeProps> = ({ data, selected }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const textContainerRef = useRef<HTMLDivElement>(null);

    // Execution status for save animation
    const executionStatus = data.executionStatus as 'idle' | 'executing' | 'completed' | 'error' | undefined;
    const isExecuting = executionStatus === 'executing';
    const isCompleted = executionStatus === 'completed';
    const isError = executionStatus === 'error';

    // Use native event listener to capture wheel events before ReactFlow
    useEffect(() => {
        const container = textContainerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            const isScrollable = container.scrollHeight > container.clientHeight;
            if (isScrollable) {
                e.stopPropagation();
                const isAtTop = container.scrollTop === 0;
                const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight;
                if ((e.deltaY < 0 && isAtTop) || (e.deltaY > 0 && isAtBottom)) {
                    e.preventDefault();
                }
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false, capture: true });
        return () => container.removeEventListener('wheel', handleWheel, { capture: true });
    }, [isExpanded]);

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

    // Determine if this is a message or reply type
    const isMessage = data.actionType === 'message';

    // Get the appropriate template based on node type
    const replyTemplate = data.replyTemplate || '';
    const messageTemplate = data.messageTemplate || '';
    const template = isMessage ? messageTemplate : replyTemplate;

    // Check if AI mode is enabled
    const hasAI = data.useAiReply === true;
    const aiPrompt = data.aiPrompt || '';

    // Determine what content to show
    const hasManualContent = !hasAI && template.length > 0;
    const hasAIContent = hasAI && (aiPrompt.length > 0 || data.aiProvider);
    const hasContent = hasManualContent || hasAIContent;

    // Get border class based on execution status
    const getBorderClass = () => {
        if (isError) return 'border-red-500/70 shadow-[0_0_20px_rgba(239,68,68,0.4)]';
        if (isExecuting) return 'border-blue-500/70 shadow-[0_0_20px_rgba(59,130,246,0.5)]';
        if (isCompleted) return 'border-emerald-500/70 shadow-[0_0_20px_rgba(16,185,129,0.4)]';
        if (isMessage) {
            return selected ? 'border-purple-500/50 shadow-2xl shadow-purple-500/20' : 'border-purple-500/30 shadow-xl';
        }
        return selected ? 'border-cyan-500/50 shadow-2xl shadow-cyan-500/20' : 'border-cyan-500/30 shadow-xl';
    };

    // Color schemes
    const colors = isMessage ? {
        bg: 'bg-purple-500/10 hover:bg-purple-500/20',
        border: getBorderClass(),
        iconBg: 'bg-purple-500/20',
        iconColor: 'text-purple-400',
        chevronColor: 'text-purple-400',
        buttonColor: 'bg-purple-500 hover:bg-purple-600',
        handleColor: '!bg-purple-400'
    } : {
        bg: 'bg-cyan-500/10 hover:bg-cyan-500/20',
        border: getBorderClass(),
        iconBg: 'bg-cyan-500/20',
        iconColor: 'text-cyan-400',
        chevronColor: 'text-cyan-400',
        buttonColor: 'bg-cyan-500 hover:bg-cyan-600',
        handleColor: '!bg-cyan-400'
    };

    const Icon = isMessage ? Send : MessageSquare;

    return (
        <div className="relative group">
            {/* Node Container - Fixed width */}
            <div
                className={`
                    relative px-4 py-3 rounded-2xl
                    ${colors.bg} backdrop-blur-md
                    border ${colors.border}
                    transition-all duration-300
                    w-[200px]
                `}
            >
                {/* Animated orbs when executing */}
                {isExecuting && (
                    <>
                        <div className="absolute w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_15px_#3b82f6,0_0_30px_#3b82f6] z-[100]"
                            style={{ top: '-6px', animation: 'orbTopAction 2s linear infinite' }} />
                        <div className="absolute w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_15px_#3b82f6,0_0_30px_#3b82f6] z-[100]"
                            style={{ bottom: '-6px', animation: 'orbBottomAction 2s linear infinite' }} />
                        <style>{`
                            @keyframes orbTopAction { 0% { left: -6px; } 100% { left: calc(100% - 6px); } }
                            @keyframes orbBottomAction { 0% { left: -6px; } 100% { left: calc(100% - 6px); } }
                        `}</style>
                    </>
                )}

                {/* Header - Icon, Label, and Expand Toggle */}
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg backdrop-blur-sm flex-shrink-0 ${isError ? 'bg-red-500' : isExecuting ? 'bg-blue-500' : isCompleted ? 'bg-emerald-500' : colors.iconBg}`}>
                        {isError ? (
                            <XCircle className="w-5 h-5 text-white" />
                        ) : isExecuting ? (
                            <Loader className="w-5 h-5 text-white animate-spin" />
                        ) : isCompleted ? (
                            <CheckCircle className="w-5 h-5 text-white" />
                        ) : (
                            <Icon className={`w-5 h-5 ${colors.iconColor}`} />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-slate-200 font-bold text-sm truncate">
                            {data.label || (isMessage ? 'Send Message' : 'Comment Reply')}
                        </div>
                        {/* Collapsed preview */}
                        {!isExpanded && (
                            <div className="text-slate-400 text-xs mt-0.5 truncate">
                                {hasAI ? (
                                    <span className="flex items-center gap-1">
                                        <Sparkles className="w-3 h-3 text-yellow-400" />
                                        AI {data.aiProvider || 'Enabled'}
                                    </span>
                                ) : template.length > 0 ? (
                                    template.substring(0, 20) + (template.length > 20 ? '...' : '')
                                ) : (
                                    'Click gear to configure'
                                )}
                            </div>
                        )}
                    </div>
                    {/* Expand/Collapse Toggle */}
                    {hasContent && (
                        <button
                            onClick={toggleExpand}
                            className={`p-1 hover:${colors.bg} rounded-lg transition-colors flex-shrink-0`}
                            title={isExpanded ? 'Collapse' : 'Expand details'}
                        >
                            {isExpanded ? (
                                <ChevronUp className={`w-4 h-4 ${colors.chevronColor}`} />
                            ) : (
                                <ChevronDown className={`w-4 h-4 ${colors.chevronColor}`} />
                            )}
                        </button>
                    )}
                </div>

                {/* Expanded Content */}
                {isExpanded && hasContent && (
                    <div className="mt-3 pt-3 border-t border-slate-600/30 space-y-2">
                        {/* AI Badge */}
                        {hasAI && (
                            <div className="flex items-center gap-2 px-2 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                <Sparkles className="w-3 h-3 text-yellow-400" />
                                <span className="text-xs text-yellow-200 font-medium">
                                    AI: {data.aiProvider || 'Enabled'}
                                </span>
                            </div>
                        )}

                        {/* Template/Prompt Content */}
                        {hasAI && aiPrompt.length > 0 && (
                            <div className="bg-slate-800/60 border border-slate-600/40 rounded-lg p-2.5 backdrop-blur-sm">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">
                                    AI Prompt
                                </div>
                                <div
                                    ref={textContainerRef}
                                    className="text-slate-300 text-xs leading-relaxed break-words whitespace-pre-wrap max-h-[100px] overflow-y-auto"
                                >
                                    {aiPrompt}
                                </div>
                            </div>
                        )}

                        {/* Manual Template Content */}
                        {!hasAI && template.length > 0 && (
                            <div className="bg-slate-800/60 border border-slate-600/40 rounded-lg p-2.5 backdrop-blur-sm">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">
                                    {isMessage ? 'Message Template' : 'Reply Template'}
                                </div>
                                <div
                                    ref={textContainerRef}
                                    className="text-slate-300 text-xs leading-relaxed break-words whitespace-pre-wrap max-h-[100px] overflow-y-auto"
                                >
                                    {template}
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
                />

                <NodeToolbar
                    onClone={handleClone}
                    onConfigure={handleConfigure}
                    onDelete={handleDelete}
                    color={isMessage ? 'purple' : 'cyan'}
                />
            </div>

            {/* Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className={`w-3 h-3 ${colors.handleColor} !border-2 !border-white`}
            />
            {/* Only show output handle for Send Message nodes, not Comment Reply */}
            {isMessage && (
                <Handle
                    type="source"
                    position={Position.Right}
                    className={`w-3 h-3 ${colors.handleColor} !border-2 !border-white`}
                />
            )}
        </div>
    );
};

export default CustomActionNode;
