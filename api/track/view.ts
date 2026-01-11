import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Order Tracking View API - Server-side rendered tracking page
 * Works in mobile browsers including Messenger's in-app browser
 * 
 * UNIVERSAL: Supports both:
 * 1. Orders table (webview checkout orders)
 * 2. Form submissions (legacy form-based orders)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
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

        // STEP 1: Check orders table first (webview checkout orders start with "ORD-")
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

function getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = { PHP: '₱', USD: '$', EUR: '€', GBP: '£', JPY: '¥' };
    return symbols[currency] || '₱';
}

function renderError(message: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Not Found</title>
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
        <h1>Order Not Found</h1>
        <p>${message}</p>
    </div>
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
        
        <a href="/api/invoices/view?id=${data.submissionId}&company=${encodeURIComponent(data.company)}&logo=${encodeURIComponent(data.logo)}&color=${encodeURIComponent(data.color)}" class="back-link">
            ← Back to Invoice
        </a>
    </div>
    
    <script>
        const createdAt = new Date('${data.createdAt}');
        const orderStatus = '${data.orderStatus}';
        
        // Map status to step index
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
        
        // Show cancelled status if cancelled
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
        
        // Set estimated delivery
        const estDelivery = new Date(createdAt.getTime() + 5 * 24 * 60 * 60 * 1000);
        document.getElementById('estDelivery').textContent = isCancelled ? 'N/A' : formatShortDate(estDelivery);
        
        function formatDate(date) {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
        function formatShortDate(date) {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
