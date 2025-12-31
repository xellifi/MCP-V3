import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SubmissionData {
    formId: string;
    subscriberId?: string;
    subscriberName?: string;
    [key: string]: any;
}

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const data: SubmissionData = req.body;
        const { formId, subscriberId, subscriberName, ...fieldData } = data;

        if (!formId) {
            return res.status(400).json({ error: 'Form ID is required' });
        }

        // Verify form exists
        const { data: form, error: formError } = await supabase
            .from('forms')
            .select('id, google_sheet_id, google_sheet_name, fields')
            .eq('id', formId)
            .single();

        if (formError || !form) {
            return res.status(404).json({ error: 'Form not found' });
        }

        // Save submission to database
        const { data: submission, error: submitError } = await supabase
            .from('form_submissions')
            .insert({
                form_id: formId,
                subscriber_external_id: subscriberId || null,
                subscriber_name: subscriberName || null,
                data: fieldData,
                synced_to_sheets: false,
            })
            .select()
            .single();

        if (submitError) {
            console.error('Error saving submission:', submitError);
            return res.status(500).json({ error: 'Failed to save submission' });
        }

        console.log(`📋 Form submission saved: ${submission.id}`);

        // TODO: Sync to Google Sheets if configured
        if (form.google_sheet_id) {
            try {
                // Google Sheets sync would go here
                // For now, just mark as not synced
                console.log(`📊 Google Sheet sync pending for: ${form.google_sheet_id}`);
            } catch (sheetError) {
                console.error('Google Sheets sync error:', sheetError);
            }
        }

        return res.status(200).json({
            success: true,
            submissionId: submission.id
        });
    } catch (err) {
        console.error('Form submission error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
