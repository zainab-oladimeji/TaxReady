import { Resend } from "resend";

/**
 * Wraps Resend so the rest of the app never touches the SDK or the
 * "what if there's no API key" branch directly. Resend's free tier
 * (100 emails/day, no credit card) is enough for verification and
 * password-reset email in a small app.
 *
 * This function deliberately NEVER throws. Two reasons:
 *   1. If RESEND_API_KEY isn't set, we log the email to the server console
 *      instead of sending it — so local dev and any environment without
 *      email configured yet keeps working end-to-end (copy the link from
 *      the terminal instead of receiving a real email).
 *   2. If Resend itself rejects the send — most commonly because the
 *      account hasn't verified a domain yet, which restricts sending to
 *      only the account owner's own email address — that must NOT take
 *      down the calling request. Registration and password reset both
 *      create/modify real data (a user account, a reset token) *before*
 *      sending the email; a delivery failure after that point is a
 *      notification problem, not a reason to fail the whole request and
 *      leave the caller thinking nothing happened when it did.
 *
 * Either way, the full email content (including the actual verification/
 * reset link) is always logged server-side, so it's recoverable from
 * Vercel's Logs tab even when delivery fails — this is what makes it safe
 * to keep testing with arbitrary email addresses before a domain is
 * verified on Resend.
 */

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "TaxReady <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY not set — email NOT sent. Would have sent to ${input.to}:\n` +
        `Subject: ${input.subject}\n${input.html}`
    );
    return { sent: false };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    // Sending a plain-text alternative alongside HTML makes the message a
    // proper multipart email — spam filters treat HTML-only sends (especially
    // ones that are mostly a single button, which every email here used to
    // be) as a strong spam signal, particularly from a domain with no
    // sending history yet. See lib/email/templates.ts.
    text: input.text
  });

  if (error) {
    console.error(
      `[email] Resend rejected the send to ${input.to} — see error below. Full content logged so the ` +
        `link isn't lost:\nSubject: ${input.subject}\n${input.html}`,
      error
    );
    return { sent: false };
  }

  return { sent: true };
}

export function appBaseUrl(): string {
  // AUTH_URL is what Auth.js itself reads in production (see auth.ts).
  // VERCEL_URL is set automatically by Vercel on every deployment as a
  // fallback in case AUTH_URL hasn't been explicitly configured yet.
  if (process.env.AUTH_URL) return process.env.AUTH_URL;
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
