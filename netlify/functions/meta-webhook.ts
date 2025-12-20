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

                // Process comment events (feed changes)
                for (const change of entry.changes || []) {
                    try {
                        if (change.field === 'feed' && change.value) {
                            await processCommentEvent(change.value, pageId);
                        }
                    } catch (error) {
                        console.error('Error processing comment event:', error);
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

// Process comment events from Facebook feed
async function processCommentEvent(value: any, pageId: string) {
    console.log('Processing comment event for page:', pageId, 'Value:', JSON.stringify(value, null, 2));

    // Check if this is a comment creation event
    if (value.item !== 'comment' || value.verb !== 'add') {
        console.log('Ignoring non-comment-add event');
        return;
    }

    const commentId = value.comment_id;
    const postId = value.post_id;
    const message = value.message;
    const commenterId = value.from?.id;
    const commenterName = value.from?.name;
    const createdTime = value.created_time ? new Date(parseInt(value.created_time) * 1000).toISOString() : new Date().toISOString();
    const parentCommentId = value.parent_id || null;

    if (!commentId || !postId || !commenterId) {
        console.error('Missing required comment data');
        return;
    }

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

    // Check if comment already exists (prevent duplicates)
    const { data: existingComment } = await supabase
        .from('comments')
        .select('id')
        .eq('comment_id', commentId)
        .single();

    if (existingComment) {
        console.log('Comment already exists:', commentId);
        return;
    }

    // Save comment to database
    const { data: savedComment, error: commentError } = await supabase
        .from('comments')
        .insert({
            workspace_id: workspaceId,
            page_id: pageId,
            post_id: postId,
            comment_id: commentId,
            parent_comment_id: parentCommentId,
            message: message || '',
            commenter_id: commenterId,
            commenter_name: commenterName || 'Unknown User',
            created_time: createdTime
        })
        .select()
        .single();

    if (commentError) {
        console.error('Error saving comment:', commentError);
        return;
    }

    console.log('Comment saved successfully:', commentId);

    // Trigger flow execution for this comment
    try {
        await executeFlowsForComment({
            workspaceId,
            pageId,
            commentId,
            postId,
            message: message || '',
            commenterId,
            commenterName: commenterName || 'Unknown User',
            parentCommentId,
            pageAccessToken: (page as any).page_access_token
        });
    } catch (error) {
        console.error('Error executing flows for comment:', error);
    }
}

// Execute flows that match the comment trigger
async function executeFlowsForComment(context: any) {
    const { workspaceId, pageId } = context;

    // Find all active flows for this workspace
    const { data: flows, error } = await supabase
        .from('flows')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'ACTIVE');

    if (error || !flows || flows.length === 0) {
        console.log('No active flows found for workspace:', workspaceId);
        return;
    }

    console.log(`Found ${flows.length} active flows for workspace`);

    // Process each flow
    for (const flow of flows) {
        try {
            // Check if flow has a comment trigger for this page
            const configurations = flow.configurations || {};
            const nodes = flow.nodes || [];

            // Find trigger node
            const triggerNode = nodes.find((node: any) =>
                node.type === 'triggerNode' &&
                node.data?.label?.includes('Comment')
            );

            if (!triggerNode) {
                console.log(`Flow ${flow.id} has no comment trigger`);
                continue;
            }

            // Get trigger configuration
            const triggerConfig = configurations[triggerNode.id] || {};

            // Check if trigger is configured for this page
            if (triggerConfig.pageId !== pageId) {
                console.log(`Flow ${flow.id} trigger not configured for page ${pageId}`);
                continue;
            }

            console.log(`Executing flow ${flow.id} (${flow.name}) for comment`);

            // Execute the flow
            await executeFlow(flow, configurations, context);

        } catch (error) {
            console.error(`Error processing flow ${flow.id}:`, error);
        }
    }
}

// Execute a single flow with the given context
async function executeFlow(flow: any, configurations: any, context: any) {
    const nodes = flow.nodes || [];
    const edges = flow.edges || [];

    // Build execution order from edges
    const nodeMap = new Map(nodes.map((n: any) => [n.id, n]));
    const executionOrder: any[] = [];

    // Find trigger node (starting point)
    const triggerNode = nodes.find((n: any) => n.type === 'triggerNode');
    if (!triggerNode) {
        console.error('No trigger node found in flow');
        return;
    }

    // Simple sequential execution following edges
    let currentNodeId = triggerNode.id;
    const visited = new Set<string>();

    while (currentNodeId && !visited.has(currentNodeId)) {
        visited.add(currentNodeId);
        const node = nodeMap.get(currentNodeId);
        if (node && node.type !== 'triggerNode') {
            executionOrder.push(node);
        }

        // Find next node
        const nextEdge = edges.find((e: any) => e.source === currentNodeId);
        currentNodeId = nextEdge?.target;
    }

    console.log(`Executing ${executionOrder.length} action nodes`);

    // Execute each action node
    for (const node of executionOrder) {
        try {
            const config = configurations[node.id] || {};
            await executeActionNode(node, config, context);
        } catch (error) {
            console.error(`Error executing node ${node.id}:`, error);
        }
    }
}

// Execute a single action node
async function executeActionNode(node: any, config: any, context: any) {
    console.log(`Executing action node: ${node.data?.label || node.id}`);

    // Replace variables in templates
    const replaceVariables = (template: string) => {
        return template
            .replace(/\{\{USER\}\}/g, context.commenterName)
            .replace(/\{\{COMMENT\}\}/g, context.message)
            .replace(/\{\{POST\}\}/g, context.postId);
    };

    // Handle different action types
    if (node.data?.label?.includes('Comment Reply')) {
        // Reply to comment
        const replyTemplate = config.replyTemplate || config.template || '';
        const replyMessage = replaceVariables(replyTemplate);

        if (replyMessage && context.pageAccessToken) {
            await replyToComment(context.commentId, replyMessage, context.pageAccessToken);
        }
    } else if (node.data?.label?.includes('Send') && node.data?.label?.includes('Message')) {
        // Send DM
        const messageTemplate = config.messageTemplate || config.template || '';
        const dmMessage = replaceVariables(messageTemplate);

        if (dmMessage && context.pageAccessToken && config.sendDM) {
            await sendDirectMessage(context.commenterId, dmMessage, context.pageAccessToken);
        }
    }
}

// Reply to a Facebook comment
async function replyToComment(commentId: string, message: string, pageAccessToken: string) {
    try {
        console.log(`Replying to comment ${commentId}: ${message}`);

        const response = await fetch(
            `https://graph.facebook.com/v18.0/${commentId}/comments`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    access_token: pageAccessToken
                })
            }
        );

        const result = await response.json();

        if (result.error) {
            console.error('Error replying to comment:', result.error);
        } else {
            console.log('Comment reply posted successfully:', result.id);
        }
    } catch (error) {
        console.error('Error in replyToComment:', error);
    }
}

// Send a direct message to a Facebook user
async function sendDirectMessage(userId: string, message: string, pageAccessToken: string) {
    try {
        console.log(`Sending DM to user ${userId}: ${message}`);

        const response = await fetch(
            `https://graph.facebook.com/v18.0/me/messages`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: userId },
                    message: { text: message },
                    access_token: pageAccessToken
                })
            }
        );

        const result = await response.json();

        if (result.error) {
            console.error('Error sending DM:', result.error);
        } else {
            console.log('DM sent successfully:', result.message_id);
        }
    } catch (error) {
        console.error('Error in sendDirectMessage:', error);
    }
}


