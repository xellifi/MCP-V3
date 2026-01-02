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

    // Preview JSX - matches actual server-rendered invoice
    const previewCardJSX = useMemo(() => (
        <div className="rounded-2xl overflow-hidden shadow-2xl bg-white">
            {/* Gradient Header */}
            <div className="p-4" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)` }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/20">
                            {companyLogo ? (
                                <img src={companyLogo} alt="Logo" className="w-full h-full rounded-lg object-cover" />
                            ) : (
                                <Receipt className="w-5 h-5 text-white" />
                            )}
                        </div>
                        <div>
                            <div className="text-white font-bold text-sm">{companyName}</div>
                            <div className="text-white/80 text-xs">Official Invoice</div>
                            {companyAddress && <div className="text-white/60 text-[10px] mt-0.5 max-w-[120px] leading-tight">{companyAddress}</div>}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-white/70 text-[10px] uppercase tracking-wider">Invoice</div>
                        <div className="text-white font-mono text-xs">#INV-ABC123</div>
                    </div>
                </div>
            </div>

            {/* Status Bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-green-100 border-b border-gray-100">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Order Confirmed
                </div>
                <div className="text-gray-500 text-[11px]">Jan 02, 2026, 7:00 PM</div>
            </div>

            {/* Customer Section */}
            {showCustomerInfo && (
                <div className="px-4 py-3 border-b border-gray-100">
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Customer</div>
                    <div className="font-semibold text-gray-800 text-sm">John Doe</div>
                    <div className="text-gray-500 text-xs">johndoe@email.com</div>
                    <div className="text-gray-500 text-xs">+63 912 345 6789</div>
                </div>
            )}

            {/* Order Details */}
            {showOrderItems && (
                <div className="px-4 py-3 border-b border-gray-100">
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Order Details</div>
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="font-medium text-gray-800 text-sm">Sample Product</div>
                            <div className="text-gray-500 text-xs">Qty: 1</div>
                        </div>
                        <div className="font-semibold text-gray-800 text-sm">₱588</div>
                    </div>
                </div>
            )}

            {/* Summary */}
            {showOrderTotal && (
                <div className="px-4 py-3 bg-gray-50">
                    <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-500">Subtotal</span>
                        <span className="text-gray-700">₱588</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                        <span className="font-bold text-gray-800 text-sm">Total</span>
                        <span className="text-xl font-bold" style={{ color: primaryColor }}>₱588</span>
                    </div>
                </div>
            )}

            {/* Payment Method */}
            <div className="px-4 py-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                    <span className="text-lg">💵</span>
                    <div>
                        <div className="text-gray-500 text-[11px]">Payment Method</div>
                        <div className="text-gray-800 font-medium text-sm">Cash on Delivery</div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 text-center border-t border-gray-100">
                <p className="text-gray-400 text-[11px]">Thank you for your order!</p>
            </div>

            {/* Download Buttons */}
            {(enablePdfDownload || enableImageDownload) && (
                <div className="flex gap-2 p-3 bg-white border-t border-gray-100">
                    {enableImageDownload && (
                        <button className="flex-1 py-2 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 flex items-center justify-center gap-1.5 shadow-sm">
                            🖼️ Save Image
                        </button>
                    )}
                    {enablePdfDownload && (
                        <button className="flex-1 py-2 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 flex items-center justify-center gap-1.5 shadow-sm">
                            📄 Save PDF
                        </button>
                    )}
                </div>
            )}
        </div>
    ), [companyName, companyLogo, companyAddress, primaryColor, showCustomerInfo, showOrderItems, showOrderTotal, enablePdfDownload, enableImageDownload]);

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

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                <MapPin className="w-4 h-4 inline mr-1" />
                                Company Address
                            </label>
                            <textarea
                                value={companyAddress}
                                onChange={(e) => {
                                    setCompanyAddress(e.target.value);
                                    notifyChange({ companyAddress: e.target.value });
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                onFocus={(e) => e.stopPropagation()}
                                placeholder="123 Business Street, Metro Manila, Philippines"
                                rows={2}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 outline-none transition-all placeholder-slate-500 resize-none"
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
