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
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, password, name, packageId } = req.body;

        // Validate inputs
        if (!email || !password || !name || !packageId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Create user with Supabase Admin API
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

            // Provide specific error messages
            if (authError.message?.includes('already registered') || authError.message?.includes('already been registered')) {
                return res.status(400).json({
                    error: 'A user with this email address already exists. Please use a different email or contact support.'
                });
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

            // Generic error fallback
            return res.status(400).json({
                error: authError.message || 'Failed to create user account'
            });
        }

        if (!authData.user) {
            return res.status(500).json({ error: 'Failed to create user' });
        }

        // Wait a moment for trigger to create profile
        await new Promise(resolve => setTimeout(resolve, 500));

        // Update profile with name (in case trigger didn't set it)
        await supabaseAdmin
            .from('profiles')
            .update({ name })
            .eq('id', authData.user.id);

        // Get package details
        const { data: packageData, error: packageError } = await supabaseAdmin
            .from('packages')
            .select('*')
            .eq('id', packageId)
            .single();

        if (packageError || !packageData) {
            return res.status(400).json({ error: 'Package not found' });
        }

        // Create subscription
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
