import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getAIProvider } from "@/lib/ai";
import { getOrCreateBusinessForUser, listTransactions, listReceipts } from "@/lib/db/repositories";
import { Transaction, Receipt } from "@/types";

// SECURITY: for a signed-in user, businessId + transactions + receipts are
// ALWAYS resolved server-side from the session — the client-supplied
// versions of those fields are ignored below. This is what actually
// enforces "never use one user's financial data as context for another
// user." The demo-mode fallback (no session) still accepts client-supplied
// data because /demo has no persisted business to look up — it's the same
// fictional dataset for everyone, never real financial records.

const bodySchema = z.object({
  question: z.string().min(1),
  transactions: z.array(z.any()).optional() as unknown as z.ZodType<Transaction[] | undefined>,
  receipts: z.array(z.any()).optional() as unknown as z.ZodType<Receipt[] | undefined>,
  businessId: z.string().optional()
});

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const session = await auth();
    const provider = await getAIProvider();
    const { question } = parsed.data;

    if (session?.user) {
      const userId = (session.user as { id: string }).id;
      const business = await getOrCreateBusinessForUser(userId, session.user.email ?? "");
      const [transactions, receipts] = await Promise.all([listTransactions(business.id), listReceipts(business.id)]);
      const response = await provider.answerQuestion(question, { businessId: business.id, transactions, receipts });
      return NextResponse.json(response);
    }

    // Demo mode — no session, no real data. Only ever fictional demo records.
    const response = await provider.answerQuestion(question, {
      businessId: parsed.data.businessId ?? "demo",
      transactions: parsed.data.transactions ?? [],
      receipts: parsed.data.receipts ?? []
    });
    return NextResponse.json(response);
  } catch (err) {
    console.error("[api/ai/ask] failed", err);
    return NextResponse.json({ error: "The assistant couldn't process that just now." }, { status: 500 });
  }
}
