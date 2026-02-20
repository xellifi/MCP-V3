import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const FROM_EMAIL = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@mychatpilot.com';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const APP_NAME = 'MyChatPilot';

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetUrl = `${APP_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
        from: `"${APP_NAME}" <${FROM_EMAIL}>`,
        to,
        subject: 'Reset Your Password',
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #4f46e5;">Reset Your Password</h2>
        <p>You requested a password reset. Click the button below to set a new password.</p>
        <p>This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}"
           style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: white;
                  text-decoration: none; border-radius: 8px; font-weight: bold; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #64748b; font-size: 14px;">
          If you didn't request this, you can safely ignore this email.
        </p>
        <p style="color: #64748b; font-size: 14px;">Or copy this link: ${resetUrl}</p>
      </div>
    `,
    });
}

/**
 * Send an email verification email
 */
export async function sendVerificationEmail(to: string, token: string): Promise<void> {
    const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

    await transporter.sendMail({
        from: `"${APP_NAME}" <${FROM_EMAIL}>`,
        to,
        subject: 'Verify Your Email Address',
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #4f46e5;">Verify Your Email</h2>
        <p>Thanks for registering! Please verify your email address to activate your account.</p>
        <a href="${verifyUrl}"
           style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: white;
                  text-decoration: none; border-radius: 8px; font-weight: bold; margin: 16px 0;">
          Verify Email
        </a>
        <p style="color: #64748b; font-size: 14px;">
          This link expires in <strong>24 hours</strong>.
        </p>
        <p style="color: #64748b; font-size: 14px;">Or copy this link: ${verifyUrl}</p>
      </div>
    `,
    });
}
