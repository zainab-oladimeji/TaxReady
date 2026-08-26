import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { listAccountantClients, inviteAccountantClient } from "@/lib/db/repositories";
import { sendEmail, appBaseUrl } from "@/lib/email/send";
import { accountantInviteEmail } from "@/lib/email/templates";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const clients = await listAccountantClients(userId);
  return NextResponse.json({ clients });
}

const bodySchema = z.object({
  name: z.string().min(1),
  email: z.string().email()
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const ip = getClientIp(req);
  if (!checkRateLimit(`invite-client:${ip}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many invites sent. Please try again later." }, { status: 429 });
  }

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const userId = (session.user as { id: string }).id;
  const accountantName = session.user.name ?? session.user.email ?? "Your accountant";
  const client = await inviteAccountantClient(userId, parsed.data.name, parsed.data.email);

  await sendEmail({ to: parsed.data.email, ...accountantInviteEmail(accountantName, `${appBaseUrl()}/auth/sign-up`) });

  return NextResponse.json({ client });
}
