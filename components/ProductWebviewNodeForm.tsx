import React, { useState, useRef, useMemo, useEffect, memo, useCallback } from 'react';
import {
    ShoppingBag, Type, Image, DollarSign, MousePointer2, Palette,
    Upload, Link, X, AlertCircle, Eye, Flame, Check, Sparkles,
    Circle, Square, RectangleHorizontal, ShoppingCart, ChevronLeft,
    ChevronRight, Smartphone, Monitor, Tablet, ExternalLink, RotateCcw, Save, Trash2,
    ChevronDown, ChevronUp, Clock, Timer, ArrowUp, PlusCircle, Globe, Minus, Plus, Settings,
    MessageSquare, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

interface ProductWebviewNodeFormProps {
    workspaceId: string;
    initialConfig?: {
        headline?: string;
        headlineColor?: string;
        headlineBgColor?: string;
        headlineAnimation?: 'none' | 'blink' | 'shake';
        headlineAnimationSpeed?: number;
        showEmoji?: boolean;
        emojiType?: 'fire' | 'star' | 'sparkle' | 'heart' | 'none';
        imageUrl?: string;
        imageSource?: 'url' | 'upload' | 'gallery';
        imageBorderRadius?: number;
        imageBorderColor?: string;
        imageBorderWidth?: number;
        price?: string;
        priceBadgeColor?: string;
        priceTextColor?: string;
        priceBadgeSize?: number;
        description?: string;
        descriptionColor?: string;
        buttonText?: string;
        buttonBgColor?: string;
        buttonTextColor?: string;
        buttonBorderRadius?: number;
        showButtonIcon?: boolean;
        backgroundColor?: string;
        pageBackgroundColor?: string;
        showProductName?: boolean;
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
        cartAction?: 'add' | 'replace';
        productName?: string;
        productPrice?: number;
        useWebview?: boolean;
        imagePreviewSize?: number;
        // Product Webview specific - action buttons
        enableQuantitySelector?: boolean;
        enableColorSelector?: boolean;
        enableSizeSelector?: boolean;
        colorOptions?: string[];
        sizeOptions?: string[];
        // Add to Cart action trigger
        onAddToCartAction?: 'upsell' | 'downsell' | 'nextStep' | 'savedFlow';
        onAddToCartFlowId?: string;
        // Follow-up trigger settings
        enableFollowup?: boolean;
        followupTimeout?: number;
        followupNodeType?: 'textNode' | 'followupNode';
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
    { id: 'action', title: 'Cart Action', icon: ShoppingCart }
];

// Enhanced ColorPicker with "None" option and Reset button
const ColorPickerComponent = memo(({
    value,
    onChange,
    label,
    defaultValue,
    allowNone = false
}: {
    value: string;
    onChange: (c: string) => void;
    label: string;
    defaultValue?: string;
    allowNone?: boolean;
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const { isDark } = useTheme();

    const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    }, [onChange]);

    const isNone = value === 'transparent' || value === 'none' || value === '';

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className={labelClass(isDark)}>{label}</label>
                {defaultValue && (
                    <button
                        type="button"
                        onClick={() => onChange(defaultValue)}
                        className={`p-1 transition-colors ${isDark ? 'text-slate-500 hover:text-teal-400' : 'text-slate-400 hover:text-teal-600'}`}
                        title="Reset to default"
                    >
                        <RotateCcw className="w-3 h-3" />
                    </button>
                )}
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
                {/* None Option */}
                {allowNone && (
                    <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange('transparent'); }}
                        type="button"
                        className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center ${isNone ? 'border-white scale-110' : 'border-slate-500'}`}
                        style={{ background: 'linear-gradient(135deg, #334155 45%, transparent 45%, transparent 55%, #334155 55%), linear-gradient(45deg, #334155 45%, #ef4444 45%, #ef4444 55%, #334155 55%)' }}
                        title="None / Transparent"
                    >
                        <X className="w-3 h-3 text-red-400" />
                    </button>
                )}
                {/* Preset Colors */}
                {PRESET_COLORS.map(c => (
                    <button key={c} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(c); }}
                        type="button"
                        className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${value === c ? 'border-white scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }} />
                ))}
                {/* Custom Color Picker */}
                <label className="relative w-7 h-7 group cursor-pointer">
                    <div
                        className={`absolute inset-0 rounded-full border-2 flex items-center justify-center pointer-events-none ${!PRESET_COLORS.includes(value) && !isNone ? 'border-white' : 'border-slate-500'}`}
                        style={{ background: `conic-gradient(from 0deg, red, yellow, lime, cyan, blue, magenta, red)` }}
                    >
                        <Palette className="w-3.5 h-3.5 text-white drop-shadow-md" />
                    </div>
                    <input
                        ref={inputRef}
                        type="color"
                        value={isNone ? '#000000' : value}
                        onChange={handleColorChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </label>
            </div>
        </div>
    );
});
ColorPickerComponent.displayName = 'ColorPicker';

// Collapsible Section Component
// Helper constants for consistent styling
const inputClass = (isDark: boolean) => `w-full ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500/50 outline-none transition-all`;
const labelClass = (isDark: boolean) => `block text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'} mb-1`;
const sectionBorderClass = (isDark: boolean) => isDark ? 'border-white/10' : 'border-slate-200';
const buttonBaseClass = (isDark: boolean) => `p-2 rounded-lg border transition-all ${isDark ? 'hover:bg-white/5 border-transparent' : 'hover:bg-slate-100 border-transparent'}`;
const activeInfoClass = (isDark: boolean) => isDark ? 'bg-teal-500/10 border-teal-500/50 text-teal-400' : 'bg-teal-50 border-teal-500 text-teal-600';
const inactiveClass = (isDark: boolean) => isDark ? 'bg-slate-800/50 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500';

// Collapsible Section Component
const CollapsibleSection = ({
    title,
    icon: Icon,
    children,
    defaultOpen = true
}: {
    title: string;
    icon?: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const { isDark } = useTheme();

    return (
        <div className={`rounded-xl overflow-hidden border ${isDark ? 'bg-black/20 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4 text-teal-500" />}
                    <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</span>
                </div>
                {isOpen ? (
                    <ChevronUp className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                ) : (
                    <ChevronDown className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                )}
            </button>
            {isOpen && (
                <div className={`px-4 pb-4 space-y-4 border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                    {children}
                </div>
            )}
        </div>
    );
};

// Reset Button Component (kept for backward compatibility)
const ResetButton = ({ onClick, title = 'Reset to default' }: { onClick: () => void; title?: string }) => (
    <button
        type="button"
        onClick={onClick}
        title={title}
        className="p-1 text-slate-500 hover:text-white hover:bg-white/10 rounded transition-colors"
    >
        <RotateCcw className="w-3 h-3" />
    </button>
);

const ProductWebviewNodeForm: React.FC<ProductWebviewNodeFormProps> = ({
    workspaceId,
    initialConfig,
    onChange,
    onClose
}) => {
    // ================== STATE ==================
    const { isDark } = useTheme();
    const [headline, setHeadline] = useState(initialConfig?.headline || 'Want to Add this item?');
    const [headlineColor, setHeadlineColor] = useState(initialConfig?.headlineColor || '#ffffff');
    const [headlineBgColor, setHeadlineBgColor] = useState(initialConfig?.headlineBgColor || '#ea580c');
    const [headlineAnimation, setHeadlineAnimation] = useState<'none' | 'blink' | 'shake'>(initialConfig?.headlineAnimation || 'shake');
    const [headlineAnimationSpeed, setHeadlineAnimationSpeed] = useState(initialConfig?.headlineAnimationSpeed ?? 2); // blinks per second (1-4)
    const [showEmoji, setShowEmoji] = useState(initialConfig?.showEmoji ?? true);
    const [emojiType, setEmojiType] = useState<'fire' | 'star' | 'sparkle' | 'heart' | 'none'>(initialConfig?.emojiType || 'fire');
    const [imageUrl, setImageUrl] = useState(initialConfig?.imageUrl || '');
    const [imageSource, setImageSource] = useState<'url' | 'upload' | 'gallery'>(initialConfig?.imageSource || 'upload');
    const [imageBorderRadius, setImageBorderRadius] = useState(initialConfig?.imageBorderRadius ?? 15);
    const [imageBorderColor, setImageBorderColor] = useState(initialConfig?.imageBorderColor || 'transparent');
    const [imageBorderWidth, setImageBorderWidth] = useState(initialConfig?.imageBorderWidth ?? 0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [galleryImages, setGalleryImages] = useState<string[]>([]);
    const [loadingGallery, setLoadingGallery] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [price, setPrice] = useState(initialConfig?.price || '₱588');
    const [priceBadgeColor, setPriceBadgeColor] = useState(initialConfig?.priceBadgeColor || '#22c55e');
    const [priceTextColor, setPriceTextColor] = useState(initialConfig?.priceTextColor || '#ffffff');
    const [priceBadgeSize, setPriceBadgeSize] = useState(initialConfig?.priceBadgeSize ?? 80);
    const [description, setDescription] = useState(initialConfig?.description || 'High quality shoes from Korea!');
    const [descriptionColor, setDescriptionColor] = useState(initialConfig?.descriptionColor || '#1f2937');
    const [buttonText, setButtonText] = useState(initialConfig?.buttonText || 'ADD TO CART');
    const [buttonBgColor, setButtonBgColor] = useState(initialConfig?.buttonBgColor || '#22c55e');
    const [buttonTextColor, setButtonTextColor] = useState(initialConfig?.buttonTextColor || '#ffffff');
    const [buttonBorderRadius, setButtonBorderRadius] = useState(initialConfig?.buttonBorderRadius ?? 12);
    const [showButtonIcon, setShowButtonIcon] = useState(initialConfig?.showButtonIcon ?? true);
    const [backgroundColor, setBackgroundColor] = useState(initialConfig?.backgroundColor || '#ffffff');
    const [pageBackgroundColor, setPageBackgroundColor] = useState(initialConfig?.pageBackgroundColor || '#ffffff');
    const [showProductName, setShowProductName] = useState(initialConfig?.showProductName ?? true);
    const [productNameBgColor, setProductNameBgColor] = useState(initialConfig?.productNameBgColor || '#22c55e');
    const [productNameTextColor, setProductNameTextColor] = useState(initialConfig?.productNameTextColor || '#ffffff');
    const [productNameFontSize, setProductNameFontSize] = useState(initialConfig?.productNameFontSize ?? 16);
    const [productNameBorderRadius, setProductNameBorderRadius] = useState(initialConfig?.productNameBorderRadius ?? 0);
    const [productNameFullWidth, setProductNameFullWidth] = useState(initialConfig?.productNameFullWidth ?? true);
    const [showCountdown, setShowCountdown] = useState(initialConfig?.showCountdown ?? true);
    const [countdownMinutes, setCountdownMinutes] = useState(initialConfig?.countdownMinutes ?? 10);
    const [countdownPosition, setCountdownPosition] = useState<'above' | 'middle' | 'below'>(initialConfig?.countdownPosition || 'middle');
    const [countdownBgColor, setCountdownBgColor] = useState(initialConfig?.countdownBgColor || 'transparent');
    const [countdownTextColor, setCountdownTextColor] = useState(initialConfig?.countdownTextColor || '#22c55e');
    const [countdownFontSize, setCountdownFontSize] = useState(initialConfig?.countdownFontSize ?? 18);
    const [countdownShowBg, setCountdownShowBg] = useState(initialConfig?.countdownShowBg ?? false);
    const [countdownBorderRadius, setCountdownBorderRadius] = useState(initialConfig?.countdownBorderRadius ?? 12);
    const [countdownFullWidth, setCountdownFullWidth] = useState(initialConfig?.countdownFullWidth ?? true);
    const [cartAction, setCartAction] = useState<'add' | 'replace'>(initialConfig?.cartAction || 'add');
    const [productName, setProductName] = useState(initialConfig?.productName || '');
    const [productPrice, setProductPrice] = useState(initialConfig?.productPrice || 0);
    const [useWebview, setUseWebview] = useState(initialConfig?.useWebview ?? true);

    // Product Webview specific state
    const [enableQuantitySelector, setEnableQuantitySelector] = useState(initialConfig?.enableQuantitySelector ?? true);
    const [enableColorSelector, setEnableColorSelector] = useState(initialConfig?.enableColorSelector ?? false);
    const [enableSizeSelector, setEnableSizeSelector] = useState(initialConfig?.enableSizeSelector ?? false);
    const [colorOptions, setColorOptions] = useState<string[]>(initialConfig?.colorOptions || ['Red', 'Blue', 'Black']);
    const [sizeOptions, setSizeOptions] = useState<string[]>(initialConfig?.sizeOptions || ['S', 'M', 'L', 'XL']);

    // Add to Cart action trigger
    const [onAddToCartAction, setOnAddToCartAction] = useState<'upsell' | 'downsell' | 'nextStep' | 'savedFlow'>(initialConfig?.onAddToCartAction || 'nextStep');
    const [onAddToCartFlowId, setOnAddToCartFlowId] = useState(initialConfig?.onAddToCartFlowId || '');

    // Follow-up trigger settings (when user doesn't click Add to Cart)
    const [enableFollowup, setEnableFollowup] = useState(initialConfig?.enableFollowup ?? false);
    const [followupTimeout, setFollowupTimeout] = useState(initialConfig?.followupTimeout ?? 5);
    const [followupNodeType, setFollowupNodeType] = useState<'textNode' | 'followupNode'>(initialConfig?.followupNodeType || 'textNode');

    // UI State
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
    const [mobileStep, setMobileStep] = useState(0);
    const [showMobilePreview, setShowMobilePreview] = useState(false);
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('mobile');
    const [imagePreviewSize, setImagePreviewSize] = useState(initialConfig?.imagePreviewSize ?? 100);
    const [saveNotification, setSaveNotification] = useState(false);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Send initial config on mount to ensure node is marked as configured
    useEffect(() => {
        onChange({
            headline, headlineColor, headlineBgColor, headlineAnimation, headlineAnimationSpeed,
            showEmoji, emojiType, imageUrl, imageSource, imageBorderRadius, imageBorderColor,
            imageBorderWidth, price, priceBadgeColor, priceTextColor, priceBadgeSize,
            description, descriptionColor, buttonText, buttonBgColor, buttonTextColor,
            buttonBorderRadius, showButtonIcon, backgroundColor, pageBackgroundColor,
            showProductName, productNameBgColor, productNameTextColor, productNameFontSize,
            productNameBorderRadius, productNameFullWidth, showCountdown, countdownMinutes,
            countdownPosition, countdownBgColor, countdownTextColor, countdownFontSize,
            countdownShowBg, countdownBorderRadius, countdownFullWidth, cartAction,
            productName: productName || headline,
            productPrice: parseFloat(price.replace(/[^0-9.]/g, '')) || 0,
            useWebview, imagePreviewSize, enableQuantitySelector,
            enableColorSelector, enableSizeSelector, colorOptions, sizeOptions,
            onAddToCartAction, onAddToCartFlowId, enableFollowup, followupTimeout, followupNodeType
        });
        // Only run on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    // ================== HELPERS ==================
    const notifyChange = (updates: Partial<typeof initialConfig> = {}) => {
        onChange({
            // Headline settings
            headline, headlineColor, headlineBgColor, headlineAnimation, headlineAnimationSpeed,
            showEmoji, emojiType,
            // Image settings
            imageUrl, imageSource, imageBorderRadius, imageBorderColor, imageBorderWidth, imagePreviewSize,
            // Price settings
            price, priceBadgeColor, priceTextColor, priceBadgeSize,
            // Description and button settings
            description, descriptionColor, buttonText, buttonBgColor, buttonTextColor,
            buttonBorderRadius, showButtonIcon,
            // Background settings
            backgroundColor, pageBackgroundColor,
            // Product name bar settings
            showProductName, productNameBgColor, productNameTextColor, productNameFontSize,
            productNameBorderRadius, productNameFullWidth,
            // Countdown settings
            showCountdown, countdownMinutes, countdownPosition, countdownBgColor, countdownTextColor,
            countdownFontSize, countdownShowBg, countdownBorderRadius, countdownFullWidth,
            // Cart and product settings
            cartAction,
            productName: productName || headline,
            productPrice: parseFloat(price.replace(/[^0-9.]/g, '')) || 0,
            useWebview,
            // Product options
            enableQuantitySelector, enableColorSelector, enableSizeSelector,
            colorOptions, sizeOptions,
            // Action triggers
            onAddToCartAction, onAddToCartFlowId,
            // Follow-up settings
            enableFollowup, followupTimeout, followupNodeType,
            // Apply any specific updates passed in
            ...updates
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

    // Delete image from gallery/storage
    const handleDeleteGalleryImage = async (url: string) => {
        if (!confirm('Are you sure you want to delete this image? This cannot be undone.')) return;

        try {
            // Extract filename from URL
            const urlParts = url.split('/');
            const fileName = urlParts[urlParts.length - 1];
            const filePath = `${workspaceId}/${fileName}`;

            const { error } = await supabase.storage.from('attachments').remove([filePath]);
            if (error) {
                console.error('Failed to delete image:', error);
                alert('Failed to delete image: ' + error.message);
                return;
            }

            // Remove from gallery list
            setGalleryImages(prev => prev.filter(img => img !== url));

            // If this was the selected image, clear it
            if (imageUrl === url) {
                setImageUrl('');
                notifyChange({ imageUrl: '' });
            }
        } catch (e: any) {
            console.error('Delete error:', e);
            alert('Failed to delete image');
        }
    };

    const getEmoji = () => EMOJI_OPTIONS.find(e => e.value === emojiType)?.label || '';

    // ================== COMPONENTS ==================
    // Use the memoized ColorPicker to prevent re-creation and native picker closing
    const ColorPicker = ColorPickerComponent;

    const Toggle = ({ value, onChange: onToggle, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
        <div className="flex items-center justify-between">
            <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{label}</label>
            <button onClick={() => onToggle(!value)} className={`w-12 h-6 rounded-full transition-all ${value ? 'bg-teal-500' : isDark ? 'bg-slate-600' : 'bg-slate-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
        </div>
    );

    // ================== PREVIEW (DEVICE MOCKUP) ==================
    const deviceSizes = {
        mobile: { width: 280, height: 480, radius: 40, notch: true },
        tablet: { width: 340, height: 440, radius: 24, notch: false },
        desktop: { width: 480, height: 280, radius: 8, notch: false }
    };

    const DevicePreview = () => {
        const size = deviceSizes[previewDevice];
        // Scale factors for different devices - desktop is much smaller to fit
        const getImageSize = () => {
            const base = previewDevice === 'desktop' ? 70 : previewDevice === 'tablet' ? 160 : 140;
            return base * (imagePreviewSize / 100);
        };
        const getFontSize = () => {
            return previewDevice === 'desktop' ? 'text-[8px]' : previewDevice === 'tablet' ? 'text-base' : 'text-sm';
        };
        const getDescFontSize = () => {
            return previewDevice === 'desktop' ? 'text-[7px]' : 'text-xs';
        };
        const getButtonPadding = () => {
            return previewDevice === 'desktop' ? 'py-1 text-[7px]' : 'py-2 text-xs';
        };
        const getPriceBadgeSize = () => {
            return previewDevice === 'desktop' ? 'w-6 h-6 text-[6px]' : 'w-12 h-12 text-xs';
        };
        const getContentPadding = () => {
            return previewDevice === 'desktop' ? 'p-1' : 'p-2';
        };
        const getCardPadding = () => {
            return previewDevice === 'desktop' ? 'p-1.5' : 'p-3';
        };
        // Desktop has white background, others have dark
        const getScreenBg = () => {
            return previewDevice === 'desktop' ? 'bg-white' : 'bg-slate-50';
        };
        const getStatusBarStyle = () => {
            return previewDevice === 'desktop'
                ? 'text-slate-500 bg-slate-100 border-b border-slate-200'
                : 'text-slate-900';
        };

        // Helper for countdown background gradient
        const getCountdownBackground = () => {
            if (!countdownShowBg) return 'transparent';
            const hex = countdownBgColor || '#ec4899';
            // Create gradient from selected color to darker shade
            const num = parseInt(hex.replace('#', ''), 16);
            const amt = Math.round(2.55 * -30);
            const R = Math.max(0, Math.min(255, (num >> 16) + amt));
            const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
            const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
            const darkerColor = `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
            return `linear-gradient(135deg, ${hex} 0%, ${darkerColor} 100%)`;
        };

        // Helper for countdown font size in preview
        const getCountdownFontSize = () => {
            const size = countdownFontSize || 18;
            return previewDevice === 'desktop' ? size / 3 : size / 2;
        };

        return (
            <div className="flex flex-col items-center">
                <div className="relative" style={{ width: size.width, height: size.height }}>
                    {/* Device Frame */}
                    <div
                        className={`w-full h-full shadow-2xl border-4 flex flex-col ${previewDevice === 'desktop' ? 'bg-slate-200 border-slate-400' : 'bg-white border-slate-200'}`}
                        style={{ borderRadius: size.radius }}
                    >
                        {/* Notch (mobile only) */}
                        {size.notch && (
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-200 rounded-full z-10" />
                        )}
                        {/* Screen */}
                        <div
                            className={`w-full h-full overflow-hidden flex flex-col ${getScreenBg()}`}
                            style={{ borderRadius: Math.max(size.radius - 6, 4) }}
                        >
                            {/* Status bar / Browser bar */}
                            <div className={`h-5 flex-shrink-0 flex items-center justify-between px-3 text-[9px] ${getStatusBarStyle()}`}>
                                {previewDevice === 'desktop' ? (
                                    <>
                                        <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                            <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                                            <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                        </div>
                                        <span className="text-[8px] text-slate-400">mystore.com/product</span>
                                        <div></div>
                                    </>
                                ) : (
                                    <>
                                        <span>9:41</span>
                                        <span>⚡ 100%</span>
                                    </>
                                )}
                            </div>
                            {/* Content - Page background with card container */}
                            <div className="flex-1 overflow-y-auto flex items-center justify-center p-2" style={{ backgroundColor: pageBackgroundColor }}>
                                {/* Card Container - centered with margins */}
                                <div
                                    className={`${previewDevice === 'desktop' ? 'w-36 mx-4' : 'mx-3 w-full'} rounded-xl overflow-hidden shadow-lg`}
                                    style={{ backgroundColor }}
                                >
                                    {/* Headline Banner */}
                                    <div
                                        className={`${previewDevice === 'desktop' ? 'py-1 px-1.5' : 'py-2 px-3'} text-center`}
                                        style={{ backgroundColor: headlineBgColor }}
                                    >
                                        <div
                                            className={`font-bold uppercase tracking-wide flex items-center justify-center gap-0.5 ${getFontSize()} ${headlineAnimation === 'blink' ? 'animate-pulse' : headlineAnimation === 'shake' ? 'animate-bounce' : ''}`}
                                            style={{ color: headlineColor }}
                                        >
                                            {showEmoji && emojiType !== 'none' && <span className={previewDevice === 'desktop' ? 'text-[6px]' : 'text-xs'}>{getEmoji()}</span>}
                                            <span>{headline || 'ADD THIS TO YOUR CART?'}</span>
                                            {showEmoji && emojiType !== 'none' && <span className={previewDevice === 'desktop' ? 'text-[6px]' : 'text-xs'}>{getEmoji()}</span>}
                                        </div>
                                    </div>

                                    {/* Countdown Timer - Above Position - Dynamic Style */}
                                    {showCountdown && countdownPosition === 'above' && (
                                        <div
                                            className={`${countdownFullWidth ? '-mx-3 px-3' : 'mx-2'} my-1 ${previewDevice === 'desktop' ? 'py-1 px-2' : 'py-2 px-3'}`}
                                            style={{
                                                background: getCountdownBackground(),
                                                borderRadius: countdownFullWidth ? '0px' : `${countdownBorderRadius}px`
                                            }}
                                        >
                                            <div className="text-center">
                                                <span
                                                    className="font-bold uppercase tracking-wider"
                                                    style={{ color: countdownTextColor, fontSize: `${getCountdownFontSize() / 2}px` }}
                                                >
                                                    ⚡ Limited Time
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-center gap-1 mt-0.5">
                                                <span
                                                    className="font-mono font-bold bg-white/20 rounded px-1"
                                                    style={{ color: countdownTextColor, fontSize: `${getCountdownFontSize()}px` }}
                                                >
                                                    {String(countdownMinutes).padStart(2, '0')}
                                                </span>
                                                <span className="font-bold" style={{ color: countdownTextColor, fontSize: `${getCountdownFontSize()}px` }}>:</span>
                                                <span
                                                    className="font-mono font-bold bg-white/20 rounded px-1"
                                                    style={{ color: countdownTextColor, fontSize: `${getCountdownFontSize()}px` }}
                                                >
                                                    00
                                                </span>
                                                <span className="font-bold" style={{ color: countdownTextColor, fontSize: `${getCountdownFontSize()}px` }}>:</span>
                                                <span
                                                    className="font-mono font-bold bg-white/20 rounded px-1"
                                                    style={{ color: countdownTextColor, fontSize: `${getCountdownFontSize()}px` }}
                                                >
                                                    00
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Card Body */}
                                    <div className={`${getCardPadding()}`}>
                                        {/* Image with Price Badge */}
                                        <div className={`text-center ${previewDevice === 'desktop' ? 'mb-1' : 'mb-2'}`}>
                                            <div className="inline-block relative" style={{ overflow: 'visible' }}>
                                                <div
                                                    className="overflow-hidden aspect-square bg-white"
                                                    style={{
                                                        borderRadius: `${imageBorderRadius}px`,
                                                        border: `${previewDevice === 'desktop' ? 2 : Math.max(imageBorderWidth - 1, 2)}px solid ${imageBorderColor}`,
                                                        width: `${getImageSize()}px`,
                                                    }}
                                                >
                                                    {imageUrl ? (
                                                        <img src={imageUrl} alt="Product" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                                                            <Image className={previewDevice === 'desktop' ? 'w-4 h-4 text-slate-400' : 'w-6 h-6 text-slate-400'} />
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Circular Price Badge - Positioned at corner */}
                                                {price && (
                                                    <div
                                                        className="absolute rounded-full font-bold shadow-xl flex items-center justify-center z-20"
                                                        style={{
                                                            backgroundColor: priceBadgeColor,
                                                            color: priceTextColor,
                                                            width: `${previewDevice === 'desktop' ? priceBadgeSize / 3 : priceBadgeSize / 2}px`,
                                                            height: `${previewDevice === 'desktop' ? priceBadgeSize / 3 : priceBadgeSize / 2}px`,
                                                            fontSize: `${previewDevice === 'desktop' ? 6 : 8}px`,
                                                            top: `${previewDevice === 'desktop' ? -(priceBadgeSize / 6) : -(priceBadgeSize / 4)}px`,
                                                            right: `${previewDevice === 'desktop' ? -(priceBadgeSize / 6) : -(priceBadgeSize / 4)}px`,
                                                        }}
                                                    >
                                                        {price}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Countdown Timer - Middle Position - Dynamic Style */}
                                        {showCountdown && countdownPosition === 'middle' && (
                                            <div
                                                className={`${countdownFullWidth ? '-mx-3 px-3' : 'mx-2'} my-1 ${previewDevice === 'desktop' ? 'py-1 px-2' : 'py-2 px-3'}`}
                                                style={{
                                                    background: getCountdownBackground(),
                                                    borderRadius: countdownFullWidth ? '0px' : `${countdownBorderRadius}px`
                                                }}
                                            >
                                                <div className="text-center">
                                                    <span
                                                        className="font-bold uppercase tracking-wider"
                                                        style={{ color: countdownTextColor, fontSize: `${getCountdownFontSize() / 2}px` }}
                                                    >
                                                        ⚡ Limited Time
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-center gap-1 mt-0.5">
                                                    <span
                                                        className="font-mono font-bold bg-white/20 rounded px-1"
                                                        style={{ color: countdownTextColor, fontSize: `${getCountdownFontSize()}px` }}
                                                    >
                                                        {String(countdownMinutes).padStart(2, '0')}
                                                    </span>
                                                    <span className="font-bold" style={{ color: countdownTextColor, fontSize: `${getCountdownFontSize()}px` }}>:</span>
                                                    <span
                                                        className="font-mono font-bold bg-white/20 rounded px-1"
                                                        style={{ color: countdownTextColor, fontSize: `${getCountdownFontSize()}px` }}
                                                    >
                                                        00
                                                    </span>
                                                    <span className="font-bold" style={{ color: countdownTextColor, fontSize: `${getCountdownFontSize()}px` }}>:</span>
                                                    <span
                                                        className="font-mono font-bold bg-white/20 rounded px-1"
                                                        style={{ color: countdownTextColor, fontSize: `${getCountdownFontSize()}px` }}
                                                    >
                                                        00
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Product Name Bar - With Border Radius and Full Width Options */}
                                        {showProductName && (
                                            <div
                                                className={`${previewDevice === 'desktop' ? 'py-1 px-2 mb-1' : 'py-1.5 px-2 mb-2'} text-center ${productNameFullWidth ? '-mx-3 px-3' : 'mx-2 rounded-lg'}`}
                                                style={{
                                                    backgroundColor: productNameBgColor,
                                                    borderRadius: productNameFullWidth ? '0px' : `${productNameBorderRadius}px`
                                                }}
                                            >
                                                <div
                                                    className="font-bold uppercase tracking-wide"
                                                    style={{
                                                        color: productNameTextColor,
                                                        fontSize: `${previewDevice === 'desktop' ? productNameFontSize / 2 : productNameFontSize * 0.7}px`
                                                    }}
                                                >
                                                    {productName || 'PRODUCT NAME'}
                                                </div>
                                            </div>
                                        )}

                                        {/* Countdown Timer - Below Position - Dynamic Style */}
                                        {showCountdown && countdownPosition === 'below' && (
                                            <div
                                                className={`${countdownFullWidth ? '-mx-3 px-3' : 'mx-2'} mb-2 ${previewDevice === 'desktop' ? 'py-1 px-2' : 'py-2 px-3'}`}
                                                style={{
                                                    background: getCountdownBackground(),
                                                    borderRadius: countdownFullWidth ? '0px' : `${countdownBorderRadius}px`
                                                }}
                                            >
                                                <div className="text-center">
                                                    <span
                                                        className="font-bold uppercase tracking-wider"
                                                        style={{ color: countdownTextColor, fontSize: `${getCountdownFontSize() / 2}px` }}
                                                    >
                                                        ⚡ Limited Time
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-center gap-1 mt-0.5">
                                                    <span
                                                        className="font-mono font-bold bg-white/20 rounded px-1"
                                                        style={{ color: countdownTextColor, fontSize: `${getCountdownFontSize()}px` }}
                                                    >
                                                        {String(countdownMinutes).padStart(2, '0')}
                                                    </span>
                                                    <span className="font-bold" style={{ color: countdownTextColor, fontSize: `${getCountdownFontSize()}px` }}>:</span>
                                                    <span
                                                        className="font-mono font-bold bg-white/20 rounded px-1"
                                                        style={{ color: countdownTextColor, fontSize: `${getCountdownFontSize()}px` }}
                                                    >
                                                        00
                                                    </span>
                                                    <span className="font-bold" style={{ color: countdownTextColor, fontSize: `${getCountdownFontSize()}px` }}>:</span>
                                                    <span
                                                        className="font-mono font-bold bg-white/20 rounded px-1"
                                                        style={{ color: countdownTextColor, fontSize: `${getCountdownFontSize()}px` }}
                                                    >
                                                        00
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Description */}
                                        {description && (
                                            <p className={`text-center ${previewDevice === 'desktop' ? 'mb-1' : 'mb-2'} ${getDescFontSize()} ${previewDevice === 'desktop' ? 'line-clamp-1' : ''}`} style={{ color: descriptionColor }}>
                                                {description}
                                            </p>
                                        )}

                                        {/* Action Button - Only Add to Cart */}
                                        <div className={`${previewDevice === 'desktop' ? 'space-y-1' : 'space-y-1.5'}`}>
                                            <button
                                                className={`w-full font-bold flex items-center justify-center gap-1 shadow-md ${getButtonPadding()}`}
                                                style={{ backgroundColor: buttonBgColor, color: buttonTextColor, borderRadius: `${buttonBorderRadius}px` }}
                                            >
                                                {showButtonIcon && <Check className={previewDevice === 'desktop' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />}
                                                {buttonText || 'Add to Cart'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Home indicator (mobile only) */}
                            {size.notch && (
                                <div className="h-4 flex-shrink-0 flex items-center justify-center">
                                    <div className="w-20 h-1 bg-slate-900/20 rounded-full" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ================== STATE ==================
    // ... (state declarations remain the same)



    // ... (DevicePreview remains similar but let's update basicSection first)

    // ================== FORM SECTIONS ==================
    const basicSection = (
        <CollapsibleSection title="Basic Info" icon={Type} defaultOpen={true}>
            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className={labelClass(isDark)}>Headline</label>
                    <ResetButton onClick={() => { setHeadline('Want to Add this item?'); notifyChange({ headline: 'Want to Add this item?' }); }} />
                </div>
                <input type="text" value={headline}
                    onChange={(e) => { setHeadline(e.target.value); notifyChange({ headline: e.target.value }); }}
                    placeholder="e.g. Want to Add this item?"
                    className={inputClass(isDark)} />
                <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'} mt-0.5`}>Shown in yellow banner at top</p>
            </div>
            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className={labelClass(isDark)}>Product Name</label>
                    <ResetButton onClick={() => { setProductName(''); notifyChange({ productName: '' }); }} />
                </div>
                <input type="text" value={productName}
                    onChange={(e) => { setProductName(e.target.value); notifyChange({ productName: e.target.value }); }}
                    placeholder="e.g. Premium Korean Sneakers"
                    className={inputClass(isDark)} />
                <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'} mt-0.5`}>Shown in green product bar</p>
            </div>
            <ColorPicker value={headlineColor} onChange={(c) => { setHeadlineColor(c); notifyChange({ headlineColor: c }); }} label="Headline Text Color" defaultValue="#1f2937" allowNone={true} />
            <ColorPicker value={headlineBgColor} onChange={(c) => { setHeadlineBgColor(c); notifyChange({ headlineBgColor: c }); }} label="Headline Banner Color" defaultValue="#fbbf24" allowNone={true} />
            <Toggle value={showEmoji} onChange={(v) => { setShowEmoji(v); notifyChange({ showEmoji: v }); }} label="Show Emojis" />
            {showEmoji && (
                <div className="flex gap-2">
                    {EMOJI_OPTIONS.map(e => (
                        <button key={e.value} type="button" onClick={() => { setEmojiType(e.value as any); notifyChange({ emojiType: e.value }); }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${emojiType === e.value ? 'bg-teal-500/30 border-teal-500' : isDark ? 'bg-black/30 border-white/10' : 'bg-slate-100 border-slate-200'} border transition-all hover:scale-105`}>
                            {e.label}
                        </button>
                    ))}
                </div>
            )}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className={labelClass(isDark)}>Price</label>
                    <ResetButton onClick={() => { setPrice('₱588'); notifyChange({ price: '₱588' }); }} />
                </div>
                <input type="text" value={price}
                    onChange={(e) => { setPrice(e.target.value); notifyChange({ price: e.target.value }); }}
                    className={inputClass(isDark)} />
            </div>
            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className={labelClass(isDark)}>Description</label>
                    <ResetButton onClick={() => { setDescription('High quality shoes from Korea!'); notifyChange({ description: 'High quality shoes from Korea!' }); }} />
                </div>
                <textarea value={description}
                    onChange={(e) => { setDescription(e.target.value); notifyChange({ description: e.target.value }); }}
                    className={`${inputClass(isDark)} h-16 resize-none`} />
            </div>
            <ColorPicker value={descriptionColor} onChange={(c) => { setDescriptionColor(c); notifyChange({ descriptionColor: c }); }} label="Description Text Color" defaultValue="#ffffff" allowNone={true} />
        </CollapsibleSection>
    );

    const imageSection = (
        <CollapsibleSection title="Product Image" icon={Image} defaultOpen={true}>
            {/* Source Selector - URL, Upload, Gallery */}
            <div className={`flex rounded-lg overflow-hidden border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <button type="button" onClick={() => { setImageSource('url'); notifyChange({ imageSource: 'url' }); }}
                    className={`flex-1 py-2 text-xs flex items-center justify-center gap-1 ${imageSource === 'url' ? activeInfoClass(isDark) : inactiveClass(isDark)}`}>
                    <Link className="w-3 h-3" /> URL
                </button>
                <button type="button" onClick={() => { setImageSource('upload'); notifyChange({ imageSource: 'upload' }); }}
                    className={`flex-1 py-2 text-xs flex items-center justify-center gap-1 ${imageSource === 'upload' ? activeInfoClass(isDark) : inactiveClass(isDark)}`}>
                    <Upload className="w-3 h-3" /> Upload
                </button>
                <button type="button" onClick={async () => {
                    setImageSource('gallery');
                    notifyChange({ imageSource: 'gallery' });
                    // Fetch gallery images from 'attachments' bucket
                    setLoadingGallery(true);
                    try {
                        const { data, error } = await supabase.storage.from('attachments').list(workspaceId, { limit: 100 });
                        if (error) {
                            console.error('Gallery fetch error:', error);
                        } else if (data) {
                            // Filter only image files
                            const imageFiles = data.filter(f =>
                                f.name && (f.name.endsWith('.jpg') || f.name.endsWith('.jpeg') ||
                                    f.name.endsWith('.png') || f.name.endsWith('.gif') || f.name.endsWith('.webp'))
                            );
                            const urls = imageFiles.map(f =>
                                supabase.storage.from('attachments').getPublicUrl(`${workspaceId}/${f.name}`).data.publicUrl
                            );
                            setGalleryImages(urls);
                        }
                    } catch (e) { console.error('Failed to load gallery:', e); }
                    setLoadingGallery(false);
                }}
                    className={`flex-1 py-2 text-xs flex items-center justify-center gap-1 ${imageSource === 'gallery' ? activeInfoClass(isDark) : inactiveClass(isDark)}`}>
                    <Sparkles className="w-3 h-3" /> Gallery
                </button>
            </div>

            {/* URL Input */}
            {imageSource === 'url' && (
                <input type="url" value={imageUrl} placeholder="https://..."
                    onChange={(e) => { setImageUrl(e.target.value); notifyChange({ imageUrl: e.target.value }); }}
                    className={inputClass(isDark)} />
            )}

            {/* Upload Input */}
            {imageSource === 'upload' && (
                <div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}
                        className={`w-full py-3 border-2 border-dashed rounded-lg flex items-center justify-center gap-2 ${isDark ? 'border-white/20 text-slate-400 hover:border-teal-500/50' : 'border-slate-300 text-slate-500 hover:border-teal-500/50 hover:bg-slate-50'}`}>
                        {isUploading ? 'Uploading...' : <><Upload className="w-4 h-4" /> Click to upload</>}
                    </button>
                    {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
                </div>
            )}

            {/* Gallery Grid */}
            {imageSource === 'gallery' && (
                <div className="space-y-2">
                    {loadingGallery ? (
                        <div className={`text-center py-4 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading gallery...</div>
                    ) : galleryImages.length === 0 ? (
                        <div className={`text-center py-4 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>No images in gallery yet. Upload some images first!</div>
                    ) : (
                        <>
                            <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Click to select, hover to delete</p>
                            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                                {galleryImages.map((url, i) => (
                                    <div key={i} className="relative group aspect-square">
                                        <button
                                            type="button"
                                            onClick={() => { setImageUrl(url); notifyChange({ imageUrl: url }); }}
                                            className={`w-full h-full rounded-lg overflow-hidden border-2 ${imageUrl === url ? 'border-teal-500' : 'border-transparent'} hover:border-teal-500/50 transition-colors ${isDark ? 'bg-black/20' : 'bg-slate-100'}`}
                                        >
                                            <img src={url} alt="" className="w-full h-full object-cover" />
                                        </button>
                                        {/* Delete button - shows on hover, positioned in upper-right corner */}
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteGalleryImage(url); }}
                                            className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600 z-10"
                                            title="Delete image"
                                        >
                                            <Trash2 className="w-3 h-3 text-white" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Image Size */}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className={labelClass(isDark)}>Image Size: {imagePreviewSize}%</label>
                    <ResetButton onClick={() => { setImagePreviewSize(100); notifyChange({ imagePreviewSize: 100 }); }} />
                </div>
                <input type="range" min="50" max="150" value={imagePreviewSize}
                    onChange={(e) => { setImagePreviewSize(Number(e.target.value)); notifyChange({ imagePreviewSize: Number(e.target.value) }); }}
                    className="w-full accent-teal-500" />
            </div>

            {/* Border Radius */}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className={labelClass(isDark)}>Border Radius: {imageBorderRadius}px</label>
                    <ResetButton onClick={() => { setImageBorderRadius(16); notifyChange({ imageBorderRadius: 16 }); }} />
                </div>
                <input type="range" min="0" max="50" value={imageBorderRadius}
                    onChange={(e) => { setImageBorderRadius(Number(e.target.value)); notifyChange({ imageBorderRadius: Number(e.target.value) }); }}
                    className="w-full accent-teal-500" />
            </div>
            <ColorPicker value={imageBorderColor} onChange={(c) => { setImageBorderColor(c); notifyChange({ imageBorderColor: c }); }} label="Border Color" defaultValue="#ffffff" allowNone={true} />
        </CollapsibleSection>
    );

    const styleSection = (
        <CollapsibleSection title="Styling & Design" icon={Palette} defaultOpen={true}>
            <ColorPicker value={pageBackgroundColor} onChange={(c) => { setPageBackgroundColor(c); notifyChange({ pageBackgroundColor: c }); }} label="Page Background Color" defaultValue="#ffffff" allowNone={true} />
            <ColorPicker value={backgroundColor} onChange={(c) => { setBackgroundColor(c); notifyChange({ backgroundColor: c }); }} label="Container Background Color" defaultValue="#ea580c" allowNone={true} />

            {/* Headline Animation */}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className={labelClass(isDark)}>Headline Animation</label>
                    <ResetButton onClick={() => { setHeadlineAnimation('none'); notifyChange({ headlineAnimation: 'none' }); }} />
                </div>
                <div className="flex gap-2">
                    {(['none', 'blink', 'shake'] as const).map(anim => (
                        <button key={anim} type="button"
                            onClick={() => { setHeadlineAnimation(anim); notifyChange({ headlineAnimation: anim }); }}
                            className={`flex-1 py-2 text-xs rounded-lg capitalize ${headlineAnimation === anim ? 'bg-teal-500/30 border-teal-500' : isDark ? 'bg-black/30 border-white/10' : 'bg-slate-100 border-slate-200'} border transition-all scroll-smooth`}>
                            {anim === 'none' ? '— None' : anim === 'blink' ? '✨ Blink' : '🔔 Shake'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Animation Speed - Slider */}
            {
                headlineAnimation !== 'none' && (
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className={labelClass(isDark)}>Speed: {headlineAnimationSpeed} blinks/sec</label>
                            <ResetButton onClick={() => { setHeadlineAnimationSpeed(2); notifyChange({ headlineAnimationSpeed: 2 }); }} />
                        </div>
                        <input type="range" min="1" max="4" step="0.5" value={headlineAnimationSpeed}
                            onChange={(e) => { setHeadlineAnimationSpeed(Number(e.target.value)); notifyChange({ headlineAnimationSpeed: Number(e.target.value) }); }}
                            className="w-full accent-teal-500" />
                        <div className={`flex justify-between text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'} mt-1`}>
                            <span>1/sec (slow)</span>
                            <span>4/sec (fast)</span>
                        </div>
                    </div>
                )
            }

            {/* Price Badge Size */}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className={labelClass(isDark)}>Price Badge Size: {priceBadgeSize}px</label>
                    <ResetButton onClick={() => { setPriceBadgeSize(80); notifyChange({ priceBadgeSize: 80 }); }} />
                </div>
                <input type="range" min="80" max="150" value={priceBadgeSize}
                    onChange={(e) => { setPriceBadgeSize(Number(e.target.value)); notifyChange({ priceBadgeSize: Number(e.target.value) }); }}
                    className="w-full accent-teal-500" />
            </div>
            <ColorPicker value={priceBadgeColor} onChange={(c) => { setPriceBadgeColor(c); notifyChange({ priceBadgeColor: c }); }} label="Price Badge Color" defaultValue="#22c55e" allowNone={true} />

            {/* Product Name Bar Options */}
            <div className={`pt-3 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <Toggle value={showProductName} onChange={(v) => { setShowProductName(v); notifyChange({ showProductName: v }); }} label="Show Product Name Bar" />
                {showProductName && (
                    <div className="mt-3 space-y-3">
                        <ColorPicker value={productNameBgColor} onChange={(c) => { setProductNameBgColor(c); notifyChange({ productNameBgColor: c }); }} label="Background Color" defaultValue="#16a34a" allowNone={true} />
                        <ColorPicker value={productNameTextColor} onChange={(c) => { setProductNameTextColor(c); notifyChange({ productNameTextColor: c }); }} label="Text Color" defaultValue="#ffffff" allowNone={true} />
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className={labelClass(isDark)}>Font Size: {productNameFontSize}px</label>
                                <ResetButton onClick={() => { setProductNameFontSize(16); notifyChange({ productNameFontSize: 16 }); }} />
                            </div>
                            <input type="range" min="12" max="28" value={productNameFontSize}
                                onChange={(e) => { setProductNameFontSize(Number(e.target.value)); notifyChange({ productNameFontSize: Number(e.target.value) }); }}
                                className="w-full accent-teal-500" />
                        </div>
                        <Toggle value={productNameFullWidth} onChange={(v) => { setProductNameFullWidth(v); notifyChange({ productNameFullWidth: v }); }} label="Full Width (Edge-to-Edge)" />
                        {!productNameFullWidth && (
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className={labelClass(isDark)}>Corner Radius: {productNameBorderRadius}px</label>
                                    <ResetButton onClick={() => { setProductNameBorderRadius(0); notifyChange({ productNameBorderRadius: 0 }); }} />
                                </div>
                                <input type="range" min="0" max="24" value={productNameBorderRadius}
                                    onChange={(e) => { setProductNameBorderRadius(Number(e.target.value)); notifyChange({ productNameBorderRadius: Number(e.target.value) }); }}
                                    className="w-full accent-teal-500" />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Countdown Timer - Elegant Design */}
            <div className={`pt-3 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <Toggle value={showCountdown} onChange={(v) => { setShowCountdown(v); notifyChange({ showCountdown: v }); }} label="⏱️ Countdown Timer" />
                {showCountdown && (
                    <div className="mt-3 space-y-3">
                        {/* Timer Duration */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className={labelClass(isDark)}>Duration: {countdownMinutes} minutes</label>
                                <ResetButton onClick={() => { setCountdownMinutes(10); notifyChange({ countdownMinutes: 10 }); }} />
                            </div>
                            <input type="range" min="1" max="60" value={countdownMinutes}
                                onChange={(e) => { setCountdownMinutes(Number(e.target.value)); notifyChange({ countdownMinutes: Number(e.target.value) }); }}
                                className="w-full accent-teal-500" />
                        </div>

                        {/* Timer Position */}
                        <div>
                            <label className={labelClass(isDark)}>Position</label>
                            <div className="flex gap-2">
                                {(['above', 'middle', 'below'] as const).map(pos => (
                                    <button key={pos} type="button"
                                        onClick={() => { setCountdownPosition(pos); notifyChange({ countdownPosition: pos }); }}
                                        className={`flex-1 py-2 text-xs rounded-lg ${countdownPosition === pos ? 'bg-teal-500/30 border-teal-500' : isDark ? 'bg-black/30 border-white/10' : 'bg-slate-100 border-slate-200'} border`}>
                                        {pos === 'above' ? '⬆️' : pos === 'middle' ? '↔️' : '⬇️'} {pos.charAt(0).toUpperCase() + pos.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Timer Styling */}
                        <ColorPicker value={countdownTextColor} onChange={(c) => { setCountdownTextColor(c); notifyChange({ countdownTextColor: c }); }} label="Text Color" defaultValue="#ffffff" allowNone={true} />
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className={labelClass(isDark)}>Font Size: {countdownFontSize}px</label>
                                <ResetButton onClick={() => { setCountdownFontSize(18); notifyChange({ countdownFontSize: 18 }); }} />
                            </div>
                            <input type="range" min="12" max="32" value={countdownFontSize}
                                onChange={(e) => { setCountdownFontSize(Number(e.target.value)); notifyChange({ countdownFontSize: Number(e.target.value) }); }}
                                className="w-full accent-teal-500" />
                        </div>

                        <Toggle value={countdownShowBg} onChange={(v) => { setCountdownShowBg(v); notifyChange({ countdownShowBg: v }); }} label="Show Background" />
                        {countdownShowBg && (
                            <>
                                <ColorPicker value={countdownBgColor} onChange={(c) => { setCountdownBgColor(c); notifyChange({ countdownBgColor: c }); }} label="Background Color" defaultValue="#ec4899" allowNone={true} />
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className={labelClass(isDark)}>Corner Radius: {countdownBorderRadius}px</label>
                                        <ResetButton onClick={() => { setCountdownBorderRadius(12); notifyChange({ countdownBorderRadius: 12 }); }} />
                                    </div>
                                    <input type="range" min="0" max="20" value={countdownBorderRadius}
                                        onChange={(e) => { setCountdownBorderRadius(Number(e.target.value)); notifyChange({ countdownBorderRadius: Number(e.target.value) }); }}
                                        className="w-full accent-teal-500" />
                                </div>
                                <Toggle value={countdownFullWidth} onChange={(v) => { setCountdownFullWidth(v); notifyChange({ countdownFullWidth: v }); }} label="Full Width" />
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className={`pt-3 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <label className={labelClass(isDark)}>Button Text</label>
                <input type="text" value={buttonText}
                    onChange={(e) => { setButtonText(e.target.value); notifyChange({ buttonText: e.target.value }); }}
                    className={inputClass(isDark)} />
            </div>
            <ColorPicker value={buttonBgColor} onChange={(c) => { setButtonBgColor(c); notifyChange({ buttonBgColor: c }); }} label="Button Color" defaultValue="#16a34a" allowNone={true} />
            <Toggle value={showButtonIcon} onChange={(v) => { setShowButtonIcon(v); notifyChange({ showButtonIcon: v }); }} label="Show Button Icon" />
            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className={labelClass(isDark)}>Button Radius: {buttonBorderRadius}px</label>
                    <ResetButton onClick={() => { setButtonBorderRadius(12); notifyChange({ buttonBorderRadius: 12 }); }} />
                </div>
                <input type="range" min="0" max="24" value={buttonBorderRadius}
                    onChange={(e) => { setButtonBorderRadius(Number(e.target.value)); notifyChange({ buttonBorderRadius: Number(e.target.value) }); }}
                    className="w-full accent-teal-500" />
            </div>
        </CollapsibleSection>
    );


    // Webview Display Section (moved to top, removed Cart Action buttons)
    // Webview Display Section (moved to top, removed Cart Action buttons)
    const actionSection = (
        <CollapsibleSection title="Webview Display" icon={Globe} defaultOpen={true}>
            <Toggle value={useWebview} onChange={(v) => { setUseWebview(v); notifyChange({ useWebview: v }); }} label="Use Webview Display" />
            {useWebview && (
                <div className={`mt-2 p-2 rounded-lg border ${isDark ? 'bg-teal-500/10 border-teal-500/30' : 'bg-teal-50 border-teal-200'}`}>
                    <p className={`text-xs ${isDark ? 'text-teal-300' : 'text-teal-700'}`}>✨ Custom webview page instead of Facebook template</p>
                </div>
            )}
        </CollapsibleSection>
    );

    // Product Options Section (NEW for Product Webview)
    const [colorInputValue, setColorInputValue] = useState(initialConfig?.colorOptions?.join(', ') || 'Red, Blue, Black');
    const [sizeInputValue, setSizeInputValue] = useState(initialConfig?.sizeOptions?.join(', ') || 'S, M, L, XL');


    const productOptionsSection = (
        <CollapsibleSection title="Product Options" icon={Settings} defaultOpen={false}>
            <Toggle
                value={enableQuantitySelector}
                onChange={(v) => { setEnableQuantitySelector(v); notifyChange({ enableQuantitySelector: v }); }}
                label="Quantity Selector"
            />
            <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'} -mt-2 mb-3`}>Allow buyers to select quantity</p>

            <Toggle
                value={enableColorSelector}
                onChange={(v) => { setEnableColorSelector(v); notifyChange({ enableColorSelector: v }); }}
                label="Color Options"
            />
            {enableColorSelector && (
                <div className={`mb-3 pl-2 border-l-2 ${isDark ? 'border-indigo-500/30' : 'border-indigo-500/50'}`}>
                    <label className={labelClass(isDark)}>Available Colors (comma-separated)</label>
                    <input
                        type="text"
                        value={colorInputValue}
                        onChange={(e) => setColorInputValue(e.target.value)}
                        onBlur={(e) => {
                            const colors = e.target.value.split(',').map(c => c.trim()).filter(c => c);
                            setColorOptions(colors.length > 0 ? colors : ['Red', 'Blue', 'Black']);
                            notifyChange({ colorOptions: colors.length > 0 ? colors : ['Red', 'Blue', 'Black'] });
                        }}
                        placeholder="Red, Blue, Black, White"
                        className={inputClass(isDark)}
                    />
                </div>
            )}

            <Toggle
                value={enableSizeSelector}
                onChange={(v) => { setEnableSizeSelector(v); notifyChange({ enableSizeSelector: v }); }}
                label="Size Options"
            />
            {enableSizeSelector && (
                <div className={`mb-3 pl-2 border-l-2 ${isDark ? 'border-indigo-500/30' : 'border-indigo-500/50'}`}>
                    <label className={labelClass(isDark)}>Available Sizes (comma-separated)</label>
                    <input
                        type="text"
                        value={sizeInputValue}
                        onChange={(e) => setSizeInputValue(e.target.value)}
                        onBlur={(e) => {
                            const sizes = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                            setSizeOptions(sizes.length > 0 ? sizes : ['S', 'M', 'L', 'XL']);
                            notifyChange({ sizeOptions: sizes.length > 0 ? sizes : ['S', 'M', 'L', 'XL'] });
                        }}
                        placeholder="S, M, L, XL, XXL or 32, 34, 36, 38"
                        className={inputClass(isDark)}
                    />
                </div>
            )}
        </CollapsibleSection>
    );


    // Action Triggers Section with Add to Cart options and Follow-up
    const actionTriggersSection = (
        <CollapsibleSection title="Action Triggers" icon={MousePointer2} defaultOpen={false}>
            <div className="space-y-4">
                {/* Add to Cart Action */}
                <div className={`p-3 rounded-lg border ${isDark ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'}`}>
                    <label className={`text-sm font-medium block mb-2 ${isDark ? 'text-green-300' : 'text-green-700'}`}>🛒 When "Add to Cart" is Clicked</label>
                    <select
                        value={onAddToCartAction}
                        onChange={(e) => {
                            const action = e.target.value as 'upsell' | 'downsell' | 'nextStep' | 'savedFlow';
                            setOnAddToCartAction(action);
                            notifyChange({ onAddToCartAction: action });
                        }}
                        className={inputClass(isDark)}
                    >
                        <option value="upsell">→ Go to Upsell Node</option>
                        <option value="downsell">→ Go to Downsell Node</option>
                        <option value="nextStep">→ Go to Next Step (Connected Node)</option>
                        <option value="savedFlow">→ Trigger Saved Flow</option>
                    </select>
                    {onAddToCartAction === 'savedFlow' && (
                        <input
                            type="text"
                            value={onAddToCartFlowId}
                            onChange={(e) => { setOnAddToCartFlowId(e.target.value); notifyChange({ onAddToCartFlowId: e.target.value }); }}
                            placeholder="Enter Flow ID"
                            className={`mt-2 ${inputClass(isDark)}`}
                        />
                    )}
                </div>

                {/* Follow-up Section (when user doesn't click) */}
                <div className={`pt-3 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <Toggle
                        value={enableFollowup}
                        onChange={(v) => { setEnableFollowup(v); notifyChange({ enableFollowup: v }); }}
                        label="Enable Follow-up Reminder"
                    />
                    <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'} -mt-2`}>If buyer doesn't add to cart, send a follow-up</p>

                    {enableFollowup && (
                        <>
                            {/* Timeout Setting */}
                            <div className={`mt-3 p-3 rounded-lg border ${isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
                                <label className={`text-sm font-medium block mb-2 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>⏱️ Follow-up Timer</label>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>If not clicked within</span>
                                    <input
                                        type="number"
                                        min="3"
                                        max="60"
                                        value={followupTimeout}
                                        onChange={(e) => {
                                            const val = Math.max(3, Math.min(60, Number(e.target.value)));
                                            setFollowupTimeout(val);
                                            notifyChange({ followupTimeout: val });
                                        }}
                                        className={`w-16 rounded-lg px-2 py-1 text-sm text-center border ${isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                                    />
                                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>minutes</span>
                                </div>
                            </div>

                            {/* Follow-up Node Type Selection */}
                            <div className={`mt-3 p-3 rounded-lg border ${isDark ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'}`}>
                                <label className={`text-sm font-medium block mb-3 ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>📍 Send Follow-up To</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => {
                                            setFollowupNodeType('textNode');
                                            notifyChange({ followupNodeType: 'textNode' });
                                        }}
                                        className={`p-3 rounded-lg border text-center transition-all ${followupNodeType === 'textNode'
                                            ? 'bg-blue-500/30 border-blue-500/60 ring-2 ring-blue-500/40'
                                            : isDark ? 'bg-black/30 border-white/10 hover:bg-white/5' : 'bg-white border-slate-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        <MessageSquare className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                                        <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Text Node</div>
                                        <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Send message</div>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setFollowupNodeType('followupNode');
                                            notifyChange({ followupNodeType: 'followupNode' });
                                        }}
                                        className={`p-3 rounded-lg border text-center transition-all ${followupNodeType === 'followupNode'
                                            ? 'bg-rose-500/30 border-rose-500/60 ring-2 ring-rose-500/40'
                                            : isDark ? 'bg-black/30 border-white/10 hover:bg-white/5' : 'bg-white border-slate-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        <RefreshCw className="w-5 h-5 mx-auto mb-1 text-rose-400" />
                                        <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Follow-up</div>
                                        <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Reminder sequence</div>
                                    </button>
                                </div>
                                <p className={`text-[10px] mt-3 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>🔗 This will auto-connect and open the selected node in the flow builder</p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </CollapsibleSection>
    );

    // ================== LAYOUTS ==================
    // Generate preview URL for live preview
    const getPreviewUrl = () => {
        const previewConfig = {
            headline, headlineColor, headlineBgColor, headlineAnimation, headlineAnimationSpeed,
            showEmoji, emojiType, imageUrl, imageSource,
            imageBorderRadius, imageBorderColor, imageBorderWidth, price, priceBadgeColor,
            priceTextColor, priceBadgeSize, description, descriptionColor, buttonText, buttonBgColor,
            buttonTextColor, buttonBorderRadius, showButtonIcon, backgroundColor, pageBackgroundColor,
            showProductName, productName, productNameBgColor, productNameTextColor, productNameFontSize,
            productNameBorderRadius, productNameFullWidth,
            showCountdown, countdownMinutes, countdownPosition, countdownBgColor, countdownTextColor,
            countdownFontSize, countdownShowBg, countdownBorderRadius, countdownFullWidth
        };
        // Use encodeURIComponent to handle unicode characters properly
        const encodedConfig = encodeURIComponent(JSON.stringify(previewConfig));
        return `/product-webview-preview?config=${encodedConfig}`;
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

    // Desktop: Responsive modal width based on device selector
    if (isDesktop) {
        return (
            <div className={`fixed inset-0 z-50 p-[15px] flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-slate-100/50 backdrop-blur-sm'}`}>
                <div className={`w-full ${modalWidths[previewDevice]} h-full max-h-full flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 ${isDark ? 'bg-slate-800/50 border-white/10' : 'bg-white border-slate-200 shadow-xl'}`}>
                    {/* Header with Device Switcher */}
                    <div className={`flex-shrink-0 h-14 border-b flex items-center px-4 gap-4 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                        {/* Left: Title */}
                        <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center relative shadow-lg shadow-purple-500/20">
                                <ShoppingBag className="w-4 h-4 text-white" />
                                <Globe className="w-2.5 h-2.5 text-white absolute -bottom-0.5 -right-0.5 bg-indigo-600 rounded-full p-0.5" />
                            </div>
                            <span className={`text-base font-bold whitespace-nowrap ${isDark ? 'text-white' : 'text-slate-900'}`}>Product Webview</span>
                        </div>

                        {/* Center: Device Switcher */}
                        <div className="flex-1 flex justify-center">
                            <div className={`flex items-center gap-1 rounded-lg p-1 border ${isDark ? 'bg-slate-700/50 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice('mobile')}
                                    className={`p-2 rounded-md transition-all ${previewDevice === 'mobile' ? 'bg-teal-500 text-white shadow-sm' : isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-teal-600 hover:bg-white'}`}
                                    title="Mobile"
                                >
                                    <Smartphone className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice('tablet')}
                                    className={`p-2 rounded-md transition-all ${previewDevice === 'tablet' ? 'bg-teal-500 text-white shadow-sm' : isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-teal-600 hover:bg-white'}`}
                                    title="Tablet"
                                >
                                    <Tablet className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice('desktop')}
                                    className={`p-2 rounded-md transition-all ${previewDevice === 'desktop' ? 'bg-teal-500 text-white shadow-sm' : isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-teal-600 hover:bg-white'}`}
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
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${isDark ? 'bg-teal-500/20 hover:bg-teal-500/30 text-teal-400' : 'bg-teal-50 hover:bg-teal-100 text-teal-600'}`}
                                title="Open Live Preview"
                            >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Preview</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSaveNotification(true);
                                    setTimeout(() => setSaveNotification(false), 3000);
                                }}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-teal-500 hover:bg-teal-600 rounded-lg text-white text-xs font-medium transition-colors shadow-lg shadow-teal-500/20"
                                title="Save Configuration"
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span>Save</span>
                            </button>
                            {onClose && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
                                    title="Close"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Save Notification Toast */}
                        {saveNotification && (
                            <div className="absolute top-16 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in z-50">
                                <Check className="w-4 h-4" />
                                <span className="text-sm font-medium">Settings saved successfully!</span>
                            </div>
                        )}
                    </div>

                    {/* Content - Responsive based on device */}
                    {previewDevice === 'desktop' ? (
                        // Desktop: 3-Column Layout
                        <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
                            <div className={`col-span-4 border-r p-6 overflow-y-auto custom-scrollbar ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                                {actionSection}
                                <div className={`mt-6 pt-6 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                                    {basicSection}
                                </div>
                                <div className={`mt-6 pt-6 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                                    {imageSection}
                                </div>
                            </div>
                            <div className={`col-span-4 border-r p-6 overflow-y-auto custom-scrollbar ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                                {styleSection}
                                <div className={`mt-6 pt-6 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                                    {productOptionsSection}
                                </div>
                                <div className={`mt-6 pt-6 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                                    {actionTriggersSection}
                                </div>
                            </div>
                            <div className={`col-span-4 p-6 flex items-center justify-center overflow-auto ${isDark ? 'bg-slate-950/50' : 'bg-slate-50'}`}>
                                <DevicePreview />
                            </div>
                        </div>
                    ) : previewDevice === 'tablet' ? (
                        // Tablet: 2-Column Layout
                        <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
                            <div className={`border-r p-4 overflow-y-auto custom-scrollbar space-y-4 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                                {actionSection}
                                <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>{basicSection}</div>
                                <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>{imageSection}</div>
                                <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>{styleSection}</div>
                                <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>{productOptionsSection}</div>
                                <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>{actionTriggersSection}</div>
                            </div>
                            <div className={`p-4 flex items-center justify-center overflow-auto ${isDark ? 'bg-slate-950/50' : 'bg-slate-50'}`}>
                                <DevicePreview />
                            </div>
                        </div>
                    ) : (
                        // Mobile: 2-Column Layout (same as tablet - side by side)
                        <div className="flex-1 grid grid-cols-2 gap-0 overflow-hidden">
                            <div className={`border-r p-4 overflow-y-auto custom-scrollbar space-y-4 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                                {actionSection}
                                <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>{basicSection}</div>
                                <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>{imageSection}</div>
                                <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>{styleSection}</div>
                                <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>{productOptionsSection}</div>
                                <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>{actionTriggersSection}</div>
                            </div>
                            <div className={`p-4 flex items-center justify-center overflow-auto ${isDark ? 'bg-slate-950/50' : 'bg-slate-50'}`}>
                                <DevicePreview />
                            </div>
                        </div>
                    )}
                </div>
            </div >
        );
    }

    // ================== MOBILE: Step-by-Step Wizard ==================
    const currentStepContent = () => {
        switch (mobileStep) {
            case 0: return basicSection;
            case 1: return imageSection;
            case 2: return styleSection;
            case 3: return actionSection;
            default: return null;
        }
    };



    if (showMobilePreview) {
        return (
            <div className={`min-h-screen p-4 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setShowMobilePreview(false)}
                        className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500 hover:text-slate-800'}`}>
                        <ChevronLeft className="w-4 h-4" /> Back to Editor
                    </button>
                    <button onClick={openLivePreview}
                        className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors ${isDark ? 'text-teal-400 bg-teal-500/20 hover:bg-teal-500/30' : 'text-teal-600 bg-teal-50 hover:bg-teal-100'}`}>
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
        <div className={`min-h-screen flex flex-col ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
            {/* Progress Bar */}
            <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Step {mobileStep + 1} of {WIZARD_STEPS.length}</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowMobilePreview(true)}
                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${isDark ? 'text-teal-400 bg-teal-500/20' : 'text-teal-600 bg-teal-50'}`}>
                            <Eye className="w-3 h-3" /> Preview
                        </button>
                        <button onClick={openLivePreview}
                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${isDark ? 'text-purple-400 bg-purple-500/20' : 'text-purple-600 bg-purple-50'}`}
                            title="Open Live Page Preview">
                            <ExternalLink className="w-3 h-3" />
                        </button>
                    </div>
                </div>
                <div className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                    <div className="h-full bg-teal-500 transition-all" style={{ width: `${((mobileStep + 1) / WIZARD_STEPS.length) * 100}%` }} />
                </div>
                <div className="flex mt-2">
                    {WIZARD_STEPS.map((step, i) => (
                        <div key={step.id} className={`flex-1 text-center text-[10px] ${i <= mobileStep ? 'text-teal-500 font-medium' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>
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
            <div className={`flex-shrink-0 p-4 border-t flex gap-3 ${isDark ? 'border-white/10' : 'border-slate-200 bg-white'}`}>
                <button onClick={() => setMobileStep(Math.max(0, mobileStep - 1))} disabled={mobileStep === 0}
                    className={`flex-1 py-3 rounded-lg flex items-center justify-center gap-2 ${mobileStep === 0 ? (isDark ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-400') : (isDark ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50')}`}>
                    <ChevronLeft className="w-4 h-4" /> Back
                </button>
                {mobileStep < WIZARD_STEPS.length - 1 ? (
                    <button onClick={() => setMobileStep(mobileStep + 1)}
                        className="flex-1 py-3 rounded-lg bg-teal-500 text-white flex items-center justify-center gap-2 hover:bg-teal-600 shadow-md shadow-teal-500/20">
                        Next <ChevronRight className="w-4 h-4" />
                    </button>
                ) : (
                    <button onClick={() => setShowMobilePreview(true)}
                        className="flex-1 py-3 rounded-lg bg-green-500 text-white flex items-center justify-center gap-2 hover:bg-green-600 shadow-md shadow-green-500/20">
                        <Check className="w-4 h-4" /> Done
                    </button>
                )}
            </div>
        </div>
    );
};

export default ProductWebviewNodeForm;
