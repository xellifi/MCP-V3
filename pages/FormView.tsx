import React, { useState, useEffect } from 'react';
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

    const urlParams = new URLSearchParams(window.location.search);
    const subscriberId = urlParams.get('sid') || '';
    const subscriberName = urlParams.get('sname') || '';

    useEffect(() => {
        loadForm();
    }, [formId]);

    // Countdown timer
    useEffect(() => {
        if (form?.countdown_enabled && form?.countdown_minutes > 0 && timeLeft > 0 && !expired) {
            const timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setExpired(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [form, timeLeft, expired]);

    const loadForm = async () => {
        if (!formId) {
            setError('No form ID provided');
            setLoading(false);
            return;
        }

        try {
            const { data, error: fetchError } = await supabase
                .from('forms')
                .select('*')
                .eq('id', formId)
                .single();

            if (fetchError || !data) {
                setError('Form not found');
            } else {
                setForm(data);
                if (data.countdown_enabled && data.countdown_minutes > 0) {
                    setTimeLeft(data.countdown_minutes * 60);
                }
                const initialData: Record<string, any> = {};
                (data.fields || []).forEach((field: any) => {
                    initialData[field.id] = field.type === 'checkbox' ? false : '';
                });
                setFormData(initialData);
            }
        } catch (err) {
            setError('Failed to load form');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (fieldId: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (expired) return;
        setSubmitting(true);

        try {
            await supabase.from('form_submissions').insert({
                form_id: formId,
                subscriber_external_id: subscriberId,
                subscriber_name: subscriberName,
                data: formData,
                synced_to_sheets: false,
            });

            setSubmitted(true);

            if ((window as any).MessengerExtensions) {
                setTimeout(() => {
                    (window as any).MessengerExtensions.requestCloseBrowser(() => { }, () => { });
                }, 2500);
            }
        } catch (err) {
            alert('Failed to submit. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getBorderRadius = () => form?.border_radius === 'full' ? '28px' : form?.border_radius === 'round' ? '24px' : '16px';
    const getInputRadius = () => form?.border_radius === 'full' ? '50px' : form?.border_radius === 'round' ? '16px' : '12px';
    const buttonColor = form?.submit_button_color || '#6366f1';

    // Loading
    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
                    <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl p-8 text-center border border-white/20">
                        <div className="w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-white/80 font-medium">Loading...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Error
    if (error) {
        return (
            <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-10 text-center border border-white/10 max-w-sm">
                    <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/30">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Not Found</h1>
                    <p className="text-white/50">{error}</p>
                </div>
            </div>
        );
    }

    // Expired
    if (expired) {
        return (
            <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-10 text-center border border-white/10 max-w-sm">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Time's Up!</h1>
                    <p className="text-white/50">This form has expired.</p>
                </div>
            </div>
        );
    }

    // Success
    if (submitted) {
        return (
            <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4 overflow-hidden">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
                </div>
                <div className="relative bg-white/5 backdrop-blur-2xl rounded-3xl p-10 text-center border border-white/10 max-w-sm">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full blur-xl opacity-60"></div>
                        <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-3">Thank You!</h2>
                    <p className="text-white/60 leading-relaxed">
                        {form?.success_message || 'Your response has been submitted.'}
                    </p>
                </div>
            </div>
        );
    }

    // Form
    return (
        <div className="min-h-screen bg-[#0f0f1a] relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-conic from-purple-600/10 via-transparent to-pink-600/10 rounded-full blur-2xl"></div>
            </div>

            <div className="relative min-h-screen flex items-center justify-center p-4 py-8">
                <div
                    className="w-full max-w-md bg-white/[0.08] backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden"
                    style={{ borderRadius: getBorderRadius() }}
                >
                    {/* Countdown Timer */}
                    {form?.countdown_enabled && timeLeft > 0 && (
                        <div className="relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 animate-gradient-x"></div>
                            <div className="relative px-4 py-3 flex items-center justify-center gap-3">
                                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="text-center">
                                    <p className="text-white/80 text-xs font-medium tracking-wide uppercase">Offer expires in</p>
                                    <p className="text-white text-2xl font-bold font-mono tracking-wider">{formatTime(timeLeft)}</p>
                                </div>
                                <div className="absolute right-4 flex gap-1">
                                    <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Header Image */}
                    {form?.header_image_url && (
                        <div className="relative h-48 overflow-hidden">
                            <img src={form.header_image_url} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                        </div>
                    )}

                    <div className="p-6 sm:p-8">
                        {/* Form Title */}
                        <h1 className="text-2xl sm:text-3xl font-bold text-white text-center mb-6">
                            {form?.name || 'Form'}
                        </h1>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {(form?.fields || []).map((field: any) => (
                                <div key={field.id} className="group">
                                    {field.type !== 'checkbox' && (
                                        <label className="block text-sm font-medium text-white/70 mb-2 group-focus-within:text-white transition-colors">
                                            {field.label}
                                            {field.required && <span className="text-red-400 ml-1">*</span>}
                                        </label>
                                    )}

                                    {['text', 'email', 'phone', 'number'].includes(field.type) && (
                                        <input
                                            type={field.type === 'phone' ? 'tel' : field.type}
                                            value={formData[field.id] || ''}
                                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                                            placeholder={field.placeholder || ''}
                                            required={field.required}
                                            className="w-full px-4 py-3.5 bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-purple-500 focus:bg-white/10 focus:shadow-lg focus:shadow-purple-500/10 transition-all"
                                            style={{ borderRadius: getInputRadius() }}
                                        />
                                    )}

                                    {field.type === 'textarea' && (
                                        <textarea
                                            value={formData[field.id] || ''}
                                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                                            placeholder={field.placeholder || ''}
                                            required={field.required}
                                            rows={3}
                                            className="w-full px-4 py-3.5 bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-purple-500 focus:bg-white/10 transition-all resize-none"
                                            style={{ borderRadius: getInputRadius() }}
                                        />
                                    )}

                                    {field.type === 'select' && (
                                        <select
                                            value={formData[field.id] || ''}
                                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                                            required={field.required}
                                            className="w-full px-4 py-3.5 bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500 transition-all cursor-pointer appearance-none"
                                            style={{ borderRadius: getInputRadius() }}
                                        >
                                            <option value="" className="bg-slate-900">Select...</option>
                                            {(field.options || []).map((opt: string, i: number) => (
                                                <option key={i} value={opt} className="bg-slate-900">{opt}</option>
                                            ))}
                                        </select>
                                    )}

                                    {field.type === 'radio' && (
                                        <div className="space-y-2">
                                            {(field.options || []).map((opt: string, i: number) => (
                                                <label
                                                    key={i}
                                                    className={`flex items-center gap-3 p-3.5 bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all ${formData[field.id] === opt ? 'border-purple-500 bg-purple-500/10' : ''}`}
                                                    style={{ borderRadius: getInputRadius() }}
                                                >
                                                    <input
                                                        type="radio"
                                                        name={field.id}
                                                        value={opt}
                                                        checked={formData[field.id] === opt}
                                                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                                                        required={field.required && i === 0}
                                                        className="w-4 h-4"
                                                        style={{ accentColor: buttonColor }}
                                                    />
                                                    <span className="text-white/80">{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {field.type === 'checkbox' && (
                                        <label
                                            className={`flex items-center gap-3 p-3.5 bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all ${formData[field.id] ? 'border-purple-500 bg-purple-500/10' : ''}`}
                                            style={{ borderRadius: getInputRadius() }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={formData[field.id] || false}
                                                onChange={(e) => handleInputChange(field.id, e.target.checked)}
                                                required={field.required}
                                                className="w-4 h-4"
                                                style={{ accentColor: buttonColor }}
                                            />
                                            <span className="text-white/80">{field.label}</span>
                                            {field.required && <span className="text-red-400">*</span>}
                                        </label>
                                    )}
                                </div>
                            ))}

                            {/* Submit Button */}
                            <div className="pt-4">
                                <div className="relative group">
                                    <div
                                        className="absolute inset-0 rounded-2xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity"
                                        style={{ background: buttonColor }}
                                    ></div>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="relative w-full py-4 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                                        style={{
                                            background: `linear-gradient(135deg, ${buttonColor}, ${buttonColor}dd)`,
                                            borderRadius: getBorderRadius(),
                                        }}
                                    >
                                        {submitting ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                Submitting...
                                            </span>
                                        ) : (
                                            form?.submit_button_text || 'Submit'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes gradient-x {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                .animate-gradient-x {
                    background-size: 200% 200%;
                    animation: gradient-x 3s ease infinite;
                }
            `}</style>
        </div>
    );
};

export default FormView;
