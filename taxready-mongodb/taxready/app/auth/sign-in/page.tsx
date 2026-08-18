"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/marketing/auth-shell";
import { Button } from "@/components/ui/button";
import { signInWithEmail, signInWithGoogle } from "@/lib/auth";
import { Chrome } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    try {
      await signInWithEmail(email, password);
      router.push("/dashboard");
    } catch {
      setError("We couldn't sign you in with those details.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your TaxReady workspace.">
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
        <Button type="submit" className="w-full" disabled={loading}>
          Sign In
        </Button>
      </form>

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
