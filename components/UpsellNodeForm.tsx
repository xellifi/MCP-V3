import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
    ShoppingBag, Type, Image, DollarSign, MousePointer2, Palette,
    Upload, Link, X, AlertCircle, Eye, Flame, Check, Sparkles,
    Circle, Square, RectangleHorizontal, ShoppingCart, ChevronLeft,
    ChevronRight, Smartphone, Monitor, Tablet
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UpsellNodeFormProps {
    workspaceId: string;
    initialConfig?: {
        headline?: string;
        headlineColor?: string;
        showEmoji?: boolean;
        emojiType?: 'fire' | 'star' | 'sparkle' | 'heart' | 'none';
        imageUrl?: string;
        imageSource?: 'url' | 'upload';
        imageBorderRadius?: number;
        imageBorderColor?: string;
        imageBorderWidth?: number;
        price?: string;
        priceBadgeColor?: string;
        priceTextColor?: string;
        description?: string;
        descriptionColor?: string;
        buttonText?: string;
        buttonBgColor?: string;
        buttonTextColor?: string;
        buttonBorderRadius?: number;
        showButtonIcon?: boolean;
        backgroundColor?: string;
        cartAction?: 'add' | 'replace';
        productName?: string;
        productPrice?: number;
        useWebview?: boolean;
    };
    onChange: (config: any) => void;
}

const EMOJI_OPTIONS = [
    { value: 'fire', label: '🔥', name: 'Fire' },
    { value: 'star', label: '⭐', name: 'Star' },
    { value: 'sparkle', label: '✨', name: 'Sparkle' },
    { value: 'heart', label: '❤️', name: 'Heart' },
    { value: 'none', label: '—', name: 'None' },
] as const;

const PRESET_COLORS = [
    '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2',
    '#2563eb', '#7c3aed', '#db2777', '#1f2937', '#ffffff',
];

const WIZARD_STEPS = [
    { id: 'basic', title: 'Basic Info', icon: Type },
    { id: 'image', title: 'Product Image', icon: Image },
    { id: 'style', title: 'Styling', icon: Palette },
    { id: 'action', title: 'Cart Action', icon: ShoppingCart }
];

const UpsellNodeForm: React.FC<UpsellNodeFormProps> = ({
    workspaceId,
    initialConfig,
    onChange
}) => {
    // ================== STATE ==================
    const [headline, setHeadline] = useState(initialConfig?.headline || 'Want to Add this item?');
    const [headlineColor, setHeadlineColor] = useState(initialConfig?.headlineColor || '#ffffff');
    const [showEmoji, setShowEmoji] = useState(initialConfig?.showEmoji ?? true);
    const [emojiType, setEmojiType] = useState<'fire' | 'star' | 'sparkle' | 'heart' | 'none'>(initialConfig?.emojiType || 'fire');
    const [imageUrl, setImageUrl] = useState(initialConfig?.imageUrl || '');
    const [imageSource, setImageSource] = useState<'url' | 'upload'>(initialConfig?.imageSource || 'url');
    const [imageBorderRadius, setImageBorderRadius] = useState(initialConfig?.imageBorderRadius ?? 16);
    const [imageBorderColor, setImageBorderColor] = useState(initialConfig?.imageBorderColor || '#ffffff');
    const [imageBorderWidth, setImageBorderWidth] = useState(initialConfig?.imageBorderWidth ?? 4);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [price, setPrice] = useState(initialConfig?.price || '₱588');
    const [priceBadgeColor, setPriceBadgeColor] = useState(initialConfig?.priceBadgeColor || '#10b981');
    const [priceTextColor, setPriceTextColor] = useState(initialConfig?.priceTextColor || '#ffffff');
    const [description, setDescription] = useState(initialConfig?.description || 'High quality shoes from Korea!');
    const [descriptionColor, setDescriptionColor] = useState(initialConfig?.descriptionColor || '#ffffff');
    const [buttonText, setButtonText] = useState(initialConfig?.buttonText || 'ok add this item!');
    const [buttonBgColor, setButtonBgColor] = useState(initialConfig?.buttonBgColor || '#3b82f6');
    const [buttonTextColor, setButtonTextColor] = useState(initialConfig?.buttonTextColor || '#ffffff');
    const [buttonBorderRadius, setButtonBorderRadius] = useState(initialConfig?.buttonBorderRadius ?? 12);
    const [showButtonIcon, setShowButtonIcon] = useState(initialConfig?.showButtonIcon ?? true);
    const [backgroundColor, setBackgroundColor] = useState(initialConfig?.backgroundColor || '#dc2626');
    const [cartAction, setCartAction] = useState<'add' | 'replace'>(initialConfig?.cartAction || 'add');
    const [productName, setProductName] = useState(initialConfig?.productName || '');
    const [productPrice, setProductPrice] = useState(initialConfig?.productPrice || 0);
    const [useWebview, setUseWebview] = useState(initialConfig?.useWebview ?? false);

    // UI State
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
    const [mobileStep, setMobileStep] = useState(0);
    const [showMobilePreview, setShowMobilePreview] = useState(false);
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('mobile');

    // Handle window resize
    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ================== HELPERS ==================
    const notifyChange = (updates: Partial<typeof initialConfig> = {}) => {
        onChange({
            headline, headlineColor, showEmoji, emojiType, imageUrl, imageSource,
            imageBorderRadius, imageBorderColor, imageBorderWidth, price, priceBadgeColor,
            priceTextColor, description, descriptionColor, buttonText, buttonBgColor,
            buttonTextColor, buttonBorderRadius, showButtonIcon, backgroundColor, cartAction,
            productName: productName || headline,
            productPrice: parseFloat(price.replace(/[^0-9.]/g, '')) || 0,
            useWebview, ...updates
        });
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { setUploadError('Please select an image'); return; }
        if (file.size > 5 * 1024 * 1024) { setUploadError('Max 5MB'); return; }

        setIsUploading(true);
        setUploadError('');
        try {
            const fileName = `upsell-${Date.now()}-${file.name}`;
            const filePath = `${workspaceId}/${fileName}`;
            const { error } = await supabase.storage.from('attachments').upload(filePath, file);
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filePath);
            setImageUrl(publicUrl);
            notifyChange({ imageUrl: publicUrl, imageSource: 'upload' });
        } catch (error: any) {
            setUploadError(error.message || 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    const getEmoji = () => EMOJI_OPTIONS.find(e => e.value === emojiType)?.label || '';

    // ================== COMPONENTS ==================
    const ColorPicker = ({ value, onChange: onColorChange, label }: { value: string; onChange: (c: string) => void; label: string }) => (
        <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400">{label}</label>
            <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map(c => (
                    <button key={c} onClick={() => onColorChange(c)}
                        className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${value === c ? 'border-white scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }} />
                ))}
                <div className="relative">
                    <input type="color" value={value} onChange={(e) => onColorChange(e.target.value)}
                        className="w-6 h-6 rounded-full cursor-pointer opacity-0 absolute inset-0" />
                    <div className="w-6 h-6 rounded-full border-2 border-dashed border-slate-500 flex items-center justify-center bg-gradient-to-br from-red-500 via-green-500 to-blue-500">
                        <Palette className="w-3 h-3 text-white" />
                    </div>
                </div>
            </div>
        </div>
    );

    const Toggle = ({ value, onChange: onToggle, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
        <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">{label}</label>
            <button onClick={() => onToggle(!value)} className={`w-12 h-6 rounded-full transition-all ${value ? 'bg-teal-500' : 'bg-slate-600'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
        </div>
    );

    // ================== PREVIEW (DEVICE MOCKUP) ==================
    const deviceSizes = {
        mobile: { width: 280, height: 560, radius: 40, notch: true },
        tablet: { width: 400, height: 560, radius: 24, notch: false },
        desktop: { width: 600, height: 400, radius: 12, notch: false }
    };

    const DevicePreview = () => {
        const size = deviceSizes[previewDevice];
        return (
            <div className="flex flex-col items-center">
                <div className="relative" style={{ width: size.width, height: size.height }}>
                    {/* Device Frame */}
                    <div
                        className="w-full h-full bg-slate-900 shadow-2xl border-4 border-slate-700 flex flex-col"
                        style={{ borderRadius: size.radius }}
                    >
                        {/* Notch (mobile only) */}
                        {size.notch && (
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-10" />
                        )}
                        {/* Screen */}
                        <div
                            className="w-full h-full bg-gradient-to-b from-slate-800 to-slate-900 overflow-hidden flex flex-col"
                            style={{ borderRadius: Math.max(size.radius - 6, 4) }}
                        >
                            {/* Status bar */}
                            <div className="h-6 flex items-center justify-between px-4 text-[10px] text-white/60">
                                <span>9:41</span>
                                <span>⚡ 100%</span>
                            </div>
                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-3">
                                <div className="rounded-2xl p-4" style={{ backgroundColor }}>
                                    {/* Headline */}
                                    <div
                                        className={`text-center font-bold mb-3 flex items-center justify-center gap-2 ${previewDevice === 'desktop' ? 'text-xl' : previewDevice === 'tablet' ? 'text-lg' : 'text-sm'}`}
                                        style={{ color: headlineColor }}
                                    >
                                        {showEmoji && emojiType !== 'none' && <span>{getEmoji()}</span>}
                                        <span>{headline || 'Your Headline'}</span>
                                        {showEmoji && emojiType !== 'none' && <span>{getEmoji()}</span>}
                                    </div>
                                    {/* Image */}
                                    <div className="relative mb-3">
                                        <div
                                            className="overflow-hidden aspect-square"
                                            style={{
                                                borderRadius: `${imageBorderRadius}px`,
                                                border: `${imageBorderWidth}px solid ${imageBorderColor}`,
                                                maxWidth: previewDevice === 'desktop' ? '300px' : '100%',
                                                margin: previewDevice === 'desktop' ? '0 auto' : undefined
                                            }}
                                        >
                                            {imageUrl ? (
                                                <img src={imageUrl} alt="Product" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-slate-700/50 flex items-center justify-center">
                                                    <Image className="w-10 h-10 text-slate-500" />
                                                </div>
                                            )}
                                        </div>
                                        {price && (
                                            <div
                                                className={`absolute -top-2 -right-2 px-3 py-1 rounded-full font-bold shadow-lg border border-dashed border-white/30 ${previewDevice === 'desktop' ? 'text-base' : 'text-xs'}`}
                                                style={{ backgroundColor: priceBadgeColor, color: priceTextColor }}
                                            >
                                                {price}
                                            </div>
                                        )}
                                    </div>
                                    {/* Description */}
                                    {description && (
                                        <p className={`text-center mb-3 ${previewDevice === 'desktop' ? 'text-base' : 'text-xs'}`} style={{ color: descriptionColor }}>
                                            {description}
                                        </p>
                                    )}
                                    {/* Button */}
                                    <button
                                        className={`w-full font-bold flex items-center justify-center gap-2 shadow-lg ${previewDevice === 'desktop' ? 'py-3 text-base' : 'py-2 text-xs'}`}
                                        style={{ backgroundColor: buttonBgColor, color: buttonTextColor, borderRadius: `${buttonBorderRadius}px` }}
                                    >
                                        {showButtonIcon && <Check className="w-4 h-4" />}
                                        {buttonText || 'Add to Cart'}
                                    </button>
                                </div>
                            </div>
                            {/* Home indicator (mobile only) */}
                            {size.notch && (
                                <div className="h-5 flex items-center justify-center">
                                    <div className="w-24 h-1 bg-white/30 rounded-full" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ================== FORM SECTIONS ==================
    const BasicSection = () => (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Type className="w-4 h-4 text-amber-400" /> Basic Info
            </h3>
            <div>
                <label className="block text-xs text-slate-400 mb-1">Headline</label>
                <input type="text" value={headline}
                    onChange={(e) => { setHeadline(e.target.value); notifyChange({ headline: e.target.value }); }}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <ColorPicker value={headlineColor} onChange={(c) => { setHeadlineColor(c); notifyChange({ headlineColor: c }); }} label="Headline Color" />
            <Toggle value={showEmoji} onChange={(v) => { setShowEmoji(v); notifyChange({ showEmoji: v }); }} label="Show Emojis" />
            {showEmoji && (
                <div className="flex gap-2">
                    {EMOJI_OPTIONS.map(e => (
                        <button key={e.value} onClick={() => { setEmojiType(e.value as any); notifyChange({ emojiType: e.value }); }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${emojiType === e.value ? 'bg-teal-500/30 border-teal-500' : 'bg-black/30 border-white/10'} border`}>
                            {e.label}
                        </button>
                    ))}
                </div>
            )}
            <div>
                <label className="block text-xs text-slate-400 mb-1">Price</label>
                <input type="text" value={price}
                    onChange={(e) => { setPrice(e.target.value); notifyChange({ price: e.target.value }); }}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
                <label className="block text-xs text-slate-400 mb-1">Description</label>
                <textarea value={description}
                    onChange={(e) => { setDescription(e.target.value); notifyChange({ description: e.target.value }); }}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white h-16 resize-none" />
            </div>
        </div>
    );

    const ImageSection = () => (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Image className="w-4 h-4 text-rose-400" /> Product Image
            </h3>
            <div className="flex rounded-lg overflow-hidden border border-white/10">
                <button onClick={() => { setImageSource('url'); notifyChange({ imageSource: 'url' }); }}
                    className={`flex-1 py-2 text-xs flex items-center justify-center gap-1 ${imageSource === 'url' ? 'bg-teal-500/20 text-teal-400' : 'bg-black/20 text-slate-400'}`}>
                    <Link className="w-3 h-3" /> URL
                </button>
                <button onClick={() => { setImageSource('upload'); notifyChange({ imageSource: 'upload' }); }}
                    className={`flex-1 py-2 text-xs flex items-center justify-center gap-1 ${imageSource === 'upload' ? 'bg-teal-500/20 text-teal-400' : 'bg-black/20 text-slate-400'}`}>
                    <Upload className="w-3 h-3" /> Upload
                </button>
            </div>
            {imageSource === 'url' ? (
                <input type="url" value={imageUrl} placeholder="https://..."
                    onChange={(e) => { setImageUrl(e.target.value); notifyChange({ imageUrl: e.target.value }); }}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
            ) : (
                <div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={isUploading}
                        className="w-full py-3 border-2 border-dashed border-white/20 rounded-lg text-slate-400 hover:border-teal-500/50 flex items-center justify-center gap-2">
                        {isUploading ? 'Uploading...' : <><Upload className="w-4 h-4" /> Click to upload</>}
                    </button>
                    {uploadError && <p className="text-xs text-red-400 mt-1">{uploadError}</p>}
                </div>
            )}
            <div>
                <label className="block text-xs text-slate-400 mb-1">Border Radius: {imageBorderRadius}px</label>
                <input type="range" min="0" max="50" value={imageBorderRadius}
                    onChange={(e) => { setImageBorderRadius(Number(e.target.value)); notifyChange({ imageBorderRadius: Number(e.target.value) }); }}
                    className="w-full" />
            </div>
            <ColorPicker value={imageBorderColor} onChange={(c) => { setImageBorderColor(c); notifyChange({ imageBorderColor: c }); }} label="Border Color" />
        </div>
    );

    const StyleSection = () => (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-400" /> Styling
            </h3>
            <ColorPicker value={backgroundColor} onChange={(c) => { setBackgroundColor(c); notifyChange({ backgroundColor: c }); }} label="Background Color" />
            <ColorPicker value={priceBadgeColor} onChange={(c) => { setPriceBadgeColor(c); notifyChange({ priceBadgeColor: c }); }} label="Price Badge Color" />
            <div>
                <label className="block text-xs text-slate-400 mb-1">Button Text</label>
                <input type="text" value={buttonText}
                    onChange={(e) => { setButtonText(e.target.value); notifyChange({ buttonText: e.target.value }); }}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <ColorPicker value={buttonBgColor} onChange={(c) => { setButtonBgColor(c); notifyChange({ buttonBgColor: c }); }} label="Button Color" />
            <Toggle value={showButtonIcon} onChange={(v) => { setShowButtonIcon(v); notifyChange({ showButtonIcon: v }); }} label="Show Button Icon" />
            <div>
                <label className="block text-xs text-slate-400 mb-1">Button Radius: {buttonBorderRadius}px</label>
                <input type="range" min="0" max="24" value={buttonBorderRadius}
                    onChange={(e) => { setButtonBorderRadius(Number(e.target.value)); notifyChange({ buttonBorderRadius: Number(e.target.value) }); }}
                    className="w-full" />
            </div>
        </div>
    );

    const ActionSection = () => (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-teal-400" /> Cart Action
            </h3>
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setCartAction('add'); notifyChange({ cartAction: 'add' }); }}
                    className={`p-3 rounded-lg border text-left ${cartAction === 'add' ? 'bg-teal-500/20 border-teal-500/50' : 'bg-black/30 border-white/10'}`}>
                    <div className="text-sm font-medium text-white">➕ Add</div>
                    <div className="text-xs text-slate-400">Add to cart</div>
                </button>
                <button onClick={() => { setCartAction('replace'); notifyChange({ cartAction: 'replace' }); }}
                    className={`p-3 rounded-lg border text-left ${cartAction === 'replace' ? 'bg-orange-500/20 border-orange-500/50' : 'bg-black/30 border-white/10'}`}>
                    <div className="text-sm font-medium text-white">🔄 Replace</div>
                    <div className="text-xs text-slate-400">Replace main</div>
                </button>
            </div>
            <div className="pt-3 border-t border-white/10">
                <Toggle value={useWebview} onChange={(v) => { setUseWebview(v); notifyChange({ useWebview: v }); }} label="Use Webview Display" />
                {useWebview && (
                    <div className="mt-2 p-2 bg-teal-500/10 border border-teal-500/30 rounded-lg">
                        <p className="text-xs text-teal-300">✨ Custom webview page instead of Facebook template</p>
                    </div>
                )}
            </div>
        </div>
    );

    // ================== LAYOUTS ==================
    // Desktop: 3-column fullscreen
    if (isDesktop) {
        return (
            <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-50 flex flex-col">
                {/* Header */}
                <div className="flex-shrink-0 h-14 border-b border-white/10 flex items-center justify-between px-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                            <ShoppingBag className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-lg font-bold text-white">Configure Upsell Offer</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Monitor className="w-4 h-4" /> Desktop View
                    </div>
                </div>

                {/* 3-Column Content */}
                <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
                    {/* Column 1: Basic + Image */}
                    <div className="col-span-4 border-r border-white/10 p-6 overflow-y-auto custom-scrollbar">
                        <BasicSection />
                        <div className="mt-6 pt-6 border-t border-white/10">
                            <ImageSection />
                        </div>
                    </div>

                    {/* Column 2: Style + Action */}
                    <div className="col-span-4 border-r border-white/10 p-6 overflow-y-auto custom-scrollbar">
                        <StyleSection />
                        <div className="mt-6 pt-6 border-t border-white/10">
                            <ActionSection />
                        </div>
                    </div>

                    {/* Column 3: Phone Preview */}
                    <div className="col-span-4 p-6 flex items-center justify-center bg-slate-950/50">
                        <PhonePreview />
                    </div>
                </div>
            </div>
        );
    }

    // ================== MOBILE: Step-by-Step Wizard ==================
    const currentStepContent = () => {
        switch (mobileStep) {
            case 0: return <BasicSection />;
            case 1: return <ImageSection />;
            case 2: return <StyleSection />;
            case 3: return <ActionSection />;
            default: return null;
        }
    };

    if (showMobilePreview) {
        return (
            <div className="min-h-screen bg-slate-900 p-4">
                <button onClick={() => setShowMobilePreview(false)}
                    className="mb-4 flex items-center gap-2 text-slate-400 text-sm">
                    <ChevronLeft className="w-4 h-4" /> Back to Editor
                </button>
                <div className="flex justify-center">
                    <PhonePreview />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col">
            {/* Progress Bar */}
            <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white font-medium">Step {mobileStep + 1} of {WIZARD_STEPS.length}</span>
                    <button onClick={() => setShowMobilePreview(true)}
                        className="flex items-center gap-1 text-xs text-teal-400 bg-teal-500/20 px-2 py-1 rounded-lg">
                        <Eye className="w-3 h-3" /> Preview
                    </button>
                </div>
                <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 transition-all" style={{ width: `${((mobileStep + 1) / WIZARD_STEPS.length) * 100}%` }} />
                </div>
                <div className="flex mt-2">
                    {WIZARD_STEPS.map((step, i) => (
                        <div key={step.id} className={`flex-1 text-center text-[10px] ${i <= mobileStep ? 'text-teal-400' : 'text-slate-500'}`}>
                            {step.title}
                        </div>
                    ))}
                </div>
            </div>

            {/* Step Content */}
            <div className="flex-1 p-4 overflow-y-auto">
                {currentStepContent()}
            </div>

            {/* Navigation */}
            <div className="flex-shrink-0 p-4 border-t border-white/10 flex gap-3">
                <button onClick={() => setMobileStep(Math.max(0, mobileStep - 1))} disabled={mobileStep === 0}
                    className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 ${mobileStep === 0 ? 'bg-slate-700 text-slate-500' : 'bg-slate-700 text-white'}`}>
                    <ChevronLeft className="w-4 h-4" /> Back
                </button>
                {mobileStep < WIZARD_STEPS.length - 1 ? (
                    <button onClick={() => setMobileStep(mobileStep + 1)}
                        className="flex-1 py-3 rounded-lg bg-teal-500 text-white flex items-center justify-center gap-2">
                        Next <ChevronRight className="w-4 h-4" />
                    </button>
                ) : (
                    <button onClick={() => setShowMobilePreview(true)}
                        className="flex-1 py-3 rounded-lg bg-green-500 text-white flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" /> Done
                    </button>
                )}
            </div>
        </div>
    );
};

export default UpsellNodeForm;
