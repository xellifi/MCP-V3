import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { videoId, pageId } = req.method === 'GET' ? req.query : req.body;

        if (!videoId) {
            return res.status(400).json({ error: 'videoId is required' });
        }

        // Get page access token from database
        let pageAccessToken = '';

        if (pageId) {
            const { data: pageData, error: pageError } = await supabase
                .from('connected_pages')
                .select('access_token')
                .eq('page_id', pageId)
                .single();

            if (pageData?.access_token) {
                pageAccessToken = pageData.access_token;
            }
        }

        // If no specific page token, try to get any available page token
        if (!pageAccessToken) {
            const { data: pagesData } = await supabase
                .from('connected_pages')
                .select('access_token')
                .limit(1);

            if (pagesData && pagesData.length > 0) {
                pageAccessToken = pagesData[0].access_token;
            }
        }

        if (!pageAccessToken) {
            return res.status(400).json({ error: 'No page access token available' });
        }

        // Fetch video thumbnail from Facebook Graph API
        const graphUrl = `https://graph.facebook.com/v21.0/${videoId}?fields=thumbnails,picture&access_token=${pageAccessToken}`;

        const fbResponse = await fetch(graphUrl);
        const fbData = await fbResponse.json();

        if (fbData.error) {
            console.error('Facebook API error:', fbData.error);
            return res.status(400).json({
                error: fbData.error.message,
                thumbnailUrl: null
            });
        }

        // Get thumbnail URL - try different sources
        let thumbnailUrl = null;

        // First try thumbnails array
        if (fbData.thumbnails?.data && fbData.thumbnails.data.length > 0) {
            // Get the highest quality thumbnail
            const thumbnails = fbData.thumbnails.data;
            thumbnailUrl = thumbnails[thumbnails.length - 1]?.uri || thumbnails[0]?.uri;
        }

        // Fallback to picture field
        if (!thumbnailUrl && fbData.picture) {
            thumbnailUrl = fbData.picture;
        }

        return res.status(200).json({
            success: true,
            videoId,
            thumbnailUrl,
            data: fbData
        });

    } catch (error: any) {
        console.error('Error fetching video thumbnail:', error);
        return res.status(500).json({
            error: error.message || 'Failed to fetch video thumbnail',
            thumbnailUrl: null
        });
    }
}
