import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SendTrackingRequest {
    subscriberId: string;      // Customer's Messenger ID
    pageId: string;            // Facebook page ID (internal UUID)
    orderId: string;           // Order ID for display and tracking
    customerName: string;
    items: Array<{ productName: string; quantity: number; productPrice: number }>;
    total: number;
    carrier: string;           // Delivery carrier name
    trackingNumber: string;    // Carrier tracking number
    trackingUrl?: string;      // Optional external tracking URL
    notes?: string;            // Optional delivery notes
    workspaceId: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const {
            subscriberId,
            pageId,
            orderId,
            customerName,
            items,
            total,
            carrier,
            trackingNumber,
            trackingUrl,
            notes,
            workspaceId
        } = req.body as SendTrackingRequest;

        // Validate required fields
        if (!subscriberId || !pageId || !orderId || !carrier || !trackingNumber) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['subscriberId', 'pageId', 'orderId', 'carrier', 'trackingNumber']
            });
        }

        console.log('[SendTracking] Starting notification for order:', orderId);

        // Get page access token from connected_pages using internal ID
        const { data: page, error: pageError } = await supabase
            .from('connected_pages')
            .select('page_id, access_token, name')
            .eq('id', pageId)
            .maybeSingle();

        if (pageError || !page) {
            console.error('[SendTracking] Page not found:', pageError?.message);
            return res.status(404).json({ error: 'Page not found' });
        }

        const pageAccessToken = page.access_token;
        const facebookPageId = page.page_id;

        // Build order items list
        const itemsList = items.map(item =>
            `• ${item.productName} × ${item.quantity}`
        ).join('\n');

        // Build tracking URL - use provided URL or create internal one
        const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : process.env.APP_URL || 'https://your-app.vercel.app';
        const orderTrackingUrl = trackingUrl || `${baseUrl}/track/${orderId}`;

        // Build the message
        const message = `📦 Order Shipped!

Hi ${customerName}! Your order has been shipped.

🆔 Order: ${orderId}
🚚 Carrier: ${carrier}
📋 Tracking #: ${trackingNumber}

🛍️ Items:
${itemsList}

💰 Total: ₱${total.toLocaleString()}
${notes ? `\n📝 Note: ${notes}` : ''}

Track your package using the tracking number above or tap the button below.`;

        // Send message with button template
        const messagePayload = {
            recipient: { id: subscriberId },
            message: {
                attachment: {
                    type: 'template',
                    payload: {
                        template_type: 'button',
                        text: message,
                        buttons: [
                            {
                                type: 'web_url',
                                url: orderTrackingUrl,
                                title: '📍 Track Order',
                                webview_height_ratio: 'full',
                                messenger_extensions: false
                            }
                        ]
                    }
                }
            }
        };

        console.log('[SendTracking] Sending to Messenger...');

        const fbResponse = await fetch(
            `https://graph.facebook.com/v18.0/me/messages?access_token=${pageAccessToken}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(messagePayload)
            }
        );

        const fbResult = await fbResponse.json();

        if (!fbResponse.ok) {
            console.error('[SendTracking] Facebook API error:', fbResult);
            return res.status(500).json({
                error: 'Failed to send message',
                details: fbResult.error?.message || 'Unknown error'
            });
        }

        console.log('[SendTracking] ✓ Message sent:', fbResult.message_id);

        // Also update the order with tracking info
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                metadata: supabase.rpc('jsonb_set_path', {
                    target: 'metadata',
                    path: ['tracking'],
                    value: {
                        carrier,
                        trackingNumber,
                        trackingUrl: orderTrackingUrl,
                        notes,
                        notifiedAt: new Date().toISOString()
                    }
                }),
                status: 'shipped',
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

        // Fallback: Direct metadata update if rpc not available
        if (updateError) {
            console.log('[SendTracking] RPC failed, using direct update');
            const { data: existingOrder } = await supabase
                .from('orders')
                .select('metadata')
                .eq('id', orderId)
                .single();

            const updatedMetadata = {
                ...(existingOrder?.metadata || {}),
                tracking: {
                    carrier,
                    trackingNumber,
                    trackingUrl: orderTrackingUrl,
                    notes,
                    notifiedAt: new Date().toISOString()
                }
            };

            await supabase
                .from('orders')
                .update({
                    metadata: updatedMetadata,
                    status: 'shipped',
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);
        }

        console.log('[SendTracking] ✓ Order updated with tracking info');

        return res.status(200).json({
            success: true,
            messageId: fbResult.message_id,
            orderId,
            carrier,
            trackingNumber
        });

    } catch (error: any) {
        console.error('[SendTracking] Error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}
