import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Delete submission API
 * Uses service role key to bypass RLS
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'DELETE' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { submissionId } = req.body;

    if (!submissionId) {
        return res.status(400).json({ error: 'Missing submissionId' });
    }

    console.log('[Delete Submission]', submissionId);

    try {
        const { error } = await supabase
            .from('form_submissions')
            .delete()
            .eq('id', submissionId);

        if (error) {
            console.error('[Delete Submission] Error:', error);
            return res.status(500).json({ error: 'Failed to delete submission' });
        }

        console.log('[Delete Submission] ✓ Deleted successfully');
        return res.status(200).json({ success: true });

    } catch (err: any) {
        console.error('[Delete Submission] Exception:', err);
        return res.status(500).json({ error: err.message });
    }
}
