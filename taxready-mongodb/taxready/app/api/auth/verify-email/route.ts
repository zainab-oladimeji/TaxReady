import { NextRequest, NextResponse } from "next/server";
import { consumeAuthToken } from "@/lib/auth/tokens";
import { markEmailVerified } from "@/lib/auth/users";
import { appBaseUrl } from "@/lib/email/send";

// GET because this is a link clicked from an email, not an API call from
// our own client code.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const base = appBaseUrl();

  if (!token) {
    return NextResponse.redirect(`${base}/auth/sign-in?verify=missing`);
  }

  const userId = await consumeAuthToken(token, "email-verify");
  if (!userId) {
    return NextResponse.redirect(`${base}/auth/sign-in?verify=invalid`);
  }

  await markEmailVerified(userId);
  return NextResponse.redirect(`${base}/auth/sign-in?verify=success`);
}
