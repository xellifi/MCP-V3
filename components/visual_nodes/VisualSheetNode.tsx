import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Table, FileSpreadsheet, Database, Settings, Trash2 } from 'lucide-react';

const VisualSheetNode = ({ data }: { data: any }) => {
    return (
        <div className="relative group">
            <Handle
                type="target"
                position={Position.Left}
                className="!w-4 !h-4 !bg-gradient-to-r !from-emerald-500 !to-green-600 !border-4 !border-slate-900 shadow-xl !-left-2"
            />

            {/* Node Container */}
            <div className="w-[280px] bg-slate-900/90 backdrop-blur-xl border-2 border-emerald-500/50 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-emerald-400">

                {/* Controls */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button
                        onClick={(e) => { e.stopPropagation(); data.onConfigure?.(); }}
                        className="w-8 h-8 bg-slate-800/80 hover:bg-slate-700 rounded-full flex items-center justify-center border border-white/10 transition-colors shadow-lg"
                        title="Configure"
                    >
                        <Settings className="w-4 h-4 text-slate-300" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); data.onDelete?.(); }}
                        className="w-8 h-8 bg-black/60 hover:bg-red-500/80 rounded-full flex items-center justify-center border border-white/10 transition-colors shadow-lg group/delete"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4 text-slate-300 group-hover/delete:text-white" />
                    </button>
                </div>

                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-4 flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                        <Table className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg leading-tight">Sheets</h3>
                        <p className="text-emerald-100 text-xs font-medium opacity-90">Read/Write Data</p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Spreadsheet</label>
                        <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex items-center gap-2 text-slate-300 text-sm">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                            <span className="truncate">Leads Database 2024</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Action</label>
                        <div className="bg-emerald-500/10 rounded-lg px-2 py-1 inline-block text-emerald-400 text-xs font-bold border border-emerald-500/20">
                            ADD ROW
                        </div>
                    </div>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                className="!w-4 !h-4 !bg-gradient-to-r !from-emerald-500 !to-green-600 !border-4 !border-slate-900 shadow-xl !-right-2"
            />
        </div>
    );
};

export default memo(VisualSheetNode);
