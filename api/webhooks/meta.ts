import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// In-memory cache to prevent race conditions from duplicate webhook calls
// Map of commentId -> processing start timestamp
const processingCache = new Map<string, number>();
const PROCESSING_TIMEOUT = 30000; // 30 seconds before allowing reprocessing

// In-memory cache to prevent duplicate postback processing
// Map of unique postback key -> processing start timestamp
const postbackProcessingCache = new Map<string, number>();
const POSTBACK_PROCESSING_TIMEOUT = 10000; // 10 seconds before allowing reprocessing of same postback

// Helper function to save or update a bot subscriber
async function saveOrUpdateSubscriber(
    workspaceId: string,
    pageId: string,
    userId: string,
    userName: string,
    source: 'COMMENT' | 'MESSAGE' | 'POSTBACK',
    pageAccessToken?: string
): Promise<void> {
    console.log(`    👤 Saving/updating subscriber: ${userName} (${userId})`);

    try {
        // Check if subscriber already exists
        const { data: existingSubscriber } = await supabase
            .from('subscribers')
            .select('id, name, avatar_url, labels, source')
            .eq('workspace_id', workspaceId)
            .eq('external_id', userId)
            .single();

        const now = new Date().toISOString();

        // Fetch profile data from Facebook API (picture, email, etc.)
        let avatarUrl = '';
        let email = '';
        if (pageAccessToken) {
            try {
                // Fetch profile picture
                const picResponse = await fetch(
                    `https://graph.facebook.com/${userId}/picture?type=large&redirect=false&access_token=${pageAccessToken}`
                );
                const picData = await picResponse.json();
                if (picData?.data?.url) {
                    avatarUrl = picData.data.url;
                    console.log(`    📷 Got profile picture URL for ${userName}`);
                }
            } catch (picError) {
                console.log(`    ⚠️ Could not fetch profile picture for ${userId}`);
            }

            // Try to fetch email (requires email permission)
            try {
                const emailResponse = await fetch(
                    `https://graph.facebook.com/${userId}?fields=email&access_token=${pageAccessToken}`
                );
                const emailData = await emailResponse.json();
                if (emailData?.email) {
                    email = emailData.email;
                    console.log(`    📧 Got email for ${userName}: ${email}`);
                }
            } catch (emailError) {
                console.log(`    ⚠️ Could not fetch email for ${userId}`);
            }
        }

        if (existingSubscriber) {
            // Update existing subscriber - add source to labels if not already there
            const currentLabels = existingSubscriber.labels || [];
            const sourceLabel = source === 'COMMENT' ? 'Commenter' : source === 'MESSAGE' ? 'Messaged' : 'Button Click';

            // Add source label if not already present
            const updatedLabels = currentLabels.includes(sourceLabel)
                ? currentLabels
                : [...currentLabels, sourceLabel];

            // Only update name if the new name is a real name (not a fallback)
            // and the current name is generic or missing
            const genericNames = ['Facebook User', 'Messenger User', 'Button Click User', 'User', 'Unknown User', ''];
            const currentName = existingSubscriber.name || '';
            const shouldUpdateName = !genericNames.includes(userName) || genericNames.includes(currentName);

            const updateData: any = {
                last_active_at: now,
                status: 'SUBSCRIBED',
                labels: updatedLabels
            };

            // Only update name if we have a better name
            if (shouldUpdateName && userName && !genericNames.includes(userName)) {
                updateData.name = userName;
            }

            // Update avatar if we have one and current is empty
            if (avatarUrl && !existingSubscriber.avatar_url) {
                updateData.avatar_url = avatarUrl;
            }

            const { error: updateError } = await supabase
                .from('subscribers')
                .update(updateData)
                .eq('id', existingSubscriber.id);

            if (updateError) {
                console.error('    ✗ Error updating subscriber:', updateError);
            } else {
                console.log(`    ✓ Subscriber updated: ${existingSubscriber.name}`);
            }
        } else {
            // Create new subscriber
            const sourceLabel = source === 'COMMENT' ? 'Commenter' : source === 'MESSAGE' ? 'Messaged' : 'Button Click';

            const { error: insertError } = await supabase
                .from('subscribers')
                .insert({
                    workspace_id: workspaceId,
                    page_id: pageId,
                    external_id: userId,
                    name: userName,
                    email: email || null,
                    platform: 'FACEBOOK',
                    avatar_url: avatarUrl,
                    status: 'SUBSCRIBED',
                    tags: [],
                    labels: [sourceLabel],
                    source: source,
                    last_active_at: now
                });

            if (insertError) {
                // Could be duplicate key from race condition, ignore
                if (insertError.code !== '23505') {
                    console.error('    ✗ Error creating subscriber:', insertError);
                }
            } else {
                console.log(`    ✓ New subscriber created: ${userName}`);
            }
        }
    } catch (error) {
        console.error('    ✗ Error in saveOrUpdateSubscriber:', error);
    }
}

// AI Response Generation function
async function generateAIResponse(
    provider: 'openai' | 'gemini',
    prompt: string,
    context: {
        commenterName: string;
        commentText: string;
        pageName: string;
    },
    workspaceId?: string
): Promise<string | null> {
    console.log(`    🤖 Generating AI response using ${provider}...`);
    console.log(`    📝 AI Prompt: "${prompt}"`);
    console.log(`    💬 Comment context:`, context);

    try {
        // Get API keys - first try workspace settings, then admin settings
        let apiKey = null;

        if (workspaceId) {
            const { data: workspaceSettings } = await supabase
                .from('workspace_settings')
                .select('openai_api_key, gemini_api_key')
                .eq('workspace_id', workspaceId)
                .single();

            if (workspaceSettings) {
                const ws = workspaceSettings as any;
                apiKey = provider === 'openai' ? ws.openai_api_key : ws.gemini_api_key;
            }
        }

        // Fallback to admin settings
        if (!apiKey) {
            const { data: adminSettings } = await supabase
                .from('admin_settings')
                .select('openai_api_key, gemini_api_key')
                .eq('id', 1)
                .single();

            if (adminSettings) {
                apiKey = provider === 'openai'
                    ? adminSettings.openai_api_key
                    : adminSettings.gemini_api_key;
            }
        }

        if (!apiKey) {
            console.error(`    ✗ No ${provider} API key found`);
            return null;
        }

        // Build the full prompt with context
        const fullPrompt = `You are a helpful assistant replying to a Facebook comment on behalf of a business page.

Comment from ${context.commenterName}: "${context.commentText}"
Page Name: ${context.pageName}

Instructions: ${prompt || 'Be friendly and helpful. Thank them for their comment and offer to help.'}

Generate a personalized, conversational direct message reply. Keep it concise and friendly. Do not use hashtags or emojis unless appropriate. Do not start with "Thank you for reaching out" or similar generic phrases.`;

        if (provider === 'openai') {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: 'You are a helpful business assistant responding to customer comments.' },
                        { role: 'user', content: fullPrompt }
                    ],
                    max_tokens: 300,
                    temperature: 0.7
                })
            });

            const data = await response.json();
            console.log('    🤖 OpenAI response:', JSON.stringify(data, null, 2));

            if (data.error) {
                console.error('    ✗ OpenAI API error:', data.error.message);
                return null;
            }

            const generatedMessage = data.choices?.[0]?.message?.content?.trim();
            console.log(`    ✓ Generated message: "${generatedMessage}"`);
            return generatedMessage || null;

        } else if (provider === 'gemini') {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: fullPrompt }]
                    }],
                    generationConfig: {
                        maxOutputTokens: 300,
                        temperature: 0.7
                    }
                })
            });

            const data = await response.json();
            console.log('    🤖 Gemini response:', JSON.stringify(data, null, 2));

            if (data.error) {
                console.error('    ✗ Gemini API error:', data.error.message);
                return null;
            }

            const generatedMessage = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            console.log(`    ✓ Generated message: "${generatedMessage}"`);
            return generatedMessage || null;
        }

        return null;
    } catch (error: any) {
        console.error(`    ✗ AI generation error: ${error.message}`);
        return null;
    }
}

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

            // Process Messenger events (messages and postbacks)
            for (const messaging of entry.messaging || []) {
                console.log('\n--- Messenger Event ---');
                console.log('Event data:', JSON.stringify(messaging, null, 2));

                // SKIP read receipts - these are not actionable events
                if (messaging.read) {
                    console.log('⊘ Skipping: Read receipt event');
                    continue;
                }

                // SKIP delivery receipts - these are not actionable events
                if (messaging.delivery) {
                    console.log('⊘ Skipping: Delivery receipt event');
                    continue;
                }

                // SKIP message echoes (messages sent BY the page itself)
                if (messaging.message?.is_echo) {
                    console.log('⊘ Skipping: Message echo (sent by page)');
                    continue;
                }

                // Handle postback events (button clicks)
                if (messaging.postback) {
                    await processPostback(messaging, pageId);
                }

                // Handle incoming text messages
                if (messaging.message && messaging.message.text) {
                    await processTextMessage(messaging, pageId);
                }
            }
        }

        return res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
        console.error('✗ Error processing webhook:', error);
        return res.status(200).send('EVENT_RECEIVED'); // Always return 200 to Facebook
    }
}

// Process button postback event
async function processPostback(messagingEvent: any, pageId: string) {
    console.log('\n--- Processing Button Postback ---');
    console.log('Messaging event:', JSON.stringify(messagingEvent, null, 2));

    const senderId = messagingEvent.sender.id;
    const payload = messagingEvent.postback.payload;
    const mid = messagingEvent.postback.mid; // Facebook's unique message ID for this postback
    const timestamp = messagingEvent.timestamp || Date.now();

    console.log(`Button clicked by user: ${senderId}`);
    console.log(`Button payload: ${payload}`);
    console.log(`Postback mid: ${mid || 'none'}`);
    console.log(`Timestamp: ${timestamp}`);

    // Create unique key for deduplication
    // Use mid if available (unique per postback), otherwise use sender + payload + 10-second window
    const postbackKey = mid
        ? `mid_${mid}`
        : `pb_${senderId}_${payload}_${Math.floor(timestamp / 10000)}`;

    console.log(`Postback dedup key: ${postbackKey}`);

    // STEP 1: In-memory cache check (fast, works within same instance)
    const now = Date.now();
    const existingProcessing = postbackProcessingCache.get(postbackKey);
    if (existingProcessing && (now - existingProcessing) < POSTBACK_PROCESSING_TIMEOUT) {
        console.log('✓ SKIPPING: Duplicate detected (in-memory cache)');
        return;
    }
    postbackProcessingCache.set(postbackKey, now);

    // STEP 2: Database check (works across serverless instances)
    // Try to find if this postback was already processed
    const { data: existingLog } = await supabase
        .from('comment_automation_log')
        .select('id, created_at')
        .eq('comment_id', postbackKey)
        .gte('created_at', new Date(Date.now() - 30000).toISOString()) // Within last 30 seconds
        .maybeSingle();

    if (existingLog) {
        console.log('✓ SKIPPING: Duplicate detected (database check)');
        console.log(`  Existing log ID: ${existingLog.id}`);
        return;
    }

    // Log this postback BEFORE processing to prevent race conditions
    // Use 'dm_sent' as action_type since it's allowed by database constraint
    const { error: insertError } = await supabase
        .from('comment_automation_log')
        .insert({
            comment_id: postbackKey,
            flow_id: payload.replace('FLOW_', '').replace('NEWFLOW_', '') || null,
            action_type: 'dm_sent',
            success: true,
            error_message: null,
            facebook_response: { senderId, payload, mid, timestamp, type: 'postback_dedup' }
        });

    if (insertError) {
        // Check if it's a duplicate key error (another instance already processed)
        if (insertError.message.includes('duplicate') || insertError.code === '23505') {
            console.log('✓ SKIPPING: Duplicate detected (concurrent insert from another instance)');
            return;
        }
        // For other errors, log but continue processing
        console.log(`⚠️ Insert warning (continuing anyway): ${insertError.message}`);
    } else {
        console.log('✓ Postback logged, proceeding with execution...');
    }

    // Clean up old in-memory cache entries
    for (const [key, ts] of postbackProcessingCache.entries()) {
        if (now - ts > POSTBACK_PROCESSING_TIMEOUT) {
            postbackProcessingCache.delete(key);
        }
    }

    // Get page access token from connected_pages table
    const { data: pageData, error: pageError } = await supabase
        .from('connected_pages')
        .select('id, page_access_token, name, workspaces!inner(id)')
        .eq('page_id', pageId)
        .single();

    if (pageError || !pageData) {
        console.error('✗ Page not found or no access token');
        return;
    }

    const pageAccessToken = (pageData as any).page_access_token;
    const workspaceId = (pageData as any).workspaces.id;
    const pageName = (pageData as any).name || 'Page';
    const pageDbId = (pageData as any).id;

    // Check if payload is a direct flow trigger (FLOW_{flowId})
    if (payload.startsWith('FLOW_')) {
        const flowId = payload.replace('FLOW_', '');
        console.log(`✓ Direct flow trigger detected: ${flowId}`);

        // Find the specific flow
        const { data: flow, error: flowError } = await supabase
            .from('flows')
            .select('*')
            .eq('id', flowId)
            .eq('status', 'ACTIVE')
            .single();

        if (flowError || !flow) {
            console.error('✗ Flow not found or not active:', flowId);
            return;
        }

        console.log(`✓ Flow found: "${flow.name}"`);

        const nodes = flow.nodes || [];
        const edges = flow.edges || [];
        const configurations = flow.configurations || {};

        // Find Start node in the flow
        const startNode = nodes.find((n: any) => n.type === 'startNode');

        if (!startNode) {
            console.error('✗ No Start node found in flow');
            return;
        }

        console.log(`✓ Starting flow from Start node: "${startNode.data?.label}"`);

        // Create a stable comment ID for this postback to enable database-level deduplication
        // Use sender + flow + rounded timestamp (5 second windows) so duplicate webhooks get the same ID
        const timestamp = messagingEvent.timestamp || Date.now();
        const stablePostbackId = mid
            ? `postback_mid_${mid}`
            : `postback_${senderId}_${flowId}_${Math.floor(timestamp / 5000)}`;

        // Execute the flow starting from the Start node
        await executeFlowFromNode(
            startNode,
            nodes,
            edges,
            configurations,
            {
                commenterId: senderId,
                commenterName: 'User', // We don't have the name from postback
                commentText: `Clicked button: ${payload}`,
                pageId: pageId,
                pageName: pageName,
                postId: '',
                commentId: stablePostbackId,
                workspaceId,
                pageDbId
            },
            pageAccessToken,
            flow.id,
            stablePostbackId
        );

        // Fetch user's actual name from Facebook API
        let userName = 'Facebook User';
        try {
            const userResponse = await fetch(
                `https://graph.facebook.com/${senderId}?fields=name&access_token=${pageAccessToken}`
            );
            const userData = await userResponse.json();
            if (userData?.name) {
                userName = userData.name;
                console.log(`    ✓ Got user name: ${userName}`);
            }
        } catch (nameError) {
            console.log(`    ⚠️ Could not fetch user name for ${senderId}`);
        }

        // Save the user as a bot subscriber when they click a button
        await saveOrUpdateSubscriber(
            workspaceId,
            pageDbId,
            senderId,
            userName,
            'POSTBACK',
            pageAccessToken
        );

        return; // Flow executed successfully
    }

    // Check if payload is a New Flow trigger (NEWFLOW_{flowName})
    if (payload.startsWith('NEWFLOW_')) {
        const flowName = payload.replace('NEWFLOW_', '');
        console.log(`✓ New Flow payload detected: "${flowName}"`);

        // Find all active flows for this workspace to search for matching New Flow node
        const { data: flows, error: flowsError } = await supabase
            .from('flows')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('status', 'ACTIVE');

        if (flowsError || !flows) {
            console.error('✗ Error fetching flows:', flowsError);
            return;
        }

        // Search for a New Flow node with matching flowName
        for (const flow of flows) {
            const nodes = flow.nodes || [];
            const edges = flow.edges || [];
            const configurations = flow.configurations || {};

            // Find the New Flow node that matches
            const newFlowNode = nodes.find((n: any) => {
                const nodeLabel = n.data?.label || '';
                const nodeFlowName = n.data?.flowName || '';
                return (n.data?.isNewFlowNode || nodeLabel.toLowerCase().includes('new flow:')) &&
                    (nodeFlowName === flowName || nodeLabel.toLowerCase().includes(flowName.toLowerCase()));
            });

            if (newFlowNode) {
                console.log(`✓ Found matching New Flow node in flow "${flow.name}": "${newFlowNode.data?.label}"`);

                // Create stable ID for deduplication
                const timestamp = messagingEvent.timestamp || Date.now();
                const stableNewFlowId = mid
                    ? `newflow_mid_${mid}`
                    : `newflow_${senderId}_${flowName}_${Math.floor(timestamp / 5000)}`;

                // Execute the flow starting from the New Flow node
                await executeFlowFromNode(
                    newFlowNode,
                    nodes,
                    edges,
                    configurations,
                    {
                        commenterId: senderId,
                        commenterName: 'User',
                        commentText: `Clicked New Flow button: ${flowName}`,
                        pageId: pageId,
                        pageName: pageName,
                        postId: '',
                        commentId: stableNewFlowId
                    },
                    pageAccessToken,
                    flow.id,
                    stableNewFlowId
                );

                return; // Flow executed successfully
            }
        }

        console.log(`✗ No matching New Flow node found for: "${flowName}"`);
        return;
    }

    // Find all active flows for this workspace (for keyword matching)
    const { data: flows, error: flowsError } = await supabase
        .from('flows')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'ACTIVE');

    if (flowsError || !flows || flows.length === 0) {
        console.log('✗ No active flows found for this workspace');
        return;
    }

    console.log(`Found ${flows.length} active flow(s)`);

    // Find flows with Start nodes that match the payload
    for (const flow of flows) {
        const nodes = flow.nodes || [];
        const edges = flow.edges || [];
        const configurations = flow.configurations || {};

        if (nodes.length === 0) continue;

        // Find Start nodes
        const startNodes = nodes.filter((n: any) => n.type === 'startNode');

        for (const startNode of startNodes) {
            const config = configurations[startNode.id] || {};
            const keywords = config.keywords || [];
            const matchType = config.matchType || 'exact';

            console.log(`Checking Start node "${startNode.data?.label}" with keywords:`, keywords);
            console.log(`Match type: ${matchType}`);

            // Check if payload matches any keyword
            let isMatch = false;
            if (matchType === 'exact') {
                isMatch = keywords.some((kw: string) => kw.toUpperCase() === payload.toUpperCase());
            } else if (matchType === 'contains') {
                isMatch = keywords.some((kw: string) =>
                    payload.toUpperCase().includes(kw.toUpperCase()) ||
                    kw.toUpperCase().includes(payload.toUpperCase())
                );
            }

            if (isMatch) {
                console.log(`✓ Match found! Executing flow from Start node`);

                // Create stable ID for deduplication (5 second window)
                const timestamp = messagingEvent.timestamp || Date.now();
                const stableKeywordId = mid
                    ? `keyword_mid_${mid}`
                    : `keyword_${senderId}_${payload}_${Math.floor(timestamp / 5000)}`;

                // Execute flow starting from this Start node
                await executeFlowFromNode(
                    startNode,
                    nodes,
                    edges,
                    configurations,
                    {
                        commenterId: senderId,
                        commenterName: 'User', // We don't have the name from postback
                        commentText: `Clicked button: ${payload}`,
                        pageId: pageId,
                        postId: '',
                        commentId: stableKeywordId
                    },
                    pageAccessToken,
                    flow.id,
                    stableKeywordId
                );

                return; // Execute only the first matching flow
            }
        }
    }

    console.log('✗ No matching Start node found for payload:', payload);
}

// Process incoming text message (for Start node triggers)
async function processTextMessage(messagingEvent: any, pageId: string) {
    console.log('\n--- Processing Text Message ---');
    console.log('Messaging event:', JSON.stringify(messagingEvent, null, 2));

    const senderId = messagingEvent.sender.id;
    const messageText = messagingEvent.message.text;

    console.log(`Message from user: ${senderId}`);
    console.log(`Message text: "${messageText}"`);

    // Ignore messages from the page itself
    if (senderId === pageId) {
        console.log('✓ IGNORING: Message from page itself');
        return;
    }

    // Get page details from connected_pages
    const { data: page, error: pageError } = await supabase
        .from('connected_pages')
        .select('*, workspaces!inner(id)')
        .eq('page_id', pageId)
        .single();

    if (pageError || !page) {
        console.error('✗ Page not found in connected_pages');
        return;
    }

    const workspaceId = (page as any).workspaces.id;
    const pageAccessToken = (page as any).page_access_token;
    const pageDbId = (page as any).id;

    console.log(`✓ Page found - Workspace: ${workspaceId}`);

    // Find all active flows for this workspace
    const { data: flows, error: flowsError } = await supabase
        .from('flows')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'ACTIVE');

    if (flowsError || !flows || flows.length === 0) {
        console.log('✗ No active flows found for this workspace');
        return;
    }

    console.log(`Found ${flows.length} active flow(s)`);

    // Find flows with Start nodes that match the message text
    for (const flow of flows) {
        const nodes = flow.nodes || [];
        const edges = flow.edges || [];
        const configurations = flow.configurations || {};

        // Find Start nodes
        const startNodes = nodes.filter((n: any) => n.type === 'startNode');

        for (const startNode of startNodes) {
            const config = configurations[startNode.id] || {};
            const keywords = config.keywords || [];
            const matchType = config.matchType || 'exact';
            const configPageId = config.pageId;

            // Check if this Start node is configured for this page
            if (configPageId && configPageId !== pageDbId) {
                console.log(`⊘ Skipping Start node - configured for different page`);
                continue;
            }

            console.log(`Checking Start node "${startNode.data?.label}" with keywords:`, keywords);
            console.log(`Match type: ${matchType}`);

            // Check if message text matches any keyword
            let isMatch = false;
            const messageUpper = messageText.toUpperCase().trim();

            if (matchType === 'exact') {
                isMatch = keywords.some((kw: string) => kw.toUpperCase().trim() === messageUpper);
            } else if (matchType === 'contains') {
                isMatch = keywords.some((kw: string) =>
                    messageUpper.includes(kw.toUpperCase().trim()) ||
                    kw.toUpperCase().trim().includes(messageUpper)
                );
            }

            if (isMatch) {
                console.log(`✓ Match found! Executing flow from Start node`);

                // Execute flow starting from this Start node
                await executeFlowFromNode(
                    startNode,
                    nodes,
                    edges,
                    configurations,
                    {
                        commenterId: senderId,
                        commenterName: 'User',
                        commentText: messageText,
                        message: messageText,
                        pageId: pageId,
                        postId: '',
                        commentId: messagingEvent.message.mid, // Use message ID as reference
                        workspaceId,
                        pageDbId
                    },
                    pageAccessToken,
                    flow.id,
                    messagingEvent.message.mid
                );

                // Fetch user's actual name from Facebook API
                let userName = 'Facebook User';
                try {
                    const userResponse = await fetch(
                        `https://graph.facebook.com/${senderId}?fields=name&access_token=${pageAccessToken}`
                    );
                    const userData = await userResponse.json();
                    if (userData?.name) {
                        userName = userData.name;
                    }
                } catch (nameError) {
                    console.log(`    ⚠️ Could not fetch user name for ${senderId}`);
                }

                // Save the user as a bot subscriber when they message the page
                await saveOrUpdateSubscriber(
                    workspaceId,
                    pageDbId,
                    senderId,
                    userName,
                    'MESSAGE',
                    pageAccessToken
                );

                return; // Execute only the first matching flow
            }
        }
    }

    console.log('✗ No matching Start node found for message:', messageText);
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

    // In-memory race condition prevention - check if already being processed
    const now = Date.now();
    const existingProcessing = processingCache.get(commentId);
    if (existingProcessing && (now - existingProcessing) < PROCESSING_TIMEOUT) {
        console.log('✓ SKIPPING: Comment is currently being processed (race condition prevention)');
        return;
    }
    // Mark as being processed
    processingCache.set(commentId, now);
    // Clean up old entries (older than timeout)
    for (const [key, timestamp] of processingCache.entries()) {
        if (now - timestamp > PROCESSING_TIMEOUT) {
            processingCache.delete(key);
        }
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

        // Log the page ID comparison for debugging
        console.log(`  Flow "${flow.name}" trigger config:`, JSON.stringify(triggerConfig, null, 2));
        console.log(`  → Config pageId: "${triggerConfig.pageId}"`);
        console.log(`  → Page DB ID: "${pageDbId}"`);
        console.log(`  → Page Facebook ID: "${context.pageId}"`);

        // Check if trigger matches this page - try both DB ID and Facebook Page ID
        const configPageId = triggerConfig.pageId;

        // If pageId is not configured, treat as "all pages" (backwards compatibility)
        const pageIdNotConfigured = !configPageId || configPageId === 'undefined' || configPageId === '';
        const matchesDbId = configPageId === pageDbId;
        const matchesFacebookId = configPageId === context.pageId;

        if (!pageIdNotConfigured && !matchesDbId && !matchesFacebookId) {
            console.log(`⊘ Flow "${flow.name}" not configured for this page (no match)`);
            continue;
        }

        if (pageIdNotConfigured) {
            console.log(`✓ Page ID not configured - flow applies to ALL pages`);
        } else {
            console.log(`✓ Page ID matched: ${matchesDbId ? 'DB ID' : 'Facebook ID'}`);
        }

        console.log(`\n✓✓✓ EXECUTING FLOW: "${flow.name}" ✓✓✓`);

        // Check if auto-react is enabled and react to the comment
        const enableAutoReact = triggerConfig.enableAutoReact !== false; // Default to true
        if (enableAutoReact) {
            await reactToComment(context.commentId, pageAccessToken);
        }

        // Add workspaceId and pageDbId to context for subscriber tracking
        const enrichedContext = {
            ...context,
            workspaceId,
            pageDbId
        };

        // Execute flow actions
        await executeFlowActions(flow, configurations, enrichedContext, pageAccessToken, commentId);
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
                // Check if target node is a "New Flow" node - don't traverse into it
                const targetNode = nodes.find((n: any) => n.id === edge.target);
                if (targetNode?.data?.isNewFlowNode || targetNode?.data?.label?.toLowerCase().includes('new flow:')) {
                    console.log(`  ⊘ Stopping traversal at New Flow node: "${targetNode.data?.label}"`);
                    continue; // Don't add to queue - this is a separate flow entry point
                }
                queue.push(edge.target);
            }
        }
    }

    console.log(`  ✓ Executed ${visited.size - 1} action node(s)`); // -1 for trigger
}

// Helper function to execute flow starting from any node (Start or Trigger)
async function executeFlowFromNode(
    startNode: any,
    nodes: any[],
    edges: any[],
    configurations: any,
    context: any,
    pageAccessToken: string,
    flowId: string,
    commentId: string
) {
    console.log(`Starting flow execution from node: ${startNode.data?.label || startNode.id}`);

    // Use a queue to visit all nodes (BFS-like traversal)
    const queue: string[] = [startNode.id];
    const visited = new Set<string>();

    while (queue.length > 0) {
        const currentNodeId = queue.shift()!;

        if (visited.has(currentNodeId)) continue;
        visited.add(currentNodeId);

        const node = nodes.find((n: any) => n.id === currentNodeId);
        if (!node) continue;

        // Execute action nodes (skip trigger and start nodes)
        if (node.type !== 'triggerNode' && node.type !== 'startNode') {
            await executeAction(node, configurations[node.id] || {}, context, pageAccessToken, flowId, commentId);
        }

        // Find ALL edges from this node and add targets to queue
        const outgoingEdges = edges.filter((e: any) => e.source === currentNodeId);
        console.log(`  Node "${node.data?.label || currentNodeId}" has ${outgoingEdges.length} outgoing edge(s)`);

        for (const edge of outgoingEdges) {
            if (edge.target && !visited.has(edge.target)) {
                // Check if target node is a "New Flow" node - don't traverse into it
                const targetNode = nodes.find((n: any) => n.id === edge.target);
                if (targetNode?.data?.isNewFlowNode || targetNode?.data?.label?.toLowerCase().includes('new flow:')) {
                    console.log(`  ⊘ Stopping traversal at New Flow node: "${targetNode.data?.label}"`);
                    continue; // Don't add to queue - this is a separate flow entry point
                }
                queue.push(edge.target);
            }
        }
    }

    console.log(`  ✓ Flow execution complete from ${startNode.data?.label}`);
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
        const commenterName = context.commenterName || 'Friend';
        const nameParts = commenterName.split(' ');
        const firstName = nameParts[0] || commenterName;
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

        return template
            .replace(/{commenter_name}/g, commenterName)
            .replace(/{first_name}/g, firstName)
            .replace(/{last_name}/g, lastName);
    };

    // Image Node - check FIRST before any label-based detection
    if (nodeType === 'imageNode' || label.toLowerCase() === 'image') {
        console.log(`    ✓ Detected as Image node`);
        const imageUrl = config.imageUrl || '';
        const caption = config.caption || '';

        if (!imageUrl) {
            console.log('    ⊘ Skipping: No image URL configured');
            return;
        }

        // Validate URL format
        if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
            console.error('    ✗ Invalid image URL - must start with http:// or https://');
            return;
        }

        console.log(`    🖼️ Image URL: "${imageUrl}"`);
        console.log(`    🔗 URL Protocol: ${imageUrl.startsWith('https://') ? 'HTTPS (✓)' : 'HTTP (⚠ Facebook prefers HTTPS)'}`);
        if (caption) {
            console.log(`    📝 Caption: "${caption}"`);
        }

        try {
            // Show typing indicator for configured delay (or brief default)
            const delaySeconds = config.delaySeconds || 0;
            if (delaySeconds > 0) {
                console.log(`    ⏱️ Delay: ${delaySeconds} seconds`);
                await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_on');
                await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
                await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_off');
            } else {
                // Brief typing indicator
                await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_on');
                await new Promise(resolve => setTimeout(resolve, 500));
                await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_off');
            }

            // Send the image attachment
            const imageRequestBody = {
                recipient: { id: context.commenterId },
                message: {
                    attachment: {
                        type: 'image',
                        payload: {
                            url: imageUrl,
                            is_reusable: true
                        }
                    }
                },
                access_token: pageAccessToken
            };

            console.log(`    📤 Sending image to user: ${context.commenterName}`);
            console.log(`    📤 Request body:`, JSON.stringify(imageRequestBody, null, 2));

            const imageResponse = await fetch(
                `https://graph.facebook.com/v21.0/me/messages`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(imageRequestBody)
                }
            );

            const imageResult = await imageResponse.json();
            console.log(`    📤 Facebook API response:`, JSON.stringify(imageResult, null, 2));

            if (imageResult.error) {
                console.error('    ✗ Facebook API error:', imageResult.error.message);
                console.error('    ✗ Error code:', imageResult.error.code);
                console.error('    ✗ Error subcode:', imageResult.error.error_subcode);
                console.error('    ✗ Full error:', JSON.stringify(imageResult.error, null, 2));

                // Common error hints
                if (imageResult.error.code === 100) {
                    console.error('    💡 Hint: The image URL may not be publicly accessible or is blocked by the host');
                }
                if (imageResult.error.message?.includes('URL')) {
                    console.error('    💡 Hint: Facebook cannot fetch the image. Make sure the URL is publicly accessible and not behind authentication');
                }
            } else {
                console.log('    ✓ Image sent successfully!');
                console.log('    ✓ Message ID:', imageResult.message_id);

                // Send caption as a follow-up text message if provided
                if (caption) {
                    const captionRequestBody = {
                        recipient: { id: context.commenterId },
                        message: { text: caption },
                        access_token: pageAccessToken
                    };

                    const captionResponse = await fetch(
                        `https://graph.facebook.com/v21.0/me/messages`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(captionRequestBody)
                        }
                    );

                    const captionResult = await captionResponse.json();
                    if (captionResult.error) {
                        console.error('    ✗ Caption send error:', captionResult.error.message);
                    } else {
                        console.log('    ✓ Caption sent successfully!');
                    }
                }
            }
        } catch (error: any) {
            console.error('    ✗ Exception sending image:', error.message);
        }

        return;
    }

    // Video Node - send video as Messenger attachment
    if (nodeType === 'videoNode' || label.toLowerCase() === 'video') {
        console.log(`    ✓ Detected as Video node`);
        const videoUrl = config.videoUrl || '';
        const caption = config.caption || '';

        if (!videoUrl) {
            console.log('    ⊘ Skipping: No video URL configured');
            return;
        }

        // Validate URL format
        if (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
            console.error('    ✗ Invalid video URL - must start with http:// or https://');
            return;
        }

        console.log(`    🎬 Video URL: "${videoUrl}"`);
        console.log(`    🔗 URL Protocol: ${videoUrl.startsWith('https://') ? 'HTTPS (✓)' : 'HTTP (⚠ Facebook prefers HTTPS)'}`);
        if (caption) {
            console.log(`    📝 Caption: "${caption}"`);
        }

        try {
            // Show typing indicator for configured delay (or brief default)
            const delaySeconds = config.delaySeconds || 0;
            if (delaySeconds > 0) {
                console.log(`    ⏱️ Delay: ${delaySeconds} seconds`);
                await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_on');
                await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
                await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_off');
            } else {
                // Brief typing indicator
                await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_on');
                await new Promise(resolve => setTimeout(resolve, 500));
                await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_off');
            }
            // Check if it's a Facebook video URL
            const isFacebookVideo = videoUrl.includes('facebook.com') || videoUrl.includes('fb.watch');

            let videoRequestBody: any;

            if (isFacebookVideo) {
                // Extract Facebook video ID from URL
                // Formats: .../videos/VIDEO_ID or fb.watch/VIDEO_ID
                let fbVideoId = '';

                const videoIdMatch = videoUrl.match(/\/videos\/(\d+)/);
                if (videoIdMatch) {
                    fbVideoId = videoIdMatch[1];
                } else {
                    // Try fb.watch format
                    const fbWatchMatch = videoUrl.match(/fb\.watch\/(\w+)/);
                    if (fbWatchMatch) {
                        fbVideoId = fbWatchMatch[1];
                    }
                }

                if (fbVideoId) {
                    console.log(`    📹 Facebook Video ID: ${fbVideoId}`);

                    // Use Media Template for Facebook-hosted videos
                    videoRequestBody = {
                        recipient: { id: context.commenterId },
                        message: {
                            attachment: {
                                type: 'template',
                                payload: {
                                    template_type: 'media',
                                    elements: [
                                        {
                                            media_type: 'video',
                                            url: videoUrl
                                        }
                                    ]
                                }
                            }
                        },
                        access_token: pageAccessToken
                    };
                } else {
                    console.error('    ✗ Could not extract Facebook video ID from URL');
                    return;
                }
            } else {
                // Use regular video attachment for direct URLs
                videoRequestBody = {
                    recipient: { id: context.commenterId },
                    message: {
                        attachment: {
                            type: 'video',
                            payload: {
                                url: videoUrl,
                                is_reusable: true
                            }
                        }
                    },
                    access_token: pageAccessToken
                };
            }

            console.log(`    📤 Sending video to user: ${context.commenterName}`);
            console.log(`    📤 Request body:`, JSON.stringify(videoRequestBody, null, 2));

            const videoResponse = await fetch(
                `https://graph.facebook.com/v21.0/me/messages`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(videoRequestBody)
                }
            );

            const videoResult = await videoResponse.json();
            console.log(`    📤 Facebook API response:`, JSON.stringify(videoResult, null, 2));

            if (videoResult.error) {
                console.error('    ✗ Facebook API error:', videoResult.error.message);
                console.error('    ✗ Error code:', videoResult.error.code);
                console.error('    ✗ Full error:', JSON.stringify(videoResult.error, null, 2));

                if (videoResult.error.code === 100) {
                    console.error('    💡 Hint: The video URL may not be publicly accessible or is blocked by the host');
                }
            } else {
                console.log('    ✓ Video sent successfully!');
                console.log('    ✓ Message ID:', videoResult.message_id);

                // Send caption as a follow-up text message if provided
                if (caption) {
                    const captionRequestBody = {
                        recipient: { id: context.commenterId },
                        message: { text: caption },
                        access_token: pageAccessToken
                    };

                    const captionResponse = await fetch(
                        `https://graph.facebook.com/v21.0/me/messages`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(captionRequestBody)
                        }
                    );

                    const captionResult = await captionResponse.json();
                    if (captionResult.error) {
                        console.error('    ✗ Caption send error:', captionResult.error.message);
                    } else {
                        console.log('    ✓ Caption sent successfully!');
                    }
                }
            }
        } catch (error: any) {
            console.error('    ✗ Exception sending video:', error.message);
        }

        return;
    }

    // Form Node - send form as a webview button
    if (nodeType === 'formNode' || label.toLowerCase() === 'form') {
        console.log(`    ✓ Detected as Form node`);
        const formName = config.formName || 'Form';
        const formId = config.formId || node.id; // Use node ID if no form saved yet

        // Build form URL with subscriber context
        const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : process.env.APP_URL || 'https://your-app-url.vercel.app';

        const formUrl = `${baseUrl}/api/forms/view?id=${formId}&sid=${encodeURIComponent(context.commenterId)}&sname=${encodeURIComponent(context.commenterName || '')}`;

        console.log(`    📋 Form Name: "${formName}"`);
        console.log(`    🔗 Form URL: ${formUrl}`);

        try {
            // Brief typing indicator
            await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_on');
            await new Promise(resolve => setTimeout(resolve, 500));
            await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_off');

            // Send as a button template with webview
            const formRequestBody = {
                recipient: { id: context.commenterId },
                message: {
                    attachment: {
                        type: 'template',
                        payload: {
                            template_type: 'button',
                            text: `📋 ${formName}\n\nTap below to fill out the form:`,
                            buttons: [
                                {
                                    type: 'web_url',
                                    url: formUrl,
                                    title: 'Open Form',
                                    webview_height_ratio: 'tall',
                                    messenger_extensions: true
                                }
                            ]
                        }
                    }
                },
                access_token: pageAccessToken
            };

            console.log(`    📤 Sending form button to Facebook API...`);

            const formResponse = await fetch(
                `https://graph.facebook.com/v21.0/me/messages`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formRequestBody)
                }
            );

            const formResult = await formResponse.json();

            if (formResult.error) {
                console.error('    ✗ Facebook API error:', formResult.error.message);
                console.error('    ✗ Error code:', formResult.error.code);

                // If webview fails, try sending as regular URL button
                if (formResult.error.code === 100) {
                    console.log('    🔄 Retrying with regular URL button...');

                    const fallbackBody = {
                        recipient: { id: context.commenterId },
                        message: {
                            attachment: {
                                type: 'template',
                                payload: {
                                    template_type: 'button',
                                    text: `📋 ${formName}\n\nTap below to fill out the form:`,
                                    buttons: [
                                        {
                                            type: 'web_url',
                                            url: formUrl,
                                            title: 'Open Form'
                                        }
                                    ]
                                }
                            }
                        },
                        access_token: pageAccessToken
                    };

                    const fallbackResponse = await fetch(
                        `https://graph.facebook.com/v21.0/me/messages`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(fallbackBody)
                        }
                    );

                    const fallbackResult = await fallbackResponse.json();
                    if (fallbackResult.error) {
                        console.error('    ✗ Fallback also failed:', fallbackResult.error.message);
                    } else {
                        console.log('    ✓ Form button sent successfully (fallback)!');
                    }
                }
            } else {
                console.log('    ✓ Form button sent successfully!');
                console.log('    ✓ Message ID:', formResult.message_id);
            }
        } catch (error: any) {
            console.error('    ✗ Exception sending form:', error.message);
        }

        return;
    }

    // Comment Reply Action - check multiple ways
    const isCommentReply = actionType === 'reply' ||
        label.toLowerCase().includes('reply') ||
        label.toLowerCase().includes('comment');

    if (isCommentReply) {
        console.log(`    ✓ Detected as Comment Reply node`);

        // Check for AI Reply mode
        const useAiReply = config.useAiReply === true;
        const aiProvider = config.aiProvider || 'openai';
        const aiPrompt = config.aiPrompt || '';
        const template = config.replyTemplate || config.template || '';

        console.log(`    🔧 AI Mode: ${useAiReply ? 'ON' : 'OFF'}`);

        if (useAiReply) {
            console.log(`    🤖 AI Provider: ${aiProvider}`);
            console.log(`    📝 AI Prompt: "${aiPrompt}"`);
        } else {
            console.log(`    📝 Template: "${template}"`);
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

        let replyMessage = '';

        if (useAiReply) {
            // Generate AI response for comment reply
            const generatedMessage = await generateAIResponse(
                aiProvider,
                aiPrompt,
                {
                    commenterName: context.commenterName || 'User',
                    commentText: context.message || '',
                    pageName: context.pageName || 'Our Page'
                }
            );

            if (!generatedMessage) {
                console.log('    ⊘ Skipping: AI failed to generate a response');
                return;
            }

            replyMessage = generatedMessage;
        } else {
            // Use manual template
            if (!template || !pageAccessToken) {
                console.log('    ⊘ Skipping: Missing template or token');
                return;
            }
            replyMessage = replaceVars(template);
        }

        if (!pageAccessToken) {
            console.log('    ⊘ Skipping: Missing page access token');
            return;
        }

        await replyToComment(context.commentId, replyMessage, context.commenterId, pageAccessToken, flowId, commentId);
        return; // Return after executing to prevent fall-through
    }

    // Send DM Action
    const isMessage = actionType === 'message' ||
        label.toLowerCase().includes('message') ||
        label.toLowerCase().includes('messenger');

    if (isMessage) {
        console.log(`    ✓ Detected as Send Message node`);

        // Check for AI Reply mode
        const useAiReply = config.useAiReply === true;
        const aiProvider = config.aiProvider || 'openai';
        const aiPrompt = config.aiPrompt || '';
        const template = config.messageTemplate || config.template || '';

        console.log(`    🔧 AI Mode: ${useAiReply ? 'ON' : 'OFF'}`);

        if (useAiReply) {
            console.log(`    🤖 AI Provider: ${aiProvider}`);
            console.log(`    📝 AI Prompt: "${aiPrompt}"`);
        } else {
            console.log(`    📝 Template: "${template}"`);
        }

        // Check if we've already sent DM for this comment (regardless of which flow)
        const { data: existingLog } = await supabase
            .from('comment_automation_log')
            .select('id')
            .eq('comment_id', commentId)
            .eq('action_type', 'dm_sent')
            .single();

        if (existingLog) {
            console.log('    ✓ Already sent DM for this comment (skipping duplicate)');
            return;
        }

        let message = '';

        if (useAiReply) {
            // Generate AI response
            const generatedMessage = await generateAIResponse(
                aiProvider,
                aiPrompt,
                {
                    commenterName: context.commenterName || 'User',
                    commentText: context.message || '',
                    pageName: context.pageName || 'Our Page'
                }
            );

            if (!generatedMessage) {
                console.log('    ⊘ Skipping: AI failed to generate a response');
                return;
            }

            message = generatedMessage;
        } else {
            // Use manual template
            if (!template || !pageAccessToken) {
                console.log('    ⊘ Skipping: Missing template or token');
                return;
            }
            message = replaceVars(template);
        }

        if (!pageAccessToken) {
            console.log('    ⊘ Skipping: Missing page access token');
            return;
        }

        await sendPrivateReply(
            context.commenterId,
            context.commenterName,
            message,
            pageAccessToken,
            flowId,
            commentId,
            config.buttons // Pass buttons from config
        );

        // Save the commenter as a bot subscriber after successfully sending a DM
        if (context.workspaceId && context.pageDbId) {
            await saveOrUpdateSubscriber(
                context.workspaceId,
                context.pageDbId,
                context.commenterId,
                context.commenterName || 'Unknown User',
                'COMMENT',
                pageAccessToken
            );
        }

        return; // Return after executing
    }

    // Text/Delay Node - send text as message and/or wait
    if (nodeType === 'textNode') {
        console.log(`    ✓ Detected as Text/Delay node`);
        const delaySeconds = config.delaySeconds || 0;
        const textContent = config.textContent || '';
        const buttons = config.buttons || [];

        if (textContent) {
            console.log(`    📝 Text content: "${textContent}"`);
        }

        if (delaySeconds > 0) {
            console.log(`    ⏱️  Showing typing indicator for ${delaySeconds} second(s)...`);

            // Show typing indicator during the delay
            await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_on');
            await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
            await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_off');

            console.log(`    ✓ Delay complete`);
        }

        // Send text content as message if it exists
        if (textContent && textContent.trim()) {
            console.log(`    📤 Sending text content as Messenger message...`);

            try {
                let messagePayload: any;

                // Check if there are buttons to include
                if (buttons && buttons.length > 0) {
                    // Filter for valid buttons (URL, startFlow, or newFlow types)
                    const validButtons = buttons.filter((b: any) => {
                        if (b.type === 'url' && b.title && b.url) return true;
                        if (b.type === 'startFlow' && b.title && b.flowId) return true;
                        if (b.type === 'newFlow' && b.title && b.flowName) return true;
                        // Also handle legacy buttons without type (URL buttons)
                        if (!b.type && b.title && b.url) return true;
                        return false;
                    });

                    if (validButtons.length > 0) {
                        console.log(`    🔗 Including ${validButtons.length} button(s)`);

                        const fbButtons = validButtons.map((btn: any) => {
                            // URL button type
                            if (btn.type === 'url' || (!btn.type && btn.url)) {
                                console.log(`      → URL button: "${btn.title}" -> ${btn.url}`);
                                return {
                                    type: 'web_url',
                                    title: btn.title,
                                    url: btn.url,
                                    webview_height_ratio: btn.webviewHeight || 'full'
                                };
                            }
                            // startFlow button type - use flowId as payload
                            if (btn.type === 'startFlow' && btn.flowId) {
                                console.log(`      → Flow button: "${btn.title}" -> FLOW_${btn.flowId}`);
                                return {
                                    type: 'postback',
                                    title: btn.title,
                                    payload: `FLOW_${btn.flowId}`
                                };
                            }
                            // newFlow button type - use flowName as payload (will be matched via keyword)
                            if (btn.type === 'newFlow' && btn.flowName) {
                                console.log(`      → New Flow button: "${btn.title}" -> NEWFLOW_${btn.flowName}`);
                                return {
                                    type: 'postback',
                                    title: btn.title,
                                    payload: `NEWFLOW_${btn.flowName}`
                                };
                            }
                            return null;
                        }).filter(Boolean);

                        messagePayload = {
                            attachment: {
                                type: 'template',
                                payload: {
                                    template_type: 'button',
                                    text: textContent,
                                    buttons: fbButtons
                                }
                            }
                        };
                    } else {
                        messagePayload = { text: textContent };
                    }
                } else {
                    messagePayload = { text: textContent };
                }

                const requestBody = {
                    recipient: { id: context.commenterId },
                    message: messagePayload,
                    access_token: pageAccessToken
                };

                console.log(`    📤 Sending message to user: ${context.commenterName}`);
                console.log(`    📤 Request:`, JSON.stringify(requestBody, null, 2));

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
                    console.log('    ✓ Message sent successfully!');
                    console.log('    ✓ Message ID:', result.message_id);
                }
            } catch (error: any) {
                console.error('    ✗ Exception sending message:', error.message);
            }
        }

        return;
    }

    // Button Node (Text with Buttons) - send text message with buttons
    if (nodeType === 'buttonNode') {
        console.log(`    ✓ Detected as Button Node (Text with Buttons)`);
        const messageText = config.messageText || config.textContent || '';
        const buttons = config.buttons || [];

        console.log(`    📝 Message: "${messageText}"`);
        console.log(`    🔘 Buttons: ${buttons.length}`);

        if (!messageText) {
            console.log('    ⊘ Skipping: No message text configured');
            return;
        }

        try {
            // Show typing indicator briefly
            await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_on');
            await new Promise(resolve => setTimeout(resolve, 500));
            await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_off');

            let messagePayload: any;

            if (buttons && buttons.length > 0) {
                // Map buttons to Facebook format
                const fbButtons = buttons.map((btn: any) => {
                    if (btn.type === 'url' && btn.url) {
                        return {
                            type: 'web_url',
                            title: btn.title,
                            url: btn.url,
                            webview_height_ratio: btn.webviewType || 'full'
                        };
                    } else if (btn.type === 'startFlow' && btn.flowId) {
                        return {
                            type: 'postback',
                            title: btn.title,
                            payload: `FLOW_${btn.flowId}`
                        };
                    } else if (btn.type === 'postback' || btn.payload) {
                        return {
                            type: 'postback',
                            title: btn.title,
                            payload: btn.payload || btn.title.toUpperCase().replace(/\s+/g, '_')
                        };
                    }
                    return null;
                }).filter(Boolean);

                console.log(`    📤 Sending message with ${fbButtons.length} button(s)`);

                messagePayload = {
                    attachment: {
                        type: 'template',
                        payload: {
                            template_type: 'button',
                            text: messageText,
                            buttons: fbButtons
                        }
                    }
                };
            } else {
                messagePayload = { text: messageText };
            }

            const requestBody = {
                recipient: { id: context.commenterId },
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
            } else {
                console.log('    ✓ Button message sent successfully!');
                console.log('    ✓ Message ID:', result.message_id);
            }
        } catch (error: any) {
            console.error('    ✗ Exception sending button message:', error.message);
        }

        return;
    }

    // Buttons Only Node - send quick reply buttons
    if (nodeType === 'buttonsOnlyNode') {
        console.log(`    ✓ Detected as Buttons Only Node`);
        const buttons = config.buttons || [];

        if (buttons.length === 0) {
            console.log('    ⊘ Skipping: No buttons configured');
            return;
        }

        // Use a generic prompt message for buttons-only
        const promptText = config.promptText || 'Please select an option:';

        try {
            await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_on');
            await new Promise(resolve => setTimeout(resolve, 300));
            await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_off');

            const fbButtons = buttons.map((btn: any) => {
                if (btn.type === 'url' && btn.url) {
                    return {
                        type: 'web_url',
                        title: btn.title,
                        url: btn.url
                    };
                } else {
                    return {
                        type: 'postback',
                        title: btn.title,
                        payload: btn.payload || btn.title.toUpperCase().replace(/\s+/g, '_')
                    };
                }
            }).filter(Boolean);

            const requestBody = {
                recipient: { id: context.commenterId },
                message: {
                    attachment: {
                        type: 'template',
                        payload: {
                            template_type: 'button',
                            text: promptText,
                            buttons: fbButtons
                        }
                    }
                },
                access_token: pageAccessToken
            };

            const response = await fetch(
                `https://graph.facebook.com/v21.0/me/messages`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                }
            );

            const result = await response.json();

            if (result.error) {
                console.error('    ✗ Facebook API error:', result.error.message);
            } else {
                console.log('    ✓ Buttons sent successfully!');
            }
        } catch (error: any) {
            console.error('    ✗ Exception sending buttons:', error.message);
        }

        return;
    }
}

// Send typing indicator to show user is typing
async function sendTypingIndicator(userId: string, pageAccessToken: string, action: 'typing_on' | 'typing_off') {
    try {
        const response = await fetch(
            `https://graph.facebook.com/v21.0/me/messages`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: userId },
                    sender_action: action,
                    access_token: pageAccessToken
                })
            }
        );

        const result = await response.json();
        if (result.error) {
            console.log(`    ⚠️ Typing indicator error: ${result.error.message}`);
        } else {
            console.log(`    ✓ Typing indicator: ${action}`);
        }
    } catch (error: any) {
        console.log(`    ⚠️ Typing indicator exception: ${error.message}`);
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
    buttons?: Array<{
        title: string;
        type: 'startFlow' | 'url';
        flowId?: string;
        url?: string;
        webviewType?: 'full' | 'compact' | 'tall';
    }>
) {
    try {
        let messagePayload: any;

        // Check if we have buttons to include
        if (buttons && buttons.length > 0) {
            // Map buttons to Facebook format
            const fbButtons = buttons.map(btn => {
                if (btn.type === 'url' && btn.url) {
                    // URL button
                    return {
                        type: 'web_url',
                        title: btn.title,
                        url: btn.url,
                        webview_height_ratio: btn.webviewType || 'full'
                    };
                } else if (btn.type === 'startFlow' && btn.flowId) {
                    // Start Flow button - use flowId as payload
                    return {
                        type: 'postback',
                        title: btn.title,
                        payload: `FLOW_${btn.flowId}` // Prefix with FLOW_ to identify flow triggers
                    };
                }
                return null;
            }).filter(Boolean); // Remove null entries

            console.log(`  Mapped ${fbButtons.length} button(s) to Facebook format:`, fbButtons);

            messagePayload = {
                attachment: {
                    type: 'template',
                    payload: {
                        template_type: 'button',
                        text: message,
                        buttons: fbButtons
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

// React to a comment (Like it) - Facebook API only supports liking, not other reactions
async function reactToComment(commentId: string, pageAccessToken: string) {
    try {
        console.log(`    👍 Auto-liking comment: ${commentId}`);

        const response = await fetch(
            `https://graph.facebook.com/v21.0/${commentId}/likes`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    access_token: pageAccessToken
                })
            }
        );

        const result = await response.json();

        if (result.error) {
            console.error('    ✗ Like error:', result.error.message);
            console.error('    ✗ Error code:', result.error.code);
            // Don't fail the entire flow if liking fails
        } else if (result.success === true) {
            console.log(`    ✓ Successfully liked comment`);
        } else {
            console.log(`    ⚠ Like response:`, JSON.stringify(result));
        }
    } catch (error: any) {
        console.error('    ✗ Exception liking comment:', error.message);
        // Don't fail the entire flow if liking fails
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
