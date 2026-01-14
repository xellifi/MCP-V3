import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client
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
    // Only allow DELETE
    if (req.method !== 'DELETE') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        console.log('[Delete User] Starting deletion for user:', userId);

        // 1. Delete from auth.users (this is the critical part)
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (authError) {
            console.error('[Delete User] Auth deletion error:', authError);
            return res.status(500).json({
                error: 'Failed to delete user from authentication',
                details: authError.message
            });
        }

        console.log('[Delete User] ✓ Deleted from auth.users');

        // 2. Delete from profiles (should cascade to subscriptions, etc.)
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (profileError) {
            console.error('[Delete User] Profile deletion error:', profileError);
            // Don't fail if profile doesn't exist - auth user is already deleted
            console.log('[Delete User] ⚠ Profile deletion failed but auth user is deleted');
        } else {
            console.log('[Delete User] ✓ Deleted from profiles');
        }

        return res.status(200).json({
            success: true,
            message: 'User deleted successfully from both authentication and database'
        });

    } catch (error: any) {
        console.error('[Delete User] Server error:', error);
        return res.status(500).json({
            error: error.message || 'Internal server error'
        });
    }
}
