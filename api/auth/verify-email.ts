import { Request, Response } from 'express';
import { queryOne, query } from '../../lib/db';

export default async function handler(req: Request, res: Response) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const token = (req.query.token || req.body.token) as string;

        if (!token) {
            return res.status(400).json({ error: 'Verification token is required' });
        }

        // Find the token
        const verifyToken = await queryOne<any>(
            `SELECT id, user_id, expires_at, used_at
       FROM email_verification_tokens
       WHERE token = $1`,
            [token]
        );

        if (!verifyToken) {
            return res.status(400).json({ error: 'Invalid verification link' });
        }

        if (verifyToken.used_at) {
            return res.status(400).json({ error: 'This verification link has already been used' });
        }

        if (new Date(verifyToken.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Verification link has expired. Please register again.' });
        }

        // Mark email as verified
        await query(
            'UPDATE profiles SET email_verified = true WHERE id = $1',
            [verifyToken.user_id]
        );

        // Mark token as used
        await query(
            'UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1',
            [verifyToken.id]
        );

        return res.status(200).json({ message: 'Email verified successfully. You can now log in.' });
    } catch (error: any) {
        console.error('[VerifyEmail] Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
