// Form Followup Cron Handler
import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, sendFollowupMessage } from './shared';

const MAX_WINDOW_DAYS = 7;

interface ScheduledFollowup {
    id: string;
    type: 'delay' | 'scheduled';
    delayMinutes: number;
    scheduledTime: string;
    scheduledDays: number;
    messageTag: string;
    message: string;
    enabled: boolean;
    buttonEnabled?: boolean;
    buttonText?: string;
    buttonType?: 'form' | 'url';
    buttonUrl?: string;
}

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
            console.error('[Form Followup Cron] Error fetching form_opens:', fetchError.message);
        }

        console.log('[Form Followup Cron] Found', pendingFollowups?.length || 0, 'potential follow-ups');

        let processedCount = 0;
        let sentCount = 0;

        for (const formOpen of pendingFollowups || []) {
            processedCount++;

            const { data: flow } = await supabase
                .from('flows')
                .select('*')
                .eq('id', formOpen.flow_id)
                .single();

            if (!flow) continue;

            const nodes = flow.nodes || [];
            const configurations = flow.configurations || {};
            const followupNode = nodes.find((n: any) => n.type === 'followupNode');

            if (!followupNode) continue;

            const config = configurations[followupNode.id] || {};
            const scheduledFollowups: ScheduledFollowup[] = config.scheduledFollowups || [];

            if (scheduledFollowups.length === 0) {
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

            if (scheduledFollowups.length === 0) continue;

            const sentFollowupIds: string[] = formOpen.sent_followup_ids || [];
            const openedAt = new Date(formOpen.opened_at);
            const minutesSinceOpen = (now.getTime() - openedAt.getTime()) / (60 * 1000);

            for (const followup of scheduledFollowups) {
                if (!followup.enabled) continue;
                if (sentFollowupIds.includes(followup.id)) continue;

                let shouldSend = false;
                let isOutside24hr = false;

                if (followup.type === 'delay') {
                    const tolerance = 0.5;
                    shouldSend = minutesSinceOpen >= (followup.delayMinutes - tolerance);
                    isOutside24hr = followup.delayMinutes > 1380;
                } else {
                    const targetDate = new Date(openedAt);
                    targetDate.setDate(targetDate.getDate() + followup.scheduledDays);
                    const [hours, minutes] = followup.scheduledTime.split(':').map(Number);
                    targetDate.setHours(hours, minutes, 0, 0);
                    shouldSend = now >= targetDate;
                    isOutside24hr = followup.scheduledDays >= 1;
                }

                if (!shouldSend) continue;
                if (isOutside24hr && !followup.messageTag) continue;

                const { data: page } = await supabase
                    .from('connected_pages')
                    .select('page_access_token')
                    .eq('page_id', formOpen.page_id)
                    .single();

                if (!page?.page_access_token) continue;

                let message = followup.message || '';
                message = message.replace(/{commenter_name}/g, formOpen.subscriber_name || 'Friend');
                message = message.replace(/{followup_number}/g, String(sentFollowupIds.length + 1));

                if (!message.trim()) continue;

                let buttonUrl = '';
                if (followup.buttonEnabled !== false && formOpen.form_id) {
                    const vercelUrl = process.env.VERCEL_URL;
                    const appUrl = process.env.APP_URL || process.env.VITE_APP_URL;
                    const baseUrl = appUrl || (vercelUrl ? `https://${vercelUrl}` : '');

                    if (baseUrl) {
                        const params = new URLSearchParams({
                            sid: formOpen.subscriber_id || '',
                            sname: formOpen.subscriber_name || '',
                            flowId: formOpen.flow_id || '',
                            nodeId: formOpen.node_id || '',
                            pageId: formOpen.page_id || ''
                        });
                        buttonUrl = `${baseUrl}/forms/${formOpen.form_id}?${params.toString()}`;
                    }
                }

                const success = await sendFollowupMessage(
                    formOpen.subscriber_id,
                    message,
                    page.page_access_token,
                    isOutside24hr ? followup.messageTag : undefined,
                    followup.buttonEnabled !== false ? {
                        text: followup.buttonText || 'Complete Order 🛒',
                        url: buttonUrl
                    } : undefined
                );

                if (success) {
                    const updatedIds = [...sentFollowupIds, followup.id];
                    await supabase
                        .from('form_opens')
                        .update({
                            sent_followup_ids: updatedIds,
                            followup_count: updatedIds.length,
                            last_followup_at: new Date().toISOString()
                        })
                        .eq('id', formOpen.id);

                    sentFollowupIds.push(followup.id);
                    sentCount++;
                    console.log(`[Form Followup Cron] ✓ Sent ${followup.id} to ${formOpen.subscriber_id}`);
                }
            }
        }

        // WEBVIEW SESSION FOLLOW-UPS
        let webviewProcessed = 0;
        let webviewSent = 0;

        try {
            const { data: pendingSessions, error: webviewError } = await supabase
                .from('webview_sessions')
                .select('*')
                .eq('status', 'pending')
                .eq('followup_enabled', true)
                .order('shown_at', { ascending: true })
                .limit(50);

            if (!webviewError) {
                for (const session of pendingSessions || []) {
                    webviewProcessed++;

                    const shownAt = new Date(session.shown_at);
                    const minutesSinceShown = (now.getTime() - shownAt.getTime()) / (60 * 1000);
                    const timeoutMinutes = session.followup_timeout_minutes || 5;

                    if (minutesSinceShown < timeoutMinutes) continue;

                    const { data: page } = await supabase
                        .from('connected_pages')
                        .select('page_access_token')
                        .eq('page_id', session.page_id)
                        .single();

                    if (!page?.page_access_token) {
                        await supabase
                            .from('webview_sessions')
                            .update({ status: 'expired', updated_at: now.toISOString() })
                            .eq('id', session.id);
                        continue;
                    }

                    const followupMessage = "Hey! 👋 We noticed you were interested in our product. Still thinking about it?";

                    const success = await sendFollowupMessage(
                        session.psid,
                        followupMessage,
                        page.page_access_token
                    );

                    if (success) {
                        await supabase
                            .from('webview_sessions')
                            .update({
                                status: 'followup_sent',
                                followup_sent_at: now.toISOString(),
                                updated_at: now.toISOString()
                            })
                            .eq('id', session.id);
                        webviewSent++;
                    } else {
                        await supabase
                            .from('webview_sessions')
                            .update({ status: 'expired', updated_at: now.toISOString() })
                            .eq('id', session.id);
                    }
                }
            }
        } catch (webviewErr: any) {
            console.error('[Webview Followup] Exception:', webviewErr.message);
        }

        console.log(`📊 [Summary] Order Form - ${processedCount} found (${sentCount} sent) : Webview - ${webviewProcessed} found (${webviewSent} sent)`);

        return res.status(200).json({
            success: true,
            summary: `Order Form - ${processedCount} : Webview - ${webviewProcessed}`,
            form: { processed: processedCount, sent: sentCount },
            webview: { processed: webviewProcessed, sent: webviewSent }
        });

    } catch (error: any) {
        console.error('[Form Followup Cron] Exception:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
