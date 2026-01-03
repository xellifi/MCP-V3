import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Play, Settings, Trash2, ChevronDown, ChevronUp, Key, Copy } from 'lucide-react';

const CustomStartNode: React.FC<NodeProps> = ({ data, selected }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const keywordsContainerRef = useRef<HTMLDivElement>(null);

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
                    border ${selected ? 'border-emerald-500/50 shadow-2xl shadow-emerald-500/20' : 'border-emerald-500/30 shadow-xl'}
                    transition-all duration-300
                    w-[200px]
                `}
            >
                {/* Header - Icon, Label, and Expand Toggle */}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                        <Play className="w-5 h-5 text-emerald-400" fill="currentColor" />
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
                        <div className="bg-slate-800/60 border border-slate-600/40 rounded-lg p-2.5 backdrop-blur-sm">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
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
                                        className="flex items-center gap-2 px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-md"
                                    >
                                        <span className="text-emerald-300 text-xs font-medium truncate">
                                            {keyword}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

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
                        className="w-7 h-7 bg-emerald-500 rounded-full shadow-lg flex items-center justify-center hover:bg-emerald-600 transition-colors"
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

            {/* Handles - positioned consistently with other nodes */}
            {data.isNewFlowNode && (
                <Handle
                    type="target"
                    position={Position.Left}
                    className="w-3 h-3 !bg-emerald-400 !border-2 !border-white"
                    style={{ left: -6 }}
                />
            )}
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 !bg-emerald-400 !border-2 !border-white"
                style={{ right: -6 }}
            />
        </div>
    );
};

export default CustomStartNode;
