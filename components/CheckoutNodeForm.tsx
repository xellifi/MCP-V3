import React, { useState, useEffect } from 'react';
import { ShoppingCart, Type, Palette, Check, Image, Settings } from 'lucide-react';
import CollapsibleTips from './CollapsibleTips';

interface CheckoutNodeFormProps {
    workspaceId: string;
    initialConfig?: {
        headerText?: string;
        buttonText?: string;
        primaryColor?: string;
        confirmationMessage?: string;
        showItemDetails?: boolean;
        showTotal?: boolean;
        companyLogo?: string;
        companyName?: string;
    };
    onChange: (config: any) => void;
}

const PRESET_COLORS = [
    '#10b981', // Emerald
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#f59e0b', // Amber
    '#ef4444', // Red
];

const CheckoutNodeForm: React.FC<CheckoutNodeFormProps> = ({
    workspaceId,
    initialConfig,
    onChange
}) => {
    const [headerText, setHeaderText] = useState(initialConfig?.headerText || '🛒 Your Order Summary');
    const [buttonText, setButtonText] = useState(initialConfig?.buttonText || '✅ Proceed to Checkout');
    const [primaryColor, setPrimaryColor] = useState(initialConfig?.primaryColor || '#10b981');
    const [showItemDetails, setShowItemDetails] = useState(initialConfig?.showItemDetails ?? true);
    const [showTotal, setShowTotal] = useState(initialConfig?.showTotal ?? true);
    const [companyLogo, setCompanyLogo] = useState(initialConfig?.companyLogo || '');
    const [companyName, setCompanyName] = useState(initialConfig?.companyName || '');
    const [activeSection, setActiveSection] = useState<string>('content');

    // Notify parent of config changes
    const notifyChange = (updates: Partial<typeof initialConfig> = {}) => {
        onChange({
            headerText,
            buttonText,
            primaryColor,
            showItemDetails,
            showTotal,
            companyLogo,
            companyName,
            ...updates
        });
    };

    // Initial notification
    useEffect(() => {
        notifyChange();
    }, []);

    const toggleSection = (id: string) => {
        setActiveSection(activeSection === id ? '' : id);
    };

    // Section header component - copied from UpsellNodeForm pattern
    const SectionHeader = ({
        id,
        icon: Icon,
        title,
        color
    }: {
        id: string;
        icon: React.ElementType;
        title: string;
        color: string;
    }) => (
        <button
            onClick={() => toggleSection(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${activeSection === id
                ? `bg-${color}-500/20 border-${color}-500/30`
                : 'bg-black/20 border-white/10 hover:bg-white/5'
                }`}
        >
            <div className={`p-1.5 rounded-lg bg-${color}-500/20`}>
                <Icon className={`w-4 h-4 text-${color}-400`} />
            </div>
            <span className="font-semibold text-sm text-white">{title}</span>
            <div className={`ml-auto transition-transform ${activeSection === id ? 'rotate-180' : ''}`}>
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </button>
    );

    return (
        <div className="space-y-4">
            {/* Header Info */}
            <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <ShoppingCart className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div className="text-sm text-slate-300">
                    <p className="font-medium text-emerald-400 mb-1">Checkout Node</p>
                    <p>Shows cart summary with all items (product + upsells). Customer clicks to proceed to invoice.</p>
                </div>
            </div>

            {/* Content Section */}
            <div className="space-y-3">
                <SectionHeader id="content" icon={Type} title="Checkout Content" color="emerald" />
                {activeSection === 'content' && (
                    <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/10">
                        {/* Header Text */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Header Title
                            </label>
                            <input
                                type="text"
                                value={headerText}
                                onChange={(e) => {
                                    setHeaderText(e.target.value);
                                    notifyChange({ headerText: e.target.value });
                                }}
                                placeholder="🛒 Your Order Summary"
                                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-white/40 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                            />
                        </div>

                        {/* Button Text */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Checkout Button Text
                            </label>
                            <input
                                type="text"
                                value={buttonText}
                                onChange={(e) => {
                                    setButtonText(e.target.value);
                                    notifyChange({ buttonText: e.target.value });
                                }}
                                placeholder="✅ Proceed to Checkout"
                                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-white/40 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                            />
                        </div>

                        {/* Display Options */}
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-white/80">
                                Display Options
                            </label>
                            <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/10">
                                <span className="text-white/80 text-sm">Show Item Details</span>
                                <button
                                    onClick={() => {
                                        setShowItemDetails(!showItemDetails);
                                        notifyChange({ showItemDetails: !showItemDetails });
                                    }}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${showItemDetails ? 'bg-emerald-500' : 'bg-slate-600'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${showItemDetails ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/10">
                                <span className="text-white/80 text-sm">Show Total</span>
                                <button
                                    onClick={() => {
                                        setShowTotal(!showTotal);
                                        notifyChange({ showTotal: !showTotal });
                                    }}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${showTotal ? 'bg-emerald-500' : 'bg-slate-600'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${showTotal ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Branding Section */}
            <div className="space-y-3">
                <SectionHeader id="branding" icon={Image} title="Branding" color="blue" />
                {activeSection === 'branding' && (
                    <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/10">
                        {/* Company Name */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Company Name (Optional)
                            </label>
                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) => {
                                    setCompanyName(e.target.value);
                                    notifyChange({ companyName: e.target.value });
                                }}
                                placeholder="Your Store Name"
                                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-white/40 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
                            />
                        </div>

                        {/* Company Logo */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Logo URL (Optional)
                            </label>
                            <input
                                type="text"
                                value={companyLogo}
                                onChange={(e) => {
                                    setCompanyLogo(e.target.value);
                                    notifyChange({ companyLogo: e.target.value });
                                }}
                                placeholder="https://example.com/logo.png"
                                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-white/40 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Style Section */}
            <div className="space-y-3">
                <SectionHeader id="style" icon={Palette} title="Style" color="violet" />
                {activeSection === 'style' && (
                    <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/10">
                        {/* Primary Color */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Primary Color
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {PRESET_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => {
                                            setPrimaryColor(color);
                                            notifyChange({ primaryColor: color });
                                        }}
                                        className={`w-10 h-10 rounded-xl transition-all ${primaryColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-105'}`}
                                        style={{ backgroundColor: color }}
                                    >
                                        {primaryColor === color && (
                                            <Check className="w-5 h-5 text-white mx-auto" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tips */}
            <CollapsibleTips title="Tips & Best Practices" color="green">
                <ul className="text-sm space-y-1.5">
                    <li>• The checkout shows all items added to cart during the flow</li>
                    <li>• Connect this node AFTER your upsell/downsell sequence</li>
                    <li>• The "Proceed" button continues to connected nodes (invoice, etc.)</li>
                    <li>• Customer must click checkout to proceed - flow waits here</li>
                </ul>
            </CollapsibleTips>
        </div>
    );
};

export default CheckoutNodeForm;
