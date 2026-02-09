// Execute Step Handler - Step-by-step execution from frontend
import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, generateTopic, generateImage, generateCaption, postToFacebook } from './shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const step = req.query.step as string;

    // If step is 'full', run the complete workflow
    if (step === 'full') {
        return handleExecuteFullWorkflow(req, res);
    }

    console.log(`[Execute Step] Starting step: ${step}`);

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { workspaceId, configurations, previousResults } = body;

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
                const caption = previousResults?.['caption-1']?.result?.caption || '';
                const imageUrl = previousResults?.['image-1']?.result?.imageUrl || '';
                const topic = previousResults?.['topic-1']?.result?.topic || '';

                let page: any = null;

                if (fbConfig.pageId) {
                    const { data: configuredPage } = await supabase
                        .from('connected_pages')
                        .select('page_id, page_access_token')
                        .eq('page_id', fbConfig.pageId)
                        .single();
                    if (configuredPage) page = configuredPage;
                }

                if (!page) {
                    const { data: automatedPages } = await supabase
                        .from('connected_pages')
                        .select('page_id, page_access_token')
                        .eq('workspace_id', workspaceId)
                        .eq('automation_enabled', true)
                        .limit(1);
                    if (automatedPages?.length) page = automatedPages[0];
                }

                if (!page) {
                    const { data: anyPages } = await supabase
                        .from('connected_pages')
                        .select('page_id, page_access_token')
                        .eq('workspace_id', workspaceId)
                        .limit(1);
                    if (anyPages?.length) page = anyPages[0];
                }

                if (!page) {
                    return res.status(400).json({ error: 'No connected Facebook pages. Please connect a page first.' });
                }

                console.log(`[Execute Step] Posting to page: ${page.page_id}`);
                const postId = await postToFacebook(page.page_access_token, page.page_id, caption, imageUrl);
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

async function handleExecuteFullWorkflow(req: VercelRequest, res: VercelResponse) {
    console.log(`[Execute Full] Starting full workflow execution`);

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { workspaceId, configurations } = body;

        console.log(`[Execute Full] WorkspaceId: ${workspaceId}`);

        // Get API keys from workspace
        const { data: settings } = await supabase
            .from('workspace_settings')
            .select('openai_api_key, gemini_api_key')
            .eq('workspace_id', workspaceId)
            .single();

        const openaiKey = settings?.openai_api_key;
        const geminiKey = settings?.gemini_api_key;

        if (!openaiKey && !geminiKey) {
            return res.status(400).json({
                error: 'No API keys configured',
                failedStep: 'topic-1'
            });
        }

        // Extract configs
        const topicConfig = configurations?.['topic-1'] || configurations?.['topicGenerator-1'] || {};
        const imageConfig = configurations?.['image-1'] || configurations?.['imageGenerator-1'] || {};
        const captionConfig = configurations?.['caption-1'] || configurations?.['captionWriter-1'] || {};
        const facebookConfig = configurations?.['facebook-1'] || configurations?.['facebookPost-1'] || {};

        const results: Record<string, any> = {};

        // Step 1: Generate Topic
        console.log(`[Execute Full] Step 1: Generating topic...`);
        const provider = (topicConfig?.provider || (openaiKey ? 'openai' : 'gemini')) as 'openai' | 'gemini';
        const apiKey = provider === 'openai' ? openaiKey : geminiKey;

        if (!apiKey) {
            return res.status(400).json({
                error: `${provider} API key not configured`,
                failedStep: 'topic-1'
            });
        }

        let topic = '';
        try {
            topic = await generateTopic(topicConfig || {}, apiKey, provider, []);
            console.log(`[Execute Full] Generated topic: "${topic}"`);
            results['topic-1'] = { success: true, result: { topic } };
        } catch (err: any) {
            return res.status(400).json({
                error: `Topic generation failed: ${err.message}`,
                failedStep: 'topic-1',
                results
            });
        }

        // Step 2: Generate Image
        console.log(`[Execute Full] Step 2: Generating image...`);
        let imageUrl = '';
        if (openaiKey) {
            try {
                imageUrl = await generateImage(topic, imageConfig || {}, openaiKey);
                console.log(`[Execute Full] Generated image URL: ${imageUrl?.substring(0, 60)}...`);
                results['image-1'] = { success: true, result: { imageUrl } };
            } catch (err: any) {
                return res.status(400).json({
                    error: `Image generation failed: ${err.message}`,
                    failedStep: 'image-1',
                    results
                });
            }
        } else {
            results['image-1'] = { success: true, result: { imageUrl: '' }, skipped: true };
        }

        // Step 3: Generate Caption
        console.log(`[Execute Full] Step 3: Generating caption...`);
        let caption = '';
        try {
            const captionProvider = (captionConfig?.provider || provider) as 'openai' | 'gemini';
            const captionApiKey = captionProvider === 'openai' ? openaiKey : geminiKey;

            if (!captionApiKey) {
                throw new Error(`${captionProvider} API key not available for caption`);
            }

            caption = await generateCaption(topic, captionConfig || {}, captionApiKey, captionProvider);
            results['caption-1'] = { success: true, result: { caption } };
        } catch (err: any) {
            return res.status(400).json({
                error: `Caption generation failed: ${err.message}`,
                failedStep: 'caption-1',
                results
            });
        }

        // Step 4: Post to Facebook
        console.log(`[Execute Full] Step 4: Posting to Facebook...`);

        if (!caption) {
            return res.status(400).json({
                error: 'Cannot post to Facebook - no caption generated',
                failedStep: 'facebook-1',
                results
            });
        }

        let page: any = null;

        if (facebookConfig?.pageId) {
            const { data: configuredPage } = await supabase
                .from('connected_pages')
                .select('page_id, page_access_token')
                .eq('page_id', facebookConfig.pageId)
                .single();
            if (configuredPage) page = configuredPage;
        }

        if (!page) {
            const { data: workspacePages } = await supabase
                .from('connected_pages')
                .select('page_id, page_access_token')
                .eq('workspace_id', workspaceId)
                .eq('automation_enabled', true)
                .limit(1);
            if (workspacePages?.length) page = workspacePages[0];
        }

        if (!page) {
            const { data: anyPages } = await supabase
                .from('connected_pages')
                .select('page_id, page_access_token')
                .eq('workspace_id', workspaceId)
                .limit(1);
            if (anyPages?.length) page = anyPages[0];
        }

        if (!page?.page_access_token) {
            return res.status(400).json({
                error: 'No connected Facebook pages found. Please connect a page first.',
                failedStep: 'facebook-1',
                results
            });
        }

        try {
            const postId = await postToFacebook(page.page_access_token, page.page_id, caption, imageUrl);
            console.log(`[Execute Full] Posted to Facebook! Post ID: ${postId}`);
            results['facebook-1'] = { success: true, result: { postId, topic, imageUrl, caption } };
        } catch (err: any) {
            return res.status(400).json({
                error: `Facebook posting failed: ${err.message}`,
                failedStep: 'facebook-1',
                results
            });
        }

        console.log(`[Execute Full] Workflow completed successfully!`);
        return res.json({
            success: true,
            results,
            summary: {
                topic,
                imageUrl,
                caption,
                postId: results['facebook-1']?.result?.postId
            }
        });

    } catch (error: any) {
        console.error(`[Execute Full] Unexpected error:`, error.message);
        return res.status(500).json({ error: error.message });
    }
}
