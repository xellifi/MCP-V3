import React, { useState, useMemo, useEffect } from 'react';
import {
    MapPin, CreditCard, Globe, Shield, Clock, Check, Plus, Trash2, GripVertical
} from 'lucide-react';
import CollapsibleTips from './CollapsibleTips';

interface CheckoutFormNodeFormProps {
    workspaceId: string;
    initialConfig?: {
        // Facebook native form settings
        countries?: string[];
        privacyUrl?: string;
        expiresInDays?: number;
        // Payment options (sent after shipping form)
        paymentMethods?: string[];
        // Thank you message after form completion
        thankYouMessage?: string;
    };
    onChange: (config: any) => void;
}

const DEFAULT_PAYMENT_METHODS = ['Cash on Delivery', 'GCash', 'Bank Transfer'];

const COUNTRY_OPTIONS = [
    { code: 'PH', name: 'Philippines' },
    { code: 'US', name: 'United States' },
    { code: 'CA', name: 'Canada' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'AU', name: 'Australia' },
    { code: 'SG', name: 'Singapore' },
    { code: 'MY', name: 'Malaysia' },
    { code: 'ID', name: 'Indonesia' },
    { code: 'TH', name: 'Thailand' },
    { code: 'VN', name: 'Vietnam' },
    { code: 'JP', name: 'Japan' },
    { code: 'KR', name: 'South Korea' }
];

const CheckoutFormNodeForm: React.FC<CheckoutFormNodeFormProps> = ({
    workspaceId,
    initialConfig,
    onChange
}) => {
    // Facebook form settings
    const [countries, setCountries] = useState<string[]>(initialConfig?.countries || ['PH']);
    const [privacyUrl, setPrivacyUrl] = useState(initialConfig?.privacyUrl || '');
    const [expiresInDays, setExpiresInDays] = useState(initialConfig?.expiresInDays || 7);

    // Payment methods (shown after form submission)
    const [paymentMethods, setPaymentMethods] = useState<string[]>(
        initialConfig?.paymentMethods || DEFAULT_PAYMENT_METHODS
    );
    const [newPaymentMethod, setNewPaymentMethod] = useState('');

    // Thank you message
    const [thankYouMessage, setThankYouMessage] = useState(
        initialConfig?.thankYouMessage || '✅ Thank you! Your shipping information has been saved. Processing your order...'
    );

    // Active section
    const [activeSection, setActiveSection] = useState<string>('shipping');

    // Notify parent of changes
    const notifyChange = (updates: Partial<typeof initialConfig> = {}) => {
        onChange({
            countries,
            privacyUrl,
            expiresInDays,
            paymentMethods,
            thankYouMessage,
            ...updates
        });
    };

    // Toggle country
    const toggleCountry = (code: string) => {
        let updated: string[];
        if (countries.includes(code)) {
            updated = countries.filter(c => c !== code);
            if (updated.length === 0) updated = ['PH']; // Must have at least one
        } else {
            updated = [...countries, code];
        }
        setCountries(updated);
        notifyChange({ countries: updated });
    };

    // Add payment method
    const addPaymentMethod = () => {
        if (newPaymentMethod.trim() && !paymentMethods.includes(newPaymentMethod.trim())) {
            const updated = [...paymentMethods, newPaymentMethod.trim()];
            setPaymentMethods(updated);
            setNewPaymentMethod('');
            notifyChange({ paymentMethods: updated });
        }
    };

    // Remove payment method
    const removePaymentMethod = (index: number) => {
        const updated = paymentMethods.filter((_, i) => i !== index);
        setPaymentMethods(updated);
        notifyChange({ paymentMethods: updated });
    };

    // Section toggle
    const toggleSection = (section: string) => {
        setActiveSection(activeSection === section ? '' : section);
    };

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

    // Configuration Form JSX
    const configFormJSX = useMemo(() => (
        <div className="space-y-3">
            {/* Info Banner */}
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                        <MapPin className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-indigo-300">Facebook Native Shipping Form</h3>
                        <p className="text-xs text-slate-400 mt-1">
                            This node uses Facebook's built-in shipping address form. Customers fill a professional form within Messenger that collects their name, address, and phone number.
                        </p>
                    </div>
                </div>
            </div>

            {/* Shipping Form Settings */}
            <div className="space-y-3">
                <SectionHeader id="shipping" icon={Globe} title="Shipping Form Settings" color="emerald" />
                {activeSection === 'shipping' && (
                    <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/10 animate-fade-in">
                        {/* Countries */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Allowed Countries
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {COUNTRY_OPTIONS.map(country => (
                                    <button
                                        key={country.code}
                                        onClick={() => toggleCountry(country.code)}
                                        className={`px-3 py-2 rounded-lg border text-sm transition-all ${countries.includes(country.code)
                                                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                                                : 'bg-black/30 border-white/10 text-slate-400 hover:bg-white/5'
                                            }`}
                                    >
                                        {countries.includes(country.code) && <Check className="w-3 h-3 inline mr-1" />}
                                        {country.name}
                                    </button>
                                ))}
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                                Select countries where you can ship orders
                            </p>
                        </div>

                        {/* Expires in Days */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                <Clock className="w-4 h-4 inline mr-1" />
                                Form Expires In (Days)
                            </label>
                            <select
                                value={expiresInDays}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setExpiresInDays(val);
                                    notifyChange({ expiresInDays: val });
                                }}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none"
                            >
                                {[1, 2, 3, 4, 5, 6, 7].map(d => (
                                    <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-slate-500">
                                How long until the form request expires
                            </p>
                        </div>

                        {/* Privacy Policy URL */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                <Shield className="w-4 h-4 inline mr-1" />
                                Privacy Policy URL (Optional)
                            </label>
                            <input
                                type="url"
                                value={privacyUrl}
                                onChange={(e) => { setPrivacyUrl(e.target.value); notifyChange({ privacyUrl: e.target.value }); }}
                                placeholder="https://yoursite.com/privacy"
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all placeholder-slate-500"
                            />
                            <p className="mt-1 text-xs text-slate-500">
                                Link to your privacy policy (uses Facebook's if empty)
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Payment Methods Section */}
            <div className="space-y-3">
                <SectionHeader id="payment" icon={CreditCard} title="Payment Methods" color="purple" />
                {activeSection === 'payment' && (
                    <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/10 animate-fade-in">
                        <p className="text-xs text-slate-400">
                            After the shipping form is submitted, these payment options will be shown as quick reply buttons.
                        </p>

                        {/* Payment methods list */}
                        <div className="space-y-2">
                            {paymentMethods.map((method, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-2 p-3 bg-black/30 rounded-xl border border-white/10"
                                >
                                    <GripVertical className="w-4 h-4 text-slate-500" />
                                    <span className="flex-1 text-white text-sm">{method}</span>
                                    <button
                                        onClick={() => removePaymentMethod(index)}
                                        className="p-1 hover:bg-red-500/20 rounded transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-400" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Add new payment method */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newPaymentMethod}
                                onChange={(e) => setNewPaymentMethod(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addPaymentMethod()}
                                placeholder="Add payment method..."
                                className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-purple-500/50 outline-none transition-all placeholder-slate-500 text-sm"
                            />
                            <button
                                onClick={addPaymentMethod}
                                className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-300 hover:bg-purple-500/30 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Thank You Message Section */}
            <div className="space-y-3">
                <SectionHeader id="thankyou" icon={Check} title="Confirmation Message" color="teal" />
                {activeSection === 'thankyou' && (
                    <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/10 animate-fade-in">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Thank You Message</label>
                            <textarea
                                value={thankYouMessage}
                                onChange={(e) => { setThankYouMessage(e.target.value); notifyChange({ thankYouMessage: e.target.value }); }}
                                rows={3}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-teal-500/50 outline-none transition-all placeholder-slate-500 resize-none"
                            />
                            <p className="mt-1 text-xs text-slate-500">
                                Shown after customer submits shipping information
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Tips */}
            <CollapsibleTips title="How It Works" color="green">
                <ol className="text-sm space-y-2 list-decimal list-inside">
                    <li>Customer sees Facebook's native shipping form</li>
                    <li>Form collects: Name, Address, City, Province, Postal Code, Phone</li>
                    <li>Customer fills and submits (pre-fills from Facebook if saved)</li>
                    <li>Thank you message is sent</li>
                    <li>Flow continues to Invoice/Cart Sheet nodes</li>
                </ol>
            </CollapsibleTips>
        </div>
    ), [activeSection, countries, privacyUrl, expiresInDays, paymentMethods, newPaymentMethod, thankYouMessage]);

    return (
        <div className="space-y-4">
            {configFormJSX}
        </div>
    );
};

export default CheckoutFormNodeForm;
