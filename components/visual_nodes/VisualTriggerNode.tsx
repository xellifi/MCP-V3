import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Zap, Clock, Calendar } from 'lucide-react';

const VisualTriggerNode = ({ data }: { data: any }) => {
    return (
        <div className="relative group">
            {/* Node Container */}
            <div className="w-[280px] bg-slate-900/90 backdrop-blur-xl border-2 border-orange-500/50 rounded-2xl shadow-[0_0_30px_rgba(249,115,22,0.3)] overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-orange-400">

                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-pink-600 p-4 flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                        <Zap className="w-5 h-5 text-white fill-current" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg leading-tight">Trigger</h3>
                        <p className="text-orange-100 text-xs font-medium opacity-90">Start Workflow</p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Event Source</label>
                        <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex items-center justify-between text-slate-300 font-medium">
                            <span className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-orange-400" />
                                Scheduled Time
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                className="!w-4 !h-4 !bg-gradient-to-r !from-orange-500 !to-pink-600 !border-4 !border-slate-900 shadow-xl !-right-2"
            />
        </div>
    );
};

export default memo(VisualTriggerNode);
