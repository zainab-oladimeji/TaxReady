import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Deliberately does NOT import from "@/auth" — that pulls in the MongoDB
 * driver and bcrypt (via the Credentials provider), neither of which run
 * on the Edge Runtime that middleware executes on. `getToken` only
 * decodes the session JWT using AUTH_SECRET, with no DB/provider code.
 *
 * /demo bypasses this entirely — it's the anonymous, no-signup path into
 * the dashboard using fictional data only, never real records.
 */
export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const isDashboard = pathname.startsWith("/dashboard");
  const cameFromDemo = searchParams.get("demo") === "1";

  if (isDashboard && !cameFromDemo) {
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });
    if (!token) {
      const signInUrl = new URL("/auth/sign-in", req.url);
      return NextResponse.redirect(signInUrl);
    }
  }
}

export const config = {
  matcher: ["/dashboard/:path*"]
};
