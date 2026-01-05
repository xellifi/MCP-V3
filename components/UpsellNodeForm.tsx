import React, { useState, useRef, useMemo } from 'react';
import {
    ShoppingBag, Type, Image, DollarSign, MousePointer2, Palette,
    Upload, Link, X, AlertCircle, Eye, Flame, Check, Sparkles,
    Circle, Square, RectangleHorizontal, ShoppingCart
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import CollapsibleTips from './CollapsibleTips';

interface UpsellNodeFormProps {
    workspaceId: string;
    initialConfig?: {
        // Headline
        headline?: string;
        headlineColor?: string;
        showEmoji?: boolean;
        emojiType?: 'fire' | 'star' | 'sparkle' | 'heart' | 'none';
        // Image
        imageUrl?: string;
        imageSource?: 'url' | 'upload';
        imageBorderRadius?: number;
        imageBorderColor?: string;
        imageBorderWidth?: number;
        // Price Badge
        price?: string;
        priceBadgeColor?: string;
        priceTextColor?: string;
        // Description
        description?: string;
        descriptionColor?: string;
        // Button
        buttonText?: string;
        buttonBgColor?: string;
        buttonTextColor?: string;
        buttonBorderRadius?: number;
        showButtonIcon?: boolean;
        // Background
        backgroundColor?: string;
        // Cart Action
        cartAction?: 'add' | 'replace';
        productName?: string;
        productPrice?: number;
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
    '#dc2626', // Red
    '#ea580c', // Orange
    '#ca8a04', // Yellow
    '#16a34a', // Green
    '#0891b2', // Cyan
    '#2563eb', // Blue
    '#7c3aed', // Purple
    '#db2777', // Pink
    '#1f2937', // Dark
    '#ffffff', // White
];

const UpsellNodeForm: React.FC<UpsellNodeFormProps> = ({
    workspaceId,
    initialConfig,
    onChange
}) => {
    // Headline state
    const [headline, setHeadline] = useState(initialConfig?.headline || 'Want to Add this item?');
    const [headlineColor, setHeadlineColor] = useState(initialConfig?.headlineColor || '#ffffff');
    const [showEmoji, setShowEmoji] = useState(initialConfig?.showEmoji ?? true);
    const [emojiType, setEmojiType] = useState<'fire' | 'star' | 'sparkle' | 'heart' | 'none'>(initialConfig?.emojiType || 'fire');

    // Image state
    const [imageUrl, setImageUrl] = useState(initialConfig?.imageUrl || '');
    const [imageSource, setImageSource] = useState<'url' | 'upload'>(initialConfig?.imageSource || 'url');
    const [imageBorderRadius, setImageBorderRadius] = useState(initialConfig?.imageBorderRadius ?? 16);
    const [imageBorderColor, setImageBorderColor] = useState(initialConfig?.imageBorderColor || '#ffffff');
    const [imageBorderWidth, setImageBorderWidth] = useState(initialConfig?.imageBorderWidth ?? 4);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Price state
    const [price, setPrice] = useState(initialConfig?.price || '₱588');
    const [priceBadgeColor, setPriceBadgeColor] = useState(initialConfig?.priceBadgeColor || '#10b981');
    const [priceTextColor, setPriceTextColor] = useState(initialConfig?.priceTextColor || '#ffffff');

    // Description state
    const [description, setDescription] = useState(initialConfig?.description || 'High quality shoes from Korea!');
    const [descriptionColor, setDescriptionColor] = useState(initialConfig?.descriptionColor || '#ffffff');

    // Button state
    const [buttonText, setButtonText] = useState(initialConfig?.buttonText || 'ok add this item!');
    const [buttonBgColor, setButtonBgColor] = useState(initialConfig?.buttonBgColor || '#3b82f6');
    const [buttonTextColor, setButtonTextColor] = useState(initialConfig?.buttonTextColor || '#ffffff');
    const [buttonBorderRadius, setButtonBorderRadius] = useState(initialConfig?.buttonBorderRadius ?? 12);
    const [showButtonIcon, setShowButtonIcon] = useState(initialConfig?.showButtonIcon ?? true);

    // Background state
    const [backgroundColor, setBackgroundColor] = useState(initialConfig?.backgroundColor || '#dc2626');

    // Cart action state
    const [cartAction, setCartAction] = useState<'add' | 'replace'>(initialConfig?.cartAction || 'add');
    const [productName, setProductName] = useState(initialConfig?.productName || '');
    const [productPrice, setProductPrice] = useState(initialConfig?.productPrice || 0);

    // Active section for accordion
    const [activeSection, setActiveSection] = useState<string>('headline');

    // Notify parent of changes
    const notifyChange = (updates: Partial<typeof initialConfig> = {}) => {
        onChange({
            headline,
            headlineColor,
            showEmoji,
            emojiType,
            imageUrl,
            imageSource,
            imageBorderRadius,
            imageBorderColor,
            imageBorderWidth,
            price,
            priceBadgeColor,
            priceTextColor,
            description,
            descriptionColor,
            buttonText,
            buttonBgColor,
            buttonTextColor,
            buttonBorderRadius,
            showButtonIcon,
            backgroundColor,
            cartAction,
            productName: productName || headline,
            productPrice: parseFloat(price.replace(/[^0-9.]/g, '')) || 0,
            ...updates
        });
    };

    // Handle image upload
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setUploadError('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setUploadError('Image must be less than 5MB');
            return;
        }

        setIsUploading(true);
        setUploadError('');

        try {
            const fileName = `upsell-${Date.now()}-${file.name}`;
            const filePath = `${workspaceId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('attachments')
                .getPublicUrl(filePath);

            setImageUrl(publicUrl);
            notifyChange({ imageUrl: publicUrl, imageSource: 'upload' });
        } catch (error: any) {
            console.error('Upload error:', error);
            setUploadError(error.message || 'Failed to upload image');
        } finally {
            setIsUploading(false);
        }
    };

    const getEmojiDisplay = () => {
        const emoji = EMOJI_OPTIONS.find(e => e.value === emojiType);
        return emoji?.label || '';
    };

    // Section toggle
    const toggleSection = (section: string) => {
        setActiveSection(activeSection === section ? '' : section);
    };

    // Color picker component
    const ColorPicker = ({
        value,
        onChange: onColorChange,
        label
    }: {
        value: string;
        onChange: (color: string) => void;
        label: string;
    }) => (
        <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400">{label}</label>
            <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map(color => (
                    <button
                        key={color}
                        onClick={() => onColorChange(color)}
                        className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${value === color ? 'border-white scale-110' : 'border-transparent'
                            }`}
                        style={{ backgroundColor: color }}
                    />
                ))}
                <div className="relative">
                    <input
                        type="color"
                        value={value}
                        onChange={(e) => onColorChange(e.target.value)}
                        className="w-6 h-6 rounded-full cursor-pointer opacity-0 absolute inset-0"
                    />
                    <div
                        className="w-6 h-6 rounded-full border-2 border-dashed border-slate-500 flex items-center justify-center bg-gradient-to-br from-red-500 via-green-500 to-blue-500"
                    >
                        <Palette className="w-3 h-3 text-white" />
                    </div>
                </div>
            </div>
        </div>
    );

    // Section header component
    const SectionHeader = ({
        id,
        icon: Icon,
        title,
        color
    }: {
        id: string;
        icon: React.ElementType;
        title: string;
        color: string;
    }) => (
        <button
            onClick={() => toggleSection(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${activeSection === id
                ? `bg-${color}-500/20 border-${color}-500/30`
                : 'bg-black/20 border-white/10 hover:bg-white/5'
                }`}
        >
            <div className={`p-1.5 rounded-lg bg-${color}-500/20`}>
                <Icon className={`w-4 h-4 text-${color}-400`} />
            </div>
            <span className="font-semibold text-sm text-white">{title}</span>
            <div className={`ml-auto transition-transform ${activeSection === id ? 'rotate-180' : ''}`}>
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </button>
    );

    // Mobile view toggle
    const [mobileView, setMobileView] = useState<'preview' | 'config'>('config');

    // Preview JSX - memoized to prevent unnecessary rerenders
    const previewCardJSX = useMemo(() => (
        <div
            className="rounded-2xl p-4 md:p-5 shadow-2xl transition-all duration-300"
            style={{ backgroundColor }}
        >
            {/* Headline with Emojis */}
            <div
                className="text-center font-bold text-base md:text-lg mb-3 md:mb-4 flex items-center justify-center gap-2"
                style={{ color: headlineColor }}
            >
                {showEmoji && emojiType !== 'none' && <span>{getEmojiDisplay()}</span>}
                <span>{headline || 'Your Headline'}</span>
                {showEmoji && emojiType !== 'none' && <span>{getEmojiDisplay()}</span>}
            </div>

            {/* Image Container with Price Badge */}
            <div className="relative mb-3 md:mb-4">
                <div
                    className="overflow-hidden aspect-square"
                    style={{
                        borderRadius: `${imageBorderRadius}px`,
                        border: `${imageBorderWidth}px solid ${imageBorderColor}`,
                    }}
                >
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt="Product"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-slate-700/50 flex items-center justify-center">
                            <Image className="w-12 h-12 text-slate-500" />
                        </div>
                    )}
                </div>

                {/* Price Badge */}
                {price && (
                    <div
                        className="absolute -top-2 -right-2 md:-top-3 md:-right-3 px-3 py-1.5 md:px-4 md:py-2 rounded-full font-bold text-sm md:text-lg shadow-lg border-2 border-dashed border-white/30"
                        style={{
                            backgroundColor: priceBadgeColor,
                            color: priceTextColor
                        }}
                    >
                        {price}
                    </div>
                )}
            </div>

            {/* Description */}
            {description && (
                <p
                    className="text-center text-sm md:text-base mb-3 md:mb-4"
                    style={{ color: descriptionColor }}
                >
                    {description}
                </p>
            )}

            {/* CTA Button */}
            <button
                className="w-full py-2.5 md:py-3 px-4 font-bold text-sm md:text-base flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                style={{
                    backgroundColor: buttonBgColor,
                    color: buttonTextColor,
                    borderRadius: `${buttonBorderRadius}px`
                }}
            >
                {showButtonIcon && <Check className="w-4 h-4 md:w-5 md:h-5" />}
                {buttonText || 'Add to Cart'}
            </button>
        </div>
    ), [backgroundColor, headlineColor, showEmoji, emojiType, headline, imageBorderRadius, imageBorderWidth, imageBorderColor, imageUrl, price, priceBadgeColor, priceTextColor, description, descriptionColor, buttonBgColor, buttonTextColor, buttonBorderRadius, showButtonIcon, buttonText, getEmojiDisplay]);

    // Configuration Form JSX - memoized to prevent focus loss
    const configFormJSX = useMemo(() => (
        <div className="space-y-3">
            {/* Headline Section */}
            <div className="space-y-3">
                <SectionHeader id="headline" icon={Type} title="Headline" color="amber" />
                {activeSection === 'headline' && (
                    <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/10 animate-fade-in">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Headline Text</label>
                            <input
                                type="text"
                                value={headline}
                                onChange={(e) => {
                                    setHeadline(e.target.value);
                                    notifyChange({ headline: e.target.value });
                                }}
                                placeholder="Want to Add this item?"
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-teal-500/50 outline-none transition-all placeholder-slate-500"
                            />
                        </div>

                        <ColorPicker
                            value={headlineColor}
                            onChange={(c) => { setHeadlineColor(c); notifyChange({ headlineColor: c }); }}
                            label="Headline Color"
                        />

                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-slate-300">Show Emojis</label>
                            <button
                                onClick={() => {
                                    setShowEmoji(!showEmoji);
                                    notifyChange({ showEmoji: !showEmoji });
                                }}
                                className={`w-12 h-6 rounded-full transition-all ${showEmoji ? 'bg-teal-500' : 'bg-slate-600'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${showEmoji ? 'translate-x-6' : 'translate-x-0.5'}`} />
                            </button>
                        </div>

                        {showEmoji && (
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-2">Emoji Style</label>
                                <div className="flex gap-2">
                                    {EMOJI_OPTIONS.map(emoji => (
                                        <button
                                            key={emoji.value}
                                            onClick={() => {
                                                setEmojiType(emoji.value as 'fire' | 'star' | 'sparkle' | 'heart' | 'none');
                                                notifyChange({ emojiType: emoji.value });
                                            }}
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${emojiType === emoji.value
                                                ? 'bg-teal-500/30 border-2 border-teal-500'
                                                : 'bg-black/30 border border-white/10 hover:bg-white/5'
                                                }`}
                                            title={emoji.name}
                                        >
                                            {emoji.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Image Section */}
            <div className="space-y-3">
                <SectionHeader id="image" icon={Image} title="Product Image" color="rose" />
                {activeSection === 'image' && (
                    <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/10 animate-fade-in">
                        {/* Image Source Toggle */}
                        <div className="flex rounded-xl overflow-hidden border border-white/10">
                            <button
                                onClick={() => {
                                    setImageSource('url');
                                    notifyChange({ imageSource: 'url' });
                                }}
                                className={`flex-1 py-2.5 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-all ${imageSource === 'url'
                                    ? 'bg-teal-500/20 text-teal-400'
                                    : 'bg-black/20 text-slate-400 hover:text-white'
                                    }`}
                            >
                                <Link className="w-4 h-4" />
                                URL
                            </button>
                            <button
                                onClick={() => {
                                    setImageSource('upload');
                                    notifyChange({ imageSource: 'upload' });
                                }}
                                className={`flex-1 py-2.5 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-all ${imageSource === 'upload'
                                    ? 'bg-teal-500/20 text-teal-400'
                                    : 'bg-black/20 text-slate-400 hover:text-white'
                                    }`}
                            >
                                <Upload className="w-4 h-4" />
                                Upload
                            </button>
                        </div>

                        {imageSource === 'url' ? (
                            <input
                                type="url"
                                value={imageUrl}
                                onChange={(e) => {
                                    setImageUrl(e.target.value);
                                    notifyChange({ imageUrl: e.target.value });
                                }}
                                placeholder="https://example.com/image.jpg"
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-teal-500/50 outline-none transition-all placeholder-slate-500"
                            />
                        ) : (
                            <div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="w-full py-4 border-2 border-dashed border-white/20 rounded-xl text-slate-400 hover:text-white hover:border-teal-500/50 transition-all flex items-center justify-center gap-2"
                                >
                                    {isUploading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-5 h-5" />
                                            Click to upload image
                                        </>
                                    )}
                                </button>
                                {uploadError && (
                                    <div className="mt-2 text-red-400 text-sm flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4" />
                                        {uploadError}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Border Radius */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">Border Radius: {imageBorderRadius}px</label>
                            <input
                                type="range"
                                min="0"
                                max="50"
                                value={imageBorderRadius}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setImageBorderRadius(val);
                                    notifyChange({ imageBorderRadius: val });
                                }}
                                className="w-full accent-teal-500"
                            />
                            <div className="flex justify-between mt-1">
                                <button onClick={() => { setImageBorderRadius(0); notifyChange({ imageBorderRadius: 0 }); }} className="p-1.5 bg-black/30 rounded hover:bg-white/10">
                                    <Square className="w-4 h-4 text-slate-400" />
                                </button>
                                <button onClick={() => { setImageBorderRadius(16); notifyChange({ imageBorderRadius: 16 }); }} className="p-1.5 bg-black/30 rounded hover:bg-white/10">
                                    <RectangleHorizontal className="w-4 h-4 text-slate-400" />
                                </button>
                                <button onClick={() => { setImageBorderRadius(50); notifyChange({ imageBorderRadius: 50 }); }} className="p-1.5 bg-black/30 rounded hover:bg-white/10">
                                    <Circle className="w-4 h-4 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        {/* Border Width */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">Border Width: {imageBorderWidth}px</label>
                            <input
                                type="range"
                                min="0"
                                max="10"
                                value={imageBorderWidth}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setImageBorderWidth(val);
                                    notifyChange({ imageBorderWidth: val });
                                }}
                                className="w-full accent-teal-500"
                            />
                        </div>

                        <ColorPicker
                            value={imageBorderColor}
                            onChange={(c) => { setImageBorderColor(c); notifyChange({ imageBorderColor: c }); }}
                            label="Border Color"
                        />
                    </div>
                )}
            </div>

            {/* Price Badge Section */}
            <div className="space-y-3">
                <SectionHeader id="price" icon={DollarSign} title="Price Badge" color="emerald" />
                {activeSection === 'price' && (
                    <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/10 animate-fade-in">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Price Text</label>
                            <input
                                type="text"
                                value={price}
                                onChange={(e) => {
                                    setPrice(e.target.value);
                                    notifyChange({ price: e.target.value });
                                }}
                                placeholder="₱588"
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-teal-500/50 outline-none transition-all placeholder-slate-500"
                            />
                        </div>

                        <ColorPicker
                            value={priceBadgeColor}
                            onChange={(c) => { setPriceBadgeColor(c); notifyChange({ priceBadgeColor: c }); }}
                            label="Badge Color"
                        />

                        <ColorPicker
                            value={priceTextColor}
                            onChange={(c) => { setPriceTextColor(c); notifyChange({ priceTextColor: c }); }}
                            label="Text Color"
                        />
                    </div>
                )}
            </div>

            {/* Description Section */}
            <div className="space-y-3">
                <SectionHeader id="description" icon={Type} title="Description" color="blue" />
                {activeSection === 'description' && (
                    <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/10 animate-fade-in">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Description Text</label>
                            <textarea
                                value={description}
                                onChange={(e) => {
                                    setDescription(e.target.value);
                                    notifyChange({ description: e.target.value });
                                }}
                                placeholder="High quality product..."
                                rows={2}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-teal-500/50 outline-none transition-all placeholder-slate-500 resize-none"
                            />
                        </div>

                        <ColorPicker
                            value={descriptionColor}
                            onChange={(c) => { setDescriptionColor(c); notifyChange({ descriptionColor: c }); }}
                            label="Text Color"
                        />
                    </div>
                )}
            </div>

            {/* Button Section */}
            <div className="space-y-3">
                <SectionHeader id="button" icon={MousePointer2} title="CTA Button" color="indigo" />
                {activeSection === 'button' && (
                    <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/10 animate-fade-in">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Button Text</label>
                            <input
                                type="text"
                                value={buttonText}
                                onChange={(e) => {
                                    setButtonText(e.target.value);
                                    notifyChange({ buttonText: e.target.value });
                                }}
                                placeholder="Add to Cart"
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-teal-500/50 outline-none transition-all placeholder-slate-500"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-slate-300">Show Checkmark Icon</label>
                            <button
                                onClick={() => {
                                    setShowButtonIcon(!showButtonIcon);
                                    notifyChange({ showButtonIcon: !showButtonIcon });
                                }}
                                className={`w-12 h-6 rounded-full transition-all ${showButtonIcon ? 'bg-teal-500' : 'bg-slate-600'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${showButtonIcon ? 'translate-x-6' : 'translate-x-0.5'}`} />
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">Border Radius: {buttonBorderRadius}px</label>
                            <input
                                type="range"
                                min="0"
                                max="30"
                                value={buttonBorderRadius}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setButtonBorderRadius(val);
                                    notifyChange({ buttonBorderRadius: val });
                                }}
                                className="w-full accent-teal-500"
                            />
                        </div>

                        <ColorPicker
                            value={buttonBgColor}
                            onChange={(c) => { setButtonBgColor(c); notifyChange({ buttonBgColor: c }); }}
                            label="Button Color"
                        />

                        <ColorPicker
                            value={buttonTextColor}
                            onChange={(c) => { setButtonTextColor(c); notifyChange({ buttonTextColor: c }); }}
                            label="Text Color"
                        />
                    </div>
                )}
            </div>

            {/* Background Section */}
            <div className="space-y-3">
                <SectionHeader id="background" icon={Palette} title="Background" color="purple" />
                {activeSection === 'background' && (
                    <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/10 animate-fade-in">
                        <ColorPicker
                            value={backgroundColor}
                            onChange={(c) => { setBackgroundColor(c); notifyChange({ backgroundColor: c }); }}
                            label="Card Background Color"
                        />
                    </div>
                )}
            </div>

            {/* Cart Action Section */}
            <div className="space-y-3">
                <SectionHeader id="cart" icon={ShoppingCart} title="Cart Action" color="teal" />
                {activeSection === 'cart' && (
                    <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/10 animate-fade-in">
                        <p className="text-xs text-slate-400 mb-3">
                            What happens when customer accepts this upsell?
                        </p>
                        <div className="grid grid-cols-1 gap-2 relative z-10">
                            <button
                                type="button"
                                onClick={() => { setCartAction('add'); notifyChange({ cartAction: 'add' }); }}
                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative z-10 ${cartAction === 'add'
                                    ? 'bg-teal-500/20 border-teal-500/50 text-white'
                                    : 'bg-black/30 border-white/10 text-slate-400 hover:border-white/20 hover:bg-black/40'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="font-medium">➕ Add to Main Product</div>
                                    {cartAction === 'add' && <Check className="w-5 h-5 text-teal-400" />}
                                </div>
                                <div className="text-xs mt-1 opacity-70">
                                    Upsell will be <span className="text-teal-400 font-semibold">ADDED</span> to the cart.
                                    Customer pays for both (Product ₱888 + Upsell ₱588 = ₱1,476)
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => { setCartAction('replace'); notifyChange({ cartAction: 'replace' }); }}
                                className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative z-10 ${cartAction === 'replace'
                                    ? 'bg-orange-500/20 border-orange-500/50 text-white'
                                    : 'bg-black/30 border-white/10 text-slate-400 hover:border-white/20 hover:bg-black/40'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="font-medium">🔄 Replace Main Product</div>
                                    {cartAction === 'replace' && <Check className="w-5 h-5 text-orange-400" />}
                                </div>
                                <div className="text-xs mt-1 opacity-70">
                                    Upsell will <span className="text-orange-400 font-semibold">REPLACE</span> the main product.
                                    Customer pays only for upsell (₱588 only)
                                </div>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Tips */}
            <CollapsibleTips title="Tips & Best Practices" color="green">
                <ul className="text-sm space-y-1.5">
                    <li>• Use high-contrast colors for better visibility</li>
                    <li>• Keep the headline short and compelling</li>
                    <li>• Use clear, high-quality product images</li>
                    <li>• Make the price badge stand out from the background</li>
                    <li>• Use action-oriented button text (e.g., "Add Now!", "Get This!")</li>
                </ul>
            </CollapsibleTips>
        </div>
    ), [activeSection, headline, headlineColor, showEmoji, emojiType, imageSource, imageUrl, isUploading, uploadError, imageBorderRadius, imageBorderWidth, imageBorderColor, price, priceBadgeColor, priceTextColor, description, descriptionColor, buttonText, showButtonIcon, buttonBorderRadius, buttonBgColor, buttonTextColor, backgroundColor]);

    return (
        <>
            {/* Mobile: Toggle Switch */}
            <div className="md:hidden mb-4">
                <div className="flex rounded-xl overflow-hidden border border-white/10 bg-black/20">
                    <button
                        onClick={() => setMobileView('config')}
                        className={`flex-1 py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${mobileView === 'config'
                            ? 'bg-teal-500/20 text-teal-400 border-b-2 border-teal-500'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <Sparkles className="w-4 h-4" />
                        Configure
                    </button>
                    <button
                        onClick={() => setMobileView('preview')}
                        className={`flex-1 py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${mobileView === 'preview'
                            ? 'bg-teal-500/20 text-teal-400 border-b-2 border-teal-500'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <Eye className="w-4 h-4" />
                        Preview
                    </button>
                </div>
            </div>

            {/* Mobile: Show either config or preview based on toggle */}
            <div className="md:hidden">
                {mobileView === 'preview' ? (
                    <div className="flex items-center justify-center p-4">
                        <div className="max-w-[320px] w-full">
                            {previewCardJSX}
                        </div>
                    </div>
                ) : (
                    configFormJSX
                )}
            </div>

            {/* Desktop: 2-Column Layout */}
            <div className="hidden md:grid md:grid-cols-2 md:gap-6">
                {/* Left Column: Configuration Form */}
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                    {configFormJSX}
                </div>

                {/* Right Column: Live Preview (Sticky) */}
                <div className="relative">
                    <div className="sticky top-0">
                        <div className="flex items-center gap-2 mb-3">
                            <Eye className="w-4 h-4 text-teal-400" />
                            <span className="text-sm font-semibold text-white">Live Preview</span>
                        </div>
                        <div className="flex items-center justify-center">
                            <div className="max-w-[320px] w-full">
                                {previewCardJSX}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default UpsellNodeForm;

