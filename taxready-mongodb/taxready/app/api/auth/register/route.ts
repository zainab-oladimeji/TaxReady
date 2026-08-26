import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUserWithPassword } from "@/lib/auth/users";
import { getOrCreateBusinessForUser } from "@/lib/db/repositories";
import { createAuthToken } from "@/lib/auth/tokens";
import { sendEmail, appBaseUrl } from "@/lib/email/send";
import { verificationEmail } from "@/lib/email/templates";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const bodySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8)
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  // 10 signups per IP per hour — generous for real users (including
  // shared IPs/NAT), tight enough to blunt automated signup spam.
  if (!checkRateLimit(`register:${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const user = await createUserWithPassword(parsed.data.email, parsed.data.password, parsed.data.name);
    // Every new user gets a starter business immediately — this is what
    // getOrCreateBusinessForUser also does lazily on first dashboard load,
    // but creating it at sign-up means /dashboard has data to show right away.
    await getOrCreateBusinessForUser(user.id, user.email);

    const token = await createAuthToken(user.id, "email-verify");
    const link = `${appBaseUrl()}/api/auth/verify-email?token=${token}`;
    await sendEmail({ to: user.email, ...verificationEmail(link) });

    return NextResponse.json({ id: user.id, email: user.email, verificationRequired: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create account.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
