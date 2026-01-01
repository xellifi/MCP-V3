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
    const [autoCloseCountdown, setAutoCloseCountdown] = useState(5);

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
    // Flow context for continuation after submission
    const flowId = urlParams.get('flowId') || '';
    const nodeId = urlParams.get('nodeId') || '';
    const pageId = urlParams.get('pageId') || '';

    useEffect(() => { loadForm(); }, [formId]);

    // Log form open for abandoned form tracking
    useEffect(() => {
        if (formId && subscriberId && flowId) {
            console.log('[FormView] Logging form open for follow-up tracking');
            fetch('/api/forms/log-open', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    formId,
                    flowId,
                    nodeId,
                    pageId,
                    subscriberId,
                    subscriberName
                })
            }).catch(err => console.error('[FormView] Error logging open:', err));
        }
    }, [formId, subscriberId, flowId]);

    // Countdown timer
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

    // Auto-close after success
    useEffect(() => {
        if (submitted && autoCloseCountdown > 0) {
            const timer = setTimeout(() => setAutoCloseCountdown(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
        if (submitted && autoCloseCountdown === 0) {
            closeForm();
        }
    }, [submitted, autoCloseCountdown]);

    const closeForm = () => {
        if ((window as any).MessengerExtensions) {
            (window as any).MessengerExtensions.requestCloseBrowser(() => { }, () => {
                window.close();
            });
        } else {
            window.close();
        }
    };

    const loadForm = async () => {
        if (!formId) { setError('No form ID'); setLoading(false); return; }
        try {
            console.log('[FormView] Loading form with ID:', formId);

            // Check if formId is a valid UUID format
            const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formId);

            let data = null;
            let fetchError = null;

            if (isValidUUID) {
                // If it's a UUID, search by id column
                console.log('[FormView] Searching by UUID id...');
                const result = await supabase.from('forms').select('*').eq('id', formId).maybeSingle();
                data = result.data;
                fetchError = result.error;
            }

            // If not found by UUID (or wasn't a UUID), try node_id
            if (!data) {
                console.log('[FormView] Searching by node_id:', formId);
                const nodeResult = await supabase.from('forms').select('*').eq('node_id', formId).maybeSingle();
                if (nodeResult.data && !nodeResult.error) {
                    data = nodeResult.data;
                    fetchError = null;
                    console.log('[FormView] Found form by node_id:', nodeResult.data.id);
                } else if (nodeResult.error) {
                    console.error('[FormView] Error searching by node_id:', nodeResult.error);
                    fetchError = nodeResult.error;
                }
            }

            if (!data) {
                console.error('[FormView] Form not found');
                setError('Form not found');
            }
            else {
                console.log('[FormView] Form loaded:', data.name);
                setForm(data);
                if (data.countdown_enabled && data.countdown_minutes > 0) setTimeLeft(data.countdown_minutes * 60);
                const initialData: Record<string, any> = {};
                (data.fields || []).forEach((f: any) => { initialData[f.id] = f.type === 'checkbox' ? false : ''; });
                setFormData(initialData);
            }
        } catch (err) {
            console.error('[FormView] Error loading form:', err);
            setError('Failed to load');
        }
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

    // Sync form submission to Google Sheets (uses server-side proxy to avoid CORS)
    const syncToGoogleSheets = async (submissionData: any) => {
        console.log('[FormView Sheets] Starting sync...');
        console.log('[FormView Sheets] Config:', {
            sheet_id: form?.google_sheet_id,
            sheet_name: form?.google_sheet_name,
            webhook_url: form?.google_webhook_url ? '✓ Set' : '✗ Not set'
        });

        try {
            // Check if form has Google Sheet and webhook configured
            if (!form?.google_sheet_id || !form?.google_webhook_url) {
                console.log('[FormView Sheets] ⏭ Missing config, skipping sync');
                return;
            }

            console.log('[FormView Sheets] ✓ Syncing via server-side proxy...');

            // Call our server-side API which will proxy to the Apps Script webhook
            const response = await fetch('/api/sheets/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    webhookUrl: form.google_webhook_url,
                    spreadsheetId: form.google_sheet_id,
                    sheetName: form.google_sheet_name || 'Sheet1',
                    rowData: submissionData
                })
            });

            const result = await response.json();
            console.log('[FormView Sheets] API response:', result);

            if (result.success) {
                console.log('[FormView Sheets] ✓ Data synced to Google Sheets!');
                // Update synced_to_sheets flag
                await supabase
                    .from('form_submissions')
                    .update({ synced_to_sheets: true })
                    .eq('form_id', formId)
                    .order('created_at', { ascending: false })
                    .limit(1);
            } else {
                console.log('[FormView Sheets] ⚠ Sync issue:', result.message || result.error);
            }
        } catch (err) {
            console.error('[FormView Sheets] Error:', err);
            // Don't fail the submission if sheets sync fails
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

            // Debug: log form product fields
            console.log('[FormView] Form product info:', {
                product_name: form?.product_name,
                product_price: form?.product_price,
                currency: form?.currency
            });

            const submissionData = {
                ...formData,
                product_name: form?.product_name || '',
                product_price: form?.product_price || 0,
                currency: form?.currency || 'PHP',
                quantity,
                total: calculateTotal(),
                coupon_applied: couponApplied ? form?.coupon_code : null,
                payment_method: paymentMethod,
                ewallet_selected: selectedWallet,
                proof_url: proofUrl,
                subscriber_name: subscriberName,
                submitted_at: new Date().toISOString()
            };

            await supabase.from('form_submissions').insert({
                form_id: formId,
                subscriber_external_id: subscriberId,
                subscriber_name: subscriberName,
                data: submissionData,
                synced_to_sheets: false,
            });

            // Sync to Google Sheets if connected
            await syncToGoogleSheets(submissionData);

            // Continue the flow after form submission (sends confirmation messages, etc.)
            if (flowId && nodeId) {
                try {
                    console.log('[FormView] Continuing flow:', flowId, 'from node:', nodeId);
                    await fetch('/api/forms/continue-flow', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            flowId,
                            nodeId,
                            pageId,
                            subscriberId,
                            subscriberName,
                            formSubmitted: true,
                            submissionData
                        })
                    });
                    console.log('[FormView] Flow continuation triggered');
                } catch (flowErr) {
                    console.error('[FormView] Flow continuation error:', flowErr);
                    // Don't fail the submission if flow continuation fails
                }
            }

            // Mark form as submitted to prevent follow-up messages
            if (subscriberId) {
                fetch('/api/forms/mark-submitted', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ formId, subscriberId })
                }).catch(err => console.error('[FormView] Mark submitted error:', err));
            }

            setSubmitted(true);
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

    const getBorderRadius = () => {
        switch (form?.border_radius) {
            case 'normal': return '0px';
            case 'rounded': return '8px';
            case 'round': return '16px';
            case 'full': return '9999px';
            default: return '16px';
        }
    };

    const getInputRadius = () => {
        switch (form?.border_radius) {
            case 'normal': return '0px';
            case 'rounded': return '6px';
            case 'round': return '12px';
            case 'full': return '9999px';
            default: return '12px';
        }
    };

    const buttonColor = form?.submit_button_color || '#6366f1';
    const isOrderForm = form?.is_order_form ?? true;
    const isMinimal = form?.form_template === 'minimal';
    const totalSteps = isOrderForm ? 3 : 1;

    const applyCoupon = () => {
        if (couponInput.toUpperCase() === form?.coupon_code?.toUpperCase()) setCouponApplied(true);
        else alert('Invalid coupon code');
    };

    const canProceed = () => {
        if (currentStep === 1) return quantity >= 1;
        if (currentStep === 2) return (form?.fields || []).filter((f: any) => f.required).every((f: any) => formData[f.id]);
        if (currentStep === 3) {
            if (!paymentMethod) return false;
            if (paymentMethod === 'ewallet' && !selectedWallet) return false;
            if (form?.require_proof_upload && paymentMethod === 'ewallet' && !proofFile) return false;
            return true;
        }
        return true;
    };

    // Shared styles based on template - Minimal uses pure white/blue/grey
    const containerBg = isMinimal ? 'bg-white' : 'bg-[#0a0a12]';
    const cardBg = isMinimal ? 'bg-white shadow-lg border border-gray-100' : 'bg-white/[0.06] backdrop-blur-2xl border border-white/10 shadow-2xl';
    const textColor = isMinimal ? 'text-gray-900' : 'text-white';
    const textMuted = isMinimal ? 'text-gray-500' : 'text-white/50';
    const inputBg = isMinimal ? 'bg-white border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' : 'bg-white/5 border-white/10 focus:border-purple-500';
    const inputText = isMinimal ? 'text-gray-900 placeholder-gray-400' : 'text-white placeholder-white/30';

    // Loading
    if (loading) return (
        <div className={`min-h-screen ${containerBg} flex items-center justify-center`}>
            <div className={`w-12 h-12 border-4 ${isMinimal ? 'border-blue-500' : 'border-purple-500'} border-t-transparent rounded-full animate-spin`}></div>
        </div>
    );

    // Error
    if (error) return (
        <div className={`min-h-screen ${containerBg} flex items-center justify-center p-4`}>
            <div className={`${cardBg} rounded-2xl p-10 text-center max-w-sm`} style={{ borderRadius: getBorderRadius() }}>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">❌</span>
                </div>
                <h1 className={`text-xl font-bold ${textColor} mb-2`}>Not Found</h1>
                <p className={textMuted}>{error}</p>
            </div>
        </div>
    );

    // Expired
    if (expired) return (
        <div className={`min-h-screen ${containerBg} flex items-center justify-center p-4`}>
            <div className={`${cardBg} rounded-2xl p-10 text,center max-w-sm`} style={{ borderRadius: getBorderRadius() }}>
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">⏰</span>
                </div>
                <h1 className={`text-xl font-bold ${textColor} mb-2 text-center`}>Time's Up!</h1>
                <p className={`${textMuted} text-center`}>This offer has expired.</p>
            </div>
        </div>
    );

    // Success
    if (submitted) return (
        <div className={`min-h-screen ${containerBg} flex items-center justify-center p-4`}>
            <div className={`${cardBg} rounded-3xl p-8 text-center max-w-sm relative`} style={{ borderRadius: getBorderRadius() }}>
                {/* Close button */}
                <button onClick={closeForm} className={`absolute top-4 right-4 w-10 h-10 rounded-full ${isMinimal ? 'bg-gray-100 hover:bg-gray-200' : 'bg-white/10 hover:bg-white/20'} flex items-center justify-center transition`}>
                    <span className={`text-xl ${isMinimal ? 'text-gray-600' : 'text-white'}`}>×</span>
                </button>

                <div className={`w-20 h-20 ${isMinimal ? 'bg-green-100' : 'bg-gradient-to-br from-emerald-400 to-cyan-500'} rounded-full flex items-center justify-center mx-auto mb-6`}>
                    <span className={`text-4xl ${isMinimal ? 'text-green-600' : 'text-white'}`}>✓</span>
                </div>
                <h2 className={`text-2xl font-bold ${textColor} mb-3`}>Order Placed!</h2>
                <p className={textMuted}>{form?.success_message || 'We will contact you soon.'}</p>
                <p className={`${textMuted} text-sm mt-4`}>Closing in {autoCloseCountdown}s...</p>
            </div>
        </div>
    );

    // Form
    return (
        <div className={`min-h-screen ${containerBg} relative overflow-x-hidden`}>
            {/* Background (only for modern) */}
            {!isMinimal && (
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-80 h-80 bg-purple-600/20 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-pink-600/15 rounded-full blur-[100px]"></div>
                </div>
            )}

            <div className="relative min-h-screen flex items-center justify-center p-4 py-6">
                <div className="w-full max-w-md">
                    {/* Timer */}
                    {form?.countdown_enabled && timeLeft > 0 && (
                        <div
                            className={`mb-4 ${isMinimal ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-red-600 via-orange-500 to-amber-500'} rounded-2xl p-3 flex items-center justify-center gap-3 shadow-lg ${form?.countdown_blink ? 'animate-pulse' : ''}`}
                            style={{
                                borderRadius: getBorderRadius(),
                                animation: form?.countdown_blink ? 'blink 1s ease-in-out infinite' : 'none'
                            }}
                        >
                            <span className="text-xl">🔥</span>
                            <div className="text-center">
                                <p className="text-white/90 text-xs font-medium">OFFER EXPIRES IN</p>
                                <p className={`text-white text-2xl font-bold font-mono ${form?.countdown_blink ? 'animate-pulse' : ''}`}>{formatTime(timeLeft)}</p>
                            </div>
                            <span className="text-xl">🔥</span>
                        </div>
                    )}
                    <style>{`
                        @keyframes blink {
                            0%, 100% { opacity: 1; transform: scale(1); }
                            50% { opacity: 0.85; transform: scale(1.02); }
                        }
                    `}</style>

                    {/* Main Card */}
                    <div className={cardBg} style={{ borderRadius: getBorderRadius() }}>
                        {/* Header Image */}
                        {form?.header_image_url && (
                            <div
                                className={`relative h-52 ${isMinimal ? '' : 'bg-gradient-to-br from-purple-900/50 to-pink-900/50'} overflow-hidden flex items-center justify-center p-4`}
                                style={{
                                    borderRadius: `${getBorderRadius()} ${getBorderRadius()} 0 0`,
                                    backgroundColor: isMinimal ? '#ffffff' : undefined
                                }}
                            >
                                <img
                                    src={form.header_image_url}
                                    alt=""
                                    className="max-w-full max-h-full object-contain"
                                    style={{ borderRadius: '12px' }}
                                />
                            </div>
                        )}

                        <div className="p-6">
                            {/* Title - Display Product Name for order forms, Form Name otherwise */}
                            <h1 className={`text-2xl font-bold ${textColor} text-center mb-2`}>
                                {isOrderForm && form?.product_name ? form.product_name : (form?.name || 'Order Form')}
                            </h1>

                            {/* Step Indicator */}
                            {isOrderForm && (
                                <div className="flex items-center justify-center gap-2 mb-6">
                                    {[1, 2, 3].map(s => (
                                        <div key={s} className="flex items-center">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${s === currentStep ? (isMinimal ? 'bg-blue-500 text-white' : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white') :
                                                s < currentStep ? 'bg-green-500 text-white' : (isMinimal ? 'bg-gray-200 text-gray-400' : 'bg-white/10 text-white/40')
                                                }`}>{s < currentStep ? '✓' : s}</div>
                                            {s < 3 && <div className={`w-6 h-0.5 ${s < currentStep ? 'bg-green-500' : (isMinimal ? 'bg-gray-200' : 'bg-white/10')}`}></div>}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Step 1: Product */}
                            {isOrderForm && currentStep === 1 && (
                                <div className="space-y-5">
                                    <div>
                                        <label className={`block ${textMuted} text-sm mb-2`}>Quantity</label>
                                        <div className="flex items-center gap-3 justify-center">
                                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                className={`w-12 h-12 rounded-xl ${isMinimal ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' : 'bg-white/10 hover:bg-white/20 text-white'} text-xl font-bold transition`} style={{ borderRadius: getInputRadius() }}>−</button>
                                            <span className={`text-3xl font-bold ${textColor} w-16 text-center`}>{quantity}</span>
                                            <button onClick={() => setQuantity(Math.min(form?.max_quantity || 10, quantity + 1))}
                                                className={`w-12 h-12 rounded-xl ${isMinimal ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' : 'bg-white/10 hover:bg-white/20 text-white'} text-xl font-bold transition`} style={{ borderRadius: getInputRadius() }}>+</button>
                                        </div>
                                    </div>

                                    <div className={`${isMinimal ? 'bg-blue-50 border-blue-100' : 'bg-purple-500/10 border-purple-500/20'} border rounded-xl p-4`} style={{ borderRadius: getInputRadius() }}>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className={textMuted}>Price</span>
                                            <span className={textColor}>{getCurrencySymbol()}{(form?.product_price || 0).toLocaleString()} × {quantity}</span>
                                        </div>
                                        {couponApplied && (
                                            <div className="flex justify-between items-center mb-2 text-green-500">
                                                <span>Discount ({form?.coupon_discount}%)</span>
                                                <span>-{getCurrencySymbol()}{((form?.product_price || 0) * quantity * (form?.coupon_discount / 100)).toLocaleString()}</span>
                                            </div>
                                        )}
                                        <div className={`border-t ${isMinimal ? 'border-blue-100' : 'border-white/10'} pt-2 flex justify-between items-center`}>
                                            <span className={`${textColor} font-semibold`}>Total</span>
                                            <span className={`text-2xl font-bold ${textColor}`}>{getCurrencySymbol()}{calculateTotal().toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {form?.coupon_enabled && !couponApplied && (
                                        <div className="flex gap-2">
                                            <input type="text" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                                placeholder="Coupon" className={`flex-1 min-w-0 px-3 py-2.5 ${inputBg} border ${inputText} text-sm uppercase`} style={{ borderRadius: getInputRadius() }} />
                                            <button onClick={applyCoupon} className="px-4 py-2.5 bg-purple-500 text-white font-medium hover:bg-purple-600 whitespace-nowrap" style={{ borderRadius: getInputRadius() }}>Apply</button>
                                        </div>
                                    )}
                                    {couponApplied && <p className="text-green-500 text-sm text-center">✓ Coupon applied!</p>}
                                </div>
                            )}

                            {/* Step 2: Buyer Info */}
                            {(!isOrderForm || currentStep === 2) && (
                                <div className="space-y-4">
                                    {(form?.fields || []).map((field: any) => (
                                        <div key={field.id}>
                                            {field.type !== 'checkbox' && (
                                                <label className={`block ${textMuted} text-sm mb-1.5`}>
                                                    {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
                                                </label>
                                            )}
                                            {['text', 'email', 'phone', 'number'].includes(field.type) && (
                                                <input type={field.type === 'phone' ? 'tel' : field.type} value={formData[field.id] || ''}
                                                    onChange={(e) => handleInputChange(field.id, e.target.value)} placeholder={field.placeholder}
                                                    className={`w-full px-4 py-3 ${inputBg} border ${inputText} transition`} style={{ borderRadius: getInputRadius() }} />
                                            )}
                                            {field.type === 'textarea' && (
                                                <textarea value={formData[field.id] || ''} onChange={(e) => handleInputChange(field.id, e.target.value)}
                                                    placeholder={field.placeholder} rows={3}
                                                    className={`w-full px-4 py-3 ${inputBg} border ${inputText} resize-none transition`} style={{ borderRadius: getInputRadius() }} />
                                            )}
                                            {field.type === 'select' && (
                                                <select value={formData[field.id] || ''} onChange={(e) => handleInputChange(field.id, e.target.value)}
                                                    className={`w-full px-4 py-3 ${inputBg} border ${inputText} transition`} style={{ borderRadius: getInputRadius() }}>
                                                    <option value="">Select...</option>
                                                    {(field.options || []).map((o: string, i: number) => <option key={i} value={o}>{o}</option>)}
                                                </select>
                                            )}
                                            {field.type === 'checkbox' && (
                                                <label className={`flex items-center gap-3 p-3 ${inputBg} border cursor-pointer`} style={{ borderRadius: getInputRadius() }}>
                                                    <input type="checkbox" checked={formData[field.id] || false}
                                                        onChange={(e) => handleInputChange(field.id, e.target.checked)} className="w-5 h-5" style={{ accentColor: buttonColor }} />
                                                    <span className={isMinimal ? 'text-gray-700' : 'text-white/80'}>{field.label}</span>
                                                </label>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Step 3: Payment */}
                            {isOrderForm && currentStep === 3 && (
                                <div className="space-y-4">
                                    <p className={`${textMuted} text-sm text-center`}>Select payment method</p>

                                    {form?.cod_enabled && (
                                        <button onClick={() => { setPaymentMethod('cod'); setSelectedWallet(''); }}
                                            className={`w-full p-4 border-2 flex items-center gap-4 transition ${paymentMethod === 'cod' ? 'border-purple-500 bg-purple-500/10' : (isMinimal ? 'border-gray-200 hover:border-gray-300' : 'border-white/10 hover:border-white/30')}`} style={{ borderRadius: getInputRadius() }}>
                                            <span className="text-3xl">💵</span>
                                            <div className="text-left">
                                                <p className={`${textColor} font-semibold`}>Cash on Delivery</p>
                                                <p className={`${textMuted} text-sm`}>Pay when you receive</p>
                                            </div>
                                        </button>
                                    )}

                                    {form?.ewallet_enabled && (form?.ewallet_options || []).map((wallet: string) => (
                                        <button key={wallet} onClick={() => { setPaymentMethod('ewallet'); setSelectedWallet(wallet); }}
                                            className={`w-full p-4 border-2 flex items-center gap-4 transition ${selectedWallet === wallet ? 'border-blue-500 bg-blue-500/10' : (isMinimal ? 'border-gray-200 hover:border-gray-300' : 'border-white/10 hover:border-white/30')}`} style={{ borderRadius: getInputRadius() }}>
                                            <span className="text-3xl">📱</span>
                                            <div className="text-left flex-1">
                                                <p className={`${textColor} font-semibold`}>{wallet}</p>
                                                {form?.ewallet_numbers?.[wallet] && <p className={`${textMuted} text-sm`}>{form.ewallet_numbers[wallet]}</p>}
                                            </div>
                                        </button>
                                    ))}

                                    {paymentMethod === 'ewallet' && selectedWallet && (
                                        <div className={`${isMinimal ? 'bg-blue-50 border-blue-100' : 'bg-blue-500/10 border-blue-500/30'} border p-4 space-y-2`} style={{ borderRadius: getInputRadius() }}>
                                            <p className="text-blue-500 text-sm">Send payment to:</p>
                                            <p className={`${textColor} font-mono text-lg text-center ${isMinimal ? 'bg-white' : 'bg-white/10'} py-2`} style={{ borderRadius: getInputRadius() }}>
                                                {form?.ewallet_numbers?.[selectedWallet] || selectedWallet}
                                            </p>
                                            <p className={`${textColor} text-lg font-bold text-center`}>{getCurrencySymbol()}{calculateTotal().toLocaleString()}</p>
                                        </div>
                                    )}

                                    {form?.require_proof_upload && paymentMethod === 'ewallet' && (
                                        <div className="space-y-2">
                                            <p className={`${textMuted} text-sm`}>Upload payment proof <span className="text-red-500">*</span></p>
                                            <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} className="hidden" />
                                            {proofPreview ? (
                                                <div className="relative">
                                                    <img src={proofPreview} alt="Proof" className={`w-full h-40 object-cover ${isMinimal ? 'border-gray-200' : 'border-white/20'} border`} style={{ borderRadius: getInputRadius() }} />
                                                    <button onClick={() => { setProofFile(null); setProofPreview(''); }}
                                                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center">×</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => fileInputRef.current?.click()}
                                                    className={`w-full py-8 border-2 border-dashed ${isMinimal ? 'border-gray-300 hover:border-gray-400' : 'border-white/20 hover:border-white/40'} flex flex-col items-center gap-2 transition`} style={{ borderRadius: getInputRadius() }}>
                                                    <span className="text-3xl">📤</span>
                                                    <span className={textMuted}>Tap to upload</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Navigation */}
                            <div className="mt-6 space-y-3">
                                {isOrderForm && currentStep < 3 && (
                                    <button onClick={() => setCurrentStep(currentStep + 1)} disabled={!canProceed()}
                                        className="w-full py-4 text-white font-bold text-lg transition disabled:opacity-50"
                                        style={{ background: buttonColor, borderRadius: getBorderRadius() }}>Continue</button>
                                )}

                                {(!isOrderForm || currentStep === 3) && (
                                    <button onClick={handleSubmit} disabled={submitting || !canProceed()}
                                        className="w-full py-4 text-white font-bold text-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                                        style={{ background: buttonColor, borderRadius: getBorderRadius() }}>
                                        {submitting && <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                                        {submitting ? 'Processing...' : (form?.submit_button_text || 'Place Order')}
                                    </button>
                                )}

                                {isOrderForm && currentStep > 1 && (
                                    <button onClick={() => setCurrentStep(currentStep - 1)}
                                        className={`w-full py-3 ${textMuted} font-medium hover:opacity-80 transition`}>← Back</button>
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
