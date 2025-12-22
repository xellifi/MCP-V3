import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { method, query, body } = req;

    console.log('========== WEBHOOK REQUEST RECEIVED ==========');
    console.log('Method:', method);
    console.log('Query:', JSON.stringify(query));
    console.log('Body:', JSON.stringify(body, null, 2));
    console.log('==============================================');

    // Handle GET request for webhook verification
    if (method === 'GET') {
        return handleVerification(query, res);
    }

    // Handle POST request for webhook events
    if (method === 'POST') {
        return handleWebhookEvent(body, res);
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
}

// Handle Facebook webhook verification
async function handleVerification(query: any, res: VercelResponse) {
    const mode = query['hub.mode'] as string;
    const token = query['hub.verify_token'] as string;
    const challenge = query['hub.challenge'] as string;

    console.log('📋 Webhook verification request');

    if (mode === 'subscribe') {
        const { data } = await supabase
            .from('admin_settings')
            .select('facebook_verify_token')
            .eq('id', 1)
            .single();

        if (data && token === data.facebook_verify_token) {
            console.log('✓ Verification successful');
            return res.status(200).send(challenge);
        }

        console.log('✗ Verification token mismatch');
        return res.status(403).json({ error: 'Verification failed' });
    }

    return res.status(400).json({ error: 'Invalid verification request' });
}

// Handle incoming webhook events
async function handleWebhookEvent(eventData: any, res: VercelResponse) {
    console.log('\n========== WEBHOOK EVENT RECEIVED ==========');

    try {
        // Process each entry
        for (const entry of eventData.entry || []) {
            const pageId = entry.id;

            // Process feed changes (comments)
            for (const change of entry.changes || []) {
                if (change.field === 'feed' && change.value) {
                    await processComment(change.value, pageId);
                }
            }
        }

        return res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
        console.error('✗ Error processing webhook:', error);
        return res.status(200).send('EVENT_RECEIVED'); // Always return 200 to Facebook
    }
}

// Process a single comment event
async function processComment(value: any, pageId: string) {
    console.log('\n--- Processing Feed Event ---');
    console.log('Raw value object:', JSON.stringify(value, null, 2));

    // Check the item type and verb
    const itemType = value.item;
    const verb = value.verb;
    console.log(`Item type: ${itemType}, Verb: ${verb}`);

    // Only process comment items (not status, photo, etc.)
    if (itemType !== 'comment') {
        console.log(`⊘ Skipping: Not a comment event (item: ${itemType})`);
        return;
    }

    // Skip delete/remove events - process add and edited events
    if (verb === 'remove' || verb === 'delete') {
        console.log(`⊘ Skipping: Comment deletion event (verb: ${verb})`);
        return;
    }

    // Extract comment data
    const commentId = value.comment_id;
    const postId = value.post_id;
    const message = value.message;
    const fromId = value.from?.id;
    const fromName = value.from?.name;
    const parentId = value.parent_id || null;

    // If we don't have a comment_id, this isn't a valid comment event
    if (!commentId) {
        console.log('⊘ Skipping: No comment_id found');
        console.log('Available fields:', Object.keys(value));
        return;
    }

    console.log(`Comment ID: ${commentId}`);
    console.log(`From: ${fromName} (${fromId})`);
    console.log(`Message: "${message}"`);
    console.log(`Page ID: ${pageId}`);

    // CRITICAL: Ignore comments from the page itself
    if (String(fromId) === String(pageId)) {
        console.log('✓ IGNORING: This is the page\'s own comment (preventing loop)');
        return;
    }

    // Check if we've already processed this comment
    const { data: existingComment } = await supabase
        .from('comments')
        .select('id, processed')
        .eq('comment_id', commentId)
        .single();

    if (existingComment) {
        if (existingComment.processed) {
            console.log('✓ SKIPPING: Comment already processed');
            return;
        }
        console.log('⚠️  Comment exists but not processed - skipping to be safe');
        return;
    }

    // Get page details
    const { data: page } = await supabase
        .from('connected_pages')
        .select('*, workspaces!inner(id)')
        .eq('page_id', pageId)
        .single();

    if (!page) {
        console.log('✗ Page not found in database');
        return;
    }

    const workspaceId = (page as any).workspaces.id;
    const pageAccessToken = (page as any).page_access_token;
    const pageName = (page as any).name || 'Your Page';

    console.log(`✓ Page found: ${pageName} (Workspace: ${workspaceId})`);

    // Save comment to database
    const { error: saveError } = await supabase
        .from('comments')
        .insert({
            workspace_id: workspaceId,
            page_id: pageId,
            post_id: postId,
            comment_id: commentId,
            parent_comment_id: parentId,
            message: message || '',
            commenter_id: fromId,
            commenter_name: fromName || 'Unknown',
            is_page_comment: false,
            processed: false,
            created_time: new Date().toISOString()
        });

    if (saveError) {
        if (saveError.code === '23505') {
            console.log('✓ SKIPPING: Duplicate key (race condition)');
            return;
        }
        console.error('✗ Error saving comment:', saveError);
        return;
    }

    console.log('✓ Comment saved to database');

    // Find and execute matching flows
    await executeAutomation(commentId, workspaceId, (page as any).id, pageAccessToken, {
        commentId,
        postId,
        message: message || '',
        commenterId: fromId,
        commenterName: fromName || 'Unknown',
        pageId,
        pageName,
        postUrl: postId ? `https://facebook.com/${postId}` : ''
    });
}

// Execute automation flows for a comment
async function executeAutomation(
    commentId: string,
    workspaceId: string,
    pageDbId: string,
    pageAccessToken: string,
    context: any
) {
    console.log('\n>>> Finding matching flows...');

    const { data: flows } = await supabase
        .from('flows')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'ACTIVE');

    if (!flows || flows.length === 0) {
        console.log('⊘ No active flows found');
        await markAsProcessed(commentId);
        return;
    }

    console.log(`✓ Found ${flows.length} active flow(s)`);

    for (const flow of flows) {
        const nodes = flow.nodes || [];
        const configurations = flow.configurations || {};

        // Find comment trigger node
        const triggerNode = nodes.find((n: any) =>
            n.type === 'triggerNode' && n.data?.label?.includes('Comment')
        );

        if (!triggerNode) continue;

        const triggerConfig = configurations[triggerNode.id] || {};

        // Check if trigger matches this page
        if (triggerConfig.pageId !== pageDbId) {
            console.log(`⊘ Flow "${flow.name}" not configured for this page`);
            continue;
        }

        console.log(`\n✓✓✓ EXECUTING FLOW: "${flow.name}" ✓✓✓`);

        // Execute flow actions
        await executeFlowActions(flow, configurations, context, pageAccessToken, commentId);
    }

    // Mark comment as processed
    await markAsProcessed(commentId);
}

// Execute all actions in a flow
async function executeFlowActions(
    flow: any,
    configurations: any,
    context: any,
    pageAccessToken: string,
    commentId: string
) {
    const nodes = flow.nodes || [];
    const edges = flow.edges || [];

    console.log(`  Flow has ${nodes.length} nodes and ${edges.length} edges`);

    // Build execution order - execute ALL nodes connected from trigger
    const triggerNode = nodes.find((n: any) => n.type === 'triggerNode');
    if (!triggerNode) {
        console.log('  ⊘ No trigger node found');
        return;
    }

    console.log(`  Starting from trigger: ${triggerNode.data?.label || triggerNode.id}`);

    // Use a queue to visit all nodes (BFS-like traversal)
    const queue: string[] = [triggerNode.id];
    const visited = new Set<string>();

    while (queue.length > 0) {
        const currentNodeId = queue.shift()!;

        if (visited.has(currentNodeId)) continue;
        visited.add(currentNodeId);

        const node = nodes.find((n: any) => n.id === currentNodeId);
        if (!node) continue;

        // Execute action nodes (skip trigger)
        if (node.type !== 'triggerNode') {
            await executeAction(node, configurations[node.id] || {}, context, pageAccessToken, flow.id, commentId);
        }

        // Find ALL edges from this node and add targets to queue
        const outgoingEdges = edges.filter((e: any) => e.source === currentNodeId);
        console.log(`  Node "${node.data?.label || currentNodeId}" has ${outgoingEdges.length} outgoing edge(s)`);

        for (const edge of outgoingEdges) {
            if (edge.target && !visited.has(edge.target)) {
                queue.push(edge.target);
            }
        }
    }

    console.log(`  ✓ Executed ${visited.size - 1} action node(s)`); // -1 for trigger
}

// Execute a single action node
async function executeAction(
    node: any,
    config: any,
    context: any,
    pageAccessToken: string,
    flowId: string,
    commentId: string
) {
    const label = node.data?.label || '';
    const actionType = node.data?.actionType || '';
    const nodeType = node.type || '';

    console.log(`\n  → Executing: ${label}`);
    console.log(`    actionType: ${actionType}, nodeType: ${nodeType}`);
    console.log(`    Node data:`, JSON.stringify(node.data, null, 2));
    console.log(`    Config:`, JSON.stringify(config, null, 2));

    // Replace variables in templates
    const replaceVars = (template: string) => {
        return template
            .replace(/{commenter_name}/g, context.commenterName)
            .replace(/{comment_text}/g, context.message)
            .replace(/{page_name}/g, context.pageName || 'Your Page')
            .replace(/{post_url}/g, context.postUrl || '');
    };

    // Comment Reply Action - check multiple ways
    const isCommentReply = actionType === 'reply' ||
        label.toLowerCase().includes('reply') ||
        label.toLowerCase().includes('comment');

    if (isCommentReply) {
        console.log(`    ✓ Detected as Comment Reply node`);
        const template = config.replyTemplate || config.template || '';
        console.log(`    📝 Template: "${template}"`);

        if (!template || !pageAccessToken) {
            console.log('    ⊘ Skipping: Missing template or token');
            return;
        }

        // Check if we've already replied to this comment
        const { data: existingLog } = await supabase
            .from('comment_automation_log')
            .select('id')
            .eq('comment_id', commentId)
            .eq('action_type', 'comment_reply')
            .single();

        if (existingLog) {
            console.log('    ✓ Already replied to this comment');
            return;
        }

        // Replace variables EXCEPT the @mention which needs the actual ID
        const messageWithVars = replaceVars(template);

        await replyToComment(context.commentId, messageWithVars, context.commenterId, pageAccessToken, flowId, commentId);
        return; // Return after executing to prevent fall-through
    }

    // Send DM Action
    const isMessage = actionType === 'message' ||
        label.toLowerCase().includes('message') ||
        label.toLowerCase().includes('messenger');

    if (isMessage) {
        console.log(`    ✓ Detected as Send Message node`);
        const template = config.messageTemplate || config.template || '';
        console.log(`    📝 Template: "${template}"`);

        if (!template || !pageAccessToken) {
            console.log('    ⊘ Skipping: Missing template or token');
            return;
        }

        // Check if we've already sent DM for this comment
        const { data: existingLog } = await supabase
            .from('comment_automation_log')
            .select('id')
            .eq('comment_id', commentId)
            .eq('action_type', 'dm_sent')
            .eq('flow_id', flowId)
            .single();

        if (existingLog) {
            console.log('    ✓ Already sent DM from this node for this comment');
            return;
        }

        const message = replaceVars(template);
        await sendPrivateReply(
            context.commenterId,
            context.commenterName,
            message,
            pageAccessToken,
            flowId,
            commentId,
            config.buttons // Pass buttons from config
        );
        return; // Return after executing
    }

    // Text/Delay Node - send text as message and/or wait
    if (nodeType === 'textNode') {
        console.log(`    ✓ Detected as Text/Delay node`);
        const delaySeconds = config.delaySeconds || 0;
        const textContent = config.textContent || '';

        if (textContent) {
            console.log(`    📝 Text content: "${textContent}"`);
        }

        if (delaySeconds > 0) {
            console.log(`    ⏱️  Waiting ${delaySeconds} second(s)...`);
            await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
            console.log(`    ✓ Delay complete`);
        }

        // Send text content as message if it exists
        if (textContent && textContent.trim()) {
            console.log(`    📤 Sending text content as Messenger message...`);

            // Use user_id instead of comment_id for follow-up messages
            // This avoids Facebook's "Activity already replied to" error
            try {
                const requestBody = {
                    recipient: { id: context.commenterId }, // Use user_id, not comment_id
                    message: { text: textContent },
                    access_token: pageAccessToken
                };

                console.log(`    📤 Sending follow-up message to user: ${context.commenterName}`);
                console.log(`    📤 Message: "${textContent}"`);

                const response = await fetch(
                    `https://graph.facebook.com/v21.0/me/messages`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody)
                    }
                );

                const result = await response.json();
                console.log(`    📤 Facebook API response:`, JSON.stringify(result, null, 2));

                if (result.error) {
                    console.error('    ✗ Facebook API error:', result.error.message);
                } else {
                    console.log('    ✓ Follow-up message sent successfully!');
                    console.log('    ✓ Message ID:', result.message_id);
                }
            } catch (error: any) {
                console.error('    ✗ Exception sending follow-up message:', error.message);
            }
        }

        return; // Continue to next node
    }
}

// Reply to a Facebook comment with @mention tagging
async function replyToComment(
    commentId: string,
    messageTemplate: string,
    userId: string,
    pageAccessToken: string,
    flowId: string,
    originalCommentId: string
) {
    // Construct message with @mention tag per Facebook API docs
    // Format: @[{userId}] creates a clickable mention
    const message = `@[${userId}] ${messageTemplate}`;

    console.log(`    📤 Posting reply with mention: "${message}"`);

    try {
        const response = await fetch(
            `https://graph.facebook.com/v21.0/${commentId}/comments`,
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
            console.error('    ✗ Facebook API error:', result.error.message);
            console.error('    ✗ Full error response:', JSON.stringify(result.error, null, 2));
            await logAction(originalCommentId, flowId, 'comment_reply', false, result.error.message, result);
        } else {
            console.log('    ✓ Reply posted successfully with @mention!');
            console.log('    ✓ Facebook response:', JSON.stringify(result, null, 2));
            await logAction(originalCommentId, flowId, 'comment_reply', true, null, result);
        }
    } catch (error: any) {
        console.error('    ✗ Exception:', error.message);
        await logAction(originalCommentId, flowId, 'comment_reply', false, error.message, null);
    }
}

// Send a private Messenger reply (linked to comment)
async function sendPrivateReply(
    userId: string,
    userName: string,
    message: string,
    pageAccessToken: string,
    flowId: string,
    commentId: string,
    buttons?: Array<{ title: string; payload: string }>
) {
    console.log(`    📤 Sending Private Messenger Reply: "${message}"`);
    console.log(`    📤 To User: ${userName} (${userId})`);
    console.log(`    📤 Linked to Comment: ${commentId}`);
    if (buttons && buttons.length > 0) {
        console.log(`    📤 With ${buttons.length} quick reply button(s)`);
    }

    try {
        // IMPORTANT: Use comment_id in recipient to send private reply linked to comment
        // This bypasses the 24-hour messaging window restriction
        let messagePayload: any;

        // Use Button Template if buttons are provided, otherwise plain text
        if (buttons && buttons.length > 0) {
            messagePayload = {
                attachment: {
                    type: 'template',
                    payload: {
                        template_type: 'button',
                        text: message,
                        buttons: buttons.map(btn => ({
                            type: 'postback',
                            title: btn.title,
                            payload: btn.payload
                        }))
                    }
                }
            };
        } else {
            messagePayload = { text: message };
        }

        const requestBody = {
            recipient: { comment_id: commentId }, // Use comment_id, not user_id
            message: messagePayload,
            access_token: pageAccessToken
        };

        console.log(`    📤 Request body:`, JSON.stringify(requestBody, null, 2));

        const response = await fetch(
            `https://graph.facebook.com/v21.0/me/messages`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            }
        );

        const result = await response.json();
        console.log(`    📤 Facebook API response:`, JSON.stringify(result, null, 2));

        if (result.error) {
            console.error('    ✗ Facebook API error:', result.error.message);
            console.error('    ✗ Error code:', result.error.code);
            console.error('    ✗ Error type:', result.error.type);
            await logAction(commentId, flowId, 'dm_sent', false, result.error.message, result);
        } else {
            console.log('    ✓ Private reply (DM) sent successfully!');
            console.log('    ✓ Message ID:', result.message_id);
            console.log('    ✓ Recipient ID:', result.recipient_id);
            await logAction(commentId, flowId, 'dm_sent', true, null, result);
        }
    } catch (error: any) {
        console.error('    ✗ Exception sending private reply:', error.message);
        console.error('    ✗ Stack:', error.stack);
        await logAction(commentId, flowId, 'dm_sent', false, error.message, null);
    }
}

// Log automation action
async function logAction(
    commentId: string,
    flowId: string,
    actionType: string,
    success: boolean,
    errorMessage: string | null,
    facebookResponse: any
) {
    await supabase
        .from('comment_automation_log')
        .insert({
            comment_id: commentId,
            flow_id: flowId,
            action_type: actionType,
            success,
            error_message: errorMessage,
            facebook_response: facebookResponse
        });
}

// Mark comment as processed
async function markAsProcessed(commentId: string) {
    await supabase
        .from('comments')
        .update({ processed: true })
        .eq('comment_id', commentId);

    console.log('\n✓ Comment marked as processed');
}
