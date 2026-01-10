import React, { useState, useRef, useEffect } from 'react';
import {
    Image, Link, Upload, X, AlertCircle, Clock, MousePointer2, ExternalLink,
    ChevronDown, ChevronUp, Smartphone, Monitor, Tablet, ArrowUp, ArrowDown,
    Workflow, Plus, ShoppingBag, Save, Check
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import CollapsibleTips from './CollapsibleTips';
import toast from 'react-hot-toast';

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

    const deviceSizes = {
        mobile: { width: 220, height: 380, radius: 32, notch: true },
        tablet: { width: 280, height: 360, radius: 20, notch: false },
        desktop: { width: 340, height: 220, radius: 8, notch: false }
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
                            <div className="flex-1 overflow-y-auto p-3 bg-slate-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">P</span>
                                    </div>
                                    <div className="text-xs text-slate-600 font-medium">Your Page</div>
                                </div>
                                <div className="flex flex-col items-start">
                                    <div className="bg-white rounded-2xl rounded-bl-md shadow-sm overflow-hidden max-w-[85%]">
                                        {imageUrl ? (
                                            <img src={imageUrl} alt="Preview" className="w-full h-auto max-h-24 object-cover" onError={() => setPreviewError(true)} />
                                        ) : (
                                            <div className="w-full h-20 bg-slate-200 flex items-center justify-center">
                                                <Image className="w-6 h-6 text-slate-400" />
                                            </div>
                                        )}
                                        {caption && <div className="px-2 py-1.5 text-[10px] text-slate-800">{caption}</div>}
                                        {showButton && (
                                            <div className="border-t border-slate-100">
                                                <button className="w-full py-2.5 text-blue-600 font-semibold text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5">
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
                                    <span className="text-[10px] text-slate-400 mt-1 ml-1">Just now</span>
                                </div>
                                {delaySeconds > 0 && (
                                    <div className="mt-3 flex items-center gap-1 text-[10px] text-slate-400">
                                        <Clock className="w-3 h-3" />
                                        <span>Sends after {delaySeconds}s delay</span>
                                    </div>
                                )}
                            </div>
                            {size.notch && (
                                <div className="h-4 flex-shrink-0 flex items-center justify-center bg-slate-100">
                                    <div className="w-20 h-1 bg-slate-300 rounded-full" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const imageSection = (
        <CollapsibleSection title="Image" icon={Image} defaultOpen={true}>
            <div className="flex gap-2">
                <button type="button" onClick={() => handleSourceChange('url')}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${imageSource === 'url' ? 'bg-rose-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                    <Link className="w-4 h-4" /> URL
                </button>
                <button type="button" onClick={() => handleSourceChange('upload')}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${imageSource === 'upload' ? 'bg-rose-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                    <Upload className="w-4 h-4" /> Upload
                </button>
            </div>
            {imageSource === 'url' && (
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Image URL</label>
                    <input type="url" value={imageUrl} onChange={(e) => handleUrlChange(e.target.value)}
                        placeholder="https://example.com/image.png"
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500/50 outline-none transition-all placeholder-slate-500" />
                </div>
            )}
            {imageSource === 'upload' && (
                <div>
                    <input ref={fileInputRef} type="file" accept=".png,.jpeg,.jpg,.gif,image/png,image/jpeg,image/gif"
                        onChange={handleFileSelect} disabled={uploading} className="hidden" id="image-upload" />
                    <label htmlFor="image-upload"
                        className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-all ${uploading ? 'border-slate-600 bg-slate-800/50' : 'border-white/20 hover:border-rose-500/50 hover:bg-rose-500/5'}`}>
                        {uploading ? (
                            <div className="flex flex-col items-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 mb-2" />
                                <span className="text-sm text-slate-400">Uploading...</span>
                            </div>
                        ) : (
                            <>
                                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                <span className="text-sm text-slate-400">Click to upload</span>
                                <span className="text-xs text-slate-500 mt-1">PNG, JPEG, GIF (max 5MB)</span>
                            </>
                        )}
                    </label>
                    {uploadError && <p className="mt-2 text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{uploadError}</p>}
                </div>
            )}
            {imageUrl && (
                <div className="relative">
                    <div className="relative bg-black/20 border border-white/10 rounded-xl p-2 overflow-hidden">
                        <img src={imageUrl} alt="Preview" className="w-full h-auto max-h-32 object-contain rounded-lg" onError={() => setPreviewError(true)} />
                        <button type="button" onClick={clearImage}
                            className="absolute top-3 right-3 w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors" title="Remove image">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}
            <div>
                <label className="block text-xs text-slate-400 mb-1">Caption (Optional)</label>
                <input type="text" value={caption} onChange={(e) => handleCaptionChange(e.target.value)}
                    placeholder="Add a caption..." maxLength={200}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500/50 outline-none transition-all placeholder-slate-500" />
            </div>
            <div>
                <label className="block text-xs text-slate-400 mb-2"><Clock className="w-3 h-3 inline mr-1" /> Delay Before Sending</label>
                <div className="flex items-center gap-4">
                    <input type="range" min="0" max="30" value={delaySeconds} onChange={(e) => handleDelayChange(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-rose-500" />
                    <span className="text-white font-medium min-w-[40px] text-right">{delaySeconds}s</span>
                </div>
            </div>
        </CollapsibleSection>
    );

    const buttonSection = (
        <CollapsibleSection title="Button (Optional)" icon={MousePointer2} defaultOpen={showButton}>
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">Add Button</label>
                <button onClick={() => { const v = !showButton; setShowButton(v); notifyChange({ showButton: v }); }}
                    className={`w-12 h-6 rounded-full transition-all ${showButton ? 'bg-rose-500' : 'bg-slate-600'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${showButton ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
            </div>
            {showButton && (
                <>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Button Text</label>
                        <input type="text" value={buttonText} onChange={(e) => { setButtonText(e.target.value); notifyChange({ buttonText: e.target.value }); }}
                            placeholder="Learn More" maxLength={30}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500/50 outline-none transition-all placeholder-slate-500" />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-2">Button Action</label>
                        <div className="grid grid-cols-1 gap-2">
                            {buttonActionOptions.map(option => (
                                <button key={option.value} type="button"
                                    onClick={() => { setButtonAction(option.value as any); notifyChange({ buttonAction: option.value }); }}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${buttonAction === option.value ? 'bg-rose-500/20 border-rose-500 text-white' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'} border`}>
                                    <option.icon className={`w-5 h-5 ${buttonAction === option.value ? 'text-rose-400' : 'text-slate-400'}`} />
                                    <div>
                                        <div className="font-medium text-sm">{option.label}</div>
                                        <div className="text-xs text-slate-500">{option.description}</div>
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
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500/50 outline-none transition-all placeholder-slate-500" />
                        </div>
                    )}
                    {buttonAction === 'existing_flow' && (
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Select Flow</label>
                            {loadingFlows ? (
                                <div className="flex items-center gap-2 text-slate-400 text-sm py-3">
                                    <div className="animate-spin w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full" />
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
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500/50 outline-none transition-all">
                                    <option value="">Select a flow...</option>
                                    {flows.map(flow => <option key={flow.id} value={flow.id}>{flow.name}</option>)}
                                </select>
                            )}
                        </div>
                    )}
                    {(buttonAction === 'upsell' || buttonAction === 'downsell') && (
                        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <ShoppingBag className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-semibold text-white">{buttonAction === 'upsell' ? 'Upsell Offer' : 'Downsell Offer'}</h4>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Connect this Image Node to an {buttonAction === 'upsell' ? 'Upsell' : 'Downsell'} Node in the flow builder.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    {buttonAction === 'create_flow' && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <Plus className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-semibold text-white">Create New Flow</h4>
                                    <p className="text-xs text-slate-400 mt-1">A new flow will be created and linked to this button.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </CollapsibleSection>
    );

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
                    <button
                        onClick={() => {
                            notifyChange();
                            setSaveNotification(true);
                            toast.success('Configuration saved!');
                            setTimeout(() => setSaveNotification(false), 2000);
                        }}
                        className={`px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all ${saveNotification
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-400 hover:to-pink-500'
                            }`}
                    >
                        {saveNotification ? (
                            <><Check className="w-4 h-4" /> Saved!</>
                        ) : (
                            <><Save className="w-4 h-4" /> Save</>
                        )}
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                            <X className="w-5 h-5 text-white" />
                        </button>
                    )}
                </div>
            </div>
            <div className="flex-1 overflow-hidden">
                {isDesktop ? (
                    <div className="h-full flex">
                        <div className="w-1/3 border-r border-white/10 overflow-y-auto p-4 space-y-4">
                            {imageSection}
                            {buttonSection}
                            <CollapsibleTips title="Tips & Info" color="rose">
                                <ul className="text-xs space-y-1 list-disc list-inside opacity-90">
                                    <li>Images are sent via Messenger</li>
                                    <li>Add a button to create interactive content</li>
                                    <li>Link buttons to upsells, downsells, or flows</li>
                                    <li>Max file size: 5MB (PNG, JPEG, GIF)</li>
                                </ul>
                            </CollapsibleTips>
                        </div>
                        <div className="w-1/3 bg-gradient-to-b from-slate-800/50 to-slate-900/50 flex flex-col items-center justify-center p-4">
                            <div className="flex gap-2 mb-4">
                                {(['mobile', 'tablet', 'desktop'] as const).map(device => {
                                    const Icon = device === 'mobile' ? Smartphone : device === 'tablet' ? Tablet : Monitor;
                                    return (
                                        <button key={device} onClick={() => setPreviewDevice(device)}
                                            className={`p-2 rounded-lg transition-all ${previewDevice === device ? 'bg-rose-500 text-white' : 'bg-white/10 text-slate-400 hover:bg-white/20'}`}>
                                            <Icon className="w-5 h-5" />
                                        </button>
                                    );
                                })}
                            </div>
                            <DevicePreview />
                        </div>
                        <div className="w-1/3 overflow-y-auto p-4">
                            <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                    <Image className="w-4 h-4 text-rose-400" />Configuration Summary
                                </h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between"><span className="text-slate-400">Image</span><span className={imageUrl ? 'text-emerald-400' : 'text-slate-500'}>{imageUrl ? '✓ Set' : 'Not set'}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Caption</span><span className={caption ? 'text-emerald-400' : 'text-slate-500'}>{caption ? '✓ Set' : 'None'}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Delay</span><span className="text-white">{delaySeconds}s</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Button</span><span className={showButton ? 'text-emerald-400' : 'text-slate-500'}>{showButton ? '✓ Enabled' : 'Disabled'}</span></div>
                                    {showButton && (
                                        <>
                                            <div className="flex justify-between"><span className="text-slate-400">Button Text</span><span className="text-white truncate max-w-[120px]">{buttonText}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-400">Action</span><span className="text-rose-400 capitalize">{buttonAction.replace('_', ' ')}</span></div>
                                        </>
                                    )}
                                </div>
                            </div>
                            {showButton && (
                                <div className="bg-black/20 rounded-xl p-4 border border-white/5 mt-4">
                                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                        <MousePointer2 className="w-4 h-4 text-rose-400" />Button Behavior
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        {buttonAction === 'url' && `Opens: ${buttonUrl || '(URL not set)'}`}
                                        {buttonAction === 'existing_flow' && `Triggers: ${buttonFlowName || '(Flow not selected)'}`}
                                        {buttonAction === 'create_flow' && 'Creates a new flow when clicked'}
                                        {buttonAction === 'upsell' && 'Opens the connected Upsell node webview'}
                                        {buttonAction === 'downsell' && 'Opens the connected Downsell node webview'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full overflow-y-auto p-4 space-y-4">
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
                )}
            </div>
        </div>
    );
};

export default ImageNodeForm;
