import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Video, Settings, Trash2, ChevronDown, ChevronUp, Link, AlertCircle, Copy } from 'lucide-react';
import NodeInsights from '../NodeInsights';

const CustomVideoNode: React.FC<NodeProps> = ({ data, selected }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [videoError, setVideoError] = useState(false);

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
        setVideoError(false);
    };

    // Check if there's content to show
    const hasVideo = data.videoUrl && data.videoUrl.length > 0;
    const hasCaption = data.caption && data.caption.length > 0;
    const hasDetails = hasVideo || hasCaption;

    // Check if it's a Facebook video
    const isFacebookVideo = hasVideo && (data.videoUrl.includes('facebook.com') || data.videoUrl.includes('fb.watch'));

    return (
        <div className="relative group">
            {/* Node Container - Fixed width */}
            <div
                className={`
                    relative px-4 py-3 rounded-2xl
                    bg-cyan-500/10 hover:bg-cyan-500/20 backdrop-blur-md
                    border ${selected ? 'border-cyan-500/50 shadow-2xl shadow-cyan-500/20' : 'border-cyan-500/30 shadow-xl'}
                    transition-all duration-300
                    w-[200px]
                `}
            >
                {/* Header - Icon, Label, and Expand Toggle */}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                        <Video className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-slate-200 font-bold text-sm truncate">
                            {data.label || 'Video'}
                        </div>
                        {/* Collapsed preview - show video source indicator */}
                        {!isExpanded && hasVideo && (
                            <div className="text-slate-400 text-xs mt-0.5 truncate flex items-center gap-1">
                                <Link className="w-3 h-3" />
                                {isFacebookVideo ? 'Facebook' : 'URL'}
                            </div>
                        )}
                    </div>
                    {/* Expand/Collapse Toggle */}
                    {hasDetails && (
                        <button
                            onClick={toggleExpand}
                            className="p-1 hover:bg-cyan-500/30 rounded-lg transition-colors flex-shrink-0"
                            title={isExpanded ? 'Collapse' : 'Expand details'}
                        >
                            {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-cyan-400" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-cyan-400" />
                            )}
                        </button>
                    )}
                </div>

                {/* Expanded Content - Collapsible Video Preview */}
                {isExpanded && hasDetails && (
                    <div className="mt-3 pt-3 border-t border-cyan-500/20">
                        {/* Video Preview */}
                        {hasVideo && (
                            <div className="bg-slate-800/60 border border-slate-600/40 rounded-lg p-2 backdrop-blur-sm overflow-hidden">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
                                    <Video className="w-3 h-3" />
                                    Video Preview
                                </div>
                                {videoError ? (
                                    <div className="flex flex-col items-center justify-center py-4 text-slate-400">
                                        <AlertCircle className="w-6 h-6 mb-1 text-amber-400" />
                                        <span className="text-[10px]">Preview unavailable</span>
                                    </div>
                                ) : isFacebookVideo ? (
                                    <div className="relative rounded overflow-hidden" style={{ height: '80px' }}>
                                        <iframe
                                            src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(data.videoUrl)}&show_text=false&width=200`}
                                            width="100%"
                                            height="100%"
                                            style={{ border: 'none', overflow: 'hidden' }}
                                            scrolling="no"
                                            frameBorder="0"
                                            allowFullScreen={true}
                                        />
                                        <div className="absolute top-1 left-1 bg-blue-600/90 text-white text-[8px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                            <Video className="w-2 h-2" />
                                            FB
                                        </div>
                                    </div>
                                ) : (
                                    <video
                                        src={data.videoUrl}
                                        className="w-full h-auto max-h-[80px] object-contain rounded"
                                        onError={() => setVideoError(true)}
                                        muted
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
                            <div className="text-cyan-300 text-xs mt-2 font-semibold">
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

            {/* Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 !bg-cyan-400 !border-2 !border-white"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 !bg-cyan-400 !border-2 !border-white"
            />
        </div>
    );
};

export default CustomVideoNode;
