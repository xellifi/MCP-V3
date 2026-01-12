import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ClipboardList, Settings, Trash2, ChevronDown, ChevronUp, Copy, Phone, Mail, MapPin, CreditCard } from 'lucide-react';
import NodeInsights from '../NodeInsights';

const CustomCheckoutFormNode: React.FC<NodeProps> = ({ data, selected }) => {
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
    const collectPhone = data.collectPhone ?? true;
    const collectEmail = data.collectEmail ?? true;
    const collectAddress = data.collectAddress ?? true;
    const collectPaymentMethod = data.collectPaymentMethod ?? true;
    const paymentMethods = data.paymentMethods || ['Cash on Delivery', 'GCash', 'Bank Transfer'];
    const isConfigured = collectPhone || collectEmail || collectAddress || collectPaymentMethod;

    // Count active fields
    const activeFields = [collectPhone, collectEmail, collectAddress, collectPaymentMethod].filter(Boolean).length;

    return (
        <div className="relative group">
            {/* Node Container */}
            <div
                className={`
                    relative px-4 py-3 rounded-2xl
                    bg-indigo-500/10 hover:bg-indigo-500/20 backdrop-blur-md
                    border ${selected ? 'border-indigo-500/50 shadow-2xl shadow-indigo-500/20' : 'border-indigo-500/30 shadow-xl'}
                    transition-all duration-300
                    w-[200px]
                `}
            >
                {/* Header - Icon, Label, and Expand Toggle */}
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-500/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                        <ClipboardList className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-slate-200 font-bold text-sm truncate">
                            {data.label || 'Checkout Form'}
                        </div>
                        <div className="text-indigo-300 text-xs flex items-center gap-1">
                            📋 {activeFields} fields
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

                {/* Expandable Content - Preview */}
                {isExpanded && isConfigured && (
                    <div className="mt-3 pt-3 border-t border-indigo-500/20">
                        <div className="space-y-2">
                            {collectPhone && (
                                <div className="flex items-center gap-2 text-xs text-slate-300 bg-black/20 rounded-lg px-2 py-1.5">
                                    <Phone className="w-3 h-3 text-indigo-400" />
                                    <span>Mobile Number</span>
                                </div>
                            )}
                            {collectEmail && (
                                <div className="flex items-center gap-2 text-xs text-slate-300 bg-black/20 rounded-lg px-2 py-1.5">
                                    <Mail className="w-3 h-3 text-indigo-400" />
                                    <span>Email Address</span>
                                </div>
                            )}
                            {collectAddress && (
                                <div className="flex items-center gap-2 text-xs text-slate-300 bg-black/20 rounded-lg px-2 py-1.5">
                                    <MapPin className="w-3 h-3 text-indigo-400" />
                                    <span>Delivery Address</span>
                                </div>
                            )}
                            {collectPaymentMethod && (
                                <div className="flex items-center gap-2 text-xs text-slate-300 bg-black/20 rounded-lg px-2 py-1.5">
                                    <CreditCard className="w-3 h-3 text-indigo-400" />
                                    <span>{paymentMethods.length} payment options</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Status indicator */}
                {!isConfigured && (
                    <div className="mt-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-1.5">
                        <div className="text-amber-300 text-[10px] font-medium text-center">
                            ⚠️ Configure fields
                        </div>
                    </div>
                )}

                {/* Node Insights */}
                <NodeInsights
                    sent={data.analytics?.sent}
                    delivered={data.analytics?.delivered}
                    subscribers={data.analytics?.subscribers}
                    errors={data.analytics?.errors}
                />

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

export default CustomCheckoutFormNode;
