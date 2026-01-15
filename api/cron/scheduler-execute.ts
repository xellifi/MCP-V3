import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Scheduler Workflow Cron Job
 * 
 * Runs periodically to check for due workflows and execute them.
 * Generates topics, images, captions with AI and posts to Facebook.
 * 
 * Add this URL to cron-job.org:
 * https://your-domain.com/api/cron/scheduler-execute
 * 
 * Recommended interval: Every 5 minutes
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('[Scheduler Cron] Starting...');
    console.log('[Scheduler Cron] Time:', new Date().toISOString());

    let processedCount = 0;
    let executedCount = 0;
    let errorCount = 0;

    try {
        const now = new Date();

        // Find active workflows that are due to run
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

            // Create execution record
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
                // Execute the workflow
                const result = await executeWorkflow(workflow);

                // Update execution with result
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

                // Calculate next run time and update workflow
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

/**
 * Execute a single workflow - generates content with AI and posts to Facebook
 */
async function executeWorkflow(workflow: any): Promise<{
    success: boolean;
    error?: string;
    topic?: string;
    imageUrl?: string;
    caption?: string;
    postId?: string;
}> {
    const configurations = workflow.configurations || {};

    console.log(`[Scheduler Cron] Executing workflow with ${Object.keys(configurations).length} node configurations`);

    // Get workspace settings for API keys
    const { data: settings } = await supabase
        .from('workspace_settings')
        .select('*')
        .eq('workspace_id', workflow.workspace_id)
        .single();

    // Check for required API keys
    const openaiKey = settings?.openai_api_key;
    const geminiKey = settings?.gemini_api_key;

    if (!openaiKey && !geminiKey) {
        return {
            success: false,
            error: 'No AI API keys configured. Please add OpenAI or Gemini API key in Settings.'
        };
    }

    // Find configurations for each node type
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

    // Get previously used topics to avoid duplicates
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

    // Step 2: Generate Image (only if configured)
    let imageUrl = '';
    if (imageConfig && openaiKey) {
        try {
            imageUrl = await generateImage(topic, imageConfig, openaiKey);
            console.log('[Scheduler Cron] Generated image URL:', imageUrl);
        } catch (err: any) {
            console.error('[Scheduler Cron] Image generation failed:', err.message);
            // Continue without image - not critical
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
                // Fallback caption
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

/**
 * Generate a topic using OpenAI or Gemini
 */
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
        // Gemini API
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

/**
 * Generate an image using DALL-E
 */
async function generateImage(
    topic: string,
    config: any,
    openaiKey: string
): Promise<string> {
    const style = config.style || 'realistic';
    const size = config.size || '1024x1024';

    // Map size config to DALL-E sizes
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

/**
 * Generate a caption using OpenAI or Gemini
 */
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

    const prompt = `Write a Facebook post caption about: ${topic}

Requirements:
- Tone: ${tone}
- Maximum length: ${maxLength} characters
${includeEmojis ? '- Include relevant emojis' : '- No emojis'}
${includeHashtags ? '- Include 3-5 relevant hashtags at the end' : '- No hashtags'}
${includeCta ? `- Include a call-to-action (type: ${ctaType})` : ''}

Return ONLY the caption text, ready to post.`;

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

/**
 * Post to Facebook using Graph API
 */
async function postToFacebook(
    pageAccessToken: string,
    pageId: string,
    caption: string,
    imageUrl?: string
): Promise<string> {
    let postId = '';

    if (imageUrl) {
        // Post with image
        // First, upload the image from URL
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
        // Text-only post
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

/**
 * Calculate the next run time based on workflow schedule
 */
function calculateNextRun(workflow: any): Date | null {
    const now = new Date();
    const scheduleType = workflow.schedule_type || 'daily';
    const scheduleTime = workflow.schedule_time || '09:00';
    const scheduleDays = workflow.schedule_days || [];

    const [hours, minutes] = scheduleTime.split(':').map(Number);

    switch (scheduleType) {
        case 'daily': {
            const next = new Date(now);
            next.setHours(hours, minutes, 0, 0);
            if (next <= now) {
                next.setDate(next.getDate() + 1);
            }
            return next;
        }

        case 'weekly': {
            const targetDays = scheduleDays.map(Number);
            if (targetDays.length === 0) return null;

            const next = new Date(now);
            next.setHours(hours, minutes, 0, 0);

            for (let i = 0; i < 8; i++) {
                if (i > 0) next.setDate(next.getDate() + 1);
                if (targetDays.includes(next.getDay()) && next > now) {
                    return next;
                }
            }
            return null;
        }

        case 'monthly': {
            const dayOfMonth = scheduleDays[0] || 1;
            const next = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, hours, minutes, 0, 0);
            if (next <= now) {
                next.setMonth(next.getMonth() + 1);
            }
            return next;
        }

        default:
            return null;
    }
}
