import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Webview Action API
 * 
 * Handles all webview user actions:
 * - add_to_cart: Add product to cart
 * - update_cart: Update cart item quantity
 * - remove_from_cart: Remove item from cart
 * - upsell_accept / upsell_decline: Handle upsell response
 * - downsell_accept / downsell_decline: Handle downsell response
 * - submit_form: Submit form data
 * - apply_coupon: Apply discount coupon
 */

interface CartItem {
    productId: string;
    productName: string;
    productPrice: number;
    productImage?: string;
    quantity: number;
    variant?: {
        color?: string;
        size?: string;
    };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { sessionId, action, payload } = req.body;

        if (!sessionId || !action) {
            return res.status(400).json({ error: 'sessionId and action required' });
        }

        // Get current session
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

                // Check if product already in cart
                const existingIndex = cart.findIndex((item: CartItem) =>
                    item.productId === productId &&
                    JSON.stringify(item.variant) === JSON.stringify(variant)
                );

                if (existingIndex >= 0) {
                    cart[existingIndex].quantity += quantity;
                } else {
                    cart.push({
                        productId,
                        productName,
                        productPrice,
                        productImage,
                        quantity,
                        variant
                    });
                }

                const cartTotal = cart.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);

                updates = { cart, cart_total: cartTotal };
                result.cart = cart;
                result.cartTotal = cartTotal;
                result.cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
                console.log(`[Action] Added to cart: ${productName} x${quantity}`);
                break;
            }

            case 'update_cart': {
                const { productId, quantity, variant } = payload;
                const cart: CartItem[] = session.cart || [];

                const index = cart.findIndex((item: CartItem) =>
                    item.productId === productId &&
                    JSON.stringify(item.variant) === JSON.stringify(variant)
                );

                if (index >= 0) {
                    if (quantity <= 0) {
                        cart.splice(index, 1);
                    } else {
                        cart[index].quantity = quantity;
                    }
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
                    !(item.productId === productId &&
                        JSON.stringify(item.variant) === JSON.stringify(variant))
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
                    quantity: 1
                });

                const cartTotal = cart.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);
                updates = {
                    cart,
                    cart_total: cartTotal,
                    user_response: 'accepted',
                    completed_at: new Date().toISOString()
                };
                result.response = 'accepted';
                console.log(`[Action] Upsell accepted: ${productName}`);
                break;
            }

            case 'upsell_decline': {
                updates = {
                    user_response: 'declined',
                    completed_at: new Date().toISOString()
                };
                result.response = 'declined';
                console.log(`[Action] Upsell declined`);
                break;
            }

            case 'downsell_accept': {
                const { productName, productPrice, productImage, cartAction } = payload;
                let cart: CartItem[] = session.cart || [];

                if (cartAction === 'replace') {
                    cart = []; // Clear existing cart
                }

                cart.push({
                    productId: `downsell_${Date.now()}`,
                    productName,
                    productPrice,
                    productImage,
                    quantity: 1
                });

                const cartTotal = cart.reduce((sum, item) => sum + (item.productPrice * item.quantity), 0);
                updates = {
                    cart,
                    cart_total: cartTotal,
                    user_response: 'accepted',
                    completed_at: new Date().toISOString()
                };
                result.response = 'accepted';
                console.log(`[Action] Downsell accepted: ${productName}`);
                break;
            }

            case 'downsell_decline': {
                updates = {
                    user_response: 'declined',
                    completed_at: new Date().toISOString()
                };
                result.response = 'declined';
                console.log(`[Action] Downsell declined`);
                break;
            }

            case 'submit_form': {
                const formData = payload;
                updates = {
                    form_data: formData,
                    user_response: 'completed',
                    completed_at: new Date().toISOString()
                };

                // Also save to subscriber metadata
                await saveToSubscriber(session, formData);

                // Sync to Google Sheets if configured
                await syncToGoogleSheets(session, formData);

                result.formData = formData;
                console.log(`[Action] Form submitted`);
                break;
            }

            case 'apply_coupon': {
                const { couponCode } = payload;
                // TODO: Validate coupon code against database
                const metadata = session.metadata || {};
                metadata.couponCode = couponCode;
                metadata.couponApplied = true;
                // For now, just store the coupon - actual discount logic can be added later
                updates = { metadata };
                result.couponApplied = true;
                console.log(`[Action] Coupon applied: ${couponCode}`);
                break;
            }

            case 'checkout_complete': {
                updates = {
                    user_response: 'checkout_complete',
                    completed_at: new Date().toISOString()
                };

                // Create order in database
                await createOrder(session);

                result.orderCreated = true;
                console.log(`[Action] Checkout completed`);
                break;
            }

            default:
                return res.status(400).json({ error: `Unknown action: ${action}` });
        }

        // Update session in database
        const { error: updateError } = await supabase
            .from('webview_sessions')
            .update(updates)
            .eq('id', sessionId);

        if (updateError) {
            console.error('[Action] Error updating session:', updateError);
            return res.status(500).json({ error: 'Failed to update session' });
        }

        return res.status(200).json(result);

    } catch (error: any) {
        console.error('[Action] Unexpected error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}

async function saveToSubscriber(session: any, formData: any) {
    try {
        const { data: subscriber, error: fetchError } = await supabase
            .from('subscribers')
            .select('id, metadata')
            .eq('external_id', session.external_id)
            .eq('workspace_id', session.workspace_id)
            .single();

        if (subscriber) {
            const currentMetadata = subscriber.metadata || {};
            await supabase
                .from('subscribers')
                .update({
                    email: formData.email || currentMetadata.email,
                    phone: formData.phone || currentMetadata.phone,
                    metadata: {
                        ...currentMetadata,
                        ...formData,
                        cart: session.cart,
                        cartTotal: session.cart_total,
                        lastFormSubmission: new Date().toISOString()
                    }
                })
                .eq('id', subscriber.id);

            console.log(`[Action] Saved form data to subscriber ${subscriber.id}`);
        }
    } catch (error) {
        console.error('[Action] Error saving to subscriber:', error);
    }
}

async function syncToGoogleSheets(session: any, formData: any) {
    try {
        // Get workspace Google Sheets webhook URL
        const { data: workspace } = await supabase
            .from('workspaces')
            .select('google_webhook_url')
            .eq('id', session.workspace_id)
            .single();

        if (workspace?.google_webhook_url) {
            const sheetData = {
                timestamp: new Date().toISOString(),
                external_id: session.external_id,
                ...formData,
                cart_items: JSON.stringify(session.cart),
                cart_total: session.cart_total
            };

            await fetch(workspace.google_webhook_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sheetData)
            });

            console.log(`[Action] Synced to Google Sheets`);
        }
    } catch (error) {
        console.error('[Action] Error syncing to Google Sheets:', error);
    }
}

async function createOrder(session: any) {
    try {
        const orderData = {
            workspace_id: session.workspace_id,
            subscriber_id: session.external_id,
            items: session.cart,
            total: session.cart_total,
            form_data: session.form_data,
            status: 'pending',
            source: 'webview',
            metadata: session.metadata
        };

        const { data: order, error } = await supabase
            .from('orders')
            .insert(orderData)
            .select()
            .single();

        if (error) {
            console.error('[Action] Error creating order:', error);
        } else {
            console.log(`[Action] Created order ${order.id}`);
        }
    } catch (error) {
        console.error('[Action] Error creating order:', error);
    }
}
