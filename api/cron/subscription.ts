// Subscription Expiry Cron Handler
import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from './shared';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('[Subscription Expiry Cron] Starting...');
    console.log('[Subscription Expiry Cron] Time:', new Date().toISOString());

    let expiredCount = 0;
    let checkedCount = 0;

    try {
        const now = new Date();

        // Find Active subscriptions that have passed their next_billing_date
        // Exclude Lifetime subscriptions
        const { data: expiredSubs, error: fetchError } = await supabase
            .from('user_subscriptions')
            .select('id, user_id, package_id, billing_cycle, next_billing_date')
            .eq('status', 'Active')
            .neq('billing_cycle', 'Lifetime')
            .not('next_billing_date', 'is', null)
            .lt('next_billing_date', now.toISOString());

        if (fetchError) {
            console.error('[Subscription Expiry Cron] Error fetching subscriptions:', fetchError.message);
            return res.status(500).json({ error: fetchError.message });
        }

        checkedCount = expiredSubs?.length || 0;
        console.log(`[Subscription Expiry Cron] Found ${checkedCount} expired subscriptions`);

        // Update each expired subscription
        for (const sub of expiredSubs || []) {
            try {
                const { error: updateError } = await supabase
                    .from('user_subscriptions')
                    .update({
                        status: 'expired',
                        updated_at: now.toISOString()
                    })
                    .eq('id', sub.id);

                if (updateError) {
                    console.error(`[Subscription Expiry Cron] Failed to update ${sub.id}:`, updateError.message);
                    continue;
                }

                expiredCount++;
                console.log(`[Subscription Expiry Cron] ✓ Expired subscription ${sub.id} for user ${sub.user_id}`);
            } catch (err: any) {
                console.error(`[Subscription Expiry Cron] Error updating ${sub.id}:`, err.message);
            }
        }

        console.log(`[Subscription Expiry Cron] Complete. Checked: ${checkedCount}, Expired: ${expiredCount}`);

        return res.status(200).json({
            success: true,
            summary: `Checked: ${checkedCount}, Expired: ${expiredCount}`,
            checked: checkedCount,
            expired: expiredCount
        });

    } catch (error: any) {
        console.error('[Subscription Expiry Cron] Exception:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
