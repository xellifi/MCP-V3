import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Server-side form submission handler
 * Uses service role key to bypass RLS policies
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const {
            formId,
            subscriberId,
            subscriberName,
            submissionData
        } = req.body;

        console.log('[Submit Form] Creating submission for form:', formId);
        console.log('[Submit Form] Subscriber:', subscriberId, subscriberName);

        if (!formId) {
            return res.status(400).json({ error: 'Missing formId' });
        }

        // Insert submission using service role key (bypasses RLS)
        const { data: submission, error: insertError } = await supabase
            .from('form_submissions')
            .insert({
                form_id: formId,
                subscriber_external_id: subscriberId || null,
                subscriber_name: subscriberName || 'Guest',
                data: submissionData || {},
                synced_to_sheets: false
            })
            .select('id')
            .single();

        if (insertError) {
            console.error('[Submit Form] Insert error:', insertError);
            return res.status(500).json({
                error: 'Failed to save submission',
                details: insertError.message
            });
        }

        console.log('[Submit Form] ✓ Submission created with ID:', submission.id);

        return res.status(200).json({
            success: true,
            submissionId: submission.id
        });

    } catch (error: any) {
        console.error('[Submit Form] Exception:', error);
        return res.status(500).json({ error: error.message });
    }
}
