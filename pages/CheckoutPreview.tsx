import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShoppingCart, Check, Package, User, MapPin, Phone, Mail, CreditCard, Truck, Wallet, AlertCircle, Home, Building, Map, Hash, ClipboardList } from 'lucide-react';

interface PaymentMethod {
    id: string;
    name: string;
    icon: string;
    description?: string;
}

interface CustomerFieldConfig {
    enabled: boolean;
    required: boolean;
    label?: string;
}

interface CheckoutConfig {
    headerText?: string;
    buttonText?: string;
    primaryColor?: string;
    backgroundColor?: string;
    cardBackgroundColor?: string;
    textColor?: string;
    accentColor?: string;
    companyName?: string;
    companyLogo?: string;
    showShipping?: boolean;
    shippingFee?: number;
    successMessage?: string;
    thankYouMessage?: string;
    showItemDetails?: boolean;
    showTotal?: boolean;
    // Legacy flags
    showNameField?: boolean;
    showPhoneField?: boolean;
    showEmailField?: boolean;
    showAddressField?: boolean;
    requireName?: boolean;
    requirePhone?: boolean;
    requireEmail?: boolean;
    requireAddress?: boolean;
    // New Detailed Configuration
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
    useFullAddress?: boolean;
    paymentMethods?: PaymentMethod[];
}

interface ShippingForm {
    name: string;
    phone: string;
    email: string;
    address: string;
    street: string;
    city: string;
    province: string;
    zipCode: string;
    notes: string;
}

const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
    { id: 'cod', name: 'Cash on Delivery', icon: '💵', description: 'Pay when you receive' },
    { id: 'gcash', name: 'GCash', icon: '📱', description: 'Pay via GCash' },
    { id: 'bank', name: 'Bank Transfer', icon: '🏦', description: 'Direct bank transfer' },
];

const CheckoutPreview: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [config, setConfig] = useState<CheckoutConfig>({});
    const [error, setError] = useState('');

    // Form state
    const [shippingForm, setShippingForm] = useState<ShippingForm>({
        name: 'John Doe',
        phone: '09171234567',
        email: 'john@example.com',
        address: '123 Sample Street, Cebu City, Cebu 6000',
        street: '123 Sample Street',
        city: 'Cebu City',
        province: 'Cebu',
        zipCode: '6000',
        notes: 'Please ring the doorbell'
    });
    const [selectedPayment, setSelectedPayment] = useState<string>('cod');

    useEffect(() => {
        try {
            const configParam = searchParams.get('config');
            if (configParam) {
                const parsed = JSON.parse(decodeURIComponent(configParam));
                setConfig(parsed);
            }
        } catch (e) {
            console.error('Failed to parse config:', e);
            setError('Invalid configuration');
        }
    }, [searchParams]);

    // Sample cart items for preview
    const sampleCart = [
        { productName: 'Premium Sneakers', productPrice: 2999, quantity: 1 },
        { productName: 'Sport Socks (3-pack)', productPrice: 299, quantity: 2 },
    ];

    const subtotal = sampleCart.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);
    const shipping = config.showShipping ? (config.shippingFee || 0) : 0;
    const total = subtotal + shipping;

    // Derived display settings
    const buttonColor = config.primaryColor || config.accentColor || '#10b981';
    const backgroundColor = config.backgroundColor || '#0f172a';
    const cardBackgroundColor = config.cardBackgroundColor || '#1e293b';
    const textColor = config.textColor || '#ffffff';
    const accentColor = config.accentColor || '#10b981';
    const paymentMethods = config.paymentMethods || DEFAULT_PAYMENT_METHODS;

    // Field visibility logic (matching WebviewCheckout)
    const fields = config.customerFields;

    // Fallback to legacy triggers if config.customerFields is missing
    const showName = fields ? fields.name?.enabled : (config.showNameField !== false);
    const showPhone = fields ? fields.phone?.enabled : (config.showPhoneField !== false);
    const showEmail = fields ? fields.email?.enabled : (config.showEmailField === true);

    // Address visibility logic
    const useFullAddress = config.useFullAddress ?? true;
    const showFullAddress = fields ? (useFullAddress && fields.fullAddress?.enabled) : (config.showAddressField !== false);

    // Split address fields
    const showStreet = fields ? (!useFullAddress && fields.street?.enabled) : false;
    const showCity = fields ? (!useFullAddress && fields.city?.enabled) : false;
    const showProvince = fields ? (!useFullAddress && fields.province?.enabled) : false;
    const showZip = fields ? (!useFullAddress && fields.zipCode?.enabled) : false;

    // Notes
    const showNotes = fields ? fields.notes?.enabled : false;

    // Helper for labels and requirements
    const getLabel = (key: keyof typeof fields, defaultLbl: string) => fields?.[key]?.label || defaultLbl;
    const isRequired = (key: keyof typeof fields, legacyReq?: boolean) => {
        if (fields && fields[key]) return fields[key]!.required;
        return legacyReq;
    };

    if (error) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-white mb-2">Preview Error</h1>
                    <p className="text-slate-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            {/* Preview Badge */}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-4 py-2 rounded-full text-sm font-bold shadow-lg z-50 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                LIVE PREVIEW MODE - This is how customers will see it
            </div>

            {/* Dark Container */}
            <div
                className="w-full max-w-md mx-auto rounded-2xl shadow-2xl overflow-hidden flex flex-col mt-12"
                style={{ maxHeight: '85vh', backgroundColor }}
            >
                {/* Scrollable Content */}
                <div className="flex-1 overflow-auto p-4 pb-24">
                    {/* Header */}
                    {(config.companyLogo || config.companyName) && (
                        <div className="text-center mb-4">
                            {config.companyLogo && (
                                <img
                                    src={config.companyLogo}
                                    alt="Logo"
                                    className="w-16 h-16 mx-auto mb-2 rounded-full object-cover border-2"
                                    style={{ borderColor: accentColor }}
                                />
                            )}
                            {config.companyName && (
                                <p className="text-sm opacity-70" style={{ color: textColor }}>{config.companyName}</p>
                            )}
                        </div>
                    )}

                    {/* Order Items Section */}
                    {config.showItemDetails !== false && (
                        <div className="rounded-2xl p-4 mb-4 border border-slate-700/50" style={{ backgroundColor: cardBackgroundColor }}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <ShoppingCart className="w-5 h-5" style={{ color: accentColor }} />
                                    <h2 className="font-bold text-lg" style={{ color: textColor }}>
                                        {config.headerText || '🛒 Your Order Summary'}
                                    </h2>
                                </div>
                                <span
                                    className="px-3 py-1 text-sm font-medium rounded-full border"
                                    style={{ backgroundColor: `${accentColor}20`, color: accentColor, borderColor: `${accentColor}30` }}
                                >
                                    {sampleCart.length} items
                                </span>
                            </div>

                            <div className="space-y-3">
                                {sampleCart.map((item, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 p-3 rounded-xl border"
                                        style={{ backgroundColor: `${textColor}05`, borderColor: `${textColor}10` }}
                                    >
                                        <div
                                            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{ backgroundColor: `${accentColor}20` }}
                                        >
                                            <Package className="w-6 h-6" style={{ color: accentColor }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-sm truncate" style={{ color: textColor }}>{item.productName}</h3>
                                            <p className="text-xs opacity-60" style={{ color: textColor }}>Qty: {item.quantity || 1}</p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <p className="font-bold" style={{ color: accentColor }}>
                                                ₱{(item.productPrice * (item.quantity || 1)).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Subtotal & Total */}
                    {config.showTotal !== false && (
                        <div className="rounded-2xl p-4 mb-4 border border-slate-700/50" style={{ backgroundColor: cardBackgroundColor }}>
                            <div className="space-y-3">
                                <div className="flex justify-between" style={{ color: textColor }}>
                                    <span className="opacity-70">Subtotal</span>
                                    <span>₱{subtotal.toLocaleString()}</span>
                                </div>
                                {config.showShipping && (
                                    <div className="flex justify-between" style={{ color: textColor }}>
                                        <span className="opacity-70 flex items-center gap-1"><Truck className="w-4 h-4" /> Shipping</span>
                                        <span className={shipping === 0 ? 'text-emerald-400' : ''}>
                                            {shipping > 0 ? `₱${shipping.toLocaleString()}` : 'FREE'}
                                        </span>
                                    </div>
                                )}
                                <div className="border-t pt-3" style={{ borderColor: `${textColor}20` }}>
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-lg" style={{ color: textColor }}>Total</span>
                                        <span className="font-bold text-xl" style={{ color: accentColor }}>₱{total.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Information Section */}
                    <div className="rounded-2xl p-4 mb-4 border border-slate-700/50" style={{ backgroundColor: cardBackgroundColor }}>
                        <div className="flex items-center gap-2 mb-4">
                            <User className="w-5 h-5" style={{ color: accentColor }} />
                            <h2 className="font-bold" style={{ color: textColor }}>Information</h2>
                        </div>

                        <div className="space-y-3">
                            {showName && (
                                <div>
                                    <label className="text-xs mb-1 block" style={{ color: `${textColor}80` }}>
                                        {getLabel('name', 'Full Name')} {isRequired('name', config.requireName !== false) && <span className="text-red-400">*</span>}
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${textColor}40` }} />
                                        <input
                                            type="text"
                                            value={shippingForm.name}
                                            onChange={(e) => setShippingForm(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Juan Dela Cruz"
                                            className="w-full rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2"
                                            style={{
                                                backgroundColor: `${textColor}10`,
                                                color: textColor,
                                                borderColor: `${textColor}20`
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {showPhone && (
                                <div>
                                    <label className="text-xs mb-1 block" style={{ color: `${textColor}80` }}>
                                        {getLabel('phone', 'Phone Number')} {isRequired('phone', config.requirePhone !== false) && <span className="text-red-400">*</span>}
                                    </label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${textColor}40` }} />
                                        <input
                                            type="tel"
                                            value={shippingForm.phone}
                                            onChange={(e) => setShippingForm(prev => ({ ...prev, phone: e.target.value }))}
                                            placeholder="09XX XXX XXXX"
                                            className="w-full rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2"
                                            style={{
                                                backgroundColor: `${textColor}10`,
                                                color: textColor,
                                                borderColor: `${textColor}20`
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {showEmail && (
                                <div>
                                    <label className="text-xs mb-1 block" style={{ color: `${textColor}80` }}>
                                        {getLabel('email', 'Email Address')} {isRequired('email', config.requireEmail === true) && <span className="text-red-400">*</span>}
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${textColor}40` }} />
                                        <input
                                            type="email"
                                            value={shippingForm.email}
                                            onChange={(e) => setShippingForm(prev => ({ ...prev, email: e.target.value }))}
                                            placeholder="you@example.com"
                                            className="w-full rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2"
                                            style={{
                                                backgroundColor: `${textColor}10`,
                                                color: textColor,
                                                borderColor: `${textColor}20`
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Full Address */}
                            {showFullAddress && (
                                <div>
                                    <label className="text-xs mb-1 block" style={{ color: `${textColor}80` }}>
                                        {getLabel('fullAddress', 'Complete Address')} {isRequired('fullAddress', config.requireAddress !== false) && <span className="text-red-400">*</span>}
                                    </label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 w-4 h-4" style={{ color: `${textColor}40` }} />
                                        <textarea
                                            value={shippingForm.address}
                                            onChange={(e) => setShippingForm(prev => ({ ...prev, address: e.target.value }))}
                                            placeholder="House/Unit No., Street, Barangay, City, Province"
                                            rows={3}
                                            className="w-full rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 resize-none"
                                            style={{
                                                backgroundColor: `${textColor}10`,
                                                color: textColor,
                                                borderColor: `${textColor}20`
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Split Address Fields */}
                            {showStreet && (
                                <div>
                                    <label className="text-xs mb-1 block" style={{ color: `${textColor}80` }}>
                                        {getLabel('street', 'Street Address')} {isRequired('street') && <span className="text-red-400">*</span>}
                                    </label>
                                    <div className="relative">
                                        <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${textColor}40` }} />
                                        <input
                                            type="text"
                                            value={shippingForm.street}
                                            onChange={(e) => setShippingForm(prev => ({ ...prev, street: e.target.value }))}
                                            placeholder="123 Street..."
                                            className="w-full rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2"
                                            style={{
                                                backgroundColor: `${textColor}10`,
                                                color: textColor,
                                                borderColor: `${textColor}20`
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                {showCity && (
                                    <div>
                                        <label className="text-xs mb-1 block" style={{ color: `${textColor}80` }}>
                                            {getLabel('city', 'City')} {isRequired('city') && <span className="text-red-400">*</span>}
                                        </label>
                                        <div className="relative">
                                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${textColor}40` }} />
                                            <input
                                                type="text"
                                                value={shippingForm.city}
                                                onChange={(e) => setShippingForm(prev => ({ ...prev, city: e.target.value }))}
                                                placeholder="City"
                                                className="w-full rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2"
                                                style={{
                                                    backgroundColor: `${textColor}10`,
                                                    color: textColor,
                                                    borderColor: `${textColor}20`
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                                {showProvince && (
                                    <div>
                                        <label className="text-xs mb-1 block" style={{ color: `${textColor}80` }}>
                                            {getLabel('province', 'Province')} {isRequired('province') && <span className="text-red-400">*</span>}
                                        </label>
                                        <div className="relative">
                                            <Map className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${textColor}40` }} />
                                            <input
                                                type="text"
                                                value={shippingForm.province}
                                                onChange={(e) => setShippingForm(prev => ({ ...prev, province: e.target.value }))}
                                                placeholder="Province"
                                                className="w-full rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2"
                                                style={{
                                                    backgroundColor: `${textColor}10`,
                                                    color: textColor,
                                                    borderColor: `${textColor}20`
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {showZip && (
                                <div>
                                    <label className="text-xs mb-1 block" style={{ color: `${textColor}80` }}>
                                        {getLabel('zipCode', 'ZIP Code')} {isRequired('zipCode') && <span className="text-red-400">*</span>}
                                    </label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: `${textColor}40` }} />
                                        <input
                                            type="text"
                                            value={shippingForm.zipCode}
                                            onChange={(e) => setShippingForm(prev => ({ ...prev, zipCode: e.target.value }))}
                                            placeholder="ZIP Code"
                                            className="w-full rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2"
                                            style={{
                                                backgroundColor: `${textColor}10`,
                                                color: textColor,
                                                borderColor: `${textColor}20`
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {showNotes && (
                                <div>
                                    <label className="text-xs mb-1 block" style={{ color: `${textColor}80` }}>
                                        {getLabel('notes', 'Order Notes')} {isRequired('notes') && <span className="text-red-400">*</span>}
                                    </label>
                                    <div className="relative">
                                        <ClipboardList className="absolute left-3 top-3 w-4 h-4" style={{ color: `${textColor}40` }} />
                                        <textarea
                                            value={shippingForm.notes}
                                            onChange={(e) => setShippingForm(prev => ({ ...prev, notes: e.target.value }))}
                                            placeholder="Additional instructions..."
                                            rows={2}
                                            className="w-full rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 resize-none"
                                            style={{
                                                backgroundColor: `${textColor}10`,
                                                color: textColor,
                                                borderColor: `${textColor}20`
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="rounded-2xl p-4 border border-slate-700/50" style={{ backgroundColor: cardBackgroundColor }}>
                        <div className="flex items-center gap-2 mb-4">
                            <Wallet className="w-5 h-5" style={{ color: accentColor }} />
                            <h2 className="font-bold" style={{ color: textColor }}>Payment Method</h2>
                        </div>

                        <div className="space-y-2">
                            {paymentMethods.map((method) => (
                                <button
                                    key={method.id}
                                    onClick={() => setSelectedPayment(method.id)}
                                    className="w-full p-3 rounded-xl border transition-all flex items-center gap-3 text-left"
                                    style={{
                                        backgroundColor: selectedPayment === method.id ? `${accentColor}20` : `${textColor}05`,
                                        borderColor: selectedPayment === method.id ? accentColor : `${textColor}20`
                                    }}
                                >
                                    <span className="text-2xl">{method.icon}</span>
                                    <div className="flex-1">
                                        <p className="font-medium" style={{ color: textColor }}>{method.name}</p>
                                        {method.description && (
                                            <p className="text-xs opacity-60" style={{ color: textColor }}>{method.description}</p>
                                        )}
                                    </div>
                                    <div
                                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                                        style={{ borderColor: selectedPayment === method.id ? accentColor : `${textColor}40` }}
                                    >
                                        {selectedPayment === method.id && (
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: accentColor }} />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Fixed Bottom Button */}
                <div className="flex-shrink-0 p-4 border-t" style={{ backgroundColor, borderColor: `${textColor}10` }}>
                    <button
                        className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl transition-transform hover:scale-[1.02]"
                        style={{ backgroundColor: buttonColor, color: '#ffffff' }}
                        onClick={() => alert('This is a preview! In the actual checkout, this would confirm the order.')}
                    >
                        <CreditCard className="w-5 h-5" />
                        {config.buttonText || '✅ Confirm Order'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPreview;
