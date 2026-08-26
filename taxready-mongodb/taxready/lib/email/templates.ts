/**
 * Every template here returns both `html` and `text`. Sending a plain-text
 * alternative alongside the HTML body isn't just a nicety — mail providers'
 * spam filters treat HTML-only, mostly-a-single-button emails (exactly what
 * these were before) as a strong spam signal, especially from a sending
 * domain with no history yet. A proper multipart email with real body text
 * reads as legitimate correspondence instead of a template blast.
 */

function wrapper(bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
      <h2 style="margin: 0 0 16px;">TaxReady</h2>
      ${bodyHtml}
      <hr style="margin: 32px 0 16px; border: none; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888; line-height: 1.6;">
        TaxReady helps African businesses organize transactions, receipts, and tax-readiness records.
        This is a transactional email sent because an action was taken on taxready.dpdns.org — if you
        didn't request it, you can safely ignore it and no account changes will happen.
      </p>
      <p style="font-size: 12px; color: #888;">
        Questions? Reply to this email or reach us through the app.
      </p>
    </div>
  `;
}

function textFooter(): string {
  return (
    "\n\n---\n" +
    "TaxReady helps African businesses organize transactions, receipts, and tax-readiness records.\n" +
    "This is a transactional email sent because an action was taken on taxready.dpdns.org — if you " +
    "didn't request it, you can safely ignore it and no account changes will happen.\n" +
    "Questions? Reply to this email or reach us through the app."
  );
}

export function verificationEmail(link: string): { subject: string; html: string; text: string } {
  return {
    subject: "Verify your TaxReady email",
    html: wrapper(`
      <p>Thanks for signing up for TaxReady. We help businesses like yours turn everyday transactions
      and receipts into organized, tax-ready records — one less thing to worry about at filing time.</p>
      <p>Before you get started, please confirm this is really your email address:</p>
      <p><a href="${link}" style="display:inline-block;background:#111;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;">Verify email address</a></p>
      <p style="font-size: 13px; color: #666;">This link expires in 24 hours. If the button doesn't work, copy and paste this link into your browser:<br>${link}</p>
    `),
    text:
      `Thanks for signing up for TaxReady. We help businesses like yours turn everyday transactions ` +
      `and receipts into organized, tax-ready records — one less thing to worry about at filing time.\n\n` +
      `Before you get started, please confirm this is really your email address by visiting this link:\n${link}\n\n` +
      `This link expires in 24 hours.` +
      textFooter()
  };
}

export function passwordResetEmail(link: string): { subject: string; html: string; text: string } {
  return {
    subject: "Reset your TaxReady password",
    html: wrapper(`
      <p>We received a request to reset the password on your TaxReady account. If this was you,
      click below to choose a new password:</p>
      <p><a href="${link}" style="display:inline-block;background:#111;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;">Reset your password</a></p>
      <p style="font-size: 13px; color: #666;">This link expires in 1 hour. If the button doesn't work, copy and paste this link into your browser:<br>${link}</p>
      <p style="font-size: 13px; color: #666;">If you didn't request a password reset, no action is needed — your password hasn't been changed.</p>
    `),
    text:
      `We received a request to reset the password on your TaxReady account. If this was you, ` +
      `visit this link to choose a new password:\n${link}\n\n` +
      `This link expires in 1 hour. If you didn't request a password reset, no action is needed — ` +
      `your password hasn't been changed.` +
      textFooter()
  };
}

export function accountantInviteEmail(
  accountantName: string,
  signUpLink: string
): { subject: string; html: string; text: string } {
  return {
    subject: `${accountantName} invited you to TaxReady`,
    html: wrapper(`
      <p><strong>${accountantName}</strong> added you as a client on TaxReady, a platform they use to help
      manage bookkeeping and tax readiness for the businesses they work with.</p>
      <p>To get started, create your own free TaxReady account — you'll be able to upload receipts,
      track transactions, and share your records with ${accountantName} in one place:</p>
      <p><a href="${signUpLink}" style="display:inline-block;background:#111;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;">Create your account</a></p>
      <p style="font-size: 13px; color: #666;">If the button doesn't work, copy and paste this link into your browser:<br>${signUpLink}</p>
    `),
    text:
      `${accountantName} added you as a client on TaxReady, a platform they use to help manage ` +
      `bookkeeping and tax readiness for the businesses they work with.\n\n` +
      `To get started, create your own free TaxReady account by visiting this link:\n${signUpLink}` +
      textFooter()
  };
}
