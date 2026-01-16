import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Check, X, Sparkles } from 'lucide-react';

interface DownsellConfig {
    headline: string;
    headlineColor: string;
    headlineBgColor: string;
    showEmoji: boolean;
    emojiType: 'fire' | 'star' | 'sparkle' | 'heart' | 'none';
    imageUrl: string;
    imageBorderRadius: number;
    imageBorderColor: string;
    imageBorderWidth: number;
    price: string;
    priceBadgeColor: string;
    priceTextColor: string;
    priceBadgeSize: number;
    description: string;
    descriptionColor: string;
    buttonText: string;
    buttonBgColor: string;
    buttonTextColor: string;
    buttonBorderRadius: number;
    showButtonIcon: boolean;
    backgroundColor: string;
    pageBgColor: string;
    productName?: string;
    showProductName?: boolean;
    productNameBgColor?: string;
    productNameTextColor?: string;
    productNameFontSize?: number;
    productNameBorderRadius?: number;
    productNameFullWidth?: boolean;
    showCountdown?: boolean;
    countdownMinutes?: number;
    countdownPosition?: 'above' | 'middle' | 'below';
    countdownShowBg?: boolean;
    countdownBgColor?: string;
    countdownTextColor?: string;
    countdownFontSize?: number;
    countdownBorderRadius?: number;
    countdownFullWidth?: boolean;
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

const API_BASE = '';

const WebviewDownsell: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [config, setConfig] = useState<DownsellConfig | null>(null);
    const [countdown, setCountdown] = useState<number>(0);
    const [processing, setProcessing] = useState(false);

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
            await fetch(`${API_BASE}/api/webview?route=action`, {
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
        const bgColorVal = config.countdownBgColor || '#ec4899';
        const textColor = config.countdownTextColor || '#ffffff';
        const fontSize = config.countdownFontSize || 24;
        const borderRadius = config.countdownBorderRadius ?? 16;
        const fullWidth = config.countdownFullWidth ?? false;

        const hours = Math.floor(countdown / 3600);
        const minutes = Math.floor((countdown % 3600) / 60);
        const seconds = countdown % 60;

        const getBackground = () => {
            if (!showBg) return 'transparent';
            return `linear-gradient(135deg, ${bgColorVal} 0%, ${adjustColor(bgColorVal, -30)} 100%)`;
        };

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
                <span className="uppercase tracking-wider mt-1.5 font-medium opacity-90" style={{ color: textColor, fontSize: `${Math.max(10, fontSize / 2.4)}px` }}>
                    {label}
                </span>
            </div>
        );

        const Separator = () => (
            <span className="font-bold mx-1 self-start" style={{ color: textColor, fontSize: `${fontSize}px`, marginTop: `${fontSize / 3}px` }}>:</span>
        );

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
                    <span className="font-bold uppercase tracking-widest" style={{ color: textColor, fontSize: `${Math.max(12, fontSize / 2)}px` }}>
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
    const pageBgColor = config.pageBgColor || '#ffffff';
    const headlineBgColor = config.headlineBgColor || '#f59e0b';
    const priceBadgeSize = config.priceBadgeSize || 80;

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: pageBgColor }}>
            {/* Main Content with Card */}
            <div className="flex-1 flex items-center justify-center p-4 md:p-8">
                <div
                    className="w-full max-w-md bg-white/10 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-white/20"
                    style={{ backgroundColor: bgColor }}
                >
                    {/* Headline Banner */}
                    <div className="py-4 px-6 text-center" style={{ backgroundColor: headlineBgColor }}>
                        <h1
                            className="text-lg md:text-xl font-bold uppercase tracking-wider"
                            style={{ color: config.headlineColor || '#1f2937' }}
                        >
                            {emoji && <span className="mr-2">{emoji}</span>}
                            {config.headline || 'WAIT! SPECIAL OFFER'}
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
                                    <img src={config.imageUrl} alt="Product" className="w-full h-full object-cover" />
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

                        {/* Product Name Bar */}
                        {(config.showProductName ?? true) && (
                            <div
                                className={`py-3 text-center my-3 ${config.productNameFullWidth ? '-mx-6 px-6' : 'mx-0 rounded-lg'}`}
                                style={{
                                    backgroundColor: config.productNameBgColor || '#6b7280',
                                    borderRadius: config.productNameFullWidth ? '0px' : `${config.productNameBorderRadius || 8}px`,
                                }}
                            >
                                <div
                                    className="font-bold uppercase tracking-wide"
                                    style={{
                                        color: config.productNameTextColor || '#ffffff',
                                        fontSize: `${config.productNameFontSize || 16}px`
                                    }}
                                >
                                    {config.productName || 'PRODUCT NAME'}
                                </div>
                            </div>
                        )}

                        {/* Countdown Timer - Below Position */}
                        {config.countdownPosition === 'below' && <CountdownTimer />}

                        {/* Description */}
                        {config.description && (
                            <p className="text-center mb-4" style={{ color: config.descriptionColor || '#ffffff' }}>
                                {config.description}
                            </p>
                        )}

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={handleAccept}
                                disabled={processing}
                                className="w-full py-4 px-6 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-70"
                                style={{
                                    backgroundColor: config.buttonBgColor || '#16a34a',
                                    color: config.buttonTextColor || '#ffffff',
                                    borderRadius: `${config.buttonBorderRadius || 12}px`,
                                }}
                            >
                                {processing ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        {config.showButtonIcon && <Check className="w-5 h-5" />}
                                        {config.buttonText || "Yes, I Want This!"}
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleDecline}
                                disabled={processing}
                                className="w-full py-3 px-6 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95 bg-red-500 text-white disabled:opacity-70"
                                style={{ borderRadius: `${config.buttonBorderRadius || 12}px` }}
                            >
                                <X className="w-4 h-4" />
                                No Thanks
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WebviewDownsell;
