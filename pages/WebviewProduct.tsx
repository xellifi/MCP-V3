import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingBag, Minus, Plus, Check, Sparkles } from 'lucide-react';

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

const EMOJI_MAP: Record<string, string> = {
    fire: '🔥',
    star: '⭐',
    sparkle: '✨',
    heart: '❤️',
    none: ''
};

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
    const [countdown, setCountdown] = useState<number>(0);
    const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
    const [adding, setAdding] = useState(false);

    const showToast = useCallback((message: string) => {
        setToast({ message, visible: true });
        setTimeout(() => setToast({ message: '', visible: false }), 2500);
    }, []);

    useEffect(() => {
        loadSession();
    }, [sessionId]);

    // Countdown timer effect
    useEffect(() => {
        if (config?.showCountdown && config?.countdownMinutes) {
            setCountdown(config.countdownMinutes * 60);

            const interval = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 0) return 0;
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [config?.showCountdown, config?.countdownMinutes]);

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

    // Helper to darken/lighten color for gradient
    const adjustColor = (hex: string, percent: number) => {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, Math.min(255, (num >> 16) + amt));
        const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
        const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    };

    // Countdown Timer Component
    const CountdownTimer = () => {
        if (!config?.showCountdown) return null;
        const showBg = config.countdownShowBg ?? true;
        const bgColor = config.countdownBgColor || '#6366f1';
        const textColor = config.countdownTextColor || '#ffffff';
        const fontSize = config.countdownFontSize || 24;
        const borderRadius = config.countdownBorderRadius ?? 16;
        const fullWidth = config.countdownFullWidth ?? false;

        const hours = Math.floor(countdown / 3600);
        const minutes = Math.floor((countdown % 3600) / 60);
        const seconds = countdown % 60;

        const TimeBlock = ({ value, label }: { value: number; label: string }) => (
            <div className="flex flex-col items-center">
                <div
                    className="font-mono font-bold rounded-lg min-w-[55px] py-2 text-center shadow-lg"
                    style={{
                        fontSize: `${fontSize}px`,
                        color: textColor,
                        backgroundColor: 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(4px)'
                    }}
                >
                    {String(value).padStart(2, '0')}
                </div>
                <span
                    className="uppercase tracking-wider mt-1.5 font-medium opacity-90"
                    style={{ color: textColor, fontSize: `${Math.max(10, fontSize / 2.4)}px` }}
                >
                    {label}
                </span>
            </div>
        );

        const Separator = () => (
            <span
                className="font-bold mx-1 self-start"
                style={{ color: textColor, fontSize: `${fontSize}px`, marginTop: `${fontSize / 3}px` }}
            >
                :
            </span>
        );

        const getBackground = () => {
            if (!showBg) return 'transparent';
            return `linear-gradient(135deg, ${bgColor} 0%, ${adjustColor(bgColor, -30)} 100%)`;
        };

        return (
            <div
                className={`py-4 px-6 my-3 ${fullWidth ? '-mx-6 px-6' : 'mx-4'}`}
                style={{
                    background: getBackground(),
                    borderRadius: fullWidth ? '0px' : `${borderRadius}px`,
                }}
            >
                <div className="flex items-center justify-center gap-2 mb-3">
                    <span style={{ color: textColor, fontSize: `${fontSize * 0.75}px` }}>⚡</span>
                    <span
                        className="font-bold uppercase tracking-widest"
                        style={{ color: textColor, fontSize: `${Math.max(12, fontSize / 2)}px` }}
                    >
                        Limited Time Offer
                    </span>
                </div>
                <div className="flex items-start justify-center gap-2">
                    <TimeBlock value={hours} label="Hours" />
                    <Separator />
                    <TimeBlock value={minutes} label="Mins" />
                    <Separator />
                    <TimeBlock value={seconds} label="Secs" />
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
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

    const emoji = config.showEmoji && config.emojiType !== 'none' ? EMOJI_MAP[config.emojiType] : '';
    const bgColor = config.backgroundColor || '#ffffff';
    const pageBgColor = config.pageBackgroundColor || bgColor;
    const headlineBgColor = config.headlineBgColor || '#ea580c';
    const priceBadgeSize = config.priceBadgeSize || 80;

    // Headline animation style
    const getHeadlineAnimationStyle = () => {
        if (config.headlineAnimation === 'none') return {};
        const speed = typeof config.headlineAnimationSpeed === 'number' ? config.headlineAnimationSpeed : 2;
        const duration = `${1 / speed}s`;
        return {
            animation: config.headlineAnimation === 'blink'
                ? `pulse ${duration} ease-in-out infinite`
                : `bounce ${duration} ease-in-out infinite`
        };
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: pageBgColor }}>
            {/* Main Content Area */}
            <div className="flex-1 flex items-center justify-center p-4 md:p-8">
                {/* Centered Container/Card */}
                <div
                    className="w-full max-w-md bg-white/10 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-white/20"
                    style={{ backgroundColor: bgColor }}
                >
                    {/* Headline Banner */}
                    <div className="py-4 px-6 text-center" style={{ backgroundColor: headlineBgColor }}>
                        <h1
                            className="text-lg md:text-xl font-bold uppercase tracking-wider"
                            style={{
                                color: config.headlineColor || '#ffffff',
                                ...getHeadlineAnimationStyle()
                            }}
                        >
                            {emoji && <span className="mr-2">{emoji}</span>}
                            {config.headline || 'CHECK OUT THIS PRODUCT!'}
                            {emoji && <span className="ml-2">{emoji}</span>}
                        </h1>
                    </div>

                    {/* Countdown Timer - Above Position */}
                    {config.countdownPosition === 'above' && <CountdownTimer />}

                    {/* Card Content */}
                    <div className="p-6 pt-8">
                        {/* Product Image with Price Badge */}
                        <div className="relative w-full max-w-[220px] mx-auto" style={{ overflow: 'visible' }}>
                            <div
                                className="overflow-hidden aspect-square shadow-xl"
                                style={{
                                    borderRadius: `${config.imageBorderRadius || 16}px`,
                                    border: `${config.imageBorderWidth || 4}px solid ${config.imageBorderColor || '#ffffff'}`,
                                }}
                            >
                                {config.imageUrl ? (
                                    <img
                                        src={config.imageUrl}
                                        alt="Product"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                                        <Sparkles className="w-12 h-12 text-slate-400" />
                                    </div>
                                )}
                            </div>

                            {/* Price Badge */}
                            <div
                                className="absolute rounded-full font-bold shadow-xl flex items-center justify-center z-20"
                                style={{
                                    width: `${priceBadgeSize}px`,
                                    height: `${priceBadgeSize}px`,
                                    fontSize: `${Math.max(14, priceBadgeSize / 4)}px`,
                                    backgroundColor: config.priceBadgeColor || '#22c55e',
                                    color: config.priceTextColor || '#ffffff',
                                    top: `-${priceBadgeSize / 2 - 10}px`,
                                    right: `-${priceBadgeSize / 2}px`,
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                                }}
                            >
                                {config.price || '₱0'}
                            </div>
                        </div>

                        {/* Countdown Timer - Middle Position */}
                        {config.countdownPosition === 'middle' && <CountdownTimer />}

                        {/* Quantity Selector */}
                        {(config.enableQuantitySelector ?? true) && (
                            <div className="flex items-center justify-center gap-4 mt-4">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center hover:bg-slate-300 transition-colors"
                                >
                                    <Minus className="w-5 h-5 text-slate-600" />
                                </button>
                                <span className="text-2xl font-bold text-slate-700 min-w-[40px] text-center">
                                    {quantity}
                                </span>
                                <button
                                    onClick={() => setQuantity(quantity + 1)}
                                    className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center hover:bg-indigo-600 transition-colors"
                                >
                                    <Plus className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        )}

                        {/* Color Options */}
                        {config.enableColorSelector && config.colorOptions?.length > 0 && (
                            <div className="mt-4">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 text-center">Color</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {config.colorOptions.map((color: string) => (
                                        <button
                                            key={color}
                                            onClick={() => setSelectedColor(color)}
                                            className={`px-4 py-2 text-sm rounded-lg border transition-all ${selectedColor === color
                                                    ? 'border-indigo-500 bg-indigo-500 text-white'
                                                    : 'border-slate-200 text-slate-700 hover:border-slate-400'
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
                            <div className="mt-4">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 text-center">Size</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {config.sizeOptions.map((size: string) => (
                                        <button
                                            key={size}
                                            onClick={() => setSelectedSize(size)}
                                            className={`w-12 h-12 text-sm font-medium rounded-lg border transition-all ${selectedSize === size
                                                    ? 'border-indigo-500 bg-indigo-500 text-white'
                                                    : 'border-slate-200 text-slate-700 hover:border-slate-400'
                                                }`}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Product Name Bar */}
                        {(config.showProductName ?? true) && (
                            <div
                                className={`mt-4 py-3 px-4 text-center ${config.productNameFullWidth ? '-mx-6 px-6' : 'mx-4'}`}
                                style={{
                                    backgroundColor: config.productNameBgColor || '#22c55e',
                                    borderRadius: config.productNameFullWidth ? '0px' : `${config.productNameBorderRadius || 0}px`
                                }}
                            >
                                <h2
                                    className="font-bold uppercase tracking-wider"
                                    style={{
                                        color: config.productNameTextColor || '#ffffff',
                                        fontSize: `${config.productNameFontSize || 16}px`
                                    }}
                                >
                                    {config.productName || 'PRODUCT NAME'}
                                </h2>
                            </div>
                        )}

                        {/* Countdown Timer - Below Position */}
                        {config.countdownPosition === 'below' && <CountdownTimer />}

                        {/* Description */}
                        {config.description && (
                            <p
                                className="mt-3 text-center text-sm"
                                style={{ color: config.descriptionColor || '#374151' }}
                            >
                                {config.description}
                            </p>
                        )}

                        {/* Action Button */}
                        <div className="mt-5">
                            <button
                                onClick={addToCart}
                                disabled={adding}
                                className="w-full py-3.5 px-6 font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-70"
                                style={{
                                    backgroundColor: config.buttonBgColor || '#22c55e',
                                    color: config.buttonTextColor || '#ffffff',
                                    borderRadius: `${config.buttonBorderRadius || 12}px`,
                                }}
                            >
                                {adding ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        {config.showButtonIcon && <Check className="w-5 h-5" />}
                                        {config.buttonText || 'ADD TO CART'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toast */}
            {toast.visible && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg z-50">
                    <Check className="w-4 h-4" />
                    {toast.message}
                </div>
            )}
        </div>
    );
};

export default WebviewProduct;
