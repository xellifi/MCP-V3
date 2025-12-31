import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Type, Mail, Phone, Hash, AlignLeft, ChevronDown, CircleDot, CheckSquare, Timer, DollarSign, ShoppingCart, CreditCard, Wallet, Upload } from 'lucide-react';
import { FormField } from '../types';

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
    { value: 'textarea', label: 'Long Text', icon: AlignLeft },
    { value: 'select', label: 'Dropdown', icon: ChevronDown },
    { value: 'radio', label: 'Radio', icon: CircleDot },
    { value: 'checkbox', label: 'Checkbox', icon: CheckSquare },
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

const FormNodeForm: React.FC<FormNodeFormProps> = ({ workspaceId, initialConfig, onChange }) => {
    const [formName, setFormName] = useState(initialConfig?.formName || 'Order Form');
    const [headerImageUrl, setHeaderImageUrl] = useState(initialConfig?.headerImageUrl || '');
    const [submitButtonText, setSubmitButtonText] = useState(initialConfig?.submitButtonText || 'Place Order');
    const [submitButtonColor, setSubmitButtonColor] = useState(initialConfig?.submitButtonColor || '#6366f1');
    const [borderRadius, setBorderRadius] = useState<'normal' | 'rounded' | 'round' | 'full'>(initialConfig?.borderRadius || 'round');
    const [formTemplate, setFormTemplate] = useState<'modern' | 'minimal'>(initialConfig?.formTemplate || 'modern');
    const [successMessage, setSuccessMessage] = useState(initialConfig?.successMessage || 'Order placed successfully! We will contact you soon.');
    const [fields, setFields] = useState<FormField[]>(initialConfig?.fields || [
        { id: 'name', type: 'text', label: 'Full Name', placeholder: 'Enter your name', required: true },
        { id: 'address', type: 'textarea', label: 'Delivery Address', placeholder: 'Enter complete address', required: true },
        { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: 'Enter phone number', required: true },
    ]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'fields' | 'product' | 'payment' | 'settings'>('product');

    // Timer settings
    const [countdownEnabled, setCountdownEnabled] = useState(initialConfig?.countdownEnabled || false);
    const [countdownMinutes, setCountdownMinutes] = useState(initialConfig?.countdownMinutes || 10);
    const [countdownBlink, setCountdownBlink] = useState(initialConfig?.countdownBlink ?? true);

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

    useEffect(() => {
        onChange({
            formName, headerImageUrl, submitButtonText, submitButtonColor, borderRadius, successMessage, fields,
            countdownEnabled, countdownMinutes, countdownBlink, formTemplate,
            isOrderForm, productName, productPrice, currency, maxQuantity, couponEnabled, couponCode, couponDiscount,
            codEnabled, ewalletEnabled, ewalletOptions, ewalletNumbers, requireProofUpload,
        });
    }, [formName, headerImageUrl, submitButtonText, submitButtonColor, borderRadius, successMessage, fields,
        countdownEnabled, countdownMinutes, countdownBlink, formTemplate, isOrderForm, productName, productPrice, currency, maxQuantity,
        couponEnabled, couponCode, couponDiscount, codEnabled, ewalletEnabled, ewalletOptions, ewalletNumbers, requireProofUpload]);

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

    return (
        <div className="space-y-4">
            {/* Form Name */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Form Name</label>
                <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-slate-800/60 rounded-xl overflow-x-auto">
                {[
                    { id: 'product', label: 'Product', icon: ShoppingCart },
                    { id: 'fields', label: 'Fields', count: fields.length },
                    { id: 'payment', label: 'Payment', icon: CreditCard },
                    { id: 'settings', label: 'Settings' },
                ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-purple-500 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                }`}
                        >
                            {Icon && <Icon className="w-3.5 h-3.5" />}
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${activeTab === tab.id ? 'bg-purple-600' : 'bg-slate-700'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Product Tab */}
            {activeTab === 'product' && (
                <div className="space-y-4">
                    {/* Order Form Toggle */}
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-purple-400" />
                            <span className="text-sm font-medium text-white">Multi-Step Order Form</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={isOrderForm} onChange={(e) => setIsOrderForm(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                        </label>
                    </div>

                    {isOrderForm && (
                        <>
                            {/* Product Name */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Product Name</label>
                                <input
                                    type="text"
                                    value={productName}
                                    onChange={(e) => setProductName(e.target.value)}
                                    placeholder="Enter product name..."
                                    className="w-full px-4 py-2 bg-slate-800/60 border border-slate-600/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                />
                            </div>

                            {/* Header Image */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Product Image</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={headerImageUrl}
                                        onChange={(e) => setHeaderImageUrl(e.target.value)}
                                        placeholder="https://... or upload"
                                        className="flex-1 px-4 py-2 bg-slate-800/60 border border-slate-600/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    />
                                    <label className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-xl cursor-pointer flex items-center gap-1.5 transition">
                                        <Upload className="w-4 h-4 text-purple-400" />
                                        <span className="text-purple-300 text-sm">Upload</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    try {
                                                        // Import supabase dynamically
                                                        const { supabase } = await import('../lib/supabase');
                                                        const fileName = `product_${Date.now()}_${file.name}`;
                                                        const { data, error } = await supabase.storage
                                                            .from('product-images')
                                                            .upload(fileName, file);
                                                        if (error) {
                                                            console.error('Upload error:', error);
                                                            alert('Failed to upload. Make sure the storage bucket exists.');
                                                        } else if (data) {
                                                            const { data: urlData } = supabase.storage
                                                                .from('product-images')
                                                                .getPublicUrl(fileName);
                                                            if (urlData?.publicUrl) {
                                                                setHeaderImageUrl(urlData.publicUrl);
                                                            }
                                                        }
                                                    } catch (err) {
                                                        console.error('Upload failed:', err);
                                                        alert('Upload failed. Please try again.');
                                                    }
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                                {headerImageUrl && (
                                    <div className="mt-2 relative">
                                        <img src={headerImageUrl} alt="" className="w-full h-28 object-cover rounded-xl border border-slate-700" />
                                        <button
                                            onClick={() => setHeaderImageUrl('')}
                                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs"
                                        >×</button>
                                    </div>
                                )}
                            </div>

                            {/* Price & Currency */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Price</label>
                                    <div className="flex">
                                        <span className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-l-xl text-white text-sm">{currencySymbol}</span>
                                        <input
                                            type="number"
                                            value={productPrice}
                                            onChange={(e) => setProductPrice(parseFloat(e.target.value) || 0)}
                                            className="flex-1 px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-r-xl text-white text-sm focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Currency</label>
                                    <select
                                        value={currency}
                                        onChange={(e) => setCurrency(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-xl text-white text-sm focus:outline-none cursor-pointer"
                                    >
                                        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Max Quantity */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Max Quantity</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={maxQuantity}
                                    onChange={(e) => setMaxQuantity(parseInt(e.target.value) || 1)}
                                    className="w-full px-4 py-2 bg-slate-800/60 border border-slate-600/50 rounded-xl text-white text-sm focus:outline-none"
                                />
                            </div>

                            {/* Coupon */}
                            <div className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-white">Enable Coupon Code</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={couponEnabled} onChange={(e) => setCouponEnabled(e.target.checked)} className="sr-only peer" />
                                        <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                                    </label>
                                </div>
                                {couponEnabled && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                            placeholder="CODE"
                                            className="px-3 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none uppercase"
                                        />
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                value={couponDiscount}
                                                onChange={(e) => setCouponDiscount(parseInt(e.target.value) || 0)}
                                                className="w-16 px-2 py-2 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none text-center"
                                            />
                                            <span className="text-slate-400 text-sm">% off</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Fields Tab */}
            {activeTab === 'fields' && (
                <div className="space-y-3">
                    <p className="text-xs text-slate-500">Buyer information fields (Step 2)</p>
                    <div className="grid grid-cols-4 gap-2">
                        {FIELD_TYPES.map((type) => {
                            const Icon = type.icon;
                            return (
                                <button
                                    key={type.value}
                                    onClick={() => addField(type.value)}
                                    className="flex flex-col items-center gap-1 p-2 bg-slate-800/40 hover:bg-purple-500/20 border border-slate-600/30 hover:border-purple-500/50 rounded-xl transition-all group"
                                >
                                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-purple-400" />
                                    <span className="text-[9px] text-slate-500 group-hover:text-purple-300">{type.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                        {fields.map((field, index) => {
                            const Icon = getFieldIcon(field.type);
                            return (
                                <div
                                    key={field.id}
                                    draggable
                                    onDragStart={() => handleDragStart(index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    className={`bg-slate-800/40 border border-slate-600/30 rounded-xl p-2.5 transition-all ${draggedIndex === index ? 'opacity-50' : ''}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <GripVertical className="w-3.5 h-3.5 text-slate-600 cursor-grab" />
                                        <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                            <Icon className="w-3 h-3 text-purple-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={field.label}
                                            onChange={(e) => updateField(index, { label: e.target.value })}
                                            className="flex-1 px-2 py-1 bg-transparent text-sm text-white focus:outline-none"
                                        />
                                        <label className="flex items-center gap-1 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={field.required}
                                                onChange={(e) => updateField(index, { required: e.target.checked })}
                                                className="w-3 h-3 rounded text-purple-500"
                                            />
                                            <span className="text-[9px] text-slate-500">Req</span>
                                        </label>
                                        <button onClick={() => removeField(index)} className="p-1 text-slate-500 hover:text-red-400">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Payment Tab */}
            {activeTab === 'payment' && (
                <div className="space-y-4">
                    <p className="text-xs text-slate-500">Payment options (Step 3)</p>

                    {/* COD */}
                    <div className="flex items-center justify-between p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">💵</span>
                            <span className="text-sm font-medium text-white">Cash on Delivery</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={codEnabled} onChange={(e) => setCodEnabled(e.target.checked)} className="sr-only peer" />
                            <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                    </div>

                    {/* E-Wallet */}
                    <div className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-blue-400" />
                                <span className="text-sm font-medium text-white">E-Wallet</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={ewalletEnabled} onChange={(e) => setEwalletEnabled(e.target.checked)} className="sr-only peer" />
                                <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                        </div>
                        {ewalletEnabled && (
                            <div className="space-y-2">
                                {ewalletOptions.map((wallet, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={wallet}
                                            onChange={(e) => {
                                                const newOptions = [...ewalletOptions];
                                                newOptions[i] = e.target.value;
                                                setEwalletOptions(newOptions);
                                            }}
                                            className="flex-1 px-3 py-1.5 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white text-sm"
                                            placeholder="Wallet name"
                                        />
                                        <input
                                            type="text"
                                            value={ewalletNumbers[wallet] || ''}
                                            onChange={(e) => setEwalletNumbers({ ...ewalletNumbers, [wallet]: e.target.value })}
                                            className="flex-1 px-3 py-1.5 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white text-sm"
                                            placeholder="Account number"
                                        />
                                        <button onClick={() => setEwalletOptions(ewalletOptions.filter((_, idx) => idx !== i))} className="text-red-400">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => setEwalletOptions([...ewalletOptions, ''])}
                                    className="w-full py-2 text-xs text-purple-400 border border-dashed border-slate-600 rounded-lg hover:bg-purple-500/10"
                                >
                                    + Add E-Wallet Option
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Proof Upload */}
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl">
                        <div className="flex items-center gap-2">
                            <Upload className="w-5 h-5 text-amber-400" />
                            <div>
                                <span className="text-sm font-medium text-white block">Require Payment Proof</span>
                                <span className="text-[10px] text-slate-400">Screenshot/photo of payment</span>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={requireProofUpload} onChange={(e) => setRequireProofUpload(e.target.checked)} className="sr-only peer" />
                            <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                        </label>
                    </div>
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="space-y-4">
                    {/* Timer */}
                    <div className="p-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Timer className="w-5 h-5 text-orange-400" />
                                <span className="text-sm font-medium text-white">Countdown Timer</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={countdownEnabled} onChange={(e) => setCountdownEnabled(e.target.checked)} className="sr-only peer" />
                                <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                            </label>
                        </div>
                        {countdownEnabled && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <input type="number" min="1" max="60" value={countdownMinutes} onChange={(e) => setCountdownMinutes(parseInt(e.target.value) || 1)}
                                        className="w-16 px-2 py-1.5 bg-slate-800/80 border border-orange-500/30 rounded-lg text-white text-center text-sm" />
                                    <span className="text-xs text-slate-400">minutes</span>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={countdownBlink} onChange={(e) => setCountdownBlink(e.target.checked)}
                                        className="w-4 h-4 rounded text-orange-500 bg-slate-700 border-slate-600" />
                                    <span className="text-xs text-slate-300">Blink timer to catch attention</span>
                                </label>
                            </div>
                        )}
                    </div>

                    {/* Template Style */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Form Template</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setFormTemplate('modern')}
                                className={`p-3 rounded-xl border-2 text-center transition ${formTemplate === 'modern' ? 'border-purple-500 bg-purple-500/10' : 'border-slate-600/50 hover:border-slate-500'}`}>
                                <span className="text-lg">✨</span>
                                <p className="text-white text-sm font-medium">Modern</p>
                                <p className="text-slate-500 text-[10px]">Dark, animated</p>
                            </button>
                            <button onClick={() => setFormTemplate('minimal')}
                                className={`p-3 rounded-xl border-2 text-center transition ${formTemplate === 'minimal' ? 'border-purple-500 bg-purple-500/10' : 'border-slate-600/50 hover:border-slate-500'}`}>
                                <span className="text-lg">📝</span>
                                <p className="text-white text-sm font-medium">Minimal</p>
                                <p className="text-slate-500 text-[10px]">Light, simple</p>
                            </button>
                        </div>
                    </div>

                    {/* Button Style */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Button Text</label>
                            <input type="text" value={submitButtonText} onChange={(e) => setSubmitButtonText(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-xl text-white text-sm focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Corner Style</label>
                            <select value={borderRadius} onChange={(e) => setBorderRadius(e.target.value as any)}
                                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-xl text-white text-sm cursor-pointer">
                                <option value="normal">Normal</option>
                                <option value="rounded">Rounded</option>
                                <option value="round">Round</option>
                                <option value="full">Pill</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Button Color</label>
                        <div className="grid grid-cols-8 gap-1.5">
                            {COLOR_PRESETS.map((color) => (
                                <button key={color} onClick={() => setSubmitButtonColor(color)}
                                    className={`w-full aspect-square rounded-lg transition-transform hover:scale-110 ${submitButtonColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''}`}
                                    style={{ backgroundColor: color }} />
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Success Message</label>
                        <textarea value={successMessage} onChange={(e) => setSuccessMessage(e.target.value)} rows={2}
                            className="w-full px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-xl text-white text-sm resize-none focus:outline-none" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormNodeForm;
