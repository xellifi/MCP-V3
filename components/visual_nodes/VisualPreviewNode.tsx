import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Eye, Settings, Trash2 } from 'lucide-react';

const VisualPreviewNode = ({ data }: { data: any }) => {
    return (
        <div className="relative group">
            {/* Left Accent Line - Thin pink bar */}
            <div className="absolute -left-1 top-3 bottom-3 w-1 bg-pink-400 rounded-full" />

            {/* Input Handle - Left */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-2.5 !h-2.5 !bg-slate-400 !border-none !rounded-full !-left-2 hover:!bg-slate-300 transition-colors"
            />

            {/* Node Container - Light card */}
            <div className="w-[180px] bg-slate-100 border border-slate-200 rounded-2xl shadow-lg flex items-center gap-3 p-3 relative group/node transition-all hover:shadow-xl">

                {/* Pink Icon Square */}
                <div className="w-10 h-10 bg-pink-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                    <Eye className="w-5 h-5 text-white" />
                </div>

                {/* Text Content */}
                <div className="flex flex-col min-w-0">
                    <span className="font-bold text-slate-800 text-sm">Preview</span>
                    <span className="text-slate-500 text-xs">Debug</span>
                </div>

                {/* Controls */}
                <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover/node:opacity-100 transition-opacity z-20">
                    <button
                        onClick={(e) => { e.stopPropagation(); data.onConfigure?.(); }}
                        className="w-6 h-6 bg-white hover:bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 shadow-sm transform hover:scale-110 transition-all"
                        title="Configure"
                    >
                        <Settings className="w-3 h-3 text-slate-500" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); data.onDelete?.(); }}
                        className="w-6 h-6 bg-white hover:bg-red-50 rounded-full flex items-center justify-center border border-slate-200 shadow-sm transform hover:scale-110 transition-all group/delete"
                        title="Delete"
                    >
                        <Trash2 className="w-3 h-3 text-slate-500 group-hover/delete:text-red-500" />
                    </button>
                </div>
            </div>

            {/* Output Handle - Right */}
            <Handle
                type="source"
                position={Position.Right}
                className="!w-2.5 !h-2.5 !bg-slate-400 !border-none !rounded-full !-right-2 hover:!bg-slate-300 transition-colors"
            />
        </div>
    );
};

export default memo(VisualPreviewNode);
