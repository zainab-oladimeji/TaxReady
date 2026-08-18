import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getAIProvider } from "@/lib/ai";
import { getOrCreateBusinessForUser, insertReport, listReports, listTransactions, listReceipts } from "@/lib/db/repositories";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const business = await getOrCreateBusinessForUser(userId, session.user.email ?? "");
  const reports = await listReports(business.id);
  return NextResponse.json({ reports });
}

const bodySchema = z.object({
  periodLabel: z.string(),
  type: z.enum([
    "transaction_report",
    "expense_report",
    "revenue_report",
    "tax_period_summary",
    "receipt_report",
    "accountant_review_pack"
  ]),
  title: z.string()
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const userId = (session.user as { id: string }).id;
  const business = await getOrCreateBusinessForUser(userId, session.user.email ?? "");
  const [transactions, receipts] = await Promise.all([listTransactions(business.id), listReceipts(business.id)]);

  const provider = await getAIProvider();
  const summary = await provider.summarizePeriod({ businessId: business.id, transactions, receipts }, parsed.data.periodLabel);

  const now = new Date().toISOString();
  const report = await insertReport(business.id, {
    businessId: business.id,
    type: parsed.data.type,
    title: parsed.data.title,
    periodStart: now,
    periodEnd: now,
    createdAt: now,
    summary: summary.narrative
  });

  return NextResponse.json({ report, summary });
}
