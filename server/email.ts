import crypto from "crypto";

const RESEND_API_URL = "https://api.resend.com/emails";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not configured — email not sent to", options.to);
    return false;
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Zyra <noreply@zyra.host>",
        to: [options.to],
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Email send failed:", res.status, err);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Email send error:", err);
    return false;
  }
}

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getVerificationExpiry(): Date {
  const expires = new Date();
  expires.setHours(expires.getHours() + 24);
  return expires;
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  fullName: string | null
): Promise<boolean> {
  const domain = process.env.FRONTEND_URL
    || (process.env.REPLIT_DOMAINS?.split(",")[0] ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "http://localhost:5000");
  const resetUrl = `${domain}/reset-password?token=${token}`;
  const name = fullName || "there";

  return sendEmail({
    to: email,
    subject: "Reset your Zyra password",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background: #6366f1; border-radius: 12px; margin-bottom: 16px;">
            <span style="color: white; font-weight: bold; font-size: 20px;">Z</span>
          </div>
          <h1 style="margin: 0; font-size: 24px; color: #111;">Reset your password</h1>
        </div>
        <p style="color: #444; font-size: 15px; line-height: 1.6;">Hi ${name},</p>
        <p style="color: #444; font-size: 15px; line-height: 1.6;">
          We received a request to reset your password. Click the button below to choose a new password.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Reset Password
          </a>
        </div>
        <p style="color: #888; font-size: 13px; line-height: 1.5;">
          This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="color: #aaa; font-size: 12px; text-align: center;">
          Zyra — AI-Native Cybersecurity Platform
        </p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(
  email: string,
  token: string,
  fullName: string | null
): Promise<boolean> {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:5000";
  const protocol = domain.includes("localhost") ? "http" : "https";
  const verifyUrl = `${protocol}://${domain}/verify-email?token=${token}`;

  const name = fullName || "there";

  return sendEmail({
    to: email,
    subject: "Verify your Zyra account",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background: #6366f1; border-radius: 12px; margin-bottom: 16px;">
            <span style="color: white; font-weight: bold; font-size: 20px;">Z</span>
          </div>
          <h1 style="margin: 0; font-size: 24px; color: #111;">Verify your email</h1>
        </div>
        <p style="color: #444; font-size: 15px; line-height: 1.6;">Hi ${name},</p>
        <p style="color: #444; font-size: 15px; line-height: 1.6;">
          Thanks for creating a Zyra account. Please verify your email address by clicking the button below.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #888; font-size: 13px; line-height: 1.5;">
          This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="color: #aaa; font-size: 12px; text-align: center;">
          Zyra — AI-Native Cybersecurity Platform
        </p>
      </div>
    `,
  });
}
