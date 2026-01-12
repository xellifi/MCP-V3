import React, { useState, useRef, useEffect } from 'react';
import {
    Image, Link, Upload, X, AlertCircle, Clock, MousePointer2, ExternalLink,
    ChevronDown, ChevronUp, Smartphone, Monitor, Tablet, ArrowUp, ArrowDown,
    Workflow, Plus, ShoppingBag, Save, Check, GalleryHorizontal, Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import CollapsibleTips from './CollapsibleTips';
import { useTheme } from '../context/ThemeContext';

interface ImageNodeFormProps {
    workspaceId: string;
    initialConfig?: {
        imageUrl?: string;
        imageSource?: 'url' | 'upload' | 'gallery';
        caption?: string;
        delaySeconds?: number;
        showButton?: boolean;
        buttonText?: string;
        buttonAction?: 'startFlow' | 'url' | 'newFlow';
        buttonUrl?: string;
        webviewHeight?: 'compact' | 'tall' | 'full';
        buttonFlowId?: string;
        buttonFlowName?: string;
        flowName?: string; // For newFlow type - name of the flow to create
    };
    onChange: (config: any) => void;
    onSave?: () => void; // Callback to trigger FlowBuilder's handleSaveConfig
    onClose?: () => void;
}

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
        <div className={`${isDark ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'} rounded-xl overflow-hidden border`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3 flex items-center justify-between text-left ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100'} transition-colors`}
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4 text-rose-400" />}
                    <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</span>
                </div>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
            </button>
            {isOpen && (
                <div className={`px-4 pb-4 space-y-4 border-t ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                    {children}
                </div>
            )}
        </div>
    );
};

const ImageNodeForm: React.FC<ImageNodeFormProps> = ({
    workspaceId,
    initialConfig,
    onChange,
    onSave,
    onClose
}) => {
    const { isDark } = useTheme();
    const [imageSource, setImageSource] = useState<'url' | 'upload' | 'gallery'>(initialConfig?.imageSource || 'url');
    const [imageUrl, setImageUrl] = useState(initialConfig?.imageUrl || '');
    const [caption, setCaption] = useState(initialConfig?.caption || '');
    const [delaySeconds, setDelaySeconds] = useState(initialConfig?.delaySeconds || 0);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [previewError, setPreviewError] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [showButton, setShowButton] = useState(initialConfig?.showButton || false);
    const [buttonText, setButtonText] = useState(initialConfig?.buttonText || 'Learn More');
    // Migrate old action types to new naming
    const migrateButtonAction = (action?: string): 'startFlow' | 'url' | 'newFlow' => {
        if (action === 'existing_flow') return 'startFlow';
        if (action === 'create_flow') return 'newFlow';
        if (action === 'startFlow' || action === 'url' || action === 'newFlow') return action;
        return 'startFlow';
    };
    const [buttonAction, setButtonAction] = useState<'startFlow' | 'url' | 'newFlow'>(
        migrateButtonAction(initialConfig?.buttonAction)
    );
    const [buttonUrl, setButtonUrl] = useState(initialConfig?.buttonUrl || '');
    const [webviewHeight, setWebviewHeight] = useState<'compact' | 'tall' | 'full'>(
        initialConfig?.webviewHeight || 'full'
    );
    const [buttonFlowId, setButtonFlowId] = useState(initialConfig?.buttonFlowId || '');
    const [buttonFlowName, setButtonFlowName] = useState(initialConfig?.buttonFlowName || '');
    const [flowName, setFlowName] = useState(initialConfig?.flowName || '');

    const [flows, setFlows] = useState<any[]>([]);
    const [loadingFlows, setLoadingFlows] = useState(false);
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('mobile');
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
    const [saveNotification, setSaveNotification] = useState(false);
    const [galleryImages, setGalleryImages] = useState<string[]>([]);
    const [loadingGallery, setLoadingGallery] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (buttonAction === 'startFlow' && workspaceId) {
            loadFlows();
        }
    }, [buttonAction, workspaceId]);

    const loadFlows = async () => {
        setLoadingFlows(true);
        try {
            const { data } = await supabase
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

    const notifyChange = (updates: any = {}) => {
        onChange({
            imageUrl, imageSource, caption, delaySeconds,
            showButton, buttonText, buttonAction, buttonUrl, webviewHeight, buttonFlowId, buttonFlowName, flowName,
            ...updates
        });
    };

    const handleSave = () => {
        notifyChange();
        // Call FlowBuilder's save handler if provided
        if (onSave) {
            onSave();
        }
        setSaveNotification(true);
        setTimeout(() => setSaveNotification(false), 3000);
    };

    const handleUrlChange = (url: string) => {
        setImageUrl(url);
        setPreviewError(false);
        notifyChange({ imageUrl: url });
    };

    const handleCaptionChange = (text: string) => {
        setCaption(text);
        notifyChange({ caption: text });
    };

    const handleDelayChange = (value: number) => {
        setDelaySeconds(value);
        notifyChange({ delaySeconds: value });
    };

    const handleSourceChange = async (source: 'url' | 'upload' | 'gallery') => {
        setImageSource(source);
        if (source !== imageSource) {
            setPreviewError(false);
            notifyChange({ imageSource: source });
        }

        // Fetch gallery images when gallery tab is selected
        if (source === 'gallery') {
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
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            setUploadError('Invalid file type. Please upload PNG, JPEG, or GIF.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setUploadError('File too large. Maximum size is 5MB.');
            return;
        }

        setUploading(true);
        setUploadError('');

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${workspaceId}/${Date.now()}.${fileExt}`;

            const { error } = await supabase.storage
                .from('flow-images')
                .upload(fileName, file, { cacheControl: '3600', upsert: false });

            if (error) throw error;

            const { data: urlData } = supabase.storage.from('flow-images').getPublicUrl(fileName);
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

    const clearImage = () => {
        setImageUrl('');
        setPreviewError(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        notifyChange({ imageUrl: '' });
    };

    const buttonActionOptions = [
        { value: 'startFlow', label: '⚡ Trigger Saved Flow', icon: Workflow, description: 'Triggers an existing saved flow' },
        { value: 'url', label: '🔗 Open URL (Webview)', icon: ExternalLink, description: 'Opens a URL in a webview' },
        { value: 'newFlow', label: '➕ Start New Flow', icon: Plus, description: 'Creates a new flow with Start Node and Text Node' },
    ];

    // ================== PREVIEW (DEVICE MOCKUP) ==================
    const deviceSizes = {
        mobile: { width: 280, height: 480, radius: 40, notch: true },
        tablet: { width: 340, height: 440, radius: 24, notch: false },
        desktop: { width: 480, height: 280, radius: 8, notch: false }
    };

    const DevicePreview = () => {
        const size = deviceSizes[previewDevice];
        const getScreenBg = () => previewDevice === 'desktop' ? 'bg-white' : 'bg-gradient-to-b from-slate-800 to-slate-900';
        const getStatusBarStyle = () => previewDevice === 'desktop'
            ? 'text-slate-500 bg-slate-100 border-b border-slate-200'
            : 'text-white/60';

        return (
            <div className="flex flex-col items-center">
                <div className="relative" style={{ width: size.width, height: size.height }}>
                    {/* Device Frame */}
                    <div
                        className={`w-full h-full shadow-2xl border-4 flex flex-col ${previewDevice === 'desktop'
                            ? (isDark ? 'bg-slate-800 border-slate-600' : 'bg-slate-200 border-slate-300')
                            : (isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200')
                            }`}
                        style={{ borderRadius: size.radius }}
                    >
                        {/* Notch (mobile only) */}
                        {size.notch && (
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-10" />
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
                                        <span className="text-[8px] text-slate-400">m.me/yourpage</span>
                                        <div></div>
                                    </>
                                ) : (
                                    <>
                                        <span>9:41</span>
                                        <span>⚡ 100%</span>
                                    </>
                                )}
                            </div>

                            {/* Messenger Content */}
                            <div className="flex-1 overflow-y-auto bg-white">
                                {/* Messenger Header */}
                                <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-white sticky top-0">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">P</span>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-800 font-semibold">Your Page</div>
                                        <div className="text-[10px] text-slate-400">Active now</div>
                                    </div>
                                </div>

                                {/* Chat Area */}
                                <div className="p-3 bg-slate-50 min-h-full">
                                    {/* Message Bubble */}
                                    <div className="flex flex-col items-start">
                                        <div className="bg-white rounded-2xl rounded-bl-md shadow-sm overflow-hidden max-w-[85%] border border-slate-100">
                                            {/* Image */}
                                            {imageUrl ? (
                                                <img
                                                    src={imageUrl}
                                                    alt="Preview"
                                                    className={`w-full h-auto ${previewDevice === 'desktop' ? 'max-h-28' : 'max-h-44'} object-contain bg-slate-100`}
                                                    onError={() => setPreviewError(true)}
                                                />
                                            ) : (
                                                <div className={`w-full ${previewDevice === 'desktop' ? 'h-20' : 'h-32'} bg-slate-100 flex items-center justify-center`}>
                                                    <Image className={`${previewDevice === 'desktop' ? 'w-6 h-6' : 'w-10 h-10'} text-slate-300`} />
                                                </div>
                                            )}

                                            {/* Caption */}
                                            {caption && (
                                                <div className={`px-3 ${previewDevice === 'desktop' ? 'py-1.5 text-[10px]' : 'py-2 text-sm'} text-slate-800 bg-white`}>
                                                    {caption}
                                                </div>
                                            )}

                                            {/* Button */}
                                            {showButton && (
                                                <div className="border-t border-slate-100">
                                                    <button className={`w-full ${previewDevice === 'desktop' ? 'py-2 text-xs' : 'py-3 text-sm'} text-blue-600 font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5`}>
                                                        {buttonAction === 'url' && <ExternalLink className={`${previewDevice === 'desktop' ? 'w-3 h-3' : 'w-4 h-4'}`} />}
                                                        {buttonAction === 'startFlow' && <Workflow className={`${previewDevice === 'desktop' ? 'w-3 h-3' : 'w-4 h-4'}`} />}
                                                        {buttonAction === 'newFlow' && <Plus className={`${previewDevice === 'desktop' ? 'w-3 h-3' : 'w-4 h-4'}`} />}
                                                        {buttonText || 'Button'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1 ml-1">Just now</span>
                                    </div>

                                    {/* Delay indicator */}
                                    {delaySeconds > 0 && (
                                        <div className="mt-3 flex items-center gap-1 text-[10px] text-slate-400">
                                            <Clock className="w-3 h-3" />
                                            <span>Sends after {delaySeconds}s delay</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Home indicator (mobile only) */}
                            {size.notch && (
                                <div className="h-4 flex-shrink-0 flex items-center justify-center bg-white">
                                    <div className="w-24 h-1 bg-slate-200 rounded-full" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ================== FORM SECTIONS ==================
    const imageSection = (
        <CollapsibleSection title="Image" icon={Image} defaultOpen={true}>
            <div className={`flex gap-2 p-1 rounded-lg ${isDark ? 'bg-black/20' : 'bg-slate-100'} border ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                <button type="button" onClick={() => handleSourceChange('url')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${imageSource === 'url'
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                        : (isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-white')
                        }`}>
                    <Link className="w-3.5 h-3.5" /> URL
                </button>
                <button type="button" onClick={() => handleSourceChange('upload')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${imageSource === 'upload'
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                        : (isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-white')
                        }`}>
                    <Upload className="w-3.5 h-3.5" /> Upload
                </button>
                <button type="button" onClick={() => handleSourceChange('gallery')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${imageSource === 'gallery'
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                        : (isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-white')
                        }`}>
                    <GalleryHorizontal className="w-3.5 h-3.5" /> Gallery
                </button>
            </div>
            {imageSource === 'url' && (
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Image URL</label>
                    <input type="url" value={imageUrl} onChange={(e) => handleUrlChange(e.target.value)}
                        placeholder="https://example.com/image.png"
                        className={`w-full ${isDark ? 'bg-black/30 border-white/10 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'} border rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-500/50`} />
                </div>
            )}
            {imageSource === 'upload' && (
                <div>
                    <input ref={fileInputRef} type="file" accept=".png,.jpeg,.jpg,.gif,image/png,image/jpeg,image/gif"
                        onChange={handleFileSelect} disabled={uploading} className="hidden" id="image-upload" />
                    <label htmlFor="image-upload"
                        className={`flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer transition-all ${uploading
                            ? (isDark ? 'border-slate-600 bg-slate-800/50' : 'border-slate-300 bg-slate-100')
                            : (isDark ? 'border-white/20 hover:border-rose-500/50 hover:bg-rose-500/5' : 'border-slate-300 hover:border-rose-500 hover:bg-rose-50')
                            }`}>
                        {uploading ? (
                            <div className="flex flex-col items-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-rose-500 mb-1" />
                                <span className="text-xs text-slate-400">Uploading...</span>
                            </div>
                        ) : (
                            <>
                                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                                <span className="text-xs text-slate-400">Click to upload</span>
                            </>
                        )}
                    </label>
                    {uploadError && <p className="mt-1 text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{uploadError}</p>}
                </div>
            )}
            {imageSource === 'gallery' && (
                <div className="space-y-2">
                    {loadingGallery ? (
                        <div className="text-center py-4 text-slate-400 text-sm">Loading gallery...</div>
                    ) : galleryImages.length === 0 ? (
                        <div className={`p-4 ${isDark ? 'bg-black/20 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-lg`}>
                            <div className="text-center py-4">
                                <GalleryHorizontal className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                <p className="text-xs text-slate-400 mb-2">No images in gallery yet</p>
                                <p className="text-[10px] text-slate-500">Use the Upload tab to add images first, then select them here.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="text-[10px] text-slate-500">Click to select, hover to delete</p>
                            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                                {galleryImages.map((url, i) => (
                                    <div key={i} className="relative group aspect-square">
                                        <button
                                            type="button"
                                            onClick={() => { setImageUrl(url); notifyChange({ imageUrl: url }); }}
                                            className={`w-full h-full rounded-lg overflow-hidden border-2 ${imageUrl === url ? 'border-rose-500' : 'border-transparent'} hover:border-rose-500/50 transition-colors`}
                                        >
                                            <img src={url} alt="" className="w-full h-full object-cover" />
                                        </button>
                                        {/* Delete button - shows on hover */}
                                        <button
                                            type="button"
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                // Extract filename from URL and delete
                                                const fileName = url.split('/').pop();
                                                if (fileName) {
                                                    await supabase.storage.from('attachments').remove([`${workspaceId}/${fileName}`]);
                                                    setGalleryImages(prev => prev.filter(u => u !== url));
                                                    if (imageUrl === url) {
                                                        setImageUrl('');
                                                        notifyChange({ imageUrl: '' });
                                                    }
                                                }
                                            }}
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
            {imageUrl && (
                <div className="relative">
                    <div className={`relative ${isDark ? 'bg-black/20 border-white/10' : 'bg-slate-50 border-slate-200'} border rounded-lg p-2 overflow-hidden`}>
                        <img src={imageUrl} alt="Preview" className="w-full h-auto max-h-24 object-contain rounded" onError={() => setPreviewError(true)} />
                        <button type="button" onClick={clearImage}
                            className="absolute top-3 right-3 w-5 h-5 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors" title="Remove">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}
            <div>
                <label className="block text-xs text-slate-400 mb-1">Caption (Optional)</label>
                <input type="text" value={caption} onChange={(e) => handleCaptionChange(e.target.value)}
                    placeholder="Add a caption..." maxLength={200}
                    className={`w-full ${isDark ? 'bg-black/30 border-white/10 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'} border rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-500/50`} />
            </div>
            <div>
                <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-1`}><Clock className="w-3 h-3 inline mr-1" />Delay: {delaySeconds}s</label>
                <input type="range" min="0" max="30" value={delaySeconds} onChange={(e) => handleDelayChange(parseInt(e.target.value))}
                    className={`w-full h-1.5 ${isDark ? 'bg-white/10' : 'bg-slate-200'} rounded-lg appearance-none cursor-pointer accent-rose-500`} />
            </div>
        </CollapsibleSection>
    );

    const buttonSection = (
        <CollapsibleSection title="Button (Optional)" icon={MousePointer2} defaultOpen={showButton}>
            <div className="flex items-center justify-between">
                <label className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Add Button</label>
                <button onClick={() => { const v = !showButton; setShowButton(v); notifyChange({ showButton: v }); }}
                    className={`w-11 h-6 rounded-full transition-all ${showButton ? 'bg-rose-500' : (isDark ? 'bg-slate-600' : 'bg-slate-300')}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${showButton ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
            </div>
            {showButton && (
                <>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Button Text</label>
                        <input type="text" value={buttonText} onChange={(e) => { setButtonText(e.target.value); notifyChange({ buttonText: e.target.value }); }}
                            placeholder="Learn More" maxLength={30}
                            className={`w-full ${isDark ? 'bg-black/30 border-white/10 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'} border rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-500/50`} />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Button Action</label>
                        <select
                            value={buttonAction}
                            onChange={(e) => {
                                const newType = e.target.value as 'startFlow' | 'url' | 'newFlow';
                                setButtonAction(newType);
                                notifyChange({
                                    buttonAction: newType,
                                    buttonFlowId: newType === 'startFlow' ? buttonFlowId : undefined,
                                    buttonUrl: newType === 'url' ? buttonUrl : undefined,
                                    webviewHeight: newType === 'url' ? webviewHeight : undefined,
                                    flowName: newType === 'newFlow' ? flowName : undefined
                                });
                            }}
                            className={`w-full ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500/50`}
                        >
                            <option value="startFlow">⚡ Trigger Saved Flow</option>
                            <option value="url">🔗 Open URL (Webview)</option>
                            <option value="newFlow">➕ Start New Flow</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                            {buttonAction === 'startFlow' && '⚡ Triggers an existing saved flow from this page'}
                            {buttonAction === 'url' && '🔗 Opens a URL in a webview'}
                            {buttonAction === 'newFlow' && '➕ Creates a new flow with Start Node and Text Node'}
                        </p>
                    </div>
                    {buttonAction === 'url' && (
                        <>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Destination URL</label>
                                <input type="url" value={buttonUrl} onChange={(e) => { setButtonUrl(e.target.value); notifyChange({ buttonUrl: e.target.value }); }}
                                    placeholder="https://example.com"
                                    className={`w-full ${isDark ? 'bg-black/30 border-white/10 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'} border rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-500/50`} />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Webview Size</label>
                                <div className="flex gap-2">
                                    {(['compact', 'tall', 'full'] as const).map(size => (
                                        <button
                                            key={size}
                                            type="button"
                                            onClick={() => { setWebviewHeight(size); notifyChange({ webviewHeight: size }); }}
                                            className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${webviewHeight === size
                                                ? 'bg-rose-500 text-white'
                                                : (isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                                                }`}
                                        >
                                            {size === 'compact' ? '📱 Compact' : size === 'tall' ? '📲 Tall' : '🖥️ Full'}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">Facebook webview height: compact (50%), tall (75%), full (100%)</p>
                            </div>
                        </>
                    )}
                    {buttonAction === 'startFlow' && (
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Select Flow</label>
                            {loadingFlows ? (
                                <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                                    <div className="animate-spin w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full" />
                                    Loading flows...
                                </div>
                            ) : (
                                <select value={buttonFlowId}
                                    onChange={(e) => {
                                        const sf = flows.find(f => f.id === e.target.value);
                                        setButtonFlowId(e.target.value);
                                        setButtonFlowName(sf?.name || '');
                                        notifyChange({ buttonFlowId: e.target.value, buttonFlowName: sf?.name || '' });
                                    }}
                                    className={`w-full ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-500/50`}>
                                    <option value="">Select a flow...</option>
                                    {flows.map(flow => <option key={flow.id} value={flow.id}>{flow.name}</option>)}
                                </select>
                            )}
                        </div>
                    )}

                    {buttonAction === 'newFlow' && (
                        <>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Flow Name</label>
                                <input
                                    type="text"
                                    value={flowName}
                                    onChange={(e) => { setFlowName(e.target.value); notifyChange({ flowName: e.target.value }); }}
                                    placeholder="e.g., Pricing Flow, FAQ Response"
                                    className={`w-full ${isDark ? 'bg-black/30 border-white/10 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'} border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none`}
                                />
                            </div>
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                                <div className="flex items-center gap-2 text-emerald-400 text-xs">
                                    <Plus className="w-4 h-4" />
                                    <span className="font-medium">Start New Flow</span>
                                </div>
                                <p className="text-xs text-emerald-300/70 mt-1">
                                    Creates a new flow with Start Node and Text Node connected. The flow will be saved and available in Flows list.
                                </p>
                            </div>
                        </>
                    )}
                </>
            )}
        </CollapsibleSection>
    );

    // Modal width based on device selection (like UpsellNode)
    const modalWidths = {
        mobile: 'max-w-3xl',
        tablet: 'max-w-3xl',
        desktop: 'max-w-7xl'
    };

    // ================== DESKTOP LAYOUT ==================
    if (isDesktop) {
        return (
            <div className={`fixed inset-0 ${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-slate-50/50'} z-50 p-4 flex items-center justify-center`}>
                <div className={`w-full ${modalWidths[previewDevice]} h-full max-h-full flex flex-col ${isDark ? 'bg-slate-800/50 border-white/10' : 'bg-white border-slate-200 shadow-2xl'} rounded-2xl border overflow-hidden transition-all duration-300`}>
                    {/* Header */}
                    <div className={`flex-shrink-0 h-14 border-b ${isDark ? 'border-white/10' : 'border-slate-100'} flex items-center px-4 gap-4`}>
                        {/* Left: Title */}
                        <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                                <Image className="w-4 h-4 text-white" />
                            </div>
                            <span className={`text-base font-bold whitespace-nowrap ${isDark ? 'text-white' : 'text-slate-900'}`}>Image</span>
                        </div>

                        {/* Center: Device Switcher */}
                        <div className="flex-1 flex justify-center">
                            <div className={`flex items-center gap-1 ${isDark ? 'bg-slate-700/50 border-white/10' : 'bg-slate-100 border-slate-200'} rounded-lg p-1 border`}>
                                {(['mobile', 'tablet', 'desktop'] as const).map(device => {
                                    const Icon = device === 'mobile' ? Smartphone : device === 'tablet' ? Tablet : Monitor;
                                    return (
                                        <button key={device} type="button" onClick={() => setPreviewDevice(device)}
                                            className={`p-2 rounded-md transition-all ${previewDevice === device
                                                ? 'bg-rose-500 text-white'
                                                : (isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-white')
                                                }`}
                                            title={device.charAt(0).toUpperCase() + device.slice(1)}>
                                            <Icon className="w-4 h-4" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right: Save + Close */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button type="button" onClick={handleSave}
                                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${saveNotification ? 'bg-emerald-500 text-white' : 'bg-rose-500 hover:bg-rose-600 text-white'}`}>
                                {saveNotification ? <><Check className="w-3.5 h-3.5" /><span>Saved!</span></> : <><Save className="w-3.5 h-3.5" /><span>Save</span></>}
                            </button>
                            {onClose && (
                                <button type="button" onClick={onClose}
                                    className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`} title="Close">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content: 2 or 3 columns based on device */}
                    <div className="flex-1 flex min-h-0 overflow-hidden">
                        {/* Left Column: Form */}
                        <div className={`w-96 flex-shrink-0 border-r ${isDark ? 'border-white/10' : 'border-slate-100 bg-white'} overflow-y-auto p-4 space-y-4`}>
                            {imageSection}
                            {buttonSection}
                            <CollapsibleTips title="Tips & Info" color="rose">
                                <ul className="text-xs space-y-1 list-disc list-inside opacity-90">
                                    <li>Images sent via Messenger</li>
                                    <li>Add button for interactivity</li>
                                    <li>Max 5MB (PNG, JPEG, GIF)</li>
                                </ul>
                            </CollapsibleTips>
                        </div>

                        {/* Center/Right: Preview */}
                        <div className={`flex-1 flex items-center justify-center p-6 ${isDark ? 'bg-gradient-to-b from-slate-800/50 to-slate-900/50' : 'bg-slate-50'}`}>
                            <DevicePreview />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ================== MOBILE LAYOUT ==================
    return (
        <div className={`fixed inset-0 z-50 overflow-hidden flex flex-col ${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-slate-50'}`}>
            <div className={`flex-shrink-0 h-14 backdrop-blur-xl border-b flex items-center justify-between px-4 ${isDark ? 'bg-black/40 border-white/10' : 'bg-white/80 border-slate-200'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
                        <Image className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Image Node</h2>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Send image with optional button</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleSave}
                        className={`px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all ${saveNotification ? 'bg-emerald-500 text-white' : 'bg-gradient-to-r from-rose-500 to-pink-600 text-white'}`}>
                        {saveNotification ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save</>}
                    </button>
                    {onClose && (
                        <button onClick={onClose} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'}`}>
                            <X className={`w-5 h-5 ${isDark ? 'text-white' : 'text-slate-600'}`} />
                        </button>
                    )}
                </div>
            </div>
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isDark ? '' : 'bg-white'}`}>
                <div className="flex justify-center gap-2 mb-2">
                    {(['mobile', 'tablet', 'desktop'] as const).map(device => {
                        const Icon = device === 'mobile' ? Smartphone : device === 'tablet' ? Tablet : Monitor;
                        return (
                            <button key={device} onClick={() => setPreviewDevice(device)}
                                className={`p-2 rounded-lg transition-all ${previewDevice === device
                                    ? 'bg-rose-500 text-white'
                                    : (isDark ? 'bg-white/10 text-slate-400 hover:bg-white/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
                                    }`}>
                                <Icon className="w-4 h-4" />
                            </button>
                        );
                    })}
                </div>
                <div className="flex justify-center"><DevicePreview /></div>
                {imageSection}
                {buttonSection}
                <CollapsibleTips title="Tips & Info" color="rose">
                    <ul className="text-xs space-y-1 list-disc list-inside opacity-90">
                        <li>Images are sent via Messenger</li>
                        <li>Add a button to create interactive content</li>
                        <li>Link buttons to upsells, downsells, or flows</li>
                    </ul>
                </CollapsibleTips>
            </div>
        </div>
    );
};

export default ImageNodeForm;
