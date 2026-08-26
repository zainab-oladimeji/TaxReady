function wrapper(bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
      <h2 style="margin: 0 0 16px;">TaxReady</h2>
      ${bodyHtml}
      <p style="margin-top: 32px; font-size: 12px; color: #888;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;
}

export function verificationEmail(link: string): { subject: string; html: string } {
  return {
    subject: "Verify your TaxReady email",
    html: wrapper(`
      <p>Thanks for signing up. Confirm your email address to activate your account:</p>
      <p><a href="${link}" style="display:inline-block;background:#111;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;">Verify email</a></p>
      <p style="font-size: 13px; color: #666;">This link expires in 24 hours.</p>
    `)
  };
}

export function passwordResetEmail(link: string): { subject: string; html: string } {
  return {
    subject: "Reset your TaxReady password",
    html: wrapper(`
      <p>We received a request to reset your password. Click below to choose a new one:</p>
      <p><a href="${link}" style="display:inline-block;background:#111;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;">Reset password</a></p>
      <p style="font-size: 13px; color: #666;">This link expires in 1 hour.</p>
    `)
  };
}
