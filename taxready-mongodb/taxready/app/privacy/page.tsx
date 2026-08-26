import { LegalLayout, LegalSection } from "@/components/marketing/legal-layout";

export const metadata = { title: "Privacy Policy — TaxReady" };

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="26 August 2026">
      <p>
        TaxReady (&quot;we&quot;, &quot;us&quot;) helps businesses organize transactions, receipts, and
        tax-readiness records. This page explains what we collect, why, and who we share it with. It applies
        to taxready-six.vercel.app and any associated TaxReady service.
      </p>

      <LegalSection title="1. Information we collect">
        <p>We collect the following categories of information:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Account information:</strong> your name, email address, and a securely hashed password
            (we never store your password itself). If you sign in with Google, we receive your name and
            email from Google instead.
          </li>
          <li>
            <strong>Business information:</strong> business name, type, country, and currency.
          </li>
          <li>
            <strong>Financial records you provide:</strong> transaction descriptions, amounts, dates, and
            receipt or invoice images/PDFs you upload, along with the data our AI extracts from them
            (merchant, amount, date, VAT, category).
          </li>
          <li>
            <strong>Usage and device information:</strong> basic technical data such as IP address and
            browser type, collected automatically for security (e.g. rate-limiting against abuse) and error
            monitoring.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. How we use your information">
        <ul className="list-disc space-y-1 pl-5">
          <li>To provide the core service: storing your transactions and receipts, and generating tax-readiness reports and AI classifications.</li>
          <li>To read and extract data from receipts and classify transactions, using a third-party AI provider (see Section 3).</li>
          <li>To authenticate you and keep your account secure, including verifying your email and detecting suspicious sign-in activity.</li>
          <li>To send you account-related email: email verification, password reset, and — if you use the accountant workspace — client invitations.</li>
          <li>To diagnose and fix bugs, via error monitoring.</li>
        </ul>
        <p>We do not use your financial data to train AI models, and we do not sell your data to advertisers.</p>
      </LegalSection>

      <LegalSection title="3. Who we share information with">
        <p>We use a small number of third-party service providers to operate TaxReady. Each only receives what it needs to do its job:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>AI providers</strong> (Groq and/or Google Gemini) — receive receipt images and transaction descriptions to extract and classify data. They process this data to return a result to us; check your configured provider&apos;s own privacy policy for their data handling terms.</li>
          <li><strong>MongoDB Atlas</strong> — hosts our database (your account, business, transaction, and receipt records).</li>
          <li><strong>Vercel</strong> — hosts and runs the application itself.</li>
          <li><strong>Resend</strong> — sends transactional email (verification links, password resets) on our behalf.</li>
          <li><strong>Google</strong> — only if you choose &quot;Continue with Google&quot; to sign in.</li>
          <li><strong>Sentry</strong> — receives technical error reports (e.g. a stack trace) to help us fix bugs; we configure it not to intentionally include your financial data in these reports.</li>
        </ul>
        <p>We do not share your data with anyone else, and never sell it.</p>
      </LegalSection>

      <LegalSection title="4. Data retention">
        <p>
          We keep your account and financial records for as long as your account is active. If you delete
          your account, we delete your associated data within a reasonable period, except where we&apos;re
          required to retain something for legal or security reasons (e.g. fraud prevention logs).
        </p>
      </LegalSection>

      <LegalSection title="5. Your rights">
        <p>
          You can access, correct, or request deletion of your personal data at any time by contacting us
          (see Section 8). Depending on your location, you may have additional rights under applicable data
          protection law, including Nigeria&apos;s Data Protection Act (NDPA) 2023.
        </p>
      </LegalSection>

      <LegalSection title="6. Security">
        <p>
          Passwords are hashed, not stored in plain text. Sensitive tokens (email verification, password
          reset) are stored as one-way hashes and expire automatically. We use rate limiting on
          authentication endpoints to reduce automated abuse. No system is perfectly secure, and we can&apos;t
          guarantee absolute security of information transmitted over the internet.
        </p>
      </LegalSection>

      <LegalSection title="7. Children">
        <p>TaxReady is not directed at, and should not be used by, anyone under 18.</p>
      </LegalSection>

      <LegalSection title="8. Contact">
        <p>Questions about this policy or your data? Contact us at the support address listed on our homepage.</p>
      </LegalSection>

      <LegalSection title="9. Changes to this policy">
        <p>We may update this policy as the service evolves. We&apos;ll update the &quot;Last updated&quot; date above when we do.</p>
      </LegalSection>
    </LegalLayout>
  );
}
