import { Resend } from "resend";

/**
 * Wraps Resend so the rest of the app never touches the SDK or the
 * "what if there's no API key" branch directly. Resend's free tier
 * (100 emails/day, no credit card) is enough for verification and
 * password-reset email in a small app.
 *
 * If RESEND_API_KEY isn't set, this logs the email to the server console
 * instead of throwing — so local development and any environment that
 * hasn't configured email yet keeps working (you can copy the link from
 * the terminal instead of receiving a real email). This is intentional
 * degradation, not a silent failure: it's clearly logged.
 */

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "TaxReady <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn(
      `[email] RESEND_API_KEY not set — email NOT sent. Would have sent to ${input.to}:\n` +
        `Subject: ${input.subject}\n${input.html}`
    );
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html
  });

  if (error) {
    console.error("[email] Resend failed to send", error);
    throw new Error("Could not send email right now.");
  }
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
