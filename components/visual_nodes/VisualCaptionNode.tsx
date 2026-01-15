import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { PenTool, Settings, Trash2, CheckCircle, Loader } from 'lucide-react';

import { useTheme } from '../../context/ThemeContext';

const VisualCaptionNode = ({ data }: { data: any }) => {
    const { isDark } = useTheme();
    const executionStatus = data.executionStatus as 'idle' | 'executing' | 'completed' | 'error' | undefined;

    const getBorderClasses = () => {
        if (executionStatus === 'executing') {
            return 'border-amber-500 animate-pulse shadow-[0_0_25px_rgba(245,158,11,0.5)]';
        }
        if (executionStatus === 'completed') {
            return isDark
                ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                : 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]';
        }
        return isDark
            ? 'border-teal-500/50 hover:border-teal-500'
            : 'border-slate-300 hover:border-teal-500 hover:shadow-teal-500/20';
    };

    return (
        <div className="relative group">
            <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-slate-500 !border-none !rounded-full !-left-1 hover:!bg-slate-400 transition-colors" />

            <div className={`w-[200px] h-20 border-2 rounded-xl shadow-lg flex items-center justify-center gap-3 relative group/node transition-all ${isDark ? 'bg-[#1e1e1e]' : 'bg-white'} ${getBorderClasses()}`}>
                <div className="absolute -top-3 -right-3 flex gap-1 opacity-0 group-hover/node:opacity-100 transition-opacity z-20">
                    <button onClick={(e) => { e.stopPropagation(); data.onConfigure?.(); }} className={`w-7 h-7 rounded-full flex items-center justify-center border shadow-md transform hover:scale-110 transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 border-white/10' : 'bg-white hover:bg-slate-50 border-slate-200'}`} title="Configure">
                        <Settings className={`w-3.5 h-3.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); data.onDelete?.(); }} className={`w-7 h-7 rounded-full flex items-center justify-center border shadow-md transform hover:scale-110 transition-all group/delete ${isDark ? 'bg-slate-800 hover:bg-red-900/50 border-white/10' : 'bg-white hover:bg-red-50 border-slate-200'}`} title="Delete">
                        <Trash2 className={`w-3.5 h-3.5 ${isDark ? 'text-slate-300 group-hover/delete:text-red-400' : 'text-slate-600 group-hover/delete:text-red-500'}`} />
                    </button>
                </div>

                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-md ${executionStatus === 'executing' ? 'bg-amber-500' : executionStatus === 'completed' ? 'bg-emerald-500' : 'bg-gradient-to-br from-teal-500 to-emerald-600'} ${isDark ? 'shadow-teal-900/40' : 'shadow-teal-500/30'}`}>
                    {executionStatus === 'executing' ? <Loader className="w-6 h-6 text-white animate-spin" /> : executionStatus === 'completed' ? <CheckCircle className="w-6 h-6 text-white" /> : <PenTool className="w-6 h-6 text-white" />}
                </div>
                <div className="flex flex-col">
                    <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Caption Writer</span>
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {executionStatus === 'executing' ? 'Writing...' : executionStatus === 'completed' ? 'Done!' : data.tone || 'AI Caption'}
                    </span>
                </div>
            </div>

            <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-slate-500 !border-none !rounded-full !-right-1 hover:!bg-slate-400 transition-colors" />
        </div>
    );
};

export default memo(VisualCaptionNode);

