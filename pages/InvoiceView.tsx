import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const InvoiceView: React.FC = () => {
    const { submissionId } = useParams<{ submissionId: string }>();
    const [invoice, setInvoice] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState<'pdf' | 'image' | null>(null);
    const invoiceRef = useRef<HTMLDivElement>(null);

    const urlParams = new URLSearchParams(window.location.search);
    const companyName = urlParams.get('company') || 'Your Company';
    const companyLogo = urlParams.get('logo') || '';
    const accentColor = urlParams.get('color') || '#6366f1';

    useEffect(() => {
        loadInvoice();
    }, [submissionId]);

    const loadInvoice = async () => {
        if (!submissionId) {
            console.error('[InvoiceView] No submission ID in URL');
            setError('No invoice ID provided');
            setLoading(false);
            return;
        }

        try {
            console.log('[InvoiceView] Loading invoice for submission:', submissionId);
            console.log('[InvoiceView] Full URL:', window.location.href);

            const { data: submission, error: fetchError } = await supabase
                .from('form_submissions')
                .select('*, forms(*)')
                .eq('id', submissionId)
                .single();

            if (fetchError) {
                console.error('[InvoiceView] Supabase error:', fetchError);
                console.error('[InvoiceView] Error code:', fetchError.code);
                console.error('[InvoiceView] Error details:', fetchError.details);
                setError(`Invoice not found (${fetchError.code || 'unknown error'})`);
                setLoading(false);
                return;
            }

            if (!submission) {
                console.error('[InvoiceView] No submission data returned');
                setError('Invoice not found');
                setLoading(false);
                return;
            }

            console.log('[InvoiceView] Submission loaded:', submission);
            console.log('[InvoiceView] Form data fields:', Object.keys(submission.data || {}));
            setInvoice(submission);
        } catch (err: any) {
            console.error('[InvoiceView] Exception:', err);
            setError('Failed to load invoice: ' + (err.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const getCurrencySymbol = (currency: string) => {
        const symbols: Record<string, string> = {
            PHP: '₱',
            USD: '$',
            EUR: '€',
            GBP: '£',
            JPY: '¥'
        };
        return symbols[currency] || '₱';
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleDownloadImage = async () => {
        if (!invoiceRef.current) return;
        setDownloading('image');

        try {
            // Dynamically import html2canvas
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(invoiceRef.current, {
                backgroundColor: '#ffffff',
                scale: 2
            });

            const link = document.createElement('a');
            link.download = `invoice-${submissionId}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Download error:', err);
            alert('Failed to download image');
        } finally {
            setDownloading(null);
        }
    };

    const handleDownloadPdf = async () => {
        if (!invoiceRef.current) return;
        setDownloading('pdf');

        try {
            // Dynamically import libraries
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');

            const canvas = await html2canvas(invoiceRef.current, {
                backgroundColor: '#ffffff',
                scale: 2
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`invoice-${submissionId}.pdf`);
        } catch (err) {
            console.error('PDF download error:', err);
            alert('Failed to download PDF');
        } finally {
            setDownloading(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-sm">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">❌</span>
                    </div>
                    <h1 className="text-xl font-bold text-gray-800 mb-2">Invoice Not Found</h1>
                    <p className="text-gray-500">{error || 'This invoice does not exist or has expired.'}</p>
                </div>
            </div>
        );
    }

    const data = invoice.data || {};
    const form = invoice.forms || {};
    const productName = data.product_name || form.product_name || 'Product';
    const productPrice = data.product_price || form.product_price || 0;
    const quantity = data.quantity || 1;
    const total = data.total || (productPrice * quantity);
    const currency = data.currency || form.currency || 'PHP';
    const currencySymbol = getCurrencySymbol(currency);
    const paymentMethod = data.payment_method === 'cod' ? 'Cash on Delivery' : (data.ewallet_selected || 'E-Wallet');
    const invoiceNumber = `INV-${submissionId?.slice(0, 8).toUpperCase() || 'UNKNOWN'}`;

    // Extract customer name from form data fields - look for common name fields
    const customerName = data.name
        || data.full_name
        || data.customer_name
        || data.buyer_name
        || data['Full Name']
        || data['Name']
        || data.subscriber_name
        || invoice.subscriber_name
        || 'Customer';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50 p-4 py-6">
            {/* Subtle background pattern */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-200 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200 rounded-full blur-3xl"></div>
            </div>

            <div className="relative max-w-md mx-auto">
                {/* Download Actions - Fixed at top */}
                <div className="flex justify-center gap-3 mb-4 flex-wrap">
                    <a
                        href={`/track/${submissionId}?company=${encodeURIComponent(companyName)}&logo=${encodeURIComponent(companyLogo)}&color=${encodeURIComponent(accentColor)}`}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-md text-white font-medium hover:from-indigo-600 hover:to-purple-700 transition"
                    >
                        <span>📦</span>
                        <span>Track Order</span>
                    </a>
                    <button
                        onClick={handleDownloadImage}
                        disabled={downloading !== null}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-md border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50"
                    >
                        {downloading === 'image' ? (
                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <span>🖼️</span>
                        )}
                        <span>Save Image</span>
                    </button>
                    <button
                        onClick={handleDownloadPdf}
                        disabled={downloading !== null}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-md border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50"
                    >
                        {downloading === 'pdf' ? (
                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <span>📄</span>
                        )}
                        <span>Save PDF</span>
                    </button>
                </div>

                {/* Invoice Card */}
                <div ref={invoiceRef} className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
                    {/* Header with accent color */}
                    <div
                        className="px-6 py-5 text-white"
                        style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)` }}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {companyLogo ? (
                                    <img src={companyLogo} alt="" className="w-12 h-12 rounded-lg object-cover bg-white/20" />
                                ) : (
                                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                        <span className="text-2xl">🧾</span>
                                    </div>
                                )}
                                <div>
                                    <h1 className="text-xl font-bold">{companyName}</h1>
                                    <p className="text-white/80 text-sm">Official Invoice</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-white/80 text-xs uppercase tracking-wider">Invoice</div>
                                <div className="font-mono text-sm">{invoiceNumber}</div>
                            </div>
                        </div>
                    </div>

                    {/* Order Status */}
                    <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">✅</span>
                                <span className="font-semibold text-green-700">Order Confirmed</span>
                            </div>
                            <span className="text-sm text-gray-500">{formatDate(invoice.created_at)}</span>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-2">Customer</h3>
                        <p className="font-semibold text-gray-800">{customerName}</p>
                        {data.email && <p className="text-gray-500 text-sm">{data.email}</p>}
                        {data.phone && <p className="text-gray-500 text-sm">{data.phone}</p>}
                        {(data.address || data.full_address) && (
                            <p className="text-gray-500 text-sm mt-1">{data.address || data.full_address}</p>
                        )}
                    </div>

                    {/* Order Items */}
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-3">Order Details</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-800">{productName}</p>
                                    <p className="text-sm text-gray-500">Qty: {quantity}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-gray-800">
                                        {currencySymbol}{productPrice.toLocaleString()}
                                    </p>
                                    {quantity > 1 && (
                                        <p className="text-xs text-gray-400">
                                            × {quantity} = {currencySymbol}{(productPrice * quantity).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Summary */}
                    <div className="px-6 py-4 bg-gray-50">
                        <div className="flex justify-between items-center mb-2 text-sm">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="text-gray-700">{currencySymbol}{(productPrice * quantity).toLocaleString()}</span>
                        </div>
                        {data.coupon_applied && (
                            <div className="flex justify-between items-center mb-2 text-sm">
                                <span className="text-green-600">Discount ({data.coupon_applied})</span>
                                <span className="text-green-600">-{currencySymbol}{((productPrice * quantity) - total).toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                            <span className="font-bold text-gray-800">Total</span>
                            <span className="text-2xl font-bold" style={{ color: accentColor }}>
                                {currencySymbol}{total.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="px-6 py-4 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{data.payment_method === 'cod' ? '💵' : '📱'}</span>
                                <div>
                                    <p className="text-sm text-gray-500">Payment Method</p>
                                    <p className="font-medium text-gray-800">{paymentMethod}</p>
                                </div>
                            </div>
                            {data.proof_url && (
                                <a
                                    href={data.proof_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-indigo-600 hover:text-indigo-800"
                                >
                                    View Proof
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-center">
                        <p className="text-xs text-gray-400">Thank you for your order!</p>
                        <p className="text-xs text-gray-400 mt-1">Questions? Contact {companyName}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceView;
