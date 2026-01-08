import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, X, Sparkles, Clock } from 'lucide-react';

interface DownsellConfig {
    headline: string;
    headlineColor: string;
    showEmoji: boolean;
    emojiType: 'fire' | 'star' | 'sparkle' | 'heart' | 'none';
    imageUrl: string;
    imageBorderRadius: number;
    imageBorderColor: string;
    imageBorderWidth: number;
    price: string;
    priceBadgeColor: string;
    priceTextColor: string;
    description: string;
    descriptionColor: string;
    buttonText: string;
    buttonBgColor: string;
    buttonTextColor: string;
    buttonBorderRadius: number;
    showButtonIcon: boolean;
    backgroundColor: string;
    deliveryType?: 'immediate' | 'delayed' | 'fixed' | 'exit_intent';
    productName?: string;
}

const EMOJI_MAP: Record<string, string> = {
    fire: '🔥',
    star: '⭐',
    sparkle: '✨',
    heart: '❤️',
    none: ''
};

const DownsellPreview: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [config, setConfig] = useState<DownsellConfig | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        try {
            const encodedConfig = searchParams.get('config');
            if (encodedConfig) {
                // Use decodeURIComponent to handle unicode characters
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

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔧</div>
                    <h1 className="text-xl font-bold text-white mb-2">Preview Mode</h1>
                    <p className="text-slate-400">{error}</p>
                </div>
            </div>
        );
    }

    if (!config) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-600 to-red-700 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const emoji = config.showEmoji && config.emojiType !== 'none' ? EMOJI_MAP[config.emojiType] : '';
    const bgColor = config.backgroundColor || '#ea580c';

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: bgColor }}>
            {/* Preview Banner */}
            <div className="bg-slate-800 py-2 px-4 text-center border-b border-slate-700">
                <span className="text-xs text-slate-400 flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Live Preview Mode
                </span>
            </div>

            {/* Header with Exit Intent Feel */}
            <div className="py-5 px-6 text-center bg-gradient-to-r from-orange-600 to-red-600">
                <div className="flex items-center justify-center gap-2 mb-1">
                    <Clock className="w-5 h-5 text-yellow-300 animate-pulse" />
                    <span className="text-yellow-300 text-sm font-medium uppercase tracking-wider">
                        Wait! Special Offer
                    </span>
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-white">
                    {emoji && <span className="mr-2">{emoji}</span>}
                    {config.headline || 'Before You Go...'}
                    {emoji && <span className="ml-2">{emoji}</span>}
                </h1>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-4 flex flex-col items-center justify-center">
                {/* Product Card */}
                <div className="bg-white rounded-2xl shadow-2xl p-4 w-full max-w-[320px]">
                    {/* Product Image with Price Badge */}
                    <div className="relative">
                        <div
                            className="overflow-hidden aspect-square"
                            style={{
                                borderRadius: `${config.imageBorderRadius || 12}px`,
                            }}
                        >
                            {config.imageUrl ? (
                                <img
                                    src={config.imageUrl}
                                    alt="Product"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
                                    <Sparkles className="w-16 h-16 text-orange-300" />
                                </div>
                            )}
                        </div>

                        {/* Price Badge */}
                        <div
                            className="absolute -top-2 -right-2 px-4 py-2 rounded-full font-bold text-lg shadow-lg"
                            style={{
                                backgroundColor: config.priceBadgeColor || '#dc2626',
                                color: config.priceTextColor || '#ffffff',
                            }}
                        >
                            {config.price || '₱0'}
                        </div>

                        {/* Discount Label */}
                        <div className="absolute -top-2 -left-2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                            SPECIAL DEAL
                        </div>
                    </div>

                    {/* Product Info */}
                    <div className="mt-4 text-center">
                        <h2 className="font-bold text-xl text-slate-800">
                            {config.productName || 'Product Name'}
                        </h2>
                        {config.description && (
                            <p className="mt-2 text-slate-500 text-sm">
                                {config.description}
                            </p>
                        )}
                    </div>

                    {/* Action Buttons Inside Card */}
                    <div className="mt-4 space-y-2">
                        <button
                            className="w-full py-3 px-6 rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                            style={{
                                borderRadius: `${config.buttonBorderRadius || 12}px`,
                            }}
                        >
                            {config.showButtonIcon && <Check className="w-5 h-5" />}
                            {config.buttonText || "Yes, I Want This!"}
                        </button>

                        <button
                            className="w-full py-3 px-6 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95 bg-slate-200 text-slate-600 hover:bg-slate-300"
                            style={{
                                borderRadius: `${config.buttonBorderRadius || 12}px`,
                            }}
                        >
                            <X className="w-4 h-4" />
                            No Thanks, I'll Pass
                        </button>
                    </div>
                </div>
            </div>

            {/* Urgency Footer */}
            <div className="p-4 text-center">
                <p className="text-white/80 text-sm">
                    ⏰ This offer is only available right now
                </p>
            </div>
        </div>
    );
};

export default DownsellPreview;
