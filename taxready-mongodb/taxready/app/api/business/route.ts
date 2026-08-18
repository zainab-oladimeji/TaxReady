import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOrCreateBusinessForUser } from "@/lib/db/repositories";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const business = await getOrCreateBusinessForUser(userId, session.user.email ?? "");
  return NextResponse.json(business);
}
