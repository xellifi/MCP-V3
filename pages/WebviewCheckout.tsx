import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart, Check, Package, Sparkles, User, ChevronRight } from 'lucide-react';

interface CartItem {
    productName: string;
    productPrice: number;
    productImage?: string;
    quantity: number;
    isUpsell?: boolean;
    isDownsell?: boolean;
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
}

interface SessionData {
    cart: CartItem[];
    cartTotal: number;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    formData?: any;
    config: CheckoutConfig;
}

const API_BASE = '';

const WebviewCheckout: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [session, setSession] = useState<SessionData | null>(null);
    const [processing, setProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [countdown, setCountdown] = useState(3);

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
                data.session.metadata?.customerName ||
                'Valued Customer';

            const customerEmail = data.session.metadata?.formData?.email ||
                data.session.metadata?.email || '';

            const customerPhone = data.session.metadata?.formData?.phone ||
                data.session.metadata?.phone || '';

            const sessionData: SessionData = {
                cart: data.session.cart || [],
                cartTotal: data.session.cart_total || 0,
                customerName: customerName,
                customerEmail: customerEmail,
                customerPhone: customerPhone,
                formData: data.session.form_data || {},
                config: data.session.page_config || {}
            };

            setSession(sessionData);
        } catch (err: any) {
            setError(err.message || 'Failed to load checkout');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmOrder = async () => {
        if (processing || !session) return;
        setProcessing(true);

        try {
            await fetch(`${API_BASE}/api/webview?route=action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    action: 'checkout_confirm',
                    payload: {
                        cart: session.cart,
                        cartTotal: calculateTotal(),
                        customerName: session.customerName,
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

    // Loading Screen - Full screen gradient
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

    // Error Screen - Full screen gradient
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
    const accentColor = config.accentColor || config.headerColor || '#10b981';
    const buttonColor = config.buttonColor || '#10b981';
    const subtotal = calculateSubtotal();
    const shipping = config.showShipping ? (config.shippingFee || 0) : 0;
    const total = subtotal + shipping;

    // Success Screen - Full screen gradient
    if (showSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 flex items-center justify-center p-6 overflow-hidden relative">
                {/* Animated background circles */}
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

    // Main Checkout - Invoice Style Layout
    return (
        <div className="min-h-screen bg-slate-900 flex flex-col">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-auto p-4 pb-24">
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
                                    {/* Product Icon/Image */}
                                    <div className="w-12 h-12 rounded-lg bg-slate-600/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {item.productImage ? (
                                            <img
                                                src={item.productImage}
                                                alt={item.productName}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Package className="w-6 h-6 text-emerald-400" />
                                        )}
                                    </div>

                                    {/* Product Details */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-medium text-sm truncate">
                                            {item.productName}
                                        </h3>
                                        <p className="text-slate-400 text-xs">
                                            Qty: {item.quantity || 1}
                                        </p>
                                    </div>

                                    {/* Price */}
                                    <div className="flex-shrink-0">
                                        <p className="text-emerald-400 font-bold">
                                            ₱{(item.productPrice * (item.quantity || 1)).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Subtotal & Total Section */}
                {session.cart.length > 0 && (
                    <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 border border-slate-700/50">
                        <div className="space-y-3">
                            <div className="flex justify-between text-slate-300">
                                <span>Subtotal</span>
                                <span>₱{subtotal.toLocaleString()}</span>
                            </div>

                            {config.showShipping && (
                                <div className="flex justify-between text-slate-300">
                                    <span>Shipping</span>
                                    <span className={shipping === 0 ? 'text-emerald-400' : ''}>
                                        {shipping > 0 ? `₱${shipping.toLocaleString()}` : 'FREE'}
                                    </span>
                                </div>
                            )}

                            <div className="border-t border-slate-600/50 pt-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-white font-bold text-lg">Total</span>
                                    <span className="text-emerald-400 font-bold text-xl">
                                        ₱{total.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Customer Section */}
                <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-3">
                        <User className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-white font-bold">Customer</h2>
                    </div>
                    <div className="space-y-1">
                        <p className="text-white font-medium">{session.customerName}</p>
                        {session.customerEmail && (
                            <p className="text-slate-400 text-sm">{session.customerEmail}</p>
                        )}
                        {session.customerPhone && (
                            <p className="text-slate-400 text-sm">{session.customerPhone}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Fixed Bottom Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50">
                <button
                    onClick={handleConfirmOrder}
                    disabled={processing || session.cart.length === 0}
                    className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                        backgroundColor: buttonColor,
                        color: config.buttonTextColor || '#ffffff'
                    }}
                >
                    {processing ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <Check className="w-5 h-5" />
                            {config.buttonText || 'Confirm Order'}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default WebviewCheckout;
