import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Image, ChevronDown, ChevronUp, Link, AlertCircle } from 'lucide-react';
import NodeToolbar from '../NodeToolbar';
import NodeInsights from '../NodeInsights';

const CustomImageNode: React.FC<NodeProps> = ({ data, selected }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [imageError, setImageError] = useState(false);

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
        setImageError(false); // Reset error on toggle
    };

    // Check if there's content to show
    const hasImage = data.imageUrl && data.imageUrl.length > 0;
    const hasCaption = data.caption && data.caption.length > 0;
    const hasDetails = hasImage || hasCaption;

    return (
        <div className="relative group">
            {/* Node Container - Fixed width */}
            <div
                className={`
                    relative px-4 py-3 rounded-2xl
                    bg-rose-500/10 hover:bg-rose-500/20 backdrop-blur-md
                    border ${selected ? 'border-rose-500/50 shadow-2xl shadow-rose-500/20' : 'border-rose-500/30 shadow-xl'}
                    transition-all duration-300
                    w-[200px]
                `}
            >
                {/* Header - Icon, Label, and Expand Toggle */}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-500/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                        <Image className="w-5 h-5 text-rose-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-slate-200 font-bold text-sm truncate">
                            {data.label || 'Image'}
                        </div>
                        {/* Collapsed preview - show image source indicator */}
                        {!isExpanded && hasImage && (
                            <div className="text-slate-400 text-xs mt-0.5 truncate flex items-center gap-1">
                                <Link className="w-3 h-3" />
                                {data.imageSource === 'upload' ? 'Uploaded' : 'URL'}
                            </div>
                        )}
                    </div>
                    {/* Expand/Collapse Toggle */}
                    {hasDetails && (
                        <button
                            onClick={toggleExpand}
                            className="p-1 hover:bg-rose-500/30 rounded-lg transition-colors flex-shrink-0"
                            title={isExpanded ? 'Collapse' : 'Expand details'}
                        >
                            {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-rose-400" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-rose-400" />
                            )}
                        </button>
                    )}
                </div>

                {/* Expanded Content - Collapsible Image Preview */}
                {isExpanded && hasDetails && (
                    <div className="mt-3 pt-3 border-t border-rose-500/20">
                        {/* Image Preview */}
                        {hasImage && (
                            <div className="bg-slate-800/60 border border-slate-600/40 rounded-lg p-2 backdrop-blur-sm overflow-hidden">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
                                    <Image className="w-3 h-3" />
                                    Image Preview
                                </div>
                                {imageError ? (
                                    <div className="flex flex-col items-center justify-center py-4 text-slate-400">
                                        <AlertCircle className="w-6 h-6 mb-1 text-red-400" />
                                        <span className="text-[10px]">Failed to load</span>
                                    </div>
                                ) : (
                                    <img
                                        src={data.imageUrl}
                                        alt="Image preview"
                                        className="w-full h-auto max-h-[100px] object-contain rounded"
                                        onError={() => setImageError(true)}
                                    />
                                )}
                            </div>
                        )}

                        {/* Caption Display */}
                        {hasCaption && (
                            <div className="mt-2 bg-slate-800/60 border border-slate-600/40 rounded-lg p-2 backdrop-blur-sm">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                                    Caption
                                </div>
                                <div className="text-slate-300 text-xs leading-relaxed break-words">
                                    {data.caption.length > 50
                                        ? `${data.caption.substring(0, 50)}...`
                                        : data.caption
                                    }
                                </div>
                            </div>
                        )}

                        {/* Delay Display */}
                        {data.delaySeconds > 0 && (
                            <div className="text-rose-300 text-xs mt-2 font-semibold">
                                ⏱️ Delay: {data.delaySeconds}s
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

                {/* Action Buttons */}
                <NodeToolbar
                    onClone={handleClone}
                    onConfigure={handleConfigure}
                    onDelete={handleDelete}
                    color="blue"
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

export default CustomImageNode;
