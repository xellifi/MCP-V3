import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart, ChevronLeft, ChevronRight, Check, X, Minus, Plus } from 'lucide-react';

interface ProductConfig {
    productId: string;
    productName: string;
    productDescription: string;
    productPrice: number;
    compareAtPrice?: number;
    productImages: string[];
    variants?: {
        colors?: Array<{ name: string; value: string }>;
        sizes?: string[];
    };
    currency?: string;
}

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

const API_BASE = '';  // Use relative URLs for API calls

const WebviewProduct: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [config, setConfig] = useState<ProductConfig | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cartOpen, setCartOpen] = useState(false);

    // Product state
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [selectedColor, setSelectedColor] = useState<string>('');
    const [selectedSize, setSelectedSize] = useState<string>('');
    const [quantity, setQuantity] = useState(1);

    // Toast notification
    const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

    const showToast = useCallback((message: string) => {
        setToast({ message, visible: true });
        setTimeout(() => setToast({ message: '', visible: false }), 3000);
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
            setConfig(session.page_config);
            setCart(session.cart || []);

            // Set default selections
            if (session.page_config?.variants?.colors?.length > 0) {
                setSelectedColor(session.page_config.variants.colors[0].name);
            }
            if (session.page_config?.variants?.sizes?.length > 0) {
                setSelectedSize(session.page_config.variants.sizes[0]);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load product');
        } finally {
            setLoading(false);
        }
    };

    const addToCart = async () => {
        if (!config) return;

        try {
            const response = await fetch(`${API_BASE}/api/webview?route=action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    action: 'add_to_cart',
                    payload: {
                        productId: config.productId,
                        productName: config.productName,
                        productPrice: config.productPrice,
                        productImage: config.productImages?.[0],
                        quantity,
                        variant: {
                            color: selectedColor,
                            size: selectedSize
                        }
                    }
                })
            });

            const result = await response.json();
            if (result.cart) {
                setCart(result.cart);
                showToast(`✓ ${config.productName} added to cart!`);
            }
        } catch (err) {
            showToast('Failed to add to cart');
        }
    };

    const updateCartItem = async (productId: string, newQuantity: number, variant?: any) => {
        try {
            const response = await fetch(`${API_BASE}/api/webview?route=action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    action: 'update_cart',
                    payload: { productId, quantity: newQuantity, variant }
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

    const continueFlow = async () => {
        try {
            await fetch(`${API_BASE}/api/webview/continue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, closeReason: 'user_action' })
            });

            // Close webview using Messenger Extensions
            if ((window as any).MessengerExtensions) {
                (window as any).MessengerExtensions.requestCloseBrowser(
                    () => console.log('Webview closed'),
                    (err: any) => console.error('Error closing webview:', err)
                );
            } else {
                window.close();
            }
        } catch (err) {
            console.error('Failed to continue flow');
        }
    };

    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = cart.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);
    const currencySymbol = config?.currency === 'USD' ? '$' : config?.currency === 'EUR' ? '€' : '₱';

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
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

    if (!config) return null;

    return (
        <div className="min-h-screen bg-white relative">
            {/* Header with Cart Icon */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <button
                    onClick={continueFlow}
                    className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                    <X className="w-5 h-5 text-slate-600" />
                </button>

                <h1 className="font-semibold text-slate-800 truncate max-w-[200px]">
                    {config.productName}
                </h1>

                <button
                    onClick={() => setCartOpen(true)}
                    className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                    <ShoppingCart className="w-5 h-5 text-slate-600" />
                    {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-bold animate-bounce">
                            {cartCount}
                        </span>
                    )}
                </button>
            </header>

            {/* Image Carousel */}
            <div className="relative bg-slate-100 aspect-square overflow-hidden">
                {config.productImages && config.productImages.length > 0 ? (
                    <>
                        <img
                            src={config.productImages[currentImageIndex]}
                            alt={config.productName}
                            className="w-full h-full object-contain"
                        />

                        {/* Navigation Arrows */}
                        {config.productImages.length > 1 && (
                            <>
                                <button
                                    onClick={() => setCurrentImageIndex(i => i > 0 ? i - 1 : config.productImages!.length - 1)}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setCurrentImageIndex(i => i < config.productImages!.length - 1 ? i + 1 : 0)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </>
                        )}

                        {/* Dots Indicator */}
                        {config.productImages.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                {config.productImages.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentImageIndex(index)}
                                        className={`w-2 h-2 rounded-full transition-all ${index === currentImageIndex
                                            ? 'bg-blue-600 w-6'
                                            : 'bg-slate-400'
                                            }`}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-slate-400">No image</span>
                    </div>
                )}
            </div>

            {/* Product Info */}
            <div className="p-4 space-y-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">{config.productName}</h2>
                    <p className="text-sm text-slate-500 mt-1">More info</p>
                </div>

                {config.productDescription && (
                    <div>
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Product Description
                        </h3>
                        <p className="text-slate-600 text-sm">{config.productDescription}</p>
                    </div>
                )}

                {/* Color Selector */}
                {config.variants?.colors && config.variants.colors.length > 0 && (
                    <div>
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Colour
                        </h3>
                        <div className="flex gap-2">
                            {config.variants.colors.map((color) => (
                                <button
                                    key={color.name}
                                    onClick={() => setSelectedColor(color.name)}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === color.name
                                        ? 'border-blue-600 scale-110'
                                        : 'border-transparent'
                                        }`}
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Size Selector */}
                {config.variants?.sizes && config.variants.sizes.length > 0 && (
                    <div>
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Size
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {config.variants.sizes.map((size) => (
                                <button
                                    key={size}
                                    onClick={() => setSelectedSize(size)}
                                    className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all ${selectedSize === size
                                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quantity Selector */}
                <div className="flex items-center gap-4">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Quantity
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setQuantity(q => Math.max(1, q - 1))}
                            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-semibold">{quantity}</span>
                        <button
                            onClick={() => setQuantity(q => q + 1)}
                            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Bar - Buy Button */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex items-center justify-between gap-4">
                <button
                    onClick={addToCart}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <ShoppingCart className="w-5 h-5" />
                    Add to Cart
                </button>

                <div className="text-right">
                    {config.compareAtPrice && config.compareAtPrice > config.productPrice && (
                        <p className="text-sm text-slate-400 line-through">
                            {currencySymbol}{config.compareAtPrice.toLocaleString()}
                        </p>
                    )}
                    <p className="text-xl font-bold text-slate-900">
                        {currencySymbol}{(config.productPrice * quantity).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Toast Notification */}
            {toast.visible && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
                    <div className="bg-green-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
                        <Check className="w-5 h-5" />
                        <span className="font-medium">{toast.message}</span>
                    </div>
                </div>
            )}

            {/* Cart Sidebar */}
            {cartOpen && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
                    <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-xl animate-slide-left">
                        <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between p-4 border-b">
                                <h2 className="text-lg font-bold">Your Cart ({cartCount})</h2>
                                <button onClick={() => setCartOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto p-4 space-y-4">
                                {cart.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">
                                        Your cart is empty
                                    </div>
                                ) : (
                                    cart.map((item, index) => (
                                        <div key={index} className="flex gap-3 bg-slate-50 rounded-xl p-3">
                                            {item.productImage && (
                                                <img
                                                    src={item.productImage}
                                                    alt={item.productName}
                                                    className="w-16 h-16 object-cover rounded-lg"
                                                />
                                            )}
                                            <div className="flex-1">
                                                <h3 className="font-medium text-sm">{item.productName}</h3>
                                                {item.variant && (
                                                    <p className="text-xs text-slate-500">
                                                        {item.variant.color} {item.variant.size && `/ ${item.variant.size}`}
                                                    </p>
                                                )}
                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => updateCartItem(item.productId, item.quantity - 1, item.variant)}
                                                            className="w-6 h-6 bg-slate-200 rounded flex items-center justify-center"
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <span className="text-sm font-medium">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateCartItem(item.productId, item.quantity + 1, item.variant)}
                                                            className="w-6 h-6 bg-slate-200 rounded flex items-center justify-center"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <span className="font-bold">
                                                        {currencySymbol}{(item.productPrice * item.quantity).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {cart.length > 0 && (
                                <div className="p-4 border-t space-y-3">
                                    <div className="flex justify-between text-lg font-bold">
                                        <span>Total</span>
                                        <span>{currencySymbol}{cartTotal.toLocaleString()}</span>
                                    </div>
                                    <button
                                        onClick={continueFlow}
                                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors"
                                    >
                                        Continue →
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slide-down {
                    from { opacity: 0; transform: translate(-50%, -20px); }
                    to { opacity: 1; transform: translate(-50%, 0); }
                }
                @keyframes slide-left {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-down { animation: slide-down 0.3s ease-out; }
                .animate-slide-left { animation: slide-left 0.3s ease-out; }
            `}</style>

            {/* Spacer for bottom bar */}
            <div className="h-24"></div>
        </div>
    );
};

export default WebviewProduct;
