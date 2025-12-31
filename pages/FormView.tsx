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

    // Get subscriber info from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const subscriberId = urlParams.get('sid') || '';
    const subscriberName = urlParams.get('sname') || '';

    useEffect(() => {
        loadForm();
    }, [formId]);

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
                console.error('Form fetch error:', fetchError);
            } else {
                setForm(data);
                const initialData: Record<string, any> = {};
                (data.fields || []).forEach((field: any) => {
                    initialData[field.id] = field.type === 'checkbox' ? false : '';
                });
                setFormData(initialData);
            }
        } catch (err) {
            setError('Failed to load form');
            console.error('Form load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (fieldId: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const { error: submitError } = await supabase
                .from('form_submissions')
                .insert({
                    form_id: formId,
                    subscriber_external_id: subscriberId,
                    subscriber_name: subscriberName,
                    data: formData,
                    synced_to_sheets: false,
                });

            if (submitError) throw submitError;

            setSubmitted(true);

            // Close Messenger webview after delay
            if ((window as any).MessengerExtensions) {
                setTimeout(() => {
                    (window as any).MessengerExtensions.requestCloseBrowser(() => { }, () => { });
                }, 2500);
            }
        } catch (err) {
            console.error('Submit error:', err);
            alert('Failed to submit. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const getBorderRadius = () => {
        if (!form) return '16px';
        return form.border_radius === 'full' ? '9999px' : form.border_radius === 'round' ? '20px' : '12px';
    };

    const getInputRadius = () => {
        if (!form) return '12px';
        return form.border_radius === 'full' ? '9999px' : form.border_radius === 'round' ? '14px' : '10px';
    };

    // Loading
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 flex items-center justify-center p-4">
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-10 text-center">
                    <div className="w-14 h-14 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading form...</p>
                </div>
            </div>
        );
    }

    // Error
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-rose-500 via-pink-500 to-purple-600 flex items-center justify-center p-4">
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-10 text-center max-w-sm">
                    <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-5">
                        <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Form Not Found</h1>
                    <p className="text-gray-500">{error}</p>
                </div>
            </div>
        );
    }

    // Success
    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center p-4">
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-10 text-center max-w-sm animate-in fade-in zoom-in duration-300">
                    <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">Thank You!</h2>
                    <p className="text-gray-600 leading-relaxed">
                        {form?.success_message || 'Your response has been submitted successfully.'}
                    </p>
                </div>
            </div>
        );
    }

    // Form
    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 flex items-center justify-center p-4">
            <div
                className="w-full max-w-lg bg-white/95 backdrop-blur-xl shadow-2xl overflow-hidden"
                style={{ borderRadius: getBorderRadius() }}
            >
                {/* Header Image */}
                {form?.header_image_url && (
                    <div className="relative h-48 overflow-hidden">
                        <img
                            src={form.header_image_url}
                            alt=""
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                )}

                <div className="p-8">
                    {/* Form Title */}
                    <h1 className="text-3xl font-bold text-gray-800 text-center mb-8">
                        {form?.name || 'Form'}
                    </h1>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {(form?.fields || []).map((field: any) => (
                            <div key={field.id}>
                                {field.type !== 'checkbox' && (
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        {field.label}
                                        {field.required && <span className="text-red-500 ml-1">*</span>}
                                    </label>
                                )}

                                {/* Text, Email, Phone, Number */}
                                {['text', 'email', 'phone', 'number'].includes(field.type) && (
                                    <input
                                        type={field.type === 'phone' ? 'tel' : field.type}
                                        value={formData[field.id] || ''}
                                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                                        placeholder={field.placeholder || ''}
                                        required={field.required}
                                        className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
                                        style={{ borderRadius: getInputRadius() }}
                                    />
                                )}

                                {/* Textarea */}
                                {field.type === 'textarea' && (
                                    <textarea
                                        value={formData[field.id] || ''}
                                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                                        placeholder={field.placeholder || ''}
                                        required={field.required}
                                        rows={4}
                                        className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:bg-white transition-all resize-none"
                                        style={{ borderRadius: getInputRadius() }}
                                    />
                                )}

                                {/* Select */}
                                {field.type === 'select' && (
                                    <select
                                        value={formData[field.id] || ''}
                                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                                        required={field.required}
                                        className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-200 text-gray-800 focus:outline-none focus:border-purple-500 focus:bg-white transition-all cursor-pointer"
                                        style={{ borderRadius: getInputRadius() }}
                                    >
                                        <option value="">Select an option...</option>
                                        {(field.options || []).map((opt: string, i: number) => (
                                            <option key={i} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                )}

                                {/* Radio */}
                                {field.type === 'radio' && (
                                    <div className="space-y-2">
                                        {(field.options || []).map((opt: string, i: number) => (
                                            <label
                                                key={i}
                                                className="flex items-center gap-3 p-4 bg-gray-50 border-2 border-gray-200 cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition-all"
                                                style={{ borderRadius: getInputRadius() }}
                                            >
                                                <input
                                                    type="radio"
                                                    name={field.id}
                                                    value={opt}
                                                    checked={formData[field.id] === opt}
                                                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                                                    required={field.required && i === 0}
                                                    className="w-5 h-5"
                                                    style={{ accentColor: form?.submit_button_color || '#8b5cf6' }}
                                                />
                                                <span className="text-gray-700">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {/* Checkbox */}
                                {field.type === 'checkbox' && (
                                    <label
                                        className="flex items-center gap-3 p-4 bg-gray-50 border-2 border-gray-200 cursor-pointer hover:bg-gray-100 transition-all"
                                        style={{ borderRadius: getInputRadius() }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData[field.id] || false}
                                            onChange={(e) => handleInputChange(field.id, e.target.checked)}
                                            required={field.required}
                                            className="w-5 h-5"
                                            style={{ accentColor: form?.submit_button_color || '#8b5cf6' }}
                                        />
                                        <span className="text-gray-700">{field.label}</span>
                                        {field.required && <span className="text-red-500">*</span>}
                                    </label>
                                )}
                            </div>
                        ))}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-4 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-6"
                            style={{
                                backgroundColor: form?.submit_button_color || '#8b5cf6',
                                borderRadius: getBorderRadius(),
                                boxShadow: `0 10px 25px -5px ${form?.submit_button_color || '#8b5cf6'}40`
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
                    </form>
                </div>
            </div>
        </div>
    );
};

export default FormView;
