import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Unified Admin API Handler
 * 
 * Routes based on HTTP method and action query param:
 * - POST   /api/admin?action=create-user    -> Create user
 * - POST   /api/admin?action=impersonate    -> Impersonate user
 * - DELETE /api/admin?action=delete-user    -> Delete user
 */

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const action = req.query.action as string;

    console.log(`[Admin API] Action: ${action}, Method: ${req.method}`);

    switch (action) {
        case 'create-user':
            if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Method not allowed' });
            }
            return handleCreateUser(req, res);

        case 'delete-user':
            if (req.method !== 'DELETE') {
                return res.status(405).json({ error: 'Method not allowed' });
            }
            return handleDeleteUser(req, res);

        case 'impersonate':
            if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Method not allowed' });
            }
            return handleImpersonateUser(req, res);

        case 'global-stats':
            if (req.method !== 'GET') {
                return res.status(405).json({ error: 'Method not allowed' });
            }
            return handleGetGlobalStats(req, res);

        case 'verify-user':
            if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Method not allowed' });
            }
            return handleVerifyUser(req, res);

        default:
            return res.status(400).json({
                error: 'Invalid action parameter',
                validActions: ['create-user', 'delete-user', 'impersonate', 'global-stats', 'verify-user'],
                usage: '/api/admin?action=create-user (POST) | /api/admin?action=delete-user (DELETE) | /api/admin?action=impersonate (POST) | /api/admin?action=global-stats (GET) | /api/admin?action=verify-user (POST)'
            });
    }
}

// ============================================
// CREATE USER
// ============================================
async function handleCreateUser(req: VercelRequest, res: VercelResponse) {
    try {
        const { email, password, name, packageId } = req.body;

        if (!email || !password || !name || !packageId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                name: name
            }
        });

        if (authError) {
            console.error('Auth error:', authError);

            if ((authError as any).code === 'email_exists' ||
                authError.message?.includes('already registered') ||
                authError.message?.includes('already been registered')) {

                const { data: existingProfile } = await supabaseAdmin
                    .from('profiles')
                    .select('id, email, name')
                    .eq('email', email)
                    .maybeSingle();

                if (existingProfile) {
                    return res.status(400).json({
                        error: `A user with email "${email}" already exists in the system.`
                    });
                } else {
                    return res.status(400).json({
                        error: `This email is registered in authentication but the profile is missing. Please delete the user from Supabase Auth Dashboard first (Authentication > Users), then try again.`
                    });
                }
            }

            if (authError.message?.includes('invalid email')) {
                return res.status(400).json({
                    error: 'Invalid email address format. Please check and try again.'
                });
            }

            if (authError.message?.includes('password')) {
                return res.status(400).json({
                    error: 'Password does not meet requirements. Please use a stronger password.'
                });
            }

            return res.status(400).json({
                error: authError.message || 'Failed to create user account'
            });
        }

        if (!authData.user) {
            return res.status(500).json({ error: 'Failed to create user' });
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        await supabaseAdmin
            .from('profiles')
            .update({ name })
            .eq('id', authData.user.id);

        const { data: packageData, error: packageError } = await supabaseAdmin
            .from('packages')
            .select('*')
            .eq('id', packageId)
            .single();

        if (packageError || !packageData) {
            return res.status(400).json({ error: 'Package not found' });
        }

        const { error: subscriptionError } = await supabaseAdmin
            .from('user_subscriptions')
            .insert({
                user_id: authData.user.id,
                package_id: packageId,
                status: 'Active',
                billing_cycle: 'monthly',
                amount: packageData.price_monthly,
                next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                payment_method: 'manual'
            });

        if (subscriptionError) {
            console.error('Subscription error:', subscriptionError);
            return res.status(500).json({ error: 'User created but subscription failed' });
        }

        return res.status(200).json({
            success: true,
            user: {
                id: authData.user.id,
                email: authData.user.email,
                name
            }
        });

    } catch (error: any) {
        console.error('Server error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}

// ============================================
// DELETE USER
// ============================================
async function handleDeleteUser(req: VercelRequest, res: VercelResponse) {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        console.log('[Delete User] Starting deletion for user:', userId);

        // STEP 1: Delete from dependent tables FIRST (foreign key order)
        // Delete user_subscriptions
        const { error: subError } = await supabaseAdmin
            .from('user_subscriptions')
            .delete()
            .eq('user_id', userId);

        if (subError) {
            console.error('[Delete User] Subscription deletion error:', subError);
        } else {
            console.log('[Delete User] ✓ Deleted from user_subscriptions');
        }

        // Delete workspaces owned by user
        const { error: wsError } = await supabaseAdmin
            .from('workspaces')
            .delete()
            .eq('owner_id', userId);

        if (wsError) {
            console.error('[Delete User] Workspace deletion error:', wsError);
        } else {
            console.log('[Delete User] ✓ Deleted from workspaces');
        }

        // STEP 2: Delete profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (profileError) {
            console.error('[Delete User] Profile deletion error:', profileError);
        } else {
            console.log('[Delete User] ✓ Deleted from profiles');
        }

        // STEP 3: Delete from auth.users LAST
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId as string);

        if (authError) {
            console.error('[Delete User] Auth deletion error:', authError);
            return res.status(500).json({
                error: 'Failed to delete user from authentication',
                details: authError.message
            });
        }

        console.log('[Delete User] ✓ Deleted from auth.users');

        return res.status(200).json({
            success: true,
            message: 'User deleted successfully from all tables'
        });

    } catch (error: any) {
        console.error('[Delete User] Server error:', error);
        return res.status(500).json({
            error: error.message || 'Internal server error'
        });
    }
}

// ============================================
// IMPERSONATE USER
// ============================================
async function handleImpersonateUser(req: VercelRequest, res: VercelResponse) {
    try {
        const { userId, adminId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'Missing user ID' });
        }

        if (!adminId) {
            return res.status(400).json({ error: 'Missing admin ID' });
        }

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

        const role = (adminProfile.role || '').toLowerCase();
        if (role !== 'admin' && role !== 'owner') {
            console.log('Role check failed:', { role, expected: ['admin', 'owner'] });
            return res.status(403).json({ error: `Only admins can impersonate users (your role: ${adminProfile.role})` });
        }

        const { data: targetUser, error: userError } = await supabaseAdmin
            .from('profiles')
            .select('email, name')
            .eq('id', userId)
            .single();

        if (userError || !targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

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

        return res.status(200).json({
            success: true,
            token: linkData.properties?.hashed_token,
            email: targetUser.email,
            userName: targetUser.name,
            actionLink: linkData.properties?.action_link
        });

    } catch (error: any) {
        console.error('Impersonation error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}

// ============================================
// GET GLOBAL STATS (For Admin Dashboard)
// ============================================
async function handleGetGlobalStats(req: VercelRequest, res: VercelResponse) {
    try {
        // Fetch all counts in parallel using service role (bypasses RLS)
        const [
            { count: totalUsers },
            { count: verifiedUsers },
            { data: pagesData, count: totalPages },
            { data: flowsData, count: totalFlows },
            { data: storesData, count: totalStores },
            { data: subscribersData, count: totalSubscribers }
        ] = await Promise.all([
            supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('email_verified', true),
            supabaseAdmin.from('connected_pages').select('id, name, page_id, page_image_url, workspace_id', { count: 'exact' }),
            supabaseAdmin.from('flows').select('id, name, workspace_id', { count: 'exact' }),
            supabaseAdmin.from('stores').select('id, name, slug, workspace_id, created_at', { count: 'exact' }),
            supabaseAdmin.from('subscribers').select('platform', { count: 'exact' })
        ]);

        // Calculate subscriber sources breakdown
        const subscriberTotal = totalSubscribers || 1;
        const facebookCount = (subscribersData || []).filter(s => s.platform === 'FACEBOOK').length;
        const instagramCount = (subscribersData || []).filter(s => s.platform === 'INSTAGRAM').length;
        const otherCount = (subscribersData || []).filter(s => s.platform && s.platform !== 'FACEBOOK' && s.platform !== 'INSTAGRAM').length;

        const subscriberSources = [
            { name: 'TikTok', count: 0, percentage: 0 },
            { name: 'Instagram', count: instagramCount, percentage: Math.round((instagramCount / subscriberTotal) * 100) },
            { name: 'Facebook', count: facebookCount, percentage: Math.round((facebookCount / subscriberTotal) * 100) },
            { name: 'Website', count: otherCount, percentage: Math.round((otherCount / subscriberTotal) * 100) }
        ];

        // Get workspace names for context
        const workspaceIds = [
            ...(pagesData || []).map(p => p.workspace_id),
            ...(flowsData || []).map(f => f.workspace_id),
            ...(storesData || []).map(s => s.workspace_id)
        ].filter(Boolean);

        const uniqueWorkspaceIds = [...new Set(workspaceIds)];

        let workspaceMap: Record<string, string> = {};
        if (uniqueWorkspaceIds.length > 0) {
            const { data: workspaces } = await supabaseAdmin
                .from('workspaces')
                .select('id, name')
                .in('id', uniqueWorkspaceIds);

            workspaces?.forEach(w => {
                workspaceMap[w.id] = w.name;
            });
        }

        return res.status(200).json({
            success: true,
            stats: {
                totalUsers: totalUsers || 0,
                verifiedUsers: verifiedUsers || 0,
                unverifiedUsers: (totalUsers || 0) - (verifiedUsers || 0),
                totalPages: totalPages || 0,
                totalFlows: totalFlows || 0,
                totalStores: totalStores || 0,
                totalSubscribers: totalSubscribers || 0,
                subscriberSources
            },
            lists: {
                pages: (pagesData || []).map(p => ({
                    id: p.id,
                    name: p.name,
                    pageId: p.page_id,
                    imageUrl: p.page_image_url,
                    workspaceName: workspaceMap[p.workspace_id] || 'Unknown'
                })),
                flows: (flowsData || []).map(f => ({
                    id: f.id,
                    name: f.name || 'Untitled Flow',
                    workspaceName: workspaceMap[f.workspace_id] || 'Unknown'
                })),
                stores: (storesData || []).map(s => ({
                    id: s.id,
                    name: s.name || 'Untitled Store',
                    slug: s.slug,
                    workspaceName: workspaceMap[s.workspace_id] || 'Unknown',
                    createdAt: s.created_at
                }))
            }
        });

    } catch (error: any) {
        console.error('[Global Stats] Error:', error);
        return res.status(500).json({ error: error.message || 'Failed to fetch global stats' });
    }
}

// ============================================
// VERIFY/UNVERIFY USER EMAIL
// ============================================
async function handleVerifyUser(req: VercelRequest, res: VercelResponse) {
    try {
        const { userId, verified } = req.body;

        if (!userId || typeof verified !== 'boolean') {
            return res.status(400).json({ error: 'userId and verified (boolean) are required' });
        }

        console.log(`[Verify User] Setting verified=${verified} for user:`, userId);

        // Update profiles table using service role (bypasses RLS)
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({ email_verified: verified })
            .eq('id', userId);

        if (profileError) {
            console.error('[Verify User] Profile update error:', profileError);
            return res.status(500).json({ error: 'Failed to update verification status' });
        }

        // Also update auth.users email_confirmed_at if verifying
        if (verified) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                email_confirm: true
            });
            if (authError) {
                console.error('[Verify User] Auth update error:', authError);
                // Don't fail - profile is already updated
            }
        }

        console.log(`[Verify User] ✓ User ${verified ? 'verified' : 'unverified'}`);

        return res.status(200).json({
            success: true,
            message: `User ${verified ? 'verified' : 'unverified'} successfully`
        });

    } catch (error: any) {
        console.error('[Verify User] Server error:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
