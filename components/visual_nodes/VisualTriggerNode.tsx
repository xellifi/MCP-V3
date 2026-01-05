import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Zap, AlarmClock, Settings, Trash2 } from 'lucide-react';

const VisualTriggerNode = ({ data }: { data: any }) => {
    return (
        <div className="relative group flex flex-col items-center !bg-transparent" style={{ background: 'transparent', borderRadius: '50%' }}>
            {/* Output Handle - Right (Connects to next node) */}
            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-slate-900 !rounded-full !-right-1.5 hover:!bg-cyan-400 transition-colors z-10"
            />

            {/* Node Container - Circle with transparent background */}
            <div className="w-[60px] h-[60px] bg-slate-900 border-2 border-slate-700 rounded-full shadow-lg flex flex-col items-center justify-center relative z-0 overflow-visible transition-all duration-200 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:border-cyan-500/50">
                <div className="absolute inset-0 bg-cyan-500/5 pointer-events-none rounded-full" />

                {/* Left Badge: Blue Lightning (Satellite) */}
                <div className="absolute -left-[34px] top-1/2 -translate-y-1/2 z-10">
                    <div className="bg-slate-900 rounded-full p-1 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.4)]">
                        <Zap className="w-3 h-3 text-blue-500 fill-blue-500" />
                    </div>
                </div>

                {/* Main Icon */}
                <AlarmClock className="w-7 h-7 text-cyan-400" strokeWidth={1.5} />
            </div>

            {/* Controls - Outside circle, positioned to top-right like Memory node */}
            <div className="absolute -top-2 -right-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
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
        </div>
    );
};

export default memo(VisualTriggerNode);
