import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query, queryOne, withTransaction } from '../../lib/db';
import { signToken } from '../../lib/jwt';
import { sendVerificationEmail } from '../../lib/mailer';

const DISPOSABLE_EMAIL_DOMAINS = [
    'tempmail.com', 'throwaway.email', '10minutemail.com', 'guerrillamail.com',
    'mailinator.com', 'yopmail.com', 'fakeinbox.com', 'getnada.com',
    'temp-mail.org', 'discard.email', 'trashmail.com', 'mohmal.com',
];

export default async function handler(req: Request, res: Response) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        const emailLower = email.toLowerCase().trim();
        const domain = emailLower.split('@')[1];

        if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
            return res.status(400).json({ error: 'Disposable email addresses are not allowed' });
        }

        // Check if user already exists
        const existing = await queryOne('SELECT id FROM profiles WHERE email = $1', [emailLower]);
        if (existing) {
            return res.status(400).json({ error: 'An account with this email already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);

        // Generate verification token
        const verifyToken = crypto.randomBytes(32).toString('hex');
        const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await withTransaction(async (client) => {
            // Create profile
            const profileResult = await client.query(
                `INSERT INTO profiles (id, email, name, password_hash, role, email_verified, avatar_url)
         VALUES (gen_random_uuid(), $1, $2, $3, 'user', false, $4)
         RETURNING id`,
                [
                    emailLower,
                    name.trim(),
                    passwordHash,
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                ]
            );

            const userId = profileResult.rows[0].id;

            // Save email verification token
            await client.query(
                `INSERT INTO email_verification_tokens (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
                [userId, verifyToken, verifyExpiry]
            );

            // Create default workspace
            await client.query(
                `INSERT INTO workspaces (id, name, owner_id)
         VALUES (gen_random_uuid(), $1, $2)`,
                [`${name}'s Workspace`, userId]
            );

            // Assign free subscription (if packages table exists with a free plan)
            const freePkg = await client.query(
                `SELECT id FROM packages WHERE LOWER(name) LIKE '%free%' AND is_active = true LIMIT 1`
            );
            if (freePkg.rows.length > 0) {
                await client.query(
                    `INSERT INTO user_subscriptions (user_id, package_id, status, billing_cycle, amount, next_billing_date, payment_method)
           VALUES ($1, $2, 'Active', 'monthly', 0, $3, 'free')`,
                    [userId, freePkg.rows[0].id, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
                );
            }
        });

        // Send verification email (don't block response on failure)
        sendVerificationEmail(emailLower, verifyToken).catch((err) => {
            console.error('[Register] Failed to send verification email:', err.message);
        });

        return res.status(201).json({
            message: 'Account created. Please check your email to verify your account.',
        });
    } catch (error: any) {
        console.error('[Register] Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
