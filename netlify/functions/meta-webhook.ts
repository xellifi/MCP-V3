import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    const { httpMethod, queryStringParameters, body } = event;

    console.log('Webhook request received:', { httpMethod, queryStringParameters });

    // Handle GET request for webhook verification
    if (httpMethod === 'GET') {
        const mode = queryStringParameters?.['hub.mode'];
        const token = queryStringParameters?.['hub.verify_token'];
        const challenge = queryStringParameters?.['hub.challenge'];

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
                    return {
                        statusCode: 500,
                        body: JSON.stringify({ error: 'Failed to retrieve verify token' })
                    };
                }

                if (!data || !data.facebook_verify_token) {
                    console.error('Verify token not configured in admin settings');
                    return {
                        statusCode: 500,
                        body: JSON.stringify({ error: 'Verify token not configured' })
                    };
                }

                // Verify token matches
                if (token === data.facebook_verify_token) {
                    console.log('Verification successful! Returning challenge:', challenge);
                    return {
                        statusCode: 200,
                        body: challenge || '',
                        headers: { 'Content-Type': 'text/plain' }
                    };
                } else {
                    console.error('Verification token mismatch');
                    return {
                        statusCode: 403,
                        body: JSON.stringify({ error: 'Verification token mismatch' })
                    };
                }
            } catch (err) {
                console.error('Unexpected error during verification:', err);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ error: 'Internal server error' })
                };
            }
        }

        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid verification request' })
        };
    }

    // Handle POST request for webhook events
    if (httpMethod === 'POST') {
        try {
            // Parse webhook event
            const eventData = JSON.parse(body || '{}');

            console.log('Received webhook event:', JSON.stringify(eventData, null, 2));

            // Facebook expects a 200 OK response quickly
            // Process events asynchronously if needed

            // TODO: Process webhook events based on type
            // - messages: New messages received
            // - messaging_postbacks: Button clicks
            // - feed: Page posts, comments, reactions

            return {
                statusCode: 200,
                body: 'EVENT_RECEIVED',
                headers: { 'Content-Type': 'text/plain' }
            };
        } catch (err) {
            console.error('Error processing webhook event:', err);
            // Still return 200 to avoid Facebook retrying
            return {
                statusCode: 200,
                body: 'EVENT_RECEIVED',
                headers: { 'Content-Type': 'text/plain' }
            };
        }
    }

    return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' })
    };
};
