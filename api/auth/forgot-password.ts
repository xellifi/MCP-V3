import { Request, Response } from 'express';
import crypto from 'crypto';
import { queryOne, query } from '../../lib/db';
import { sendPasswordResetEmail } from '../../lib/mailer';

export default async function handler(req: Request, res: Response) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const emailLower = email.toLowerCase().trim();

        // Always return success to prevent email enumeration
        const user = await queryOne<any>(
            'SELECT id, email FROM profiles WHERE email = $1',
            [emailLower]
        );

        if (user) {
            // Invalidate any existing unused tokens
            await query(
                `UPDATE password_reset_tokens SET used_at = NOW()
         WHERE user_id = $1 AND used_at IS NULL`,
                [user.id]
            );

            // Generate secure token
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

            await query(
                `INSERT INTO password_reset_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
                [user.id, token, expiresAt]
            );

            // Send email (non-blocking)
            sendPasswordResetEmail(emailLower, token).catch((err) => {
                console.error('[ForgotPassword] Email send failed:', err.message);
            });
        }

        // Always return the same response
        return res.status(200).json({
            message: 'If an account with that email exists, a reset link has been sent.',
        });
    } catch (error: any) {
        console.error('[ForgotPassword] Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
