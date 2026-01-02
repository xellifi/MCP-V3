import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ShoppingBag, Settings, Trash2, ChevronDown, ChevronUp, Package, Tag, Image as ImageIcon } from 'lucide-react';

const CustomProductNode: React.FC<NodeProps> = ({ data, selected }) => {
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

    const toggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    // Configuration values from data
    const productName = data.productName || '';
    const productPrice = data.productPrice || 0;
    const productImage = data.productImage || '';
    const productCategory = data.productCategory || '';
    const isConfigured = productName && productPrice;

    // Format price
    const formatPrice = (price: number) => {
        return `₱${price.toLocaleString()}`;
    };

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
                        <ShoppingBag className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-slate-200 font-bold text-sm truncate">
                            {data.label || 'Product'}
                        </div>
                        <div className="text-emerald-300 text-xs flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {isConfigured ? productName : 'Not configured'}
                        </div>
                    </div>
                    {/* Expand Toggle */}
                    {isConfigured && (
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
                    )}
                </div>

                {/* Expandable Content - Product Preview */}
                {isExpanded && isConfigured && (
                    <div className="mt-3 pt-3 border-t border-emerald-500/20">
                        {/* Product Preview Card */}
                        <div className="rounded-xl overflow-hidden bg-white shadow-lg">
                            {/* Product Image */}
                            <div className="aspect-square bg-gray-100 relative">
                                {productImage ? (
                                    <img src={productImage} alt={productName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className="w-8 h-8 text-gray-300" />
                                    </div>
                                )}
                                {productCategory && (
                                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-medium rounded-full">
                                        {productCategory}
                                    </span>
                                )}
                            </div>
                            {/* Product Info */}
                            <div className="p-2">
                                <div className="text-xs font-medium text-gray-800 truncate">{productName}</div>
                                <div className="text-sm font-bold text-emerald-600">{formatPrice(productPrice)}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Hover Actions */}
                <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                        onClick={handleConfigure}
                        className="p-1.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-lg transition-colors"
                        title="Configure"
                    >
                        <Settings className="w-3.5 h-3.5 text-white" />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="p-1.5 bg-red-500 hover:bg-red-600 rounded-lg shadow-lg transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                    </button>
                </div>

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

export default CustomProductNode;
