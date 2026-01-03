import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Update submission status API
 * Uses service role key to bypass RLS
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { submissionId, status } = req.body;

    if (!submissionId || !status) {
        return res.status(400).json({ error: 'Missing submissionId or status' });
    }

    console.log('[Update Status] Updating:', submissionId, 'to status:', status);

    try {
        // Get current submission data
        const { data: submission, error: fetchError } = await supabase
            .from('form_submissions')
            .select('data, form_id, forms(google_webhook_url, google_sheet_name)')
            .eq('id', submissionId)
            .single();

        if (fetchError || !submission) {
            console.error('[Update Status] Fetch error:', fetchError);
            return res.status(404).json({ error: 'Submission not found' });
        }

        // Merge new status into existing data
        const updatedData = {
            ...(submission.data || {}),
            order_status: status
        };

        // Update the submission
        const { error: updateError } = await supabase
            .from('form_submissions')
            .update({ data: updatedData })
            .eq('id', submissionId);

        if (updateError) {
            console.error('[Update Status] Update error:', updateError);
            return res.status(500).json({ error: 'Failed to update status' });
        }

        console.log('[Update Status] ✓ Status saved successfully');

        // Return the form info for Google Sheets sync
        const form = (submission as any)?.forms;

        return res.status(200).json({
            success: true,
            webhookUrl: form?.google_webhook_url,
            sheetName: form?.google_sheet_name,
            updatedData
        });

    } catch (err: any) {
        console.error('[Update Status] Exception:', err);
        return res.status(500).json({ error: err.message });
    }
}
