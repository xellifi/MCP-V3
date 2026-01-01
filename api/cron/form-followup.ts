import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const MAX_WINDOW_DAYS = 7; // Max 7 days for scheduled followups

interface ScheduledFollowup {
    id: string;
    type: 'delay' | 'scheduled';
    delayMinutes: number;
    scheduledTime: string;
    scheduledDays: number;
    messageTag: string;
    message: string;
    enabled: boolean;
}

/**
 * Form Follow-up Cron Job
 * 
 * Runs periodically to check for abandoned forms and trigger follow-up messages.
 * Supports scheduled followups with Facebook Message Tags for outside 24hr window.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('[Form Followup Cron] Starting...');
    console.log('[Form Followup Cron] Time:', new Date().toISOString());

    try {
        const now = new Date();
        const minOpenTime = new Date(now.getTime() - MAX_WINDOW_DAYS * 24 * 60 * 60 * 1000);

        // Find form opens that need follow-up
        const { data: pendingFollowups, error: fetchError } = await supabase
            .from('form_opens')
            .select('*')
            .is('submitted_at', null)
            .gt('opened_at', minOpenTime.toISOString())
            .order('opened_at', { ascending: true })
            .limit(50);

        if (fetchError) {
            console.error('[Form Followup Cron] Error fetching:', fetchError);
            return res.status(500).json({ error: fetchError.message });
        }

        console.log('[Form Followup Cron] Found', pendingFollowups?.length || 0, 'potential follow-ups');

        let processedCount = 0;
        let sentCount = 0;

        for (const formOpen of pendingFollowups || []) {
            processedCount++;

            // Get the flow
            const { data: flow } = await supabase
                .from('flows')
                .select('*')
                .eq('id', formOpen.flow_id)
                .single();

            if (!flow) {
                console.log(`[Form Followup Cron] Flow not found for ${formOpen.subscriber_id}`);
                continue;
            }

            // Find followupNode and get its config
            const nodes = flow.nodes || [];
            const configurations = flow.configurations || {};
            const followupNode = nodes.find((n: any) => n.type === 'followupNode');

            if (!followupNode) {
                console.log(`[Form Followup Cron] No followupNode for ${formOpen.subscriber_id}`);
                continue;
            }

            const config = configurations[followupNode.id] || {};
            const scheduledFollowups: ScheduledFollowup[] = config.scheduledFollowups || [];

            if (scheduledFollowups.length === 0) {
                // Fallback to legacy config if no scheduled followups
                const legacyMessage = config.followupMessage;
                if (legacyMessage) {
                    scheduledFollowups.push({
                        id: 'legacy_0',
                        type: 'delay',
                        delayMinutes: config.firstDelayMinutes || 30,
                        scheduledTime: '09:00',
                        scheduledDays: 0,
                        messageTag: '',
                        message: legacyMessage,
                        enabled: true
                    });
                }
            }

            if (scheduledFollowups.length === 0) {
                console.log(`[Form Followup Cron] No scheduled followups configured for ${formOpen.subscriber_id}`);
                continue;
            }

            // Get already sent followup IDs
            const sentFollowupIds: string[] = formOpen.sent_followup_ids || [];
            const openedAt = new Date(formOpen.opened_at);
            const minutesSinceOpen = (now.getTime() - openedAt.getTime()) / (60 * 1000);

            console.log(`[Form Followup Cron] Processing ${formOpen.subscriber_id}, ${minutesSinceOpen.toFixed(1)}m since open, ${sentFollowupIds.length} already sent`);

            // Check each scheduled followup
            for (const followup of scheduledFollowups) {
                if (!followup.enabled) continue;
                if (sentFollowupIds.includes(followup.id)) continue;

                // Calculate if it's time to send
                let shouldSend = false;
                let isOutside24hr = false;

                if (followup.type === 'delay') {
                    // Delay-based: check if enough time has passed
                    const tolerance = 0.5; // 30 seconds
                    shouldSend = minutesSinceOpen >= (followup.delayMinutes - tolerance);
                    isOutside24hr = followup.delayMinutes > 1380; // > 23 hours
                } else {
                    // Scheduled: check if we've reached the scheduled time
                    const targetDate = new Date(openedAt);
                    targetDate.setDate(targetDate.getDate() + followup.scheduledDays);

                    // Parse scheduled time
                    const [hours, minutes] = followup.scheduledTime.split(':').map(Number);
                    targetDate.setHours(hours, minutes, 0, 0);

                    shouldSend = now >= targetDate;
                    isOutside24hr = followup.scheduledDays >= 1;
                }

                if (!shouldSend) {
                    console.log(`[Form Followup Cron] ${followup.id} - not time yet`);
                    continue;
                }

                // Check if outside 24hr requires a message tag
                if (isOutside24hr && !followup.messageTag) {
                    console.log(`[Form Followup Cron] ${followup.id} - outside 24hr but no message tag, skipping`);
                    continue;
                }

                console.log(`[Form Followup Cron] Sending ${followup.id} to ${formOpen.subscriber_id} (outside24hr: ${isOutside24hr})`);

                // Get page access token
                const { data: page } = await supabase
                    .from('connected_pages')
                    .select('page_access_token')
                    .eq('page_id', formOpen.page_id)
                    .single();

                if (!page?.page_access_token) {
                    console.log(`[Form Followup Cron] No page token for ${formOpen.page_id}`);
                    continue;
                }

                // Prepare message
                let message = followup.message || '';
                message = message.replace(/{commenter_name}/g, formOpen.subscriber_name || 'Friend');
                message = message.replace(/{followup_number}/g, String(sentFollowupIds.length + 1));

                if (!message.trim()) {
                    console.log(`[Form Followup Cron] ${followup.id} - empty message, skipping`);
                    continue;
                }

                // Send the message
                const success = await sendMessage(
                    formOpen.subscriber_id,
                    message,
                    page.page_access_token,
                    isOutside24hr ? followup.messageTag : undefined
                );

                if (success) {
                    // Update sent_followup_ids
                    const updatedIds = [...sentFollowupIds, followup.id];
                    await supabase
                        .from('form_opens')
                        .update({
                            sent_followup_ids: updatedIds,
                            followup_count: updatedIds.length,
                            last_followup_at: new Date().toISOString()
                        })
                        .eq('id', formOpen.id);

                    sentFollowupIds.push(followup.id); // Update local array
                    sentCount++;
                    console.log(`[Form Followup Cron] ✓ Sent ${followup.id} to ${formOpen.subscriber_id}`);
                }
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

// Send message via Messenger with optional Message Tag
async function sendMessage(
    userId: string,
    text: string,
    pageAccessToken: string,
    messageTag?: string
): Promise<boolean> {
    console.log('[Form Followup Cron] Sending to:', userId, 'Tag:', messageTag || 'none');

    try {
        const body: any = {
            recipient: { id: userId },
            message: { text },
            access_token: pageAccessToken
        };

        // Add message tag for outside 24hr window
        if (messageTag) {
            body.messaging_type = 'MESSAGE_TAG';
            body.tag = messageTag;
            console.log('[Form Followup Cron] Using MESSAGE_TAG:', messageTag);
        }

        const response = await fetch(
            `https://graph.facebook.com/v21.0/me/messages`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }
        );

        const result = await response.json();
        if (result.error) {
            console.error('[Form Followup Cron] Message error:', result.error.message);
            return false;
        }

        console.log('[Form Followup Cron] ✓ Message sent, ID:', result.message_id);
        return true;
    } catch (error: any) {
        console.error('[Form Followup Cron] Send exception:', error.message);
        return false;
    }
}
