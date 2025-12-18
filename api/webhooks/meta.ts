import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { method, query, body } = req;

    console.log('Webhook request received:', { method, query });

    // Handle GET request for webhook verification
    if (method === 'GET') {
        const mode = query['hub.mode'] as string;
        const token = query['hub.verify_token'] as string;
        const challenge = query['hub.challenge'] as string;

        console.log('Verification request:', { mode, token: token ? '***' : 'missing', challenge });

        if (mode === 'subscribe') {
            try {
                // Get verify token from Supabase admin_settings
                const { data, error } = await supabase
                    .from('admin_settings')
                    .select('facebook_verify_token')
                    .eq('id', 1)
                    .single();

                if (error) {
                    console.error('Error fetching verify token:', error);
                    return res.status(500).json({ error: 'Failed to retrieve verify token' });
                }

                if (!data || !data.facebook_verify_token) {
                    console.error('Verify token not configured in admin settings');
                    return res.status(500).json({ error: 'Verify token not configured' });
                }

                // Verify token matches
                if (token === data.facebook_verify_token) {
                    console.log('Verification successful! Returning challenge:', challenge);
                    return res.status(200).send(challenge);
                } else {
                    console.error('Verification token mismatch');
                    return res.status(403).json({ error: 'Verification token mismatch' });
                }
            } catch (err) {
                console.error('Unexpected error during verification:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
        }

        return res.status(400).json({ error: 'Invalid verification request' });
    }

    // Handle POST request for webhook events
    if (method === 'POST') {
        try {
            console.log('Received webhook event:', JSON.stringify(body, null, 2));

            // Facebook expects a 200 OK response quickly
            // TODO: Process webhook events based on type
            // - messages: New messages received
            // - messaging_postbacks: Button clicks
            // - feed: Page posts, comments, reactions

            return res.status(200).send('EVENT_RECEIVED');
        } catch (err) {
            console.error('Error processing webhook event:', err);
            // Still return 200 to avoid Facebook retrying
            return res.status(200).send('EVENT_RECEIVED');
        }
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
}
