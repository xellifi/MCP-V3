import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Use service role for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

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

        // Generate consistent password for Facebook users
        const fbPassword = `FB_AUTH_${userData.id}_SECURE`;
        const email = userData.email || `fb_${userData.id}@facebook.placeholder`;

        // Check if user exists by facebook_id or email
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, email')
            .or(`facebook_id.eq.${userData.id},email.eq.${email}`)
            .maybeSingle();

        let userId: string;
        let isNewUser = false;

        if (existingProfile) {
            console.log('Existing user found:', existingProfile.id);
            userId = existingProfile.id;

            // Update user's password to consistent pattern using admin API
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                userId,
                { password: fbPassword }
            );

            if (updateError) {
                console.error('Failed to update user password:', updateError);
            } else {
                console.log('Updated user password to consistent pattern');
            }

            // Update profile with Facebook data
            await supabaseAdmin
                .from('profiles')
                .update({
                    facebook_id: userData.id,
                    facebook_access_token: tokenData.access_token,
                    avatar_url: userData.picture?.data?.url,
                    email_verified: true
                })
                .eq('id', userId);
        } else {
            console.log('Creating new user...');
            isNewUser = true;

            // Create new user with admin API
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password: fbPassword,
                email_confirm: true, // Auto-confirm email for Facebook users
                user_metadata: {
                    name: userData.name,
                    avatar_url: userData.picture?.data?.url,
                    facebook_id: userData.id
                }
            });

            if (createError || !newUser.user) {
                console.error('Failed to create user:', createError);
                return res.redirect(`/login?error=${encodeURIComponent(createError?.message || 'Failed to create account')}`);
            }

            userId = newUser.user.id;
            console.log('Created new user:', userId);

            // Wait for trigger to create profile
            await new Promise(resolve => setTimeout(resolve, 500));

            // Update profile with Facebook data
            await supabaseAdmin
                .from('profiles')
                .update({
                    facebook_id: userData.id,
                    facebook_access_token: tokenData.access_token,
                    avatar_url: userData.picture?.data?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random`,
                    email_verified: true,
                    name: userData.name
                })
                .eq('id', userId);

            // Create Free subscription for new user
            console.log('[Facebook Callback] Creating FREE subscription for new user:', userId);
            try {
                const { data: subResult, error: subError } = await supabaseAdmin.rpc('ensure_user_free_subscription', { p_user_id: userId });
                if (subError) {
                    console.error('[Facebook Callback] RPC error creating subscription:', subError);
                } else if (subResult?.success) {
                    console.log('[Facebook Callback] Successfully created FREE subscription:', subResult);
                } else {
                    console.error('[Facebook Callback] Subscription creation returned error:', subResult?.error || subResult);
                }
            } catch (e: any) {
                console.error('[Facebook Callback] Exception creating subscription:', e.message);
            }

            // Create default workspace
            try {
                await supabaseAdmin.rpc('ensure_user_workspace', {
                    p_user_id: userId,
                    p_user_name: userData.name
                });
            } catch (e) {
                console.error('Workspace error:', e);
            }
        }

        // Generate a session token that the frontend can use
        // Pass data to frontend for final sign-in
        const loginData = {
            facebookId: userData.id,
            name: userData.name,
            email: email,
            picture: userData.picture?.data?.url,
            accessToken: tokenData.access_token,
            userId: userId,
            isNewUser: isNewUser
        };

        const encodedData = Buffer.from(JSON.stringify(loginData)).toString('base64');
        return res.redirect(`/auth/facebook-complete?data=${encodeURIComponent(encodedData)}`);

    } catch (error: any) {
        console.error('Facebook callback error:', error);
        return res.redirect(`/login?error=${encodeURIComponent(error.message || 'Unknown error')}`);
    }
}
