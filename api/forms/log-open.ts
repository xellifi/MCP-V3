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

        // Check if this subscriber already has an open record for this form
        // within the last 24 hours (avoid duplicate entries)
        const { data: existing } = await supabase
            .from('form_opens')
            .select('id, submitted_at')
            .eq('form_id', formId || '')
            .eq('subscriber_id', subscriberId)
            .gte('opened_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('opened_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existing) {
            console.log('[Log Form Open] Already tracked, ID:', existing.id);
            return res.status(200).json({
                success: true,
                message: 'Already tracked',
                formOpenId: existing.id,
                alreadySubmitted: !!existing.submitted_at
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
