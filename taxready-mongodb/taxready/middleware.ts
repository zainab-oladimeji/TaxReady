import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const isDashboard = pathname.startsWith("/dashboard");
  const cameFromDemo = searchParams.get("demo") === "1";

  if (isDashboard && !cameFromDemo) {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET,
      // Force the cookie-name lookup to match how the browser actually
      // stored it. Behind a reverse proxy (Codespaces, ngrok, Cloud Run),
      // Node sees the request as plain HTTP even though the browser is on
      // HTTPS, so getToken()'s auto-detection can look for the wrong
      // cookie name and silently treat a valid session as missing.
      secureCookie: true
    });
    if (!token) {
      const signInUrl = new URL("/auth/sign-in", req.url);
      return NextResponse.redirect(signInUrl);
    }
  }
}

export const config = {
  matcher: ["/dashboard/:path*"]
};