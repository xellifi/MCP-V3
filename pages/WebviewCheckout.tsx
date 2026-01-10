import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart, Check, Package, User, MapPin, Phone, Mail, CreditCard, Truck, Wallet } from 'lucide-react';

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

interface CheckoutConfig {
    companyName?: string;
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
    // Shipping form config
    showNameField?: boolean;
    showPhoneField?: boolean;
    showEmailField?: boolean;
    showAddressField?: boolean;
    requireName?: boolean;
    requirePhone?: boolean;
    requireEmail?: boolean;
    requireAddress?: boolean;
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
    config: CheckoutConfig;
}

interface ShippingForm {
    name: string;
    phone: string;
    email: string;
    address: string;
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
        address: ''
    });
    const [selectedPayment, setSelectedPayment] = useState<string>('cod');
    const [formErrors, setFormErrors] = useState<Partial<ShippingForm>>({});

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
                address: customerAddress
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
        const errors: Partial<ShippingForm> = {};

        // Default: require name and phone if fields are shown (or config doesn't exist yet)
        const showName = config.showNameField !== false;
        const showPhone = config.showPhoneField !== false;
        const showEmail = config.showEmailField === true;
        const showAddress = config.showAddressField !== false;

        const requireName = config.requireName !== false && showName;
        const requirePhone = config.requirePhone !== false && showPhone;
        const requireEmail = config.requireEmail === true && showEmail;
        const requireAddress = config.requireAddress !== false && showAddress;

        if (requireName && !shippingForm.name.trim()) {
            errors.name = 'Name is required';
        }
        if (requirePhone && !shippingForm.phone.trim()) {
            errors.phone = 'Phone is required';
        }
        if (requireEmail && !shippingForm.email.trim()) {
            errors.email = 'Email is required';
        } else if (showEmail && shippingForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingForm.email)) {
            errors.email = 'Invalid email format';
        }
        if (requireAddress && !shippingForm.address.trim()) {
            errors.address = 'Address is required';
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
                        customerAddress: shippingForm.address,
                        // Payment info
                        paymentMethod: selectedPayment,
                        paymentMethodName: selectedPaymentMethod?.name || selectedPayment,
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
    const showName = config.showNameField !== false;
    const showPhone = config.showPhoneField !== false;
    const showEmail = config.showEmailField === true;
    const showAddress = config.showAddressField !== false;

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
        <div className="min-h-screen bg-slate-900 flex flex-col">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-auto p-4 pb-28">
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
                        <h2 className="text-white font-bold">Shipping Information</h2>
                    </div>

                    <div className="space-y-3">
                        {showName && (
                            <div>
                                <label className="text-slate-400 text-xs mb-1 block">Full Name</label>
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
                                <label className="text-slate-400 text-xs mb-1 block">Phone Number</label>
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
                                <label className="text-slate-400 text-xs mb-1 block">Email Address</label>
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

                        {showAddress && (
                            <div>
                                <label className="text-slate-400 text-xs mb-1 block">Complete Address</label>
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
                </div>
            </div>

            {/* Fixed Bottom Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50">
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
    );
};

export default WebviewCheckout;
