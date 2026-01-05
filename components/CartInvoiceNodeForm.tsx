import React, { useState } from 'react';
import {
    FileText, Building2, DollarSign, Palette, Truck, Check, Sparkles
} from 'lucide-react';
import CollapsibleTips from './CollapsibleTips';

interface CartInvoiceNodeFormProps {
    workspaceId: string;
    initialConfig?: {
        companyName?: string;
        primaryColor?: string;
        showShipping?: boolean;
        shippingFee?: number;
        showCustomerInfo?: boolean;
        thankYouMessage?: string;
    };
    onChange: (config: any) => void;
}

const PRESET_COLORS = [
    '#10b981', // Emerald
    '#14b8a6', // Teal
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#f59e0b', // Amber
    '#ef4444', // Red
];

const CartInvoiceNodeForm: React.FC<CartInvoiceNodeFormProps> = ({
    workspaceId,
    initialConfig,
    onChange
}) => {
    // State
    const [companyName, setCompanyName] = useState(initialConfig?.companyName || 'My Store');
    const [primaryColor, setPrimaryColor] = useState(initialConfig?.primaryColor || '#10b981');
    const [showShipping, setShowShipping] = useState(initialConfig?.showShipping ?? true);
    const [shippingFee, setShippingFee] = useState(initialConfig?.shippingFee ?? 50);
    const [showCustomerInfo, setShowCustomerInfo] = useState(initialConfig?.showCustomerInfo ?? true);
    const [thankYouMessage, setThankYouMessage] = useState(initialConfig?.thankYouMessage || 'Thank you for your order! 🎉');

    // Notify parent of changes
    const notifyChange = (updates: Partial<typeof initialConfig> = {}) => {
        onChange({
            companyName,
            primaryColor,
            showShipping,
            shippingFee,
            showCustomerInfo,
            thankYouMessage,
            ...updates
        });
    };

    return (
        <div className="space-y-6">
            {/* Header Info */}
            <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <FileText className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div className="text-sm text-slate-300">
                    <p className="font-medium text-emerald-400 mb-1">Cart Invoice Node</p>
                    <p>This node automatically displays all items in the cart from the upsell/downsell flow with a combined total.</p>
                </div>
            </div>

            {/* Store Name */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    Store/Company Name
                </label>
                <input
                    type="text"
                    value={companyName}
                    onChange={(e) => {
                        setCompanyName(e.target.value);
                        notifyChange({ companyName: e.target.value });
                    }}
                    placeholder="My Store"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all placeholder-slate-500"
                />
            </div>

            {/* Primary Color */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <Palette className="w-4 h-4 text-slate-400" />
                    Theme Color
                </label>
                <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map(color => (
                        <button
                            key={color}
                            onClick={() => {
                                setPrimaryColor(color);
                                notifyChange({ primaryColor: color });
                            }}
                            className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${primaryColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: color }}
                        />
                    ))}
                </div>
            </div>

            {/* Shipping Settings */}
            <div className="space-y-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                        <Truck className="w-4 h-4 text-slate-400" />
                        Include Shipping Fee
                    </label>
                    <button
                        onClick={() => {
                            setShowShipping(!showShipping);
                            notifyChange({ showShipping: !showShipping });
                        }}
                        className={`w-12 h-6 rounded-full transition-all ${showShipping ? 'bg-emerald-500' : 'bg-slate-600'}`}
                    >
                        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${showShipping ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                </div>

                {showShipping && (
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400">₱</span>
                        <input
                            type="number"
                            min="0"
                            value={shippingFee}
                            onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setShippingFee(val);
                                notifyChange({ shippingFee: val });
                            }}
                            className="w-24 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-center focus:ring-2 focus:ring-emerald-500/50 outline-none"
                        />
                    </div>
                )}
            </div>

            {/* Show Customer Info Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <label className="text-sm font-medium text-slate-300">
                    Show Customer Info on Invoice
                </label>
                <button
                    onClick={() => {
                        setShowCustomerInfo(!showCustomerInfo);
                        notifyChange({ showCustomerInfo: !showCustomerInfo });
                    }}
                    className={`w-12 h-6 rounded-full transition-all ${showCustomerInfo ? 'bg-emerald-500' : 'bg-slate-600'}`}
                >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${showCustomerInfo ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
            </div>

            {/* Thank You Message */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <Sparkles className="w-4 h-4 text-slate-400" />
                    Thank You Message
                </label>
                <input
                    type="text"
                    value={thankYouMessage}
                    onChange={(e) => {
                        setThankYouMessage(e.target.value);
                        notifyChange({ thankYouMessage: e.target.value });
                    }}
                    placeholder="Thank you for your order!"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all placeholder-slate-500"
                />
            </div>

            {/* Tips */}
            <CollapsibleTips title="How Cart Invoice Works" color="green">
                <ul className="text-sm space-y-1.5">
                    <li>• Automatically reads product + upsell/downsell items from the flow cart</li>
                    <li>• Calculates and displays combined total</li>
                    <li>• Shows shipping fee if enabled</li>
                    <li>• Displays customer name from subscriber data</li>
                    <li>• Use after Upsell/Downsell nodes to show final order summary</li>
                </ul>
            </CollapsibleTips>
        </div>
    );
};

export default CartInvoiceNodeForm;
