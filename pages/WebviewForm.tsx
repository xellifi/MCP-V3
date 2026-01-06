import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { User, Mail, Phone, MapPin, CreditCard, Truck, ChevronDown, Check, X } from 'lucide-react';

interface FormField {
    id: string;
    label: string;
    type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'radio';
    placeholder?: string;
    required?: boolean;
    options?: string[];
}

interface FormConfig {
    headerText?: string;
    headerColor?: string;
    formType?: 'ecommerce' | 'registration';
    fields?: FormField[];
    buttonText?: string;
    buttonColor?: string;
    showCart?: boolean;
    paymentMethods?: string[];
}

interface CartItem {
    productName: string;
    productPrice: number;
    quantity: number;
}

const DEFAULT_ECOMMERCE_FIELDS: FormField[] = [
    { id: 'fullName', label: 'Full Name', type: 'text', placeholder: 'Juan Dela Cruz', required: true },
    { id: 'email', label: 'Email', type: 'email', placeholder: 'juan@email.com', required: true },
    { id: 'phone', label: 'Phone Number', type: 'phone', placeholder: '09123456789', required: true },
    { id: 'address', label: 'Shipping Address', type: 'textarea', placeholder: 'Street, Barangay, City', required: true },
    { id: 'city', label: 'City', type: 'text', placeholder: 'City', required: true },
    { id: 'province', label: 'Province', type: 'text', placeholder: 'Province', required: true },
    { id: 'postalCode', label: 'Postal Code', type: 'text', placeholder: '1000', required: false },
];

const DEFAULT_PAYMENT_METHODS = ['Cash on Delivery', 'GCash', 'Bank Transfer'];

const API_BASE = import.meta.env.VITE_API_URL || '';

const WebviewForm: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [config, setConfig] = useState<FormConfig | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cartTotal, setCartTotal] = useState(0);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [selectedPayment, setSelectedPayment] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        loadSession();
    }, [sessionId]);

    const loadSession = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/webview/session?id=${sessionId}`);
            const data = await response.json();

            if (data.error) {
                setError(data.error);
                return;
            }

            const session = data.session;
            setConfig(session.page_config || {});
            setCart(session.cart || []);
            setCartTotal(session.cart_total || 0);

            // Set default payment method
            const payments = session.page_config?.paymentMethods || DEFAULT_PAYMENT_METHODS;
            if (payments.length > 0) {
                setSelectedPayment(payments[0]);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load form');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (fieldId: string, value: string) => {
        setFormData(prev => ({ ...prev, [fieldId]: value }));
        if (errors[fieldId]) {
            setErrors(prev => ({ ...prev, [fieldId]: '' }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        const fields = config?.fields || DEFAULT_ECOMMERCE_FIELDS;

        fields.forEach(field => {
            if (field.required && !formData[field.id]?.trim()) {
                newErrors[field.id] = `${field.label} is required`;
            }
            if (field.type === 'email' && formData[field.id]) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(formData[field.id])) {
                    newErrors[field.id] = 'Invalid email address';
                }
            }
        });

        if (config?.formType === 'ecommerce' && !selectedPayment) {
            newErrors['payment'] = 'Please select a payment method';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm() || submitting) return;
        setSubmitting(true);

        try {
            const submissionData = {
                ...formData,
                paymentMethod: selectedPayment,
                submittedAt: new Date().toISOString()
            };

            await fetch(`${API_BASE}/api/webview/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    action: 'submit_form',
                    payload: submissionData
                })
            });

            setSubmitted(true);

            // Wait a moment to show success, then close
            setTimeout(async () => {
                await fetch(`${API_BASE}/api/webview/continue`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId, closeReason: 'form_submitted' })
                });

                if ((window as any).MessengerExtensions) {
                    (window as any).MessengerExtensions.requestCloseBrowser(
                        () => console.log('Webview closed'),
                        (err: any) => console.error('Error closing:', err)
                    );
                } else {
                    window.close();
                }
            }, 2000);
        } catch (err) {
            console.error('Error submitting form:', err);
            setSubmitting(false);
        }
    };

    const closeForm = async () => {
        try {
            await fetch(`${API_BASE}/api/webview/continue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, closeReason: 'close' })
            });

            if ((window as any).MessengerExtensions) {
                (window as any).MessengerExtensions.requestCloseBrowser(
                    () => console.log('Webview closed'),
                    (err: any) => console.error('Error closing:', err)
                );
            } else {
                window.close();
            }
        } catch (err) {
            console.error('Error closing form');
        }
    };

    const fields = config?.fields || DEFAULT_ECOMMERCE_FIELDS;
    const paymentMethods = config?.paymentMethods || DEFAULT_PAYMENT_METHODS;
    const isEcommerce = config?.formType !== 'registration';

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="text-6xl mb-4">📝</div>
                    <h1 className="text-xl font-bold text-slate-800 mb-2">Form Error</h1>
                    <p className="text-slate-500">{error}</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
                <div className="text-center animate-bounce-in">
                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-green-800 mb-2">Thank You!</h1>
                    <p className="text-green-600">Your information has been saved.</p>
                </div>
                <style>{`
                    @keyframes bounce-in {
                        0% { transform: scale(0.5); opacity: 0; }
                        50% { transform: scale(1.1); }
                        100% { transform: scale(1); opacity: 1; }
                    }
                    .animate-bounce-in { animation: bounce-in 0.5s ease-out; }
                `}</style>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <header
                className="py-4 px-4 flex items-center justify-between"
                style={{ backgroundColor: config?.headerColor || '#3b82f6' }}
            >
                <button onClick={closeForm} className="p-2 text-white/80 hover:text-white">
                    <X className="w-5 h-5" />
                </button>
                <h1 className="text-lg font-bold text-white">
                    {config?.headerText || (isEcommerce ? 'Checkout Details' : 'Registration')}
                </h1>
                <div className="w-10"></div>
            </header>

            <div className="flex-1 overflow-auto p-4 space-y-4">
                {/* Order Summary (for ecommerce) */}
                {isEcommerce && cart.length > 0 && config?.showCart !== false && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                            <Truck className="w-5 h-5 text-blue-600" />
                            Order Summary
                        </h2>
                        <div className="space-y-2">
                            {cart.map((item, index) => (
                                <div key={index} className="flex justify-between text-sm">
                                    <span className="text-slate-600">
                                        {item.productName} x{item.quantity}
                                    </span>
                                    <span className="font-medium">
                                        ₱{(item.productPrice * item.quantity).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold">
                                <span>Total</span>
                                <span className="text-blue-600">₱{cartTotal.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Form Fields */}
                <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
                    <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-600" />
                        {isEcommerce ? 'Shipping Information' : 'Your Information'}
                    </h2>

                    {fields.map(field => (
                        <div key={field.id}>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                {field.label}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>

                            {field.type === 'textarea' ? (
                                <textarea
                                    value={formData[field.id] || ''}
                                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                                    placeholder={field.placeholder}
                                    rows={3}
                                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all resize-none ${errors[field.id]
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                                        }`}
                                />
                            ) : field.type === 'select' ? (
                                <div className="relative">
                                    <select
                                        value={formData[field.id] || ''}
                                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                                        className={`w-full px-4 py-3 border rounded-xl outline-none appearance-none ${errors[field.id]
                                                ? 'border-red-500 bg-red-50'
                                                : 'border-slate-200 focus:border-blue-500'
                                            }`}
                                    >
                                        <option value="">Select...</option>
                                        {field.options?.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                </div>
                            ) : (
                                <input
                                    type={field.type === 'phone' ? 'tel' : field.type}
                                    value={formData[field.id] || ''}
                                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                                    placeholder={field.placeholder}
                                    className={`w-full px-4 py-3 border rounded-xl outline-none transition-all ${errors[field.id]
                                            ? 'border-red-500 bg-red-50'
                                            : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                                        }`}
                                />
                            )}

                            {errors[field.id] && (
                                <p className="text-red-500 text-sm mt-1">{errors[field.id]}</p>
                            )}
                        </div>
                    ))}
                </div>

                {/* Payment Methods (for ecommerce) */}
                {isEcommerce && paymentMethods.length > 0 && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                        <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-blue-600" />
                            Payment Method
                        </h2>
                        <div className="space-y-2">
                            {paymentMethods.map(method => (
                                <button
                                    key={method}
                                    onClick={() => setSelectedPayment(method)}
                                    className={`w-full px-4 py-3 border rounded-xl text-left flex items-center justify-between transition-all ${selectedPayment === method
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <span className="font-medium">{method}</span>
                                    {selectedPayment === method && (
                                        <Check className="w-5 h-5 text-blue-600" />
                                    )}
                                </button>
                            ))}
                        </div>
                        {errors['payment'] && (
                            <p className="text-red-500 text-sm mt-2">{errors['payment']}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Submit Button */}
            <div className="p-4 bg-white border-t border-slate-200">
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all active:scale-[0.98] disabled:opacity-50"
                    style={{ backgroundColor: config?.buttonColor || '#3b82f6' }}
                >
                    {submitting ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Processing...
                        </div>
                    ) : (
                        config?.buttonText || (isEcommerce ? 'Complete Order' : 'Submit')
                    )}
                </button>
            </div>
        </div>
    );
};

export default WebviewForm;
