import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart, Check, Package, User, MapPin, Phone, Mail, CreditCard, Truck, Wallet, Home, Building, Map, Hash, ClipboardList } from 'lucide-react';

interface CartItem {
    productName: string;
    productPrice: number;
    productImage?: string;
    quantity: number;
    isUpsell?: boolean;
    isDownsell?: boolean;
}

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
    companyName?: string;
    companyLogo?: string;
    headerText?: string;
    buttonText?: string;
    backgroundColor?: string;
    headerColor?: string;
    buttonColor?: string;
    buttonTextColor?: string;
    showShipping?: boolean;
    shippingFee?: number;
    showThankYou?: boolean;
    thankYouMessage?: string;
    successMessage?: string;
    accentColor?: string;
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
    // Payment methods
    paymentMethods?: PaymentMethod[];
}

interface SessionData {
    cart: CartItem[];
    cartTotal: number;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAddress?: string;
    formData?: any;
    metadata?: any;
    config: CheckoutConfig;
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

const API_BASE = '';

const WebviewCheckout: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [session, setSession] = useState<SessionData | null>(null);
    const [processing, setProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [countdown, setCountdown] = useState(3);

    // Shipping form state
    const [shippingForm, setShippingForm] = useState<ShippingForm>({
        name: '',
        phone: '',
        email: '',
        address: '',
        street: '',
        city: '',
        province: '',
        zipCode: '',
        notes: ''
    });
    const [selectedPayment, setSelectedPayment] = useState<string>('cod');
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [paymentProofPreview, setPaymentProofPreview] = useState<string>('');
    const [formErrors, setFormErrors] = useState<Partial<ShippingForm & { paymentProof?: string }>>({});

    useEffect(() => {
        loadSession();
    }, [sessionId]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (showSuccess && countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        } else if (showSuccess && countdown === 0) {
            continueAndClose();
        }
        return () => clearTimeout(timer);
    }, [showSuccess, countdown]);

    const loadSession = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/webview?route=session&id=${sessionId}`);
            const data = await response.json();

            if (data.error) {
                setError(data.error);
                return;
            }

            const customerName = data.session.customer_name ||
                data.session.metadata?.commenterName ||
                data.session.metadata?.customerName || '';

            const customerEmail = data.session.metadata?.formData?.email ||
                data.session.metadata?.email || '';

            const customerPhone = data.session.metadata?.formData?.phone ||
                data.session.metadata?.phone || '';

            const customerAddress = data.session.metadata?.formData?.address ||
                data.session.metadata?.address || '';

            const sessionData: SessionData = {
                cart: data.session.cart || [],
                cartTotal: data.session.cart_total || 0,
                customerName: customerName,
                customerEmail: customerEmail,
                customerPhone: customerPhone,
                customerAddress: customerAddress,
                formData: data.session.form_data || {},
                config: data.session.page_config || {}
            };

            // Pre-fill shipping form with existing data
            setShippingForm({
                name: customerName,
                phone: customerPhone,
                email: customerEmail,
                address: customerAddress,
                street: '',
                city: '',
                province: '',
                zipCode: '',
                notes: ''
            });

            setSession(sessionData);
        } catch (err: any) {
            setError(err.message || 'Failed to load checkout');
        } finally {
            setLoading(false);
        }
    };

    const validateForm = (): boolean => {
        if (!session) return false;

        const config = session.config;
        const fields = config.customerFields;
        const errors: Partial<ShippingForm> = {};

        // Helper to check requirements
        const isRequired = (key: keyof typeof fields, legacyReq?: boolean, legacyFlag?: boolean) => {
            if (fields && fields[key]) return fields[key]!.required && fields[key]!.enabled;
            if (typeof legacyReq !== 'undefined' && typeof legacyFlag !== 'undefined') return legacyReq && legacyFlag;
            return false;
        };

        const requireName = isRequired('name', config.requireName !== false, config.showNameField !== false);
        const requirePhone = isRequired('phone', config.requirePhone !== false, config.showPhoneField !== false);
        const requireEmail = isRequired('email', config.requireEmail === true, config.showEmailField === true);

        // Address logic
        const useFullAddress = config.useFullAddress ?? true;
        const requireFullAddress = isRequired('fullAddress', config.requireAddress !== false, config.showAddressField !== false);

        const requireStreet = fields?.street?.enabled && fields.street.required;
        const requireCity = fields?.city?.enabled && fields.city.required;
        const requireProvince = fields?.province?.enabled && fields.province.required;
        const requireZip = fields?.zipCode?.enabled && fields.zipCode.required;

        if (requireName && !shippingForm.name.trim()) errors.name = 'Name is required';
        if (requirePhone && !shippingForm.phone.trim()) errors.phone = 'Phone is required';

        if (requireEmail && !shippingForm.email.trim()) {
            errors.email = 'Email is required';
        } else if (shippingForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingForm.email)) {
            errors.email = 'Invalid email format';
        }

        if (useFullAddress) {
            if (requireFullAddress && !shippingForm.address.trim()) errors.address = 'Address is required';
        } else {
            if (requireStreet && !shippingForm.street.trim()) errors.street = 'Street is required';
            if (requireCity && !shippingForm.city.trim()) errors.city = 'City is required';
            if (requireProvince && !shippingForm.province.trim()) errors.province = 'Province is required';
            if (requireZip && !shippingForm.zipCode.trim()) errors.zipCode = 'ZIP Code is required';
        }

        // Notes
        if (fields?.notes?.enabled && fields.notes.required && !shippingForm.notes.trim()) {
            errors.notes = 'Notes are required';
        }

        // Payment proof validation for GCash and Bank Transfer
        if ((selectedPayment === 'gcash' || selectedPayment === 'bank') && !paymentProof) {
            (errors as any).paymentProof = 'Proof of payment is required';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleConfirmOrder = async () => {
        if (processing || !session) return;

        if (!validateForm()) {
            return;
        }

        setProcessing(true);

        try {
            const paymentMethods = session.config.paymentMethods || DEFAULT_PAYMENT_METHODS;
            const selectedPaymentMethod = paymentMethods.find(p => p.id === selectedPayment);

            // Construct address
            let finalAddress = shippingForm.address;
            const useFullAddress = session.config.useFullAddress ?? true;

            if (!useFullAddress) {
                // Combine split fields
                const parts = [
                    shippingForm.street,
                    shippingForm.city,
                    shippingForm.province,
                    shippingForm.zipCode
                ].filter(Boolean);
                finalAddress = parts.join(', ');
            }

            // Convert payment proof to base64 if exists
            let paymentProofUrl = '';
            if (paymentProof) {
                paymentProofUrl = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(paymentProof);
                });
            }

            await fetch(`${API_BASE}/api/webview?route=action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    action: 'checkout_confirm',
                    payload: {
                        cart: session.cart,
                        cartTotal: calculateTotal(),
                        // Shipping info
                        customerName: shippingForm.name,
                        customerPhone: shippingForm.phone,
                        customerEmail: shippingForm.email,
                        customerAddress: finalAddress,
                        addressDetails: !useFullAddress ? {
                            street: shippingForm.street,
                            city: shippingForm.city,
                            province: shippingForm.province,
                            zipCode: shippingForm.zipCode
                        } : undefined,
                        notes: shippingForm.notes,
                        // Payment info
                        paymentMethod: selectedPayment,
                        paymentMethodName: selectedPaymentMethod?.name || selectedPayment,
                        paymentProof: paymentProofUrl,
                        paymentProofFileName: paymentProof?.name,
                        // Promo code
                        promoCode: session.metadata?.promoCode || '',
                        discount: session.metadata?.discount || 0,
                        // Meta
                        shippingFee: session.config.showShipping ? (session.config.shippingFee || 0) : 0,
                        confirmedAt: new Date().toISOString()
                    }
                })
            });

            setShowSuccess(true);
        } catch (err) {
            console.error('Error confirming order:', err);
            setProcessing(false);
        }
    };

    const continueAndClose = async () => {
        try {
            await fetch(`${API_BASE}/api/webview?route=continue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, closeReason: 'checkout_complete' })
            });

            if ((window as any).MessengerExtensions) {
                (window as any).MessengerExtensions.requestCloseBrowser(
                    () => console.log('Webview closed'),
                    (err: any) => console.error('Error closing:', err)
                );
            } else {
                window.close();
            }
        } catch (err) {
            console.error('Error continuing flow:', err);
        }
    };

    const calculateSubtotal = () => {
        if (!session) return 0;
        return session.cart.reduce((sum, item) => sum + (item.productPrice * (item.quantity || 1)), 0);
    };

    const calculateTotal = () => {
        if (!session) return 0;
        const subtotal = calculateSubtotal();
        const shipping = session.config.showShipping ? (session.config.shippingFee || 0) : 0;
        return subtotal + shipping;
    };

    const handlePaymentProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setFormErrors(prev => ({ ...prev, paymentProof: 'Please upload an image file' }));
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setFormErrors(prev => ({ ...prev, paymentProof: 'File size must be less than 5MB' }));
                return;
            }

            setPaymentProof(file);
            setFormErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.paymentProof;
                return newErrors;
            });

            // Generate preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPaymentProofPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleInputChange = (field: keyof ShippingForm, value: string) => {
        setShippingForm(prev => ({ ...prev, [field]: value }));
        // Clear error when user types
        if (formErrors[field]) {
            setFormErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    // Loading Screen
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative mx-auto w-fit">
                        <div className="w-20 h-20 border-4 border-white/20 rounded-full"></div>
                        <div className="absolute inset-0 w-20 h-20 border-4 border-t-emerald-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-white/70 mt-6 text-base font-medium">Loading your order...</p>
                </div>
            </div>
        );
    }

    // Error Screen
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-4">
                <div className="text-center bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
                    <div className="text-6xl mb-4">😕</div>
                    <h1 className="text-xl font-bold text-white mb-2">Oops!</h1>
                    <p className="text-white/70">{error}</p>
                </div>
            </div>
        );
    }

    if (!session) return null;

    const config = session.config;
    const buttonColor = config.buttonColor || '#10b981';
    const subtotal = calculateSubtotal();
    const shipping = config.showShipping ? (config.shippingFee || 0) : 0;
    const total = subtotal + shipping;
    const paymentMethods = config.paymentMethods || DEFAULT_PAYMENT_METHODS;

    // Field visibility (default to showing name, phone, address)
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

    // Labels
    const getLabel = (key: keyof typeof fields, defaultLbl: string) => fields?.[key]?.label || defaultLbl;

    // Success Screen
    if (showSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 flex items-center justify-center p-6 overflow-hidden relative">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/10 rounded-full animate-pulse"></div>
                    <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-white/10 rounded-full animate-pulse"></div>
                </div>

                <div className="relative animate-bounce-in text-center z-10">
                    <div className="relative mb-8 mx-auto w-fit">
                        <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center mx-auto shadow-2xl">
                            <Check className="w-16 h-16 text-emerald-600" strokeWidth={3} />
                        </div>
                        <div className="absolute inset-0 w-28 h-28 mx-auto border-4 border-white/30 rounded-full animate-ping"></div>
                    </div>

                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
                        {config.successMessage || 'Order Confirmed! 🎉'}
                    </h1>
                    <p className="text-emerald-100 text-base md:text-lg mb-2">
                        {config.thankYouMessage || 'Thank you for your purchase!'}
                    </p>
                    <p className="text-emerald-100/80 text-sm mb-8">
                        We'll send you updates about your order.
                    </p>

                    <div className="bg-white/20 backdrop-blur-xl rounded-2xl px-6 py-3 inline-block">
                        <p className="text-white/90 text-sm">
                            Returning in <span className="font-bold text-white text-lg">{countdown}</span>s...
                        </p>
                    </div>
                </div>

                <style>{`
                    @keyframes bounce-in {
                        0% { transform: scale(0.3); opacity: 0; }
                        50% { transform: scale(1.05); }
                        70% { transform: scale(0.9); }
                        100% { transform: scale(1); opacity: 1; }
                    }
                    .animate-bounce-in { animation: bounce-in 0.6s ease-out; }
                `}</style>
            </div>
        );
    }


    // Main Checkout
    return (
        <div className="min-h-screen bg-slate-900 p-4">
            {/* Container */}
            <div className="w-full max-w-md mx-auto bg-slate-900 rounded-2xl shadow-2xl overflow-hidden relative">
                {/* Scrollable Content */}
                <div className="p-4 pb-24">
                    {/* Company Logo & Name Header */}
                    {(config.companyLogo || config.companyName || config.headerText) && (
                        <div className="text-center mb-4">
                            {config.companyLogo && (
                                <img
                                    src={config.companyLogo}
                                    alt="Company Logo"
                                    className="w-16 h-16 mx-auto mb-3 rounded-full object-cover border-2 border-emerald-400"
                                />
                            )}
                            {config.headerText && (
                                <h1 className="text-white font-bold text-xl mb-1">{config.headerText}</h1>
                            )}
                            {config.companyName && (
                                <p className="text-slate-400 text-sm">{config.companyName}</p>
                            )}
                        </div>
                    )}

                    {/* Order Items Section */}
                    <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 border border-slate-700/50">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-emerald-400" />
                                <h2 className="text-white font-bold text-lg">Order Items</h2>
                            </div>
                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm font-medium rounded-full border border-emerald-500/30">
                                {session.cart.length} item{session.cart.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {session.cart.length === 0 ? (
                            <div className="py-8 text-center">
                                <Package className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                                <p className="text-slate-400">Your cart is empty</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {session.cart.map((item, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl border border-slate-600/30"
                                    >
                                        <div className="w-12 h-12 rounded-lg bg-slate-600/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                            {item.productImage ? (
                                                <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                                            ) : (
                                                <Package className="w-6 h-6 text-emerald-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-white font-medium text-sm truncate">{item.productName}</h3>
                                            <p className="text-slate-400 text-xs">Qty: {item.quantity || 1}</p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <p className="text-emerald-400 font-bold">₱{(item.productPrice * (item.quantity || 1)).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Subtotal & Total */}
                    {session.cart.length > 0 && (
                        <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 border border-slate-700/50">
                            <div className="space-y-3">
                                <div className="flex justify-between text-slate-300">
                                    <span>Subtotal</span>
                                    <span>₱{subtotal.toLocaleString()}</span>
                                </div>
                                {config.showShipping && (
                                    <div className="flex justify-between text-slate-300">
                                        <span className="flex items-center gap-1"><Truck className="w-4 h-4" /> Shipping</span>
                                        <span className={shipping === 0 ? 'text-emerald-400' : ''}>
                                            {shipping > 0 ? `₱${shipping.toLocaleString()}` : 'FREE'}
                                        </span>
                                    </div>
                                )}
                                <div className="border-t border-slate-600/50 pt-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-white font-bold text-lg">Total</span>
                                        <span className="text-emerald-400 font-bold text-xl">₱{total.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Shipping Information */}
                    <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-4">
                            <User className="w-5 h-5 text-emerald-400" />
                            <h2 className="text-white font-bold">Information</h2>
                        </div>

                        <div className="space-y-3">
                            {showName && (
                                <div>
                                    <label className="text-slate-400 text-xs mb-1 block">{getLabel('name', 'Full Name')}</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type="text"
                                            value={shippingForm.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            placeholder="Juan Dela Cruz"
                                            className={`w-full bg-slate-700/50 border rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${formErrors.name ? 'border-red-500' : 'border-slate-600/50'}`}
                                        />
                                    </div>
                                    {formErrors.name && <p className="text-red-400 text-xs mt-1">{formErrors.name}</p>}
                                </div>
                            )}

                            {showPhone && (
                                <div>
                                    <label className="text-slate-400 text-xs mb-1 block">{getLabel('phone', 'Phone Number')}</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type="tel"
                                            value={shippingForm.phone}
                                            onChange={(e) => handleInputChange('phone', e.target.value)}
                                            placeholder="09XX XXX XXXX"
                                            className={`w-full bg-slate-700/50 border rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${formErrors.phone ? 'border-red-500' : 'border-slate-600/50'}`}
                                        />
                                    </div>
                                    {formErrors.phone && <p className="text-red-400 text-xs mt-1">{formErrors.phone}</p>}
                                </div>
                            )}

                            {showEmail && (
                                <div>
                                    <label className="text-slate-400 text-xs mb-1 block">{getLabel('email', 'Email Address')}</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type="email"
                                            value={shippingForm.email}
                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                            placeholder="you@example.com"
                                            className={`w-full bg-slate-700/50 border rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${formErrors.email ? 'border-red-500' : 'border-slate-600/50'}`}
                                        />
                                    </div>
                                    {formErrors.email && <p className="text-red-400 text-xs mt-1">{formErrors.email}</p>}
                                </div>
                            )}

                            {/* Full Address */}
                            {showFullAddress && (
                                <div>
                                    <label className="text-slate-400 text-xs mb-1 block">{getLabel('fullAddress', 'Complete Address')}</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                                        <textarea
                                            value={shippingForm.address}
                                            onChange={(e) => handleInputChange('address', e.target.value)}
                                            placeholder="House/Unit No., Street, Barangay, City, Province"
                                            rows={3}
                                            className={`w-full bg-slate-700/50 border rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none ${formErrors.address ? 'border-red-500' : 'border-slate-600/50'}`}
                                        />
                                    </div>
                                    {formErrors.address && <p className="text-red-400 text-xs mt-1">{formErrors.address}</p>}
                                </div>
                            )}

                            {/* Split Address Fields */}
                            {showStreet && (
                                <div>
                                    <label className="text-slate-400 text-xs mb-1 block">{getLabel('street', 'Street Address')}</label>
                                    <div className="relative">
                                        <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type="text"
                                            value={shippingForm.street}
                                            onChange={(e) => handleInputChange('street', e.target.value)}
                                            placeholder="House/Unit No., Street, Barangay"
                                            className={`w-full bg-slate-700/50 border rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${formErrors.street ? 'border-red-500' : 'border-slate-600/50'}`}
                                        />
                                    </div>
                                    {formErrors.street && <p className="text-red-400 text-xs mt-1">{formErrors.street}</p>}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                {showCity && (
                                    <div>
                                        <label className="text-slate-400 text-xs mb-1 block">{getLabel('city', 'City')}</label>
                                        <div className="relative">
                                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input
                                                type="text"
                                                value={shippingForm.city}
                                                onChange={(e) => handleInputChange('city', e.target.value)}
                                                placeholder="City"
                                                className={`w-full bg-slate-700/50 border rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${formErrors.city ? 'border-red-500' : 'border-slate-600/50'}`}
                                            />
                                        </div>
                                        {formErrors.city && <p className="text-red-400 text-xs mt-1">{formErrors.city}</p>}
                                    </div>
                                )}
                                {showProvince && (
                                    <div>
                                        <label className="text-slate-400 text-xs mb-1 block">{getLabel('province', 'Province')}</label>
                                        <div className="relative">
                                            <Map className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input
                                                type="text"
                                                value={shippingForm.province}
                                                onChange={(e) => handleInputChange('province', e.target.value)}
                                                placeholder="Province"
                                                className={`w-full bg-slate-700/50 border rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${formErrors.province ? 'border-red-500' : 'border-slate-600/50'}`}
                                            />
                                        </div>
                                        {formErrors.province && <p className="text-red-400 text-xs mt-1">{formErrors.province}</p>}
                                    </div>
                                )}
                            </div>

                            {showZip && (
                                <div>
                                    <label className="text-slate-400 text-xs mb-1 block">{getLabel('zipCode', 'ZIP Code')}</label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type="text"
                                            value={shippingForm.zipCode}
                                            onChange={(e) => handleInputChange('zipCode', e.target.value)}
                                            placeholder="ZIP Code"
                                            className={`w-full bg-slate-700/50 border rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${formErrors.zipCode ? 'border-red-500' : 'border-slate-600/50'}`}
                                        />
                                    </div>
                                    {formErrors.zipCode && <p className="text-red-400 text-xs mt-1">{formErrors.zipCode}</p>}
                                </div>
                            )}

                            {/* Notes Field */}
                            {showNotes && (
                                <div>
                                    <label className="text-slate-400 text-xs mb-1 block">{getLabel('notes', 'Order Notes')}</label>
                                    <div className="relative">
                                        <ClipboardList className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                                        <textarea
                                            value={shippingForm.notes}
                                            onChange={(e) => handleInputChange('notes', e.target.value)}
                                            placeholder="Special instructions..."
                                            rows={2}
                                            className={`w-full bg-slate-700/50 border rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none ${formErrors.notes ? 'border-red-500' : 'border-slate-600/50'}`}
                                        />
                                    </div>
                                    {formErrors.notes && <p className="text-red-400 text-xs mt-1">{formErrors.notes}</p>}
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-4">
                            <Wallet className="w-5 h-5 text-emerald-400" />
                            <h2 className="text-white font-bold">Payment Method</h2>
                        </div>

                        <div className="space-y-2">
                            {paymentMethods.map((method) => (
                                <label
                                    key={method.id}
                                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedPayment === method.id
                                        ? 'bg-emerald-500/20 border-emerald-500/50'
                                        : 'bg-slate-700/30 border-slate-600/30 hover:border-slate-500/50'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="payment"
                                        value={method.id}
                                        checked={selectedPayment === method.id}
                                        onChange={(e) => setSelectedPayment(e.target.value)}
                                        className="sr-only"
                                    />
                                    <span className="text-2xl">{method.icon}</span>
                                    <div className="flex-1">
                                        <p className={`font-medium ${selectedPayment === method.id ? 'text-emerald-400' : 'text-white'}`}>
                                            {method.name}
                                        </p>
                                        {method.description && (
                                            <p className="text-slate-400 text-xs">{method.description}</p>
                                        )}
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPayment === method.id ? 'border-emerald-400 bg-emerald-400' : 'border-slate-500'
                                        }`}>
                                        {selectedPayment === method.id && (
                                            <Check className="w-3 h-3 text-slate-900" />
                                        )}
                                    </div>
                                </label>
                            ))}
                        </div>

                        {/* Proof of Payment Upload for GCash & Bank Transfer */}
                        {(selectedPayment === 'gcash' || selectedPayment === 'bank') && (
                            <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                                <div className="flex items-start gap-2 mb-3">
                                    <Mail className="w-4 h-4 text-amber-400 mt-0.5" />
                                    <div>
                                        <p className="text-amber-400 text-sm font-medium">Proof of Payment Required</p>
                                        <p className="text-slate-400 text-xs mt-1">
                                            Please upload a screenshot or photo of your payment confirmation
                                        </p>
                                    </div>
                                </div>

                                {/* File Upload */}
                                <div className="mt-3">
                                    <label className="block">
                                        <div className={`border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all text-center ${formErrors.paymentProof
                                            ? 'border-red-500 bg-red-500/10'
                                            : paymentProof
                                                ? 'border-emerald-500 bg-emerald-500/10'
                                                : 'border-slate-600 bg-slate-700/30 hover:border-emerald-500/50'
                                            }`}>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handlePaymentProofUpload}
                                                className="hidden"
                                            />
                                            {paymentProofPreview ? (
                                                <div className="space-y-2">
                                                    <img
                                                        src={paymentProofPreview}
                                                        alt="Payment proof"
                                                        className="max-h-40 mx-auto rounded-lg border border-emerald-500"
                                                    />
                                                    <p className="text-emerald-400 text-xs font-medium">✓ File uploaded</p>
                                                    <p className="text-slate-400 text-xs">{paymentProof?.name}</p>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setPaymentProof(null);
                                                            setPaymentProofPreview('');
                                                        }}
                                                        className="text-xs text-red-400 hover:text-red-300 underline"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ) : (
                                                <div>
                                                    <Package className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                                    <p className="text-slate-300 text-sm font-medium">Click to upload</p>
                                                    <p className="text-slate-500 text-xs mt-1">PNG, JPG up to 5MB</p>
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                    {formErrors.paymentProof && (
                                        <p className="text-red-400 text-xs mt-2">⚠ {formErrors.paymentProof}</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sticky Bottom Button */}
                <div className="sticky bottom-0 p-4 bg-slate-900 border-t border-slate-700/50">
                    <button
                        onClick={handleConfirmOrder}
                        disabled={processing || session.cart.length === 0}
                        className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: buttonColor, color: config.buttonTextColor || '#ffffff' }}
                    >
                        {processing ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <CreditCard className="w-5 h-5" />
                                {config.buttonText || `Pay ₱${total.toLocaleString()}`}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WebviewCheckout;

