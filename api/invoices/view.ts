import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Invoice View API - Server-side rendered invoice page
 * This works in mobile browsers including Messenger's in-app browser
 * because it returns complete HTML without relying on React Router
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;
    const company = (req.query.company as string) || 'Your Company';
    const color = (req.query.color as string) || '#6366f1';
    const logo = (req.query.logo as string) || '';
    const companyAddress = (req.query.address as string) || '';

    console.log('[Invoice View] Loading invoice:', id);

    if (!id || typeof id !== 'string') {
        return res.status(400).send(renderError('No invoice ID provided'));
    }

    try {
        const { data: submission, error } = await supabase
            .from('form_submissions')
            .select('*, forms(*)')
            .eq('id', id)
            .single();

        if (error || !submission) {
            console.error('[Invoice View] Error:', error);
            return res.status(404).send(renderError('Invoice not found'));
        }

        console.log('[Invoice View] Found submission:', submission.id);

        // Extract data
        const data = submission.data || {};
        const form = submission.forms || {};
        const productName = data.product_name || form.product_name || 'Product';
        const productPrice = data.product_price || form.product_price || 0;
        const quantity = data.quantity || 1;
        const total = data.total || (productPrice * quantity);
        const currency = data.currency || form.currency || 'PHP';

        // Extract customer name from various possible fields
        const customerName = data.name
            || data.full_name
            || data.customer_name
            || data.buyer_name
            || data['Full Name']
            || data['Name']
            || submission.subscriber_name
            || 'Customer';

        const currencySymbols: Record<string, string> = {
            PHP: '₱', USD: '$', EUR: '€', GBP: '£', JPY: '¥'
        };
        const currencySymbol = currencySymbols[currency] || '₱';

        const paymentMethod = data.payment_method === 'cod'
            ? 'Cash on Delivery'
            : (data.ewallet_selected || 'E-Wallet');

        const invoiceNumber = `INV-${id.slice(0, 8).toUpperCase()}`;
        // Pass raw timestamp - will be formatted client-side for correct timezone
        const orderTimestamp = submission.created_at;

        // Return server-rendered HTML
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(renderInvoice({
            submissionId: id,
            company,
            companyAddress,
            color,
            logo,
            invoiceNumber,
            orderTimestamp,
            customerName,
            email: data.email,
            phone: data.phone,
            address: data.address || data.full_address,
            productName,
            productPrice,
            quantity,
            total,
            currencySymbol,
            paymentMethod,
            proofUrl: data.proof_url,
            couponApplied: data.coupon_applied
        }));

    } catch (err: any) {
        console.error('[Invoice View] Exception:', err);
        return res.status(500).send(renderError('Failed to load invoice'));
    }
}

function renderError(message: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice Error</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .error-card {
            background: white;
            border-radius: 16px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            max-width: 320px;
        }
        .error-icon {
            width: 64px;
            height: 64px;
            background: #fee2e2;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 32px;
        }
        h1 { color: #1f2937; font-size: 20px; margin-bottom: 10px; }
        p { color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="error-card">
        <div class="error-icon">❌</div>
        <h1>Invoice Not Found</h1>
        <p>${message}</p>
    </div>
</body>
</html>`;
}

interface InvoiceData {
    submissionId: string;
    company: string;
    companyAddress?: string;
    color: string;
    logo: string;
    invoiceNumber: string;
    orderTimestamp: string;
    customerName: string;
    email?: string;
    phone?: string;
    address?: string;
    productName: string;
    productPrice: number;
    quantity: number;
    total: number;
    currencySymbol: string;
    paymentMethod: string;
    proofUrl?: string;
    couponApplied?: string;
}

function renderInvoice(data: InvoiceData): string {
    const subtotal = data.productPrice * data.quantity;
    const discount = data.couponApplied ? subtotal - data.total : 0;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${data.invoiceNumber}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f1f5f9 0%, #e0e7ff 100%);
            min-height: 100vh;
            padding: 16px;
        }
        .container { max-width: 420px; margin: 0 auto; }
        .invoice-card {
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0,0,0,0.12);
        }
        .header {
            background: linear-gradient(135deg, ${data.color} 0%, ${data.color}dd 100%);
            color: white;
            padding: 20px;
        }
        .header-content { display: flex; align-items: center; justify-content: space-between; }
        .company-info { display: flex; align-items: center; gap: 12px; }
        .company-logo {
            width: 48px;
            height: 48px;
            background: rgba(255,255,255,0.2);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
        }
        .company-logo img { width: 100%; height: 100%; object-fit: cover; border-radius: 10px; }
        .company-name { font-size: 18px; font-weight: bold; }
        .company-subtitle { font-size: 12px; opacity: 0.8; }
        .company-address { font-size: 10px; opacity: 0.7; margin-top: 2px; max-width: 160px; line-height: 1.3; }
        .invoice-meta { text-align: right; }
        .invoice-label { font-size: 10px; text-transform: uppercase; opacity: 0.7; letter-spacing: 1px; }
        .invoice-number { font-family: monospace; font-size: 13px; }
        
        .status-bar {
            background: linear-gradient(90deg, #ecfdf5 0%, #d1fae5 100%);
            padding: 14px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid #e5e7eb;
        }
        .status-badge { display: flex; align-items: center; gap: 8px; color: #047857; font-weight: 600; }
        .status-date { font-size: 12px; color: #6b7280; }
        
        .section { padding: 16px 20px; border-bottom: 1px solid #f3f4f6; }
        .section-title { font-size: 10px; text-transform: uppercase; color: #9ca3af; margin-bottom: 8px; letter-spacing: 1px; }
        .customer-name { font-weight: 600; color: #1f2937; margin-bottom: 4px; }
        .customer-detail { font-size: 13px; color: #6b7280; }
        
        .product-row { display: flex; justify-content: space-between; align-items: flex-start; }
        .product-name { font-weight: 500; color: #1f2937; }
        .product-qty { font-size: 13px; color: #6b7280; margin-top: 2px; }
        .product-price { font-weight: 600; color: #1f2937; text-align: right; }
        .product-calc { font-size: 11px; color: #9ca3af; margin-top: 2px; }
        
        .summary { background: #f9fafb; padding: 16px 20px; }
        .summary-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; }
        .summary-label { color: #6b7280; }
        .summary-value { color: #374151; }
        .summary-discount { color: #059669; }
        .total-row { 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            padding-top: 12px; 
            border-top: 1px solid #e5e7eb;
            margin-top: 4px;
        }
        .total-label { font-weight: bold; color: #1f2937; }
        .total-value { font-size: 24px; font-weight: bold; color: ${data.color}; }
        
        .payment-section { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
        .payment-info { display: flex; align-items: center; gap: 10px; }
        .payment-icon { font-size: 20px; }
        .payment-label { font-size: 12px; color: #6b7280; }
        .payment-method { font-weight: 500; color: #1f2937; }
        .view-proof { font-size: 13px; color: ${data.color}; text-decoration: none; }
        
        .footer {
            background: #f9fafb;
            padding: 16px 20px;
            text-align: center;
            border-top: 1px solid #f3f4f6;
        }
        .footer p { font-size: 11px; color: #9ca3af; margin-bottom: 4px; }
        
        /* Download buttons */
        .download-section {
            display: flex;
            gap: 12px;
            justify-content: center;
            margin-bottom: 16px;
        }
        .download-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 500;
            color: #374151;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            transition: all 0.2s;
        }
        .download-btn:hover {
            background: #f9fafb;
            box-shadow: 0 4px 12px rgba(0,0,0,0.12);
            transform: translateY(-1px);
        }
        .download-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .download-btn .icon { font-size: 18px; }
        .download-btn .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid #e5e7eb;
            border-top-color: #6366f1;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .track-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border: none;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            color: white;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
            transition: all 0.2s;
            text-decoration: none;
        }
        .track-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
        }
    </style>
    
    <!-- Load libraries from CDN -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
</head>
<body>
    <div class="container">
        <!-- Download Buttons -->
        <div class="download-section">
            <a href="/api/track/view?id=${data.submissionId}&company=${encodeURIComponent(data.company)}&logo=${encodeURIComponent(data.logo)}&color=${encodeURIComponent(data.color)}" class="track-btn">
                <span class="icon">📦</span>
                <span>Track Order</span>
            </a>
            <button class="download-btn" id="downloadImage" onclick="downloadAsImage()">
                <span class="icon">🖼️</span>
                <span>Save Image</span>
            </button>
            <button class="download-btn" id="downloadPdf" onclick="downloadAsPdf()">
                <span class="icon">📄</span>
                <span>Save PDF</span>
            </button>
        </div>
        
        <div id="invoiceCard" class="invoice-card">
            <div class="header">
                <div class="header-content">
                    <div class="company-info">
                        <div class="company-logo">
                            ${data.logo ? `<img src="${data.logo}" alt="">` : '🧾'}
                        </div>
                        <div>
                            <div class="company-name">${escapeHtml(data.company)}</div>
                            <div class="company-subtitle">Official Invoice</div>
                            ${data.companyAddress ? `<div class="company-address">${escapeHtml(data.companyAddress)}</div>` : ''}
                        </div>
                    </div>
                    <div class="invoice-meta">
                        <div class="invoice-label">Invoice</div>
                        <div class="invoice-number">${data.invoiceNumber}</div>
                    </div>
                </div>
            </div>
            
            <div class="status-bar">
                <div class="status-badge">📦 Order Placed</div>
                <div class="status-date" id="orderDate" data-timestamp="${data.orderTimestamp}">Loading...</div>
            </div>
            
            <div class="section">
                <div class="section-title">Customer</div>
                <div class="customer-name">${escapeHtml(data.customerName)}</div>
                ${data.email ? `<div class="customer-detail">${escapeHtml(data.email)}</div>` : ''}
                ${data.phone ? `<div class="customer-detail">${escapeHtml(data.phone)}</div>` : ''}
                ${data.address ? `<div class="customer-detail">${escapeHtml(data.address)}</div>` : ''}
            </div>
            
            <div class="section">
                <div class="section-title">Order Details</div>
                <div class="product-row">
                    <div>
                        <div class="product-name">${escapeHtml(data.productName)}</div>
                        <div class="product-qty">Qty: ${data.quantity}</div>
                    </div>
                    <div class="product-price">
                        ${data.currencySymbol}${data.productPrice.toLocaleString()}
                        ${data.quantity > 1 ? `<div class="product-calc">× ${data.quantity} = ${data.currencySymbol}${subtotal.toLocaleString()}</div>` : ''}
                    </div>
                </div>
            </div>
            
            <div class="summary">
                <div class="summary-row">
                    <span class="summary-label">Subtotal</span>
                    <span class="summary-value">${data.currencySymbol}${subtotal.toLocaleString()}</span>
                </div>
                ${data.couponApplied ? `
                <div class="summary-row">
                    <span class="summary-discount">Discount (${escapeHtml(data.couponApplied)})</span>
                    <span class="summary-discount">-${data.currencySymbol}${discount.toLocaleString()}</span>
                </div>
                ` : ''}
                <div class="total-row">
                    <span class="total-label">Total</span>
                    <span class="total-value">${data.currencySymbol}${data.total.toLocaleString()}</span>
                </div>
            </div>
            
            <div class="payment-section">
                <div class="payment-info">
                    <span class="payment-icon">${data.paymentMethod.includes('Cash') ? '💵' : '📱'}</span>
                    <div>
                        <div class="payment-label">Payment Method</div>
                        <div class="payment-method">${escapeHtml(data.paymentMethod)}</div>
                    </div>
                </div>
                ${data.proofUrl ? `<a href="${data.proofUrl}" class="view-proof" target="_blank">View Proof</a>` : ''}
            </div>
            
            <div class="footer">
                <p>Thank you for your order!</p>
                <p>Questions? Contact ${escapeHtml(data.company)}</p>
            </div>
        </div>
    </div>
    
    <script>
        // Format date in user's local timezone
        (function() {
            const dateEl = document.getElementById('orderDate');
            if (dateEl && dateEl.dataset.timestamp) {
                const date = new Date(dateEl.dataset.timestamp);
                dateEl.textContent = date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        })();
        
        function setButtonLoading(btnId, loading) {
            const btn = document.getElementById(btnId);
            if (loading) {
                btn.disabled = true;
                btn.querySelector('.icon').style.display = 'none';
                const spinner = document.createElement('div');
                spinner.className = 'spinner';
                btn.insertBefore(spinner, btn.firstChild);
            } else {
                btn.disabled = false;
                const spinner = btn.querySelector('.spinner');
                if (spinner) spinner.remove();
                btn.querySelector('.icon').style.display = '';
            }
        }
        
        async function downloadAsImage() {
            setButtonLoading('downloadImage', true);
            try {
                const card = document.getElementById('invoiceCard');
                const canvas = await html2canvas(card, { 
                    backgroundColor: '#ffffff',
                    scale: 2,
                    useCORS: true
                });
                const link = document.createElement('a');
                link.download = 'invoice-${data.invoiceNumber}.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            } catch (err) {
                alert('Failed to download image');
                console.error(err);
            } finally {
                setButtonLoading('downloadImage', false);
            }
        }
        
        async function downloadAsPdf() {
            setButtonLoading('downloadPdf', true);
            try {
                const { jsPDF } = window.jspdf;
                const card = document.getElementById('invoiceCard');
                const canvas = await html2canvas(card, { 
                    backgroundColor: '#ffffff',
                    scale: 2,
                    useCORS: true
                });
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const imgWidth = 210;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 10, imgWidth, imgHeight);
                pdf.save('invoice-${data.invoiceNumber}.pdf');
            } catch (err) {
                alert('Failed to download PDF');
                console.error(err);
            } finally {
                setButtonLoading('downloadPdf', false);
            }
        }
    </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
