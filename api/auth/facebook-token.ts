import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Facebook App credentials - MUST be set in Vercel environment variables
const FACEBOOK_APP_ID = process.env.VITE_FACEBOOK_APP_ID || '';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';

interface FacebookTokenResponse {
    access_token: string;
    token_type: string;
    expires_in?: number;
}

interface FacebookUserResponse {
    id: string;
    name: string;
    email?: string;
    picture?: {
        data: {
            url: string;
        };
    };
}

export default async function handler(req: any, res: any) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code, redirectUri } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
    }

    if (!FACEBOOK_APP_SECRET) {
        console.error('FACEBOOK_APP_SECRET environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error: Facebook App Secret not configured' });
    }

    try {
        console.log('Exchanging Facebook code for access token...');

        // The redirect_uri must match what was used in the original authorization request
        // For JS SDK popup, we typically don't need a redirect_uri for token exchange
        // But Facebook Login for Business may require it

        // Exchange the code for an access token
        const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
        tokenUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
        tokenUrl.searchParams.set('client_secret', FACEBOOK_APP_SECRET);
        tokenUrl.searchParams.set('code', code);

        // For FB Login for Business with JS SDK, use the current origin
        if (redirectUri) {
            tokenUrl.searchParams.set('redirect_uri', redirectUri);
        }

        console.log('Token exchange URL:', tokenUrl.toString().replace(FACEBOOK_APP_SECRET, '***'));

        const tokenResponse = await fetch(tokenUrl.toString());
        const tokenData: FacebookTokenResponse = await tokenResponse.json();

        if (!tokenResponse.ok || !tokenData.access_token) {
            console.error('Token exchange failed:', tokenData);
            return res.status(400).json({
                error: 'Failed to exchange code for access token',
                details: tokenData
            });
        }

        console.log('Token exchange successful, fetching user info...');

        // Get user info using the access token
        const userUrl = `https://graph.facebook.com/v18.0/me?fields=id,name,email,picture.width(200).height(200)&access_token=${tokenData.access_token}`;
        const userResponse = await fetch(userUrl);
        const userData: FacebookUserResponse = await userResponse.json();

        if (!userResponse.ok || !userData.id) {
            console.error('Failed to fetch user info:', userData);
            return res.status(400).json({
                error: 'Failed to fetch user info from Facebook',
                details: userData
            });
        }

        console.log('User info fetched:', userData.name);

        // Return the access token and user data
        return res.status(200).json({
            success: true,
            accessToken: tokenData.access_token,
            expiresIn: tokenData.expires_in,
            user: {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                picture: userData.picture
            }
        });

    } catch (error: any) {
        console.error('Facebook token exchange error:', error);
        return res.status(500).json({
            error: 'Internal server error during token exchange',
            message: error.message
        });
    }
}
