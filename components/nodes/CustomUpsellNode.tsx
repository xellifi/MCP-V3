import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ShoppingBag, Settings, Trash2, ChevronDown, ChevronUp, DollarSign, Copy } from 'lucide-react';
import NodeInsights from '../NodeInsights';

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
                            {data.label || 'Upsell'}
                        </div>
                        {/* Show productName or headline below the label */}
                        {(data.productName || headline) && (
                            <div className="text-emerald-300 text-xs truncate flex items-center gap-1">
                                <span className="opacity-70">📦</span>
                                {data.productName || headline}
                            </div>
                        )}
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

                {/* Node Insights - Below header, above collapsible preview */}
                <NodeInsights
                    sent={data.analytics?.sent}
                    delivered={data.analytics?.delivered}
                    subscribers={data.analytics?.subscribers}
                    errors={data.analytics?.errors}
                />

                {/* Expandable Content - Full Preview */}
                {isExpanded && isConfigured && (
                    <div className="mt-3 pt-3 border-t border-teal-500/20">
                        {/* Full Preview Card - matches actual output */}
                        <div
                            className="rounded-2xl p-4 shadow-lg transition-all duration-300"
                            style={{ backgroundColor }}
                        >
                            {/* Headline with Emojis */}
                            {headline && (
                                <div
                                    className="text-center font-bold text-sm mb-3 flex items-center justify-center gap-1"
                                    style={{ color: data.headlineColor || '#ffffff' }}
                                >
                                    {data.showEmoji && data.emojiType && data.emojiType !== 'none' && (
                                        <span>
                                            {data.emojiType === 'fire' ? '🔥' :
                                                data.emojiType === 'star' ? '⭐' :
                                                    data.emojiType === 'sparkle' ? '✨' :
                                                        data.emojiType === 'heart' ? '❤️' : ''}
                                        </span>
                                    )}
                                    <span>{headline}</span>
                                    {data.showEmoji && data.emojiType && data.emojiType !== 'none' && (
                                        <span>
                                            {data.emojiType === 'fire' ? '🔥' :
                                                data.emojiType === 'star' ? '⭐' :
                                                    data.emojiType === 'sparkle' ? '✨' :
                                                        data.emojiType === 'heart' ? '❤️' : ''}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Image with Price Badge */}
                            <div className="relative mb-3">
                                <div
                                    className="overflow-hidden aspect-square"
                                    style={{
                                        borderRadius: `${data.imageBorderRadius || 12}px`,
                                        border: `${data.imageBorderWidth || 0}px solid ${data.imageBorderColor || '#ffffff'}`
                                    }}
                                >
                                    {imageUrl ? (
                                        <img
                                            src={imageUrl}
                                            alt="Product"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-slate-700/50 flex items-center justify-center min-h-[100px]">
                                            <ShoppingBag className="w-8 h-8 text-slate-500" />
                                        </div>
                                    )}
                                </div>

                                {/* Price Badge */}
                                {price && (
                                    <div
                                        className="absolute -top-2 -right-2 px-3 py-1 rounded-full font-bold text-sm shadow-lg border-2 border-dashed border-white/30"
                                        style={{
                                            backgroundColor: data.priceBadgeColor || '#22c55e',
                                            color: data.priceTextColor || '#ffffff'
                                        }}
                                    >
                                        {price}
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            {data.description && (
                                <p
                                    className="text-center text-xs mb-3"
                                    style={{ color: data.descriptionColor || '#ffffff' }}
                                >
                                    {data.description}
                                </p>
                            )}

                            {/* CTA Button */}
                            <button
                                className="w-full py-2 px-3 font-bold text-sm flex items-center justify-center gap-1.5 shadow-lg"
                                style={{
                                    backgroundColor: data.buttonBgColor || '#3b82f6',
                                    color: data.buttonTextColor || '#ffffff',
                                    borderRadius: `${data.buttonBorderRadius || 8}px`
                                }}
                            >
                                {data.showButtonIcon && (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                                {buttonText}
                            </button>
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
                        onClick={handleClone}
                        className="w-7 h-7 bg-slate-600 rounded-full shadow-lg flex items-center justify-center hover:bg-slate-500 transition-colors"
                        title="Clone node"
                    >
                        <Copy className="w-4 h-4 text-white" />
                    </button>
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
