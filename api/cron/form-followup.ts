import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const FOLLOWUP_DELAY_MINUTES = 30;  // Wait 30 minutes before first follow-up
const FOLLOWUP_INTERVAL_MINUTES = 120; // 2 hours between follow-ups
const MAX_FOLLOWUPS = 3;
const MAX_WINDOW_HOURS = 23; // Stay within Facebook's 24-hour policy

/**
 * Form Follow-up Cron Job
 * 
 * Runs periodically to check for abandoned forms and trigger follow-up messages.
 * This sends to the FALSE path of condition nodes.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('[Form Followup Cron] Starting...');
    console.log('[Form Followup Cron] Time:', new Date().toISOString());

    try {
        // Calculate time windows
        const now = new Date();
        const minOpenTime = new Date(now.getTime() - MAX_WINDOW_HOURS * 60 * 60 * 1000);
        const maxOpenTimeForFirst = new Date(now.getTime() - FOLLOWUP_DELAY_MINUTES * 60 * 1000);
        const maxLastFollowup = new Date(now.getTime() - FOLLOWUP_INTERVAL_MINUTES * 60 * 1000);

        // Find form opens that need follow-up:
        // - submitted_at IS NULL (not submitted)
        // - followup_count < MAX_FOLLOWUPS
        // - opened_at > minOpenTime (within 24hr window)
        // - Either: no follow-ups yet AND opened_at < maxOpenTimeForFirst
        // - Or: has follow-ups AND last_followup_at < maxLastFollowup

        const { data: pendingFollowups, error: fetchError } = await supabase
            .from('form_opens')
            .select('*')
            .is('submitted_at', null)
            .lt('followup_count', MAX_FOLLOWUPS)
            .gt('opened_at', minOpenTime.toISOString())
            .order('opened_at', { ascending: true })
            .limit(50); // Process in batches

        if (fetchError) {
            console.error('[Form Followup Cron] Error fetching:', fetchError);
            return res.status(500).json({ error: fetchError.message });
        }

        console.log('[Form Followup Cron] Found', pendingFollowups?.length || 0, 'potential follow-ups');

        let processedCount = 0;
        let sentCount = 0;

        for (const formOpen of pendingFollowups || []) {
            processedCount++;

            const openedAt = new Date(formOpen.opened_at);
            const lastFollowupAt = formOpen.last_followup_at ? new Date(formOpen.last_followup_at) : null;
            const followupCount = formOpen.followup_count || 0;

            // Check timing conditions
            let shouldFollowup = false;

            if (followupCount === 0) {
                // First follow-up: wait FOLLOWUP_DELAY_MINUTES after open
                shouldFollowup = openedAt < maxOpenTimeForFirst;
            } else {
                // Subsequent follow-ups: wait FOLLOWUP_INTERVAL_MINUTES after last
                shouldFollowup = lastFollowupAt && lastFollowupAt < maxLastFollowup;
            }

            if (!shouldFollowup) {
                console.log(`[Form Followup Cron] Skipping ${formOpen.subscriber_id} - not time yet`);
                continue;
            }

            console.log(`[Form Followup Cron] Processing follow-up #${followupCount + 1} for ${formOpen.subscriber_id}`);

            // Trigger the FALSE path via continue-flow
            try {
                const response = await triggerFollowup(formOpen, followupCount + 1);

                if (response.success) {
                    // Update the form_opens record
                    await supabase
                        .from('form_opens')
                        .update({
                            followup_count: followupCount + 1,
                            last_followup_at: new Date().toISOString()
                        })
                        .eq('id', formOpen.id);

                    sentCount++;
                    console.log(`[Form Followup Cron] ✓ Follow-up sent to ${formOpen.subscriber_id}`);
                }
            } catch (err: any) {
                console.error(`[Form Followup Cron] Error sending to ${formOpen.subscriber_id}:`, err.message);
            }
        }

        console.log(`[Form Followup Cron] Complete. Processed: ${processedCount}, Sent: ${sentCount}`);

        return res.status(200).json({
            success: true,
            processed: processedCount,
            sent: sentCount
        });

    } catch (error: any) {
        console.error('[Form Followup Cron] Exception:', error.message);
        return res.status(500).json({ error: error.message });
    }
}

// Trigger the FALSE path for a form open
async function triggerFollowup(formOpen: any, followupNumber: number): Promise<{ success: boolean }> {
    if (!formOpen.flow_id || !formOpen.node_id || !formOpen.page_id) {
        console.log('[Form Followup Cron] Missing flow context, skipping');
        return { success: false };
    }

    // Get the page access token
    const { data: page } = await supabase
        .from('connected_pages')
        .select('page_access_token, name')
        .eq('page_id', formOpen.page_id)
        .single();

    if (!page?.page_access_token) {
        console.log('[Form Followup Cron] No page token found');
        return { success: false };
    }

    // Get the flow
    const { data: flow } = await supabase
        .from('flows')
        .select('*')
        .eq('id', formOpen.flow_id)
        .single();

    if (!flow) {
        console.log('[Form Followup Cron] Flow not found');
        return { success: false };
    }

    const nodes = flow.nodes || [];
    const edges = flow.edges || [];
    const configurations = flow.configurations || {};

    // Find nodes after the form node, then find condition nodes
    const formNodeEdges = edges.filter((e: any) => e.source === formOpen.node_id);

    for (const edge of formNodeEdges) {
        const targetNode = nodes.find((n: any) => n.id === edge.target);
        if (!targetNode) continue;

        // Skip sheets node
        if (targetNode.type === 'sheetsNode') {
            const sheetsEdges = edges.filter((e: any) => e.source === edge.target);
            for (const sheetsEdge of sheetsEdges) {
                await processConditionAndSend(
                    sheetsEdge.target,
                    nodes,
                    edges,
                    configurations,
                    formOpen,
                    page.page_access_token,
                    followupNumber
                );
            }
        } else {
            await processConditionAndSend(
                edge.target,
                nodes,
                edges,
                configurations,
                formOpen,
                page.page_access_token,
                followupNumber
            );
        }
    }

    return { success: true };
}

// Process condition node and send FALSE path message
async function processConditionAndSend(
    nodeId: string,
    nodes: any[],
    edges: any[],
    configurations: any,
    formOpen: any,
    pageAccessToken: string,
    followupNumber: number
) {
    const node = nodes.find((n: any) => n.id === nodeId);
    if (!node) return;

    // If it's a condition node, follow the FALSE path
    if (node.type === 'conditionNode') {
        console.log('[Form Followup Cron] Found condition node, following FALSE path');

        // Find edges with sourceHandle === 'false'
        const falseEdges = edges.filter((e: any) =>
            e.source === nodeId && e.sourceHandle === 'false'
        );

        for (const falseEdge of falseEdges) {
            const targetNode = nodes.find((n: any) => n.id === falseEdge.target);
            if (!targetNode) continue;

            const config = configurations[falseEdge.target] || {};

            // Handle text node
            if (targetNode.type === 'textNode') {
                let message = config.textContent || '';

                // Replace variables
                message = message.replace(/{commenter_name}/g, formOpen.subscriber_name || 'Friend');
                message = message.replace(/{followup_number}/g, String(followupNumber));

                if (message.trim()) {
                    await sendMessage(
                        formOpen.subscriber_id,
                        message,
                        config.buttons || [],
                        pageAccessToken
                    );
                }
            }
        }
    }
}

// Send message via Messenger
async function sendMessage(
    userId: string,
    text: string,
    buttons: any[],
    pageAccessToken: string
) {
    console.log('[Form Followup Cron] Sending to:', userId, 'Message:', text.substring(0, 50));

    try {
        let messagePayload: any;

        const validButtons = (buttons || []).filter((b: any) =>
            (b.type === 'url' && b.title && b.url) ||
            (b.type === 'startFlow' && b.title && b.flowId)
        );

        if (validButtons.length > 0) {
            const fbButtons = validButtons.map((btn: any) => {
                if (btn.type === 'url') {
                    return { type: 'web_url', title: btn.title, url: btn.url };
                }
                if (btn.type === 'startFlow') {
                    return { type: 'postback', title: btn.title, payload: `FLOW_${btn.flowId}` };
                }
                return null;
            }).filter(Boolean);

            messagePayload = {
                attachment: {
                    type: 'template',
                    payload: {
                        template_type: 'button',
                        text: text,
                        buttons: fbButtons
                    }
                }
            };
        } else {
            messagePayload = { text };
        }

        const response = await fetch(
            `https://graph.facebook.com/v21.0/me/messages`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: userId },
                    message: messagePayload,
                    access_token: pageAccessToken
                })
            }
        );

        const result = await response.json();
        if (result.error) {
            console.error('[Form Followup Cron] Message error:', result.error.message);
        } else {
            console.log('[Form Followup Cron] ✓ Message sent, ID:', result.message_id);
        }
    } catch (error: any) {
        console.error('[Form Followup Cron] Send exception:', error.message);
    }
}
