"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/marketing/auth-shell";
import { Button } from "@/components/ui/button";
import { signUpWithEmail, signInWithGoogle } from "@/lib/auth";
import { Chrome } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // Redirects the whole page on success; reaching here means it didn't.
    } catch {
      setError("Google sign-in isn't available right now — try email below, or the demo.");
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signUpWithEmail(email, password, name);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't create your account with those details.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome to TaxReady" subtitle="Create your account to start organizing your records.">
      <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
        <Chrome size={16} /> Continue with Google
      </Button>

      <div className="my-5 flex items-center gap-3 text-xs text-ink/35">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>

      <form className="space-y-3" onSubmit={handleSignUp}>
        <input
          required
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="focus-ring w-full rounded-lg border border-line px-3.5 py-2.5 text-sm"
        />
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
          minLength={8}
          placeholder="Password (min. 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="focus-ring w-full rounded-lg border border-line px-3.5 py-2.5 text-sm"
        />
        {error && <p className="text-xs text-alert">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          Create Account
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-ink/55">
        Already have an account?{" "}
        <Link href="/auth/sign-in" className="font-medium text-ink hover:underline">
          Sign in
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
