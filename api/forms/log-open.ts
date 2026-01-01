import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Log Form Open API
 * 
 * Called when a user opens a form page. This allows us to track
 * users who opened but didn't submit (for follow-up messages).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Allow CORS for form pages
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const {
            formId,
            flowId,
            nodeId,
            pageId,
            subscriberId,
            subscriberName
        } = req.body;

        console.log('[Log Form Open] Form:', formId, 'Subscriber:', subscriberId);

        if (!subscriberId) {
            return res.status(400).json({ error: 'Missing subscriberId' });
        }

        // Only deduplicate if same subscriber opened this form within last 5 minutes
        // and hasn't submitted yet. This allows re-orders to be tracked separately.
        const DEDUP_MINUTES = 5;
        const { data: existing } = await supabase
            .from('form_opens')
            .select('id, submitted_at, opened_at')
            .eq('form_id', formId || '')
            .eq('subscriber_id', subscriberId)
            .is('submitted_at', null) // Only check unsubmitted forms
            .gte('opened_at', new Date(Date.now() - DEDUP_MINUTES * 60 * 1000).toISOString())
            .order('opened_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existing) {
            // Recent unsubmitted open exists - just update the timestamp
            console.log('[Log Form Open] Recent open exists, updating:', existing.id);
            await supabase
                .from('form_opens')
                .update({ opened_at: new Date().toISOString() })
                .eq('id', existing.id);

            return res.status(200).json({
                success: true,
                message: 'Updated existing open',
                formOpenId: existing.id
            });
        }

        // Insert new form open record
        const { data: newRecord, error } = await supabase
            .from('form_opens')
            .insert({
                form_id: formId || null,
                flow_id: flowId || null,
                node_id: nodeId || null,
                page_id: pageId || null,
                subscriber_id: subscriberId,
                subscriber_name: subscriberName || null,
                opened_at: new Date().toISOString(),
                submitted_at: null,
                followup_count: 0
            })
            .select()
            .single();

        if (error) {
            console.error('[Log Form Open] Error:', error);
            return res.status(500).json({ error: error.message });
        }

        console.log('[Log Form Open] ✓ Logged open:', newRecord.id);
        return res.status(200).json({
            success: true,
            formOpenId: newRecord.id
        });

    } catch (error: any) {
        console.error('[Log Form Open] Exception:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
