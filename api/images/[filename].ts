import type { VercelRequest, VercelResponse } from '@vercel/node';

// This API route proxies images from Supabase storage
// Usage: /api/images/my-image.jpg -> Fetches from Supabase storage and serves it

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const BUCKET_NAME = 'attachments';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get filename from query params (Vercel puts path params in query for [...path])
        const { filename } = req.query;

        if (!filename) {
            return res.status(400).json({ error: 'Filename is required' });
        }

        // Handle array case (when using [...path])
        const fileNameStr = Array.isArray(filename) ? filename.join('/') : filename;

        // Construct Supabase storage URL
        const supabaseImageUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${fileNameStr}`;

        // Fetch the image from Supabase
        const imageResponse = await fetch(supabaseImageUrl);

        if (!imageResponse.ok) {
            return res.status(imageResponse.status).json({
                error: 'Image not found',
                status: imageResponse.status
            });
        }

        // Get content type from Supabase response
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

        // Get the image buffer
        const imageBuffer = await imageResponse.arrayBuffer();

        // Set caching headers (cache for 1 year since images are immutable)
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Content-Type', contentType);

        // Send the image
        return res.status(200).send(Buffer.from(imageBuffer));

    } catch (error: any) {
        console.error('Error proxying image:', error);
        return res.status(500).json({
            error: error.message || 'Failed to fetch image'
        });
    }
}
