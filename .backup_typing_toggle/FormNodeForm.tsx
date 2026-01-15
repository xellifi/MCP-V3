import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, GripVertical, Type, Mail, Phone, Hash, AlignLeft, ChevronDown, CircleDot, CheckSquare, Timer, ShoppingCart, Wallet, Upload, X, ArrowLeft, ArrowRight, Eye, EyeOff, Check, FileText, Tag } from 'lucide-react';
import { FormField } from '../types';
import { supabase } from '../lib/supabase';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface FormNodeFormProps {
    workspaceId: string;
    initialConfig?: any;
    onChange: (config: any) => void;
}

const FIELD_TYPES = [
    { value: 'text', label: 'Text', icon: Type },
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'phone', label: 'Phone', icon: Phone },
    { value: 'number', label: 'Number', icon: Hash },
    { value: 'textarea', label: 'Long', icon: AlignLeft },
    { value: 'select', label: 'Dropdown', icon: ChevronDown },
    { value: 'radio', label: 'Radio', icon: CircleDot },
    { value: 'checkbox', label: 'Check', icon: CheckSquare },
];

const COLOR_PRESETS = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#ef4444', '#f97316',
    '#eab308', '#84cc16', '#22c55e', '#14b8a6',
    '#06b6d4', '#0ea5e9', '#3b82f6', '#1e293b',
];

const CURRENCIES = [
    { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
];

const STEPS = [
    { id: 'product', label: 'Product', icon: '📦' },
    { id: 'fields', label: 'Fields', icon: '📝' },
    { id: 'payment', label: 'Payment', icon: '💳' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
];

const FormNodeForm: React.FC<FormNodeFormProps> = ({ workspaceId, initialConfig, onChange }) => {
    const { isDark } = useTheme();
    // Current step (0-3)
    const [currentStep, setCurrentStep] = useState(0);
    const [showPreview, setShowPreview] = useState(false); // Mobile preview toggle
    const [isMobile, setIsMobile] = useState(false);

    // Form state
    const [formName, setFormName] = useState(initialConfig?.formName || 'Order Form');
    const [headerImageUrl, setHeaderImageUrl] = useState(initialConfig?.headerImageUrl || '');
    const [submitButtonText, setSubmitButtonText] = useState(initialConfig?.submitButtonText || 'Place Order');
    const [submitButtonColor, setSubmitButtonColor] = useState(initialConfig?.submitButtonColor || '#6366f1');
    const [borderRadius, setBorderRadius] = useState<'normal' | 'rounded' | 'round' | 'full'>(initialConfig?.borderRadius || 'round');
    const [formTemplate, setFormTemplate] = useState<'modern' | 'minimal'>(initialConfig?.formTemplate || 'minimal');
    const [successMessage, setSuccessMessage] = useState(initialConfig?.successMessage || 'Order placed successfully! We will contact you soon.');
    const [fields, setFields] = useState<FormField[]>(initialConfig?.fields || [
        { id: 'name', type: 'text', label: 'Full Name', placeholder: 'Enter your name', required: true },
        { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: 'Enter phone number', required: true },
        { id: 'address', type: 'textarea', label: 'Delivery Address', placeholder: 'Enter complete address', required: true },
    ]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [expandedOptions, setExpandedOptions] = useState<Record<string, boolean>>({});

    // Timer settings
    const [countdownEnabled, setCountdownEnabled] = useState(initialConfig?.countdownEnabled || false);
    const [countdownMinutes, setCountdownMinutes] = useState(initialConfig?.countdownMinutes || 10);
    const [countdownBlink, setCountdownBlink] = useState(initialConfig?.countdownBlink ?? true);
    const [promoText, setPromoText] = useState(initialConfig?.promoText || 'Promo Only!');
    const [promoIcon, setPromoIcon] = useState(initialConfig?.promoIcon || '🔥');

    // Order/Product settings
    const [isOrderForm, setIsOrderForm] = useState(initialConfig?.isOrderForm ?? true);
    const [productName, setProductName] = useState(initialConfig?.productName || '');
    const [productPrice, setProductPrice] = useState(initialConfig?.productPrice || 999);
    const [currency, setCurrency] = useState(initialConfig?.currency || 'PHP');
    const [maxQuantity, setMaxQuantity] = useState(initialConfig?.maxQuantity || 10);
    const [couponEnabled, setCouponEnabled] = useState(initialConfig?.couponEnabled || false);
    const [couponCode, setCouponCode] = useState(initialConfig?.couponCode || '');
    const [couponDiscount, setCouponDiscount] = useState(initialConfig?.couponDiscount || 10);

    // Payment settings
    const [codEnabled, setCodEnabled] = useState(initialConfig?.codEnabled ?? true);
    const [ewalletEnabled, setEwalletEnabled] = useState(initialConfig?.ewalletEnabled ?? true);
    const [ewalletOptions, setEwalletOptions] = useState<string[]>(initialConfig?.ewalletOptions || ['GCash', 'Maya', 'PayPal']);
    const [ewalletNumbers, setEwalletNumbers] = useState<Record<string, string>>(initialConfig?.ewalletNumbers || {});
    const [requireProofUpload, setRequireProofUpload] = useState(initialConfig?.requireProofUpload ?? true);

    // Image upload state
    const [uploading, setUploading] = useState(false);
    const [uploadedImageUrl, setUploadedImageUrl] = useState('');
    const [copied, setCopied] = useState(false);

    const [formId, setFormId] = useState(initialConfig?.formId);

    // Template selection mode
    const [templateMode, setTemplateMode] = useState<'new' | 'template'>(initialConfig?.formId ? 'template' : 'new');
    const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialConfig?.formId || '');
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false);
    const templateDropdownRef = useRef<HTMLDivElement>(null);

    // Label management - On Open Form Click
    const [openAddLabel, setOpenAddLabel] = useState<string>(initialConfig?.openAddLabel || '');
    const [openRemoveLabel, setOpenRemoveLabel] = useState<string>(initialConfig?.openRemoveLabel || '');
    const [openLabelDropdownOpen, setOpenLabelDropdownOpen] = useState(false);

    // Label management - On Form Submit
    const [submitAddLabel, setSubmitAddLabel] = useState<string>(initialConfig?.submitAddLabel || '');
    const [submitRemoveLabel, setSubmitRemoveLabel] = useState<string>(initialConfig?.submitRemoveLabel || '');
    const [submitLabelDropdownOpen, setSubmitLabelDropdownOpen] = useState(false);

    // Confirmation message to buyer after order submission
    const [confirmationMessage, setConfirmationMessage] = useState<string>(
        initialConfig?.confirmationMessage ||
        '🧾 Thank you for your order!\n\n✅ Order Confirmed\n📦 We will process your order soon.'
    );

    const [workspaceLabels, setWorkspaceLabels] = useState<string[]>([]);

    // Fetch saved templates
    useEffect(() => {
        const fetchTemplates = async () => {
            if (!workspaceId) return;

            setLoadingTemplates(true);
            try {
                const { data, error } = await supabase
                    .from('forms')
                    .select('id, name, is_order_form, product_name, product_price, currency, page_id')
                    .eq('workspace_id', workspaceId)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Error fetching templates:', error);
                } else if (data) {
                    console.log('Loaded templates:', data.length);
                    setSavedTemplates(data);
                }
            } catch (err) {
                console.error('Error fetching templates:', err);
            } finally {
                setLoadingTemplates(false);
            }
        };

        fetchTemplates();
    }, [workspaceId]);

    // Fetch workspace labels
    useEffect(() => {
        const fetchLabels = async () => {
            if (!workspaceId) return;
            try {
                const labels = await api.workspace.getWorkspaceLabels(workspaceId);
                setWorkspaceLabels(labels);
            } catch (error) {
                console.error('Error fetching workspace labels:', error);
            }
        };
        fetchLabels();
    }, [workspaceId]);

    // Click outside handler for template dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (templateDropdownRef.current && !templateDropdownRef.current.contains(event.target as Node)) {
                setTemplateDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load template data when selected
    const loadTemplate = async (templateId: string) => {
        if (!templateId) return;

        try {
            const { data, error } = await supabase
                .from('forms')
                .select('*')
                .eq('id', templateId)
                .single();

            if (!error && data) {
                // Populate all form fields from template
                setFormId(data.id);
                setFormName(data.name);
                setIsOrderForm(data.is_order_form ?? true);
                setProductName(data.product_name || '');
                setProductPrice(data.product_price || 999);
                setCurrency(data.currency || 'PHP');
                setFields(data.fields || []);
                setSubmitButtonText(data.submit_button_text || 'Place Order');
                setSubmitButtonColor(data.submit_button_color || '#6366f1');
                setBorderRadius(data.border_radius || 'round');
                setSuccessMessage(data.success_message || 'Order placed successfully!');
                setHeaderImageUrl(data.header_image_url || '');
                setCountdownEnabled(data.countdown_enabled || false);
                setCountdownMinutes(data.countdown_minutes || 10);
                setCountdownBlink(data.countdown_blink ?? true);
                setMaxQuantity(data.max_quantity || 10);
                setCouponEnabled(data.coupon_enabled || false);
                setCouponCode(data.coupon_code || '');
                setCouponDiscount(data.coupon_discount || 0);
                setCodEnabled(data.cod_enabled ?? true);
                setEwalletEnabled(data.ewallet_enabled ?? true);
                setEwalletOptions(data.ewallet_options || ['GCash', 'Maya', 'PayPal']);
                setEwalletNumbers(data.ewallet_numbers || {});
                setRequireProofUpload(data.require_proof_upload ?? true);
                setFormTemplate(data.form_template || 'modern');
                setPromoText(data.promo_text || 'Promo Only!');
                setPromoIcon(data.promo_icon || '🔥');
            }
        } catch (err) {
            console.error('Error loading template:', err);
        }
    };

    // Check if mobile
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Sync formId
    useEffect(() => {
        if (initialConfig?.formId && initialConfig.formId !== formId) {
            setFormId(initialConfig.formId);
        }
    }, [initialConfig?.formId]);

    // Debounced onChange callback to prevent focus loss during typing
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Clear previous timeout
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // Debounce the onChange call by 300ms
        debounceRef.current = setTimeout(() => {
            onChange({
                formId, formName, headerImageUrl, submitButtonText, submitButtonColor, borderRadius, successMessage, fields,
                countdownEnabled, countdownMinutes, countdownBlink, promoText, promoIcon, formTemplate,
                isOrderForm, productName, productPrice, currency, maxQuantity, couponEnabled, couponCode, couponDiscount,
                codEnabled, ewalletEnabled, ewalletOptions, ewalletNumbers, requireProofUpload,
                openAddLabel: openAddLabel.trim() || undefined,
                openRemoveLabel: openRemoveLabel.trim() || undefined,
                submitAddLabel: submitAddLabel.trim() || undefined,
                submitRemoveLabel: submitRemoveLabel.trim() || undefined,
                confirmationMessage: confirmationMessage.trim() || undefined,
            });
        }, 300);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [formId, formName, headerImageUrl, submitButtonText, submitButtonColor, borderRadius, successMessage, fields,
        countdownEnabled, countdownMinutes, countdownBlink, promoText, promoIcon, formTemplate, isOrderForm, productName,
        productPrice, currency, maxQuantity, couponEnabled, couponCode, couponDiscount, codEnabled, ewalletEnabled,
        ewalletOptions, ewalletNumbers, requireProofUpload, openAddLabel, openRemoveLabel, submitAddLabel, submitRemoveLabel, confirmationMessage]);

    // Field operations
    const addField = (type: string) => {
        const fieldType = FIELD_TYPES.find(t => t.value === type);
        const newField: FormField = {
            id: `field_${Date.now()}`,
            type: type as FormField['type'],
            label: fieldType?.label || 'New Field',
            placeholder: '',
            required: false,
            options: type === 'select' || type === 'radio' ? ['Option 1', 'Option 2'] : [],
        };
        setFields([...fields, newField]);
    };

    const updateField = (index: number, updates: Partial<FormField>) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], ...updates };
        setFields(newFields);
    };

    const removeField = (index: number) => setFields(fields.filter((_, i) => i !== index));
    const handleDragStart = (index: number) => setDraggedIndex(index);
    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex !== null && draggedIndex !== index) {
            const newFields = [...fields];
            const [removed] = newFields.splice(draggedIndex, 1);
            newFields.splice(index, 0, removed);
            setFields(newFields);
            setDraggedIndex(index);
        }
    };
    const handleDragEnd = () => setDraggedIndex(null);
    const getFieldIcon = (type: string) => FIELD_TYPES.find(t => t.value === type)?.icon || Type;
    const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol || '₱';

    // Theme-aware styles
    const inputClass = isDark
        ? "w-full px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        : "w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50";

    const labelClass = isDark
        ? "block text-xs font-medium text-slate-400 mb-1.5"
        : "block text-xs font-medium text-gray-500 mb-1.5";

    const mutedText = isDark ? "text-slate-500" : "text-gray-400";
    const cardBg = isDark ? "bg-slate-800/40" : "bg-gray-50";
    const subCardBg = isDark ? "bg-slate-900/50" : "bg-white";
    const borderColor = isDark ? "border-slate-600/50" : "border-gray-200";
    const itemBg = isDark ? "bg-slate-800/40" : "bg-white";
    const itemBorder = isDark ? "border-slate-600/30" : "border-gray-200";

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

    // ===== STEP CONTENT (inline JSX, not components) =====
    const productStepContent = (
        <div className="space-y-4">
            <div>
                <label className={labelClass}>Form Name</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className={inputClass} placeholder="Enter form name..." />
            </div>

            <div className={`flex items-center justify-between p-3 border rounded-xl ${isDark ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30' : 'bg-purple-50 border-purple-200'}`}>
                <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-purple-400" />
                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-purple-900'}`}>Multi-Step Order Form</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={isOrderForm} onChange={(e) => setIsOrderForm(e.target.checked)} className="sr-only peer" />
                    <div className={`w-10 h-5 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`}></div>
                </label>
            </div>

            <div>
                <label className={labelClass}>Header Image</label>
                <div className="flex gap-2">
                    <input type="text" value={headerImageUrl} onChange={(e) => { setHeaderImageUrl(e.target.value); setUploadedImageUrl(''); }} placeholder="Image URL..." className={`${inputClass} flex-1`} />
                    <label className={`px-3 py-2 border rounded-xl cursor-pointer flex items-center gap-1.5 ${uploading ? 'opacity-50 pointer-events-none' : ''} ${isDark ? 'bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/50' : 'bg-purple-50 hover:bg-purple-100 border-purple-200'}`}>
                        {uploading ? (
                            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Upload className="w-4 h-4 text-purple-400" />
                        )}
                        <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            setUploading(true);
                            try {
                                const fileName = `form-header-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                                const { error } = await supabase.storage.from('attachments').upload(fileName, file);
                                if (error) throw error;

                                // Use our own domain URL instead of Supabase URL
                                const relativePath = `/images/${fileName}`;
                                const fullUrl = `${window.location.origin}${relativePath}`;
                                setHeaderImageUrl(relativePath); // Use relative for internal display
                                setUploadedImageUrl(fullUrl); // Full URL for copying
                            } catch (err) {
                                console.error('Upload error:', err);
                                alert('Failed to upload image. Please try again.');
                            }
                            setUploading(false);
                        }} />
                    </label>
                </div>
                {headerImageUrl && (
                    <div className="mt-2 space-y-2">
                        <div className="relative inline-block">
                            <img src={headerImageUrl} alt="" className={`max-w-[200px] h-auto rounded-lg border ${isDark ? 'border-slate-700' : 'border-gray-300'}`} />
                            <button type="button" onClick={() => { setHeaderImageUrl(''); setUploadedImageUrl(''); }} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">×</button>
                        </div>
                        {/* Show copyable URL when image was uploaded (not pasted URL) */}
                        {uploadedImageUrl && (
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={uploadedImageUrl}
                                        readOnly
                                        className={`flex-1 px-2 py-1.5 bg-slate-900/50 border border-slate-600/50 rounded-lg text-slate-300 text-xs truncate ${isDark ? 'bg-slate-900/50 border-slate-600/50 text-slate-300' : 'bg-gray-100 border-gray-300 text-gray-500'}`}
                                        onClick={(e) => (e.target as HTMLInputElement).select()}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(uploadedImageUrl);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                        className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${copied
                                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                                            : 'bg-purple-500/20 text-purple-400 border border-purple-500/50 hover:bg-purple-500/30'}`}
                                    >
                                        {copied ? '✓ Copied!' : 'Copy URL'}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <span>💡</span>
                                    <span>Save this link! Use it instead of uploading the same image again to keep your forms fast.</span>
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Product Name - Always visible */}
            <div>
                <label className={labelClass}>Product Name</label>
                <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Enter product name..." className={inputClass} />
            </div>

            {isOrderForm && (
                <>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Price</label>
                            <div className="flex">
                                <span className={`px-2.5 py-2 border rounded-l-xl text-sm flex-shrink-0 ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}`}>{currencySymbol}</span>
                                <input type="number" value={productPrice} onChange={(e) => setProductPrice(parseFloat(e.target.value) || 0)} className={`w-full min-w-0 px-3 py-2 border rounded-r-xl text-sm focus:outline-none ${isDark ? 'bg-slate-800/60 border-slate-600/50 text-white' : 'bg-white border-gray-300 text-gray-900'}`} />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Currency</label>
                            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
                                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Max Quantity</label>
                        <input type="number" min="1" max="100" value={maxQuantity} onChange={(e) => setMaxQuantity(parseInt(e.target.value) || 1)} className={inputClass} />
                    </div>

                    <div className={`p-3 border rounded-xl space-y-2 ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Coupon Code</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={couponEnabled} onChange={(e) => setCouponEnabled(e.target.checked)} className="sr-only peer" />
                                <div className={`w-9 h-5 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`}></div>
                            </label>
                        </div>
                        {couponEnabled && (
                            <div className="flex gap-2">
                                <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="CODE" className={`flex-1 px-3 py-1.5 border rounded-lg text-xs uppercase ${isDark ? 'bg-slate-900/50 border-slate-600/50 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} />
                                <div className="flex items-center gap-1">
                                    <input type="number" value={couponDiscount} onChange={(e) => setCouponDiscount(parseInt(e.target.value) || 0)} className={`w-14 px-2 py-1.5 border rounded-lg text-xs text-center ${isDark ? 'bg-slate-900/50 border-slate-600/50 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} />
                                    <span className={`${mutedText} text-xs`}>% off</span>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );

    const fieldsStepContent = (
        <div className="space-y-4">
            <p className={`text-xs ${mutedText}`}>Buyer information fields (Step 2 of the form)</p>

            <div className="grid grid-cols-4 gap-1.5">
                {FIELD_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                        <button key={type.value} onClick={() => addField(type.value)} className={`flex flex-col items-center gap-0.5 p-2 border rounded-lg transition-all group ${isDark ? 'bg-slate-800/40 hover:bg-purple-500/20 border-slate-600/30 hover:border-purple-500/50' : 'bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-200'}`}>
                            <Icon className={`w-4 h-4 ${isDark ? 'text-slate-400 group-hover:text-purple-400' : 'text-gray-500 group-hover:text-purple-600'}`} />
                            <span className={`text-[9px] ${isDark ? 'text-slate-500 group-hover:text-purple-300' : 'text-gray-500 group-hover:text-purple-700'}`}>{type.label}</span>
                        </button>
                    );
                })}
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {fields.map((field, index) => {
                    const Icon = getFieldIcon(field.type);
                    const hasOptions = field.type === 'select' || field.type === 'radio';
                    return (
                        <div key={field.id} draggable onDragStart={() => handleDragStart(index)} onDragOver={(e) => handleDragOver(e, index)} onDragEnd={handleDragEnd} className={`${itemBg} border ${itemBorder} rounded-lg p-2 ${draggedIndex === index ? 'opacity-50' : ''}`}>
                            <div className="flex items-center gap-2">
                                <GripVertical className={`w-3 h-3 cursor-grab ${isDark ? 'text-slate-600' : 'text-gray-400'}`} />
                                <div className={`w-6 h-6 rounded flex items-center justify-center ${isDark ? 'bg-purple-500/20' : 'bg-purple-50'}`}>
                                    <Icon className={`w-3 h-3 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                                </div>
                                <input type="text" value={field.label} onChange={(e) => updateField(index, { label: e.target.value })} className={`flex-1 px-2 py-1 bg-transparent text-sm focus:outline-none ${isDark ? 'text-white' : 'text-gray-900'}`} />
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="checkbox" checked={field.required} onChange={(e) => updateField(index, { required: e.target.checked })} className="w-3 h-3 rounded text-purple-500" />
                                    <span className={`text-[10px] ${mutedText}`}>Req</span>
                                </label>
                                <button onClick={() => removeField(index)} className="p-1 text-slate-500 hover:text-red-400">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            {hasOptions && (
                                <div className={`mt-2 pt-2 border-t ${isDark ? 'border-slate-700/50' : 'border-gray-100'}`}>
                                    <button
                                        onClick={() => setExpandedOptions(prev => ({ ...prev, [field.id]: !prev[field.id] }))}
                                        className={`flex items-center justify-between w-full text-[9px] transition-colors ${isDark ? 'text-slate-400 hover:text-purple-400' : 'text-gray-500 hover:text-purple-600'}`}
                                    >
                                        <span className="flex items-center gap-1">
                                            Options <span className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>{(field.options || []).length}</span>
                                        </span>
                                        <ChevronDown className={`w-3 h-3 transition-transform ${expandedOptions[field.id] ? 'rotate-180' : ''}`} />
                                    </button>
                                    {expandedOptions[field.id] && (
                                        <div className="mt-2 space-y-1">
                                            {(field.options || []).map((option, optIndex) => (
                                                <div key={optIndex} className="flex items-center gap-1">
                                                    <input type="text" value={option} onChange={(e) => { const newOptions = [...(field.options || [])]; newOptions[optIndex] = e.target.value; updateField(index, { options: newOptions }); }} className={`flex-1 px-2 py-1 border rounded text-xs ${isDark ? 'bg-slate-900/50 border-slate-600/50 text-white' : 'bg-white border-gray-200 text-gray-900'}`} />
                                                    <button onClick={() => { updateField(index, { options: (field.options || []).filter((_, i) => i !== optIndex) }); }} className="p-0.5 text-slate-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                                                </div>
                                            ))}
                                            <button onClick={() => updateField(index, { options: [...(field.options || []), ''] })} className={`w-full py-1 text-[9px] border border-dashed rounded hover:bg-purple-500/10 ${isDark ? 'text-purple-400 border-slate-600' : 'text-purple-600 border-gray-300'}`}>+ Add Option</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const paymentStepContent = (
        <div className="space-y-4">
            <p className={`text-xs ${mutedText}`}>Payment options (Step 3 of the form)</p>

            <div className={`flex items-center justify-between p-3 border rounded-xl ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center gap-2">
                    <span className="text-lg">💵</span>
                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Cash on Delivery</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={codEnabled} onChange={(e) => setCodEnabled(e.target.checked)} className="sr-only peer" />
                    <div className={`w-9 h-5 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`}></div>
                </label>
            </div>

            <div className={`p-3 border rounded-xl space-y-3 ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-blue-400" />
                        <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>E-Wallet</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={ewalletEnabled} onChange={(e) => setEwalletEnabled(e.target.checked)} className="sr-only peer" />
                        <div className={`w-9 h-5 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`}></div>
                    </label>
                </div>
                {ewalletEnabled && (
                    <div className="space-y-2">
                        {ewalletOptions.map((wallet, i) => (
                            <div key={i} className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <input type="text" value={wallet} onChange={(e) => { const newOptions = [...ewalletOptions]; newOptions[i] = e.target.value; setEwalletOptions(newOptions); }} className={`flex-1 px-2 py-1.5 border rounded-lg text-xs ${isDark ? 'bg-slate-900/50 border-slate-600/50 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} placeholder="Wallet name" />
                                    <button onClick={() => setEwalletOptions(ewalletOptions.filter((_, idx) => idx !== i))} className="text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                                <input type="text" value={ewalletNumbers[wallet] || ''} onChange={(e) => setEwalletNumbers({ ...ewalletNumbers, [wallet]: e.target.value })} className={`w-full px-2 py-1.5 border rounded-lg text-xs ${isDark ? 'bg-slate-900/50 border-slate-600/50 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} placeholder="Account number" />
                            </div>
                        ))}
                        <button onClick={() => setEwalletOptions([...ewalletOptions, ''])} className={`w-full py-1.5 text-xs border border-dashed rounded-lg hover:bg-purple-500/10 ${isDark ? 'text-purple-400 border-slate-600' : 'text-purple-600 border-gray-300'}`}>+ Add E-Wallet</button>
                    </div>
                )}
            </div>

            <div className={`flex items-center justify-between p-3 border rounded-xl ${isDark ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-amber-900'}`}>Require Payment Proof</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={requireProofUpload} onChange={(e) => setRequireProofUpload(e.target.checked)} className="sr-only peer" />
                    <div className={`w-9 h-5 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`}></div>
                </label>
            </div>
        </div>
    );

    const settingsStepContent = (
        <div className="space-y-4">
            <div className={`p-3 border rounded-xl ${isDark ? 'bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/30' : 'bg-orange-50 border-orange-200'}`}>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-orange-400" />
                        <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-orange-900'}`}>Countdown Timer</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={countdownEnabled} onChange={(e) => setCountdownEnabled(e.target.checked)} className="sr-only peer" />
                        <div className={`w-9 h-5 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`}></div>
                    </label>
                </div>
                {countdownEnabled && (
                    <div className="space-y-3 mt-3">
                        <div className="flex items-center gap-2">
                            <input type="number" min="1" max="60" value={countdownMinutes} onChange={(e) => setCountdownMinutes(parseInt(e.target.value) || 1)} className={`w-16 px-2 py-1 border rounded-lg text-center text-sm ${isDark ? 'bg-slate-800/80 border-orange-500/30 text-white' : 'bg-white border-orange-200 text-gray-900'}`} />
                            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>minutes</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={countdownBlink} onChange={(e) => setCountdownBlink(e.target.checked)} className="w-3.5 h-3.5 rounded text-orange-500" />
                            <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>Blink timer</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-gray-500'} block mb-1`}>Promo Icon</label>
                                <input type="text" value={promoIcon} onChange={(e) => setPromoIcon(e.target.value)} className={`w-full px-2 py-1.5 border rounded-lg text-sm text-center ${isDark ? 'bg-slate-800/50 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`} />
                            </div>
                            <div>
                                <label className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-gray-500'} block mb-1`}>Promo Text</label>
                                <input type="text" value={promoText} onChange={(e) => setPromoText(e.target.value)} className={`w-full px-2 py-1.5 border rounded-lg text-sm ${isDark ? 'bg-slate-800/50 border-slate-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div>
                <label className={labelClass}>Form Template</label>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setFormTemplate('modern')} className={`p-3 rounded-xl border-2 text-center transition ${formTemplate === 'modern' ? 'border-purple-500 bg-purple-500/10' : isDark ? 'border-slate-600/50 hover:border-slate-500' : 'border-gray-200 hover:border-gray-300'}`}>
                        <span className="text-lg">✨</span>
                        <p className={`${isDark ? 'text-white' : 'text-gray-900'} text-sm font-medium mt-1`}>Modern</p>
                        <p className={`${mutedText} text-[10px]`}>Dark theme</p>
                    </button>
                    <button onClick={() => setFormTemplate('minimal')} className={`p-3 rounded-xl border-2 text-center transition ${formTemplate === 'minimal' ? 'border-purple-500 bg-purple-500/10' : isDark ? 'border-slate-600/50 hover:border-slate-500' : 'border-gray-200 hover:border-gray-300'}`}>
                        <span className="text-lg">📝</span>
                        <p className={`${isDark ? 'text-white' : 'text-gray-900'} text-sm font-medium mt-1`}>Minimal</p>
                        <p className={`${mutedText} text-[10px]`}>Light theme</p>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelClass}>Button Text</label>
                    <input type="text" value={submitButtonText} onChange={(e) => setSubmitButtonText(e.target.value)} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Corner Style</label>
                    <select value={borderRadius} onChange={(e) => setBorderRadius(e.target.value as any)} className={inputClass}>
                        <option value="normal">Normal</option>
                        <option value="rounded">Rounded</option>
                        <option value="round">Round</option>
                        <option value="full">Pill</option>
                    </select>
                </div>
            </div>

            <div>
                <label className={labelClass}>Button Color</label>
                <div className="grid grid-cols-8 gap-1">
                    {COLOR_PRESETS.map((color) => (
                        <button key={color} onClick={() => setSubmitButtonColor(color)} className={`w-full aspect-square rounded-lg transition-transform hover:scale-110 ${submitButtonColor === color ? `ring-2 ring-white ring-offset-1 ${isDark ? 'ring-offset-slate-900' : 'ring-offset-white'}` : ''}`} style={{ backgroundColor: color }} />
                    ))}
                </div>
            </div>

            <div>
                <label className={labelClass}>Success Message</label>
                <textarea value={successMessage} onChange={(e) => setSuccessMessage(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
            </div>

            {/* Confirmation Message to Buyer Section */}
            <div className={`border-t pt-4 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">💬</span>
                    <span className="text-sm font-medium text-amber-300">Confirmation Message to Buyer</span>
                </div>
                <p className={`text-xs ${mutedText} mb-2`}>
                    This message will be sent to the buyer in Messenger after they submit the order
                </p>
                <textarea
                    value={confirmationMessage}
                    onChange={(e) => setConfirmationMessage(e.target.value)}
                    rows={4}
                    className={`${inputClass} resize-none`}
                    placeholder="🧾 Thank you for your order!

✅ Order Confirmed
📦 We will process your order soon."
                />
            </div>

            {/* Label Management Section */}
            <div className={`border-t pt-4 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-purple-300">Label Management (optional)</span>
                </div>

                {/* On Open Form Click */}
                <div className={`mb-4 p-3 border rounded-xl ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
                    <div className={`text-xs font-bold mb-2 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>📋 On "Open Form" Button Click</div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Add Label</label>
                            <input
                                type="text"
                                value={openAddLabel}
                                onChange={(e) => setOpenAddLabel(e.target.value)}
                                placeholder="e.g., Viewed Form"
                                className={inputClass}
                            />
                        </div>
                        <div className="relative">
                            <label className={labelClass}>Remove Label</label>
                            <button
                                type="button"
                                onClick={() => setOpenLabelDropdownOpen(!openLabelDropdownOpen)}
                                className={`${inputClass} text-left flex items-center justify-between`}
                            >
                                <span className={openRemoveLabel ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-slate-400' : 'text-gray-400')}>
                                    {openRemoveLabel || 'None'}
                                </span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${openLabelDropdownOpen ? 'rotate-180' : ''} ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                            </button>
                            {openLabelDropdownOpen && (
                                <div className={`absolute z-50 w-full mt-1 border rounded-xl shadow-xl overflow-hidden ${isDark ? 'bg-slate-800 border-slate-600/50' : 'bg-white border-gray-200'}`}>
                                    <div className="max-h-32 overflow-y-auto">
                                        <button type="button" onClick={() => { setOpenRemoveLabel(''); setOpenLabelDropdownOpen(false); }}
                                            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} ${!openRemoveLabel ? 'bg-blue-500/20 text-blue-300' : (isDark ? 'text-slate-300' : 'text-gray-600')}`}>
                                            <X className="w-3 h-3" /><span>None</span>
                                        </button>
                                        {workspaceLabels.map(label => (
                                            <button key={label} type="button" onClick={() => { setOpenRemoveLabel(label); setOpenLabelDropdownOpen(false); }}
                                                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} ${openRemoveLabel === label ? 'bg-blue-500/20 text-blue-300' : (isDark ? 'text-slate-300' : 'text-gray-600')}`}>
                                                <Tag className="w-3 h-3 text-blue-400" /><span>{label}</span>
                                            </button>
                                        ))}
                                        {workspaceLabels.length === 0 && (<div className={`px-3 py-2 text-xs text-center ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>No labels yet</div>)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* On Form Submit */}
                <div className={`p-3 border rounded-xl ${isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'}`}>
                    <div className={`text-xs font-bold mb-2 ${isDark ? 'text-green-300' : 'text-green-700'}`}>✅ On Form Submit (Place Order)</div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Add Label</label>
                            <input
                                type="text"
                                value={submitAddLabel}
                                onChange={(e) => setSubmitAddLabel(e.target.value)}
                                placeholder="e.g., Customer, Buyer"
                                className={inputClass}
                            />
                        </div>
                        <div className="relative">
                            <label className={labelClass}>Remove Label</label>
                            <button
                                type="button"
                                onClick={() => setSubmitLabelDropdownOpen(!submitLabelDropdownOpen)}
                                className={`${inputClass} text-left flex items-center justify-between`}
                            >
                                <span className={submitRemoveLabel ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-slate-400' : 'text-gray-400')}>
                                    {submitRemoveLabel || 'None'}
                                </span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${submitLabelDropdownOpen ? 'rotate-180' : ''} ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                            </button>
                            {submitLabelDropdownOpen && (
                                <div className={`absolute z-50 w-full mt-1 border rounded-xl shadow-xl overflow-hidden ${isDark ? 'bg-slate-800 border-slate-600/50' : 'bg-white border-gray-200'}`}>
                                    <div className="max-h-32 overflow-y-auto">
                                        <button type="button" onClick={() => { setSubmitRemoveLabel(''); setSubmitLabelDropdownOpen(false); }}
                                            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} ${!submitRemoveLabel ? 'bg-green-500/20 text-green-300' : (isDark ? 'text-slate-300' : 'text-gray-600')}`}>
                                            <X className="w-3 h-3" /><span>None</span>
                                        </button>
                                        {workspaceLabels.map(label => (
                                            <button key={label} type="button" onClick={() => { setSubmitRemoveLabel(label); setSubmitLabelDropdownOpen(false); }}
                                                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} ${submitRemoveLabel === label ? 'bg-green-500/20 text-green-300' : (isDark ? 'text-slate-300' : 'text-gray-600')}`}>
                                                <Tag className="w-3 h-3 text-green-400" /><span>{label}</span>
                                            </button>
                                        ))}
                                        {workspaceLabels.length === 0 && (<div className={`px-3 py-2 text-xs text-center ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>No labels yet</div>)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // ===== LIVE PREVIEW (matches FormView.tsx exactly, syncs with config step) =====
    // Config step mapping: 0=Product→FormStep1, 1=Fields→FormStep2, 2=Payment→FormStep3, 3=Settings→FormStep1
    const previewStep = currentStep === 0 ? 1 : currentStep === 1 ? 2 : currentStep === 2 ? 3 : 1;

    const formPreviewContent = React.useMemo(() => {
        const isMinimal = formTemplate === 'minimal';
        const containerBg = isMinimal ? 'bg-gradient-to-br from-slate-50 via-white to-indigo-50' : 'bg-[#0a0a12]';
        const cardBg = isMinimal ? 'bg-white shadow-xl border border-slate-200/60' : 'bg-white/[0.06] backdrop-blur-2xl border border-white/10';
        const textColor = isMinimal ? 'text-slate-800' : 'text-white';
        const textMuted = isMinimal ? 'text-slate-500' : 'text-white/50';
        const inputBg = isMinimal ? 'bg-slate-50/80 border-slate-200' : 'bg-white/5 border-white/10';
        const inputText = isMinimal ? 'text-slate-800 placeholder-slate-400' : 'text-white placeholder-white/30';
        const borderRadiusValue = { normal: '0px', rounded: '8px', round: '16px', full: '9999px' }[borderRadius] || '16px';
        const inputRadius = { normal: '0px', rounded: '6px', round: '12px', full: '9999px' }[borderRadius] || '12px';

        return (
            <div className="bg-white rounded-xl overflow-hidden">
                <div className={`${cardBg} flex flex-col`} style={{ borderRadius: borderRadiusValue }}>

                    <div className="py-2.5 px-4 bg-gradient-to-r from-red-400 via-rose-400 to-pink-300">
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-base">{promoIcon || '🔥'}</span>
                            <span className="text-white text-sm font-bold drop-shadow">{promoText || 'Promo Only!'}</span>
                            <span className="text-base">{promoIcon || '🔥'}</span>
                        </div>
                    </div>

                    {/* Header Image or Placeholder */}
                    <div className="bg-white p-3 flex-shrink-0">
                        <img
                            src={headerImageUrl || 'https://cdn.pixabay.com/photo/2016/06/03/17/35/shoes-1433925_1280.jpg'}
                            alt="Header"
                            className="w-full h-auto max-h-32 object-contain rounded"
                        />
                    </div>

                    {/* Product Name Banner - on white bg */}
                    <div className="px-3 py-2 bg-white">
                        <div className="py-2.5 px-4 bg-indigo-600 rounded-lg">
                            <h1 className="text-sm font-bold text-white text-center uppercase tracking-wide">
                                {productName || 'Product Name'}
                            </h1>
                        </div>
                    </div>

                    {/* Countdown Timer */}
                    {countdownEnabled && (
                        <div className="px-3 pb-3">
                            <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 p-3 rounded-xl shadow-lg">
                                <p className="text-center text-white/90 text-xs font-medium mb-2 tracking-wide uppercase">
                                    ⚡ Limited Time Offer
                                </p>
                                <div className="flex items-center justify-center gap-2">
                                    <div className="flex flex-col items-center">
                                        <div className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/30">
                                            <span className="text-white text-xl font-bold font-mono tabular-nums">00</span>
                                        </div>
                                        <span className="text-white/70 text-[9px] mt-1 uppercase tracking-wider">Hours</span>
                                    </div>
                                    <span className="text-white/60 text-xl font-light mb-4">:</span>
                                    <div className="flex flex-col items-center">
                                        <div className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/30 animate-pulse">
                                            <span className="text-white text-xl font-bold font-mono tabular-nums">09</span>
                                        </div>
                                        <span className="text-white/70 text-[9px] mt-1 uppercase tracking-wider">Mins</span>
                                    </div>
                                    <span className="text-white/60 text-xl font-light mb-4">:</span>
                                    <div className="flex flex-col items-center">
                                        <div className="bg-white/20 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/30">
                                            <span className="text-white text-xl font-bold font-mono tabular-nums">59</span>
                                        </div>
                                        <span className="text-white/70 text-[9px] mt-1 uppercase tracking-wider">Secs</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Form Content */}
                    <div className="p-3 bg-white">
                        {/* Step Indicator */}
                        {isOrderForm && (
                            <div className="flex items-center justify-center gap-1.5 mb-4">
                                {[1, 2, 3].map(s => (
                                    <div key={s} className="flex items-center">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${s === previewStep ? 'bg-indigo-600 text-white' :
                                            s < previewStep ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                                            }`}>{s < previewStep ? '✓' : s}</div>
                                        {s < 3 && <div className={`w-5 h-0.5 ${s < previewStep ? 'bg-green-500' : 'bg-gray-200'}`}></div>}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Step 1: Product/Quantity - always show for order forms */}
                        {isOrderForm && (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-slate-500 text-xs mb-1.5">Quantity</label>
                                    <div className="flex items-center gap-2 justify-center">
                                        <button className="w-10 h-10 rounded-xl bg-gray-100 text-gray-800 text-lg font-bold" style={{ borderRadius: inputRadius }}>−</button>
                                        <span className="text-2xl font-bold text-slate-800 w-12 text-center">1</span>
                                        <button className="w-10 h-10 rounded-xl bg-gray-100 text-gray-800 text-lg font-bold" style={{ borderRadius: inputRadius }}>+</button>
                                    </div>
                                </div>

                                <div className="bg-blue-50 border border-blue-100 p-3" style={{ borderRadius: inputRadius }}>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-slate-500 text-xs">Price</span>
                                        <span className="text-slate-800 text-sm">{currencySymbol}{productPrice} × 1</span>
                                    </div>
                                    <div className="border-t border-blue-100 pt-1.5 flex justify-between items-center">
                                        <span className="text-slate-800 font-semibold text-sm">Total</span>
                                        <span className="text-xl font-bold text-indigo-600">{currencySymbol}{productPrice}</span>
                                    </div>
                                </div>

                                {couponEnabled && (
                                    <div className="flex gap-1.5">
                                        <input type="text" placeholder="COUPON" className={`flex-1 px-2 py-2 ${inputBg} border text-xs uppercase`} style={{ borderRadius: inputRadius }} readOnly />
                                        <button className="px-3 py-2 bg-purple-500 text-white text-xs font-medium" style={{ borderRadius: inputRadius }}>Apply</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 2: Buyer Info - always show */}
                        <div className={`${!isMobile ? 'grid grid-cols-2 gap-2' : 'space-y-2'}`}>
                            {fields.map((field) => {
                                const isFullWidth = field.type === 'textarea' || field.type === 'radio';
                                return (
                                    <div key={field.id} className={!isMobile && isFullWidth ? 'col-span-2' : ''}>
                                        <label className="block text-slate-500 text-[10px] mb-0.5">
                                            {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
                                        </label>
                                        {field.type === 'textarea' ? (
                                            <textarea className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 text-xs resize-none placeholder-slate-400" rows={2} style={{ borderRadius: inputRadius }} placeholder={field.placeholder} readOnly />
                                        ) : field.type === 'select' ? (
                                            <div className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 flex items-center justify-between" style={{ borderRadius: inputRadius }}>
                                                <span className="text-xs text-slate-400">Select...</span>
                                                <ChevronDown className="w-3 h-3 text-slate-400" />
                                            </div>
                                        ) : field.type === 'checkbox' ? (
                                            <label className="flex items-center gap-1.5 p-1.5 bg-slate-50 border border-slate-200 cursor-pointer" style={{ borderRadius: inputRadius }}>
                                                <input type="checkbox" className="w-3 h-3" />
                                                <span className="text-gray-700 text-xs">{field.label}</span>
                                            </label>
                                        ) : field.type === 'radio' ? (
                                            <div className="flex gap-2 flex-wrap">
                                                {(field.options || ['Option 1']).slice(0, 3).map((opt, i) => (
                                                    <label key={i} className="flex items-center gap-1.5 p-1.5 bg-slate-50 border border-slate-200 cursor-pointer" style={{ borderRadius: inputRadius }}>
                                                        <input type="radio" name={field.id} className="w-3 h-3" />
                                                        <span className="text-gray-700 text-xs">{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : (
                                            <input type="text" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 text-xs placeholder-slate-400" style={{ borderRadius: inputRadius }} placeholder={field.placeholder} readOnly />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Step 3: Payment - always show if enabled */}
                        {(codEnabled || ewalletEnabled) && (
                            <div className="space-y-3">
                                <p className="text-slate-500 text-xs text-center">Select payment method</p>

                                {codEnabled && (
                                    <button className="w-full p-3 border-2 border-purple-500 bg-purple-50 flex items-center gap-3" style={{ borderRadius: inputRadius }}>
                                        <span className="text-2xl">💵</span>
                                        <div className="text-left">
                                            <p className="text-slate-800 font-semibold text-sm">Cash on Delivery</p>
                                            <p className="text-slate-500 text-xs">Pay when you receive</p>
                                        </div>
                                    </button>
                                )}

                                {ewalletEnabled && ewalletOptions.filter(w => ewalletNumbers[w]).slice(0, 2).map((wallet) => {
                                    const walletLogos: Record<string, string> = {
                                        'GCash': 'https://www.gcash.com/wp-content/uploads/2019/04/gcash-logo.png',
                                        'Maya': 'https://www.maya.ph/hubfs/Maya%20Logo.png',
                                        'PayPal': 'https://www.paypalobjects.com/webstatic/icon/pp258.png',
                                    };
                                    const walletColors: Record<string, string> = {
                                        'GCash': '#007DFE',
                                        'Maya': '#00D26A',
                                        'PayPal': '#003087',
                                    };
                                    return (
                                        <button key={wallet} className="w-full p-3 border-2 border-gray-200 bg-white flex items-center gap-3" style={{ borderRadius: inputRadius }}>
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: walletColors[wallet] || '#666' }}>
                                                {wallet.charAt(0)}
                                            </div>
                                            <div className="text-left flex-1">
                                                <p className="text-slate-800 font-semibold text-sm">{wallet}</p>
                                                <p className="text-slate-500 text-xs">{ewalletNumbers[wallet]}</p>
                                            </div>
                                        </button>
                                    );
                                })}

                                {requireProofUpload && (
                                    <div className="mt-2">
                                        <p className={`${textMuted} text-xs mb-1`}>Upload payment proof <span className="text-red-500">*</span></p>
                                        <div className={`border-2 border-dashed ${isMinimal ? 'border-gray-300' : 'border-white/20'} p-4 text-center`} style={{ borderRadius: inputRadius }}>
                                            <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                                            <p className={`${textMuted} text-xs`}>Tap to upload</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button className="w-full mt-4 py-2.5 text-white font-medium text-sm uppercase" style={{ backgroundColor: submitButtonColor, borderRadius: inputRadius }}>
                            {submitButtonText || 'Submit'}
                        </button>

                        {/* Back link for steps 2-3 */}
                        {previewStep > 1 && (
                            <p className={`text-center mt-2 ${textMuted} text-xs`}>← Back</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }, [formTemplate, borderRadius, headerImageUrl, countdownEnabled, promoIcon, promoText, formName, productName,
        isOrderForm, currencySymbol, productPrice, fields, submitButtonColor, submitButtonText, isMobile, previewStep,
        couponEnabled, codEnabled, ewalletEnabled, ewalletOptions, ewalletNumbers, requireProofUpload]);


    // ===== STEP INDICATORS =====
    const stepIndicatorContent = (
        <div className="flex items-center justify-center gap-1 mb-4">
            {STEPS.map((step, index) => (
                <React.Fragment key={step.id}>
                    <button
                        onClick={() => setCurrentStep(index)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${currentStep === index
                            ? 'bg-purple-500 text-white'
                            : currentStep > index
                                ? 'bg-green-500/20 text-green-400'
                                : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')
                            }`}
                    >
                        {currentStep > index ? <Check className="w-3 h-3" /> : <span>{step.icon}</span>}
                        <span className="hidden sm:inline">{step.label}</span>
                    </button>
                    {index < STEPS.length - 1 && <div className={`w-4 h-0.5 ${currentStep > index
                        ? 'bg-green-500'
                        : (isDark ? 'bg-slate-700' : 'bg-gray-200')
                        }`} />}
                </React.Fragment>
            ))}
        </div>
    );

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 0: return productStepContent;
            case 1: return fieldsStepContent;
            case 2: return paymentStepContent;
            case 3: return settingsStepContent;
            default: return productStepContent;
        }
    };

    // ===== MAIN RENDER =====
    return (
        <div className="w-full">
            {/* Template Mode Selector */}
            {savedTemplates.length > 0 && (
                <div className={`mb-4 p-4 border rounded-xl ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-3 mb-3">
                        <button
                            type="button"
                            onClick={() => {
                                setTemplateMode('new');
                                setSelectedTemplateId('');
                                setFormId(undefined);
                                setFormName('Order Form');
                            }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${templateMode === 'new'
                                ? 'bg-purple-500 text-white'
                                : (isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50')
                                }`}
                        >
                            <Plus className="w-4 h-4" />
                            Create New
                        </button>
                        <button
                            type="button"
                            onClick={() => setTemplateMode('template')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${templateMode === 'template'
                                ? 'bg-purple-500 text-white'
                                : (isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50')
                                }`}
                        >
                            <FileText className="w-4 h-4" />
                            Use Template
                        </button>
                    </div>

                    {templateMode === 'template' && (
                        <div ref={templateDropdownRef} className="relative">
                            <label className={labelClass}>
                                Select a saved form template
                            </label>
                            {loadingTemplates ? (
                                <div className={`text-center py-4 text-sm ${mutedText}`}>
                                    Loading templates...
                                </div>
                            ) : (
                                <>
                                    {/* Dropdown Trigger */}
                                    <button
                                        type="button"
                                        onClick={() => setTemplateDropdownOpen(!templateDropdownOpen)}
                                        className={`w-full px-4 py-3 rounded-xl border text-left flex items-center justify-between transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${isDark ? 'bg-slate-800 border-slate-600 hover:bg-slate-700' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        {selectedTemplateId ? (
                                            <div className="flex items-center gap-3">
                                                {(() => {
                                                    const selected = savedTemplates.find(t => t.id === selectedTemplateId);
                                                    return selected ? (
                                                        <>
                                                            <div className={`relative w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selected.is_order_form ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                                                {selected.is_order_form ? <ShoppingCart className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                                                {selected.page_id && (
                                                                    <img
                                                                        src={`https://graph.facebook.com/${selected.page_id}/picture?type=large`}
                                                                        alt="Page"
                                                                        className={`absolute -top-2 -left-2 w-5 h-5 rounded-full border-2 object-cover ${isDark ? 'border-slate-800' : 'border-white'}`}
                                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                    />
                                                                )}
                                                            </div>
                                                            <span className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                                {selected.name}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className={`${mutedText}`}>-- Select a template --</span>
                                                    );
                                                })()}
                                            </div>
                                        ) : (
                                            <span className={`${mutedText}`}>-- Select a template --</span>
                                        )}
                                        <ChevronDown className={`w-5 h-5 transition-transform ${templateDropdownOpen ? 'rotate-180' : ''} ${isDark ? 'text-slate-400' : 'text-gray-400'}`} />
                                    </button>

                                    {/* Dropdown Options */}
                                    {templateDropdownOpen && (
                                        <div className={`absolute z-50 w-full mt-2 rounded-xl border shadow-xl overflow-hidden ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'}`}>
                                            <div className="max-h-48 overflow-y-auto">
                                                {savedTemplates.map(template => (
                                                    <button
                                                        key={template.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedTemplateId(template.id);
                                                            loadTemplate(template.id);
                                                            setTemplateDropdownOpen(false);
                                                        }}
                                                        className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${selectedTemplateId === template.id
                                                            ? 'bg-purple-500/20'
                                                            : (isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50')
                                                            }`}
                                                    >
                                                        <div className={`relative w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${template.is_order_form ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                                            {template.is_order_form ? <ShoppingCart className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                                            {template.page_id && (
                                                                <img
                                                                    src={`https://graph.facebook.com/${template.page_id}/picture?type=large`}
                                                                    alt="Page"
                                                                    className={`absolute -top-2 -left-2 w-5 h-5 rounded-full border-2 object-cover ${isDark ? 'border-slate-800' : 'border-white'}`}
                                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className={`text-sm font-medium truncate ${selectedTemplateId === template.id
                                                                    ? 'text-purple-400'
                                                                    : (isDark ? 'text-white' : 'text-gray-900')
                                                                    }`}>
                                                                    {template.name}
                                                                </p>
                                                                <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${template.is_order_form
                                                                    ? 'bg-green-500/20 text-green-400'
                                                                    : 'bg-indigo-500/20 text-indigo-400'
                                                                    }`}>
                                                                    {template.is_order_form ? 'Multi Step' : 'Regular'}
                                                                </span>
                                                            </div>
                                                            {template.product_name && (
                                                                <p className={`text-xs truncate ${mutedText}`}>
                                                                    {template.product_name}{template.is_order_form && template.product_price ? ` • ${template.currency === 'PHP' ? '₱' : template.currency}${template.product_price}` : ''}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {selectedTemplateId === template.id && (
                                                            <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Step Indicator */}
            {stepIndicatorContent}

            {/* Desktop: 2-column layout */}
            {!isMobile ? (
                <div className="grid grid-cols-2 gap-4">
                    {/* Left: Configuration */}
                    <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            <span>{STEPS[currentStep].icon}</span>
                            {STEPS[currentStep].label}
                        </h3>
                        {renderCurrentStep()}

                        {/* Navigation */}
                        <div className={`flex justify-between mt-4 pt-3 border-t ${isDark ? 'border-slate-700/50' : 'border-gray-200'}`}>
                            <button onClick={prevStep} disabled={currentStep === 0} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm ${currentStep === 0 ? (isDark ? 'text-slate-600 cursor-not-allowed' : 'text-gray-300 cursor-not-allowed') : (isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-100')}`}>
                                <ArrowLeft className="w-4 h-4" /> Back
                            </button>
                            {currentStep < STEPS.length - 1 ? (
                                <button onClick={nextStep} className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm">
                                    Next <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <div className="text-xs text-green-400 flex items-center gap-1">
                                    <Check className="w-4 h-4" /> All steps complete
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Preview */}
                    <div className={`rounded-xl p-4 border ${isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-gray-50 border-gray-200 shadow-inner'}`}>
                        <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            <Eye className="w-4 h-4" /> Live Preview
                        </h3>
                        {formPreviewContent}
                    </div>
                </div>
            ) : (
                /* Mobile: Single column with preview toggle */
                <div className="space-y-3">
                    {/* Preview Toggle */}
                    <button onClick={() => setShowPreview(!showPreview)} className={`w-full flex items-center justify-center gap-2 py-2 border rounded-lg text-sm ${isDark ? 'bg-slate-800/50 border-slate-700/50 text-slate-300' : 'bg-white border-gray-200 text-gray-700'}`}>
                        {showPreview ? <><EyeOff className="w-4 h-4" /> Hide Preview</> : <><Eye className="w-4 h-4" /> Show Preview</>}
                    </button>

                    {showPreview && (
                        <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50">
                            {formPreviewContent}
                        </div>
                    )}

                    {/* Configuration */}
                    <div className={`rounded-xl p-3 border ${isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-white border-gray-200'}`}>
                        <h3 className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            <span>{STEPS[currentStep].icon}</span>
                            {STEPS[currentStep].label}
                        </h3>
                        {renderCurrentStep()}
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between gap-2">
                        <button onClick={prevStep} disabled={currentStep === 0} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm ${currentStep === 0 ? (isDark ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-gray-100 text-gray-300 cursor-not-allowed') : (isDark ? 'bg-slate-700 text-white' : 'bg-white border border-gray-200 text-gray-700')}`}>
                            <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                        {currentStep < STEPS.length - 1 ? (
                            <button onClick={nextStep} className="flex-1 flex items-center justify-center gap-1 py-2 bg-purple-500 text-white rounded-lg text-sm">
                                Next <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <div className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm">
                                <Check className="w-4 h-4" /> Done
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormNodeForm;
