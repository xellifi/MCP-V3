import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, X, Sparkles } from 'lucide-react';

interface UpsellConfig {
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
    productName?: string;
}

const EMOJI_MAP: Record<string, string> = {
    fire: '🔥',
    star: '⭐',
    sparkle: '✨',
    heart: '❤️',
    none: ''
};

const UpsellPreview: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [config, setConfig] = useState<UpsellConfig | null>(null);
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
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const emoji = config.showEmoji && config.emojiType !== 'none' ? EMOJI_MAP[config.emojiType] : '';
    const bgColor = config.backgroundColor || '#dc2626';

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: bgColor }}>
            {/* Preview Banner */}
            <div className="bg-slate-800 py-2 px-4 text-center border-b border-slate-700">
                <span className="text-xs text-slate-400 flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Live Preview Mode
                </span>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex items-center justify-center p-4 md:p-8">
                {/* Centered Container/Card */}
                <div
                    className="w-full max-w-md bg-white/10 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-white/20"
                    style={{ backgroundColor: bgColor }}
                >
                    {/* Headline Banner */}
                    <div className="py-4 px-6 text-center bg-amber-500">
                        <h1 className="text-lg md:text-xl font-bold uppercase tracking-wider text-slate-800">
                            {emoji && <span className="mr-2">{emoji}</span>}
                            ADD THIS TO YOUR CART?
                            {emoji && <span className="ml-2">{emoji}</span>}
                        </h1>
                    </div>

                    {/* Card Content */}
                    <div className="p-6">
                        {/* Product Image with Price Badge */}
                        <div className="relative w-full max-w-[220px] mx-auto">
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

                            {/* Price Badge - Perfect Circle */}
                            <div
                                className="absolute -top-3 -right-3 w-14 h-14 rounded-full font-bold text-base shadow-lg flex items-center justify-center"
                                style={{
                                    backgroundColor: config.priceBadgeColor || '#16a34a',
                                    color: config.priceTextColor || '#ffffff',
                                }}
                            >
                                {config.price || '₱0'}
                            </div>
                        </div>

                        {/* Product Name Bar */}
                        <div className="mt-4 py-3 px-4 text-center rounded-xl bg-green-600">
                            <h2 className="text-white font-bold text-lg uppercase tracking-wider">
                                {config.productName || 'PRODUCT NAME'}
                            </h2>
                        </div>

                        {/* Description */}
                        {config.description && (
                            <p
                                className="mt-3 text-center text-sm"
                                style={{ color: config.descriptionColor || '#ffffff' }}
                            >
                                {config.description}
                            </p>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-5 space-y-3">
                            <button
                                className="w-full py-3.5 px-6 font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                                style={{
                                    backgroundColor: config.buttonBgColor || '#16a34a',
                                    color: config.buttonTextColor || '#ffffff',
                                    borderRadius: `${config.buttonBorderRadius || 24}px`,
                                }}
                            >
                                {config.showButtonIcon && <Check className="w-5 h-5" />}
                                {config.buttonText || 'Yes Add this'}
                            </button>

                            <button
                                className="w-full py-3.5 px-6 font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                                style={{
                                    backgroundColor: '#dc2626',
                                    color: '#ffffff',
                                    borderRadius: `${config.buttonBorderRadius || 24}px`,
                                }}
                            >
                                <X className="w-5 h-5" />
                                No Thanks
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpsellPreview;
