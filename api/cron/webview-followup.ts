import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Webview Follow-up Cron Job
 * 
 * Runs periodically to check for webview sessions where user didn't click "Add to Cart"
 * and sends follow-up messages after the configured timeout.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('[Webview Followup Cron] Starting...');
    console.log('[Webview Followup Cron] Time:', new Date().toISOString());

    try {
        const now = new Date();

        // Find pending webview sessions that need follow-up
        // Only get sessions where: status = 'pending', followup_enabled = true, and timeout has passed
        const { data: pendingSessions, error: fetchError } = await supabase
            .from('webview_sessions')
            .select('*')
            .eq('status', 'pending')
            .eq('followup_enabled', true)
            .order('shown_at', { ascending: true })
            .limit(50);

        if (fetchError) {
            console.error('[Webview Followup Cron] Error fetching:', fetchError);
            return res.status(500).json({ error: fetchError.message });
        }

        console.log('[Webview Followup Cron] Found', pendingSessions?.length || 0, 'potential follow-ups');

        let processedCount = 0;
        let sentCount = 0;

        for (const session of pendingSessions || []) {
            processedCount++;

            const shownAt = new Date(session.shown_at);
            const minutesSinceShown = (now.getTime() - shownAt.getTime()) / (60 * 1000);
            const timeoutMinutes = session.followup_timeout_minutes || 5;

            // Check if timeout has passed
            if (minutesSinceShown < timeoutMinutes) {
                console.log(`[Webview Followup Cron] ${session.session_id} - ${minutesSinceShown.toFixed(1)}m elapsed, waiting for ${timeoutMinutes}m`);
                continue;
            }

            console.log(`[Webview Followup Cron] Processing ${session.session_id}, ${minutesSinceShown.toFixed(1)}m since shown`);

            // Get page access token
            const { data: page } = await supabase
                .from('connected_pages')
                .select('page_access_token')
                .eq('page_id', session.page_id)
                .single();

            if (!page?.page_access_token) {
                console.log(`[Webview Followup Cron] No page token for ${session.page_id}`);
                // Mark as expired to avoid retrying
                await supabase
                    .from('webview_sessions')
                    .update({ status: 'expired', updated_at: now.toISOString() })
                    .eq('id', session.id);
                continue;
            }

            // Get flow to find follow-up message
            const { data: flow } = await supabase
                .from('flows')
                .select('nodes, configurations')
                .eq('id', session.flow_id)
                .single();

            // Determine follow-up message
            let followupMessage = "Hey! 👋 We noticed you were interested in our product. Still thinking about it?";

            if (flow) {
                const configurations = flow.configurations || {};

                // Check if there's a connected followup/text node
                if (session.followup_node_type === 'textNode' && session.followup_node_id) {
                    const textNodeConfig = configurations[session.followup_node_id];
                    if (textNodeConfig?.text) {
                        followupMessage = textNodeConfig.text;
                    }
                }
            }

            // Send follow-up message
            const success = await sendMessage(
                session.psid,
                followupMessage,
                page.page_access_token
            );

            if (success) {
                // Update session status
                await supabase
                    .from('webview_sessions')
                    .update({
                        status: 'followup_sent',
                        followup_sent_at: now.toISOString(),
                        updated_at: now.toISOString()
                    })
                    .eq('id', session.id);

                sentCount++;
                console.log(`[Webview Followup Cron] ✓ Sent followup to ${session.psid}`);
            } else {
                // Mark as expired to avoid retrying
                await supabase
                    .from('webview_sessions')
                    .update({ status: 'expired', updated_at: now.toISOString() })
                    .eq('id', session.id);
            }
        }

        console.log(`[Webview Followup Cron] Complete. Processed: ${processedCount}, Sent: ${sentCount}`);

        return res.status(200).json({
            success: true,
            processed: processedCount,
            sent: sentCount
        });

    } catch (error: any) {
        console.error('[Webview Followup Cron] Exception:', error.message);
        return res.status(500).json({ error: error.message });
    }
}

// Send message via Messenger
async function sendMessage(
    userId: string,
    text: string,
    pageAccessToken: string
): Promise<boolean> {
    console.log('[Webview Followup Cron] Sending to:', userId);

    try {
        const response = await fetch(
            `https://graph.facebook.com/v21.0/me/messages`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: userId },
                    message: { text },
                    access_token: pageAccessToken
                })
            }
        );

        const result = await response.json();
        if (result.error) {
            console.error('[Webview Followup Cron] Message error:', result.error.message);
            return false;
        }

        console.log('[Webview Followup Cron] ✓ Message sent, ID:', result.message_id);
        return true;
    } catch (error: any) {
        console.error('[Webview Followup Cron] Send exception:', error.message);
        return false;
    }
}
