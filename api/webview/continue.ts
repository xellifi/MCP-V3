import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Continue Messenger Flow API
 * 
 * Called when webview closes to continue the Messenger flow.
 * Sends the appropriate response back to the user and triggers next flow nodes.
 */

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
        const { sessionId, closeReason } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'sessionId required' });
        }

        // Get session data
        const { data: session, error: fetchError } = await supabase
            .from('webview_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (fetchError || !session) {
            console.error('[Continue] Session not found:', sessionId);
            return res.status(404).json({ error: 'Session not found' });
        }

        console.log(`[Continue] Session ${sessionId}, type: ${session.page_type}, response: ${session.user_response}`);

        // Get page access token
        let pageAccessToken = session.page_access_token;

        if (!pageAccessToken) {
            // Try to get from connected pages
            const { data: connection } = await supabase
                .from('connected_pages')
                .select('access_token')
                .eq('workspace_id', session.workspace_id)
                .eq('is_active', true)
                .single();

            pageAccessToken = connection?.access_token;
        }

        if (!pageAccessToken) {
            console.error('[Continue] No page access token available');
            return res.status(500).json({ error: 'No page access token' });
        }

        // Send appropriate message based on session type and response
        let messageText = '';
        let nextAction = '';

        switch (session.page_type) {
            case 'product':
                const cartCount = session.cart?.length || 0;
                if (cartCount > 0) {
                    messageText = `✅ Added to cart! You now have ${cartCount} item(s) in your cart.`;
                    nextAction = 'continue_flow';
                } else {
                    messageText = '👋 No items added. Let me know if you need help!';
                    nextAction = 'continue_flow';
                }
                break;

            case 'upsell':
                if (session.user_response === 'accepted') {
                    messageText = '🎉 Great choice! Upsell added to your order.';
                } else {
                    messageText = '👍 No problem! Let\'s continue with your order.';
                }
                nextAction = 'continue_flow';
                break;

            case 'downsell':
                if (session.user_response === 'accepted') {
                    messageText = '✅ Added to your order!';
                } else {
                    messageText = '👋 No worries! Let\'s proceed.';
                }
                nextAction = 'continue_flow';
                break;

            case 'cart':
                if (session.user_response === 'checkout') {
                    messageText = '🛒 Proceeding to checkout...';
                    nextAction = 'checkout';
                } else {
                    messageText = '🛒 Your cart has been updated.';
                    nextAction = 'continue_flow';
                }
                break;

            case 'form':
                if (session.user_response === 'completed') {
                    messageText = '✅ Thank you! Your information has been saved.';
                    nextAction = 'continue_flow';
                } else {
                    messageText = '📝 Form closed. Let me know when you\'re ready to continue.';
                }
                break;
        }

        // Send message to user
        if (messageText) {
            await sendMessage(session.external_id, messageText, pageAccessToken);
        }

        // Update subscriber metadata with session data
        await updateSubscriberFromSession(session);

        // If we should continue the flow, trigger next node
        if (nextAction === 'continue_flow' && session.flow_id && session.current_node_id) {
            await triggerNextNode(session, pageAccessToken);
        }

        // Mark session as fully processed
        await supabase
            .from('webview_sessions')
            .update({
                completed_at: new Date().toISOString(),
                metadata: {
                    ...session.metadata,
                    closeReason,
                    processedAt: new Date().toISOString()
                }
            })
            .eq('id', sessionId);

        return res.status(200).json({
            success: true,
            userResponse: session.user_response,
            nextAction
        });

    } catch (error: any) {
        console.error('[Continue] Unexpected error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}

async function sendMessage(recipientId: string, text: string, accessToken: string) {
    try {
        const response = await fetch('https://graph.facebook.com/v21.0/me/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: { id: recipientId },
                message: { text },
                access_token: accessToken
            })
        });

        const result = await response.json();
        if (result.error) {
            console.error('[Continue] Error sending message:', result.error);
        } else {
            console.log('[Continue] Message sent:', result.message_id);
        }
    } catch (error) {
        console.error('[Continue] Error sending message:', error);
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
                    lastWebviewResponse: session.user_response,
                    lastWebviewAt: new Date().toISOString()
                }
            };

            // Add upsell/downsell response to metadata for condition node
            if (session.page_type === 'upsell') {
                updates.metadata.upsell_response = session.user_response;
            }
            if (session.page_type === 'downsell') {
                updates.metadata.downsell_response = session.user_response;
            }

            await supabase
                .from('subscribers')
                .update(updates)
                .eq('id', subscriber.id);

            console.log(`[Continue] Updated subscriber ${subscriber.id} with session data`);
        }
    } catch (error) {
        console.error('[Continue] Error updating subscriber:', error);
    }
}

async function triggerNextNode(session: any, pageAccessToken: string) {
    try {
        // Get flow data
        const { data: flow } = await supabase
            .from('flows')
            .select('nodes, edges, configurations')
            .eq('id', session.flow_id)
            .single();

        if (!flow) {
            console.log('[Continue] Flow not found');
            return;
        }

        const nodes = flow.nodes || [];
        const edges = flow.edges || [];
        const configurations = flow.configurations || {};

        // Find current node
        const currentNode = nodes.find((n: any) => n.id === session.current_node_id);
        if (!currentNode) {
            console.log('[Continue] Current node not found');
            return;
        }

        // Find outgoing edges from current node
        const outgoingEdges = edges.filter((e: any) => e.source === session.current_node_id);

        if (outgoingEdges.length === 0) {
            console.log('[Continue] No outgoing edges from current node');
            return;
        }

        // Build context for condition evaluation
        const context = {
            commenterId: session.external_id,
            workspaceId: session.workspace_id,
            cart: session.cart,
            cartTotal: session.cart_total,
            cartCount: session.cart?.length || 0,
            formData: session.form_data,
            upsell_response: session.page_type === 'upsell' ? session.user_response : undefined,
            downsell_response: session.page_type === 'downsell' ? session.user_response : undefined,
            webview_completed: true,
            form_submitted: session.page_type === 'form' && session.user_response === 'completed'
        };

        console.log(`[Continue] Context for next node:`, JSON.stringify(context));

        // For now, just trigger a postback to continue the flow
        // The meta webhook handler will process it
        const payload = JSON.stringify({
            action: 'webview_continue',
            sessionId: session.id,
            nodeId: session.current_node_id,
            flowId: session.flow_id,
            userResponse: session.user_response,
            pageType: session.page_type,
            context
        });

        // Store the context in subscriber for the webhook to pick up
        await supabase
            .from('subscribers')
            .update({
                metadata: {
                    pendingFlowContinuation: {
                        flowId: session.flow_id,
                        nodeId: session.current_node_id,
                        context,
                        timestamp: new Date().toISOString()
                    }
                }
            })
            .eq('external_id', session.external_id)
            .eq('workspace_id', session.workspace_id);

        console.log(`[Continue] Stored flow continuation context for next message`);

    } catch (error) {
        console.error('[Continue] Error triggering next node:', error);
    }
}
