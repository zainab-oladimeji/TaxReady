"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/marketing/auth-shell";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "@/lib/auth";
import { MailCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await requestPasswordReset(email);
    } finally {
      // Always show the same "sent" state regardless of outcome — the API
      // itself never reveals whether an account exists for this email,
      // and neither should the UI.
      setSent(true);
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle="If an account exists for that address, a reset link is on its way.">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <MailCheck size={32} className="text-brand-600" />
          <p className="text-sm text-ink/70">
            The link expires in 1 hour. If it doesn&apos;t arrive in a few minutes, check your spam folder.
          </p>
        </div>
        <p className="mt-4 text-center text-sm">
          <Link href="/auth/sign-in" className="font-medium text-ink hover:underline">
            Back to sign in
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a link to choose a new one.">
      <form className="space-y-3" onSubmit={handleSubmit}>
        <input
          type="email"
          required
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="focus-ring w-full rounded-lg border border-line px-3.5 py-2.5 text-sm"
        />
        <Button type="submit" className="w-full" disabled={loading}>
          Send reset link
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-ink/55">
        <Link href="/auth/sign-in" className="font-medium text-ink hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
