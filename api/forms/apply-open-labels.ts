import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Apply labels when form is opened (Open Form button clicked)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { flowId, nodeId, subscriberId } = req.body;

        console.log('[Apply Open Labels] Request:', { flowId, nodeId, subscriberId });

        if (!flowId || !nodeId || !subscriberId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get the flow to read the form node configuration
        const { data: flow, error: flowError } = await supabase
            .from('flows')
            .select('configurations, workspace_id')
            .eq('id', flowId)
            .single();

        if (flowError || !flow) {
            console.error('[Apply Open Labels] Flow not found:', flowError);
            return res.status(404).json({ error: 'Flow not found' });
        }

        const configurations = flow.configurations || {};
        const formNodeConfig = configurations[nodeId] || {};
        const addLabel = formNodeConfig.openAddLabel;
        const removeLabel = formNodeConfig.openRemoveLabel;

        if (!addLabel && !removeLabel) {
            return res.status(200).json({ success: true, message: 'No open labels configured' });
        }

        console.log('[Apply Open Labels] Labels to apply:', { addLabel, removeLabel });

        // Get current subscriber
        const { data: subscriber, error: subError } = await supabase
            .from('subscribers')
            .select('id, labels')
            .eq('workspace_id', flow.workspace_id)
            .eq('external_id', subscriberId)
            .single();

        if (subError || !subscriber) {
            console.log('[Apply Open Labels] Subscriber not found:', subError);
            return res.status(200).json({ success: true, message: 'Subscriber not found' });
        }

        let labels: string[] = subscriber.labels || [];

        // Remove label if specified
        if (removeLabel) {
            labels = labels.filter((l: string) => l.toLowerCase() !== removeLabel.toLowerCase());
        }

        // Add label if specified and not already present
        if (addLabel && !labels.some((l: string) => l.toLowerCase() === addLabel.toLowerCase())) {
            labels.push(addLabel);
        }

        // Update subscriber labels
        const { error: updateError } = await supabase
            .from('subscribers')
            .update({ labels })
            .eq('id', subscriber.id);

        if (updateError) {
            console.error('[Apply Open Labels] Update error:', updateError);
            return res.status(500).json({ error: 'Failed to update labels' });
        }

        console.log('[Apply Open Labels] ✓ Labels updated:', labels);

        return res.status(200).json({ success: true, labels });

    } catch (error: any) {
        console.error('[Apply Open Labels] Exception:', error);
        return res.status(500).json({ error: error.message });
    }
}
