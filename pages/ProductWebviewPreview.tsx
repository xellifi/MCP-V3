import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, Minus, Plus, ShoppingCart, Star } from 'lucide-react';

interface ProductWebviewConfig {
    headline: string;
    headlineColor: string;
    headlineBgColor?: string;
    headlineAnimation?: 'none' | 'blink' | 'shake';
    headlineAnimationSpeed?: number;
    showEmoji: boolean;
    emojiType: 'fire' | 'star' | 'sparkle' | 'heart' | 'none';
    imageUrl: string;
    imageBorderRadius: number;
    imageBorderColor: string;
    imageBorderWidth: number;
    price: string;
    priceBadgeColor: string;
    priceTextColor: string;
    priceBadgeSize?: number;
    description: string;
    descriptionColor: string;
    buttonText: string;
    buttonBgColor: string;
    buttonTextColor: string;
    buttonBorderRadius: number;
    showButtonIcon: boolean;
    backgroundColor: string;
    pageBackgroundColor?: string;
    showProductName?: boolean;
    productName?: string;
    productNameBgColor?: string;
    productNameTextColor?: string;
    productNameFontSize?: number;
    productNameBorderRadius?: number;
    productNameFullWidth?: boolean;
    showCountdown?: boolean;
    countdownMinutes?: number;
    countdownPosition?: 'above' | 'middle' | 'below';
    countdownBgColor?: string;
    countdownTextColor?: string;
    countdownFontSize?: number;
    countdownShowBg?: boolean;
    countdownBorderRadius?: number;
    countdownFullWidth?: boolean;
    enableQuantitySelector?: boolean;
    originalPrice?: string;
    compareAtPrice?: string;
    stockRemaining?: number;
    stockQuantity?: number;
    rating?: number;
    additionalImages?: string[];
}

const ProductWebviewPreview: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [config, setConfig] = useState<ProductWebviewConfig | null>(null);
    const [countdown, setCountdown] = useState<number>(0);
    const [quantity, setQuantity] = useState(1);
    const [error, setError] = useState('');
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);

    useEffect(() => {
        try {
            const encodedConfig = searchParams.get('config');
            if (encodedConfig) {
                const decodedConfig = JSON.parse(decodeURIComponent(encodedConfig));
                setConfig(decodedConfig);
            } else {
                setError('No configuration provided');
            }
        } catch (err) {
            console.error('Error decoding config:', err);
            setError('Invalid configuration');
        }
    }, [searchParams]);

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

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔧</div>
                    <h1 className="text-xl font-bold text-slate-800 mb-2">Preview Mode</h1>
                    <p className="text-slate-500">{error}</p>
                </div>
            </div>
        );
    }

    if (!config) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const pageBgColor = config.pageBackgroundColor || '#f8fafc';

    // Parse price values
    const currentPrice = config.price || '₱0';
    const originalPrice = config.originalPrice || config.compareAtPrice || null;
    const stockRemaining = config.stockRemaining || config.stockQuantity || null;
    const productRating = config.rating || 4;

    // Get product images for gallery
    const getProductImages = () => {
        const images: string[] = [];
        if (config.imageUrl) images.push(config.imageUrl);
        if (config.additionalImages && Array.isArray(config.additionalImages)) {
            images.push(...config.additionalImages);
        }
        // If only one image, duplicate it for gallery effect
        while (images.length > 0 && images.length < 4) {
            images.push(images[0]);
        }
        return images;
    };

    const productImages = getProductImages();
    const currentImage = productImages[selectedImageIndex] || config.imageUrl;

    // Helper to darken/lighten color for gradient
    const adjustColor = (hex: string, percent: number) => {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, Math.min(255, (num >> 16) + amt));
        const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
        const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
        return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
    };

    // Star Rating Component
    const StarRating = ({ rating = 4, maxRating = 5 }: { rating?: number; maxRating?: number }) => {
        return (
            <div className="flex items-center gap-0.5">
                {Array.from({ length: maxRating }, (_, i) => (
                    <Star
                        key={i}
                        className={`w-5 h-5 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                    />
                ))}
            </div>
        );
    };

    // Countdown Timer Component
    const CountdownTimer = () => {
        if (!config.showCountdown) return null;
        const showBg = config.countdownShowBg ?? true;
        const bgColor = config.countdownBgColor || '#6366f1';
        const textColor = config.countdownTextColor || '#ffffff';
        const fontSize = config.countdownFontSize || 20;
        const borderRadius = config.countdownBorderRadius ?? 12;

        const hours = Math.floor(countdown / 3600);
        const minutes = Math.floor((countdown % 3600) / 60);
        const seconds = countdown % 60;

        const TimeBlock = ({ value, label }: { value: number; label: string }) => (
            <div className="flex flex-col items-center">
                <div
                    className="font-mono font-bold rounded-lg min-w-[45px] py-1.5 text-center shadow-md"
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
                    className="uppercase tracking-wider mt-1 font-medium opacity-90"
                    style={{ color: textColor, fontSize: `${Math.max(9, fontSize / 2.4)}px` }}
                >
                    {label}
                </span>
            </div>
        );

        const Separator = () => (
            <span
                className="font-bold mx-0.5 self-start"
                style={{ color: textColor, fontSize: `${fontSize}px`, marginTop: `${fontSize / 4}px` }}
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
                className="py-3 px-4 my-3 rounded-xl"
                style={{
                    background: getBackground(),
                    borderRadius: `${borderRadius}px`,
                }}
            >
                <div className="flex items-center justify-center gap-1.5 mb-2">
                    <span style={{ color: textColor, fontSize: `${fontSize * 0.7}px` }}>⚡</span>
                    <span
                        className="font-bold uppercase tracking-widest"
                        style={{ color: textColor, fontSize: `${Math.max(10, fontSize / 2.2)}px` }}
                    >
                        Limited Time Offer
                    </span>
                </div>
                <div className="flex items-start justify-center gap-1">
                    <TimeBlock value={hours} label="Hours" />
                    <Separator />
                    <TimeBlock value={minutes} label="Mins" />
                    <Separator />
                    <TimeBlock value={seconds} label="Secs" />
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: pageBgColor }}>
            {/* Preview Banner */}
            <div className="bg-slate-800 py-2 px-4 text-center border-b border-slate-700">
                <span className="text-xs text-slate-400 flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                    Product Webview Preview Mode
                </span>
            </div>

            {/* Decorative corner accent */}
            <div
                className="fixed top-0 right-0 w-4 h-full z-10"
                style={{
                    background: 'linear-gradient(180deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)'
                }}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex items-center justify-center p-4 md:p-8">
                {/* Main Card Container */}
                <div
                    className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden"
                    style={{
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)'
                    }}
                >
                    {/* Two Column Layout */}
                    <div className="flex flex-col md:flex-row">
                        {/* Left Column - Product Images */}
                        <div className="md:w-1/2 p-6 md:p-8 bg-slate-50/50">
                            {/* Main Image */}
                            <div
                                className="relative w-full aspect-square rounded-2xl overflow-hidden mb-4 bg-gradient-to-br from-amber-50 to-orange-50"
                                style={{
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                                }}
                            >
                                {currentImage ? (
                                    <img
                                        src={currentImage}
                                        alt="Product"
                                        className="w-full h-full object-cover transition-all duration-300"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Sparkles className="w-16 h-16 text-slate-300" />
                                    </div>
                                )}
                            </div>

                            {/* Thumbnail Gallery */}
                            {productImages.length > 1 && (
                                <div className="flex gap-3 justify-center">
                                    {productImages.slice(0, 4).map((img, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setSelectedImageIndex(index)}
                                            className={`w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden transition-all duration-200 ${selectedImageIndex === index
                                                    ? 'ring-2 ring-indigo-500 ring-offset-2'
                                                    : 'opacity-60 hover:opacity-100'
                                                }`}
                                            style={{
                                                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                                            }}
                                        >
                                            <img
                                                src={img}
                                                alt={`Product view ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right Column - Product Details */}
                        <div className="md:w-1/2 p-6 md:p-8 flex flex-col">
                            {/* Product Name */}
                            <h1 className="text-xl md:text-2xl font-bold text-slate-800 mb-3">
                                {config.productName || config.headline || 'Product Name'}
                            </h1>

                            {/* Star Rating */}
                            <div className="mb-4">
                                <StarRating rating={productRating} />
                            </div>

                            {/* Price Section */}
                            <div className="flex items-baseline gap-3 mb-4">
                                <span className="text-3xl md:text-4xl font-bold text-slate-900">
                                    {currentPrice}
                                </span>
                                {originalPrice && (
                                    <span className="text-lg text-slate-400 line-through">
                                        {originalPrice}
                                    </span>
                                )}
                            </div>

                            {/* Countdown Timer */}
                            {config.showCountdown && <CountdownTimer />}

                            {/* Quantity and Add to Cart Row */}
                            <div className="flex items-center gap-4 mb-4">
                                {/* Quantity Selector - Input Style */}
                                {(config.enableQuantitySelector ?? true) && (
                                    <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden">
                                        <button
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            className="w-10 h-12 flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-500"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <div className="w-12 h-12 flex items-center justify-center border-x-2 border-slate-200">
                                            <span className="text-lg font-semibold text-slate-700">
                                                {quantity}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setQuantity(quantity + 1)}
                                            className="w-10 h-12 flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-500"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                {/* Add to Cart Button */}
                                <button
                                    className="flex-1 py-3.5 px-6 font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] rounded-xl text-white"
                                    style={{
                                        background: config.buttonBgColor
                                            ? config.buttonBgColor
                                            : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                    }}
                                >
                                    <ShoppingCart className="w-5 h-5" />
                                    {config.buttonText || 'Add To Cart'}
                                </button>
                            </div>

                            {/* Stock Remaining */}
                            {stockRemaining && (
                                <p className="text-sm mb-4">
                                    <span className="text-slate-600">Last </span>
                                    <span className="text-indigo-600 font-semibold">{stockRemaining} Remaining</span>
                                </p>
                            )}

                            {/* Description */}
                            {config.description && (
                                <div className="mt-auto pt-4 border-t border-slate-100">
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        {config.description}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductWebviewPreview;
