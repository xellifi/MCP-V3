import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MessageCircle, Settings, Trash2, ChevronDown, ChevronUp, CheckCircle2, Send, Copy } from 'lucide-react';

const CustomTriggerNode: React.FC<NodeProps> = ({ data, selected }) => {
    const [isExpanded, setIsExpanded] = useState(false);

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
                    border ${selected ? 'border-blue-500/50 shadow-2xl shadow-blue-500/20' : 'border-blue-500/30 shadow-xl'}
                    transition-all duration-300
                    w-[200px]
                `}
            >
                {/* Header - Icon, Label, and Expand Toggle */}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                        <MessageCircle className="w-5 h-5 text-blue-400" />
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

                {/* Controls */}
                <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                type="source"
                position={Position.Right}
                className="w-3 h-3 !bg-blue-400 !border-2 !border-white"
            />
        </div>
    );
};

export default CustomTriggerNode;
