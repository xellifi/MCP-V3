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
                // Initialize form data
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

            if (submitError) {
                throw submitError;
            }

            setSubmitted(true);

            // Try to close Messenger webview
            if ((window as any).MessengerExtensions) {
                setTimeout(() => {
                    (window as any).MessengerExtensions.requestCloseBrowser(
                        () => { },
                        () => { }
                    );
                }, 2000);
            }
        } catch (err) {
            console.error('Submit error:', err);
            alert('Failed to submit form. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // Get border radius style
    const getBorderRadius = () => {
        if (!form) return '8px';
        return form.border_radius === 'full' ? '9999px' : form.border_radius === 'round' ? '16px' : '8px';
    };

    const getInputRadius = () => {
        if (!form) return '8px';
        return form.border_radius === 'full' ? '24px' : form.border_radius === 'round' ? '12px' : '8px';
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-5">
                <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading form...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-500 via-pink-500 to-purple-500 flex items-center justify-center p-5">
                <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Form Not Found</h1>
                    <p className="text-slate-600">{error}</p>
                </div>
            </div>
        );
    }

    // Success state
    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-5">
                <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md" style={{ borderRadius: getBorderRadius() }}>
                    <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <p className="text-lg text-slate-700 leading-relaxed">
                        {form?.success_message || 'Thank you for your submission!'}
                    </p>
                </div>
            </div>
        );
    }

    // Form fields renderer
    const renderField = (field: any) => {
        const baseInputStyle = {
            width: '100%',
            padding: '14px 18px',
            border: '2px solid #e2e8f0',
            borderRadius: getInputRadius(),
            fontSize: '16px',
            backgroundColor: '#fff',
            transition: 'all 0.2s',
            outline: 'none',
        };

        switch (field.type) {
            case 'textarea':
                return (
                    <textarea
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        placeholder={field.placeholder || ''}
                        required={field.required}
                        rows={4}
                        style={baseInputStyle}
                        className="focus:border-purple-500 focus:ring-2 focus:ring-purple-200 resize-y"
                    />
                );

            case 'select':
                return (
                    <select
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        required={field.required}
                        style={{ ...baseInputStyle, cursor: 'pointer' }}
                        className="focus:border-purple-500"
                    >
                        <option value="">Select...</option>
                        {(field.options || []).map((opt: string, i: number) => (
                            <option key={i} value={opt}>{opt}</option>
                        ))}
                    </select>
                );

            case 'radio':
                return (
                    <div className="space-y-2">
                        {(field.options || []).map((opt: string, i: number) => (
                            <label
                                key={i}
                                className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                                style={{ borderRadius: getInputRadius() }}
                            >
                                <input
                                    type="radio"
                                    name={field.id}
                                    value={opt}
                                    checked={formData[field.id] === opt}
                                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                                    required={field.required && i === 0}
                                    className="w-5 h-5 accent-purple-500"
                                />
                                <span className="text-slate-700">{opt}</span>
                            </label>
                        ))}
                    </div>
                );

            case 'checkbox':
                return (
                    <label
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
                        style={{ borderRadius: getInputRadius() }}
                    >
                        <input
                            type="checkbox"
                            checked={formData[field.id] || false}
                            onChange={(e) => handleInputChange(field.id, e.target.checked)}
                            required={field.required}
                            className="w-5 h-5 accent-purple-500"
                        />
                        <span className="text-slate-700">{field.label}</span>
                    </label>
                );

            default:
                const inputType = field.type === 'phone' ? 'tel' : field.type;
                return (
                    <input
                        type={inputType}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        placeholder={field.placeholder || ''}
                        required={field.required}
                        style={baseInputStyle}
                        className="focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                    />
                );
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-5">
            <div
                className="w-full max-w-md bg-white shadow-2xl"
                style={{ borderRadius: getBorderRadius() }}
            >
                {/* Header Image */}
                {form?.header_image_url && (
                    <div className="overflow-hidden" style={{ borderRadius: `${getBorderRadius()} ${getBorderRadius()} 0 0` }}>
                        <img
                            src={form.header_image_url}
                            alt=""
                            className="w-full h-44 object-cover"
                        />
                    </div>
                )}

                <div className="p-6">
                    {/* Form Title */}
                    <h1 className="text-2xl font-bold text-slate-800 text-center mb-6">
                        {form?.name || 'Form'}
                    </h1>

                    {/* Form Fields */}
                    <form onSubmit={handleSubmit}>
                        {(form?.fields || []).map((field: any) => (
                            <div key={field.id} className="mb-5">
                                {field.type !== 'checkbox' && (
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        {field.label}
                                        {field.required && <span className="text-red-500 ml-1">*</span>}
                                    </label>
                                )}
                                {renderField(field)}
                            </div>
                        ))}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-4 text-white font-semibold text-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                            style={{
                                backgroundColor: form?.submit_button_color || '#6366f1',
                                borderRadius: getBorderRadius(),
                            }}
                        >
                            {submitting ? 'Submitting...' : (form?.submit_button_text || 'Submit')}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default FormView;
