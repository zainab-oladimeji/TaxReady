import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findUserByEmail } from "@/lib/auth/users";
import { createAuthToken } from "@/lib/auth/tokens";
import { sendEmail, appBaseUrl } from "@/lib/email/send";
import { passwordResetEmail } from "@/lib/email/templates";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const bodySchema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`forgot-password:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Deliberately always return the same success response, whether or not
  // an account exists for this email — this endpoint must not let someone
  // probe which emails are registered.
  const user = await findUserByEmail(parsed.data.email);
  if (user && user.passwordHash) {
    const token = await createAuthToken(user.id, "password-reset");
    const link = `${appBaseUrl()}/auth/reset-password?token=${token}`;
    await sendEmail({ to: user.email, ...passwordResetEmail(link, user.name) });
  }

  return NextResponse.json({ ok: true });
}
