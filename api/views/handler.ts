import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Consolidated Views Handler
 * 
 * Routes via ?type= query param:
 * - invoice: Render invoice page
 * - track: Render order tracking page
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const type = (req.query.type as string) || 'invoice';

    try {
        if (type === 'invoice') {
            return handleInvoiceView(req, res);
        } else if (type === 'track') {
            return handleTrackView(req, res);
        } else {
            return res.status(400).json({ error: 'Invalid type. Use ?type=invoice or ?type=track' });
        }
    } catch (error: any) {
        console.error('[Views Handler] Exception:', error);
        return res.status(500).send(renderError('Failed to load page'));
    }
}

// ==================== INVOICE VIEW ====================

async function handleInvoiceView(req: VercelRequest, res: VercelResponse) {
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
        let invoiceData: any = null;
        let source: 'order' | 'form_submission' = 'form_submission';

        // STEP 1: Try to find in orders table first (webview checkout orders)
        if (id.startsWith('ORD-')) {
            console.log('[Invoice View] Checking orders table for:', id);
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .select('*')
                .eq('id', id)
                .single();

            if (!orderError && order) {
                console.log('[Invoice View] Found order:', order.id);
                source = 'order';
                invoiceData = transformOrderToInvoice(order);
            }
        }

        // STEP 2: If not found in orders, try form_submissions table
        if (!invoiceData) {
            console.log('[Invoice View] Checking form_submissions table for:', id);
            const { data: submission, error: submissionError } = await supabase
                .from('form_submissions')
                .select('*, forms(*)')
                .eq('id', id)
                .single();

            if (!submissionError && submission) {
                console.log('[Invoice View] Found form submission:', submission.id);
                source = 'form_submission';
                invoiceData = transformSubmissionToInvoice(submission);
            }
        }

        if (!invoiceData) {
            console.error('[Invoice View] Invoice not found');
            return res.status(404).send(renderError('Invoice not found'));
        }

        console.log('[Invoice View] Invoice loaded from:', source);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(renderInvoice({
            submissionId: id,
            company,
            companyAddress,
            color,
            logo,
            invoiceNumber: invoiceData.invoiceNumber,
            orderTimestamp: invoiceData.orderTimestamp,
            customerName: invoiceData.customerName,
            email: invoiceData.email,
            phone: invoiceData.phone,
            address: invoiceData.address,
            cartItems: invoiceData.cartItems || [],
            productName: invoiceData.productName,
            productPrice: invoiceData.productPrice,
            quantity: invoiceData.quantity,
            subtotal: invoiceData.subtotal,
            shippingFee: invoiceData.shippingFee || 0,
            discount: invoiceData.discount || 0,
            promoCode: invoiceData.promoCode || '',
            total: invoiceData.total,
            currencySymbol: invoiceData.currencySymbol,
            paymentMethod: invoiceData.paymentMethod,
            proofUrl: invoiceData.proofUrl,
            orderStatus: invoiceData.orderStatus
        }));

    } catch (err: any) {
        console.error('[Invoice View] Exception:', err);
        return res.status(500).send(renderError('Failed to load invoice'));
    }
}

// ==================== TRACK VIEW ====================

async function handleTrackView(req: VercelRequest, res: VercelResponse) {
    const { id } = req.query;
    const company = (req.query.company as string) || 'Your Company';
    const color = (req.query.color as string) || '#6366f1';
    const logo = (req.query.logo as string) || '';

    console.log('[Track View] Loading order:', id);

    if (!id || typeof id !== 'string') {
        return res.status(400).send(renderError('No order ID provided'));
    }

    try {
        let trackingData: any = null;

        // STEP 1: Check orders table first
        if (id.startsWith('ORD-')) {
            console.log('[Track View] Checking orders table...');
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .select('*')
                .eq('id', id)
                .single();

            if (!orderError && order) {
                console.log('[Track View] Found order:', order.id);
                const items = order.items || [];
                const firstItem = items[0] || {};

                trackingData = {
                    submissionId: order.id,
                    orderNumber: order.id,
                    createdAt: new Date(order.created_at).toISOString(),
                    customerName: order.customer_name || 'Customer',
                    productName: firstItem.productName || 'Product',
                    quantity: items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0),
                    total: order.total || 0,
                    currencySymbol: getCurrencySymbol(order.metadata?.currency || 'PHP'),
                    orderStatus: order.status || 'pending'
                };
            }
        }

        // STEP 2: If not found in orders, try form_submissions table
        if (!trackingData) {
            console.log('[Track View] Checking form_submissions table...');
            const { data: submission, error: fetchError } = await supabase
                .from('form_submissions')
                .select('*, forms(*)')
                .eq('id', id)
                .single();

            if (!fetchError && submission) {
                console.log('[Track View] Found form submission:', submission.id);
                const data = submission.data || {};
                const form = submission.forms || {};
                const productName = data.product_name || form.product_name || 'Product';
                const total = data.total || (data.product_price || form.product_price || 0) * (data.quantity || 1);
                const currency = data.currency || form.currency || 'PHP';
                const customerName = data.name || data.full_name || data['Full Name'] || 'Customer';

                trackingData = {
                    submissionId: id,
                    orderNumber: `ORD-${id.slice(0, 8).toUpperCase()}`,
                    createdAt: new Date(submission.created_at).toISOString(),
                    customerName,
                    productName,
                    quantity: data.quantity || 1,
                    total,
                    currencySymbol: getCurrencySymbol(currency),
                    orderStatus: data.order_status || 'pending'
                };
            }
        }

        if (!trackingData) {
            console.error('[Track View] Order not found in any table');
            return res.status(404).send(renderError('Order not found'));
        }

        console.log('[Track View] Tracking data prepared:', trackingData.orderNumber);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(renderTracking({
            ...trackingData,
            company,
            color,
            logo
        }));

    } catch (err: any) {
        console.error('[Track View] Exception:', err);
        return res.status(500).send(renderError('Failed to load order'));
    }
}

// ==================== HELPER FUNCTIONS ====================

function getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = { PHP: '₱', USD: '$', EUR: '€', GBP: '£', JPY: '¥' };
    return symbols[currency] || '₱';
}

function transformOrderToInvoice(order: any) {
    const items = order.items || [];
    const currencySymbols: Record<string, string> = {
        PHP: '₱', USD: '$', EUR: '€', GBP: '£', JPY: '¥'
    };

    const subtotal = items.reduce((sum: number, item: any) => {
        const itemPrice = parseFloat(item.productPrice) || 0;
        const itemQty = parseInt(item.quantity) || 1;
        return sum + (itemPrice * itemQty);
    }, 0);

    return {
        invoiceNumber: `INV-${order.id.replace('ORD-', '').slice(0, 8).toUpperCase()}`,
        orderTimestamp: order.created_at,
        customerName: order.customer_name || 'Customer',
        email: order.customer_email,
        phone: order.customer_phone,
        address: order.customer_address,
        cartItems: items,
        productName: items[0]?.productName || 'Product',
        productPrice: parseFloat(items[0]?.productPrice) || 0,
        quantity: parseInt(items[0]?.quantity) || 1,
        subtotal: order.subtotal || subtotal,
        shippingFee: order.shipping_fee || 0,
        discount: order.metadata?.discount || 0,
        promoCode: order.metadata?.promoCode || '',
        total: order.total || subtotal,
        currencySymbol: currencySymbols[order.metadata?.currency || 'PHP'] || '₱',
        paymentMethod: order.payment_method_name || order.payment_method || 'Cash on Delivery',
        proofUrl: order.metadata?.payment?.proofUrl || order.metadata?.proofUrl,
        orderStatus: order.status || 'pending'
    };
}

function transformSubmissionToInvoice(submission: any) {
    const data = submission.data || {};
    const form = submission.forms || {};

    const currencySymbols: Record<string, string> = {
        PHP: '₱', USD: '$', EUR: '€', GBP: '£', JPY: '¥'
    };

    const currency = data.currency || form.currency || 'PHP';
    const productPrice = parseFloat(form.product_price) || parseFloat(data.product_price) || 0;
    const quantity = parseInt(data.quantity) || 1;

    let cartItems: any[] = [];
    let subtotal = 0;

    if (data.cart && Array.isArray(data.cart) && data.cart.length > 0) {
        cartItems = data.cart;
        subtotal = data.cart.reduce((sum: number, item: any) => {
            const itemPrice = parseFloat(item.productPrice) || 0;
            const itemQty = parseInt(item.quantity) || 1;
            return sum + (itemPrice * itemQty);
        }, 0);
    } else {
        subtotal = productPrice * quantity;
    }

    const customerName = data.name
        || data.full_name
        || data.customer_name
        || data.buyer_name
        || data['Full Name']
        || data['Name']
        || submission.subscriber_name
        || 'Customer';

    return {
        invoiceNumber: `INV-${submission.id.slice(0, 8).toUpperCase()}`,
        orderTimestamp: submission.created_at,
        customerName,
        email: data.email,
        phone: data.phone,
        address: data.address || data.full_address,
        cartItems,
        productName: data.product_name || form.product_name || 'Product',
        productPrice,
        quantity,
        subtotal,
        shippingFee: parseFloat(data.shipping_fee) || 0,
        discount: parseFloat(data.discount) || 0,
        promoCode: data.coupon_applied || data.promoCode || '',
        total: parseFloat(data.total) || parseFloat(data.discounted_total) || subtotal,
        currencySymbol: currencySymbols[currency] || '₱',
        paymentMethod: data.payment_method === 'cod' ? 'Cash on Delivery' : (data.ewallet_selected || data.payment_method_name || 'E-Wallet'),
        proofUrl: data.proof_url,
        orderStatus: data.order_status || 'pending'
    };
}

function renderError(message: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error</title>
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
        <h1>Error</h1>
        <p>${message}</p>
    </div>
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

function getStatusBadge(status: string): string {
    const statuses: Record<string, { icon: string; label: string }> = {
        pending: { icon: '📦', label: 'Order Placed' },
        confirmed: { icon: '✅', label: 'Confirmed' },
        processing: { icon: '✅', label: 'Confirmed' },
        shipped: { icon: '🚚', label: 'Shipped' },
        delivered: { icon: '🎉', label: 'Delivered' },
        cancelled: { icon: '❌', label: 'Cancelled' }
    };
    const s = statuses[status] || statuses.pending;
    return `${s.icon} ${s.label}`;
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
    cartItems?: Array<{
        productName: string;
        productPrice: number;
        quantity: number;
        productImage?: string;
    }>;
    productName: string;
    productPrice: number;
    quantity: number;
    subtotal: number;
    shippingFee?: number;
    discount?: number;
    promoCode?: string;
    total: number;
    currencySymbol: string;
    paymentMethod: string;
    proofUrl?: string;
    orderStatus: string;
}

function renderInvoice(data: InvoiceData): string {
    let calculatedSubtotal = data.subtotal || 0;
    const hasCartItems = data.cartItems && data.cartItems.length > 0;

    if (hasCartItems) {
        calculatedSubtotal = data.cartItems!.reduce((sum, item) => {
            return sum + (item.productPrice * (item.quantity || 1));
        }, 0);
    } else {
        calculatedSubtotal = data.productPrice * data.quantity;
    }

    const shippingFee = data.shippingFee || 0;
    const discount = data.discount || 0;

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
        
        .download-section {
            display: flex;
            gap: 8px;
            justify-content: center;
            margin-bottom: 12px;
            flex-wrap: wrap;
        }
        .download-btn {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 6px 12px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 500;
            color: #374151;
            cursor: pointer;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            transition: all 0.2s;
        }
        .download-btn:hover {
            background: #f9fafb;
            box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        }
        .track-btn {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 6px 12px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border: none;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 600;
            color: white;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(99, 102, 241, 0.25);
            transition: all 0.2s;
            text-decoration: none;
        }
        .track-btn:hover {
            box-shadow: 0 3px 8px rgba(99, 102, 241, 0.35);
        }
    </style>
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
</head>
<body>
    <div class="container">
        <div class="download-section">
            <a href="/track/${data.submissionId}?company=${encodeURIComponent(data.company)}&logo=${encodeURIComponent(data.logo)}&color=${encodeURIComponent(data.color)}" class="track-btn">
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
                <div class="status-badge">${getStatusBadge(data.orderStatus)}</div>
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
                ${hasCartItems ?
            data.cartItems!.map((item, index) => {
                const itemTotal = item.productPrice * (item.quantity || 1);
                return `
                        <div class="product-row" style="margin-bottom: 8px;">
                            <div>
                                <div class="product-name">${escapeHtml(item.productName || 'Product')}</div>
                                <div class="product-qty">Qty: ${item.quantity || 1}</div>
                            </div>
                            <div class="product-price">
                                ${data.currencySymbol}${item.productPrice.toLocaleString()}
                                ${(item.quantity || 1) > 1 ? `<div class="product-calc">× ${item.quantity} = ${data.currencySymbol}${itemTotal.toLocaleString()}</div>` : ''}
                            </div>
                        </div>`;
            }).join('')
            :
            `<div class="product-row">
                        <div>
                            <div class="product-name">${escapeHtml(data.productName)}</div>
                            <div class="product-qty">Qty: ${data.quantity}</div>
                        </div>
                        <div class="product-price">
                            ${data.currencySymbol}${data.productPrice.toLocaleString()}
                            ${data.quantity > 1 ? `<div class="product-calc">× ${data.quantity} = ${data.currencySymbol}${calculatedSubtotal.toLocaleString()}</div>` : ''}
                        </div>
                    </div>`
        }
            </div>
            
            <div class="summary">
                <div class="summary-row">
                    <span class="summary-label">Subtotal</span>
                    <span class="summary-value">${data.currencySymbol}${calculatedSubtotal.toLocaleString()}</span>
                </div>
                ${shippingFee > 0 ? `
                <div class="summary-row">
                    <span class="summary-label">Shipping</span>
                    <span class="summary-value">${data.currencySymbol}${shippingFee.toLocaleString()}</span>
                </div>
                ` : ''}
                ${discount > 0 ? `
                <div class="summary-row">
                    <span class="summary-discount">Discount${data.promoCode ? ` (${escapeHtml(data.promoCode)})` : ''}</span>
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
        
        async function downloadAsImage() {
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
            }
        }
        
        async function downloadAsPdf() {
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
            }
        }
    </script>
</body>
</html>`;
}

interface TrackingData {
    submissionId: string;
    company: string;
    color: string;
    logo: string;
    orderNumber: string;
    createdAt: string;
    customerName: string;
    productName: string;
    quantity: number;
    total: number;
    currencySymbol: string;
    orderStatus: string;
}

function renderTracking(data: TrackingData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Track Order ${data.orderNumber}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f1f5f9 0%, #e0e7ff 100%);
            min-height: 100vh;
            padding: 16px;
        }
        .container { max-width: 420px; margin: 0 auto; }
        
        .header {
            background: linear-gradient(135deg, ${data.color} 0%, ${data.color}cc 100%);
            color: white;
            padding: 24px;
            border-radius: 16px;
            margin-bottom: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        }
        .company-row { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
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
        .company-name { font-size: 20px; font-weight: bold; }
        .company-sub { font-size: 12px; opacity: 0.8; }
        
        .order-box {
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 16px;
            display: flex;
            justify-content: space-between;
        }
        .order-label { font-size: 10px; text-transform: uppercase; opacity: 0.7; letter-spacing: 1px; margin-bottom: 4px; }
        .order-value { font-weight: 600; font-family: monospace; }
        
        .card {
            background: white;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .card-title { font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 20px; }
        
        .timeline { position: relative; }
        .step { display: flex; gap: 16px; padding-bottom: 28px; }
        .step:last-child { padding-bottom: 0; }
        .step-icon-col { display: flex; flex-direction: column; align-items: center; }
        .step-icon {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            transition: all 0.3s;
        }
        .step-icon.completed { background: #22c55e; color: white; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3); }
        .step-icon.current { background: #6366f1; color: white; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); animation: pulse 2s infinite; }
        .step-icon.pending { background: #f3f4f6; color: #9ca3af; }
        .step-line { width: 2px; flex: 1; margin-top: 8px; transition: background 0.3s; }
        .step-line.completed { background: #22c55e; }
        .step-line.pending { background: #e5e7eb; }
        
        .step-content { flex: 1; padding-top: 8px; }
        .step-title { font-weight: 600; margin-bottom: 4px; }
        .step-title.completed { color: #1f2937; }
        .step-title.pending { color: #9ca3af; }
        .step-desc { font-size: 13px; color: #6b7280; }
        .step-date { font-size: 12px; color: #9ca3af; margin-top: 4px; }
        
        .summary-row { display: flex; justify-content: space-between; padding: 8px 0; }
        .summary-label { color: #6b7280; }
        .summary-value { font-weight: 500; color: #1f2937; }
        .summary-total { 
            border-top: 1px solid #e5e7eb; 
            margin-top: 8px; 
            padding-top: 12px; 
        }
        .total-value { font-size: 20px; font-weight: bold; color: ${data.color}; }
        
        .back-link {
            display: block;
            text-align: center;
            color: #6366f1;
            text-decoration: none;
            font-weight: 500;
            padding: 12px;
        }
        .back-link:hover { text-decoration: underline; }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="company-row">
                <div class="company-logo">
                    ${data.logo ? `<img src="${data.logo}" alt="">` : '📦'}
                </div>
                <div>
                    <div class="company-name">${escapeHtml(data.company)}</div>
                    <div class="company-sub">Order Tracking</div>
                </div>
            </div>
            <div class="order-box">
                <div>
                    <div class="order-label">Order Number</div>
                    <div class="order-value">${data.orderNumber}</div>
                </div>
                <div style="text-align: right;">
                    <div class="order-label">Est. Delivery</div>
                    <div class="order-value" id="estDelivery">-</div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-title">Tracking Status</div>
            <div class="timeline" id="timeline"></div>
        </div>
        
        <div class="card">
            <div class="card-title">Order Summary</div>
            <div class="summary-row">
                <span class="summary-label">Product</span>
                <span class="summary-value">${escapeHtml(data.productName)}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Customer</span>
                <span class="summary-value">${escapeHtml(data.customerName)}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Quantity</span>
                <span class="summary-value">${data.quantity}</span>
            </div>
            <div class="summary-row summary-total">
                <span class="summary-label" style="font-weight: bold; color: #1f2937;">Total</span>
                <span class="total-value">${data.currencySymbol}${data.total.toLocaleString()}</span>
            </div>
        </div>
        
        <a href="/api/views/handler?type=invoice&id=${data.submissionId}&company=${encodeURIComponent(data.company)}&logo=${encodeURIComponent(data.logo)}&color=${encodeURIComponent(data.color)}" class="back-link">
            ← Back to Invoice
        </a>
    </div>
    
    <script>
        const createdAt = new Date('${data.createdAt}');
        const orderStatus = '${data.orderStatus}';
        
        const statusToStep = {
            'pending': 0,
            'confirmed': 1,
            'processing': 1,
            'shipped': 2,
            'delivered': 3,
            'cancelled': -1
        };
        const currentStepIndex = statusToStep[orderStatus] !== undefined ? statusToStep[orderStatus] : 0;
        const isCancelled = orderStatus === 'cancelled';
        
        const steps = [
            { id: 'pending', label: 'Order Placed', icon: '📦', desc: 'We received your order' },
            { id: 'processing', label: 'Confirmed', icon: '✅', desc: 'Order has been confirmed' },
            { id: 'shipped', label: 'Shipped', icon: '🚚', desc: 'Package is on the way' },
            { id: 'delivered', label: 'Delivered', icon: '🎉', desc: 'Package delivered successfully' }
        ];
        
        const timeline = document.getElementById('timeline');
        
        if (isCancelled) {
            timeline.innerHTML = \`
                <div class="step">
                    <div class="step-icon-col">
                        <div class="step-icon" style="background: #ef4444; color: white;">❌</div>
                    </div>
                    <div class="step-content">
                        <div class="step-title" style="color: #ef4444;">Order Cancelled</div>
                        <div class="step-desc">This order has been cancelled</div>
                    </div>
                </div>
            \`;
        } else {
            steps.forEach((step, index) => {
                const completed = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                
                const html = \`
                    <div class="step">
                        <div class="step-icon-col">
                            <div class="step-icon \${completed ? (isCurrent ? 'current' : 'completed') : 'pending'}">
                                \${completed ? '✓' : step.icon}
                            </div>
                            \${index < steps.length - 1 ? \`<div class="step-line \${completed ? 'completed' : 'pending'}"></div>\` : ''}
                        </div>
                        <div class="step-content">
                            <div class="step-title \${completed ? 'completed' : 'pending'}">\${step.label}</div>
                            <div class="step-desc">\${step.desc}</div>
                            <div class="step-date">\${completed ? (isCurrent ? 'Current Status' : 'Completed') : 'Pending'}</div>
                        </div>
                    </div>
                \`;
                timeline.innerHTML += html;
            });
        }
        
        const estDelivery = new Date(createdAt.getTime() + 5 * 24 * 60 * 60 * 1000);
        document.getElementById('estDelivery').textContent = isCancelled ? 'N/A' : formatShortDate(estDelivery);
        
        function formatShortDate(date) {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    </script>
</body>
</html>`;
}
