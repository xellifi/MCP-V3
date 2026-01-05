import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ShoppingCart, CheckCircle2, Package } from 'lucide-react';

interface CheckoutNodeData {
    label: string;
    buttonText?: string;
    headerText?: string;
}

const CustomCheckoutNode: React.FC<NodeProps<CheckoutNodeData>> = ({ data, selected }) => {
    return (
        <div
            className={`relative min-w-[200px] rounded-2xl transition-all duration-200 ${selected
                    ? 'ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-500/20'
                    : 'shadow-lg hover:shadow-xl'
                }`}
            style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            }}
        >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/20">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                        <ShoppingCart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <span className="font-bold text-white text-sm">
                            {data.label || 'Checkout'}
                        </span>
                        <div className="text-xs text-white/70">Order Review</div>
                    </div>
                </div>
            </div>

            {/* Body - Cart Preview */}
            <div className="px-4 py-3 bg-black/20">
                <div className="flex items-center gap-2 text-white/80 text-xs mb-2">
                    <Package className="w-4 h-4" />
                    <span>Cart Items Summary</span>
                </div>
                <div className="bg-black/30 rounded-lg p-2 space-y-1">
                    <div className="flex items-center justify-between text-white/70 text-xs">
                        <span>📦 Product 1</span>
                        <span>₱XXX</span>
                    </div>
                    <div className="flex items-center justify-between text-white/70 text-xs">
                        <span>📦 Product 2</span>
                        <span>₱XXX</span>
                    </div>
                    <div className="border-t border-white/20 mt-2 pt-2 flex justify-between text-white font-semibold text-sm">
                        <span>Total:</span>
                        <span>₱X,XXX</span>
                    </div>
                </div>
            </div>

            {/* Checkout Button Preview */}
            <div className="px-4 py-3">
                <div className="bg-white rounded-xl py-2 px-4 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-600 font-semibold text-sm">
                        {data.buttonText || 'Proceed to Checkout'}
                    </span>
                </div>
            </div>

            {/* Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-white !border-2 !border-emerald-500"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-white !border-2 !border-emerald-500"
            />
        </div>
    );
};

export default memo(CustomCheckoutNode);
