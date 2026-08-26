/**
 * Deliverability notes for anyone touching this file (see the bounce
 * investigation in the app's history — Gmail rejected earlier versions
 * as "likely unsolicited mail"):
 *
 *   - Every template includes a personal greeting when a name is available.
 *     A generic "no name" template reads as bulk mail.
 *   - Every link appears EXACTLY ONCE per email. An earlier version had the
 *     same URL both as a button and repeated as plain text ("if the button
 *     doesn't work, paste this link") — that duplicate-link pattern is a
 *     classic phishing/spam-template signature and likely hurt more than
 *     the fallback text helped.
 *   - Links are plain, understated text links, not large styled buttons —
 *     heavily styled centered buttons are themselves a common bulk-email
 *     pattern that spam filters weight against a brand-new sending domain.
 *   - Every template returns both `html` and `text` — a multipart email
 *     (both formats sent together) reads as far less spammy than HTML-only.
 */

function wrapper(bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a; line-height: 1.6;">
      ${bodyHtml}
      <p style="margin-top: 32px; font-size: 12px; color: #888;">
        — The TaxReady team<br>
        TaxReady helps businesses organize transactions, receipts, and tax-readiness records.
      </p>
    </div>
  `;
}

function textFooter(): string {
  return "\n\n— The TaxReady team\nTaxReady helps businesses organize transactions, receipts, and tax-readiness records.";
}

function greeting(name?: string): string {
  return name ? `Hi ${name.split(" ")[0]},` : "Hi there,";
}

export function verificationEmail(
  link: string,
  name?: string
): { subject: string; html: string; text: string } {
  return {
    subject: "Confirm your email to activate TaxReady",
    html: wrapper(`
      <p>${greeting(name)}</p>
      <p>Thanks for signing up for TaxReady. Before you get started organizing your business records,
      please confirm this is really your email address by clicking below:</p>
      <p><a href="${link}" style="color:#1a5fb4;">Confirm my email address</a></p>
      <p style="font-size: 13px; color: #666;">This link expires in 24 hours.</p>
    `),
    text:
      `${greeting(name)}\n\n` +
      `Thanks for signing up for TaxReady. Before you get started organizing your business records, ` +
      `please confirm this is really your email address:\n${link}\n\n` +
      `This link expires in 24 hours.` +
      textFooter()
  };
}

export function passwordResetEmail(
  link: string,
  name?: string
): { subject: string; html: string; text: string } {
  return {
    subject: "Reset your TaxReady password",
    html: wrapper(`
      <p>${greeting(name)}</p>
      <p>We received a request to reset the password on your TaxReady account. If that was you,
      click below to choose a new one:</p>
      <p><a href="${link}" style="color:#1a5fb4;">Reset my password</a></p>
      <p style="font-size: 13px; color: #666;">This link expires in 1 hour. If you didn't request this,
      no action is needed — your password hasn't changed.</p>
    `),
    text:
      `${greeting(name)}\n\n` +
      `We received a request to reset the password on your TaxReady account. If that was you, use this ` +
      `link to choose a new one:\n${link}\n\n` +
      `This link expires in 1 hour. If you didn't request this, no action is needed — your password ` +
      `hasn't changed.` +
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
      <p>Hi there,</p>
      <p><strong>${accountantName}</strong> added you as a client on TaxReady, a platform they use to help
      manage bookkeeping and tax readiness for the businesses they work with.</p>
      <p>Create your own free account to get started:</p>
      <p><a href="${signUpLink}" style="color:#1a5fb4;">Create my account</a></p>
    `),
    text:
      `Hi there,\n\n` +
      `${accountantName} added you as a client on TaxReady, a platform they use to help manage ` +
      `bookkeeping and tax readiness for the businesses they work with.\n\n` +
      `Create your own free account to get started:\n${signUpLink}` +
      textFooter()
  };
}
