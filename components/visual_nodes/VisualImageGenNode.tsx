import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { ImagePlus, Settings, Trash2 } from 'lucide-react';

import { useTheme } from '../../context/ThemeContext';

const VisualImageGenNode = ({ data }: { data: any }) => {
    const { isDark } = useTheme();
    return (
        <div className="relative group">
            {/* Input Handle - Left */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-2.5 !h-2.5 !bg-slate-500 !border-none !rounded-full !-left-1 hover:!bg-slate-400 transition-colors"
            />

            {/* Node Container - Rectangular */}
            <div className={`w-[200px] h-20 border-2 rounded-xl shadow-lg flex items-center justify-center gap-3 relative group/node transition-colors ${isDark
                ? 'bg-[#1e1e1e] border-pink-500/50 hover:border-pink-500'
                : 'bg-white border-slate-300 hover:border-pink-500 hover:shadow-pink-500/20'
                }`}>

                {/* Controls */}
                <div className="absolute -top-3 -right-3 flex gap-1 opacity-0 group-hover/node:opacity-100 transition-opacity z-20">
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

                {/* Content: Icon + Text */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-md bg-gradient-to-br from-pink-500 to-rose-600 ${isDark ? 'shadow-pink-900/40' : 'shadow-pink-500/30'}`}>
                    <ImagePlus className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col">
                    <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Image Generator</span>
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {data.size || 'AI Image'}
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

export default memo(VisualImageGenNode);
