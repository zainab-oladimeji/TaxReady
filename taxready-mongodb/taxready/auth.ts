import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { findUserByEmail, verifyPassword, upsertOAuthUser } from "@/lib/auth/users";

const providers: Provider[] = [
  Credentials({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" }
    },
    async authorize(credentials) {
      const email = credentials?.email as string | undefined;
      const password = credentials?.password as string | undefined;
      if (!email || !password) return null;

      const user = await findUserByEmail(email);
      if (!user || !user.passwordHash) return null;

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) return null;

      return { id: user.id, email: user.email, name: user.name };
    }
  })
];

// Google Sign-In is optional — only registered when credentials are configured,
// so the app keeps working with email/password alone in local/demo setups.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    })
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Credentials-based providers require the JWT session strategy —
  // Auth.js does not support database sessions alongside Credentials.
  session: { strategy: "jwt" },
  providers,
  pages: {
    signIn: "/auth/sign-in"
  },
  callbacks: {
    async signIn({ user, account }) {
      // Google sign-ins don't go through authorize() above, so we upsert
      // the user record here instead, keeping one `users` collection for
      // both auth methods.
      if (account?.provider === "google" && user.email) {
        await upsertOAuthUser(user.email, user.name ?? user.email.split("@")[0]);
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        (session.user as typeof session.user & { id: string }).id = token.uid as string;
      }
      return session;
    }
  }
});
