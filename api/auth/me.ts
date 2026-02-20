import { Request, Response } from 'express';
import { queryOne } from '../../lib/db';

export default async function handler(req: Request, res: Response) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // req.user is set by requireAuth middleware in server.cjs
        const { userId } = (req as any).user;

        const profile = await queryOne<any>(
            `SELECT id, email, name, role, avatar_url, affiliate_code, email_verified, auth_provider
       FROM profiles WHERE id = $1`,
            [userId]
        );

        if (!profile) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.status(200).json({
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: (profile.role?.toUpperCase() || 'MEMBER'),
            avatarUrl: profile.avatar_url,
            affiliateCode: profile.affiliate_code,
            isEmailVerified: profile.email_verified,
            authProvider: profile.auth_provider,
        });
    } catch (error: any) {
        console.error('[Me] Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
