import React, { useState, useRef, useMemo } from 'react';
import {
    Receipt, Building2, Palette, Package, Truck, CheckCircle, Clock,
    Upload, Link, X, AlertCircle, Eye, Sparkles, Download, FileImage,
    Mail, Phone, MapPin
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import CollapsibleTips from './CollapsibleTips';

interface InvoiceNodeFormProps {
    workspaceId: string;
    initialConfig?: {
        // Company Info
        companyName?: string;
        companyLogo?: string;
        companyEmail?: string;
        companyPhone?: string;
        companyAddress?: string;
        // Invoice Style
        primaryColor?: string;
        templateStyle?: 'modern' | 'classic' | 'minimal';
        // Display Options
        showOrderItems?: boolean;
        showCustomerInfo?: boolean;
        showOrderTotal?: boolean;
        // Order Tracking
        showOrderTracking?: boolean;
        customStatusLabels?: {
            pending?: string;
            processing?: string;
            shipped?: string;
            delivered?: string;
        };
        // Download Options
        enablePdfDownload?: boolean;
        enableImageDownload?: boolean;
    };
    onChange: (config: any) => void;
}

const PRESET_COLORS = [
    '#7c3aed', // Purple
    '#6366f1', // Indigo
    '#3b82f6', // Blue
    '#0891b2', // Cyan
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#ec4899', // Pink
    '#1f2937', // Dark
    '#64748b', // Slate
];

const TEMPLATE_STYLES = [
    { id: 'modern', name: 'Modern', desc: 'Clean with rounded corners' },
    { id: 'classic', name: 'Classic', desc: 'Traditional business style' },
    { id: 'minimal', name: 'Minimal', desc: 'Simple and elegant' },
];

const InvoiceNodeForm: React.FC<InvoiceNodeFormProps> = ({
    workspaceId,
    initialConfig,
    onChange
}) => {
    // Company Info state
    const [companyName, setCompanyName] = useState(initialConfig?.companyName || 'Your Company');
    const [companyLogo, setCompanyLogo] = useState(initialConfig?.companyLogo || '');
    const [companyEmail, setCompanyEmail] = useState(initialConfig?.companyEmail || '');
    const [companyPhone, setCompanyPhone] = useState(initialConfig?.companyPhone || '');
    const [companyAddress, setCompanyAddress] = useState(initialConfig?.companyAddress || '');

    // Style state
    const [primaryColor, setPrimaryColor] = useState(initialConfig?.primaryColor || '#7c3aed');
    const [templateStyle, setTemplateStyle] = useState<'modern' | 'classic' | 'minimal'>(initialConfig?.templateStyle || 'modern');

    // Display options
    const [showOrderItems, setShowOrderItems] = useState(initialConfig?.showOrderItems ?? true);
    const [showCustomerInfo, setShowCustomerInfo] = useState(initialConfig?.showCustomerInfo ?? true);
    const [showOrderTotal, setShowOrderTotal] = useState(initialConfig?.showOrderTotal ?? true);

    // Tracking options
    const [showOrderTracking, setShowOrderTracking] = useState(initialConfig?.showOrderTracking ?? true);
    const [statusLabels, setStatusLabels] = useState({
        pending: initialConfig?.customStatusLabels?.pending || 'Pending',
        processing: initialConfig?.customStatusLabels?.processing || 'Processing',
        shipped: initialConfig?.customStatusLabels?.shipped || 'Shipped',
        delivered: initialConfig?.customStatusLabels?.delivered || 'Delivered',
    });

    // Download options
    const [enablePdfDownload, setEnablePdfDownload] = useState(initialConfig?.enablePdfDownload ?? true);
    const [enableImageDownload, setEnableImageDownload] = useState(initialConfig?.enableImageDownload ?? true);

    // Upload state
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Active section for accordion
    const [activeSection, setActiveSection] = useState<string>('company');

    // Mobile view toggle
    const [mobileView, setMobileView] = useState<'preview' | 'config'>('config');

    // Notify parent of changes
    const notifyChange = (updates: Partial<typeof initialConfig> = {}) => {
        onChange({
            companyName,
            companyLogo,
            companyEmail,
            companyPhone,
            companyAddress,
            primaryColor,
            templateStyle,
            showOrderItems,
            showCustomerInfo,
            showOrderTotal,
            showOrderTracking,
            customStatusLabels: statusLabels,
            enablePdfDownload,
            enableImageDownload,
            ...updates
        });
    };

    // Handle logo upload
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setUploadError('Please select an image file');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setUploadError('Logo must be less than 2MB');
            return;
        }

        setIsUploading(true);
        setUploadError('');

        try {
            const fileName = `invoice-logo-${Date.now()}-${file.name}`;
            const filePath = `${workspaceId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('attachments')
                .getPublicUrl(filePath);

            setCompanyLogo(publicUrl);
            notifyChange({ companyLogo: publicUrl });
        } catch (error: any) {
            console.error('Upload error:', error);
            setUploadError(error.message || 'Failed to upload logo');
        } finally {
            setIsUploading(false);
        }
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

    // Toggle component
    const Toggle = ({ value, onChange: onToggle, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => (
        <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">{label}</label>
            <button
                onClick={() => onToggle(!value)}
                className={`w-12 h-6 rounded-full transition-all ${value ? 'bg-purple-500' : 'bg-slate-600'}`}
            >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
        </div>
    );

    // Order tracking status display
    const trackingSteps = [
        { id: 'pending', label: statusLabels.pending, icon: Clock },
        { id: 'processing', label: statusLabels.processing, icon: Package },
        { id: 'shipped', label: statusLabels.shipped, icon: Truck },
        { id: 'delivered', label: statusLabels.delivered, icon: CheckCircle },
    ];

    // Preview JSX
    const previewCardJSX = useMemo(() => (
        <div
            className={`shadow-2xl transition-all duration-300 bg-white ${templateStyle === 'modern' ? 'rounded-2xl' : templateStyle === 'classic' ? 'rounded-lg' : 'rounded-md'
                }`}
            style={{ padding: templateStyle === 'minimal' ? '16px' : '20px' }}
        >
            {/* Invoice Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    {companyLogo ? (
                        <img src={companyLogo} alt="Logo" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                            <Receipt className="w-6 h-6 text-white" />
                        </div>
                    )}
                    <div>
                        <div className="font-bold text-slate-800">{companyName}</div>
                        {companyEmail && <div className="text-xs text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" />{companyEmail}</div>}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs font-bold uppercase tracking-wider" style={{ color: primaryColor }}>Invoice</div>
                    <div className="text-sm font-medium text-slate-700">#INV-00001</div>
                    <div className="text-xs text-slate-500">Jan 02, 2026</div>
                </div>
            </div>

            {/* Customer Info */}
            {showCustomerInfo && (
                <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs font-medium text-slate-500 mb-1">Bill To:</div>
                    <div className="text-sm font-medium text-slate-800">John Doe</div>
                    <div className="text-xs text-slate-500">johndoe@email.com</div>
                </div>
            )}

            {/* Order Items */}
            {showOrderItems && (
                <div className="mb-4">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Items</div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                            <div>
                                <div className="text-sm font-medium text-slate-800">Product Item</div>
                                <div className="text-xs text-slate-500">Qty: 1</div>
                            </div>
                            <div className="text-sm font-medium text-slate-800">₱588</div>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                            <div className="text-sm text-slate-600">Shipping</div>
                            <div className="text-sm text-slate-800">₱50</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Total */}
            {showOrderTotal && (
                <div className="flex justify-between items-center py-3 px-4 rounded-lg mb-4" style={{ backgroundColor: `${primaryColor}15` }}>
                    <span className="font-bold text-slate-800">Total</span>
                    <span className="text-xl font-bold" style={{ color: primaryColor }}>₱638</span>
                </div>
            )}

            {/* Order Tracking */}
            {showOrderTracking && (
                <div className="mb-4">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Order Status</div>
                    <div className="flex items-center justify-between">
                        {trackingSteps.map((step, idx) => {
                            const IconComponent = step.icon;
                            const isActive = idx <= 1;
                            return (
                                <div key={step.id} className="flex flex-col items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? 'text-white' : 'bg-slate-100 text-slate-400'}`}
                                        style={isActive ? { backgroundColor: primaryColor } : {}}>
                                        <IconComponent className="w-4 h-4" />
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-1 text-center">{step.label}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Download Buttons */}
            <div className="flex gap-2">
                {enablePdfDownload && (
                    <button className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2"
                        style={{ backgroundColor: primaryColor }}>
                        <Download className="w-4 h-4" />
                        Download PDF
                    </button>
                )}
                {enableImageDownload && (
                    <button className="flex-1 py-2.5 rounded-lg text-sm font-medium border-2 flex items-center justify-center gap-2"
                        style={{ borderColor: primaryColor, color: primaryColor }}>
                        <FileImage className="w-4 h-4" />
                        Save Image
                    </button>
                )}
            </div>
        </div>
    ), [companyName, companyLogo, companyEmail, primaryColor, templateStyle, showCustomerInfo, showOrderItems, showOrderTotal, showOrderTracking, enablePdfDownload, enableImageDownload, trackingSteps]);

    // Config Form JSX
    const configFormJSX = useMemo(() => (
        <div className="space-y-3">
            {/* Company Info Section */}
            <div className="space-y-3">
                <SectionHeader id="company" icon={Building2} title="Company Info" color="purple" />
                {activeSection === 'company' && (
                    <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/10 animate-fade-in">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Company Name</label>
                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) => {
                                    setCompanyName(e.target.value);
                                    notifyChange({ companyName: e.target.value });
                                }}
                                placeholder="Your Company Name"
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 outline-none transition-all placeholder-slate-500"
                            />
                        </div>

                        {/* Logo Upload */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Company Logo</label>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                accept="image/*"
                                className="hidden"
                            />
                            {companyLogo ? (
                                <div className="flex items-center gap-3">
                                    <img src={companyLogo} alt="Logo" className="w-16 h-16 rounded-xl object-cover" />
                                    <button
                                        onClick={() => { setCompanyLogo(''); notifyChange({ companyLogo: '' }); }}
                                        className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="w-full py-4 border-2 border-dashed border-white/20 rounded-xl text-slate-400 hover:text-white hover:border-purple-500/50 transition-all flex items-center justify-center gap-2"
                                >
                                    {isUploading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-5 h-5" />
                                            Upload Logo
                                        </>
                                    )}
                                </button>
                            )}
                            {uploadError && (
                                <div className="mt-2 text-red-400 text-sm flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {uploadError}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                            <input
                                type="email"
                                value={companyEmail}
                                onChange={(e) => {
                                    setCompanyEmail(e.target.value);
                                    notifyChange({ companyEmail: e.target.value });
                                }}
                                placeholder="contact@company.com"
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 outline-none transition-all placeholder-slate-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                            <input
                                type="tel"
                                value={companyPhone}
                                onChange={(e) => {
                                    setCompanyPhone(e.target.value);
                                    notifyChange({ companyPhone: e.target.value });
                                }}
                                placeholder="+63 912 345 6789"
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 outline-none transition-all placeholder-slate-500"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Invoice Style Section */}
            <div className="space-y-3">
                <SectionHeader id="style" icon={Palette} title="Invoice Style" color="indigo" />
                {activeSection === 'style' && (
                    <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/10 animate-fade-in">
                        <ColorPicker
                            value={primaryColor}
                            onChange={(c) => { setPrimaryColor(c); notifyChange({ primaryColor: c }); }}
                            label="Primary Color"
                        />

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">Template Style</label>
                            <div className="grid grid-cols-3 gap-2">
                                {TEMPLATE_STYLES.map(style => (
                                    <button
                                        key={style.id}
                                        onClick={() => { const styleId = style.id as 'modern' | 'classic' | 'minimal'; setTemplateStyle(styleId); notifyChange({ templateStyle: styleId }); }}
                                        className={`p-3 rounded-xl border transition-all text-center ${templateStyle === style.id
                                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                                            : 'bg-black/20 border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <div className="text-sm font-medium">{style.name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Display Options Section */}
            <div className="space-y-3">
                <SectionHeader id="display" icon={Eye} title="Display Options" color="cyan" />
                {activeSection === 'display' && (
                    <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/10 animate-fade-in">
                        <Toggle
                            value={showOrderItems}
                            onChange={(v) => { setShowOrderItems(v); notifyChange({ showOrderItems: v }); }}
                            label="Show Order Items"
                        />
                        <Toggle
                            value={showCustomerInfo}
                            onChange={(v) => { setShowCustomerInfo(v); notifyChange({ showCustomerInfo: v }); }}
                            label="Show Customer Info"
                        />
                        <Toggle
                            value={showOrderTotal}
                            onChange={(v) => { setShowOrderTotal(v); notifyChange({ showOrderTotal: v }); }}
                            label="Show Order Total"
                        />
                    </div>
                )}
            </div>

            {/* Order Tracking Section */}
            <div className="space-y-3">
                <SectionHeader id="tracking" icon={Truck} title="Order Tracking" color="emerald" />
                {activeSection === 'tracking' && (
                    <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/10 animate-fade-in">
                        <Toggle
                            value={showOrderTracking}
                            onChange={(v) => { setShowOrderTracking(v); notifyChange({ showOrderTracking: v }); }}
                            label="Enable Order Tracking"
                        />

                        {showOrderTracking && (
                            <div className="space-y-3 mt-4 p-3 bg-black/30 rounded-xl">
                                <label className="block text-xs font-medium text-slate-400">Custom Status Labels</label>
                                {['pending', 'processing', 'shipped', 'delivered'].map(status => (
                                    <div key={status} className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500 capitalize w-20">{status}:</span>
                                        <input
                                            type="text"
                                            value={statusLabels[status as keyof typeof statusLabels]}
                                            onChange={(e) => {
                                                const newLabels = { ...statusLabels, [status]: e.target.value };
                                                setStatusLabels(newLabels);
                                                notifyChange({ customStatusLabels: newLabels });
                                            }}
                                            className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Download Options Section */}
            <div className="space-y-3">
                <SectionHeader id="download" icon={Download} title="Download Options" color="rose" />
                {activeSection === 'download' && (
                    <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/10 animate-fade-in">
                        <Toggle
                            value={enablePdfDownload}
                            onChange={(v) => { setEnablePdfDownload(v); notifyChange({ enablePdfDownload: v }); }}
                            label="Enable PDF Download"
                        />
                        <Toggle
                            value={enableImageDownload}
                            onChange={(v) => { setEnableImageDownload(v); notifyChange({ enableImageDownload: v }); }}
                            label="Enable Image Download"
                        />
                    </div>
                )}
            </div>

            {/* Tips */}
            <CollapsibleTips title="Tips & Best Practices" color="green">
                <ul className="text-sm space-y-1.5">
                    <li>• Add your company logo for professional branding</li>
                    <li>• Use your brand color for consistent styling</li>
                    <li>• Enable order tracking to keep customers informed</li>
                    <li>• PDF downloads work best for official records</li>
                    <li>• Image downloads are great for quick mobile sharing</li>
                </ul>
            </CollapsibleTips>
        </div>
    ), [activeSection, companyName, companyLogo, companyEmail, companyPhone, isUploading, uploadError, primaryColor, templateStyle, showOrderItems, showCustomerInfo, showOrderTotal, showOrderTracking, statusLabels, enablePdfDownload, enableImageDownload]);

    return (
        <>
            {/* Mobile: Toggle Switch */}
            <div className="md:hidden mb-4">
                <div className="flex rounded-xl overflow-hidden border border-white/10 bg-black/20">
                    <button
                        onClick={() => setMobileView('config')}
                        className={`flex-1 py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${mobileView === 'config'
                            ? 'bg-purple-500/20 text-purple-400 border-b-2 border-purple-500'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <Sparkles className="w-4 h-4" />
                        Configure
                    </button>
                    <button
                        onClick={() => setMobileView('preview')}
                        className={`flex-1 py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${mobileView === 'preview'
                            ? 'bg-purple-500/20 text-purple-400 border-b-2 border-purple-500'
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
                        <div className="max-w-[360px] w-full">
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
                            <Eye className="w-4 h-4 text-purple-400" />
                            <span className="text-sm font-semibold text-white">Live Preview</span>
                        </div>
                        <div className="flex items-center justify-center">
                            <div className="max-w-[360px] w-full">
                                {previewCardJSX}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default InvoiceNodeForm;
