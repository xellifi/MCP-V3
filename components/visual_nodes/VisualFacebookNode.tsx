import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Facebook, Settings, Trash2 } from 'lucide-react';

import { useTheme } from '../../context/ThemeContext';

const VisualFacebookNode = ({ data }: { data: any }) => {
    const { isDark } = useTheme();
    return (
        <div className="relative group">
            {/* Input Handle - Left */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-2.5 !h-2.5 !bg-slate-500 !border-none !rounded-full !-left-1 hover:!bg-slate-400 transition-colors"
            />

            {/* Node Container - Square with Facebook blue */}
            <div className={`w-24 h-24 backdrop-blur-md border-2 rounded-xl shadow-lg flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 ${isDark
                ? 'bg-slate-900/95 border-blue-500 hover:shadow-blue-500/30'
                : 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-blue-500/20'
                }`}>

                {/* Controls */}
                <div className="absolute -top-3 -right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
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

                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br from-blue-600 to-blue-700 ${isDark ? 'shadow-blue-900/40' : 'shadow-blue-500/30'}`}>
                    <Facebook className="w-7 h-7 text-white fill-white" />
                </div>
            </div>

            {/* Label Below */}
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 text-center">
                <p className={`font-bold text-sm leading-tight ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    {data.pageName || 'Facebook Post'}
                </p>
                <div className="flex justify-center mt-1">
                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30 font-bold">
                        {data.isConfigured ? 'Connected' : 'Not Configured'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default memo(VisualFacebookNode);
