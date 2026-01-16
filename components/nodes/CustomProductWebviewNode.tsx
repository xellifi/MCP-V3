import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ChevronDown, ChevronUp, DollarSign, Globe, ShoppingBag, Loader, CheckCircle, XCircle } from 'lucide-react';
import NodeToolbar from '../NodeToolbar';
import NodeInsights from '../NodeInsights';

const CustomProductWebviewNode: React.FC<NodeProps> = ({ data, selected }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Execution status for save animation
    const executionStatus = data.executionStatus as 'idle' | 'executing' | 'completed' | 'error' | undefined;
    const isExecuting = executionStatus === 'executing';
    const isCompleted = executionStatus === 'completed';
    const isError = executionStatus === 'error';

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
    const buttonText = data.buttonText || '';
    const imageUrl = data.imageUrl || '';
    const description = data.description || '';
    const isConfigured = headline || price || imageUrl || description || buttonText || data.productName;
    const backgroundColor = data.backgroundColor || '#6366f1';

    // Get border class based on execution status
    const getBorderClass = () => {
        if (isError) return 'border-red-500/70 shadow-[0_0_20px_rgba(239,68,68,0.4)]';
        if (isExecuting) return 'border-blue-500/70 shadow-[0_0_20px_rgba(59,130,246,0.5)]';
        if (isCompleted) return 'border-emerald-500/70 shadow-[0_0_20px_rgba(16,185,129,0.4)]';
        return selected ? 'border-indigo-500/50 shadow-2xl shadow-indigo-500/20' : 'border-indigo-500/30 shadow-xl';
    };

    return (
        <div className="relative group">
            {/* Node Container */}
            <div
                className={`
                    relative px-4 py-3 rounded-2xl
                    bg-indigo-500/10 hover:bg-indigo-500/20 backdrop-blur-md
                    border ${getBorderClass()}
                    transition-all duration-300
                    w-[200px]
                `}
            >
                {/* Animated orbs when executing */}
                {isExecuting && (
                    <>
                        <div className="absolute w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_15px_#3b82f6,0_0_30px_#3b82f6] z-[100]"
                            style={{ top: '-6px', animation: 'orbTopWebview 2s linear infinite' }} />
                        <div className="absolute w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_15px_#3b82f6,0_0_30px_#3b82f6] z-[100]"
                            style={{ bottom: '-6px', animation: 'orbBottomWebview 2s linear infinite' }} />
                        <style>{`
                            @keyframes orbTopWebview { 0% { left: -6px; } 100% { left: calc(100% - 6px); } }
                            @keyframes orbBottomWebview { 0% { left: -6px; } 100% { left: calc(100% - 6px); } }
                        `}</style>
                    </>
                )}

                {/* Header - Icon, Label, and Expand Toggle */}
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg backdrop-blur-sm flex-shrink-0 relative ${isError ? 'bg-red-500' : isExecuting ? 'bg-blue-500' : isCompleted ? 'bg-emerald-500' : 'bg-indigo-500/20'}`}>
                        {isError ? (
                            <XCircle className="w-5 h-5 text-white" />
                        ) : isExecuting ? (
                            <Loader className="w-5 h-5 text-white animate-spin" />
                        ) : isCompleted ? (
                            <CheckCircle className="w-5 h-5 text-white" />
                        ) : (
                            <>
                                <ShoppingBag className="w-5 h-5 text-indigo-400" />
                                <Globe className="w-2.5 h-2.5 text-white absolute -bottom-0.5 -right-0.5 bg-indigo-600 rounded-full p-0.5" />
                            </>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="text-slate-200 font-bold text-sm truncate">
                            {data.label || 'Product Webview'}
                        </div>
                        {/* Show productName or headline below the label */}
                        {(data.productName || headline) && (
                            <div className="text-indigo-300 text-xs truncate flex items-center gap-1">
                                <span className="opacity-70">📦</span>
                                {data.productName || headline}
                            </div>
                        )}
                        {price && (
                            <div className="text-indigo-300 text-xs flex items-center gap-1">
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

                {/* Expandable Content - Full Mobile Device Preview */}
                {isExpanded && isConfigured && (
                    <div className="mt-3 pt-3 border-t border-indigo-500/20">
                        {/* Mobile Device Mockup */}
                        <div className="flex justify-center">
                            <div className="relative" style={{ width: 180, height: 320 }}>
                                {/* Device Frame */}
                                <div className="w-full h-full shadow-2xl border-4 flex flex-col bg-slate-900 border-slate-700" style={{ borderRadius: 28 }}>
                                    {/* Notch */}
                                    <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-14 h-3 bg-black rounded-full z-10" />
                                    {/* Screen */}
                                    <div className="w-full h-full overflow-hidden flex flex-col bg-gradient-to-b from-slate-800 to-slate-900" style={{ borderRadius: 22 }}>
                                        {/* Status bar */}
                                        <div className="h-4 flex-shrink-0 flex items-center justify-between px-2 text-[7px] text-white/60">
                                            <span>9:41</span>
                                            <span>⚡ 100%</span>
                                        </div>
                                        {/* Content - Page background with card container */}
                                        <div className="flex-1 overflow-y-auto flex items-start justify-center p-1.5" style={{ backgroundColor: data.pageBackgroundColor || '#ffffff' }}>
                                            {/* Card Container */}
                                            <div className="w-full rounded-lg overflow-hidden shadow-lg" style={{ backgroundColor }}>
                                                {/* Headline Banner */}
                                                <div className="py-1.5 px-2 text-center" style={{ backgroundColor: data.headlineBgColor || '#6366f1' }}>
                                                    <div
                                                        className={`font-bold uppercase tracking-wide flex items-center justify-center gap-0.5 text-[8px] ${data.headlineAnimation === 'shake' ? 'animate-bounce' : data.headlineAnimation === 'blink' ? 'animate-pulse' : ''}`}
                                                        style={{ color: data.headlineColor || '#ffffff' }}
                                                    >
                                                        {data.showEmoji && data.emojiType !== 'none' && <span className="text-[6px]">{data.emojiType === 'fire' ? '🔥' : data.emojiType === 'star' ? '⭐' : data.emojiType === 'sparkle' ? '✨' : data.emojiType === 'heart' ? '❤️' : ''}</span>}
                                                        <span>{headline || 'SHOP THIS PRODUCT'}</span>
                                                        {data.showEmoji && data.emojiType !== 'none' && <span className="text-[6px]">{data.emojiType === 'fire' ? '🔥' : data.emojiType === 'star' ? '⭐' : data.emojiType === 'sparkle' ? '✨' : data.emojiType === 'heart' ? '❤️' : ''}</span>}
                                                    </div>
                                                </div>

                                                {/* Card Body */}
                                                <div className="p-2">
                                                    {/* Image with Price Badge */}
                                                    <div className="text-center mb-1.5">
                                                        <div className="inline-block relative" style={{ overflow: 'visible' }}>
                                                            <div
                                                                className="overflow-hidden aspect-square bg-white"
                                                                style={{
                                                                    borderRadius: `${data.imageBorderRadius || 15}px`,
                                                                    border: data.imageBorderColor && data.imageBorderColor !== 'transparent' ? `2px solid ${data.imageBorderColor}` : 'none',
                                                                    width: '90px',
                                                                }}
                                                            >
                                                                {imageUrl ? (
                                                                    <img src={imageUrl} alt="Product" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                                                                        <ShoppingBag className="w-5 h-5 text-slate-400" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {/* Circular Price Badge */}
                                                            {price && (
                                                                <div
                                                                    className="absolute rounded-full font-bold shadow-xl flex items-center justify-center z-20"
                                                                    style={{
                                                                        backgroundColor: data.priceBadgeColor || '#22c55e',
                                                                        color: data.priceTextColor || '#ffffff',
                                                                        width: '28px',
                                                                        height: '28px',
                                                                        fontSize: '6px',
                                                                        top: '-8px',
                                                                        right: '-8px',
                                                                    }}
                                                                >
                                                                    {price}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Quantity Selector Preview */}
                                                    <div className="flex items-center justify-center gap-1.5 my-1.5">
                                                        <button className="w-5 h-5 bg-slate-300 rounded text-[8px] flex items-center justify-center">-</button>
                                                        <span className="text-[8px] font-bold px-2">1</span>
                                                        <button className="w-5 h-5 bg-indigo-500 text-white rounded text-[8px] flex items-center justify-center">+</button>
                                                    </div>

                                                    {/* Product Name Bar */}
                                                    {data.showProductName && (
                                                        <div
                                                            className={`py-1 px-1.5 text-center mb-1 ${data.productNameFullWidth ? '-mx-2' : 'mx-1 rounded'}`}
                                                            style={{ backgroundColor: data.productNameBgColor || '#6366f1' }}
                                                        >
                                                            <div className="font-bold uppercase tracking-wide text-[7px]" style={{ color: data.productNameTextColor || '#ffffff' }}>
                                                                {data.productName || 'PRODUCT NAME'}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Description */}
                                                    {description && (
                                                        <p className="text-center text-[6px] mb-1.5 line-clamp-2" style={{ color: data.descriptionColor || '#1f2937' }}>
                                                            {description}
                                                        </p>
                                                    )}

                                                    {/* Add to Cart Button */}
                                                    <div className="space-y-1">
                                                        <button
                                                            className="w-full py-1 font-bold flex items-center justify-center gap-0.5 shadow-md text-[7px]"
                                                            style={{ backgroundColor: data.buttonBgColor || '#22c55e', color: data.buttonTextColor || '#ffffff', borderRadius: `${data.buttonBorderRadius || 8}px` }}
                                                        >
                                                            {data.showButtonIcon && <span>🛒</span>}
                                                            {buttonText || 'Add to Cart'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Home indicator */}
                                        <div className="h-3 flex-shrink-0 flex items-center justify-center">
                                            <div className="w-12 h-0.5 bg-white/30 rounded-full" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Status indicator */}
                {!isConfigured && (
                    <div className="mt-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-1.5">
                        <div className="text-amber-300 text-[10px] font-medium text-center">
                            ⚠️ Configure product
                        </div>
                    </div>
                )}



                {/* Action Buttons */}
                <NodeToolbar
                    onClone={handleClone}
                    onConfigure={handleConfigure}
                    onDelete={handleDelete}
                    color="indigo"
                />
            </div>

            {/* Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 !bg-indigo-400 !border-2 !border-white"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 !bg-indigo-400 !border-2 !border-white"
            />
        </div>
    );
};

export default CustomProductWebviewNode;
