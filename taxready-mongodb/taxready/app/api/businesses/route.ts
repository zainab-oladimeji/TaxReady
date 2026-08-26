import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { listBusinessesForUser, createAdditionalBusinessForUser } from "@/lib/db/repositories";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const businesses = await listBusinessesForUser(userId);
  return NextResponse.json({ businesses });
}

const bodySchema = z.object({
  name: z.string().min(1),
  type: z.enum(["Retail", "Food & Beverage", "Professional Services", "Technology", "Manufacturing", "Other"]),
  country: z.enum(["NG", "GH", "KE", "ZA", "GB"]),
  currency: z.string().min(1)
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const userId = (session.user as { id: string }).id;
  const business = await createAdditionalBusinessForUser(userId, session.user.email ?? "", parsed.data);
  return NextResponse.json({ business });
}
