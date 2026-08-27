import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getAIProvider } from "@/lib/ai";
import { getCountryTaxConfig } from "@/lib/tax/country-rules";
import { getOrCreateBusinessForUser, insertTransactions, listTransactions } from "@/lib/db/repositories";
import { Transaction } from "@/types";

// businessId is ALWAYS resolved from the authenticated session here —
// never accepted from the request body. See SECURITY.md.

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const business = await getOrCreateBusinessForUser(userId, session.user.email ?? "");
  const transactions = await listTransactions(business.id);
  return NextResponse.json({ business, transactions });
}

// Kept in sync with IMPORT_ROW_CAP in components/dashboard/import-csv-modal.tsx —
// that's the client-side ceiling for a single synchronous import request.
const importSchema = z.object({
  rows: z.array(
    z.object({
      date: z.string(),
      description: z.string().min(1),
      amount: z.number(),
      type: z.enum(["income", "expense"])
    })
  ).max(500)
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const json = await req.json();
  const parsed = importSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const userId = (session.user as { id: string }).id;
  const business = await getOrCreateBusinessForUser(userId, session.user.email ?? "");
  const taxConfig = getCountryTaxConfig(business.country);
  const provider = await getAIProvider();

  const now = new Date().toISOString();
  const results = await provider.classifyTransactionsBatch(
    parsed.data.rows.map((row) => ({
      description: row.description,
      amount: row.amount,
      type: row.type,
      currency: business.currency
    })),
    taxConfig
  );
  const classified: Omit<Transaction, "id">[] = parsed.data.rows.map((row, i) => {
    const result = results[i];
    return {
      businessId: business.id,
      date: row.date,
      description: row.description,
      amount: row.amount,
      currency: business.currency,
      type: row.type,
      category: result.category,
      subcategory: result.subcategory,
      taxRelevance: result.taxRelevance,
      aiConfidence: result.confidence,
      aiReason: result.reason,
      status: result.requiresReview ? "flagged" : "pending",
      createdAt: now,
      updatedAt: now
    };
  });

  const inserted = await insertTransactions(business.id, classified);
  return NextResponse.json({ transactions: inserted });
}
