import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Sparkles, Bot, BrainCircuit, Settings, Trash2 } from 'lucide-react';

const VisualAINode = ({ data }: { data: any }) => {
    return (
        <div className="relative group">
            {/* Input Handle - Left (Small dot) */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-2.5 !h-2.5 !bg-slate-500 !border-none !rounded-full !-left-1 hover:!bg-slate-400 transition-colors"
            />

            {/* Node Container - Rectangular, Dark Gray, Light Border */}
            <div className="w-[200px] h-20 bg-[#1e1e1e] border-2 border-slate-500 rounded-xl shadow-lg flex items-center justify-center gap-3 relative group/node">

                {/* Controls */}
                <div className="absolute -top-3 -right-3 flex gap-1 opacity-0 group-hover/node:opacity-100 transition-opacity z-20">
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

                {/* Content: Icon + Text */}
                <Bot className="w-8 h-8 text-white" />
                <div className="flex flex-col">
                    <span className="font-bold text-white text-sm">AI Agent</span>
                    <span className="text-slate-400 text-xs">Tools Agent</span>
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
                <span className="absolute top-3 text-[10px] text-slate-400 font-medium whitespace-nowrap">Chat Model<span className="text-red-500">*</span></span>
            </div>

            {/* Memory */}
            <div className="absolute bottom-0 left-[50%] -translate-x-1/2 translate-y-1/2 flex flex-col items-center">
                <Handle
                    type="target"
                    position={Position.Bottom}
                    id="memory"
                    className="!w-2.5 !h-2.5 !bg-slate-500 !border-none !rounded-full !static hover:!bg-slate-400 transition-colors"
                />
                <span className="absolute top-3 text-[10px] text-slate-400 font-medium whitespace-nowrap">Memory</span>
            </div>

            {/* Tool */}
            <div className="absolute bottom-0 left-[80%] -translate-x-1/2 translate-y-1/2 flex flex-col items-center">
                <Handle
                    type="target"
                    position={Position.Bottom}
                    id="tool"
                    className="!w-2.5 !h-2.5 !bg-slate-500 !border-none !rounded-full !static hover:!bg-slate-400 transition-colors"
                />
                <span className="absolute top-3 text-[10px] text-slate-400 font-medium whitespace-nowrap">Tool</span>
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
