import React, { useState, useRef, useEffect } from 'react';
import {
    Image, Link, Upload, X, AlertCircle, Clock, MousePointer2, ExternalLink,
    ChevronDown, ChevronUp, Smartphone, Monitor, Tablet, ArrowUp, ArrowDown,
    Workflow, Plus, ShoppingBag, Save, Check
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
        showButton?: boolean;
        buttonText?: string;
        buttonAction?: 'url' | 'create_flow' | 'existing_flow' | 'upsell' | 'downsell';
        buttonUrl?: string;
        buttonFlowId?: string;
        buttonFlowName?: string;
    };
    onChange: (config: any) => void;
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

    return (
        <div className="bg-black/20 rounded-xl overflow-hidden border border-white/5">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4 text-rose-400" />}
                    <span className="text-sm font-semibold text-white">{title}</span>
                </div>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
            </button>
            {isOpen && (
                <div className="px-4 pb-4 space-y-4 border-t border-white/5">
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
    onClose
}) => {
    const [imageSource, setImageSource] = useState<'url' | 'upload'>(initialConfig?.imageSource || 'url');
    const [imageUrl, setImageUrl] = useState(initialConfig?.imageUrl || '');
    const [caption, setCaption] = useState(initialConfig?.caption || '');
    const [delaySeconds, setDelaySeconds] = useState(initialConfig?.delaySeconds || 0);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [previewError, setPreviewError] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [showButton, setShowButton] = useState(initialConfig?.showButton || false);
    const [buttonText, setButtonText] = useState(initialConfig?.buttonText || 'Learn More');
    const [buttonAction, setButtonAction] = useState<'url' | 'create_flow' | 'existing_flow' | 'upsell' | 'downsell'>(
        initialConfig?.buttonAction || 'url'
    );
    const [buttonUrl, setButtonUrl] = useState(initialConfig?.buttonUrl || '');
    const [buttonFlowId, setButtonFlowId] = useState(initialConfig?.buttonFlowId || '');
    const [buttonFlowName, setButtonFlowName] = useState(initialConfig?.buttonFlowName || '');

    const [flows, setFlows] = useState<any[]>([]);
    const [loadingFlows, setLoadingFlows] = useState(false);
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('mobile');
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
    const [saveNotification, setSaveNotification] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (buttonAction === 'existing_flow' && workspaceId) {
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
            showButton, buttonText, buttonAction, buttonUrl, buttonFlowId, buttonFlowName,
            ...updates
        });
    };

    const handleSave = () => {
        notifyChange();
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

    const handleSourceChange = (source: 'url' | 'upload') => {
        setImageSource(source);
        if (source !== imageSource) {
            setImageUrl('');
            setPreviewError(false);
            notifyChange({ imageUrl: '', imageSource: source });
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
        { value: 'url', label: 'Open URL', icon: ExternalLink, description: 'Opens a web link' },
        { value: 'create_flow', label: 'Create New Flow', icon: Plus, description: 'Create new automation' },
        { value: 'existing_flow', label: 'Existing Flow', icon: Workflow, description: 'Run an existing flow' },
        { value: 'upsell', label: 'Upsell Offer', icon: ArrowUp, description: 'Show upsell webview' },
        { value: 'downsell', label: 'Downsell Offer', icon: ArrowDown, description: 'Show downsell webview' },
    ];

    // ================== DEVICE PREVIEW ==================
    const DevicePreview = () => {
        // Larger sizes for better visibility
        const sizes = {
            mobile: { width: 320, height: 580, radius: 44, notch: true },
            tablet: { width: 400, height: 520, radius: 28, notch: false },
            desktop: { width: 520, height: 340, radius: 12, notch: false }
        };
        const size = sizes[previewDevice];

        return (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="relative" style={{ width: size.width, height: size.height }}>
                    {/* Device Frame */}
                    <div
                        className={`w-full h-full shadow-2xl flex flex-col ${previewDevice === 'desktop' ? 'bg-slate-200 border-[6px] border-slate-400' : 'bg-black border-[8px] border-slate-800'}`}
                        style={{ borderRadius: size.radius }}
                    >
                        {/* Notch for mobile */}
                        {size.notch && (
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-20 flex items-center justify-center">
                                <div className="w-3 h-3 rounded-full bg-slate-800 mr-8"></div>
                            </div>
                        )}

                        {/* Screen Content */}
                        <div
                            className={`w-full h-full overflow-hidden flex flex-col ${previewDevice === 'desktop' ? 'bg-white' : 'bg-gradient-to-b from-slate-800 to-slate-900'}`}
                            style={{ borderRadius: Math.max(size.radius - 8, 4) }}
                        >
                            {/* Status bar */}
                            <div className={`flex-shrink-0 flex items-center justify-between px-6 ${previewDevice === 'desktop' ? 'h-8 text-slate-500 bg-slate-100 border-b border-slate-200 text-xs' : 'h-10 text-white/80 text-sm pt-2'}`}>
                                {previewDevice === 'desktop' ? (
                                    <>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                            <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                        </div>
                                        <span className="text-xs text-slate-400">m.me/yourpage</span>
                                        <div></div>
                                    </>
                                ) : (
                                    <>
                                        <span className="font-medium">9:41</span>
                                        <span className="font-medium">100%</span>
                                    </>
                                )}
                            </div>

                            {/* Messenger Content Area */}
                            <div className="flex-1 overflow-y-auto bg-white p-4">
                                {/* Page Header */}
                                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                                        <span className="text-white text-sm font-bold">P</span>
                                    </div>
                                    <div>
                                        <div className="text-sm text-slate-800 font-semibold">Your Page</div>
                                        <div className="text-xs text-slate-400">Active now</div>
                                    </div>
                                </div>

                                {/* Message Bubble */}
                                <div className="flex flex-col items-start">
                                    <div className="bg-slate-100 rounded-2xl rounded-bl-md shadow-sm overflow-hidden max-w-[85%]">
                                        {/* Image */}
                                        {imageUrl ? (
                                            <img
                                                src={imageUrl}
                                                alt="Preview"
                                                className="w-full h-auto max-h-48 object-cover"
                                                onError={() => setPreviewError(true)}
                                            />
                                        ) : (
                                            <div className="w-full h-36 bg-slate-200 flex items-center justify-center">
                                                <Image className="w-12 h-12 text-slate-400" />
                                            </div>
                                        )}

                                        {/* Caption */}
                                        {caption && (
                                            <div className="px-4 py-3 text-sm text-slate-800 border-t border-slate-200">
                                                {caption}
                                            </div>
                                        )}

                                        {/* Button */}
                                        {showButton && (
                                            <div className="border-t border-slate-200">
                                                <button className="w-full py-3 text-blue-600 font-semibold text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
                                                    {buttonAction === 'url' && <ExternalLink className="w-4 h-4" />}
                                                    {buttonAction === 'upsell' && <ShoppingBag className="w-4 h-4" />}
                                                    {buttonAction === 'downsell' && <ShoppingBag className="w-4 h-4" />}
                                                    {buttonAction === 'existing_flow' && <Workflow className="w-4 h-4" />}
                                                    {buttonAction === 'create_flow' && <Plus className="w-4 h-4" />}
                                                    {buttonText || 'Button'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-400 mt-2 ml-2">Just now</span>
                                </div>

                                {/* Delay indicator */}
                                {delaySeconds > 0 && (
                                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                                        <Clock className="w-4 h-4" />
                                        <span>Sends after {delaySeconds}s delay</span>
                                    </div>
                                )}
                            </div>

                            {/* Home indicator for mobile */}
                            {size.notch && (
                                <div className="h-8 flex-shrink-0 flex items-center justify-center bg-white">
                                    <div className="w-32 h-1 bg-slate-300 rounded-full" />
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
            <div className="flex gap-2">
                <button type="button" onClick={() => handleSourceChange('url')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${imageSource === 'url' ? 'bg-rose-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                    <Link className="w-3.5 h-3.5" /> URL
                </button>
                <button type="button" onClick={() => handleSourceChange('upload')}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${imageSource === 'upload' ? 'bg-rose-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                    <Upload className="w-3.5 h-3.5" /> Upload
                </button>
            </div>
            {imageSource === 'url' && (
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Image URL</label>
                    <input type="url" value={imageUrl} onChange={(e) => handleUrlChange(e.target.value)}
                        placeholder="https://example.com/image.png"
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-rose-500/50 placeholder-slate-500" />
                </div>
            )}
            {imageSource === 'upload' && (
                <div>
                    <input ref={fileInputRef} type="file" accept=".png,.jpeg,.jpg,.gif,image/png,image/jpeg,image/gif"
                        onChange={handleFileSelect} disabled={uploading} className="hidden" id="image-upload" />
                    <label htmlFor="image-upload"
                        className={`flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer transition-all ${uploading ? 'border-slate-600 bg-slate-800/50' : 'border-white/20 hover:border-rose-500/50 hover:bg-rose-500/5'}`}>
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
            {imageUrl && (
                <div className="relative">
                    <div className="relative bg-black/20 border border-white/10 rounded-lg p-2 overflow-hidden">
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
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-rose-500/50 placeholder-slate-500" />
            </div>
            <div>
                <label className="block text-xs text-slate-400 mb-1"><Clock className="w-3 h-3 inline mr-1" />Delay: {delaySeconds}s</label>
                <input type="range" min="0" max="30" value={delaySeconds} onChange={(e) => handleDelayChange(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-rose-500" />
            </div>
        </CollapsibleSection>
    );

    const buttonSection = (
        <CollapsibleSection title="Button (Optional)" icon={MousePointer2} defaultOpen={showButton}>
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">Add Button</label>
                <button onClick={() => { const v = !showButton; setShowButton(v); notifyChange({ showButton: v }); }}
                    className={`w-11 h-6 rounded-full transition-all ${showButton ? 'bg-rose-500' : 'bg-slate-600'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${showButton ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
            </div>
            {showButton && (
                <>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Button Text</label>
                        <input type="text" value={buttonText} onChange={(e) => { setButtonText(e.target.value); notifyChange({ buttonText: e.target.value }); }}
                            placeholder="Learn More" maxLength={30}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-rose-500/50 placeholder-slate-500" />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-2">Button Action</label>
                        <div className="space-y-1.5">
                            {buttonActionOptions.map(option => (
                                <button key={option.value} type="button"
                                    onClick={() => { setButtonAction(option.value as any); notifyChange({ buttonAction: option.value }); }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${buttonAction === option.value ? 'bg-rose-500/20 border-rose-500 text-white' : 'bg-black/30 border-white/10 text-slate-300 hover:bg-white/5'} border`}>
                                    <option.icon className={`w-4 h-4 ${buttonAction === option.value ? 'text-rose-400' : 'text-slate-400'}`} />
                                    <div>
                                        <div className="font-medium text-xs">{option.label}</div>
                                        <div className="text-[10px] text-slate-500">{option.description}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                    {buttonAction === 'url' && (
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Destination URL</label>
                            <input type="url" value={buttonUrl} onChange={(e) => { setButtonUrl(e.target.value); notifyChange({ buttonUrl: e.target.value }); }}
                                placeholder="https://example.com"
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-rose-500/50 placeholder-slate-500" />
                        </div>
                    )}
                    {buttonAction === 'existing_flow' && (
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
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-rose-500/50">
                                    <option value="">Select a flow...</option>
                                    {flows.map(flow => <option key={flow.id} value={flow.id}>{flow.name}</option>)}
                                </select>
                            )}
                        </div>
                    )}
                    {(buttonAction === 'upsell' || buttonAction === 'downsell') && (
                        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                                <ShoppingBag className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-xs font-semibold text-white">{buttonAction === 'upsell' ? 'Upsell Offer' : 'Downsell Offer'}</h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Connect to {buttonAction === 'upsell' ? 'Upsell' : 'Downsell'} Node in flow builder.</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {buttonAction === 'create_flow' && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                                <Plus className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-xs font-semibold text-white">Create New Flow</h4>
                                    <p className="text-[10px] text-slate-400 mt-0.5">A new flow will be created and linked.</p>
                                </div>
                            </div>
                        </div>
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
            <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-50 p-4 flex items-center justify-center">
                <div className={`w-full ${modalWidths[previewDevice]} h-full max-h-full flex flex-col bg-slate-800/50 rounded-2xl border border-white/10 overflow-hidden transition-all duration-300`}>
                    {/* Header */}
                    <div className="flex-shrink-0 h-14 border-b border-white/10 flex items-center px-4 gap-4">
                        {/* Left: Title */}
                        <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                                <Image className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-base font-bold text-white whitespace-nowrap">Image</span>
                        </div>

                        {/* Center: Device Switcher */}
                        <div className="flex-1 flex justify-center">
                            <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg p-1 border border-white/10">
                                {(['mobile', 'tablet', 'desktop'] as const).map(device => {
                                    const Icon = device === 'mobile' ? Smartphone : device === 'tablet' ? Tablet : Monitor;
                                    return (
                                        <button key={device} type="button" onClick={() => setPreviewDevice(device)}
                                            className={`p-2 rounded-md transition-all ${previewDevice === device ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
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
                                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors" title="Close">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content: 2 or 3 columns based on device */}
                    <div className="flex-1 flex min-h-0 overflow-hidden">
                        {/* Left Column: Form */}
                        <div className="w-80 flex-shrink-0 border-r border-white/10 overflow-y-auto p-4 space-y-4">
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
                        <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-slate-800/50 to-slate-900/50 p-6">
                            <DevicePreview />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ================== MOBILE LAYOUT ==================
    return (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-50 overflow-hidden flex flex-col">
            <div className="flex-shrink-0 h-14 bg-black/40 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
                        <Image className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Image Node</h2>
                        <p className="text-xs text-slate-400">Send image with optional button</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleSave}
                        className={`px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all ${saveNotification ? 'bg-emerald-500 text-white' : 'bg-gradient-to-r from-rose-500 to-pink-600 text-white'}`}>
                        {saveNotification ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save</>}
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                            <X className="w-5 h-5 text-white" />
                        </button>
                    )}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex justify-center gap-2 mb-2">
                    {(['mobile', 'tablet', 'desktop'] as const).map(device => {
                        const Icon = device === 'mobile' ? Smartphone : device === 'tablet' ? Tablet : Monitor;
                        return (
                            <button key={device} onClick={() => setPreviewDevice(device)}
                                className={`p-2 rounded-lg transition-all ${previewDevice === device ? 'bg-rose-500 text-white' : 'bg-white/10 text-slate-400 hover:bg-white/20'}`}>
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
