import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Zap, Clock, Calendar, Settings, Trash2 } from 'lucide-react';

const VisualTriggerNode = ({ data }: { data: any }) => {
    return (
        <div className="relative group">
            {/* Node Container - D Shape */}
            <div className="w-24 h-24 bg-slate-900/95 backdrop-blur-md border-2 border-slate-600 rounded-l-2xl rounded-r-[3rem] flex items-center justify-center relative shadow-lg group-hover:scale-105 transition-transform">

                {/* Controls */}
                <div className="absolute -top-3 -right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
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

                {/* External Lightning Icon */}
                <div className="absolute -left-6 top-1/2 -translate-y-1/2">
                    <Zap className="w-5 h-5 text-orange-500 fill-orange-500" />
                </div>

                {/* Inner Icon */}
                <Clock className="w-10 h-10 text-cyan-400" strokeWidth={1.5} />
            </div>

            {/* Text Below */}
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 text-center">
                <p className="text-slate-200 font-medium text-sm leading-tight">
                    Post Scheduler Trigger
                </p>
            </div>

            {/* Output Handle - Small dot */}
            <Handle
                type="source"
                position={Position.Right}
                className="!w-2.5 !h-2.5 !bg-slate-500 !border-none !rounded-full !-right-1 hover:!bg-slate-400 transition-colors"
            />
        </div>
    );
};

export default memo(VisualTriggerNode);
