import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUserWithPassword } from "@/lib/auth/users";
import { getOrCreateBusinessForUser } from "@/lib/db/repositories";

const bodySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8)
});

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ id: user.id, email: user.email });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create account.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
