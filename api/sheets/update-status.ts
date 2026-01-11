import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Google Sheets Status Update API
 * 
 * This endpoint updates the status column of an existing order in Google Sheets.
 * It works by calling the same Apps Script webhook with a special "update" action.
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const {
            webhookUrl,
            spreadsheetId,
            sheetName,
            orderId,
            newStatus,
            updatedAt
        } = req.body;

        if (!orderId || !newStatus) {
            return res.status(400).json({ error: 'Missing orderId or newStatus' });
        }

        console.log('[Sheets Update] Updating order status');
        console.log('[Sheets Update] Order ID:', orderId);
        console.log('[Sheets Update] New Status:', newStatus);

        const targetWebhookUrl = webhookUrl || process.env.GOOGLE_SHEETS_WEBHOOK_URL;

        if (!targetWebhookUrl) {
            console.log('[Sheets Update] No webhook URL configured, skipping sync');
            return res.status(200).json({
                success: false,
                message: 'No webhook configured'
            });
        }

        // Call the Apps Script webhook with "update" action
        // The Apps Script needs to handle this action by finding the row and updating the status
        const payload = {
            action: 'updateStatus',
            orderId: orderId,
            newStatus: newStatus,
            updatedAt: updatedAt || new Date().toISOString(),
            spreadsheetId: spreadsheetId,
            sheetName: sheetName || 'Sheet1'
        };

        console.log('[Sheets Update] Calling webhook:', targetWebhookUrl.substring(0, 60) + '...');

        const response = await fetch(targetWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        console.log('[Sheets Update] Webhook response:', responseText);

        if (!response.ok) {
            throw new Error(`Apps Script error: ${responseText}`);
        }

        console.log('[Sheets Update] ✓ Status updated in Google Sheets');
        return res.status(200).json({ success: true });

    } catch (error: any) {
        console.error('[Sheets Update] Error:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
