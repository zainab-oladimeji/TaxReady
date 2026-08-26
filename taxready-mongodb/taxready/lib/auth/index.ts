"use client";

import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react";

/**
 * Thin wrappers around Auth.js's client functions. Kept as a separate
 * module (rather than calling next-auth/react directly from components) so
 * sign-up's extra step — creating the MongoDB user record via
 * /api/auth/register before establishing a session — stays in one place.
 */

export async function signInWithGoogle(): Promise<void> {
  await nextAuthSignIn("google", { callbackUrl: "/dashboard" });
}

// Thrown when sign-in fails for a specific, user-actionable reason so the
// sign-in page can show the right message (and a resend-verification link)
// instead of a generic "couldn't sign in".
export class SignInError extends Error {
  code: "email_not_verified" | "too_many_attempts" | "invalid_credentials";
  constructor(code: "email_not_verified" | "too_many_attempts" | "invalid_credentials") {
    super(code);
    this.code = code;
  }
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const result = await nextAuthSignIn("credentials", { email, password, redirect: false });
  if (result?.error) {
    if (result.error === "email_not_verified") throw new SignInError("email_not_verified");
    if (result.error === "too_many_attempts") throw new SignInError("too_many_attempts");
    throw new SignInError("invalid_credentials");
  }
}

export async function signUpWithEmail(email: string, password: string, name: string): Promise<void> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "We couldn't create your account.");
  }
  // No auto sign-in anymore — the account needs email verification first
  // (see /api/auth/register and /api/auth/verify-email). The sign-up page
  // shows a "check your email" state instead of redirecting to /dashboard.
}

export async function resendVerificationEmail(email: string): Promise<void> {
  await fetch("/api/auth/resend-verification", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const res = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "We couldn't reset your password.");
  }
}

export async function signOutUser(): Promise<void> {
  await nextAuthSignOut({ callbackUrl: "/" });
}
