import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get node analytics for a flow
 * Returns analytics for all nodes in the flow
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { flowId } = req.query;

        if (!flowId || typeof flowId !== 'string') {
            return res.status(400).json({ error: 'Missing flowId' });
        }

        const { data, error } = await supabase
            .from('node_analytics')
            .select('node_id, sent_count, delivered_count, subscriber_count, error_count')
            .eq('flow_id', flowId);

        if (error) {
            console.error('[Node Analytics] Error:', error);
            return res.status(500).json({ error: 'Failed to fetch analytics' });
        }

        // Transform to nodeId -> analytics map
        const analyticsMap: Record<string, any> = {};
        data?.forEach((item: any) => {
            analyticsMap[item.node_id] = {
                sent: item.sent_count || 0,
                delivered: item.delivered_count || 0,
                subscribers: item.subscriber_count || 0,
                errors: item.error_count || 0
            };
        });

        return res.status(200).json(analyticsMap);

    } catch (error: any) {
        console.error('[Node Analytics] Exception:', error);
        return res.status(500).json({ error: error.message });
    }
}
