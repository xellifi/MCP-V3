import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ShoppingCart, ChevronDown, ChevronUp, Package } from 'lucide-react';
import NodeToolbar from '../NodeToolbar';
import NodeInsights from '../NodeInsights';

const CustomCheckoutNode: React.FC<NodeProps> = ({ data, selected }) => {
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
    const headerText = data.headerText || '🛒 Your Order Summary';
    const buttonText = data.buttonText || '✅ Proceed to Checkout';
    const isConfigured = headerText && buttonText;

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
                {/* Input Handle */}
                <Handle
                    type="target"
                    position={Position.Left}
                    className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-emerald-300"
                    style={{ left: -6 }}
                />

                {/* Header - Icon, Label, and Expand Toggle */}
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                        <ShoppingCart className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-slate-200 font-bold text-sm truncate">
                            {data.label || 'Checkout'}
                        </div>
                        <div className="text-emerald-300 text-xs flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            Order Review
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

                {/* Expandable Content - Checkout Preview */}
                {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-emerald-500/20">
                        {/* Checkout Preview Card */}
                        <div className="rounded-xl overflow-hidden bg-white shadow-lg p-3">
                            <div className="text-[10px] font-medium text-gray-500 mb-2">Cart Preview</div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-gray-600">📦 Product 1</span>
                                    <span className="font-medium">₱XXX</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-gray-600">📦 Product 2</span>
                                    <span className="font-medium">₱XXX</span>
                                </div>
                                <div className="border-t pt-1.5 flex justify-between text-xs font-bold">
                                    <span>Total:</span>
                                    <span className="text-emerald-600">₱X,XXX</span>
                                </div>
                            </div>
                            <div className="mt-2 bg-emerald-500 text-white text-[10px] font-medium py-1.5 rounded-lg text-center">
                                {buttonText}
                            </div>
                        </div>
                    </div>
                )}

                {/* Hover Actions */}
                <NodeToolbar
                    onClone={handleClone}
                    onConfigure={handleConfigure}
                    onDelete={handleDelete}
                    color="emerald"
                />

                {/* Node Insights */}
                <NodeInsights />

                {/* Output Handle */}
                <Handle
                    type="source"
                    position={Position.Right}
                    className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-emerald-300"
                    style={{ right: -6 }}
                />
            </div>
        </div>
    );
};

export default CustomCheckoutNode;
