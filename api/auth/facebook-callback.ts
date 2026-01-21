import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Facebook App credentials
const FACEBOOK_APP_ID = process.env.VITE_FACEBOOK_APP_ID || '';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';

interface FacebookTokenResponse {
    access_token: string;
    token_type: string;
    expires_in?: number;
    error?: {
        message: string;
        type: string;
        code: number;
    };
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
    const { code, state, error, error_description } = req.query;

    console.log('Facebook OAuth callback received');
    console.log('Code present:', !!code);
    console.log('State:', state);

    // Handle OAuth errors
    if (error) {
        console.error('Facebook OAuth error:', error, error_description);
        return res.redirect(`/login?error=${encodeURIComponent(error_description || error)}`);
    }

    if (!code) {
        console.error('No authorization code received');
        return res.redirect('/login?error=No%20authorization%20code%20received');
    }

    if (!FACEBOOK_APP_SECRET) {
        console.error('FACEBOOK_APP_SECRET not configured');
        return res.redirect('/login?error=Server%20configuration%20error');
    }

    try {
        // Get the redirect URI that was used in the authorization request
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const redirectUri = `${protocol}://${host}/api/auth/facebook-callback`;

        console.log('Redirect URI for token exchange:', redirectUri);

        // Exchange the code for an access token
        const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
        tokenUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
        tokenUrl.searchParams.set('client_secret', FACEBOOK_APP_SECRET);
        tokenUrl.searchParams.set('code', code);
        tokenUrl.searchParams.set('redirect_uri', redirectUri);

        console.log('Exchanging code for token...');

        const tokenResponse = await fetch(tokenUrl.toString());
        const tokenData: FacebookTokenResponse = await tokenResponse.json();

        if (!tokenResponse.ok || !tokenData.access_token) {
            console.error('Token exchange failed:', tokenData);
            return res.redirect(`/login?error=${encodeURIComponent(tokenData.error?.message || 'Token exchange failed')}`);
        }

        console.log('Token exchange successful, fetching user info...');

        // Get user info using the access token
        const userUrl = `https://graph.facebook.com/v18.0/me?fields=id,name,email,picture.width(200).height(200)&access_token=${tokenData.access_token}`;
        const userResponse = await fetch(userUrl);
        const userData: FacebookUserResponse = await userResponse.json();

        if (!userResponse.ok || !userData.id) {
            console.error('Failed to fetch user info:', userData);
            return res.redirect('/login?error=Failed%20to%20fetch%20user%20info');
        }

        console.log('User info fetched:', userData.name, userData.email);

        // Store the token and user data in session/cookie and redirect to a handler page
        // The handler page will complete the login process

        // Create a temporary token to pass the data securely
        const loginData = {
            facebookId: userData.id,
            name: userData.name,
            email: userData.email,
            picture: userData.picture?.data?.url,
            accessToken: tokenData.access_token,
            expiresIn: tokenData.expires_in
        };

        // Encode the data as base64 for URL safety
        const encodedData = Buffer.from(JSON.stringify(loginData)).toString('base64');

        // Redirect to the frontend with the data
        // The frontend will handle the Supabase user creation
        return res.redirect(`/auth/facebook-complete?data=${encodeURIComponent(encodedData)}`);

    } catch (error: any) {
        console.error('Facebook callback error:', error);
        return res.redirect(`/login?error=${encodeURIComponent(error.message || 'Unknown error')}`);
    }
}
