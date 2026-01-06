import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Consolidated Form Submission API
 * 
 * Routes via ?action= query param:
 * - submit (default): Create new form submission
 * - mark-submitted: Mark form as submitted to prevent follow-ups
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

    const action = req.query.action as string || 'submit';

    try {
        if (action === 'mark-submitted') {
            return handleMarkSubmitted(req, res);
        } else {
            return handleSubmit(req, res);
        }
    } catch (error: any) {
        console.error('[Forms] Exception:', error);
        return res.status(500).json({ error: error.message });
    }
}

async function handleSubmit(req: VercelRequest, res: VercelResponse) {
    const { formId, subscriberId, subscriberName, submissionData } = req.body;

    console.log('[Submit Form] Creating submission for form:', formId);

    if (!formId) {
        return res.status(400).json({ error: 'Missing formId' });
    }

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
}

async function handleMarkSubmitted(req: VercelRequest, res: VercelResponse) {
    const { formId, subscriberId } = req.body;

    console.log('[Mark Submitted] Form:', formId, 'Subscriber:', subscriberId);

    if (!subscriberId) {
        return res.status(400).json({ error: 'Missing subscriberId' });
    }

    const { error } = await supabase
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
    } else {
        console.log('[Mark Submitted] ✓ Marked as submitted');
    }

    return res.status(200).json({ success: true });
}
