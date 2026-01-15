import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Facebook, Settings, Trash2, CheckCircle, Loader } from 'lucide-react';

import { useTheme } from '../../context/ThemeContext';

const VisualFacebookNode = ({ data }: { data: any }) => {
    const { isDark } = useTheme();
    const executionStatus = data.executionStatus as 'idle' | 'executing' | 'completed' | 'error' | undefined;
    const isExecuting = executionStatus === 'executing';
    const isCompleted = executionStatus === 'completed';

    const getBorderClasses = () => {
        if (isExecuting) {
            return 'border-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.6)]';
        }
        if (isCompleted) {
            return isDark
                ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                : 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]';
        }
        return isDark
            ? 'border-blue-500 hover:shadow-blue-500/30'
            : 'border-slate-200 hover:border-blue-500 hover:shadow-blue-500/20';
    };

    return (
        <div className="relative group">
            <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-slate-500 !border-none !rounded-full !-left-1 hover:!bg-slate-400 transition-colors" />

            <div className={`w-24 h-24 backdrop-blur-md border-2 rounded-xl shadow-lg flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 overflow-hidden ${isDark ? 'bg-slate-900/95' : 'bg-white'} ${getBorderClasses()}`}>

                {/* Animated border orbs when executing - two orbs travel around */}
                {isExecuting && (
                    <>
                        <div className="absolute w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_15px_#3b82f6,0_0_30px_#3b82f6] z-30" style={{ top: '-6px', animation: 'orbTopFb 1s linear infinite' }} />
                        <div className="absolute w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_15px_#3b82f6,0_0_30px_#3b82f6] z-30" style={{ bottom: '-6px', animation: 'orbBottomFb 1s linear infinite' }} />
                        <style>{`
                            @keyframes orbTopFb { 0% { left: -6px; } 100% { left: calc(100% - 6px); } }
                            @keyframes orbBottomFb { 0% { left: -6px; } 100% { left: calc(100% - 6px); } }
                        `}</style>
                    </>
                )}

                <div className="absolute -top-3 -right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button onClick={(e) => { e.stopPropagation(); data.onConfigure?.(); }} className={`w-7 h-7 rounded-full flex items-center justify-center border shadow-md transform hover:scale-110 transition-all ${isDark ? 'bg-slate-800 hover:bg-slate-700 border-white/10' : 'bg-white hover:bg-slate-50 border-slate-200'}`} title="Configure">
                        <Settings className={`w-3.5 h-3.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); data.onDelete?.(); }} className={`w-7 h-7 rounded-full flex items-center justify-center border shadow-md transform hover:scale-110 transition-all group/delete ${isDark ? 'bg-slate-800 hover:bg-red-900/50 border-white/10' : 'bg-white hover:bg-red-50 border-slate-200'}`} title="Delete">
                        <Trash2 className={`w-3.5 h-3.5 ${isDark ? 'text-slate-300 group-hover/delete:text-red-400' : 'text-slate-600 group-hover/delete:text-red-500'}`} />
                    </button>
                </div>

                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${isExecuting ? 'bg-blue-500' : isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-br from-blue-600 to-blue-700'} ${isDark ? 'shadow-blue-900/40' : 'shadow-blue-500/30'}`}>
                    {isExecuting ? <Loader className="w-7 h-7 text-white animate-spin" /> : isCompleted ? <CheckCircle className="w-7 h-7 text-white" /> : <Facebook className="w-7 h-7 text-white fill-white" />}
                </div>
            </div>

            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 text-center">
                <p className={`font-bold text-sm leading-tight ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    {isExecuting ? 'Posting...' : isCompleted ? 'Posted!' : data.pageName || 'Facebook Post'}
                </p>
                <div className="flex justify-center mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${isCompleted ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : data.isConfigured ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                        {isCompleted ? 'Success' : data.isConfigured ? 'Connected' : 'Not Configured'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default memo(VisualFacebookNode);


