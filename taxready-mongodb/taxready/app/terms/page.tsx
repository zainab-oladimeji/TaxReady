import { LegalLayout, LegalSection } from "@/components/marketing/legal-layout";

export const metadata = { title: "Terms of Service — TaxReady" };

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="26 August 2026">
      <p>
        These terms govern your use of TaxReady (&quot;the Service&quot;), available at
        taxready-six.vercel.app. By creating an account or using the Service, you agree to these terms.
      </p>

      <LegalSection title="1. What TaxReady is — and isn't">
        <p>
          TaxReady helps you organize business transactions, extract data from receipts using AI, and
          prepare records for tax filing. <strong>TaxReady does not provide legal, accounting, or tax
          advice, and using it does not create a professional relationship of any kind.</strong> AI-extracted
          and AI-classified data may contain errors — always review your records and consult a qualified
          tax professional or accountant before relying on them for a filing or financial decision.
        </p>
      </LegalSection>

      <LegalSection title="2. Your account">
        <ul className="list-disc space-y-1 pl-5">
          <li>You must provide accurate information when creating an account and keep your password secure.</li>
          <li>You&apos;re responsible for all activity under your account.</li>
          <li>You must be 18 or older to use TaxReady.</li>
          <li>Tell us promptly if you believe your account has been compromised.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Upload content you don&apos;t have the right to upload, or that&apos;s fraudulent, unlawful, or infringes someone else&apos;s rights.</li>
          <li>Attempt to disrupt, overload, or gain unauthorized access to the Service or other users&apos; data.</li>
          <li>Use the Service to process another person&apos;s or business&apos;s financial data without their authorization.</li>
          <li>Reverse-engineer or attempt to extract the Service&apos;s underlying models or source code beyond what&apos;s permitted by applicable law.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Your content">
        <p>
          You retain ownership of the transactions, receipts, and business data you upload. You grant us a
          limited license to process that data solely to provide the Service to you — including sending
          receipt images and transaction descriptions to our AI providers for extraction and classification
          (see our Privacy Policy). We don&apos;t claim ownership of your business data.
        </p>
      </LegalSection>

      <LegalSection title="5. AI-generated output">
        <p>
          Extracted receipt data, transaction classifications, tax-readiness scores, and AI-generated
          summaries are produced by automated systems and may be inaccurate, incomplete, or out of date with
          current tax law. You&apos;re solely responsible for reviewing and verifying this output before relying
          on it.
        </p>
      </LegalSection>

      <LegalSection title="6. Availability and changes">
        <p>
          TaxReady is provided on an &quot;as available&quot; basis. We may modify, suspend, or discontinue
          any part of the Service, and may update these terms from time to time — we&apos;ll update the
          &quot;Last updated&quot; date when we do. Continued use after a change means you accept the
          updated terms.
        </p>
      </LegalSection>

      <LegalSection title="7. Termination">
        <p>
          You may stop using the Service and request account deletion at any time. We may suspend or
          terminate accounts that violate these terms, engage in abusive behavior, or pose a security risk
          to the Service or other users.
        </p>
      </LegalSection>

      <LegalSection title="8. Disclaimer and limitation of liability">
        <p>
          To the fullest extent permitted by law, TaxReady is provided without warranties of any kind. We
          are not liable for indirect, incidental, or consequential damages arising from your use of the
          Service, including any tax, financial, or legal consequences resulting from reliance on
          AI-generated data. Nothing in these terms limits liability that cannot be limited under applicable
          law.
        </p>
      </LegalSection>

      <LegalSection title="9. Governing law">
        <p>These terms are governed by the laws of Nigeria, without regard to conflict-of-law principles.</p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>Questions about these terms? Contact us at the support address listed on our homepage.</p>
      </LegalSection>
    </LegalLayout>
  );
}
