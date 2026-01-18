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
            console.log('[OrderTracking] Loading order:', submissionId);
            let orderData: any = null;

            // STEP 1: Check orders table first (webview checkout orders start with "ORD-")
            if (submissionId.startsWith('ORD-')) {
                console.log('[OrderTracking] Checking orders table...');
                const { data: orderRow, error: orderError } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('id', submissionId)
                    .single();

                if (!orderError && orderRow) {
                    console.log('[OrderTracking] Found order:', orderRow.id);
                    // Transform order to tracking-compatible format
                    orderData = {
                        id: orderRow.id,
                        created_at: orderRow.created_at,
                        data: {
                            name: orderRow.customer_name,
                            phone: orderRow.customer_phone,
                            email: orderRow.customer_email,
                            address: orderRow.customer_address,
                            cart: orderRow.items || [],
                            total: orderRow.total,
                            subtotal: orderRow.subtotal,
                            shipping_fee: orderRow.shipping_fee,
                            order_status: orderRow.status,
                            payment_method: orderRow.payment_method,
                            payment_method_name: orderRow.payment_method_name,
                            currency: orderRow.metadata?.currency || 'PHP',
                            tracking: orderRow.metadata?.tracking || null
                        },
                        forms: {},
                        source: 'order'
                    };
                }
            }

            // STEP 2: If not found in orders, try form_submissions table
            if (!orderData) {
                console.log('[OrderTracking] Checking form_submissions table...');
                const { data: submission, error: fetchError } = await supabase
                    .from('form_submissions')
                    .select('*, forms(*)')
                    .eq('id', submissionId)
                    .single();

                if (!fetchError && submission) {
                    console.log('[OrderTracking] Found form submission:', submission.id);
                    orderData = submission;
                    orderData.source = 'form_submission';
                }
            }

            if (!orderData) {
                setError('Order not found');
                setLoading(false);
                return;
            }

            console.log('[OrderTracking] Order loaded from:', orderData.source);
            setOrder(orderData);
        } catch (err: any) {
            console.error('[OrderTracking] Error:', err);
            setError('Failed to load order');
        } finally {
            setLoading(false);
        }
    };

    // Get order status from actual database status or legacy day-based calculation
    const getOrderStatus = () => {
        if (!order) return { step: 0, statuses: [] };

        const created = new Date(order.created_at);
        const now = new Date();

        // Get actual status from data if available
        const actualStatus = order.data?.order_status || order.status || 'pending';

        // Map status to step number
        const statusToStep: Record<string, number> = {
            'pending': 1,
            'confirmed': 2,
            'processing': 2,
            'shipped': 3,
            'delivered': 4,
            'cancelled': 0
        };

        const currentStep = statusToStep[actualStatus] || 1;

        const statuses = [
            { id: 1, label: 'Order Placed', icon: '📦', description: 'We received your order', completed: currentStep >= 1, date: created },
            { id: 2, label: 'Confirmed', icon: '✅', description: 'Order has been confirmed', completed: currentStep >= 2, date: currentStep >= 2 ? new Date() : null },
            { id: 3, label: 'Shipped', icon: '🚚', description: 'Package is on the way', completed: currentStep >= 3, date: currentStep >= 3 ? new Date() : null },
            { id: 4, label: 'Delivered', icon: '🎉', description: 'Package delivered successfully', completed: currentStep >= 4, date: currentStep >= 4 ? new Date() : null },
        ];

        return { step: currentStep, statuses, isCancelled: actualStatus === 'cancelled' };
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

            <div className="relative max-w-7xl mx-auto p-4 py-8">
                {/* Header */}
                <div
                    className="rounded-xl p-6 text-white mb-8 shadow-lg relative overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)` }}
                >
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            {companyLogo ? (
                                <img src={companyLogo} alt="" className="w-14 h-14 rounded-lg object-cover bg-white/20 shadow-sm" />
                            ) : (
                                <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                    <span className="text-2xl">📦</span>
                                </div>
                            )}
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">{companyName}</h1>
                                <p className="text-white/80 text-sm font-medium">Order Tracking</p>
                            </div>
                        </div>

                        <div className="flex gap-8 bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/10">
                            <div>
                                <p className="text-white/60 text-[10px] uppercase tracking-wider font-semibold mb-1">Order No.</p>
                                <p className="font-mono font-bold text-lg tracking-wide">{orderNumber}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-white/60 text-[10px] uppercase tracking-wider font-semibold mb-1">Est. Delivery</p>
                                <p className="font-bold text-lg">{formatDate(estimatedDelivery)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    {/* Column 1: Tracking Timeline */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6 flex items-center gap-2">
                            <span>📍</span> Tracking Status
                        </h2>

                        <div className="relative pl-2">
                            {statuses.map((status, index) => (
                                <div key={status.id} className="flex gap-4 pb-8 last:pb-0 group">
                                    {/* Timeline line */}
                                    <div className="flex flex-col items-center relative">
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all duration-500 z-10 ${status.completed
                                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                                                : index === currentStep
                                                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-200 ring-4 ring-indigo-50'
                                                    : 'bg-slate-100 text-slate-400'
                                                }`}
                                        >
                                            {status.completed ? '✓' : status.icon}
                                        </div>
                                        {index < statuses.length - 1 && (
                                            <div
                                                className={`w-0.5 flex-1 absolute top-8 bottom-0 transition-all duration-500 ${status.completed ? 'bg-emerald-500' : 'bg-slate-100'
                                                    }`}
                                            ></div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 pt-1">
                                        <div className="flex justify-between items-start gap-4">
                                            <div>
                                                <p className={`text-sm font-semibold transition-colors ${status.completed ? 'text-slate-800' : 'text-slate-400'}`}>
                                                    {status.label}
                                                </p>
                                                <p className={`text-xs mt-0.5 ${status.completed ? 'text-slate-500' : 'text-slate-300'}`}>
                                                    {status.description}
                                                </p>
                                            </div>
                                            <span className={`text-[10px] font-medium whitespace-nowrap px-2 py-0.5 rounded-full ${status.completed ? 'bg-emerald-50 text-emerald-600' : 'text-slate-300'
                                                }`}>
                                                {status.completed ? formatDate(status.date) : 'Pending'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Column 2: Courier Details */}
                    <div className="space-y-6">
                        {data.tracking && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-5 flex items-center gap-2">
                                    <span>🚚</span> Shipment Details
                                </h2>

                                <div className="space-y-4">
                                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                                        <div className="grid gap-4">
                                            <div>
                                                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">Carrier</span>
                                                <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                    {data.tracking.carrier}
                                                    <span className="text-xs font-normal text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">Express</span>
                                                </span>
                                            </div>
                                            <div className="pt-3 border-t border-slate-200/60">
                                                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">Tracking Number</span>
                                                <span className="font-mono text-sm font-bold text-slate-800 tracking-wider">
                                                    {data.tracking.trackingNumber}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {data.tracking.notes && (
                                        <div className="bg-amber-50 rounded-lg p-3 border border-amber-100/50">
                                            <p className="text-xs text-amber-800 flex items-start gap-2 leading-relaxed">
                                                <span className="mt-0.5">📝</span>
                                                <span>{data.tracking.notes}</span>
                                            </p>
                                        </div>
                                    )}

                                    {data.tracking.trackingUrl && (
                                        <a
                                            href={data.tracking.trackingUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-3 px-4 rounded-lg transition-all shadow-sm hover:shadow-md"
                                        >
                                            <span>Track on {data.tracking.carrier} Site</span>
                                            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                                        </a>
                                    )}

                                    {data.tracking.notifiedAt && (
                                        <p className="text-[10px] text-slate-400 text-center font-medium">
                                            Last Updated: {new Date(data.tracking.notifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Mobile Back Button */}
                        <a
                            href={`/invoice/${submissionId}?company=${encodeURIComponent(companyName)}&logo=${encodeURIComponent(companyLogo)}&color=${encodeURIComponent(accentColor)}`}
                            className="flex md:hidden items-center justify-center gap-2 text-sm text-slate-500 hover:text-indigo-600 font-medium py-2 transition-colors"
                        >
                            <span>←</span> Back to Invoice
                        </a>
                    </div>

                    {/* Column 3: Order Summary */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-5 flex items-center gap-2">
                            <span>📄</span> Order Summary
                        </h2>

                        <div className="space-y-5">
                            {/* Customer Info */}
                            <div className="pb-4 border-b border-slate-100 space-y-3">
                                <div className="flex justify-between items-start">
                                    <span className="text-xs text-slate-500 font-medium">Customer</span>
                                    <div className="text-right">
                                        <span className="text-sm font-semibold text-slate-800 block">{customerName}</span>
                                        {data.phone && <span className="text-xs text-slate-500 block mt-0.5">{data.phone}</span>}
                                    </div>
                                </div>

                                {data.address && (
                                    <div className="flex justify-between items-start pt-1">
                                        <span className="text-xs text-slate-500 font-medium">Delivering to</span>
                                        <span className="text-xs text-slate-700 font-medium text-right max-w-[60%] leading-relaxed">
                                            {data.address}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Order Items */}
                            <div className="pb-4 border-b border-slate-100">
                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-3">Items Purchased</p>
                                <div className="space-y-2.5">
                                    {(data.cart && data.cart.length > 0) ? (
                                        data.cart.map((item: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center text-sm">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <div className="w-1 h-1 rounded-full bg-slate-300 shrink-0"></div>
                                                    <span className="text-slate-700 truncate">{item.productName || item.name}</span>
                                                    <span className="text-xs text-slate-400 font-medium shrink-0">×{item.quantity || 1}</span>
                                                </div>
                                                <span className="font-medium text-slate-900 shrink-0">
                                                    {currencySymbol}{((item.productPrice || item.price || 0) * (item.quantity || 1)).toLocaleString()}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-700">{productName}</span>
                                            <span className="font-medium text-slate-900">{currencySymbol}{total.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="space-y-2">
                                {data.shipping_fee !== undefined && data.shipping_fee > 0 && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">Shipping Fee</span>
                                        <span className="text-slate-700 font-medium">{currencySymbol}{data.shipping_fee.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-end pt-2">
                                    <span className="text-sm font-bold text-slate-800">Total Amount</span>
                                    <span className="text-xl font-bold tracking-tight" style={{ color: accentColor }}>
                                        {currencySymbol}{total.toLocaleString()}
                                    </span>
                                </div>
                                {data.payment_method_name && (
                                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-50">
                                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Paid via</span>
                                        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">{data.payment_method_name}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Back Link (Desktop) */}
                        <a
                            href={`/invoice/${submissionId}?company=${encodeURIComponent(companyName)}&logo=${encodeURIComponent(companyLogo)}&color=${encodeURIComponent(accentColor)}`}
                            className="hidden md:flex items-center justify-center gap-2 mt-6 text-xs text-slate-400 hover:text-indigo-600 font-medium transition-colors border-t border-slate-50 pt-4"
                        >
                            <span>←</span> Return to Invoice
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderTracking;
