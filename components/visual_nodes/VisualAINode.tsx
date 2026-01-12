import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Sparkles, Bot, BrainCircuit, Settings, Trash2 } from 'lucide-react';

import { useTheme } from '../../context/ThemeContext';

const VisualAINode = ({ data }: { data: any }) => {
    const { isDark } = useTheme();
    return (
        <div className="relative group">
            {/* Input Handle - Left (Small dot) */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-2.5 !h-2.5 !bg-slate-500 !border-none !rounded-full !-left-1 hover:!bg-slate-400 transition-colors"
            />

            {/* Node Container - Rectangular */}
            <div className={`w-[200px] h-20 border-2 rounded-xl shadow-lg flex items-center justify-center gap-3 relative group/node transition-colors ${isDark
                ? 'bg-[#1e1e1e] border-slate-500'
                : 'bg-white border-slate-300 hover:border-violet-500 hover:shadow-violet-500/20'
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
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-md bg-gradient-to-br from-violet-500 to-indigo-600 ${isDark ? 'shadow-indigo-900/40' : 'shadow-indigo-500/30'}`}>
                    <Bot className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col">
                    <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>AI Agent</span>
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Tools Agent</span>
                </div>

            </div>

            {/* Bottom Handles - Centered on border line */}
            {/* Chat Model */}
            <div className="absolute bottom-0 left-[20%] -translate-x-1/2 translate-y-1/2 flex flex-col items-center">
                <Handle
                    type="target"
                    position={Position.Bottom}
                    id="chat-model"
                    className="!w-2.5 !h-2.5 !bg-slate-500 !border-none !rounded-full !static hover:!bg-slate-400 transition-colors"
                />
                <span className={`absolute top-3 text-[10px] font-medium whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Chat Model<span className="text-red-500">*</span></span>
            </div>

            {/* Memory */}
            <div className="absolute bottom-0 left-[50%] -translate-x-1/2 translate-y-1/2 flex flex-col items-center">
                <Handle
                    type="target"
                    position={Position.Bottom}
                    id="memory"
                    className="!w-2.5 !h-2.5 !bg-slate-500 !border-none !rounded-full !static hover:!bg-slate-400 transition-colors"
                />
                <span className={`absolute top-3 text-[10px] font-medium whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Memory</span>
            </div>

            {/* Tool */}
            <div className="absolute bottom-0 left-[80%] -translate-x-1/2 translate-y-1/2 flex flex-col items-center">
                <Handle
                    type="target"
                    position={Position.Bottom}
                    id="tool"
                    className="!w-2.5 !h-2.5 !bg-slate-500 !border-none !rounded-full !static hover:!bg-slate-400 transition-colors"
                />
                <span className={`absolute top-3 text-[10px] font-medium whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Tool</span>
            </div>

            {/* Output Handle - Right (Small dot) */}
            <Handle
                type="source"
                position={Position.Right}
                className="!w-2.5 !h-2.5 !bg-slate-500 !border-none !rounded-full !-right-1 hover:!bg-slate-400 transition-colors"
            />
        </div>
    );
};

export default memo(VisualAINode);
