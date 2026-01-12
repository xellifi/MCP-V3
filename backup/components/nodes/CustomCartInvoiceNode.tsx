import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FileText, Settings, Trash2, ChevronDown, ChevronUp, Package, Receipt, Copy, DollarSign } from 'lucide-react';

const CustomCartInvoiceNode: React.FC<NodeProps> = ({ data, selected }) => {
    const [isExpanded, setIsExpanded] = useState(false);

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

    const toggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    // Configuration values from data
    const companyName = data.companyName || 'Your Store';
    const primaryColor = data.primaryColor || '#10b981';
    const showShipping = data.showShipping ?? true;
    const shippingFee = data.shippingFee || 0;
    const isConfigured = companyName !== 'Your Store';

    return (
        <div className="relative group">
            {/* Node Container */}
            <div
                className={`
                    relative px-4 py-3 rounded-2xl
                    bg-emerald-500/10 hover:bg-emerald-500/20 backdrop-blur-md
                    border ${selected ? 'border-emerald-500/50 shadow-2xl shadow-emerald-500/20' : 'border-emerald-500/30 shadow-xl'}
                    transition-all duration-300
                    w-[200px]
                `}
            >
                {/* Header - Icon, Label, and Expand Toggle */}
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                        <FileText className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-slate-200 font-bold text-sm truncate">
                            {data.label || 'Cart Invoice'}
                        </div>
                        <div className="text-emerald-300 text-xs flex items-center gap-1">
                            <Receipt className="w-3 h-3" />
                            Order Summary
                        </div>
                    </div>
                    {/* Expand Toggle */}
                    <button
                        onClick={toggleExpand}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                        title={isExpanded ? "Collapse" : "Expand"}
                    >
                        {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                    </button>
                </div>

                {/* Expandable Content - Cart Invoice Preview */}
                {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-emerald-500/20">
                        {/* Cart Invoice Preview Card */}
                        <div className="rounded-xl p-3 shadow-lg transition-all duration-300 bg-white">
                            {/* Store Header */}
                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                                        <FileText className="w-3 h-3 text-white" />
                                    </div>
                                    <div className="text-xs font-bold text-slate-800">{companyName}</div>
                                </div>
                                <div className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
                                    Cart Order
                                </div>
                            </div>

                            {/* Cart Items Preview */}
                            <div className="space-y-1.5 mb-3">
                                <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded">
                                    <Package className="w-3 h-3 text-slate-400" />
                                    <div className="flex-1">
                                        <div className="text-[10px] font-medium text-slate-700">Main Product</div>
                                        <div className="text-[9px] text-slate-500">x1</div>
                                    </div>
                                    <span className="text-[10px] font-medium text-slate-800">₱500</span>
                                </div>
                                <div className="flex items-center gap-2 p-1.5 bg-emerald-50 rounded border border-emerald-100">
                                    <Package className="w-3 h-3 text-emerald-500" />
                                    <div className="flex-1">
                                        <div className="text-[10px] font-medium text-emerald-700">+ Upsell Item</div>
                                        <div className="text-[9px] text-emerald-600">x1</div>
                                    </div>
                                    <span className="text-[10px] font-medium text-emerald-700">₱200</span>
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="space-y-1 pt-2 border-t border-dashed border-slate-200">
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-600">Subtotal</span>
                                    <span className="text-slate-800">₱700</span>
                                </div>
                                {showShipping && (
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-slate-600">Shipping</span>
                                        <span className="text-slate-800">₱{shippingFee}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-xs font-bold pt-1">
                                    <span className="text-slate-800">Total</span>
                                    <span style={{ color: primaryColor }}>₱{700 + shippingFee}</span>
                                </div>
                            </div>
                        </div>

                        {/* Info Badge */}
                        <div className="mt-2 flex items-center gap-1.5 p-2 bg-emerald-500/10 rounded-lg">
                            <DollarSign className="w-3 h-3 text-emerald-400" />
                            <span className="text-[10px] text-emerald-300">
                                Shows combined cart items from flow
                            </span>
                        </div>
                    </div>
                )}

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
                        className="p-1.5 bg-emerald-500/80 hover:bg-emerald-500 text-white rounded-lg shadow-lg hover:scale-110 transition-all"
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
            </div>

            {/* Connection Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 !bg-emerald-400 !border-2 !border-white"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 !bg-emerald-400 !border-2 !border-white"
            />
        </div>
    );
};

export default CustomCartInvoiceNode;
