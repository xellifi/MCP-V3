import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Globe, Network, ArrowRightLeft } from 'lucide-react';

const VisualHTTPNode = ({ data }: { data: any }) => {
    return (
        <div className="relative group">
            <Handle
                type="target"
                position={Position.Left}
                className="!w-4 !h-4 !bg-gradient-to-r !from-cyan-500 !to-blue-600 !border-4 !border-slate-900 shadow-xl !-left-2"
            />

            {/* Node Container */}
            <div className="w-[320px] bg-slate-900/90 backdrop-blur-xl border-2 border-cyan-500/50 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.3)] overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-cyan-400">

                {/* Header */}
                <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-4 flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                        <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg leading-tight">HTTP Request</h3>
                        <p className="text-cyan-100 text-xs font-medium opacity-90">API Integration</p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                    <div className="flex gap-2">
                        <div className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-bold border border-blue-500/30">POST</div>
                        <div className="bg-black/40 rounded px-2 py-1 border border-white/5 text-slate-400 text-xs flex-1 truncate font-mono">
                            https://api.example.com/hooks
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</label>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                            <span className="text-xs text-slate-300">200 OK</span>
                        </div>
                    </div>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="!w-4 !h-4 !bg-gradient-to-r !from-cyan-500 !to-blue-600 !border-4 !border-slate-900 shadow-xl !-right-2"
            />
        </div>
    );
};

export default memo(VisualHTTPNode);
