import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const OrderTracking: React.FC = () => {
    const { submissionId } = useParams<{ submissionId: string }>();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const urlParams = new URLSearchParams(window.location.search);
    const companyName = urlParams.get('company') || 'Your Company';
    const companyLogo = urlParams.get('logo') || '';
    const accentColor = urlParams.get('color') || '#6366f1';

    useEffect(() => {
        loadOrder();
    }, [submissionId]);

    const loadOrder = async () => {
        if (!submissionId) {
            setError('No order ID provided');
            setLoading(false);
            return;
        }

        try {
            const { data: submission, error: fetchError } = await supabase
                .from('form_submissions')
                .select('*, forms(*)')
                .eq('id', submissionId)
                .single();

            if (fetchError || !submission) {
                setError('Order not found');
                setLoading(false);
                return;
            }

            setOrder(submission);
        } catch (err: any) {
            setError('Failed to load order');
        } finally {
            setLoading(false);
        }
    };

    // Calculate order status based on created_at date
    const getOrderStatus = () => {
        if (!order) return { step: 0, statuses: [] };

        const created = new Date(order.created_at);
        const now = new Date();
        const daysSinceOrder = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

        const statuses = [
            { id: 1, label: 'Order Placed', icon: '📦', description: 'We received your order', completed: true, date: created },
            { id: 2, label: 'Confirmed', icon: '✅', description: 'Order has been confirmed', completed: daysSinceOrder >= 1, date: new Date(created.getTime() + 1 * 24 * 60 * 60 * 1000) },
            { id: 3, label: 'Shipped', icon: '🚚', description: 'Package is on the way', completed: daysSinceOrder >= 2, date: new Date(created.getTime() + 2 * 24 * 60 * 60 * 1000) },
            { id: 4, label: 'Delivered', icon: '🎉', description: 'Package delivered successfully', completed: daysSinceOrder >= 5, date: new Date(created.getTime() + 5 * 24 * 60 * 60 * 1000) },
        ];

        const currentStep = statuses.filter(s => s.completed).length;
        return { step: currentStep, statuses };
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getCurrencySymbol = (currency: string) => {
        const symbols: Record<string, string> = { PHP: '₱', USD: '$', EUR: '€', GBP: '£', JPY: '¥' };
        return symbols[currency] || '₱';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-sm">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">❌</span>
                    </div>
                    <h1 className="text-xl font-bold text-gray-800 mb-2">Order Not Found</h1>
                    <p className="text-gray-500">{error || 'This order does not exist.'}</p>
                </div>
            </div>
        );
    }

    const { step: currentStep, statuses } = getOrderStatus();
    const data = order.data || {};
    const form = order.forms || {};
    const productName = data.product_name || form.product_name || 'Product';
    const total = data.total || (data.product_price || form.product_price || 0) * (data.quantity || 1);
    const currency = data.currency || form.currency || 'PHP';
    const currencySymbol = getCurrencySymbol(currency);
    const customerName = data.name || data.full_name || data['Full Name'] || 'Customer';
    const orderNumber = `ORD-${submissionId?.slice(0, 8).toUpperCase()}`;
    const estimatedDelivery = new Date(new Date(order.created_at).getTime() + 5 * 24 * 60 * 60 * 1000);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50">
            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-200 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200 rounded-full blur-3xl"></div>
            </div>

            <div className="relative max-w-md mx-auto p-4 py-6">
                {/* Header */}
                <div
                    className="rounded-2xl p-6 text-white mb-6 shadow-xl"
                    style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)` }}
                >
                    <div className="flex items-center gap-3 mb-4">
                        {companyLogo ? (
                            <img src={companyLogo} alt="" className="w-12 h-12 rounded-lg object-cover bg-white/20" />
                        ) : (
                            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">📦</span>
                            </div>
                        )}
                        <div>
                            <h1 className="text-xl font-bold">{companyName}</h1>
                            <p className="text-white/80 text-sm">Order Tracking</p>
                        </div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-white/70 text-xs uppercase tracking-wider">Order Number</p>
                                <p className="font-mono font-bold">{orderNumber}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-white/70 text-xs uppercase tracking-wider">Est. Delivery</p>
                                <p className="font-semibold">{formatDate(estimatedDelivery)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tracking Timeline */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Tracking Status</h2>

                    <div className="relative">
                        {statuses.map((status, index) => (
                            <div key={status.id} className="flex gap-4 pb-8 last:pb-0">
                                {/* Timeline line */}
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all duration-500 ${status.completed
                                            ? 'bg-green-500 text-white shadow-lg shadow-green-200'
                                            : index === currentStep
                                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200 animate-pulse'
                                                : 'bg-gray-100 text-gray-400'
                                            }`}
                                    >
                                        {status.completed ? '✓' : status.icon}
                                    </div>
                                    {index < statuses.length - 1 && (
                                        <div
                                            className={`w-0.5 flex-1 mt-2 transition-all duration-500 ${status.completed ? 'bg-green-500' : 'bg-gray-200'
                                                }`}
                                        ></div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 pt-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className={`font-semibold ${status.completed ? 'text-gray-800' : 'text-gray-400'}`}>
                                                {status.label}
                                            </p>
                                            <p className={`text-sm ${status.completed ? 'text-gray-500' : 'text-gray-300'}`}>
                                                {status.description}
                                            </p>
                                        </div>
                                        <span className={`text-xs ${status.completed ? 'text-gray-400' : 'text-gray-300'}`}>
                                            {status.completed ? formatDate(status.date) : 'Pending'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Order Summary */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Order Summary</h2>

                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Product</span>
                            <span className="font-medium text-gray-800">{productName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Customer</span>
                            <span className="font-medium text-gray-800">{customerName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Quantity</span>
                            <span className="font-medium text-gray-800">{data.quantity || 1}</span>
                        </div>
                        <div className="border-t border-gray-100 pt-3 flex justify-between">
                            <span className="font-bold text-gray-800">Total</span>
                            <span className="font-bold text-lg" style={{ color: accentColor }}>
                                {currencySymbol}{total.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Back to Invoice */}
                <a
                    href={`/invoice/${submissionId}?company=${encodeURIComponent(companyName)}&logo=${encodeURIComponent(companyLogo)}&color=${encodeURIComponent(accentColor)}`}
                    className="block mt-6 text-center text-indigo-600 hover:text-indigo-800 font-medium"
                >
                    ← Back to Invoice
                </a>
            </div>
        </div>
    );
};

export default OrderTracking;
