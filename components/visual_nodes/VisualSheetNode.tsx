import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Table, FileSpreadsheet, Database, Settings, Trash2 } from 'lucide-react';

const VisualSheetNode = ({ data }: { data: any }) => {
    return (
        <div className="relative group">
            {/* Input Handle - Small dot */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-2.5 !h-2.5 !bg-slate-500 !border-none !rounded-full !-left-1 hover:!bg-slate-400 transition-colors"
            />

            {/* Node Container - Square */}
            <div className="w-24 h-24 bg-slate-900/95 backdrop-blur-md border-2 border-emerald-500 rounded-xl shadow-lg flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 hover:shadow-emerald-500/20 relative">



                {/* Controls */}
                <div className="absolute -top-3 -right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
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

                <Table className="w-10 h-10 text-emerald-500" />
            </div>

            {/* Label Below */}
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 text-center">
                <p className="text-slate-200 font-bold text-sm leading-tight">Google Sheets</p>
                <p className="text-slate-400 text-[10px] uppercase tracking-wide">Add Row</p>
            </div>

            {/* Output Handle - Small dot */}
            <Handle
                type="source"
                position={Position.Right}
                className="!w-2.5 !h-2.5 !bg-slate-500 !border-none !rounded-full !-right-1 hover:!bg-slate-400 transition-colors"
            />
        </div>
    );
};

export default memo(VisualSheetNode);
