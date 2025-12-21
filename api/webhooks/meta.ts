import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { method, query, body } = req;

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
    console.log('\n--- Processing Comment ---');

    // Only process new comments
    if (value.item !== 'comment' || value.verb !== 'add') {
        console.log('⊘ Skipping: Not a new comment');
        return;
    }

    const commentId = value.comment_id;
    const postId = value.post_id;
    const message = value.message;
    const fromId = value.from?.id;
    const fromName = value.from?.name;
    const parentId = value.parent_id || null;

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

    console.log(`✓ Page found (Workspace: ${workspaceId})`);

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
        pageId
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

    // Build execution order
    const triggerNode = nodes.find((n: any) => n.type === 'triggerNode');
    if (!triggerNode) return;

    let currentNodeId = triggerNode.id;
    const visited = new Set<string>();

    while (currentNodeId && !visited.has(currentNodeId)) {
        visited.add(currentNodeId);
        const node = nodes.find((n: any) => n.id === currentNodeId);

        if (node && node.type !== 'triggerNode') {
            await executeAction(node, configurations[node.id] || {}, context, pageAccessToken, flow.id, commentId);
        }

        const nextEdge = edges.find((e: any) => e.source === currentNodeId);
        currentNodeId = nextEdge?.target;
    }
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
    console.log(`\n  → Executing: ${label}`);

    // Replace variables in templates
    const replaceVars = (template: string) =>
        template
            .replace(/\{\{USER\}\}/g, context.commenterName)
            .replace(/\{\{COMMENT\}\}/g, context.message)
            .replace(/\{\{POST\}\}/g, context.postId);

    // Comment Reply Action
    if (label.includes('Comment Reply')) {
        const template = config.replyTemplate || config.template || '';
        const message = replaceVars(template);

        if (!message || !pageAccessToken) {
            console.log('    ⊘ Skipping: Missing message or token');
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

        await replyToComment(context.commentId, message, pageAccessToken, flowId, commentId);
    }

    // Send DM Action
    if (label.includes('Send') && label.includes('Message')) {
        const template = config.messageTemplate || config.template || '';
        const message = replaceVars(template);

        if (!message || !pageAccessToken) {
            console.log('    ⊘ Skipping: Missing message or token');
            return;
        }

        // Check if we've already sent DM for this comment
        const { data: existingLog } = await supabase
            .from('comment_automation_log')
            .select('id')
            .eq('comment_id', commentId)
            .eq('action_type', 'dm_sent')
            .single();

        if (existingLog) {
            console.log('    ✓ Already sent DM for this comment');
            return;
        }

        await sendDirectMessage(context.commenterId, message, context.pageId, pageAccessToken, flowId, commentId);
    }
}

// Reply to a Facebook comment
async function replyToComment(
    commentId: string,
    message: string,
    pageAccessToken: string,
    flowId: string,
    originalCommentId: string
) {
    console.log(`    📤 Posting reply: "${message}"`);

    try {
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
            console.error('    ✗ Facebook error:', result.error.message);
            await logAction(originalCommentId, flowId, 'comment_reply', false, result.error.message, result);
        } else {
            console.log('    ✓ Reply posted successfully!');
            await logAction(originalCommentId, flowId, 'comment_reply', true, null, result);
        }
    } catch (error: any) {
        console.error('    ✗ Exception:', error.message);
        await logAction(originalCommentId, flowId, 'comment_reply', false, error.message, null);
    }
}

// Send a direct message
async function sendDirectMessage(
    userId: string,
    message: string,
    pageId: string,
    pageAccessToken: string,
    flowId: string,
    commentId: string
) {
    console.log(`    📤 Sending DM: "${message}"`);

    try {
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

        if (result.error) {
            console.error('    ✗ Facebook error:', result.error.message);
            await logAction(commentId, flowId, 'dm_sent', false, result.error.message, result);
        } else {
            console.log('    ✓ DM sent successfully!');
            await logAction(commentId, flowId, 'dm_sent', true, null, result);
        }
    } catch (error: any) {
        console.error('    ✗ Exception:', error.message);
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
