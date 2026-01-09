import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart, Check, Package, CreditCard, Sparkles, Truck } from 'lucide-react';

interface CartItem {
    productName: string;
    productPrice: number;
    productImage?: string;
    quantity: number;
}

interface CheckoutConfig {
    companyName: string;
    headerText: string;
    buttonText: string;
    backgroundColor: string;
    headerColor: string;
    buttonColor: string;
    buttonTextColor: string;
    showShipping: boolean;
    shippingFee: number;
    showThankYou: boolean;
    thankYouMessage: string;
    successMessage: string;
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

            // Extract cart and config from session
            const sessionData: SessionData = {
                cart: data.session.cart || [],
                cartTotal: data.session.cart_total || 0,
                customerName: data.session.customer_name || 'Valued Customer',
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

            // Show success screen
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

    const calculateTotal = () => {
        if (!session) return 0;
        const subtotal = session.cart.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);
        const shipping = session.config.showShipping ? (session.config.shippingFee || 0) : 0;
        return subtotal + shipping;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading your order...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="text-6xl mb-4">😕</div>
                    <h1 className="text-xl font-bold text-white mb-2">Oops!</h1>
                    <p className="text-slate-400">{error}</p>
                </div>
            </div>
        );
    }

    if (!session) return null;

    const config = session.config;
    const bgColor = config.backgroundColor || '#0f172a';
    const headerColor = config.headerColor || '#10b981';
    const buttonColor = config.buttonColor || '#10b981';
    const subtotal = session.cart.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);
    const shipping = config.showShipping ? (config.shippingFee || 0) : 0;
    const total = subtotal + shipping;

    // Success Screen
    if (showSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-600 to-emerald-800 flex flex-col items-center justify-center p-6">
                <div className="animate-bounce-in text-center">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                        <Check className="w-14 h-14 text-emerald-600" strokeWidth={3} />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-3">
                        {config.successMessage || 'Order Confirmed! 🎉'}
                    </h1>
                    <p className="text-emerald-100 text-lg mb-6">
                        {config.thankYouMessage || 'Thank you for your purchase!'}
                    </p>
                    <div className="text-white/80 text-sm">
                        Returning to Messenger in <span className="font-bold text-white">{countdown}</span>s...
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

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: bgColor }}>
            {/* Header */}
            <div
                className="py-4 px-6 text-center shadow-lg"
                style={{ backgroundColor: headerColor }}
            >
                <div className="flex items-center justify-center gap-2 mb-1">
                    <ShoppingCart className="w-6 h-6 text-white" />
                    <h1 className="text-xl font-bold text-white">
                        {config.headerText || 'Order Summary'}
                    </h1>
                </div>
                {config.companyName && (
                    <p className="text-emerald-100 text-sm">{config.companyName}</p>
                )}
            </div>

            {/* Customer Info */}
            <div className="px-4 py-3 bg-white/5 border-b border-white/10">
                <p className="text-slate-300 text-sm">
                    <span className="text-slate-500">Customer:</span> {session.customerName}
                </p>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-auto p-4">
                <div className="space-y-3">
                    {session.cart.map((item, index) => (
                        <div
                            key={index}
                            className="bg-white/10 rounded-xl p-4 flex items-center gap-4 backdrop-blur-sm"
                        >
                            {/* Product Image */}
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/20 flex-shrink-0">
                                {item.productImage ? (
                                    <img
                                        src={item.productImage}
                                        alt={item.productName}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package className="w-8 h-8 text-white/50" />
                                    </div>
                                )}
                            </div>

                            {/* Product Details */}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-semibold truncate">
                                    {item.productName}
                                </h3>
                                <p className="text-slate-400 text-sm">
                                    Qty: {item.quantity}
                                </p>
                            </div>

                            {/* Price */}
                            <div className="text-right">
                                <p className="text-emerald-400 font-bold">
                                    ₱{(item.productPrice * item.quantity).toLocaleString()}
                                </p>
                                {item.quantity > 1 && (
                                    <p className="text-slate-500 text-xs">
                                        ₱{item.productPrice.toLocaleString()} each
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Order Summary */}
                <div className="mt-6 bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="space-y-2">
                        <div className="flex justify-between text-slate-300">
                            <span>Subtotal</span>
                            <span>₱{subtotal.toLocaleString()}</span>
                        </div>
                        {config.showShipping && (
                            <div className="flex justify-between text-slate-300">
                                <span className="flex items-center gap-2">
                                    <Truck className="w-4 h-4" />
                                    Shipping
                                </span>
                                <span>{shipping > 0 ? `₱${shipping.toLocaleString()}` : 'FREE'}</span>
                            </div>
                        )}
                        <div className="border-t border-white/10 pt-2 mt-2">
                            <div className="flex justify-between text-white font-bold text-lg">
                                <span>Total</span>
                                <span className="text-emerald-400">₱{total.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirm Button */}
            <div className="p-4 bg-slate-900/50 border-t border-white/10">
                <button
                    onClick={handleConfirmOrder}
                    disabled={processing}
                    className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                    style={{
                        backgroundColor: buttonColor,
                        color: config.buttonTextColor || '#ffffff'
                    }}
                >
                    {processing ? (
                        <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <CreditCard className="w-6 h-6" />
                            {config.buttonText || '✅ Confirm Order'}
                        </>
                    )}
                </button>
                <p className="text-center text-slate-500 text-xs mt-3">
                    By confirming, you agree to proceed with this order
                </p>
            </div>
        </div>
    );
};

export default WebviewCheckout;
