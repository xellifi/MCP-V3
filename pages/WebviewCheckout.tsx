import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart, Check, Package, Truck, X } from 'lucide-react';

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
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-500 mt-4 text-sm">Loading your order...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="text-6xl mb-4">😕</div>
                    <h1 className="text-xl font-bold text-gray-800 mb-2">Oops!</h1>
                    <p className="text-gray-500">{error}</p>
                </div>
            </div>
        );
    }

    if (!session) return null;

    const config = session.config;
    const headerColor = config.headerColor || '#f59e0b';
    const buttonColor = config.buttonColor || '#16a34a';
    const subtotal = calculateSubtotal();
    const shipping = config.showShipping ? (config.shippingFee || 0) : 0;
    const total = subtotal + shipping;

    // Success Screen
    if (showSuccess) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
                <div className="animate-bounce-in text-center">
                    <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Check className="w-14 h-14 text-white" strokeWidth={3} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">
                        {config.successMessage || 'Order Confirmed! 🎉'}
                    </h1>
                    <p className="text-gray-600 mb-6">
                        {config.thankYouMessage || 'Thank you for your purchase!'}
                    </p>
                    <p className="text-gray-400 text-sm">
                        Returning in <span className="font-bold text-gray-600">{countdown}</span>s...
                    </p>
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
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header Banner */}
            <div
                className="py-4 px-6 text-center"
                style={{ backgroundColor: headerColor }}
            >
                <div className="flex items-center justify-center gap-2">
                    <span className="text-xl">🛒</span>
                    <h1 className="text-lg font-bold text-white uppercase tracking-wide">
                        {config.headerText || 'Your Order Summary'}
                    </h1>
                    <span className="text-xl">🛒</span>
                </div>
            </div>

            {/* Main Content - Centered Portrait Layout */}
            <div className="flex-1 flex flex-col items-center px-4 py-6 max-w-md mx-auto w-full">

                {/* Cart Items */}
                <div className="w-full space-y-4 mb-6">
                    {session.cart.length === 0 ? (
                        <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
                            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">Your cart is empty</p>
                        </div>
                    ) : (
                        session.cart.map((item, index) => (
                            <div key={index} className="relative">
                                {/* Product Image with Price Badge */}
                                <div className="relative w-full max-w-[280px] mx-auto">
                                    <div className="overflow-hidden rounded-2xl border-4 border-gray-100 shadow-lg aspect-square bg-gray-100">
                                        {item.productImage ? (
                                            <img
                                                src={item.productImage}
                                                alt={item.productName}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                                <Package className="w-16 h-16 text-gray-400" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Circular Price Badge */}
                                    <div
                                        className="absolute -top-2 -right-2 w-16 h-16 rounded-full flex items-center justify-center font-bold text-white shadow-lg"
                                        style={{ backgroundColor: '#16a34a' }}
                                    >
                                        <span className="text-sm">₱{item.productPrice}</span>
                                    </div>

                                    {/* Upsell/Add-on Badge */}
                                    {(item.isUpsell || item.isDownsell) && (
                                        <div className="absolute -top-2 -left-2 px-3 py-1 bg-amber-500 text-white text-xs font-bold rounded-full shadow-lg">
                                            {item.isUpsell ? '⭐ ADD-ON' : '🎁 BONUS'}
                                        </div>
                                    )}
                                </div>

                                {/* Product Name Banner */}
                                <div
                                    className="w-full max-w-[280px] mx-auto mt-4 py-3 px-4 text-center rounded-lg"
                                    style={{ backgroundColor: '#16a34a' }}
                                >
                                    <h2 className="text-white font-bold text-base uppercase tracking-wide">
                                        {item.productName}
                                    </h2>
                                </div>

                                {/* Quantity */}
                                {(item.quantity || 1) > 1 && (
                                    <p className="text-center text-gray-500 text-sm mt-2">
                                        Quantity: {item.quantity}
                                    </p>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Order Summary */}
                {session.cart.length > 0 && (
                    <div className="w-full bg-gray-50 rounded-xl p-4 border border-gray-200 mb-6">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal ({session.cart.length} item{session.cart.length > 1 ? 's' : ''})</span>
                                <span>₱{subtotal.toLocaleString()}</span>
                            </div>

                            {config.showShipping && (
                                <div className="flex justify-between text-gray-600">
                                    <span className="flex items-center gap-1">
                                        <Truck className="w-4 h-4" />
                                        Shipping
                                    </span>
                                    <span className={shipping === 0 ? 'text-emerald-600 font-medium' : ''}>
                                        {shipping > 0 ? `₱${shipping.toLocaleString()}` : 'FREE'}
                                    </span>
                                </div>
                            )}

                            <div className="border-t border-gray-200 pt-2 mt-2">
                                <div className="flex justify-between font-bold text-gray-800">
                                    <span>Total</span>
                                    <span className="text-emerald-600 text-lg">₱{total.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Customer Info */}
                <p className="text-gray-500 text-sm mb-6">
                    Hi <span className="font-medium text-gray-700">{session.customerName}</span>! Ready to confirm?
                </p>
            </div>

            {/* Action Buttons - Fixed at bottom */}
            <div className="p-4 bg-white border-t border-gray-100">
                <div className="max-w-md mx-auto space-y-3">
                    <button
                        onClick={handleConfirmOrder}
                        disabled={processing || session.cart.length === 0}
                        className="w-full py-4 rounded-full font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50"
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
                                {config.buttonText || '✓ Confirm Order'}
                            </>
                        )}
                    </button>

                    <button
                        onClick={() => window.close()}
                        disabled={processing}
                        className="w-full py-4 rounded-full font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50"
                        style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
                    >
                        <X className="w-5 h-5" />
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WebviewCheckout;
