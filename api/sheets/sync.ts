import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Google Sheets Sync API
 * 
 * This endpoint:
 * 1. Appends form submission data to a Google Sheet (default)
 * 2. Updates order status in existing row (when action='updateStatus')
 * 
 * SETUP REQUIRED:
 * 1. Share your Google Sheet with "Anyone with the link can edit"
 * 2. Create a Google Apps Script Web App (see instructions below)
 * 3. Set the GOOGLE_SHEETS_WEBHOOK_URL environment variable
 * 
 * OR use direct Google Sheets API with a service account:
 * - Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY env vars
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { action, webhookUrl, spreadsheetId, sheetName, rowData, data, orderId, newStatus, updatedAt, workspaceId } = req.body;

        // Handle status update action
        if (action === 'updateStatus') {
            console.log('[Sheets Sync] Updating order status:', orderId, '->', newStatus);

            // Get webhook URL - try multiple sources
            let targetWebhookUrl = webhookUrl || process.env.GOOGLE_SHEETS_WEBHOOK_URL;

            // If no webhook URL yet, try to get from workspace or flow
            if (!targetWebhookUrl && (workspaceId || orderId)) {
                console.log('[Sheets Sync] No webhook URL provided, looking up...');
                try {
                    const { createClient } = await import('@supabase/supabase-js');
                    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
                    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
                    const supabase = createClient(supabaseUrl, supabaseKey);

                    let wsId = workspaceId;

                    // If no workspaceId provided, get it from order
                    if (!wsId && orderId) {
                        console.log('[Sheets Sync] Getting workspace from order:', orderId);
                        const { data: order } = await supabase
                            .from('orders')
                            .select('workspace_id, source, metadata')
                            .eq('id', orderId)
                            .single();
                        wsId = order?.workspace_id;
                    }

                    if (wsId) {
                        console.log('[Sheets Sync] Looking up webhook URL for workspace:', wsId);

                        // Try 1: Get webhook URL from workspace settings
                        const { data: workspace } = await supabase
                            .from('workspaces')
                            .select('google_webhook_url')
                            .eq('id', wsId)
                            .single();

                        if (workspace?.google_webhook_url) {
                            targetWebhookUrl = workspace.google_webhook_url;
                            console.log('[Sheets Sync] ✓ Found webhook URL from workspace');
                        } else {
                            console.log('[Sheets Sync] Workspace has no google_webhook_url, checking flows...');

                            // Try 2: Look for a flow with a Google Sheets node in this workspace
                            const { data: flows } = await supabase
                                .from('flows')
                                .select('nodes')
                                .eq('workspace_id', wsId)
                                .limit(10);

                            if (flows) {
                                for (const flow of flows) {
                                    const nodes = flow.nodes || [];
                                    for (const node of nodes) {
                                        // Check if it's a Google Sheets node with webhookUrl
                                        const nodeData = node.data || {};
                                        const config = nodeData.config || nodeData;
                                        if (config.webhookUrl &&
                                            (node.type === 'sheetsNode' ||
                                                nodeData.nodeType === 'sheetsNode' ||
                                                (nodeData.label || '').toLowerCase().includes('sheet'))) {
                                            targetWebhookUrl = config.webhookUrl;
                                            console.log('[Sheets Sync] ✓ Found webhook URL from flow Google Sheets node');
                                            break;
                                        }
                                    }
                                    if (targetWebhookUrl) break;
                                }
                            }
                        }
                    } else {
                        console.log('[Sheets Sync] Could not determine workspace ID');
                    }
                } catch (err) {
                    console.error('[Sheets Sync] Error looking up webhook URL:', err);
                }
            }

            if (!targetWebhookUrl) {
                console.log('[Sheets Sync] No webhook URL configured, skipping status update');
                return res.status(200).json({ success: false, message: 'No webhook configured' });
            }

            if (!orderId || !newStatus) {
                return res.status(400).json({ error: 'Missing orderId or newStatus' });
            }

            console.log('[Sheets Sync] ========== SENDING STATUS UPDATE ==========');
            console.log('[Sheets Sync] Order ID:', orderId);
            console.log('[Sheets Sync] New Status:', newStatus);
            console.log('[Sheets Sync] Sheet Name:', sheetName || 'Sheet1');
            console.log('[Sheets Sync] Webhook URL:', targetWebhookUrl.substring(0, 60) + '...');

            // Call Apps Script with updateStatus action
            const requestBody = {
                action: 'updateStatus',
                orderId: orderId,
                newStatus: newStatus,
                updatedAt: updatedAt || new Date().toISOString(),
                sheetName: sheetName || 'Sheet1'
            };
            console.log('[Sheets Sync] Request body:', JSON.stringify(requestBody));

            const response = await fetch(targetWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const responseText = await response.text();
            console.log('[Sheets Sync] ========== APPS SCRIPT RESPONSE ==========');
            console.log('[Sheets Sync] Status:', response.status);
            console.log('[Sheets Sync] Response:', responseText);

            // Try to parse the response to get more details
            let responseData: any = {};
            try {
                responseData = JSON.parse(responseText);
                if (responseData.error) {
                    console.error('[Sheets Sync] ❌ Apps Script error:', responseData.error);
                } else if (responseData.success) {
                    console.log('[Sheets Sync] ✓ Update successful, row:', responseData.row);
                }
            } catch (e) {
                console.log('[Sheets Sync] Response is not JSON');
            }

            if (!response.ok) {
                throw new Error(`Apps Script error: ${responseText}`);
            }

            return res.status(200).json({ success: true, action: 'updateStatus', details: responseData });
        }

        // Default action: Append new row
        const submissionData = rowData || data;

        if (!submissionData) {
            return res.status(400).json({ error: 'Missing data' });
        }

        console.log('[Sheets Sync] Sheet name:', sheetName);
        console.log('[Sheets Sync] Data keys:', Object.keys(submissionData));
        if (spreadsheetId) {
            console.log('[Sheets Sync] Syncing to spreadsheet:', spreadsheetId);
        }

        // Option 1: Use per-form webhook URL (SaaS approach - each user has their own)
        const targetWebhookUrl = webhookUrl || process.env.GOOGLE_SHEETS_WEBHOOK_URL;

        if (targetWebhookUrl) {
            console.log('[Sheets Sync] Calling webhook:', targetWebhookUrl.substring(0, 60) + '...');

            // Build payload - only include spreadsheetId if provided
            const payload: any = {
                sheetName: sheetName || 'Sheet1',
                rowData: submissionData
            };
            if (spreadsheetId) {
                payload.spreadsheetId = spreadsheetId;
            }

            const response = await fetch(targetWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const responseText = await response.text();
            console.log('[Sheets Sync] Webhook response:', responseText);

            if (!response.ok) {
                throw new Error(`Apps Script error: ${responseText}`);
            }

            console.log('[Sheets Sync] ✓ Data synced via Apps Script');
            return res.status(200).json({ success: true, method: 'apps_script' });
        }

        // Option 2: Direct API with Service Account (requires setup)
        const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const privateKey = process.env.GOOGLE_PRIVATE_KEY;

        if (serviceEmail && privateKey) {
            // Use googleapis library for direct API call
            // This requires more setup but works without user interaction
            const accessToken = await getGoogleAccessToken(serviceEmail, privateKey);

            if (accessToken) {
                // Prepare row data (flatten object to array of values)
                const rowValues = Object.values(submissionData);

                const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName || 'Sheet1')}!A:Z:append?valueInputOption=USER_ENTERED`;

                const response = await fetch(appendUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        values: [rowValues]
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error?.message || 'Google Sheets API error');
                }

                console.log('[Sheets Sync] ✓ Data synced via Sheets API');
                return res.status(200).json({ success: true, method: 'sheets_api' });
            }
        }

        // Option 3: No configuration - log for manual sync
        console.log('[Sheets Sync] ⚠ No sync method configured. Data not sent to sheets.');
        console.log('[Sheets Sync] To enable sync, set either:');
        console.log('  - GOOGLE_SHEETS_WEBHOOK_URL (Apps Script Web App)');
        console.log('  - GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY');

        // Still return success so form submission doesn't fail
        return res.status(200).json({
            success: false,
            message: 'No sync method configured. See server logs for setup instructions.',
            data_received: Object.keys(submissionData)
        });

    } catch (error: any) {
        console.error('[Sheets Sync] Error:', error.message);
        return res.status(500).json({ error: error.message });
    }
}

// Get Google access token using service account
async function getGoogleAccessToken(email: string, privateKey: string): Promise<string | null> {
    try {
        // Create JWT for Google OAuth
        const now = Math.floor(Date.now() / 1000);
        const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
        const payload = Buffer.from(JSON.stringify({
            iss: email,
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600,
            iat: now
        })).toString('base64url');

        // Sign the JWT (requires crypto)
        const crypto = await import('crypto');
        const sign = crypto.createSign('RSA-SHA256');
        sign.update(`${header}.${payload}`);
        const signature = sign.sign(privateKey.replace(/\\n/g, '\n'), 'base64url');

        const jwt = `${header}.${payload}.${signature}`;

        // Exchange JWT for access token
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
        });

        if (!response.ok) {
            console.error('[Sheets Sync] Token exchange failed:', await response.text());
            return null;
        }

        const tokenData = await response.json();
        return tokenData.access_token;
    } catch (error) {
        console.error('[Sheets Sync] Error getting access token:', error);
        return null;
    }
}
