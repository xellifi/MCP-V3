import React, { useState, useMemo } from 'react';
import {
    Phone, Mail, MapPin, CreditCard, Type, Plus, Trash2, Check, GripVertical
} from 'lucide-react';
import CollapsibleTips from './CollapsibleTips';

interface CheckoutFormNodeFormProps {
    workspaceId: string;
    initialConfig?: {
        // Fields to collect
        collectPhone?: boolean;
        collectEmail?: boolean;
        collectAddress?: boolean;
        collectPaymentMethod?: boolean;
        // Field prompts
        phonePrompt?: string;
        emailPrompt?: string;
        addressPrompt?: string;
        paymentPrompt?: string;
        // Payment options
        paymentMethods?: string[];
        // Thank you message after form completion
        thankYouMessage?: string;
    };
    onChange: (config: any) => void;
}

const DEFAULT_PAYMENT_METHODS = ['Cash on Delivery', 'GCash', 'Bank Transfer'];

const CheckoutFormNodeForm: React.FC<CheckoutFormNodeFormProps> = ({
    workspaceId,
    initialConfig,
    onChange
}) => {
    // Field toggles
    const [collectPhone, setCollectPhone] = useState(initialConfig?.collectPhone ?? true);
    const [collectEmail, setCollectEmail] = useState(initialConfig?.collectEmail ?? true);
    const [collectAddress, setCollectAddress] = useState(initialConfig?.collectAddress ?? true);
    const [collectPaymentMethod, setCollectPaymentMethod] = useState(initialConfig?.collectPaymentMethod ?? true);

    // Prompts
    const [phonePrompt, setPhonePrompt] = useState(initialConfig?.phonePrompt || '📱 Please enter your mobile number:');
    const [emailPrompt, setEmailPrompt] = useState(initialConfig?.emailPrompt || '📧 Please enter your email address:');
    const [addressPrompt, setAddressPrompt] = useState(initialConfig?.addressPrompt || '📍 Please enter your complete delivery address:');
    const [paymentPrompt, setPaymentPrompt] = useState(initialConfig?.paymentPrompt || '💳 How would you like to pay?');

    // Payment methods
    const [paymentMethods, setPaymentMethods] = useState<string[]>(
        initialConfig?.paymentMethods || DEFAULT_PAYMENT_METHODS
    );
    const [newPaymentMethod, setNewPaymentMethod] = useState('');

    // Thank you message
    const [thankYouMessage, setThankYouMessage] = useState(
        initialConfig?.thankYouMessage || '✅ Thank you! Your information has been saved. Processing your order...'
    );

    // Active section
    const [activeSection, setActiveSection] = useState<string>('fields');

    // Notify parent of changes
    const notifyChange = (updates: Partial<typeof initialConfig> = {}) => {
        onChange({
            collectPhone,
            collectEmail,
            collectAddress,
            collectPaymentMethod,
            phonePrompt,
            emailPrompt,
            addressPrompt,
            paymentPrompt,
            paymentMethods,
            thankYouMessage,
            ...updates
        });
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

    // Toggle switch component
    const ToggleSwitch = ({
        label,
        checked,
        onChange: onToggle,
        icon: Icon
    }: {
        label: string;
        checked: boolean;
        onChange: (val: boolean) => void;
        icon: React.ElementType;
    }) => (
        <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/10">
            <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-white">{label}</span>
            </div>
            <button
                onClick={() => onToggle(!checked)}
                className={`w-12 h-6 rounded-full transition-all ${checked ? 'bg-emerald-500' : 'bg-slate-600'}`}
            >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
        </div>
    );

    // Configuration Form JSX
    const configFormJSX = useMemo(() => (
        <div className="space-y-3">
            {/* Fields Section */}
            <div className="space-y-3">
                <SectionHeader id="fields" icon={Check} title="Fields to Collect" color="emerald" />
                {activeSection === 'fields' && (
                    <div className="space-y-3 p-4 bg-black/20 rounded-xl border border-white/10 animate-fade-in">
                        <ToggleSwitch
                            label="Mobile Number"
                            checked={collectPhone}
                            onChange={(val) => { setCollectPhone(val); notifyChange({ collectPhone: val }); }}
                            icon={Phone}
                        />
                        <ToggleSwitch
                            label="Email Address"
                            checked={collectEmail}
                            onChange={(val) => { setCollectEmail(val); notifyChange({ collectEmail: val }); }}
                            icon={Mail}
                        />
                        <ToggleSwitch
                            label="Delivery Address"
                            checked={collectAddress}
                            onChange={(val) => { setCollectAddress(val); notifyChange({ collectAddress: val }); }}
                            icon={MapPin}
                        />
                        <ToggleSwitch
                            label="Payment Method"
                            checked={collectPaymentMethod}
                            onChange={(val) => { setCollectPaymentMethod(val); notifyChange({ collectPaymentMethod: val }); }}
                            icon={CreditCard}
                        />
                    </div>
                )}
            </div>

            {/* Prompts Section */}
            <div className="space-y-3">
                <SectionHeader id="prompts" icon={Type} title="Custom Prompts" color="blue" />
                {activeSection === 'prompts' && (
                    <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/10 animate-fade-in">
                        {collectPhone && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Phone Prompt</label>
                                <input
                                    type="text"
                                    value={phonePrompt}
                                    onChange={(e) => { setPhonePrompt(e.target.value); notifyChange({ phonePrompt: e.target.value }); }}
                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all placeholder-slate-500"
                                />
                            </div>
                        )}
                        {collectEmail && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Email Prompt</label>
                                <input
                                    type="text"
                                    value={emailPrompt}
                                    onChange={(e) => { setEmailPrompt(e.target.value); notifyChange({ emailPrompt: e.target.value }); }}
                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all placeholder-slate-500"
                                />
                            </div>
                        )}
                        {collectAddress && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Address Prompt</label>
                                <input
                                    type="text"
                                    value={addressPrompt}
                                    onChange={(e) => { setAddressPrompt(e.target.value); notifyChange({ addressPrompt: e.target.value }); }}
                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all placeholder-slate-500"
                                />
                            </div>
                        )}
                        {collectPaymentMethod && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Payment Prompt</label>
                                <input
                                    type="text"
                                    value={paymentPrompt}
                                    onChange={(e) => { setPaymentPrompt(e.target.value); notifyChange({ paymentPrompt: e.target.value }); }}
                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all placeholder-slate-500"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Payment Methods Section */}
            {collectPaymentMethod && (
                <div className="space-y-3">
                    <SectionHeader id="payment" icon={CreditCard} title="Payment Methods" color="purple" />
                    {activeSection === 'payment' && (
                        <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/10 animate-fade-in">
                            <p className="text-xs text-slate-400">
                                Configure the payment options that will be shown as quick reply buttons.
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
            )}

            {/* Thank You Message Section */}
            <div className="space-y-3">
                <SectionHeader id="thankyou" icon={Check} title="Completion Message" color="teal" />
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
                                Shown after all information is collected
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Tips */}
            <CollapsibleTips title="Tips & Best Practices" color="green">
                <ul className="text-sm space-y-1.5">
                    <li>• Keep prompts short and clear</li>
                    <li>• Phone numbers help with order follow-up</li>
                    <li>• Email allows sending order confirmations</li>
                    <li>• Offer popular payment methods like COD and GCash</li>
                </ul>
            </CollapsibleTips>
        </div>
    ), [activeSection, collectPhone, collectEmail, collectAddress, collectPaymentMethod, phonePrompt, emailPrompt, addressPrompt, paymentPrompt, paymentMethods, newPaymentMethod, thankYouMessage]);

    return (
        <div className="space-y-4">
            {configFormJSX}
        </div>
    );
};

export default CheckoutFormNodeForm;
