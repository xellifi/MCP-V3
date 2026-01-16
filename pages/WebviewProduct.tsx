import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingBag, Minus, Plus, Check } from 'lucide-react';

interface CartItem {
    productId?: string;
    productName: string;
    productPrice: number;
    productImage?: string;
    quantity: number;
    variant?: {
        color?: string;
        size?: string;
    };
}

const API_BASE = '';

const WebviewProduct: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [config, setConfig] = useState<any>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [quantity, setQuantity] = useState(1);
    const [selectedColor, setSelectedColor] = useState<string>('');
    const [selectedSize, setSelectedSize] = useState<string>('');
    const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
    const [adding, setAdding] = useState(false);

    const showToast = useCallback((message: string) => {
        setToast({ message, visible: true });
        setTimeout(() => setToast({ message: '', visible: false }), 2500);
    }, []);

    useEffect(() => {
        loadSession();
    }, [sessionId]);

    const loadSession = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/webview?route=session&id=${sessionId}`);
            const data = await response.json();

            if (data.error) {
                setError(data.error);
                return;
            }

            const session = data.session;
            const pageConfig = session.page_config || {};
            setConfig(pageConfig);
            setCart(session.cart || []);

            if (pageConfig.colorOptions?.length > 0) {
                setSelectedColor(pageConfig.colorOptions[0]);
            }
            if (pageConfig.sizeOptions?.length > 0) {
                setSelectedSize(pageConfig.sizeOptions[0]);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load product');
        } finally {
            setLoading(false);
        }
    };

    const addToCart = async () => {
        if (!config || adding) return;
        setAdding(true);

        try {
            const variant: { color?: string; size?: string } = {};
            if (config.enableColorSelector && selectedColor) variant.color = selectedColor;
            if (config.enableSizeSelector && selectedSize) variant.size = selectedSize;

            let productName = config.productName || config.headline || 'Product';
            if (variant.color || variant.size) {
                const parts = [variant.color, variant.size].filter(Boolean);
                productName = `${productName} (${parts.join(' / ')})`;
            }

            const cartItem = {
                productId: sessionId,
                productName,
                productPrice: config.productPrice || parseFloat((config.price || '0').replace(/[^\d.]/g, '')) || 0,
                productImage: config.imageUrl,
                quantity,
                variant
            };

            const response = await fetch(`${API_BASE}/api/webview?route=action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, action: 'add_to_cart', payload: cartItem })
            });

            const result = await response.json();
            if (result.cart) {
                setCart(result.cart);
                showToast('Added to cart');
            }

            setTimeout(() => continueFlow(), 800);
        } catch (err: any) {
            console.error('Failed to add to cart:', err);
            setAdding(false);
        }
    };

    const continueFlow = async () => {
        try {
            await fetch(`${API_BASE}/api/webview?route=continue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            });
            window.close();
        } catch (err) {
            window.close();
        }
    };

    const formatPrice = (price: number | string) => {
        const num = typeof price === 'string' ? parseFloat(price.replace(/[^\d.]/g, '')) : price;
        return `₱${num.toLocaleString()}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-6">
                <div className="text-center">
                    <p className="text-neutral-400 text-sm">{error}</p>
                </div>
            </div>
        );
    }

    if (!config) return null;

    const price = config.productPrice || parseFloat((config.price || '0').replace(/[^\d.]/g, '')) || 0;
    const originalPrice = config.originalPrice ? parseFloat(String(config.originalPrice).replace(/[^\d.]/g, '')) : null;

    return (
        <div className="min-h-screen bg-neutral-50">
            {/* Centered Container for Desktop */}
            <div className="max-w-lg mx-auto min-h-screen bg-white flex flex-col shadow-xl">
                {/* Product Image - Full Width of Container */}
                <div className="relative w-full aspect-square bg-neutral-100 flex-shrink-0">
                    {config.imageUrl ? (
                        <img
                            src={config.imageUrl}
                            alt={config.productName || 'Product'}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-16 h-16 text-neutral-300" />
                        </div>
                    )}
                </div>

                {/* Product Details - Scrollable */}
                <div className="flex-1 px-5 py-6 overflow-y-auto">
                    {/* Product Name & Price */}
                    <div className="mb-4">
                        <h1 className="text-xl font-semibold text-neutral-900 leading-tight">
                            {config.productName || config.headline || 'Product'}
                        </h1>
                        <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-2xl font-bold text-neutral-900">
                                {formatPrice(price)}
                            </span>
                            {originalPrice && originalPrice > price && (
                                <span className="text-base text-neutral-400 line-through">
                                    {formatPrice(originalPrice)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    {config.description && (
                        <p className="text-sm text-neutral-500 leading-relaxed mb-5">
                            {config.description}
                        </p>
                    )}

                    {/* Color Options */}
                    {config.enableColorSelector && config.colorOptions?.length > 0 && (
                        <div className="mb-4">
                            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Color</p>
                            <div className="flex flex-wrap gap-2">
                                {config.colorOptions.map((color: string) => (
                                    <button
                                        key={color}
                                        onClick={() => setSelectedColor(color)}
                                        className={`px-4 py-2 text-sm rounded-lg border transition-all ${selectedColor === color
                                            ? 'border-neutral-900 bg-neutral-900 text-white'
                                            : 'border-neutral-200 text-neutral-700 hover:border-neutral-400'
                                            }`}
                                    >
                                        {color}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Size Options */}
                    {config.enableSizeSelector && config.sizeOptions?.length > 0 && (
                        <div className="mb-4">
                            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Size</p>
                            <div className="flex flex-wrap gap-2">
                                {config.sizeOptions.map((size: string) => (
                                    <button
                                        key={size}
                                        onClick={() => setSelectedSize(size)}
                                        className={`w-12 h-12 text-sm font-medium rounded-lg border transition-all ${selectedSize === size
                                            ? 'border-neutral-900 bg-neutral-900 text-white'
                                            : 'border-neutral-200 text-neutral-700 hover:border-neutral-400'
                                            }`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quantity Selector */}
                    {(config.enableQuantitySelector ?? true) && (
                        <div className="mb-5">
                            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Quantity</p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="w-10 h-10 rounded-lg border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 transition-colors"
                                >
                                    <Minus className="w-4 h-4 text-neutral-600" />
                                </button>
                                <span className="w-10 text-center text-lg font-medium text-neutral-900">
                                    {quantity}
                                </span>
                                <button
                                    onClick={() => setQuantity(quantity + 1)}
                                    className="w-10 h-10 rounded-lg border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 transition-colors"
                                >
                                    <Plus className="w-4 h-4 text-neutral-600" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Add to Cart Button - Fixed Bottom */}
                <div className="sticky bottom-0 p-4 bg-white border-t border-neutral-100 flex-shrink-0">
                    <button
                        onClick={addToCart}
                        disabled={adding}
                        className="w-full py-4 bg-neutral-900 text-white font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-800 active:scale-[0.98] transition-all disabled:opacity-70"
                    >
                        {adding ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <ShoppingBag className="w-5 h-5" />
                                <span>{config.buttonText || 'Add to Cart'}</span>
                                <span className="ml-1">• {formatPrice(price * quantity)}</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Toast */}
                {toast.visible && (
                    <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-neutral-900 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg z-50">
                        <Check className="w-4 h-4" />
                        {toast.message}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WebviewProduct;
