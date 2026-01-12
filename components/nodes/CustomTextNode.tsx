import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import NodeToolbar from '../NodeToolbar';
import NodeInsights from '../NodeInsights';

const CustomTextNode: React.FC<NodeProps> = ({ data, selected }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const textContainerRef = useRef<HTMLDivElement>(null);

    // Use native event listener to capture wheel events before ReactFlow
    useEffect(() => {
        const container = textContainerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            // Check if content is scrollable
            const isScrollable = container.scrollHeight > container.clientHeight;

            if (isScrollable) {
                // Prevent ReactFlow zoom
                e.stopPropagation();

                // Only prevent default if we're not at scroll boundaries
                const isAtTop = container.scrollTop === 0;
                const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight;

                if ((e.deltaY < 0 && !isAtTop) || (e.deltaY > 0 && !isAtBottom)) {
                    // Let the container scroll naturally
                } else if ((e.deltaY < 0 && isAtTop) || (e.deltaY > 0 && isAtBottom)) {
                    // At boundary, still prevent zoom but don't scroll
                    e.preventDefault();
                }
            }
        };

        // Use capture phase to intercept before ReactFlow
        container.addEventListener('wheel', handleWheel, { passive: false, capture: true });

        return () => {
            container.removeEventListener('wheel', handleWheel, { capture: true });
        };
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

    // Check if there's content to show
    const hasContent = data.textContent && data.textContent.length > 0;
    const hasDelay = data.delaySeconds > 0;
    const hasButtons = data.buttons && data.buttons.length > 0;
    const hasDetails = hasContent || hasDelay || hasButtons;

    return (
        <div className="relative group">
            {/* Node Container - Fixed width */}
            <div
                className={`
                    relative px-4 py-3 rounded-2xl
                    bg-amber-500/10 hover:bg-amber-500/20 backdrop-blur-md
                    border ${selected ? 'border-amber-500/50 shadow-2xl shadow-amber-500/20' : 'border-amber-500/30 shadow-xl'}
                    transition-all duration-300
                    w-[200px]
                `}
            >
                {/* Header - Icon, Label, and Expand Toggle */}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                        <MessageSquare className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-slate-200 font-bold text-sm truncate">
                            {data.label || 'Text'}
                        </div>
                        {/* Collapsed preview - show truncated text */}
                        {!isExpanded && hasContent && (
                            <div className="text-slate-400 text-xs mt-0.5 truncate">
                                {data.textContent.substring(0, 20)}...
                            </div>
                        )}
                    </div>
                    {/* Expand/Collapse Toggle */}
                    {hasDetails && (
                        <button
                            onClick={toggleExpand}
                            className="p-1 hover:bg-amber-500/30 rounded-lg transition-colors flex-shrink-0"
                            title={isExpanded ? 'Collapse' : 'Expand details'}
                        >
                            {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-amber-400" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-amber-400" />
                            )}
                        </button>
                    )}
                </div>

                {/* Node Insights */}
                <NodeInsights
                    sent={data.analytics?.sent}
                    delivered={data.analytics?.delivered}
                    subscribers={data.analytics?.subscribers}
                    errors={data.analytics?.errors}
                />

                {/* Expanded Content */}
                {isExpanded && hasDetails && (
                    <div className="mt-3 pt-3 border-t border-amber-500/20">
                        {hasContent && (
                            <div className="bg-slate-800/60 border border-slate-600/40 rounded-lg p-2.5 backdrop-blur-sm">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" />
                                    Message Content
                                </div>
                                <div
                                    ref={textContainerRef}
                                    className="text-slate-300 text-xs leading-relaxed break-words whitespace-pre-wrap max-h-[120px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
                                >
                                    {data.textContent}
                                </div>
                            </div>
                        )}
                        {/* Buttons Display */}
                        {data.buttons && data.buttons.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1">
                                    🔘 Buttons ({data.buttons.length})
                                </div>
                                {data.buttons.map((btn: any, index: number) => (
                                    <div
                                        key={index}
                                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${btn.type === 'url'
                                            ? 'bg-blue-500/20 border border-blue-500/30'
                                            : btn.type === 'newFlow'
                                                ? 'bg-green-500/20 border border-green-500/30'
                                                : 'bg-amber-500/20 border border-amber-500/30'
                                            }`}
                                    >
                                        <span className={`text-xs font-medium truncate flex-1 ${btn.type === 'url'
                                            ? 'text-blue-300'
                                            : btn.type === 'newFlow'
                                                ? 'text-green-300'
                                                : 'text-amber-300'
                                            }`}>
                                            {btn.type === 'url' && '🔗 '}
                                            {btn.type === 'startFlow' && '⚡ '}
                                            {btn.type === 'newFlow' && '➕ '}
                                            {btn.title || 'Untitled'}
                                        </span>
                                        {btn.type === 'url' && btn.webviewHeight && (
                                            <span className="text-[9px] text-blue-400/60 bg-blue-500/20 px-1.5 py-0.5 rounded">
                                                {btn.webviewHeight}
                                            </span>
                                        )}
                                        {btn.type === 'startFlow' && (
                                            <span className="text-[9px] text-amber-400/60 bg-amber-500/20 px-1.5 py-0.5 rounded">
                                                flow
                                            </span>
                                        )}
                                        {btn.type === 'newFlow' && (
                                            <span className="text-[9px] text-green-400/60 bg-green-500/20 px-1.5 py-0.5 rounded">
                                                new
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        {hasDelay && (
                            <div className="text-amber-300 text-xs mt-2 font-semibold">
                                ⏱️ Delay: {data.delaySeconds}s
                            </div>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <NodeToolbar
                    onClone={handleClone}
                    onConfigure={handleConfigure}
                    onDelete={handleDelete}
                    color="amber"
                />
            </div>

            {/* Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 !bg-amber-400 !border-2 !border-white"
                style={{ left: -6 }}
            />
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 !bg-amber-400 !border-2 !border-white"
                style={{ right: -6 }}
            />
        </div>
    );
};

export default CustomTextNode;
