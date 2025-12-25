import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { BrainCircuit, Settings, Trash2 } from 'lucide-react';

const VisualModelNode = ({ data }: { data: any }) => {
    return (
        <div className="relative group flex flex-col items-center !bg-transparent" style={{ background: 'transparent', borderRadius: '50%' }}>
            {/* Output Handle - Top (Connects to AI) - Small dot */}
            <Handle
                type="source"
                position={Position.Top}
                className="!w-2.5 !h-2.5 !bg-slate-500 !border-none !rounded-full !-top-1 hover:!bg-slate-400 transition-colors z-10"
            />

            {/* Node Container - Circle with transparent background */}
            <div className="w-20 h-20 bg-slate-900 border-2 border-slate-600 rounded-full shadow-lg flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 hover:shadow-violet-500/20 relative z-0 overflow-hidden">
                <div className="absolute inset-0 bg-violet-500/5 pointer-events-none" />
                <BrainCircuit className="w-8 h-8 text-violet-500" />
            </div>

            {/* Controls - Outside circle, positioned to right */}
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

            {/* Label Below */}
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 text-center">
                <span className="font-bold text-slate-400 text-xs text-center leading-tight block">Anthropic<br />Chat Model</span>
            </div>
        </div>
    );
};

export default memo(VisualModelNode);
