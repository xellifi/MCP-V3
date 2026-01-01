import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Mark Form Submitted API
 * 
 * Called when a user submits a form. Updates the form_opens record
 * to prevent follow-up messages from being sent.
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
        const { formId, subscriberId } = req.body;

        console.log('[Mark Submitted] Form:', formId, 'Subscriber:', subscriberId);

        if (!subscriberId) {
            return res.status(400).json({ error: 'Missing subscriberId' });
        }

        // Update the most recent form_opens record for this subscriber
        const { data, error } = await supabase
            .from('form_opens')
            .update({
                submitted_at: new Date().toISOString()
            })
            .eq('subscriber_id', subscriberId)
            .is('submitted_at', null)
            .order('opened_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('[Mark Submitted] Error:', error);
            // Don't fail - this is not critical
        } else {
            console.log('[Mark Submitted] ✓ Marked as submitted');
        }

        return res.status(200).json({ success: true });

    } catch (error: any) {
        console.error('[Mark Submitted] Exception:', error.message);
        // Don't fail the form submission
        return res.status(200).json({ success: true });
    }
}
