import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Unified Cron Handler
 * 
 * Routes:
 * - /api/cron?job=form-followup  -> Form followup cron
 * - /api/cron?job=scheduler      -> Scheduler execute cron
 * 
 * For cron-job.org, set up:
 * - https://your-domain.vercel.app/api/cron?job=form-followup
 * - https://your-domain.vercel.app/api/cron?job=scheduler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const job = req.query.job as string;
    const execute = req.query.execute as string;
    const step = req.query.step as string;

    // Handle step-by-step execution from frontend
    if (execute === 'true' && step) {
        return handleExecuteStep(req, res, step);
    }

    console.log(`[Cron] Running job: ${job}`);

    switch (job) {
        case 'form-followup':
            return handleFormFollowup(req, res);
        case 'scheduler':
            return handleSchedulerExecute(req, res);
        default:
            return res.status(400).json({
                error: 'Invalid job parameter',
                validJobs: ['form-followup', 'scheduler'],
                usage: '/api/cron?job=form-followup or /api/cron?job=scheduler'
            });
    }
}

// ============================================
// STEP-BY-STEP EXECUTION FROM FRONTEND
// ============================================
async function handleExecuteStep(req: VercelRequest, res: VercelResponse, step: string) {
    console.log(`[Execute Step] Starting step: ${step}`);

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { workspaceId, configurations, previousResults } = body;

        // Get API keys from workspace
        const { data: settings } = await supabase
            .from('workspace_settings')
            .select('openai_api_key, gemini_api_key')
            .eq('workspace_id', workspaceId)
            .single();

        const openaiKey = settings?.openai_api_key;
        const geminiKey = settings?.gemini_api_key;

        if (!openaiKey && !geminiKey) {
            return res.status(400).json({ error: 'No API keys configured' });
        }

        const provider = openaiKey ? 'openai' : 'gemini';
        const apiKey = openaiKey || geminiKey;

        switch (step) {
            case 'topic-1': {
                const topicConfig = configurations?.['topic-1'] || {};
                const topic = await generateTopic(topicConfig, apiKey, provider as any, []);
                console.log(`[Execute Step] Generated topic: ${topic}`);
                return res.json({ success: true, step, result: { topic } });
            }

            case 'image-1': {
                const imageConfig = configurations?.['image-1'] || {};
                const topic = previousResults?.['topic-1']?.result?.topic || 'Social media post';
                const imageUrl = await generateImage(topic, imageConfig, openaiKey || '');
                console.log(`[Execute Step] Generated image`);
                return res.json({ success: true, step, result: { imageUrl } });
            }

            case 'caption-1': {
                const captionConfig = configurations?.['caption-1'] || {};
                const topic = previousResults?.['topic-1']?.result?.topic || 'Social media post';
                const caption = await generateCaption(topic, captionConfig, apiKey, provider as any);
                console.log(`[Execute Step] Generated caption`);
                return res.json({ success: true, step, result: { caption } });
            }

            case 'facebook-1': {
                const fbConfig = configurations?.['facebook-1'] || {};
                const topic = previousResults?.['topic-1']?.result?.topic || '';
                const imageUrl = previousResults?.['image-1']?.result?.imageUrl || '';
                const caption = previousResults?.['caption-1']?.result?.caption || '';

                console.log(`[Execute Step] Facebook config:`, JSON.stringify(fbConfig));
                console.log(`[Execute Step] WorkspaceId:`, workspaceId);

                // Get Facebook page access token - try multiple approaches
                let page: any = null;

                // First, try to get the specific page from config
                if (fbConfig.pageId) {
                    console.log(`[Execute Step] Trying fbConfig.pageId: ${fbConfig.pageId}`);
                    const { data: configuredPage, error: err1 } = await supabase
                        .from('connected_pages')
                        .select('page_id, access_token')
                        .eq('page_id', fbConfig.pageId)
                        .single();
                    console.log(`[Execute Step] Config page result:`, configuredPage, err1?.message);
                    if (configuredPage) page = configuredPage;
                }

                // Second, try any page with automation enabled
                if (!page) {
                    console.log(`[Execute Step] Trying automation_enabled pages for workspace`);
                    const { data: automatedPages, error: err2 } = await supabase
                        .from('connected_pages')
                        .select('page_id, access_token')
                        .eq('workspace_id', workspaceId)
                        .eq('automation_enabled', true)
                        .limit(1);
                    console.log(`[Execute Step] Automated pages result:`, automatedPages, err2?.message);
                    if (automatedPages && automatedPages.length > 0) {
                        page = automatedPages[0];
                    }
                }

                // Third, try any connected page for this workspace
                if (!page) {
                    console.log(`[Execute Step] Trying any page for workspace`);
                    const { data: anyPages, error: err3 } = await supabase
                        .from('connected_pages')
                        .select('page_id, access_token')
                        .eq('workspace_id', workspaceId)
                        .limit(1);
                    console.log(`[Execute Step] Any pages result:`, anyPages, err3?.message);
                    if (anyPages && anyPages.length > 0) {
                        page = anyPages[0];
                    }
                }

                // Fourth fallback - get ANY page at all (for debugging)
                if (!page) {
                    console.log(`[Execute Step] Trying ANY page without workspace filter`);
                    const { data: allPages, error: err4 } = await supabase
                        .from('connected_pages')
                        .select('page_id, access_token, workspace_id')
                        .limit(5);
                    console.log(`[Execute Step] All pages in DB:`, allPages, err4?.message);
                    if (allPages && allPages.length > 0) {
                        // Use first available page
                        page = allPages[0];
                        console.log(`[Execute Step] Using fallback page from workspace: ${page.workspace_id}`);
                    }
                }

                if (!page) {
                    return res.status(400).json({ error: 'No connected Facebook pages. Please connect a page first.' });
                }

                console.log(`[Execute Step] Posting to page: ${page.page_id}`);
                const postId = await postToFacebook(page.access_token, page.page_id, caption, imageUrl);
                console.log(`[Execute Step] Posted to Facebook: ${postId}`);
                return res.json({ success: true, step, result: { postId, topic, imageUrl, caption } });
            }

            default:
                return res.status(400).json({ error: `Unknown step: ${step}` });
        }

    } catch (error: any) {
        console.error(`[Execute Step] Error:`, error.message);
        return res.status(500).json({ error: error.message });
    }
}

// ============================================
// FORM FOLLOWUP CRON
// ============================================
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

async function handleFormFollowup(req: VercelRequest, res: VercelResponse) {
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

async function sendFollowupMessage(
    userId: string,
    text: string,
    pageAccessToken: string,
    messageTag?: string,
    button?: { text: string; url: string }
): Promise<boolean> {
    try {
        let messagePayload: any = { text };

        if (button && button.url && button.url.includes('http')) {
            messagePayload = {
                attachment: {
                    type: 'template',
                    payload: {
                        template_type: 'button',
                        text: text,
                        buttons: [
                            {
                                type: 'web_url',
                                url: button.url,
                                title: button.text,
                                webview_height_ratio: 'full'
                            }
                        ]
                    }
                }
            };
        }

        const body: any = {
            recipient: { id: userId },
            message: messagePayload,
            access_token: pageAccessToken
        };

        if (messageTag) {
            body.messaging_type = 'MESSAGE_TAG';
            body.tag = messageTag;
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

        return true;
    } catch (error: any) {
        console.error('[Form Followup Cron] Send exception:', error.message);
        return false;
    }
}

// ============================================
// SCHEDULER EXECUTE CRON
// ============================================
async function handleSchedulerExecute(req: VercelRequest, res: VercelResponse) {
    console.log('[Scheduler Cron] Starting...');
    console.log('[Scheduler Cron] Time:', new Date().toISOString());

    let processedCount = 0;
    let executedCount = 0;
    let errorCount = 0;

    try {
        const now = new Date();

        const { data: dueWorkflows, error: fetchError } = await supabase
            .from('scheduler_workflows')
            .select('*')
            .eq('status', 'active')
            .lte('next_run_at', now.toISOString())
            .order('next_run_at', { ascending: true })
            .limit(10);

        if (fetchError) {
            console.error('[Scheduler Cron] Error fetching workflows:', fetchError.message);
            return res.status(500).json({ error: fetchError.message });
        }

        console.log('[Scheduler Cron] Found', dueWorkflows?.length || 0, 'due workflows');

        for (const workflow of dueWorkflows || []) {
            processedCount++;
            console.log(`[Scheduler Cron] Processing workflow: ${workflow.name} (${workflow.id})`);

            const { data: execution, error: execError } = await supabase
                .from('scheduler_executions')
                .insert({
                    workflow_id: workflow.id,
                    status: 'running'
                })
                .select()
                .single();

            if (execError) {
                console.error(`[Scheduler Cron] Failed to create execution for ${workflow.id}:`, execError.message);
                errorCount++;
                continue;
            }

            try {
                const result = await executeWorkflow(workflow);

                await supabase
                    .from('scheduler_executions')
                    .update({
                        status: result.success ? 'completed' : 'failed',
                        completed_at: new Date().toISOString(),
                        result: result,
                        error: result.error || null,
                        generated_topic: result.topic || null,
                        generated_image_url: result.imageUrl || null,
                        generated_caption: result.caption || null,
                        facebook_post_id: result.postId || null
                    })
                    .eq('id', execution.id);

                const nextRunAt = calculateNextRun(workflow);
                await supabase
                    .from('scheduler_workflows')
                    .update({
                        last_run_at: now.toISOString(),
                        next_run_at: nextRunAt?.toISOString() || null
                    })
                    .eq('id', workflow.id);

                if (result.success) {
                    executedCount++;
                    console.log(`[Scheduler Cron] ✓ Workflow ${workflow.name} executed successfully`);
                } else {
                    errorCount++;
                    console.log(`[Scheduler Cron] ✗ Workflow ${workflow.name} failed: ${result.error}`);
                }

            } catch (execErr: any) {
                console.error(`[Scheduler Cron] Execution error for ${workflow.id}:`, execErr.message);

                await supabase
                    .from('scheduler_executions')
                    .update({
                        status: 'failed',
                        completed_at: new Date().toISOString(),
                        error: execErr.message
                    })
                    .eq('id', execution.id);

                errorCount++;
            }
        }

        console.log(`[Scheduler Cron] Complete. Processed: ${processedCount}, Executed: ${executedCount}, Errors: ${errorCount}`);

        return res.status(200).json({
            success: true,
            summary: `Processed: ${processedCount}, Executed: ${executedCount}, Errors: ${errorCount}`,
            processed: processedCount,
            executed: executedCount,
            errors: errorCount
        });

    } catch (error: any) {
        console.error('[Scheduler Cron] Exception:', error.message);
        return res.status(500).json({ error: error.message });
    }
}

async function executeWorkflow(workflow: any): Promise<{
    success: boolean;
    error?: string;
    topic?: string;
    imageUrl?: string;
    caption?: string;
    postId?: string;
}> {
    const configurations = workflow.configurations || {};

    const { data: settings } = await supabase
        .from('workspace_settings')
        .select('*')
        .eq('workspace_id', workflow.workspace_id)
        .single();

    const openaiKey = settings?.openai_api_key;
    const geminiKey = settings?.gemini_api_key;

    if (!openaiKey && !geminiKey) {
        return {
            success: false,
            error: 'No AI API keys configured. Please add OpenAI or Gemini API key in Settings.'
        };
    }

    let topicConfig: any = null;
    let imageConfig: any = null;
    let captionConfig: any = null;
    let facebookConfig: any = null;

    for (const [nodeId, config] of Object.entries(configurations)) {
        const node = workflow.nodes?.find((n: any) => n.id === nodeId);
        if (!node) continue;

        switch (node.type) {
            case 'topicGenerator':
                topicConfig = config;
                break;
            case 'imageGenerator':
                imageConfig = config;
                break;
            case 'captionWriter':
                captionConfig = config;
                break;
            case 'facebookPost':
                facebookConfig = config;
                break;
        }
    }

    const { data: topicHistory } = await supabase
        .from('scheduler_topic_history')
        .select('topic')
        .eq('workflow_id', workflow.id)
        .order('created_at', { ascending: false })
        .limit(50);

    const usedTopics = topicHistory?.map(t => t.topic) || [];

    // Step 1: Generate Topic
    let topic = '';
    if (topicConfig) {
        const provider = topicConfig.provider || (openaiKey ? 'openai' : 'gemini');
        const apiKey = provider === 'openai' ? openaiKey : geminiKey;

        if (!apiKey) {
            return { success: false, error: `${provider} API key not configured` };
        }

        try {
            topic = await generateTopic(topicConfig, apiKey, provider, usedTopics);
            console.log('[Scheduler Cron] Generated topic:', topic);
        } catch (err: any) {
            return { success: false, error: `Topic generation failed: ${err.message}` };
        }
    }

    // Step 2: Generate Image
    let imageUrl = '';
    if (imageConfig && openaiKey) {
        try {
            imageUrl = await generateImage(topic, imageConfig, openaiKey);
            console.log('[Scheduler Cron] Generated image URL:', imageUrl);
        } catch (err: any) {
            console.error('[Scheduler Cron] Image generation failed:', err.message);
        }
    }

    // Step 3: Generate Caption
    let caption = '';
    if (captionConfig) {
        const provider = captionConfig.provider || (openaiKey ? 'openai' : 'gemini');
        const apiKey = provider === 'openai' ? openaiKey : geminiKey;

        if (apiKey) {
            try {
                caption = await generateCaption(topic, captionConfig, apiKey, provider);
                console.log('[Scheduler Cron] Generated caption:', caption.substring(0, 100) + '...');
            } catch (err: any) {
                caption = `${topic}\n\n#content #daily`;
                console.error('[Scheduler Cron] Caption generation failed, using fallback:', err.message);
            }
        }
    }

    // Step 4: Post to Facebook
    let postId = '';
    if (facebookConfig?.pageId) {
        const { data: page } = await supabase
            .from('connected_pages')
            .select('page_access_token')
            .eq('page_id', facebookConfig.pageId)
            .single();

        if (!page?.page_access_token) {
            return { success: false, error: 'Page access token not found' };
        }

        try {
            postId = await postToFacebook(page.page_access_token, facebookConfig.pageId, caption, imageUrl);
            console.log('[Scheduler Cron] Posted to Facebook, post ID:', postId);
        } catch (err: any) {
            return { success: false, error: `Facebook posting failed: ${err.message}` };
        }
    }

    // Save topic to history
    if (topic) {
        await supabase
            .from('scheduler_topic_history')
            .insert({ workflow_id: workflow.id, topic });
    }

    return {
        success: true,
        topic,
        imageUrl,
        caption,
        postId
    };
}

async function generateTopic(
    config: any,
    apiKey: string,
    provider: 'openai' | 'gemini',
    usedTopics: string[]
): Promise<string> {
    const seedTopics = config.seedTopics || ['general interest', 'trending topics'];
    const tone = config.tone || 'professional';
    const industry = config.industry || 'general';

    const prompt = `You are a social media content strategist. Generate ONE unique, engaging topic idea for a Facebook post.

Industry/Niche: ${industry}
Tone: ${tone}
Seed topic ideas to draw inspiration from: ${seedTopics.join(', ')}

${usedTopics.length > 0 ? `\nAVOID these previously used topics:\n${usedTopics.slice(0, 20).join('\n')}` : ''}

Requirements:
- Make it specific and actionable
- Should be engaging for social media
- Return ONLY the topic, no explanations or additional text
- Keep it under 100 characters`;

    if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 100,
                temperature: 0.9
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices[0]?.message?.content?.trim() || 'Engaging content for today';
    } else {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: 100, temperature: 0.9 }
                })
            }
        );

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Engaging content for today';
    }
}

async function generateImage(
    topic: string,
    config: any,
    openaiKey: string
): Promise<string> {
    const style = config.style || 'realistic';
    const size = config.size || '1024x1024';

    const sizeMap: Record<string, string> = {
        '1080x1080': '1024x1024',
        '1200x628': '1792x1024',
        '1080x1920': '1024x1792',
        '1024x1024': '1024x1024'
    };

    const dalleSize = sizeMap[size] || '1024x1024';

    const prompt = `Create a ${style} image for a social media post about: ${topic}. 
The image should be eye-catching, professional, and suitable for Facebook.
Style: ${style}
No text or watermarks in the image.`;

    const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'dall-e-3',
            prompt,
            n: 1,
            size: dalleSize,
            quality: 'standard'
        })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.data?.[0]?.url || '';
}

async function generateCaption(
    topic: string,
    config: any,
    apiKey: string,
    provider: 'openai' | 'gemini'
): Promise<string> {
    const tone = config.tone || 'friendly';
    const includeHashtags = config.includeHashtags !== false;
    const includeEmojis = config.includeEmojis !== false;
    const includeCta = config.includeCta !== false;
    const ctaType = config.ctaType || 'engage';
    const maxLength = config.maxLength || 300;

    const prompt = `Write a beautifully formatted Facebook post caption about: ${topic}

FORMATTING RULES (VERY IMPORTANT):
- Use proper line breaks for readability
- Structure the caption in clear paragraphs separated by blank lines
- Follow this exact layout format:

[Opening hook with emoji] First sentence that grabs attention.
Second sentence expanding on the hook.

[Body paragraph] Main message or story.
Keep this engaging and relatable.

[Call to action or closing thought] ${includeCta ? `Type: ${ctaType}` : 'End with an inspiring thought'}

${includeHashtags ? '[Hashtags on their own line] #Hashtag1 #Hashtag2 #Hashtag3 #Hashtag4 #Hashtag5' : ''}

STYLE REQUIREMENTS:
- Tone: ${tone}
- Maximum length: ${maxLength} characters
${includeEmojis ? '- Start key sentences with relevant emojis (🎶✨🌟🎤💡❤️🔥💪🙌 etc.)' : '- No emojis'}
${includeHashtags ? '- Include 3-5 relevant hashtags as the LAST line, all on one line' : '- No hashtags'}
${includeCta ? `- Include a compelling call-to-action (${ctaType === 'engage' ? 'ask a question or invite comments' : ctaType === 'share' ? 'encourage sharing' : ctaType === 'visit' ? 'direct to take action' : 'encourage engagement'})` : ''}

EXAMPLE FORMAT:
🎶✨ Music has a unique way of bringing us together!
Share your favorite live concert memory in the comments below
and tag the band that made it unforgettable.

Let's relive those magical moments! 🌟🎤

#ConcertMemories #LiveMusic #MusicLovers #UnforgettableMoments #ShareYourStory

Return ONLY the formatted caption text, ready to post. Make sure there are proper line breaks between paragraphs.`;

    if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 500,
                temperature: 0.8
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices[0]?.message?.content?.trim() || topic;
    } else {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { maxOutputTokens: 500, temperature: 0.8 }
                })
            }
        );

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || topic;
    }
}

async function postToFacebook(
    pageAccessToken: string,
    pageId: string,
    caption: string,
    imageUrl?: string
): Promise<string> {
    let postId = '';

    if (imageUrl) {
        const photoResponse = await fetch(
            `https://graph.facebook.com/v21.0/${pageId}/photos`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: imageUrl,
                    caption: caption,
                    access_token: pageAccessToken
                })
            }
        );

        const photoData = await photoResponse.json();
        if (photoData.error) {
            throw new Error(photoData.error.message);
        }
        postId = photoData.post_id || photoData.id;
    } else {
        const postResponse = await fetch(
            `https://graph.facebook.com/v21.0/${pageId}/feed`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: caption,
                    access_token: pageAccessToken
                })
            }
        );

        const postData = await postResponse.json();
        if (postData.error) {
            throw new Error(postData.error.message);
        }
        postId = postData.id;
    }

    return postId;
}

function calculateNextRun(workflow: any): Date | null {
    const now = new Date();
    const scheduleType = workflow.schedule_type || 'daily';
    const scheduleTime = workflow.schedule_time || '09:00';
    const scheduleDays = workflow.schedule_days || [];
    const scheduleTimezone = workflow.schedule_timezone || 'Asia/Manila';

    // Get times array from schedule_times column (new approach)
    // Falls back to single schedule_time if schedule_times is empty
    let times: string[] = workflow.schedule_times && workflow.schedule_times.length > 0
        ? workflow.schedule_times
        : [scheduleTime];

    // Get timezone offset in hours (Asia/Manila = +8, so offset = 8)
    // We need to subtract this from the local time to get UTC
    const timezoneOffsets: { [key: string]: number } = {
        'Asia/Manila': 8,
        'Asia/Singapore': 8,
        'Asia/Tokyo': 9,
        'America/New_York': -5, // EST (or -4 for EDT)
        'America/Los_Angeles': -8, // PST (or -7 for PDT)
        'Europe/London': 0,
        'Europe/Paris': 1,
        'Australia/Sydney': 11,
        'UTC': 0
    };
    const tzOffset = timezoneOffsets[scheduleTimezone] ?? 8; // Default to PHT

    console.log(`[Scheduler] calculateNextRun for "${workflow.name}" - type: ${scheduleType}, times: [${times.join(', ')}], timezone: ${scheduleTimezone} (offset: +${tzOffset})`);

    switch (scheduleType) {
        case 'daily': {
            // Use a fresh timestamp with 60-second buffer to ensure times are truly in future
            const currentTime = new Date();
            currentTime.setSeconds(currentTime.getSeconds() + 60); // Add 60s buffer

            // Find the next upcoming time from the list
            const candidates: Date[] = [];

            for (const timeStr of times) {
                const [hours, minutes] = timeStr.split(':').map(Number);

                if (isNaN(hours) || isNaN(minutes)) {
                    console.log(`[Scheduler] Skipping invalid time: ${timeStr}`);
                    continue;
                }

                // Convert local time to UTC by subtracting timezone offset
                // e.g., 16:05 PHT -> 08:05 UTC (16 - 8 = 8)
                let utcHours = hours - tzOffset;
                let dayOffset = 0;

                if (utcHours < 0) {
                    utcHours += 24;
                    dayOffset = -1; // Previous day in UTC
                } else if (utcHours >= 24) {
                    utcHours -= 24;
                    dayOffset = 1; // Next day in UTC
                }

                // Check today (in UTC)
                const todayRun = new Date();
                todayRun.setUTCDate(todayRun.getUTCDate() + dayOffset);
                todayRun.setUTCHours(utcHours, minutes, 0, 0);

                if (todayRun > currentTime) {
                    candidates.push(todayRun);
                    console.log(`[Scheduler] Candidate: ${todayRun.toISOString()} for local time ${timeStr} ${scheduleTimezone}`);
                }

                // Also check tomorrow (in case all today's times have passed)
                const tomorrowRun = new Date(todayRun);
                tomorrowRun.setUTCDate(tomorrowRun.getUTCDate() + 1);
                candidates.push(tomorrowRun);
            }

            // Return the earliest upcoming time
            if (candidates.length === 0) {
                console.log(`[Scheduler] No candidates found!`);
                return null;
            }

            candidates.sort((a, b) => a.getTime() - b.getTime());
            const nextRun = candidates[0];
            console.log(`[Scheduler] Daily candidates (sorted):`, candidates.slice(0, 5).map(d => d.toISOString()));
            console.log(`[Scheduler] Next run selected:`, nextRun.toISOString());
            return nextRun;
        }

        case 'weekly': {
            const targetDays = scheduleDays.map(Number);
            if (targetDays.length === 0) return null;

            const candidates: Date[] = [];

            // Check each time slot for the next 8 days
            for (const timeStr of times) {
                const [hours, minutes] = timeStr.split(':').map(Number);

                for (let i = 0; i < 8; i++) {
                    const checkDate = new Date(now);
                    checkDate.setDate(checkDate.getDate() + i);
                    checkDate.setHours(hours, minutes, 0, 0);

                    if (targetDays.includes(checkDate.getDay()) && checkDate > now) {
                        candidates.push(checkDate);
                        break; // Found next occurrence for this time
                    }
                }
            }

            candidates.sort((a, b) => a.getTime() - b.getTime());
            return candidates[0] || null;
        }

        case 'monthly': {
            const dayOfMonth = scheduleDays[0] || 1;
            const candidates: Date[] = [];

            for (const timeStr of times) {
                const [hours, minutes] = timeStr.split(':').map(Number);

                // Check this month
                const thisMonth = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, hours, minutes, 0, 0);
                if (thisMonth > now) {
                    candidates.push(thisMonth);
                }

                // Check next month
                const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth, hours, minutes, 0, 0);
                candidates.push(nextMonth);
            }

            candidates.sort((a, b) => a.getTime() - b.getTime());
            return candidates[0] || null;
        }

        default:
            return null;
    }
}
