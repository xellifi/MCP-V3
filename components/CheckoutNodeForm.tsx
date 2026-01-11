import React, { useState, useEffect, memo, useCallback } from 'react';
import {
    ShoppingCart, Type, Palette, Check, Image, Settings, Globe, Truck,
    Smartphone, Monitor, Tablet, X, Package, ChevronDown, ChevronUp,
    CreditCard, User, Receipt, Save, Eye, ChevronLeft, ChevronRight,
    Phone, Mail, MapPin, Home, Building, Map, Hash, ClipboardList, ExternalLink
} from 'lucide-react';

interface CustomerFieldConfig {
    enabled: boolean;
    required: boolean;
    label?: string;
}

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
        useWebview?: boolean;
        showShipping?: boolean;
        shippingFee?: number;
        successMessage?: string;
        thankYouMessage?: string;
        backgroundColor?: string;
        cardBackgroundColor?: string;
        textColor?: string;
        accentColor?: string;
        // Customer Fields Configuration
        customerFields?: {
            name?: CustomerFieldConfig;
            phone?: CustomerFieldConfig;
            email?: CustomerFieldConfig;
            fullAddress?: CustomerFieldConfig;
            street?: CustomerFieldConfig;
            city?: CustomerFieldConfig;
            province?: CustomerFieldConfig;
            zipCode?: CustomerFieldConfig;
            notes?: CustomerFieldConfig;
        };
        useFullAddress?: boolean; // true = single address field, false = split fields
    };
    onChange: (config: any) => void;
    onClose?: () => void;
}

const PRESET_COLORS = [
    '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
    '#ef4444', '#06b6d4', '#84cc16', '#1f2937', '#ffffff',
];

const BG_COLORS = ['#0f172a', '#1e293b', '#18181b', '#1f2937', '#0c0a09', '#ffffff'];
const CARD_COLORS = ['#1e293b', '#27272a', '#374151', '#334155', '#292524', '#f8fafc'];

// Collapsible Section Component
const CollapsibleSection = memo(({
    title,
    icon: Icon,
    children,
    defaultOpen = false,
    color = 'teal'
}: {
    title: string;
    icon?: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
    color?: string;
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-black/20 rounded-xl overflow-hidden border border-white/5">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon className={`w-4 h-4 text-${color}-400`} />}
                    <span className="text-sm font-semibold text-white">{title}</span>
                </div>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
            </button>
            {isOpen && (
                <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
                    {children}
                </div>
            )}
        </div>
    );
});
CollapsibleSection.displayName = 'CollapsibleSection';

// Toggle Component
const Toggle = memo(({ value, onChange, label, description }: { value: boolean; onChange: (v: boolean) => void; label: string; description?: string }) => (
    <div className="flex items-center justify-between">
        <div className="flex-1">
            <span className="text-sm font-medium text-slate-300">{label}</span>
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
        <button
            type="button"
            onClick={() => onChange(!value)}
            className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-emerald-500' : 'bg-slate-600'}`}
        >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-md ${value ? 'left-7' : 'left-1'}`} />
        </button>
    </div>
));
Toggle.displayName = 'Toggle';

const CheckoutNodeForm: React.FC<CheckoutNodeFormProps> = ({
    workspaceId,
    initialConfig,
    onChange,
    onClose
}) => {
    // State
    const [headerText, setHeaderText] = useState(initialConfig?.headerText || '🛒 Your Order Summary');
    const [buttonText, setButtonText] = useState(initialConfig?.buttonText || '✅ Confirm Order');
    const [primaryColor, setPrimaryColor] = useState(initialConfig?.primaryColor || '#10b981');
    const [showItemDetails, setShowItemDetails] = useState(initialConfig?.showItemDetails ?? true);
    const [showTotal, setShowTotal] = useState(initialConfig?.showTotal ?? true);
    const [companyLogo, setCompanyLogo] = useState(initialConfig?.companyLogo || '');
    const [companyName, setCompanyName] = useState(initialConfig?.companyName || '');
    const [useWebview, setUseWebview] = useState(initialConfig?.useWebview ?? true);
    const [showShipping, setShowShipping] = useState(initialConfig?.showShipping ?? false);
    const [shippingFee, setShippingFee] = useState(initialConfig?.shippingFee || 0);
    const [successMessage, setSuccessMessage] = useState(initialConfig?.successMessage || 'Order Confirmed! 🎉');
    const [thankYouMessage, setThankYouMessage] = useState(initialConfig?.thankYouMessage || 'Thank you for your purchase!');
    const [backgroundColor, setBackgroundColor] = useState(initialConfig?.backgroundColor || '#0f172a');
    const [cardBackgroundColor, setCardBackgroundColor] = useState(initialConfig?.cardBackgroundColor || '#1e293b');
    const [textColor, setTextColor] = useState(initialConfig?.textColor || '#ffffff');
    const [accentColor, setAccentColor] = useState(initialConfig?.accentColor || '#10b981');

    // Customer Fields Configuration
    const defaultFields = {
        name: { enabled: true, required: true, label: 'Full Name' },
        phone: { enabled: true, required: true, label: 'Phone Number' },
        email: { enabled: true, required: false, label: 'Email Address' },
        fullAddress: { enabled: true, required: true, label: 'Complete Address' },
        street: { enabled: false, required: false, label: 'Street Address' },
        city: { enabled: false, required: false, label: 'City' },
        province: { enabled: false, required: false, label: 'Province/State' },
        zipCode: { enabled: false, required: false, label: 'ZIP Code' },
        notes: { enabled: false, required: false, label: 'Order Notes' },
    };
    const [customerFields, setCustomerFields] = useState(initialConfig?.customerFields || defaultFields);
    const [useFullAddress, setUseFullAddress] = useState(initialConfig?.useFullAddress ?? true);

    // UI State
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('mobile');
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
    const [saveNotification, setSaveNotification] = useState(false);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Notify parent of config changes
    const notifyChange = useCallback((updates: Partial<typeof initialConfig> = {}) => {
        // Compute flat field config for WebviewCheckout compatibility
        const currentFields = updates.customerFields || customerFields;
        const showAddress = useFullAddress
            ? currentFields.fullAddress?.enabled
            : (currentFields.street?.enabled || currentFields.city?.enabled);
        const requireAddress = useFullAddress
            ? currentFields.fullAddress?.required
            : (currentFields.street?.required || currentFields.city?.required);

        onChange({
            headerText, buttonText, primaryColor, showItemDetails, showTotal,
            companyLogo, companyName, useWebview, showShipping, shippingFee,
            successMessage, thankYouMessage, backgroundColor, cardBackgroundColor,
            textColor, accentColor, customerFields, useFullAddress,
            // Flat field configs for WebviewCheckout compatibility
            showNameField: currentFields.name?.enabled ?? true,
            showPhoneField: currentFields.phone?.enabled ?? true,
            showEmailField: currentFields.email?.enabled ?? false,
            showAddressField: showAddress ?? true,
            requireName: currentFields.name?.required ?? true,
            requirePhone: currentFields.phone?.required ?? true,
            requireEmail: currentFields.email?.required ?? false,
            requireAddress: requireAddress ?? true,
            showNotesField: currentFields.notes?.enabled ?? false,
            ...updates
        });
    }, [headerText, buttonText, primaryColor, showItemDetails, showTotal, companyLogo, companyName, useWebview, showShipping, shippingFee, successMessage, thankYouMessage, backgroundColor, cardBackgroundColor, textColor, accentColor, customerFields, useFullAddress, onChange]);

    // Initial notification
    useEffect(() => {
        notifyChange();
    }, []);

    // Sample cart items for preview
    const sampleCartItems = [
        { productName: 'Premium Sneakers', productPrice: 2999, quantity: 1 },
        { productName: 'Sport Socks (3-pack)', productPrice: 299, quantity: 2 },
    ];
    const subtotal = sampleCartItems.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);
    const total = subtotal + (showShipping ? shippingFee : 0);

    // Device sizes for preview
    const deviceSizes = {
        mobile: { width: 320, height: 580, radius: 40, notch: true },
        tablet: { width: 420, height: 560, radius: 24, notch: false },
        desktop: { width: 560, height: 380, radius: 8, notch: false }
    };

    // Preview Component
    const DevicePreview = () => {
        const size = deviceSizes[previewDevice];

        return (
            <div className="flex flex-col items-center">
                <div className="relative" style={{ width: size.width, height: size.height }}>
                    {/* Device Frame */}
                    <div
                        className={`w-full h-full shadow-2xl border-4 flex flex-col overflow-hidden ${previewDevice === 'desktop' ? 'bg-slate-200 border-slate-400' : 'bg-slate-900 border-slate-700'
                            }`}
                        style={{ borderRadius: size.radius }}
                    >
                        {/* Notch (mobile only) */}
                        {size.notch && (
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10" />
                        )}

                        {/* Screen Content */}
                        <div
                            className="w-full h-full overflow-y-auto flex flex-col"
                            style={{
                                backgroundColor,
                                borderRadius: Math.max(size.radius - 6, 4)
                            }}
                        >
                            {/* Status bar */}
                            <div className={`h-7 flex-shrink-0 flex items-center justify-between px-4 text-[10px] ${previewDevice === 'desktop' ? 'text-slate-500 bg-slate-100' : 'text-white/60'
                                }`}>
                                {previewDevice === 'desktop' ? (
                                    <>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                                        </div>
                                        <span className="text-[10px] text-slate-400">checkout.mystore.com</span>
                                        <div />
                                    </>
                                ) : (
                                    <>
                                        <span>9:41</span>
                                        <span>⚡ 100%</span>
                                    </>
                                )}
                            </div>

                            {/* Checkout Content */}
                            <div className={`flex-1 ${previewDevice === 'desktop' ? 'p-6' : 'p-4'} space-y-4 overflow-y-auto`}>
                                {/* Header */}
                                <div className="text-center">
                                    {companyLogo && (
                                        <img src={companyLogo} alt="Logo" className="w-12 h-12 mx-auto mb-2 rounded-full object-cover border-2" style={{ borderColor: accentColor }} />
                                    )}
                                    <h1 className={`font-bold ${previewDevice === 'desktop' ? 'text-xl' : 'text-lg'}`} style={{ color: textColor }}>{headerText}</h1>
                                    {companyName && (
                                        <p className="text-sm opacity-70 mt-1" style={{ color: textColor }}>{companyName}</p>
                                    )}
                                </div>

                                {/* Cart Items */}
                                {showItemDetails && (
                                    <div
                                        className="rounded-xl p-4 space-y-3"
                                        style={{ backgroundColor: cardBackgroundColor }}
                                    >
                                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                                            <ShoppingCart className="w-4 h-4" style={{ color: accentColor }} />
                                            <span className="text-sm font-semibold" style={{ color: textColor }}>Order Items</span>
                                            <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${accentColor}30`, color: accentColor }}>
                                                {sampleCartItems.length} items
                                            </span>
                                        </div>

                                        {sampleCartItems.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-3">
                                                <div
                                                    className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                                                    style={{ backgroundColor: `${accentColor}20` }}
                                                >
                                                    <Package className="w-6 h-6" style={{ color: accentColor }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate" style={{ color: textColor }}>{item.productName}</p>
                                                    <p className="text-xs opacity-60" style={{ color: textColor }}>Qty: {item.quantity}</p>
                                                </div>
                                                <p className="text-sm font-bold flex-shrink-0" style={{ color: accentColor }}>
                                                    ₱{(item.productPrice * item.quantity).toLocaleString()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Order Summary */}
                                {showTotal && (
                                    <div
                                        className="rounded-xl p-4 space-y-2"
                                        style={{ backgroundColor: cardBackgroundColor }}
                                    >
                                        <div className="flex justify-between text-sm" style={{ color: textColor }}>
                                            <span className="opacity-70">Subtotal</span>
                                            <span>₱{subtotal.toLocaleString()}</span>
                                        </div>
                                        {showShipping && (
                                            <div className="flex justify-between text-sm" style={{ color: textColor }}>
                                                <span className="opacity-70 flex items-center gap-1">
                                                    <Truck className="w-3 h-3" /> Shipping
                                                </span>
                                                <span className={shippingFee === 0 ? 'text-emerald-400 font-medium' : ''}>
                                                    {shippingFee === 0 ? 'FREE' : `₱${shippingFee.toLocaleString()}`}
                                                </span>
                                            </div>
                                        )}
                                        <div className="h-px my-2" style={{ backgroundColor: `${textColor}20` }} />
                                        <div className="flex justify-between text-lg font-bold" style={{ color: textColor }}>
                                            <span>Total</span>
                                            <span style={{ color: accentColor }}>₱{total.toLocaleString()}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Customer Info - Dynamic based on config */}
                                <div
                                    className="rounded-xl p-4 space-y-2"
                                    style={{ backgroundColor: cardBackgroundColor }}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <User className="w-4 h-4" style={{ color: accentColor }} />
                                        <span className="text-sm font-semibold" style={{ color: textColor }}>Customer Info</span>
                                    </div>
                                    {customerFields.name?.enabled && (
                                        <div className="flex items-center gap-2">
                                            <User className="w-3 h-3 opacity-50" style={{ color: textColor }} />
                                            <span className="text-sm" style={{ color: textColor }}>John Doe {customerFields.name?.required && <span className="text-red-400">*</span>}</span>
                                        </div>
                                    )}
                                    {customerFields.phone?.enabled && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-3 h-3 opacity-50" style={{ color: textColor }} />
                                            <span className="text-xs opacity-80" style={{ color: textColor }}>+63 912 345 6789 {customerFields.phone?.required && <span className="text-red-400">*</span>}</span>
                                        </div>
                                    )}
                                    {customerFields.email?.enabled && (
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-3 h-3 opacity-50" style={{ color: textColor }} />
                                            <span className="text-xs opacity-60" style={{ color: textColor }}>john@example.com {customerFields.email?.required && <span className="text-red-400">*</span>}</span>
                                        </div>
                                    )}
                                    {(customerFields.fullAddress?.enabled || customerFields.street?.enabled) && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-3 h-3 opacity-50" style={{ color: textColor }} />
                                            <span className="text-xs opacity-60" style={{ color: textColor }}>123 Sample St, Cebu City {customerFields.fullAddress?.required && <span className="text-red-400">*</span>}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Confirm Button */}
                                <button
                                    className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-xl transition-transform hover:scale-[1.02]"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <CreditCard className="w-5 h-5" />
                                    {buttonText}
                                </button>
                            </div>

                            {/* Home indicator (mobile only) */}
                            {size.notch && (
                                <div className="h-5 flex-shrink-0 flex items-center justify-center">
                                    <div className="w-28 h-1 bg-white/30 rounded-full" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ================== FORM SECTIONS ==================
    const basicSection = (
        <CollapsibleSection title="Display Mode" icon={Globe} defaultOpen={true} color="emerald">
            <div className="space-y-4">
                {/* Webview Toggle - Hero Feature */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30">
                    <Toggle
                        value={useWebview}
                        onChange={(v) => { setUseWebview(v); notifyChange({ useWebview: v }); }}
                        label="Use Webview"
                        description="Show beautiful checkout page in webview"
                    />
                    {!useWebview && (
                        <p className="text-xs text-amber-400 mt-3 p-2 bg-amber-500/10 rounded-lg">
                            ⚠️ When disabled, uses simple Messenger text buttons
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Header Title</label>
                    <input
                        type="text"
                        value={headerText}
                        onChange={(e) => { setHeaderText(e.target.value); notifyChange({ headerText: e.target.value }); }}
                        placeholder="🛒 Your Order Summary"
                        className="w-full px-3 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white text-sm placeholder-white/40 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Button Text</label>
                    <input
                        type="text"
                        value={buttonText}
                        onChange={(e) => { setButtonText(e.target.value); notifyChange({ buttonText: e.target.value }); }}
                        placeholder="✅ Confirm Order"
                        className="w-full px-3 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white text-sm placeholder-white/40 focus:border-emerald-500/50"
                    />
                </div>

                {useWebview && (
                    <>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Success Message</label>
                            <input
                                type="text"
                                value={successMessage}
                                onChange={(e) => { setSuccessMessage(e.target.value); notifyChange({ successMessage: e.target.value }); }}
                                placeholder="Order Confirmed! 🎉"
                                className="w-full px-3 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white text-sm placeholder-white/40"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5">Thank You Message</label>
                            <input
                                type="text"
                                value={thankYouMessage}
                                onChange={(e) => { setThankYouMessage(e.target.value); notifyChange({ thankYouMessage: e.target.value }); }}
                                placeholder="Thank you for your purchase!"
                                className="w-full px-3 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white text-sm placeholder-white/40"
                            />
                        </div>
                    </>
                )}
            </div>
        </CollapsibleSection>
    );

    const shippingSection = (
        <CollapsibleSection title="Shipping" icon={Truck} defaultOpen={false} color="orange">
            <div className="space-y-4">
                <Toggle
                    value={showShipping}
                    onChange={(v) => { setShowShipping(v); notifyChange({ showShipping: v }); }}
                    label="Add Shipping Fee"
                />
                {showShipping && (
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">Shipping Fee (₱)</label>
                        <input
                            type="number"
                            value={shippingFee}
                            onChange={(e) => {
                                const fee = parseFloat(e.target.value) || 0;
                                setShippingFee(fee);
                                notifyChange({ shippingFee: fee });
                            }}
                            placeholder="0"
                            min="0"
                            step="10"
                            className="w-full px-3 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white text-sm"
                        />
                        <p className="text-xs text-slate-500 mt-1">Set to 0 for FREE shipping</p>
                    </div>
                )}
            </div>
        </CollapsibleSection>
    );

    const brandingSection = (
        <CollapsibleSection title="Company Info" icon={Image} defaultOpen={true} color="blue">
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Company Name</label>
                    <input
                        type="text"
                        value={companyName}
                        onChange={(e) => { setCompanyName(e.target.value); notifyChange({ companyName: e.target.value }); }}
                        placeholder="Your Store Name"
                        className="w-full px-3 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white text-sm placeholder-white/40"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Logo URL</label>
                    <input
                        type="text"
                        value={companyLogo}
                        onChange={(e) => { setCompanyLogo(e.target.value); notifyChange({ companyLogo: e.target.value }); }}
                        placeholder="https://example.com/logo.png"
                        className="w-full px-3 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white text-sm placeholder-white/40"
                    />
                </div>
            </div>
        </CollapsibleSection>
    );

    const styleSection = (
        <CollapsibleSection title="Colors" icon={Palette} defaultOpen={true} color="violet">
            <div className="space-y-5">
                {/* Primary/Button Color */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Button Color</label>
                    <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => { setPrimaryColor(color); notifyChange({ primaryColor: color }); }}
                                className={`w-8 h-8 rounded-lg transition-all ${primaryColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-105'}`}
                                style={{ backgroundColor: color }}
                            >
                                {primaryColor === color && <Check className="w-4 h-4 text-white mx-auto" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Accent Color */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Accent Color</label>
                    <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => { setAccentColor(color); notifyChange({ accentColor: color }); }}
                                className={`w-8 h-8 rounded-lg transition-all ${accentColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-105'}`}
                                style={{ backgroundColor: color }}
                            >
                                {accentColor === color && <Check className="w-4 h-4 text-white mx-auto" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Background Color */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Page Background</label>
                    <div className="flex flex-wrap gap-2">
                        {BG_COLORS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => { setBackgroundColor(color); notifyChange({ backgroundColor: color }); }}
                                className={`w-8 h-8 rounded-lg transition-all border border-white/20 ${backgroundColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-105'}`}
                                style={{ backgroundColor: color }}
                            >
                                {backgroundColor === color && <Check className={`w-4 h-4 mx-auto ${color === '#ffffff' ? 'text-black' : 'text-white'}`} />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Card Background */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Card Background</label>
                    <div className="flex flex-wrap gap-2">
                        {CARD_COLORS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => { setCardBackgroundColor(color); notifyChange({ cardBackgroundColor: color }); }}
                                className={`w-8 h-8 rounded-lg transition-all border border-white/20 ${cardBackgroundColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-105'}`}
                                style={{ backgroundColor: color }}
                            >
                                {cardBackgroundColor === color && <Check className={`w-4 h-4 mx-auto ${color === '#f8fafc' ? 'text-black' : 'text-white'}`} />}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </CollapsibleSection>
    );

    const optionsSection = (
        <CollapsibleSection title="Display Options" icon={Settings} defaultOpen={false} color="cyan">
            <div className="space-y-3">
                <Toggle
                    value={showItemDetails}
                    onChange={(v) => { setShowItemDetails(v); notifyChange({ showItemDetails: v }); }}
                    label="Show Item Details"
                />
                <Toggle
                    value={showTotal}
                    onChange={(v) => { setShowTotal(v); notifyChange({ showTotal: v }); }}
                    label="Show Total"
                />
            </div>
        </CollapsibleSection>
    );

    // Customer Fields Configuration Section
    const updateField = (fieldName: string, updates: Partial<CustomerFieldConfig>) => {
        const newFields = {
            ...customerFields,
            [fieldName]: { ...customerFields[fieldName as keyof typeof customerFields], ...updates }
        };
        setCustomerFields(newFields);
        notifyChange({ customerFields: newFields });
    };

    const FieldToggle = ({ fieldKey, icon: Icon, defaultLabel }: { fieldKey: string; icon: React.ElementType; defaultLabel: string }) => {
        const field = customerFields[fieldKey as keyof typeof customerFields] || { enabled: false, required: false, label: defaultLabel };
        return (
            <div className="p-3 bg-black/20 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-300">{field.label || defaultLabel}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => updateField(fieldKey, { enabled: !field.enabled })}
                        className={`relative w-10 h-5 rounded-full transition-colors ${field.enabled ? 'bg-emerald-500' : 'bg-slate-600'}`}
                    >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${field.enabled ? 'left-5' : 'left-0.5'}`} />
                    </button>
                </div>
                {field.enabled && (
                    <div className="flex items-center gap-3 pl-6">
                        <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => updateField(fieldKey, { required: e.target.checked })}
                                className="w-3.5 h-3.5 rounded border-slate-500 bg-black/30 text-emerald-500 focus:ring-emerald-500/30"
                            />
                            Required
                        </label>
                    </div>
                )}
            </div>
        );
    };

    const customerFieldsSection = (
        <CollapsibleSection title="Customer Fields" icon={ClipboardList} defaultOpen={true} color="amber">
            <div className="space-y-3">
                <p className="text-xs text-slate-500 mb-3">Configure which fields the customer needs to fill out</p>

                {/* Basic Info */}
                <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-400 uppercase">Basic Info</p>
                    <FieldToggle fieldKey="name" icon={User} defaultLabel="Full Name" />
                    <FieldToggle fieldKey="phone" icon={Phone} defaultLabel="Phone Number" />
                    <FieldToggle fieldKey="email" icon={Mail} defaultLabel="Email Address" />
                </div>

                {/* Address Section */}
                <div className="space-y-2 pt-3 border-t border-white/10">
                    <p className="text-xs font-medium text-slate-400 uppercase">Address</p>

                    {/* Address Type Toggle */}
                    <div className="flex items-center gap-2 mb-2">
                        <button
                            type="button"
                            onClick={() => { setUseFullAddress(true); notifyChange({ useFullAddress: true }); }}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${useFullAddress ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-black/20 text-slate-400 border border-white/10'
                                }`}
                        >
                            Single Field
                        </button>
                        <button
                            type="button"
                            onClick={() => { setUseFullAddress(false); notifyChange({ useFullAddress: false }); }}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${!useFullAddress ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-black/20 text-slate-400 border border-white/10'
                                }`}
                        >
                            Split Fields
                        </button>
                    </div>

                    {useFullAddress ? (
                        <FieldToggle fieldKey="fullAddress" icon={MapPin} defaultLabel="Complete Address" />
                    ) : (
                        <>
                            <FieldToggle fieldKey="street" icon={Home} defaultLabel="Street Address" />
                            <FieldToggle fieldKey="city" icon={Building} defaultLabel="City" />
                            <FieldToggle fieldKey="province" icon={Map} defaultLabel="Province/State" />
                            <FieldToggle fieldKey="zipCode" icon={Hash} defaultLabel="ZIP Code" />
                        </>
                    )}
                </div>

                {/* Optional Fields */}
                <div className="space-y-2 pt-3 border-t border-white/10">
                    <p className="text-xs font-medium text-slate-400 uppercase">Optional</p>
                    <FieldToggle fieldKey="notes" icon={ClipboardList} defaultLabel="Order Notes" />
                </div>
            </div>
        </CollapsibleSection>
    );

    // Modal width based on device selection
    const modalWidths = {
        mobile: 'max-w-4xl',
        tablet: 'max-w-5xl',
        desktop: 'max-w-7xl'
    };

    // ================== DESKTOP: Full Modal ==================
    if (isDesktop) {
        return (
            <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-50 p-4 flex items-center justify-center">
                <div className={`w-full ${modalWidths[previewDevice]} h-full max-h-full flex flex-col bg-slate-800/50 rounded-2xl border border-white/10 overflow-hidden transition-all duration-300`}>
                    {/* Header */}
                    <div className="flex-shrink-0 h-14 border-b border-white/10 flex items-center px-4 gap-4">
                        {/* Left: Title */}
                        <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                                <ShoppingCart className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <span className="text-base font-bold text-white">Checkout Node</span>
                                <p className="text-[10px] text-slate-400">Configure your checkout page</p>
                            </div>
                        </div>

                        {/* Center: Device Switcher */}
                        <div className="flex-1 flex justify-center">
                            <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg p-1 border border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice('mobile')}
                                    className={`p-2 rounded-md transition-all ${previewDevice === 'mobile' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                                    title="Mobile"
                                >
                                    <Smartphone className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice('tablet')}
                                    className={`p-2 rounded-md transition-all ${previewDevice === 'tablet' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                                    title="Tablet"
                                >
                                    <Tablet className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice('desktop')}
                                    className={`p-2 rounded-md transition-all ${previewDevice === 'desktop' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                                    title="Desktop"
                                >
                                    <Monitor className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Right: Live Preview + Save + Close */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${useWebview ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                {useWebview ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                                Webview {useWebview ? 'ON' : 'OFF'}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    // Open live preview in new tab
                                    const previewUrl = `${window.location.origin}/checkout/preview?config=${encodeURIComponent(JSON.stringify({
                                        headerText, buttonText, primaryColor, showItemDetails, showTotal,
                                        companyLogo, companyName, showShipping, shippingFee,
                                        successMessage, thankYouMessage, backgroundColor, cardBackgroundColor,
                                        textColor, accentColor,
                                        showNameField: customerFields.name?.enabled,
                                        showPhoneField: customerFields.phone?.enabled,
                                        showEmailField: customerFields.email?.enabled,
                                        showAddressField: useFullAddress ? customerFields.fullAddress?.enabled : customerFields.street?.enabled,
                                        requireName: customerFields.name?.required,
                                        requirePhone: customerFields.phone?.required,
                                        requireEmail: customerFields.email?.required,
                                        requireAddress: useFullAddress ? customerFields.fullAddress?.required : customerFields.street?.required
                                    }))}`;
                                    window.open(previewUrl, '_blank');
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 hover:bg-slate-500 rounded-lg text-white text-xs font-medium transition-colors"
                                title="Open Live Preview"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Live Preview</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSaveNotification(true);
                                    setTimeout(() => setSaveNotification(false), 3000);
                                }}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white text-xs font-medium transition-colors"
                                title="Save Configuration"
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span>Save</span>
                            </button>
                            {onClose && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                                    title="Close"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        {/* Save Notification Toast */}
                        {saveNotification && (
                            <div className="absolute top-16 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in z-50">
                                <Check className="w-4 h-4" />
                                <span className="text-sm font-medium">Settings saved!</span>
                            </div>
                        )}
                    </div>

                    {/* Content - 2 Column Layout (Settings | Preview) */}
                    <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
                        {/* Left: All Settings */}
                        <div className="border-r border-white/10 p-5 overflow-y-auto custom-scrollbar space-y-4">
                            {basicSection}
                            {customerFieldsSection}
                            {shippingSection}
                            {brandingSection}
                            {styleSection}
                            {optionsSection}
                        </div>

                        {/* Right: Live Preview */}
                        <div className="p-5 flex items-center justify-center bg-slate-950/50 overflow-auto">
                            <DevicePreview />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ================== MOBILE: Simple Layout ==================
    return (
        <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20">
                        <ShoppingCart className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-sm font-bold text-white">Checkout</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { setSaveNotification(true); setTimeout(() => setSaveNotification(false), 2000); }}
                        className="px-3 py-1.5 bg-emerald-500 rounded-lg text-white text-xs font-medium"
                    >
                        Save
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {basicSection}
                {customerFieldsSection}
                {shippingSection}
                {brandingSection}
                {styleSection}
                {optionsSection}
            </div>

            {/* Save toast */}
            {saveNotification && (
                <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Saved!</span>
                </div>
            )}
        </div>
    );
};

export default CheckoutNodeForm;
