import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart, Check, Package, Sparkles, Truck, CreditCard, ChevronRight } from 'lucide-react';

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

            const sessionData: SessionData = {
                cart: data.session.cart || [],
                cartTotal: data.session.cart_total || 0,
                customerName: customerName,
                formData: data.session.form_data || {},
                config: data.session.page_config || {}
            };

            console.log('[WebviewCheckout] Loaded session:', {
                cartItems: sessionData.cart.length,
                cartTotal: sessionData.cartTotal,
                customerName: sessionData.customerName
            });

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

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-full max-w-md mx-auto bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 rounded-2xl shadow-2xl p-8">
                    <div className="text-center">
                        <div className="relative mx-auto w-fit">
                            <div className="w-20 h-20 border-4 border-white/20 rounded-full"></div>
                            <div className="absolute inset-0 w-20 h-20 border-4 border-t-emerald-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="text-white/70 mt-4 text-sm font-medium">Loading your order...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="w-full max-w-md mx-auto bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 rounded-2xl shadow-2xl p-8">
                    <div className="text-center bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
                        <div className="text-6xl mb-4">😕</div>
                        <h1 className="text-xl font-bold text-white mb-2">Oops!</h1>
                        <p className="text-white/70">{error}</p>
                    </div>
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

    // Success Screen
    if (showSuccess) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="w-full max-w-md mx-auto bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 rounded-2xl shadow-2xl p-8 overflow-hidden relative">
                    {/* Animated background circles */}
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/10 rounded-full animate-pulse"></div>
                        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-white/10 rounded-full animate-pulse delay-500"></div>
                    </div>

                    <div className="relative animate-bounce-in text-center z-10 py-8">
                        {/* Success checkmark with ring animation */}
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

                        {/* Countdown */}
                        <div className="bg-white/20 backdrop-blur-xl rounded-2xl px-6 py-3 inline-block">
                            <p className="text-white/90 text-sm">
                                Returning in <span className="font-bold text-white text-lg">{countdown}</span>s...
                            </p>
                        </div>
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
                    .delay-500 { animation-delay: 0.5s; }
                `}</style>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            {/* Main Container */}
            <div className="w-full max-w-md mx-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
                {/* Premium Header */}
                <div
                    className="py-4 px-4 md:py-5 md:px-6 text-center relative overflow-hidden flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)` }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10"></div>
                    <div className="relative">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 text-white" />
                            <h1 className="text-base md:text-xl font-bold text-white">
                                {config.headerText || 'Your Order Summary'}
                            </h1>
                        </div>
                        {config.companyName && (
                            <p className="text-white/80 text-xs md:text-sm">{config.companyName}</p>
                        )}
                    </div>
                </div>

                {/* Customer Info */}
                <div className="px-4 py-2 md:py-3 bg-gradient-to-r from-white/5 to-white/10 border-b border-white/10 flex items-center gap-3 flex-shrink-0">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm md:text-lg flex-shrink-0">
                        {session.customerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <p className="text-white font-medium text-sm md:text-base truncate">{session.customerName}</p>
                        <p className="text-slate-400 text-xs">Customer</p>
                    </div>
                </div>

                {/* Cart Items - Scrollable */}
                <div className="flex-1 overflow-auto p-3 md:p-4">
                    <div className="mb-2 md:mb-3">
                        <p className="text-slate-400 text-xs md:text-sm flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            {session.cart.length} item{session.cart.length !== 1 ? 's' : ''} in your order
                        </p>
                    </div>

                    <div className="space-y-2 md:space-y-3">
                        {session.cart.length === 0 ? (
                            <div className="bg-white/5 rounded-xl md:rounded-2xl p-6 md:p-8 text-center border border-white/10">
                                <Package className="w-12 h-12 md:w-16 md:h-16 text-slate-500 mx-auto mb-4" />
                                <p className="text-slate-400 text-sm">Your cart is empty</p>
                            </div>
                        ) : (
                            session.cart.map((item, index) => (
                                <div
                                    key={index}
                                    className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-xl md:rounded-2xl p-3 md:p-4 flex items-center gap-3 md:gap-4 border border-white/10 hover:border-white/20 transition-all"
                                >
                                    {/* Product Image */}
                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg md:rounded-xl overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 flex-shrink-0 relative shadow-lg">
                                        {item.productImage ? (
                                            <img
                                                src={item.productImage}
                                                alt={item.productName}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-slate-500" />
                                            </div>
                                        )}
                                        {/* Upsell/Downsell Badge */}
                                        {(item.isUpsell || item.isDownsell) && (
                                            <div className="absolute -top-1 -right-1 px-1.5 md:px-2 py-0.5 bg-amber-500 text-white text-[8px] md:text-[10px] font-bold rounded-full shadow-lg">
                                                {item.isUpsell ? '⭐' : '🎁'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Product Details */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-semibold text-sm md:text-base truncate">
                                            {item.productName}
                                        </h3>
                                        <p className="text-slate-400 text-xs md:text-sm mt-0.5 md:mt-1">
                                            Qty: {item.quantity || 1}
                                        </p>
                                    </div>

                                    {/* Price */}
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-emerald-400 font-bold text-sm md:text-lg">
                                            ₱{(item.productPrice * (item.quantity || 1)).toLocaleString()}
                                        </p>
                                        {(item.quantity || 1) > 1 && (
                                            <p className="text-slate-500 text-[10px] md:text-xs">
                                                ₱{item.productPrice.toLocaleString()} each
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Order Summary Card */}
                    {session.cart.length > 0 && (
                        <div className="mt-4 md:mt-6 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-5 border border-white/10">
                            <h3 className="text-white font-semibold mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
                                <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                                Payment Summary
                            </h3>

                            <div className="space-y-2 md:space-y-3">
                                <div className="flex justify-between text-slate-300 text-xs md:text-sm">
                                    <span>Subtotal</span>
                                    <span>₱{subtotal.toLocaleString()}</span>
                                </div>

                                {config.showShipping && (
                                    <div className="flex justify-between text-slate-300 text-xs md:text-sm">
                                        <span className="flex items-center gap-1 md:gap-2">
                                            <Truck className="w-3 h-3 md:w-4 md:h-4" />
                                            Shipping
                                        </span>
                                        <span className={shipping === 0 ? 'text-emerald-400 font-medium' : ''}>
                                            {shipping > 0 ? `₱${shipping.toLocaleString()}` : 'FREE'}
                                        </span>
                                    </div>
                                )}

                                <div className="border-t border-white/10 pt-2 md:pt-3 mt-2 md:mt-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-white font-bold text-sm md:text-lg">Total</span>
                                        <span
                                            className="font-bold text-lg md:text-2xl"
                                            style={{ color: accentColor }}
                                        >
                                            ₱{total.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Confirm Button */}
                <div className="p-3 md:p-4 bg-slate-900/80 backdrop-blur-xl border-t border-white/10 flex-shrink-0">
                    <button
                        onClick={handleConfirmOrder}
                        disabled={processing || session.cart.length === 0}
                        className="w-full py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-sm md:text-lg flex items-center justify-center gap-2 md:gap-3 shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                        style={{
                            background: `linear-gradient(135deg, ${buttonColor}, ${buttonColor}cc)`,
                            color: config.buttonTextColor || '#ffffff'
                        }}
                    >
                        {/* Button glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>

                        {processing ? (
                            <div className="w-5 h-5 md:w-6 md:h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <Check className="w-5 h-5 md:w-6 md:h-6" />
                                {config.buttonText || 'Confirm Order'}
                                <ChevronRight className="w-4 h-4 md:w-5 md:h-5 opacity-70" />
                            </>
                        )}
                    </button>
                    <p className="text-center text-slate-500 text-[10px] md:text-xs mt-2 md:mt-3">
                        By confirming, you agree to proceed with this order
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WebviewCheckout;
