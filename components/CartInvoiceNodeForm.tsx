import React, { useState, useMemo, useRef } from 'react';
import {
    ShoppingCart, Building2, Palette, Truck, Check, Eye, Sparkles,
    Upload, X, AlertCircle, Receipt, Package, MapPin
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import CollapsibleTips from './CollapsibleTips';

interface CartInvoiceNodeFormProps {
    workspaceId: string;
    initialConfig?: {
        companyName?: string;
        companyLogo?: string;
        companyAddress?: string;
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
    '#1f2937', // Dark
    '#64748b', // Slate
];

const CartInvoiceNodeForm: React.FC<CartInvoiceNodeFormProps> = ({
    workspaceId,
    initialConfig,
    onChange
}) => {
    // State
    const [companyName, setCompanyName] = useState(initialConfig?.companyName || 'Your Store');
    const [companyLogo, setCompanyLogo] = useState(initialConfig?.companyLogo || '');
    const [companyAddress, setCompanyAddress] = useState(initialConfig?.companyAddress || '');
    const [primaryColor, setPrimaryColor] = useState(initialConfig?.primaryColor || '#10b981');
    const [showShipping, setShowShipping] = useState(initialConfig?.showShipping ?? true);
    const [shippingFee, setShippingFee] = useState(initialConfig?.shippingFee || 0);
    const [showCustomerInfo, setShowCustomerInfo] = useState(initialConfig?.showCustomerInfo ?? true);
    const [thankYouMessage, setThankYouMessage] = useState(initialConfig?.thankYouMessage || 'Thank you for your order! 🎉');

    // Upload state
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Active section for accordion
    const [activeSection, setActiveSection] = useState<string>('company');

    // Mobile view toggle
    const [mobileView, setMobileView] = useState<'preview' | 'config'>('config');

    // Notify parent of changes
    const notifyChange = (updates: Partial<typeof initialConfig> = {}) => {
        onChange({
            companyName,
            companyLogo,
            companyAddress,
            primaryColor,
            showShipping,
            shippingFee,
            showCustomerInfo,
            thankYouMessage,
            ...updates
        });
    };

    // Handle logo upload
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setUploadError('Please select an image file');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setUploadError('Logo must be less than 2MB');
            return;
        }

        setIsUploading(true);
        setUploadError('');

        try {
            const fileName = `cart-invoice-logo-${Date.now()}-${file.name}`;
            const filePath = `${workspaceId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('attachments')
                .getPublicUrl(filePath);

            setCompanyLogo(publicUrl);
            notifyChange({ companyLogo: publicUrl });
        } catch (error: any) {
            console.error('Upload error:', error);
            setUploadError(error.message || 'Failed to upload logo');
        } finally {
            setIsUploading(false);
        }
    };

    // Section toggle
    const toggleSection = (section: string) => {
        setActiveSection(activeSection === section ? '' : section);
    };

    // Section header component
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

    // Toggle component
    const Toggle = ({ value, onChange: onToggle, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
        <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">{label}</label>
            <button
                onClick={() => onToggle(!value)}
                className={`w-12 h-6 rounded-full transition-all ${value ? 'bg-emerald-500' : 'bg-slate-600'}`}
            >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
        </div>
    );

    // Color picker
    const ColorPicker = ({ value, onChange: onColorChange, label }: { value: string; onChange: (color: string) => void; label: string }) => (
        <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400">{label}</label>
            <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map(color => (
                    <button
                        key={color}
                        onClick={() => onColorChange(color)}
                        className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${value === color ? 'border-white scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                    />
                ))}
                <div className="relative">
                    <input
                        type="color"
                        value={value}
                        onInput={(e) => onColorChange((e.target as HTMLInputElement).value)}
                        onChange={(e) => onColorChange(e.target.value)}
                        className="w-6 h-6 rounded-full cursor-pointer opacity-0 absolute inset-0"
                    />
                    <div className="w-6 h-6 rounded-full border-2 border-dashed border-slate-500 flex items-center justify-center bg-gradient-to-br from-red-500 via-green-500 to-blue-500">
                        <Palette className="w-3 h-3 text-white" />
                    </div>
                </div>
            </div>
        </div>
    );

    // Preview JSX - Cart Invoice Card
    const previewCardJSX = useMemo(() => (
        <div className="rounded-2xl overflow-hidden shadow-2xl bg-white">
            {/* Gradient Header */}
            <div className="p-4" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)` }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/20">
                            {companyLogo ? (
                                <img src={companyLogo} alt="Logo" className="w-full h-full rounded-lg object-cover" />
                            ) : (
                                <ShoppingCart className="w-5 h-5 text-white" />
                            )}
                        </div>
                        <div>
                            <div className="text-white font-bold text-sm">{companyName}</div>
                            <div className="text-white/80 text-xs">Cart Invoice</div>
                            {companyAddress && <div className="text-white/60 text-[10px] mt-0.5 max-w-[120px] leading-tight">{companyAddress}</div>}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-white/70 text-[10px] uppercase tracking-wider">Order</div>
                        <div className="text-white font-mono text-xs">#ORD-12345</div>
                    </div>
                </div>
            </div>

            {/* Status Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-green-100 border-b border-gray-100">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
                    <Check className="w-3.5 h-3.5" />
                    Order Confirmed
                </div>
                <div className="text-gray-500 text-[11px]">Jan 06, 2026</div>
            </div>

            {/* Customer Section */}
            {showCustomerInfo && (
                <div className="px-4 py-3 border-b border-gray-100">
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Customer</div>
                    <div className="font-semibold text-gray-800 text-sm">John Doe</div>
                    <div className="text-gray-500 text-xs">Facebook Messenger</div>
                </div>
            )}

            {/* Cart Items */}
            <div className="px-4 py-3 border-b border-gray-100">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Cart Items</div>
                <div className="space-y-2">
                    <div className="flex justify-between items-start">
                        <div className="flex items-start gap-2">
                            <Package className="w-4 h-4 text-emerald-500 mt-0.5" />
                            <div>
                                <div className="font-medium text-gray-800 text-sm">Main Product</div>
                                <div className="text-gray-500 text-xs">Qty: 1</div>
                            </div>
                        </div>
                        <div className="font-semibold text-gray-800 text-sm">₱499</div>
                    </div>
                    <div className="flex justify-between items-start">
                        <div className="flex items-start gap-2">
                            <Package className="w-4 h-4 text-teal-500 mt-0.5" />
                            <div>
                                <div className="font-medium text-gray-800 text-sm">Upsell Item</div>
                                <div className="text-gray-500 text-xs">Qty: 1</div>
                            </div>
                        </div>
                        <div className="font-semibold text-gray-800 text-sm">₱299</div>
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="px-4 py-3 bg-gray-50">
                <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="text-gray-700">₱798</span>
                </div>
                {showShipping && shippingFee > 0 && (
                    <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-500">Shipping</span>
                        <span className="text-gray-700">₱{shippingFee}</span>
                    </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="font-bold text-gray-800 text-sm">Total</span>
                    <span className="text-xl font-bold" style={{ color: primaryColor }}>₱{798 + (showShipping ? shippingFee : 0)}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 text-center border-t border-gray-100">
                <p className="text-gray-600 text-sm font-medium">{thankYouMessage}</p>
            </div>
        </div>
    ), [companyName, companyLogo, companyAddress, primaryColor, showCustomerInfo, showShipping, shippingFee, thankYouMessage]);

    // Config Form JSX
    const configFormJSX = useMemo(() => (
        <div className="space-y-3">
            {/* Company Info Section */}
            <div className="space-y-3">
                <SectionHeader id="company" icon={Building2} title="Company Info" color="emerald" />
                {activeSection === 'company' && (
                    <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/10 animate-fade-in">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Company Name</label>
                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) => {
                                    setCompanyName(e.target.value);
                                    notifyChange({ companyName: e.target.value });
                                }}
                                placeholder="Your Store Name"
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all placeholder-slate-500"
                            />
                        </div>

                        {/* Logo Upload */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Company Logo</label>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept="image/*"
                                className="hidden"
                            />
                            {companyLogo ? (
                                <div className="flex items-center gap-3">
                                    <img src={companyLogo} alt="Logo" className="w-16 h-16 rounded-xl object-cover" />
                                    <button
                                        onClick={() => { setCompanyLogo(''); notifyChange({ companyLogo: '' }); }}
                                        className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="w-full py-4 border-2 border-dashed border-white/20 rounded-xl text-slate-400 hover:text-white hover:border-emerald-500/50 transition-all flex items-center justify-center gap-2"
                                >
                                    {isUploading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-5 h-5" />
                                            Upload Logo
                                        </>
                                    )}
                                </button>
                            )}
                            {uploadError && (
                                <div className="mt-2 text-red-400 text-sm flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {uploadError}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                <MapPin className="w-4 h-4 inline mr-1" />
                                Address (Optional)
                            </label>
                            <input
                                type="text"
                                value={companyAddress}
                                onChange={(e) => {
                                    setCompanyAddress(e.target.value);
                                    notifyChange({ companyAddress: e.target.value });
                                }}
                                placeholder="123 Store Street, City"
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all placeholder-slate-500"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Invoice Style Section */}
            <div className="space-y-3">
                <SectionHeader id="style" icon={Palette} title="Invoice Style" color="indigo" />
                {activeSection === 'style' && (
                    <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/10 animate-fade-in">
                        <ColorPicker
                            value={primaryColor}
                            onChange={(c) => { setPrimaryColor(c); notifyChange({ primaryColor: c }); }}
                            label="Primary Color"
                        />

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Thank You Message</label>
                            <input
                                type="text"
                                value={thankYouMessage}
                                onChange={(e) => {
                                    setThankYouMessage(e.target.value);
                                    notifyChange({ thankYouMessage: e.target.value });
                                }}
                                placeholder="Thank you for your order! 🎉"
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder-slate-500"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Display & Shipping Section */}
            <div className="space-y-3">
                <SectionHeader id="display" icon={Truck} title="Display & Shipping" color="cyan" />
                {activeSection === 'display' && (
                    <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/10 animate-fade-in">
                        <Toggle
                            value={showCustomerInfo}
                            onChange={(v) => { setShowCustomerInfo(v); notifyChange({ showCustomerInfo: v }); }}
                            label="Show Customer Info"
                        />
                        <Toggle
                            value={showShipping}
                            onChange={(v) => { setShowShipping(v); notifyChange({ showShipping: v }); }}
                            label="Show Shipping Fee"
                        />
                        {showShipping && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Shipping Fee (₱)</label>
                                <input
                                    type="number"
                                    value={shippingFee}
                                    onChange={(e) => {
                                        const value = Number(e.target.value);
                                        setShippingFee(value);
                                        notifyChange({ shippingFee: value });
                                    }}
                                    min="0"
                                    placeholder="0"
                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all placeholder-slate-500"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Tips */}
            <CollapsibleTips title="Tips & Best Practices" color="green">
                <ul className="text-sm space-y-1.5">
                    <li>• Cart Invoice shows ALL items from the cart (product + upsells/downsells)</li>
                    <li>• Add your company logo for professional branding</li>
                    <li>• Use your brand color for consistent styling</li>
                    <li>• Connect this after the Checkout node to send the order summary</li>
                </ul>
            </CollapsibleTips>
        </div>
    ), [activeSection, companyName, companyLogo, companyAddress, isUploading, uploadError, primaryColor, thankYouMessage, showCustomerInfo, showShipping, shippingFee]);

    return (
        <div
            className="nodrag nopan"
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
        >
            {/* Mobile: Toggle Switch */}
            <div className="md:hidden mb-4">
                <div className="flex rounded-xl overflow-hidden border border-white/10 bg-black/20">
                    <button
                        onClick={() => setMobileView('config')}
                        className={`flex-1 py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${mobileView === 'config'
                            ? 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-500'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <Sparkles className="w-4 h-4" />
                        Configure
                    </button>
                    <button
                        onClick={() => setMobileView('preview')}
                        className={`flex-1 py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${mobileView === 'preview'
                            ? 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-500'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <Eye className="w-4 h-4" />
                        Preview
                    </button>
                </div>
            </div>

            {/* Mobile: Show either config or preview based on toggle */}
            <div className="md:hidden">
                {mobileView === 'preview' ? (
                    <div className="flex items-center justify-center p-4">
                        <div className="max-w-[360px] w-full">
                            {previewCardJSX}
                        </div>
                    </div>
                ) : (
                    configFormJSX
                )}
            </div>

            {/* Desktop: 2-Column Layout */}
            <div className="hidden md:grid md:grid-cols-2 md:gap-6">
                {/* Left Column: Configuration Form */}
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                    {configFormJSX}
                </div>

                {/* Right Column: Live Preview (Sticky) */}
                <div className="relative">
                    <div className="sticky top-0">
                        <div className="flex items-center gap-2 mb-3">
                            <Eye className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm font-semibold text-white">Live Preview</span>
                        </div>
                        <div className="flex items-center justify-center">
                            <div className="max-w-[360px] w-full">
                                {previewCardJSX}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartInvoiceNodeForm;
