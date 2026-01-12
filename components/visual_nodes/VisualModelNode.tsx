import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { BrainCircuit, Settings, Trash2 } from 'lucide-react';

import { useTheme } from '../../context/ThemeContext';

const VisualModelNode = ({ data }: { data: any }) => {
    const { isDark } = useTheme();
    return (
        <div className="relative group flex flex-col items-center !bg-transparent" style={{ background: 'transparent', borderRadius: '50%' }}>
            {/* Output Handle - Top (Connects to AI) - Small dot */}
            <Handle
                type="source"
                position={Position.Top}
                className="!w-2.5 !h-2.5 !bg-slate-500 !border-none !rounded-full !-top-1 hover:!bg-slate-400 transition-colors z-10"
            />

            {/* Node Container - Circle */}
            <div className={`w-20 h-20 border-2 rounded-full shadow-lg flex flex-col items-center justify-center gap-1 transition-all hover:scale-105 relative z-0 overflow-hidden ${isDark
                    ? 'bg-slate-900 border-slate-600 hover:shadow-violet-500/20'
                    : 'bg-white border-slate-200 hover:border-violet-400 hover:shadow-violet-500/20'
                }`}>
                <div className={`absolute inset-0 pointer-events-none ${isDark ? 'bg-violet-500/5' : 'bg-violet-50/50'}`} />
                <BrainCircuit className={`w-8 h-8 ${isDark ? 'text-violet-500' : 'text-violet-600'}`} />
            </div>

            {/* Controls - Outside circle, positioned to right */}
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

            {/* Label Below */}
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 text-center">
                <span className={`font-bold text-xs text-center leading-tight block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Anthropic<br />Chat Model</span>
            </div>
        </div>
    );
};

export default memo(VisualModelNode);
