import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Consolidated Webview API
 * 
 * Routes (via ?route= query param):
 * - session: GET/POST/PATCH session management
 * - action: POST user actions (add_to_cart, upsell_accept, etc.)
 * - continue: POST continue Messenger flow
 */

interface CartItem {
    productId: string;
    productName: string;
    productPrice: number;
    productImage?: string;
    quantity: number;
    variant?: { color?: string; size?: string; };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const route = req.query.route as string || 'session';

    try {
        switch (route) {
            case 'session':
                return handleSession(req, res);
            case 'action':
                return handleAction(req, res);
            case 'continue':
                return handleContinue(req, res);
            default:
                return res.status(400).json({ error: `Unknown route: ${route}` });
        }
    } catch (error: any) {
        console.error('[Webview] Unexpected error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}

// ==================== SESSION HANDLERS ====================

async function handleSession(req: VercelRequest, res: VercelResponse) {
    if (req.method === 'GET') {
        const { id } = req.query;
        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: 'Session ID required' });
        }

        const { data: session, error } = await supabase
            .from('webview_sessions')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (new Date(session.expires_at) < new Date()) {
            return res.status(410).json({ error: 'Session expired' });
        }

        return res.status(200).json({ session });
    }

    if (req.method === 'POST') {
        const { external_id, workspace_id, flow_id, current_node_id, page_type, page_config, cart, cart_total, metadata, page_access_token } = req.body;

        if (!external_id || !workspace_id || !page_type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { data: session, error } = await supabase
            .from('webview_sessions')
            .insert({
                external_id, workspace_id, flow_id, current_node_id, page_type,
                page_config: page_config || {},
                cart: cart || [],
                cart_total: cart_total || 0,
                metadata: metadata || {},
                page_access_token,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('[Session] Error creating:', error);
            return res.status(500).json({ error: 'Failed to create session' });
        }

        return res.status(201).json({ session });
    }

    if (req.method === 'PATCH') {
        const { id, ...updates } = req.body;
        if (!id) return res.status(400).json({ error: 'Session ID required' });

        const { data: session, error } = await supabase
            .from('webview_sessions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: 'Failed to update session' });
        }

        return res.status(200).json({ session });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

// ==================== ACTION HANDLERS ====================

async function handleAction(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sessionId, action, payload } = req.body;
    if (!sessionId || !action) {
        return res.status(400).json({ error: 'sessionId and action required' });
    }

    const { data: session, error: fetchError } = await supabase
        .from('webview_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

    if (fetchError || !session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    if (new Date(session.expires_at) < new Date()) {
        return res.status(410).json({ error: 'Session expired' });
    }

    let updates: any = {};
    let result: any = { success: true };

    switch (action) {
        case 'add_to_cart': {
            const { productId, productName, productPrice, productImage, quantity = 1, variant } = payload;
            const cart: CartItem[] = session.cart || [];
            const existingIndex = cart.findIndex((item: CartItem) =>
                item.productId === productId && JSON.stringify(item.variant) === JSON.stringify(variant)
            );

            if (existingIndex >= 0) {
                cart[existingIndex].quantity += quantity;
            } else {
                cart.push({ productId, productName, productPrice, productImage, quantity, variant });
            }

            const cartTotal = cart.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);
            updates = { cart, cart_total: cartTotal };
            result.cart = cart;
            result.cartTotal = cartTotal;
            result.cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
            break;
        }

        case 'update_cart': {
            const { productId, quantity, variant } = payload;
            const cart: CartItem[] = session.cart || [];
            const index = cart.findIndex((item: CartItem) =>
                item.productId === productId && JSON.stringify(item.variant) === JSON.stringify(variant)
            );

            if (index >= 0) {
                if (quantity <= 0) cart.splice(index, 1);
                else cart[index].quantity = quantity;
            }

            const cartTotal = cart.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);
            updates = { cart, cart_total: cartTotal };
            result.cart = cart;
            result.cartTotal = cartTotal;
            break;
        }

        case 'remove_from_cart': {
            const { productId, variant } = payload;
            let cart: CartItem[] = session.cart || [];
            cart = cart.filter((item: CartItem) =>
                !(item.productId === productId && JSON.stringify(item.variant) === JSON.stringify(variant))
            );
            const cartTotal = cart.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);
            updates = { cart, cart_total: cartTotal };
            result.cart = cart;
            result.cartTotal = cartTotal;
            break;
        }

        case 'upsell_accept': {
            const { productName, productPrice, productImage } = payload;
            const cart: CartItem[] = session.cart || [];
            cart.push({
                productId: `upsell_${Date.now()}`,
                productName,
                productPrice,
                productImage,
                quantity: 1,
                isUpsell: true  // Flag for order tracking
            } as any);
            const cartTotal = cart.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);
            updates = { cart, cart_total: cartTotal, user_response: 'accepted', completed_at: new Date().toISOString() };
            result.response = 'accepted';
            break;
        }

        case 'upsell_decline':
            updates = { user_response: 'declined', completed_at: new Date().toISOString() };
            result.response = 'declined';
            break;

        case 'downsell_accept': {
            const { productName, productPrice, productImage, cartAction } = payload;
            let cart: CartItem[] = cartAction === 'replace' ? [] : (session.cart || []);
            cart.push({
                productId: `downsell_${Date.now()}`,
                productName,
                productPrice,
                productImage,
                quantity: 1,
                isDownsell: true  // Flag for order tracking
            } as any);
            const cartTotal = cart.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);
            updates = { cart, cart_total: cartTotal, user_response: 'accepted', completed_at: new Date().toISOString() };
            result.response = 'accepted';
            break;
        }

        case 'downsell_decline':
            updates = { user_response: 'declined', completed_at: new Date().toISOString() };
            result.response = 'declined';
            break;

        case 'submit_form': {
            const formData = payload;
            updates = { form_data: formData, user_response: 'completed', completed_at: new Date().toISOString() };
            await saveToSubscriber(session, formData);
            await syncToGoogleSheets(session, formData);
            result.formData = formData;
            break;
        }

        case 'apply_coupon': {
            const { couponCode } = payload;
            const metadata = session.metadata || {};
            metadata.couponCode = couponCode;
            metadata.couponApplied = true;
            updates = { metadata };
            result.couponApplied = true;
            break;
        }

        case 'checkout_confirm': {
            const { cart, cartTotal, customerName, confirmedAt } = payload;
            updates = {
                cart: cart || session.cart,
                cart_total: cartTotal || session.cart_total,
                customer_name: customerName,
                user_response: 'checkout_confirmed',
                completed_at: confirmedAt || new Date().toISOString()
            };
            // Create order when checkout is confirmed
            await createOrder({ ...session, ...updates });
            result.orderCreated = true;
            result.response = 'confirmed';
            break;
        }

        case 'checkout_complete':
            updates = { user_response: 'checkout_complete', completed_at: new Date().toISOString() };
            await createOrder(session);
            result.orderCreated = true;
            break;

        default:
            return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    await supabase.from('webview_sessions').update(updates).eq('id', sessionId);
    return res.status(200).json(result);
}

// ==================== CONTINUE HANDLERS ====================

async function handleContinue(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { sessionId, closeReason } = req.body;
    if (!sessionId) {
        return res.status(400).json({ error: 'sessionId required' });
    }

    console.log('[Webview Continue] Processing session:', sessionId);

    const { data: session, error: fetchError } = await supabase
        .from('webview_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

    if (fetchError || !session) {
        console.error('[Webview Continue] Session not found:', sessionId);
        return res.status(404).json({ error: 'Session not found' });
    }

    console.log('[Webview Continue] Session data:', {
        page_type: session.page_type,
        flow_id: session.flow_id,
        current_node_id: session.current_node_id,
        cart_length: session.cart?.length || 0
    });

    // Get page access token
    let pageAccessToken = session.page_access_token;
    if (!pageAccessToken) {
        const { data: connection } = await supabase
            .from('connected_pages')
            .select('page_access_token, page_id')
            .eq('workspace_id', session.workspace_id)
            .single();
        pageAccessToken = connection?.page_access_token;
    }

    if (!pageAccessToken) {
        console.error('[Webview Continue] No page access token');
        return res.status(500).json({ error: 'No page access token' });
    }

    // Update subscriber cart data
    await updateSubscriberFromSession(session);

    // Mark session as completed
    await supabase.from('webview_sessions').update({
        completed_at: new Date().toISOString(),
        metadata: { ...session.metadata, closeReason, processedAt: new Date().toISOString() }
    }).eq('id', sessionId);

    // CRITICAL: Continue the flow to the next nodes if we have flow context
    if (session.flow_id && session.current_node_id) {
        console.log('[Webview Continue] Continuing flow from node:', session.current_node_id);

        try {
            // Call the continue-flow API to execute subsequent nodes
            const baseUrl = process.env.VITE_APP_URL || 'https://mcp-v16.vercel.app';
            const continueResponse = await fetch(`${baseUrl}/api/forms/continue-flow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    flowId: session.flow_id,
                    nodeId: session.current_node_id,
                    pageId: session.page_id || null,
                    subscriberId: session.external_id,
                    workspaceId: session.workspace_id,
                    // Pass cart context so downstream nodes can access it
                    cart: session.cart || [],
                    cartTotal: session.cart_total || 0,
                    formData: session.form_data || {},
                    userResponse: session.user_response || 'completed',
                    // Pass access token for sending messages
                    pageAccessToken: pageAccessToken
                })
            });

            const continueResult = await continueResponse.json();
            console.log('[Webview Continue] Flow continuation result:', continueResult);
        } catch (error: any) {
            console.error('[Webview Continue] Error continuing flow:', error.message);
        }
    } else {
        console.log('[Webview Continue] No flow context, sending simple message');
        // Fallback: Send a simple message if we don't have flow context
        let messageText = '';
        switch (session.page_type) {
            case 'product':
                messageText = (session.cart?.length || 0) > 0
                    ? `✅ Added to cart! You now have ${session.cart.length} item(s).`
                    : '👋 No items added. Let me know if you need help!';
                break;
            case 'upsell':
                messageText = session.user_response === 'accepted'
                    ? '🎉 Great choice! Added to your order.'
                    : '👍 No problem! Let\'s continue.';
                break;
            case 'checkout':
                messageText = session.user_response === 'checkout_confirmed'
                    ? '🎉 Order confirmed!'
                    : '🛒 Checkout closed.';
                break;
            default:
                messageText = '✅ Done!';
        }

        if (messageText) {
            await sendMessage(session.external_id, messageText, pageAccessToken);
        }
    }

    return res.status(200).json({ success: true, userResponse: session.user_response });
}

// ==================== HELPER FUNCTIONS ====================

async function sendMessage(recipientId: string, text: string, accessToken: string) {
    try {
        await fetch('https://graph.facebook.com/v21.0/me/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: { id: recipientId },
                message: { text },
                access_token: accessToken
            })
        });
    } catch (error) {
        console.error('[Webview] Error sending message:', error);
    }
}

async function saveToSubscriber(session: any, formData: any) {
    try {
        const { data: subscriber } = await supabase
            .from('subscribers')
            .select('id, metadata')
            .eq('external_id', session.external_id)
            .eq('workspace_id', session.workspace_id)
            .single();

        if (subscriber) {
            await supabase.from('subscribers').update({
                email: formData.email || undefined,
                phone: formData.phone || undefined,
                metadata: { ...(subscriber.metadata || {}), ...formData, cart: session.cart, cartTotal: session.cart_total }
            }).eq('id', subscriber.id);
        }
    } catch (error) {
        console.error('[Webview] Error saving to subscriber:', error);
    }
}

async function syncToGoogleSheets(session: any, formData: any) {
    try {
        const { data: workspace } = await supabase
            .from('workspaces')
            .select('google_webhook_url')
            .eq('id', session.workspace_id)
            .single();

        if (workspace?.google_webhook_url) {
            await fetch(workspace.google_webhook_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    timestamp: new Date().toISOString(),
                    external_id: session.external_id,
                    ...formData,
                    cart_items: JSON.stringify(session.cart),
                    cart_total: session.cart_total
                })
            });
        }
    } catch (error) {
        console.error('[Webview] Error syncing to Google Sheets:', error);
    }
}

async function createOrder(session: any) {
    try {
        await supabase.from('orders').insert({
            workspace_id: session.workspace_id,
            subscriber_id: session.external_id,
            items: session.cart,
            total: session.cart_total,
            form_data: session.form_data,
            status: 'pending',
            source: 'webview',
            metadata: session.metadata
        });
    } catch (error) {
        console.error('[Webview] Error creating order:', error);
    }
}

async function updateSubscriberFromSession(session: any) {
    try {
        const { data: subscriber } = await supabase
            .from('subscribers')
            .select('id, metadata')
            .eq('external_id', session.external_id)
            .eq('workspace_id', session.workspace_id)
            .single();

        if (subscriber) {
            const updates: any = {
                metadata: {
                    ...(subscriber.metadata || {}),
                    cart: session.cart,
                    cartTotal: session.cart_total,
                    formData: session.form_data,
                    lastWebviewSession: session.id,
                    lastWebviewType: session.page_type,
                    lastWebviewResponse: session.user_response
                }
            };

            if (session.page_type === 'upsell') updates.metadata.upsell_response = session.user_response;
            if (session.page_type === 'downsell') updates.metadata.downsell_response = session.user_response;

            await supabase.from('subscribers').update(updates).eq('id', subscriber.id);
        }
    } catch (error) {
        console.error('[Webview] Error updating subscriber:', error);
    }
}
