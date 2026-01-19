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
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-200 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200 rounded-full blur-3xl"></div>
            </div>

            <div className="relative max-w-5xl mx-auto p-4 md:p-8">
                {/* Main Card */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">

                    {/* Header Bar */}
                    <div className="bg-white p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100">
                        <div className="flex items-center gap-4">
                            {companyLogo ? (
                                <img src={companyLogo} alt="" className="w-12 h-12 rounded-lg object-contain border border-slate-100 p-1" />
                            ) : (
                                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-2xl">📦</div>
                            )}
                            <div>
                                <h1 className="text-xl font-bold text-slate-800 tracking-tight">{companyName}</h1>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <span>Order <span className="font-mono text-slate-700 font-medium">#{orderNumber}</span></span>
                                    <span>•</span>
                                    <span>{formatDate(new Date(order.created_at))}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <a
                                href={`/api/views/handler?type=invoice&id=${submissionId}&company=${encodeURIComponent(companyName)}&logo=${encodeURIComponent(companyLogo)}&color=${encodeURIComponent(accentColor)}`}
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                            >
                                View Invoice
                            </a>
                        </div>
                    </div>

                    {/* Status Hero Section */}
                    <div className={`p-6 md:p-8 ${currentStep === 4 ? 'bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50' : currentStep === 0 ? 'bg-gradient-to-br from-rose-50 via-red-50 to-orange-50' : 'bg-slate-50/50'}`}>
                        {/* Delivered Celebration */}
                        {currentStep === 4 ? (
                            <div className="text-center py-6 relative overflow-hidden">
                                {/* Confetti Background */}
                                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                    <div className="absolute top-4 left-[10%] w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                    <div className="absolute top-8 left-[25%] w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="absolute top-6 left-[40%] w-4 h-4 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    <div className="absolute top-10 left-[60%] w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                                    <div className="absolute top-4 left-[75%] w-3 h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                    <div className="absolute top-8 left-[90%] w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
                                </div>

                                {/* Success Icon */}
                                <div className="relative z-10 w-24 h-24 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-200">
                                    <span className="text-5xl">🎉</span>
                                </div>

                                {/* Message */}
                                <h2 className="relative z-10 text-3xl md:text-4xl font-bold text-emerald-700 mb-3">
                                    Order Delivered!
                                </h2>
                                <p className="relative z-10 text-emerald-600 text-lg mb-6">
                                    Your package has arrived safely. Enjoy your purchase!
                                </p>

                                {/* Product Images Showcase */}
                                {data.cart && data.cart.length > 0 && (
                                    <div className="relative z-10 flex justify-center gap-3 flex-wrap mt-6">
                                        {data.cart.slice(0, 4).map((item: any, idx: number) => (
                                            <div key={idx} className="relative group">
                                                {item.productImage || item.image ? (
                                                    <img
                                                        src={item.productImage || item.image}
                                                        alt={item.productName || item.name}
                                                        className="w-20 h-20 md:w-24 md:h-24 rounded-xl object-cover border-4 border-white shadow-xl transition-transform hover:scale-105"
                                                    />
                                                ) : (
                                                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-white border-4 border-white shadow-xl flex items-center justify-center">
                                                        <span className="text-3xl">📦</span>
                                                    </div>
                                                )}
                                                {(item.quantity || 1) > 1 && (
                                                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow">
                                                        ×{item.quantity}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                        {data.cart.length > 4 && (
                                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-white/80 border-4 border-white shadow-xl flex items-center justify-center">
                                                <span className="text-lg font-bold text-emerald-600">+{data.cart.length - 4}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Thank You Note */}
                                <div className="relative z-10 mt-8 p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-emerald-100 max-w-md mx-auto">
                                    <p className="text-emerald-700 text-sm">
                                        💝 Thank you for shopping with <strong>{companyName}</strong>! We hope you love your order.
                                    </p>
                                </div>
                            </div>
                        ) : currentStep === 0 ? (
                            /* Cancelled Order View */
                            <div className="text-center py-8">
                                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                                    <span className="text-5xl">🚫</span>
                                </div>
                                <h2 className="text-3xl md:text-4xl font-bold text-red-800 mb-3">
                                    Order Cancelled
                                </h2>
                                <p className="text-red-600 text-lg mb-6 max-w-md mx-auto">
                                    This order has been cancelled. If you have any questions, please contact our support team.
                                </p>
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 rounded-full border border-red-100 text-red-700 text-sm font-medium">
                                    <span>Status updated: {formatDate(new Date())}</span>
                                </div>
                            </div>
                        ) : (
                            /* Normal Status Display */
                            <div className="mb-8">
                                <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
                                    {`Arriving ${formatDate(estimatedDelivery)}`}
                                </h2>
                                <p className="text-slate-500">
                                    {statuses[currentStep > 0 ? currentStep - 1 : 0].description}
                                </p>
                            </div>
                        )}

                        {/* Stepper only for active orders */}
                        {currentStep !== 0 && (
                            <>
                                {/* Horizontal Stepper (Desktop) */}
                                <div className="hidden md:block">
                                    <div className="relative flex justify-between items-center w-full">
                                        {/* Connecting Line */}
                                        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -z-10 -translate-y-1/2 rounded-full"></div>
                                        <div
                                            className="absolute top-1/2 left-0 h-1 bg-green-500 -z-10 -translate-y-1/2 rounded-full transition-all duration-700"
                                            style={{ width: `${((currentStep - 1) / (statuses.length - 1)) * 100}%` }}
                                        ></div>

                                        {statuses.map((status, index) => {
                                            // Logic: 
                                            // 0-indexed index vs 1-indexed currentStep
                                            // If currentStep is 3 (Shipped), index 2 (Shipped) should be ACTIVE (Blue)
                                            // Index 0, 1 should be COMPLETED (Green)

                                            const isCompleted = currentStep > (index + 1);
                                            const isActive = currentStep === (index + 1);

                                            return (
                                                <div key={status.id} className="flex flex-col items-center gap-3 bg-slate-50/50 px-2">
                                                    <div
                                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-300 ${isCompleted
                                                            ? 'bg-green-500 text-white shadow-lg shadow-green-200 scale-110'
                                                            : isActive
                                                                ? 'bg-white border-4 border-indigo-500 text-indigo-600 shadow-lg scale-110'
                                                                : 'bg-white border-4 border-slate-200 text-slate-300'
                                                            }`}
                                                    >
                                                        {isCompleted ? '✓' : index + 1}
                                                    </div>
                                                    <div className="text-center">
                                                        <p className={`text-sm font-bold ${isCompleted || isActive ? 'text-slate-800' : 'text-slate-400'}`}>{status.label}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Vertical Stepper (Mobile) */}
                                <div className="md:hidden space-y-6 pl-4 border-l-2 border-slate-200 ml-2">
                                    {statuses.map((status, index) => {
                                        const isCompleted = currentStep > (index + 1);
                                        const isActive = currentStep === (index + 1);

                                        return (
                                            <div key={status.id} className="relative pl-6">
                                                <div
                                                    className={`absolute -left-[21px] top-0 w-10 h-10 rounded-full flex items-center justify-center text-sm border-4 transition-colors ${isCompleted
                                                        ? 'bg-green-500 border-white text-white'
                                                        : isActive
                                                            ? 'bg-white border-indigo-500 text-indigo-600'
                                                            : 'bg-white border-slate-200 text-slate-300'
                                                        }`}
                                                >
                                                    {isCompleted ? '✓' : index + 1}
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-bold ${isCompleted || isActive ? 'text-slate-800' : 'text-slate-400'}`}>{status.label}</p>
                                                    {isActive && <p className="text-xs text-slate-500 mt-1">{status.description}</p>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}

                    </div>

                    {/* Content Grid */}
                    <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                        {/* Left: Shipment Details */}
                        <div className="md:col-span-2 p-6 md:p-8 space-y-8">
                            {/* Tracking Button & Carrier */}
                            {data.tracking && (
                                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Carrier</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-bold text-slate-800">{data.tracking.carrier}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tracking Number</p>
                                            <p className="text-lg font-mono font-bold text-slate-700 select-all">{data.tracking.trackingNumber}</p>
                                        </div>
                                    </div>

                                    {data.tracking.trackingUrl && (
                                        <a
                                            href={data.tracking.trackingUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block w-full text-center py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-all shadow-sm"
                                        >
                                            Track on {data.tracking.carrier} website
                                        </a>
                                    )}

                                    {data.tracking.notes && (
                                        <div className="mt-4 pt-4 border-t border-slate-200">
                                            <p className="text-sm text-slate-600">
                                                <span className="font-semibold mr-2">Note from sender:</span>
                                                {data.tracking.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Detailed Timeline - Order Activity */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-4">Order Activity</h3>
                                <div className="space-y-6">
                                    {/* Current Status - use currentStep-1 because array is 0-indexed but steps are 1-indexed */}
                                    <div className="flex gap-4">
                                        <div className="flex flex-col items-center">
                                            <div className="w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-indigo-50"></div>
                                            <div className="w-0.5 h-full bg-slate-100 mt-2"></div>
                                        </div>
                                        <div className="pb-6">
                                            <p className="text-sm font-bold text-slate-800">
                                                {currentStep === 0 ? 'Cancelled' : (statuses[currentStep - 1]?.label || 'Processing')}
                                            </p>
                                            <p className="text-sm text-slate-500 mt-0.5">
                                                {currentStep === 0 ? 'Order has been cancelled' : (statuses[currentStep - 1]?.description || 'Order is being processed')}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">{new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' })}</p>
                                        </div>
                                    </div>

                                    {/* Previous Statuses - slice from 0 to currentStep-1 to get completed steps */}
                                    {currentStep > 1 && statuses.slice(0, currentStep - 1).reverse().map((status) => (
                                        <div key={status.id} className="flex gap-4 opacity-70">
                                            <div className="flex flex-col items-center">
                                                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                                <div className="w-0.5 h-full bg-slate-100 mt-2"></div>
                                            </div>
                                            <div className="pb-6">
                                                <p className="text-sm font-medium text-slate-700">{status.label}</p>
                                                <p className="text-xs text-slate-400 mt-1">{formatDate(status.date || new Date())}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right: Summary */}
                        <div className="p-6 md:p-8 bg-slate-50/30">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6">Order Summary</h3>

                            {/* Address */}
                            <div className="mb-8">
                                <h4 className="text-xs font-semibold text-slate-500 mb-2">Delivery Address</h4>
                                <p className="text-sm font-medium text-slate-800">{customerName}</p>
                                <p className="text-sm text-slate-600 mt-1 leading-relaxed">{data.address}</p>
                                {data.phone && <p className="text-sm text-slate-600 mt-1">{data.phone}</p>}
                            </div>

                            {/* Items with Product Images */}
                            <div className="mb-8">
                                <h4 className="text-xs font-semibold text-slate-500 mb-3">Items</h4>
                                <div className="space-y-3">
                                    {(data.cart && data.cart.length > 0) ? (
                                        data.cart.map((item: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-white border border-slate-100 shadow-sm">
                                                {/* Product Image */}
                                                {item.productImage || item.image ? (
                                                    <img
                                                        src={item.productImage || item.image}
                                                        alt={item.productName || item.name}
                                                        className="w-14 h-14 rounded-lg object-cover border border-slate-100 flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-2xl">📦</span>
                                                    </div>
                                                )}
                                                {/* Product Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-slate-800 font-medium line-clamp-1">{item.productName || item.name}</p>
                                                    <p className="text-xs text-slate-500">Qty: {item.quantity || 1}</p>
                                                </div>
                                                {/* Price */}
                                                <p className="text-sm font-bold text-slate-900 flex-shrink-0">
                                                    {currencySymbol}{((item.productPrice || item.price || 0) * (item.quantity || 1)).toLocaleString()}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex justify-between">
                                            <span className="text-sm text-slate-700">{productName}</span>
                                            <span className="text-sm font-medium text-slate-900">{currencySymbol}{total.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="border-t border-slate-200 pt-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Subtotal</span>
                                    <span className="text-slate-700 font-medium">{currencySymbol}{(data.subtotal || total).toLocaleString()}</span>
                                </div>
                                {data.shipping_fee > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Shipping</span>
                                        <span className="text-slate-700 font-medium">{currencySymbol}{data.shipping_fee.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-base pt-2 border-t border-slate-200 mt-2">
                                    <span className="font-bold text-slate-800">Total</span>
                                    <span className="font-bold text-indigo-600">{currencySymbol}{total.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderTracking;
