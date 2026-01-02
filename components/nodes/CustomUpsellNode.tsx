import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ShoppingBag, Settings, Trash2, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';

const CustomUpsellNode: React.FC<NodeProps> = ({ data, selected }) => {
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
    const headline = data.headline || '';
    const price = data.price || '';
    const buttonText = data.buttonText || 'Add to Cart';
    const imageUrl = data.imageUrl || '';
    const isConfigured = headline || price || imageUrl;
    const backgroundColor = data.backgroundColor || '#dc2626';

    return (
        <div className="relative group">
            {/* Node Container */}
            <div
                className={`
                    relative px-4 py-3 rounded-2xl
                    bg-teal-500/10 hover:bg-teal-500/20 backdrop-blur-md
                    border ${selected ? 'border-teal-500/50 shadow-2xl shadow-teal-500/20' : 'border-teal-500/30 shadow-xl'}
                    transition-all duration-300
                    w-[200px]
                `}
            >
                {/* Header - Icon, Label, and Expand Toggle */}
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-teal-500/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                        <ShoppingBag className="w-5 h-5 text-teal-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-slate-200 font-bold text-sm truncate">
                            {data.label || 'DownSell/Upsell'}
                        </div>
                        {price && (
                            <div className="text-teal-300 text-xs flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                {price}
                            </div>
                        )}
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

                {/* Expandable Content - Mini Preview */}
                {isExpanded && isConfigured && (
                    <div className="mt-3 pt-3 border-t border-teal-500/20 space-y-2">
                        {/* Mini Preview Card */}
                        <div
                            className="rounded-lg p-2 text-center"
                            style={{ backgroundColor }}
                        >
                            {headline && (
                                <div className="text-white text-[10px] font-bold mb-1 truncate">
                                    {headline}
                                </div>
                            )}
                            {imageUrl && (
                                <div className="w-full h-12 rounded overflow-hidden mb-1">
                                    <img
                                        src={imageUrl}
                                        alt="Product"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                            {price && (
                                <div className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block mb-1">
                                    {price}
                                </div>
                            )}
                            <div className="bg-blue-500 text-white text-[8px] font-bold px-2 py-1 rounded truncate">
                                {buttonText}
                            </div>
                        </div>
                    </div>
                )}

                {/* Status indicator */}
                {!isConfigured && (
                    <div className="mt-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-1.5">
                        <div className="text-amber-300 text-[10px] font-medium text-center">
                            ⚠️ Configure offer
                        </div>
                    </div>
                )}

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
                className="w-3 h-3 !bg-teal-400 !border-2 !border-white"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 !bg-teal-400 !border-2 !border-white"
            />
        </div>
    );
};

export default CustomUpsellNode;
