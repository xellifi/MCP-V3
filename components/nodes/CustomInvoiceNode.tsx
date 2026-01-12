import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Receipt, ChevronDown, ChevronUp, Package, Truck, CheckCircle, Clock, Download, FileImage } from 'lucide-react';
import NodeToolbar from '../NodeToolbar';
import NodeInsights from '../NodeInsights';

const CustomInvoiceNode: React.FC<NodeProps> = ({ data, selected }) => {
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
    const companyName = data.companyName || 'Your Company';
    const companyLogo = data.companyLogo || '';
    const primaryColor = data.primaryColor || '#7c3aed';
    const enablePdfDownload = data.enablePdfDownload ?? true;
    const enableImageDownload = data.enableImageDownload ?? true;
    const showOrderTracking = data.showOrderTracking ?? true;
    const isConfigured = companyName || companyLogo;

    // Order tracking status display
    const trackingSteps = [
        { id: 'pending', label: 'Pending', icon: Clock },
        { id: 'processing', label: 'Processing', icon: Package },
        { id: 'shipped', label: 'Shipped', icon: Truck },
        { id: 'delivered', label: 'Delivered', icon: CheckCircle },
    ];

    return (
        <div className="relative group">
            {/* Node Container */}
            <div
                className={`
                    relative px-4 py-3 rounded-2xl
                    bg-purple-500/10 hover:bg-purple-500/20 backdrop-blur-md
                    border ${selected ? 'border-purple-500/50 shadow-2xl shadow-purple-500/20' : 'border-purple-500/30 shadow-xl'}
                    transition-all duration-300
                    w-[200px]
                `}
            >
                {/* Header - Icon, Label, and Expand Toggle */}
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-500/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                        <Receipt className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-slate-200 font-bold text-sm truncate">
                            {data.label || 'Invoice'}
                        </div>
                        <div className="text-purple-300 text-xs flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            Order Receipt
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

                {/* Expandable Content - Invoice Preview */}
                {isExpanded && isConfigured && (
                    <div className="mt-3 pt-3 border-t border-purple-500/20">
                        {/* Invoice Preview Card */}
                        <div
                            className="rounded-xl p-3 shadow-lg transition-all duration-300 bg-white"
                        >
                            {/* Invoice Header */}
                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                                <div className="flex items-center gap-2">
                                    {companyLogo ? (
                                        <img src={companyLogo} alt="Logo" className="w-8 h-8 rounded object-cover" />
                                    ) : (
                                        <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                                            <Receipt className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                    <div>
                                        <div className="text-xs font-bold text-slate-800">{companyName}</div>
                                        <div className="text-[10px] text-slate-500">Invoice #00001</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-500">Date</div>
                                    <div className="text-xs font-medium text-slate-700">Jan 02, 2026</div>
                                </div>
                            </div>

                            {/* Order Items Preview */}
                            <div className="space-y-1 mb-3">
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-600">Product Item x1</span>
                                    <span className="text-slate-800 font-medium">₱588</span>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-slate-600">Shipping</span>
                                    <span className="text-slate-800 font-medium">₱50</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold pt-1 border-t border-dashed border-slate-200">
                                    <span className="text-slate-800">Total</span>
                                    <span style={{ color: primaryColor }}>₱638</span>
                                </div>
                            </div>

                            {/* Order Tracking Preview */}
                            {showOrderTracking && (
                                <div className="mb-3">
                                    <div className="text-[10px] font-medium text-slate-600 mb-2">Order Status</div>
                                    <div className="flex items-center justify-between">
                                        {trackingSteps.map((step, idx) => {
                                            const IconComponent = step.icon;
                                            const isActive = idx <= 1; // Show first 2 as active for preview
                                            return (
                                                <div key={step.id} className="flex flex-col items-center">
                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isActive ? 'text-white' : 'bg-slate-100 text-slate-400'}`}
                                                        style={isActive ? { backgroundColor: primaryColor } : {}}>
                                                        <IconComponent className="w-3 h-3" />
                                                    </div>
                                                    {idx < trackingSteps.length - 1 && (
                                                        <div className={`w-6 h-0.5 mt-2.5 ${idx < 1 ? '' : 'bg-slate-200'}`}
                                                            style={idx < 1 ? { backgroundColor: primaryColor } : {}} />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Download Buttons Preview */}
                            <div className="flex gap-2">
                                {enablePdfDownload && (
                                    <div className="flex-1 py-1.5 rounded text-[10px] font-medium text-center text-white flex items-center justify-center gap-1"
                                        style={{ backgroundColor: primaryColor }}>
                                        <Download className="w-3 h-3" />
                                        PDF
                                    </div>
                                )}
                                {enableImageDownload && (
                                    <div className="flex-1 py-1.5 rounded text-[10px] font-medium text-center border flex items-center justify-center gap-1"
                                        style={{ borderColor: primaryColor, color: primaryColor }}>
                                        <FileImage className="w-3 h-3" />
                                        Image
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <NodeToolbar
                    onClone={handleClone}
                    onConfigure={handleConfigure}
                    onDelete={handleDelete}
                    color="purple"
                />
            </div>

            {/* Connection Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className="w-3 h-3 !bg-purple-400 !border-2 !border-white"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="w-3 h-3 !bg-purple-400 !border-2 !border-white"
            />
        </div>
    );
};

export default CustomInvoiceNode;
