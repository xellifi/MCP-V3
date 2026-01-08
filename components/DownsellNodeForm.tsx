import React, { useState, useRef, useEffect } from 'react';
import {
    Tag, Type, Image, DollarSign, Palette,
    Upload, Link, Eye, Check, X,
    Clock, Timer, LogOut, ShoppingCart, ChevronLeft,
    ChevronRight, Smartphone, Monitor, Tablet, ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DownsellNodeFormProps {
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
        deliveryType?: 'immediate' | 'delayed' | 'fixed' | 'exit_intent';
        delayMinutes?: number;
        fixedHour?: number;
        fixedMinute?: number;
        cartAction?: 'add' | 'replace';
        productName?: string;
        productPrice?: number;
        useWebview?: boolean;
        imagePreviewSize?: number;
    };
    onChange: (config: any) => void;
    onClose?: () => void;
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
    { id: 'timing', title: 'Timing', icon: Clock },
    { id: 'action', title: 'Cart Action', icon: ShoppingCart }
];

const DownsellNodeForm: React.FC<DownsellNodeFormProps> = ({
    workspaceId,
    initialConfig,
    onChange,
    onClose
}) => {
    // ================== STATE ==================
    const [headline, setHeadline] = useState(initialConfig?.headline || 'Wait! Special Offer');
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
    const [price, setPrice] = useState(initialConfig?.price || '₱299');
    const [priceBadgeColor, setPriceBadgeColor] = useState(initialConfig?.priceBadgeColor || '#f59e0b');
    const [priceTextColor, setPriceTextColor] = useState(initialConfig?.priceTextColor || '#ffffff');
    const [description, setDescription] = useState(initialConfig?.description || 'Last chance discount!');
    const [descriptionColor, setDescriptionColor] = useState(initialConfig?.descriptionColor || '#ffffff');
    const [buttonText, setButtonText] = useState(initialConfig?.buttonText || 'Yes, I want this!');
    const [buttonBgColor, setButtonBgColor] = useState(initialConfig?.buttonBgColor || '#16a34a');
    const [buttonTextColor, setButtonTextColor] = useState(initialConfig?.buttonTextColor || '#ffffff');
    const [buttonBorderRadius, setButtonBorderRadius] = useState(initialConfig?.buttonBorderRadius ?? 12);
    const [showButtonIcon, setShowButtonIcon] = useState(initialConfig?.showButtonIcon ?? true);
    const [backgroundColor, setBackgroundColor] = useState(initialConfig?.backgroundColor || '#7c3aed');
    const [deliveryType, setDeliveryType] = useState<'immediate' | 'delayed' | 'fixed' | 'exit_intent'>(initialConfig?.deliveryType || 'exit_intent');
    const [delayMinutes, setDelayMinutes] = useState(initialConfig?.delayMinutes ?? 30);
    const [fixedHour, setFixedHour] = useState(initialConfig?.fixedHour ?? 12);
    const [fixedMinute, setFixedMinute] = useState(initialConfig?.fixedMinute ?? 0);
    const [cartAction, setCartAction] = useState<'add' | 'replace'>(initialConfig?.cartAction || 'replace');
    const [productName, setProductName] = useState(initialConfig?.productName || '');
    const [productPrice, setProductPrice] = useState(initialConfig?.productPrice || 0);
    const [useWebview, setUseWebview] = useState(initialConfig?.useWebview ?? false);

    // UI State
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
    const [mobileStep, setMobileStep] = useState(0);
    const [showMobilePreview, setShowMobilePreview] = useState(false);
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('mobile');
    const [imagePreviewSize, setImagePreviewSize] = useState(initialConfig?.imagePreviewSize ?? 100);

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
            buttonTextColor, buttonBorderRadius, showButtonIcon, backgroundColor,
            deliveryType, delayMinutes, fixedHour, fixedMinute, cartAction,
            productName: productName || headline,
            productPrice: parseFloat(price.replace(/[^0-9.]/g, '')) || 0,
            useWebview, imagePreviewSize, ...updates
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
            const fileName = `downsell-${Date.now()}-${file.name}`;
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
            <div className="flex flex-wrap gap-1.5 items-center">
                {PRESET_COLORS.map(c => (
                    <button key={c} type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onColorChange(c); }}
                        className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${value === c ? 'border-white scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }} />
                ))}
                <div className="relative w-6 h-6">
                    <div
                        className={`absolute inset-0 rounded-full border-2 ${!PRESET_COLORS.includes(value) ? 'border-white' : 'border-slate-500'}`}
                        style={{ backgroundColor: value }}
                    />
                    <input
                        type="color"
                        value={value}
                        onChange={(e) => onColorChange(e.target.value)}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
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
        mobile: { width: 280, height: 480, radius: 40, notch: true },
        tablet: { width: 340, height: 440, radius: 24, notch: false },
        desktop: { width: 440, height: 280, radius: 8, notch: false }
    };

    const DevicePreview = () => {
        const size = deviceSizes[previewDevice];
        // Scale factors for different devices
        const getImageSize = () => {
            // Desktop shows normal size image
            const base = previewDevice === 'desktop' ? 150 : previewDevice === 'tablet' ? 150 : 130;
            return base * (imagePreviewSize / 100);
        };
        const getFontSize = () => {
            return previewDevice === 'desktop' ? 'text-sm' : previewDevice === 'tablet' ? 'text-base' : 'text-sm';
        };
        const getDescFontSize = () => {
            return previewDevice === 'desktop' ? 'text-xs' : 'text-xs';
        };
        const getButtonPadding = () => {
            return previewDevice === 'desktop' ? 'py-2 text-xs' : 'py-2 text-xs';
        };
        const getPriceBadgeSize = () => {
            return previewDevice === 'desktop' ? 'w-10 h-10 text-[10px]' : 'w-11 h-11 text-xs';
        };
        const getContentPadding = () => {
            return previewDevice === 'desktop' ? 'p-3' : 'p-2';
        };
        const getCardPadding = () => {
            return previewDevice === 'desktop' ? 'p-4' : 'p-2.5';
        };
        // Desktop has white background, others have dark
        const getScreenBg = () => {
            return previewDevice === 'desktop' ? 'bg-white' : 'bg-gradient-to-b from-slate-800 to-slate-900';
        };
        const getStatusBarStyle = () => {
            return previewDevice === 'desktop'
                ? 'text-slate-500 bg-slate-100 border-b border-slate-200'
                : 'text-white/60';
        };

        return (
            <div className="flex flex-col items-center">
                <div className="relative" style={{ width: size.width, height: size.height }}>
                    <div
                        className={`w-full h-full shadow-2xl border-4 flex flex-col ${previewDevice === 'desktop' ? 'bg-slate-200 border-slate-400' : 'bg-slate-900 border-slate-700'}`}
                        style={{ borderRadius: size.radius }}
                    >
                        {size.notch && (
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-10" />
                        )}
                        <div
                            className={`w-full h-full overflow-hidden flex flex-col ${getScreenBg()}`}
                            style={{ borderRadius: Math.max(size.radius - 6, 4) }}
                        >
                            <div className={`h-5 flex-shrink-0 flex items-center justify-between px-3 text-[9px] ${getStatusBarStyle()}`}>
                                {previewDevice === 'desktop' ? (
                                    <>
                                        <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                            <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                                            <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                        </div>
                                        <span className="text-[8px] text-slate-400">mystore.com/downsell</span>
                                        <div></div>
                                    </>
                                ) : (
                                    <>
                                        <span>9:41</span>
                                        <span>⚡ 100%</span>
                                    </>
                                )}
                            </div>
                            <div className={`flex-1 overflow-y-auto ${getContentPadding()}`}>
                                <div className={`rounded-xl ${getCardPadding()}`} style={{ backgroundColor }}>
                                    {deliveryType === 'exit_intent' && (
                                        <div className={`text-center ${previewDevice === 'desktop' ? 'mb-0.5' : 'mb-1.5'}`}>
                                            <span className={`inline-flex items-center gap-0.5 bg-red-500/20 text-red-300 px-1 py-0.5 rounded-full ${previewDevice === 'desktop' ? 'text-[7px]' : 'text-[9px]'}`}>
                                                <LogOut className={previewDevice === 'desktop' ? 'w-2 h-2' : 'w-2.5 h-2.5'} /> WAIT!
                                            </span>
                                        </div>
                                    )}
                                    <div
                                        className={`text-center font-bold ${previewDevice === 'desktop' ? 'mb-1' : 'mb-2'} flex items-center justify-center gap-1 ${getFontSize()}`}
                                        style={{ color: headlineColor }}
                                    >
                                        {showEmoji && emojiType !== 'none' && <span className={previewDevice === 'desktop' ? 'text-[9px]' : 'text-xs'}>{getEmoji()}</span>}
                                        <span>{headline || 'Your Headline'}</span>
                                        {showEmoji && emojiType !== 'none' && <span className={previewDevice === 'desktop' ? 'text-[9px]' : 'text-xs'}>{getEmoji()}</span>}
                                    </div>
                                    <div className={`relative ${previewDevice === 'desktop' ? 'mb-1' : 'mb-2'} text-center`}>
                                        <div className="inline-block relative">
                                            <div
                                                className="overflow-hidden aspect-square"
                                                style={{
                                                    borderRadius: `${imageBorderRadius}px`,
                                                    border: `${previewDevice === 'desktop' ? 1 : Math.max(imageBorderWidth - 1, 2)}px solid ${imageBorderColor}`,
                                                    width: `${getImageSize()}px`,
                                                }}
                                            >
                                                {imageUrl ? (
                                                    <img src={imageUrl} alt="Product" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-slate-700/50 flex items-center justify-center">
                                                        <Image className={previewDevice === 'desktop' ? 'w-4 h-4' : 'w-7 h-7'} />
                                                    </div>
                                                )}
                                            </div>
                                            {price && (
                                                <div
                                                    className={`absolute -top-1 -right-1 rounded-full font-bold shadow-lg flex items-center justify-center ${getPriceBadgeSize()}`}
                                                    style={{ backgroundColor: priceBadgeColor, color: priceTextColor }}
                                                >
                                                    {price}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {description && (
                                        <p className={`text-center ${previewDevice === 'desktop' ? 'mb-1 line-clamp-1' : 'mb-2'} ${getDescFontSize()}`} style={{ color: descriptionColor }}>
                                            {description}
                                        </p>
                                    )}
                                    <button
                                        className={`w-full font-bold flex items-center justify-center gap-0.5 shadow-md ${getButtonPadding()}`}
                                        style={{ backgroundColor: buttonBgColor, color: buttonTextColor, borderRadius: `${buttonBorderRadius}px` }}
                                    >
                                        {showButtonIcon && <Check className={previewDevice === 'desktop' ? 'w-2 h-2' : 'w-3 h-3'} />}
                                        {buttonText || 'Yes, I want this!'}
                                    </button>
                                    <button className={`w-full ${previewDevice === 'desktop' ? 'py-0.5 mt-0.5 text-[8px]' : 'py-1 mt-1 text-[10px]'} text-white/50 underline`}>
                                        No thanks
                                    </button>
                                </div>
                            </div>
                            {/* Home indicator (mobile only) */}
                            {size.notch && (
                                <div className="h-4 flex-shrink-0 flex items-center justify-center">
                                    <div className="w-20 h-1 bg-white/30 rounded-full" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ================== FORM SECTIONS ==================
    const basicSection = (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Type className="w-4 h-4 text-amber-400" /> Basic Info
            </h3>
            <div>
                <label className="block text-xs text-slate-400 mb-1">Headline</label>
                <input type="text" value={headline}
                    onChange={(e) => { setHeadline(e.target.value); notifyChange({ headline: e.target.value }); }}
                    placeholder="e.g. Wait! Special Offer"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                <p className="text-[10px] text-slate-500 mt-0.5">Shown in the header banner</p>
            </div>
            <div>
                <label className="block text-xs text-slate-400 mb-1">Product Name</label>
                <input type="text" value={productName}
                    onChange={(e) => { setProductName(e.target.value); notifyChange({ productName: e.target.value }); }}
                    placeholder="e.g. Budget-Friendly Sneakers"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                <p className="text-[10px] text-slate-500 mt-0.5">Shown in the product name bar</p>
            </div>
            <ColorPicker value={headlineColor} onChange={(c) => { setHeadlineColor(c); notifyChange({ headlineColor: c }); }} label="Headline Color" />
            <Toggle value={showEmoji} onChange={(v) => { setShowEmoji(v); notifyChange({ showEmoji: v }); }} label="Show Emojis" />
            {showEmoji && (
                <div className="flex gap-2">
                    {EMOJI_OPTIONS.map(e => (
                        <button key={e.value} type="button" onClick={() => { setEmojiType(e.value as any); notifyChange({ emojiType: e.value }); }}
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

    const imageSection = (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Image className="w-4 h-4 text-rose-400" /> Product Image
            </h3>
            <div className="flex rounded-lg overflow-hidden border border-white/10">
                <button type="button" onClick={() => { setImageSource('url'); notifyChange({ imageSource: 'url' }); }}
                    className={`flex-1 py-2 text-xs flex items-center justify-center gap-1 ${imageSource === 'url' ? 'bg-teal-500/20 text-teal-400' : 'bg-black/20 text-slate-400'}`}>
                    <Link className="w-3 h-3" /> URL
                </button>
                <button type="button" onClick={() => { setImageSource('upload'); notifyChange({ imageSource: 'upload' }); }}
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
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}
                        className="w-full py-3 border-2 border-dashed border-white/20 rounded-lg text-slate-400 hover:border-teal-500/50 flex items-center justify-center gap-2">
                        {isUploading ? 'Uploading...' : <><Upload className="w-4 h-4" /> Click to upload</>}
                    </button>
                    {uploadError && <p className="text-xs text-red-400 mt-1">{uploadError}</p>}
                </div>
            )}
            <div>
                <label className="block text-xs text-slate-400 mb-1">Image Size: {imagePreviewSize}%</label>
                <input type="range" min="50" max="150" value={imagePreviewSize}
                    onChange={(e) => { setImagePreviewSize(Number(e.target.value)); notifyChange({ imagePreviewSize: Number(e.target.value) }); }}
                    className="w-full" />
            </div>
            <div>
                <label className="block text-xs text-slate-400 mb-1">Border Radius: {imageBorderRadius}px</label>
                <input type="range" min="0" max="50" value={imageBorderRadius}
                    onChange={(e) => { setImageBorderRadius(Number(e.target.value)); notifyChange({ imageBorderRadius: Number(e.target.value) }); }}
                    className="w-full" />
            </div>
            <ColorPicker value={imageBorderColor} onChange={(c) => { setImageBorderColor(c); notifyChange({ imageBorderColor: c }); }} label="Border Color" />
        </div>
    );

    const styleSection = (
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

    const TimingSection = () => (
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" /> Delivery Timing
            </h3>
            <div className="grid grid-cols-2 gap-2">
                {([
                    { id: 'exit_intent', icon: LogOut, label: 'Exit Intent', desc: 'When leaving' },
                    { id: 'immediate', icon: Check, label: 'Immediate', desc: 'Right away' },
                    { id: 'delayed', icon: Timer, label: 'Delayed', desc: 'After wait' },
                    { id: 'fixed', icon: Clock, label: 'Fixed Time', desc: 'Specific time' }
                ] as const).map(t => (
                    <button key={t.id} onClick={() => { setDeliveryType(t.id); notifyChange({ deliveryType: t.id }); }}
                        className={`p-2 rounded-lg border text-left ${deliveryType === t.id ? 'bg-cyan-500/20 border-cyan-500/50' : 'bg-black/30 border-white/10'}`}>
                        <t.icon className="w-4 h-4 text-cyan-400 mb-1" />
                        <div className="text-xs font-medium text-white">{t.label}</div>
                        <div className="text-[10px] text-slate-400">{t.desc}</div>
                    </button>
                ))}
            </div>
            {deliveryType === 'delayed' && (
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Delay: {delayMinutes} min</label>
                    <input type="range" min="1" max="120" value={delayMinutes}
                        onChange={(e) => { setDelayMinutes(Number(e.target.value)); notifyChange({ delayMinutes: Number(e.target.value) }); }}
                        className="w-full" />
                </div>
            )}
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
    // Generate preview URL for live preview
    const getPreviewUrl = () => {
        const previewConfig = {
            headline, headlineColor, showEmoji, emojiType, imageUrl, imageSource,
            imageBorderRadius, imageBorderColor, imageBorderWidth, price, priceBadgeColor,
            priceTextColor, description, descriptionColor, buttonText, buttonBgColor,
            buttonTextColor, buttonBorderRadius, showButtonIcon, backgroundColor,
            deliveryType, productName
        };
        // Use encodeURIComponent to handle unicode characters properly
        const encodedConfig = encodeURIComponent(JSON.stringify(previewConfig));
        return `/downsell-preview?config=${encodedConfig}`;
    };

    const openLivePreview = () => {
        const url = getPreviewUrl();
        console.log('Opening live preview:', url);
        window.open(url, '_blank');
    };

    // Modal width based on device selection
    const modalWidths = {
        mobile: 'max-w-3xl',
        tablet: 'max-w-3xl',
        desktop: 'max-w-7xl'
    };

    if (isDesktop) {
        return (
            <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-50 p-[15px] flex items-center justify-center">
                <div className={`w-full ${modalWidths[previewDevice]} h-full max-h-full flex flex-col bg-slate-800/50 rounded-2xl border border-white/10 overflow-hidden transition-all duration-300`}>
                    {/* Header with Device Switcher */}
                    <div className="flex-shrink-0 h-14 border-b border-white/10 flex items-center px-4 gap-4">
                        {/* Left: Title */}
                        <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                                <Tag className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-base font-bold text-white whitespace-nowrap">Downsell</span>
                        </div>

                        {/* Center: Device Switcher */}
                        <div className="flex-1 flex justify-center">
                            <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg p-1 border border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice('mobile')}
                                    className={`p-2 rounded-md transition-all ${previewDevice === 'mobile' ? 'bg-teal-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                                    title="Mobile"
                                >
                                    <Smartphone className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice('tablet')}
                                    className={`p-2 rounded-md transition-all ${previewDevice === 'tablet' ? 'bg-teal-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                                    title="Tablet"
                                >
                                    <Tablet className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice('desktop')}
                                    className={`p-2 rounded-md transition-all ${previewDevice === 'desktop' ? 'bg-teal-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                                    title="Desktop"
                                >
                                    <Monitor className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Right: Preview + Save + Close */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                type="button"
                                onClick={openLivePreview}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 rounded-lg text-teal-400 text-xs transition-colors"
                                title="Open Live Preview"
                            >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Preview</span>
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-teal-500 hover:bg-teal-600 rounded-lg text-white text-xs font-medium transition-colors"
                                title="Save Configuration"
                            >
                                <Check className="w-3.5 h-3.5" />
                                <span>Save</span>
                            </button>
                            {onClose && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                                    title="Close"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content - Responsive based on device */}
                    {previewDevice === 'desktop' ? (
                        <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
                            <div className="col-span-4 border-r border-white/10 p-6 overflow-y-auto custom-scrollbar">
                                {basicSection}
                                <div className="mt-6 pt-6 border-t border-white/10">{imageSection}</div>
                            </div>
                            <div className="col-span-4 border-r border-white/10 p-6 overflow-y-auto custom-scrollbar">
                                {styleSection}
                                <div className="mt-6 pt-6 border-t border-white/10"><TimingSection /></div>
                                <div className="mt-6 pt-6 border-t border-white/10"><ActionSection /></div>
                            </div>
                            <div className="col-span-4 p-6 flex items-center justify-center bg-slate-950/50 overflow-auto">
                                <DevicePreview />
                            </div>
                        </div>
                    ) : previewDevice === 'tablet' ? (
                        <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
                            <div className="border-r border-white/10 p-4 overflow-y-auto custom-scrollbar space-y-4">
                                {basicSection}
                                <div className="pt-4 border-t border-white/10">{imageSection}</div>
                                <div className="pt-4 border-t border-white/10">{styleSection}</div>
                                <div className="pt-4 border-t border-white/10"><TimingSection /></div>
                                <div className="pt-4 border-t border-white/10"><ActionSection /></div>
                            </div>
                            <div className="p-4 flex items-center justify-center bg-slate-950/50 overflow-auto">
                                <DevicePreview />
                            </div>
                        </div>
                    ) : (
                        // Mobile: 2-Column Layout (same as tablet - side by side)
                        <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
                            <div className="border-r border-white/10 p-4 overflow-y-auto custom-scrollbar space-y-4">
                                {basicSection}
                                <div className="pt-4 border-t border-white/10">{imageSection}</div>
                                <div className="pt-4 border-t border-white/10">{styleSection}</div>
                                <div className="pt-4 border-t border-white/10"><TimingSection /></div>
                                <div className="pt-4 border-t border-white/10"><ActionSection /></div>
                            </div>
                            <div className="p-4 flex items-center justify-center bg-slate-950/50 overflow-auto">
                                <DevicePreview />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ================== MOBILE: Step-by-Step Wizard ==================
    const currentStepContent = () => {
        switch (mobileStep) {
            case 0: return basicSection;
            case 1: return imageSection;
            case 2: return styleSection;
            case 3: return <TimingSection />;
            case 4: return <ActionSection />;
            default: return null;
        }
    };



    if (showMobilePreview) {
        return (
            <div className="min-h-screen bg-slate-900 p-4">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setShowMobilePreview(false)}
                        className="flex items-center gap-2 text-slate-400 text-sm">
                        <ChevronLeft className="w-4 h-4" /> Back to Editor
                    </button>
                    <button onClick={openLivePreview}
                        className="flex items-center gap-2 text-teal-400 text-sm bg-teal-500/20 px-3 py-1.5 rounded-lg hover:bg-teal-500/30 transition-colors">
                        <ExternalLink className="w-4 h-4" /> Open Live Preview
                    </button>
                </div>
                <div className="flex justify-center">
                    <DevicePreview />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col">
            <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white font-medium">Step {mobileStep + 1} of {WIZARD_STEPS.length}</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowMobilePreview(true)}
                            className="flex items-center gap-1 text-xs text-teal-400 bg-teal-500/20 px-2 py-1 rounded-lg">
                            <Eye className="w-3 h-3" /> Preview
                        </button>
                        <button onClick={openLivePreview}
                            className="flex items-center gap-1 text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded-lg"
                            title="Open Live Page Preview">
                            <ExternalLink className="w-3 h-3" />
                        </button>
                    </div>
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

            <div className="flex-1 p-4 overflow-y-auto">
                {currentStepContent()}
            </div>

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

export default DownsellNodeForm;
