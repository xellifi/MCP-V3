import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    const { httpMethod, queryStringParameters, body } = event;

    console.log('Webhook request received:', { httpMethod, queryStringParameters });

    // Handle GET request for webhook verification
    if (httpMethod === 'GET') {
        const mode = queryStringParameters?.['hub.mode'];
        const token = queryStringParameters?.['hub.verify_token'];
        const challenge = queryStringParameters?.['hub.challenge'];

        console.log('Verification request:', { mode, token: token ? '***' : 'missing', challenge });

        if (mode === 'subscribe') {
            try {
                // Get verify token from Supabase admin_settings
                const { data, error } = await supabase
                    .from('admin_settings')
                    .select('facebook_verify_token')
                    .eq('id', 1)
                    .single();

                if (error) {
                    console.error('Error fetching verify token:', error);
                    return {
                        statusCode: 500,
                        body: JSON.stringify({ error: 'Failed to retrieve verify token' })
                    };
                }

                if (!data || !data.facebook_verify_token) {
                    console.error('Verify token not configured in admin settings');
                    return {
                        statusCode: 500,
                        body: JSON.stringify({ error: 'Verify token not configured' })
                    };
                }

                // Verify token matches
                if (token === data.facebook_verify_token) {
                    console.log('Verification successful! Returning challenge:', challenge);
                    return {
                        statusCode: 200,
                        body: challenge || '',
                        headers: { 'Content-Type': 'text/plain' }
                    };
                } else {
                    console.error('Verification token mismatch');
                    return {
                        statusCode: 403,
                        body: JSON.stringify({ error: 'Verification token mismatch' })
                    };
                }
            } catch (err) {
                console.error('Unexpected error during verification:', err);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ error: 'Internal server error' })
                };
            }
        }

        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid verification request' })
        };
    }

    // Handle POST request for webhook events
    if (httpMethod === 'POST') {
        try {
            // Parse webhook event
            const eventData = JSON.parse(body || '{}');

            console.log('Received webhook event:', JSON.stringify(eventData, null, 2));

            // Process each entry (can be multiple)
            for (const entry of eventData.entry || []) {
                const pageId = entry.id;

                // Process messaging events
                for (const messagingEvent of entry.messaging || []) {
                    try {
                        await processMessagingEvent(messagingEvent, pageId);
                    } catch (error) {
                        console.error('Error processing messaging event:', error);
                    }
                }
            }

            // Facebook expects a 200 OK response quickly
            return {
                statusCode: 200,
                body: 'EVENT_RECEIVED',
                headers: { 'Content-Type': 'text/plain' }
            };
        } catch (err) {
            console.error('Error processing webhook event:', err);
            // Still return 200 to avoid Facebook retrying
            return {
                statusCode: 200,
                body: 'EVENT_RECEIVED',
                headers: { 'Content-Type': 'text/plain' }
            };
        }
    }

    return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' })
    };
};

// Process individual messaging events
async function processMessagingEvent(event: any, pageId: string) {
    const senderId = event.sender.id;
    const recipientId = event.recipient.id;

    console.log('Processing message from:', senderId, 'to page:', pageId);

    // Get the page details and workspace
    const { data: page } = await supabase
        .from('connected_pages')
        .select('*, workspaces!inner(id)')
        .eq('page_id', pageId)
        .single();

    if (!page) {
        console.error('Page not found:', pageId);
        return;
    }

    const workspaceId = (page as any).workspaces.id;

    // Handle message event
    if (event.message) {
        const messageText = event.message.text || '';
        const messageId = event.message.mid;
        const timestamp = new Date(event.timestamp).toISOString();

        // Create or update subscriber
        let subscriber;
        const { data: existingSubscriber } = await supabase
            .from('subscribers')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('external_id', senderId)
            .single();

        if (existingSubscriber) {
            // Update last active time
            await supabase
                .from('subscribers')
                .update({ last_active_at: timestamp })
                .eq('id', existingSubscriber.id);
            subscriber = existingSubscriber;
        } else {
            // Fetch user info from Facebook
            try {
                const userInfoResponse = await fetch(
                    `https://graph.facebook.com/v18.0/${senderId}?fields=name,profile_pic&access_token=${page.page_access_token}`
                );
                const userInfo = await userInfoResponse.json();

                const { data: newSubscriber } = await supabase
                    .from('subscribers')
                    .insert({
                        workspace_id: workspaceId,
                        name: userInfo.name || 'Unknown User',
                        platform: 'FACEBOOK',
                        external_id: senderId,
                        avatar_url: userInfo.profile_pic,
                        status: 'SUBSCRIBED',
                        last_active_at: timestamp
                    })
                    .select()
                    .single();

                subscriber = newSubscriber;
            } catch (error) {
                console.error('Error creating subscriber:', error);
                return;
            }
        }

        if (!subscriber) return;

        // Create conversation ID (Facebook format: pageId_senderId)
        const conversationExternalId = `${pageId}_${senderId}`;

        // Create or update conversation
        let conversation;
        const { data: existingConv } = await supabase
            .from('conversations')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('external_id', conversationExternalId)
            .single();

        if (existingConv) {
            // Update conversation
            const { data: updatedConv } = await supabase
                .from('conversations')
                .update({
                    last_message_preview: messageText.substring(0, 100),
                    unread_count: existingConv.unread_count + 1,
                    updated_at: timestamp
                })
                .eq('id', existingConv.id)
                .select()
                .single();
            conversation = updatedConv;
        } else {
            // Create new conversation
            const { data: newConv } = await supabase
                .from('conversations')
                .insert({
                    workspace_id: workspaceId,
                    subscriber_id: subscriber.id,
                    platform: 'FACEBOOK',
                    external_id: conversationExternalId,
                    page_id: pageId,
                    last_message_preview: messageText.substring(0, 100),
                    unread_count: 1,
                    updated_at: timestamp
                })
                .select()
                .single();
            conversation = newConv;
        }

        if (!conversation) return;

        // Check if message already exists (prevent duplicates)
        const { data: existingMessage } = await supabase
            .from('messages')
            .select('id')
            .eq('external_id', messageId)
            .single();

        if (existingMessage) {
            console.log('Message already exists:', messageId);
            return;
        }

        // Determine message type
        let messageType = 'TEXT';
        let attachmentUrl = null;

        if (event.message.attachments && event.message.attachments.length > 0) {
            const attachment = event.message.attachments[0];
            if (attachment.type === 'image') {
                messageType = 'IMAGE';
                attachmentUrl = attachment.payload?.url;
            } else if (attachment.type === 'video') {
                messageType = 'VIDEO';
                attachmentUrl = attachment.payload?.url;
            } else if (attachment.type === 'file') {
                messageType = 'FILE';
                attachmentUrl = attachment.payload?.url;
            }
        }

        // Save message to database
        await supabase
            .from('messages')
            .insert({
                conversation_id: conversation.id,
                external_id: messageId,
                direction: 'INBOUND',
                content: messageText,
                type: messageType,
                platform: 'FACEBOOK',
                attachment_url: attachmentUrl,
                sender_id: senderId,
                created_at: timestamp,
                status: 'DELIVERED'
            });

        console.log('Message saved successfully:', messageId);
    }

    // Handle delivery confirmation
    if (event.delivery) {
        console.log('Message delivery confirmed:', event.delivery.mids);
        // Optionally update message status to DELIVERED
    }

    // Handle read receipt
    if (event.read) {
        console.log('Message read:', event.read);
        // Optionally update message status to READ
    }
}

