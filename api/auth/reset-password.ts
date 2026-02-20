import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { queryOne, query } from '../../lib/db';

export default async function handler(req: Request, res: Response) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ error: 'Token and password are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        // Validate token
        const resetToken = await queryOne<any>(
            `SELECT id, user_id, expires_at, used_at
       FROM password_reset_tokens
       WHERE token = $1`,
            [token]
        );

        if (!resetToken) {
            return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
        }

        if (resetToken.used_at) {
            return res.status(400).json({ error: 'This reset link has already been used.' });
        }

        if (new Date(resetToken.expires_at) < new Date()) {
            return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);

        // Update password
        await query(
            'UPDATE profiles SET password_hash = $1 WHERE id = $2',
            [passwordHash, resetToken.user_id]
        );

        // Mark token as used
        await query(
            'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
            [resetToken.id]
        );

        return res.status(200).json({ message: 'Password reset successfully. You can now log in.' });
    } catch (error: any) {
        console.error('[ResetPassword] Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
