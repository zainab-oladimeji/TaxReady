import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findUserByEmail } from "@/lib/auth/users";
import { createAuthToken } from "@/lib/auth/tokens";
import { sendEmail, appBaseUrl } from "@/lib/email/send";
import { verificationEmail } from "@/lib/email/templates";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const bodySchema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`resend-verify:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const user = await findUserByEmail(parsed.data.email);
  // Always return success, whether or not the account exists or is
  // already verified — this route must not leak which emails have
  // accounts (same reasoning as forgot-password).
  if (user && user.passwordHash && !user.emailVerified) {
    const token = await createAuthToken(user.id, "email-verify");
    const link = `${appBaseUrl()}/api/auth/verify-email?token=${token}`;
    await sendEmail({ to: user.email, ...verificationEmail(link) });
  }

  return NextResponse.json({ ok: true });
}
