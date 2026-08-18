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

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const result = await nextAuthSignIn("credentials", { email, password, redirect: false });
  if (result?.error) {
    throw new Error("We couldn't sign you in with those details.");
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
  await signInWithEmail(email, password);
}

export async function signOutUser(): Promise<void> {
  await nextAuthSignOut({ callbackUrl: "/" });
}
