import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Clock, Settings, Trash2, RefreshCw } from 'lucide-react';

const CustomFollowupNode: React.FC<NodeProps> = ({ data, selected }) => {
    const handleConfigure = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (data.onConfigure) {
            data.onConfigure();
        }
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (data.onDelete) {
            data.onDelete();
        }
    };

    // Configuration values from data
    const firstDelay = data.firstDelayMinutes || 30;
    const interval = data.intervalMinutes || 120;
    const maxFollowups = data.maxFollowups || 3;
    const isConfigured = data.followupMessage && data.followupMessage.length > 0;

    return (
        <div className="relative group">
            {/* Node Container */}
            <div
                className={`
                    relative px-4 py-3 rounded-2xl
                    bg-rose-500/10 hover:bg-rose-500/20 backdrop-blur-md
                    border ${selected ? 'border-rose-500/50 shadow-2xl shadow-rose-500/20' : 'border-rose-500/30 shadow-xl'}
                    transition-all duration-300
                    w-[220px]
                `}
            >
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-500/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                        <RefreshCw className="w-5 h-5 text-rose-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-slate-200 font-bold text-sm truncate">
                            {data.label || 'Follow-up'}
                        </div>
                        <div className="text-slate-400 text-xs mt-0.5">
                            Abandoned Cart Recovery
                        </div>
                    </div>
                </div>

                {/* Configuration Summary */}
                <div className="mt-3 pt-3 border-t border-rose-500/20 space-y-2">
                    {/* Timing Settings */}
                    <div className="flex items-center gap-2 text-xs">
                        <Clock className="w-3.5 h-3.5 text-rose-400" />
                        <span className="text-slate-400">First:</span>
                        <span className="text-rose-300 font-medium">{firstDelay} min</span>
                        <span className="text-slate-500">|</span>
                        <span className="text-slate-400">Then:</span>
                        <span className="text-rose-300 font-medium">{interval} min</span>
                    </div>

                    {/* Max Follow-ups */}
                    <div className="flex items-center gap-2 text-xs">
                        <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
                        <span className="text-slate-400">Max reminders:</span>
                        <span className="text-rose-300 font-medium">{maxFollowups}</span>
                    </div>

                    {/* Message Preview */}
                    {isConfigured ? (
                        <div className="bg-slate-800/60 border border-slate-600/40 rounded-lg p-2 mt-2">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">
                                📩 Message Preview
                            </div>
                            <div className="text-slate-300 text-xs truncate">
                                {data.followupMessage?.substring(0, 40)}...
                            </div>
                        </div>
                    ) : (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 mt-2">
                            <div className="text-amber-300 text-xs font-medium text-center">
                                ⚠️ Configure message
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                        onClick={handleConfigure}
                        className="w-7 h-7 bg-blue-500 rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 transition-colors"
                        title="Configure"
                    >
                        <Settings className="w-4 h-4 text-white" />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="w-7 h-7 bg-red-500 rounded-full shadow-lg flex items-center justify-center hover:bg-red-600 transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4 text-white" />
                    </button>
                </div>
            </div>

            {/* Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 !bg-rose-400 !border-2 !border-white"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 !bg-rose-400 !border-2 !border-white"
            />
        </div>
    );
};

export default CustomFollowupNode;
