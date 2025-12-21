import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
// Use service role key for webhooks to bypass RLS policies
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { method, query, body } = req;

    console.log('Webhook request received:', { method, query });

    // Handle GET request for webhook verification
    if (method === 'GET') {
        const mode = query['hub.mode'] as string;
        const token = query['hub.verify_token'] as string;
        const challenge = query['hub.challenge'] as string;

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
                    return res.status(500).json({ error: 'Failed to retrieve verify token' });
                }

                if (!data || !data.facebook_verify_token) {
                    console.error('Verify token not configured in admin settings');
                    return res.status(500).json({ error: 'Verify token not configured' });
                }

                // Verify token matches
                if (token === data.facebook_verify_token) {
                    console.log('Verification successful! Returning challenge:', challenge);
                    return res.status(200).send(challenge);
                } else {
                    console.error('Verification token mismatch');
                    return res.status(403).json({ error: 'Verification token mismatch' });
                }
            } catch (err) {
                console.error('Unexpected error during verification:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
        }

        return res.status(400).json({ error: 'Invalid verification request' });
    }

    // Handle POST request for webhook events
    if (method === 'POST') {
        try {
            const eventData = body;
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
            return res.status(200).send('EVENT_RECEIVED');
        } catch (err) {
            console.error('Error processing webhook event:', err);
            // Still return 200 to avoid Facebook retrying
            return res.status(200).send('EVENT_RECEIVED');
        }
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
}

// Process individual messaging events
async function processMessagingEvent(event: any, pageId: string) {
    const senderId = event.sender.id;

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
            await supabase
                .from('subscribers')
                .update({ last_active_at: timestamp })
                .eq('id', existingSubscriber.id);
            subscriber = existingSubscriber;
        } else {
            try {
                const userInfoResponse = await fetch(
                    `https://graph.facebook.com/v18.0/${senderId}?fields=name,profile_pic&access_token=${(page as any).page_access_token}`
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

        // Create conversation ID
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

        // Check if message already exists
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

    // Ignore comments made by the page itself to prevent infinite loops
    const commenterIdStr = String(commenterId);
    const pageIdStr = String(pageId);

    if (commenterIdStr === pageIdStr) {
        console.log(`Ignoring comment from page itself (PageID: ${pageId}, CommenterID: ${commenterId})`);
        return;
    }

    console.log(`Processing comment from user ${commenterId} (${commenterName})`);

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

    // Check if comment already exists
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
    const { error: commentError } = await supabase
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
        });

    if (commentError) {
        console.error('Error saving comment:', commentError);
        return;
    }

    console.log('Comment saved successfully:', commentId);

    // Trigger flow execution
    try {
        await executeFlowsForComment({
            workspaceId,
            pageId,
            pageDbId: (page as any).id, // Database UUID for trigger matching
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
    const { workspaceId, pageId, pageDbId } = context;

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

    for (const flow of flows) {
        try {
            const configurations = flow.configurations || {};
            const nodes = flow.nodes || [];

            const triggerNode = nodes.find((node: any) =>
                node.type === 'triggerNode' &&
                node.data?.label?.includes('Comment')
            );

            if (!triggerNode) {
                console.log(`Flow ${flow.id} has no comment trigger`);
                continue;
            }

            const triggerConfig = configurations[triggerNode.id] || {};

            // Compare against database UUID, not Facebook Page ID
            if (triggerConfig.pageId !== pageDbId) {
                console.log(`Flow ${flow.id} trigger not configured for page ${pageId} (DB ID: ${pageDbId}, Expected: ${triggerConfig.pageId})`);
                continue;
            }

            console.log(`Executing flow ${flow.id} (${flow.name}) for comment`);
            await executeFlow(flow, configurations, context);

        } catch (error) {
            console.error(`Error processing flow ${flow.id}:`, error);
        }
    }
}

// Execute a single flow
async function executeFlow(flow: any, configurations: any, context: any) {
    const nodes = flow.nodes || [];
    const edges = flow.edges || [];

    const nodeMap = new Map(nodes.map((n: any) => [n.id, n]));
    const executionOrder: any[] = [];

    const triggerNode = nodes.find((n: any) => n.type === 'triggerNode');
    if (!triggerNode) {
        console.error('No trigger node found in flow');
        return;
    }

    let currentNodeId = triggerNode.id;
    const visited = new Set<string>();

    while (currentNodeId && !visited.has(currentNodeId)) {
        visited.add(currentNodeId);
        const node = nodeMap.get(currentNodeId) as any;
        if (node && node.type !== 'triggerNode') {
            executionOrder.push(node);
        }

        const nextEdge = edges.find((e: any) => e.source === currentNodeId);
        currentNodeId = nextEdge?.target;
    }

    console.log(`Executing ${executionOrder.length} action nodes`);

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

    const replaceVariables = (template: string) => {
        return template
            .replace(/\{\{USER\}\}/g, context.commenterName)
            .replace(/\{\{COMMENT\}\}/g, context.message)
            .replace(/\{\{POST\}\}/g, context.postId);
    };

    if (node.data?.label?.includes('Comment Reply')) {
        const replyTemplate = config.replyTemplate || config.template || '';
        const replyMessage = replaceVariables(replyTemplate);

        console.log(`Comment Reply node - replyMessage: ${replyMessage}, hasToken: ${!!context.pageAccessToken}`);

        if (replyMessage && context.pageAccessToken) {
            await replyToComment(context.commentId, replyMessage, context.pageAccessToken);
        } else {
            console.log(`Skipping comment reply - missing replyMessage or pageAccessToken`);
        }
    } else if (node.data?.label?.includes('Send') && node.data?.label?.includes('Message')) {
        const messageTemplate = config.messageTemplate || config.template || '';
        const dmMessage = replaceVariables(messageTemplate);

        console.log(`Send Message node - dmMessage: ${dmMessage}, hasToken: ${!!context.pageAccessToken}, config:`, JSON.stringify(config));

        // If this is a Send Message node, send the DM (don't require sendDM flag)
        if (dmMessage && context.pageAccessToken) {
            await sendDirectMessage(context.commenterId, dmMessage, context.pageId, context.pageAccessToken);
        } else {
            console.log(`Skipping DM - dmMessage: ${!!dmMessage}, pageAccessToken: ${!!context.pageAccessToken}`);
        }
    } else {
        console.log(`Unknown action node type: ${node.data?.label}`);
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

// Send a direct message
async function sendDirectMessage(userId: string, message: string, pageId: string, pageAccessToken: string) {
    try {
        console.log(`Sending DM to user ${userId} from page ${pageId}: ${message}`);

        const response = await fetch(
            `https://graph.facebook.com/v18.0/${pageId}/messages`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: userId },
                    message: { text: message },
                    messaging_type: 'RESPONSE',
                    access_token: pageAccessToken
                })
            }
        );

        const result = await response.json();
        console.log('FB DM Response:', JSON.stringify(result, null, 2));

        if (result.error) {
            console.error('Error sending DM:', result.error);
        } else {
            console.log('DM sent successfully:', result.message_id);
        }
    } catch (error) {
        console.error('Error in sendDirectMessage:', error);
    }
}
