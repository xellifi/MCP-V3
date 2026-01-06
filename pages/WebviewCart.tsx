import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Minus, Plus, Trash2, Tag, X } from 'lucide-react';

interface CartItem {
    productId: string;
    productName: string;
    productPrice: number;
    productImage?: string;
    quantity: number;
    variant?: {
        color?: string;
        size?: string;
    };
}

interface CartConfig {
    headerText?: string;
    headerColor?: string;
    buttonText?: string;
    buttonColor?: string;
    showCoupon?: boolean;
    currency?: string;
    shippingFee?: number;
    taxRate?: number;
}

const API_BASE = '';  // Use relative URLs for API calls

const WebviewCart: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [config, setConfig] = useState<CartConfig | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [couponCode, setCouponCode] = useState('');
    const [couponApplied, setCouponApplied] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        loadSession();
    }, [sessionId]);

    const loadSession = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/webview/session?id=${sessionId}`);
            const data = await response.json();

            if (data.error) {
                setError(data.error);
                return;
            }

            const session = data.session;
            setConfig(session.page_config || {});
            setCart(session.cart || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load cart');
        } finally {
            setLoading(false);
        }
    };

    const updateQuantity = async (productId: string, quantity: number, variant?: any) => {
        try {
            const response = await fetch(`${API_BASE}/api/webview/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    action: 'update_cart',
                    payload: { productId, quantity, variant }
                })
            });

            const result = await response.json();
            if (result.cart) {
                setCart(result.cart);
            }
        } catch (err) {
            console.error('Failed to update cart');
        }
    };

    const removeItem = async (productId: string, variant?: any) => {
        try {
            const response = await fetch(`${API_BASE}/api/webview/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    action: 'remove_from_cart',
                    payload: { productId, variant }
                })
            });

            const result = await response.json();
            if (result.cart) {
                setCart(result.cart);
            }
        } catch (err) {
            console.error('Failed to remove item');
        }
    };

    const applyCoupon = async () => {
        if (!couponCode.trim()) return;

        try {
            const response = await fetch(`${API_BASE}/api/webview/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    action: 'apply_coupon',
                    payload: { couponCode }
                })
            });

            const result = await response.json();
            if (result.couponApplied) {
                setCouponApplied(true);
                // TODO: Get actual discount from API
                setDiscount(0);
            }
        } catch (err) {
            console.error('Failed to apply coupon');
        }
    };

    const proceedToCheckout = async () => {
        if (processing || cart.length === 0) return;
        setProcessing(true);

        try {
            // Mark session for checkout
            await fetch(`${API_BASE}/api/webview/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    action: 'checkout_complete',
                    payload: {}
                })
            });

            // Continue flow
            await fetch(`${API_BASE}/api/webview/continue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, closeReason: 'checkout' })
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
            console.error('Error proceeding to checkout:', err);
            setProcessing(false);
        }
    };

    const closeCart = async () => {
        try {
            await fetch(`${API_BASE}/api/webview/continue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, closeReason: 'close' })
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
            console.error('Error closing cart');
        }
    };

    const currencySymbol = config?.currency === 'USD' ? '$' : config?.currency === 'EUR' ? '€' : '₱';
    const subtotal = cart.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);
    const shippingFee = config?.shippingFee || 0;
    const taxRate = config?.taxRate || 0;
    const taxes = subtotal * (taxRate / 100);
    const total = subtotal + shippingFee + taxes - discount;

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="text-6xl mb-4">🛒</div>
                    <h1 className="text-xl font-bold text-slate-800 mb-2">Cart Error</h1>
                    <p className="text-slate-500">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header - Blue like user's design */}
            <header
                className="py-4 px-4 flex items-center justify-between"
                style={{ backgroundColor: config?.headerColor || '#3b82f6' }}
            >
                <button onClick={closeCart} className="p-2 text-white/80 hover:text-white">
                    <X className="w-5 h-5" />
                </button>
                <h1 className="text-lg font-bold text-white">
                    {config?.headerText || 'Your Cart'}
                </h1>
                <div className="w-10"></div>
            </header>

            {/* Cart Items */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
                {cart.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">🛒</div>
                        <h2 className="text-lg font-semibold text-slate-600">Your cart is empty</h2>
                        <p className="text-slate-400 mt-2">Add some products to get started!</p>
                    </div>
                ) : (
                    cart.map((item, index) => (
                        <div
                            key={`${item.productId}-${index}`}
                            className="bg-white rounded-2xl p-4 shadow-sm flex gap-4"
                        >
                            {/* Product Image with Quantity Badge */}
                            <div className="relative">
                                <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100">
                                    {item.productImage ? (
                                        <img
                                            src={item.productImage}
                                            alt={item.productName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-2xl">
                                            📦
                                        </div>
                                    )}
                                </div>
                                {/* Quantity Badge */}
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                    {item.quantity}
                                </div>
                            </div>

                            {/* Product Info */}
                            <div className="flex-1">
                                <h3 className="font-semibold text-slate-800">{item.productName}</h3>
                                {item.variant && (
                                    <p className="text-sm text-slate-500">
                                        {item.variant.color && <span className="font-medium">{item.variant.color}</span>}
                                        {item.variant.size && <span> - Size {item.variant.size}</span>}
                                    </p>
                                )}

                                {/* Quantity Controls */}
                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => updateQuantity(item.productId, item.quantity - 1, item.variant)}
                                            className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.productId, item.quantity + 1, item.variant)}
                                            className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => removeItem(item.productId, item.variant)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Price */}
                            <div className="text-right">
                                <span className="font-bold text-slate-800">
                                    {currencySymbol}{(item.productPrice * item.quantity).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    ))
                )}

                {/* Coupon Section */}
                {cart.length > 0 && config?.showCoupon !== false && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                                <Tag className="w-5 h-5 text-slate-500" />
                            </div>
                            <input
                                type="text"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                placeholder="Discount Coupon"
                                className="flex-1 bg-transparent outline-none text-slate-700 placeholder-slate-400"
                                disabled={couponApplied}
                            />
                            <button
                                onClick={applyCoupon}
                                disabled={couponApplied || !couponCode.trim()}
                                className={`font-bold text-sm ${couponApplied
                                    ? 'text-green-600'
                                    : 'text-blue-600 hover:text-blue-700'
                                    }`}
                            >
                                {couponApplied ? '✓ APPLIED' : 'APPLY'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Order Summary */}
            {cart.length > 0 && (
                <div className="bg-white border-t border-slate-200 p-4 space-y-3">
                    <div className="flex justify-between text-slate-600">
                        <span>Subtotal</span>
                        <span className="font-medium">{currencySymbol}{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                        <span>Shipping Fee</span>
                        <span className="font-medium">
                            {shippingFee > 0 ? `${currencySymbol}${shippingFee.toLocaleString()}` : `${currencySymbol}0.00`}
                        </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                        <span>Estimated Taxes</span>
                        <span className="font-medium">
                            {taxes > 0 ? `${currencySymbol}${taxes.toLocaleString()}` : `${currencySymbol}0.00`}
                        </span>
                    </div>
                    {discount > 0 && (
                        <div className="flex justify-between text-green-600">
                            <span>Discount</span>
                            <span className="font-medium">-{currencySymbol}{discount.toLocaleString()}</span>
                        </div>
                    )}

                    <div className="border-t border-slate-200 pt-3">
                        <div className="flex justify-between text-lg font-bold text-slate-800">
                            <span>TOTAL</span>
                            <span>{currencySymbol}{total.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Checkout Button */}
                    <button
                        onClick={proceedToCheckout}
                        disabled={processing || cart.length === 0}
                        className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all active:scale-[0.98] disabled:opacity-50"
                        style={{ backgroundColor: config?.buttonColor || '#3b82f6' }}
                    >
                        {processing ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Processing...
                            </div>
                        ) : (
                            config?.buttonText || 'Checkout'
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default WebviewCart;
