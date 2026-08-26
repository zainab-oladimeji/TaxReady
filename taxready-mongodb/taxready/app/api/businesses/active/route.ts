import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { setActiveBusinessForUser } from "@/lib/db/repositories";

const bodySchema = z.object({ businessId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const userId = (session.user as { id: string }).id;
  const ok = await setActiveBusinessForUser(userId, parsed.data.businessId);
  if (!ok) return NextResponse.json({ error: "You're not a member of that business." }, { status: 403 });

  return NextResponse.json({ ok: true });
}
