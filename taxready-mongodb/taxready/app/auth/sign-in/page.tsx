"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/marketing/auth-shell";
import { Button } from "@/components/ui/button";
import { signInWithEmail, signInWithGoogle, SignInError, resendVerificationEmail } from "@/lib/auth";
import { Chrome } from "lucide-react";

const VERIFY_BANNERS: Record<string, { tone: "success" | "error"; text: string }> = {
  success: { tone: "success", text: "Email verified — you can sign in now." },
  invalid: { tone: "error", text: "That verification link is invalid or has expired. Request a new one below." },
  missing: { tone: "error", text: "That verification link looks incomplete. Request a new one below." }
};

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verifyBanner = VERIFY_BANNERS[searchParams.get("verify") ?? ""];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // signInWithGoogle triggers a full-page redirect on success — if we
      // get here, it didn't (e.g. Google isn't configured server-side).
    } catch {
      setError("Google sign-in isn't available right now — try email below, or the demo.");
      setLoading(false);
    }
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNeedsVerification(false);
    try {
      await signInWithEmail(email, password);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof SignInError && err.code === "email_not_verified") {
        setNeedsVerification(true);
        setError("Please verify your email before signing in.");
      } else if (err instanceof SignInError && err.code === "too_many_attempts") {
        setError("Too many attempts. Please wait a few minutes and try again.");
      } else {
        setError("We couldn't sign you in with those details.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    await resendVerificationEmail(email);
    setResendSent(true);
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your TaxReady workspace.">
      {verifyBanner && (
        <p className={`mb-4 rounded-lg px-3 py-2 text-xs ${verifyBanner.tone === "success" ? "bg-brand-50 text-brand-700" : "bg-alert/10 text-alert"}`}>
          {verifyBanner.text}
        </p>
      )}

      <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
        <Chrome size={16} /> Continue with Google
      </Button>

      <div className="my-5 flex items-center gap-3 text-xs text-ink/35">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>

      <form className="space-y-3" onSubmit={handleEmailSignIn}>
        <input
          type="email"
          required
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="focus-ring w-full rounded-lg border border-line px-3.5 py-2.5 text-sm"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="focus-ring w-full rounded-lg border border-line px-3.5 py-2.5 text-sm"
        />
        {error && <p className="text-xs text-alert">{error}</p>}
        {needsVerification && !resendSent && (
          <button type="button" onClick={handleResend} className="text-xs font-medium text-brand-600 hover:underline">
            Resend verification email
          </button>
        )}
        {resendSent && <p className="text-xs text-brand-700">Verification email sent — check your inbox.</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          Sign In
        </Button>
      </form>

      <p className="mt-3 text-center text-sm">
        <Link href="/auth/forgot-password" className="text-ink/55 hover:underline">
          Forgot your password?
        </Link>
      </p>

      <p className="mt-5 text-center text-sm text-ink/55">
        No account?{" "}
        <Link href="/auth/sign-up" className="font-medium text-ink hover:underline">
          Create one
        </Link>
      </p>
      <p className="mt-2 text-center text-sm">
        <Link href="/demo" className="font-medium text-brand-600 hover:underline">
          Or explore the demo without signing in →
        </Link>
      </p>
    </AuthShell>
  );
}
