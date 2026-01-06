import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
    productName: string;
    productPrice: number;
    productImage: string;
    cartAction: 'add' | 'replace';
}

const EMOJI_MAP: Record<string, string> = {
    fire: '🔥',
    star: '⭐',
    sparkle: '✨',
    heart: '❤️',
    none: ''
};

const API_BASE = '';  // Use relative URLs for API calls

const WebviewUpsell: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [config, setConfig] = useState<UpsellConfig | null>(null);
    const [processing, setProcessing] = useState(false);

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

            setConfig(data.session.page_config);
        } catch (err: any) {
            setError(err.message || 'Failed to load offer');
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        if (processing || !config) return;
        setProcessing(true);

        try {
            await fetch(`${API_BASE}/api/webview?route=action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    action: 'upsell_accept',
                    payload: {
                        productName: config.productName || config.headline,
                        productPrice: config.productPrice || parseFloat(config.price.replace(/[^0-9.]/g, '')) || 0,
                        productImage: config.productImage || config.imageUrl,
                        cartAction: config.cartAction
                    }
                })
            });

            // Continue flow and close webview
            await continueAndClose();
        } catch (err) {
            console.error('Error accepting upsell:', err);
            setProcessing(false);
        }
    };

    const handleDecline = async () => {
        if (processing) return;
        setProcessing(true);

        try {
            await fetch(`${API_BASE}/api/webview?route=action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    action: 'upsell_decline',
                    payload: {}
                })
            });

            await continueAndClose();
        } catch (err) {
            console.error('Error declining upsell:', err);
            setProcessing(false);
        }
    };

    const continueAndClose = async () => {
        try {
            await fetch(`${API_BASE}/api/webview?route=continue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, closeReason: 'user_action' })
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
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
    const bgColor = config.backgroundColor || '#dc2626';
    const headlineColor = config.headlineColor || '#ffffff';

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: bgColor }}>
            {/* Headline Banner - Yellow/Gold like user's design */}
            <div
                className="py-4 px-6 text-center"
                style={{ backgroundColor: '#f59e0b' }}
            >
                <h1
                    className="text-lg md:text-xl font-bold uppercase tracking-wider"
                    style={{ color: '#1f2937' }}
                >
                    {emoji && <span className="mr-2">{emoji}</span>}
                    ADD THIS TO YOUR CART?
                    {emoji && <span className="ml-2">{emoji}</span>}
                </h1>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-4 flex flex-col items-center justify-center">
                {/* Product Image with Price Badge */}
                <div className="relative w-full max-w-[300px] mx-auto">
                    <div
                        className="overflow-hidden aspect-square shadow-2xl"
                        style={{
                            borderRadius: `${config.imageBorderRadius || 16}px`,
                            border: `${config.imageBorderWidth || 4}px solid ${config.imageBorderColor || '#ffffff'}`,
                        }}
                    >
                        {config.imageUrl ? (
                            <img
                                src={config.imageUrl}
                                alt={config.productName || 'Product'}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                                <Sparkles className="w-16 h-16 text-slate-400" />
                            </div>
                        )}
                    </div>

                    {/* Price Badge */}
                    <div
                        className="absolute -top-3 -right-3 px-5 py-2 rounded-full font-bold text-xl shadow-lg transform rotate-12"
                        style={{
                            backgroundColor: config.priceBadgeColor || '#f59e0b',
                            color: config.priceTextColor || '#ffffff',
                        }}
                    >
                        {config.price || '₱0'}
                    </div>
                </div>

                {/* Product Name Bar - Green like user's design */}
                <div
                    className="w-full max-w-[300px] mt-6 py-3 px-4 text-center"
                    style={{ backgroundColor: '#16a34a' }}
                >
                    <h2 className="text-white font-bold text-xl uppercase tracking-wider">
                        {config.productName || config.headline || 'PRODUCT'}
                    </h2>
                </div>

                {/* Description */}
                {config.description && (
                    <p
                        className="mt-4 text-center max-w-[280px] text-sm"
                        style={{ color: config.descriptionColor || '#ffffff' }}
                    >
                        {config.description}
                    </p>
                )}
            </div>

            {/* Action Buttons */}
            <div className="p-4 flex gap-3">
                <button
                    onClick={handleAccept}
                    disabled={processing}
                    className="flex-1 py-4 px-6 rounded-full font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50"
                    style={{
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                    }}
                >
                    {processing ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <Check className="w-5 h-5" />
                            {config.buttonText || 'Yes Add this'}
                        </>
                    )}
                </button>

                <button
                    onClick={handleDecline}
                    disabled={processing}
                    className="flex-1 py-4 px-6 rounded-full font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50"
                    style={{
                        backgroundColor: '#dc2626',
                        color: '#ffffff',
                    }}
                >
                    <X className="w-5 h-5" />
                    No Thanks
                </button>
            </div>

            <style>{`
                @keyframes bounce-in {
                    0% { transform: scale(0.8); opacity: 0; }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-bounce-in { animation: bounce-in 0.4s ease-out; }
            `}</style>
        </div>
    );
};

export default WebviewUpsell;
