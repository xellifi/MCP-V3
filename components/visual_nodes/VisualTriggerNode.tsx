import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Zap, AlarmClock, Settings, Trash2 } from 'lucide-react';

import { useTheme } from '../../context/ThemeContext';

const VisualTriggerNode = ({ data }: { data: any }) => {
    const { isDark } = useTheme();
    return (
        <div className="relative group flex flex-col items-center !bg-transparent" style={{ background: 'transparent', borderRadius: '50%' }}>
            {/* Output Handle - Right (Connects to next node) */}
            <Handle
                type="source"
                position={Position.Right}
                className={`!w-3 !h-3 !border-2 !rounded-full !-right-1.5 transition-colors z-10 ${isDark
                        ? '!bg-cyan-500 !border-slate-900 hover:!bg-cyan-400'
                        : '!bg-cyan-500 !border-white hover:!bg-cyan-600'
                    }`}
            />

            {/* Node Container - Circle */}
            <div className={`w-[60px] h-[60px] border-2 rounded-full shadow-lg flex flex-col items-center justify-center relative z-0 overflow-visible transition-all duration-200 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] ${isDark
                    ? 'bg-slate-900 border-slate-700 hover:border-cyan-500/50'
                    : 'bg-white border-slate-200 hover:border-cyan-400 hover:shadow-cyan-500/20'
                }`}>
                <div className={`absolute inset-0 pointer-events-none rounded-full ${isDark ? 'bg-cyan-500/5' : 'bg-cyan-50/50'}`} />

                {/* Left Badge: Blue Lightning (Satellite) */}
                <div className="absolute -left-[34px] top-1/2 -translate-y-1/2 z-10">
                    <div className={`rounded-full p-1 border shadow-[0_0_10px_rgba(59,130,246,0.4)] ${isDark
                            ? 'bg-slate-900 border-blue-500/30'
                            : 'bg-white border-blue-200 shadow-blue-500/20'
                        }`}>
                        <Zap className={`w-3 h-3 ${isDark ? 'text-blue-500 fill-blue-500' : 'text-blue-600 fill-blue-600'}`} />
                    </div>
                </div>

                {/* Main Icon */}
                <AlarmClock className={`w-7 h-7 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} strokeWidth={1.5} />
            </div>

            {/* Controls - Outside circle, positioned to top-right like Memory node */}
            <div className="absolute -top-2 -right-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                <button
                    onClick={(e) => { e.stopPropagation(); data.onConfigure?.(); }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center border shadow-md transform hover:scale-110 transition-all ${isDark
                            ? 'bg-slate-800 hover:bg-slate-700 border-white/10'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                    title="Configure"
                >
                    <Settings className={`w-3.5 h-3.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); data.onDelete?.(); }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center border shadow-md transform hover:scale-110 transition-all group/delete ${isDark
                            ? 'bg-slate-800 hover:bg-red-900/50 border-white/10'
                            : 'bg-white hover:bg-red-50 border-slate-200'
                        }`}
                    title="Delete"
                >
                    <Trash2 className={`w-3.5 h-3.5 ${isDark ? 'text-slate-300 group-hover/delete:text-red-400' : 'text-slate-600 group-hover/delete:text-red-500'}`} />
                </button>
            </div>
        </div>
    );
};

export default memo(VisualTriggerNode);
