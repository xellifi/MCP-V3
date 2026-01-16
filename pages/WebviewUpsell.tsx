import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Check, ShoppingBag, Sparkles } from 'lucide-react';

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
    originalPrice?: string;
    cartAction: 'add' | 'replace';
}

const API_BASE = '';

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

    const formatPrice = (price: number | string) => {
        const num = typeof price === 'string' ? parseFloat(price.replace(/[^\d.]/g, '')) : price;
        return `₱${num.toLocaleString()}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
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
        <div className="min-h-screen bg-neutral-100">
            {/* Centered Container for Desktop */}
            <div className="max-w-lg mx-auto min-h-screen bg-white flex flex-col shadow-xl">
                {/* Header */}
                <div className="bg-neutral-50 px-5 py-4 border-b border-neutral-100 flex-shrink-0">
                    <div className="flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium text-neutral-600 uppercase tracking-wide">
                            Recommended for You
                        </span>
                    </div>
                </div>

                {/* Product Image */}
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

                    {/* Discount Badge */}
                    {originalPrice && originalPrice > price && (
                        <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-md">
                            {Math.round((1 - price / originalPrice) * 100)}% OFF
                        </div>
                    )}
                </div>

                {/* Product Info */}
                <div className="flex-1 p-5 overflow-y-auto">
                    <h2 className="text-lg font-semibold text-neutral-900 leading-tight">
                        {config.productName || config.headline || 'Special Offer'}
                    </h2>

                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-xl font-bold text-neutral-900">
                            {formatPrice(price)}
                        </span>
                        {originalPrice && originalPrice > price && (
                            <span className="text-sm text-neutral-400 line-through">
                                {formatPrice(originalPrice)}
                            </span>
                        )}
                    </div>

                    {config.description && (
                        <p className="text-sm text-neutral-500 mt-3 leading-relaxed">
                            {config.description}
                        </p>
                    )}
                </div>

                {/* Action Buttons - Fixed Bottom */}
                <div className="sticky bottom-0 p-4 bg-white border-t border-neutral-100 space-y-2 flex-shrink-0">
                    <button
                        onClick={handleAccept}
                        disabled={processing}
                        className="w-full py-4 bg-neutral-900 text-white font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-800 active:scale-[0.98] transition-all disabled:opacity-70"
                    >
                        {processing ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <Check className="w-5 h-5" />
                                <span>{config.buttonText || 'Add to Order'}</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleDecline}
                        disabled={processing}
                        className="w-full py-3 text-neutral-500 font-medium text-sm hover:text-neutral-700 transition-colors disabled:opacity-50"
                    >
                        No thanks, continue
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WebviewUpsell;
