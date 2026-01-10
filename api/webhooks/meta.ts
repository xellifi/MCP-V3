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
        // Check if subscriber already exists - use maybeSingle to avoid error when not found
        const { data: existingSubscriber, error: lookupError } = await supabase
            .from('subscribers')
            .select('id, name, avatar_url, labels, source, metadata')
            .eq('workspace_id', workspaceId)
            .eq('external_id', userId)
            .maybeSingle();

        if (lookupError) {
            console.log(`    ⚠️ Subscriber lookup error (non-fatal):`, lookupError.message);
        }

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

            console.log(`    📝 Inserting new subscriber: workspace_id=${workspaceId}, page_id=${pageId}, external_id=${userId}`);
            const { data: insertData, error: insertError } = await supabase
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
                    last_active_at: now,
                    metadata: {}  // Initialize metadata column with empty object
                })
                .select();

            if (insertError) {
                // Could be duplicate key from race condition, ignore
                if (insertError.code !== '23505') {
                    console.error('    ✗ Error creating subscriber:', insertError.message);
                    console.error('    ✗ Error code:', insertError.code);
                    console.error('    ✗ Error details:', insertError.details);
                } else {
                    console.log('    ℹ️ Subscriber already exists (race condition), continuing...');
                }
            } else {
                console.log(`    ✓ New subscriber created: ${userName} (ID: ${insertData?.[0]?.id || 'unknown'})`);
            }
        }
    } catch (error) {
        console.error('    ✗ Error in saveOrUpdateSubscriber:', error);
    }
}

// Helper function to update subscriber labels (add/remove labels during flow execution)
async function updateSubscriberLabels(
    workspaceId: string,
    subscriberExternalId: string,
    addLabel?: string,
    removeLabel?: string
): Promise<void> {
    if (!addLabel && !removeLabel) return;

    console.log(`    🏷️ Updating labels for subscriber ${subscriberExternalId}: add="${addLabel || ''}", remove="${removeLabel || ''}"`);

    try {
        // Get current subscriber
        const { data: subscriber, error: fetchError } = await supabase
            .from('subscribers')
            .select('id, labels')
            .eq('workspace_id', workspaceId)
            .eq('external_id', subscriberExternalId)
            .single();

        if (fetchError || !subscriber) {
            console.log('    ⚠️ Subscriber not found for label update');
            return;
        }

        let labels: string[] = subscriber.labels || [];

        // Remove label if specified
        if (removeLabel) {
            labels = labels.filter(l => l.toLowerCase() !== removeLabel.toLowerCase());
        }

        // Add label if specified and not already present
        if (addLabel && !labels.some(l => l.toLowerCase() === addLabel.toLowerCase())) {
            labels.push(addLabel);
        }

        // Update subscriber labels
        const { error: updateError } = await supabase
            .from('subscribers')
            .update({ labels })
            .eq('id', subscriber.id);

        if (updateError) {
            console.error('    ✗ Error updating subscriber labels:', updateError);
        } else {
            console.log(`    ✓ Labels updated: [${labels.join(', ')}]`);
        }
    } catch (error) {
        console.error('    ✗ Error in updateSubscriberLabels:', error);
    }
}

// Helper function to increment node analytics counters
async function incrementNodeAnalytics(
    flowId: string,
    nodeId: string,
    field: 'sent_count' | 'delivered_count' | 'subscriber_count' | 'error_count'
): Promise<void> {
    try {
        // First, try to upsert the record
        const { data: existing } = await supabase
            .from('node_analytics')
            .select('id, ' + field)
            .eq('flow_id', flowId)
            .eq('node_id', nodeId)
            .single();

        if (existing) {
            // Update existing record
            await supabase
                .from('node_analytics')
                .update({
                    [field]: ((existing as any)[field] || 0) + 1,
                    updated_at: new Date().toISOString()
                })
                .eq('id', (existing as any).id);
        } else {
            // Insert new record
            await supabase
                .from('node_analytics')
                .insert({
                    flow_id: flowId,
                    node_id: nodeId,
                    [field]: 1
                });
        }
    } catch (error) {
        // Silently fail - analytics shouldn't break flow execution
        console.log(`    ⚠️ Analytics update failed for ${nodeId}:`, error);
    }
}

// Helper function to create webview session and return URL
async function createWebviewSession(
    pageType: 'product' | 'upsell' | 'downsell' | 'cart' | 'form' | 'checkout',
    externalId: string,
    workspaceId: string,
    flowId: string,
    nodeId: string,
    pageConfig: any,
    pageAccessToken: string,
    cart?: any[]
): Promise<string | null> {
    try {
        const baseUrl = process.env.VITE_APP_URL || process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:5173';

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

        // Let the database generate the UUID automatically and return it
        const { data, error } = await supabase
            .from('webview_sessions')
            .insert({
                external_id: externalId,
                workspace_id: workspaceId,
                flow_id: flowId,
                current_node_id: nodeId,
                page_type: pageType,
                page_config: pageConfig,
                cart: cart || [],
                cart_total: (cart || []).reduce((sum: number, item: any) => sum + (item.productPrice || 0) * (item.quantity || 1), 0),
                page_access_token: pageAccessToken,
                expires_at: expiresAt.toISOString(),
                metadata: {}
            })
            .select('id')
            .single();

        if (error || !data) {
            console.error('    ✗ Error creating webview session:', error?.message || 'No data returned');
            return null;
        }

        const sessionId = data.id;
        const webviewUrl = `${baseUrl}/wv/${pageType}/${sessionId}`;
        console.log(`    🌐 Created webview session: ${sessionId}`);
        console.log(`    🔗 Webview URL: ${webviewUrl}`);

        return webviewUrl;
    } catch (error: any) {
        console.error('    ✗ Exception creating webview session:', error.message);
        return null;
    }
}

// Helper function to fetch user name from Facebook API
async function fetchUserName(userId: string, pageAccessToken: string): Promise<string> {
    try {
        const userResponse = await fetch(
            `https://graph.facebook.com/${userId}?fields=name&access_token=${pageAccessToken}`
        );
        const userData = await userResponse.json();
        if (userData?.name) {
            console.log(`    ✓ Got user name from FB API: ${userData.name}`);
            return userData.name;
        }
    } catch (error) {
        console.log(`    ⚠️ Could not fetch user name for ${userId}`);
    }
    return 'Facebook User';
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

                // Handle Facebook native customer_information form submissions
                if (messaging.customer_information) {
                    await processCustomerInformation(messaging, pageId);
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

    // Check if payload is a direct flow trigger (FLOW_{flowId} or FLOW_{flowId}|ADD:label|REM:label)
    if (payload.startsWith('FLOW_')) {
        // Parse flow ID and optional label data from payload
        // Format: FLOW_{flowId}|ADD:{addLabel}|REM:{removeLabel}
        let flowId = payload.replace('FLOW_', '');
        let buttonAddLabel = '';
        let buttonRemoveLabel = '';

        // Check for label data in payload
        if (flowId.includes('|ADD:')) {
            const parts = flowId.split('|');
            flowId = parts[0];
            for (const part of parts) {
                if (part.startsWith('ADD:')) {
                    buttonAddLabel = part.replace('ADD:', '');
                } else if (part.startsWith('REM:')) {
                    buttonRemoveLabel = part.replace('REM:', '');
                }
            }
        }

        console.log(`✓ Direct flow trigger detected: ${flowId}`);
        if (buttonAddLabel || buttonRemoveLabel) {
            console.log(`  🏷️ Button labels: add="${buttonAddLabel}", remove="${buttonRemoveLabel}"`);
        }

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

        // Fetch user's actual name from Facebook API BEFORE executing flow
        const userName = await fetchUserName(senderId, pageAccessToken);

        // Apply button labels from the clicked button (if present)
        if (buttonAddLabel || buttonRemoveLabel) {
            await updateSubscriberLabels(workspaceId, senderId, buttonAddLabel || undefined, buttonRemoveLabel || undefined);
        }

        // Execute the flow starting from the Start node
        await executeFlowFromNode(
            startNode,
            nodes,
            edges,
            configurations,
            {
                commenterId: senderId,
                commenterName: userName,
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

    // Check if payload is a continue_flow JSON (from ProductNode, UpsellNode, DownsellNode Add to Cart)
    try {
        const parsedPayload = JSON.parse(payload);
        if (parsedPayload.action === 'continue_flow') {
            console.log(`✓ Continue Flow payload detected from node: ${parsedPayload.nodeId}`);
            console.log(`  🛒 Product: ${parsedPayload.productName} (₱${parsedPayload.productPrice})`);

            // Find the flow that contains this node
            const { data: flow, error: flowError } = await supabase
                .from('flows')
                .select('*')
                .eq('id', parsedPayload.flowId)
                .single();

            if (flowError || !flow) {
                console.error('✗ Flow not found:', parsedPayload.flowId);
                return;
            }

            const nodes = flow.nodes || [];
            const edges = flow.edges || [];
            const configurations = flow.configurations || {};

            // Find the source node (ProductNode, UpsellNode, or DownsellNode)
            const sourceNode = nodes.find((n: any) => n.id === parsedPayload.nodeId);
            if (!sourceNode) {
                console.error('✗ Source node not found:', parsedPayload.nodeId);
                return;
            }

            // Initialize or update cart based on cartAction
            const cartAction = parsedPayload.cartAction || 'add';
            const cartItem = {
                nodeId: parsedPayload.nodeId,
                productId: parsedPayload.productId || '',
                productName: parsedPayload.productName || 'Product',
                productPrice: parsedPayload.productPrice || 0,
                productImage: parsedPayload.productImage || '',
                quantity: 1
            };

            console.log(`  📦 Creating cart item: ${cartItem.productName} (₱${cartItem.productPrice})`);
            console.log(`  🖼️ Product image URL: ${cartItem.productImage || '(none)'}`);
            if (!cartItem.productImage) {
                console.log(`  ⚠️ WARNING: No productImage in payload! Check if Product node config has image set.`);
            }

            // Get existing cart from subscriber context or create new
            let cart: any[] = [];

            // Try to get existing cart from subscriber metadata
            console.log(`  🔍 Looking up subscriber: external_id=${senderId}, workspace_id=${workspaceId}`);
            const { data: subscriber, error: subError } = await supabase
                .from('subscribers')
                .select('id, metadata')
                .eq('external_id', senderId)
                .eq('workspace_id', workspaceId)
                .single();

            if (subError) {
                console.log(`  ⚠️ Subscriber lookup error: ${subError.message}`);
            } else if (subscriber) {
                console.log(`  ✓ Found subscriber ID: ${subscriber.id}`);
                if (subscriber?.metadata?.cart) {
                    cart = subscriber.metadata.cart;
                    console.log(`  📦 Existing cart has ${cart.length} item(s)`);
                } else {
                    console.log(`  📦 No existing cart in metadata`);
                }
            } else {
                console.log(`  ⚠️ No subscriber found`);
            }

            // Product node ALWAYS starts a fresh cart (it's the beginning of a checkout flow)
            // Upsells/downsells will ADD to this cart, but the main product replaces any old cart
            cart = [cartItem];
            console.log(`  🛒 Started fresh cart with: ${cartItem.productName}`);

            // Calculate cart total
            const cartTotal = cart.reduce((sum: number, item: any) => sum + (item.productPrice * item.quantity), 0);
            console.log(`  💰 Cart total: ₱${cartTotal}`);

            // CRITICAL: Ensure subscriber exists BEFORE updating metadata
            const userName = await fetchUserName(senderId, pageAccessToken);
            await saveOrUpdateSubscriber(
                workspaceId,
                pageDbId,
                senderId,
                userName,
                'POSTBACK',
                pageAccessToken
            );
            console.log(`  ✓ Subscriber ensured exists`);

            // CRITICAL FIX: When starting a new cart from Product node,
            // completely wipe old cart data and start fresh with a new session ID
            const cartSessionId = `session_${Date.now()}`;
            console.log(`  🆕 Starting new cart session: ${cartSessionId}`);

            // Save cart to subscriber metadata - REPLACE old cart completely
            console.log(`  📝 Saving FRESH cart to subscriber metadata...`);
            console.log(`  📝 Cart items:`, JSON.stringify(cart));
            const { data: updateData, error: updateError } = await supabase
                .from('subscribers')
                .update({
                    metadata: {
                        // Keep other metadata but FULLY REPLACE cart-related fields
                        email: subscriber?.metadata?.email,
                        phone: subscriber?.metadata?.phone,
                        address: subscriber?.metadata?.address,
                        // Fresh cart data
                        cart: cart,
                        cartTotal: cartTotal,
                        cartSessionId: cartSessionId,
                        cartUpdatedAt: new Date().toISOString(),
                        // Clear any stale upsell/checkout data from previous transactions
                        upsell_response: null,
                        upsell_node_id: null,
                        lastCheckoutAt: null
                    }
                })
                .eq('external_id', senderId)
                .eq('workspace_id', workspaceId)
                .select();

            if (updateError) {
                console.error(`  ❌ Cart save error:`, updateError.message);
            } else {
                console.log(`  ✓ Fresh cart saved successfully. Updated rows:`, updateData?.length || 0);
            }

            // Create stable ID for deduplication
            const timestamp = messagingEvent.timestamp || Date.now();
            const stableContinueFlowId = mid
                ? `continue_flow_mid_${mid}`
                : `continue_flow_${senderId}_${parsedPayload.nodeId}_${Math.floor(timestamp / 5000)}`;

            // userName already fetched above before saveOrUpdateSubscriber

            // Find nodes connected FROM the source node (don't re-execute source)
            const outgoingEdges = edges.filter((e: any) => e.source === sourceNode.id);
            console.log(`  → Found ${outgoingEdges.length} outgoing edge(s) from Product node`);

            // Execute each connected node
            for (const edge of outgoingEdges) {
                const targetNode = nodes.find((n: any) => n.id === edge.target);
                if (targetNode) {
                    console.log(`  → Continuing to: ${targetNode.data?.label || targetNode.id}`);
                    await executeFlowFromNode(
                        targetNode,
                        nodes,
                        edges,
                        configurations,
                        {
                            commenterId: senderId,
                            commenterName: userName,
                            commentText: `Added to cart: ${cartItem.productName}`,
                            pageId: pageId,
                            pageName: pageName,
                            postId: '',
                            commentId: stableContinueFlowId,
                            workspaceId,
                            pageDbId,
                            // Pass cart context for downstream nodes
                            cart: cart,
                            cartTotal: cartTotal
                        },
                        pageAccessToken,
                        flow.id,
                        stableContinueFlowId
                    );
                }
            }

            // saveOrUpdateSubscriber already called above before metadata update

            return; // Flow executed successfully
        }

        // Handle upsell_accept - add item to cart, save response, and continue to ALL connected nodes
        // (User controls branching via Condition Node checking upsell_response)
        if (parsedPayload.action === 'upsell_accept' || parsedPayload.action === 'downsell_accept') {
            const nodeType = parsedPayload.action === 'upsell_accept' ? 'upsell' : 'downsell';
            console.log(`✓ ${nodeType} ACCEPT from node: ${parsedPayload.nodeId}`);
            console.log(`  🛒 Product: ${parsedPayload.productName} (₱${parsedPayload.productPrice})`);

            // Find the flow
            const { data: flow, error: flowError } = await supabase
                .from('flows')
                .select('*')
                .eq('id', parsedPayload.flowId)
                .single();

            if (flowError || !flow) {
                console.error('✗ Flow not found:', parsedPayload.flowId);
                return;
            }

            const nodes = flow.nodes || [];
            const edges = flow.edges || [];
            const configurations = flow.configurations || {};

            // Get or create cart
            const { data: subscriber } = await supabase
                .from('subscribers')
                .select('metadata')
                .eq('external_id', senderId)
                .eq('workspace_id', workspaceId)
                .single();

            let cart: any[] = subscriber?.metadata?.cart || [];
            console.log(`  📦 Existing cart from metadata: ${cart.length} items`);
            if (cart.length > 0) {
                cart.forEach((item: any, i: number) => {
                    console.log(`    [${i}] ${item.productName} - ₱${item.productPrice}`);
                });
            } else {
                console.log(`  ⚠️ Cart is empty in subscriber metadata!`);
            }

            // Apply cart action
            const cartAction = parsedPayload.cartAction || 'add';
            console.log(`  🔧 Cart action from payload: "${cartAction}"`);
            const cartItem = {
                nodeId: parsedPayload.nodeId,
                productId: '',
                productName: parsedPayload.productName || 'Product',
                productPrice: parsedPayload.productPrice || 0,
                productImage: parsedPayload.productImage || '',
                quantity: 1,
                isUpsell: nodeType === 'upsell',
                isDownsell: nodeType === 'downsell'
            };

            if (cartAction === 'replace') {
                cart = [cartItem];
                console.log(`  🔄 Cart replaced with: ${cartItem.productName}`);
            } else {
                cart.push(cartItem);
                console.log(`  ➕ Added to cart: ${cartItem.productName} (${cart.length} items)`);
            }

            const cartTotal = cart.reduce((sum: number, item: any) => sum + (item.productPrice * item.quantity), 0);
            console.log(`  💰 Cart total: ₱${cartTotal}`);

            // CRITICAL: Ensure subscriber exists BEFORE updating metadata
            const upsellUserName = await fetchUserName(senderId, pageAccessToken);
            await saveOrUpdateSubscriber(
                workspaceId,
                pageDbId,
                senderId,
                upsellUserName,
                'POSTBACK',
                pageAccessToken
            );
            console.log(`  ✓ Subscriber ensured exists before metadata update`);

            // Save cart AND upsell_response to metadata (for Condition Node to check)
            console.log(`  📝 Saving cart to subscriber metadata...`);
            const { data: updateData, error: updateError } = await supabase
                .from('subscribers')
                .update({
                    metadata: {
                        ...(subscriber?.metadata || {}),
                        cart: cart,
                        cartTotal: cartTotal,
                        cartUpdatedAt: new Date().toISOString(),
                        upsell_response: 'accepted',  // Saved for Condition Node
                        upsell_node_id: parsedPayload.nodeId
                    }
                })
                .eq('external_id', senderId)
                .eq('workspace_id', workspaceId)
                .select();

            if (updateError) {
                console.error(`  ❌ Cart save error:`, updateError.message);
                console.error(`  ❌ Error details:`, JSON.stringify(updateError));
            } else {
                console.log(`  ✓ Cart saved successfully. Rows updated: ${updateData?.length || 0}`);
                if (updateData?.length === 0) {
                    console.log(`  ⚠️ WARNING: No rows updated! Subscriber may not exist for external_id=${senderId}, workspace_id=${workspaceId}`);
                }
            }

            console.log(`  ✓ Saved upsell_response: 'accepted' to subscriber metadata`);

            // Find ALL outgoing edges from this node (not just accept-specific paths)
            const outgoingEdges = edges.filter((e: any) => e.source === parsedPayload.nodeId);

            // upsellUserName already fetched above before saveOrUpdateSubscriber
            const timestamp = messagingEvent.timestamp || Date.now();
            const stableId = mid ? `upsell_mid_${mid}` : `upsell_${senderId}_${parsedPayload.nodeId}_${Math.floor(timestamp / 5000)}`;

            console.log(`  → Found ${outgoingEdges.length} outgoing edge(s) from ${nodeType} node`);

            // Execute from each connected node (user controls branching via Condition Node)
            for (const edge of outgoingEdges) {
                const targetNode = nodes.find((n: any) => n.id === edge.target);
                if (targetNode) {
                    console.log(`  → Continuing to: ${targetNode.data?.label}`);
                    await executeFlowFromNode(
                        targetNode,
                        nodes,
                        edges,
                        configurations,
                        {
                            commenterId: senderId,
                            commenterName: upsellUserName,
                            commentText: `Accepted ${nodeType}`,
                            pageId: pageId,
                            pageName: pageName,
                            postId: '',
                            commentId: stableId,
                            workspaceId,
                            pageDbId,
                            cart: cart,
                            cartTotal: cartTotal,
                            upsell_response: 'accepted'  // Pass to context for Condition Node
                        },
                        pageAccessToken,
                        flow.id,
                        stableId
                    );
                }
            }

            return;
        }


        // Handle upsell_decline / downsell_decline - save response and continue to ALL connected nodes
        // (User controls branching via Condition Node checking upsell_response)
        if (parsedPayload.action === 'upsell_decline' || parsedPayload.action === 'downsell_decline') {
            const nodeType = parsedPayload.action === 'upsell_decline' ? 'upsell' : 'downsell';
            console.log(`✓ ${nodeType} DECLINE from node: ${parsedPayload.nodeId}`);

            // Find the flow
            const { data: flow, error: flowError } = await supabase
                .from('flows')
                .select('*')
                .eq('id', parsedPayload.flowId)
                .single();

            if (flowError || !flow) {
                console.error('✗ Flow not found:', parsedPayload.flowId);
                return;
            }

            const nodes = flow.nodes || [];
            const edges = flow.edges || [];
            const configurations = flow.configurations || {};

            // Get existing cart (don't modify cart on decline)
            const { data: subscriber } = await supabase
                .from('subscribers')
                .select('metadata')
                .eq('external_id', senderId)
                .eq('workspace_id', workspaceId)
                .maybeSingle();

            const cart = subscriber?.metadata?.cart || [];
            const cartTotal = subscriber?.metadata?.cartTotal || 0;

            // Save upsell_response: 'declined' to metadata (for Condition Node to check)
            await supabase
                .from('subscribers')
                .update({
                    metadata: {
                        ...(subscriber?.metadata || {}),
                        upsell_response: 'declined',  // Saved for Condition Node
                        upsell_node_id: parsedPayload.nodeId
                    }
                })
                .eq('external_id', senderId)
                .eq('workspace_id', workspaceId);

            console.log(`  ✓ Saved upsell_response: 'declined' to subscriber metadata`);

            // Find ALL outgoing edges from this node (not just decline-specific paths)
            const outgoingEdges = edges.filter((e: any) => e.source === parsedPayload.nodeId);

            const userName = await fetchUserName(senderId, pageAccessToken);
            const timestamp = messagingEvent.timestamp || Date.now();
            const stableId = mid ? `decline_mid_${mid}` : `decline_${senderId}_${parsedPayload.nodeId}_${Math.floor(timestamp / 5000)}`;

            console.log(`  → Found ${outgoingEdges.length} outgoing edge(s) from ${nodeType} node`);

            // Execute from each connected node (user controls branching via Condition Node)
            for (const edge of outgoingEdges) {
                const targetNode = nodes.find((n: any) => n.id === edge.target);
                if (targetNode) {
                    console.log(`  → Continuing to: ${targetNode.data?.label}`);
                    await executeFlowFromNode(
                        targetNode,
                        nodes,
                        edges,
                        configurations,
                        {
                            commenterId: senderId,
                            commenterName: userName,
                            commentText: `Declined ${nodeType}`,
                            pageId: pageId,
                            pageName: pageName,
                            postId: '',
                            commentId: stableId,
                            workspaceId,
                            pageDbId,
                            cart: cart,
                            cartTotal: cartTotal,
                            upsell_response: 'declined'  // Pass to context for Condition Node
                        },
                        pageAccessToken,
                        flow.id,
                        stableId
                    );
                }
            }

            return;
        }

        // Handle checkout_confirm - continue flow after checkout button is clicked
        if (parsedPayload.action === 'checkout_confirm') {
            console.log(`✓ Checkout CONFIRM from node: ${parsedPayload.nodeId}`);

            // Fetch the flow to get nodes and edges
            const { data: flow, error: flowError } = await supabase
                .from('flows')
                .select('*')
                .eq('id', parsedPayload.flowId)
                .single();

            if (flowError || !flow) {
                console.error('✗ Could not find flow:', parsedPayload.flowId);
                return;
            }

            const nodes = flow.nodes || [];
            const edges = flow.edges || [];
            const configurations = flow.configurations || {};

            // Get cart from subscriber metadata
            console.log(`  🔍 Looking up subscriber: external_id=${senderId}, workspace_id=${workspaceId}`);
            const { data: subscriber, error: subError } = await supabase
                .from('subscribers')
                .select('id, metadata, name')
                .eq('external_id', senderId)
                .eq('workspace_id', workspaceId)
                .single();

            if (subError) {
                console.error(`  ❌ Subscriber lookup error:`, subError.message);
                console.error(`  ❌ Error code:`, subError.code);
            } else if (!subscriber) {
                console.log(`  ⚠️ No subscriber found!`);
            } else {
                console.log(`  ✓ Found subscriber ID: ${subscriber.id}`);
                console.log(`  📋 Subscriber metadata type:`, typeof subscriber.metadata);
                console.log(`  📋 Subscriber metadata:`, JSON.stringify(subscriber.metadata));
            }

            const cart = subscriber?.metadata?.cart || [];
            const cartTotal = subscriber?.metadata?.cartTotal || 0;
            const customerName = subscriber?.name || await fetchUserName(senderId, pageAccessToken);

            // Debug logging for cart contents
            console.log(`  📦 Cart from subscriber metadata: ${cart.length} items, ₱${cartTotal}`);
            if (cart.length > 0) {
                cart.forEach((item: any, i: number) => {
                    console.log(`    [${i}] ${item.productName} - ₱${item.productPrice}`);
                });
            } else {
                console.log(`  ⚠️ Cart is empty in subscriber metadata!`);
            }

            // Find outgoing edges from checkout node
            const outgoingEdges = edges.filter((e: any) => e.source === parsedPayload.nodeId);

            const timestamp = messagingEvent.timestamp || Date.now();
            const stableId = mid ? `checkout_mid_${mid}` : `checkout_${senderId}_${parsedPayload.nodeId}_${Math.floor(timestamp / 5000)}`;

            console.log(`  → ${outgoingEdges.length} outgoing edge(s) from Checkout node`);

            // Execute from each connected node
            for (const edge of outgoingEdges) {
                const targetNode = nodes.find((n: any) => n.id === edge.target);
                if (targetNode) {
                    console.log(`  → Continuing to: ${targetNode.data?.label}`);
                    await executeFlowFromNode(
                        targetNode,
                        nodes,
                        edges,
                        configurations,
                        {
                            commenterId: senderId,
                            commenterName: customerName,
                            commentText: `Checkout confirmed`,
                            pageId: pageId,
                            pageName: pageName,
                            postId: '',
                            commentId: stableId,
                            workspaceId,
                            pageDbId,
                            cart: cart,
                            cartTotal: cartTotal
                        },
                        pageAccessToken,
                        flow.id,
                        stableId
                    );
                }
            }

            // CRITICAL FIX: Clear cart after checkout is confirmed
            // This ensures the next transaction starts with a fresh cart
            console.log(`  🧹 Clearing cart from subscriber metadata after checkout...`);
            await supabase
                .from('subscribers')
                .update({
                    metadata: {
                        ...(subscriber?.metadata || {}),
                        cart: [],
                        cartTotal: 0,
                        cartUpdatedAt: new Date().toISOString(),
                        lastCheckoutAt: new Date().toISOString()
                    }
                })
                .eq('external_id', senderId)
                .eq('workspace_id', workspaceId);
            console.log(`  ✓ Cart cleared - next transaction will start fresh`);

            return;
        }
    } catch (e) {
        // Not a JSON payload, continue to other handlers
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

                // Fetch user's actual name from Facebook API BEFORE executing flow
                const userName = await fetchUserName(senderId, pageAccessToken);

                // Execute the flow starting from the New Flow node
                await executeFlowFromNode(
                    newFlowNode,
                    nodes,
                    edges,
                    configurations,
                    {
                        commenterId: senderId,
                        commenterName: userName,
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

                // Fetch user's actual name from Facebook API BEFORE executing flow
                const userName = await fetchUserName(senderId, pageAccessToken);

                // Apply entry label from Start Node config if configured
                const entryLabel = config.entryLabel;
                if (entryLabel) {
                    await updateSubscriberLabels(workspaceId, senderId, entryLabel);
                }

                // Execute flow starting from this Start node
                await executeFlowFromNode(
                    startNode,
                    nodes,
                    edges,
                    configurations,
                    {
                        commenterId: senderId,
                        commenterName: userName,
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

// Process Facebook native customer_information form submissions
async function processCustomerInformation(messagingEvent: any, pageId: string) {
    console.log('\n--- Processing Customer Information Form Submission ---');
    console.log('Messaging event:', JSON.stringify(messagingEvent, null, 2));

    const senderId = messagingEvent.sender.id;
    const customerInfo = messagingEvent.customer_information;

    console.log(`Customer form submitted by: ${senderId}`);
    console.log(`Customer info:`, JSON.stringify(customerInfo, null, 2));

    // Extract shipping address details from the form
    const shippingAddress = customerInfo.shipping_address || {};
    const buyerName = shippingAddress.name || '';
    const buyerPhone = shippingAddress.phone_number || '';
    const street1 = shippingAddress.street_1 || '';
    const street2 = shippingAddress.street_2 || '';
    const city = shippingAddress.city || '';
    const state = shippingAddress.state || '';
    const country = shippingAddress.country || '';
    const postalCode = shippingAddress.postal_code || '';

    // Combine address into a single string
    const buyerAddress = [street1, street2, city, state, postalCode, country]
        .filter(Boolean)
        .join(', ');

    console.log(`  Name: ${buyerName}`);
    console.log(`  Phone: ${buyerPhone}`);
    console.log(`  Address: ${buyerAddress}`);

    // Get page details from connected_pages
    const { data: page, error: pageError } = await supabase
        .from('connected_pages')
        .select('*, workspaces!inner(id)')
        .eq('page_id', pageId)
        .single();

    if (pageError || !page) {
        console.error('✗ Page not found');
        return;
    }

    const workspaceId = (page as any).workspaces.id;
    const pageAccessToken = (page as any).page_access_token;
    const pageDbId = (page as any).id;

    // Get subscriber and their checkout form state
    const { data: subscriber } = await supabase
        .from('subscribers')
        .select('id, metadata')
        .eq('external_id', senderId)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

    if (!subscriber?.metadata?.checkoutFormState) {
        console.log('✗ No checkout form state found for subscriber');
        return;
    }

    const formState = subscriber.metadata.checkoutFormState;
    console.log(`  Form node: ${formState.formNodeId}`);
    console.log(`  Flow ID: ${formState.flowId}`);

    // Update subscriber metadata with collected info and clear form state
    const updatedMetadata = {
        ...subscriber.metadata,
        checkoutFormState: null, // Clear form state
        buyerName,
        buyerPhone,
        buyerAddress,
        shippingAddress // Store full structured address
    };

    await supabase
        .from('subscribers')
        .update({ metadata: updatedMetadata })
        .eq('id', subscriber.id);

    console.log('  ✓ Customer information saved to subscriber metadata');

    // Send thank you message
    await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            recipient: { id: senderId },
            message: { text: formState.thankYouMessage || '✅ Thank you! Your information has been saved.' },
            access_token: pageAccessToken
        })
    });

    // Continue flow to next node
    const { data: flow } = await supabase
        .from('flows')
        .select('*')
        .eq('id', formState.flowId)
        .single();

    if (flow) {
        const nodes = flow.nodes || [];
        const edges = flow.edges || [];
        const configurations = flow.configurations || {};

        // Find outgoing edges from checkout form node
        const outgoingEdges = edges.filter((e: any) => e.source === formState.formNodeId);
        const userName = await fetchUserName(senderId, pageAccessToken);

        for (const edge of outgoingEdges) {
            const targetNode = nodes.find((n: any) => n.id === edge.target);
            if (targetNode) {
                console.log(`  → Continuing flow to: ${targetNode.data?.label}`);
                await executeFlowFromNode(
                    targetNode,
                    nodes,
                    edges,
                    configurations,
                    {
                        commenterId: senderId,
                        commenterName: userName,
                        commentText: 'Customer information submitted',
                        pageId: pageId,
                        pageName: (page as any).name || 'Page',
                        postId: '',
                        commentId: `customer_info_${Date.now()}`,
                        workspaceId,
                        pageDbId,
                        cart: subscriber.metadata?.cart || [],
                        cartTotal: subscriber.metadata?.cartTotal || 0,
                        buyerName,
                        buyerPhone,
                        buyerAddress
                    },
                    pageAccessToken,
                    flow.id,
                    `customer_info_complete_${Date.now()}`
                );
            }
        }
    }

    console.log('  ✓ Customer information form processing complete');
}

// Process incoming text message (for Start node triggers)
async function processTextMessage(messagingEvent: any, pageId: string) {
    console.log('\n--- Processing Text Message ---');
    console.log('Messaging event:', JSON.stringify(messagingEvent, null, 2));

    const senderId = messagingEvent.sender.id;
    const messageText = messagingEvent.message.text;
    const mid = messagingEvent.message?.mid;

    console.log(`Message from user: ${senderId}`);
    console.log(`Message text: "${messageText}"`);
    console.log(`Message ID (mid): ${mid}`);

    // ========== DEDUPLICATION CHECK ==========
    // Facebook sometimes sends the same webhook event multiple times
    // We use the message ID (mid) to prevent processing duplicates
    if (mid) {
        const now = Date.now();
        const messageKey = `msg_${mid}`;

        // STEP 1: In-memory cache check (works within same instance)
        const existingProcessing = postbackProcessingCache.get(messageKey);
        if (existingProcessing && (now - existingProcessing) < POSTBACK_PROCESSING_TIMEOUT) {
            console.log('✓ SKIPPING: Duplicate message detected (in-memory cache)');
            return;
        }
        postbackProcessingCache.set(messageKey, now);

        // STEP 2: Database check (works across serverless instances)
        const { data: existingLog } = await supabase
            .from('comment_automation_log')
            .select('id, created_at')
            .eq('comment_id', messageKey)
            .gte('created_at', new Date(Date.now() - 30000).toISOString())
            .maybeSingle();

        if (existingLog) {
            console.log('✓ SKIPPING: Duplicate message detected (database check)');
            return;
        }

        // Log this message BEFORE processing to prevent race conditions
        const { error: insertError } = await supabase
            .from('comment_automation_log')
            .insert({
                comment_id: messageKey,
                flow_id: null,
                action_type: 'dm_sent',
                success: true,
                error_message: null,
                facebook_response: { senderId, messageText, mid, type: 'message_dedup' }
            });

        if (insertError) {
            if (insertError.message.includes('duplicate') || insertError.code === '23505') {
                console.log('✓ SKIPPING: Duplicate detected (concurrent insert)');
                return;
            }
            console.log(`⚠️ Insert warning (continuing): ${insertError.message}`);
        } else {
            console.log('✓ Message logged, proceeding with execution...');
        }
    }
    // ========== END DEDUPLICATION ==========

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

    // ========== CHECKOUT FORM RESPONSE HANDLING ==========
    // Check if user is currently filling out a checkout form
    // If so, capture their response and continue the form flow
    const { data: subscriber } = await supabase
        .from('subscribers')
        .select('id, metadata')
        .eq('external_id', senderId)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

    if (subscriber?.metadata?.checkoutFormState) {
        const formState = subscriber.metadata.checkoutFormState;
        console.log(`✓ User is filling checkout form - current field: ${formState.currentField}`);

        // Update the collected data based on current field
        const collectedData = { ...formState.collectedData };
        let nextField: string | null = null;
        let formComplete = false;

        if (formState.currentField === 'phone') {
            collectedData.phone = messageText;
            console.log(`  ✓ Captured phone: ${messageText}`);
            // Determine next field
            if (formState.collectEmail) nextField = 'email';
            else if (formState.collectAddress) nextField = 'address';
            else if (formState.collectPaymentMethod) nextField = 'payment';
            else formComplete = true;
        } else if (formState.currentField === 'email') {
            collectedData.email = messageText;
            console.log(`  ✓ Captured email: ${messageText}`);
            if (formState.collectAddress) nextField = 'address';
            else if (formState.collectPaymentMethod) nextField = 'payment';
            else formComplete = true;
        } else if (formState.currentField === 'address') {
            collectedData.address = messageText;
            console.log(`  ✓ Captured address: ${messageText}`);
            if (formState.collectPaymentMethod) nextField = 'payment';
            else formComplete = true;
        }

        // Update subscriber metadata with collected data
        const updatedMetadata = {
            ...subscriber.metadata,
            checkoutFormState: formComplete ? null : {
                ...formState,
                currentField: nextField,
                collectedData
            },
            // Store collected data at root level for later use by Cart Sheet / Invoice nodes
            buyerPhone: collectedData.phone || subscriber.metadata?.buyerPhone,
            buyerEmail: collectedData.email || subscriber.metadata?.buyerEmail,
            buyerAddress: collectedData.address || subscriber.metadata?.buyerAddress,
            buyerPaymentMethod: collectedData.paymentMethod || subscriber.metadata?.buyerPaymentMethod
        };

        await supabase
            .from('subscribers')
            .update({ metadata: updatedMetadata })
            .eq('id', subscriber.id);

        // If form is not complete, send the next prompt
        if (!formComplete && nextField) {
            await sendTypingIndicator(senderId, pageAccessToken, 'typing_on');
            await new Promise(resolve => setTimeout(resolve, 500));
            await sendTypingIndicator(senderId, pageAccessToken, 'typing_off');

            if (nextField === 'email') {
                await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipient: { id: senderId },
                        message: { text: formState.emailPrompt },
                        access_token: pageAccessToken
                    })
                });
                console.log('  ✓ Email prompt sent');
            } else if (nextField === 'address') {
                await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipient: { id: senderId },
                        message: { text: formState.addressPrompt },
                        access_token: pageAccessToken
                    })
                });
                console.log('  ✓ Address prompt sent');
            } else if (nextField === 'payment') {
                // Send payment options as quick replies
                const quickReplies = formState.paymentMethods.map((method: string) => ({
                    content_type: 'text',
                    title: method,
                    payload: JSON.stringify({
                        action: 'checkout_form_payment',
                        method: method,
                        nodeId: formState.formNodeId,
                        flowId: formState.flowId
                    })
                }));

                await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipient: { id: senderId },
                        message: {
                            text: formState.paymentPrompt,
                            quick_replies: quickReplies
                        },
                        access_token: pageAccessToken
                    })
                });
                console.log('  ✓ Payment options sent');
            }
            return; // Wait for next response
        }

        // Form is complete - send thank you and continue to next node
        if (formComplete) {
            console.log('  ✓ Checkout form complete! Collected data:', collectedData);

            // Send thank you message
            await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: senderId },
                    message: { text: formState.thankYouMessage },
                    access_token: pageAccessToken
                })
            });

            // Find the flow and continue to next node after checkout form
            const { data: flow } = await supabase
                .from('flows')
                .select('*')
                .eq('id', formState.flowId)
                .single();

            if (flow) {
                const nodes = flow.nodes || [];
                const edges = flow.edges || [];
                const configurations = flow.configurations || {};

                // Find the checkout form node
                const formNode = nodes.find((n: any) => n.id === formState.formNodeId);
                if (formNode) {
                    // Find outgoing edges and continue flow
                    const outgoingEdges = edges.filter((e: any) => e.source === formState.formNodeId);
                    const userName = await fetchUserName(senderId, pageAccessToken);

                    for (const edge of outgoingEdges) {
                        const targetNode = nodes.find((n: any) => n.id === edge.target);
                        if (targetNode) {
                            console.log(`  → Continuing flow to: ${targetNode.data?.label}`);
                            await executeFlowFromNode(
                                targetNode,
                                nodes,
                                edges,
                                configurations,
                                {
                                    commenterId: senderId,
                                    commenterName: userName,
                                    commentText: 'Checkout form completed',
                                    pageId: pageId,
                                    pageName: (page as any).name || 'Page',
                                    postId: '',
                                    commentId: `checkout_form_${mid || Date.now()}`,
                                    workspaceId,
                                    pageDbId,
                                    cart: subscriber.metadata?.cart || [],
                                    cartTotal: subscriber.metadata?.cartTotal || 0,
                                    buyerPhone: collectedData.phone,
                                    buyerEmail: collectedData.email,
                                    buyerAddress: collectedData.address,
                                    buyerPaymentMethod: collectedData.paymentMethod
                                },
                                pageAccessToken,
                                flow.id,
                                `checkout_form_complete_${mid || Date.now()}`
                            );
                        }
                    }
                }
            }
            return; // Form handling complete
        }
    }
    // ========== END CHECKOUT FORM RESPONSE HANDLING ==========

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

                // Fetch user's actual name from Facebook API BEFORE executing flow
                const userName = await fetchUserName(senderId, pageAccessToken);

                // Apply entry label from Start Node config if configured
                const entryLabel = config.entryLabel;
                if (entryLabel) {
                    await updateSubscriberLabels(workspaceId, senderId, entryLabel);
                }

                // Track start node analytics - increment subscriber_count
                await incrementNodeAnalytics(flow.id, startNode.id, 'subscriber_count');
                console.log(`    📊 Analytics: Incremented subscriber_count for start node ${startNode.id}`);

                // Execute flow starting from this Start node
                await executeFlowFromNode(
                    startNode,
                    nodes,
                    edges,
                    configurations,
                    {
                        commenterId: senderId,
                        commenterName: userName,
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

        // Track trigger node analytics - increment subscriber_count
        await incrementNodeAnalytics(flow.id, triggerNode.id, 'subscriber_count');
        console.log(`    📊 Analytics: Incremented subscriber_count for trigger node ${triggerNode.id}`);

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

        // STOP TRAVERSAL AT FORM NODES - continuation happens via form submission callback
        // This prevents nodes after the form from executing before the user submits
        if (node.type === 'formNode') {
            console.log(`  ⏸ Stopping traversal at Form node: "${node.data?.label}" - will continue after form submission`);
            continue; // Don't add successors to queue
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

        // STOP TRAVERSAL AT FORM NODES - continuation happens via form submission callback
        // This prevents nodes after the form from executing before the user submits
        if (node.type === 'formNode') {
            console.log(`  ⏸ Stopping traversal at Form node: "${node.data?.label}" - will continue after form submission`);
            continue; // Don't add successors to queue
        }

        // STOP TRAVERSAL AT PRODUCT NODE if using continue_flow (wait for Add to Cart click)
        const nodeConfig = configurations[node.id] || {};
        if (node.type === 'productNode' && nodeConfig.buttonAction === 'continue_flow') {
            console.log(`  ⏸ Stopping traversal at Product node: "${node.data?.label}" - waiting for Add to Cart click`);
            continue; // Don't add successors to queue - continue_flow postback will resume
        }

        // STOP TRAVERSAL AT UPSELL/DOWNSELL NODES - wait for Accept/Decline click
        if (node.type === 'upsellNode' || node.type === 'downsellNode') {
            console.log(`  ⏸ Stopping traversal at ${node.type}: "${node.data?.label}" - waiting for user choice`);
            continue; // Don't add successors to queue - button click will resume flow
        }

        // STOP TRAVERSAL AT CHECKOUT NODE - wait for checkout button click
        if (node.type === 'checkoutNode') {
            console.log(`  ⏸ Stopping traversal at Checkout node: "${node.data?.label}" - waiting for checkout confirmation`);
            continue; // Don't add successors to queue - checkout_confirm postback will resume
        }

        // CONDITION NODE: Evaluate conditions and follow only the matching path
        if (node.type === 'conditionNode') {
            const config = configurations[node.id] || {};
            const conditions = config.conditions || [];
            const matchType = config.matchType || 'all';

            console.log(`  🔀 Evaluating Condition Node: "${node.data?.label}"`);

            // Evaluate each condition
            const results = conditions.map((cond: any) => {
                const variable = cond.variable;
                const operator = cond.operator;
                const expectedValue = cond.value;

                // Get the actual value from context
                let actualValue = context[variable];

                // Handle special variables
                if (variable === 'form_submitted') {
                    actualValue = context.form_submitted === true || context.formSubmitted === true;
                }
                if (variable === 'upsell_response') {
                    // Check multiple possible locations for upsell response
                    actualValue = context.upsell_response || context.upsellResponse ||
                        context.metadata?.upsell_response || '';
                }
                if (variable === 'downsell_response') {
                    // Check multiple possible locations for downsell response
                    actualValue = context.downsell_response || context.downsellResponse ||
                        context.metadata?.downsell_response || '';
                }
                if (variable === 'cart_count') {
                    // Get cart count from context
                    actualValue = context.cart_count || context.cartCount ||
                        (Array.isArray(context.cart) ? context.cart.length : 0);
                }
                if (variable === 'webview_completed') {
                    actualValue = context.webview_completed === true || context.webviewCompleted === true;
                }
                if (variable === 'payment_method') {
                    actualValue = context.payment_method || context.paymentMethod ||
                        context.formData?.paymentMethod || '';
                }

                console.log(`    Checking: ${variable} ${operator} ${expectedValue}, actual: ${actualValue}`);

                // Evaluate based on operator
                switch (operator) {
                    case 'is_true': return actualValue === true;
                    case 'is_false': return actualValue === false;
                    case 'equals': return String(actualValue).toLowerCase() === String(expectedValue).toLowerCase();
                    case 'not_equals': return String(actualValue).toLowerCase() !== String(expectedValue).toLowerCase();
                    case 'contains': return String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
                    case 'not_contains': return !String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase());
                    case 'is_empty': return !actualValue || actualValue === '';
                    case 'is_not_empty': return actualValue && actualValue !== '';
                    case 'greater_than': return Number(actualValue) > Number(expectedValue);
                    case 'less_than': return Number(actualValue) < Number(expectedValue);
                    case 'greater_or_equal': return Number(actualValue) >= Number(expectedValue);
                    case 'less_or_equal': return Number(actualValue) <= Number(expectedValue);
                    default: return false;
                }
            });

            // Determine result based on matchType
            const conditionResult = conditions.length === 0 ? true :
                (matchType === 'all' ? results.every((r: boolean) => r) : results.some((r: boolean) => r));

            console.log(`  🔀 Condition result: ${conditionResult ? 'TRUE' : 'FALSE'}`);

            // Find edges with matching sourceHandle (true/false)
            const allConditionEdges = edges.filter((e: any) => e.source === currentNodeId);
            let matchingEdges = allConditionEdges.filter((e: any) =>
                e.sourceHandle === (conditionResult ? 'true' : 'false')
            );

            // Fallback: If no sourceHandle, use position-based logic
            if (matchingEdges.length === 0 && allConditionEdges.length > 0) {
                console.log(`    No sourceHandle found, using position-based fallback`);
                const edgesWithPositions = allConditionEdges.map((edge: any) => {
                    const targetNode = nodes.find((n: any) => n.id === edge.target);
                    return { ...edge, targetY: targetNode?.position?.y ?? 0 };
                }).sort((a: any, b: any) => a.targetY - b.targetY);

                // TRUE = first edge (top), FALSE = second edge (bottom)
                if (conditionResult && edgesWithPositions.length >= 1) {
                    matchingEdges = [edgesWithPositions[0]];
                } else if (!conditionResult && edgesWithPositions.length >= 2) {
                    matchingEdges = [edgesWithPositions[1]];
                }
            }

            // Add only matching edges to queue
            for (const edge of matchingEdges) {
                if (edge.target && !visited.has(edge.target)) {
                    console.log(`    → Following ${conditionResult ? 'TRUE' : 'FALSE'} path to: ${nodes.find((n: any) => n.id === edge.target)?.data?.label || edge.target}`);
                    queue.push(edge.target);
                }
            }
            continue; // Skip the normal outgoing edges logic
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

    // Track node execution - increment sent_count
    await incrementNodeAnalytics(flowId, node.id, 'sent_count');
    console.log(`    📊 Analytics: Incremented sent_count for node ${node.id}`);

    // Handle nodes that don't send Facebook messages but still process data
    // These immediately count as "delivered" when they execute
    if (nodeType === 'conditionNode') {
        console.log(`    ✓ Condition Node detected - evaluation happens in flow traversal`);
        // Track as delivered since condition evaluation completes successfully
        await incrementNodeAnalytics(flowId, node.id, 'delivered_count');
        return; // Condition logic is handled in executeFlowFromNode
    }

    if (nodeType === 'sheetsNode') {
        console.log(`    ✓ Google Sheets Node detected - checking for order sync`);

        const webhookUrl = config.webhookUrl || '';
        const sheetName = config.sheetName || 'Orders';
        const sourceType = config.sourceType || 'auto';
        const includeMainProduct = config.includeMainProduct ?? true;
        const includeUpsells = config.includeUpsells ?? true;
        const includeDownsells = config.includeDownsells ?? true;
        const includeCustomerInfo = config.includeCustomerInfo ?? true;
        const includeTimestamp = config.includeTimestamp ?? true;

        // Check if we have order/cart data in context (from checkout flow)
        const cart = (context as any).cart || [];
        const cartTotal = (context as any).cartTotal || 0;

        console.log(`    📋 Source type: ${sourceType}`);
        console.log(`    🛒 Cart items: ${cart.length}, Total: ₱${cartTotal}`);

        // If we have cart data, this is an order sync (after checkout/invoice)
        if (cart.length > 0 && webhookUrl) {
            console.log(`    📊 Processing ORDER sync to Google Sheets...`);

            try {
                const { createClient } = await import('@supabase/supabase-js');
                const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
                const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
                const supabaseSheets = createClient(supabaseUrl, supabaseKey);

                // Get subscriber info for customer details
                const { data: subscriber } = await supabaseSheets
                    .from('subscribers')
                    .select('name, metadata')
                    .eq('external_id', context.commenterId)
                    .eq('workspace_id', context.workspaceId)
                    .single();

                // Build product lists based on config options
                const mainProducts: string[] = [];
                const upsellProducts: string[] = [];
                const downsellProducts: string[] = [];
                const allProducts: string[] = [];
                const allQuantities: string[] = [];
                const allPrices: string[] = [];

                cart.forEach((item: any) => {
                    const productName = item.productName || 'Unknown Product';
                    const quantity = item.quantity || 1;
                    const price = item.productPrice || 0;

                    if (item.isMainProduct && includeMainProduct) {
                        mainProducts.push(productName);
                        allProducts.push(`[Main] ${productName}`);
                        allQuantities.push(String(quantity));
                        allPrices.push(`₱${price}`);
                    } else if (item.isUpsell && includeUpsells) {
                        upsellProducts.push(productName);
                        allProducts.push(`[Upsell] ${productName}`);
                        allQuantities.push(String(quantity));
                        allPrices.push(`₱${price}`);
                    } else if (item.isDownsell && includeDownsells) {
                        downsellProducts.push(productName);
                        allProducts.push(`[Downsell] ${productName}`);
                        allQuantities.push(String(quantity));
                        allPrices.push(`₱${price}`);
                    } else if (!item.isMainProduct && !item.isUpsell && !item.isDownsell) {
                        // Include all products if no specific flag
                        allProducts.push(productName);
                        allQuantities.push(String(quantity));
                        allPrices.push(`₱${price}`);
                    }
                });

                // Generate order ID
                const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;

                // Build webhook payload for Google Sheets
                const webhookPayload: any = {
                    row_id: orderId,
                    'Order ID': orderId,
                    'Customer Name': subscriber?.name || context.commenterName || 'Customer',
                    'Customer ID': context.commenterId,
                    'Products': allProducts.join(', '),
                    'Quantities': allQuantities.join(', '),
                    'Prices': allPrices.join(', '),
                    'Total': `₱${cartTotal.toLocaleString()}`,
                    'Total Amount': cartTotal,
                    'Main Products': mainProducts.join(', '),
                    'Upsell Products': upsellProducts.join(', '),
                    'Downsell Products': downsellProducts.join(', '),
                    'Item Count': cart.length,
                };

                // Add customer info if enabled
                if (includeCustomerInfo && subscriber?.metadata) {
                    webhookPayload['Customer Phone'] = subscriber.metadata.phone || '';
                    webhookPayload['Customer Email'] = subscriber.metadata.email || '';
                    webhookPayload['Customer Address'] = subscriber.metadata.address || '';
                }

                // Add timestamp if enabled
                if (includeTimestamp) {
                    const now = new Date();
                    webhookPayload['Timestamp'] = now.toISOString();
                    webhookPayload['Date'] = now.toLocaleDateString('en-PH');
                    webhookPayload['Time'] = now.toLocaleTimeString('en-PH');
                }

                // Add flow info for tracking
                webhookPayload['Flow ID'] = flowId;
                webhookPayload['Page Name'] = context.pageName || '';

                console.log(`    📤 Sending order to Google Sheets webhook...`);
                console.log(`    📋 Payload:`, JSON.stringify(webhookPayload, null, 2));

                // Send to Google Sheets webhook
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rowData: webhookPayload })
                });

                let webhookResult;
                try {
                    webhookResult = await response.json();
                } catch (e) {
                    webhookResult = { status: response.status };
                }

                console.log(`    ✓ Google Sheets webhook response:`, webhookResult);

                // Also save order to database for internal tracking
                try {
                    const { error: orderError } = await supabaseSheets
                        .from('orders')
                        .insert({
                            id: orderId,
                            workspace_id: context.workspaceId,
                            subscriber_external_id: context.commenterId,
                            customer_name: subscriber?.name || context.commenterName,
                            items: cart,
                            total: cartTotal,
                            status: 'completed',
                            flow_id: flowId,
                            metadata: {
                                main_products: mainProducts,
                                upsell_products: upsellProducts,
                                downsell_products: downsellProducts,
                                synced_to_sheets: true,
                                sheet_name: sheetName
                            }
                        });

                    if (orderError) {
                        // Table might not exist, that's okay
                        console.log(`    ⚠️ Could not save to orders table:`, orderError.message);
                    } else {
                        console.log(`    ✓ Order saved to database: ${orderId}`);
                    }
                } catch (dbError: any) {
                    console.log(`    ⚠️ Database save skipped:`, dbError.message);
                }

                // Track as delivered
                await incrementNodeAnalytics(flowId, node.id, 'delivered_count');
                console.log(`    ✓ Order sync complete!`);

            } catch (error: any) {
                console.error(`    ✗ Error syncing order to sheets:`, error.message);
                await incrementNodeAnalytics(flowId, node.id, 'error_count');
            }
        } else if (!webhookUrl) {
            console.log(`    ⚠️ No webhook URL configured, skipping sync`);
            await incrementNodeAnalytics(flowId, node.id, 'delivered_count');
        } else {
            console.log(`    ℹ️ No cart data - form sync handled separately via form submission`);
            // Track as delivered since the node configuration is complete
            await incrementNodeAnalytics(flowId, node.id, 'delivered_count');
        }

        return;
    }

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

                // Track error
                await incrementNodeAnalytics(flowId, node.id, 'error_count');

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

                // Track delivery
                await incrementNodeAnalytics(flowId, node.id, 'delivered_count');

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

                // Track error
                await incrementNodeAnalytics(flowId, node.id, 'error_count');

                if (videoResult.error.code === 100) {
                    console.error('    💡 Hint: The video URL may not be publicly accessible or is blocked by the host');
                }
            } else {
                console.log('    ✓ Video sent successfully!');
                console.log('    ✓ Message ID:', videoResult.message_id);

                // Track delivery
                await incrementNodeAnalytics(flowId, node.id, 'delivered_count');

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

        // Build form URL with subscriber context AND flow context for continuation
        const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : process.env.APP_URL || 'https://your-app-url.vercel.app';

        // Include flow context for continuation after form submission
        const formUrl = `${baseUrl}/forms/${formId}?sid=${encodeURIComponent(context.commenterId)}&sname=${encodeURIComponent(context.commenterName || '')}&flowId=${flowId}&nodeId=${node.id}&pageId=${context.pageId}`;

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
                        // Track error
                        await incrementNodeAnalytics(flowId, node.id, 'error_count');
                    } else {
                        console.log('    ✓ Form button sent successfully (fallback)!');
                        // Track delivery
                        await incrementNodeAnalytics(flowId, node.id, 'delivered_count');
                    }
                } else {
                    // Track error for non-retryable errors
                    await incrementNodeAnalytics(flowId, node.id, 'error_count');
                }
            } else {
                console.log('    ✓ Form button sent successfully!');
                console.log('    ✓ Message ID:', formResult.message_id);
                // Track delivery
                await incrementNodeAnalytics(flowId, node.id, 'delivered_count');
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
                            // startFlow button type - use flowId as payload with optional label data
                            if (btn.type === 'startFlow' && btn.flowId) {
                                // Include label data in payload if configured
                                const labelData = (btn.addLabel || btn.removeLabel)
                                    ? `|ADD:${btn.addLabel || ''}|REM:${btn.removeLabel || ''}`
                                    : '';
                                const buttonPayload = `FLOW_${btn.flowId}${labelData}`;
                                console.log(`      → Flow button: "${btn.title}" -> ${buttonPayload}`);
                                return {
                                    type: 'postback',
                                    title: btn.title,
                                    payload: buttonPayload
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
                    // Track error
                    await incrementNodeAnalytics(flowId, node.id, 'error_count');
                } else {
                    console.log('    ✓ Message sent successfully!');
                    console.log('    ✓ Message ID:', result.message_id);
                    // Track delivery
                    await incrementNodeAnalytics(flowId, node.id, 'delivered_count');
                }
            } catch (error: any) {
                console.error('    ✗ Exception sending message:', error.message);
                // Track error
                await incrementNodeAnalytics(flowId, node.id, 'error_count');
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
                // Track error
                await incrementNodeAnalytics(flowId, node.id, 'error_count');
            } else {
                console.log('    ✓ Button message sent successfully!');
                console.log('    ✓ Message ID:', result.message_id);
                // Track delivery
                await incrementNodeAnalytics(flowId, node.id, 'delivered_count');
            }
        } catch (error: any) {
            console.error('    ✗ Exception sending button message:', error.message);
            // Track error
            await incrementNodeAnalytics(flowId, node.id, 'error_count');
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

    // Product Node - send product card with image, title, price, and Buy Now button
    if (nodeType === 'productNode') {
        console.log(`    ✓ Detected as Product Node`);
        const productName = config.productName || 'Product';
        const productDescription = config.productDescription || '';
        const productPrice = config.productPrice || 0;
        const productImage = config.productImage || '';
        const storeId = config.storeId || '';
        const productId = config.productId || '';

        console.log(`    🛍️ Product: "${productName}"`);
        console.log(`    🖼️ Product image: ${productImage || '(none configured)'}`);
        console.log(`    💰 Price: ${productPrice}`);
        console.log(`    🏷️ Product ID: ${productId}`);

        if (!productName) {
            console.log('    ⊘ Skipping: No product configured');
            return;
        }

        try {
            // Show typing indicator
            await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_on');
            await new Promise(resolve => setTimeout(resolve, 500));
            await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_off');

            // Format price
            const formattedPrice = `₱${productPrice.toLocaleString()}`;
            const subtitle = productDescription
                ? `${formattedPrice} - ${productDescription.substring(0, 60)}${productDescription.length > 60 ? '...' : ''}`
                : formattedPrice;

            // Build store URL for Buy Now button
            let buyNowUrl = '';

            // Query store slug from database
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
            const supabase = createClient(supabaseUrl, supabaseKey);

            console.log(`    🔍 Looking up store... storeId: ${storeId}`);

            let storeSlug = '';

            if (storeId) {
                // Try by storeId first
                const { data: storeData, error } = await supabase
                    .from('stores')
                    .select('slug')
                    .eq('id', storeId)
                    .single();

                console.log(`    🔍 Store lookup by ID result:`, storeData, 'error:', error?.message);

                if (storeData?.slug) {
                    storeSlug = storeData.slug;
                }
            }

            // Fallback: lookup by workspace from flow context
            if (!storeSlug && context.workspaceId) {
                console.log(`    🔍 Trying fallback lookup by workspace: ${context.workspaceId}`);
                const { data: storeData } = await supabase
                    .from('stores')
                    .select('slug')
                    .eq('workspace_id', context.workspaceId)
                    .single();

                if (storeData?.slug) {
                    storeSlug = storeData.slug;
                    console.log(`    ✓ Found store by workspace: ${storeSlug}`);
                }
            }

            if (storeSlug) {
                // Use VITE_APP_URL from environment variable (set in Vercel)
                const baseUrl = process.env.VITE_APP_URL || 'https://mcp-v16.vercel.app';
                // Include product ID in URL if available for direct product view
                buyNowUrl = productId
                    ? `${baseUrl}/store/${storeSlug}?product=${productId}`
                    : `${baseUrl}/store/${storeSlug}`;
                console.log(`    🔗 Buy Now URL: ${buyNowUrl}`);
            } else {
                console.log(`    ⚠️ No store found for storeId: ${storeId}, workspace: ${context.workspaceId}`);
            }

            // Build message payload using generic template for rich product card
            const buttonAction = config.buttonAction || 'store_page';

            // Build button based on action type
            let buttons: any[] = [];
            if (buttonAction === 'continue_flow') {
                // Use postback to continue the flow
                buttons = [{
                    type: 'postback',
                    title: '🛒 Add to Cart',
                    payload: JSON.stringify({
                        action: 'continue_flow',
                        nodeId: node.id,
                        flowId: flowId,
                        productId: productId,
                        productName: productName,
                        productPrice: productPrice,
                        productImage: productImage || ''
                    })
                }];
                console.log(`    🔗 Button action: continue_flow (postback), flowId: ${flowId}`);
            } else if (buyNowUrl) {
                // Use web_url to open store page
                buttons = [{
                    type: 'web_url',
                    title: '🛒 Buy Now',
                    url: buyNowUrl,
                    webview_height_ratio: 'full'
                }];
                console.log(`    🔗 Button action: store_page (web_url)`);
            }

            const elements: any[] = [{
                title: productName,
                subtitle: subtitle,
                image_url: productImage || undefined,
                buttons: buttons.length > 0 ? buttons : undefined
            }];

            // Remove undefined properties
            if (!elements[0].image_url) delete elements[0].image_url;
            if (!elements[0].buttons) delete elements[0].buttons;

            const messagePayload = {
                attachment: {
                    type: 'template',
                    payload: {
                        template_type: 'generic',
                        image_aspect_ratio: 'square',
                        elements: elements
                    }
                }
            };

            const requestBody = {
                recipient: { id: context.commenterId },
                message: messagePayload,
                access_token: pageAccessToken
            };

            console.log(`    📤 Sending product card...`);

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
                // Track error
                await incrementNodeAnalytics(flowId, node.id, 'error_count');
            } else {
                console.log('    ✓ Product card sent successfully!');
                console.log('    ✓ Message ID:', result.message_id);
                // Track delivery
                await incrementNodeAnalytics(flowId, node.id, 'delivered_count');
            }
        } catch (error: any) {
            console.error('    ✗ Exception sending product card:', error.message);
            // Track error
            await incrementNodeAnalytics(flowId, node.id, 'error_count');
        }

        return;
    }

    // Upsell Node - send upsell offer with Accept/Decline buttons
    if (nodeType === 'upsellNode') {
        console.log(`    ✓ Detected as Upsell Node`);
        const headline = config.headline || 'Special Offer!';
        const price = config.price || '₱0';
        const productImage = config.productImage || config.imageUrl || '';
        const description = config.description || '';
        const acceptButtonText = config.acceptButtonText || config.buttonText || '✓ Yes, Add This!';
        const cartAction = config.cartAction || 'add';
        const useWebview = config.useWebview === true;
        console.log(`    🔧 Config: cartAction="${cartAction}", useWebview=${useWebview}`);

        try {
            await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_on');
            await new Promise(resolve => setTimeout(resolve, 500));
            await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_off');

            let buttons: any[] = [];

            // Check if webview mode is enabled
            if (useWebview) {
                console.log(`    🌐 Webview mode enabled - creating webview session`);
                const webviewUrl = await createWebviewSession(
                    'upsell',
                    context.commenterId,
                    context.workspaceId,
                    flowId,
                    node.id,
                    config,
                    pageAccessToken,
                    context.cart || []
                );

                if (webviewUrl) {
                    buttons = [{
                        type: 'web_url',
                        title: '🎁 View Offer',
                        url: webviewUrl,
                        webview_height_ratio: 'full',
                        messenger_extensions: true
                    }];
                } else {
                    // Fallback to postback if webview creation failed
                    console.log(`    ⚠️ Webview creation failed, falling back to postback`);
                    buttons = [
                        {
                            type: 'postback',
                            title: acceptButtonText,
                            payload: JSON.stringify({
                                action: 'upsell_accept',
                                nodeId: node.id,
                                flowId: flowId,
                                productName: config.productName || headline,
                                productPrice: parseFloat(price.replace(/[^\d.]/g, '')) || 0,
                                productImage: productImage || '',
                                cartAction: cartAction
                            })
                        },
                        {
                            type: 'postback',
                            title: '✗ No Thanks',
                            payload: JSON.stringify({
                                action: 'upsell_decline',
                                nodeId: node.id,
                                flowId: flowId
                            })
                        }
                    ];
                }
            } else {
                // Standard postback buttons
                buttons = [
                    {
                        type: 'postback',
                        title: acceptButtonText,
                        payload: JSON.stringify({
                            action: 'upsell_accept',
                            nodeId: node.id,
                            flowId: flowId,
                            productName: config.productName || headline,
                            productPrice: parseFloat(price.replace(/[^\d.]/g, '')) || 0,
                            productImage: productImage || '',
                            cartAction: cartAction
                        })
                    },
                    {
                        type: 'postback',
                        title: '✗ No Thanks',
                        payload: JSON.stringify({
                            action: 'upsell_decline',
                            nodeId: node.id,
                            flowId: flowId
                        })
                    }
                ];
            }

            const elements = [{
                title: headline,
                subtitle: description ? `${price} - ${description.substring(0, 60)}` : price,
                image_url: productImage || undefined,
                buttons: buttons
            }];

            if (!elements[0].image_url) delete elements[0].image_url;

            const response = await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: context.commenterId },
                    message: {
                        attachment: {
                            type: 'template',
                            payload: {
                                template_type: 'generic',
                                image_aspect_ratio: 'square',
                                elements: elements
                            }
                        }
                    },
                    access_token: pageAccessToken
                })
            });

            const result = await response.json();
            if (result.error) {
                console.error('    ✗ Facebook API error:', result.error.message);
                // Track error
                await incrementNodeAnalytics(flowId, node.id, 'error_count');
            } else {
                console.log(`    ✓ Upsell card sent successfully! (webview: ${useWebview})`);
                // Track delivery
                await incrementNodeAnalytics(flowId, node.id, 'delivered_count');
            }
        } catch (error: any) {
            console.error('    ✗ Exception sending upsell:', error.message);
            // Track error
            await incrementNodeAnalytics(flowId, node.id, 'error_count');
        }

        return;
    }

    // Downsell Node - send downsell offer with Accept/Decline buttons
    if (nodeType === 'downsellNode') {
        console.log(`    ✓ Detected as Downsell Node`);
        const headline = config.headline || 'Wait! Special Deal';
        const price = config.price || '₱0';
        const productImage = config.productImage || config.imageUrl || '';
        const description = config.description || '';
        const acceptButtonText = config.acceptButtonText || '✓ Yes, I Want This';
        const cartAction = config.cartAction || 'add';
        const useWebview = config.useWebview === true;
        console.log(`    🔧 Config: cartAction="${cartAction}", useWebview=${useWebview}`);

        try {
            await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_on');
            await new Promise(resolve => setTimeout(resolve, 500));
            await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_off');

            let buttons: any[] = [];

            // Check if webview mode is enabled
            if (useWebview) {
                console.log(`    🌐 Webview mode enabled - creating webview session`);
                const webviewUrl = await createWebviewSession(
                    'downsell',
                    context.commenterId,
                    context.workspaceId,
                    flowId,
                    node.id,
                    config,
                    pageAccessToken,
                    context.cart || []
                );

                if (webviewUrl) {
                    buttons = [{
                        type: 'web_url',
                        title: '🎁 View Offer',
                        url: webviewUrl,
                        webview_height_ratio: 'full',
                        messenger_extensions: true
                    }];
                } else {
                    // Fallback to postback if webview creation failed
                    console.log(`    ⚠️ Webview creation failed, falling back to postback`);
                    buttons = [
                        {
                            type: 'postback',
                            title: acceptButtonText,
                            payload: JSON.stringify({
                                action: 'downsell_accept',
                                nodeId: node.id,
                                flowId: flowId,
                                productName: config.productName || headline,
                                productPrice: parseFloat(price.replace(/[^\d.]/g, '')) || 0,
                                productImage: productImage || '',
                                cartAction: cartAction
                            })
                        },
                        {
                            type: 'postback',
                            title: '✗ No Thanks',
                            payload: JSON.stringify({
                                action: 'downsell_decline',
                                nodeId: node.id,
                                flowId: flowId
                            })
                        }
                    ];
                }
            } else {
                // Standard postback buttons
                buttons = [
                    {
                        type: 'postback',
                        title: acceptButtonText,
                        payload: JSON.stringify({
                            action: 'downsell_accept',
                            nodeId: node.id,
                            flowId: flowId,
                            productName: config.productName || headline,
                            productPrice: parseFloat(price.replace(/[^\d.]/g, '')) || 0,
                            productImage: productImage || '',
                            cartAction: cartAction
                        })
                    },
                    {
                        type: 'postback',
                        title: '✗ No Thanks',
                        payload: JSON.stringify({
                            action: 'downsell_decline',
                            nodeId: node.id,
                            flowId: flowId
                        })
                    }
                ];
            }

            const elements = [{
                title: headline,
                subtitle: description ? `${price} - ${description.substring(0, 60)}` : price,
                image_url: productImage || undefined,
                buttons: buttons
            }];

            if (!elements[0].image_url) delete elements[0].image_url;

            const response = await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: context.commenterId },
                    message: {
                        attachment: {
                            type: 'template',
                            payload: {
                                template_type: 'generic',
                                image_aspect_ratio: 'square',
                                elements: elements
                            }
                        }
                    },
                    access_token: pageAccessToken
                })
            });

            const result = await response.json();
            if (result.error) {
                console.error('    ✗ Facebook API error:', result.error.message);
                // Track error
                await incrementNodeAnalytics(flowId, node.id, 'error_count');
            } else {
                console.log(`    ✓ Downsell card sent successfully! (webview: ${useWebview})`);
                // Track delivery
                await incrementNodeAnalytics(flowId, node.id, 'delivered_count');
            }
        } catch (error: any) {
            console.error('    ✗ Exception sending downsell:', error.message);
            // Track error
            await incrementNodeAnalytics(flowId, node.id, 'error_count');
        }

        return;
    }

    // Checkout Node - display cart summary and wait for checkout button click
    if (nodeType === 'checkoutNode') {
        console.log(`    ✓ Detected as Checkout Node`);
        const headerText = config.headerText || '🛒 Your Order Summary';
        const buttonText = config.buttonText || '✅ Proceed to Checkout';
        const companyName = config.companyName || '';
        const useWebview = config.useWebview === true;
        const showShipping = config.showShipping ?? false;
        const shippingFee = config.shippingFee || 0;

        try {
            // Get cart from context or subscriber metadata
            let cart = (context as any).cart || [];
            let cartTotal = (context as any).cartTotal || 0;
            let customerName = context.commenterName || 'Valued Customer';

            // If no cart in context, try to get from subscriber metadata
            if (cart.length === 0) {
                const { createClient } = await import('@supabase/supabase-js');
                const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
                const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
                const supabase = createClient(supabaseUrl, supabaseKey);

                const { data: subscriber } = await supabase
                    .from('subscribers')
                    .select('metadata, name')
                    .eq('external_id', context.commenterId)
                    .eq('workspace_id', context.workspaceId)
                    .single();

                if (subscriber?.metadata?.cart) {
                    cart = subscriber.metadata.cart;
                    cartTotal = subscriber.metadata.cartTotal || 0;
                }
                if (subscriber?.name) {
                    customerName = subscriber.name;
                }
            }

            console.log(`    🛒 Cart items: ${cart.length}`);
            console.log(`    💰 Total: ₱${cartTotal}`);
            console.log(`    🌐 Webview mode: ${useWebview}`);

            // Save cart to subscriber metadata
            if (cart.length > 0) {
                console.log(`    📝 Saving cart to subscriber metadata for checkout...`);
                const { createClient } = await import('@supabase/supabase-js');
                const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
                const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
                const supabaseCheckout = createClient(supabaseUrl, supabaseKey);

                const { data: existingSub } = await supabaseCheckout
                    .from('subscribers')
                    .select('metadata')
                    .eq('external_id', context.commenterId)
                    .eq('workspace_id', context.workspaceId)
                    .single();

                await supabaseCheckout
                    .from('subscribers')
                    .update({
                        metadata: {
                            ...(existingSub?.metadata || {}),
                            cart: cart,
                            cartTotal: cartTotal,
                            cartUpdatedAt: new Date().toISOString()
                        }
                    })
                    .eq('external_id', context.commenterId)
                    .eq('workspace_id', context.workspaceId);

                console.log(`    ✓ Cart saved to subscriber metadata`);
            }

            if (cart.length === 0) {
                console.log('    ⊘ Empty cart, sending empty cart message');
                await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_on');
                await new Promise(resolve => setTimeout(resolve, 500));
                await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_off');

                await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipient: { id: context.commenterId },
                        message: { text: '🛒 Your cart is empty. Please add some items first!' },
                        access_token: pageAccessToken
                    })
                });
                return;
            }

            await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_on');
            await new Promise(resolve => setTimeout(resolve, 500));
            await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_off');

            // Use webview if enabled
            if (useWebview) {
                console.log(`    🌐 Creating checkout webview session...`);
                const checkoutConfig = {
                    ...config,
                    headerText,
                    buttonText,
                    companyName,
                    showShipping,
                    shippingFee
                };

                const webviewUrl = await createWebviewSession(
                    'checkout',
                    context.commenterId,
                    context.workspaceId,
                    flowId,
                    node.id,
                    checkoutConfig,
                    pageAccessToken,
                    cart
                );

                if (webviewUrl) {
                    // Send a card with webview button
                    const response = await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            recipient: { id: context.commenterId },
                            message: {
                                attachment: {
                                    type: 'template',
                                    payload: {
                                        template_type: 'button',
                                        text: `🛒 ${headerText}\n\n${cart.length} item(s) - ₱${cartTotal.toLocaleString()}\n\nTap below to review and confirm your order.`,
                                        buttons: [{
                                            type: 'web_url',
                                            title: buttonText,
                                            url: webviewUrl,
                                            webview_height_ratio: 'full',
                                            messenger_extensions: true
                                        }]
                                    }
                                }
                            },
                            access_token: pageAccessToken
                        })
                    });

                    const result = await response.json();
                    if (result.error) {
                        console.error('    ✗ Facebook API error:', result.error.message);
                        // Track error
                        await incrementNodeAnalytics(flowId, node.id, 'error_count');
                    } else {
                        console.log('    ✓ Checkout webview button sent!');
                        // Track delivery
                        await incrementNodeAnalytics(flowId, node.id, 'delivered_count');
                    }
                } else {
                    console.log(`    ⚠️ Webview creation failed, falling back to postback`);
                    // Fall through to postback logic
                }
            }

            // Fallback or non-webview mode: Use postback buttons
            if (!useWebview) {
                // Build checkout message with cart items
                let checkoutText = `${headerText}\n`;
                if (companyName) {
                    checkoutText += `🏪 ${companyName}\n`;
                }
                checkoutText += `─────────────────\n\n`;

                cart.forEach((item: any, index: number) => {
                    const price = typeof item.productPrice === 'number' ? item.productPrice : 0;
                    const qty = item.quantity || 1;
                    const itemTotal = price * qty;
                    checkoutText += `📦 ${item.productName}\n`;
                    checkoutText += `    ${qty} × ₱${price.toLocaleString()} = ₱${itemTotal.toLocaleString()}\n\n`;
                });

                checkoutText += `─────────────────\n`;
                checkoutText += `💰 TOTAL: ₱${cartTotal.toLocaleString()}\n\n`;
                checkoutText += `Tap the button below to confirm your order.`;

                const payload = JSON.stringify({
                    action: 'checkout_confirm',
                    nodeId: node.id,
                    flowId: flowId,
                    cartTotal: cartTotal
                });

                const response = await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipient: { id: context.commenterId },
                        message: {
                            attachment: {
                                type: 'template',
                                payload: {
                                    template_type: 'button',
                                    text: checkoutText,
                                    buttons: [{
                                        type: 'postback',
                                        title: buttonText,
                                        payload: payload
                                    }]
                                }
                            }
                        },
                        access_token: pageAccessToken
                    })
                });

                const result = await response.json();
                if (result.error) {
                    console.error('    ✗ Facebook API error:', result.error.message);
                    // Track error
                    await incrementNodeAnalytics(flowId, node.id, 'error_count');
                } else {
                    console.log('    ✓ Checkout card sent successfully!');
                    console.log('    ⏸ Waiting for user to click checkout button...');
                    // Track delivery
                    await incrementNodeAnalytics(flowId, node.id, 'delivered_count');
                }
            }
        } catch (error: any) {
            console.error('    ✗ Exception sending checkout:', error.message);
            // Track error
            await incrementNodeAnalytics(flowId, node.id, 'error_count');
        }

        return; // Stop execution - wait for checkout button click
    }


    // Checkout Form Node - use Facebook's native customer_information template
    if (nodeType === 'checkoutFormNode') {
        console.log(`    ✓ Detected as Checkout Form Node - Using Facebook Native Form`);
        const privacyUrl = config.privacyUrl || 'https://www.facebook.com/privacy/policy/';
        const countries = config.countries || ['PH']; // Default to Philippines
        const expiresInDays = config.expiresInDays || 7;
        const paymentMethods = config.paymentMethods || ['Cash on Delivery', 'GCash', 'Bank Transfer'];
        const thankYouMessage = config.thankYouMessage || '✅ Thank you! Your information has been saved. Processing your order...';

        try {
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
            const supabase = createClient(supabaseUrl, supabaseKey);

            // Store checkout form state for webhook callback
            const { data: subscriber } = await supabase
                .from('subscribers')
                .select('id, metadata')
                .eq('external_id', context.commenterId)
                .eq('workspace_id', context.workspaceId)
                .maybeSingle();

            if (subscriber) {
                const checkoutFormState = {
                    formNodeId: node.id,
                    flowId: flowId,
                    paymentMethods,
                    thankYouMessage,
                    awaitingNativeForm: true
                };

                await supabase
                    .from('subscribers')
                    .update({
                        metadata: {
                            ...(subscriber.metadata || {}),
                            checkoutFormState
                        }
                    })
                    .eq('id', subscriber.id);

                console.log(`    ✓ Checkout form state saved for native form callback`);
            }

            // Send Facebook's native customer_information template
            const response = await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: context.commenterId },
                    message: {
                        attachment: {
                            type: 'template',
                            payload: {
                                template_type: 'customer_information',
                                countries: countries,
                                business_privacy: {
                                    url: privacyUrl
                                },
                                expires_in_days: expiresInDays
                            }
                        }
                    },
                    access_token: pageAccessToken
                })
            });

            const result = await response.json();
            if (result.error) {
                console.error('    ✗ Facebook API error:', result.error.message);
                // Fallback to simple text message if template fails
                await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipient: { id: context.commenterId },
                        message: { text: '📍 Please reply with your complete delivery address including: Full Name, Street Address, City/Municipality, Province, Postal Code, and Mobile Number.' },
                        access_token: pageAccessToken
                    })
                });
                console.log('    ✓ Fallback address prompt sent');
            } else {
                console.log('    ✓ Facebook native shipping form sent successfully!');
                console.log('    ⏸ Waiting for customer to fill and submit the form...');
            }

        } catch (error: any) {
            console.error('    ✗ Exception in checkout form:', error.message);
        }

        return; // Stop execution - wait for customer to submit the form
    }

    // Invoice Node - send invoice/receipt after checkout completion
    if (nodeType === 'invoiceNode') {
        console.log(`    ✓ Detected as Invoice Node`);
        const companyName = config.companyName || 'Store';
        const companyLogo = config.companyLogo || '';
        const companyAddress = config.companyAddress || '';
        const primaryColor = config.primaryColor || '#6366f1';
        const confirmationMessage = config.confirmationMessage || 'Thank you for your order! 🎉';

        try {
            // Get cart from context or subscriber metadata
            let cart = (context as any).cart || [];
            let cartTotal = (context as any).cartTotal || 0;
            let customerName = context.commenterName || 'Valued Customer';

            // Create supabase client for DB operations
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
            const supabaseInvoice = createClient(supabaseUrl, supabaseKey);

            // If no cart in context, try to get from subscriber metadata
            if (cart.length === 0) {
                const { data: subscriber } = await supabaseInvoice
                    .from('subscribers')
                    .select('metadata, name')
                    .eq('external_id', context.commenterId)
                    .eq('workspace_id', context.workspaceId)
                    .single();

                if (subscriber?.metadata?.cart) {
                    cart = subscriber.metadata.cart;
                    cartTotal = subscriber.metadata.cartTotal || 0;
                }
                if (subscriber?.name) {
                    customerName = subscriber.name;
                }
            }

            console.log(`    🛒 Cart items for invoice: ${cart.length}`);
            console.log(`    💰 Total: ₱${cartTotal}`);
            console.log(`    👤 Customer: ${customerName}`);

            if (cart.length === 0) {
                console.log('    ⊘ Empty cart, sending confirmation only');
                await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_on');
                await new Promise(resolve => setTimeout(resolve, 500));
                await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_off');

                await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipient: { id: context.commenterId },
                        message: { text: `✅ ${confirmationMessage}` },
                        access_token: pageAccessToken
                    })
                });

                // Track delivery
                await incrementNodeAnalytics(flowId, node.id, 'delivered_count');
                return;
            }

            // Generate order number
            const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

            // Build receipt elements for Facebook Receipt Template
            // Get app URL for converting relative URLs to absolute
            const appUrl = process.env.VITE_APP_URL || 'https://mcp-v16.vercel.app';

            const receiptElements = cart.map((item: any) => {
                const qty = parseInt(item.quantity) || 1;
                const unitPrice = parseFloat(item.productPrice) || 0;
                const itemTotal = unitPrice * qty;

                // Handle image URL - convert relative to absolute
                let imageUrl = item.productImage || '';
                if (imageUrl) {
                    // If relative URL (starts with /), prepend app URL
                    if (imageUrl.startsWith('/')) {
                        imageUrl = `${appUrl}${imageUrl}`;
                    }
                    // If not starting with http, it's not a valid URL
                    if (!imageUrl.startsWith('http')) {
                        imageUrl = '';
                    }
                }

                console.log(`    📸 Item: ${item.productName}, Image: ${imageUrl || 'none'}`);

                const element: any = {
                    title: String(item.productName || 'Product'),
                    subtitle: qty > 1 ? `Qty: ${qty}` : '',
                    quantity: qty,
                    price: itemTotal,
                    currency: 'PHP'
                };

                // Only add image_url if it's a valid absolute URL
                if (imageUrl && imageUrl.startsWith('http')) {
                    element.image_url = imageUrl;
                }

                return element;
            });

            // Show typing
            await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_on');
            await new Promise(resolve => setTimeout(resolve, 800));
            await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_off');

            // Try to send Facebook Receipt Template first
            console.log('    📧 Sending Receipt Template...');
            const receiptPayload = {
                recipient: { id: context.commenterId },
                message: {
                    attachment: {
                        type: 'template',
                        payload: {
                            template_type: 'receipt',
                            recipient_name: customerName,
                            order_number: orderNumber,
                            currency: 'PHP',
                            payment_method: 'Cash on Delivery',
                            timestamp: Math.floor(Date.now() / 1000).toString(),
                            elements: receiptElements,
                            summary: {
                                subtotal: cartTotal,
                                shipping_cost: 0,
                                total_tax: 0,
                                total_cost: cartTotal
                            }
                        }
                    }
                },
                access_token: pageAccessToken
            };

            const response = await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(receiptPayload)
            });

            const result = await response.json();
            if (result.error) {
                console.error('    ✗ Receipt Template error:', result.error.message);
                console.error('    ✗ Error code:', result.error.code);
                console.error('    ✗ Error type:', result.error.type);
                console.error('    ✗ Full error:', JSON.stringify(result.error));
                console.error('    ✗ Receipt elements:', JSON.stringify(receiptElements));
                console.log('    ↩️ Falling back to text invoice...');

                // Fallback to plain text invoice if Receipt Template fails
                let invoiceText = `🧾 **${companyName}**\n`;
                invoiceText += `Order #${orderNumber}\n`;
                invoiceText += `━━━━━━━━━━━━━━━━━━\n\n`;

                for (const item of cart) {
                    invoiceText += `📦 ${item.productName} x${item.quantity || 1}\n`;
                    invoiceText += `   ₱${(item.productPrice * (item.quantity || 1)).toLocaleString()}\n\n`;
                }

                invoiceText += `━━━━━━━━━━━━━━━━━━\n`;
                invoiceText += `**TOTAL: ₱${cartTotal.toLocaleString()}**\n\n`;
                invoiceText += `✅ ${confirmationMessage}`;

                await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipient: { id: context.commenterId },
                        message: { text: invoiceText },
                        access_token: pageAccessToken
                    })
                });

                // Track delivery
                await incrementNodeAnalytics(flowId, node.id, 'delivered_count');
            } else {
                console.log('    ✓ Receipt sent successfully!');
                // Track delivery
                await incrementNodeAnalytics(flowId, node.id, 'delivered_count');

                // Send thank you follow-up message
                await new Promise(resolve => setTimeout(resolve, 500));
                await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipient: { id: context.commenterId },
                        message: { text: `✅ ${confirmationMessage}\n\n📋 Tap the receipt above to view your complete order details.` },
                        access_token: pageAccessToken
                    })
                });
            }

        } catch (error: any) {
            console.error('    ✗ Exception sending invoice:', error.message);
            // Track error
            await incrementNodeAnalytics(flowId, node.id, 'error_count');
        }

        return;
    }

    // Cart Invoice Node - send cart summary with all items and total
    if (nodeType === 'cartInvoiceNode') {
        console.log(`    ✓ Detected as Cart Invoice Node`);
        const companyName = config.companyName || 'Store';
        const primaryColor = config.primaryColor || '#10b981';
        const showShipping = config.showShipping ?? true;
        const shippingFee = config.shippingFee || 0;
        const thankYouMessage = config.thankYouMessage || 'Thank you for your order! 🎉';

        try {
            // Get cart from context or subscriber metadata
            let cart = (context as any).cart || [];
            let cartTotal = (context as any).cartTotal || 0;

            // If no cart in context, try to get from subscriber metadata
            if (cart.length === 0) {
                const { createClient } = await import('@supabase/supabase-js');
                const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
                const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
                const supabase = createClient(supabaseUrl, supabaseKey);

                const { data: subscriber } = await supabase
                    .from('subscribers')
                    .select('metadata')
                    .eq('external_id', context.commenterId)
                    .eq('workspace_id', context.workspaceId)
                    .single();

                if (subscriber?.metadata?.cart) {
                    cart = subscriber.metadata.cart;
                    cartTotal = subscriber.metadata.cartTotal || 0;
                }
            }

            console.log(`    🛒 Cart items: ${cart.length}`);
            console.log(`    💰 Subtotal: ₱${cartTotal}`);

            if (cart.length === 0) {
                console.log('    ⊘ Empty cart, sending empty cart message');
                await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_on');
                await new Promise(resolve => setTimeout(resolve, 500));
                await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_off');

                await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipient: { id: context.commenterId },
                        message: { text: '🛒 Your cart is empty. Please add some items first!' },
                        access_token: pageAccessToken
                    })
                });
                return;
            }

            // Build receipt items for Facebook Receipt Template
            // Get app URL for converting relative URLs to absolute
            const appUrl2 = process.env.VITE_APP_URL || 'https://mcp-v16.vercel.app';

            const receiptElements = cart.map((item: any) => {
                const qty = parseInt(item.quantity) || 1;
                const unitPrice = parseFloat(item.productPrice) || 0;
                const itemTotal = unitPrice * qty;

                // Handle image URL - convert relative to absolute
                let imageUrl = item.productImage || '';
                if (imageUrl) {
                    // If relative URL (starts with /), prepend app URL
                    if (imageUrl.startsWith('/')) {
                        imageUrl = `${appUrl2}${imageUrl}`;
                    }
                    // If not starting with http, it's not a valid URL
                    if (!imageUrl.startsWith('http')) {
                        imageUrl = '';
                    }
                }

                const element: any = {
                    title: String(item.productName || 'Product'),
                    subtitle: qty > 1 ? `Qty: ${qty}` : '',
                    quantity: qty,
                    price: itemTotal,
                    currency: 'PHP'
                };

                // Only add image_url if it's a valid absolute URL
                if (imageUrl && imageUrl.startsWith('http')) {
                    element.image_url = imageUrl;
                }

                return element;
            });

            const grandTotal = cartTotal + (showShipping ? shippingFee : 0);
            const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

            // Show typing
            await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_on');
            await new Promise(resolve => setTimeout(resolve, 800));
            await sendTypingIndicator(context.commenterId, pageAccessToken, 'typing_off');

            // Send Facebook Receipt Template
            const receiptPayload = {
                recipient: { id: context.commenterId },
                message: {
                    attachment: {
                        type: 'template',
                        payload: {
                            template_type: 'receipt',
                            recipient_name: context.commenterName || 'Valued Customer',
                            order_number: orderNumber,
                            currency: 'PHP',
                            payment_method: 'Cash on Delivery',
                            order_url: '',
                            timestamp: Math.floor(Date.now() / 1000).toString(),
                            elements: receiptElements,
                            address: undefined,
                            summary: {
                                subtotal: cartTotal,
                                shipping_cost: showShipping ? shippingFee : 0,
                                total_tax: 0,
                                total_cost: grandTotal
                            },
                            adjustments: []
                        }
                    }
                },
                access_token: pageAccessToken
            };

            // Remove empty fields
            if (!receiptPayload.message.attachment.payload.order_url) {
                delete (receiptPayload.message.attachment.payload as any).order_url;
            }
            delete (receiptPayload.message.attachment.payload as any).address;

            console.log('    📧 Sending Receipt Template...');
            const response = await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(receiptPayload)
            });

            const result = await response.json();
            if (result.error) {
                console.error('    ✗ Receipt Template error:', result.error.message);
                console.log('    ↩️ Falling back to text message...');

                // Fallback to plain text if Receipt Template fails
                let invoiceText = `🧾 **${companyName}**\n`;
                invoiceText += `Order #${orderNumber}\n`;
                invoiceText += `━━━━━━━━━━━━━━━━━━\n\n`;

                for (const item of cart) {
                    invoiceText += `📦 ${item.productName} x${item.quantity || 1}\n`;
                    invoiceText += `   ₱${(item.productPrice * (item.quantity || 1)).toLocaleString()}\n\n`;
                }

                invoiceText += `━━━━━━━━━━━━━━━━━━\n`;
                invoiceText += `Subtotal: ₱${cartTotal.toLocaleString()}\n`;
                if (showShipping && shippingFee > 0) {
                    invoiceText += `Shipping: ₱${shippingFee.toLocaleString()}\n`;
                }
                invoiceText += `**TOTAL: ₱${grandTotal.toLocaleString()}**\n\n`;
                invoiceText += thankYouMessage;

                await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipient: { id: context.commenterId },
                        message: { text: invoiceText },
                        access_token: pageAccessToken
                    })
                });
            } else {
                console.log('    ✓ Receipt sent successfully!');
                // Track delivery
                await incrementNodeAnalytics(flowId, node.id, 'delivered_count');
            }

            // Send thank you message with invoice viewing instruction
            await new Promise(resolve => setTimeout(resolve, 500));
            const followUpMessage = `${thankYouMessage}\n\n📋 Tap the receipt above to view your complete order details.`;
            await fetch(`https://graph.facebook.com/v21.0/me/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: context.commenterId },
                    message: { text: followUpMessage },
                    access_token: pageAccessToken
                })
            });
        } catch (error: any) {
            console.error('    ✗ Exception sending cart invoice:', error.message);
            // Track error
            await incrementNodeAnalytics(flowId, node.id, 'error_count');
        }

        return;
    }

    // Cart Sheet Node - send cart data to Google Sheets webhook
    if (nodeType === 'cartSheetNode') {
        console.log(`    ✓ Detected as Cart Sheet Node`);
        const webhookUrl = config.webhookUrl || '';
        const sheetName = config.sheetName || 'Cart Orders';
        const includeTimestamp = config.includeTimestamp ?? true;
        const includeCustomerName = config.includeCustomerName ?? true;
        const includeProductDetails = config.includeProductDetails ?? true;

        if (!webhookUrl) {
            console.log('    ⊘ No webhook URL configured, skipping');
            return;
        }

        try {
            // Get cart from context or subscriber metadata
            let cart = (context as any).cart || [];
            let cartTotal = (context as any).cartTotal || 0;

            // If no cart in context, try to get from subscriber metadata
            if (cart.length === 0) {
                const { createClient } = await import('@supabase/supabase-js');
                const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
                const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
                const supabase = createClient(supabaseUrl, supabaseKey);

                const { data: subscriber } = await supabase
                    .from('subscribers')
                    .select('metadata, name')
                    .eq('external_id', context.commenterId)
                    .eq('workspace_id', context.workspaceId)
                    .single();

                if (subscriber?.metadata?.cart) {
                    cart = subscriber.metadata.cart;
                    cartTotal = subscriber.metadata.cartTotal || 0;
                }
            }

            console.log(`    🛒 Cart items: ${cart.length}`);
            console.log(`    💰 Total: ₱${cartTotal}`);

            if (cart.length === 0) {
                console.log('    ⊘ Empty cart, skipping sheet update');
                return;
            }

            // Build webhook payload
            const productNames = cart.map((item: any) => item.productName).join(', ');
            const quantities = cart.map((item: any) => item.quantity).join(', ');
            const prices = cart.map((item: any) => `₱${item.productPrice}`).join(', ');

            const webhookPayload: any = {
                sheetName: sheetName,
                customerId: context.commenterId,
                customerName: context.commenterName || 'Customer',
                products: productNames,
                quantities: quantities,
                prices: prices,
                total: cartTotal
            };

            if (includeTimestamp) {
                webhookPayload.timestamp = new Date().toISOString();
            }

            console.log(`    📤 Sending to Google Sheets webhook...`);
            console.log(`    📋 Data:`, JSON.stringify(webhookPayload));

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(webhookPayload)
            });

            const result = await response.json();
            console.log(`    ✓ Webhook response:`, result);
            // Track delivery for successful webhook
            await incrementNodeAnalytics(flowId, node.id, 'delivered_count');

        } catch (error: any) {
            console.error('    ✗ Exception sending to Cart Sheet webhook:', error.message);
            // Track error
            await incrementNodeAnalytics(flowId, node.id, 'error_count');
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
