import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const FormView: React.FC = () => {
    const { formId } = useParams<{ formId: string }>();
    const [form, setForm] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [expired, setExpired] = useState(false);

    // Multi-step state
    const [currentStep, setCurrentStep] = useState(1);
    const [quantity, setQuantity] = useState(1);
    const [couponInput, setCouponInput] = useState('');
    const [couponApplied, setCouponApplied] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [selectedWallet, setSelectedWallet] = useState('');
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [proofPreview, setProofPreview] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const urlParams = new URLSearchParams(window.location.search);
    const subscriberId = urlParams.get('sid') || '';
    const subscriberName = urlParams.get('sname') || '';

    useEffect(() => { loadForm(); }, [formId]);

    useEffect(() => {
        if (form?.countdown_enabled && form?.countdown_minutes > 0 && timeLeft > 0 && !expired) {
            const timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) { setExpired(true); return 0; }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [form, timeLeft, expired]);

    const loadForm = async () => {
        if (!formId) { setError('No form ID'); setLoading(false); return; }
        try {
            const { data, error: fetchError } = await supabase.from('forms').select('*').eq('id', formId).single();
            if (fetchError || !data) { setError('Form not found'); }
            else {
                setForm(data);
                if (data.countdown_enabled && data.countdown_minutes > 0) setTimeLeft(data.countdown_minutes * 60);
                const initialData: Record<string, any> = {};
                (data.fields || []).forEach((f: any) => { initialData[f.id] = f.type === 'checkbox' ? false : ''; });
                setFormData(initialData);
            }
        } catch { setError('Failed to load'); }
        finally { setLoading(false); }
    };

    const handleInputChange = (fieldId: string, value: any) => setFormData(prev => ({ ...prev, [fieldId]: value }));

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProofFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setProofPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        if (expired) return;
        setSubmitting(true);
        try {
            let proofUrl = '';
            if (proofFile) {
                const fileName = `${Date.now()}_${proofFile.name}`;
                const { data: uploadData } = await supabase.storage.from('payment-proofs').upload(fileName, proofFile);
                if (uploadData) {
                    const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(fileName);
                    proofUrl = urlData?.publicUrl || '';
                }
            }

            await supabase.from('form_submissions').insert({
                form_id: formId,
                subscriber_external_id: subscriberId,
                subscriber_name: subscriberName,
                data: {
                    ...formData,
                    quantity,
                    total: calculateTotal(),
                    coupon_applied: couponApplied ? form?.coupon_code : null,
                    payment_method: paymentMethod,
                    ewallet_selected: selectedWallet,
                    proof_url: proofUrl,
                },
                synced_to_sheets: false,
            });

            setSubmitted(true);
            if ((window as any).MessengerExtensions) {
                setTimeout(() => { (window as any).MessengerExtensions.requestCloseBrowser(() => { }, () => { }); }, 2500);
            }
        } catch (err) { alert('Failed to submit. Please try again.'); }
        finally { setSubmitting(false); }
    };

    const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
    const getCurrencySymbol = () => ({ PHP: '₱', USD: '$', EUR: '€', GBP: '£', JPY: '¥' }[form?.currency] || '₱');
    const calculateTotal = () => {
        let total = (form?.product_price || 0) * quantity;
        if (couponApplied && form?.coupon_discount) total = total * (1 - form.coupon_discount / 100);
        return total;
    };
    const getBorderRadius = () => form?.border_radius === 'full' ? '28px' : form?.border_radius === 'round' ? '20px' : '14px';
    const getInputRadius = () => form?.border_radius === 'full' ? '50px' : form?.border_radius === 'round' ? '14px' : '10px';
    const buttonColor = form?.submit_button_color || '#6366f1';
    const isOrderForm = form?.is_order_form ?? true;
    const totalSteps = isOrderForm ? 3 : 1;

    const applyCoupon = () => {
        if (couponInput.toUpperCase() === form?.coupon_code?.toUpperCase()) {
            setCouponApplied(true);
        } else {
            alert('Invalid coupon code');
        }
    };

    const canProceed = () => {
        if (currentStep === 1) return quantity >= 1;
        if (currentStep === 2) {
            return (form?.fields || []).filter((f: any) => f.required).every((f: any) => formData[f.id]);
        }
        if (currentStep === 3) {
            if (!paymentMethod) return false;
            if (paymentMethod === 'ewallet' && !selectedWallet) return false;
            if (form?.require_proof_upload && paymentMethod === 'ewallet' && !proofFile) return false;
            return true;
        }
        return true;
    };

    // Loading/Error/Expired/Success states
    if (loading) return (
        <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center p-4">
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-10 text-center border border-white/10 max-w-sm">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">❌</span>
                </div>
                <h1 className="text-xl font-bold text-white mb-2">Not Found</h1>
                <p className="text-white/50">{error}</p>
            </div>
        </div>
    );

    if (expired) return (
        <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center p-4">
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-10 text-center border border-white/10 max-w-sm">
                <div className="w-16 h-16 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">⏰</span>
                </div>
                <h1 className="text-xl font-bold text-white mb-2">Time's Up!</h1>
                <p className="text-white/50">This offer has expired.</p>
            </div>
        </div>
    );

    if (submitted) return (
        <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
            </div>
            <div className="relative bg-white/5 backdrop-blur-xl rounded-3xl p-10 text-center border border-white/10 max-w-sm">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
                    <span className="text-4xl">✓</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Order Placed!</h2>
                <p className="text-white/60">{form?.success_message || 'We will contact you soon.'}</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0a0a12] relative overflow-x-hidden">
            {/* Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-80 h-80 bg-purple-600/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-pink-600/15 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative min-h-screen flex items-center justify-center p-4 py-6">
                <div className="w-full max-w-md">
                    {/* Timer */}
                    {form?.countdown_enabled && timeLeft > 0 && (
                        <div className="mb-4 bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 rounded-2xl p-3 flex items-center justify-center gap-3 shadow-lg shadow-orange-500/20">
                            <span className="text-2xl animate-pulse">🔥</span>
                            <div className="text-center">
                                <p className="text-white/90 text-xs font-medium">OFFER EXPIRES IN</p>
                                <p className="text-white text-2xl font-bold font-mono">{formatTime(timeLeft)}</p>
                            </div>
                            <span className="text-2xl animate-pulse">🔥</span>
                        </div>
                    )}

                    {/* Main Card */}
                    <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        {/* Header Image */}
                        {form?.header_image_url && (
                            <div className="relative h-48 bg-gradient-to-br from-purple-900/50 to-pink-900/50">
                                <img src={form.header_image_url} alt="" className="w-full h-full object-contain p-4" />
                            </div>
                        )}

                        <div className="p-6">
                            {/* Title */}
                            <h1 className="text-2xl font-bold text-white text-center mb-2">{form?.name || 'Order Form'}</h1>

                            {/* Step Indicator */}
                            {isOrderForm && (
                                <div className="flex items-center justify-center gap-2 mb-6">
                                    {[1, 2, 3].map(s => (
                                        <div key={s} className="flex items-center">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${s === currentStep ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white scale-110' :
                                                    s < currentStep ? 'bg-green-500 text-white' : 'bg-white/10 text-white/40'
                                                }`}>
                                                {s < currentStep ? '✓' : s}
                                            </div>
                                            {s < 3 && <div className={`w-8 h-0.5 ${s < currentStep ? 'bg-green-500' : 'bg-white/10'}`}></div>}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Step 1: Product */}
                            {isOrderForm && currentStep === 1 && (
                                <div className="space-y-5">
                                    {/* Quantity */}
                                    <div>
                                        <label className="block text-white/70 text-sm mb-2">Quantity</label>
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                className="w-12 h-12 rounded-2xl bg-white/10 text-white text-xl font-bold hover:bg-white/20 transition">−</button>
                                            <span className="text-3xl font-bold text-white w-16 text-center">{quantity}</span>
                                            <button onClick={() => setQuantity(Math.min(form?.max_quantity || 10, quantity + 1))}
                                                className="w-12 h-12 rounded-2xl bg-white/10 text-white text-xl font-bold hover:bg-white/20 transition">+</button>
                                        </div>
                                    </div>

                                    {/* Price Display */}
                                    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-white/60">Price</span>
                                            <span className="text-white">{getCurrencySymbol()}{(form?.product_price || 0).toLocaleString()} × {quantity}</span>
                                        </div>
                                        {couponApplied && (
                                            <div className="flex justify-between items-center mb-2 text-green-400">
                                                <span>Discount ({form?.coupon_discount}%)</span>
                                                <span>-{getCurrencySymbol()}{((form?.product_price || 0) * quantity * (form?.coupon_discount / 100)).toLocaleString()}</span>
                                            </div>
                                        )}
                                        <div className="border-t border-white/10 pt-2 flex justify-between items-center">
                                            <span className="text-white font-semibold">Total</span>
                                            <span className="text-2xl font-bold text-white">{getCurrencySymbol()}{calculateTotal().toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Coupon */}
                                    {form?.coupon_enabled && !couponApplied && (
                                        <div className="flex gap-2">
                                            <input type="text" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                                placeholder="Coupon code" className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 uppercase" />
                                            <button onClick={applyCoupon} className="px-4 py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600">Apply</button>
                                        </div>
                                    )}
                                    {couponApplied && (
                                        <div className="flex items-center gap-2 text-green-400 text-sm">
                                            <span>✓</span> Coupon "{form?.coupon_code}" applied!
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 2: Buyer Info */}
                            {(!isOrderForm || currentStep === 2) && (
                                <div className="space-y-4">
                                    {(form?.fields || []).map((field: any) => (
                                        <div key={field.id}>
                                            {field.type !== 'checkbox' && (
                                                <label className="block text-white/70 text-sm mb-1.5">
                                                    {field.label}{field.required && <span className="text-red-400 ml-1">*</span>}
                                                </label>
                                            )}
                                            {['text', 'email', 'phone', 'number'].includes(field.type) && (
                                                <input type={field.type === 'phone' ? 'tel' : field.type} value={formData[field.id] || ''}
                                                    onChange={(e) => handleInputChange(field.id, e.target.value)} placeholder={field.placeholder}
                                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-purple-500 transition"
                                                    style={{ borderRadius: getInputRadius() }} />
                                            )}
                                            {field.type === 'textarea' && (
                                                <textarea value={formData[field.id] || ''} onChange={(e) => handleInputChange(field.id, e.target.value)}
                                                    placeholder={field.placeholder} rows={3}
                                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:border-purple-500 resize-none transition"
                                                    style={{ borderRadius: getInputRadius() }} />
                                            )}
                                            {field.type === 'select' && (
                                                <select value={formData[field.id] || ''} onChange={(e) => handleInputChange(field.id, e.target.value)}
                                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-purple-500 transition"
                                                    style={{ borderRadius: getInputRadius() }}>
                                                    <option value="" className="bg-slate-900">Select...</option>
                                                    {(field.options || []).map((o: string, i: number) => <option key={i} value={o} className="bg-slate-900">{o}</option>)}
                                                </select>
                                            )}
                                            {field.type === 'checkbox' && (
                                                <label className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer">
                                                    <input type="checkbox" checked={formData[field.id] || false}
                                                        onChange={(e) => handleInputChange(field.id, e.target.checked)} className="w-5 h-5" style={{ accentColor: buttonColor }} />
                                                    <span className="text-white/80">{field.label}</span>
                                                </label>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Step 3: Payment */}
                            {isOrderForm && currentStep === 3 && (
                                <div className="space-y-4">
                                    <p className="text-white/60 text-sm text-center mb-4">Select payment method</p>

                                    {/* COD */}
                                    {form?.cod_enabled && (
                                        <button onClick={() => { setPaymentMethod('cod'); setSelectedWallet(''); }}
                                            className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition ${paymentMethod === 'cod' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 hover:border-white/30'
                                                }`}>
                                            <span className="text-3xl">💵</span>
                                            <div className="text-left">
                                                <p className="text-white font-semibold">Cash on Delivery</p>
                                                <p className="text-white/50 text-sm">Pay when you receive</p>
                                            </div>
                                        </button>
                                    )}

                                    {/* E-Wallet Options */}
                                    {form?.ewallet_enabled && (form?.ewallet_options || []).map((wallet: string) => (
                                        <button key={wallet} onClick={() => { setPaymentMethod('ewallet'); setSelectedWallet(wallet); }}
                                            className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition ${selectedWallet === wallet ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/30'
                                                }`}>
                                            <span className="text-3xl">📱</span>
                                            <div className="text-left flex-1">
                                                <p className="text-white font-semibold">{wallet}</p>
                                                {form?.ewallet_numbers?.[wallet] && (
                                                    <p className="text-white/50 text-sm">{form.ewallet_numbers[wallet]}</p>
                                                )}
                                            </div>
                                        </button>
                                    ))}

                                    {/* E-Wallet Payment Instructions */}
                                    {paymentMethod === 'ewallet' && selectedWallet && (
                                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 space-y-3">
                                            <p className="text-blue-300 text-sm">Send payment to:</p>
                                            <p className="text-white font-mono text-lg text-center bg-white/10 rounded-xl py-2">
                                                {form?.ewallet_numbers?.[selectedWallet] || selectedWallet}
                                            </p>
                                            <p className="text-white text-lg font-bold text-center">{getCurrencySymbol()}{calculateTotal().toLocaleString()}</p>
                                        </div>
                                    )}

                                    {/* Proof Upload */}
                                    {form?.require_proof_upload && paymentMethod === 'ewallet' && (
                                        <div className="space-y-3">
                                            <p className="text-white/70 text-sm">Upload payment screenshot <span className="text-red-400">*</span></p>
                                            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} className="hidden" />
                                            {proofPreview ? (
                                                <div className="relative">
                                                    <img src={proofPreview} alt="Proof" className="w-full h-40 object-cover rounded-2xl border border-white/20" />
                                                    <button onClick={() => { setProofFile(null); setProofPreview(''); }}
                                                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center">×</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => fileInputRef.current?.click()}
                                                    className="w-full py-8 border-2 border-dashed border-white/20 rounded-2xl flex flex-col items-center gap-2 hover:border-white/40 transition">
                                                    <span className="text-3xl">📤</span>
                                                    <span className="text-white/60 text-sm">Tap to upload</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="mt-6 space-y-3">
                                {isOrderForm && currentStep < 3 && (
                                    <button onClick={() => setCurrentStep(currentStep + 1)} disabled={!canProceed()}
                                        className="w-full py-4 text-white font-bold text-lg rounded-2xl transition disabled:opacity-50"
                                        style={{ background: `linear-gradient(135deg, ${buttonColor}, ${buttonColor}cc)` }}>
                                        Continue
                                    </button>
                                )}

                                {(!isOrderForm || currentStep === 3) && (
                                    <button onClick={handleSubmit} disabled={submitting || !canProceed()}
                                        className="w-full py-4 text-white font-bold text-lg rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2"
                                        style={{ background: `linear-gradient(135deg, ${buttonColor}, ${buttonColor}cc)` }}>
                                        {submitting && <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                                        {submitting ? 'Placing Order...' : (form?.submit_button_text || 'Place Order')}
                                    </button>
                                )}

                                {isOrderForm && currentStep > 1 && (
                                    <button onClick={() => setCurrentStep(currentStep - 1)}
                                        className="w-full py-3 text-white/60 font-medium hover:text-white transition">
                                        ← Back
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FormView;
