import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../../lib/db';
import { signToken } from '../../lib/jwt';

export default async function handler(req: Request, res: Response) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user by email
        const user = await queryOne<any>(
            'SELECT id, email, name, password_hash, role, email_verified, avatar_url FROM profiles WHERE email = $1',
            [email.toLowerCase().trim()]
        );

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!user.password_hash) {
            return res.status(401).json({ error: 'This account uses a different login method' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check email verification
        if (!user.email_verified) {
            return res.status(403).json({ error: 'Email not confirmed. Please verify your email first.' });
        }

        // Sign JWT
        const token = signToken({
            userId: user.id,
            email: user.email,
            role: user.role || 'user',
        });

        return res.status(200).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: (user.role?.toUpperCase() || 'MEMBER'),
                avatarUrl: user.avatar_url,
                isEmailVerified: user.email_verified,
            },
        });
    } catch (error: any) {
        console.error('[Login] Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
