import type { VercelRequest, VercelResponse } from '@vercel/node';

interface SendOrderNotificationRequest {
    subscriberId: string;      // Customer's Messenger ID
    pageId: string;            // Facebook page ID (internal UUID)
    orderId: string;           // Order ID for display and tracking
    customerName: string;
    items: Array<{ productName: string; quantity: number; productPrice: number }>;
    total: number;
    status: 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
    // Shipping-specific fields (only for 'shipped' status)
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    notes?: string;
    workspaceId: string;
}

// Status configurations for beautiful messages
const STATUS_CONFIG = {
    confirmed: {
        emoji: '✅',
        title: 'Order Confirmed!',
        message: 'Great news! Your order has been confirmed and is being prepared.',
        buttonTitle: '📋 View Order',
        color: 'blue'
    },
    shipped: {
        emoji: '📦',
        title: 'Order Shipped!',
        message: 'Your order is on its way!',
        buttonTitle: '📍 Track Order',
        color: 'purple'
    },
    delivered: {
        emoji: '🎉',
        title: 'Order Delivered!',
        message: 'Your order has been delivered. Enjoy your purchase!',
        buttonTitle: '📋 View Order',
        color: 'green'
    },
    cancelled: {
        emoji: '❌',
        title: 'Order Cancelled',
        message: 'Your order has been cancelled. If you have questions, please contact us.',
        buttonTitle: '📋 View Details',
        color: 'red'
    }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Initialize supabase inside handler to ensure env vars are available
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

        if (!supabaseUrl || !supabaseKey) {
            console.error('[SendOrderNotification] Missing Supabase credentials');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const {
            subscriberId,
            pageId,
            orderId,
            customerName,
            items,
            total,
            status,
            carrier,
            trackingNumber,
            trackingUrl,
            notes,
            workspaceId
        } = req.body as SendOrderNotificationRequest;

        // Validate required fields
        if (!subscriberId || !pageId || !orderId || !status) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['subscriberId', 'pageId', 'orderId', 'status']
            });
        }

        // For shipped status, require carrier and tracking number
        if (status === 'shipped' && (!carrier || !trackingNumber)) {
            return res.status(400).json({
                error: 'Missing shipping fields',
                required: ['carrier', 'trackingNumber']
            });
        }

        console.log(`[SendOrderNotification] Sending ${status} notification for order:`, orderId);

        // Get page access token from connected_pages
        const { data: page, error: pageError } = await supabase
            .from('connected_pages')
            .select('page_id, page_access_token, name')
            .eq('page_id', pageId)
            .maybeSingle();

        if (pageError || !page) {
            console.error('[SendOrderNotification] Page not found:', pageError?.message);
            return res.status(404).json({ error: 'Page not found' });
        }

        const pageAccessToken = (page as any).page_access_token;

        // Build order items list
        const itemsList = (items || []).map(item =>
            `• ${item.productName} × ${item.quantity}`
        ).join('\n');

        // Build base URL for order view
        const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : process.env.APP_URL || 'https://your-app.vercel.app';
        const orderUrl = `${baseUrl}/track/${orderId}`;

        // Get status configuration
        const config = STATUS_CONFIG[status];

        // Build the message based on status
        let message = '';

        if (status === 'shipped') {
            // Shipped status with tracking details
            message = `${config.emoji} ${config.title}

Hi ${customerName}! ${config.message}

🆔 Order: #${orderId.slice(-8).toUpperCase()}
🚚 Carrier: ${carrier}
📋 Tracking #: ${trackingNumber}

🛍️ Items:
${itemsList}

💰 Total: ₱${(total || 0).toLocaleString()}
${notes ? `\n📝 Note: ${notes}` : ''}

Track your package using the tracking number above or tap the button below.`;
        } else if (status === 'cancelled') {
            // Cancelled status - simpler message
            message = `${config.emoji} ${config.title}

Hi ${customerName}, ${config.message}

🆔 Order: #${orderId.slice(-8).toUpperCase()}

🛍️ Items:
${itemsList}

💰 Amount: ₱${(total || 0).toLocaleString()}

If you need assistance, please don't hesitate to reach out.`;
        } else {
            // Confirmed or Delivered status
            message = `${config.emoji} ${config.title}

Hi ${customerName}! ${config.message}

🆔 Order: #${orderId.slice(-8).toUpperCase()}

🛍️ Items:
${itemsList}

💰 Total: ₱${(total || 0).toLocaleString()}

${status === 'confirmed' ? 'We will notify you once your order is shipped.' : 'Thank you for shopping with us! 💝'}`;
        }

        // Send message with button template
        const messagePayload = {
            recipient: { id: subscriberId },
            messaging_type: 'MESSAGE_TAG',
            tag: 'POST_PURCHASE_UPDATE',
            message: {
                attachment: {
                    type: 'template',
                    payload: {
                        template_type: 'button',
                        text: message,
                        buttons: [
                            {
                                type: 'web_url',
                                url: orderUrl,
                                title: config.buttonTitle,
                                webview_height_ratio: 'full',
                                messenger_extensions: false
                            }
                        ]
                    }
                }
            }
        };

        console.log('[SendOrderNotification] Sending to Messenger...');

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
            console.error('[SendOrderNotification] Facebook API error:', fbResult);
            return res.status(500).json({
                error: 'Failed to send message',
                details: fbResult.error?.message || 'Unknown error'
            });
        }

        console.log('[SendOrderNotification] ✓ Message sent:', fbResult.message_id);

        // Update the order metadata with notification info
        const { data: existingOrder, error: fetchError } = await supabase
            .from('orders')
            .select('metadata')
            .eq('id', orderId)
            .single();

        if (fetchError) {
            console.error('[SendOrderNotification] Failed to fetch order:', fetchError.message);
        }

        const updatedMetadata = {
            ...(existingOrder?.metadata || {}),
            notifications: {
                ...(existingOrder?.metadata?.notifications || {}),
                [status]: {
                    sentAt: new Date().toISOString(),
                    messageId: fbResult.message_id
                }
            }
        };

        // For shipped status, also save tracking info
        if (status === 'shipped') {
            updatedMetadata.tracking = {
                carrier,
                trackingNumber,
                trackingUrl: trackingUrl || null,
                notes,
                notifiedAt: new Date().toISOString()
            };
        }

        const { error: updateError } = await supabase
            .from('orders')
            .update({
                status: status, // Update the actual status column
                metadata: updatedMetadata,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

        if (updateError) {
            console.error('[SendOrderNotification] Failed to update order:', updateError.message);
        } else {
            console.log('[SendOrderNotification] ✓ Order metadata updated');
        }

        return res.status(200).json({
            success: true,
            messageId: fbResult.message_id,
            orderId,
            status,
            ...(status === 'shipped' ? { carrier, trackingNumber } : {})
        });

    } catch (error: any) {
        console.error('[SendOrderNotification] Error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}
