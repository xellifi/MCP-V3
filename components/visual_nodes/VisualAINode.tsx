import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Sparkles, Bot, BrainCircuit } from 'lucide-react';

const VisualAINode = ({ data }: { data: any }) => {
    return (
        <div className="relative group">
            <Handle
                type="target"
                position={Position.Left}
                className="!w-4 !h-4 !bg-gradient-to-r !from-violet-500 !to-indigo-600 !border-4 !border-slate-900 shadow-xl !-left-2"
            />

            {/* Node Container */}
            <div className="w-[300px] bg-slate-900/90 backdrop-blur-xl border-2 border-violet-500/50 rounded-2xl shadow-[0_0_30px_rgba(139,92,246,0.3)] overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-violet-400">

                {/* Header */}
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4 flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg leading-tight">AI Agent</h3>
                        <p className="text-violet-100 text-xs font-medium opacity-90">Generate Content</p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Model</label>
                        <div className="bg-black/40 rounded-xl p-2 border border-white/5 flex items-center gap-2 text-slate-300 text-sm">
                            <BrainCircuit className="w-4 h-4 text-violet-400" />
                            GPT-4 Turbo
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prompt</label>
                        <div className="bg-black/40 rounded-xl p-3 border border-white/5 text-slate-500 text-xs italic h-16 overflow-hidden">
                            Generate a creative post about...
                        </div>
                    </div>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="!w-4 !h-4 !bg-gradient-to-r !from-violet-500 !to-indigo-600 !border-4 !border-slate-900 shadow-xl !-right-2"
            />
        </div>
    );
};

export default memo(VisualAINode);
