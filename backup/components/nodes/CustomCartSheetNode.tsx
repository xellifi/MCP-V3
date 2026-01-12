import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Table2, Settings, Trash2, Copy, ShoppingCart, ExternalLink } from 'lucide-react';
import NodeInsights from '../NodeInsights';

const CustomCartSheetNode: React.FC<NodeProps> = ({ data, id, selected }) => {
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

    const handleClone = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (data.onClone) {
            data.onClone();
        }
    };

    // Configuration values from data
    const sheetName = data.sheetName || '';
    const webhookUrl = data.webhookUrl || '';
    const isConfigured = webhookUrl && webhookUrl.length > 10;

    return (
        <div className="relative group">
            {/* Node Container */}
            <div
                className={`
                    relative px-4 py-3 rounded-2xl
                    bg-green-500/10 hover:bg-green-500/20 backdrop-blur-md
                    border ${selected ? 'border-green-500/50 shadow-2xl shadow-green-500/20' : 'border-green-500/30 shadow-xl'}
                    transition-all duration-300
                    w-[200px]
                `}
            >
                {/* Header - Icon and Label */}
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-500/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                        <Table2 className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-slate-200 font-bold text-sm truncate">
                            {data.label || 'Cart Sheet'}
                        </div>
                        <div className="text-green-300 text-xs flex items-center gap-1">
                            <ShoppingCart className="w-3 h-3" />
                            Order Data to Sheets
                        </div>
                    </div>
                </div>

                {/* Configuration Status */}
                <div className="mt-2 pt-2 border-t border-green-500/20">
                    {isConfigured ? (
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            <span className="text-xs text-green-300 truncate">
                                {sheetName || 'Connected'}
                            </span>
                            <ExternalLink className="w-3 h-3 text-green-400 ml-auto" />
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-amber-400 rounded-full" />
                            <span className="text-xs text-amber-300">
                                Configure webhook
                            </span>
                        </div>
                    )}
                </div>

                {/* Preview Info */}
                <div className="mt-2 p-2 bg-green-500/10 rounded-lg">
                    <div className="text-[10px] text-green-300 space-y-0.5">
                        <div className="flex justify-between">
                            <span>Products</span>
                            <span className="text-green-400">✓ All cart items</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Prices</span>
                            <span className="text-green-400">✓ Each + Total</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Customer</span>
                            <span className="text-green-400">✓ Name & ID</span>
                        </div>
                    </div>
                </div>

                {/* Action Buttons - Visible on Hover */}
                <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                        onClick={handleClone}
                        className="p-1.5 bg-slate-600/80 hover:bg-slate-600 text-white rounded-lg shadow-lg hover:scale-110 transition-all"
                        title="Clone node"
                    >
                        <Copy className="w-3 h-3" />
                    </button>
                    <button
                        onClick={handleConfigure}
                        className="p-1.5 bg-green-500/80 hover:bg-green-500 text-white rounded-lg shadow-lg hover:scale-110 transition-all"
                        title="Configure"
                    >
                        <Settings className="w-3 h-3" />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg shadow-lg hover:scale-110 transition-all"
                        title="Delete"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>

                {/* Node Insights */}
                <NodeInsights />
            </div>

            {/* Connection Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 !bg-green-400 !border-2 !border-white"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 !bg-green-400 !border-2 !border-white"
            />
        </div>
    );
};

export default CustomCartSheetNode;
