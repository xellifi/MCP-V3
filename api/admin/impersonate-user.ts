import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client with service role
const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

export default async function handler(req: any, res: any) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { userId, adminId } = req.body;

        // Validate inputs
        if (!userId) {
            return res.status(400).json({ error: 'Missing user ID' });
        }

        if (!adminId) {
            return res.status(400).json({ error: 'Missing admin ID' });
        }

        // Verify the requester is an admin
        const { data: adminProfile, error: adminError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', adminId)
            .single();

        console.log('Admin check:', { adminId, adminProfile, adminError });

        if (adminError || !adminProfile) {
            console.error('Admin profile lookup failed:', adminError);
            return res.status(403).json({ error: 'Unauthorized - could not verify admin status' });
        }

        // Case-insensitive role check
        const role = (adminProfile.role || '').toLowerCase();
        if (role !== 'admin' && role !== 'owner') {
            console.log('Role check failed:', { role, expected: ['admin', 'owner'] });
            return res.status(403).json({ error: `Only admins can impersonate users (your role: ${adminProfile.role})` });
        }

        // Get the target user's email
        const { data: targetUser, error: userError } = await supabaseAdmin
            .from('profiles')
            .select('email, name')
            .eq('id', userId)
            .single();

        if (userError || !targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate a magic link for the target user
        // Use the request origin to build the redirect URL
        const siteUrl = req.headers.origin || process.env.VITE_APP_URL || 'http://localhost:5173';
        const redirectUrl = `${siteUrl}/dashboard`;
        console.log('Using redirect URL:', redirectUrl);

        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: targetUser.email,
            options: {
                redirectTo: redirectUrl
            }
        });

        if (linkError) {
            console.error('Generate link error:', linkError);
            return res.status(500).json({ error: 'Failed to generate impersonation link' });
        }

        // Return the magic link token for the client to use
        return res.status(200).json({
            success: true,
            // We return the hashed_token which can be used to verify the OTP
            token: linkData.properties?.hashed_token,
            email: targetUser.email,
            userName: targetUser.name,
            // Return the full action link for direct use
            actionLink: linkData.properties?.action_link
        });

    } catch (error: any) {
        console.error('Impersonation error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
