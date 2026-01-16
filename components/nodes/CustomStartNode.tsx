import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Play, ChevronDown, ChevronUp, Tag, Loader, CheckCircle, XCircle, Key } from 'lucide-react';
import NodeToolbar from '../NodeToolbar';
import NodeInsights from '../NodeInsights';

const CustomStartNode: React.FC<NodeProps> = ({ data, selected }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const keywordsContainerRef = useRef<HTMLDivElement>(null);

    // Execution status for save animation
    const executionStatus = data.executionStatus as 'idle' | 'executing' | 'completed' | 'error' | undefined;
    const isExecuting = executionStatus === 'executing';
    const isCompleted = executionStatus === 'completed';
    const isError = executionStatus === 'error';

    // Use native event listener to capture wheel events before ReactFlow
    useEffect(() => {
        const container = keywordsContainerRef.current;
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

    const keywords = data.keywords || [];
    const hasKeywords = keywords.length > 0;
    const matchType = data.matchType || 'exact';

    // Get border class based on execution status
    const getBorderClass = () => {
        if (isError) return 'border-red-500/70 shadow-[0_0_20px_rgba(239,68,68,0.4)]';
        if (isExecuting) return 'border-blue-500/70 shadow-[0_0_20px_rgba(59,130,246,0.5)]';
        if (isCompleted) return 'border-emerald-500/70 shadow-[0_0_20px_rgba(16,185,129,0.4)]';
        return selected ? 'border-emerald-500/50 shadow-2xl shadow-emerald-500/20' : 'border-emerald-500/30 shadow-xl';
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
                    bg-emerald-500/10 hover:bg-emerald-500/20 backdrop-blur-md
                    border ${getBorderClass()}
                    transition-all duration-300
                    w-[200px]
                `}
            >
                {/* Animated orbs when executing */}
                {isExecuting && (
                    <>
                        <div className="absolute w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_15px_#3b82f6,0_0_30px_#3b82f6] z-[100]"
                            style={{ top: '-6px', animation: 'orbTopStart 2s linear infinite' }} />
                        <div className="absolute w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_15px_#3b82f6,0_0_30px_#3b82f6] z-[100]"
                            style={{ bottom: '-6px', animation: 'orbBottomStart 2s linear infinite' }} />
                        <style>{`
                            @keyframes orbTopStart { 0% { left: -6px; } 100% { left: calc(100% - 6px); } }
                            @keyframes orbBottomStart { 0% { left: -6px; } 100% { left: calc(100% - 6px); } }
                        `}</style>
                    </>
                )}

                {/* Header - Icon, Label, and Expand Toggle */}
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg backdrop-blur-sm flex-shrink-0 ${isError ? 'bg-red-500' : isExecuting ? 'bg-blue-500' : isCompleted ? 'bg-emerald-500' : 'bg-emerald-500/20'}`}>
                        {isError ? (
                            <XCircle className="w-5 h-5 text-white" />
                        ) : isExecuting ? (
                            <Loader className="w-5 h-5 text-white animate-spin" />
                        ) : isCompleted ? (
                            <CheckCircle className="w-5 h-5 text-white" />
                        ) : (
                            <Play className="w-5 h-5 text-emerald-400" fill="currentColor" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-slate-200 font-bold text-sm truncate">
                            {data.label || 'Start'}
                        </div>
                        {/* Collapsed preview */}
                        {!isExpanded && hasKeywords && (
                            <div className="text-emerald-300 text-xs mt-0.5">
                                {keywords.length} keyword{keywords.length !== 1 ? 's' : ''}
                            </div>
                        )}
                    </div>
                    {/* Expand/Collapse Toggle */}
                    {hasKeywords && (
                        <button
                            onClick={toggleExpand}
                            className="p-1 hover:bg-emerald-500/30 rounded-lg transition-colors flex-shrink-0"
                            title={isExpanded ? 'Collapse' : 'Expand keywords'}
                        >
                            {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-emerald-400" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-emerald-400" />
                            )}
                        </button>
                    )}
                </div>

                {/* Expanded Content - Keywords */}
                {isExpanded && hasKeywords && (
                    <div className="mt-3 pt-3 border-t border-emerald-500/20">
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2.5 backdrop-blur-sm">
                            <div className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
                                <Key className="w-3 h-3" />
                                Keywords ({matchType})
                            </div>
                            <div
                                ref={keywordsContainerRef}
                                className="max-h-[100px] overflow-y-auto space-y-1"
                            >
                                {keywords.map((keyword: string, index: number) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 px-2 py-1 bg-white/40 border border-emerald-500/20 rounded-md"
                                    >
                                        <span className="text-slate-600 text-xs font-medium truncate">
                                            {keyword}
                                        </span>
                                    </div>
                                ))}
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

                {/* Action Buttons */}
                <NodeToolbar
                    onClone={handleClone}
                    onConfigure={handleConfigure}
                    onDelete={handleDelete}
                    color="emerald"
                />
            </div>

            {/* Handles - positioned consistently with other nodes */}
            {
                data.isNewFlowNode && (
                    <Handle
                        type="target"
                        position={Position.Left}
                        className="w-3 h-3 !bg-emerald-400 !border-2 !border-white"
                        style={{ left: -6 }}
                    />
                )
            }
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 !bg-emerald-400 !border-2 !border-white"
                style={{ right: -6 }}
            />
        </div >
    );
};

export default CustomStartNode;
