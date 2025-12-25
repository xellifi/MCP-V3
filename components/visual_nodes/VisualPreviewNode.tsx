import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Eye, Settings, Trash2 } from 'lucide-react';

const VisualPreviewNode = ({ data }: { data: any }) => {
    return (
        <div className="relative group flex flex-col items-center">
            {/* Input Handle - Small dot */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-2.5 !h-2.5 !bg-slate-500 !border-none !rounded-full !-left-1 hover:!bg-slate-400 transition-colors"
            />

            {/* Node Container - Pill Shape */}
            <div className="w-[180px] h-[60px] bg-slate-900/95 backdrop-blur-md border-2 border-pink-500 rounded-full shadow-lg flex items-center justify-center gap-3 transition-all hover:scale-105 hover:shadow-pink-500/20 relative">

                {/* Controls */}
                <div className="absolute -top-3 -right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button
                        onClick={(e) => { e.stopPropagation(); data.onConfigure?.(); }}
                        className="w-7 h-7 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center border border-white/10 shadow-md transform hover:scale-110 transition-all"
                        title="Configure"
                    >
                        <Settings className="w-3.5 h-3.5 text-slate-300" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); data.onDelete?.(); }}
                        className="w-7 h-7 bg-slate-800 hover:bg-red-900/50 rounded-full flex items-center justify-center border border-white/10 shadow-md transform hover:scale-110 transition-all group/delete"
                        title="Delete"
                    >
                        <Trash2 className="w-3.5 h-3.5 text-slate-300 group-hover/delete:text-red-400" />
                    </button>
                </div>

                <Eye className="w-5 h-5 text-pink-500" />
                <span className="font-bold text-slate-200 text-sm">Preview</span>
            </div>

            <span className="mt-2 text-[10px] text-slate-500 uppercase font-bold tracking-widest">Debug</span>

            {/* Output Handle - Small dot */}
            <Handle
                type="source"
                position={Position.Right}
                className="!w-2.5 !h-2.5 !bg-slate-500 !border-none !rounded-full !-right-1 hover:!bg-slate-400 transition-colors"
            />
        </div>
    );
};

export default memo(VisualPreviewNode);
