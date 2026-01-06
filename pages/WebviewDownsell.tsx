import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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

const API_BASE = import.meta.env.VITE_API_URL || '';

const WebviewDownsell: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [config, setConfig] = useState<DownsellConfig | null>(null);
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
            await fetch(`${API_BASE}/api/webview/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    action: 'downsell_accept',
                    payload: {
                        productName: config.productName || config.headline,
                        productPrice: config.productPrice || parseFloat(config.price.replace(/[^0-9.]/g, '')) || 0,
                        productImage: config.productImage || config.imageUrl,
                        cartAction: config.cartAction
                    }
                })
            });

            await continueAndClose();
        } catch (err) {
            console.error('Error accepting downsell:', err);
            setProcessing(false);
        }
    };

    const handleDecline = async () => {
        if (processing) return;
        setProcessing(true);

        try {
            await fetch(`${API_BASE}/api/webview/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    action: 'downsell_decline',
                    payload: {}
                })
            });

            await continueAndClose();
        } catch (err) {
            console.error('Error declining downsell:', err);
            setProcessing(false);
        }
    };

    const continueAndClose = async () => {
        try {
            await fetch(`${API_BASE}/api/webview/continue`, {
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
            <div className="min-h-screen bg-gradient-to-br from-orange-600 to-red-700 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
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
    const bgColor = config.backgroundColor || '#ea580c';

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: bgColor }}>
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
                                    alt={config.productName || 'Product'}
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
                            {config.productName || config.headline || 'Product'}
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
                            onClick={handleAccept}
                            disabled={processing}
                            className="w-full py-3 px-6 rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50 bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                        >
                            {processing ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Check className="w-5 h-5" />
                                    {config.buttonText || "Yes, I Want This!"}
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleDecline}
                            disabled={processing}
                            className="w-full py-3 px-6 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 bg-slate-200 text-slate-600 hover:bg-slate-300"
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

export default WebviewDownsell;
