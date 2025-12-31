import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Google Sheets Sync API
 * 
 * This endpoint appends form submission data to a Google Sheet.
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
        const { spreadsheetId, sheetName, data } = req.body;

        if (!spreadsheetId || !data) {
            return res.status(400).json({ error: 'Missing spreadsheetId or data' });
        }

        console.log('[Sheets Sync] Syncing to spreadsheet:', spreadsheetId);
        console.log('[Sheets Sync] Sheet name:', sheetName);
        console.log('[Sheets Sync] Data keys:', Object.keys(data));

        // Option 1: Use Google Apps Script Web App (simplest, no API keys needed)
        const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

        if (webhookUrl) {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    spreadsheetId,
                    sheetName: sheetName || 'Sheet1',
                    rowData: data
                })
            });

            if (!response.ok) {
                throw new Error(`Apps Script error: ${await response.text()}`);
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
                const rowValues = Object.values(data);

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
            data_received: Object.keys(data)
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
