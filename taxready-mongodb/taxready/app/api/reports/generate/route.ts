import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAIProvider } from "@/lib/ai";
import { Transaction, Receipt } from "@/types";

const bodySchema = z.object({
  periodLabel: z.string(),
  businessId: z.string(),
  transactions: z.array(z.any()) as unknown as z.ZodType<Transaction[]>,
  receipts: z.array(z.any()) as unknown as z.ZodType<Receipt[]>
});

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const provider = await getAIProvider();
    const { periodLabel, businessId, transactions, receipts } = parsed.data;
    const summary = await provider.summarizePeriod({ businessId, transactions, receipts }, periodLabel);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[api/reports/generate] failed", err);
    return NextResponse.json({ error: "Report generation failed." }, { status: 500 });
  }
}
