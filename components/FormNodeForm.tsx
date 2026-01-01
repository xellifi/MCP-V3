import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Type, Mail, Phone, Hash, AlignLeft, ChevronDown, CircleDot, CheckSquare, Timer, DollarSign, ShoppingCart, CreditCard, Wallet, Upload, X } from 'lucide-react';
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

    // Promo Banner settings
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

    useEffect(() => {
        console.log('[FormNodeForm] onChange called with promoText:', promoText, 'promoIcon:', promoIcon);
        onChange({
            formName, headerImageUrl, submitButtonText, submitButtonColor, borderRadius, successMessage, fields,
            countdownEnabled, countdownMinutes, countdownBlink, promoText, promoIcon, formTemplate,
            isOrderForm, productName, productPrice, currency, maxQuantity, couponEnabled, couponCode, couponDiscount,
            codEnabled, ewalletEnabled, ewalletOptions, ewalletNumbers, requireProofUpload,
        });
    }, [formName, headerImageUrl, submitButtonText, submitButtonColor, borderRadius, successMessage, fields,
        countdownEnabled, countdownMinutes, countdownBlink, promoText, promoIcon, formTemplate, isOrderForm, productName, productPrice, currency, maxQuantity,
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

    // Shared input class for consistency
    const inputClass = "w-full px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50";
    const labelClass = "block text-xs font-medium text-slate-400 mb-1.5";

    return (
        <div className="space-y-3">
            {/* Form Name - Compact */}
            <div>
                <label className={labelClass}>Form Name</label>
                <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className={inputClass}
                    placeholder="Enter form name..."
                />
            </div>

            {/* Tabs - Mobile Optimized */}
            <div className="flex gap-1 p-1 bg-slate-800/60 rounded-xl">
                {[
                    { id: 'product', label: '📦', fullLabel: 'Product' },
                    { id: 'fields', label: '📝', fullLabel: `Fields (${fields.length})` },
                    { id: 'payment', label: '💳', fullLabel: 'Payment' },
                    { id: 'settings', label: '⚙️', fullLabel: 'Settings' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 py-2 px-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${activeTab === tab.id
                            ? 'bg-purple-500 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                            }`}
                    >
                        <span className="text-sm">{tab.label}</span>
                        <span className="hidden sm:inline truncate">{tab.fullLabel.split(' ')[0]}</span>
                    </button>
                ))}
            </div>

            {/* Product Tab */}
            {activeTab === 'product' && (
                <div className="space-y-3">
                    {/* Order Form Toggle */}
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl">
                        <div className="flex items-center gap-2 min-w-0">
                            <ShoppingCart className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            <span className="text-xs sm:text-sm font-medium text-white truncate">Multi-Step Order</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                            <input type="checkbox" checked={isOrderForm} onChange={(e) => setIsOrderForm(e.target.checked)} className="sr-only peer" />
                            <div className="w-10 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                        </label>
                    </div>

                    {/* Header Image - Always Available */}
                    <div>
                        <label className={labelClass}>Form Header Image</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={headerImageUrl}
                                onChange={(e) => setHeaderImageUrl(e.target.value)}
                                placeholder="Image URL..."
                                className={`${inputClass} flex-1 min-w-0`}
                            />
                            <label className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-xl cursor-pointer flex items-center gap-1 transition flex-shrink-0">
                                <Upload className="w-4 h-4 text-purple-400" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => setHeaderImageUrl(reader.result as string);
                                            reader.readAsDataURL(file);
                                        }
                                        e.target.value = '';
                                    }}
                                />
                            </label>
                        </div>
                        {headerImageUrl && (
                            <div className="mt-2 relative">
                                <img src={headerImageUrl} alt="" className="w-1/2 h-auto object-contain rounded-xl border border-slate-700 bg-slate-950/50" />
                                <button
                                    type="button"
                                    onClick={() => setHeaderImageUrl('')}
                                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white"
                                ><X className="w-3 h-3" /></button>
                            </div>
                        )}
                        <p className="text-[9px] text-slate-500 mt-1">Shows at the top of your form</p>
                    </div>

                    {isOrderForm && (
                        <>
                            {/* Product Name */}
                            <div>
                                <label className={labelClass}>Product Name</label>
                                <input
                                    type="text"
                                    value={productName}
                                    onChange={(e) => setProductName(e.target.value)}
                                    placeholder="Enter product name..."
                                    className={inputClass}
                                />
                            </div>

                            {/* Price & Currency - Stack on mobile */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Price</label>
                                    <div className="flex">
                                        <span className="px-2.5 py-2 bg-slate-700 border border-slate-600 rounded-l-xl text-white text-sm flex-shrink-0">{currencySymbol}</span>
                                        <input
                                            type="number"
                                            value={productPrice}
                                            onChange={(e) => setProductPrice(parseFloat(e.target.value) || 0)}
                                            className="flex-1 min-w-0 px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-r-xl text-white text-sm focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Currency</label>
                                    <select
                                        value={currency}
                                        onChange={(e) => setCurrency(e.target.value)}
                                        className={inputClass}
                                    >
                                        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Max Quantity */}
                            <div>
                                <label className={labelClass}>Max Quantity</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={maxQuantity}
                                    onChange={(e) => setMaxQuantity(parseInt(e.target.value) || 1)}
                                    className={inputClass}
                                />
                            </div>

                            {/* Coupon - Compact */}
                            <div className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-white">Coupon Code</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={couponEnabled} onChange={(e) => setCouponEnabled(e.target.checked)} className="sr-only peer" />
                                        <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                                    </label>
                                </div>
                                {couponEnabled && (
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <input
                                            type="text"
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                            placeholder="CODE"
                                            className="flex-1 px-3 py-1.5 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white text-xs uppercase"
                                        />
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                value={couponDiscount}
                                                onChange={(e) => setCouponDiscount(parseInt(e.target.value) || 0)}
                                                className="w-14 px-2 py-1.5 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white text-xs text-center"
                                            />
                                            <span className="text-slate-400 text-xs">% off</span>
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
                    <p className="text-[10px] text-slate-500">Buyer info fields (Step 2)</p>

                    {/* Field type buttons - 4 cols on mobile, wrap nicely */}
                    <div className="grid grid-cols-4 gap-1.5">
                        {FIELD_TYPES.map((type) => {
                            const Icon = type.icon;
                            return (
                                <button
                                    key={type.value}
                                    onClick={() => addField(type.value)}
                                    className="flex flex-col items-center gap-0.5 p-1.5 bg-slate-800/40 hover:bg-purple-500/20 border border-slate-600/30 hover:border-purple-500/50 rounded-lg transition-all group"
                                >
                                    <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-400" />
                                    <span className="text-[8px] text-slate-500 group-hover:text-purple-300 truncate w-full text-center">{type.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Field list */}
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                        {fields.map((field, index) => {
                            const Icon = getFieldIcon(field.type);
                            return (
                                <div
                                    key={field.id}
                                    draggable
                                    onDragStart={() => handleDragStart(index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    className={`bg-slate-800/40 border border-slate-600/30 rounded-lg p-2 transition-all ${draggedIndex === index ? 'opacity-50' : ''}`}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <GripVertical className="w-3 h-3 text-slate-600 cursor-grab flex-shrink-0" />
                                        <div className="w-5 h-5 rounded bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                            <Icon className="w-2.5 h-2.5 text-purple-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={field.label}
                                            onChange={(e) => updateField(index, { label: e.target.value })}
                                            className="flex-1 min-w-0 px-1.5 py-0.5 bg-transparent text-xs text-white focus:outline-none truncate"
                                        />
                                        <label className="flex items-center gap-0.5 cursor-pointer flex-shrink-0">
                                            <input
                                                type="checkbox"
                                                checked={field.required}
                                                onChange={(e) => updateField(index, { required: e.target.checked })}
                                                className="w-3 h-3 rounded text-purple-500"
                                            />
                                            <span className="text-[8px] text-slate-500 hidden sm:inline">Req</span>
                                        </label>
                                        <button onClick={() => removeField(index)} className="p-0.5 text-slate-500 hover:text-red-400 flex-shrink-0">
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
                <div className="space-y-3">
                    <p className="text-[10px] text-slate-500">Payment options (Step 3)</p>

                    {/* COD */}
                    <div className="flex items-center justify-between p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl">
                        <div className="flex items-center gap-2">
                            <span className="text-base">💵</span>
                            <span className="text-xs sm:text-sm font-medium text-white">Cash on Delivery</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={codEnabled} onChange={(e) => setCodEnabled(e.target.checked)} className="sr-only peer" />
                            <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                    </div>

                    {/* E-Wallet */}
                    <div className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Wallet className="w-4 h-4 text-blue-400" />
                                <span className="text-xs sm:text-sm font-medium text-white">E-Wallet</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={ewalletEnabled} onChange={(e) => setEwalletEnabled(e.target.checked)} className="sr-only peer" />
                                <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                        </div>
                        {ewalletEnabled && (
                            <div className="space-y-2">
                                {ewalletOptions.map((wallet, i) => (
                                    <div key={i} className="space-y-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                type="text"
                                                value={wallet}
                                                onChange={(e) => {
                                                    const newOptions = [...ewalletOptions];
                                                    newOptions[i] = e.target.value;
                                                    setEwalletOptions(newOptions);
                                                }}
                                                className="flex-1 min-w-0 px-2 py-1.5 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white text-xs"
                                                placeholder="Wallet name"
                                            />
                                            <button onClick={() => setEwalletOptions(ewalletOptions.filter((_, idx) => idx !== i))} className="text-red-400 p-1 flex-shrink-0">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={ewalletNumbers[wallet] || ''}
                                            onChange={(e) => setEwalletNumbers({ ...ewalletNumbers, [wallet]: e.target.value })}
                                            className="w-full px-2 py-1.5 bg-slate-900/50 border border-slate-600/50 rounded-lg text-white text-xs"
                                            placeholder="Account number"
                                        />
                                    </div>
                                ))}
                                <button
                                    onClick={() => setEwalletOptions([...ewalletOptions, ''])}
                                    className="w-full py-1.5 text-[10px] text-purple-400 border border-dashed border-slate-600 rounded-lg hover:bg-purple-500/10"
                                >
                                    + Add E-Wallet
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Proof Upload */}
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl">
                        <div className="flex items-center gap-2 min-w-0">
                            <Upload className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            <div className="min-w-0">
                                <span className="text-xs font-medium text-white block truncate">Payment Proof</span>
                                <span className="text-[9px] text-slate-400 hidden sm:block">Screenshot upload</span>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                            <input type="checkbox" checked={requireProofUpload} onChange={(e) => setRequireProofUpload(e.target.checked)} className="sr-only peer" />
                            <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                        </label>
                    </div>
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="space-y-3">
                    {/* Timer */}
                    <div className="p-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Timer className="w-4 h-4 text-orange-400" />
                                <span className="text-xs font-medium text-white">Countdown Timer</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={countdownEnabled} onChange={(e) => setCountdownEnabled(e.target.checked)} className="sr-only peer" />
                                <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                            </label>
                        </div>
                        {countdownEnabled && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <input type="number" min="1" max="60" value={countdownMinutes} onChange={(e) => setCountdownMinutes(parseInt(e.target.value) || 1)}
                                        className="w-14 px-2 py-1 bg-slate-800/80 border border-orange-500/30 rounded-lg text-white text-center text-xs" />
                                    <span className="text-[10px] text-slate-400">minutes</span>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={countdownBlink} onChange={(e) => setCountdownBlink(e.target.checked)}
                                        className="w-3.5 h-3.5 rounded text-orange-500 bg-slate-700 border-slate-600" />
                                    <span className="text-[10px] text-slate-300">Blink timer</span>
                                </label>

                                <div className="pt-2 border-t border-slate-700/50">
                                    <p className="text-[10px] text-slate-500 mb-1.5">Promo Banner Settings</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[9px] text-slate-400 block mb-0.5">Icon</label>
                                            <input
                                                type="text"
                                                value={promoIcon}
                                                onChange={(e) => setPromoIcon(e.target.value)}
                                                className="w-full px-2 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-xs text-center"
                                                placeholder="🔥"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-slate-400 block mb-0.5">Text</label>
                                            <input
                                                type="text"
                                                value={promoText}
                                                onChange={(e) => setPromoText(e.target.value)}
                                                className="w-full px-2 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-xs"
                                                placeholder="Promo Only!"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Template Style */}
                    <div>
                        <label className={labelClass}>Form Template</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setFormTemplate('modern')}
                                className={`p-2.5 rounded-xl border-2 text-center transition ${formTemplate === 'modern' ? 'border-purple-500 bg-purple-500/10' : 'border-slate-600/50 hover:border-slate-500'}`}>
                                <span className="text-base">✨</span>
                                <p className="text-white text-xs font-medium">Modern</p>
                                <p className="text-slate-500 text-[9px]">Dark theme</p>
                            </button>
                            <button onClick={() => setFormTemplate('minimal')}
                                className={`p-2.5 rounded-xl border-2 text-center transition ${formTemplate === 'minimal' ? 'border-purple-500 bg-purple-500/10' : 'border-slate-600/50 hover:border-slate-500'}`}>
                                <span className="text-base">📝</span>
                                <p className="text-white text-xs font-medium">Minimal</p>
                                <p className="text-slate-500 text-[9px]">Light theme</p>
                            </button>
                        </div>
                    </div>

                    {/* Button Style - Stack on mobile */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                            <label className={labelClass}>Button Text</label>
                            <input type="text" value={submitButtonText} onChange={(e) => setSubmitButtonText(e.target.value)}
                                className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Corner Style</label>
                            <select value={borderRadius} onChange={(e) => setBorderRadius(e.target.value as any)}
                                className={inputClass}>
                                <option value="normal">Normal</option>
                                <option value="rounded">Rounded</option>
                                <option value="round">Round</option>
                                <option value="full">Pill</option>
                            </select>
                        </div>
                    </div>

                    {/* Button Color - More compact grid */}
                    <div>
                        <label className={labelClass}>Button Color</label>
                        <div className="grid grid-cols-8 gap-1">
                            {COLOR_PRESETS.map((color) => (
                                <button key={color} onClick={() => setSubmitButtonColor(color)}
                                    className={`w-full aspect-square rounded-lg transition-transform hover:scale-110 ${submitButtonColor === color ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''}`}
                                    style={{ backgroundColor: color }} />
                            ))}
                        </div>
                    </div>

                    {/* Success Message */}
                    <div>
                        <label className={labelClass}>Success Message</label>
                        <textarea value={successMessage} onChange={(e) => setSuccessMessage(e.target.value)} rows={2}
                            className={`${inputClass} resize-none`} />
                    </div>

                    {/* Info: Google Sheets moved to standalone node */}
                    <div className="border-t border-slate-700 pt-3">
                        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-5 h-5 bg-green-500/20 rounded flex items-center justify-center">
                                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none">
                                        <rect x="3" y="3" width="18" height="18" rx="2" className="fill-green-500" />
                                        <rect x="6" y="7" width="12" height="2" rx="0.5" className="fill-white" />
                                        <rect x="6" y="11" width="12" height="2" rx="0.5" className="fill-white" />
                                    </svg>
                                </div>
                                <span className="text-blue-400 font-medium text-xs">Google Sheets Sync</span>
                            </div>
                            <p className="text-slate-400 text-[10px] leading-relaxed">
                                To sync form data to Google Sheets, drag a <span className="text-green-400 font-medium">Google Sheets</span> node from the sidebar and connect it to this Form node.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormNodeForm;
