import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getOrCreateBusinessForUser, updateTransaction } from "@/lib/db/repositories";

const bodySchema = z.object({
  category: z.string().optional(),
  status: z.enum(["pending", "reviewed", "flagged"]).optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const userId = (session.user as { id: string }).id;
  const business = await getOrCreateBusinessForUser(userId, session.user.email ?? "");
  await updateTransaction(business.id, params.id, parsed.data);
  return NextResponse.json({ ok: true });
}
