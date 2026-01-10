import React, { useState, useRef, useEffect } from 'react';
import {
    Image, Link, Upload, X, AlertCircle, Clock, MousePointer2, ExternalLink,
    ChevronDown, ChevronUp, Smartphone, Monitor, Tablet, ArrowUp, ArrowDown,
    Workflow, Plus, ShoppingBag
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import CollapsibleTips from './CollapsibleTips';

interface ImageNodeFormProps {
    workspaceId: string;
    initialConfig?: {
        imageUrl?: string;
        imageSource?: 'url' | 'upload';
        caption?: string;
        delaySeconds?: number;
        // Button options
        showButton?: boolean;
        buttonText?: string;
        buttonAction?: 'url' | 'create_flow' | 'existing_flow' | 'upsell' | 'downsell';
        buttonUrl?: string;
        buttonFlowId?: string;
        buttonFlowName?: string;
    };
    onChange: (config: any) =&gt; void;
    onClose?: () =&gt; void;
}

// Collapsible Section Component
const CollapsibleSection = ({
    title,
    icon: Icon,
    children,
    defaultOpen = true
}: {
    title: string;
icon ?: React.ElementType;
children: React.ReactNode;
defaultOpen ?: boolean;
}) =& gt; {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        & lt;div className = "bg-black/20 rounded-xl overflow-hidden border border-white/5" & gt;
            & lt; button
    type = "button"
    onClick = {() =& gt; setIsOpen(!isOpen)
}
className = "w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
    & gt;
                & lt;div className = "flex items-center gap-2" & gt;
{ Icon & amp;& amp; & lt;Icon className = "w-4 h-4 text-rose-400" /& gt; }
                    & lt;span className = "text-sm font-semibold text-white" & gt; { title }& lt;/span&gt;
                & lt;/div&gt;
{
    isOpen ? (
                    & lt;ChevronUp className = "w-4 h-4 text-slate-400" /& gt;
                ) : (
                    & lt;ChevronDown className = "w-4 h-4 text-slate-400" /& gt;
                )
}
            & lt;/button&gt;
{
    isOpen & amp;& amp; (
                & lt;div className = "px-4 pb-4 space-y-4 border-t border-white/5" & gt;
    { children }
                & lt;/div&gt;
            )
}
        & lt;/div&gt;
    );
};

const ImageNodeForm: React.FC & lt; ImageNodeFormProps & gt; = ({
    workspaceId,
    initialConfig,
    onChange,
    onClose
}) =& gt; {
    // Image state
    const [imageSource, setImageSource] = useState & lt; 'url' | 'upload' & gt; (initialConfig?.imageSource || 'url');
    const [imageUrl, setImageUrl] = useState(initialConfig?.imageUrl || '');
    const [caption, setCaption] = useState(initialConfig?.caption || '');
    const [delaySeconds, setDelaySeconds] = useState(initialConfig?.delaySeconds || 0);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [previewError, setPreviewError] = useState(false);
    const fileInputRef = useRef & lt; HTMLInputElement & gt; (null);

    // Button state
    const [showButton, setShowButton] = useState(initialConfig?.showButton || false);
    const [buttonText, setButtonText] = useState(initialConfig?.buttonText || 'Learn More');
    const [buttonAction, setButtonAction] = useState & lt; 'url' | 'create_flow' | 'existing_flow' | 'upsell' | 'downsell' & gt; (
        initialConfig?.buttonAction || 'url'
    );
    const [buttonUrl, setButtonUrl] = useState(initialConfig?.buttonUrl || '');
    const [buttonFlowId, setButtonFlowId] = useState(initialConfig?.buttonFlowId || '');
    const [buttonFlowName, setButtonFlowName] = useState(initialConfig?.buttonFlowName || '');

    // UI state
    const [flows, setFlows] = useState & lt; any[] & gt; ([]);
    const [loadingFlows, setLoadingFlows] = useState(false);
    const [previewDevice, setPreviewDevice] = useState & lt; 'desktop' | 'tablet' | 'mobile' & gt; ('mobile');
    const [isDesktop, setIsDesktop] = useState(window.innerWidth & gt;= 1024);

    // Handle window resize
    useEffect(() =& gt; {
        const handleResize = () =& gt; setIsDesktop(window.innerWidth & gt;= 1024);
        window.addEventListener('resize', handleResize);
        return () =& gt; window.removeEventListener('resize', handleResize);
    }, []);

    // Load flows for the dropdown when action is 'existing_flow'
    useEffect(() =& gt; {
        if (buttonAction === 'existing_flow' & amp;& amp; workspaceId) {
            loadFlows();
        }
    }, [buttonAction, workspaceId]);

    const loadFlows = async() =& gt; {
        setLoadingFlows(true);
        try {
            const { data, error } = await supabase
                .from('flows')
                .select('id, name')
                .eq('workspace_id', workspaceId)
                .order('name');

            if (data) setFlows(data);
        } catch (e) {
            console.error('Failed to load flows:', e);
        }
        setLoadingFlows(false);
    };

    const notifyChange = (updates: any = {}) =& gt; {
        onChange({
            imageUrl,
            imageSource,
            caption,
            delaySeconds,
            showButton,
            buttonText,
            buttonAction,
            buttonUrl,
            buttonFlowId,
            buttonFlowName,
            ...updates
        });
    };

    const handleUrlChange = (url: string) =& gt; {
        setImageUrl(url);
        setPreviewError(false);
        notifyChange({ imageUrl: url });
    };

    const handleCaptionChange = (text: string) =& gt; {
        setCaption(text);
        notifyChange({ caption: text });
    };

    const handleDelayChange = (value: number) =& gt; {
        setDelaySeconds(value);
        notifyChange({ delaySeconds: value });
    };

    const handleSourceChange = (source: 'url' | 'upload') =& gt; {
        setImageSource(source);
        if (source !== imageSource) {
            setImageUrl('');
            setPreviewError(false);
            notifyChange({ imageUrl: '', imageSource: source });
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent & lt; HTMLInputElement & gt;) =& gt; {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            setUploadError('Invalid file type. Please upload PNG, JPEG, or GIF.');
            return;
        }

        const maxSize = 5 * 1024 * 1024;
        if (file.size & gt; maxSize) {
            setUploadError('File too large. Maximum size is 5MB.');
            return;
        }

        setUploading(true);
        setUploadError('');

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${workspaceId}/${Date.now()}.${fileExt}`;

            const { data, error } = await supabase.storage
                .from('flow-images')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            const { data: urlData } = supabase.storage
                .from('flow-images')
                .getPublicUrl(fileName);

            const publicUrl = urlData.publicUrl;
            setImageUrl(publicUrl);
            setPreviewError(false);
            notifyChange({ imageUrl: publicUrl, imageSource: 'upload' });
        } catch (error: any) {
            console.error('Upload error:', error);
            setUploadError(error.message || 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const clearImage = () =& gt; {
        setImageUrl('');
        setPreviewError(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        notifyChange({ imageUrl: '' });
    };

    // Button action options
    const buttonActionOptions = [
        { value: 'url', label: 'Open URL', icon: ExternalLink, description: 'Opens a web link' },
        { value: 'create_flow', label: 'Create New Flow', icon: Plus, description: 'Create new automation' },
        { value: 'existing_flow', label: 'Existing Flow', icon: Workflow, description: 'Run an existing flow' },
        { value: 'upsell', label: 'Upsell Offer', icon: ArrowUp, description: 'Show upsell webview' },
        { value: 'downsell', label: 'Downsell Offer', icon: ArrowDown, description: 'Show downsell webview' },
    ];

    // Device preview sizes
    const deviceSizes = {
        mobile: { width: 280, height: 480, radius: 40, notch: true },
        tablet: { width: 340, height: 440, radius: 24, notch: false },
        desktop: { width: 420, height: 280, radius: 8, notch: false }
    };

    // ================== DEVICE PREVIEW ==================
    const DevicePreview = () =& gt; {
        const size = deviceSizes[previewDevice];
        const getScreenBg = () =& gt; previewDevice === 'desktop' ? 'bg-white' : 'bg-gradient-to-b from-slate-800 to-slate-900';
        const getStatusBarStyle = () =& gt; previewDevice === 'desktop'
            ? 'text-slate-500 bg-slate-100 border-b border-slate-200'
            : 'text-white/60';

        return (
            & lt;div className = "flex flex-col items-center" & gt;
                & lt;div className = "relative" style = {{ width: size.width, height: size.height }
    }& gt;
    {/* Device Frame */ }
                    & lt; div
    className = {`w-full h-full shadow-2xl border-4 flex flex-col ${previewDevice === 'desktop' ? 'bg-slate-200 border-slate-400' : 'bg-slate-900 border-slate-700'}`
}
style = {{ borderRadius: size.radius }}
                    & gt;
{/* Notch (mobile only) */ }
{
    size.notch & amp;& amp; (
                            & lt;div className = "absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-10" /& gt;
                        )
}
{/* Screen */ }
                        & lt; div
className = {`w-full h-full overflow-hidden flex flex-col ${getScreenBg()}`}
style = {{ borderRadius: Math.max(size.radius - 6, 4) }}
                        & gt;
{/* Status bar */ }
                            & lt;div className = {`h-5 flex-shrink-0 flex items-center justify-between px-3 text-[9px] ${getStatusBarStyle()}`}& gt;
{
    previewDevice === 'desktop' ? (
                                    & lt;& gt;
                                        & lt;div className = "flex items-center gap-1" & gt;
                                            & lt;div className = "w-2 h-2 rounded-full bg-red-400" & gt;& lt;/div&gt;
                                            & lt;div className = "w-2 h-2 rounded-full bg-yellow-400" & gt;& lt;/div&gt;
                                            & lt;div className = "w-2 h-2 rounded-full bg-green-400" & gt;& lt;/div&gt;
                                        & lt;/div&gt;
                                        & lt;span className = "text-[8px] text-slate-400" & gt; m.me / yourpage & lt;/span&gt;
                                        & lt; div & gt;& lt;/div&gt;
                                    & lt;/&gt;
                                ) : (
                                    & lt;& gt;
                                        & lt; span & gt; 9: 41 & lt;/span&gt;
                                        & lt; span & gt;⚡ 100 %& lt;/span&gt;
                                    & lt;/&gt;
                                )
}
                            & lt;/div&gt;

{/* Content - Messenger style */ }
                            & lt;div className = "flex-1 overflow-y-auto p-3 bg-slate-100" & gt;
{/* Messenger Header */ }
                                & lt;div className = "flex items-center gap-2 mb-3" & gt;
                                    & lt;div className = "w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center" & gt;
                                        & lt;span className = "text-white text-xs font-bold" & gt; P & lt;/span&gt;
                                    & lt;/div&gt;
                                    & lt;div className = "text-xs text-slate-600 font-medium" & gt;Your Page & lt;/div&gt;
                                & lt;/div&gt;

{/* Message Bubble with Image */ }
                                & lt;div className = "flex flex-col items-start" & gt;
                                    & lt;div className = "bg-white rounded-2xl rounded-bl-md shadow-sm overflow-hidden max-w-[85%]" & gt;
{/* Image */ }
{
    imageUrl ? (
                                            & lt; img
    src = { imageUrl }
    alt = "Preview"
    className = "w-full h-auto max-h-40 object-cover"
    onError = {() =& gt; setPreviewError(true)
}
                                            /&gt;
                                        ) : (
                                            & lt;div className = "w-full h-32 bg-slate-200 flex items-center justify-center" & gt;
                                                & lt;Image className = "w-8 h-8 text-slate-400" /& gt;
                                            & lt;/div&gt;
                                        )}

{/* Caption */ }
{
    caption & amp;& amp; (
                                            & lt;div className = "px-3 py-2 text-sm text-slate-800" & gt;
    { caption }
                                            & lt;/div&gt;
                                        )
}

{/* Button (if enabled) */ }
{
    showButton & amp;& amp; (
                                            & lt;div className = "border-t border-slate-100" & gt;
                                                & lt;button className = "w-full py-2.5 text-blue-600 font-semibold text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5" & gt;
    { buttonAction === 'url' & amp;& amp; & lt;ExternalLink className = "w-4 h-4" /& gt; }
    { buttonAction === 'upsell' & amp;& amp; & lt;ShoppingBag className = "w-4 h-4" /& gt; }
    { buttonAction === 'downsell' & amp;& amp; & lt;ShoppingBag className = "w-4 h-4" /& gt; }
    { buttonAction === 'existing_flow' & amp;& amp; & lt;Workflow className = "w-4 h-4" /& gt; }
    { buttonAction === 'create_flow' & amp;& amp; & lt;Plus className = "w-4 h-4" /& gt; }
    { buttonText || 'Button' }
                                                & lt;/button&gt;
                                            & lt;/div&gt;
                                        )
}
                                    & lt;/div&gt;
                                    & lt;span className = "text-[10px] text-slate-400 mt-1 ml-1" & gt;Just now & lt;/span&gt;
                                & lt;/div&gt;

{/* Delay indicator */ }
{
    delaySeconds & gt; 0 & amp;& amp; (
                                    & lt;div className = "mt-3 flex items-center gap-1 text-[10px] text-slate-400" & gt;
                                        & lt;Clock className = "w-3 h-3" /& gt;
                                        & lt; span & gt;Sends after { delaySeconds }s delay & lt;/span&gt;
                                    & lt;/div&gt;
                                )
}
                            & lt;/div&gt;

{/* Home indicator (mobile only) */ }
{
    size.notch & amp;& amp; (
                                & lt;div className = "h-4 flex-shrink-0 flex items-center justify-center bg-slate-100" & gt;
                                    & lt;div className = "w-20 h-1 bg-slate-300 rounded-full" /& gt;
                                & lt;/div&gt;
                            )
}
                        & lt;/div&gt;
                    & lt;/div&gt;
                & lt;/div&gt;
            & lt;/div&gt;
        );
    };

// ================== FORM SECTIONS ==================
const imageSection = (
        & lt;CollapsibleSection title = "Image" icon = { Image } defaultOpen = { true} & gt;
{/* Image Source Toggle */ }
            & lt;div className = "flex gap-2" & gt;
                & lt; button
type = "button"
onClick = {() =& gt; handleSourceChange('url')}
className = {`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${imageSource === 'url'
    ? 'bg-rose-500 text-white'
    : 'bg-white/5 text-slate-400 hover:bg-white/10'
    }`}
                & gt;
                    & lt;Link className = "w-4 h-4" /& gt; URL
    & lt;/button&gt;
                & lt; button
type = "button"
onClick = {() =& gt; handleSourceChange('upload')}
className = {`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${imageSource === 'upload'
    ? 'bg-rose-500 text-white'
    : 'bg-white/5 text-slate-400 hover:bg-white/10'
    }`}
                & gt;
                    & lt;Upload className = "w-4 h-4" /& gt; Upload
    & lt;/button&gt;
            & lt;/div&gt;

{/* URL Input */ }
{
    imageSource === 'url' & amp;& amp; (
                & lt; div & gt;
                    & lt;label className = "block text-xs text-slate-400 mb-1" & gt;Image URL & lt;/label&gt;
                    & lt; input
    type = "url"
    value = { imageUrl }
    onChange = {(e) =& gt; handleUrlChange(e.target.value)
}
placeholder = "https://example.com/image.png"
className = "w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500/50 outline-none transition-all placeholder-slate-500"
    /& gt;
                & lt;/div&gt;
            )}

{/* File Upload */ }
{
    imageSource === 'upload' & amp;& amp; (
                & lt; div & gt;
                    & lt; input
    ref = { fileInputRef }
    type = "file"
    accept = ".png,.jpeg,.jpg,.gif,image/png,image/jpeg,image/gif"
    onChange = { handleFileSelect }
    disabled = { uploading }
    className = "hidden"
    id = "image-upload"
        /& gt;
                    & lt; label
    htmlFor = "image-upload"
    className = {`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-all ${uploading
        ? 'border-slate-600 bg-slate-800/50'
        : 'border-white/20 hover:border-rose-500/50 hover:bg-rose-500/5'
        }`
}
                    & gt;
{
    uploading ? (
                            & lt;div className = "flex flex-col items-center" & gt;
                                & lt;div className = "animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 mb-2" /& gt;
                                & lt;span className = "text-sm text-slate-400" & gt;Uploading...& lt;/span&gt;
                            & lt;/div&gt;
                        ) : (
                            & lt;& gt;
                                & lt;Upload className = "w-8 h-8 text-slate-400 mb-2" /& gt;
                                & lt;span className = "text-sm text-slate-400" & gt;Click to upload & lt;/span&gt;
                                & lt;span className = "text-xs text-slate-500 mt-1" & gt; PNG, JPEG, GIF(max 5MB) & lt;/span&gt;
                            & lt;/&gt;
                        )
}
                    & lt;/label&gt;
{
    uploadError & amp;& amp; (
                        & lt;p className = "mt-2 text-xs text-red-400 flex items-center gap-1" & gt;
                            & lt;AlertCircle className = "w-3 h-3" /& gt;
    { uploadError }
                        & lt;/p&gt;
                    )
}
                & lt;/div&gt;
            )}

{/* Current Image Preview */ }
{
    imageUrl & amp;& amp; (
                & lt;div className = "relative" & gt;
                    & lt;div className = "relative bg-black/20 border border-white/10 rounded-xl p-2 overflow-hidden" & gt;
                        & lt; img
    src = { imageUrl }
    alt = "Preview"
    className = "w-full h-auto max-h-32 object-contain rounded-lg"
    onError = {() =& gt; setPreviewError(true)
}
                        /&gt;
                        & lt; button
type = "button"
onClick = { clearImage }
className = "absolute top-3 right-3 w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors"
title = "Remove image"
    & gt;
                            & lt;X className = "w-3 h-3" /& gt;
                        & lt;/button&gt;
                    & lt;/div&gt;
                & lt;/div&gt;
            )}

{/* Caption */ }
            & lt; div & gt;
                & lt;label className = "block text-xs text-slate-400 mb-1" & gt; Caption(Optional) & lt;/label&gt;
                & lt; input
type = "text"
value = { caption }
onChange = {(e) =& gt; handleCaptionChange(e.target.value)}
placeholder = "Add a caption..."
maxLength = { 200}
className = "w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500/50 outline-none transition-all placeholder-slate-500"
    /& gt;
            & lt;/div&gt;

{/* Delay */ }
            & lt; div & gt;
                & lt;label className = "block text-xs text-slate-400 mb-2" & gt;
                    & lt;Clock className = "w-3 h-3 inline mr-1" /& gt; Delay Before Sending
    & lt;/label&gt;
                & lt;div className = "flex items-center gap-4" & gt;
                    & lt; input
type = "range"
min = "0"
max = "30"
value = { delaySeconds }
onChange = {(e) =& gt; handleDelayChange(parseInt(e.target.value))}
className = "flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-rose-500"
    /& gt;
                    & lt;span className = "text-white font-medium min-w-[40px] text-right" & gt; { delaySeconds } s & lt;/span&gt;
                & lt;/div&gt;
            & lt;/div&gt;
        & lt;/CollapsibleSection&gt;
    );

const buttonSection = (
        & lt;CollapsibleSection title = "Button (Optional)" icon = { MousePointer2 } defaultOpen = { showButton } & gt;
{/* Enable Button Toggle */ }
            & lt;div className = "flex items-center justify-between" & gt;
                & lt;label className = "text-sm font-medium text-slate-300" & gt;Add Button & lt;/label&gt;
                & lt; button
onClick = {() =& gt; {
    const newValue = !showButton;
    setShowButton(newValue);
    notifyChange({ showButton: newValue });
}}
className = {`w-12 h-6 rounded-full transition-all ${showButton ? 'bg-rose-500' : 'bg-slate-600'}`}
                & gt;
                    & lt;div className = {`w-5 h-5 bg-white rounded-full shadow transition-transform ${showButton ? 'translate-x-6' : 'translate-x-0.5'}`} /&gt;
                & lt;/button&gt;
            & lt;/div&gt;

{
    showButton & amp;& amp; (
                & lt;& gt;
    {/* Button Text */ }
                    & lt; div & gt;
                        & lt;label className = "block text-xs text-slate-400 mb-1" & gt;Button Text & lt;/label&gt;
                        & lt; input
    type = "text"
    value = { buttonText }
    onChange = {(e) =& gt; {
        setButtonText(e.target.value);
        notifyChange({ buttonText: e.target.value });
    }
}
placeholder = "Learn More"
maxLength = { 30}
className = "w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500/50 outline-none transition-all placeholder-slate-500"
    /& gt;
                    & lt;/div&gt;

{/* Button Action Type */ }
                    & lt; div & gt;
                        & lt;label className = "block text-xs text-slate-400 mb-2" & gt;Button Action & lt;/label&gt;
                        & lt;div className = "grid grid-cols-1 gap-2" & gt;
{
    buttonActionOptions.map(option =& gt; (
                                & lt; button
    key = { option.value }
    type = "button"
    onClick = {() =& gt; {
        setButtonAction(option.value as any);
        notifyChange({ buttonAction: option.value });
    }
}
className = {`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${buttonAction === option.value
    ? 'bg-rose-500/20 border-rose-500 text-white'
    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
    } border`}
                                & gt;
                                    & lt; option.icon className = {`w-5 h-5 ${buttonAction === option.value ? 'text-rose-400' : 'text-slate-400'}`} /&gt;
                                    & lt; div & gt;
                                        & lt;div className = "font-medium text-sm" & gt; { option.label }& lt;/div&gt;
                                        & lt;div className = "text-xs text-slate-500" & gt; { option.description }& lt;/div&gt;
                                    & lt;/div&gt;
                                & lt;/button&gt;
                            ))}
                        & lt;/div&gt;
                    & lt;/div&gt;

{/* URL Input (for 'url' action) */ }
{
    buttonAction === 'url' & amp;& amp; (
                        & lt; div & gt;
                            & lt;label className = "block text-xs text-slate-400 mb-1" & gt;Destination URL & lt;/label&gt;
                            & lt; input
    type = "url"
    value = { buttonUrl }
    onChange = {(e) =& gt; {
        setButtonUrl(e.target.value);
        notifyChange({ buttonUrl: e.target.value });
    }
}
placeholder = "https://example.com"
className = "w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500/50 outline-none transition-all placeholder-slate-500"
    /& gt;
                        & lt;/div&gt;
                    )}

{/* Flow Selector (for 'existing_flow' action) */ }
{
    buttonAction === 'existing_flow' & amp;& amp; (
                        & lt; div & gt;
                            & lt;label className = "block text-xs text-slate-400 mb-1" & gt;Select Flow & lt;/label&gt;
    {
        loadingFlows ? (
                                & lt;div className = "flex items-center gap-2 text-slate-400 text-sm py-3" & gt;
                                    & lt;div className = "animate-spin w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full" /& gt;
                                    Loading flows...
                                & lt;/div&gt;
                            ) : (
                                & lt; select
        value = { buttonFlowId }
        onChange = {(e) =& gt; {
            const selectedFlow = flows.find(f =& gt; f.id === e.target.value);
            setButtonFlowId(e.target.value);
            setButtonFlowName(selectedFlow?.name || '');
            notifyChange({
                buttonFlowId: e.target.value,
                buttonFlowName: selectedFlow?.name || ''
            });
        }
    }
    className = "w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500/50 outline-none transition-all"
        & gt;
                                    & lt;option value = "" & gt;Select a flow...& lt;/option&gt;
    {
        flows.map(flow =& gt; (
                                        & lt;option key = { flow.id } value = { flow.id } & gt; { flow.name }& lt;/option&gt;
                                    ))
    }
                                & lt;/select&gt;
                            )
}
                        & lt;/div&gt;
                    )}

{/* Info for upsell/downsell */ }
{
    (buttonAction === 'upsell' || buttonAction === 'downsell') & amp;& amp; (
                        & lt;div className = "bg-rose-500/10 border border-rose-500/30 rounded-xl p-4" & gt;
                            & lt;div className = "flex items-start gap-3" & gt;
                                & lt;ShoppingBag className = "w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" /& gt;
                                & lt; div & gt;
                                    & lt;h4 className = "text-sm font-semibold text-white" & gt;
    { buttonAction === 'upsell' ? 'Upsell Offer' : 'Downsell Offer' }
                                    & lt;/h4&gt;
                                    & lt;p className = "text-xs text-slate-400 mt-1" & gt;
                                        Connect this Image Node to an { buttonAction === 'upsell' ? 'Upsell' : 'Downsell' } Node in the flow builder. 
                                        When the user clicks this button, the { buttonAction } webview will open.
                                    & lt;/p&gt;
                                & lt;/div&gt;
                            & lt;/div&gt;
                        & lt;/div&gt;
                    )
}

{/* Info for create_flow */ }
{
    buttonAction === 'create_flow' & amp;& amp; (
                        & lt;div className = "bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4" & gt;
                            & lt;div className = "flex items-start gap-3" & gt;
                                & lt;Plus className = "w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" /& gt;
                                & lt; div & gt;
                                    & lt;h4 className = "text-sm font-semibold text-white" & gt;Create New Flow & lt;/h4&gt;
                                    & lt;p className = "text-xs text-slate-400 mt-1" & gt;
                                        A new flow will be created and linked to this button. 
                                        Configure the flow after saving this node.
                                    & lt;/p&gt;
                                & lt;/div&gt;
                            & lt;/div&gt;
                        & lt;/div&gt;
                    )
}
                & lt;/&gt;
            )}
        & lt;/CollapsibleSection&gt;
    );

// ================== MAIN RENDER ==================
return (
        & lt;div className = "fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-50 overflow-hidden flex flex-col" & gt;
{/* Header */ }
            & lt;div className = "flex-shrink-0 h-14 bg-black/40 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4" & gt;
                & lt;div className = "flex items-center gap-3" & gt;
                    & lt;div className = "w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg" & gt;
                        & lt;Image className = "w-5 h-5 text-white" /& gt;
                    & lt;/div&gt;
                    & lt; div & gt;
                        & lt;h2 className = "text-lg font-bold text-white" & gt;Image Node & lt;/h2&gt;
                        & lt;p className = "text-xs text-slate-400" & gt;Send image with optional button & lt;/p&gt;
                    & lt;/div&gt;
                & lt;/div&gt;
{
    onClose & amp;& amp; (
                    & lt; button
    onClick = { onClose }
    className = "w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        & gt;
                        & lt;X className = "w-5 h-5 text-white" /& gt;
                    & lt;/button&gt;
                )
}
            & lt;/div&gt;

{/* Main Content - 3 Column Layout on Desktop */ }
            & lt;div className = "flex-1 overflow-hidden" & gt;
{
    isDesktop ? (
                    // Desktop: 3 column layout
                    & lt;div className = "h-full flex" & gt;
    {/* Left: Form */ }
                        & lt;div className = "w-1/3 border-r border-white/10 overflow-y-auto p-4 space-y-4" & gt;
    { imageSection }
    { buttonSection }
                            
                            & lt;CollapsibleTips title = "Tips &amp; Info" color = "rose" & gt;
                                & lt;ul className = "text-xs space-y-1 list-disc list-inside opacity-90" & gt;
                                    & lt; li & gt;Images are sent via Messenger & lt;/li&gt;
                                    & lt; li & gt;Add a button to create interactive content & lt;/li&gt;
                                    & lt; li & gt;Link buttons to upsells, downsells, or flows & lt;/li&gt;
                                    & lt; li & gt;Max file size: 5MB(PNG, JPEG, GIF) & lt;/li&gt;
                                & lt;/ul&gt;
                            & lt;/CollapsibleTips&gt;
                        & lt;/div&gt;

    {/* Center: Preview */ }
                        & lt;div className = "w-1/3 bg-gradient-to-b from-slate-800/50 to-slate-900/50 flex flex-col items-center justify-center p-4" & gt;
    {/* Device Selector */ }
                            & lt;div className = "flex gap-2 mb-4" & gt;
    {
        (['mobile', 'tablet', 'desktop'] as const).map(device =& gt; {
            const Icon = device === 'mobile' ? Smartphone : device === 'tablet' ? Tablet : Monitor;
            return (
                                        & lt; button
            key = { device }
            onClick = {() =& gt; setPreviewDevice(device)
        }
        className = {`p-2 rounded-lg transition-all ${previewDevice === device
            ? 'bg-rose-500 text-white'
            : 'bg-white/10 text-slate-400 hover:bg-white/20'
            }`
    }
                                        & gt;
                                            & lt;Icon className = "w-5 h-5" /& gt;
                                        & lt;/button&gt;
                                    );
})}
                            & lt;/div&gt;
                            & lt; DevicePreview /& gt;
                        & lt;/div&gt;

{/* Right: Info Panel */ }
                        & lt;div className = "w-1/3 overflow-y-auto p-4" & gt;
                            & lt;div className = "bg-black/20 rounded-xl p-4 border border-white/5" & gt;
                                & lt;h3 className = "text-sm font-semibold text-white mb-3 flex items-center gap-2" & gt;
                                    & lt;Image className = "w-4 h-4 text-rose-400" /& gt;
                                    Configuration Summary
    & lt;/h3&gt;
                                & lt;div className = "space-y-3 text-sm" & gt;
                                    & lt;div className = "flex justify-between" & gt;
                                        & lt;span className = "text-slate-400" & gt; Image & lt;/span&gt;
                                        & lt;span className = {`${imageUrl ? 'text-emerald-400' : 'text-slate-500'}`}& gt;
{ imageUrl ? '✓ Set' : 'Not set' }
                                        & lt;/span&gt;
                                    & lt;/div&gt;
                                    & lt;div className = "flex justify-between" & gt;
                                        & lt;span className = "text-slate-400" & gt; Caption & lt;/span&gt;
                                        & lt;span className = {`${caption ? 'text-emerald-400' : 'text-slate-500'}`}& gt;
{ caption ? '✓ Set' : 'None' }
                                        & lt;/span&gt;
                                    & lt;/div&gt;
                                    & lt;div className = "flex justify-between" & gt;
                                        & lt;span className = "text-slate-400" & gt; Delay & lt;/span&gt;
                                        & lt;span className = "text-white" & gt; { delaySeconds } s & lt;/span&gt;
                                    & lt;/div&gt;
                                    & lt;div className = "flex justify-between" & gt;
                                        & lt;span className = "text-slate-400" & gt; Button & lt;/span&gt;
                                        & lt;span className = {`${showButton ? 'text-emerald-400' : 'text-slate-500'}`}& gt;
{ showButton ? '✓ Enabled' : 'Disabled' }
                                        & lt;/span&gt;
                                    & lt;/div&gt;
{
    showButton & amp;& amp; (
                                        & lt;& gt;
                                            & lt;div className = "flex justify-between" & gt;
                                                & lt;span className = "text-slate-400" & gt;Button Text & lt;/span&gt;
                                                & lt;span className = "text-white truncate max-w-[120px]" & gt; { buttonText }& lt;/span&gt;
                                            & lt;/div&gt;
                                            & lt;div className = "flex justify-between" & gt;
                                                & lt;span className = "text-slate-400" & gt; Action & lt;/span&gt;
                                                & lt;span className = "text-rose-400 capitalize" & gt;
    { buttonAction.replace('_', ' ') }
                                                & lt;/span&gt;
                                            & lt;/div&gt;
                                        & lt;/&gt;
                                    )
}
                                & lt;/div&gt;
                            & lt;/div&gt;

{/* Button Action Details Card */ }
{
    showButton & amp;& amp; (
                                & lt;div className = "bg-black/20 rounded-xl p-4 border border-white/5 mt-4" & gt;
                                    & lt;h3 className = "text-sm font-semibold text-white mb-3 flex items-center gap-2" & gt;
                                        & lt;MousePointer2 className = "w-4 h-4 text-rose-400" /& gt;
                                        Button Behavior
        & lt;/h3&gt;
                                    & lt;p className = "text-xs text-slate-400" & gt;
    { buttonAction === 'url' & amp;& amp; `Opens: ${buttonUrl || '(URL not set)'}` }
    { buttonAction === 'existing_flow' & amp;& amp; `Triggers: ${buttonFlowName || '(Flow not selected)'}` }
    { buttonAction === 'create_flow' & amp;& amp; 'Creates a new flow when clicked' }
    { buttonAction === 'upsell' & amp;& amp; 'Opens the connected Upsell node webview' }
    { buttonAction === 'downsell' & amp;& amp; 'Opens the connected Downsell node webview' }
                                    & lt;/p&gt;
                                & lt;/div&gt;
                            )
}
                        & lt;/div&gt;
                    & lt;/div&gt;
                ) : (
                    // Mobile: Single column with preview toggle
                    & lt;div className = "h-full overflow-y-auto p-4 space-y-4" & gt;
{/* Device Selector */ }
                        & lt;div className = "flex justify-center gap-2 mb-2" & gt;
{
    (['mobile', 'tablet', 'desktop'] as const).map(device =& gt; {
        const Icon = device === 'mobile' ? Smartphone : device === 'tablet' ? Tablet : Monitor;
        return (
                                    & lt; button
        key = { device }
        onClick = {() =& gt; setPreviewDevice(device)
    }
    className = {`p-2 rounded-lg transition-all ${previewDevice === device
        ? 'bg-rose-500 text-white'
        : 'bg-white/10 text-slate-400 hover:bg-white/20'
        }`
}
                                    & gt;
                                        & lt;Icon className = "w-4 h-4" /& gt;
                                    & lt;/button&gt;
                                );
                            })}
                        & lt;/div&gt;
                        
                        & lt;div className = "flex justify-center" & gt;
                            & lt; DevicePreview /& gt;
                        & lt;/div&gt;

{ imageSection }
{ buttonSection }
                        
                        & lt;CollapsibleTips title = "Tips &amp; Info" color = "rose" & gt;
                            & lt;ul className = "text-xs space-y-1 list-disc list-inside opacity-90" & gt;
                                & lt; li & gt;Images are sent via Messenger & lt;/li&gt;
                                & lt; li & gt;Add a button to create interactive content & lt;/li&gt;
                                & lt; li & gt;Link buttons to upsells, downsells, or flows & lt;/li&gt;
                            & lt;/ul&gt;
                        & lt;/CollapsibleTips&gt;
                    & lt;/div&gt;
                )}
            & lt;/div&gt;
        & lt;/div&gt;
    );
};

export default ImageNodeForm;
