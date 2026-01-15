import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Lightbulb, Settings, Trash2, CheckCircle, Loader, XCircle } from 'lucide-react';

import { useTheme } from '../../context/ThemeContext';

const VisualTopicNode = ({ data }: { data: any }) => {
    const { isDark } = useTheme();
    const executionStatus = data.executionStatus as 'idle' | 'executing' | 'completed' | 'error' | undefined;
    const isExecuting = executionStatus === 'executing';
    const isCompleted = executionStatus === 'completed';
    const isError = executionStatus === 'error';

    const getBorderClasses = () => {
        if (isError) {
            return 'border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.6)]';
        }
        if (isExecuting) {
            return 'border-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.6)]';
        }
        if (isCompleted) {
            return isDark
                ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                : 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]';
        }
        return isDark
            ? 'border-amber-500/50 hover:border-amber-500'
            : 'border-slate-300 hover:border-amber-500 hover:shadow-amber-500/20';
    };

    return (
        <div className="relative group">
            {/* Input Handle - Left */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-2.5 !h-2.5 !bg-slate-500 !border-none !rounded-full !-left-1 hover:!bg-slate-400 transition-colors"
            />

            {/* Controls - Center Top - OUTSIDE overflow-hidden container */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-50">
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

            {/* Node Container - Rectangular */}
            <div className={`w-[200px] h-20 border-2 rounded-xl shadow-lg flex items-center justify-center gap-3 relative transition-all overflow-hidden ${isDark ? 'bg-[#1e1e1e]' : 'bg-white'} ${getBorderClasses()}`}>

                {/* Animated border orbs when executing */}
                {isExecuting && (
                    <>
                        {/* Top orb - travels left to right along top border */}
                        <div
                            className="absolute w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_15px_#3b82f6,0_0_30px_#3b82f6] z-30"
                            style={{
                                top: '-6px',
                                animation: 'orbTop 1s linear infinite',
                            }}
                        />
                        {/* Bottom orb - travels left to right along bottom border */}
                        <div
                            className="absolute w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_15px_#3b82f6,0_0_30px_#3b82f6] z-30"
                            style={{
                                bottom: '-6px',
                                animation: 'orbBottom 1s linear infinite',
                            }}
                        />
                        {/* CSS Keyframes for border animation */}
                        <style>{`
                            @keyframes orbTop {
                                0% { left: -6px; }
                                100% { left: calc(100% - 6px); }
                            }
                            @keyframes orbBottom {
                                0% { left: -6px; }
                                100% { left: calc(100% - 6px); }
                            }
                        `}</style>
                    </>
                )}

                {/* Content: Icon + Text */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-md ${isError ? 'bg-red-500' : isExecuting ? 'bg-blue-500' : isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-br from-amber-500 to-orange-600'} ${isDark ? 'shadow-amber-900/40' : 'shadow-amber-500/30'}`}>
                    {isError ? (
                        <XCircle className="w-6 h-6 text-white" />
                    ) : isExecuting ? (
                        <Loader className="w-6 h-6 text-white animate-spin" />
                    ) : isCompleted ? (
                        <CheckCircle className="w-6 h-6 text-white" />
                    ) : (
                        <Lightbulb className="w-6 h-6 text-white" />
                    )}
                </div>
                <div className="flex flex-col">
                    <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Topic Generator</span>
                    <span className={`text-xs ${isError ? 'text-red-400' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {isError ? 'Failed!' : isExecuting ? 'Generating...' : isCompleted ? 'Done!' : data.aiProvider === 'gemini' ? 'Gemini' : 'OpenAI'}
                    </span>
                </div>
            </div>

            {/* Output Handle - Right */}
            <Handle
                type="source"
                position={Position.Right}
                className="!w-2.5 !h-2.5 !bg-slate-500 !border-none !rounded-full !-right-1 hover:!bg-slate-400 transition-colors"
            />
        </div>
    );
};

export default memo(VisualTopicNode);


